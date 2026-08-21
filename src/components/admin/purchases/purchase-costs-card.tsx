"use client";

import { useState } from "react";
import Link from "next/link";

import { HelpTip, HelpWrap } from "@/components/admin/help-tip";
import {
  AdminButton,
  AdminCard,
  adminLinkClass,
  Mono,
  SectionHeading,
  ToneBadge,
} from "@/components/admin/ui";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateOnly } from "@/lib/format-date";
import { formatCedis, formatKg } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { useGetExpenseCategoriesQuery } from "@/redux/expense-categories/expense-categories-api";
import { useGetPurchaseCostsQuery } from "@/redux/purchases/purchases-api";
import type { IPurchaseCost } from "@/types/purchase.types";

import { PurchaseCostDialog } from "./purchase-cost-form";
import { goodsCostValueCls, summarisePurchaseCosts } from "./purchase-bits";

/**
 * How each cost was treated, said in one chip.
 *
 * The two are deliberately not a green/red pair. Neither answer is the wrong
 * one - haulage belongs in the goods and a licence does not - and colouring
 * one of them as a problem would push the person recording the next cost
 * towards the answer that looks safer rather than the one that is true.
 */
function TreatmentBadge({ capitalised }: { capitalised: boolean }) {
  return capitalised ? (
    <HelpWrap text="Part of what these goods cost. It counts against the profit when the grain is sold, not in the month it was paid.">
      <ToneBadge tone="leaf">In the goods</ToneBadge>
    </HelpWrap>
  ) : (
    <HelpWrap text="Tied to this purchase, but not part of what the grain cost to buy. It sits in the costs of the month it was incurred.">
      <ToneBadge tone="sky">Cost of the month</ToneBadge>
    </HelpWrap>
  );
}

function CostRow({ cost }: { cost: IPurchaseCost }) {
  const voided = cost.voidedAt !== null;
  return (
    <li
      className={cn(
        "flex flex-col gap-1 py-2.5 @min-[520px]/costs:flex-row @min-[520px]/costs:items-baseline @min-[520px]/costs:gap-3",
        voided && "opacity-70",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {/* The voucher number is the handle a paper receipt is matched to,
              and the link is how the cost gets PAID - this screen records it
              as owed and settles nothing. */}
          <Link
            className={cn(adminLinkClass, "font-adminmono text-[11.5px]")}
            href={`/admin/expenses/${cost.id}`}
          >
            {cost.transactionNo}
          </Link>
          <span className="text-[11.5px] text-adm-faint">
            {formatDateOnly(cost.incurredAt)}
          </span>
          {voided ? (
            <HelpWrap text="Struck out after it was recorded, so it no longer counts towards what these goods cost.">
              <ToneBadge tone="slate">Voided</ToneBadge>
            </HelpWrap>
          ) : (
            <TreatmentBadge capitalised={cost.capitalisedAt !== null} />
          )}
        </div>
        {/* A category can be named anything the office types, so it wraps
            inside the word rather than pushing the amount off a 360px row. */}
        <p className="mt-0.5 text-[13px] text-adm-ink [overflow-wrap:anywhere]">
          {cost.category.name}
          {cost.description ? (
            <span className="text-adm-muted"> - {cost.description}</span>
          ) : null}
        </p>
        {cost.voidReason ? (
          <p className="mt-0.5 text-[12px] text-adm-muted [overflow-wrap:anywhere]">
            {cost.voidReason}
          </p>
        ) : null}
      </div>
      <Mono
        className={cn(
          "flex-none text-[14px] font-semibold tabular-nums",
          voided ? "text-adm-faint line-through" : "text-adm-ink",
        )}
      >
        {formatCedis(cost.amountGhs)}
      </Mono>
    </li>
  );
}

/**
 * The rail's headline figure: what this load has cost, not what it was bought
 * for.
 *
 * It lives in the rail because the rail stacks ABOVE the main column on a
 * phone, and nine in ten people reading this page are on one - so this is the
 * first number they see, and "what did this load cost us" is the question they
 * opened the page with. The purchase price stays underneath it, stated in full
 * with the weight and rate that produced it, because that is the figure a
 * supplier's invoice is checked against.
 *
 * Where the costs cannot be read, the tile falls back to the purchase total
 * under its OWN label and says the costs are missing. A headline that silently
 * became the smaller figure would be indistinguishable from a load that has
 * had no costs recorded against it.
 */
export function PurchaseGoodsCostSummary({
  purchaseId,
  totalGhs,
  unitPriceGhs,
  weightKg,
}: {
  purchaseId: string;
  totalGhs: number | null;
  unitPriceGhs: number | null;
  weightKg: number;
}) {
  const { data, isError, isLoading } = useGetPurchaseCostsQuery(purchaseId);
  const summary = data
    ? summarisePurchaseCosts(data.data.expenses, totalGhs)
    : null;

  const rate = (
    <p className="mt-1 text-[12.5px] text-adm-muted">
      <Mono>{formatKg(weightKg)}</Mono> at{" "}
      <Mono>{formatCedis(unitPriceGhs)}</Mono> per kg
    </p>
  );

  if (!summary) {
    return (
      <>
        <p className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          <span className="min-w-0">Purchase total</span>
          <HelpTip
            label="What is the purchase total?"
            text="What this whole load cost you: the weight bought times the price per kg."
          />
        </p>
        <p
          className={cn(
            "font-adminmono mt-1 leading-[1.15] font-bold text-adm-ink tabular-nums",
            goodsCostValueCls(formatCedis(totalGhs)),
          )}
        >
          {formatCedis(totalGhs)}
        </p>
        {rate}
        {isLoading ? <Skeleton className="mt-2 h-3 w-40" /> : null}
        {isError ? (
          <p className="mt-2 text-[12px] text-console-red">
            The costs recorded on this load could not be loaded, so this is the
            purchase price only.
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <p className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">What these goods have cost</span>
        <HelpTip
          label="What have these goods cost?"
          text="The grain itself, plus the costs of getting it in. This is what a sale is measured against to say what was made on the load."
        />
      </p>
      <p
        className={cn(
          "font-adminmono mt-1 leading-[1.15] font-bold text-adm-ink tabular-nums",
          goodsCostValueCls(formatCedis(summary.goodsCostGhs)),
        )}
      >
        {formatCedis(summary.goodsCostGhs)}
      </p>
      <p className="mt-1 text-[12.5px] leading-[1.5] text-adm-muted">
        Grain <Mono className="text-adm-ink">{formatCedis(totalGhs)}</Mono>
        {summary.capitalisedGhs === null || summary.capitalisedGhs > 0 ? (
          <>
            {" + costs "}
            <Mono className="text-adm-ink">
              {formatCedis(summary.capitalisedGhs)}
            </Mono>
          </>
        ) : null}
      </p>
      {rate}
    </>
  );
}

/**
 * What this load has actually cost: the grain, plus the costs taken into it.
 *
 * The headline is the whole point of the section rather than a footnote at the
 * bottom of a list. A purchase used to state one figure - weight times price -
 * and the haulage, loading and porterage that got the grain into the shed were
 * operating spend of whatever month they were paid in. So a load bought in the
 * harvest window printed a loss in the buying month and a flattering margin
 * whenever it finally sold, and "what did we make on that purchase" had no
 * answer at all.
 *
 * The purchase price stays on the page underneath it, in full and clearly
 * labelled. It is the figure a supplier is paid against and somebody
 * reconciles, and quietly replacing it with a bigger number would be a worse
 * failure than not having the bigger number.
 */
export function PurchaseCostsCard({
  isVoided,
  purchaseId,
  totalGhs,
}: {
  /** A voided purchase has no goods left to carry a cost. */
  isVoided: boolean;
  purchaseId: string;
  /** Weight x unit price, as the purchase document states it. */
  totalGhs: number | null;
}) {
  const { has } = usePermissions();
  const [recording, setRecording] = useState(false);
  const { data, error, isError, isLoading, refetch } =
    useGetPurchaseCostsQuery(purchaseId);
  // Only fetched once the dialog is wanted: the vocabulary is a whole register
  // of its own, and every purchase page would pull it just to sit unread.
  const categories = useGetExpenseCategoriesQuery(
    { isActive: true, limit: 100 },
    { skip: !recording },
  );

  const canRecord = has("EXPENSES_RECORD") && !isVoided;

  if (isLoading) {
    return (
      <AdminCard className="p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-7 w-44" />
      </AdminCard>
    );
  }
  if (isError || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  // Every voucher is listed, voided ones included and struck through, the way
  // the payment ledger lists its reversals: a cost that was recorded and then
  // taken back off is part of what happened to this load, and a list that
  // simply dropped it reads as a list that lost it. Only the TOTALS stop
  // counting it.
  const { capitalisedGhs, goodsCostGhs, monthlyGhs } = summarisePurchaseCosts(
    data.data.expenses,
    totalGhs,
  );

  return (
    <AdminCard className="@container/costs p-5">
      <SectionHeading
        className="mb-4"
        hint="The grain itself, plus the costs of getting it in. This is the figure a sale is measured against to say what was made on the load."
        actions={
          canRecord ? (
            <AdminButton
              onClick={() => {
                setRecording(true);
              }}
              size="sm"
              variant="secondary"
            >
              Record a cost
            </AdminButton>
          ) : null
        }
      >
        What these goods have cost
      </SectionHeading>

      {/* Said before the figures rather than left for the reader to infer from
          a greyed-out button. A struck-out purchase still shows what was once
          recorded against it - the vouchers are real and were really paid -
          but nothing here is a live cost of anything. */}
      {isVoided ? (
        <p className="mb-3 text-[13px] leading-[1.55] text-adm-muted">
          This purchase was voided, so these goods are no longer on the books.
          What was recorded against it is kept here as a record.
        </p>
      ) : null}

      {/* The headline first, its parts underneath. A reader who wants only the
          one number stops at the first line; a reader reconciling against the
          supplier's invoice finds the purchase price still stated in full. */}
      <p
        className={cn(
          "font-adminmono leading-[1.15] font-bold text-adm-ink tabular-nums",
          goodsCostValueCls(formatCedis(goodsCostGhs)),
        )}
      >
        {formatCedis(goodsCostGhs)}
      </p>
      <p className="mt-1 text-[12.5px] leading-[1.5] text-adm-muted">
        Grain <Mono className="text-adm-ink">{formatCedis(totalGhs)}</Mono>
        {capitalisedGhs === null || capitalisedGhs > 0 ? (
          <>
            {" + costs taken into it "}
            <Mono className="text-adm-ink">{formatCedis(capitalisedGhs)}</Mono>
          </>
        ) : (
          " - no costs have been taken into it yet"
        )}
      </p>

      {/* Shown, and shown apart. These are real money spent around this
          purchase, and leaving them off the page entirely would read as a
          system that lost them - but adding them to the headline would charge
          the month's books and the goods for the same cedi. */}
      {monthlyGhs === null || monthlyGhs > 0 ? (
        <p className="mt-2 border-t border-adm-hairline pt-2 text-[12.5px] leading-[1.5] text-adm-muted">
          A further <Mono className="text-adm-ink">{formatCedis(monthlyGhs)}</Mono>{" "}
          is charged to this purchase but not to the goods - it sits in the
          costs of the month it was incurred.
        </p>
      ) : null}

      {data.data.expenses.length > 0 ? (
        <div className="mt-5 border-t border-adm-hairline pt-2">
          <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            Costs recorded
          </p>
          <ul className="divide-y divide-adm-hairline">
            {data.data.expenses.map((cost) => (
              <CostRow cost={cost} key={cost.id} />
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-5 border-t border-adm-hairline pt-4 text-[13px] leading-[1.55] text-adm-muted">
          Nothing has been recorded against this load yet. Haulage from the farm
          gate, loading, porters and bagging all belong here, so the profit on
          the load can be worked out when the grain sells.
        </p>
      )}

      {recording ? (
        <PurchaseCostDialog
          categories={categories.data?.data ?? []}
          categoriesLoading={categories.isLoading}
          onOpenChange={setRecording}
          open={recording}
          purchaseId={purchaseId}
        />
      ) : null}
    </AdminCard>
  );
}
