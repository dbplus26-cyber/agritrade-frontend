"use client";

import Link from "next/link";
import { adminLinkClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import {
  ActionBadge,
  approvalStamp,
  summaryLine,
} from "@/components/admin/approvals/approval-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetApprovalsQuery } from "@/redux/approvals/approvals-api";
import { ApprovalStatus } from "@/types/approval.types";

import { WidgetCard, WidgetError } from "./chart-kit";

/**
 * The four oldest pending approvals, previewed on the dashboard (design doc
 * 5.8) with a link into the full inbox. Each row is the inbox card's header
 * + title zones in miniature: action badge with the arrival stamp on line
 * one, the mono headline with requester/detail beneath.
 */
export function ApprovalsPreview() {
  const { data, isError, isLoading, refetch } = useGetApprovalsQuery({
    limit: 4,
    status: ApprovalStatus.PENDING,
  });
  const rows = data?.data ?? [];

  const link = (
    <Link href="/admin/approvals" className={cn(adminLinkClass, "text-[12px]")}>
      Inbox
    </Link>
  );

  return (
    <WidgetCard
      title="Awaiting approval"
      hint="Requests staff have raised that only you can sign off, oldest first."
      right={link}
    >
      {isError ? (
        <WidgetError
          what="the approvals queue"
          onRetry={() => void refetch()}
        />
      ) : isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-[6px]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-adm-muted">Nothing awaiting approval.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((a) => {
            const { headline, detail } = summaryLine(a.action, a.summary);
            return (
              <li key={a.id}>
                <Link
                  href={`/admin/approvals/${a.id}`}
                  className="block border-b border-adm-hairline py-2 last:border-b-0 hover:bg-adm-sunken"
                >
                  <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                    <ActionBadge action={a.action} />
                    <span className="font-adminmono ml-auto flex-none text-[11px] tabular-nums text-adm-muted">
                      {approvalStamp(a.createdAt)}
                    </span>
                  </span>
                  <span className="font-adminmono mt-1 block min-w-0 text-[13px] leading-tight font-bold whitespace-normal text-adm-ink line-clamp-1 [overflow-wrap:anywhere]">
                    {headline}
                  </span>
                  <span className="mt-0.5 block min-w-0 text-[11.5px] whitespace-normal text-adm-muted line-clamp-1 [overflow-wrap:anywhere]">
                    {[a.requestedBy?.name, detail].filter(Boolean).join(" · ") ||
                      a.entityType}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
