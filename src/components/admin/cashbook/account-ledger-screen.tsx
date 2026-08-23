"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import {
  accountHint,
  Balance,
  sourceLabel,
} from "@/components/admin/cashbook/cash-book-bits";
import {
  EntryDialog,
  ReconcileDialog,
  TransferDialog,
} from "@/components/admin/cashbook/cash-book-dialogs";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { DateOnlyCell } from "@/components/admin/date-cell";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import {
  AdminButton,
  AdminCard,
  DetailHeader,
  Mono,
  SectionHeading,
} from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { usePermissions } from "@/hooks/use-permissions";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import {
  useGetAccountLedgerQuery,
  useGetAccountReconciliationsQuery,
  useGetCashBookQuery,
} from "@/redux/cashbook/cashbook-api";
import type { ILedgerRow } from "@/types/cashbook.types";

const FILTER_DEFAULTS = { size: "20" };
const CASH_BOOK = "/admin/cash-book";

/**
 * One account's statement: every movement in and out, newest first, each line
 * carrying the balance after it.
 *
 * The running balance is what makes this readable as a statement rather than a
 * list of amounts - it is the column somebody's finger follows down the page
 * when they are looking for where the money went.
 */
export function AccountLedgerScreen({ accountId }: { accountId: string }) {
  const [entering, setEntering] = useState(false);
  const [moving, setMoving] = useState(false);
  const [checking, setChecking] = useState(false);

  const { has } = usePermissions();
  const canPost = has("CASHBOOK_POST");

  const { filters, page, setFilter, setPage } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });
  const limit = Number(filters.size) || 20;

  const ledger = useGetAccountLedgerQuery({ accountId, limit, page });
  // The transfer dialog needs somewhere to send money TO, which only the book
  // as a whole knows.
  const book = useGetCashBookQuery();
  const checks = useGetAccountReconciliationsQuery(accountId);

  const account = ledger.data?.summary.account;
  const balance = ledger.data?.summary.balanceGhs ?? null;
  const rows = useMemo(() => ledger.data?.data ?? [], [ledger.data]);
  const total = ledger.data?.meta.total ?? 0;

  const accounts = book.data?.data.accounts ?? [];
  const thisAccount = accounts.find((a) => a.id === accountId);

  const columns = useMemo<ColumnDef<ILedgerRow, unknown>[]>(
    () => [
      {
        id: "when",
        accessorFn: (r) => r.paidAt,
        header: "Date",
        enableSorting: false,
        meta: columnMeta({ card: "meta" }),
        cell: ({ row }) => <DateOnlyCell value={row.original.paidAt} />,
      },
      {
        id: "reference",
        accessorFn: (r) => r.transactionNo,
        header: columnHelp(
          "Reference",
          "The document number this line came from - what you quote when tracing it.",
        ),
        enableSorting: false,
        meta: columnMeta({ card: "meta" }),
        cell: ({ row }) => <Mono>{row.original.transactionNo}</Mono>,
      },
      {
        id: "detail",
        accessorFn: (r) => r.counterparty,
        header: "Detail",
        enableSorting: false,
        // The one free-text column, so it takes the stretch share and is the
        // only thing allowed to be long.
        meta: columnMeta({ card: "title", stretch: true }),
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span className="block min-w-0 @2xl/table:max-w-[90%]">
              <span
                className="block [overflow-wrap:anywhere] @2xl/table:truncate text-adm-ink"
                title={r.counterparty}
              >
                {r.counterparty || sourceLabel(r.source)}
              </span>
              <span className="block text-[11px] text-adm-muted">
                {sourceLabel(r.source)}
                {r.isReversal ? " · reversed" : ""}
              </span>
            </span>
          );
        },
      },
      {
        id: "amount",
        accessorFn: (r) => r.amountGhs,
        header: "In / out",
        enableSorting: false,
        meta: columnMeta({ card: "trailing" }),
        cell: ({ row }) => {
          const r = row.original;
          const amount = r.amountGhs;
          return (
            <span
              className={cn(
                "font-adminmono tabular-nums",
                amount !== null && r.direction === "OUT"
                  ? "text-console-red"
                  : "text-adm-ink",
              )}
            >
              {/* A redacted figure renders as "Hidden", not as 0.00 - the
                  difference between a staff member who may not see money and
                  a line for nothing is the whole point. */}
              {amount === null
                ? formatCedis(null)
                : `${r.direction === "OUT" ? "−" : "+"}${formatCedis(Math.abs(amount))}`}
            </span>
          );
        },
      },
      {
        id: "balance",
        accessorFn: (r) => r.balanceGhs,
        header: columnHelp(
          "Balance",
          "What the account held after this line. Follow it down the page to see where the money went.",
        ),
        enableSorting: false,
        meta: columnMeta({ card: "meta" }),
        cell: ({ row }) => <Balance value={row.original.balanceGhs} />,
      },
    ],
    [],
  );

  if (ledger.isLoading) return <ConsoleTableSkeleton />;
  if (ledger.error) {
    return (
      <ErrorMessage
        description={extractApiError(ledger.error).message}
        onRetry={() => void ledger.refetch()}
      />
    );
  }

  const hint = thisAccount ? accountHint(thisAccount) : undefined;
  const label = account?.label ?? "Account";
  const latestCheck = checks.data?.data.reconciliations[0];

  return (
    <div className="@container/ledger space-y-5">
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Cash book", href: CASH_BOOK }]}
        current={label}
      />
      <DetailHeader
        title={label}
        hint={hint}
        sub="Every movement in and out of this account"
        actions={
          canPost ? (
            <>
              <AdminButton onClick={() => setEntering(true)} type="button">
                Record entry
              </AdminButton>
              <AdminButton
                onClick={() => setMoving(true)}
                type="button"
                variant="ghost"
              >
                Move money
              </AdminButton>
              <AdminButton
                onClick={() => setChecking(true)}
                type="button"
                variant="ghost"
              >
                Check against books
              </AdminButton>
            </>
          ) : null
        }
      />

      <AdminCard className="p-4 sm:p-5">
        <p className="flex items-center text-[11px] font-semibold tracking-wide text-adm-muted uppercase">
          Balance now
        </p>
        <p className="mt-1.5">
          <Balance className="text-[26px] font-bold" value={balance} />
        </p>
        {balance !== null && balance < 0 ? (
          <p className="mt-1.5 text-[11px] text-console-red">
            This account is in the red. Either money left that the books do not
            know about, or its opening balance has not been entered yet.
          </p>
        ) : null}
        {latestCheck ? (
          <p className="mt-2 text-[11px] text-adm-muted">
            Last checked{" "}
            {new Date(latestCheck.performedAt).toLocaleDateString()} -{" "}
            {latestCheck.varianceGhs === 0
              ? "it agreed."
              : `out by ${formatCedis(Math.abs(latestCheck.varianceGhs))}${
                  latestCheck.correctionId ? ", corrected." : ", left standing."
                }`}
          </p>
        ) : null}
      </AdminCard>

      <section>
        <SectionHeading className="mb-2">Movements</SectionHeading>
        <AdminCard>
          {total === 0 && !ledger.isFetching ? (
            <EmptyState
              variant="plain"
              title="Nothing has moved yet"
              description="Every receipt, payment, transfer and entry that touches this account will appear here, newest first."
            />
          ) : (
            <ConsoleDataTable<ILedgerRow>
              columns={columns}
              data={rows}
              isFetching={ledger.isFetching}
              itemNoun="movements"
              rowClassName={() => "h-12 hover:bg-adm-sunken"}
              serverPagination={{
                onPageChange: setPage,
                onPageSizeChange: (size) => setFilter("size", String(size)),
                page,
                pageSize: limit,
                totalCount: total,
              }}
            />
          )}
        </AdminCard>
      </section>

      {checks.data && checks.data.data.reconciliations.length > 0 ? (
        <section>
          <SectionHeading className="mb-2">
            Checks against the books
          </SectionHeading>
          <AdminCard>
            <ul className="divide-y divide-adm-hairline">
              {checks.data.data.reconciliations.map((check) => (
                <li
                  className="flex flex-col gap-1 px-4 py-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between min-[480px]:gap-4"
                  key={check.id}
                >
                  <span className="min-w-0 text-[11.5px] text-adm-body">
                    <span className="block text-adm-ink">
                      {new Date(check.asOf).toLocaleDateString()} - counted{" "}
                      {formatCedis(check.countedBalanceGhs)} against{" "}
                      {formatCedis(check.bookBalanceGhs)}
                    </span>
                    {check.notes ? (
                      <span className="block text-[11px] text-adm-muted [overflow-wrap:anywhere]">
                        {check.notes}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "font-adminmono flex-none text-[11.5px] tabular-nums",
                      check.varianceGhs === 0
                        ? "text-adm-muted"
                        : "text-console-red",
                    )}
                  >
                    {check.varianceGhs === 0
                      ? "Agreed"
                      : `${check.varianceGhs > 0 ? "Over" : "Short"} ${formatCedis(Math.abs(check.varianceGhs))}`}
                  </span>
                </li>
              ))}
            </ul>
          </AdminCard>
        </section>
      ) : null}

      <EntryDialog
        accountId={accountId}
        accountLabel={label}
        onClose={() => setEntering(false)}
        open={entering}
      />
      <TransferDialog
        accounts={accounts}
        defaultFromId={accountId}
        onClose={() => setMoving(false)}
        open={moving}
      />
      <ReconcileDialog
        accountId={accountId}
        accountLabel={label}
        bookBalanceGhs={balance}
        onClose={() => setChecking(false)}
        open={checking}
      />
    </div>
  );
}
