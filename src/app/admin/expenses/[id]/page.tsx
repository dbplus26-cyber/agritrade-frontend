import type { Metadata } from "next";

import { ExpenseDetail } from "@/components/admin/expenses/expense-detail";

export const metadata: Metadata = { title: "Expense" };

export default async function ExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExpenseDetail id={id} />;
}
