"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  type ExpandedState,
  getCoreRowModel,
  getExpandedRowModel,
  type RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { ListPagination } from "@/components/ui/ListPagination";
import {
  useApproveApprovalMutation,
  useGetApprovalsQuery,
  useRejectApprovalMutation,
} from "@/redux/approvals/approvals-api";
import { useConfirm } from "@/hooks/use-confirm";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  ApprovalAction,
  ApprovalStatus,
  type IApproval,
  type IApprovalListQuery,
} from "@/types/approval.types";
import { ACTION_LABEL } from "./approval-bits";
import { ApprovalsQueue } from "./approvals-queue";
import {
  ageLabel,
  apButton,
  apButtonBase,
  apButtonDanger,
  apButtonPrimary,
  APPROVAL_TOKENS,
  Chevron,
  headlineFigure,
  headlineSublabel,
  OUTCOME,
  OverageMeter,
  RuleBadge,
  shortName,
  subjectDetailLine,
} from "./queue-bits";
import { RejectNoteDialog } from "./reject-note-dialog";

const PAGE_SIZE = 10;

/**
 * How far above its limit an approval has to be before approving it asks a
 * second time. Anything over the base limit is by definition unusual - five
 * times over is the one that wants a beat of friction.
 */
const CONFIRM_MULTIPLE = 5;

const FILTER_DEFAULTS = {
  status: ApprovalStatus.PENDING as string,
  action: "all",
  from: "",
  to: "",
};

const ACTION_FILTER_OPTIONS = [
  { value: "all", label: "All actions" },
  ...Object.values(ApprovalAction).map((action) => ({
    value: action as string,
    label: ACTION_LABEL[action],
  })),
];

const TABS = [
  [ApprovalStatus.PENDING, "Pending"],
  [ApprovalStatus.APPROVED, "Approved"],
  [ApprovalStatus.REJECTED, "Rejected"],
] as const;

/**
 * /admin/approvals - the decision queue.
 *
 * The page's design tokens are scoped as `--ap-*` custom properties on the
 * wrapper below rather than added to globals.css: they are near-neighbours of
 * the console palette, not replacements for it, and every other screen must
 * stay exactly as it is.
 */
export function ApprovalsScreen() {
  const {
    page,
    filters,
    search: searchInput,
    setSearch,
    setFilter,
    setPage,
    resetFilters,
    queryParams,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });

  const search = (queryParams.search as string | undefined) ?? "";
  const status = filters.status as ApprovalStatus;
  const isPending = status === ApprovalStatus.PENDING;

  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [busyId, setBusyId] = useState<null | string>(null);
  const [rejecting, setRejecting] = useState<null | {
    approvals: IApproval[];
    subject: string;
  }>(null);
  /**
   * Rows this session has just decided. They stay in place showing their new
   * outcome until the refetch drops them, rather than being yanked out from
   * under the eye that was mid-read.
   */
  const [justDecided, setJustDecided] = useState<
    Record<string, ApprovalStatus>
  >({});

  const { confirm, confirmationDialog } = useConfirm();
  const [approve, { isLoading: approveBusy }] = useApproveApprovalMutation();
  const [reject, { isLoading: rejectBusy }] = useRejectApprovalMutation();

  const queryArgs = useMemo<IApprovalListQuery>(
    () => ({
      page,
      limit: PAGE_SIZE,
      status,
      ...(filters.action !== "all"
        ? { action: filters.action as ApprovalAction }
        : {}),
      ...(search ? { search } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    }),
    [page, status, filters.action, filters.from, filters.to, search],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetApprovalsQuery(queryArgs);
  const approvals = useMemo(() => data?.data ?? [], [data]);
  const totalPages = data?.meta.totalPages ?? 1;

  // Selection and expansion are per-list. Both are cleared whenever the list
  // underneath them changes identity.
  useEffect(() => {
    setRowSelection({});
    setExpanded({});
  }, [status]);

  const openReject = useCallback(
    (approval: IApproval) =>
      setRejecting({
        approvals: [approval],
        subject: describe(approval),
      }),
    [],
  );

  const runApprove = useCallback(
    async (approval: IApproval) => {
      setBusyId(approval.id);
      try {
        await approve({ id: approval.id }).unwrap();
        setJustDecided((prev) => ({
          ...prev,
          [approval.id]: ApprovalStatus.APPROVED,
        }));
        notify.success("Approved and applied");
      } catch (err) {
        notify.error(extractApiError(err).message);
      } finally {
        setBusyId(null);
      }
    },
    [approve],
  );

  const onApprove = useCallback(
    async (approval: IApproval) => {
      const far =
        approval.amount !== null &&
        approval.limit !== null &&
        approval.amount > approval.limit * CONFIRM_MULTIPLE;
      if (far) {
        const confirmed = await confirm({
          title: "Approve this one?",
          description: `${describe(approval)} is more than ${String(CONFIRM_MULTIPLE)} times the limit. Approving applies it immediately.`,
          confirmText: "Approve and apply",
        });
        if (!confirmed) return;
      }
      await runApprove(approval);
    },
    [confirm, runApprove],
  );

  const selected = useMemo(
    () => approvals.filter((a) => rowSelection[a.id]),
    [approvals, rowSelection],
  );

  /**
   * Bulk approve, one request at a time. There is no bulk endpoint, and each
   * decision is its own guarded transaction server-side - so the honest thing
   * is to report exactly which ones landed and which did not, never a blanket
   * "done" that hides a failure in the middle.
   */
  const onBulkApprove = async () => {
    const total = selected.reduce((sum, a) => sum + (a.amount ?? 0), 0);
    const anyHidden = selected.some(
      (a) => a.amount === null && a.quantityLabel === null,
    );
    const confirmed = await confirm({
      title: `Approve ${String(selected.length)} request${selected.length === 1 ? "" : "s"}?`,
      description: anyHidden
        ? "Approving applies every one of them immediately."
        : `Approving applies every one of them immediately, ${formatCedis(total)} in total.`,
      confirmText: "Approve all",
    });
    if (!confirmed) return;
    await runBulk(selected, (a) => approve({ id: a.id }).unwrap(), {
      outcome: ApprovalStatus.APPROVED,
      past: "Approved",
      present: "approve",
    });
  };

  const onBulkReject = () =>
    setRejecting({
      approvals: selected,
      subject: `${String(selected.length)} selected request${selected.length === 1 ? "" : "s"}`,
    });

  const runBulk = async (
    items: IApproval[],
    call: (approval: IApproval) => Promise<unknown>,
    verb: { outcome: ApprovalStatus; past: string; present: string },
  ) => {
    const failed: { name: string; reason: string }[] = [];
    const done: string[] = [];
    for (const item of items) {
      setBusyId(item.id);
      try {
        await call(item);
        done.push(item.id);
      } catch (err) {
        failed.push({
          name: item.sourceRef ?? item.subject,
          reason: extractApiError(err).message,
        });
      }
    }
    setBusyId(null);
    setRowSelection({});
    if (done.length > 0) {
      setJustDecided((prev) => ({
        ...prev,
        ...Object.fromEntries(done.map((id) => [id, verb.outcome])),
      }));
      notify.success(
        `${verb.past} ${String(done.length)} of ${String(items.length)}`,
      );
    }
    // Named, not counted: "2 failed" leaves the decider to work out WHICH two
    // are still sitting in the queue, which is the moment a bulk action stops
    // saving anyone time.
    if (failed.length > 0) {
      notify.error(
        `Could not ${verb.present} ${failed.map((f) => f.name).join(", ")} - ${
          failed[0]?.reason ?? "the server refused it"
        }`,
      );
    }
  };

  const submitReject = async (note: string) => {
    if (!rejecting) return;
    const items = rejecting.approvals;
    setRejecting(null);
    await runBulk(items, (a) => reject({ id: a.id, note }).unwrap(), {
      outcome: ApprovalStatus.REJECTED,
      past: "Rejected",
      present: "reject",
    });
  };

  const columns = useMemo<ColumnDef<IApproval>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) =>
          isPending ? (
            <input
              type="checkbox"
              aria-label="Select every pending approval on this page"
              className="size-[15px] cursor-pointer accent-[var(--ap-forest)]"
              checked={table.getIsAllRowsSelected()}
              ref={(el) => {
                if (el) el.indeterminate = table.getIsSomeRowsSelected();
              }}
              onChange={table.getToggleAllRowsSelectedHandler()}
            />
          ) : null,
        cell: ({ row }) =>
          row.original.status === ApprovalStatus.PENDING ? (
            <input
              type="checkbox"
              aria-label={`Select ${describe(row.original)}`}
              className="size-[15px] cursor-pointer accent-[var(--ap-forest)]"
              checked={row.getIsSelected()}
              onChange={row.getToggleSelectedHandler()}
              onClick={(e) => e.stopPropagation()}
            />
          ) : null,
        meta: { className: "pointer-events-auto", headerClassName: "" },
      },
      {
        id: "amount",
        header: () => "Amount",
        cell: ({ row }) => (
          <>
            <span className="block font-adminmono text-[15px] leading-[1.3] font-semibold tracking-[-0.01em] tabular-nums text-[var(--ap-ink)] [overflow-wrap:anywhere]">
              {headlineFigure(row.original)}
            </span>
            {headlineSublabel(row.original) ? (
              <span className="mt-px block text-[11px] leading-[1.4] font-medium text-[var(--ap-muted)]">
                {headlineSublabel(row.original)}
              </span>
            ) : null}
            <OverageMeter approval={row.original} className="mt-1.5" />
          </>
        ),
      },
      {
        id: "subject",
        header: () => "What changed",
        cell: ({ row }) => (
          <>
            <span className="block text-[13.5px] leading-[1.4] font-[550] text-[var(--ap-ink)] [overflow-wrap:anywhere]">
              {row.original.subject}
            </span>
            {subjectDetailLine(row.original) ? (
              <span className="mt-0.5 block text-[12px] leading-[1.4] text-[var(--ap-muted)] [overflow-wrap:anywhere]">
                {subjectDetailLine(row.original)}
              </span>
            ) : null}
          </>
        ),
      },
      {
        id: "rule",
        header: () => "Rule",
        cell: ({ row }) => <RuleBadge action={row.original.action} />,
      },
      {
        id: "raisedBy",
        header: () => "Raised by",
        cell: ({ row }) => (
          <>
            <span className="block text-[12.5px] leading-[1.4] text-[var(--ap-ink-2)] [overflow-wrap:anywhere]">
              {shortName(row.original.requestedBy?.name)}
            </span>
            <span className="block font-adminmono text-[11.5px] leading-[1.4] tabular-nums text-[var(--ap-muted)]">
              {ageLabel(row.original)}
            </span>
          </>
        ),
      },
      {
        id: "decision",
        header: () => "Decision",
        cell: ({ row }) => (
          <DecisionCell
            approval={row.original}
            busy={busyId === row.original.id}
            decidedAs={justDecided[row.original.id]}
            onApprove={() => void onApprove(row.original)}
            onReject={() => openReject(row.original)}
          />
        ),
        meta: {
          className: "flex min-w-0 justify-start gap-1.5 @min-[900px]/main:justify-end",
          headerClassName: "text-right",
        },
      },
      {
        id: "chevron",
        header: () => null,
        cell: ({ row }) => <Chevron open={row.getIsExpanded()} />,
        meta: { className: "hidden justify-self-end @min-[900px]/main:block" },
      },
    ],
    [busyId, isPending, justDecided, onApprove, openReject],
  );

  const table = useReactTable({
    columns,
    data: approvals,
    enableRowSelection: (row) => row.original.status === ApprovalStatus.PENDING,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    getRowId: (row) => row.id,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    state: { expanded, rowSelection },
  });

  const activeFilterCount =
    (filters.action !== "all" ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0);

  return (
    <div
      style={APPROVAL_TOKENS}
      className="mx-auto max-w-[1180px] bg-[var(--ap-paper)] px-0 pt-8 pb-20 font-admin @min-[900px]/main:px-6 text-[14px] leading-[1.5] text-[var(--ap-ink)] antialiased"
    >
      <h1 className="mb-[5px] text-[26px] leading-[1.25] font-[650] tracking-[-0.02em] text-[var(--ap-ink)]">
        Approvals
      </h1>
      <p className="mb-[26px] max-w-[62ch] text-[14px] leading-[1.5] text-[var(--ap-muted)]">
        Decisions waiting on you. Approving applies the change, rejecting leaves
        everything as it stands.
      </p>

      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Approval status"
          className="flex gap-[3px] rounded-[6px] bg-[var(--ap-tabs)] p-[3px]"
        >
          {TABS.map(([value, label]) => (
            <StatusTab
              key={value}
              label={label}
              active={status === value}
              onSelect={() => {
                setFilter("status", value);
                setPage(1);
              }}
              status={value}
              filters={{
                ...(filters.action !== "all"
                  ? { action: filters.action as ApprovalAction }
                  : {}),
                ...(search ? { search } : {}),
                ...(filters.from ? { from: filters.from } : {}),
                ...(filters.to ? { to: filters.to } : {}),
              }}
            />
          ))}
        </div>

      </div>

      <ConsoleFilterBar
        search={searchInput}
        onSearch={setSearch}
        searchPlaceholder="Search commodity, amount, note…"
        activeCount={activeFilterCount}
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
        <ConsoleDateRange
          from={filters.from}
          to={filters.to}
          onFromChange={(v) => setFilter("from", v)}
          onToChange={(v) => setFilter("to", v)}
          fieldClassName="lg:w-[150px]"
        />
      </ConsoleFilterBar>

      {selected.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3.5 rounded-[6px] bg-[var(--ap-forest)] px-3.5 py-2.5 text-[13px] text-white">
          <span className="font-adminmono font-semibold tabular-nums">
            {selected.length} selected
          </span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={onBulkReject}
            className={ghostBarButton}
            disabled={approveBusy || rejectBusy}
          >
            Reject with note
          </button>
          <button
            type="button"
            onClick={() => void onBulkApprove()}
            className={ghostBarButton}
            disabled={approveBusy || rejectBusy}
          >
            Approve all
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <QueueSkeleton />
      ) : isError ? (
        <div className="overflow-hidden rounded-[6px] border border-[var(--ap-hair)] bg-[var(--ap-surface)]">
          <div className="flex flex-wrap items-center gap-3 bg-[var(--ap-clay-soft)] px-4 py-3.5 text-[13px] text-[var(--ap-ink)]">
            <span className="min-w-0 flex-1">
              The approvals list did not load. {extractApiError(error).message}
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn(apButton, apButtonBase)}
            >
              Try again
            </button>
          </div>
        </div>
      ) : approvals.length === 0 ? (
        <EmptyQueue status={status} />
      ) : (
        <ApprovalsQueue table={table} />
      )}

      <ListPagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        className="mt-4"
      />

      <RejectNoteDialog
        open={rejecting !== null}
        onOpenChange={(open) => !open && setRejecting(null)}
        onSubmit={(note) => void submitReject(note)}
        subject={rejecting?.subject ?? ""}
        submitting={rejectBusy}
      />
      {confirmationDialog}
    </div>
  );
}

const ghostBarButton =
  "cursor-pointer rounded-[6px] border border-white/35 bg-transparent px-3 py-[5px] text-[12.5px] leading-[1.4] font-[550] text-white " +
  "hover:bg-white/12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white " +
  "disabled:cursor-not-allowed disabled:opacity-50";

/** What this approval is, in one phrase, for dialogs and aria labels. */
function describe(approval: IApproval): string {
  return [approval.subject, approval.sourceRef].filter(Boolean).join(" ");
}

/**
 * One tab. Its count is its own tiny query so the number is the live total for
 * that bucket under the filters in force, not a stale prop threaded down from
 * whichever list happens to be showing.
 */
function StatusTab({
  active,
  filters,
  label,
  onSelect,
  status,
}: {
  active: boolean;
  filters: Omit<IApprovalListQuery, "limit" | "page" | "status">;
  label: string;
  onSelect: () => void;
  status: ApprovalStatus;
}) {
  const { data } = useGetApprovalsQuery({ ...filters, limit: 1, status });
  const count = data?.meta.total ?? 0;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-[7px] rounded-[6px] px-3.5 py-[7px] text-[13px] leading-[1.4] font-[550]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ap-forest)]",
        active
          ? "bg-[var(--ap-surface)] text-[var(--ap-ink)] shadow-[0_1px_2px_rgba(0,0,0,.08)]"
          : "bg-transparent text-[var(--ap-ink-2)]",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-[6px] px-1.5 py-px font-adminmono text-[11px] leading-[1.4] tabular-nums",
          active
            ? "bg-[var(--ap-forest)] text-white"
            : "bg-[var(--ap-pill)] text-[var(--ap-ink-2)]",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/**
 * Column 6. On Pending it is the action pair; once decided it is the outcome
 * word, which is what carries the status for anyone who cannot see the rail.
 */
function DecisionCell({
  approval,
  busy,
  decidedAs,
  onApprove,
  onReject,
}: {
  approval: IApproval;
  busy: boolean;
  /** Set the moment a decision lands, before the list refetches. */
  decidedAs?: ApprovalStatus;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (busy)
    return (
      <span
        role="status"
        aria-label="Working"
        className="size-3.5 animate-spin rounded-full border-2 border-[var(--ap-hair)] border-t-[var(--ap-forest)] motion-reduce:animate-none"
      />
    );

  const settled =
    decidedAs ??
    (approval.status === ApprovalStatus.PENDING ? null : approval.status);

  if (settled === null)
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReject();
          }}
          className={cn(apButton, apButtonDanger, "pointer-events-auto")}
        >
          Reject
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onApprove();
          }}
          className={cn(apButton, apButtonPrimary, "pointer-events-auto")}
        >
          Approve
        </button>
      </>
    );

  return (
    <span className="block min-w-0 text-left @min-[900px]/main:text-right">
      <span
        className="block text-[12.5px] leading-[1.4] font-semibold"
        style={{ color: OUTCOME[settled].colour }}
      >
        {OUTCOME[settled].word}
      </span>
      {approval.note ? (
        <span className="block truncate text-[11.5px] leading-[1.4] text-[var(--ap-muted)] italic">
          {approval.note}
        </span>
      ) : null}
    </span>
  );
}

const EMPTY_COPY: Record<ApprovalStatus, { body: string; title: string }> = {
  [ApprovalStatus.PENDING]: {
    body: "New items above your approval limits will appear here.",
    title: "Nothing waiting on you",
  },
  [ApprovalStatus.APPROVED]: {
    body: "Requests you sign off will be listed here with who decided and when.",
    title: "No approvals yet",
  },
  [ApprovalStatus.REJECTED]: {
    body: "Requests you turn back will be listed here with the reason you gave.",
    title: "No rejections yet",
  },
};

function EmptyQueue({ status }: { status: ApprovalStatus }) {
  const copy = EMPTY_COPY[status];
  return (
    <div className="rounded-[6px] border border-[var(--ap-hair)] bg-[var(--ap-surface)] px-6 py-12 text-center">
      <p className="text-[15px] font-[550] text-[var(--ap-ink)]">{copy.title}</p>
      <p className="mt-1 text-[13px] text-[var(--ap-muted)]">{copy.body}</p>
    </div>
  );
}

/** Six rows at the real row height - a spinner would say nothing about shape. */
function QueueSkeleton() {
  return (
    <div className="overflow-hidden rounded-[6px] border border-[var(--ap-hair)] bg-[var(--ap-surface)]">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="grid h-[62px] grid-cols-[34px_190px_1fr] items-center gap-3.5 border-b border-[var(--ap-hair-soft)] px-4 last:border-b-0"
        >
          <span />
          <span className="block h-3.5 w-[120px] rounded-[6px] bg-[var(--ap-track)]" />
          <span className="block h-3.5 w-[60%] rounded-[6px] bg-[var(--ap-track)]" />
        </div>
      ))}
    </div>
  );
}
