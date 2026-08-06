"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  DetailGrid,
  DetailItem,
  DetailShell,
  SectionHeading,
  ToneBadge,
  adminInputClass,
} from "@/components/admin/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { BackButton } from "@/components/ui/BackButton";
import { useConfirm } from "@/hooks/use-confirm";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useActivateUserMutation,
  useDeactivateUserMutation,
  useDeleteUserMutation,
  useGetUserQuery,
  useResetUserTwoFactorMutation,
  useSendUserPasswordResetMutation,
  useUnblockUserMutation,
  useUpdateUserMutation,
} from "@/redux/users/users-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IUser } from "@/types/user.types";
import { editUserSchema, type EditUserValues } from "@/validations/user-schema";
import { StatusBadge } from "./user-bits";
import { IdentityFacts, ROLE_TITLE } from "./user-identity";
import { PhotoManager } from "./photo-manager";
import { RoleChangeDialog } from "./role-dialog";

const onApiError = (title: string) => (err: unknown) => {
  notify.error(title, { description: extractApiError(err).message });
};

/* ── Identity + details (read-only until Edit) ───────────────────────────── */

/** PhotoManager wired to the admin PATCH /admin/users/:id. */
function UserPhoto({ user }: { user: IUser }) {
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  return (
    <PhotoManager
      user={user}
      isSaving={isLoading}
      onSave={async (file) => {
        try {
          await updateUser({ id: user.id, body: {}, photo: file }).unwrap();
          notify.success("Profile photo updated");
        } catch (err) {
          notify.error("Couldn't upload the photo", {
            description: extractApiError(err).message,
          });
          throw err;
        }
      }}
      onRemove={async () => {
        try {
          await updateUser({
            id: user.id,
            body: { removeProfilePicture: true },
          }).unwrap();
          notify.success("Profile photo removed");
        } catch (err) {
          notify.error("Couldn't remove the photo", {
            description: extractApiError(err).message,
          });
          throw err;
        }
      }}
    />
  );
}

function IdentityCard({ user, isSelf }: { user: IUser; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);

  return (
    <AdminCard className="overflow-hidden p-0">
      {/* Forest banner mirroring the profile page - one identity language. */}
      <div className="relative h-[88px] overflow-hidden bg-gradient-to-r from-console-deep via-console to-[#2C5B3E]">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent 0 14px, #fff 14px 15px)",
          }}
        />
        <span
          aria-hidden="true"
          className="absolute right-4 top-1/2 hidden -translate-y-1/2 text-[13px] font-extrabold uppercase tracking-[0.3em] text-white/25 sm:block"
        >
          DB Plus
        </span>
      </div>

      <div className="px-4 pb-6 sm:px-6">
        <div className="-mt-[52px] flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:gap-5">
          <UserPhoto user={user} />
          <div className="w-full min-w-0 flex-1 text-center sm:w-auto sm:pb-2 sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2
                title={`${user.firstName} ${user.lastName}`}
                className="line-clamp-2 max-w-full break-words text-[17px] font-bold tracking-[-0.01em] text-adm-ink sm:text-[20px]"
              >
                {user.firstName} {user.lastName}
              </h2>
              <ToneBadge tone="forest">
                {ROLE_TITLE[user.role] ?? user.role}
              </ToneBadge>
              <StatusBadge user={user} />
              {isSelf ? (
                <span className="text-[11px] font-semibold text-adm-faint">
                  (you)
                </span>
              ) : null}
            </div>
            <p
              className="mt-0.5 truncate text-[13px] text-adm-muted"
              title={user.email}
            >
              {user.email}
            </p>
            {user.pendingEmail ? (
              <p className="mt-1 text-[12px] font-medium text-console-gold">
                Email change to {user.pendingEmail} awaiting confirmation.
              </p>
            ) : null}
          </div>
          {!editing ? (
            <AdminButton
              variant="secondary"
              className="h-[34px] flex-none px-3.5 text-[13px] whitespace-nowrap sm:mb-2"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Edit details
            </AdminButton>
          ) : null}
        </div>

        <div className="mt-6 border-t border-adm-hairline pt-5">
          {editing ? (
            <EditDetailsForm
              user={user}
              isSelf={isSelf}
              onClose={() => setEditing(false)}
            />
          ) : (
            <>
              <IdentityFacts user={user} />

              {/* These two permissions used to be a hand-rolled dt/dd pair,
                  so they read a size and a weight apart from every other fact
                  in the console. DetailItem is the same pair, shared. */}
              <div className="mt-5 border-t border-adm-hairline pt-4">
                <DetailGrid columns={2}>
                  <DetailItem label="Can approve">
                    {user.canApprove ? (
                      <span className="text-console">
                        Yes - may decide approvals
                      </span>
                    ) : (
                      "No"
                    )}
                  </DetailItem>
                  <DetailItem label="Financial visibility">
                    {user.financialVisibility ? (
                      <span className="text-console">
                        Full - sees money columns
                      </span>
                    ) : (
                      "Hidden"
                    )}
                  </DetailItem>
                </DetailGrid>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminCard>
  );
}

function EditDetailsForm({
  user,
  isSelf,
  onClose,
}: {
  user: IUser;
  isSelf: boolean;
  onClose: () => void;
}) {
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone ?? "",
      canApprove: user.canApprove,
      financialVisibility: user.financialVisibility,
    },
  });

  const onSubmit = async (values: EditUserValues) => {
    try {
      await updateUser({
        id: user.id,
        body: {
          firstName: values.firstName,
          lastName: values.lastName,
          ...(values.email !== user.email ? { email: values.email } : {}),
          phone: values.phone?.trim() ? values.phone.trim() : null,
          // Own flags are admin-locked backend-side; don't send them for self.
          ...(isSelf
            ? {}
            : {
                canApprove: values.canApprove,
                financialVisibility: values.financialVisibility,
              }),
        },
      }).unwrap();
      notify.success("User updated");
      onClose();
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of ["firstName", "lastName", "email", "phone"] as const) {
          if (fieldErrors[field]) setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error("Couldn't update the user", { description: message });
    }
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="grid max-w-[560px] gap-[15px]"
    >
      <div className="grid gap-[15px] sm:grid-cols-2">
        <AdminField label="First name" error={errors.firstName?.message}>
          <Input
            placeholder="e.g. Amina"
            className={cn(
              adminInputClass,
              errors.firstName && "border-console-red",
            )}
            {...register("firstName")}
          />
        </AdminField>
        <AdminField label="Last name" error={errors.lastName?.message}>
          <Input
            placeholder="e.g. Abdulai"
            className={cn(
              adminInputClass,
              errors.lastName && "border-console-red",
            )}
            {...register("lastName")}
          />
        </AdminField>
      </div>
      <AdminField
        label="Email"
        hint="Admin changes apply immediately (no confirmation email)."
        error={errors.email?.message}
      >
        <Input
          type="email"
          placeholder="them@dbplus.com"
          className={cn(adminInputClass, errors.email && "border-console-red")}
          {...register("email")}
        />
      </AdminField>
      <AdminField label="Phone" optional error={errors.phone?.message}>
        <Input
          type="tel"
          placeholder="024 000 0000"
          className={cn(adminInputClass, errors.phone && "border-console-red")}
          {...register("phone")}
        />
      </AdminField>

      {isSelf ? null : (
      <div className="grid gap-3 rounded-[6px] border border-adm-line bg-adm-sunken p-3.5">
        <Controller
          control={control}
          name="canApprove"
          render={({ field }) => (
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-[13px] font-semibold text-adm-ink">
                  Can approve
                </span>
                <span className="block text-[12px] text-adm-muted">
                  May decide pending approval requests.
                </span>
              </span>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </label>
          )}
        />
        <Controller
          control={control}
          name="financialVisibility"
          render={({ field }) => (
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span>
                <span className="block text-[13px] font-semibold text-adm-ink">
                  Financial visibility
                </span>
                <span className="block text-[12px] text-adm-muted">
                  May see prices, totals and profit.
                </span>
              </span>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </label>
          )}
        />
      </div>
      )}

      <div className="flex gap-2">
        <AdminButton
          type="submit"
          disabled={isLoading}
          className="h-[36px] px-4 text-[13px]"
        >
          {isLoading ? "Saving…" : "Save changes"}
        </AdminButton>
        <AdminButton
          type="button"
          variant="outline"
          disabled={isLoading}
          className="h-[36px] px-3.5 text-[13px]"
          onClick={onClose}
        >
          Cancel
        </AdminButton>
      </div>
    </form>
  );
}

/* ── Role (display; changes happen in the modal) ────────────────────────── */

function RoleCard({ user, isSelf }: { user: IUser; isSelf: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    // Plain-div anchor: the row-actions menu deep-links here as /users/:id#role.
    <div id="role" className="scroll-mt-20">
      <AdminCard className="px-4 py-[18px] sm:px-6">
        <SectionHeading className="mb-3.5">Role</SectionHeading>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-adm-ink">
              {ROLE_TITLE[user.role] ?? user.role}
            </div>
            <div className="mt-0.5 text-[12.5px] text-adm-muted">
              {isSelf
                ? "You cannot change your own role."
                : "Changing the role signs the user out everywhere."}
            </div>
          </div>
          {!isSelf ? (
            <AdminButton
              variant="secondary"
              className="h-[34px] flex-none px-3.5 text-[13px] whitespace-nowrap"
              onClick={() => setDialogOpen(true)}
            >
              Change role
            </AdminButton>
          ) : null}
        </div>
        <RoleChangeDialog
          user={user}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      </AdminCard>
    </div>
  );
}

/* ── Account actions ─────────────────────────────────────────────────────── */

function ActionsCard({ user, isSelf }: { user: IUser; isSelf: boolean }) {
  const router = useRouter();
  const { confirm, confirmationDialog } = useConfirm();
  const [deactivate, { isLoading: deactivating }] = useDeactivateUserMutation();
  const [activate, { isLoading: activating }] = useActivateUserMutation();
  const [unblock, { isLoading: unblocking }] = useUnblockUserMutation();
  const [reset2fa, { isLoading: resetting }] = useResetUserTwoFactorMutation();
  const [sendReset, { isLoading: sending }] = useSendUserPasswordResetMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const name = `${user.firstName} ${user.lastName}`;

  const rows: {
    key: string;
    title: string;
    sub: string;
    button: string;
    busy: boolean;
    destructive?: boolean;
    hidden?: boolean;
    run: () => Promise<void>;
  }[] = [
    {
      key: "reset-link",
      title: "Send password-reset link",
      sub: "Emails them the standard single-use reset link.",
      button: "Send link",
      busy: sending,
      hidden: isSelf,
      run: async () => {
        if (
          !(await confirm({
            title: `Email a reset link to ${name}?`,
            description: `The link goes to ${user.email}, expires in 30 minutes and can be used once.`,
            confirmText: "Send link",
          }))
        )
          return;
        await sendReset(user.id).unwrap();
        notify.success("Reset link sent");
      },
    },
    {
      key: "unblock",
      title: "Unblock sign-in",
      sub: "Clears the failed-attempts block so they can sign in again.",
      button: "Unblock",
      busy: unblocking,
      hidden: !user.blockedAt,
      run: async () => {
        if (
          !(await confirm({
            title: `Unblock ${name}?`,
            description:
              "If the failed attempts weren't theirs, someone may be guessing their password - worth a phone call first.",
            confirmText: "Unblock",
          }))
        )
          return;
        await unblock(user.id).unwrap();
        notify.success("Account unblocked");
      },
    },
    {
      key: "reset-2fa",
      title: "Reset two-factor authentication",
      sub: "For a user locked out of their codes; they sign in with password only and can re-enable it.",
      button: "Reset 2FA",
      busy: resetting,
      hidden: !user.twoFactorEnabled || isSelf,
      run: async () => {
        if (
          !(await confirm({
            title: `Reset 2FA for ${name}?`,
            description:
              "Their codes are deleted, every session is signed out, and they're notified by email.",
            confirmText: "Reset 2FA",
          }))
        )
          return;
        await reset2fa(user.id).unwrap();
        notify.success("Two-factor authentication reset");
      },
    },
    user.isActive
      ? {
          key: "deactivate",
          title: "Deactivate account",
          sub: "Suspends sign-in and kills live sessions. Reversible.",
          button: "Deactivate",
          busy: deactivating,
          destructive: true,
          hidden: isSelf,
          run: async () => {
            if (
              !(await confirm({
                title: `Deactivate ${name}?`,
                description:
                  "They are signed out everywhere and cannot sign in until reactivated.",
                confirmText: "Deactivate",
                isDestructive: true,
              }))
            )
              return;
            await deactivate(user.id).unwrap();
            notify.success("Account deactivated");
          },
        }
      : {
          key: "activate",
          title: "Activate account",
          sub: "Restores sign-in - and clears any failed-attempts block too.",
          button: "Activate",
          busy: activating,
          hidden: isSelf,
          run: async () => {
            if (
              !(await confirm({
                title: `Activate ${name}?`,
                description: "They can sign in again immediately.",
                confirmText: "Activate",
              }))
            )
              return;
            await activate(user.id).unwrap();
            notify.success("Account activated");
          },
        },
    {
      key: "delete",
      title: "Delete account",
      sub: "Removes the account and frees the email for re-registration. This cannot be undone.",
      button: "Delete",
      busy: deleting,
      destructive: true,
      hidden: isSelf,
      run: async () => {
        if (
          !(await confirm({
            title: `Delete ${name}?`,
            description: `This permanently removes their access. Type their email to confirm.`,
            confirmText: "Delete user",
            isDestructive: true,
            requireExactMatch: user.email,
          }))
        )
          return;
        await deleteUser(user.id).unwrap();
        notify.success("User deleted");
        router.replace("/admin/users");
      },
    },
  ];

  const visible = rows.filter((r) => !r.hidden);
  if (visible.length === 0) return null;

  return (
    <AdminCard className="overflow-hidden">
      <div className="px-6 pt-3.5 pb-1">
        <SectionHeading className="mb-0">Account actions</SectionHeading>
      </div>
      {visible.map((row) => (
        <div
          key={row.key}
          className="flex flex-col items-start gap-2.5 border-t border-adm-hairline px-4 py-3 first:border-t-0 sm:flex-row sm:items-center sm:gap-3 sm:px-6"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-adm-ink">
              {row.title}
            </div>
            <div className="mt-px text-[12.5px] text-adm-muted">{row.sub}</div>
          </div>
          <AdminButton
            variant={row.destructive ? "danger" : "secondary"}
            disabled={row.busy}
            className="h-[32px] flex-none px-3 text-[12.5px] whitespace-nowrap"
            onClick={() =>
              void row.run().catch(onApiError(`Couldn't ${row.button.toLowerCase()}`))
            }
          >
            {row.busy ? "Working…" : row.button}
          </AdminButton>
        </div>
      ))}
      {confirmationDialog}
    </AdminCard>
  );
}

/* ── Loading shape ───────────────────────────────────────────────────────── */

/**
 * Skeleton mirroring the detail layout (dms convention: every screen loads in
 * its own silhouette, never a generic spinner) - banner, overlapping avatar,
 * fact grid and the role/actions cards, so nothing jumps when data lands.
 */
function UserDetailSkeleton() {
  return (
    <div aria-hidden="true" className="w-full max-w-[1120px]">
      <Skeleton className="mb-2 h-6 w-24 rounded-[6px]" />
      <div className="mb-5">
        <Skeleton className="h-5 w-44 rounded-[4px]" />
        <Skeleton className="mt-2 h-3 w-60 rounded-[4px]" />
      </div>

      <DetailShell
        asideFirstOnStack={false}
        main={
        <AdminCard className="overflow-hidden p-0">
          <Skeleton className="h-[88px] w-full rounded-[6px]" />
          <div className="px-4 pb-6 sm:px-6">
            <div className="-mt-[52px] flex flex-col items-center gap-3 sm:flex-row sm:items-end sm:gap-5">
              <Skeleton className="h-[104px] w-[104px] flex-none rounded-full ring-4 ring-white" />
              <div className="min-w-0 flex-1 space-y-2 text-center sm:pb-2 sm:text-left">
                <Skeleton className="mx-auto h-4 w-40 rounded-[4px] sm:mx-0" />
                <Skeleton className="mx-auto h-3 w-56 rounded-[4px] sm:mx-0" />
              </div>
              <Skeleton className="h-8 w-28 flex-none rounded-[6px] sm:mb-2" />
            </div>
            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-4 border-t border-adm-hairline pt-5 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Skeleton className="h-7 w-7 flex-none rounded-[6px]" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-2.5 w-16 rounded-[4px]" />
                    <Skeleton className="h-3.5 w-[70%] rounded-[4px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AdminCard>
        }
        aside={
          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }, (_, i) => (
              <AdminCard key={i} className="px-4 py-[18px] sm:px-6">
                <Skeleton className="h-2.5 w-20 rounded-[4px]" />
                <div className="mt-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-36 rounded-[4px]" />
                    <Skeleton className="h-3 w-64 max-w-full rounded-[4px]" />
                  </div>
                  <Skeleton className="h-8 w-24 flex-none rounded-[6px]" />
                </div>
              </AdminCard>
            ))}
          </div>
        }
      />
    </div>
  );
}

/* ── Screen ──────────────────────────────────────────────────────────────── */

export function UserDetail({ id }: { id: string }) {
  const me = useCurrentUser();
  const { data, isLoading, isError, error, refetch } = useGetUserQuery(id);

  if (isLoading) return <UserDetailSkeleton />;
  if (isError || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const user = data.data.user;
  const isSelf = me?.id === user.id;

  return (
    <div className="w-full max-w-[1120px]">
      <BackButton href="/admin/users" label="All users" className="mb-2" />
      <AdminPageHeader
        title="User details"
        hint="One person's access: their role and what they are allowed to do."
      />

      <DetailShell
        asideFirstOnStack={false}
        main={<IdentityCard user={user} isSelf={isSelf} />}
        aside={
          <div className="flex flex-col gap-4">
            <RoleCard user={user} isSelf={isSelf} />
            <ActionsCard user={user} isSelf={isSelf} />
          </div>
        }
      />
    </div>
  );
}
