import type { Metadata } from "next";
import { FarmApplicationDetail } from "@/components/admin/inbox/farm-application-detail";

export const metadata: Metadata = { title: "Farm application" };

export default async function FarmApplicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FarmApplicationDetail id={id} />;
}
