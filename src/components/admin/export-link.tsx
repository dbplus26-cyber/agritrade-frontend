"use client";

import type { ReactNode } from "react";
import { AdminButton, adminLinkClass } from "@/components/admin/ui";
import { useExportConfirm } from "@/hooks/use-export-confirm";
import { startDownload } from "@/lib/start-download";
import { cn } from "@/lib/utils";

/**
 * A file the API builds (the Excel purchase book, a report's CSV), behind
 * the same confirmation as every other export. `what` names what is in the
 * file, as the start of a sentence: "The purchase book".
 */
export function ExportLink({
  href,
  format,
  what,
  variant = "button",
  className,
  children,
}: {
  href: string;
  format: "CSV" | "Excel";
  what: string;
  /** An outlined button, or a text link for a card's corner. */
  variant?: "button" | "link";
  className?: string;
  children: ReactNode;
}) {
  const { confirmExport, exportDialog } = useExportConfirm();
  const ask = () => {
    void confirmExport(format, what).then((ok) => {
      if (ok) startDownload(href);
    });
  };
  return (
    <>
      {variant === "link" ? (
        <button
          className={cn(adminLinkClass, className)}
          onClick={ask}
          type="button"
        >
          {children}
        </button>
      ) : (
        <AdminButton
          className={className}
          onClick={ask}
          type="button"
          variant="outline"
        >
          {children}
        </AdminButton>
      )}
      {exportDialog}
    </>
  );
}
