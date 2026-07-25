import type { Metadata } from "next";
import { PlotForm } from "@/components/admin/land/plot-form";

export const metadata: Metadata = { title: "Add plot" };

export default function NewPlotPage() {
  return <PlotForm />;
}
