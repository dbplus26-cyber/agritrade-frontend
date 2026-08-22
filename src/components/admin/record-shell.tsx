"use client";

import { AdminCard, DetailShell, ToneBadge } from "@/components/admin/ui";
import {
  DASHBOARD_CRUMB,
  DetailNav,
  type Crumb,
} from "@/components/admin/detail-nav";
import { cn } from "@/lib/utils";

/**
 * The standard layout for a single record's page.
 *
 * A single stack of label/value pairs gives the facts, the timestamps and the
 * lifecycle buttons identical weight, and reads as a printout of the row
 * rather than a page about it.
 *
 * So: the record's substance goes in the main column, and everything ABOUT
 * the record rather than IN it - its status, when it was filed, the actions
 * that change its life - moves to a side rail. That gives the page a subject
 * and a margin, which is what makes it read as designed rather than dumped.
 * Below xl the rail stacks on top, so status and actions stay above the fold
 * on a phone.
 */
/** "All buyers" / "Back to buyers" -> "Buyers": the register's name as a crumb. */
function crumbLabel(backLabel: string): string {
  const bare = backLabel.replace(/^(all|back to)\s+/i, "").trim();
  return bare ? bare.charAt(0).toUpperCase() + bare.slice(1) : backLabel;
}

export function RecordShell({
  aside,
  backHref,
  backLabel,
  crumbs,
  current,
  children,
  header,
}: {
  /** Status, timestamps, lifecycle actions - the record's margin notes. */
  aside?: React.ReactNode;
  /** The parent register: the phone back target and the parent crumb. */
  backHref: string;
  backLabel: string;
  /** Ancestor crumbs; defaults to Dashboard › the parent register. */
  crumbs?: Crumb[];
  /** The current page's crumb label ("Expense details", "New buyer"). */
  current?: string;
  /** The record's substance. */
  children: React.ReactNode;
  header: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <DetailNav
        crumbs={
          crumbs ?? [
            DASHBOARD_CRUMB,
            { label: crumbLabel(backLabel), href: backHref },
          ]
        }
        current={current}
        backHref={backHref}
        backLabel={backLabel}
      />
      {header}
      {aside ? (
        <DetailShell
          aside={<div className="space-y-4">{aside}</div>}
          main={<div className="space-y-4">{children}</div>}
        />
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </div>
  );
}

/**
 * A titled block in the side rail. Small, quiet, and clearly secondary to the
 * main column - the visual difference is the whole point of moving these out
 * of the main stack.
 */
export function RailCard({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <AdminCard className={cn("px-4 py-3", className)}>
      {title ? (
        <div className="mb-1.5 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          {title}
        </div>
      ) : null}
      {children}
    </AdminCard>
  );
}

/** Active / inactive, as the rail's opening statement. */
export function RailStatus({ isActive }: { isActive: boolean }) {
  return (
    <RailCard title="Status">
      <ToneBadge tone={isActive ? "leaf" : "slate"}>
        {isActive ? "Active" : "Inactive"}
      </ToneBadge>
    </RailCard>
  );
}
