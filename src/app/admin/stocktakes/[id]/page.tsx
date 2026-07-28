import type { Metadata } from "next";
import { StocktakeDetail } from "@/components/admin/stock/stocktake-detail";

export const metadata: Metadata = { title: "Stocktake" };

export default async function StocktakePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StocktakeDetail id={id} />;
}
