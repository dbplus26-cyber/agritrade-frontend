"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Standard console back control, placed above the page header on detail,
 * create and edit pages: a quiet ghost button (arrow + the parent's name).
 * Uses history when the visitor navigated here in-app; falls back to `href`
 * on a direct/deep link so it never dead-ends.
 *
 * From `md` up the detail pages show a breadcrumb instead (see DetailNav),
 * so this is the phone affordance: no browser back control in a standalone
 * PWA, and a thumb-sized target.
 */
export function BackButton({
  href,
  label = "Back",
  className,
}: {
  /** Where to go when there's no in-app history (deep link, refresh). */
  href: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(href);
  };

  return (
    <button
      type="button"
      onClick={goBack}
      className={cn(
        "-ml-2 inline-flex h-8 cursor-pointer items-center gap-2 rounded-none px-3 text-sm font-medium whitespace-nowrap text-adm-body transition-colors hover:bg-adm-sunken hover:text-adm-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console",
        className,
      )}
    >
      <ArrowLeft strokeWidth={1.5} className="h-4 w-4" aria-hidden="true" />
      {label}
    </button>
  );
}
