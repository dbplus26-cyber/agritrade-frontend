import type { Metadata } from "next";
import { InputItemsRegister } from "@/components/admin/farm/input-items-register";

export const metadata: Metadata = { title: "Input items" };

export default function InputItemsPage() {
  return <InputItemsRegister />;
}
