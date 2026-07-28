"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
    formState: { errors },
  } = useForm<RecordPaymentValues>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: { method: "CASH", paidAt: todayInputValue() },
  });

  // Drives whether the reference is required: a transfer must carry one.
  const method = watch("method");
  const { confirm, confirmationDialog } = useConfirm();

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
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[480px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record a payment</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Every payment is recorded by hand here - cash, mobile money or a
            bank transfer someone has confirmed landed. There is no online
            checkout feeding this, so nothing appears until it is entered.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* The schedule readout: what the sale expects, what has landed, and
            what dispatch is waiting for. Money may be redacted (null). */}
        {detailQuery.isLoading ? (
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : detail ? (
          <div className="rounded-[2px] border-[1.5px] border-soil/25 bg-surface-alt/50 px-3 py-2.5">
            {detail.milestones.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {detail.milestones.map((m, i) => (
                  <li
                    key={`${m.label}-${i}`}
                    className="flex items-baseline justify-between gap-3 text-[12.5px]"
                  >
                    <span className="min-w-0 text-soil [overflow-wrap:anywhere]">
                      {m.label}{" "}
                      <span className="whitespace-nowrap text-soil/70">
                        · {m.percent}% · {milestoneTriggerLabel(m.trigger)}
                      </span>
                    </span>
                    {m.amountGhs !== null ? (
                      <Mono className="flex-none text-ink">
                        <Money compact value={m.amountGhs} />
                      </Mono>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-soil">
                No payment schedule on this sale.
              </p>
            )}
            <div className="mt-2 flex flex-col gap-1 border-t border-soil/15 pt-2 text-[12.5px]">
              {detail.paidGhs !== null ? (
                <p className="flex items-baseline justify-between gap-3">
                  <span className="text-soil">Paid so far</span>
                  <Mono className="text-ink">
                    <Money compact value={detail.paidGhs} />
                  </Mono>
                </p>
              ) : null}
              {detail.balanceGhs !== null ? (
                <p className="flex items-baseline justify-between gap-3">
                  <span className="text-soil">Balance</span>
                  <Mono className="font-bold text-ink">
                    <Money compact value={detail.balanceGhs} />
                  </Mono>
                </p>
              ) : null}
              {detail.requiredBeforeLoadingGhs !== null ? (
                <p
                  className={cn(
                    "flex items-baseline justify-between gap-3 rounded-[2px] px-1.5 py-0.5 -mx-1.5",
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
              {detail.fullyPaid ? (
                <p className="text-[12px] font-medium text-[#2F5E3D]">
                  This sale is fully paid.
                </p>
              ) : null}
            </div>
          </div>
        ) : detailQuery.isError ? (
          <p className="text-[12.5px] text-soil">
            Couldn&apos;t load the payment schedule - you can still record the
            payment.
          </p>
        ) : null}

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
          {/* Quick fills state their figure so admins confirm, not compute. */}
          {(depositRemainderGhs !== null && depositRemainderGhs > 0) ||
          (fullBalanceGhs !== null && fullBalanceGhs > 0) ? (
            <div className="flex flex-wrap gap-2">
              {depositRemainderGhs !== null && depositRemainderGhs > 0 ? (
                <AdminButton
                  type="button"
                  variant="secondary"
                  className="h-[30px] px-2.5 text-[12px]"
                  onClick={() => fillAmount(depositRemainderGhs)}
                >
                  Deposit remainder ·{" "}
                  <Mono>{formatCedis(depositRemainderGhs)}</Mono>
                </AdminButton>
              ) : null}
              {fullBalanceGhs !== null && fullBalanceGhs > 0 ? (
                <AdminButton
                  type="button"
                  variant="secondary"
                  className="h-[30px] px-2.5 text-[12px]"
                  onClick={() => fillAmount(fullBalanceGhs)}
                >
                  Full balance · <Mono>{formatCedis(fullBalanceGhs)}</Mono>
                </AdminButton>
              ) : null}
            </div>
          ) : null}
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
              className={cn(adminInputClass, errors.reference && "border-error")}
              placeholder={
                method === "MOMO" ? "MoMo transaction ID" : "Bank reference"
              }
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
          <ResponsiveDialogFooter className="gap-2">
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
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
      {confirmationDialog}
    </ResponsiveDialog>
  );
}
