"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard } from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetStockMovementsQuery } from "@/redux/stock/stock-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { columnMeta, Absent } from "@/components/admin/registry/registry-bits";
import { TextCell, TitleCell } from "@/components/admin/table-cells";
import { DateTimeCell } from "@/components/admin/date-cell";
import type {
  IStockMovement,
  IStockMovementsQuery,
  StockMoveType,
} from "@/types/stock.types";
import { MOVE_TYPE_FILTER_OPTIONS, MoveTypeBadge, SignedKg } from "./stock-bits";

const FILTER_DEFAULTS = {
  type: "all",
  warehouse: "all",
  commodity: "all",
  from: "",
  to: "",
  size: "20",
};

/** The append-only movements ledger behind the Stock screen's toggle. */
export function StockMovements({
  warehouseOptions,
  commodityOptions,
}: {
  warehouseOptions: readonly { value: string; label: string }[];
  commodityOptions: readonly { value: string; label: string }[];
}) {
  const { page, filters, setFilter, setPage, resetFilters } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });
  const pageSize = Number(filters.size) || 20;

  const queryArgs = useMemo<IStockMovementsQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(filters.type !== "all"
        ? { type: filters.type as StockMoveType }
        : {}),
      ...(filters.warehouse !== "all" ? { warehouseId: filters.warehouse } : {}),
      ...(filters.commodity !== "all" ? { commodityId: filters.commodity } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    }),
    [page, pageSize, filters],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetStockMovementsQuery(queryArgs);
  const movements = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (filters.type !== "all" ? 1 : 0) +
    (filters.warehouse !== "all" ? 1 : 0) +
    (filters.commodity !== "all" ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0);

  const columns = useMemo<ColumnDef<IStockMovement, unknown>[]>(
    () => [
      {
        id: "entry",
        header: columnHelp(
          "Entry",
          "One line of the stock ledger: which commodity moved, and at which warehouse.",
        ),
        enableSorting: false,
        meta: columnMeta({ className: "py-2", stretch: true }),
        // Commodity leads, its warehouse sits underneath as the quiet second
        // line - the register convention. The two used to run together on one
        // unbounded line, so a long commodity name and a long warehouse name
        // between them decided how wide this table got.
        cell: ({ row }) => (
          <TitleCell
            meta={row.original.warehouse.name}
            stretch
            title={row.original.commodity.name}
          />
        ),
      },
      {
        id: "type",
        header: "Type",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <MoveTypeBadge type={row.original.type} />,
      },
      {
        id: "delta",
        header: columnHelp(
          "Change",
          "How much weight this line added to the warehouse or took out of it.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <SignedKg kg={row.original.deltaKg} />,
      },
      {
        id: "when",
        header: "When",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateTimeCell value={row.original.occurredAt} />,
      },
      {
        id: "reason",
        header: columnHelp(
          "Reason / source",
          "Why the weight moved, or the record it came from, such as the purchase it was received against.",
        ),
        enableSorting: false,
        // A secondary column, hidden below xl - so it keeps a fixed cap rather
        // than a share. Only the always-visible primary column stretches.
        meta: columnMeta({ at: "xl" }),
        cell: ({ row }) =>
          row.original.reason ? (
            <TextCell
              className="text-adm-muted"
              value={row.original.reason}
              width="prose"
            />
          ) : row.original.purchaseId ? (
            <Link
              href={`/admin/purchases/${row.original.purchaseId}`}
              className="text-console underline-offset-2 hover:underline"
            >
              View purchase
            </Link>
          ) : (
            <Absent />
          ),
      },
    ],
    [],
  );

  return (
    <div>
      <ConsoleFilterBar
        search=""
        onSearch={() => undefined}
        hideSearch
        activeCount={activeFilterCount}
        onClear={resetFilters}
      >
        <ConsoleLabeledSelect
          label="Type"
          value={filters.type}
          onChange={(v) => setFilter("type", v)}
          options={MOVE_TYPE_FILTER_OPTIONS}
          active={filters.type !== "all"}
        />
        <ConsoleLabeledSelect
          label="Warehouse"
          value={filters.warehouse}
          onChange={(v) => setFilter("warehouse", v)}
          options={warehouseOptions}
          active={filters.warehouse !== "all"}
        />
        <ConsoleLabeledSelect
          label="Commodity"
          value={filters.commodity}
          onChange={(v) => setFilter("commodity", v)}
          options={commodityOptions}
          active={filters.commodity !== "all"}
        />
        <ConsoleDateRange
          from={filters.from}
          to={filters.to}
          onFromChange={(v) => setFilter("from", v)}
          onToChange={(v) => setFilter("to", v)}
          fieldClassName="lg:w-[150px]"
        />
      </ConsoleFilterBar>

      {isLoading ? (
        <ConsoleTableSkeleton columns={6} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : movements.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            title="No movements on file"
            description="Every receipt, load and approved adjustment lands here as a ledger line."
          />
        </AdminCard>
      ) : (
        // On a card, like every other register - and like this screen's own
        // empty state, which was already carded while the table beside it was
        // not. The rows sat directly on the page background with no sheet
        // under them, which is why this tab did not look like the rest.
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable
            columns={columns}
            data={movements}
            itemNoun="movements"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
          />
        </AdminCard>
      )}
    </div>
  );
}
