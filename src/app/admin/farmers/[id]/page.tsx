import type { Metadata } from "next";
import { FarmerDetail } from "@/components/admin/farm/farmer-detail";

export const metadata: Metadata = { title: "Farmer" };

export default async function FarmerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FarmerDetail id={id} />;
}
