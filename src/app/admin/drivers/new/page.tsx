import type { Metadata } from "next";
import { DriverCreate } from "@/components/admin/logistics/driver-screens";

export const metadata: Metadata = { title: "Add driver" };

export default function NewDriverPage() {
  return <DriverCreate />;
}
