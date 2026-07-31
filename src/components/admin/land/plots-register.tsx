"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, Mono, ToneBadge } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { RecordCardGridSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetPlotsQuery } from "@/redux/land/land-plots-api";
import type { ILandPlotListQuery, PlotStatus } from "@/types/land.types";
import { Money } from "@/components/admin/trading/sale-bits";
import {
  PLOT_STATUS_FILTER_OPTIONS,
  PlotStatusBadge,
} from "./land-bits";

const LIST = "/admin/plots";
const FILTER_DEFAULTS = { status: "all", size: "12" };

export function PlotsRegister() {
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
  const { status } = filters;
  const pageSize = Number(filters.size) || 12;

  const queryArgs = useMemo<ILandPlotListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(status !== "all" ? { status: status as PlotStatus } : {}),
    }),
    [page, pageSize, search, status],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetPlotsQuery(queryArgs);
  const plots = data?.data ?? [];
  const meta = data?.meta;
  const activeFilterCount = status !== "all" ? 1 : 0;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Land plots
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Every plot the business holds - photos, title documents and what is
          published to the website
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search reference, location…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ Add plot</Link>
            </Button>
          }
        >
          <ConsoleLabeledSelect
            label="Status"
            value={status}
            onChange={(v) => setFilter("status", v)}
            options={PLOT_STATUS_FILTER_OPTIONS}
            active={status !== "all"}
            className="lg:w-[160px]"
          />
        </ConsoleFilterBar>
      )}

      {isLoading ? (
        <RecordCardGridSkeleton cards={6} media />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : plots.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={
              search || activeFilterCount > 0
                ? "No matching plots"
                : "No plots yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Nothing matches this search and filter combination."
                : "Add the first plot to the register."
            }
          />
        </AdminCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {plots.map((p) => (
            <Link
              key={p.id}
              href={`${LIST}/${p.id}`}
              // Squared off and 1.5px-bordered to match AdminCard, which every other
              // surface in the console uses. These were the only rounded cards.
              className="shadow-doc-sm overflow-hidden rounded-none border-[1.5px] border-soil/30 bg-paper transition-colors hover:border-soil/50"
            >
              {p.photos[0] ? (
                // eslint-disable-next-line @next/next/no-img-element -- Cloudinary
                <img
                  src={p.photos[0].url}
                  alt={p.photos[0].alt ?? p.locationText}
                  className="h-[130px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[130px] w-full items-center justify-center bg-surface-alt text-[12px] text-soil/60">
                  No photo
                </div>
              )}
              <div className="px-4 py-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Mono className="text-[12.5px] font-semibold text-console">
                    {p.reference}
                  </Mono>
                  <span className="flex items-center gap-1">
                    {p.publishToWebsite ? (
                      <ToneBadge tone="sky">Live</ToneBadge>
                    ) : null}
                    <PlotStatusBadge status={p.status} />
                  </span>
                </div>
                <div className="max-w-[22rem] truncate text-[14px] font-semibold text-ink">
                  {p.locationText}
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[12.5px] text-soil">
                  <span>
                    {p.sizeText}
                    {p.use ? ` · ${p.use}` : ""}
                  </span>
                  <Mono className="text-ink">
                    <Money value={p.askingPriceGhs} />
                  </Mono>
                </div>
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
