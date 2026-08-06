"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { DateTimeCell } from "@/components/admin/date-cell";
import {
  Money,
  TitledCard,
  TransferStatusBadge,
  useIdempotencyKey,
} from "@/components/admin/disbursements/disbursement-bits";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import {
  AdminButton,
  AdminField,
  AdminPageHeader,
  DetailRow,
  Mono,
  adminInputClass,
} from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreateBalanceTransferMutation,
  useGetBalanceTransfersQuery,
  useGetTreasuryQuery,
} from "@/redux/treasury/treasury-api";
import type {
  IAccountBalance,
  IBalanceTransfer,
} from "@/types/disbursement.types";
import {
  balanceTransferSchema,
  type BalanceTransferValues,
} from "@/validations/disbursement-schema";

const FILTER_DEFAULTS = { size: "10" };

/**
 * The company's own position at Hubtel.
 *
 * Two accounts and one action between them: customers' money lands in the
 * COLLECTION account, every payout is drawn on the DISBURSEMENT account, and
 * nothing moves between them by itself. When the disbursement account empties
 * nobody in the business can send - including the owner - so this screen's
 * job is to make that state impossible to miss before it happens.
 */
export function TreasuryScreen() {
  const [transferring, setTransferring] = useState(false);
  const treasury = useGetTreasuryQuery();
  const overview = treasury.data?.data.treasury;

  const { filters, page, setFilter, setPage } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });
  const limit = Number(filters.size);
  const transfers = useGetBalanceTransfersQuery({ limit, page });
  const rows = transfers.data?.data ?? [];
  const total = transfers.data?.meta.total ?? 0;

  const columns = useMemo<ColumnDef<IBalanceTransfer, unknown>[]>(
    () => [
      {
        id: "reference",
        accessorFn: (t) => t.transactionNo,
        header: columnHelp(
          "Reference",
          "The number Hubtel gives this movement, so you can trace it with them.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <Mono>{row.original.transactionNo}</Mono>,
      },
      {
        id: "amount",
        accessorFn: (t) => t.amountGhs,
        header: "Amount",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <Money value={row.original.amountGhs} />,
      },
      {
        id: "description",
        accessorFn: (t) => t.description,
        header: "Description",
        enableSorting: false,
        // The one free-text column here, so it takes the stretch share. It
        // stays xl-only: below that the row is all references and figures,
        // and there is nothing left to bound.
        meta: columnMeta({ stretch: true, wide: true }),
        cell: ({ row }) => (
          // A bare `truncate` here did nothing: with no width to truncate
          // AGAINST, the column simply grew to the longest description and
          // took the table with it.
          <span
            className="block max-w-[90%] truncate text-left"
            title={row.original.description}
          >
            {row.original.description}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (t) => t.status,
        header: "Status",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <TransferStatusBadge
            needsAttention={row.original.needsAttention}
            status={row.original.status}
          />
        ),
      },
      {
        id: "movedBy",
        accessorFn: (t) => t.requestedByName ?? "Unknown",
        header: "Moved by",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
      },
      {
        id: "when",
        accessorFn: (t) => t.createdAt,
        header: "When",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
    ],
    [],
  );

  if (treasury.isLoading) return <ConsoleTableSkeleton />;
  if (treasury.error) {
    return (
      <ErrorMessage
        description={extractApiError(treasury.error).message}
        onRetry={() => void treasury.refetch()}
      />
    );
  }

  // Nothing here works without credentials, and saying so plainly beats a
  // screen of empty figures the owner would read as "we have no money".
  if (overview && !overview.configured) {
    return (
      <div className="space-y-5">
        <AdminPageHeader title="Company account"
        hint="The business's own balance, and moving money between its accounts." />
        <EmptyState
          title="Hubtel is not connected"
          description="This server has no Hubtel credentials, so balances cannot be read and no money can be sent. Whoever administers the server needs to set them."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Company account"
        hint="The business's own balance, and moving money between its accounts."
        sub="What the business holds at Hubtel, and moving it where it is needed"
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminButton
              disabled={treasury.isFetching}
              onClick={() => void treasury.refetch()}
              type="button"
              variant="ghost"
            >
              {treasury.isFetching ? "Checking…" : "Refresh"}
            </AdminButton>
            <AdminButton onClick={() => setTransferring(true)} type="button">
              Move funds across
            </AdminButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <BalanceCard
          account={overview?.collection}
          hint="Where customers' payments land."
          title="Collection account"
        />
        <BalanceCard
          account={overview?.disbursement}
          hint="Every payout is drawn on this one. When it empties, nobody can send."
          title="Payout account"
          warn
        />
      </div>

      <TitledCard title="Money moved between the accounts">
        {total === 0 && !transfers.isFetching ? (
          <div className="py-6">
            <EmptyState
              title="Nothing moved yet"
              description="Transfers from the collection account into the payout account appear here."
            />
          </div>
        ) : (
          <ConsoleDataTable<IBalanceTransfer>
            columns={columns}
            data={rows}
            isFetching={transfers.isFetching}
            itemNoun="transfers"
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
      </TitledCard>

      <TransferDialog
        availableGhs={overview?.collection.amountGhs ?? null}
        onClose={() => setTransferring(false)}
        open={transferring}
      />
    </div>
  );
}

/**
 * One account's balance. A null amount is rendered as "could not be checked",
 * NOT as GH₵ 0.00 - the difference between an empty account and an
 * unreachable Hubtel is the whole point, and getting it wrong here would have
 * the owner topping up an account that was never short.
 */
function BalanceCard({
  account,
  hint,
  title,
  warn = false,
}: {
  account?: IAccountBalance;
  hint: string;
  title: string;
  warn?: boolean;
}) {
  const unknown = !account || account.amountGhs === null;
  return (
    <TitledCard title={title}>
      <div className="py-2">
        {unknown ? (
          <p className="text-[15px] font-medium text-console-red">
            Could not be checked just now
          </p>
        ) : (
          <p
            className={cn(
              "font-adminmono text-[26px] font-bold tabular-nums",
              warn && account.amountGhs === 0 ? "text-console-red" : "text-adm-ink",
            )}
          >
            {formatCedis(account.amountGhs)}
          </p>
        )}
        <p className="mt-1 text-[12.5px] text-adm-muted">{hint}</p>
      </div>
      {account?.accountNumber ? (
        <div className="border-t border-adm-hairline">
          <DetailRow label="Account">
            <Mono>{account.accountNumber}</Mono>
          </DetailRow>
        </div>
      ) : null}
      {account?.fetchedAt ? (
        <div className="border-t border-adm-hairline">
          <DetailRow label="As of">
            <DateTimeCell value={account.fetchedAt} />
          </DetailRow>
        </div>
      ) : null}
    </TitledCard>
  );
}

function TransferDialog({
  availableGhs,
  onClose,
  open,
}: {
  availableGhs: null | number;
  onClose: () => void;
  open: boolean;
}) {
  const [createTransfer, { isLoading }] = useCreateBalanceTransferMutation();
  const form = useForm<BalanceTransferValues>({
    defaultValues: { amountGhs: "", description: "" },
    resolver: zodResolver(balanceTransferSchema),
  });

  // One key per opening, so re-submitting after a timeout is the same
  // transfer rather than a second one.
  const idempotencyKey = useIdempotencyKey(open);
  useEffect(() => {
    if (open) form.reset({ amountGhs: "", description: "" });
  }, [form, open]);

  const onSubmit = async (values: BalanceTransferValues) => {
    try {
      const res = await createTransfer({
        body: {
          amountGhs: Number(values.amountGhs),
          description: values.description,
        },
        idempotencyKey: idempotencyKey(),
      }).unwrap();
      notify.success(res.message);
      onClose();
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[520px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Move funds across</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            From the collection account into the payout account, so sends have
            something to draw on.
            {availableGhs !== null
              ? ` The collection account holds ${formatCedis(availableGhs)}.`
              : ""}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="space-y-4 px-4 pb-2 sm:px-0"
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        >
          <AdminField
            label="Amount (GH₵)"
            error={form.formState.errors.amountGhs?.message}
          >
            <Input
              className={cn(adminInputClass, "font-adminmono")}
              inputMode="decimal"
              placeholder="0.00"
              {...form.register("amountGhs")}
            />
          </AdminField>
          <AdminField
            label="What is it for?"
            error={form.formState.errors.description?.message}
          >
            <Input
              className={adminInputClass}
              maxLength={100}
              placeholder="e.g. Weekly top-up for field payouts"
              {...form.register("description")}
            />
          </AdminField>
          <p className="text-[12.5px] text-adm-muted">
            Hubtel usually settles this in under a minute. Until it confirms,
            the transfer shows as &ldquo;with Hubtel&rdquo; rather than done -
            the money is not counted before it has actually moved.
          </p>
        </form>

        <ResponsiveDialogFooter>
          <AdminButton onClick={onClose} type="button" variant="ghost">
            Cancel
          </AdminButton>
          <AdminButton
            disabled={isLoading}
            onClick={() => void form.handleSubmit(onSubmit)()}
            type="button"
          >
            {isLoading ? "Moving…" : "Move funds"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
