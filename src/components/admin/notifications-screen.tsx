"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { DateTimeCell } from "@/components/admin/date-cell";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, Mono, ToneBadge, type Tone } from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
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

/** Dotted event → human label. */
const EVENT_LABEL: Record<string, string> = {
  "float.low": "Agent float low",
  "payment.confirmed": "Payment received",
  "sale.balance_due": "Balance due",
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
  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (channel !== "all" ? 1 : 0);

  const columns = useMemo<ColumnDef<INotification, unknown>[]>(
    () => [
      {
        id: "event",
        header: "Notification",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <div className="min-w-0 max-w-[21rem]">
            <div className="font-medium text-adm-ink">
              {EVENT_LABEL[row.original.event] ?? row.original.event}
            </div>
            {row.original.preview ? (
              <div className="truncate text-[12px] text-adm-muted">
                {row.original.preview}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "recipient",
        header: "To",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <Mono className="text-[12.5px] text-adm-muted">
            {row.original.recipient}
          </Mono>
        ),
      },
      {
        id: "channel",
        header: "Channel",
        enableSorting: false,
        meta: columnMeta(),
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
        meta: columnMeta(),
        cell: ({ row }) => {
          const s = STATUS_TONE[row.original.status];
          return (
            <span title={row.original.error ?? undefined}>
              <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
            </span>
          );
        },
      },
      {
        id: "when",
        header: "When",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Notifications
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Every SMS and email the system has sent, with its delivery status
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search recipient…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
        >
          <ConsoleLabeledSelect
            label="Status"
            value={status}
            onChange={(v) => setFilter("status", v)}
            options={STATUS_OPTIONS}
            active={status !== "all"}
            className="lg:w-[150px]"
          />
          <ConsoleLabeledSelect
            label="Channel"
            value={channel}
            onChange={(v) => setFilter("channel", v)}
            options={CHANNEL_OPTIONS}
            active={channel !== "all"}
            className="lg:w-[150px]"
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
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={
              search || activeFilterCount > 0
                ? "No matching notifications"
                : "No notifications yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Nothing matches this search and filter combination."
                : "Sent SMS and emails will appear here as the system notifies buyers and the owner."
            }
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<INotification>
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
