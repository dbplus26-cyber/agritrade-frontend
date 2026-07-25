import type { Metadata } from "next";
import { LandAcquisitionForm } from "@/components/admin/land/land-acquisition-form";

export const metadata: Metadata = { title: "New land acquisition" };

export default function NewLandAcquisitionPage() {
  return <LandAcquisitionForm />;
}
