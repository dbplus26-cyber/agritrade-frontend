"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { ReverseReasonDialog } from "@/components/admin/drivers/driver-settlement-dialogs";
import { HelpWrap } from "@/components/admin/help-tip";
import { PaidThroughSystemField } from "@/components/admin/paid-through-system-field";
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import {
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  adminSelectClass,
  Mono,
  SectionHeading,
  ToneBadge,
} from "@/components/admin/ui";
import { DateInput } from "@/components/ui/date-input";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetPurchasePaymentsQuery,
  useRecordPurchasePaymentMutation,
  useReversePurchasePaymentMutation,
} from "@/redux/purchases/purchases-api";
import type { IPurchasePayment } from "@/types/purchase.types";

import { PAYMENT_METHOD_OPTIONS, todayInputValue } from "../trading/sale-bits";

/**
 * What has actually been paid for these goods.
 *
 * A purchase is a document and moves no money by itself; this is the ledger
 * that says whether it has been paid for. A purchase that debited an agent's
 * float the instant the row was written - and debited nothing at all when the
 * buyer was the OFFICE - would leave the largest regular flow in the business
 * touching no account, with no supplier owed by anybody.
 *
 * Deliberately the same shape as the expense settlement card: it is the same
 * operation pointed at a different payable, and somebody who has settled one
 * should not have to learn the other.
 */
const SETTLEMENT_TONE = {
  PAID: {
    hint: "The supplier has been paid in full for these goods.",
    label: "Paid",
    tone: "forest",
  },
  PART_PAID: {
    hint: "Some of this has been paid; the supplier is still owed the rest.",
    label: "Part paid",
    tone: "harvest",
  },
  UNPAID: {
    hint: "Nothing has been paid for these goods yet - the supplier is owed the full amount.",
    label: "Not paid",
    tone: "alert",
  },
} as const;

function Figure({
  className,
  value,
}: {
  className?: string;
  value: null | number;
}) {
  if (value === null) return <span className="text-adm-faint">Hidden</span>;
  return (
    <Mono className={cn("tabular-nums", className)}>{formatCedis(value)}</Mono>
  );
}

const paymentSchema = z.object({
  amountGhs: z
    .string()
    .trim()
    .min(1, "Enter the amount")
    .refine((v) => Number(v) > 0, {
      message: "The amount must be more than zero",
    }),
  /**
   * Set when this books against a send the system already made. The account is
   * then implied (the payout wallet) and no movement is posted, because the send
   * already moved the money.
   */
  disbursementId: z.string(),
  method: z.enum(["BANK", "CASH", "MOMO"]),
  paidAt: z.string().min(1, "Pick a date"),
  paymentAccountId: z.string(),
  reference: z.string().trim().max(120),
});
type PaymentValues = z.infer<typeof paymentSchema>;

function PayDialog({
  onClose,
  outstandingGhs,
  payeeName,
  purchaseId,
}: {
  onClose: () => void;
  outstandingGhs: null | number;
  /** Who the money is going to, read back before it commits. */
  payeeName: string;
  purchaseId: string;
}) {
  const [record, { isLoading }] = useRecordPurchasePaymentMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<PaymentValues>({
    // Held as a string and converted on submit: clamping a number field in
    // onChange makes it impossible to clear.
    defaultValues: {
      amountGhs: "",
      disbursementId: "",
      method: "BANK",
      paidAt: todayInputValue(),
      paymentAccountId: "",
      reference: "",
    },
    resolver: zodResolver(paymentSchema),
  });
  const method = useWatch({ control, name: "method" });
  // A matched send answers "which account" and "what reference" on its own, so
  // both controls come off the form rather than sitting there asking for
  // answers that would be ignored.
  const matchedSend = useWatch({ control, name: "disbursementId" });

  const onSubmit = async (values: PaymentValues) => {
    // Money out to a named supplier, and a ledger write only a reversal can
    // undo - the same gate a sale's payment already carries, for the same
    // reason: a misplaced decimal here is the expensive mistake, and it is
    // invisible once it is on the books.
    const ok = await confirm({
      title: "Record this payment?",
      description: values.disbursementId
        ? `${formatCedis(Number(values.amountGhs))} to ${payeeName}, booked against a send the system already made. The money has already left the payout wallet, so nothing is deducted again; this records what it paid for. Only a reversal takes it back off.`
        : `${formatCedis(Number(values.amountGhs))} paid to ${payeeName} by ${
            PAYMENT_METHOD_OPTIONS.find((o) => o.value === values.method)
              ?.label ?? values.method
          }. It goes on the books as money out for these goods; only a reversal takes it back off.`,
      confirmText: "Record payment",
    });
    if (!ok) return;

    try {
      await record({
        body: {
          amountGhs: Number(values.amountGhs),
          method: values.method,
          paidAt: values.paidAt,
          ...(values.disbursementId
            ? { disbursementId: values.disbursementId }
            : {}),
          // Not sent alongside a matched send: the server resolves the payout
          // wallet itself, because that is the one account this can have come
          // out of and it is deliberately absent from the picker.
          ...(!values.disbursementId && values.paymentAccountId
            ? { paymentAccountId: values.paymentAccountId }
            : {}),
          ...(values.reference ? { reference: values.reference } : {}),
        },
        purchaseId,
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
    <ResponsiveDialog open onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[460px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Pay the supplier</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {outstandingGhs === null
              ? "Record what has gone out for these goods."
              : `${formatCedis(outstandingGhs)} is still owed on this purchase.`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Paired against the DIALOG's own width: the same component is a
              bottom sheet on a phone and a centred card on desktop. */}
          <div className="@container/pay">
            <div className="grid grid-cols-1 gap-4 @min-[380px]/pay:grid-cols-2">
              <AdminField error={errors.amountGhs?.message} label="Amount (GHS)">
                <Input
                  autoFocus
                  className={cn(adminInputClass, "text-right")}
                  inputMode="decimal"
                  placeholder="0.00"
                  {...register("amountGhs")}
                />
              </AdminField>
              <AdminField error={errors.paidAt?.message} label="Paid on">
                <DateInput
                  className={adminInputClass}
                  placeholder="Pick the payment date"
                  {...register("paidAt")}
                />
              </AdminField>
            </div>
          </div>

          <AdminField label="How it was paid">
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <SimpleSelect
                  className={adminSelectClass}
                  onChange={field.onChange}
                  options={PAYMENT_METHOD_OPTIONS}
                  placeholder="Choose the method"
                  value={field.value}
                />
              )}
            />
          </AdminField>

          <Controller
            control={control}
            name="disbursementId"
            render={({ field }) => (
              <PaidThroughSystemField
                error={errors.disbursementId?.message}
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />

          {/* Cash leaves the till, not a named account. */}
          {method !== "CASH" && !matchedSend ? (
            <Controller
              control={control}
              name="paymentAccountId"
              render={({ field }) => (
                <PaymentAccountField
                  direction="out"
                  error={errors.paymentAccountId?.message}
                  method={method}
                  onChange={field.onChange}
                  value={field.value}
                />
              )}
            />
          ) : null}

          {!matchedSend ? (
          <AdminField
            error={errors.reference?.message}
            hint="Recording the same reference twice against this purchase is refused."
            label="Reference"
            optional
          >
            <Input
              className={adminInputClass}
              placeholder="e.g. TRF884512"
              {...register("reference")}
            />
          </AdminField>
          ) : null}

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton onClick={onClose} type="button" variant="ghost">
              Cancel
            </AdminButton>
            <AdminButton disabled={isLoading} loading={isLoading} type="submit">
              {isLoading ? "Recording…" : "Record payment"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
      {confirmationDialog}
    </ResponsiveDialog>
  );
}

export function PurchaseSettlementCard({
  isVoided,
  payeeName,
  purchaseId,
  totalGhs,
}: {
  /** A voided purchase is not a cost, so it cannot be paid against. */
  isVoided: boolean;
  /** Who is being paid, read back in the confirm step before money goes out. */
  payeeName: string;
  purchaseId: string;
  /** What the goods cost; null when redacted. */
  totalGhs: null | number;
}) {
  const { isSuperAdmin } = useAuthRole();
  const [payOpen, setPayOpen] = useState(false);
  const [reversing, setReversing] = useState<IPurchasePayment | null>(null);
  const [reverse, reverseState] = useReversePurchasePaymentMutation();

  const { data, error, isError, isLoading, refetch } =
    useGetPurchasePaymentsQuery(purchaseId);

  const onReverse = async (reason: string) => {
    if (!reversing) return;
    try {
      await reverse({
        paymentId: reversing.id,
        purchaseId,
        reason,
      }).unwrap();
      notify.success("Payment reversed");
      setReversing(null);
    } catch (err) {
      notify.error("Couldn't reverse the payment", {
        description: extractApiError(err).message,
      });
    }
  };

  if (isLoading) {
    return (
      <AdminCard className="p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-2 h-7 w-36" />
      </AdminCard>
    );
  }
  if (isError || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const { payments, settlement } = data.data;
  const tone = SETTLEMENT_TONE[settlement.status];
  const canPay = isSuperAdmin && !isVoided && settlement.status !== "PAID";

  return (
    <AdminCard className="@container/settle p-5">
      <SectionHeading
        className="mb-4"
        hint="What has actually been paid for these goods, and what the supplier is still owed. Recording a purchase does not move money - paying for it does."
        actions={
          <HelpWrap text={tone.hint}>
            <ToneBadge tone={tone.tone}>{tone.label}</ToneBadge>
          </HelpWrap>
        }
      >
        Payment
      </SectionHeading>

      {/* Still owed leads, because that is what anyone opens this to find. */}
      {isVoided ? (
        <p className="text-[11.5px] text-adm-muted">
          This purchase was voided, so nothing is owed on it. Anything already
          paid was given back.
        </p>
      ) : (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 @min-[380px]/settle:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
              Still owed
            </dt>
            <dd className="mt-0.5">
              <Figure
                className="text-[22px] leading-[1.15] font-bold text-adm-ink"
                value={settlement.outstandingGhs}
              />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
              Paid
            </dt>
            <dd className="mt-0.5 text-[12px] text-adm-ink">
              <Figure value={settlement.paidGhs} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
              Cost
            </dt>
            <dd className="mt-0.5 text-[12px] text-adm-ink">
              <Figure value={totalGhs} />
            </dd>
          </div>
        </dl>
      )}

      {payments.length > 0 ? (
        <div className="mt-5 border-t border-adm-hairline pt-2">
          <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            Payments
          </p>
          <ul className="divide-y divide-adm-hairline">
            {payments.map((p) => {
              const reversed = p.reversedByPaymentId !== null;
              return (
                <li
                  className={cn(
                    "flex flex-col gap-1 py-2.5 @min-[520px]/settle:flex-row @min-[520px]/settle:items-baseline @min-[520px]/settle:gap-3",
                    p.isReversal && "opacity-80",
                  )}
                  key={p.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <Mono className="text-[10.5px] text-adm-faint">
                        {p.transactionNo}
                      </Mono>
                      <span className="text-[10.5px] text-adm-faint">
                        {new Date(p.paidAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-[10.5px] text-adm-faint">
                        {p.method}
                      </span>
                      {/* Which money paid this matters: an agent's float and a
                          company account are different pots. */}
                      {p.fromFloat ? (
                        <ToneBadge tone="slate">Agent float</ToneBadge>
                      ) : null}
                      {p.isReversal ? (
                        <ToneBadge tone="slate">Reversal</ToneBadge>
                      ) : null}
                      {reversed ? (
                        <ToneBadge tone="slate">Reversed</ToneBadge>
                      ) : null}
                    </div>
                    {p.reversalReason ? (
                      <p className="mt-0.5 text-[11px] text-adm-muted [overflow-wrap:anywhere]">
                        {p.reversalReason}
                      </p>
                    ) : null}
                  </div>
                  {/* Money and its action get their own line on a phone. */}
                  <div className="flex flex-none items-baseline justify-between gap-3 @min-[520px]/settle:justify-end">
                    <Figure
                      className={cn(
                        "text-[12px] font-semibold",
                        p.isReversal ? "text-console-red" : "text-adm-ink",
                      )}
                      value={p.amountGhs}
                    />
                    {isSuperAdmin && !p.isReversal && !reversed ? (
                      <button
                        className="cursor-pointer text-[11px] text-adm-muted transition-colors hover:text-console-red"
                        onClick={() => {
                          setReversing(p);
                        }}
                        type="button"
                      >
                        Reverse
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {canPay ? (
        <div className="mt-5">
          {/* The one action this card offers, and on a phone the thumb should
              not have to find a 140px plate at the left of it. */}
          <AdminButton
            className="w-full sm:w-auto"
            onClick={() => setPayOpen(true)}
          >
            Record a payment
          </AdminButton>
        </div>
      ) : null}

      {payOpen ? (
        <PayDialog
          onClose={() => {
            setPayOpen(false);
          }}
          outstandingGhs={settlement.outstandingGhs}
          payeeName={payeeName}
          purchaseId={purchaseId}
        />
      ) : null}
      {reversing ? (
        <ReverseReasonDialog
          onClose={() => {
            setReversing(null);
          }}
          onSubmit={(reason) => void onReverse(reason)}
          subject={reversing.transactionNo}
          submitting={reverseState.isLoading}
        />
      ) : null}
    </AdminCard>
  );
}
