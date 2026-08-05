import type { Metadata } from "next";
import { Suspense } from "react";
import { UsersTable } from "@/components/admin/users/users-table";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Users" };

/** The Users register. Suspense satisfies useSearchParams (the URL-synced
 * table state) during static prerender. */
export default function UsersPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={6} filters={2} />}>
      <UsersTable />
    </Suspense>
  );
}
