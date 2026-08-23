"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { DateTimeCell } from "@/components/admin/date-cell";
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
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state - a filter bar filters nothing.
  const pristine = !isLoading && !isError && rows.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<INotification, unknown>[]>(
    () => [
      {
        id: "event",
        header: "Notification",
        enableSorting: false,
        meta: columnMeta({ card: "title", stretch: true }),
        cell: ({ row }) => (
          <div className="min-w-0 @2xl/table:max-w-[90%]">
            <div className="font-medium text-adm-ink">
              {EVENT_LABEL[row.original.event] ?? row.original.event}
            </div>
            {row.original.preview ? (
              <div className="text-[12.5px] text-adm-muted [overflow-wrap:anywhere] @2xl/table:truncate">
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
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
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
