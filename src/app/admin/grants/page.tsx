import type { Metadata } from "next";
import { GrantsRegister } from "@/components/admin/farm/grants-register";

export const metadata: Metadata = { title: "Input grants" };

export default function GrantsPage() {
  return <GrantsRegister />;
}
