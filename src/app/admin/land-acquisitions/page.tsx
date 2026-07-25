import type { Metadata } from "next";
import { LandAcquisitionsRegister } from "@/components/admin/land/land-acquisitions-register";

export const metadata: Metadata = { title: "Land acquisitions" };

export default function LandAcquisitionsPage() {
  return <LandAcquisitionsRegister />;
}
