import type { Metadata } from "next";
import { CashBookScreen } from "@/components/admin/cashbook/cash-book-screen";

export const metadata: Metadata = {
  title: "Cash book",
  description: "Where the business's money is, account by account.",
};

export default function CashBookPage() {
  return <CashBookScreen />;
}
