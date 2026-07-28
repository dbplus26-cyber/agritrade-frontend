"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ConsoleDateField,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import { useGetApprovalsQuery } from "@/redux/approvals/approvals-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { cn } from "@/lib/utils";
import {
  ApprovalAction,
  ApprovalStatus,
  type IApproval,
  type IApprovalListQuery,
} from "@/types/approval.types";
import { Absent } from "@/components/admin/registry/registry-bits";
import {
  ACTION_LABEL,
  ActionBadge,
  ApprovalStatusBadge,
  approvalStamp,
  MetaRow,
  MetaStrip,
  ModuleValue,
  stencilCls,
  summaryLine,
  waitingFor,
} from "./approval-bits";
import { DecideDialog, type Decision } from "./decide-dialog";

const FILTER_DEFAULTS = {
  status: ApprovalStatus.PENDING as string,
  action: "all",
  from: "",
  to: "",
};

/** Every action the engine knows is filterable - derived from ACTION_LABEL
 * so a new backend action can never be missing from the filter. */
const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "All actions" },
  ...Object.values(ApprovalAction).map((action) => ({
    value: action as string,
    label: ACTION_LABEL[action],
  })),
];

const PAGE_SIZE = 10;

/**
 * /admin/approvals - the owner's inbox, designed to be workable from a
 * phone: stacked decision cards, big touch targets, the whole story on the
 * card (what, from which module, who asked, who decided, when). Approving
 * applies the underlying change in the same server transaction; rejecting
 * never undoes anything by itself.
 */
export function ApprovalsInbox() {
  const {
    page,
    filters,
    search: searchInput,
    setSearch,
    setFilter,
    setPage,
    resetFilters,
    queryParams,
  } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });
  const [decision, setDecision] = useState<Decision>(null);
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<IApprovalListQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      status: filters.status as ApprovalStatus,
      ...(filters.action !== "all"
        ? { action: filters.action as ApprovalAction }
        : {}),
      ...(search ? { search } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    }),
    [page, filters, search],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetApprovalsQuery(queryArgs);
  const approvals = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const isPendingView = filters.status === ApprovalStatus.PENDING;

  return (
    <div>
      <div className="mb-3.5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Approvals
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Decisions waiting on you - approving applies the change, rejecting
          leaves everything as it stands
        </p>
      </div>

      {/* Status tabs - the inbox default is what needs deciding. */}
      <div className="mb-4 flex gap-1.5">
        {(
          [
            [ApprovalStatus.PENDING, "Pending"],
            [ApprovalStatus.APPROVED, "Approved"],
            [ApprovalStatus.REJECTED, "Rejected"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setFilter("status", value);
              setPage(1);
            }}
            aria-pressed={filters.status === value}
            className={cn(
              "cursor-pointer rounded-[2px] border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              filters.status === value
                ? "border-console bg-console text-white"
                : "border-soil/30 bg-paper text-soil hover:border-console/60",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <ConsoleFilterBar
        search={searchInput}
        onSearch={setSearch}
        searchPlaceholder="Search commodity, amount, note…"
        activeCount={
          (filters.action !== "all" ? 1 : 0) +
          (filters.from ? 1 : 0) +
          (filters.to ? 1 : 0)
        }
        onClear={resetFilters}
      >
        <ConsoleLabeledSelect
          label="Action"
          value={filters.action}
          onChange={(v) => setFilter("action", v)}
          options={ACTION_FILTER_OPTIONS}
          active={filters.action !== "all"}
          className="lg:w-[210px]"
        />
        <ConsoleDateField
          label="From"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(v) => setFilter("from", v)}
          className="lg:w-[150px]"
        />
        <ConsoleDateField
          label="To"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(v) => setFilter("to", v)}
          className="lg:w-[150px]"
        />
      </ConsoleFilterBar>

      {isLoading ? (
        <DataTableSkeleton />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : approvals.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            title={isPendingView ? "Nothing waiting" : "Nothing on file"}
            description={
              isPendingView
                ? "Requests land here the moment something needs your sign-off."
                : "Decided requests appear here with who decided and why."
            }
          />
        </AdminCard>
      ) : (
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {approvals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                onDecide={(kind) => setDecision({ approval, kind })}
              />
            ))}
          </div>
          <ListPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-4"
          />
        </>
      )}

      <DecideDialog decision={decision} onClose={() => setDecision(null)} />
    </div>
  );
}

/**
 * One decision card. Every card has the same five fixed zones so the grid
 * reads as one system: header (action badge + timestamp), title block
 * (headline + detail, min-height reserved), meta strip (From / Requested by
 * / Decided by - always the same three rows), the decider's note when there
 * is one, and a footer pinned to the bottom edge (decide buttons on pending,
 * status badge + Details on decided).
 */
function ApprovalCard({
  approval,
  onDecide,
}: {
  approval: IApproval;
  onDecide: (kind: "approve" | "reject") => void;
}) {
  const { headline, detail } = summaryLine(approval.action, approval.summary);
  const pending = approval.status === ApprovalStatus.PENDING;
  // The decided-at stamp, or null while the request is still pending.
  const decidedAt = !pending ? approval.decidedAt : null;

  return (
    <AdminCard className="flex h-full flex-col p-4">
      {/* 1. Header: what kind of request, and when it arrived. Wraps on
          ultra-narrow cards - the stamp drops under the badge, still right. */}
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
        <ActionBadge action={approval.action} />
        <div className="ml-auto flex-none text-right">
          <div className="font-adminmono text-[11.5px] tabular-nums text-soil">
            {approvalStamp(approval.createdAt)}
          </div>
          {pending ? (
            <div className="text-[11px] italic text-soil/70">
              {waitingFor(approval.createdAt)}
            </div>
          ) : null}
        </div>
      </div>

      {/* 2. Title: the figure that matters, then the one-line story.
          min-height reserves the detail line so grid rows stay level. */}
      <div className="mt-3 min-h-[44px]">
        <div className="font-adminmono text-[18px] leading-tight font-bold text-ink [overflow-wrap:anywhere]">
          {headline}
        </div>
        {detail ? (
          <div className="mt-0.5 text-[13px] leading-[1.5] text-soil [overflow-wrap:anywhere]">
            {detail}
          </div>
        ) : null}
      </div>

      {/* 3. Meta strip: the accountability trail, identical on every card. */}
      <MetaStrip className="mt-3">
        <MetaRow label="From">
          <ModuleValue
            entityType={approval.entityType}
            entityId={approval.entityId}
          />
        </MetaRow>
        <MetaRow label="Requested by">
          {approval.requestedBy?.name ?? "Unknown"}
        </MetaRow>
        <MetaRow label="Decided by">
          {decidedAt ? (
            <>
              {approval.decidedBy?.name ?? "Unknown"}
              <span className="text-soil"> · {approvalStamp(decidedAt)}</span>
            </>
          ) : (
            <Absent />
          )}
        </MetaRow>
      </MetaStrip>

      {/* 4. Note - only when someone wrote one. */}
      {approval.note ? (
        <div className="mt-3 border-l-2 border-soil/40 pl-2.5">
          <div className={stencilCls}>
            {pending ? "Note" : "Decider's note"}
          </div>
          <div className="text-[13px] italic text-soil [overflow-wrap:anywhere]">
            {approval.note}
          </div>
        </div>
      ) : null}

      {/* 5. Footer, pinned to the bottom so actions align across cards. */}
      <div className="mt-auto flex items-center gap-2 pt-3.5">
        {pending ? (
          <>
            <Link
              href={`/admin/approvals/${approval.id}`}
              className="flex-none text-[12px] font-semibold whitespace-nowrap text-console underline-offset-2 hover:underline"
            >
              Details
            </Link>
            <div className="flex min-w-0 flex-1 justify-end gap-2">
              <Button
                variant="harvest"
                className="h-9 flex-1 sm:flex-none sm:px-5"
                onClick={() => onDecide("approve")}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                className="h-9 flex-1 text-console-red hover:text-console-red sm:flex-none sm:px-5"
                onClick={() => onDecide("reject")}
              >
                Reject
              </Button>
            </div>
          </>
        ) : (
          <>
            <ApprovalStatusBadge status={approval.status} />
            <Link
              href={`/admin/approvals/${approval.id}`}
              className="ml-auto text-[12px] font-semibold whitespace-nowrap text-console underline-offset-2 hover:underline"
            >
              Details
            </Link>
          </>
        )}
      </div>
    </AdminCard>
  );
}
