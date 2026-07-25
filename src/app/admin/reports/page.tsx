import type { Metadata } from "next";
import { ReportsLive } from "@/components/admin/reports/reports-live";

export const metadata: Metadata = { title: "Reports" };

export default function AdminReportsPage() {
  return <ReportsLive />;
}
