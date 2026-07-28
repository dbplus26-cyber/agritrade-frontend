import type { Metadata } from "next";
import { StocktakeNew } from "@/components/admin/stock/stocktake-new";

export const metadata: Metadata = { title: "New stocktake" };

export default function NewStocktakePage() {
  return <StocktakeNew />;
}
