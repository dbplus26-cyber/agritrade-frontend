import type { Metadata } from "next";
import { InputItemForm } from "@/components/admin/farm/input-item-form";

export const metadata: Metadata = { title: "New input item" };

export default function NewInputItemPage() {
  return <InputItemForm />;
}
