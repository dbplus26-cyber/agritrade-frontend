import type { Metadata } from "next";
import { SaleForm } from "@/components/admin/trading/sale-form";

export const metadata: Metadata = { title: "New sale" };

export default function NewSalePage() {
  return <SaleForm />;
}
