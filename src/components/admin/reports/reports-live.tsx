"use client";

import { useState } from "react";
import Link from "next/link";
import {
  DateRangeSelector,
  DEFAULT_RANGE,
} from "@/components/admin/dashboard/date-range-selector";
import { HelpTip, HelpWrap } from "@/components/admin/help-tip";
import {
  WidgetEmpty,
  WidgetError,
} from "@/components/admin/dashboard/chart-kit";
import { Money } from "@/components/admin/trading/sale-bits";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminLinkClass,
  AdminButton,
  AdminCard,
  Mono,
  ToneBadge,
} from "@/components/admin/ui";
import { env } from "@/lib/env";
import { formatDateTime } from "@/lib/format-date";
import {
  formatCedis,
  formatCedisCompact,
  formatKg,
  statValueCls,
} from "@/lib/format-money";
import { toQueryString } from "@/lib/to-query-string";
import { cn } from "@/lib/utils";
import {
  useGetAgentPerformanceQuery,
  useGetCashflowForecastQuery,
  useGetExpenseSummaryQuery,
  useGetProfitReportQuery,
} from "@/redux/reports/reports-api";
import type { ForecastDays } from "@/types/ops.types";
import type { IReportWindow } from "@/types/report.types";

import { DebtorsTable } from "./debtors-table";
import { ExpenseDonut } from "./expense-donut";
import { PlTrendChart } from "./pl-trend-chart";
import { ProfitBarChart } from "./profit-bar-chart";

const EXPORTS = `${env.SERVER_URI}/api/v1/admin/reports/exports`;

/**
 * A KPI tile on the reports header. Money is compacted at scale (GH¢ 12.3M)
 * with the exact figure on hover, and the type size adapts to the figure's
 * length - a phone tile is ~130px wide, and a fixed 18px eight-digit amount
 * was the one stat row in the console that could still overflow it.
 */
function ReportKpi({
  accent = false,
  hint,
  label,
  text,
  value = null,
}: {
  accent?: boolean;
  /** One sentence on what the figure counts, on hover beside the label. */
  hint?: string;
  label: string;
  /** A non-money figure printed verbatim (the margin percentage). */
  text?: string;
  /** Money in GHS; null prints the redaction placeholder. */
  value?: number | null;
}) {
  const display =
    text ?? (value === null ? null : formatCedisCompact(value));
  return (
    <AdminCard className="h-full px-4 py-3">
      <div className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What does ${label} count?`} text={hint} /> : null}
      </div>
      <div
        className={cn(
          "mt-1 min-w-0 font-bold",
          display ? statValueCls(display) : "text-[18px]",
          accent ? "text-console" : "text-adm-ink",
        )}
        title={text === undefined && value !== null ? formatCedis(value) : undefined}
      >
        {display ?? <Money value={null} />}
      </div>
    </AdminCard>
  );
}

/** The condensed P&L statement from the profit summary + expenses. */
function PlStatement({ window }: { window: IReportWindow }) {
  const profit = useGetProfitReportQuery(window);
  const expenses = useGetExpenseSummaryQuery(window);
  const s = profit.data?.data.summary;
  const cats = expenses.data?.data.byCategory ?? [];

  const rowClass =
    "flex items-baseline justify-between gap-3 py-1.5 text-[13.5px] [&>span:first-child]:min-w-0 [&>span:first-child]:line-clamp-2 [&>*:last-child]:flex-none [&>*:last-child]:whitespace-nowrap";
  return (
    <AdminCard className="px-5 py-4">
      <div className="mb-2 flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">Profit &amp; loss</span>
        <HelpTip
          label="What is the profit and loss statement?"
          text="The whole period on one page: what you sold, what it cost, and what was left."
        />
      </div>
      <div className={rowClass}>
        <span className="text-adm-ink">Revenue</span>
        <Mono className="text-adm-ink">
          <Money compact value={s?.revenueGhs ?? null} />
        </Mono>
      </div>
      <div className={cn(rowClass, "text-adm-muted")}>
        <span className="flex items-center gap-1.5">
          Cost of goods sold
          {s?.hasEstimated ? (
            <HelpWrap text="Some of this cost is still an estimate, so the profit below it can move once the real figures land.">
              <ToneBadge tone="harvest">Est.</ToneBadge>
            </HelpWrap>
          ) : null}
        </span>
        <Mono>
          <Money compact value={s?.costGhs ?? null} />
        </Mono>
      </div>
      <div
        className={cn(
          rowClass,
          "border-t border-adm-hairline font-semibold text-adm-ink",
        )}
      >
        <span>Gross profit</span>
        <Mono>
          <Money compact value={s?.grossProfitGhs ?? null} />
        </Mono>
      </div>
      {cats.map((c) => (
        <div key={c.categoryId} className={cn(rowClass, "pl-3 text-adm-muted")}>
          <span>{c.categoryName}</span>
          <Mono>
            <Money compact value={c.amountGhs} />
          </Mono>
        </div>
      ))}
      <div
        className={cn(
          rowClass,
          "border-t border-adm-hairline text-[15px] font-bold text-console",
        )}
      >
        <span>Net profit</span>
        <Mono>
          <Money compact value={s?.netProfitGhs ?? null} />
        </Mono>
      </div>
    </AdminCard>
  );
}

function AgentPerformance({
  exportHref,
  window,
}: {
  exportHref: string;
  window: IReportWindow;
}) {
  const { data, isError, isLoading, refetch } =
    useGetAgentPerformanceQuery(window);
  const rows = data?.data ?? [];
  return (
    <AdminCard className="px-5 py-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          <span className="min-w-0">Agent performance</span>
          <HelpTip
            label="What is agent performance?"
            text="What each field agent bought for you in the period you picked, and what they paid per kilo."
          />
        </span>
        <a href={exportHref} className={cn(adminLinkClass, "text-[12px]")}>
          Export CSV
        </a>
      </div>
      {isError ? (
        <WidgetError
          what="the agent performance"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <Skeleton className="h-[120px] w-full rounded-[6px]" />
      ) : rows.length === 0 ? (
        <WidgetEmpty
          title="No agent purchases in this period"
          hint="Each agent's buying and average price lands here as purchases are recorded."
        />
      ) : (
        <div className="overflow-x-auto">
          {/* Declared widths so the figures are never the columns that give
              way: an agent name has no natural limit and, left to size
              itself, took the whole row and wrapped every number beside it. */}
          <table className="w-full min-w-[560px] table-fixed text-[14px]">
            <colgroup>
              <col className="w-[38%]" />
              <col className="w-[4.5rem]" />
              <col className="w-[7.5rem]" />
              <col className="w-[7rem]" />
              <col className="w-[9rem]" />
            </colgroup>
            <thead>
              <tr className="text-left text-[10.5px] font-bold uppercase tracking-[0.09em] text-adm-muted">
                <th className="py-1.5 pr-3">Agent</th>
                <th className="py-1.5 pr-3">
                  <HelpWrap text="How many separate purchases this agent recorded.">
                    Buys
                  </HelpWrap>
                </th>
                <th className="py-1.5 pr-3">Weight</th>
                <th className="py-1.5 pr-3">
                  <HelpWrap text="The average price this agent paid per kilo, across everything they bought.">
                    Avg/kg
                  </HelpWrap>
                </th>
                <th className="py-1.5">
                  <HelpWrap text="How much of your money this agent has spent buying in this period.">
                    Spent
                  </HelpWrap>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.agentName} className="border-t border-adm-hairline align-top">
                  <td className="py-1.5 pr-3 text-adm-ink">
                    <span className="line-clamp-2" title={r.agentName}>
                      {r.agentName}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-adm-muted">
                    {r.purchases}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-adm-muted">
                    {formatKg(r.weightKg)}
                  </td>
                  <td className="py-1.5 pr-3 whitespace-nowrap text-adm-muted">
                    <Money compact value={r.avgPriceGhs} />
                  </td>
                  <td className="py-1.5 whitespace-nowrap text-adm-ink">
                    <Money compact value={r.spentGhs} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}

const FORECAST_DAYS: ForecastDays[] = [30, 60, 90];
const LIST_CAP = 6;

/**
 * "Cash coming in" - the forward look: confirmed sale balances plus farm
 * dues falling inside the chosen window, with the biggest positions listed.
 */
function CashComingIn() {
  const [days, setDays] = useState<ForecastDays>(30);
  const { data, isLoading, isError, refetch } = useGetCashflowForecastQuery({
    days,
  });
  const f = data?.data.forecast;
  const saleRows = f?.saleRows ?? [];
  const farmRows = f?.farmRows ?? [];

  const kpi = (label: string, hint: string, value: number | null) => (
    <div className="min-w-0 flex-1 rounded-[6px] border border-adm-hairline bg-adm-sunken px-3.5 py-2.5">
      <div className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        <HelpTip label={`What does ${label} count?`} text={hint} />
      </div>
      <div className="font-adminmono mt-0.5 text-[18px] font-bold text-console tabular-nums">
        <Money value={value} compact />
      </div>
    </div>
  );

  const moreLine = (hidden: number) =>
    hidden > 0 ? (
      <p className="pt-1.5 text-[12px] text-adm-faint">
        + {hidden} more in this window
      </p>
    ) : null;

  return (
    <AdminCard className="px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          <span className="min-w-0">Cash coming in</span>
          <HelpTip
            label="What is cash coming in?"
            text="Money you are expecting over the next stretch of days, from buyers and from outgrowers."
          />
        </span>
        <div className="flex gap-1">
          {FORECAST_DAYS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={cn(
                "cursor-pointer rounded-[6px] border px-2.5 py-1 text-[12px] font-semibold transition-colors",
                days === d
                  ? "border-console bg-console text-white"
                  : "border-adm-line bg-adm-card text-adm-muted hover:border-console/60",
              )}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[140px] w-full rounded-[6px]" />
      ) : isError ? (
        <WidgetError what="the forecast" onRetry={() => void refetch()} />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 min-[420px]:flex-row">
            {kpi(
              "Sales receivable",
              "What buyers are due to pay you inside the number of days you picked.",
              f?.salesReceivableGhs ?? null,
            )}
            {kpi(
              "Farm dues",
              "What outgrowers owe back on inputs you advanced them, falling due in this window.",
              f?.farmDueGhs ?? null,
            )}
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-4 xl:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-faint">
                Sale balances
              </div>
              {saleRows.length === 0 ? (
                <WidgetEmpty
                  className="min-h-[86px]"
                  title="No open sale balances in this window"
                />
              ) : (
                <>
                  {saleRows.slice(0, LIST_CAP).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-baseline justify-between gap-3 border-t border-adm-hairline py-1.5 text-[13px] first:border-t-0"
                    >
                      <div className="min-w-0">
                        <Link
                          className={cn(
                            adminLinkClass,
                            "block min-w-0 line-clamp-1 whitespace-normal [overflow-wrap:anywhere]",
                          )}
                          href={`/admin/buyers/${r.buyer.id}`}
                          title={r.buyer.name}
                        >
                          {r.buyer.name}
                        </Link>
                        <Link
                          href={`/admin/sales/${r.id}`}
                          className={cn(
                            adminLinkClass,
                            "font-adminmono text-[11.5px] tabular-nums",
                          )}
                        >
                          {r.transactionNo}
                        </Link>
                      </div>
                      <Mono className="flex-none text-adm-ink">
                        <Money value={r.balanceGhs} compact />
                      </Mono>
                    </div>
                  ))}
                  {moreLine(saleRows.length - LIST_CAP)}
                </>
              )}
            </div>

            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-faint">
                Farm dues
              </div>
              {farmRows.length === 0 ? (
                <WidgetEmpty
                  className="min-h-[86px]"
                  title="No farm dues in this window"
                />
              ) : (
                <>
                  {farmRows.slice(0, LIST_CAP).map((r, i) => (
                    <div
                      key={`${r.farmer.id}-${r.season.id}-${i}`}
                      className="flex items-baseline justify-between gap-3 border-t border-adm-hairline py-1.5 text-[13px] first:border-t-0"
                    >
                      <div className="min-w-0">
                        <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
                          <Link
                            href={`/admin/farmers/${r.farmer.id}`}
                            className={cn(
                              adminLinkClass,
                              "min-w-0 line-clamp-1 whitespace-normal [overflow-wrap:anywhere]",
                            )}
                            title={r.farmer.name}
                          >
                            {r.farmer.name}
                          </Link>
                          <Link
                            className={cn(adminLinkClass, "text-[11.5px]")}
                            href={`/admin/seasons/${r.season.id}`}
                          >
                            {r.season.name}
                          </Link>
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11.5px] text-adm-muted">
                          Due {formatDateTime(r.dueDate)}
                          {r.daysOverdue > 0 ? (
                            <ToneBadge tone="alert">
                              {r.daysOverdue}d overdue
                            </ToneBadge>
                          ) : null}
                        </span>
                      </div>
                      <Mono className="flex-none text-adm-ink">
                        <Money value={r.outstandingGhs} compact />
                      </Mono>
                    </div>
                  ))}
                  {moreLine(farmRows.length - LIST_CAP)}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </AdminCard>
  );
}

export function ReportsLive() {
  const [window, setWindow] = useState<IReportWindow>(DEFAULT_RANGE);
  const profit = useGetProfitReportQuery(window);
  const expenses = useGetExpenseSummaryQuery(window);
  const s = profit.data?.data.summary;
  const windowQs = toQueryString(window);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            Reports
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            Profit, expenses, debtors and performance across the business
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeSelector onChange={setWindow} />
          <AdminButton variant="outline" asChild>
            <a href={`${EXPORTS}/commodity-profit.csv${windowQs}`}>Profit CSV</a>
          </AdminButton>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <ReportKpi
          label="Revenue"
          hint="What the goods you sold in the period you picked were worth, before any costs."
          value={s?.revenueGhs ?? null}
        />
        <ReportKpi
          label="Cost of goods"
          hint="What the grain you sold cost you to buy in the first place."
          value={s?.costGhs ?? null}
        />
        <ReportKpi
          label="Gross profit"
          hint="Revenue less what the grain cost you, before running costs are taken off."
          value={s?.grossProfitGhs ?? null}
        />
        <ReportKpi
          label="Expenses"
          hint="Running costs in the period you picked: transport, loading, fees and the rest."
          value={s?.expensesGhs ?? null}
        />
        <ReportKpi
          label="Net profit"
          hint="What the business actually kept: gross profit after every running cost."
          value={s?.netProfitGhs ?? null}
          accent
        />
        <ReportKpi
          label="Net margin"
          hint="How many pesewas of every cedi sold you kept as profit."
          text={
            s?.netMarginPct === null || s?.netMarginPct === undefined
              ? "n/a"
              : `${s.netMarginPct.toLocaleString("en-GH", { maximumFractionDigits: 1 })}%`
          }
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ProfitBarChart
          rows={profit.data?.data.byCommodity ?? []}
          hasEstimated={s?.hasEstimated}
        />
        <ExpenseDonut summary={expenses.data?.data} />
      </div>

      <div className="mb-5">
        <PlTrendChart />
      </div>

      <div className="mb-5">
        <CashComingIn />
      </div>

      <div className="mb-5">
        <DebtorsTable exportHref={`${EXPORTS}/debtors.csv`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AgentPerformance
          window={window}
          exportHref={`${EXPORTS}/agent-performance.csv${windowQs}`}
        />
        <PlStatement window={window} />
      </div>
    </div>
  );
}
