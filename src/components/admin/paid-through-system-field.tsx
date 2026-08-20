"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { AdminField, Mono, ToneBadge, adminInputClass } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { useGetLinkableDisbursementsQuery } from "@/redux/disbursements/linkable-api";
import type { ILinkableDisbursement } from "@/types/disbursement.types";

/**
 * "This was already paid through the system", and which send it was.
 *
 * The Hubtel payout wallet is NOT in the account picker and must never be. Its
 * movements are written by the send and the callback, so a hand entry naming it
 * would debit the business a second time for one transfer - and because that
 * wallet's real balance lives at Hubtel rather than in our ledger, the
 * difference is a permanent reconciliation gap rather than a wrong figure
 * somebody can spot and correct.
 *
 * So the reader is not choosing an ACCOUNT here, which is why this is not a
 * dropdown entry. They are saying the money has already gone, and naming the
 * send that took it. The payment then records only what it paid for, and posts
 * no movement at all.
 *
 * The list only ever holds sends that would be accepted: settled, and not yet
 * booked in any of the three payment books. A picker that offers a choice and
 * then refuses it teaches people to distrust the list.
 */

/** "04 Aug 2026", the console's one unambiguous date. */
const shortDate = (iso: null | string): string =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Not settled";

function SendRow({
  onPick,
  selected,
  send,
}: {
  onPick: () => void;
  selected: boolean;
  send: ILinkableDisbursement;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-start gap-2 border-b border-adm-line px-2.5 py-2 text-left transition-colors last:border-b-0",
        selected ? "bg-adm-sunken" : "hover:bg-adm-sunken",
      )}
      onClick={onPick}
      type="button"
    >
      <span className="mt-0.5 w-4 flex-none">
        {selected ? <Check aria-hidden className="h-3.5 w-3.5 text-console" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <Mono className="text-[12px] text-adm-ink">{send.transactionNo}</Mono>
          <span className="text-[13px] text-adm-ink [overflow-wrap:anywhere]">
            {send.recipientName}
          </span>
          <ToneBadge tone={send.rail === "BANK" ? "sky" : "leaf"}>
            {send.rail === "BANK" ? (send.bankName ?? "Bank") : "MoMo"}
          </ToneBadge>
        </span>
        <span className="mt-0.5 block text-[11.5px] text-adm-muted [overflow-wrap:anywhere]">
          {shortDate(send.settledAt)} · {send.description}
        </span>
      </span>
      <Mono className="flex-none pt-0.5 text-[12.5px] tabular-nums text-adm-ink">
        {formatCedis(send.amountGhs)}
      </Mono>
    </button>
  );
}

export function PaidThroughSystemField({
  error,
  onChange,
  value,
}: {
  error?: string;
  /** The chosen send's id, or "" for none. */
  onChange: (disbursementId: string) => void;
  value: string;
}) {
  const [on, setOn] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounced so a search runs on what somebody has finished typing rather than
  // on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useGetLinkableDisbursementsQuery(
    { limit: 20, ...(debounced ? { search: debounced } : {}) },
    { skip: !on },
  );
  const sends = useMemo(() => data?.data.disbursements ?? [], [data]);

  // Turning it off must clear the chosen send, or a payment carries a link the
  // reader can no longer see.
  const toggle = (next: boolean) => {
    setOn(next);
    if (!next) onChange("");
  };

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-start gap-2.5 border border-adm-line p-3 transition-colors hover:bg-adm-sunken">
        <input
          checked={on}
          className="mt-0.5 accent-[var(--console)]"
          onChange={(e) => toggle(e.target.checked)}
          type="checkbox"
        />
        <span className="min-w-0">
          <span className="block text-[13px] text-adm-ink">
            Already paid through the system
          </span>
          <span className="block text-[12px] text-adm-muted">
            Match this to a send the system already made. The money has left the
            payout wallet, so nothing is deducted a second time.
          </span>
        </span>
      </label>

      {on ? (
        <AdminField error={error} label="Which send was it?">
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-adm-faint"
            />
            <Input
              className={cn(adminInputClass, "pl-8")}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference, recipient, phone or amount"
              value={search}
            />
          </div>
          <div className="mt-2 max-h-[220px] overflow-y-auto border border-adm-line">
            {isFetching ? (
              <div className="space-y-2 p-2.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : sends.length === 0 ? (
              // Says WHY it is empty. "No results" over a list that filters on
              // two conditions invites the reader to assume the search is broken.
              <p className="p-2.5 text-[12px] text-adm-muted">
                {debounced
                  ? "No settled send matches that, or the ones that do are already matched to another payment."
                  : "No settled sends are waiting to be matched. A send appears here once it has landed and until something is booked against it."}
              </p>
            ) : (
              sends.map((send) => (
                <SendRow
                  key={send.id}
                  onPick={() => onChange(value === send.id ? "" : send.id)}
                  selected={value === send.id}
                  send={send}
                />
              ))
            )}
          </div>
        </AdminField>
      ) : null}
    </div>
  );
}
