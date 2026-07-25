import type { Metadata } from "next";
import { ExpensesRegister } from "@/components/admin/expenses/expenses-register";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return <ExpensesRegister />;
}
