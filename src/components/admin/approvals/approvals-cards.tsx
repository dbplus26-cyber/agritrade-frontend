"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ApprovalStatus, type IApproval } from "@/types/approval.types";
import {
  ageLabel,
  apButton,
  apButtonDanger,
  apButtonPrimary,
  apLink,
  headlineFigure,
  NoteBlock,
  overageSentence,
  OverageMeter,
  RAIL,
  RuleBadge,
  SelfDecidedChip,
  shortName,
  stamp,
  subjectDetailLine,
} from "./queue-bits";

/**
 * The optional card view.
 *
 * `grid-auto-rows: 1fr` is the whole point: it equalises every card in a row,
 * which is what the previous three-column grid could not do. Two columns, not
 * three - at three the meta line wraps and the amount is left stranded in
 * white space.
 */
export function ApprovalsCards({
  approvals,
  busyId,
  onApprove,
  onReject,
}: {
  approvals: IApproval[];
  /** The row currently mid-decision, dimmed and locked until it settles. */
  busyId: string | null;
  onApprove: (approval: IApproval) => void;
  onReject: (approval: IApproval) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 @min-[900px]/main:auto-rows-fr @min-[900px]/main:grid-cols-2">
      {approvals.map((approval) => (
        <ApprovalCard
          key={approval.id}
          approval={approval}
          busy={busyId === approval.id}
          onApprove={() => onApprove(approval)}
          onReject={() => onReject(approval)}
        />
      ))}
    </div>
  );
}

function ApprovalCard({
  approval,
  busy,
  onApprove,
  onReject,
}: {
  approval: IApproval;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const pending = approval.status === ApprovalStatus.PENDING;
  const overage = overageSentence(approval);
  // The card's meta line already carries the document number, so the subject
  // line leaves it out rather than printing it twice.
  const detail = subjectDetailLine(approval, false);

  return (
    <article
      tabIndex={0}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[10px] border border-[var(--ap-hair)] bg-[var(--ap-surface)] pt-4 pr-[18px] pb-3.5 pl-5",
        "transition-colors duration-150 ease-out hover:border-[#d3cfc4] motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ap-forest)]",
        busy && "pointer-events-none opacity-60",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: RAIL[approval.status] }}
      />

      <div className="mb-3 flex items-start justify-between gap-3">
        <RuleBadge action={approval.action} />
        <span className="font-adminmono text-[11.5px] leading-[1.4] tabular-nums whitespace-nowrap text-[var(--ap-muted)]">
          {ageLabel(approval)}
        </span>
      </div>

      <p className="font-adminmono text-[23px] leading-[1.15] font-semibold tracking-[-0.02em] tabular-nums text-[var(--ap-ink)] [overflow-wrap:anywhere]">
        {headlineFigure(approval)}
      </p>

      <p className="mt-1 text-[13px] leading-[1.5] text-[var(--ap-ink-2)] [overflow-wrap:anywhere]">
        {[approval.subject, detail].filter(Boolean).join(" · ")}
      </p>

      {overage ? (
        <>
          <p className="mt-[9px] text-[12px] leading-[1.4] font-[550] text-[var(--ap-clay)]">
            {overage}
          </p>
          <OverageMeter approval={approval} className="mt-1.5" />
        </>
      ) : null}

      <p className="mt-[13px] border-t border-[var(--ap-hair-soft)] pt-3 text-[12px] leading-[1.5] text-[var(--ap-muted)] [overflow-wrap:anywhere]">
        {metaLine(approval)}
      </p>

      {approval.note ? <NoteBlock note={approval.note} /> : null}

      <div className="mt-auto flex items-center gap-2 pt-3.5">
        {approval.selfDecided ? <SelfDecidedChip /> : null}
        <span className="flex-1" />
        {pending ? (
          <>
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              className={cn(apButton, apButtonDanger)}
            >
              Reject
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className={cn(apButton, apButtonPrimary)}
            >
              Approve
            </button>
          </>
        ) : (
          <Link href={approval.sourceHref} className={cn(apLink, "text-[12.5px]")}>
            Open {approval.sourceRef ?? approval.sourceModule}
          </Link>
        )}
      </div>
    </article>
  );
}

/**
 * "Purchases · Raised by Nurudeen A. · 22 Jul, 15:16", with the decider
 * appended only when it was somebody else - repeating one name twice is the
 * noise the Self approved chip replaces.
 */
function metaLine(approval: IApproval): string {
  const parts = [
    approval.sourceRef
      ? `${approval.sourceModule} · ${approval.sourceRef}`
      : approval.sourceModule,
    `Raised by ${shortName(approval.requestedBy?.name)}`,
    stamp(approval.createdAt),
  ];
  if (approval.decidedBy && !approval.selfDecided)
    parts.push(`Decided by ${shortName(approval.decidedBy.name)}`);
  return parts.join(" · ");
}
