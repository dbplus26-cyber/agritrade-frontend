"use client";

import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import type {
  AccountEntryType,
  IAccountBalance,
  SystemAccountKey,
} from "@/types/cashbook.types";

/**
 * A money figure that says what a negative balance MEANS.
 *
 * An account in the red is not a formatting case, it is the single thing on
 * this screen somebody has to act on: either money left that the books did not
 * know about, or an opening position nobody has entered yet. Rendering it in
 * the same grey as every other figure is how it stays unnoticed for a month.
 */
export function Balance({
  className,
  value,
}: {
  className?: string;
  value: number | null;
}) {
  const negative = value !== null && value < 0;
  return (
    <span
      className={cn(
        "font-adminmono tabular-nums",
        negative && "text-console-red",
        className,
      )}
    >
      {formatCedis(value)}
    </span>
  );
}

/**
 * What each system account is for, in the owner's words rather than the
 * schema's. These four are not accounts anybody added, so nothing on the
 * screen explains them unless this does.
 */
const SYSTEM_ACCOUNT_HINT: Record<SystemAccountKey, string> = {
  COMPANY_TILL:
    "Cash in the office box. Every cash sale lands here and every cash cost is paid from it.",
  HUBTEL_COLLECTION: "Where money collected through Hubtel lands.",
  HUBTEL_DISBURSEMENT: "The Hubtel pot every mobile-money payout is drawn on.",
  SUSPENSE:
    "Money whose account nobody recorded. A balance here is a question waiting for an answer, not a loss - move it to the right account once you know where it went.",
};

export const accountHint = (account: IAccountBalance): string | undefined =>
  account.systemKey ? SYSTEM_ACCOUNT_HINT[account.systemKey] : undefined;

/** How each entry type reads to somebody who runs the business. */
export const ENTRY_TYPE_OPTIONS: {
  description: string;
  label: string;
  value: AccountEntryType;
}[] = [
  {
    description: "Cash or a transfer paid into this account from outside.",
    label: "Money in",
    value: "DEPOSIT",
  },
  {
    description: "Cash or a transfer taken out, not against any bill.",
    label: "Money out",
    value: "WITHDRAWAL",
  },
  {
    description: "A fee or charge the bank or wallet took.",
    label: "Bank charge",
    value: "CHARGE",
  },
  {
    description: "Money you have put into the business yourself.",
    label: "Your own money in",
    value: "CAPITAL",
  },
  {
    description:
      "What this account held on the day the books start. One per account, and it can be a minus if the account was overdrawn.",
    label: "Opening balance",
    value: "OPENING",
  },
  {
    description:
      "Owning up to a keying error. Enter a minus to take money off, a plus to add it back.",
    label: "Correction",
    value: "CORRECTION",
  },
];

/** The two types that take a signed figure, because they genuinely go both ways. */
export const SIGNED_ENTRY_TYPES: AccountEntryType[] = ["CORRECTION", "OPENING"];

/**
 * What a ledger line was caused by, in words. The server sends the document
 * kind for a payment and the movement type for an account-native entry, so one
 * map covers both.
 */
const SOURCE_LABEL: Record<string, string> = {
  CAPITAL: "Own money in",
  CHARGE: "Bank charge",
  CORRECTION: "Correction",
  DEPOSIT: "Money in",
  DRIVER_PAYMENT: "Driver paid",
  EXPENSE_PAYMENT: "Cost settled",
  LAND_ACQUISITION_PAYMENT: "Land seller paid",
  LAND_SALE_PAYMENT: "Land sale receipt",
  OPENING: "Opening balance",
  SALE_PAYMENT: "Sale receipt",
  TRANSFER_IN: "Moved in",
  TRANSFER_OUT: "Moved out",
  WITHDRAWAL: "Money out",
};

export const sourceLabel = (source: string): string =>
  SOURCE_LABEL[source] ?? source.toLowerCase().replace(/_/g, " ");
