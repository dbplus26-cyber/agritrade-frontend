"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  DetailGrid,
  DetailItem,
  DetailShell,
  Mono,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { BackButton } from "@/components/ui/BackButton";
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
import {
  useGetPurchaseQuery,
  useMarkPurchaseInTransitMutation,
  useReceivePurchaseMutation,
  useVoidPurchaseMutation,
} from "@/redux/purchases/purchases-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis, formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
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
            className="flex flex-col gap-3"
          >
            <AdminField
              label="Received weight (kg)"
              error={errors.receivedKg?.message}
            >
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.receivedKg && "border-console-red")}
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
              <Input
                type="date"
                className={adminInputClass}
                {...register("receivedAt")}
              />
            </AdminField>
            <ResponsiveDialogFooter className="gap-2">
              <AdminButton
                type="button"
                variant="outline"
                className="h-9 px-3.5"
                onClick={onClose}
              >
                Cancel
              </AdminButton>
              <AdminButton
                type="submit"
                disabled={isLoading}
                className="h-9 px-4"
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
          className="flex flex-col gap-3"
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
              className="h-9 px-3.5"
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="submit"
              variant="danger"
              disabled={isLoading}
              className="h-9 px-4"
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
  const canTransit = p.status === PurchaseStatus.RECORDED;
  const canReceive =
    p.status === PurchaseStatus.RECORDED ||
    p.status === PurchaseStatus.IN_TRANSIT;
  // Voiding reverses the float and stock ledgers with compensating entries -
  // the owner's correction path (design doc 5.1), enforced by the API too.
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
      <div className="flex flex-wrap gap-2 xl:flex-col">
        {canTransit ? (
          <AdminButton
            variant="secondary"
            className="h-9 px-4"
            disabled={transitState.isLoading}
            onClick={() => void onMarkInTransit()}
          >
            Mark in transit
          </AdminButton>
        ) : null}
        {canReceive ? (
          <AdminButton className="h-9 px-4" onClick={() => setReceiveOpen(true)}>
            Receive into warehouse
          </AdminButton>
        ) : null}
        {canVoid ? (
          <AdminButton
            variant="danger"
            className="h-9 px-4"
            onClick={() => setVoidOpen(true)}
          >
            Void purchase
          </AdminButton>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All purchases" className="mb-2" />
      <AdminPageHeader
        title={`${p.commodity.name} · ${formatKg(p.weightKg)}`}
        sub={`${SOURCE_LABEL[p.source]} purchase from ${purchaseCounterparty(p)}`}
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            <PurchaseStatusBadge status={p.status} />
            <ApprovalOverlayBadge approval={p.approval} />
          </span>
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
                className="font-semibold text-console underline-offset-2 hover:underline"
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
              <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Weights & variance
              </p>
              <DetailGrid>
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
              <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Money
              </p>
              <DetailGrid>
                <DetailItem label="Total" mono strong>
                  {formatCedis(p.totalGhs)}
                </DetailItem>
                <DetailItem label="Price per kg" mono>
                  {formatCedis(p.unitPriceGhs)}
                </DetailItem>
              </DetailGrid>
            </AdminCard>

            <AdminCard className="px-5 py-3">
              <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Parties & logistics
              </p>
              <DetailGrid>
                <DetailItem label="Source">{SOURCE_LABEL[p.source]}</DetailItem>
                <DetailItem label="Warehouse">
                  {p.warehouse?.name ?? "Not yet assigned"}
                </DetailItem>
                {p.agent ? (
                  <DetailItem label="Paying agent">{p.agent.name}</DetailItem>
                ) : null}
                {p.supplier ? (
                  <DetailItem label="Supplier">{p.supplier.name}</DetailItem>
                ) : null}
              </DetailGrid>
            </AdminCard>

            <AdminCard className="px-5 py-3">
              <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Timeline
              </p>
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
                  <DetailItem label="Void reason">{p.voidReason}</DetailItem>
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
              <p className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Purchase total
              </p>
              <p className="font-adminmono mt-1 text-[26px] font-bold text-adm-ink tabular-nums">
                {formatCedis(p.totalGhs)}
              </p>
              <p className="mt-1 text-[12.5px] text-adm-muted">
                <Mono>{formatKg(p.weightKg)}</Mono> at{" "}
                <Mono>{formatCedis(p.unitPriceGhs)}</Mono> per kg
              </p>
              {actions ? (
                <div className="mt-4 border-t border-adm-hairline pt-3.5">
                  {actions}
                </div>
              ) : null}
            </AdminCard>

            {p.photo ? (
              <AdminCard className="px-5 py-4">
                <p className="mb-2 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                  Weigh-slip
                </p>
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
