"use client";

import Link from "next/link";
import { useState } from "react";

import { RailCard, RecordShell } from "@/components/admin/record-shell";
import { DetailSkeleton } from "@/components/admin/skeletons";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  Mono,
  PdfLink,
} from "@/components/admin/ui";
import { DateOnlyCell, DateTimeCell } from "@/components/admin/date-cell";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import { env } from "@/lib/env";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { useGetExpenseCategoriesQuery } from "@/redux/expense-categories/expense-categories-api";
import { useGetExpenseQuery } from "@/redux/expenses/expenses-api";

import { ExpenseFormDialog } from "./expense-form";

const LIST = "/admin/expenses";

/**
 * One recorded cost, in full.
 *
 * The amount leads. An expense is a number with a reason attached, and the
 * number is what anybody opening this page came for - so it is set at display
 * size with the category directly under it, and everything else is filed
 * around that rather than competing with it. A staff member without financial
 * visibility gets the same page with the figure withheld; the reason, the date
 * and the trip are operational and survive the redaction.
 */
export function ExpenseDetail({ id }: { id: string }) {
  const showMoney = useMoneyVisibility();
  const { isSuperAdmin } = useAuthRole();
  const [editing, setEditing] = useState(false);
  const { data, error, isError, isLoading, refetch } = useGetExpenseQuery(id);
  // Only fetched for the edit dialog, which needs the list to populate its
  // category select; skipped entirely for staff, who cannot edit.
  const categories = useGetExpenseCategoriesQuery(
    { isActive: true, limit: 100 },
    { skip: !isSuperAdmin },
  );

  if (isLoading) return <DetailSkeleton />;
  if (isError || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const expense = data.data.expense;

  return (
    <RecordShell
      backHref={LIST}
      backLabel="All expenses"
      header={
        <AdminPageHeader
          title="Expense details"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <PdfLink
                href={`${env.SERVER_URI}/api/v1/admin/receipts/expense/${expense.id}.pdf`}
              >
                Voucher PDF
              </PdfLink>
              {isSuperAdmin ? (
                <AdminButton
                  className="h-9 px-4"
                  onClick={() => setEditing(true)}
                  type="button"
                >
                  Edit
                </AdminButton>
              ) : null}
            </div>
          }
        />
      }
      aside={
        <>
          <RailCard title="Voucher">
            <Mono className="text-[13px] text-adm-ink">
              {expense.transactionNo}
            </Mono>
          </RailCard>
          <RailCard title="Dates">
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="text-[11.5px] text-adm-muted">Incurred</div>
                <div className="mt-0.5 text-[13px] text-adm-ink">
                  <DateOnlyCell value={expense.incurredAt} />
                </div>
              </div>
              <div>
                <div className="text-[11.5px] text-adm-muted">Recorded</div>
                <div className="mt-0.5 text-[13px] text-adm-ink">
                  <DateTimeCell value={expense.createdAt} muted />
                </div>
              </div>
            </div>
          </RailCard>
        </>
      }
    >
      {/* The figure and its reason, together and alone. Splitting them across
          two cards made a page of four boxes each holding one short fact,
          which is the "printout of the row" the record shell exists to
          avoid. */}
      <AdminCard className="p-5">
        {showMoney ? (
          <Mono className="block text-[30px] leading-[1.1] font-semibold tabular-nums text-adm-ink">
            {formatCedis(expense.amountGhs)}
          </Mono>
        ) : (
          <span className="block text-[15px] text-adm-faint">
            Amount hidden
          </span>
        )}
        <div className="mt-1.5 text-[13px] text-adm-muted">
          {expense.category.name}
        </div>

        <div className="mt-4 border-t border-adm-hairline pt-4">
          <div className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            What it was for
          </div>
          {expense.description ? (
            <p className="mt-1.5 text-[13.5px] leading-[1.55] text-adm-body [overflow-wrap:anywhere]">
              {expense.description}
            </p>
          ) : (
            <p className="mt-1.5 text-[13.5px] text-adm-faint">Not recorded</p>
          )}
        </div>
      </AdminCard>

      {/* Only when the cost belongs to a trip. An "Operating cost" card
          saying nothing more than "not attached to anything" is a reserved
          slot that never fills, which reads as a gap rather than a fact. */}
      {expense.shipment ? (
        <AdminCard className="p-5">
          <div className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            Charged to a trip
          </div>
          <Link
            href={`/admin/shipments/${expense.shipment.id}`}
            className="mt-2 block text-[14px] font-medium text-console hover:underline"
          >
            {expense.shipment.transactionNo}
          </Link>
          <div className="mt-1 text-[13px] text-adm-body [overflow-wrap:anywhere]">
            {expense.shipment.destination}
            <span className="text-adm-muted">
              {" · "}
              {expense.shipment.truckReg}
            </span>
          </div>
        </AdminCard>
      ) : null}

      {isSuperAdmin && editing ? (
        <ExpenseFormDialog
          categories={categories.data?.data ?? []}
          expense={expense}
          onOpenChange={setEditing}
          open={editing}
        />
      ) : null}
    </RecordShell>
  );
}
