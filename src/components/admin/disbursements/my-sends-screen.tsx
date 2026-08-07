"use client";

import { useState } from "react";
import { AdminButton, AdminPageHeader, Mono } from "@/components/admin/ui";
import { DateTimeCell } from "@/components/admin/date-cell";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { useGetMyDisbursementsQuery } from "@/redux/disbursements/disbursements-api";
import type { IDisbursement } from "@/types/disbursement.types";
import {
  DisbursementStatusBadge,
  RAIL_LABEL,
  TitledCard,
  recipientLine,
} from "./disbursement-bits";
import { SendMoneyDialog, type SendSurface } from "./send-money-dialog";

const PAGE_SIZE = 10;

/**
 * "What have I sent" - the same screen for a staff member in the console and
 * a field agent in the app, because it is the same question and the same
 * answer. Only the namespace behind it differs, and the server scopes both to
 * the caller, so neither can reach anybody else's money.
 *
 * A card list rather than a table: this is read on a phone as often as a
 * desk, and five stacked facts per send do not survive being squeezed into
 * columns.
 */
export function MySendsScreen({
  availableGhs,
  surface,
}: {
  /** The sender's remaining float, for the dialog's guidance line. */
  availableGhs?: null | number;
  surface: Extract<SendSurface, "agent" | "staff">;
}) {
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const { data, error, isLoading, refetch } = useGetMyDisbursementsQuery({
    limit: PAGE_SIZE,
    page,
    surface,
  });

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="My sends"
        hint="Money you personally have sent out, and whether it arrived."
        sub="Money you have sent, and what Hubtel said about each one"
        actions={
          <AdminButton onClick={() => setSending(true)} type="button">
            Send money
          </AdminButton>
        }
      />

      {isLoading ? (
        <ConsoleTableSkeleton />
      ) : error ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : total === 0 ? (
        <EmptyState
          title="You have not sent anything yet"
          description="Money you send from your float appears here, with its status."
        />
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((d) => (
              <SendCard key={d.id} send={d} />
            ))}
          </div>
          <ListPagination
            onPageChange={setPage}
            page={page}
            totalPages={Math.ceil(total / PAGE_SIZE)}
          />
        </>
      )}

      <SendMoneyDialog
        availableGhs={availableGhs}
        onClose={() => setSending(false)}
        open={sending}
        surface={surface}
      />
    </div>
  );
}

function SendCard({ send }: { send: IDisbursement }) {
  return (
    <TitledCard title={RAIL_LABEL[send.rail]}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1">
        <div className="min-w-0">
          <p className="[overflow-wrap:anywhere] md:truncate text-[14px] font-medium text-adm-ink">
            {send.recipientName}
          </p>
          <p className="font-adminmono truncate text-[11.5px] text-adm-faint">
            {recipientLine(send)}
          </p>
        </div>
        <p className="font-adminmono text-[16px] font-bold tabular-nums">
          {formatCedis(send.amountGhs)}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-adm-hairline pt-2">
        <DisbursementStatusBadge
          needsAttention={send.needsAttention}
          status={send.status}
        />
        <span className="text-[11.5px] text-adm-muted">
          <Mono>{send.transactionNo}</Mono> ·{" "}
          <DateTimeCell value={send.createdAt} />
        </span>
      </div>
      {send.failureReason ? (
        <p className="border-t border-adm-hairline pt-2 text-[12.5px] text-console-red">
          {send.failureReason}
        </p>
      ) : null}
    </TitledCard>
  );
}
