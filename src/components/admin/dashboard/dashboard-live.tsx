"use client";

import Link from "next/link";
import { useState } from "react";
import { HelpWrap } from "@/components/admin/help-tip";
import { ShipmentStatusBadge } from "@/components/admin/trading/shipment-bits";
import { Money } from "@/components/admin/trading/sale-bits";
import { adminLinkClass, AdminCard, Mono } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import { usePermissions } from "@/hooks/use-permissions";
import {
  formatCedisCompact,
  formatKg,
  statValueCls,
} from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { useGetAgentsQuery } from "@/redux/agents/agents-api";
import { useGetDashboardQuery } from "@/redux/reports/reports-api";
import { useGetShipmentsQuery } from "@/redux/shipments/shipments-api";
import type { IReportWindow } from "@/types/report.types";

import { ActivityFeed } from "./activity-feed";
import { ApprovalsPreview } from "./approvals-preview";
import { CashflowChart } from "./cashflow-chart";
import { WidgetCard, WidgetEmpty, WidgetError } from "./chart-kit";
import { DateRangeSelector, DEFAULT_RANGE } from "./date-range-selector";
import { PeriodSummary } from "./period-summary";
import { StockDonut } from "./stock-donut";
import { VolumeChart } from "./volume-chart";

/** A headline KPI tile (state now - not affected by the date filter). */
function Kpi({
  alert = false,
  hint,
  href,
  label,
  sub,
  value,
  /**
   * The rendered figure as plain text. The tile width is fixed by the grid but
   * the number is not, so the type scale is chosen from the length rather than
   * pinned - at 280px a 10-character amount at 20px clips mid-number.
   */
  valueText,
}: {
  alert?: boolean;
  /**
   * One sentence on what the figure counts, on hover over the label.
   *
   * Attached to the label rather than to a help icon beside it, because the
   * whole tile is a `<Link>` and a `<button>` inside an `<a>` is invalid HTML
   * - the browser is entitled to reparent it, and the row would sometimes
   * navigate instead of explaining itself.
   */
  hint?: string;
  href: string;
  label: string;
  sub?: React.ReactNode;
  value: React.ReactNode;
  valueText?: string;
}) {
  const heading = (
    <div className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
      {label}
    </div>
  );
  return (
    <Link href={href}>
      <AdminCard className="h-full px-4 py-3 transition-colors hover:border-adm-line">
        {hint ? <HelpWrap text={hint}>{heading}</HelpWrap> : heading}
        <div
          className={cn(
            "mt-1 min-w-0 font-bold",
            valueText ? statValueCls(valueText) : "text-[20px]",
            alert ? "text-console-red" : "text-adm-ink",
          )}
        >
          {value}
        </div>
        {sub ? <div className="mt-0.5 text-[12px] text-adm-muted">{sub}</div> : null}
      </AdminCard>
    </Link>
  );
}

function AgentFloatsCard() {
  const { data, isError, isLoading, refetch } = useGetAgentsQuery({
    isActive: true,
    limit: 8,
  });
  const agents = data?.data ?? [];
  return (
    <WidgetCard
      title="Cash with agents"
      hint="What each field agent still holds of the money you gave them to buy with."
      right={
        <Link href="/admin/agents" className={cn(adminLinkClass, "text-[12px]")}>
          All agents
        </Link>
      }
    >
      {isError ? (
        <WidgetError
          what="the agent floats"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <Skeleton className="h-[120px] w-full rounded-none" />
      ) : agents.length === 0 ? (
        <WidgetEmpty
          title="No active agents"
          hint="Agents appear here with their float once they are created and funded."
        />
      ) : (
        agents.map((a) => (
          // The FIGURE is what this list is for, so it is the part that
          // never gives way: flex-none and no wrapping. The name takes what
          // is left and truncates. Before, both sides could shrink and the
          // name - being longer - won, squeezing the amount until it wrapped
          // its currency symbol onto a line of its own.
          <div
            key={a.userId}
            className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-1.5 text-[13px] last:border-b-0"
          >
            <span
              className="min-w-0 truncate text-adm-ink"
              title={`${a.firstName} ${a.lastName}`}
            >
              {a.firstName} {a.lastName}
            </span>
            <Mono
              className={cn(
                "flex-none font-semibold whitespace-nowrap",
                a.balanceGhs !== null && a.balanceGhs < 0
                  ? "text-console-red"
                  : "text-adm-ink",
              )}
            >
              <Money compact value={a.balanceGhs} />
            </Mono>
          </div>
        ))
      )}
    </WidgetCard>
  );
}

function TrucksCard() {
  // On the road: loading, dispatched or arrived - not yet closed.
  const dispatched = useGetShipmentsQuery({ limit: 5, status: "DISPATCHED" });
  const loading = useGetShipmentsQuery({ limit: 5, status: "LOADING" });
  const trucks = [
    ...(dispatched.data?.data ?? []),
    ...(loading.data?.data ?? []),
  ].slice(0, 6);
  return (
    <WidgetCard
      title="Trucks on the road"
      hint="Loads that have been started or dispatched and have not been signed off yet."
      right={
        <Link href="/admin/shipments" className={cn(adminLinkClass, "text-[12px]")}>
          All shipments
        </Link>
      }
    >
      {dispatched.isError || loading.isError ? (
        <WidgetError
          what="the trucks on the road"
          onRetry={() => {
            void dispatched.refetch();
            void loading.refetch();
          }}
        />
      ) : dispatched.isLoading || loading.isLoading ? (
        <Skeleton className="h-[120px] w-full rounded-none" />
      ) : trucks.length === 0 ? (
        <WidgetEmpty
          title="No trucks currently moving"
          hint="Loads appear here from planning until they are signed off."
        />
      ) : (
        trucks.map((t) => (
          <Link
            key={t.id}
            href={`/admin/shipments/${t.id}`}
            className="flex items-center justify-between gap-2 border-b border-adm-hairline py-2 last:border-b-0"
          >
            <div className="min-w-0">
              <Mono className="text-[12.5px] font-semibold text-console">
                {t.truckReg}
              </Mono>
              <div className="truncate text-[12px] text-adm-muted">
                {t.originWarehouse.name} → {t.destination}
              </div>
            </div>
            <ShipmentStatusBadge status={t.status} />
          </Link>
        ))
      )}
    </WidgetCard>
  );
}

/** Time-of-day greeting, computed on the client from the local hour. */
function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardLive() {
  const [window, setWindow] = useState<IReportWindow>(DEFAULT_RANGE);
  const { data, isError, isLoading, refetch } = useGetDashboardQuery();
  const user = useCurrentUser();
  const canSeeMoney = useMoneyVisibility();
  const { isSuperAdmin } = useAuthRole();
  const { has } = usePermissions();
  const canDecide = isSuperAdmin || has("APPROVALS_DECIDE");
  const d = data?.data;
  const greeting = greetingFor(new Date());

  return (
    <div>
      <div className="mb-[18px] flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            {greeting}
            {user ? `, ${user.firstName}` : ""}
          </h1>
          <div className="mt-0.5 text-[13px] text-adm-muted">
            Here is the state of the business at a glance
          </div>
        </div>
        <DateRangeSelector onChange={setWindow} />
      </div>

      {/* Snapshot KPIs - the state of the business right now. Error is its
          own branch: `isLoading || !d` stays true forever after a failure,
          so this used to pulse an empty skeleton with nothing to act on. */}
      {isError ? (
        <div className="mb-5">
          <WidgetError what="the snapshot figures" onRetry={() => void refetch()} />
        </div>
      ) : isLoading || !d ? (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[86px] w-full rounded-none" />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "mb-5 grid grid-cols-2 gap-3",
            canSeeMoney ? "lg:grid-cols-5" : "lg:grid-cols-3",
          )}
        >
          <Kpi
            label="Stock on hand"
            hint="Everything sitting in your warehouses right now, across every commodity."
            value={formatKg(d.stockOnHandKg)}
            valueText={formatKg(d.stockOnHandKg)}
            sub={`${String(d.stockByCommodity.length)} commodities`}
            href="/admin/stock"
          />
          {canSeeMoney ? (
            <Kpi
              label="Paid goods incoming"
              hint="Grain you have already bought that has not reached a warehouse yet."
              value={<Money compact value={d.incomingGhs} />}
              valueText={formatCedisCompact(d.incomingGhs)}
              sub={formatKg(d.incomingKg)}
              href="/admin/purchases"
            />
          ) : (
            <Kpi
              label="Goods incoming"
              hint="Grain already bought that has not reached a warehouse yet."
              value={formatKg(d.incomingKg)}
              valueText={formatKg(d.incomingKg)}
              href="/admin/purchases"
            />
          )}
          {canSeeMoney ? (
            <Kpi
              label="Cash with agents"
              hint="Your money currently in field agents' hands, waiting to be spent or accounted for."
              value={<Money compact value={d.cashWithAgentsGhs} />}
              valueText={formatCedisCompact(d.cashWithAgentsGhs)}
              sub={`${String(d.activeAgents)} active agents`}
              href="/admin/agents"
            />
          ) : null}
          <Kpi
            label="Sales in progress"
            hint="Orders agreed with buyers that are not yet delivered and paid off."
            value={d.salesInProgress}
            sub={canSeeMoney ? <Money compact value={d.salesInProgressAgreedGhs} /> : undefined}
            href="/admin/sales"
          />
          {canSeeMoney ? (
            <Kpi
              label="Balances due"
              hint="What buyers still owe you across every order, right now."
              value={<Money compact value={d.debtorsOutstandingGhs} />}
              valueText={formatCedisCompact(d.debtorsOutstandingGhs)}
              sub={`${String(d.debtorCount)} buyers`}
              href="/admin/sales?outstanding=yes"
              alert={(d.debtorsOutstandingGhs ?? 0) > 0}
            />
          ) : null}
        </div>
      )}

      {/* Windowed flow summary and cashflow are MONEY panels: for someone
          without money visibility they rendered as sheets of "Hidden", which
          is a wall of nothing - so they simply do not render. */}
      {canSeeMoney ? (
        <div className="mb-5">
          <PeriodSummary window={window} />
        </div>
      ) : null}

      <div
        className={cn(
          "mb-5 grid grid-cols-1 gap-4",
          canSeeMoney && "xl:grid-cols-[1.6fr_1fr]",
        )}
      >
        {canSeeMoney ? <CashflowChart window={window} /> : null}
        <StockDonut rows={d?.stockByCommodity ?? []} />
      </div>

      <div className="mb-5">
        <VolumeChart window={window} />
      </div>

      {/* Operational panels - current state. The approvals preview belongs
          to people who can DECIDE; the floats card is balances, so it needs
          money visibility. Neither renders a refusal in place of itself. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ActivityFeed />
        {canDecide ? <ApprovalsPreview /> : null}
        <TrucksCard />
        {canSeeMoney ? <AgentFloatsCard /> : null}
      </div>
    </div>
  );
}
