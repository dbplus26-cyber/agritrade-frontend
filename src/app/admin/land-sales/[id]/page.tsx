import type { Metadata } from "next";
import { LandSaleDetail } from "@/components/admin/land/land-sale-detail";

export const metadata: Metadata = { title: "Land sale" };

export default async function LandSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LandSaleDetail id={id} />;
}
