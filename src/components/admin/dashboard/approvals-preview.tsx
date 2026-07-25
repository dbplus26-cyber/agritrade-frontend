"use client";

import Link from "next/link";
import { ActionBadge } from "@/components/admin/approvals/approval-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetApprovalsQuery } from "@/redux/approvals/approvals-api";
import { ApprovalStatus } from "@/types/approval.types";

import { WidgetCard } from "./chart-kit";

/** Compact "10 Jul" date for the preview rows. */
const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

/**
 * The four oldest pending approvals, previewed on the dashboard (design doc
 * 5.8) with a link into the full inbox. Reuses the approvals list read.
 */
export function ApprovalsPreview() {
  const { data, isLoading } = useGetApprovalsQuery({
    limit: 4,
    status: ApprovalStatus.PENDING,
  });
  const rows = data?.data ?? [];

  const link = (
    <Link href="/admin/approvals" className="text-[12px] text-console hover:underline">
      Inbox
    </Link>
  );

  return (
    <WidgetCard title="Awaiting approval" right={link}>
      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-none" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-soil">Nothing awaiting approval.</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((a) => (
            <li key={a.id}>
              <Link
                href="/admin/approvals"
                className="flex items-center justify-between gap-2 border-b border-soil/10 py-2 last:border-b-0 hover:bg-surface-alt/60"
              >
                <span className="min-w-0">
                  <ActionBadge action={a.action} />
                  <span className="mt-0.5 block truncate text-[11.5px] text-soil">
                    {a.entityType} · {shortDate(a.createdAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
