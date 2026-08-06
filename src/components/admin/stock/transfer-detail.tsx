"use client";

import Link from "next/link";

import { DateTimeCell } from "@/components/admin/date-cell";
import { RecordFacts } from "@/components/admin/record-facts";
import { RailCard, RecordShell } from "@/components/admin/record-shell";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { AdminCard, AdminPageHeader, Mono } from "@/components/admin/ui";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { useGetTransferQuery } from "@/redux/transfers/transfers-api";

const LIST = "/admin/transfers";

/**
 * One warehouse-to-warehouse move, in full.
 *
 * The register has to truncate a route, a commodity and a note to stay
 * scannable - which is only defensible if there is somewhere the whole of
 * each can actually be read. This is that somewhere.
 */
export function TransferDetail({ id }: { id: string }) {
  const { data, error, isLoading, refetch } = useGetTransferQuery(id);

  if (isLoading) return <DetailSkeleton facts={6} />;
  if (error || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const t = data.data.transfer;

  return (
    <RecordShell
      backHref={LIST}
      backLabel="All transfers"
      header={
        <AdminPageHeader
          title="Transfer details"
          hint="One movement of stock from one warehouse to another."
          sub={`Transfer ${t.transactionNo}`}
        />
      }
      aside={
        <>
          <RailCard title="Moved">
            <p className="font-adminmono text-[20px] font-bold text-adm-ink tabular-nums">
              {formatKg(t.weightKg)}
            </p>
          </RailCard>
          <RailCard title="When">
            <DateTimeCell value={t.occurredAt} />
          </RailCard>
          <RailCard title="Filed">
            <DateTimeCell muted value={t.createdAt} />
          </RailCard>
        </>
      }
    >
      <AdminCard className="px-5 py-3">
        <RecordFacts
          facts={[
            {
              label: "Reference",
              value: <Mono>{t.transactionNo}</Mono>,
            },
            { label: "Commodity", value: t.commodity.name },
            { label: "From", value: t.fromWarehouse.name },
            { label: "To", value: t.toWarehouse.name },
            { label: "Weight", mono: true, value: formatKg(t.weightKg) },
            { full: true, label: "Notes", value: t.notes },
          ]}
        />
      </AdminCard>

      {/* A transfer is two ledger entries; the stock screen is where they are
          read as such, so the page points at it rather than restating them. */}
      <AdminCard className="px-5 py-3">
        <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
          On the ledger
        </div>
        <p className="text-[13px] text-adm-muted">
          This move wrote a transfer-out against{" "}
          <span className="text-adm-ink">{t.fromWarehouse.name}</span> and a
          matching transfer-in against{" "}
          <span className="text-adm-ink">{t.toWarehouse.name}</span>.{" "}
          <Link
            className="text-console hover:underline"
            href="/admin/stock?tab=movements"
          >
            See the movements
          </Link>
          .
        </p>
      </AdminCard>
    </RecordShell>
  );
}
