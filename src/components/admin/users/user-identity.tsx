"use client";

import { useState } from "react";
import {
  CalendarDays,
  Clock3,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { PhotoViewDialog } from "@/components/admin/photo-view";
import { cn } from "@/lib/utils";
import type { IUser } from "@/types/user.types";

export const ROLE_TITLE: Record<string, string> = {
  SUPER_ADMIN: "Super admin",
  STAFF: "Office staff",
  AGENT: "Field agent",
};

export const initialsFor = (user: Pick<IUser, "firstName" | "lastName">) =>
  `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

/** Photo-or-initials avatar with an optional busy overlay. */
export function IdentityAvatar({
  user,
  src,
  size = 96,
  busy = false,
  className,
}: {
  user: Pick<IUser, "firstName" | "lastName">;
  /** Explicit source (preview/object URL); falls back to initials when null. */
  src?: string | null;
  size?: number;
  busy?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("relative flex-none overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- Cloudinary/objectURL avatar
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-console font-bold text-white"
          style={{ fontSize: size * 0.3 }}
        >
          {initialsFor(user)}
        </div>
      )}
      {busy ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-[rgba(11,15,20,0.45)]">
          <Loader2 className="h-5 w-5 animate-spin text-white" aria-hidden="true" />
        </div>
      ) : null}
    </div>
  );
}

/** Full-size square view of a profile photo, opened from the avatar. */
/** One labelled fact in the identity grid. */
function Fact({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-none bg-console/8 text-console">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-adm-faint">
          {label}
        </dt>
        <dd className="mt-0.5 truncate text-[13.5px] font-medium text-adm-ink">
          {children}
        </dd>
      </div>
    </div>
  );
}

/**
 * The spacious identity fact grid shared by the profile page and the admin's
 * user-detail view - labelled facts breathing in two columns instead of one
 * cramped sentence.
 */
export function IdentityFacts({
  user,
  className,
}: {
  user: IUser;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2",
        className,
      )}
    >
      <Fact label="Email" icon={Mail}>{user.email}</Fact>
      <Fact label="Phone" icon={Phone}>{user.phone ?? "-"}</Fact>
      <Fact label="Role" icon={UserCog}>{ROLE_TITLE[user.role] ?? user.role}</Fact>
      <Fact label="Two-factor" icon={ShieldCheck}>
        {user.twoFactorEnabled ? (
          <span className="text-console">Enabled</span>
        ) : (
          "Off"
        )}
      </Fact>
      <Fact label="Member since" icon={CalendarDays}>
        {new Date(user.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </Fact>
      <Fact label="Last sign-in" icon={Clock3}>
        {user.lastLoginAt
          ? new Date(user.lastLoginAt).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Never"}
      </Fact>
    </dl>
  );
}

/** Avatar that opens the square full-photo view when a photo exists. */
export function ViewablePhoto({
  user,
  size = 96,
}: {
  user: IUser;
  size?: number;
}) {
  const [open, setOpen] = useState(false);
  if (!user.profilePicture) {
    return <IdentityAvatar user={user} src={null} size={size} />;
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View profile photo"
        title="View photo"
        className="cursor-zoom-in rounded-full outline-none focus-visible:ring-2 focus-visible:ring-console/40"
      >
        <IdentityAvatar user={user} src={user.profilePicture} size={size} />
      </button>
      <PhotoViewDialog
        src={user.profilePicture}
        name={`${user.firstName} ${user.lastName}`}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
