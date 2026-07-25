import type { Metadata } from "next";
import { LandSellerCreate } from "@/components/admin/land/land-seller-screens";

export const metadata: Metadata = { title: "New land seller" };

export default function NewLandSellerPage() {
  return <LandSellerCreate />;
}
