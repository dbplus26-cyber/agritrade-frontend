"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { adminLinkClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * Standard dashboard back control - placed at the TOP-LEFT of detail, create
 * and edit pages, above the page header: the register-form link style (green
 * text, underline on hover, no background or border). Uses history when the
 * visitor navigated here in-app; falls back to `href` on a direct/deep link
 * so it never dead-ends.
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
        adminLinkClass,
        "inline-flex cursor-pointer items-center gap-1 whitespace-nowrap text-[13px] font-semibold",
        className,
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </button>
  );
}
