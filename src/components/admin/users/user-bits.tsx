"use client";

import { HelpWrap } from "@/components/admin/help-tip";
import { ToneBadge, type Tone } from "@/components/admin/ui";
import { UserRole, type IUser } from "@/types/user.types";

export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: "Super admin",
  [UserRole.STAFF]: "Office staff",
  [UserRole.AGENT]: "Field agent",
};

export const ROLE_OPTIONS = [
  UserRole.SUPER_ADMIN,
  UserRole.STAFF,
  UserRole.AGENT,
] as const;

/** One word for where an account stands, blocked being the loudest. */
export function userStatus(user: IUser): { label: string; tone: Tone } {
  if (user.blockedAt) return { label: "Blocked", tone: "alert" };
  if (!user.isActive) return { label: "Suspended", tone: "slate" };
  return { label: "Active", tone: "leaf" };
}

/** What each account state means for whether the person can get in. */
const USER_STATUS_HELP: Record<string, string> = {
  Active: "Can sign in and use the console normally.",
  Blocked: "Locked out and cannot sign in until an admin unblocks the account.",
  Suspended: "Switched off, so they cannot sign in until it is switched back on.",
};

export function StatusBadge({ user }: { user: IUser }) {
  const s = userStatus(user);
  const help = USER_STATUS_HELP[s.label];
  const badge = <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
  return help ? <HelpWrap text={help}>{badge}</HelpWrap> : badge;
}

export function lastActiveLabel(user: IUser): string {
  if (!user.lastLoginAt) return "Never";
  const d = new Date(user.lastLoginAt);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0)
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function initialsOf(user: IUser): string {
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}
