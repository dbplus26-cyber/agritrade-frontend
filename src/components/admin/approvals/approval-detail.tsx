"use client";

import { useState } from "react";
import { AdminCard, AdminPageHeader } from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetApprovalQuery } from "@/redux/approvals/approvals-api";
import { extractApiError } from "@/lib/extract-api-error";
import { ApprovalStatus } from "@/types/approval.types";
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

const LIST = "/admin/approvals";

/**
 * /admin/approvals/[id] - one approval's full record, deep-linkable so a
 * decision can be shared and audited. The card is the inbox card's anatomy
 * writ large: header (badges + timestamp), title block, meta strip, note,
 * and the decide buttons as the pinned footer while the request is pending.
 */
export function ApprovalDetail({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetApprovalQuery(id);
  const [decision, setDecision] = useState<Decision>(null);

  if (isLoading) return <DetailSkeleton facts={4} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const approval = data.data.approval;
  const { headline, detail } = summaryLine(approval.action, approval.summary);
  const pending = approval.status === ApprovalStatus.PENDING;
  const decidedAt = !pending ? approval.decidedAt : null;

  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All approvals" className="mb-2" />
      <AdminPageHeader
        title={headline}
        sub={ACTION_LABEL[approval.action] ?? approval.action}
      />

      <AdminCard className="p-4 sm:p-5">
        {/* 1. Header: what kind of request, its outcome, and when it arrived. */}
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ActionBadge action={approval.action} />
            <ApprovalStatusBadge status={approval.status} />
          </div>
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

        {/* 2. Title: the figure being signed off, then the one-line story. */}
        <div className="mt-3.5">
          <div className="font-adminmono text-[19px] leading-tight font-bold text-ink [overflow-wrap:anywhere]">
            {headline}
          </div>
          {detail ? (
            <div className="mt-0.5 text-[13px] leading-[1.5] text-soil [overflow-wrap:anywhere]">
              {detail}
            </div>
          ) : null}
        </div>

        {/* 3. Meta strip: the accountability trail, same rows as the inbox. */}
        <MetaStrip className="mt-3.5">
          <MetaRow label="From">
            <ModuleValue
              entityType={approval.entityType}
              entityId={approval.entityId}
              verbose
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
          <div className="mt-3.5 border-l-2 border-soil/40 pl-2.5">
            <div className={stencilCls}>
              {pending ? "Note" : "Decider's note"}
            </div>
            <div className="text-[13px] italic text-soil [overflow-wrap:anywhere]">
              {approval.note}
            </div>
          </div>
        ) : null}

        {/* 5. Footer: the decision itself, while there is one to make. */}
        {pending ? (
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="harvest"
              className="h-9 flex-1 sm:flex-none sm:px-6"
              onClick={() => setDecision({ approval, kind: "approve" })}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              className="h-9 flex-1 text-console-red hover:text-console-red sm:flex-none sm:px-6"
              onClick={() => setDecision({ approval, kind: "reject" })}
            >
              Reject
            </Button>
          </div>
        ) : null}
      </AdminCard>

      <DecideDialog decision={decision} onClose={() => setDecision(null)} />
    </div>
  );
}
