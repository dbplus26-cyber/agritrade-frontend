"use client";

import { useCurrentUser } from "./use-current-user";
import type { Permission } from "@/types/permission.types";

/**
 * The signed-in user's effective permission set, as `/auth/me` reported it
 * (role baseline plus personal grants). UI gating ONLY - the backend guards
 * are the real enforcement; this just keeps the console from offering doors
 * that would 403.
 *
 * A session minted before the permissions deploy carries no list. That reads
 * as "unknown", and unknown must not blank a working console - `has` answers
 * true and the server stays the judge until the next /auth/me refresh.
 */
export function usePermissions(): {
  has: (permission: Permission) => boolean;
  /** True once the session actually carries a permission list. */
  known: boolean;
} {
  const user = useCurrentUser();
  const list = user?.permissions;
  return {
    has: (permission) =>
      Array.isArray(list) ? list.includes(permission) : true,
    known: Array.isArray(list),
  };
}
