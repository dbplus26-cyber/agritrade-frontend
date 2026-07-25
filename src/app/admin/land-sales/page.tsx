import type { Metadata } from "next";
import { LandSalesRegister } from "@/components/admin/land/land-sales-register";

export const metadata: Metadata = { title: "Land sales" };

export default function LandSalesPage() {
  return <LandSalesRegister />;
}
