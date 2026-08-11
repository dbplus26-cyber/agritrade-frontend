"use client";

import Link from "next/link";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  DetailRow,
  DetailShell,
  Mono,
  SectionHeading,
  adminInputClass,
  adminLinkClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { DateOnlyCell } from "@/components/admin/date-cell";
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
import { SimpleSelect } from "@/components/ui/simple-select";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { receiptPdfUrl } from "@/lib/receipt-pdf-url";
import { cn } from "@/lib/utils";
import {
  useCancelLandSaleMutation,
  useConfirmLandSaleMutation,
  useGetLandSaleQuery,
  useRecordLandPaymentMutation,
  useReverseLandSalePaymentMutation,
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
  todayInputValue,
} from "@/components/admin/trading/sale-bits";
import { LandSaleStatusBadge } from "./land-bits";

const LIST = "/admin/land-sales";

function Row({
  label,
  children,
  hint,
  strong = false,
}: {
  children: React.ReactNode;
  /** One sentence on what the figure IS, on hover beside its label. */
  hint?: string;
  label: string;
  strong?: boolean;
}) {
  return (
    <DetailRow hint={hint} label={label} mono strong={strong}>
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
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<LandPaymentValues>({
    resolver: zodResolver(landPaymentSchema),
    defaultValues: { method: "BANK", paidAt: todayInputValue() },
  });
  // Drives whether the company account is required (BANK/MOMO), and which
  // accounts can carry it - a method switch clears a stale choice.
  const method = watch("method");
  useEffect(() => {
    setValue("paymentAccountId", "");
  }, [method, setValue]);
  const onSubmit = async (values: LandPaymentValues) => {
    try {
      await record({
        id: sale.id,
        body: {
          amountGhs: Number(values.amountGhs),
          method: values.method,
          ...(values.reference?.trim() ? { reference: values.reference.trim() } : {}),
          ...(values.paidAt ? { paidAt: values.paidAt } : {}),
          ...(values.paymentAccountId
            ? { paymentAccountId: values.paymentAccountId }
            : {}),
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
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record a payment</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Part-payments are fine. Full payment completes the sale and marks the
            plot sold.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <AdminField label="Amount (GHS)" error={errors.amountGhs?.message}>
            <Input
              inputMode="decimal"
              className={cn(adminInputClass, errors.amountGhs && "border-console-red")}
              {...register("amountGhs")}
            />
          </AdminField>
          <AdminField label="Method">
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <SimpleSelect
                  className={cn(adminSelectClass, "w-full")}
                  value={field.value}
                  onChange={field.onChange}
                  options={PAYMENT_METHOD_OPTIONS}
                />
              )}
            />
          </AdminField>
          <PaymentAccountField
            method={method}
            direction="in"
            error={errors.paymentAccountId?.message}
            onChange={(v) => setValue("paymentAccountId", v)}
            value={watch("paymentAccountId") ?? ""}
          />
          <AdminField label="Reference" optional>
            <Input className={adminInputClass} {...register("reference")} />
          </AdminField>
          <AdminField label="Payment date" optional>
            <Input type="date" className={adminInputClass} {...register("paidAt")} />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton type="button" variant="outline" size="lg" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} size="lg">
              {isLoading ? "Recording…" : "Record payment"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
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
  // Money already received. Null means the figure is redacted for this user,
  // in which case they cannot responsibly split it - only refund all or keep
  // all, both of which the API resolves from the ledger itself.
  const paid = sale.paidGhs;
  const hasMoney = paid !== null && paid > 0;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CancelLandSaleValues>({
    resolver: zodResolver(cancelLandSaleSchema),
    defaultValues: { reason: "", refundGhs: "", settlement: "FORFEIT" },
  });
  const settlement = watch("settlement");

  const onSubmit = async (values: CancelLandSaleValues) => {
    // Resolve the choice to the number the API wants, so "keep the deposit"
    // and "refund it" never depend on the operator retyping a figure.
    const refundGhs = !hasMoney
      ? undefined
      : values.settlement === "FORFEIT"
        ? 0
        : values.settlement === "REFUND"
          ? paid
          : Number(values.refundGhs);

    if (
      hasMoney &&
      values.settlement === "PARTIAL" &&
      (!Number.isFinite(refundGhs) || refundGhs! < 0 || refundGhs! > paid)
    ) {
      notify.error("Enter a refund between nothing and the amount received");
      return;
    }

    try {
      await cancel({
        id: sale.id,
        reason: values.reason,
        ...(refundGhs === undefined ? {} : { refundGhs }),
      }).unwrap();
      notify.success("Land sale cancelled");
      onClose();
    } catch (err) {
      notify.error("Couldn't cancel the sale", {
        description: extractApiError(err).message,
      });
    }
  };
  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Cancel this land sale?</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            The plot returns to available straight away.
            {hasMoney
              ? " Say what happens to the money already received - it is settled in the same action."
              : ""}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          {hasMoney ? (
            <AdminField
              label={`Received so far: ${formatCedis(paid)}`}
              hint="Whatever is not refunded stays with the business as a forfeited deposit."
            >
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    ["FORFEIT", "Keep it - buyer forfeits the deposit"],
                    ["REFUND", "Refund all of it"],
                    ["PARTIAL", "Refund part of it"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-[13px] text-adm-ink"
                  >
                    <input type="radio" value={value} {...register("settlement")} />
                    {label}
                  </label>
                ))}
              </div>
            </AdminField>
          ) : null}
          {hasMoney && settlement === "PARTIAL" ? (
            <AdminField
              label="Refund amount"
              error={errors.refundGhs?.message}
            >
              <Input
                inputMode="decimal"
                placeholder="0.00"
                className={cn(
                  adminInputClass,
                  "font-adminmono",
                  errors.refundGhs && "border-console-red",
                )}
                {...register("refundGhs")}
              />
            </AdminField>
          ) : null}
          <AdminField label="Reason" error={errors.reason?.message}>
            <Input
              className={cn(adminInputClass, errors.reason && "border-console-red")}
              {...register("reason")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton type="button" variant="outline" size="lg" onClick={onClose}>
              Keep sale
            </AdminButton>
            <AdminButton type="submit" variant="danger" disabled={isLoading} size="lg">
              {isLoading ? "Cancelling…" : "Cancel sale"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function LandSaleDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetLandSaleQuery(id);
  const [confirmSale, confirmState] = useConfirmLandSaleMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const { isSuperAdmin } = useAuthRole();
  const [reversePayment] = useReverseLandSalePaymentMutation();

  /**
   * Refunding the buyer is a real-world act; this records it. The reason is
   * the whole audit trail, so it is typed rather than picked.
   */
  const reverseOne = async (paymentId: string, amountGhs: null | number) => {
    const ok = await confirm({
      title: "Reverse this payment?",
      description: `${
        amountGhs === null ? "This payment" : formatCedis(amountGhs)
      } comes back off the sale as a compensating entry - nothing is deleted. Do this once the buyer has actually been refunded.`,
      confirmText: "Reverse payment",
      isDestructive: true,
      requireExactMatch: s.transactionNo,
    });
    if (!ok) return;
    try {
      await reversePayment({
        id: s.id,
        paymentId,
        reason: `Refunded against ${s.transactionNo}`,
      }).unwrap();
      notify.success("Payment reversed");
    } catch (err) {
      notify.error("Couldn't reverse the payment", {
        description: extractApiError(err).message,
      });
    }
  };
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (isLoading) return <DetailSkeleton main="ledger" />;
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

  const canAct = s.status === "DRAFT" || s.status === "CONFIRMED";
  // Confirm is refused without a deposit, so it only reads as the primary
  // action once there is one - until then the payment button is the way on.
  const hasPayments = s.payments.length > 0;

  return (
    <div className="max-w-[1120px]">
      <BackButton href={LIST} label="All land sales" className="mb-2" />
      <AdminPageHeader
        title="Land sale details"
        hint="One plot sold: the buyer, the price and what they still owe."
        actions={
          <span className="flex flex-wrap items-center gap-1.5">
            <LandSaleStatusBadge status={s.status} />
            {/* The server titles it for its state: a sale still owing prints
                as the agreement (with every payment listed), a settled one
                as the receipt. */}
            {s.status !== "CANCELLED" ? (
              <AdminButton variant="outline" asChild>
                <a
                  href={receiptPdfUrl("land-sale", s.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.balanceGhs === 0 ? "Receipt" : "Agreement"} PDF
                </a>
              </AdminButton>
            ) : null}
          </span>
        }
      />

      {s.status === "CANCELLED" && s.cancelReason ? (
        <AdminCard className="mb-4 border-console-red/40 bg-console-red/[0.04] px-4 py-3 text-[13px] text-adm-ink">
          Cancelled: {s.cancelReason}
        </AdminCard>
      ) : null}

      <DetailShell
        aside={
          <AdminCard className="px-5 py-3">
            {/* Which plot, to whom - what the heading used to carry. */}
            <Row label="Plot">
              <Link className={adminLinkClass} href={`/admin/plots/${s.plot.id}`}>
                {s.plot.reference}
              </Link>
            </Row>
            <Row label="Buyer">
              <Link
                className={adminLinkClass}
                href={`/admin/buyers/${s.buyer.id}`}
              >
                {s.buyer.name}
              </Link>
            </Row>
            <Row
              hint="The price the buyer agreed to pay for this plot, before anything is paid."
              label="Agreed price"
              strong
            >
              <Money value={s.agreedPriceGhs} />
            </Row>
            <div className="border-t border-adm-hairline">
              <Row
                hint="Everything the buyer has handed over on this plot so far."
                label="Paid"
              >
                <Money value={s.paidGhs} />
              </Row>
            </div>
            {/* A cancelled sale has no balance to chase - what matters is
                what the business kept. Showing a "balance due" on a dead deal
                reads as an unresolved debt and would be chased as one. */}
            {s.status === "CANCELLED" ? (
              <div className="border-t border-adm-hairline">
                <Row
                  hint="What the business keeps out of the deposit now that the sale is off."
                  label="Deposit kept"
                  strong
                >
                  {s.forfeitedGhs === null ? (
                    <span className="text-adm-muted">Refunded in full</span>
                  ) : (
                    <span className="text-console">
                      <Money value={s.forfeitedGhs} />
                    </span>
                  )}
                </Row>
              </div>
            ) : (
              <div className="border-t border-adm-hairline">
                <Row
                  hint="What the buyer still owes: the agreed price less everything paid."
                  label="Balance"
                  strong
                >
                  <span
                    className={cn(
                      s.balanceGhs === 0 ? "text-console" : "text-console-red",
                    )}
                  >
                    {s.balanceGhs === 0 ? (
                      "Paid in full"
                    ) : (
                      <Money value={s.balanceGhs} />
                    )}
                  </span>
                </Row>
              </div>
            )}
            <div className="border-t border-adm-hairline">
              <Row
                hint="What the business makes on this plot: the agreed price less what the land cost you."
                label="Margin"
              >
                <Money value={s.marginGhs} />
              </Row>
            </div>
            {canAct ? (
              <div className="mt-3 border-t border-adm-hairline pt-3.5">
                <div className="flex flex-wrap gap-2 xl:flex-col">
                  {/* A DRAFT is PAYABLE, and has to be: confirming one is
                      refused until a deposit is on it (PAYMENT_REQUIRED), so
                      offering only "Confirm sale" here was a dead end - the
                      button told you to record a payment and the screen gave
                      you nowhere to record it. The deposit comes first, so it
                      leads; confirm follows it. */}
                  {s.status === "DRAFT" || s.status === "CONFIRMED" ? (
                    <AdminButton
                      onClick={() => setPayOpen(true)}
                    >
                      Record payment
                    </AdminButton>
                  ) : null}
                  {s.status === "DRAFT" ? (
                    <AdminButton
                      variant={hasPayments ? "primary" : "outline"}
                      disabled={confirmState.isLoading}
                      onClick={() => void onConfirm()}
                    >
                      {confirmState.isLoading ? "Confirming…" : "Confirm sale"}
                    </AdminButton>
                  ) : null}
                  <AdminButton
                    variant="outline"
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel sale
                  </AdminButton>
                </div>
              </div>
            ) : null}
          </AdminCard>
        }
        main={
          <AdminCard className="px-5 py-3">
            <SectionHeading className="mb-1">Payments</SectionHeading>
            {s.payments.length === 0 ? (
              <p className="py-2 text-[13px] text-adm-muted">
                No payments recorded yet.
              </p>
            ) : (
              s.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <span className="text-adm-ink">{p.method}</span>
                    {/* Date only: `paidAt` comes from a date picker, so its
                        time is a midnight stamp nobody chose. */}
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
                    {/* A reversal is the only way a confirmed sale that fell
                        through releases its plot: cancelling refuses while
                        money sits on the ledger. Owner-only, and never
                        offered on a reversal row itself. */}
                    {isSuperAdmin &&
                    p.amountGhs !== null &&
                    p.amountGhs > 0 ? (
                      <AdminButton
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-none"
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
        }
      />

      {payOpen ? <PaymentDialog sale={s} onClose={() => setPayOpen(false)} /> : null}
      {cancelOpen ? <CancelDialog sale={s} onClose={() => setCancelOpen(false)} /> : null}
      {confirmationDialog}
    </div>
  );
}
