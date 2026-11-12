import type { Metadata } from "next";
import { BookSettings } from "@/components/admin/reports/book-settings";

export const metadata: Metadata = { title: "Book settings" };

export default function AdminBookSettingsPage() {
  return <BookSettings />;
}
