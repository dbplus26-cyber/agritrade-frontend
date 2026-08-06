"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { HelpTip } from "@/components/admin/help-tip";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { DateOnlyCell } from "@/components/admin/date-cell";
import { AdminCard, Mono, ToneBadge } from "@/components/admin/ui";
import { Money } from "@/components/admin/trading/sale-bits";
import { BackButton } from "@/components/ui/BackButton";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { cn } from "@/lib/utils";
import { useGetGrantAgingQuery } from "@/redux/farm/grants-api";
import type { GrantAgingBucket, IGrantAgingRow } from "@/types/ops.types";

/**
 * Bucket order and skin for the totals strip: current is calm, and each
 * later bucket wears a progressively hotter tint so 90+ reads as the fire.
 */
const BUCKETS: {
  key: GrantAgingBucket;
  label: string;
  /** What this bucket holds, in the reader's words - see HelpTip. */
  hint: string;
  cardClass: string;
  valueClass: string;
}[] = [
  {
    key: "current",
    label: "Current",
    hint: "Money farmers owe that is not late yet: its due date has not passed.",
    cardClass: "",
    valueClass: "text-adm-ink",
  },
  {
    key: "1-30",
    label: "1-30 days",
    hint: "Money farmers owe that went past its due date within the last month.",
    cardClass: "bg-console-gold/10",
    valueClass: "text-adm-ink",
  },
  {
    key: "31-60",
    label: "31-60 days",
    hint: "Money farmers owe that has been past its due date for one to two months.",
    cardClass: "bg-console-gold/25",
    valueClass: "text-adm-ink",
  },
  {
    key: "61-90",
    label: "61-90 days",
    hint: "Money farmers owe that has been past its due date for two to three months.",
    cardClass: "border-console-red/30 bg-console-red/10",
    valueClass: "text-console-red",
  },
  {
    key: "90+",
    label: "Over 90 days",
    hint: "Money farmers owe that has been late more than three months: chase these first.",
    cardClass: "border-console-red/50 bg-console-red/20",
    valueClass: "text-console-red",
  },
];

function OverdueChip({ daysOverdue }: { daysOverdue: number }) {
  if (daysOverdue <= 0) return <ToneBadge tone="leaf">Current</ToneBadge>;
  return (
    <ToneBadge tone="alert">
      {daysOverdue} {daysOverdue === 1 ? "day" : "days"}
    </ToneBadge>
  );
}

/** /admin/grants/aging - outstanding farm investment by how overdue it is. */
export function GrantAging() {
  const { data, isLoading, isError, error, refetch } = useGetGrantAgingQuery();
  const aging = data?.data.aging;
  const rows = useMemo(() => aging?.rows ?? [], [aging]);

  const columns = useMemo<ColumnDef<IGrantAgingRow, unknown>[]>(
    () => [
      {
        id: "farmer",
        header: "Farmer",
        accessorFn: (r) => r.farmer.name,
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => (
          <div className="min-w-0 w-full">
            <Link
              href={`/admin/farmers/${row.original.farmer.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block max-w-[90%] truncate font-semibold text-adm-ink underline-offset-2 hover:underline"
              title={row.original.farmer.name}
            >
              {row.original.farmer.name}
            </Link>
            {row.original.farmer.phone ? (
              <div className="truncate text-[12px] text-adm-muted">
                {row.original.farmer.phone}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        id: "season",
        header: "Season",
        accessorFn: (r) => r.season.name,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="text-[12.5px] text-adm-muted">
            {row.original.season.name}
          </span>
        ),
      },
      {
        id: "invested",
        header: columnHelp(
          "Invested",
          "What the seed, fertiliser and tools this farmer took were worth.",
        ),
        accessorFn: (r) => r.investedGhs ?? 0,
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-adm-muted">
            <Money value={row.original.investedGhs} compact />
          </Mono>
        ),
      },
      {
        id: "recovered",
        header: columnHelp(
          "Recovered",
          "What this farmer has paid back so far, in produce or in cash.",
        ),
        accessorFn: (r) => r.recoveredGhs ?? 0,
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-adm-muted">
            <Money value={row.original.recoveredGhs} compact />
          </Mono>
        ),
      },
      {
        id: "outstanding",
        header: columnHelp(
          "Outstanding",
          "What this farmer still owes you: what they took, less what they have paid back.",
        ),
        accessorFn: (r) => r.outstandingGhs ?? 0,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] font-semibold text-adm-ink">
            <Money value={row.original.outstandingGhs} compact />
          </Mono>
        ),
      },
      {
        id: "due",
        header: columnHelp(
          "Due",
          "The date this farmer was meant to have paid the grant back by.",
        ),
        accessorFn: (r) => r.dueDate ?? "",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateOnlyCell value={row.original.dueDate} />,
      },
      {
        id: "overdue",
        header: columnHelp(
          "Overdue",
          "How long this balance has been sitting past its due date.",
        ),
        accessorFn: (r) => r.daysOverdue,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <OverdueChip daysOverdue={row.original.daysOverdue} />
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <BackButton href="/admin/grants" label="All grants" className="mb-2" />
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Grant aging
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Outstanding farm investment by how overdue it is - most overdue first
        </p>
      </div>

      {isLoading ? (
        <ConsoleTableSkeleton columns={5} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 @lg/main:grid-cols-3 @3xl/main:grid-cols-5">
            {BUCKETS.map((b) => (
              <AdminCard key={b.key} className={cn("px-3 py-2.5", b.cardClass)}>
                <div className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                  <span className="min-w-0">{b.label}</span>
                  <HelpTip label={`What is in ${b.label}?`} text={b.hint} />
                </div>
                <div
                  className={cn(
                    "font-adminmono mt-0.5 text-[16px] font-bold tabular-nums",
                    b.valueClass,
                  )}
                >
                  <Money value={aging?.totals[b.key] ?? null} compact />
                </div>
              </AdminCard>
            ))}
          </div>

          {rows.length === 0 ? (
            <AdminCard className="overflow-hidden">
              <EmptyState
                variant="plain"
                title="Nothing outstanding"
                description="Every grant on the books has been recovered."
              />
            </AdminCard>
          ) : (
            <AdminCard className="overflow-hidden">
              <ConsoleDataTable<IGrantAgingRow>
                columns={columns}
                data={rows}
                itemNoun="balances"
                pageSize={20}
                rowClassName={() => "h-12 hover:bg-adm-sunken"}
              />
            </AdminCard>
          )}
        </>
      )}
    </div>
  );
}
