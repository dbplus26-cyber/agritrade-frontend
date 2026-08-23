"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { ConsoleFilterBar } from "@/components/admin/filter-bar";
import { adminLinkClass, AdminCard } from "@/components/admin/ui";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { TitleCell } from "@/components/admin/table-cells";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetSupplierHoldingsQuery } from "@/redux/stock/stock-api";
import { extractApiError } from "@/lib/extract-api-error";
import type { ISupplierHolding } from "@/types/stock.types";
import { Kg } from "./stock-bits";

/**
 * Goods the business owns that are in no shed: bought at the farm gate and
 * left where they stand for a truck to collect on its way to the buyer.
 *
 * They are deliberately absent from the balances table beside this one, which
 * counts what is on a warehouse floor. Without a screen of their own they
 * would be owned, paid for and invisible - the whole reason the previous way
 * of working booked them through a shed they never entered.
 */
export function SupplierHoldings({
  action,
  leading,
}: {
  /** The page's action ("Request adjustment"), shown in the toolbar. */
  action?: ReactNode;
  /** The page's section tabs, at the left of the toolbar row. */
  leading?: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetSupplierHoldingsQuery();

  const all = useMemo(() => data?.data ?? [], [data]);
  const term = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      term
        ? all.filter(
            (row) =>
              row.commodityName.toLowerCase().includes(term) ||
              row.supplierName.toLowerCase().includes(term),
          )
        : all,
    [all, term],
  );
  const totalKg = rows.reduce((sum, row) => sum + row.remainingKg, 0);
  const pristine = !isLoading && !isError && all.length === 0;

  const columns = useMemo<ColumnDef<ISupplierHolding, unknown>[]>(
    () => [
      {
        id: "holding",
        header: columnHelp(
          "Held at",
          "Whose yard the goods are standing in, and what they are.",
        ),
        enableSorting: false,
        meta: columnMeta({ className: "py-2", stretch: true }),
        cell: ({ row }) => (
          <TitleCell
            href={`/admin/suppliers/${row.original.supplierId}`}
            meta={row.original.commodityName}
            stretch
            title={row.original.supplierName}
          />
        ),
      },
      {
        id: "lots",
        header: columnHelp(
          "Consignments",
          "How many separate purchases make up this weight.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="text-[13px] text-adm-body">{row.original.lots}</span>
        ),
      },
      {
        id: "weight",
        header: columnHelp(
          "Waiting",
          "What is still there to collect, after anything already loaded out.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <Kg kg={row.original.remainingKg} />,
      },
    ],
    [],
  );

  return (
    <>
      {pristine ? (
        <ConsoleFilterBar hideSearch leading={leading} action={action} />
      ) : (
        <ConsoleFilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search supplier or commodity…"
          totalCount={rows.length}
          noun="holdings"
          action={action}
          leading={leading}
        />
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={3} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <RegisterEmpty
          filtered={Boolean(term)}
          noun="holdings"
          title="Nothing waiting at a supplier"
          description="Goods appear here when a purchase is received straight onto a truck instead of into a warehouse - they are yours from that moment, they just never enter a shed."
          filteredDescription="No holdings match this search."
          onClear={() => setSearch("")}
        />
      ) : (
        <>
          <ConsoleDataTable
            columns={columns}
            data={rows}
            itemNoun="holdings"
            isFetching={isFetching}
          />
          <AdminCard className="mt-3 px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                Waiting for collection
              </span>
              <Kg kg={totalKg} className="text-[16px] font-bold text-adm-ink" />
            </div>
            <p className="mt-1 text-[12px] leading-[1.45] text-adm-muted">
              Owned and paid for, in no warehouse. Put a trip&apos;s{" "}
              <Link className={adminLinkClass} href="/admin/shipments/new">
                collection points
              </Link>{" "}
              against these suppliers to load them straight to the buyer.
            </p>
          </AdminCard>
        </>
      )}
    </>
  );
}
