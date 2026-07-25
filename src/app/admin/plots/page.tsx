import type { Metadata } from "next";
import { PlotsRegister } from "@/components/admin/land/plots-register";

export const metadata: Metadata = { title: "Land plots" };

export default function PlotsPage() {
  return <PlotsRegister />;
}
