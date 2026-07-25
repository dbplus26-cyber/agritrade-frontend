import type { Metadata } from "next";
import { InputItemEdit } from "@/components/admin/farm/input-item-edit";

export const metadata: Metadata = { title: "Edit input item" };

export default async function EditInputItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InputItemEdit id={id} />;
}
