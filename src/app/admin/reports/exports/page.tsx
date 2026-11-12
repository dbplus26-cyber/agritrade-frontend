import type { Metadata } from "next";
import { BookExports } from "@/components/admin/reports/book-exports";

export const metadata: Metadata = { title: "Exports" };

export default function AdminExportsPage() {
  return <BookExports />;
}
