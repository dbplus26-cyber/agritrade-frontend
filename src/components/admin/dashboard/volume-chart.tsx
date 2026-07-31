"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetVolumeQuery } from "@/redux/reports/reports-api";
import type { IReportWindow } from "@/types/report.types";

import {
  AXIS_TICK,
  ChartNote,
  colorFor,
  formatWeight,
  GRID_STROKE,
  LegendItem,
  tonnesTick,
  WidgetCard,
} from "./chart-kit";

type Row = Record<string, number | string> & { label: string };

function VolumeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  label?: string;
  payload?: { color?: string; name: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((a, p) => a + (p.value || 0), 0);
  return (
    <div className="rounded-none border-[1.5px] border-soil/30 bg-paper px-3 py-2 text-[12px] shadow-doc-sm">
      <div className="mb-1 font-semibold text-ink">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <LegendItem color={p.color ?? "#999"} label={p.name} />
          <span className="font-semibold text-ink">{formatWeight(p.value)}</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between gap-4 border-t border-soil/15 pt-1">
        <span className="text-soil">Total</span>
        <span className="font-semibold text-ink">{formatWeight(total)}</span>
      </div>
    </div>
  );
}

/**
 * Volume bought per commodity over the window (kg, shown in tonnes), stacked so
 * each bar is the period's total intake split by commodity. Weights are
 * operational, so this is never redacted.
 */
export function VolumeChart({ window }: { window: IReportWindow }) {
  const { data, isLoading } = useGetVolumeQuery(window);
  const commodities = data?.data.commodities ?? [];
  const points = data?.data.points ?? [];

  const rows: Row[] = points.map((p) => ({ label: p.label, ...p.values }));
  const hasVolume = commodities.length > 0 && rows.some((r) =>
    commodities.some((c) => Number(r[c.name] ?? 0) > 0),
  );

  const legend = (
    // Each entry capped so one long commodity name cannot claim the whole
    // legend and push the rest onto their own lines.
    <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      {commodities.map((c, i) => (
        <LegendItem
          className="max-w-[21rem]"
          color={colorFor(i)}
          key={c.id}
          label={c.name}
        />
      ))}
    </span>
  );

  return (
    <WidgetCard title="Volume bought (t)" right={hasVolume ? legend : undefined}>
      {isLoading ? (
        <Skeleton className="h-[220px] w-full rounded-none" />
      ) : !hasVolume ? (
        <ChartNote>No purchases recorded in this period.</ChartNote>
      ) : (
        <div className="h-[220px] min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 6, right: 6, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={GRID_STROKE} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID_STROKE }}
                minTickGap={16}
              />
              <YAxis
                tick={{ fill: AXIS_TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={tonnesTick}
                width={36}
              />
              <Tooltip
                content={<VolumeTooltip />}
                cursor={{ fill: "rgba(100,116,139,0.08)" }}
              />
              {commodities.map((c, i) => (
                <Bar
                  key={c.id}
                  dataKey={c.name}
                  stackId="volume"
                  fill={colorFor(i)}
                  maxBarSize={38}
                  radius={i === commodities.length - 1 ? [3, 3, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </WidgetCard>
  );
}
