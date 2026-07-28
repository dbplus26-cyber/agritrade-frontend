import type { Metadata } from "next";
import { DriverEdit } from "@/components/admin/logistics/driver-screens";

export const metadata: Metadata = { title: "Driver" };

export default async function DriverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DriverEdit id={id} />;
}
