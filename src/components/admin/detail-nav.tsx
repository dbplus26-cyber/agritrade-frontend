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
 * Standard detail-page navigation: a back button below `md` (no browser back
 * affordance in a standalone PWA) and a breadcrumb at/above `md`. Every
 * record, create and edit page uses it so the back/breadcrumb split is
 * identical everywhere.
 */
export function DetailNav({
  crumbs,
  current,
  backHref,
  backLabel,
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
  /** Mobile back-button label; defaults to the last crumb's label. */
  backLabel?: string;
  className?: string;
}) {
  const parent = crumbs[crumbs.length - 1];

  return (
    <div className={cn("mb-6", className)}>
      <div className="md:hidden">
        <BackButton
          href={backHref ?? parent?.href ?? DASHBOARD_CRUMB.href}
          label={backLabel ?? parent?.label ?? "Back"}
        />
      </div>

      <Breadcrumb className="hidden md:flex">
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
    </div>
  );
}
