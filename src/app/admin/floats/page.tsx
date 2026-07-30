import type { Metadata } from "next";
import { FloatHoldersScreen } from "@/components/admin/floats/float-holders-screen";

export const metadata: Metadata = { title: "Floats" };

export default function FloatsPage() {
  return <FloatHoldersScreen />;
}
