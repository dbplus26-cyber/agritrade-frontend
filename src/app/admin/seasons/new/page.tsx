import type { Metadata } from "next";
import { SeasonForm } from "@/components/admin/farm/season-form";

export const metadata: Metadata = { title: "New season" };

export default function NewSeasonPage() {
  return <SeasonForm />;
}
