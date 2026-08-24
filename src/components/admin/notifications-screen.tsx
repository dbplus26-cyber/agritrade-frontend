"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import { HelpWrap } from "@/components/admin/help-tip";
import {
  AdminCard,
  AdminPageHeader,
  Mono,
  ToneBadge,
  type Tone,
} from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { cn } from "@/lib/utils";
import { useGetNotificationsQuery } from "@/redux/notifications/notifications-api";
import type {
  INotification,
  INotificationListQuery,
  NotifChannel,
  NotifStatus,
} from "@/types/notification.types";

const STATUS_TONE: Record<NotifStatus, { label: string; tone: Tone }> = {
  FAILED: { label: "Failed", tone: "alert" },
  QUEUED: { label: "Queued", tone: "harvest" },
  SENT: { label: "Sent", tone: "leaf" },
};

/** What each state means for whether the person actually got the message. */
const STATUS_HELP: Record<NotifStatus, string> = {
  FAILED: "The message could not be delivered, so assume the person never saw it.",
  QUEUED: "Written and waiting to go out; it has not been sent yet.",
  SENT: "Handed to the network or email provider for delivery.",
};

/** Dotted event → human label. */
const EVENT_LABEL: Record<string, string> = {
  "float.low": "Agent float low",
  "payment.confirmed": "Payment received",
  "sale.balance_due": "Balance due",
};

/**
 * How loudly an event should read.
 *
 * A log where every line looks the same is a log nobody scans: an agent
 * running out of money in the field and a receipt going out are not the same
 * news. `alert` is money that has run short somewhere - the thing an owner
 * would want to see from across the room; `warn` is money owed and unpaid;
 * everything else is a record of routine traffic and stays quiet.
 *
 * Delivery FAILURE is a separate axis and keeps its own badge: a routine
 * receipt that never arrived still matters, and an urgent warning that was
 * delivered is not a problem with the system.
 */
type Severity = "alert" | "info" | "warn";

const EVENT_SEVERITY: Record<string, Severity> = {
  "float.low": "alert",
  "sale.balance_due": "warn",
};

const severityOf = (event: string): Severity => EVENT_SEVERITY[event] ?? "info";

/** One line, one typeface, and the CLOCK - this is a delivery log, and two
 *  rows stamped "23 Aug" say nothing about which went out first. */
const stamp = (iso: string): string =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });

/**
 * A run of identical messages, counted rather than repeated.
 *
 * The same event to the same person with the same outcome is one fact however
 * many times the system tried it, and printed one row per attempt it buries
 * everything else on the page. The STATUS is part of the key on purpose: three
 * sent and one failed is not four of anything, and folding the failure into
 * the run would hide the only row worth acting on.
 */
export interface NotificationGroup extends INotification {
  count: number;
  /** The oldest in the run, for the range on a grouped row. */
  firstAt: string;
}

export const groupRuns = (list: INotification[]): NotificationGroup[] => {
  const order: string[] = [];
  const byKey = new Map<string, NotificationGroup>();
  for (const n of list) {
    const key = `${n.event}|${n.recipient}|${n.status}`;
    const seen = byKey.get(key);
    if (!seen) {
      order.push(key);
      byKey.set(key, { ...n, count: 1, firstAt: n.createdAt });
      continue;
    }
    seen.count += 1;
    // The rows arrive newest first, so the representative keeps the newest
    // stamp and the run's foot walks backwards.
    if (n.createdAt < seen.firstAt) seen.firstAt = n.createdAt;
  }
  return order.map((key) => byKey.get(key)!);
};

const STATUS_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Sent", value: "SENT" },
  { label: "Queued", value: "QUEUED" },
  { label: "Failed", value: "FAILED" },
] as const;

const CHANNEL_OPTIONS = [
  { label: "All channels", value: "all" },
  { label: "SMS", value: "SMS" },
  { label: "Email", value: "EMAIL" },
] as const;

const FILTER_DEFAULTS = { channel: "all", status: "all", size: "20" };

export function NotificationsScreen() {
  const {
    page,
    filters,
    setFilter,
    setPage,
    resetFilters,
    search: searchInput,
    setSearch,
    queryParams,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });

  const search = (queryParams.search as string | undefined) ?? "";
  const { channel, status } = filters;
  const pageSize = Number(filters.size) || 20;

  const queryArgs = useMemo<INotificationListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(status !== "all" ? { status: status as NotifStatus } : {}),
      ...(channel !== "all" ? { channel: channel as NotifChannel } : {}),
    }),
    [page, pageSize, search, status, channel],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetNotificationsQuery(queryArgs);
  // Grouped for DISPLAY only: the counts still sum to the server's total, so
  // the "N notifications" beside the filters keeps counting messages.
  const rows = useMemo(() => groupRuns(data?.data ?? []), [data]);
  const total = data?.meta.total ?? 0;
  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (channel !== "all" ? 1 : 0);
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state - a filter bar filters nothing.
  const pristine = !isLoading && !isError && rows.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<NotificationGroup, unknown>[]>(
    () => [
      {
        id: "event",
        header: "Notification",
        enableSorting: false,
        meta: columnMeta({ card: "title", stretch: true }),
        cell: ({ row }) => {
          const n = row.original;
          const severity = severityOf(n.event);
          return (
            <div className="min-w-0 @2xl/table:max-w-[90%]">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "font-medium",
                    severity === "alert"
                      ? "font-semibold text-console-red"
                      : severity === "warn"
                        ? "text-console-gold-deep"
                        : "text-adm-ink",
                  )}
                >
                  {EVENT_LABEL[n.event] ?? n.event}
                </span>
                {severity !== "info" ? (
                  <HelpWrap
                    text={
                      severity === "alert"
                        ? "Money has run short somewhere. Worth acting on before the next one of these arrives."
                        : "Money owed and not yet paid."
                    }
                  >
                    <ToneBadge tone={severity === "alert" ? "alert" : "harvest"}>
                      {severity === "alert" ? "Needs attention" : "Money owed"}
                    </ToneBadge>
                  </HelpWrap>
                ) : null}
                {/* The run, counted. Three of the same warning to the same
                    person is one thing that keeps happening, not three
                    things. */}
                {n.count > 1 ? (
                  <HelpWrap
                    text={`Sent ${String(n.count)} times, ${stamp(n.firstAt)} to ${stamp(n.createdAt)}. Identical messages to the same recipient with the same outcome are counted rather than repeated.`}
                  >
                    <Mono className="rounded-none border border-adm-line bg-adm-sunken px-1.5 py-px text-[10.5px] font-semibold text-adm-body">
                      &times;{n.count}
                    </Mono>
                  </HelpWrap>
                ) : null}
              </div>
              {n.preview ? (
                <div className="mt-0.5 text-[11px] text-adm-muted [overflow-wrap:anywhere] @2xl/table:truncate">
                  {n.preview}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: "recipient",
        header: "To",
        enableSorting: false,
        meta: columnMeta({ card: "meta", wide: true }),
        cell: ({ row }) => (
          <Mono className="text-adm-muted">
            {row.original.recipient}
          </Mono>
        ),
      },
      {
        id: "channel",
        header: "Channel",
        enableSorting: false,
        meta: columnMeta({ card: "badge" }),
        cell: ({ row }) => (
          <ToneBadge tone={row.original.channel === "SMS" ? "sky" : "slate"}>
            {row.original.channel}
          </ToneBadge>
        ),
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta({ card: "badge" }),
        cell: ({ row }) => {
          const s = STATUS_TONE[row.original.status];
          return (
            // The failure reason stays on `title`; the tooltip explains the
            // STATE, which is a different question and always answerable.
            <span title={row.original.error ?? undefined}>
              <HelpWrap text={STATUS_HELP[row.original.status]}>
                <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
              </HelpWrap>
            </span>
          );
        },
      },
      {
        id: "when",
        header: "When",
        enableSorting: false,
        meta: columnMeta({ card: "meta", wide: true }),
        // Mono, like the recipient beside it: the meta line ran a
        // proportional date against a monospaced address, and the two set
        // their own rhythms either side of the separator.
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-muted">
            {stamp(row.original.createdAt)}
          </Mono>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <AdminPageHeader
        title="Notifications"
        sub="Every SMS and email the system has sent, with its delivery status"
      />

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search recipient…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={total}
          noun="notifications"
          chips={
            <>
              {status !== "all" ? (
                <FilterChip onRemove={() => setFilter("status", "all")}>
                  Status: {labelOf(STATUS_OPTIONS, status)}
                </FilterChip>
              ) : null}
              {channel !== "all" ? (
                <FilterChip onRemove={() => setFilter("channel", "all")}>
                  Channel: {labelOf(CHANNEL_OPTIONS, channel)}
                </FilterChip>
              ) : null}
            </>
          }
        >
          <ConsoleLabeledSelect
            label="Status"
            value={status}
            onChange={(v) => setFilter("status", v)}
            options={STATUS_OPTIONS}
            active={status !== "all"}
          />
          <ConsoleLabeledSelect
            label="Channel"
            value={channel}
            onChange={(v) => setFilter("channel", v)}
            options={CHANNEL_OPTIONS}
            active={channel !== "all"}
          />
        </ConsoleFilterBar>
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={5} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="notifications"
          description="Sent SMS and emails will appear here as the system notifies buyers and the owner."
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<NotificationGroup>
            columns={columns}
            data={rows}
            itemNoun="notifications"
            serverPagination={{
              totalCount: total,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
