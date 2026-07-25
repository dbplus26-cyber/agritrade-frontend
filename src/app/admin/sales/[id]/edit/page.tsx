import type { Metadata } from "next";
import { SaleEdit } from "@/components/admin/trading/sale-edit";

export const metadata: Metadata = { title: "Edit sale" };

export default async function EditSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SaleEdit id={id} />;
}
