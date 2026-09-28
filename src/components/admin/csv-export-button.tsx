"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { AdminButton } from "@/components/admin/ui";
import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import { useGetCsvRowsMutation } from "@/redux/exports/exports-api";
import { downloadCsv, toCsv, type CsvExportConfig } from "@/lib/csv-export";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";

export function CsvExportButton<T>({
  config,
  rows,
  disabled = false,
}: {
  config: CsvExportConfig<T>;
  rows?: readonly T[];
  disabled?: boolean;
}) {
  const showMoney = useMoneyVisibility();
  const [fetchRows, { reset }] = useGetCsvRowsMutation();
  const [busy, setBusy] = useState(false);
  const active = useRef<{ cancelled: boolean; abort?: () => void } | null>(
    null,
  );
  useEffect(
    () => () => {
      if (active.current) {
        active.current.cancelled = true;
        active.current.abort?.();
        active.current = null;
      }
    },
    [],
  );

  const run = async () => {
    if (active.current || disabled) return;
    const job = {
      cancelled: false,
      abort: undefined as (() => void) | undefined,
    };
    active.current = job;
    setBusy(true);
    try {
      let records = rows ?? [];
      if (config.source) {
        const request = fetchRows(config.source);
        job.abort = request.abort;
        records = (await request.unwrap()) as T[];
      }
      if (!job.cancelled) {
        downloadCsv(config.filename, toCsv(config.columns, records, showMoney));
      }
    } catch (error) {
      if (!job.cancelled) notify.error(extractApiError(error).message);
    } finally {
      reset();
      if (active.current === job) {
        active.current = null;
        setBusy(false);
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <AdminButton
        type="button"
        variant="outline"
        disabled={disabled || busy}
        loading={busy}
        onClick={() => void run()}
        title="Export all rows matching the current filters"
      >
        <Download aria-hidden="true" className="size-3.5" />
        {busy ? "Exporting..." : "Export CSV"}
      </AdminButton>
      {busy ? (
        <AdminButton
          type="button"
          variant="ghost"
          onClick={() => {
            if (active.current) {
              active.current.cancelled = true;
              active.current.abort?.();
            }
          }}
        >
          Cancel export
        </AdminButton>
      ) : null}
    </div>
  );
}
