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
  DetailShell,
  Mono,
  ToneBadge,
  adminInputClass,
} from "@/components/admin/ui";
import { HelpTip } from "@/components/admin/help-tip";
import { BackButton } from "@/components/ui/BackButton";
import { DateOnlyCell } from "@/components/admin/date-cell";
import { DetailSkeleton } from "@/components/admin/skeletons";
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
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis, formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCancelSaleMutation,
  useConfirmSaleMutation,
  useReverseSalePaymentMutation,
  useGetSaleQuery,
} from "@/redux/sales/admin-sales-api";
import type { ISaleDetail } from "@/types/admin-sale.types";
import {
  cancelSaleSchema,
  type CancelSaleValues,
} from "@/validations/sale-schema";
import { PaymentDialog } from "./payment-dialog";
import {
  Money,
  SaleStatusBadge,
  formatSaleDate,
  milestoneTriggerLabel,
} from "./sale-bits";
import { ShipmentStatusBadge } from "./shipment-bits";

const LIST = "/admin/sales";

function SummaryRow({
  label,
  hint,
  children,
  strong = false,
}: {
  label: string;
  /** One sentence on what this figure is, shown on hover beside the label. */
  hint?: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What is ${label}?`} text={hint} /> : null}
      </span>
      <span
        className={cn(
          "font-adminmono text-right tabular-nums",
          strong ? "text-[15px] font-bold text-adm-ink" : "text-[13.5px] text-adm-ink",
        )}
      >
        {children}
      </span>
    </div>
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
              className={cn(adminInputClass, errors.reason && "border-console-red")}
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
  const { isSuperAdmin } = useAuthRole();
  const [reversePayment] = useReverseSalePaymentMutation();

  /**
   * Writes a negative compensating row. Typing the sale's number back proves
   * the reversal is aimed at the right order - the money has already left the
   * business by the time anyone reaches for this.
   */
  const reverseOne = async (paymentId: string, amountGhs: null | number) => {
    const ok = await confirm({
      title: "Reverse this payment?",
      description: `${
        amountGhs === null ? "This payment" : formatCedis(amountGhs)
      } comes back off the sale as a compensating entry - nothing is deleted. Do this once the buyer has actually been refunded.`,
      confirmText: "Reverse payment",
      isDestructive: true,
      requireExactMatch: sale.transactionNo,
    });
    if (!ok) return;
    try {
      await reversePayment({
        id: sale.id,
        paymentId,
        reason: `Reversed against ${sale.transactionNo}`,
      }).unwrap();
      notify.success("Payment reversed");
    } catch (err) {
      notify.error("Couldn't reverse the payment", {
        description: extractApiError(err).message,
      });
    }
  };
  const [payOpen, setPayOpen] = useState(initialPayOpen);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <DetailSkeleton main="ledger" cards={3} />;
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

  const actions = (
    <div className="flex flex-wrap gap-2 xl:flex-col">
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
  );

  const aside = (
    <div className="flex flex-col gap-4">
      {/* Money summary + actions */}
      <AdminCard className="px-5 py-3">
        {/* Which buyer. The heading names the page, so the record has to
            name the counterparty. */}
        <SummaryRow label="Buyer">{sale.buyer.name}</SummaryRow>
        <SummaryRow
          label="Agreed total"
          hint="The full price the buyer agreed to pay for everything on this order."
          strong
        >
          <Money value={sale.agreedTotalGhs} />
        </SummaryRow>
        <div className="border-t border-adm-hairline">
          <SummaryRow
            label="Paid"
            hint="Everything the buyer has actually handed over so far on this order."
          >
            <Money value={sale.paidGhs} />
          </SummaryRow>
        </div>
        <div className="border-t border-adm-hairline">
          <SummaryRow
            label="Balance"
            hint="What the buyer still owes you: the agreed total less everything paid."
            strong
          >
            <span
              className={cn(
                sale.balanceGhs === 0 ? "text-console" : "text-console-red",
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
          <div className="border-t border-adm-hairline pt-2 text-[12px] text-adm-muted">
            Payment terms: {sale.paymentPolicy.name}
          </div>
        ) : null}
        <div className="mt-3 border-t border-adm-hairline pt-3.5">{actions}</div>
      </AdminCard>
    </div>
  );

  const main = (
    <div className="flex flex-col gap-4">
      {/* Lines */}
      <AdminCard className="px-5 py-3">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          Goods
        </div>
        {sale.lines.map((l) => (
          <div
            key={l.id}
            className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <span className="font-medium text-adm-ink">{l.commodity.name}</span>
              <Mono className="ml-2 text-[12px] text-adm-muted">
                {formatKg(l.weightKg)} @ <Money value={l.unitPriceGhs} />
              </Mono>
            </div>
            <Mono className="whitespace-nowrap text-[13px] text-adm-ink">
              <Money value={l.totalGhs} />
            </Mono>
          </div>
        ))}
      </AdminCard>

      {/* Milestone schedule (once confirmed) */}
      {sale.milestones.length > 0 ? (
        <AdminCard className="px-5 py-3">
          <div className="mb-1 flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            <span className="min-w-0">Payment schedule</span>
            <HelpTip
              label="What is the payment schedule?"
              text="The milestones this buyer pays in: how much is due at each stage, and what triggers it."
            />
          </div>
          {sale.milestones.map((m, i) => (
            <div
              key={`${m.label}-${String(i)}`}
              className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <span className="text-adm-ink">{m.label}</span>
                <span className="ml-2 text-[12px] text-adm-muted">
                  {m.percent}% · {milestoneTriggerLabel(m.trigger)}
                </span>
              </div>
              <Mono className="whitespace-nowrap text-[13px] text-adm-ink">
                <Money value={m.amountGhs} />
              </Mono>
            </div>
          ))}
          {/* The gate that decides whether this sale may board a truck - the
              computed figure, so nobody works it out in their head. */}
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 border-t-[1.5px] border-adm-line pt-2">
            <span className="flex items-center gap-1 text-[12px] font-semibold text-adm-ink">
              <span className="min-w-0">Required before loading</span>
              <HelpTip
                label="What is required before loading?"
                text="How much this buyer must have paid before a truck may be loaded for them."
              />
            </span>
            <span className="flex items-baseline gap-2">
              <Mono className="text-[13px] text-adm-ink">
                <Money value={sale.requiredBeforeLoadingGhs} />
              </Mono>
              <ToneBadge tone={sale.beforeLoadingMet ? "leaf" : "alert"}>
                {sale.beforeLoadingMet ? "Met - can ship" : "Not met"}
              </ToneBadge>
            </span>
          </div>
        </AdminCard>
      ) : null}

      {/* Payments ledger */}
      <AdminCard className="px-5 py-3">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          Payments
        </div>
        {sale.payments.length === 0 ? (
          <p className="py-2 text-[13px] text-adm-muted">No payments recorded yet.</p>
        ) : (
          sale.payments.map((p) => (
            <div
              key={p.id}
              className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <span className="text-adm-ink">{p.method}</span>
                {/* Date only: `paidAt` comes from a date picker, so its time
                    is a midnight stamp nobody chose. */}
                <span className="ml-2 text-[12px] text-adm-muted">
                  <DateOnlyCell value={p.paidAt} muted />
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
              </div>
              <div className="flex flex-none items-center gap-2">
                <Mono
                  className={cn(
                    "whitespace-nowrap text-[13px] font-semibold",
                    p.amountGhs !== null && p.amountGhs < 0
                      ? "text-console-red"
                      : "text-console",
                  )}
                >
                  <Money value={p.amountGhs} />
                </Mono>
                {/* The only way a mis-keyed payment stops being permanent:
                    the sale cannot be edited or cancelled once money is on
                    it. Owner-only, and never offered on a reversal row. */}
                {isSuperAdmin && p.amountGhs !== null && p.amountGhs > 0 ? (
                  <AdminButton
                    type="button"
                    variant="outline"
                    className="h-[26px] flex-none px-2 text-[11.5px]"
                    onClick={() => void reverseOne(p.id, p.amountGhs)}
                  >
                    Reverse
                  </AdminButton>
                ) : null}
              </div>
            </div>
          ))
        )}
      </AdminCard>

      {/* Shipments carrying this sale */}
      <AdminCard className="px-5 py-3">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          Shipments
        </div>
        {sale.shipments.length === 0 ? (
          <p className="py-2 text-[13px] text-adm-muted">Nothing shipped yet.</p>
        ) : (
          sale.shipments.map((sh) => (
            <div
              key={sh.id}
              className="border-b border-adm-hairline py-2 last:border-b-0"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <Link
                  href={`/admin/shipments/${sh.id}`}
                  className="font-adminmono text-[13px] text-console tabular-nums hover:underline"
                >
                  {sh.transactionNo}
                </Link>
                <ShipmentStatusBadge status={sh.status} />
              </div>
              <div className="mt-0.5 min-w-0 text-[12.5px] text-adm-muted [overflow-wrap:anywhere]">
                <Mono>{sh.truckReg}</Mono> · {sh.destination} ·{" "}
                {sh.departedAt
                  ? `Departed ${formatSaleDate(sh.departedAt)}`
                  : `Planned ${formatSaleDate(sh.createdAt)}`}
              </div>
            </div>
          ))
        )}
      </AdminCard>
    </div>
  );

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All sales" className="mb-2" />
      <AdminPageHeader
        title="Sale details"
        hint="One order: what was agreed, what has shipped and what is still owed."
        sub={`Drafted ${formatSaleDate(sale.createdAt)}`}
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            <SaleStatusBadge status={sale.status} />
          </span>
        }
      />

      {sale.status === "CANCELLED" && sale.cancelReason ? (
        <AdminCard className="mb-4 border-console-red/40 bg-console-red/[0.04] px-4 py-3 text-[13px] text-adm-ink">
          Cancelled: {sale.cancelReason}
        </AdminCard>
      ) : null}

      <DetailShell main={main} aside={aside} />

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
