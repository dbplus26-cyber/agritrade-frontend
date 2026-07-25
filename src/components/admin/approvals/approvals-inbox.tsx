"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ConsoleDateField,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, AdminField, adminInputClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import {
  useApproveApprovalMutation,
  useGetApprovalsQuery,
  useRejectApprovalMutation,
} from "@/redux/approvals/approvals-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  ApprovalAction,
  ApprovalStatus,
  type IApproval,
  type IApprovalListQuery,
} from "@/types/approval.types";
import {
  approveFormSchema,
  rejectFormSchema,
  type RejectFormValues,
} from "@/validations/approval-schema";
import { formatConsoleDate } from "@/components/admin/purchases/purchase-bits";
import {
  ActionBadge,
  ApprovalStatusBadge,
  summaryLine,
} from "./approval-bits";

const FILTER_DEFAULTS = {
  status: ApprovalStatus.PENDING as string,
  action: "all",
  from: "",
  to: "",
};

const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: ApprovalAction.PURCHASE_ABOVE_THRESHOLD, label: "Purchases" },
  { value: ApprovalAction.STOCK_ADJUSTMENT, label: "Stock adjustments" },
  { value: ApprovalAction.PUBLISH_TO_WEBSITE, label: "Publishing" },
] as const;

const PAGE_SIZE = 10;

type Decision = { approval: IApproval; kind: "approve" | "reject" } | null;

/**
 * /admin/approvals - the owner's inbox, designed to be workable from a
 * phone: stacked decision cards, big touch targets, the whole story on the
 * card (what, how much, who asked, when). Approving applies the underlying
 * change in the same server transaction; rejecting never undoes anything by
 * itself.
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
          className="lg:w-[190px]"
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

/** One decision card - the whole story, workable with a thumb. */
function ApprovalCard({
  approval,
  onDecide,
}: {
  approval: IApproval;
  onDecide: (kind: "approve" | "reject") => void;
}) {
  const { headline, detail } = summaryLine(approval.action, approval.summary);
  const isPurchase = approval.entityType === "Purchase";
  const pending = approval.status === ApprovalStatus.PENDING;

  return (
    <AdminCard className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ActionBadge action={approval.action} />
        {!pending ? <ApprovalStatusBadge status={approval.status} /> : null}
        <span className="ml-auto whitespace-nowrap text-[12px] text-soil">
          {formatConsoleDate(approval.createdAt)}
        </span>
      </div>

      <div className="font-adminmono mt-2.5 text-[19px] font-bold text-ink">
        {headline}
      </div>
      {detail ? (
        <div className="mt-0.5 text-[13px] leading-[1.5] text-soil">
          {detail}
        </div>
      ) : null}

      {isPurchase ? (
        <Link
          href={`/admin/purchases/${approval.entityId}`}
          className="mt-1.5 inline-block text-[13px] font-semibold text-console underline-offset-2 hover:underline"
        >
          View the purchase →
        </Link>
      ) : null}

      {approval.note ? (
        <div className="mt-2.5 border-l-2 border-soil/40 pl-2.5 text-[13px] italic text-soil">
          {approval.note}
        </div>
      ) : null}

      {pending ? (
        <div className="mt-3.5 flex gap-2">
          <Button
            variant="harvest"
            className="h-9 flex-1 sm:flex-none sm:px-6"
            onClick={() => onDecide("approve")}
          >
            Approve
          </Button>
          <Button
            variant="outline"
            className="h-9 flex-1 text-console-red hover:text-console-red sm:flex-none sm:px-6"
            onClick={() => onDecide("reject")}
          >
            Reject
          </Button>
        </div>
      ) : approval.decidedAt ? (
        <div className="mt-2.5 text-[12px] text-soil">
          Decided {formatConsoleDate(approval.decidedAt)}
        </div>
      ) : null}
    </AdminCard>
  );
}

/** Approve (note optional) / reject (note required) in one dialog. */
function DecideDialog({
  decision,
  onClose,
}: {
  decision: Decision;
  onClose: () => void;
}) {
  const [approve, { isLoading: approving }] = useApproveApprovalMutation();
  const [reject, { isLoading: rejecting }] = useRejectApprovalMutation();
  const isReject = decision?.kind === "reject";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectFormValues>({
    resolver: zodResolver(isReject ? rejectFormSchema : approveFormSchema),
    values: { note: "" },
  });

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!decision) return;
    const note = values.note.trim() || undefined;
    try {
      if (isReject) {
        await reject({ id: decision.approval.id, note: values.note }).unwrap();
        notify.success("Request rejected");
      } else {
        await approve({ id: decision.approval.id, note }).unwrap();
        notify.success("Approved and applied");
      }
      close();
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  });

  const summary = decision
    ? summaryLine(decision.approval.action, decision.approval.summary)
    : null;

  return (
    <Dialog open={decision !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>
            {isReject ? "Reject this request?" : "Approve this request?"}
          </DialogTitle>
          <DialogDescription>
            {summary ? `${summary.headline}. ` : ""}
            {isReject
              ? "Rejection does not undo anything by itself - a flagged purchase stays recorded until you void it."
              : "Approving applies the change immediately and is written to the audit trail."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3.5">
          <AdminField
            label={isReject ? "Why (required)" : "Note (optional)"}
            error={errors.note?.message}
          >
            <textarea
              rows={3}
              placeholder={
                isReject
                  ? "The requester sees this - say what should happen instead"
                  : "Any context for the audit trail"
              }
              className={cn(adminInputClass, "h-auto py-2 leading-[1.5]")}
              {...register("note")}
            />
          </AdminField>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isReject ? "outline" : "harvest"}
              className={cn("h-9", isReject && "text-console-red hover:text-console-red")}
              disabled={approving || rejecting}
            >
              {approving || rejecting
                ? "Working…"
                : isReject
                  ? "Reject request"
                  : "Approve and apply"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
