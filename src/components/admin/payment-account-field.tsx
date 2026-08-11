"use client";

import { useMemo } from "react";
import { AdminField, adminSelectClass } from "@/components/admin/ui";

import { SimpleSelect } from "@/components/ui/simple-select";
import { cn } from "@/lib/utils";
import { useGetPaymentAccountsQuery } from "@/redux/payment-accounts/payment-accounts-api";
import type { PaymentAccountKind } from "@/types/payment-account.types";

/**
 * Mirrors the backend `COMPATIBLE_KINDS`
 * (services/payment-account/payment-account-link.ts): which account kinds can
 * plausibly carry a movement of each method. OTHER is always allowed - it
 * exists precisely for rails the enum doesn't name.
 */
const COMPATIBLE_KINDS: Record<
  "BANK" | "CASH" | "MOMO",
  PaymentAccountKind[]
> = {
  BANK: ["BANK", "OTHER"],
  CASH: ["CASH", "OTHER"],
  MOMO: ["MOMO", "OTHER"],
};

/** Last four digits only - enough to recognise the account at a glance. */
const maskAccountNumber = (accountNumber: string): string =>
  `····${accountNumber.slice(-4)}`;

/** Sentinel for "no account" - Radix select items cannot carry "". */
const NO_ACCOUNT = "__no_account__";

/**
 * The "which company account did this money move on" select for the three
 * record-payment forms (sales, land sales, land acquisitions). Populated from
 * the live payment-accounts register, narrowed to the kinds the chosen method
 * can touch. Required for BANK/MOMO (the account is what the bank statement
 * is reconciled against - the backend refuses without it, ACCOUNT_REQUIRED);
 * optional for cash, which sits in the till.
 */
export function PaymentAccountField({
  method,
  direction,
  error,
  onChange,
  value,
}: {
  method: "BANK" | "CASH" | "MOMO";
  /** "in": money received into the account; "out": paid out of it. */
  direction: "in" | "out";
  error?: string;
  /** Controlled: pair with react-hook-form's `Controller`. */
  value: string;
  onChange: (value: string) => void;
}) {
  const { data, isLoading, isError } = useGetPaymentAccountsQuery({
    isActive: true,
    // The register is a short owner-maintained list; 100 is the API's cap
    // and far above any real count, so one page is the whole register.
    limit: 100,
  });
  const accounts = useMemo(
    () =>
      (data?.data ?? []).filter((a) =>
        COMPATIBLE_KINDS[method].includes(a.kind),
      ),
    [data, method],
  );

  const chosen = accounts.find((a) => a.id === value);
  const optional = method === "CASH";
  const hint = isError
    ? "Couldn't load the accounts register - close and try again."
    : !isLoading && accounts.length === 0
      ? "No live account can carry this method. Add one under Payment accounts first."
      : undefined;

  return (
    <AdminField
      label={direction === "in" ? "Received into account" : "Paid from account"}
      optional={optional}
      hint={hint}
      error={error}
    >
      {/* The option text is kept SHORT - the label alone, not
          "label · ····1234" - so the panel stays narrow; the masked number
          sits under the field instead, where it is readable without opening
          anything. */}
      <SimpleSelect
        disabled={isLoading}
        value={value}
        // Radix reserves the empty string, so "no account" travels as a
        // sentinel option and maps back to "" here - without it, a picked
        // account could never be cleared back to the cash till.
        onChange={(v) => onChange(v === NO_ACCOUNT ? "" : v)}
        className={cn(adminSelectClass, "w-full", error && "border-console-red")}
        placeholder={
          isLoading
            ? "Loading accounts…"
            : optional
              ? "Cash till (no account)"
              : "Select the account…"
        }
        options={[
          ...(optional && !isLoading
            ? [{ value: NO_ACCOUNT, label: "Cash till (no account)" }]
            : []),
          ...accounts.map((a) => ({ value: a.id, label: a.label })),
        ]}
      />
      {chosen ? (
        <p className="mt-1 text-[12px] text-adm-muted">
          {chosen.accountName} · {maskAccountNumber(chosen.accountNumber)}
        </p>
      ) : null}
    </AdminField>
  );
}
