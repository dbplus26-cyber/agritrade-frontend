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
          className="flex flex-col gap-4"
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
            <select className={adminSelectClass} {...register("policyId")}>
              <option value="">Use the usual terms</option>
              {(policies.data?.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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
          className="flex flex-col gap-4"
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
          className="flex flex-col gap-4"
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
