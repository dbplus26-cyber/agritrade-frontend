"use client";

// "Which account did this money come out of, and if none, why not?"
//
// The drawings ledger and the asset register each carry a money figure that
// the statements spend every pesewa of, so a figure with no account behind it
// lets the owner take GHS 5,000 out of the bank while the cash book says the
// bank is unchanged. Both registers ask this question, and neither can be
// saved without an answer.
//
// The second answer is REAL, not a formality, and it is presented as one. The
// business genuinely owned assets before the books started - their cash left
// before day one, so posting it now would spend it twice - and the proprietor
// may genuinely have taken something that moved no company money. An escape
// hatch that reads as a mistake gets used as one.
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import { AdminField, adminInputClass, ToneBadge } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import type { IAccountRef } from "@/types/statement.types";
import type { CashSourceMode } from "@/validations/statement-schema";

/** What the register is asking about, which is all the copy differs by. */
type CashSourceKind = "asset" | "drawing";

const COPY: Record<
  CashSourceKind,
  {
    accountLabel: string;
    accountOption: string;
    examples: string[];
    noCashHint: string;
    noCashOption: string;
    question: string;
    reasonLabel: string;
  }
> = {
  asset: {
    accountLabel: "Paid from which account?",
    accountOption: "A company account paid for it",
    examples: ["Owned before the books started", "Contributed by the proprietor"],
    noCashHint:
      "Nothing is posted to the cash book. Right for an asset the business already had when the books started - its money left before day one, and posting it now would spend it twice.",
    noCashOption: "No company money moved",
    question: "How was this asset paid for?",
    reasonLabel: "Why did no company money move?",
  },
  drawing: {
    accountLabel: "Taken out of which account?",
    accountOption: "Taken out of a company account",
    examples: ["Took stock rather than money", "Paid for from personal funds"],
    noCashHint:
      "Nothing is posted to the cash book. Right when the proprietor took something that cost the business no money at the time.",
    noCashOption: "No company money moved",
    question: "Where did this drawing come from?",
    reasonLabel: "Why did no company money move?",
  },
};

/**
 * The exclusive-or, asked once.
 *
 * Deliberately ONE question with two answers rather than two optional fields,
 * which would leave both answerable at once. The chosen answer decides which
 * field appears under it, so naming both is not a shape the form can produce - the backend refuses it (CASH_SOURCE_AMBIGUOUS), but
 * a refusal is a poor way to learn a rule.
 */
export function CashSourceField({
  accountError,
  accountId,
  kind,
  mode,
  onAccountChange,
  onModeChange,
  onReasonChange,
  reason,
  reasonError,
}: {
  accountError?: string;
  accountId: string;
  kind: CashSourceKind;
  mode: CashSourceMode;
  onAccountChange: (value: string) => void;
  onModeChange: (mode: CashSourceMode) => void;
  onReasonChange: (value: string) => void;
  reason: string;
  reasonError?: string;
}) {
  const copy = COPY[kind];
  const options: { hint?: string; label: string; value: CashSourceMode }[] = [
    { label: copy.accountOption, value: "ACCOUNT" },
    { hint: copy.noCashHint, label: copy.noCashOption, value: "NONE" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* A fieldset rather than an AdminField: AdminField is a <label>
          wrapping its control, and a label wrapping two radios gives BOTH of
          them the whole group's text as their accessible name - a screen
          reader then reads every option on every option. The legend names the
          group; each option's own label names itself. */}
      <fieldset className="min-w-0">
        <legend className="mb-1 text-[13px] font-semibold text-adm-ink">
          {copy.question}
        </legend>
        {/* Stacked at every width, never two-up: both answers are sentences,
            and a phone splits a sentence across three lines to save a row it
            does not need. The whole tap target is the row, not the 16px dot. */}
        <div className="flex flex-col gap-1.5">
          {options.map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-[3px] border px-3 py-2.5 transition-colors",
                mode === option.value
                  ? "border-console bg-adm-sunken"
                  : "border-adm-line hover:bg-adm-sunken",
              )}
            >
              <input
                type="radio"
                name="cashSource"
                value={option.value}
                checked={mode === option.value}
                onChange={() => {
                  onModeChange(option.value);
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

      {mode === "ACCOUNT" ? (
        <PaymentAccountField
          direction="out"
          error={accountError}
          label={copy.accountLabel}
          onChange={onAccountChange}
          value={accountId}
        />
      ) : (
        <div className="min-w-0">
          <AdminField label={copy.reasonLabel} error={reasonError}>
            {/* Resizable and free to grow: 300 characters is a paragraph, and
                a one-line box that scrolls its own text is unreadable on a
                phone exactly when the reason matters most. */}
            <textarea
              rows={2}
              maxLength={300}
              aria-invalid={reasonError ? true : undefined}
              placeholder={`e.g. ${copy.examples[0]}`}
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
          {/* The answers people actually give, one tap away, and OUTSIDE the
              field's label - a button nested in a label activates the label's
              control too. Typing a sentence on a phone is friction, and
              friction on the honest answer pushes people towards naming an
              account that did not pay. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {copy.examples.map((example) => (
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
 * The account/reason pair as ONE request body half.
 *
 * Built here rather than at each call site so the exclusive-or holds on the
 * wire too: the field the reader did not answer is never sent, empty or
 * otherwise.
 */
export const cashSourceBody = (values: {
  cashSource: CashSourceMode;
  noCashReason?: string;
  paymentAccountId?: string;
}): { noCashReason?: string; paymentAccountId?: string } =>
  values.cashSource === "ACCOUNT"
    ? { paymentAccountId: values.paymentAccountId }
    : { noCashReason: (values.noCashReason ?? "").trim() };

/**
 * Which account moved, or the reason none did, beside the figure it belongs
 * to. A register that shows an amount and says nothing about where it came
 * from spends money the cash book never sees, one row at a time.
 *
 * Truncated only in the TABLE view: the phone card is the primary layout and
 * a 300-character reason wraps there in full, where there is room for it.
 */
export function CashSourceNote({
  account,
  reason,
}: {
  account: IAccountRef | null;
  reason: null | string;
}) {
  if (account) {
    return (
      <span
        className="block min-w-0 [overflow-wrap:anywhere] @2xl/table:truncate"
        title={account.label}
      >
        {account.label}
      </span>
    );
  }
  if (reason) {
    return (
      <span className="block min-w-0">
        <ToneBadge tone="slate">No cash moved</ToneBadge>
        <span
          className="mt-1 block text-[12.5px] text-adm-muted [overflow-wrap:anywhere] @2xl/table:truncate"
          title={reason}
        >
          {reason}
        </span>
      </span>
    );
  }
  // Rows recorded before the register carried this question. Left blank
  // rather than guessed at: claiming their money never moved anywhere would
  // be inventing a fact the record does not carry.
  return <span className="text-adm-faint">-</span>;
}
