"use client";

import { useMemo } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { AdminField, adminSelectClass } from "@/components/admin/ui";
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
  registration,
}: {
  method: "BANK" | "CASH" | "MOMO";
  /** "in": money received into the account; "out": paid out of it. */
  direction: "in" | "out";
  error?: string;
  /** `register("paymentAccountId")` from the owning form. */
  registration: UseFormRegisterReturn;
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
      <select
        disabled={isLoading}
        className={cn(adminSelectClass, "w-full", error && "border-console-red")}
        {...registration}
      >
        <option value="">
          {isLoading
            ? "Loading accounts…"
            : optional
              ? "Cash till (no account)"
              : "Select the account…"}
        </option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.label} · {maskAccountNumber(a.accountNumber)}
          </option>
        ))}
      </select>
    </AdminField>
  );
}
