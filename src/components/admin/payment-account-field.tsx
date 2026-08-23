"use client";

import { useId, useMemo } from "react";
import { AdminField, adminSelectClass } from "@/components/admin/ui";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGetSettlementAccountsQuery } from "@/redux/payment-accounts/payment-accounts-api";
import type {
  ISettlementAccount,
  PaymentAccountKind,
} from "@/types/payment-account.types";

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

/** Sentinel for "no account" - Radix select items cannot carry "". */
const NO_ACCOUNT = "__no_account__";

/**
 * What naming a held account commits the person to, said in the direction the
 * money actually travelled.
 *
 * It has to be said in full because a held account is not a filing choice: it
 * is a statement that a named person is carrying company money and will be
 * asked to produce it.
 */
const holderNote = (direction: "in" | "out", name: string): string =>
  direction === "in"
    ? `${name} is holding this money. It is counted against them until it reaches the office.`
    : `This came out of what ${name} is holding, so it is counted off what they owe.`;

/**
 * The grouped select itself.
 *
 * Split out rather than reaching for SimpleSelect because SimpleSelect takes a
 * flat option list and cannot group, and grouping is the whole point here: a
 * company account and somebody's pocket are different kinds of answer and must
 * not read as one list. It takes the `aria-describedby` / `aria-invalid`
 * AdminField clones onto its child and puts them on the trigger, which is the
 * control a screen reader actually lands on.
 */
function AccountSelect({
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  company,
  held,
  invalidClass,
  noAccountLabel,
  note,
  onChange,
  placeholder,
  value,
}: {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  company: ISettlementAccount[];
  held: ISettlementAccount[];
  invalidClass?: string;
  /** Present only where "no account at all" is a legitimate answer. */
  noAccountLabel?: string;
  /** Consequence of the current choice, shown under the control. */
  note?: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const noteId = useId();

  return (
    <div className="min-w-0">
      <Select
        value={value || undefined}
        // Radix reserves the empty string, so "no account" travels as a
        // sentinel option and maps back to "" here - without it, a picked
        // account could never be cleared back to the office till.
        onValueChange={(v) => {
          onChange(v === NO_ACCOUNT ? "" : v);
        }}
      >
        <SelectTrigger
          unstyled
          aria-describedby={
            [describedBy, note ? noteId : null].filter(Boolean).join(" ") ||
            undefined
          }
          aria-invalid={invalid}
          className={cn(
            adminSelectClass,
            "w-full justify-between gap-1.5 text-left [&>span]:min-w-0 [&>span]:truncate",
            invalidClass,
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {noAccountLabel ? (
            <SelectItem value={NO_ACCOUNT}>{noAccountLabel}</SelectItem>
          ) : null}
          {company.length > 0 ? (
            <SelectGroup>
              <SelectLabel>Company accounts</SelectLabel>
              {company.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
          {/* Held accounts sit second, under their own heading: they are the
              exception, and a list where an agent's pocket sits between two
              bank accounts is how money gets booked to a person by mistake.
              Their label already reads as the person ("Kwame Mensah - cash"),
              which is what somebody picking from a list needs; an id is not. */}
          {held.length > 0 ? (
            <SelectGroup>
              <SelectLabel>In someone&apos;s hands</SelectLabel>
              {held.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : null}
        </SelectContent>
      </Select>
      {/* Beside the choice, not behind a tooltip icon: it is the consequence
          of what was just picked, and a name is long enough to wrap on a phone
          rather than push the field sideways. */}
      {note ? (
        <p
          className="mt-1 text-[11px] text-adm-muted [overflow-wrap:anywhere]"
          id={noteId}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The "where did this money actually end up" select, for every form that
 * records a payment by hand (sales, land sales, land acquisitions, purchases,
 * expenses, driver fees).
 *
 * It reads the settlement list, NOT the payment-accounts register. The
 * register answers where customers should send money: a question about the
 * future, whose answer is only ever a company account. This one is about money
 * that has already moved, and the honest answer is sometimes a person - an
 * agent who collected GHS 3,000 at a roadside is holding it, and booking that
 * to the office till says the money is in a box it is not in. So the list is
 * the company's accounts, the office till and the accounts people are holding
 * money in, minus the three the machinery keeps for itself.
 *
 * The list is narrowed to the kinds the chosen method can touch, because the
 * backend refuses the mismatch (ACCOUNT_METHOD_MISMATCH) and offering a
 * refusal is not offering a choice. Naming an account is required for
 * BANK/MOMO - it is what a bank statement is reconciled against
 * (ACCOUNT_REQUIRED); cash may name nothing and falls to the office till.
 *
 * The settlement rows carry NO account number and NO balance, by contract:
 * this picker is offered to anyone who may record a payment, and a figure here
 * would leak what money visibility deliberately nulls. There is therefore no
 * masked-number hint under the field - the only thing worth saying about a
 * chosen account is who is holding it.
 */
export function PaymentAccountField({
  direction,
  error,
  label,
  method,
  onChange,
  required = false,
  value,
}: {
  /** "in": money received into the account; "out": paid out of it. */
  direction: "in" | "out";
  error?: string;
  /** Overrides the default field label. */
  label?: string;
  /**
   * Narrows the list to the kinds this method can touch. OMIT to offer every
   * live account: cash handed to an agent may have been withdrawn from a BANK
   * account, so the source is not decided by what the agent ends up holding.
   */
  method?: "BANK" | "CASH" | "MOMO";
  onChange: (value: string) => void;
  /** Forces a choice even where cash would normally allow "no account". */
  required?: boolean;
  /** Controlled: pair with react-hook-form's `Controller`. */
  value: string;
}) {
  const { data, isError, isLoading } = useGetSettlementAccountsQuery();
  const accounts = useMemo(() => {
    const all = data?.data.accounts ?? [];
    return method
      ? all.filter((a) => COMPATIBLE_KINDS[method].includes(a.kind))
      : all;
  }, [data, method]);

  const company = useMemo(() => accounts.filter((a) => !a.holder), [accounts]);
  const held = useMemo(() => accounts.filter((a) => a.holder), [accounts]);

  const chosen = accounts.find((a) => a.id === value);
  const optional = method === "CASH" && !required;
  const hint = isError
    ? "Couldn't load the accounts - close and try again."
    : !isLoading && accounts.length === 0
      ? "No live account can carry this. Add one under Payment accounts first."
      : undefined;

  return (
    <AdminField
      label={
        label ??
        (direction === "in"
          ? "Where the money landed"
          : "Where the money came from")
      }
      optional={optional}
      hint={hint}
      error={error}
    >
      <AccountSelect
        company={company}
        held={held}
        invalidClass={error ? "border-console-red" : undefined}
        // Offered only where naming nothing is a true answer: a cash payment
        // with no account sits in the office till, which is exactly what the
        // backend records for it.
        noAccountLabel={
          optional && !isLoading ? "No account named (office till)" : undefined
        }
        note={chosen?.holder ? holderNote(direction, chosen.holder.name) : undefined}
        onChange={onChange}
        placeholder={
          isLoading
            ? "Loading accounts…"
            : optional
              ? "Office till"
              : "Select the account…"
        }
        value={value}
      />
    </AdminField>
  );
}
