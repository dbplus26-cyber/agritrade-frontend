"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Standard console back control: an arrow alone, sitting to the left of the
 * page heading it belongs to. `label` names the destination for assistive
 * technology rather than printing beside the arrow, so the heading keeps the
 * whole row and reads as the page's only title.
 *
 * Uses history when the visitor navigated here in-app; falls back to `href`
 * on a direct/deep link so it never dead-ends.
 *
 * The plate is 28px, the height of the heading's first line, so it aligns
 * with the title rather than floating beside a two-line header. The touch
 * area is padded out to 44px underneath it as a pseudo-element, which costs
 * no layout: on a phone this is the only way back in a standalone PWA.
 */
export function BackButton({
  href,
  label = "Go back",
  className,
}: {
  /** Where to go when there's no in-app history (deep link, refresh). */
  href: string;
  /** Accessible name: where the arrow goes, e.g. "Back to shipments". */
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
      aria-label={label}
      className={cn(
        "relative -ml-1.5 inline-flex size-7 flex-none cursor-pointer items-center justify-center rounded-none text-adm-body transition-colors before:absolute before:top-1/2 before:left-1/2 before:size-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-[''] hover:bg-adm-sunken hover:text-adm-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console",
        className,
      )}
    >
      <ArrowLeft strokeWidth={1.5} className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
