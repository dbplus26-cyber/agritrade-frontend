"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { TextCell, TitleCell } from "@/components/admin/table-cells";
import { AdminCard, Mono } from "@/components/admin/ui";
import { Money } from "@/components/admin/trading/sale-bits";
import { Button } from "@/components/ui/button";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { useGetGrantsQuery } from "@/redux/farm/grants-api";
import { useGetSeasonsQuery } from "@/redux/farm/seasons-api";
import type { IGrant, IGrantListQuery } from "@/types/farm.types";
import { GrantApprovalBadge } from "./farm-bits";

const LIST = "/admin/grants";
const FILTER_DEFAULTS = { season: "all", from: "", to: "", size: "10" };

export function GrantsRegister() {
  const router = useRouter();
  const { page, filters, setFilter, setPage, resetFilters } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });

  const pageSize = Number(filters.size) || 10;
  const { season, from, to } = filters;
  const seasons = useGetSeasonsQuery({ limit: 100 });

  const queryArgs = useMemo<IGrantListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(season !== "all" ? { seasonId: season } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, pageSize, season, from, to],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetGrantsQuery(queryArgs);
  const grants = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (season !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading && !isError && grants.length === 0 && activeFilterCount === 0;

  const seasonOptions = useMemo(
    () => [
      { label: "All seasons", value: "all" },
      ...(seasons.data?.data ?? []).map((s) => ({
        label: s.name,
        value: s.id,
      })),
    ],
    [seasons.data],
  );

  const columns = useMemo<ColumnDef<IGrant, unknown>[]>(
    () => [
      {
        id: "transactionNo",
        header: "Grant #",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-adm-ink">
            {row.original.transactionNo}
          </Mono>
        ),
      },
      {
        id: "farmer",
        header: "Farmer",
        enableSorting: false,
        meta: columnMeta(),
        // The season rides under the farmer's name rather than holding a
        // column of its own: it is context for the row, not a fact anybody
        // scans down, and season names here run long enough to have been one
        // of the columns forcing this table off the side of the screen.
        cell: ({ row }) => (
          <TitleCell
            meta={row.original.season.name}
            title={row.original.farmer.name}
            width="prose"
          />
        ),
      },
      {
        id: "item",
        header: "Item",
        enableSorting: false,
        meta: columnMeta({ at: "xl" }),
        cell: ({ row }) => (
          <TextCell
            value={`${row.original.item.name} · ${String(row.original.quantity)} ${row.original.item.unitLabel}`}
            width="label"
          />
        ),
      },
      {
        id: "value",
        header: "Value",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-adm-ink">
            <Money value={row.original.valueGhs} />
          </Mono>
        ),
      },
      {
        id: "granted",
        header: "Granted",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateTimeCell value={row.original.grantedAt} />,
      },
      {
        id: "added",
        header: "Added",
        enableSorting: false,
        // Container-queried hiding lives on `className` (th + td together);
        // headerClassName alone would desync the header from its cells.
        meta: columnMeta({ at: "2xl" }),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
      {
        id: "flag",
        header: "",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <GrantApprovalBadge status={row.original.approval?.status} />
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Input grants
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Inputs given to farmers, carrying the cash value owed
        </p>
      </div>

      {pristine || (isError && activeFilterCount === 0) ? null : (
        <ConsoleFilterBar
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <span className="flex items-center gap-2">
              <Button
                asChild
                variant="outline"
                className="h-8 border border-adm-line px-3 text-[13px] text-adm-muted shadow-none hover:bg-adm-sunken"
              >
                <Link href={`${LIST}/aging`}>Aging</Link>
              </Button>
              <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
                <Link href={`${LIST}/new`}>+ New grant</Link>
              </Button>
            </span>
          }
        >
          <ConsoleLabeledSelect
            label="Season"
            value={season}
            onChange={(v) => setFilter("season", v)}
            options={seasonOptions}
            active={season !== "all"}
            className="lg:w-[200px]"
          />
          <ConsoleDateRange
            from={from}
            to={to}
            onFromChange={(v) => setFilter("from", v)}
            onToChange={(v) => setFilter("to", v)}
            fieldClassName="lg:w-[150px]"
          />
        </ConsoleFilterBar>
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={6} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : grants.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={activeFilterCount > 0 ? "No matching grants" : "No grants yet"}
            description={
              activeFilterCount > 0
                ? "Nothing matches this filter."
                : "Record the first input grant."
            }
            actionLabel={activeFilterCount > 0 ? undefined : "New grant"}
            onAction={
              activeFilterCount > 0 ? undefined : () => router.push(`${LIST}/new`)
            }
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IGrant>
            columns={columns}
            data={grants}
            itemNoun="grants"
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(g) => `${LIST}/${g.id}`}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
