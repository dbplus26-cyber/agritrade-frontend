import type { Metadata } from "next";
import { GrantAging } from "@/components/admin/farm/grant-aging";

export const metadata: Metadata = { title: "Grant aging" };

export default function GrantAgingPage() {
  return <GrantAging />;
}
