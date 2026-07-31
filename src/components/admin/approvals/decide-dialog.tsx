"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AdminField, adminInputClass } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  useApproveApprovalMutation,
  useRejectApprovalMutation,
} from "@/redux/approvals/approvals-api";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IApproval } from "@/types/approval.types";
import {
  approveFormSchema,
  rejectFormSchema,
  type RejectFormValues,
} from "@/validations/approval-schema";
import {
  approvalStamp,
  entityLink,
  MetaRow,
  MetaStrip,
  summaryLine,
} from "./approval-bits";

export type Decision = { approval: IApproval; kind: "approve" | "reject" } | null;

/**
 * Approve (note optional) / reject (note required) in one dialog. The header
 * restates exactly what is being signed off - the summary, the module it
 * came from, who asked and when - so the decider never confirms blind.
 */
export function DecideDialog({
  decision,
  onClose,
}: {
  decision: Decision;
  onClose: () => void;
}) {
  const { confirm, confirmationDialog } = useConfirm();
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

    // Approving does not record an opinion - it APPLIES the thing: real stock
    // is minted or written off, real money is committed. Typing the action
    // back proves the decider read which request they are on, which is the
    // mistake an inbox of near-identical rows invites.
    if (!isReject) {
      const confirmed = await confirm({
        title: "Apply this request?",
        description: `${summaryLine(decision.approval.action, decision.approval.summary) ?? decision.approval.action} - approving applies it immediately. Type the action to confirm.`,
        confirmText: "Approve and apply",
        requireExactMatch: decision.approval.action,
      });
      if (!confirmed) return;
    }

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

  const approval = decision?.approval ?? null;
  const summary = approval
    ? summaryLine(approval.action, approval.summary)
    : null;
  const link = approval
    ? entityLink(approval.entityType, approval.entityId)
    : null;

  return (
    <ResponsiveDialog open={decision !== null} onOpenChange={(o) => !o && close()}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[420px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isReject ? "Reject this request?" : "Approve this request?"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isReject
              ? "Rejection does not undo anything by itself - a flagged purchase stays recorded until you void it."
              : "Approving applies the change immediately and is written to the audit trail."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {approval && summary && link ? (
          <div className="rounded-[6px] border-[1.5px] border-adm-hairline bg-adm-sunken px-3 py-2.5">
            {/* The inbox card's title block + meta strip, in miniature. */}
            <div className="font-adminmono text-[15px] leading-tight font-bold text-adm-ink [overflow-wrap:anywhere]">
              {summary.headline}
            </div>
            {summary.detail ? (
              <div className="mt-0.5 text-[12.5px] text-adm-muted [overflow-wrap:anywhere]">
                {summary.detail}
              </div>
            ) : null}
            <MetaStrip className="mt-2">
              <MetaRow label="From">{link.moduleLabel}</MetaRow>
              <MetaRow label="Requested by">
                {approval.requestedBy?.name ?? "Unknown"}
                <span className="text-adm-muted">
                  {" "}
                  · {approvalStamp(approval.createdAt)}
                </span>
              </MetaRow>
            </MetaStrip>
          </div>
        ) : null}
        <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3.5">
          <AdminField
            label={isReject ? "Why (required)" : "Note (optional)"}
            error={errors.note?.message}
          >
            <textarea
              rows={4}
              placeholder={
                isReject
                  ? "The requester sees this - say what should happen instead"
                  : "Any context for the audit trail"
              }
              className={cn(adminInputClass, "h-auto py-2 leading-[1.5]")}
              {...register("note")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
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
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
      {confirmationDialog}
    </ResponsiveDialog>
  );
}
