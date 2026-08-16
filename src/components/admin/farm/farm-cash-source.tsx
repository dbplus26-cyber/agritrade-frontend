"use client";

// "Which account did this money come out of, and if none, why not?" - asked of
// a grant, and "what did the farmer actually hand back?" - asked of a
// repayment.
//
// `components/admin/statements/cash-source.tsx` asks the first question already
// and is reused whole for DISPLAY (see FarmCashSourceNote below). Its FIELD is
// not reused: its copy lives in a module-private COPY map keyed by
// `"asset" | "drawing"`, with no seam for a third register's wording, and the
// statements module is out of this change's reach. A grant asked "How was this
// asset paid for?" would be a worse form than one that asks about inputs, and
// the escape hatch's examples ("Owned before the books started") are answers no
// storekeeper would ever give. So the question is asked here in the grant's own
// words, over the same radio-card structure and the same accessibility
// decisions, and the ANSWER travels through the shared `cashSourceBody` so both
// registers put the exclusive-or on the wire the same way.
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import { CashSourceNote } from "@/components/admin/statements/cash-source";
import { AdminField, adminInputClass, ToneBadge } from "@/components/admin/ui";
import { formatKg } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import type { IFarmAccountRef } from "@/types/farm.types";
import type { IAccountRef } from "@/types/statement.types";
import type { RepaymentKind } from "@/validations/farm-schema";
import type { CashSourceMode } from "@/validations/statement-schema";

/**
 * A stacked pair of radio cards: one question, two answers, the whole row a
 * tap target.
 *
 * A fieldset rather than a label around the group: a label wrapping two radios
 * gives BOTH of them the whole group's text as their accessible name, so a
 * screen reader reads every option on every option. The legend names the group;
 * each option's own label names itself.
 */
export function ChoiceCards<T extends string>({
  legend,
  name,
  onChange,
  options,
  value,
}: {
  legend: string;
  /** Radio group name - must be unique per form. */
  name: string;
  onChange: (value: T) => void;
  options: { hint?: string; label: string; value: T }[];
  value: T;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-[13px] font-semibold text-adm-ink">
        {legend}
      </legend>
      {/* Stacked at every width, never two-up: both answers are sentences, and
          a phone splits a sentence across three lines to save a row it did not
          need. */}
      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-[3px] border px-3 py-2.5 transition-colors",
              value === option.value
                ? "border-console bg-adm-sunken"
                : "border-adm-line hover:bg-adm-sunken",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value);
              }}
              className="mt-[3px] flex-none accent-console"
            />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-semibold text-adm-ink">
                {option.label}
              </span>
              {option.hint ? (
                <span className="mt-0.5 block text-[12px] leading-[1.45] text-adm-muted">
                  {option.hint}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The answers a storekeeper actually gives, one tap away. */
const GRANT_REASONS = [
  "Inputs came from the store",
  "Already paid for on a purchase",
];

/**
 * Where the money for these inputs came from.
 *
 * The second answer is REAL and is presented as one, not as an afterthought:
 * grant inputs frequently come out of stock the business already paid for
 * through a purchase or an expense, and posting again there would spend the
 * same cedi twice. An escape hatch that reads as a mistake gets used as one -
 * and the mistake it invites is naming an account that did not pay.
 */
export function GrantCashSourceField({
  accountError,
  accountId,
  mode,
  onAccountChange,
  onModeChange,
  onReasonChange,
  reason,
  reasonError,
}: {
  accountError?: string;
  accountId: string;
  mode: CashSourceMode;
  onAccountChange: (value: string) => void;
  onModeChange: (mode: CashSourceMode) => void;
  onReasonChange: (value: string) => void;
  reason: string;
  reasonError?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ChoiceCards<CashSourceMode>
        legend="How were these inputs paid for?"
        name="grantCashSource"
        onChange={onModeChange}
        options={[
          { label: "A company account paid for them", value: "ACCOUNT" },
          {
            hint: "Nothing is posted to the cash book. Right when the inputs came out of stock the business had already paid for - posting again would spend the same cedi twice.",
            label: "No company money moved",
            value: "NONE",
          },
        ]}
        value={mode}
      />

      {mode === "ACCOUNT" ? (
        <PaymentAccountField
          direction="out"
          error={accountError}
          label="Paid from which account?"
          onChange={onAccountChange}
          value={accountId}
        />
      ) : (
        <div className="min-w-0">
          <AdminField
            label="Why did no company money move?"
            error={reasonError}
          >
            {/* Resizable and free to grow: 300 characters is a paragraph, and
                a one-line box that scrolls its own text is unreadable on a
                phone exactly when the reason matters most. */}
            <textarea
              rows={2}
              maxLength={300}
              aria-invalid={reasonError ? true : undefined}
              placeholder={`e.g. ${GRANT_REASONS[0]}`}
              value={reason}
              onChange={(e) => {
                onReasonChange(e.target.value);
              }}
              className={cn(
                adminInputClass,
                "h-auto min-h-[60px] w-full resize-y py-2",
                reasonError && "border-console-red",
              )}
            />
          </AdminField>
          {/* OUTSIDE the field's label - a button nested in a label activates
              the label's control too. Typing a sentence on a phone is friction,
              and friction on the honest answer pushes people towards naming an
              account that did not pay. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {GRANT_REASONS.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  onReasonChange(example);
                }}
                className="cursor-pointer rounded-[3px] border border-adm-line px-2 py-1 text-left text-[12px] text-adm-body hover:bg-adm-sunken"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * How the farmer settled, asked before anything shape-specific is shown.
 *
 * First rather than last because it decides which of the two forms below it
 * exists: the server refuses a cash repayment carrying a crop, a weight, a rate
 * or a warehouse, and refuses a produce repayment naming an account, so a form
 * that offered both sets at once would be offering a refusal.
 */
export function RepaymentKindField({
  onChange,
  value,
}: {
  onChange: (value: RepaymentKind) => void;
  value: RepaymentKind;
}) {
  return (
    <ChoiceCards<RepaymentKind>
      legend="How did the farmer settle?"
      name="repaymentKind"
      onChange={onChange}
      options={[
        {
          hint: "Grain brought in against the advance. It turns what they owe into stock and moves no money, so no account is named.",
          label: "In produce",
          value: "PRODUCE",
        },
        {
          hint: "Money paid into a company account - the answer for a farmer who had a bad season and settled in cash. It clears the same debt and posts a receipt to the cash book.",
          label: "In cash",
          value: "CASH",
        },
      ]}
      value={value}
    />
  );
}

/**
 * What the farmer actually handed back, on one line.
 *
 * A cash repayment carries no crop, no weight and no valuation rate, so this
 * prints none of them rather than a null or a zero standing in: "0 kg" would
 * read on the register as a farmer who handed over nothing, which is the
 * opposite of what happened.
 *
 * Truncated only in the TABLE view: the phone card is the primary layout and a
 * long account label or crop name wraps there in full, where there is room.
 */
export function RepaymentSettlement({
  commodity,
  kind,
  paymentAccount,
  weightKg,
}: {
  commodity: null | { name: string };
  kind: RepaymentKind;
  paymentAccount: IFarmAccountRef | null;
  weightKg: null | number;
}) {
  if (kind === "CASH") {
    return (
      <span className="block min-w-0">
        <ToneBadge tone="leaf">Cash</ToneBadge>
        {paymentAccount ? (
          <span
            className="mt-1 block text-[12.5px] text-adm-muted [overflow-wrap:anywhere] @2xl/table:truncate"
            title={paymentAccount.label}
          >
            {paymentAccount.label}
          </span>
        ) : null}
      </span>
    );
  }
  // Recorded before the book knew about cash, or a row the server sent
  // incomplete. Left blank rather than guessed at.
  if (!commodity) return <span className="text-adm-faint">-</span>;
  return (
    <span
      className="block min-w-0 [overflow-wrap:anywhere] @2xl/table:truncate"
      title={commodity.name}
    >
      {commodity.name}
      {weightKg === null ? null : ` · ${formatKg(weightKg)}`}
    </span>
  );
}

/**
 * The statements' CashSourceNote, fed the farm DTOs' narrower account
 * reference.
 *
 * Its prop is typed `IAccountRef`, which carries a `kind` the farm mappers do
 * not send. Nothing in the note reads it, so the reference is widened in this
 * one place rather than inventing a kind the record does not carry, or forking
 * a component whose whole job - name the account, or say plainly that none paid
 * and why - is exactly what a grant needs said.
 */
export function FarmCashSourceNote({
  account,
  reason,
}: {
  account: IFarmAccountRef | null;
  reason: null | string;
}) {
  return (
    <CashSourceNote account={account as IAccountRef | null} reason={reason} />
  );
}
