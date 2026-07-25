import type { Metadata } from "next";
import { SaleInvoice } from "@/components/admin/trading/sale-invoice";

export const metadata: Metadata = { title: "Invoice" };

export default async function SaleInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SaleInvoice id={id} />;
}
