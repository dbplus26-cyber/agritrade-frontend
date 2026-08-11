"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/use-permissions";
import type { Permission } from "@/types/permission.types";

/**
 * Wraps a field-app form the owner can switch off per role or per agent.
 * The backend guard is the real fence (403 MISSING_PERMISSION); this keeps
 * the app honest about it instead of offering a form that cannot save.
 */
export function AgentPermissionGate({
  children,
  permission,
}: {
  children: ReactNode;
  permission: Permission;
}) {
  const { has } = usePermissions();
  if (has(permission)) return <>{children}</>;
  return (
    <div className="rounded-none border border-soil/25 bg-paper px-4 py-8 text-center">
      <p className="text-[15px] font-semibold text-ink">
        This is switched off for you
      </p>
      <p className="mx-auto mt-1 max-w-[340px] text-[12.5px] leading-[1.55] text-soil">
        The office has not opened this action for your account. If that seems
        wrong, call the office - they can switch it on from the console.
      </p>
      <Link
        href="/agent"
        className="mt-4 inline-block text-[13.5px] font-semibold text-forest underline underline-offset-2"
      >
        Back to home
      </Link>
    </div>
  );
}
