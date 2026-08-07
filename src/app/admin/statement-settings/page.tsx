import type { Metadata } from "next";
import { Suspense } from "react";
import { StatementSettingsScreen } from "@/components/admin/statements/statement-settings-screen";
import { FormSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Statement Settings" };

export default function StatementSettingsPage() {
  return (
    <Suspense fallback={<FormSkeleton fields={8} className="max-w-none" />}>
      <StatementSettingsScreen />
    </Suspense>
  );
}
