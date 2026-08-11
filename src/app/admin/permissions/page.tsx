import type { Metadata } from "next";
import { Suspense } from "react";
import {
  PermissionsScreen,
  PermissionsSkeleton,
} from "@/components/admin/permissions/permissions-screen";

export const metadata: Metadata = { title: "Permissions" };

/** The Permissions screen. Suspense satisfies useSearchParams (the tab and
 * deep-linked person live in the URL) during static prerender. */
export default function PermissionsPage() {
  return (
    <Suspense fallback={<PermissionsSkeleton />}>
      <PermissionsScreen />
    </Suspense>
  );
}
