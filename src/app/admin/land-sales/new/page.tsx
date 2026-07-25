import type { Metadata } from "next";
import { LandSaleForm } from "@/components/admin/land/land-sale-form";

export default async function NewLandSalePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const plotId = typeof sp.plotId === "string" ? sp.plotId : undefined;
  return <LandSaleForm plotId={plotId} />;
}

export const metadata: Metadata = { title: "New land sale" };
