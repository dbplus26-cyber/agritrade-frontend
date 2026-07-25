import type { Metadata } from "next";
import { FarmerForm } from "@/components/admin/farm/farmer-form";

export const metadata: Metadata = { title: "Add farmer" };

export default function NewFarmerPage() {
  return <FarmerForm />;
}
