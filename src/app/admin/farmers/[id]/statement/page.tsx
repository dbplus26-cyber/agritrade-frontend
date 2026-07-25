import type { Metadata } from "next";
import { FarmerStatement } from "@/components/admin/farm/farmer-statement";

export const metadata: Metadata = { title: "Farmer statement" };

export default async function FarmerStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const seasonId = typeof sp.seasonId === "string" ? sp.seasonId : undefined;
  return <FarmerStatement id={id} seasonId={seasonId} />;
}
