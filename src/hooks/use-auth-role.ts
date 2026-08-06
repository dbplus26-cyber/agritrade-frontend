"use client";

import { useCurrentUser } from "./use-current-user";
import { UserRole } from "@/types/user.types";

export interface AuthRole {
  role: UserRole | null;
  isSuperAdmin: boolean;
  isStaff: boolean;
  isAgent: boolean;
  /** Whether the current user holds any of the given roles. */
  hasRole: (...roles: UserRole[]) => boolean;
}

/**
 * Current user's role, read from the auth store. The backend authorizes with
 * the `UserRole` enum (`SUPER_ADMIN | STAFF | AGENT`) resolved live from the
 * DB - that is the real enforcement. This hook only decides what the UI
 * shows/hides.
 */
export function useAuthRole(): AuthRole {
  const user = useCurrentUser();
  const role = user?.role ?? null;

  const isSuperAdmin = role === UserRole.SUPER_ADMIN;
  const isStaff = role === UserRole.STAFF;
  const isAgent = role === UserRole.AGENT;

  const hasRole = (...roles: UserRole[]) =>
    role !== null && roles.includes(role);

  return { role, isSuperAdmin, isStaff, isAgent, hasRole };
}
