import type { Metadata } from "next";
import { FarmersRegister } from "@/components/admin/farm/farmers-register";

export const metadata: Metadata = { title: "Farmers" };

export default function FarmersPage() {
  return <FarmersRegister />;
}
