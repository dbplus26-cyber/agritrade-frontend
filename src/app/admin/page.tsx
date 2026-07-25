import type { Metadata } from "next";
import { DashboardLive } from "@/components/admin/dashboard/dashboard-live";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage() {
  return <DashboardLive />;
}
