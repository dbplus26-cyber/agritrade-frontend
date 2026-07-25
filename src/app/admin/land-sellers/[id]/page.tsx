import type { Metadata } from "next";
import { LandSellerEdit } from "@/components/admin/land/land-seller-screens";

export const metadata: Metadata = { title: "Land seller" };

export default async function LandSellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LandSellerEdit id={id} />;
}
