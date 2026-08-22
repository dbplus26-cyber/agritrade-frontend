"use client";

import { AdminCard, Mono, SectionHeading, ToneBadge } from "@/components/admin/ui";
import { CountUp } from "@/components/admin/count-up";
import { HelpTip } from "@/components/admin/help-tip";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { useGetAgentMoneySummaryQuery } from "@/redux/agents/agents-api";
import type { IAgentMoneySummary } from "@/types/agent.types";

/**
 * What this person was GIVEN, and what they SPENT of the company's money.
 *
 * The float ledger below this card walks their held accounts, and a send made
 * on spending authority debits the company's Hubtel wallet without ever
 * touching one. The ledger alone therefore reads an agent who has moved
 * thousands of the company's money as having spent nothing, and says nothing
 * about the second pot existing at all.
 *
 * The two pots are laid out side by side and DELIBERATELY never added. A
 * balance is money the person must produce at a handover; a cap is permission
 * that expires unused. One number for both makes an agent's position
 * unreadable.
 */

/**
 * A money figure, or the redaction placeholder. Never prints "null". The
 * headline lines count up; the per-account breakdown just prints.
 */
function Figure({
  animate = false,
  className,
  value,
}: {
  animate?: boolean;
  className?: string;
  value: null | number;
}) {
  if (value === null) return <span className="text-adm-faint">Hidden</span>;
  return (
    <Mono className={cn("tabular-nums", className)}>
      {animate ? <CountUp value={value} format={formatCedis} /> : formatCedis(value)}
    </Mono>
  );
}

/** One labelled figure in a pot. */
function Line({
  emphasis,
  hint,
  label,
  value,
}: {
  emphasis?: boolean;
  hint?: string;
  label: string;
  value: null | number;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 py-1.5",
        emphasis && "border-t border-adm-line pt-2 font-semibold",
      )}
    >
      <span className="flex min-w-0 items-center gap-1 text-[12.5px] text-adm-muted">
        <span className="[overflow-wrap:anywhere]">{label}</span>
        {hint ? <HelpTip label={label} text={hint} /> : null}
      </span>
      <Figure
        animate
        className={emphasis ? "text-[15px] text-adm-ink" : undefined}
        value={value}
      />
    </div>
  );
}

export function AgentMoneySummaryCard({ agentUserId }: { agentUserId: string }) {
  const { data, isLoading } = useGetAgentMoneySummaryQuery({ agentUserId });

  if (isLoading) {
    return (
      <AdminCard className="px-5 py-4">
        <Skeleton className="mb-3 h-4 w-40" />
        <Skeleton className="mb-2 h-3 w-full" />
        <Skeleton className="mb-2 h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </AdminCard>
    );
  }
  if (!data) return null;

  const { held, sent }: IAgentMoneySummary = data.data.summary;

  return (
    <AdminCard className="px-5 py-4">
      <SectionHeading
        className="mb-1"
        hint="Two different kinds of money, kept apart on purpose. What they hold is theirs to produce; what they may send is permission to move the company's money, and none of it passes through their hands."
      >
        Given and spent
      </SectionHeading>

      <div className="grid gap-5 @lg/detail:grid-cols-2">
        <div>
          <p className="mb-1 text-[11.5px] tracking-wide text-adm-faint uppercase">
            Money they are holding
          </p>
          <Line label="Held before this" value={held.openingGhs} />
          <Line label="Given to them" value={held.receivedGhs} />
          <Line
            hint="Purchases and costs they settled out of what they were holding."
            label="Spent out of it"
            value={held.spentGhs}
          />
          <Line emphasis label="Still holding" value={held.closingGhs} />

          {held.accounts.length > 0 ? (
            <div className="mt-3 space-y-1 border-t border-adm-line pt-2">
              {/* Per account, because notes in a pocket and money on their own
                  wallet are different money and one figure for both is what
                  made a position unreadable. */}
              {held.accounts.map((account) => (
                <div
                  className="flex items-baseline justify-between gap-3"
                  key={account.id}
                >
                  <span className="min-w-0 truncate text-[12px] text-adm-muted">
                    {account.label}
                  </span>
                  <Figure className="text-[12px]" value={account.netGhs} />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-1 text-[11.5px] tracking-wide text-adm-faint uppercase">
            Company money they may send
          </p>
          {sent.hasAuthority ? (
            <>
              <div className="flex items-baseline justify-between gap-3 py-1.5">
                <span className="text-[12.5px] text-adm-muted">Limit</span>
                {sent.capGhs === null ? (
                  // "No limit" is not a large number, and printing one would
                  // invite somebody to subtract against it.
                  <ToneBadge tone="harvest">No limit</ToneBadge>
                ) : (
                  <Figure animate value={sent.capGhs} />
                )}
              </div>
              <Line
                hint="Every send they have made on this authority, not just this period - a limit is a lifetime ceiling."
                label="Sent so far"
                value={sent.sentGhs}
              />
              <Line label="On purchases" value={sent.sentOnPurchasesGhs} />
              <Line label="On costs" value={sent.sentOnExpensesGhs} />
              {sent.sentUnmatchedGhs !== null && sent.sentUnmatchedGhs > 0 ? (
                // Named rather than folded into the total. An agent cannot make
                // an unmatched send - the field app refuses one - so any that
                // appear were made from the office and should read as such.
                <Line
                  hint="Sends naming no purchase or cost. Only the office can make these; the field app refuses a send with nothing behind it."
                  label="Not matched to anything"
                  value={sent.sentUnmatchedGhs}
                />
              ) : null}
              {!sent.isActive ? (
                <p className="mt-2 text-[12px] text-adm-muted">
                  <ToneBadge tone="alert">Suspended</ToneBadge> They cannot send
                  while this is suspended. The history above is untouched.
                </p>
              ) : null}
            </>
          ) : (
            <p className="py-1.5 text-[13px] text-adm-muted">
              They may not send company money. Nothing here is a balance - use
              Give money to allow it.
            </p>
          )}
        </div>
      </div>

      {/* Said outright, because the whole reason this card exists is to keep
          the two figures apart. */}
      <p className="mt-3 border-t border-adm-line pt-2 text-[11.5px] text-adm-faint">
        These two are never added. What they hold is cash they must produce;
        what they may send is permission that leaves nothing in their hands.
      </p>
    </AdminCard>
  );
}
