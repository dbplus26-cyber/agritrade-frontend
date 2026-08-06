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
import { RecordCardGridSkeleton } from "@/components/admin/skeletons";
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
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Shipments
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Trucks loaded against confirmed sales, from warehouse to buyer
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
        <RecordCardGridSkeleton cards={6} />
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
        // Container columns, not viewport ones: this grid sits inside the
        // console shell, where a viewport `md:` fires while the content area
        // is still one column wide.
        <div className="grid gap-3 @2xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {shipments.map((sh) => {
            const buyers =
              sh.sales.length === 1
                ? (sh.sales[0]?.buyer.name ?? "")
                : sh.sales.map((sale) => sale.buyer.name).join(", ");
            return (
              /* FOUR ZONES, separated by space rather than run together.
                 This card used to join the sale count, every buyer's name and
                 the weight into one muted `·` string and clamp it - three
                 unrelated facts read as one sentence, which is what made it
                 feel crowded. The load figures are their own line now, the
                 buyers are theirs, and the footer carries the date. Reads the
                 way the reviews card does: subject on the left, meta on the
                 right, and room between the zones. */
              <Link
                key={sh.id}
                href={`${LIST}/${sh.id}`}
                className="flex h-full flex-col rounded-[6px] border border-adm-line bg-adm-card p-4 shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-colors hover:border-adm-strong"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <Mono className="text-[12px] text-adm-muted">
                    {sh.truckReg}
                  </Mono>
                  <span className="flex-none">
                    <ShipmentStatusBadge status={sh.status} />
                  </span>
                </div>

                <div className="mt-2 line-clamp-2 text-[15px] leading-[1.35] font-semibold text-adm-ink [overflow-wrap:anywhere]">
                  {sh.originWarehouse.name} → {sh.destination}
                </div>

                {buyers ? (
                  <div className="mt-1.5 line-clamp-2 min-w-0 text-[13px] leading-[1.5] text-adm-body [overflow-wrap:anywhere]">
                    {buyers}
                  </div>
                ) : null}

                <div className="mt-auto pt-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-dotted border-adm-line pt-3">
                    <Mono className="text-[12.5px] font-semibold text-adm-ink">
                      {sh.totalWeightKg > 0 ? formatKg(sh.totalWeightKg) : "-"}
                    </Mono>
                    <span className="text-[12.5px] text-adm-muted">
                      {sh.salesCount} sale{sh.salesCount === 1 ? "" : "s"}
                    </span>
                    <span className="ml-auto text-[12px] whitespace-nowrap text-adm-faint">
                      {sh.departedAt
                        ? `Departed ${formatShipmentDate(sh.departedAt)}`
                        : `Planned ${formatShipmentDate(sh.createdAt)}`}
                    </span>
                  </div>
                  {/* Renders only for an ESTIMATED basis, so it is an
                      exception worth seeing rather than a permanent tag. */}
                  <div className="empty:hidden mt-2">
                    <CostBasisBadge basis={sh.costBasis} />
                  </div>
                </div>
              </Link>
            );
          })}
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
