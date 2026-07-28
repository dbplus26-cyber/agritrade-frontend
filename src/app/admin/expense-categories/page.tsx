import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpenseCategoryTable } from "@/components/admin/registry/expense-category-screens";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Expense Categories" };

export default function ExpenseCategoriesPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={3} filters={1} />}>
      <ExpenseCategoryTable />
    </Suspense>
  );
}
