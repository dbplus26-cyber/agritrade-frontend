import type { Metadata } from "next";
import { PlotDetail } from "@/components/admin/land/plot-detail";

export const metadata: Metadata = { title: "Plot" };

export default async function PlotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlotDetail id={id} />;
}
