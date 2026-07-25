import type { Metadata } from "next";
import { LandAcquisitionDetail } from "@/components/admin/land/land-acquisition-detail";

export const metadata: Metadata = { title: "Land acquisition" };

export default async function LandAcquisitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LandAcquisitionDetail id={id} />;
}
