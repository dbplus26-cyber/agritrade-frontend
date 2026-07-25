import type { Metadata } from "next";
import { RepaymentForm } from "@/components/admin/farm/repayment-form";

export default async function NewRepaymentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const farmerId = typeof sp.farmerId === "string" ? sp.farmerId : undefined;
  return <RepaymentForm farmerId={farmerId} />;
}

export const metadata: Metadata = { title: "Record repayment" };
