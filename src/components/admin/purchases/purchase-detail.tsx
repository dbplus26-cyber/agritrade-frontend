"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ActionRow,
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  adminLinkClass,
  DetailGrid,
  DetailHeader,
  DetailItem,
  DetailShell,
  SectionHeading,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import {
  useGetPurchaseQuery,
  useMarkPurchaseInTransitMutation,
  useReceivePurchaseMutation,
  useVoidPurchaseMutation,
} from "@/redux/purchases/purchases-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import { useAuthRole } from "@/hooks/use-auth-role";
import { usePermissions } from "@/hooks/use-permissions";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis, formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { receiptPdfUrl } from "@/lib/receipt-pdf-url";
import { cn } from "@/lib/utils";
import {
  PurchaseStatus,
  RECEIPT_VARIANCE_CODE,
  type IPurchase,
} from "@/types/purchase.types";
import {
  receivePurchaseSchema,
  voidPurchaseSchema,
  type ReceivePurchaseValues,
  type VoidPurchaseValues,
} from "@/validations/purchase-schema";
import {
  PurchaseCostsCard,
  PurchaseGoodsCostSummary,
} from "@/components/admin/purchases/purchase-costs-card";
import { PurchaseSettlementCard } from "@/components/admin/purchases/purchase-settlement-card";
import { SOURCE_LABEL } from "@/components/admin/registry/registry-bits";
import {
  formatConsoleDate,
  purchaseCounterparty,
  ApprovalOverlayBadge,
  PurchaseStatusBadge,
  todayInputValue,
} from "./purchase-bits";

const LIST = "/admin/purchases";

/** Receive dialog: actual kg into which warehouse, with live variance. */
function ReceiveDialog({
  purchase,
  open,
  onClose,
}: {
  purchase: IPurchase;
  open: boolean;
  onClose: () => void;
}) {
  const [receive, { isLoading }] = useReceivePurchaseMutation();
  const warehouses = useGetWarehousesQuery({ limit: 100, isActive: true });
  const { confirm, confirmationDialog } = useConfirm();

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReceivePurchaseValues>({
    resolver: zodResolver(receivePurchaseSchema),
    defaultValues: {
      receivedKg: String(purchase.weightKg),
      warehouseId: purchase.warehouse?.id ?? "",
      receivedAt: todayInputValue(),
    },
  });

  const receivedKg = Number(watch("receivedKg")) || 0;
  const variance = purchase.weightKg - receivedKg;

  const submitReceipt = (
    values: ReceivePurchaseValues,
    confirmVariance: boolean,
  ) =>
    receive({
      id: purchase.id,
      body: {
        receivedKg: Number(values.receivedKg),
        warehouseId: values.warehouseId,
        ...(values.receivedAt ? { receivedAt: values.receivedAt } : {}),
        ...(confirmVariance ? { confirmVariance: true } : {}),
      },
    }).unwrap();

  const onSubmit = async (values: ReceivePurchaseValues) => {
    // Receiving writes the lot and the stock movement: from here the goods can
    // be sold and put on a truck out of THIS shed. The shed is what gets read
    // back, because a wrong weight shows up the next time anybody counts, and
    // a wrong shed does not - it just means the stock is not where the console
    // says it is, and only an adjustment puts that right.
    const shed =
      (warehouses.data?.data ?? []).find((w) => w.id === values.warehouseId)
        ?.name ?? "the warehouse you chose";
    const ok = await confirm({
      title: "Book this stock in?",
      description: `${formatKg(Number(values.receivedKg))} of ${purchase.commodity.name} goes into ${shed} and can be sold and shipped from there. Only a stock adjustment moves it afterwards.`,
      confirmText: "Receive stock",
    });
    if (!ok) return;

    try {
      await submitReceipt(values, false);
    } catch (err) {
      const apiError = extractApiError(err);
      // Out-of-tolerance weights are not a dead end: the backend refuses the
      // first attempt with RECEIPT_VARIANCE purely so a person has to look at
      // the gap. Ask, then re-send the same receipt with the flag set -
      // otherwise staff are stuck with stock they physically have and no way
      // to book it in.
      if (apiError.code !== RECEIPT_VARIANCE_CODE) {
        notify.error("Couldn't receive the purchase", {
          description: apiError.message,
        });
        return;
      }
      // The API's message already names both weights and the tolerance, so it
      // is the body of the prompt - only the consequence is added here.
      const ok = await confirm({
        title: "Receive with a weight difference?",
        description: `${apiError.message} Confirming books the stock at the warehouse weight and keeps the difference on the record as variance.`,
        confirmText: "Confirm and receive",
      });
      if (!ok) return;
      try {
        await submitReceipt(values, true);
      } catch (retryErr) {
        notify.error("Couldn't receive the purchase", {
          description: extractApiError(retryErr).message,
        });
        return;
      }
      notify.success("Purchase received - variance recorded");
      onClose();
      return;
    }
    notify.success("Purchase received - stock is now on hand");
    onClose();
  };

  return (
    <>
      <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
        <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[440px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Receive into warehouse</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              The recorded weight was {formatKg(purchase.weightKg)}. Enter what
              the warehouse scale actually says - the difference is kept as
              variance, never silently absorbed.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-5"
          >
            <AdminField
              label="Received weight (kg)"
              error={errors.receivedKg?.message}
            >
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.receivedKg && "border-console-red")}
                placeholder="e.g. 1200"
                {...register("receivedKg")}
              />
            </AdminField>
            {receivedKg > 0 && variance !== 0 ? (
              <p
                className={cn(
                  "text-[12.5px]",
                  variance > 0 ? "text-console-red" : "text-console",
                )}
              >
                {variance > 0
                  ? `${formatKg(variance)} less than recorded (spillage or moisture loss).`
                  : `${formatKg(Math.abs(variance))} more than recorded.`}
              </p>
            ) : null}
            <AdminField
              label="Warehouse"
              error={errors.warehouseId?.message}
            >
              <Controller
                control={control}
                name="warehouseId"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={(warehouses.data?.data ?? []).map((w) => ({
                      value: w.id,
                      label: w.name,
                    }))}
                    placeholder="Choose the warehouse"
                    className={cn(errors.warehouseId && "border-console-red")}
                  />
                )}
              />
            </AdminField>
            <AdminField label="Received date" optional>
              <DateInput
                className={adminInputClass}
                placeholder="Pick the received date"
                {...register("receivedAt")}
              />
            </AdminField>
            <ResponsiveDialogFooter className="gap-2">
              <AdminButton
                type="button"
                variant="outline"
                size="lg"
                onClick={onClose}
              >
                Cancel
              </AdminButton>
              <AdminButton
                type="submit"
                disabled={isLoading}
                loading={isLoading}
                size="lg"
              >
                {isLoading ? "Receiving…" : "Receive stock"}
              </AdminButton>
            </ResponsiveDialogFooter>
          </form>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
      {/* A sibling, not a child: the variance prompt opens over the still-open
          receive dialog, so declining it leaves the entered weights intact. */}
      {confirmationDialog}
    </>
  );
}

/** Void dialog: reason required; float and stock reverse with entries. */
function VoidDialog({
  purchase,
  open,
  onClose,
}: {
  purchase: IPurchase;
  open: boolean;
  onClose: () => void;
}) {
  const [voidPurchase, { isLoading }] = useVoidPurchaseMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VoidPurchaseValues>({
    resolver: zodResolver(voidPurchaseSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (values: VoidPurchaseValues) => {
    try {
      await voidPurchase({
        id: purchase.id,
        body: { reason: values.reason },
      }).unwrap();
      notify.success("Purchase voided with compensating entries");
      onClose();
    } catch (err) {
      notify.error("Couldn't void the purchase", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Void this purchase?</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Voiding is the owner&apos;s correction path: it reverses the float
            debit{purchase.status === PurchaseStatus.RECEIVED
              ? " and takes the received stock back out"
              : ""}{" "}
            with compensating ledger entries. Nothing is deleted or rewritten.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <AdminField label="Reason" error={errors.reason?.message}>
            <textarea
              rows={4}
              placeholder="Why is this purchase being voided?"
              className={cn(
                adminInputClass,
                "h-auto min-h-[60px] w-full resize-y py-2",
                errors.reason && "border-console-red",
              )}
              {...register("reason")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="submit"
              variant="danger"
              disabled={isLoading}
              loading={isLoading}
              size="lg"
            >
              {isLoading ? "Voiding…" : "Void purchase"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function PurchaseDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetPurchaseQuery(id);
  const [markInTransit, transitState] = useMarkPurchaseInTransitMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const { isSuperAdmin } = useAuthRole();
  const { has } = usePermissions();
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  if (isLoading) return <DetailSkeleton facts={8} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const p = data.data.purchase;
  const mayReceive = has("PURCHASES_RECEIVE");
  const canTransit = mayReceive && p.status === PurchaseStatus.RECORDED;
  const canReceive =
    mayReceive &&
    (p.status === PurchaseStatus.RECORDED ||
      p.status === PurchaseStatus.IN_TRANSIT);
  // Voiding reverses the float and stock ledgers with compensating entries -
  // the owner's correction path, enforced by the API too.
  const canVoid = p.status !== PurchaseStatus.VOIDED && isSuperAdmin;

  const onMarkInTransit = async () => {
    const ok = await confirm({
      title: "Mark as in transit?",
      description:
        "The goods have been picked up and are on the road to the warehouse.",
      confirmText: "Mark in transit",
    });
    if (!ok) return;
    try {
      await markInTransit(p.id).unwrap();
      notify.success("Marked in transit");
    } catch (err) {
      notify.error("Couldn't update the purchase", {
        description: extractApiError(err).message,
      });
    }
  };

  const actions =
    canTransit || canReceive || canVoid ? (
      <ActionRow className="xl:flex-col">
        {canTransit ? (
          <AdminButton
            variant="secondary"
            disabled={transitState.isLoading}
            loading={transitState.isLoading}
            onClick={() => void onMarkInTransit()}
          >
            Mark in transit
          </AdminButton>
        ) : null}
        {canReceive ? (
          <AdminButton onClick={() => setReceiveOpen(true)}>
            Receive into warehouse
          </AdminButton>
        ) : null}
        {canVoid ? (
          <AdminButton
            variant="danger"
            onClick={() => setVoidOpen(true)}
          >
            Void purchase
          </AdminButton>
        ) : null}
      </ActionRow>
    ) : null;

  return (
    <div className="max-w-[1120px]">
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Purchases", href: LIST }]}
        current="Purchase details"
      />
      <DetailHeader
        title="Purchase details"
        hint="One load bought: the weight, the price and where it was stored."
        sub={`${SOURCE_LABEL[p.source]} purchase from ${purchaseCounterparty(p)}`}
        badges={
          <>
            <PurchaseStatusBadge status={p.status} />
            <ApprovalOverlayBadge approval={p.approval} />
          </>
        }
        actions={
          <AdminButton variant="outline" asChild>
            <a
              href={receiptPdfUrl("purchase", p.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View PDF
            </a>
          </AdminButton>
        }
      />

      {p.approval && p.approval.status !== "APPROVED" ? (
        <AdminCard className="mb-4 border-console-gold/50 bg-console-gold/8 px-4 py-3 text-[13px] leading-[1.55] text-adm-ink">
          {p.approval.status === "PENDING" ? (
            <>
              This purchase is at or above the approval threshold and is
              waiting for sign-off.{" "}
              <Link
                href="/admin/approvals"
                className={cn(adminLinkClass, "font-semibold")}
              >
                Open the approvals inbox →
              </Link>
            </>
          ) : (
            <>
              The approval for this purchase was <strong>rejected</strong> -
              rejection undoes nothing by itself; voiding reverses the money
              and stock.
            </>
          )}
        </AdminCard>
      ) : null}

      <DetailShell
        main={
          <div className="flex flex-col gap-4">
            <AdminCard className="px-5 py-3">
              <SectionHeading
                className="mb-1"
                hint="Variance is the gap between the weight written down at the village and the weight the warehouse scale gave."
              >
                Weights &amp; variance
              </SectionHeading>
              <DetailGrid>
                {/* What was bought - the heading names the page. */}
                <DetailItem label="Commodity" strong>
                  <Link
                    className={adminLinkClass}
                    href={`/admin/commodities/${p.commodity.id}`}
                  >
                    {p.commodity.name}
                  </Link>
                </DetailItem>
                <DetailItem label="Recorded weight" mono>
                  {formatKg(p.weightKg)}
                </DetailItem>
                {p.receivedKg !== null ? (
                  <>
                    <DetailItem label="Received weight" mono>
                      {formatKg(p.receivedKg)}
                    </DetailItem>
                    <DetailItem label="Variance" mono>
                      <span
                        className={cn(
                          (p.varianceKg ?? 0) > 0 ? "text-console-red" : "text-adm-ink",
                        )}
                      >
                        {(p.varianceKg ?? 0) === 0
                          ? "None - received exactly as recorded"
                          : `${formatKg(Math.abs(p.varianceKg ?? 0))} ${
                              (p.varianceKg ?? 0) > 0 ? "short" : "over"
                            }`}
                      </span>
                    </DetailItem>
                  </>
                ) : null}
              </DetailGrid>
            </AdminCard>

            <AdminCard className="px-5 py-3">
              <SectionHeading
                className="mb-1"
                hint="What was agreed for the grain itself. The costs of getting it in are the section below."
              >
                Money
              </SectionHeading>
              <DetailGrid>
                {/* "Total" is the purchase price and nothing else: it is the
                    figure a supplier's invoice is checked against, and turning
                    it into the landed cost would break every reconciliation
                    that reads this line. */}
                <DetailItem label="Purchase price" mono strong>
                  {formatCedis(p.totalGhs)}
                </DetailItem>
                <DetailItem label="Price per kg" mono>
                  {formatCedis(p.unitPriceGhs)}
                </DetailItem>
              </DetailGrid>
            </AdminCard>

            {/* What the grain was bought for is above; what it has COST is a
                different figure, and the business had no way of stating it.
                Haulage from the farm gate, loading and porterage were spend of
                whatever month they were paid in, so a load bought in the
                harvest window printed a loss then and a flattering margin
                whenever it sold. */}
            <PurchaseCostsCard
              isVoided={p.voidedAt !== null}
              purchaseId={p.id}
              totalGhs={p.totalGhs}
            />

            {/* What was AGREED is above; what has actually been handed over is
                its own ledger, because they are different facts. */}
            <PurchaseSettlementCard
              isVoided={p.voidedAt !== null}
              payeeName={purchaseCounterparty(p)}
              purchaseId={p.id}
              totalGhs={p.totalGhs}
            />

            <AdminCard className="px-5 py-3">
              <SectionHeading className="mb-1">Parties & logistics</SectionHeading>
              <DetailGrid>
                <DetailItem label="Source">{SOURCE_LABEL[p.source]}</DetailItem>
                <DetailItem label="Warehouse">
                  {p.warehouse ? (
                    <Link
                      className={adminLinkClass}
                      href={`/admin/warehouses/${p.warehouse.id}`}
                    >
                      {p.warehouse.name}
                    </Link>
                  ) : (
                    "Not yet assigned"
                  )}
                </DetailItem>
                {/* The agent stays plain text: the API gives a field profile
                    id here, and the agent page is keyed by USER id - there is
                    no id on this record that would reach it. */}
                {p.agent ? (
                  <DetailItem label="Paying agent">{p.agent.name}</DetailItem>
                ) : null}
                {p.supplier ? (
                  <DetailItem label="Supplier">
                    <Link
                      className={adminLinkClass}
                      href={`/admin/suppliers/${p.supplier.id}`}
                    >
                      {p.supplier.name}
                    </Link>
                  </DetailItem>
                ) : null}
              </DetailGrid>
            </AdminCard>

            <AdminCard className="px-5 py-3">
              <SectionHeading className="mb-1">Timeline</SectionHeading>
              <DetailGrid>
                <DetailItem label="Purchased">
                  {formatConsoleDate(p.purchasedAt)}
                </DetailItem>
                {p.inTransitAt ? (
                  <DetailItem label="In transit">
                    {formatConsoleDate(p.inTransitAt)}
                  </DetailItem>
                ) : null}
                {p.receivedAt ? (
                  <DetailItem label="Received">
                    {formatConsoleDate(p.receivedAt)}
                  </DetailItem>
                ) : null}
                {p.voidedAt ? (
                  <DetailItem label="Voided">
                    {formatConsoleDate(p.voidedAt)}
                  </DetailItem>
                ) : null}
                {p.voidedAt ? (
                  <DetailItem full label="Void reason">
                    {p.voidReason}
                  </DetailItem>
                ) : null}
                {p.notes ? (
                  <DetailItem
                    label="Notes"
                    className="sm:col-span-2 xl:col-span-3"
                  >
                    {p.notes}
                  </DetailItem>
                ) : null}
              </DetailGrid>
            </AdminCard>
          </div>
        }
        aside={
          <div className="flex flex-col gap-4">
            <AdminCard className="px-5 py-4">
              <PurchaseGoodsCostSummary
                purchaseId={p.id}
                totalGhs={p.totalGhs}
                unitPriceGhs={p.unitPriceGhs}
                weightKg={p.weightKg}
              />
              {actions ? (
                <div className="mt-4 border-t border-adm-hairline pt-3.5">
                  {actions}
                </div>
              ) : null}
            </AdminCard>

            {p.photo ? (
              <AdminCard className="px-5 py-4">
                <SectionHeading className="mb-2">Weigh-slip</SectionHeading>
                <Image
                  src={p.photo}
                  alt="Weigh-slip photo"
                  width={560}
                  height={360}
                  unoptimized
                  className="h-auto w-full rounded border border-adm-line object-contain"
                />
              </AdminCard>
            ) : null}
          </div>
        }
      />

      {receiveOpen ? (
        <ReceiveDialog
          purchase={p}
          open={receiveOpen}
          onClose={() => setReceiveOpen(false)}
        />
      ) : null}
      {voidOpen ? (
        <VoidDialog
          purchase={p}
          open={voidOpen}
          onClose={() => setVoidOpen(false)}
        />
      ) : null}
      {confirmationDialog}
    </div>
  );
}
