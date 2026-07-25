import type { Metadata } from "next";
import { FarmerEdit } from "@/components/admin/farm/farmer-edit";

export const metadata: Metadata = { title: "Edit farmer" };

export default async function EditFarmerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FarmerEdit id={id} />;
}
