import type { Metadata } from "next";
import { PlotEdit } from "@/components/admin/land/plot-edit";

export const metadata: Metadata = { title: "Edit plot" };

export default async function EditPlotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PlotEdit id={id} />;
}
