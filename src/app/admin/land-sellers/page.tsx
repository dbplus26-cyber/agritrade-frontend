import type { Metadata } from "next";
import { LandSellerTable } from "@/components/admin/land/land-seller-screens";

export const metadata: Metadata = { title: "Land sellers" };

export default function LandSellersPage() {
  return <LandSellerTable />;
}
