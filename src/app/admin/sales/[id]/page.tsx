import type { Metadata } from "next";
import { SaleDetail } from "@/components/admin/trading/sale-detail";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const metadata: Metadata = { title: "Sale" };

export default async function SaleDetailPage({
  params,
  searchParams,
}: PageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <SaleDetail id={id} initialPayOpen={sp.pay === "1"} />;
}
