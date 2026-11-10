import type { Metadata } from "next";
import { PurchaseBook } from "@/components/admin/reports/purchase-book";

export const metadata: Metadata = { title: "Purchase book" };

export default function AdminPurchaseBookPage() {
  return <PurchaseBook />;
}
