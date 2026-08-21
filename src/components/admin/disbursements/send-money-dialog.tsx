"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  AdminButton,
  AdminField,
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
import { SimpleSelect } from "@/components/ui/simple-select";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreateDisbursementMutation,
  useCreateMyDisbursementMutation,
  useGetRecipientNameQuery,
  useGetSupportedBanksQuery,
} from "@/redux/disbursements/disbursements-api";
import { skipToken } from "@reduxjs/toolkit/query";
import type { ICreateDisbursementInput } from "@/types/disbursement.types";
import {
  disbursementSchema,
  type DisbursementValues,
} from "@/validations/disbursement-schema";
import { MOMO_CHANNEL_OPTIONS, useIdempotencyKey } from "./disbursement-bits";

/**
 * Which pot the send is drawn from.
 *
 * "company" is the owner sending straight from the business account; the
 * other two spend the signed-in person's own allocation, and differ only in
 * which namespace their request goes to. The form itself is identical, which
 * is why there is one of it.
 */
export type SendSurface = "agent" | "company" | "staff";

const DEFAULTS: DisbursementValues = {
  amountGhs: "",
  bankAccountNumber: "",
  bankCode: "",
  channel: "",
  description: "",
  rail: "MOMO",
  recipientMsisdn: "",
  recipientName: "",
};

/**
 * The error codes worth explaining rather than echoing. A send has two
 * separate limits and a bare "conflict" leaves the sender guessing which one
 * stopped them - and, more importantly, guessing what to DO about it.
 */
/**
 * Refusals worth rewriting in the sender's own terms. Keyed on the API's
 * `code`, which only reaches us for 4xx codes the backend allowlists
 * (CLIENT_ACTIONABLE_CODES in its error handler) - so a new entry here needs
 * the code added there too, or it silently never fires.
 *
 * COMPANY_BALANCE_UNKNOWN and HUBTEL_NOT_CONFIGURED are 503s, and the backend
 * strips `code` from every 5xx by design. Their entries are therefore
 * unreachable and kept only as documentation of the two states; both fall
 * through to the server's own message, which already says the same thing.
 */
const GUIDANCE: Record<string, string> = {
  COMPANY_BALANCE_UNKNOWN:
    "The company account balance could not be checked just now, so nothing was sent. Try again in a moment.",
  HUBTEL_NOT_CONFIGURED:
    "Sending money is not switched on for this system yet. Speak to whoever administers the server.",
  INSUFFICIENT_COMPANY_BALANCE:
    "The company's payout account cannot cover this. It needs topping up from the collection account before any further sends will go through - this is not about your own float.",
  INSUFFICIENT_FLOAT:
    "This is more than the float you have left. Check your balance or ask for a top-up.",
  SPENDING_ACCOUNT_SUSPENDED:
    "Your float has been suspended, so sending is disabled. Speak to the owner.",
};

/**
 * The verified-name hint under the mobile money number: once the number is
 * complete and a network chosen, ask Hubtel whose name is on it and offer it.
 * Assistive only - the typed name always wins, an unconfigured environment
 * or a Hubtel outage just means no hint, and nothing here can block a send.
 *
 * No debounce needed: the query only fires once the number matches the full
 * 233XXXXXXXXX shape, so typing never sprays requests - completion is the
 * trigger, and the cache absorbs re-checks of the same number.
 */
function RecipientNameHint({
  channel,
  currentName,
  msisdn,
  onUse,
  surface,
}: {
  channel: string;
  currentName: string;
  msisdn: string;
  onUse: (name: string) => void;
  surface: SendSurface;
}) {
  const complete = /^233\d{9}$/.test(msisdn) && channel !== "";
  const { data, isFetching } = useGetRecipientNameQuery(
    complete
      ? {
          channel,
          msisdn,
          surface: surface === "agent" ? "agent" : "admin",
        }
      : skipToken,
  );

  if (!complete) return null;
  if (data && !data.data.configured) return null;

  const lookup = data?.data.lookup;
  return (
    <div className="border border-adm-line bg-adm-sunken px-3 py-2 text-[12.5px] leading-[1.55] text-adm-body">
      {isFetching || !data ? (
        "Checking the name on this number…"
      ) : lookup?.name ? (
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <span className="min-w-0">
            {lookup.source === "momo"
              ? "This number's wallet is registered to "
              : "No wallet found - the SIM is registered to "}
            <strong className="font-semibold text-adm-ink">
              {lookup.name}
            </strong>
          </span>
          {currentName.trim().toLowerCase() !==
          lookup.name.trim().toLowerCase() ? (
            <button
              type="button"
              onClick={() => onUse(lookup.name ?? "")}
              className="flex-none cursor-pointer border border-adm-line bg-adm-card px-2 py-0.5 text-[12px] font-semibold text-console hover:bg-adm-hover"
            >
              Use this name
            </button>
          ) : null}
        </span>
      ) : (
        "No name found for this number on that network - double-check it before sending."
      )}
    </div>
  );
}

export function SendMoneyDialog({
  onClose,
  open,
  availableGhs,
  surface,
}: {
  /** The sender's remaining float, shown as a guide. Absent for the owner. */
  availableGhs?: null | number;
  onClose: () => void;
  open: boolean;
  surface: SendSurface;
}) {
  const [createCompany, companyState] = useCreateDisbursementMutation();
  const [createMine, mineState] = useCreateMyDisbursementMutation();
  const submitting = companyState.isLoading || mineState.isLoading;
  const { confirm, confirmationDialog } = useConfirm();

  const form = useForm<DisbursementValues>({
    defaultValues: DEFAULTS,
    resolver: zodResolver(disbursementSchema),
  });
  const rail = form.watch("rail");

  // One key per OPENING of the form, not per attempt: every retry of this
  // send carries the same key, so a timeout the user re-submits through
  // resolves to the one payout rather than two.
  const idempotencyKey = useIdempotencyKey(open);
  useEffect(() => {
    if (open) form.reset(DEFAULTS);
  }, [form, open]);

  // Only fetched once the bank rail is actually chosen - the MoMo path is the
  // common one and has no use for a 24-row bank list.
  const banksQuery = useGetSupportedBanksQuery(undefined, {
    skip: !open || rail !== "BANK",
  });
  const bankOptions = useMemo(
    () =>
      (banksQuery.data?.data.banks ?? []).map((b) => ({
        label: b.name,
        value: b.code,
      })),
    [banksQuery.data],
  );

  const onSubmit = async (values: DisbursementValues) => {
    const destination =
      values.rail === "MOMO"
        ? (values.recipientMsisdn ?? "")
        : (values.bankAccountNumber ?? "");
    const via =
      values.rail === "MOMO"
        ? (MOMO_CHANNEL_OPTIONS.find((o) => o.value === values.channel)?.label ??
          "mobile money")
        : (bankOptions.find((o) => o.value === values.bankCode)?.label ??
          "their bank");

    // The one action in this console that puts money beyond recall. Hubtel
    // pays out to whatever destination was keyed and no one in the business
    // can pull it back, so this is read back in full before it commits.
    //
    // The four digits are what must be typed, not the recipient's name: on a
    // MoMo send the name is decorative, the number alone decides who is paid,
    // and re-typing a name the sender keyed in seconds earlier proves nothing
    // about where the money is going.
    const confirmed = await confirm({
      title: "Send this money now?",
      description: `${formatCedis(Number(values.amountGhs))} to ${values.recipientName} on ${via}, ${destination}. ${
        surface === "company"
          ? "It leaves the company payout account"
          : "It comes off your float"
      } as soon as this goes through, and nobody here can recall it.`,
      confirmText: "Send money",
      requireExactMatch: destination.slice(-4),
    });
    if (!confirmed) return;

    const body: ICreateDisbursementInput = {
      amountGhs: Number(values.amountGhs),
      description: values.description,
      rail: values.rail,
      recipientName: values.recipientName,
      ...(values.rail === "MOMO"
        ? {
            channel: values.channel as ICreateDisbursementInput["channel"],
            recipientMsisdn: values.recipientMsisdn,
          }
        : {
            bankAccountNumber: values.bankAccountNumber,
            bankCode: values.bankCode,
          }),
    };

    try {
      const res =
        surface === "company"
          ? await createCompany({ body, idempotencyKey: idempotencyKey() }).unwrap()
          : await createMine({
              body,
              idempotencyKey: idempotencyKey(),
              surface: surface === "agent" ? "agent" : "staff",
            }).unwrap();
      notify.success(res.message);
      onClose();
    } catch (error) {
      const { code, fieldErrors, hasFieldErrors, message } =
        extractApiError(error);
      // Server-side VALIDATION_ERROR lands on the offending field, same as
      // grant-form: a toast alone left the sender hunting for which of eight
      // inputs the backend refused.
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "amountGhs",
          "description",
          "rail",
          "recipientName",
          "channel",
          "recipientMsisdn",
          "bankAccountNumber",
          "bankCode",
        ] as const) {
          if (fieldErrors[field])
            form.setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(GUIDANCE[code ?? ""] ?? message);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[560px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Send money</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {surface === "company"
              ? "Paid straight from the company's payout account."
              : availableGhs != null
                ? `Spent from your float. You have ${formatCedis(availableGhs)} left.`
                : "Spent from your float."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="space-y-5 px-4 pb-2 sm:px-0"
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        >
          <section className="space-y-5">
            <AdminField label="How are they being paid?">
              <Controller
                control={form.control}
                name="rail"
                render={({ field }) => (
                  <SimpleSelect
                    className={adminSelectClass}
                    value={field.value}
                    // Switching rails clears the other rail's fields so a stale
                    // account number can never ride along with a MoMo send.
                    onChange={(v) => {
                      form.setValue("rail", v as "BANK" | "MOMO");
                      form.setValue("bankAccountNumber", "");
                      form.setValue("bankCode", "");
                      form.setValue("channel", "");
                      form.setValue("recipientMsisdn", "");
                      form.clearErrors();
                    }}
                    options={[
                      { value: "MOMO", label: "Mobile money" },
                      { value: "BANK", label: "Bank transfer" },
                    ]}
                  />
                )}
              />
            </AdminField>

            <AdminField
              label="Amount (GH₵)"
              error={form.formState.errors.amountGhs?.message}
            >
              <Input
                className={cn(adminInputClass, "font-adminmono")}
                inputMode="decimal"
                placeholder="e.g. 850.00"
                {...form.register("amountGhs")}
              />
            </AdminField>

          </section>

          <section className="space-y-5">
            <AdminField
              label="Recipient's name"
              error={form.formState.errors.recipientName?.message}
              hint="Write it as their account shows it: the number below is what the money actually follows."
            >
              <Input
                className={adminInputClass}
                placeholder="e.g. Ibrahim Fuseini"
                {...form.register("recipientName")}
              />
            </AdminField>

            {rail === "MOMO" ? (
              <>
                <AdminField
                  label="Network"
                  error={form.formState.errors.channel?.message}
                >
                  <Controller
                    control={form.control}
                    name="channel"
                    render={({ field }) => (
                      <SimpleSelect
                        className={adminSelectClass}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Choose a network"
                        options={MOMO_CHANNEL_OPTIONS}
                      />
                    )}
                  />
                </AdminField>
                <AdminField
                  label="Mobile money number"
                  error={form.formState.errors.recipientMsisdn?.message}
                >
                  <Input
                    className={cn(adminInputClass, "font-adminmono")}
                    inputMode="numeric"
                    placeholder="e.g. 233249111411"
                    {...form.register("recipientMsisdn")}
                  />
                </AdminField>
                <RecipientNameHint
                  channel={form.watch("channel") ?? ""}
                  currentName={form.watch("recipientName")}
                  msisdn={form.watch("recipientMsisdn") ?? ""}
                  onUse={(name) =>
                    form.setValue("recipientName", name, {
                      shouldValidate: true,
                    })
                  }
                  surface={surface}
                />
              </>
            ) : (
              <>
                <AdminField
                  label="Bank"
                  error={form.formState.errors.bankCode?.message}
                >
                  <SearchableSelect
                    disabled={banksQuery.isLoading}
                    onChange={(v) =>
                      form.setValue("bankCode", v, { shouldValidate: true })
                    }
                    options={bankOptions}
                    placeholder={
                      banksQuery.isLoading ? "Loading banks…" : "Choose a bank"
                    }
                    value={form.watch("bankCode") ?? ""}
                  />
                </AdminField>
                <AdminField
                  label="Account number"
                  error={form.formState.errors.bankAccountNumber?.message}
                >
                  <Input
                    className={cn(adminInputClass, "font-adminmono")}
                    inputMode="numeric"
                    placeholder="e.g. 1234567890123"
                    {...form.register("bankAccountNumber")}
                  />
                </AdminField>
              </>
            )}

          </section>

          <section className="space-y-5">
            <AdminField
              label="What is it for?"
              error={form.formState.errors.description?.message}
              hint="The recipient sees this on their statement."
            >
              <Input
                className={adminInputClass}
                maxLength={100}
                placeholder="e.g. Maize purchase, Tolon"
                {...form.register("description")}
              />
            </AdminField>
          </section>
        </form>

        <ResponsiveDialogFooter>
          <AdminButton onClick={onClose} type="button" variant="ghost">
            Cancel
          </AdminButton>
          <AdminButton
            disabled={submitting}
            loading={submitting}
            onClick={() => void form.handleSubmit(onSubmit)()}
            type="button"
          >
            {submitting ? "Sending…" : "Send money"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
      {confirmationDialog}
    </ResponsiveDialog>
  );
}
