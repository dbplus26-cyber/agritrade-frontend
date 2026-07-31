"use client";

import { AdminCard, DetailShell, ToneBadge } from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { cn } from "@/lib/utils";

/**
 * The standard layout for a single record's page.
 *
 * These pages used to be a 560px column of label/value pairs with two thirds
 * of the screen left empty beside it, and every element - the facts, the
 * timestamps, the lifecycle buttons - carrying identical weight down a single
 * stack. It read as a printout of the row rather than a page about it.
 *
 * So: the record's substance goes in the main column, and everything ABOUT
 * the record rather than IN it - its status, when it was filed, the actions
 * that change its life - moves to a side rail. That gives the page a subject
 * and a margin, which is what makes it read as designed rather than dumped.
 * Below xl the rail stacks on top, so status and actions stay above the fold
 * on a phone.
 */
export function RecordShell({
  aside,
  backHref,
  backLabel,
  children,
  header,
}: {
  /** Status, timestamps, lifecycle actions - the record's margin notes. */
  aside?: React.ReactNode;
  backHref: string;
  backLabel: string;
  /** The record's substance. */
  children: React.ReactNode;
  header: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <BackButton className="mb-2" href={backHref} label={backLabel} />
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
        <div className="mb-1.5 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
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
