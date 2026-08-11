"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PaymentAccountField } from "@/components/admin/payment-account-field";
import {
  AdminButton,
  AdminField,
  Mono,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useAdjustDriverFeeMutation,
  useGetDriverPaymentPoliciesQuery,
  useRecordDriverPaymentMutation,
  useSetDriverFeeMutation,
} from "@/redux/driver-settlement/driver-settlement-api";

import {
  PAYMENT_METHOD_OPTIONS,
  todayInputValue,
} from "../trading/sale-bits";

/**
 * Agreeing what a trip pays its driver, and paying it.
 *
 * Both dialogs hold the amount as a STRING and convert on submit. Clamping a
 * number field in onChange (`Math.max(0, Number(v))`) makes the field
 * impossible to clear, because deleting the last digit immediately rewrites it
 * to "0" - a bug this codebase has hit before.
 */

const feeSchema = z.object({
  feeGhs: z
    .string()
    .trim()
    .min(1, "Enter the fee")
    .refine((v) => Number(v) > 0, { message: "The fee must be more than zero" }),
  policyId: z.string(),
});
type FeeValues = z.infer<typeof feeSchema>;

export function DriverFeeDialog({
  currentFeeGhs,
  onClose,
  shipmentId,
}: {
  currentFeeGhs: null | number;
  onClose: () => void;
  shipmentId: string;
}) {
  const [setFee, { isLoading }] = useSetDriverFeeMutation();
  // The picker is over an owner-maintained register of a handful of rows, so
  // one page is the whole register and local filtering is honest here.
  const policies = useGetDriverPaymentPoliciesQuery({
    isActive: true,
    limit: 100,
  });

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<FeeValues>({
    defaultValues: {
      feeGhs: currentFeeGhs === null ? "" : String(currentFeeGhs),
      policyId: "",
    },
    resolver: zodResolver(feeSchema),
  });

  const onSubmit = async (values: FeeValues) => {
    try {
      await setFee({
        body: {
          feeGhs: Number(values.feeGhs),
          ...(values.policyId ? { policyId: values.policyId } : {}),
        },
        shipmentId,
      }).unwrap();
      notify.success("Driver fee agreed");
      onClose();
    } catch (err) {
      // The server refuses a fee below what has already been paid; that
      // message names the real problem, so surface it verbatim.
      notify.error("Couldn't agree the fee", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[440px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {currentFeeGhs === null ? "Agree the driver fee" : "Change the fee"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            What this trip pays the haulier in total. The terms are frozen onto
            the trip, so changing a policy later never rewrites it.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <AdminField error={errors.feeGhs?.message} label="Total fee (GHS)">
            <Input
              autoFocus
              className={cn(adminInputClass, "text-right")}
              inputMode="decimal"
              placeholder="0.00"
              {...register("feeGhs")}
            />
          </AdminField>

          <AdminField
            hint="Leave as the default to use this driver's own terms, or the system default if they have none."
            label="Terms"
          >
            <Controller
              control={control}
              name="policyId"
              render={({ field }) => (
                <SimpleSelect
                  className={adminSelectClass}
                  value={field.value}
                  // "Usual terms" is a real choice - the sentinel maps back
                  // to "" so a picked policy can be cleared again (Radix
                  // reserves the empty string).
                  onChange={(v) =>
                    field.onChange(v === "__default__" ? "" : v)
                  }
                  placeholder="Use the usual terms"
                  options={[
                    { value: "__default__", label: "Use the usual terms" },
                    ...(policies.data?.data ?? []).map((p) => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                />
              )}
            />
          </AdminField>

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton onClick={onClose} type="button" variant="ghost">
              Cancel
            </AdminButton>
            <AdminButton disabled={isLoading} type="submit">
              {isLoading ? "Saving…" : "Save fee"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
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

export function DriverPaymentDialog({
  driverName,
  onClose,
  outstandingGhs,
  shipmentId,
}: {
  driverName: string;
  onClose: () => void;
  /** Null when redacted; the server enforces the ceiling either way. */
  outstandingGhs: null | number;
  shipmentId: string;
}) {
  const [record, { isLoading }] = useRecordDriverPaymentMutation();
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setValue,
  } = useForm<PaymentValues>({
    defaultValues: {
      amountGhs: "",
      method: "MOMO",
      paidAt: todayInputValue(),
      paymentAccountId: "",
      reference: "",
    },
    resolver: zodResolver(paymentSchema),
  });
  const method = useWatch({ control, name: "method" });

  /**
   * The one-tap amounts: half of what is left, and all of it.
   *
   * Half is offered only when it is not the same as the full amount (a tiny
   * remaining balance would otherwise show two buttons that do the same
   * thing) and only when it rounds to something payable.
   */
  const quickAmounts =
    outstandingGhs === null || outstandingGhs <= 0
      ? []
      : (() => {
          const full = Math.round(outstandingGhs * 100) / 100;
          const half = Math.round((outstandingGhs / 2) * 100) / 100;
          const out = [];
          if (half > 0 && half < full) out.push({ label: "Half", value: half });
          out.push({ label: "Full balance", value: full });
          return out;
        })();

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
        shipmentId,
      }).unwrap();
      notify.success("Payment recorded");
      onClose();
    } catch (err) {
      // Overpayment and duplicate-reference both come back with a message
      // naming the real problem, so it is shown rather than replaced.
      notify.error("Couldn't record the payment", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[460px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Pay the driver</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {/* [overflow-wrap:anywhere] on the name: it is free text and the
                dialog is 320px wide on a phone. */}
            <span className="[overflow-wrap:anywhere]">{driverName}</span>
            {outstandingGhs !== null ? (
              <>
                {" is still owed "}
                <Mono className="font-semibold text-adm-ink">
                  {formatCedis(outstandingGhs)}
                </Mono>
                {" for this trip."}
              </>
            ) : (
              " is still owed money for this trip."
            )}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Paired 2-up from 380px of the DIALOG's width, not the viewport:
              the same dialog is a bottom sheet on a phone and a centred card
              on desktop, and only its own width says whether two fit. */}
          <div className="@container/pay">
            <div className="grid grid-cols-1 gap-4 @min-[380px]/pay:grid-cols-2">
              <AdminField
                error={errors.amountGhs?.message}
                label="Amount (GHS)"
              >
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
            {/* The two amounts anyone actually types here. A haulier is paid
                an advance and then the balance, so making those one tap each
                removes the arithmetic - and the mistyped figure that comes
                with doing it in your head. Hidden when the balance is
                redacted, since there would be no figure to put on the button.
                A full-width row of its own: squeezed under the half-width
                amount field the pills stacked one per line at every size. */}
            {quickAmounts.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11.5px] text-adm-muted">Fill:</span>
                {quickAmounts.map((q) => (
                  <AdminButton
                    key={q.label}
                    size="sm"
                    onClick={() => {
                      // shouldValidate so a prior "enter the amount"
                      // error clears the moment the field is filled.
                      setValue("amountGhs", q.value.toFixed(2), {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    variant="outline"
                  >
                    {q.label} · {formatCedis(q.value)}
                  </AdminButton>
                ))}
              </div>
            ) : null}
          </div>

          <AdminField label="How it was paid">
            <Controller
              control={control}
              name="method"
              render={({ field }) => (
                <SimpleSelect
                  className={adminSelectClass}
                  value={field.value}
                  onChange={field.onChange}
                  options={PAYMENT_METHOD_OPTIONS}
                />
              )}
            />
          </AdminField>

          {/* Cash leaves the till, not an account, so the picker is only
              meaningful for the two rails that move through one. */}
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
            hint="The transfer or MoMo reference. Recording the same one twice against this trip is refused."
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

const reasonSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Say why in a few words")
    .max(500, "Keep it under 500 characters"),
});
type ReasonValues = z.infer<typeof reasonSchema>;

/**
 * Why a payment is being cancelled.
 *
 * A typed reason rather than a yes/no confirm, because this string IS the
 * correction's audit trail - it is what somebody reading the ledger in six
 * months has to work from. A generated one ("Reversed against SHP-...") would
 * satisfy the validator and tell them nothing.
 */
export function ReverseReasonDialog({
  onClose,
  onSubmit,
  submitting,
  subject,
}: {
  onClose: () => void;
  onSubmit: (reason: string) => void;
  submitting: boolean;
  /** The voucher being reversed, restated so nobody reverses the wrong row. */
  subject: string;
}) {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ReasonValues>({
    defaultValues: { reason: "" },
    resolver: zodResolver(reasonSchema),
  });

  return (
    <ResponsiveDialog open onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[440px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Reverse {subject}?</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            This writes a cancelling entry rather than deleting anything, so the
            history still shows what happened.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={handleSubmit((v) => {
            onSubmit(v.reason);
          })}
        >
          <AdminField error={errors.reason?.message} label="Why">
            <textarea
              autoFocus
              className={cn(
                adminInputClass,
                "h-auto min-h-[72px] w-full resize-y py-2",
              )}
              placeholder="e.g. Sent to the wrong wallet, re-sent on the correct one"
              {...register("reason")}
            />
          </AdminField>

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton onClick={onClose} type="button" variant="ghost">
              Cancel
            </AdminButton>
            <AdminButton disabled={submitting} type="submit" variant="danger">
              {submitting ? "Reversing…" : "Reverse payment"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

const adjustSchema = z.object({
  amountGhs: z
    .string()
    .trim()
    .min(1, "Enter the amount")
    .refine((v) => Number(v) > 0, { message: "Enter an amount above zero" }),
  direction: z.enum(["down", "up"]),
  reason: z
    .string()
    .trim()
    .min(3, "Say why in a few words")
    .max(500, "Keep it under 500 characters"),
});
type AdjustValues = z.infer<typeof adjustSchema>;

/**
 * Changing what a DISPATCHED trip owes, without touching what was agreed.
 *
 * Before the truck leaves, a fee is still a negotiation and is simply edited.
 * After it leaves, the agreed figure is what a haulier will later say was
 * settled, so it stays put and the change is recorded beside it with a reason
 * and a date. That is the whole point: "we agreed 4,000" can be answered with
 * "yes, on the 4th, and it was reduced by 600 on the 9th, for this reason".
 *
 * Direction is a separate control rather than asking for a negative number.
 * A minus sign is easy to miss and easy to forget, and getting it wrong here
 * moves money the wrong way.
 */
export function DriverFeeAdjustDialog({
  onClose,
  shipmentId,
}: {
  onClose: () => void;
  shipmentId: string;
}) {
  const [adjust, { isLoading }] = useAdjustDriverFeeMutation();
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<AdjustValues>({
    defaultValues: { amountGhs: "", direction: "down", reason: "" },
    resolver: zodResolver(adjustSchema),
  });
  const direction = useWatch({ control, name: "direction" });

  const onSubmit = async (values: AdjustValues) => {
    const magnitude = Number(values.amountGhs);
    try {
      await adjust({
        body: {
          amountGhs: values.direction === "down" ? -magnitude : magnitude,
          reason: values.reason,
        },
        shipmentId,
      }).unwrap();
      notify.success(
        values.direction === "down" ? "Fee reduced" : "Fee increased",
      );
      onClose();
    } catch (err) {
      // The server refuses an adjustment that would take the fee below zero
      // or below what has already been paid; those messages name the real
      // problem, so they are shown rather than replaced.
      notify.error("Couldn't adjust the fee", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={onClose}>
      <ResponsiveDialogContent className="sm:max-w-[460px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Adjust the driver fee</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            This trip has dispatched, so what was agreed stays on the record.
            The change is added beside it with your reason and today&apos;s
            date.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <AdminField label="Which way">
            <Controller
              control={control}
              name="direction"
              render={({ field }) => (
                <SimpleSelect
                  className={adminSelectClass}
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "down", label: "Reduce what the driver is owed" },
                    { value: "up", label: "Increase what the driver is owed" },
                  ]}
                />
              )}
            />
          </AdminField>

          <AdminField
            error={errors.amountGhs?.message}
            hint={
              direction === "down"
                ? "How much to take off the agreed fee."
                : "How much to add to the agreed fee."
            }
            label="Amount (GHS)"
          >
            <Input
              className={cn(adminInputClass, "text-right")}
              inputMode="decimal"
              placeholder="0.00"
              {...register("amountGhs")}
            />
          </AdminField>

          <AdminField error={errors.reason?.message} label="Why">
            <textarea
              className={cn(
                adminInputClass,
                "h-auto min-h-[72px] w-full resize-y py-2",
              )}
              placeholder="e.g. Agreed a reduction after the second drop was cancelled"
              {...register("reason")}
            />
          </AdminField>

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton onClick={onClose} type="button" variant="ghost">
              Cancel
            </AdminButton>
            <AdminButton disabled={isLoading} type="submit">
              {isLoading ? "Saving…" : "Record adjustment"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
