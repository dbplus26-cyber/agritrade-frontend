"use client";

import { Fragment } from "react";
import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  href: string;
}

/** The console home, the first crumb on every detail page. */
export const DASHBOARD_CRUMB: Crumb = { label: "Dashboard", href: "/admin" };

/**
 * Standard detail-page navigation: a back arrow below `md` (no browser back
 * affordance in a standalone PWA) and a breadcrumb at/above `md`. Every
 * record, create and edit page uses it so the back/breadcrumb split is
 * identical everywhere.
 *
 * The page heading goes in as `children`: the arrow then takes the left of
 * the heading's own row and aligns with its first line, so a phone spends no
 * vertical band on a control that is one glyph wide. Without a heading to sit
 * beside, the arrow keeps its own row above whatever follows.
 */
export function DetailNav({
  crumbs,
  current,
  backHref,
  backLabel,
  children,
  className,
}: {
  /**
   * Ancestor links, parent-first, e.g.
   * `[DASHBOARD_CRUMB, { label: "Grants", href: "/admin/grants" }]`.
   */
  crumbs: Crumb[];
  /** Label for the current (non-link) page. */
  current?: string;
  /**
   * Mobile back target. Defaults to the last crumb's href so the arrow and
   * the parent crumb always agree.
   */
  backHref?: string;
  /** Accessible name for the arrow; defaults to the parent crumb's name. */
  backLabel?: string;
  /** The page heading, which the arrow shares a row with. */
  children?: React.ReactNode;
  className?: string;
}) {
  const parent = crumbs[crumbs.length - 1];
  const back = (
    <BackButton
      className={cn("md:hidden", children ? undefined : "mb-6")}
      href={backHref ?? parent?.href ?? DASHBOARD_CRUMB.href}
      label={backLabel ?? `Back to ${parent?.label ?? "the dashboard"}`}
    />
  );

  return (
    <div className={className}>
      <Breadcrumb className="mb-6 hidden md:flex">
        <BreadcrumbList className="text-adm-muted">
          {crumbs.map((crumb, index) => (
            <Fragment key={crumb.href}>
              <BreadcrumbItem>
                <BreadcrumbLink asChild className="text-console">
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {current || index < crumbs.length - 1 ? (
                <BreadcrumbSeparator />
              ) : null}
            </Fragment>
          ))}
          {current ? (
            <BreadcrumbItem>
              <BreadcrumbPage
                title={current}
                className="max-w-[16rem] truncate text-adm-ink"
              >
                {current}
              </BreadcrumbPage>
            </BreadcrumbItem>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>

      {children ? (
        <div className="flex items-start gap-1.5">
          {back}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      ) : (
        back
      )}
    </div>
  );
}
