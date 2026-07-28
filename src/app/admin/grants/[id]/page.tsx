import type { Metadata } from "next";
import { GrantDetail } from "@/components/admin/farm/grant-detail";

export const metadata: Metadata = { title: "Grant" };

export default async function GrantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <GrantDetail id={id} />;
}
