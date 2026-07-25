"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  adminSelectClass,
  DetailRow,
  Mono,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { PurchaseStatus, type IPurchase } from "@/types/purchase.types";
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

  const {
    register,
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

  const onSubmit = async (values: ReceivePurchaseValues) => {
    try {
      await receive({
        id: purchase.id,
        body: {
          receivedKg: Number(values.receivedKg),
          warehouseId: values.warehouseId,
          ...(values.receivedAt ? { receivedAt: values.receivedAt } : {}),
        },
      }).unwrap();
      notify.success("Purchase received - stock is now on hand");
      onClose();
    } catch (err) {
      notify.error("Couldn't receive the purchase", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Receive into warehouse</DialogTitle>
          <DialogDescription>
            The recorded weight was {formatKg(purchase.weightKg)}. Enter what
            the warehouse scale actually says - the difference is kept as
            variance, never silently absorbed.
          </DialogDescription>
        </DialogHeader>
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
              className={cn(adminInputClass, errors.receivedKg && "border-error")}
              {...register("receivedKg")}
            />
          </AdminField>
          {receivedKg > 0 && variance !== 0 ? (
            <p
              className={cn(
                "text-[12.5px]",
                variance > 0 ? "text-error" : "text-leaf",
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
            <select
              className={cn(
                adminSelectClass,
                "w-full",
                errors.warehouseId && "border-error",
              )}
              {...register("warehouseId")}
            >
              <option value="">Choose the warehouse</option>
              {(warehouses.data?.data ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Received date" optional>
            <Input
              type="date"
              className={adminInputClass}
              {...register("receivedAt")}
            />
          </AdminField>
          <DialogFooter className="gap-2">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Void this purchase?</DialogTitle>
          <DialogDescription>
            Voiding is the owner&apos;s correction path: it reverses the float
            debit{purchase.status === PurchaseStatus.RECEIVED
              ? " and takes the received stock back out"
              : ""}{" "}
            with compensating ledger entries. Nothing is deleted or rewritten.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Reason" error={errors.reason?.message}>
            <textarea
              rows={2}
              placeholder="Why is this purchase being voided?"
              className={cn(
                adminInputClass,
                "h-auto min-h-[60px] w-full resize-y py-2",
                errors.reason && "border-error",
              )}
              {...register("reason")}
            />
          </AdminField>
          <DialogFooter className="gap-2">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PurchaseDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetPurchaseQuery(id);
  const [markInTransit, transitState] = useMarkPurchaseInTransitMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const { isSuperAdmin } = useAuthRole();
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);

  if (isLoading) return <DataTableSkeleton />;
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

  return (
    <div className="max-w-[640px]">
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
        <AdminCard className="mb-3 border-console-gold/50 bg-console-gold/8 px-4 py-3 text-[13px] leading-[1.55] text-ink">
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
              rejection undoes nothing by itself; voiding below reverses the
              money and stock.
            </>
          )}
        </AdminCard>
      ) : null}

      <AdminCard className="px-5 py-2">
        <DetailRow label="Total" mono>
          <span className="font-semibold">{formatCedis(p.totalGhs)}</span>
        </DetailRow>
        <DetailRow label="Price per kg" mono>
          {formatCedis(p.unitPriceGhs)}
        </DetailRow>
        <DetailRow label="Recorded weight" mono>
          {formatKg(p.weightKg)}
        </DetailRow>
        {p.receivedKg !== null ? (
          <>
            <DetailRow label="Received weight" mono>
              {formatKg(p.receivedKg)}
            </DetailRow>
            <DetailRow label="Variance" mono>
              <span
                className={cn(
                  (p.varianceKg ?? 0) > 0 ? "text-error" : "text-ink",
                )}
              >
                {(p.varianceKg ?? 0) === 0
                  ? "None - received exactly as recorded"
                  : `${formatKg(Math.abs(p.varianceKg ?? 0))} ${
                      (p.varianceKg ?? 0) > 0 ? "short" : "over"
                    }`}
              </span>
            </DetailRow>
          </>
        ) : null}
        <DetailRow label="Warehouse">
          {p.warehouse?.name ?? "Not yet assigned"}
        </DetailRow>
        {p.agent ? <DetailRow label="Paying agent">{p.agent.name}</DetailRow> : null}
        {p.supplier ? <DetailRow label="Supplier">{p.supplier.name}</DetailRow> : null}
        <DetailRow label="Purchased">{formatConsoleDate(p.purchasedAt)}</DetailRow>
        {p.inTransitAt ? (
          <DetailRow label="In transit">{formatConsoleDate(p.inTransitAt)}</DetailRow>
        ) : null}
        {p.receivedAt ? (
          <DetailRow label="Received">{formatConsoleDate(p.receivedAt)}</DetailRow>
        ) : null}
        {p.notes ? <DetailRow label="Notes">{p.notes}</DetailRow> : null}
        {p.voidedAt ? (
          <>
            <DetailRow label="Voided">{formatConsoleDate(p.voidedAt)}</DetailRow>
            <DetailRow label="Void reason">{p.voidReason}</DetailRow>
          </>
        ) : null}
      </AdminCard>

      {p.photo ? (
        <AdminCard className="mt-3 px-5 py-4">
          <p className="mb-2 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
            Weigh-slip
          </p>
          <Image
            src={p.photo}
            alt="Weigh-slip photo"
            width={560}
            height={360}
            unoptimized
            className="h-auto w-full max-w-[420px] rounded border border-soil/25 object-contain"
          />
        </AdminCard>
      ) : null}

      {canTransit || canReceive || canVoid ? (
        <div className="mt-4 flex flex-wrap gap-2">
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
            <AdminButton
              className="h-9 px-4"
              onClick={() => setReceiveOpen(true)}
            >
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
      ) : null}

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
