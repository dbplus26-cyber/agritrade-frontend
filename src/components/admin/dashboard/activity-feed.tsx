"use client";

import { TONES, type Tone } from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetActivityQuery } from "@/redux/reports/reports-api";

import { WidgetCard, WidgetEmpty, WidgetError } from "./chart-kit";

/** Humanise a dotted audit action, e.g. "float.topped_up" → "Float topped up". */
const humanizeAction = (action: string): string => {
  const words = action.replace(/[._]/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Tone for an action by outcome family (positive / negative / in-motion). */
const toneForAction = (action: string): Tone => {
  if (/void|reject|cancel|delete|fail|block/.test(action)) return "alert";
  if (/receiv|topped_up|approv|confirm|complet|paid|settl/.test(action)) {
    return "leaf";
  }
  if (/sent|dispatch|load|arriv|creat|publish/.test(action)) return "harvest";
  return "sky";
};

/** Compact "10 Jul, 16:40" timestamp. */
const shortWhen = (iso: string): string =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  });

/**
 * Recent activity feed from the audit trail: the newest mutating events, each
 * with the acting user and when. Carries no money.
 */
export function ActivityFeed() {
  const { data, isError, isLoading, refetch } = useGetActivityQuery({
    limit: 8,
  });
  const rows = data?.data ?? [];

  return (
    <WidgetCard
      title="Recent activity"
      hint="The latest things recorded in the console, whoever recorded them."
    >
      {isError ? (
        <WidgetError what="the activity feed" onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-none" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <WidgetEmpty
          title="No activity yet"
          hint="Everything recorded in the console lands here as it happens."
        />
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start gap-2.5 border-b border-adm-hairline py-2 last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full"
                style={{ background: TONES[toneForAction(row.action)].dot }}
              />
              <div className="min-w-0 flex-1">
                <div className="[overflow-wrap:anywhere] md:truncate text-[13px] text-adm-ink">
                  {humanizeAction(row.action)}
                  <span className="text-adm-faint"> · {row.entity}</span>
                </div>
                <div className="[overflow-wrap:anywhere] md:truncate text-[11.5px] text-adm-muted">
                  {row.actorName} · {shortWhen(row.at)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
