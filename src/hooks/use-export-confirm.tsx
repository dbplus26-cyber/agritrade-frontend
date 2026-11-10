"use client";

import { useCallback } from "react";
import { useConfirm } from "@/hooks/use-confirm";

/**
 * The question every export asks before it runs. A downloaded file cannot be
 * called back: once it is on a device the console's logins and money
 * visibility no longer guard what is in it. One hook, so every export says
 * the same thing.
 *
 *   const { confirmExport, exportDialog } = useExportConfirm();
 *   if (!(await confirmExport("CSV", "All rows matching the current filters"))) return;
 *   return <>{exportDialog}…</>;
 */
export function useExportConfirm() {
  const { confirm, confirmationDialog } = useConfirm();
  const confirmExport = useCallback(
    (format: "CSV" | "Excel", what: string) =>
      confirm({
        title: `Export to ${format}?`,
        description: `${what} will be downloaded to this device as a file. A downloaded file cannot be taken back, and anyone who opens it can read it.`,
        confirmText: "Export",
        cancelText: "Cancel",
      }),
    [confirm],
  );
  return { confirmExport, exportDialog: confirmationDialog };
}
