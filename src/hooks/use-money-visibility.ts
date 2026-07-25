"use client";

import { useCurrentUser } from "./use-current-user";
import { UserRole } from "@/types/user.types";

/**
 * Whether the signed-in user may see money columns, mirroring the backend's
 * `resolveMoneyVisibility`: the owner and agents always can, staff only when
 * the owner granted `financialVisibility`.
 *
 * This hook decides only what the UI bothers to RENDER — the enforcement is
 * the API's, which sends `null` in every redacted money field regardless of
 * what the client believes. Use it to drop whole columns, inputs and totals
 * that would otherwise be a row of "Hidden" placeholders; use the null-aware
 * `formatCedis` for individual values.
 */
export function useMoneyVisibility(): boolean {
  const user = useCurrentUser();
  if (!user) return false;
  return user.role === UserRole.STAFF ? user.financialVisibility : true;
}
