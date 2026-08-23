"use client";

import Link from "next/link";
import { useState } from "react";

import { DASHBOARD_CRUMB } from "@/components/admin/detail-nav";
import { RailCard, RecordShell } from "@/components/admin/record-shell";
import { DetailSkeleton } from "@/components/admin/skeletons";
import {
  adminLinkClass,
  AdminButton,
  AdminCard,
  DetailHeader,
  Mono,
  PdfLink,
  SectionHeading,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { DateOnlyCell, DateTimeCell } from "@/components/admin/date-cell";
import { ExpenseSettlementCard } from "@/components/admin/expenses/expense-settlement-card";
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
      crumbs={[DASHBOARD_CRUMB, { label: "Expenses", href: LIST }]}
      current="Expense details"
      header={
        <DetailHeader
          title="Expense details"
          hint="One cost: what it was for, and what has been paid against it."
          actions={
            <>
              <PdfLink
                href={`${env.SERVER_URI}/api/v1/admin/receipts/expense/${expense.id}.pdf`}
              >
                Voucher PDF
              </PdfLink>
              {isSuperAdmin ? (
                <AdminButton
                  onClick={() => setEditing(true)}
                  type="button"
                >
                  Edit
                </AdminButton>
              ) : null}
            </>
          }
        />
      }
      aside={
        <>
          <RailCard title="Voucher">
            <Mono className="text-[11.5px] text-adm-ink">
              {expense.transactionNo}
            </Mono>
          </RailCard>
          <RailCard title="Dates">
            <div className="flex flex-col gap-2.5">
              <div>
                <div className="text-[10.5px] text-adm-muted">Incurred</div>
                <div className="mt-0.5 text-[11.5px] text-adm-ink">
                  <DateOnlyCell value={expense.incurredAt} />
                </div>
              </div>
              <div>
                <div className="text-[10.5px] text-adm-muted">Recorded</div>
                <div className="mt-0.5 text-[11.5px] text-adm-ink">
                  <DateTimeCell value={expense.createdAt} muted />
                </div>
              </div>
              {/* Only once it differs from the filing. On a voucher nobody has
                  touched the two timestamps are the same moment, and printing
                  it twice says an edit happened that did not. */}
              {expense.updatedAt !== expense.createdAt ? (
                <div>
                  <div className="text-[10.5px] text-adm-muted">Updated</div>
                  <div className="mt-0.5 text-[11.5px] text-adm-ink">
                    <DateTimeCell value={expense.updatedAt} muted />
                  </div>
                </div>
              ) : null}
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
          <Mono className="block text-[21px] leading-[1.1] font-semibold tabular-nums text-adm-ink sm:text-[30px]">
            {formatCedis(expense.amountGhs)}
          </Mono>
        ) : (
          <span className="block text-[12.5px] text-adm-faint">
            Amount hidden
          </span>
        )}
        {/* The category is the cost's classification, and the classification
            has a page of its own carrying every other cost filed under it -
            "what else did we spend on fuel" is the next question after "how
            much was this". */}
        <Link
          className={cn(adminLinkClass, "mt-1.5 inline-block text-[11.5px]")}
          href={`/admin/expense-categories/${expense.category.id}`}
        >
          {expense.category.name}
        </Link>

        {/* The rule stays on the wrapper: it separates the reason from the
            figure above it, and SectionHeading owns the gap beneath itself.
            The trip rides beside the reason rather than in a card of its own:
            a shipment number, a destination and a truck registration do not
            fill a row of the page, and neither does a sentence of reason -
            side by side they fill it between them. */}
        <div className="@container mt-4 border-t border-adm-hairline pt-4">
          <div
            className={cn(
              "grid gap-x-8 gap-y-4",
              expense.shipment && "@2xl:grid-cols-2",
            )}
          >
            <div className="min-w-0">
              <SectionHeading>What it was for</SectionHeading>
              {expense.description ? (
                <p className="text-[11.5px] leading-[1.55] text-adm-body [overflow-wrap:anywhere]">
                  {expense.description}
                </p>
              ) : (
                <p className="text-[11.5px] text-adm-faint">Not recorded</p>
              )}
            </div>
            {/* Only when the cost belongs to a trip. A heading reading "not
                attached to anything" is a reserved slot that never fills. */}
            {expense.shipment ? (
              <div className="min-w-0">
                <SectionHeading hint="This cost rides on a shipment, so it lands in that trip's profit rather than in general overheads.">
                  Charged to a trip
                </SectionHeading>
                <Link
                  href={`/admin/shipments/${expense.shipment.id}`}
                  className={cn(adminLinkClass, "block text-[12px] font-medium")}
                >
                  {expense.shipment.transactionNo}
                </Link>
                <div className="mt-1 text-[11.5px] text-adm-body [overflow-wrap:anywhere]">
                  {expense.shipment.destination}
                  <span className="text-adm-muted">
                    {" · "}
                    {expense.shipment.truckReg}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </AdminCard>

      {/* Whether the money has actually gone out. Directly under the figure
          because "we owe this" and "we have paid this" are one thought, and
          the page has to answer both halves of it. */}
      <ExpenseSettlementCard
        amountGhs={showMoney ? expense.amountGhs : null}
        expenseId={expense.id}
        isVoided={expense.voidedAt !== null}
        subject={`${expense.transactionNo} (${expense.category.name})`}
      />

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
