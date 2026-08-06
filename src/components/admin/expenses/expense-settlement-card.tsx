"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { HelpTip, HelpWrap } from "@/components/admin/help-tip";
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import {
  AdminButton,
  AdminCard,
  AdminField,
  Mono,
  ToneBadge,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { ReverseReasonDialog } from "@/components/admin/drivers/driver-settlement-dialogs";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthRole } from "@/hooks/use-auth-role";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetExpensePaymentsQuery,
  useRecordExpensePaymentMutation,
  useReverseExpensePaymentMutation,
} from "@/redux/driver-settlement/driver-settlement-api";
import type { IExpensePayment } from "@/types/driver-settlement.types";

import {
  PAYMENT_METHOD_OPTIONS,
  todayInputValue,
} from "../trading/sale-bits";

/**
 * What has actually been paid against this cost.
 *
 * An expense used to be a figure the P&L counted with nothing recording
 * whether the money had gone out, so "have we settled this?" was a question
 * somebody answered from memory. The ledger below is the same append-only
 * shape sales and driver fees use, and the outstanding balance is derived from
 * it rather than stored, so no two screens can disagree about it.
 */
const SETTLEMENT_TONE = {
  PAID: { hint: "This cost has been settled in full.", label: "Paid", tone: "forest" },
  PART_PAID: {
    hint: "Some of this cost has been paid; the rest is still owed.",
    label: "Part paid",
    tone: "harvest",
  },
  UNPAID: {
    hint: "Nothing has been paid against this cost yet.",
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
  method: z.enum(["BANK", "CASH", "MOMO"]),
  paidAt: z.string().min(1, "Pick a date"),
  paymentAccountId: z.string(),
  reference: z.string().trim().max(120),
});
type PaymentValues = z.infer<typeof paymentSchema>;

function PayDialog({
  expenseId,
  onClose,
  outstandingGhs,
}: {
  expenseId: string;
  onClose: () => void;
  outstandingGhs: null | number;
}) {
  const [record, { isLoading }] = useRecordExpensePaymentMutation();
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
      method: "BANK",
      paidAt: todayInputValue(),
      paymentAccountId: "",
      reference: "",
    },
    resolver: zodResolver(paymentSchema),
  });
  const method = useWatch({ control, name: "method" });

  const onSubmit = async (values: PaymentValues) => {
    try {
      await record({
        body: {
          amountGhs: Number(values.amountGhs),
          method: values.method,
          paidAt: values.paidAt,
          ...(values.paymentAccountId
            ? { paymentAccountId: values.paymentAccountId }
            : {}),
          ...(values.reference ? { reference: values.reference } : {}),
        },
        expenseId,
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
      <ResponsiveDialogContent className="max-w-[460px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Pay this cost</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {outstandingGhs === null
              ? "Record what has gone out against this cost."
              : `${formatCedis(outstandingGhs)} is still outstanding.`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="flex flex-col gap-4"
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
                <Input
                  className={adminInputClass}
                  type="date"
                  {...register("paidAt")}
                />
              </AdminField>
            </div>
          </div>

          <AdminField label="How it was paid">
            <select className={adminSelectClass} {...register("method")}>
              {PAYMENT_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </AdminField>

          {/* Cash leaves the till, not an account. */}
          {method !== "CASH" ? (
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

          <AdminField
            error={errors.reference?.message}
            hint="Recording the same reference twice against this cost is refused."
            label="Reference"
            optional
          >
            <Input
              className={adminInputClass}
              placeholder="e.g. TRF884512"
              {...register("reference")}
            />
          </AdminField>

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton onClick={onClose} type="button" variant="ghost">
              Cancel
            </AdminButton>
            <AdminButton disabled={isLoading} type="submit">
              {isLoading ? "Recording…" : "Record payment"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function ExpenseSettlementCard({
  amountGhs,
  expenseId,
  isVoided,
}: {
  /** The cost being settled; null when redacted. */
  amountGhs: null | number;
  expenseId: string;
  /** A voided voucher is not a cost, so it cannot be paid against. */
  isVoided: boolean;
}) {
  const { isSuperAdmin } = useAuthRole();
  const [payOpen, setPayOpen] = useState(false);
  const [reversing, setReversing] = useState<IExpensePayment | null>(null);
  const [reverse, reverseState] = useReverseExpensePaymentMutation();

  const { data, error, isError, isLoading, refetch } =
    useGetExpensePaymentsQuery(expenseId);

  const onReverse = async (reason: string) => {
    if (!reversing) return;
    try {
      await reverse({ expenseId, paymentId: reversing.id, reason }).unwrap();
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
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold tracking-[-0.01em] text-adm-ink">
          Settlement
          <HelpTip
            label="What is settlement?"
            text="How much of this cost has actually been paid out, and what is still owed."
          />
        </h2>
        <HelpWrap text={tone.hint}>
          <ToneBadge tone={tone.tone}>{tone.label}</ToneBadge>
        </HelpWrap>
      </div>

      {/* Outstanding leads, because that is what anyone opens this to find.
          A voided voucher shows nothing owing: it is not a cost. */}
      {isVoided ? (
        <p className="text-[13px] text-adm-muted">
          This voucher was voided, so nothing is owed against it.
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
            <dd className="mt-0.5 text-[14px] text-adm-ink">
              <Figure value={settlement.paidGhs} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
              Cost
            </dt>
            <dd className="mt-0.5 text-[14px] text-adm-ink">
              <Figure value={amountGhs} />
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
                      <Mono className="text-[11.5px] text-adm-faint">
                        {p.transactionNo}
                      </Mono>
                      <span className="text-[11.5px] text-adm-faint">
                        {new Date(p.paidAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-[11.5px] text-adm-faint">
                        {p.method}
                      </span>
                      {p.isReversal ? (
                        <ToneBadge tone="slate">Reversal</ToneBadge>
                      ) : null}
                      {reversed ? (
                        <ToneBadge tone="slate">Reversed</ToneBadge>
                      ) : null}
                    </div>
                    {p.reversalReason ? (
                      <p className="mt-0.5 text-[12px] text-adm-muted [overflow-wrap:anywhere]">
                        {p.reversalReason}
                      </p>
                    ) : null}
                  </div>
                  {/* Money and its action get their own line on a phone. */}
                  <div className="flex flex-none items-baseline justify-between gap-3 @min-[520px]/settle:justify-end">
                    <Figure
                      className={cn(
                        "text-[14px] font-semibold",
                        p.isReversal ? "text-console-red" : "text-adm-ink",
                      )}
                      value={p.amountGhs}
                    />
                    {isSuperAdmin && !p.isReversal && !reversed ? (
                      <button
                        className="cursor-pointer text-[12px] text-adm-muted transition-colors hover:text-console-red"
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
          <AdminButton className="h-9 px-4" onClick={() => setPayOpen(true)}>
            Record a payment
          </AdminButton>
        </div>
      ) : null}

      {payOpen ? (
        <PayDialog
          expenseId={expenseId}
          onClose={() => {
            setPayOpen(false);
          }}
          outstandingGhs={settlement.outstandingGhs}
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
