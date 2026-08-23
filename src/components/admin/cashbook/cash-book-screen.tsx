"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  accountHint,
  Balance,
} from "@/components/admin/cashbook/cash-book-bits";
import { TransferDialog } from "@/components/admin/cashbook/cash-book-dialogs";
import { HelpTip } from "@/components/admin/help-tip";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
} from "@/components/admin/ui";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { usePermissions } from "@/hooks/use-permissions";
import { extractApiError } from "@/lib/extract-api-error";
import { cn } from "@/lib/utils";
import { useGetCashBookQuery } from "@/redux/cashbook/cashbook-api";
import type { IAccountBalance } from "@/types/cashbook.types";

const CASH_BOOK = "/admin/cash-book";

/**
 * Where the business's money is, account by account.
 *
 * This is a different question from the payment-account register, which asks
 * "where do customers send money". The till, the Hubtel wallets and the cash an
 * agent is holding are all real money and none of them belongs on an invoice,
 * so they live here and nowhere else.
 */
export function CashBookScreen() {
  const [moving, setMoving] = useState(false);
  const { has } = usePermissions();
  const canPost = has("CASHBOOK_POST");

  const { data, error, isFetching, isLoading, refetch } = useGetCashBookQuery();
  const accounts = useMemo(() => data?.data.accounts ?? [], [data]);

  // The company's own accounts first, then money a person is holding: the
  // owner reads down the list asking "where is it", and "in Kwame's pocket" is
  // a different kind of answer from "in Ecobank".
  const company = accounts.filter((a) => !a.holderUserId);
  const held = accounts.filter((a) => a.holderUserId);

  if (isLoading) return <ConsoleTableSkeleton />;
  if (error) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const suspense = data?.data.suspenseGhs ?? 0;

  return (
    <div className="@container/cashbook">
      <AdminPageHeader
        title="Cash book"
        hint="Every place the business's money can sit, what each holds, and every movement in and out."
        sub="What the business holds, account by account"
        actions={
          canPost ? (
            <AdminButton onClick={() => setMoving(true)} type="button">
              Move money
            </AdminButton>
          ) : null
        }
      />

      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 @2xl/cashbook:grid-cols-2">
          <PositionCard
            hint="Everything the business holds, across every account except suspense."
            title="Money on hand"
            value={data?.data.cashGhs ?? null}
          />
          <PositionCard
            hint="Payments whose account nobody recorded. Not a loss - a question. Move each one to the account it actually went through."
            title="Waiting to be placed"
            value={data?.data.suspenseGhs ?? null}
            warn={suspense !== 0}
          />
        </div>

        <AccountList
          accounts={company}
          emptyText="No company accounts yet. Add one on the Payment Accounts screen."
          title="Company accounts"
        />
        {held.length > 0 ? (
          <AccountList
            accounts={held}
            emptyText=""
            title="Money people are holding"
          />
        ) : null}

        {isFetching ? (
          <p className="text-[11px] text-adm-muted">Refreshing…</p>
        ) : null}
      </div>

      <TransferDialog
        accounts={accounts}
        onClose={() => setMoving(false)}
        open={moving}
      />
    </div>
  );
}

/** One headline figure. */
function PositionCard({
  hint,
  title,
  value,
  warn = false,
}: {
  hint: string;
  title: string;
  value: number | null;
  warn?: boolean;
}) {
  return (
    <AdminCard className="p-4 sm:p-5">
      <p className="flex items-center text-[11px] font-semibold tracking-wide text-adm-muted uppercase">
        {title}
        <HelpTip className="ml-1.5" label={`What is ${title}?`} text={hint} />
      </p>
      <p className="mt-1.5">
        <Balance
          className={cn(
            "text-[24px] font-bold @sm/cashbook:text-[26px]",
            warn ? "text-console-red" : undefined,
          )}
          value={value}
        />
      </p>
    </AdminCard>
  );
}

/**
 * A list of accounts and their balances.
 *
 * A row per account rather than a table: there are two columns of interest
 * (which account, how much) and a table's chrome earns nothing at that width.
 * The label takes its own line above the figure below `sm` - a long label and
 * a right-aligned amount competing for a 280px row squeezes the label into a
 * sliver.
 */
function AccountList({
  accounts,
  emptyText,
  title,
}: {
  accounts: IAccountBalance[];
  emptyText: string;
  title: string;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[11.5px] font-semibold tracking-wide text-adm-muted uppercase">
        {title}
      </h2>
      <AdminCard>
        {accounts.length === 0 ? (
          <p className="p-4 text-[11.5px] text-adm-muted">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-adm-hairline">
            {accounts.map((account) => (
              <AccountRow account={account} key={account.id} />
            ))}
          </ul>
        )}
      </AdminCard>
    </section>
  );
}

function AccountRow({ account }: { account: IAccountBalance }) {
  const hint = accountHint(account);
  return (
    <li>
      <Link
        className="flex flex-col gap-1 px-4 py-3 outline-none hover:bg-adm-sunken focus-visible:bg-adm-sunken min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between min-[420px]:gap-4"
        href={`${CASH_BOOK}/${account.id}`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "min-w-0 text-[12px] font-medium [overflow-wrap:anywhere]",
              account.isActive ? "text-adm-ink" : "text-adm-muted",
            )}
          >
            {account.label}
          </span>
          {hint ? (
            <HelpTip
              className="flex-none"
              label={`What is ${account.label}?`}
              text={hint}
            />
          ) : null}
          {!account.isActive ? (
            <span className="flex-none text-[10.5px] text-adm-muted">
              (retired)
            </span>
          ) : null}
        </span>
        {/* flex-none: the figure is the point of the row and never truncates. */}
        <Balance className="flex-none text-[12.5px]" value={account.balanceGhs} />
      </Link>
    </li>
  );
}
