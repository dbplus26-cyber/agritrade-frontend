"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { HelpWrap } from "@/components/admin/help-tip";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { TitleCell } from "@/components/admin/table-cells";
import { AdminButton, AdminCard, Mono, ToneBadge } from "@/components/admin/ui";
import { Money } from "@/components/admin/trading/sale-bits";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { useGetRepaymentsQuery } from "@/redux/farm/repayments-api";
import { useGetSeasonsQuery } from "@/redux/farm/seasons-api";
import type { IRepayment, IRepaymentListQuery } from "@/types/farm.types";
import { RepaymentSettlement } from "./farm-cash-source";

const LIST = "/admin/repayments";
const FILTER_DEFAULTS = { season: "all", from: "", to: "", size: "10" };

export function RepaymentsRegister() {
  const router = useRouter();
  const { page, filters, setFilter, setPage, resetFilters } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });

  const pageSize = Number(filters.size) || 10;
  const { season, from, to } = filters;
  const seasons = useGetSeasonsQuery({ limit: 100 });

  const queryArgs = useMemo<IRepaymentListQuery>(
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
    useGetRepaymentsQuery(queryArgs);
  const repayments = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (season !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading &&
    !isError &&
    repayments.length === 0 &&
    activeFilterCount === 0;

  const seasonOptions = useMemo(
    () => [
      { label: "All seasons", value: "all" },
      ...(seasons.data?.data ?? []).map((s) => ({ label: s.name, value: s.id })),
    ],
    [seasons.data],
  );

  const columns = useMemo<ColumnDef<IRepayment, unknown>[]>(
    () => [
      {
        id: "transactionNo",
        header: "Receipt #",
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
        // The season sits under the farmer rather than holding its own
        // column: context for the row, not something anybody scans down.
        cell: ({ row }) => (
          <TitleCell
            href={`${LIST}/${row.original.id}`}
            meta={row.original.season.name}
            stretch
            title={row.original.farmer.name}
          />
        ),
      },
      {
        // Not "Produce" any more: a farmer who had a bad season settles in
        // money, and a column that can only name a crop had nowhere to put
        // them - it printed a null or a zero weight, which reads as a farmer
        // who handed over nothing.
        id: "repaidIn",
        header: columnHelp(
          "Repaid in",
          "What the farmer handed back: grain, with its weight, or money and the account it landed in.",
        ),
        enableSorting: false,
        meta: columnMeta({ at: "lg" }),
        cell: ({ row }) => (
          <RepaymentSettlement
            commodity={row.original.commodity}
            kind={row.original.kind}
            paymentAccount={row.original.paymentAccount}
            weightKg={row.original.weightKg}
          />
        ),
      },
      {
        id: "value",
        header: columnHelp(
          "Value",
          "What this repayment was credited at, which is how much it takes off what the farmer owes - the same figure whichever way they settled.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-console">
            <Money value={row.original.valueGhs} />
          </Mono>
        ),
      },
      {
        id: "received",
        header: columnHelp(
          "Received",
          "The day the produce or the money actually came in, not the day it was typed in here.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateTimeCell value={row.original.receivedAt} />,
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
        id: "stock",
        header: "",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) =>
          row.original.intoStock ? (
            <HelpWrap text="This produce was added to warehouse stock, not just credited against the grant.">
              <ToneBadge tone="sky">Into stock</ToneBadge>
            </HelpWrap>
          ) : null,
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            Repayments
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            What farmers have paid back on their grants, in produce or in cash
          </p>
        </div>
        {<AdminButton asChild>
              <Link href={`${LIST}/new`}>+ Record repayment</Link>
            </AdminButton>}
      </div>

      {pristine || (isError && activeFilterCount === 0) ? null : (
        <ConsoleFilterBar
          activeCount={activeFilterCount}
          onClear={resetFilters}
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
      ) : repayments.length === 0 ? (
        <RegisterEmpty
          filtered={activeFilterCount > 0}
          noun="repayments"
          description="Record what a farmer has paid back against a grant."
          filteredDescription="Nothing matches this filter."
          actionLabel="Record repayment"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={resetFilters}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IRepayment>
            columns={columns}
            data={repayments}
            itemNoun="repayments"
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(r) => `${LIST}/${r.id}`}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
