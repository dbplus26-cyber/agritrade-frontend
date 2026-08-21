"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { CalendarClock, Plus } from "lucide-react";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { TextCell, TitleCell } from "@/components/admin/table-cells";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  Mono,
} from "@/components/admin/ui";
import { Money } from "@/components/admin/trading/sale-bits";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { useGetGrantsQuery } from "@/redux/farm/grants-api";
import { useGetSeasonsQuery } from "@/redux/farm/seasons-api";
import type { IGrant, IGrantListQuery } from "@/types/farm.types";
import { GrantApprovalBadge } from "./farm-bits";
import { FarmCashSourceNote } from "./farm-cash-source";

const LIST = "/admin/grants";
const FILTER_DEFAULTS = { season: "all", from: "", to: "", size: "10" };

export function GrantsRegister() {
  const router = useRouter();
  const {
    page,
    search: searchInput,
    filters,
    setSearch,
    setFilter,
    setPage,
    resetFilters,
    queryParams,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });

  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";
  const { season, from, to } = filters;
  const seasons = useGetSeasonsQuery({ limit: 100 });

  const queryArgs = useMemo<IGrantListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(season !== "all" ? { seasonId: season } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, pageSize, search, season, from, to],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetGrantsQuery(queryArgs);
  const grants = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (season !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  // A register with nothing on file and nothing narrowing it shows ONLY the
  // empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading &&
    !isError &&
    grants.length === 0 &&
    !search &&
    activeFilterCount === 0;

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
          <Mono className="whitespace-nowrap text-adm-ink">
            {row.original.transactionNo}
          </Mono>
        ),
      },
      {
        id: "farmer",
        header: "Farmer",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        // The season rides under the farmer's name rather than holding a
        // column of its own: it is context for the row, not a fact anybody
        // scans down, and season names here run long enough to have been one
        // of the columns forcing this table off the side of the screen.
        cell: ({ row }) => (
          <TitleCell
            href={`${LIST}/${row.original.id}`}
            meta={row.original.season.name}
            title={row.original.farmer.name}
            stretch
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
        header: columnHelp(
          "Value",
          "What these inputs were worth in cash, which is what the farmer owes back.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-ink">
            <Money value={row.original.valueGhs} />
          </Mono>
        ),
      },
      {
        // A register that shows an amount and stays silent about where it came
        // from reproduces the bug this column exists to close, one row at a
        // time: the value was always counted as spent, and nothing on the page
        // said out of what.
        id: "fundedFrom",
        header: columnHelp(
          "Funded from",
          "The account that paid for these inputs - or, when no company money moved, why not.",
        ),
        enableSorting: false,
        meta: columnMeta({ at: "lg" }),
        cell: ({ row }) => (
          <FarmCashSourceNote
            account={row.original.paymentAccount}
            reason={row.original.noCashReason}
          />
        ),
      },
      {
        id: "granted",
        header: columnHelp(
          "Granted",
          "The day the farmer actually took the inputs, not the day it was typed in here.",
        ),
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
      <AdminPageHeader
        title="Input grants"
        sub="Inputs given to farmers, carrying the cash value owed"
      />

      {pristine || (isError && !search && activeFilterCount === 0) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search farmer, item, grant no., notes…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={totalCount}
          noun="grants"
          action={
            <>
              <AdminButton asChild variant="ghost" aria-label="Aging">
                <Link href={`${LIST}/aging`}>
                  <CalendarClock className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Aging</span>
                </Link>
              </AdminButton>
              <AdminButton asChild aria-label="New grant">
                <Link href={`${LIST}/new`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">New grant</span>
                </Link>
              </AdminButton>
            </>
          }
          chips={
            <>
              {season !== "all" ? (
                <FilterChip onRemove={() => setFilter("season", "all")}>
                  Season: {labelOf(seasonOptions, season)}
                </FilterChip>
              ) : null}
              {from ? (
                <FilterChip onRemove={() => setFilter("from", "")}>
                  From: {from}
                </FilterChip>
              ) : null}
              {to ? (
                <FilterChip onRemove={() => setFilter("to", "")}>
                  To: {to}
                </FilterChip>
              ) : null}
            </>
          }
        >
          <ConsoleLabeledSelect
            label="Season"
            value={season}
            onChange={(v) => setFilter("season", v)}
            options={seasonOptions}
            active={season !== "all"}
          />
          <ConsoleDateRange
            from={from}
            to={to}
            onFromChange={(v) => setFilter("from", v)}
            onToChange={(v) => setFilter("to", v)}
          />
        </ConsoleFilterBar>
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={7} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : grants.length === 0 ? (
        <RegisterEmpty
          filtered={Boolean(search) || activeFilterCount > 0}
          noun="grants"
          description="Record the first input grant."
          filteredDescription="Nothing matches this filter."
          actionLabel="New grant"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
