"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import {
  AdminButton,
  AdminField,
  Mono,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetSaleQuery,
  useRecordSalePaymentMutation,
} from "@/redux/sales/admin-sales-api";
import {
  recordPaymentSchema,
  type RecordPaymentValues,
} from "@/validations/sale-schema";
import {
  Money,
  PAYMENT_METHOD_OPTIONS,
  milestoneTriggerLabel,
  todayInputValue,
} from "./sale-bits";

/**
 * Record a manual payment against a confirmed sale. Shared by the sale detail
 * and the shipment detail (a truck can carry several sales, each payable from
 * the trip screen). Only the sale id is needed; the schedule readout fetches
 * the sale detail itself.
 */
export function PaymentDialog({
  sale,
  open,
  onClose,
}: {
  sale: { id: string };
  open: boolean;
  onClose: () => void;
}) {
  const detailQuery = useGetSaleQuery(sale.id, { skip: !open });
  const detail = detailQuery.data?.data.sale;
  const [record, { isLoading }] = useRecordSalePaymentMutation();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<RecordPaymentValues>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: { method: "CASH", paidAt: todayInputValue() },
  });

  // Drives whether the reference and the company account are required: a
  // transfer must carry both.
  const method = watch("method");
  const { confirm, confirmationDialog } = useConfirm();

  // Switching method changes which accounts can carry the payment, so a
  // previously chosen account must not ride along silently.
  useEffect(() => {
    setValue("paymentAccountId", "");
  }, [method, setValue]);

  // Quick-fill figures; null (redacted) money hides the button entirely.
  const depositRemainderGhs =
    detail &&
    detail.requiredBeforeLoadingGhs !== null &&
    detail.paidGhs !== null
      ? Math.max(detail.requiredBeforeLoadingGhs - detail.paidGhs, 0)
      : null;
  const fullBalanceGhs = detail?.balanceGhs ?? null;

  const fillAmount = (amount: number) =>
    setValue("amountGhs", amount.toFixed(2), {
      shouldValidate: true,
      shouldDirty: true,
    });

  /**
   * The quick fills that actually apply, resolved to a list so the layout can
   * be driven by how MANY there are. Two of them split the dialog exactly in
   * half and one takes the whole width - which is the point: as loose inline
   * buttons they wrapped into a ragged half-row that read as an afterthought
   * next to the amount they fill.
   */
  const quickFills: { amount: number; key: string; label: string }[] = [];
  if (depositRemainderGhs !== null && depositRemainderGhs > 0) {
    quickFills.push({
      amount: depositRemainderGhs,
      key: "deposit",
      label: "Deposit remainder",
    });
  }
  if (fullBalanceGhs !== null && fullBalanceGhs > 0) {
    quickFills.push({
      amount: fullBalanceGhs,
      key: "balance",
      label: "Full balance",
    });
  }

  const onSubmit = async (values: RecordPaymentValues) => {
    // Recording a payment is a ledger write that only an owner reversal can
    // undo, so the amount and the sale are read back before it commits - a
    // misplaced decimal here is the expensive mistake this screen can make.
    const confirmed = await confirm({
      title: "Record this payment?",
      description: `${formatCedis(Number(values.amountGhs))} by ${
        PAYMENT_METHOD_OPTIONS.find((o) => o.value === values.method)?.label ??
        values.method
      }${
        detail ? ` against sale ${detail.transactionNo}` : ""
      }. Once recorded, only the owner can reverse it.`,
      confirmText: "Record payment",
    });
    if (!confirmed) return;

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
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      {/* Wider than the console's standard dialog: this one carries a money
          readout, a large amount field and two side-by-side quick fills, and
          at 480px all three were fighting for the same measure. */}
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[580px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record a payment</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Cash, mobile money or a bank transfer someone has confirmed landed.
            There is no online checkout feeding this, so nothing appears on a
            sale until it is entered here.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* WHICH sale, and what is outstanding on it - the two facts the
            amount below is keyed against, so they lead at the largest size on
            the screen. Money may be redacted (null): `Money` prints the
            placeholder, never the word "null". */}
        {detailQuery.isLoading ? (
          <div className="border border-adm-line bg-adm-sunken px-3.5 py-3">
            <div className="flex items-end justify-between gap-4">
              <div className="flex-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="mt-1.5 h-3 w-36" />
              </div>
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="mt-3 h-3 w-2/3" />
          </div>
        ) : detail ? (
          <div className="border border-adm-line bg-adm-sunken">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-3.5 py-3">
              <div className="min-w-0">
                <Mono className="block text-[13px] font-semibold text-console">
                  {detail.transactionNo}
                </Mono>
                <span className="block truncate text-[12.5px] text-adm-muted">
                  {detail.buyer.name}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[9.5px] tracking-[0.14em] text-adm-muted uppercase">
                  {detail.fullyPaid ? "Settled" : "Balance"}
                </span>
                <Mono
                  className={cn(
                    "block text-[20px] leading-tight font-bold",
                    detail.balanceGhs === 0 ? "text-console" : "text-adm-ink",
                  )}
                >
                  <Money value={detail.balanceGhs} />
                </Mono>
              </div>
            </div>

            {/* The schedule and the dispatch gate: supporting detail, so it
                sits under a rule rather than competing with the balance. */}
            <div className="flex flex-col gap-1 px-3.5 py-2.5 text-[12.5px]">
              {detail.paidGhs !== null ? (
                <p className="flex items-baseline justify-between gap-3">
                  <span className="text-adm-muted">Paid so far</span>
                  <Mono className="text-adm-ink">
                    <Money value={detail.paidGhs} />
                  </Mono>
                </p>
              ) : null}
              {detail.milestones.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {detail.milestones.map((m, i) => (
                    <li
                      key={`${m.label}-${i}`}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="min-w-0 text-adm-muted [overflow-wrap:anywhere]">
                        {m.label}{" "}
                        <span className="whitespace-nowrap text-adm-faint">
                          · {m.percent}% · {milestoneTriggerLabel(m.trigger)}
                        </span>
                      </span>
                      {m.amountGhs !== null ? (
                        <Mono className="flex-none text-adm-ink">
                          <Money compact value={m.amountGhs} />
                        </Mono>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-adm-muted">No payment schedule on this sale.</p>
              )}
              {detail.requiredBeforeLoadingGhs !== null ? (
                <p
                  className={cn(
                    "mt-0.5 flex items-baseline justify-between gap-3 px-1.5 py-1 -mx-1.5",
                    detail.beforeLoadingMet
                      ? "bg-[#E3EBDD] text-[#2F5E3D]"
                      : "bg-[#F5ECD6] text-[#7A611C]",
                  )}
                >
                  <span className="font-medium">
                    Required before loading ·{" "}
                    {detail.beforeLoadingMet ? "met" : "not met"}
                  </span>
                  <Mono className="font-bold">
                    <Money compact value={detail.requiredBeforeLoadingGhs} />
                  </Mono>
                </p>
              ) : null}
            </div>
          </div>
        ) : detailQuery.isError ? (
          <p className="text-[12.5px] text-adm-muted">
            Couldn&apos;t load the payment schedule - you can still record the
            payment.
          </p>
        ) : null}

        {/* Pairs measure against this form rather than the viewport: inside a
            dialog the sheet has its own width, so a viewport query fires on
            screen size and not on the room the fields actually have. */}
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="@container flex flex-col gap-5"
        >
          <section className="flex flex-col gap-5">
            {/* The amount is what this dialog is FOR, so it is the one oversized
                field: a mono figure at cheque size with the currency standing
                outside it, not a 14px box like the reference beside it. */}
            <AdminField label="Amount (GHS)" error={errors.amountGhs?.message}>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[15px] font-semibold text-adm-faint"
                >
                  GH₵
                </span>
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 850.00"
                  className={cn(
                    adminInputClass,
                    "font-adminmono h-[54px] pl-[54px] text-[20px] font-bold tabular-nums",
                    errors.amountGhs && "border-console-red",
                  )}
                  {...register("amountGhs")}
                />
              </div>
            </AdminField>

            {/* Quick fills state their figure so admins confirm, not compute.
                Two split the width evenly, one takes all of it. They are absent
                whenever the figures are redacted - there is nothing to fill. */}
            {quickFills.length > 0 ? (
              <div
                className={cn(
                  "grid gap-2",
                  quickFills.length > 1 && "@min-[380px]:grid-cols-2",
                )}
              >
                {quickFills.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => fillAmount(f.amount)}
                    className="flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-none border border-adm-line bg-adm-card px-3 py-2 text-left transition-colors outline-none hover:border-console hover:bg-console/[0.04] focus-visible:border-console focus-visible:ring-3 focus-visible:ring-leaf/30"
                  >
                    <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                      {f.label}
                    </span>
                    <Mono className="text-[15px] font-bold text-adm-ink">
                      {formatCedis(f.amount)}
                    </Mono>
                  </button>
                ))}
              </div>
            ) : null}

          </section>

          <section className="flex flex-col gap-5">
            {/* How it arrived and when - a pair of short fields, so they share
                a row rather than each claiming one. */}
            {/* `justify-end` on both cells: "Payment date - optional" wraps to
                two lines in a narrow column while "Method" does not, and without
                it the two controls would sit at different heights. */}
            <div className="grid gap-5 @min-[380px]:grid-cols-2">
              <AdminField
                label="Method"
                error={errors.method?.message}
                // items-stretch/gap-0 undo the shadcn Label base (`flex
                // items-center gap-2`), which would otherwise centre the
                // label over its control once this cell is a column.
                className="flex flex-col items-stretch justify-end gap-0"
              >
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
              <AdminField
                label="Payment date"
                optional
                // items-stretch/gap-0 undo the shadcn Label base (`flex
                // items-center gap-2`), which would otherwise centre the
                // label over its control once this cell is a column.
                className="flex flex-col items-stretch justify-end gap-0"
              >
                <DateInput
                  className={adminInputClass}
                  {...register("paidAt")}
                />
              </AdminField>
            </div>

            {/* Which company account the money landed in. Required for a
                transfer - it is what the bank statement is reconciled against;
                cash sits in the till. */}
            <PaymentAccountField
              method={method}
              direction="in"
              error={errors.paymentAccountId?.message}
              onChange={(v) => setValue("paymentAccountId", v)}
              value={watch("paymentAccountId") ?? ""}
            />

            {/* Required for a transfer: it is what stops the same payment being
                recorded against the order twice. Cash has nothing to quote. */}
            <AdminField
              label="Reference"
              optional={method === "CASH"}
              hint={
                method === "CASH"
                  ? undefined
                  : "The transaction ID on the transfer. It is what stops this being recorded twice."
              }
              error={errors.reference?.message}
            >
              <Input
                className={cn(adminInputClass, errors.reference && "border-console-red")}
                placeholder={
                  method === "MOMO" ? "e.g. MP260118.1432.A12345" : "e.g. FT26018XYZ12"
                }
                {...register("reference")}
              />
            </AdminField>
          </section>

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="submit"
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? "Recording…" : "Record payment"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
      {confirmationDialog}
    </ResponsiveDialog>
  );
}
