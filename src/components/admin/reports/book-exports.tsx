"use client";

import { useState } from "react";
import Link from "next/link";
import {
  WidgetEmpty,
  WidgetError,
} from "@/components/admin/dashboard/chart-kit";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  type Tone,
  ToneBadge,
} from "@/components/admin/ui";
import { ListPagination } from "@/components/ui/ListPagination";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";
import { formatDateOnly, formatDateTime } from "@/lib/format-date";
import { startDownload } from "@/lib/start-download";
import { useGetBookExportsQuery } from "@/redux/reports/reports-api";
import type { DataExportStatus, IDataExport } from "@/types/report.types";

/** How often the page asks again while a file is still being prepared. */
const POLL_MS = 4000;

const STATUS: Record<DataExportStatus, { label: string; tone: Tone }> = {
  QUEUED: { label: "Waiting", tone: "slate" },
  PROCESSING: { label: "Preparing", tone: "harvest" },
  COMPLETED: { label: "Ready", tone: "leaf" },
  FAILED: { label: "Failed", tone: "alert" },
};

const count = (n: number) => n.toLocaleString("en-GH");
const pending = (e: IDataExport) =>
  e.status === "QUEUED" || e.status === "PROCESSING";

function ExportRow({ item }: { item: IDataExport }) {
  const status = STATUS[item.status];
  // Through the API, which checks whose export it is; never a storage link.
  const fileHref = (part: number) =>
    `${env.SERVER_URI}/api/v1/admin/reports/book-exports/${item.id}/files/${String(part)}`;
  const parts = item.files.length;
  return (
    <AdminCard className="px-5 py-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 className="text-[14px] font-bold text-adm-ink [overflow-wrap:anywhere]">
            {item.title}
          </h2>
          <p className="mt-0.5 text-[12px] text-adm-muted tabular-nums">
            Asked for {formatDateTime(item.createdAt)}
          </p>
        </div>
        <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
      </div>

      {pending(item) ? (
        <div className="mt-3">
          <p className="text-[12.5px] text-adm-ink tabular-nums">
            {item.status === "QUEUED"
              ? `Waiting its turn: ${count(item.totalRows)} rows to write.`
              : `${count(item.rowCount)} of ${count(item.totalRows)} rows written.`}
          </p>
          <progress
            aria-label={`${item.title}: rows written`}
            className="mt-2 h-1.5 w-full max-w-[420px]"
            max={Math.max(1, item.totalRows)}
            value={item.rowCount}
          />
        </div>
      ) : item.status === "FAILED" ? (
        <p className="mt-3 text-[12.5px] text-adm-ink">
          This export could not be prepared. Open the book and export it again;
          if it fails a second time, narrow the book to one supplier or buyer.
        </p>
      ) : (
        <div className="mt-3">
          <p className="text-[12.5px] text-adm-ink tabular-nums">
            {count(item.rowCount)} rows in{" "}
            {parts === 1 ? "1 Excel file" : `${String(parts)} Excel files`}
            {item.expiresAt
              ? `, kept until ${formatDateOnly(item.expiresAt)}.`
              : "."}
            {parts > 1
              ? " Each part carries the cash balance on from the one before, and every part states the whole book's totals."
              : ""}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {item.files.map((file) => (
              <li key={file.part}>
                <AdminButton
                  onClick={() => {
                    startDownload(fileHref(file.part));
                  }}
                  title={file.name}
                  type="button"
                  variant="outline"
                >
                  {parts === 1
                    ? "Download"
                    : `Download part ${String(file.part)} of ${String(parts)}`}
                  <span className="font-normal text-adm-muted tabular-nums">
                    {count(file.rows)} rows
                  </span>
                </AdminButton>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminCard>
  );
}

/**
 * The files a person asked for that were too long to build while the page
 * waited. Each is prepared in the background, listed here while it is, and
 * downloaded from here once it is ready. Nobody sees anyone else's.
 */
export function BookExports() {
  const [page, setPage] = useState(1);
  // Whether anything was still being prepared at the last answer: only then
  // does the page keep asking.
  const [watching, setWatching] = useState(false);
  const exportsQuery = useGetBookExportsQuery(
    { page },
    { pollingInterval: watching ? POLL_MS : 0 },
  );
  const list = exportsQuery.data?.data ?? [];
  const anyPending = list.some(pending);
  if (anyPending !== watching) setWatching(anyPending);

  return (
    <div>
      <AdminPageHeader
        title="Exports"
        hint="A long book is written to Excel in the background so you are not kept waiting. Its file turns up here, and you get an email when it is ready."
        sub="Files prepared for you in the background, kept for a week"
        actions={
          <AdminButton variant="outline" asChild>
            <Link href="/admin/reports/purchase-book">Purchase book</Link>
          </AdminButton>
        }
      />
      {exportsQuery.isLoading ? (
        <Skeleton className="h-[240px] w-full rounded-none" />
      ) : exportsQuery.isError && list.length === 0 ? (
        <WidgetError
          onRetry={() => void exportsQuery.refetch()}
          what="your exports"
        />
      ) : list.length === 0 ? (
        <WidgetEmpty
          title="No exports yet"
          hint="A short book downloads straight away. A long one is prepared in the background and appears here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((item) => (
            <ExportRow item={item} key={item.id} />
          ))}
          <ListPagination
            page={page}
            totalPages={exportsQuery.data?.meta.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
