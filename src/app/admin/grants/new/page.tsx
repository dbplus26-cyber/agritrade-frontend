import type { Metadata } from "next";
import { GrantForm } from "@/components/admin/farm/grant-form";

export default async function NewGrantPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const farmerId = typeof sp.farmerId === "string" ? sp.farmerId : undefined;
  return <GrantForm farmerId={farmerId} />;
}

export const metadata: Metadata = { title: "New grant" };
