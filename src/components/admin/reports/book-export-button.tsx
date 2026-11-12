"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminButton, adminLinkClass } from "@/components/admin/ui";
import { useExportConfirm } from "@/hooks/use-export-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { startDownload } from "@/lib/start-download";
import { useRequestBookExportMutation } from "@/redux/reports/reports-api";
import type { IBookExportRequest } from "@/types/report.types";

export const EXPORTS_PAGE = "/admin/reports/exports";

/**
 * Exports a book to Excel, behind the same confirmation as every export.
 * Only the server knows how long the book is, so it is asked first: a short
 * book is downloaded at once from `href`; a long one is prepared in the
 * background, and this says where it will turn up rather than leaving the
 * page waiting on a file that takes minutes.
 */
export function BookExportButton({
  book,
  href,
  what,
}: {
  book: IBookExportRequest;
  /** The direct download of this same book, for when it is short. */
  href: string;
  what: string;
}) {
  const { confirmExport, exportDialog } = useExportConfirm();
  const [ask, { isLoading }] = useRequestBookExportMutation();
  // Rows of the book now being prepared, once the server has said so.
  const [preparing, setPreparing] = useState<number | null>(null);

  const run = async () => {
    if (!(await confirmExport("Excel", what))) return;
    try {
      const queued = (await ask(book).unwrap()).data.export;
      if (!queued) {
        setPreparing(null);
        startDownload(href);
        return;
      }
      setPreparing(queued.totalRows);
      notify.info("Your export is being prepared", {
        description:
          "It will be on the Exports page when it is ready, and you will get an email.",
      });
    } catch (err) {
      notify.error("Couldn't export the book", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <>
      <AdminButton
        disabled={isLoading}
        loading={isLoading}
        onClick={() => void run()}
        type="button"
        variant="outline"
      >
        Export Excel
      </AdminButton>
      {preparing !== null ? (
        <p className="basis-full text-[12px] text-adm-muted" role="status">
          This book has {preparing.toLocaleString("en-GH")} rows, so its file is
          being prepared in the background.{" "}
          <Link className={adminLinkClass} href={EXPORTS_PAGE}>
            Open exports
          </Link>
        </p>
      ) : null}
      {exportDialog}
    </>
  );
}
