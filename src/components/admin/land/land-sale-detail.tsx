"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  DetailRow,
  Mono,
  adminInputClass,
  adminSelectClass,
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
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCancelLandSaleMutation,
  useConfirmLandSaleMutation,
  useGetLandSaleQuery,
  useRecordLandPaymentMutation,
} from "@/redux/land/land-sales-api";
import type { ILandSaleDetail } from "@/types/land.types";
import {
  cancelLandSaleSchema,
  landPaymentSchema,
  type CancelLandSaleValues,
  type LandPaymentValues,
} from "@/validations/land-schema";
import {
  Money,
  PAYMENT_METHOD_OPTIONS,
  formatSaleDate,
  todayInputValue,
} from "@/components/admin/trading/sale-bits";
import { LandSaleStatusBadge } from "./land-bits";

const LIST = "/admin/land-sales";

function Row({
  label,
  children,
  strong = false,
}: {
  children: React.ReactNode;
  label: string;
  strong?: boolean;
}) {
  return (
    <DetailRow label={label} mono strong={strong}>
      {children}
    </DetailRow>
  );
}

function PaymentDialog({
  sale,
  onClose,
}: {
  sale: ILandSaleDetail;
  onClose: () => void;
}) {
  const [record, { isLoading }] = useRecordLandPaymentMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LandPaymentValues>({
    resolver: zodResolver(landPaymentSchema),
    defaultValues: { method: "BANK", paidAt: todayInputValue() },
  });
  const onSubmit = async (values: LandPaymentValues) => {
    try {
      await record({
        id: sale.id,
        body: {
          amountGhs: Number(values.amountGhs),
          method: values.method,
          ...(values.reference?.trim() ? { reference: values.reference.trim() } : {}),
          ...(values.paidAt ? { paidAt: values.paidAt } : {}),
        },
      }).unwrap();
      notify.success("Payment recorded");
      onClose();
    } catch (err) {
      notify.error("Couldn't record the payment", {
        description: extractApiError(err).message,
      });
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Part-payments are fine. Full payment completes the sale and marks the
            plot sold.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <AdminField label="Amount (GHS)" error={errors.amountGhs?.message}>
            <Input
              inputMode="decimal"
              className={cn(adminInputClass, errors.amountGhs && "border-error")}
              {...register("amountGhs")}
            />
          </AdminField>
          <AdminField label="Method">
            <select className={cn(adminSelectClass, "w-full")} {...register("method")}>
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Reference" optional>
            <Input className={adminInputClass} {...register("reference")} />
          </AdminField>
          <AdminField label="Payment date" optional>
            <Input type="date" className={adminInputClass} {...register("paidAt")} />
          </AdminField>
          <DialogFooter className="gap-2">
            <AdminButton type="button" variant="outline" className="h-9 px-3.5" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} className="h-9 px-4">
              {isLoading ? "Recording…" : "Record payment"}
            </AdminButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  sale,
  onClose,
}: {
  sale: ILandSaleDetail;
  onClose: () => void;
}) {
  const [cancel, { isLoading }] = useCancelLandSaleMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelLandSaleValues>({
    resolver: zodResolver(cancelLandSaleSchema),
    defaultValues: { reason: "" },
  });
  const onSubmit = async (values: CancelLandSaleValues) => {
    try {
      await cancel({ id: sale.id, reason: values.reason }).unwrap();
      notify.success("Land sale cancelled");
      onClose();
    } catch (err) {
      notify.error("Couldn't cancel the sale", {
        description: extractApiError(err).message,
      });
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Cancel this land sale?</DialogTitle>
          <DialogDescription>
            Only possible while nothing has been paid. The plot returns to
            available.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <AdminField label="Reason" error={errors.reason?.message}>
            <Input
              className={cn(adminInputClass, errors.reason && "border-error")}
              {...register("reason")}
            />
          </AdminField>
          <DialogFooter className="gap-2">
            <AdminButton type="button" variant="outline" className="h-9 px-3.5" onClick={onClose}>
              Keep sale
            </AdminButton>
            <AdminButton type="submit" variant="danger" disabled={isLoading} className="h-9 px-4">
              {isLoading ? "Cancelling…" : "Cancel sale"}
            </AdminButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LandSaleDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetLandSaleQuery(id);
  const [confirmSale, confirmState] = useConfirmLandSaleMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const s = data.data.sale;

  const onConfirm = async () => {
    const ok = await confirm({
      title: "Confirm this land sale?",
      description: "The plot is reserved and the terms are locked in.",
      confirmText: "Confirm",
    });
    if (!ok) return;
    try {
      await confirmSale(s.id).unwrap();
      notify.success("Land sale confirmed - plot reserved");
    } catch (err) {
      notify.error("Couldn't confirm", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[680px]">
      <BackButton href={LIST} label="All land sales" className="mb-2" />
      <AdminPageHeader
        title={`${s.plot.reference} · ${s.buyer.name}`}
        sub={s.plot.locationText}
        actions={<LandSaleStatusBadge status={s.status} />}
      />

      <AdminCard className="mb-4 px-5 py-3">
        <Row label="Agreed price" strong>
          <Money value={s.agreedPriceGhs} />
        </Row>
        <div className="border-t border-soil/12">
          <Row label="Paid">
            <Money value={s.paidGhs} />
          </Row>
        </div>
        <div className="border-t border-soil/12">
          <Row label="Balance" strong>
            <span className={cn(s.balanceGhs === 0 ? "text-leaf" : "text-console-red")}>
              {s.balanceGhs === 0 ? "Paid in full" : <Money value={s.balanceGhs} />}
            </span>
          </Row>
        </div>
        <div className="border-t border-soil/12">
          <Row label="Margin">
            <Money value={s.marginGhs} />
          </Row>
        </div>
      </AdminCard>

      <div className="mb-4 flex flex-wrap gap-2">
        {s.status === "DRAFT" ? (
          <AdminButton
            className="h-9 px-4"
            disabled={confirmState.isLoading}
            onClick={() => void onConfirm()}
          >
            {confirmState.isLoading ? "Confirming…" : "Confirm sale"}
          </AdminButton>
        ) : null}
        {s.status === "CONFIRMED" ? (
          <AdminButton className="h-9 px-4" onClick={() => setPayOpen(true)}>
            Record payment
          </AdminButton>
        ) : null}
        {s.status === "DRAFT" || s.status === "CONFIRMED" ? (
          <AdminButton
            variant="outline"
            className="h-9 px-4"
            onClick={() => setCancelOpen(true)}
          >
            Cancel sale
          </AdminButton>
        ) : null}
      </div>

      {s.status === "CANCELLED" && s.cancelReason ? (
        <AdminCard className="mb-4 border-error/40 bg-error/[0.04] px-4 py-3 text-[13px] text-ink">
          Cancelled: {s.cancelReason}
        </AdminCard>
      ) : null}

      <AdminCard className="px-5 py-3">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Payments
        </div>
        {s.payments.length === 0 ? (
          <p className="py-2 text-[13px] text-soil">No payments recorded yet.</p>
        ) : (
          s.payments.map((p) => (
            <div
              key={p.id}
              className="flex items-baseline justify-between gap-3 border-b border-soil/10 py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <span className="text-ink">{p.method}</span>
                <span className="ml-2 text-[12px] text-soil">
                  {formatSaleDate(p.paidAt)}
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
              </div>
              <Mono className="whitespace-nowrap text-[13px] font-semibold text-leaf">
                <Money value={p.amountGhs} />
              </Mono>
            </div>
          ))
        )}
      </AdminCard>

      {payOpen ? <PaymentDialog sale={s} onClose={() => setPayOpen(false)} /> : null}
      {cancelOpen ? <CancelDialog sale={s} onClose={() => setCancelOpen(false)} /> : null}
      {confirmationDialog}
    </div>
  );
}
