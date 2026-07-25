import type { Metadata } from "next";
import { SeasonDetail } from "@/components/admin/farm/season-detail";

export const metadata: Metadata = { title: "Season" };

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SeasonDetail id={id} />;
}
