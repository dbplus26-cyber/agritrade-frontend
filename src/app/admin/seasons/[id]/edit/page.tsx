import type { Metadata } from "next";
import { SeasonEdit } from "@/components/admin/farm/season-edit";

export const metadata: Metadata = { title: "Edit season" };

export default async function EditSeasonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SeasonEdit id={id} />;
}
