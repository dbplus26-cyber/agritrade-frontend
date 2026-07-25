"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ConsoleDateField,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, Mono } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { useGetShipmentsQuery } from "@/redux/shipments/shipments-api";
import type {
  IShipmentListQuery,
  ShipmentStatus,
} from "@/types/admin-shipment.types";
import {
  CostBasisBadge,
  SHIPMENT_STATUS_FILTER_OPTIONS,
  ShipmentStatusBadge,
  formatShipmentDate,
} from "./shipment-bits";

const LIST = "/admin/shipments";
const FILTER_DEFAULTS = { status: "all", from: "", to: "", size: "12" };

export function ShipmentsRegister() {
  const {
    page,
    setPage,
    filters,
    setFilter,
    resetFilters,
    search: searchInput,
    setSearch,
    queryParams,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });

  const search = (queryParams.search as string | undefined) ?? "";
  const { status, from, to } = filters;
  const pageSize = Number(filters.size) || 12;

  const queryArgs = useMemo<IShipmentListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(status !== "all" ? { status: status as ShipmentStatus } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, pageSize, search, status, from, to],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetShipmentsQuery(queryArgs);
  const shipments = data?.data ?? [];
  const meta = data?.meta;
  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Shipments
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Trucks moving goods from warehouses to buyers
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search truck, driver, buyer…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ Plan shipment</Link>
            </Button>
          }
        >
          <ConsoleDateField
            label="From"
            value={from}
            max={to || undefined}
            onChange={(v) => setFilter("from", v)}
            className="lg:w-[150px]"
          />
          <ConsoleDateField
            label="To"
            value={to}
            min={from || undefined}
            onChange={(v) => setFilter("to", v)}
            className="lg:w-[150px]"
          />
          <ConsoleLabeledSelect
            label="Status"
            value={status}
            onChange={(v) => setFilter("status", v)}
            options={SHIPMENT_STATUS_FILTER_OPTIONS}
            active={status !== "all"}
            className="lg:w-[170px]"
          />
        </ConsoleFilterBar>
      )}

      {isLoading ? (
        <DataTableSkeleton />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : shipments.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={
              search || activeFilterCount > 0
                ? "No matching shipments"
                : "No shipments yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Nothing matches this search and filter combination."
                : "Plan the first truck against a confirmed sale."
            }
            actionLabel={
              search || activeFilterCount > 0 ? undefined : "Plan a shipment"
            }
          />
        </AdminCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shipments.map((sh) => (
            <Link
              key={sh.id}
              href={`${LIST}/${sh.id}`}
              className="rounded-[8px] border border-soil/25 bg-paper px-4 py-[15px] hover:border-soil/35"
            >
              <div className="mb-[7px] flex items-center justify-between gap-2.5">
                <Mono className="text-[13px] font-semibold text-console">
                  {sh.truckReg}
                </Mono>
                <ShipmentStatusBadge status={sh.status} />
              </div>
              <div className="text-[14.5px] font-semibold text-ink">
                {sh.originWarehouse.name} → {sh.destination}
              </div>
              <div className="mt-[3px] text-[12.5px] text-soil">
                {sh.sale.buyer.name}
                {sh.totalWeightKg > 0 ? ` · ${formatKg(sh.totalWeightKg)}` : ""}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[12px] text-soil/70">
                  {sh.departedAt
                    ? `Departed ${formatShipmentDate(sh.departedAt)}`
                    : `Planned ${formatShipmentDate(sh.createdAt)}`}
                </span>
                <CostBasisBadge basis={sh.costBasis} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {meta && meta.totalPages > 1 ? (
        <div className="mt-4">
          <ListPagination
            page={page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </div>
  );
}
