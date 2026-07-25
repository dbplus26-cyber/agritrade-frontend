"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
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
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCancelSaleMutation,
  useConfirmSaleMutation,
  useGetSaleQuery,
  useRecordSalePaymentMutation,
} from "@/redux/sales/admin-sales-api";
import type { ISaleDetail } from "@/types/admin-sale.types";
import {
  cancelSaleSchema,
  recordPaymentSchema,
  type CancelSaleValues,
  type RecordPaymentValues,
} from "@/validations/sale-schema";
import {
  Money,
  PAYMENT_METHOD_OPTIONS,
  SaleStatusBadge,
  formatSaleDate,
  milestoneTriggerLabel,
  todayInputValue,
} from "./sale-bits";

const LIST = "/admin/sales";

function SummaryRow({
  label,
  children,
  strong = false,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        {label}
      </span>
      <span
        className={cn(
          "font-adminmono text-right tabular-nums",
          strong ? "text-[15px] font-bold text-ink" : "text-[13.5px] text-ink",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** Record a manual payment against a confirmed sale. */
function PaymentDialog({
  sale,
  open,
  onClose,
}: {
  sale: ISaleDetail;
  open: boolean;
  onClose: () => void;
}) {
  const [record, { isLoading }] = useRecordSalePaymentMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecordPaymentValues>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: { method: "CASH", paidAt: todayInputValue() },
  });

  const onSubmit = async (values: RecordPaymentValues) => {
    try {
      await record({
        id: sale.id,
        body: {
          amountGhs: Number(values.amountGhs),
          method: values.method,
          ...(values.reference?.trim()
            ? { reference: values.reference.trim() }
            : {}),
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            Manual payments only (cash, mobile money, bank). Online payments are
            recorded automatically when the buyer pays.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Amount (GHS)" error={errors.amountGhs?.message}>
            <Input
              inputMode="decimal"
              className={cn(adminInputClass, errors.amountGhs && "border-error")}
              {...register("amountGhs")}
            />
          </AdminField>
          <AdminField label="Method" error={errors.method?.message}>
            <select
              className={cn(adminSelectClass, "w-full")}
              {...register("method")}
            >
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Reference" optional>
            <Input
              className={adminInputClass}
              placeholder="MoMo / bank reference"
              {...register("reference")}
            />
          </AdminField>
          <AdminField label="Payment date" optional>
            <Input
              type="date"
              className={adminInputClass}
              {...register("paidAt")}
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
            <AdminButton type="submit" disabled={isLoading} className="h-9 px-4">
              {isLoading ? "Recording…" : "Record payment"}
            </AdminButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Cancel a sale (allowed only while nothing has been paid). */
function CancelDialog({
  sale,
  open,
  onClose,
}: {
  sale: ISaleDetail;
  open: boolean;
  onClose: () => void;
}) {
  const [cancel, { isLoading }] = useCancelSaleMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelSaleValues>({
    resolver: zodResolver(cancelSaleSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = async (values: CancelSaleValues) => {
    try {
      await cancel({ id: sale.id, reason: values.reason }).unwrap();
      notify.success("Sale cancelled");
      onClose();
    } catch (err) {
      notify.error("Couldn't cancel the sale", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Cancel this sale?</DialogTitle>
          <DialogDescription>
            Cancelling is only possible while nothing has been paid. A reason is
            kept on the record.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Reason" error={errors.reason?.message}>
            <Input
              className={cn(adminInputClass, errors.reason && "border-error")}
              placeholder="Why is this sale being cancelled?"
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
              Keep sale
            </AdminButton>
            <AdminButton
              type="submit"
              variant="danger"
              disabled={isLoading}
              className="h-9 px-4"
            >
              {isLoading ? "Cancelling…" : "Cancel sale"}
            </AdminButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SaleDetail({
  id,
  initialPayOpen = false,
}: {
  id: string;
  initialPayOpen?: boolean;
}) {
  const { data, isLoading, isError, error, refetch } = useGetSaleQuery(id);
  const [confirmSale, confirmState] = useConfirmSaleMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const [payOpen, setPayOpen] = useState(initialPayOpen);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const sale = data.data.sale;
  const isDraft = sale.status === "DRAFT";
  const canPay = sale.status === "CONFIRMED" || sale.status === "FULFILLED";
  const canCancel = sale.status === "DRAFT" || sale.status === "CONFIRMED";

  const onConfirm = async () => {
    const ok = await confirm({
      title: "Confirm this sale?",
      description:
        "The payment terms are resolved and locked in, and the agreed lines can no longer be edited.",
      confirmText: "Confirm sale",
    });
    if (!ok) return;
    try {
      await confirmSale({ id: sale.id }).unwrap();
      notify.success("Sale confirmed - payment terms are locked in");
    } catch (err) {
      notify.error("Couldn't confirm the sale", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[720px]">
      <BackButton href={LIST} label="All sales" className="mb-2" />
      <AdminPageHeader
        title={sale.buyer.name}
        sub={`Drafted ${formatSaleDate(sale.createdAt)}`}
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            <SaleStatusBadge status={sale.status} />
          </span>
        }
      />

      {/* Money summary */}
      <AdminCard className="mb-4 px-5 py-3">
        <SummaryRow label="Agreed total" strong>
          <Money value={sale.agreedTotalGhs} />
        </SummaryRow>
        <div className="border-t border-soil/12">
          <SummaryRow label="Paid">
            <Money value={sale.paidGhs} />
          </SummaryRow>
        </div>
        <div className="border-t border-soil/12">
          <SummaryRow label="Balance" strong>
            <span
              className={cn(
                sale.balanceGhs === 0 ? "text-leaf" : "text-console-red",
              )}
            >
              {sale.balanceGhs === 0 ? (
                "Paid in full"
              ) : (
                <Money value={sale.balanceGhs} />
              )}
            </span>
          </SummaryRow>
        </div>
        {sale.paymentPolicy ? (
          <div className="border-t border-soil/12 pt-2 text-[12px] text-soil">
            Payment terms: {sale.paymentPolicy.name}
          </div>
        ) : null}
      </AdminCard>

      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        {isDraft ? (
          <>
            <AdminButton
              className="h-9 px-4"
              disabled={confirmState.isLoading}
              onClick={() => void onConfirm()}
            >
              {confirmState.isLoading ? "Confirming…" : "Confirm sale"}
            </AdminButton>
            <AdminButton variant="outline" className="h-9 px-4" asChild>
              <Link href={`${LIST}/${sale.id}/edit`}>Edit draft</Link>
            </AdminButton>
          </>
        ) : null}
        {canPay ? (
          <AdminButton className="h-9 px-4" onClick={() => setPayOpen(true)}>
            Record payment
          </AdminButton>
        ) : null}
        {sale.status === "CONFIRMED" ? (
          <AdminButton variant="outline" className="h-9 px-4" asChild>
            <Link href={`/admin/shipments/new?saleId=${sale.id}`}>
              Ship goods
            </Link>
          </AdminButton>
        ) : null}
        {canCancel ? (
          <AdminButton
            variant="outline"
            className="h-9 px-4"
            onClick={() => setCancelOpen(true)}
          >
            Cancel sale
          </AdminButton>
        ) : null}
        {sale.status !== "DRAFT" && sale.status !== "CANCELLED" ? (
          <AdminButton variant="outline" className="h-9 px-4" asChild>
            <Link href={`${LIST}/${sale.id}/invoice`}>
              {sale.balanceGhs === 0 ? "Receipt" : "Invoice"}
            </Link>
          </AdminButton>
        ) : null}
      </div>

      {sale.status === "CANCELLED" && sale.cancelReason ? (
        <AdminCard className="mb-4 border-error/40 bg-error/[0.04] px-4 py-3 text-[13px] text-ink">
          Cancelled: {sale.cancelReason}
        </AdminCard>
      ) : null}

      {/* Lines */}
      <AdminCard className="mb-4 px-5 py-3">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Goods
        </div>
        {sale.lines.map((l) => (
          <div
            key={l.id}
            className="flex items-baseline justify-between gap-3 border-b border-soil/10 py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <span className="font-medium text-ink">{l.commodity.name}</span>
              <Mono className="ml-2 text-[12px] text-soil">
                {formatKg(l.weightKg)} @ <Money value={l.unitPriceGhs} />
              </Mono>
            </div>
            <Mono className="whitespace-nowrap text-[13px] text-ink">
              <Money value={l.totalGhs} />
            </Mono>
          </div>
        ))}
      </AdminCard>

      {/* Milestone schedule (once confirmed) */}
      {sale.milestones.length > 0 ? (
        <AdminCard className="mb-4 px-5 py-3">
          <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
            Payment schedule
          </div>
          {sale.milestones.map((m, i) => (
            <div
              key={`${m.label}-${String(i)}`}
              className="flex items-baseline justify-between gap-3 border-b border-soil/10 py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <span className="text-ink">{m.label}</span>
                <span className="ml-2 text-[12px] text-soil">
                  {m.percent}% · {milestoneTriggerLabel(m.trigger)}
                </span>
              </div>
              <Mono className="whitespace-nowrap text-[13px] text-ink">
                <Money value={m.amountGhs} />
              </Mono>
            </div>
          ))}
        </AdminCard>
      ) : null}

      {/* Payments ledger */}
      <AdminCard className="px-5 py-3">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
          Payments
        </div>
        {sale.payments.length === 0 ? (
          <p className="py-2 text-[13px] text-soil">No payments recorded yet.</p>
        ) : (
          sale.payments.map((p) => (
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

      {payOpen ? (
        <PaymentDialog
          sale={sale}
          open={payOpen}
          onClose={() => setPayOpen(false)}
        />
      ) : null}
      {cancelOpen ? (
        <CancelDialog
          sale={sale}
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
        />
      ) : null}
      {confirmationDialog}
    </div>
  );
}
