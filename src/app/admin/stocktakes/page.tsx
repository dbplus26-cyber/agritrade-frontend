import type { Metadata } from "next";
import { StocktakesScreen } from "@/components/admin/stock/stocktakes-screen";

export const metadata: Metadata = { title: "Stocktakes" };

export default function StocktakesPage() {
  return <StocktakesScreen />;
}
