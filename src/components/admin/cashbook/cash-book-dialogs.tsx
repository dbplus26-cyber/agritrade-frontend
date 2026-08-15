"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  ENTRY_TYPE_OPTIONS,
  SIGNED_ENTRY_TYPES,
} from "@/components/admin/cashbook/cash-book-bits";
import { useIdempotencyKey } from "@/components/admin/disbursements/disbursement-bits";
import {
  AdminButton,
  AdminField,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { DateInput } from "@/components/ui/date-input";
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
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreateAccountTransferMutation,
  usePostAccountEntryMutation,
  useReconcileAccountMutation,
} from "@/redux/cashbook/cashbook-api";
import type { AccountEntryType, IAccountBalance } from "@/types/cashbook.types";
import {
  accountEntrySchema,
  type AccountEntryValues,
  accountTransferSchema,
  type AccountTransferValues,
  reconcileSchema,
  type ReconcileValues,
} from "@/validations/cashbook-schema";

/** Today, as the date inputs want it. */
const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Money in or out of one account, with no bill or invoice behind it: banking
 * cash, a bank charge, the opening position, or owning up to a keying error.
 */
export function EntryDialog({
  accountId,
  accountLabel,
  onClose,
  open,
}: {
  accountId: string;
  accountLabel: string;
  onClose: () => void;
  open: boolean;
}) {
  const [postEntry, { isLoading }] = usePostAccountEntryMutation();
  const form = useForm<AccountEntryValues>({
    defaultValues: {
      amountGhs: "",
      occurredAt: today(),
      reason: "",
      type: "DEPOSIT",
    },
    resolver: zodResolver(accountEntrySchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amountGhs: "",
        occurredAt: today(),
        reason: "",
        type: "DEPOSIT",
      });
    }
  }, [form, open]);

  const type = form.watch("type");
  const signed = SIGNED_ENTRY_TYPES.includes(type);
  const chosen = ENTRY_TYPE_OPTIONS.find((o) => o.value === type);

  const onSubmit = async (values: AccountEntryValues) => {
    try {
      const res = await postEntry({
        accountId,
        body: {
          amountGhs: Number(values.amountGhs),
          occurredAt: values.occurredAt,
          reason: values.reason,
          type: values.type,
        },
      }).unwrap();
      notify.success(res.message);
      onClose();
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[540px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record an entry</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Money in or out of {accountLabel} that no invoice, cost or land deal
            explains.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="@container space-y-5 px-4 pb-2 sm:px-0"
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        >
          <AdminField
            label="What kind of entry?"
            error={form.formState.errors.type?.message}
          >
            <SimpleSelect
              className={adminSelectClass}
              onChange={(v) => form.setValue("type", v as AccountEntryType)}
              options={ENTRY_TYPE_OPTIONS.map((o) => ({
                label: o.label,
                value: o.value,
              }))}
              value={type}
            />
          </AdminField>
          {chosen ? (
            <p className="-mt-3 text-[12.5px] text-adm-muted">
              {chosen.description}
            </p>
          ) : null}

          {/* Two short fields pair up once the SHEET is wide enough, measured
              on the form itself - the same component is a bottom sheet on a
              phone and a centred card on a desktop. */}
          <div className="grid grid-cols-1 gap-5 @[380px]:grid-cols-2">
            <AdminField
              label={signed ? "Amount (GH₵, minus to reduce)" : "Amount (GH₵)"}
              error={form.formState.errors.amountGhs?.message}
            >
              <Input
                className={cn(adminInputClass, "font-adminmono")}
                inputMode="decimal"
                placeholder={signed ? "e.g. -250.00" : "e.g. 2000.00"}
                {...form.register("amountGhs")}
              />
            </AdminField>
            <AdminField
              label="When did it move?"
              error={form.formState.errors.occurredAt?.message}
            >
              <DateInput
                className={adminInputClass}
                {...form.register("occurredAt")}
              />
            </AdminField>
          </div>

          <AdminField
            label="What is it for?"
            error={form.formState.errors.reason?.message}
          >
            <Input
              className={adminInputClass}
              maxLength={500}
              placeholder="e.g. Banked Saturday market takings"
              {...form.register("reason")}
            />
          </AdminField>
          <p className="text-[12.5px] text-adm-muted">
            This is the only money path with no document behind it, so what you
            write here is the whole explanation anyone reading the books later
            will have.
          </p>
        </form>

        <ResponsiveDialogFooter>
          <AdminButton onClick={onClose} type="button" variant="ghost">
            Cancel
          </AdminButton>
          <AdminButton
            disabled={isLoading}
            onClick={() => void form.handleSubmit(onSubmit)()}
            type="button"
          >
            {isLoading ? "Recording…" : "Record entry"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * Moving money between two of the business's own accounts.
 *
 * Nothing about the company's total position changes, which is what makes this
 * safe to record freely - and is exactly why it must NOT be keyed as a sale on
 * one side and a cost on the other, the way a hand-kept book ends up
 * double-counting a year's takings.
 */
export function TransferDialog({
  accounts,
  defaultFromId,
  onClose,
  open,
}: {
  accounts: IAccountBalance[];
  defaultFromId?: string;
  onClose: () => void;
  open: boolean;
}) {
  const [createTransfer, { isLoading }] = useCreateAccountTransferMutation();
  const idempotencyKey = useIdempotencyKey(open);

  const form = useForm<AccountTransferValues>({
    defaultValues: {
      amountGhs: "",
      fromAccountId: defaultFromId ?? "",
      occurredAt: today(),
      reason: "",
      toAccountId: "",
    },
    resolver: zodResolver(accountTransferSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amountGhs: "",
        fromAccountId: defaultFromId ?? "",
        occurredAt: today(),
        reason: "",
        toAccountId: "",
      });
    }
  }, [defaultFromId, form, open]);

  const options = useMemo(
    () =>
      accounts
        .filter((a) => a.isActive)
        .map((a) => ({ label: a.label, value: a.id })),
    [accounts],
  );
  const fromId = form.watch("fromAccountId");
  const from = accounts.find((a) => a.id === fromId);

  const onSubmit = async (values: AccountTransferValues) => {
    try {
      const res = await createTransfer({
        body: {
          amountGhs: Number(values.amountGhs),
          fromAccountId: values.fromAccountId,
          occurredAt: values.occurredAt,
          reason: values.reason || undefined,
          toAccountId: values.toAccountId,
        },
        idempotencyKey: idempotencyKey(),
      }).unwrap();
      notify.success(res.message);
      onClose();
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[540px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Move money</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Between two of your own accounts: banking cash, funding a wallet, or
            handing an agent money to buy with.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="@container space-y-5 px-4 pb-2 sm:px-0"
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        >
          <AdminField
            label="Out of"
            error={form.formState.errors.fromAccountId?.message}
          >
            <SimpleSelect
              className={adminSelectClass}
              onChange={(v) => form.setValue("fromAccountId", v)}
              options={options}
              placeholder="Pick the account"
              value={fromId}
            />
          </AdminField>
          {from ? (
            <p className="-mt-3 text-[12.5px] text-adm-muted">
              {from.label} holds {formatCedis(from.balanceGhs)}.
            </p>
          ) : null}

          <AdminField
            label="Into"
            error={form.formState.errors.toAccountId?.message}
          >
            <SimpleSelect
              className={adminSelectClass}
              onChange={(v) => form.setValue("toAccountId", v)}
              options={options.filter((o) => o.value !== fromId)}
              placeholder="Pick the account"
              value={form.watch("toAccountId")}
            />
          </AdminField>

          <div className="grid grid-cols-1 gap-5 @[380px]:grid-cols-2">
            <AdminField
              label="Amount (GH₵)"
              error={form.formState.errors.amountGhs?.message}
            >
              <Input
                className={cn(adminInputClass, "font-adminmono")}
                inputMode="decimal"
                placeholder="e.g. 2500.00"
                {...form.register("amountGhs")}
              />
            </AdminField>
            <AdminField
              label="When did it move?"
              error={form.formState.errors.occurredAt?.message}
            >
              <DateInput
                className={adminInputClass}
                {...form.register("occurredAt")}
              />
            </AdminField>
          </div>

          <AdminField
            label="What was it for? (optional)"
            error={form.formState.errors.reason?.message}
          >
            <Input
              className={adminInputClass}
              maxLength={500}
              placeholder="e.g. Banked the week's takings"
              {...form.register("reason")}
            />
          </AdminField>
        </form>

        <ResponsiveDialogFooter>
          <AdminButton onClick={onClose} type="button" variant="ghost">
            Cancel
          </AdminButton>
          <AdminButton
            disabled={isLoading}
            onClick={() => void form.handleSubmit(onSubmit)()}
            type="button"
          >
            {isLoading ? "Moving…" : "Move money"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * Proving an account against a count or a statement.
 *
 * The variance is recorded either way. Closing it with a correction is a
 * separate, deliberate choice, because most of a bank account's difference is
 * timing - a cheque that has not cleared - and posting a correction for that
 * invents money to paper over a gap that closes itself. A cash count is the
 * other case: if the box is short, the money is gone.
 */
export function ReconcileDialog({
  accountId,
  accountLabel,
  bookBalanceGhs,
  onClose,
  open,
}: {
  accountId: string;
  accountLabel: string;
  bookBalanceGhs: number | null;
  onClose: () => void;
  open: boolean;
}) {
  const [reconcile, { isLoading }] = useReconcileAccountMutation();
  const form = useForm<ReconcileValues>({
    defaultValues: {
      asOf: today(),
      countedBalanceGhs: "",
      notes: "",
      postCorrection: false,
    },
    resolver: zodResolver(reconcileSchema),
  });

  useEffect(() => {
    if (open) {
      form.reset({
        asOf: today(),
        countedBalanceGhs: "",
        notes: "",
        postCorrection: false,
      });
    }
  }, [form, open]);

  const counted = form.watch("countedBalanceGhs");
  const variance =
    counted !== "" && bookBalanceGhs !== null && !Number.isNaN(Number(counted))
      ? Number(counted) - bookBalanceGhs
      : null;

  const onSubmit = async (values: ReconcileValues) => {
    try {
      const res = await reconcile({
        accountId,
        body: {
          asOf: values.asOf,
          countedBalanceGhs: Number(values.countedBalanceGhs),
          notes: values.notes || undefined,
          postCorrection: values.postCorrection,
        },
      }).unwrap();
      notify.success(res.message);
      onClose();
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[540px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Check against the books</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            What {accountLabel} actually holds, against what the cash book says
            it should.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="@container space-y-5 px-4 pb-2 sm:px-0"
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        >
          <div className="grid grid-cols-1 gap-5 @[380px]:grid-cols-2">
            <AdminField
              label="Counted / on the statement (GH₵)"
              error={form.formState.errors.countedBalanceGhs?.message}
            >
              <Input
                className={cn(adminInputClass, "font-adminmono")}
                inputMode="decimal"
                placeholder="e.g. 4970.00"
                {...form.register("countedBalanceGhs")}
              />
            </AdminField>
            <AdminField
              label="As at"
              error={form.formState.errors.asOf?.message}
            >
              <DateInput
                className={adminInputClass}
                {...form.register("asOf")}
              />
            </AdminField>
          </div>

          <div className="border border-adm-hairline bg-adm-sunken p-3">
            <p className="text-[12.5px] text-adm-muted">
              The books say {formatCedis(bookBalanceGhs)}.
            </p>
            {variance !== null ? (
              <p
                className={cn(
                  "font-adminmono mt-1 text-[15px] font-bold tabular-nums",
                  variance === 0 ? "text-adm-ink" : "text-console-red",
                )}
              >
                {variance === 0
                  ? "It agrees."
                  : `${variance > 0 ? "Over" : "Short"} by ${formatCedis(Math.abs(variance))}`}
              </p>
            ) : null}
          </div>

          <AdminField
            label="Notes (optional)"
            error={form.formState.errors.notes?.message}
          >
            <Input
              className={adminInputClass}
              maxLength={1000}
              placeholder="e.g. Cheque paid in on the 29th has not cleared"
              {...form.register("notes")}
            />
          </AdminField>

          <label className="flex items-start gap-2.5 text-[13px] text-adm-body">
            <input
              className="mt-0.5 size-4 flex-none accent-[var(--console)]"
              type="checkbox"
              {...form.register("postCorrection")}
            />
            <span>
              Correct the books to match what I counted.
              <span className="mt-0.5 block text-[12.5px] text-adm-muted">
                Only tick this when the difference is a real error, not a
                payment that has yet to clear. It writes a correction that moves
                the balance - it does not quietly rewrite anything.
              </span>
            </span>
          </label>
        </form>

        <ResponsiveDialogFooter>
          <AdminButton onClick={onClose} type="button" variant="ghost">
            Cancel
          </AdminButton>
          <AdminButton
            disabled={isLoading}
            onClick={() => void form.handleSubmit(onSubmit)()}
            type="button"
          >
            {isLoading ? "Saving…" : "Save check"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
