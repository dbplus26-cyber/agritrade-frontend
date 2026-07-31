"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  KeyRound,
  MoreHorizontal,
  Power,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useConfirm } from "@/hooks/use-confirm";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useActivateUserMutation,
  useDeactivateUserMutation,
  useDeleteUserMutation,
  useSendUserPasswordResetMutation,
  useUnblockUserMutation,
} from "@/redux/users/users-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import type { IUser } from "@/types/user.types";
import { RoleChangeDialog } from "./role-dialog";

/**
 * Per-row actions menu (dms-frontend convention): view/edit, send reset link,
 * unblock, deactivate/activate, delete — each behind its confirm gate. Role
 * changes live on the detail page (they carry more context).
 */
export function UserActionsDropdown({ user }: { user: IUser }) {
  const router = useRouter();
  const me = useCurrentUser();
  const isSelf = me?.id === user.id;
  const { confirm, confirmationDialog } = useConfirm();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const [sendReset] = useSendUserPasswordResetMutation();
  const [unblock] = useUnblockUserMutation();
  const [deactivate] = useDeactivateUserMutation();
  const [activate] = useActivateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const name = `${user.firstName} ${user.lastName}`;
  const fail = (title: string) => (err: unknown) => {
    notify.error(title, { description: extractApiError(err).message });
  };

  const onSendReset = async () => {
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
  };

  const onUnblock = async () => {
    if (
      !(await confirm({
        title: `Unblock ${name}?`,
        description:
          "If the failed attempts weren't theirs, someone may be guessing their password — worth a phone call first.",
        confirmText: "Unblock",
      }))
    )
      return;
    await unblock(user.id).unwrap();
    notify.success("Account unblocked");
  };

  const onToggleActive = async () => {
    if (user.isActive) {
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
    } else {
      if (
        !(await confirm({
          title: `Activate ${name}?`,
          description:
            "They can sign in again immediately — this also clears any failed-attempts block.",
          confirmText: "Activate",
        }))
      )
        return;
      await activate(user.id).unwrap();
      notify.success("Account activated");
    }
  };

  const onDelete = async () => {
    if (
      !(await confirm({
        title: `Delete ${name}?`,
        description:
          "This permanently removes their access. Type their email to confirm.",
        confirmText: "Delete user",
        isDestructive: true,
        requireExactMatch: user.email,
      }))
    )
      return;
    await deleteUser(user.id).unwrap();
    notify.success("User deleted");
  };

  return (
    // display:contents wrapper — layout-neutral, but it intercepts the React
    // SYNTHETIC bubble from the portaled menu/dialogs. Radix portals render at
    // <body> in the DOM, yet React events still bubble through the component
    // tree — without this, a click inside the role dialog or a confirm dialog
    // reaches the table row's onClick and navigates to the detail page.
    <span className="contents" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${name}`}
          onClick={(e) => e.stopPropagation()}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-[6px] text-adm-faint outline-none hover:bg-soil/10 hover:text-adm-muted focus-visible:ring-2 focus-visible:ring-console/40"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-52"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenuLabel
            title={name}
            className="max-w-full truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-adm-faint"
          >
            {name}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-[13px]"
            onClick={() => router.push(`/admin/users/${user.id}`)}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            View & edit
          </DropdownMenuItem>
          {!isSelf ? (
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-[13px]"
              onClick={() => setRoleDialogOpen(true)}
            >
              <UserCog className="h-3.5 w-3.5" aria-hidden="true" />
              Change role
            </DropdownMenuItem>
          ) : null}
          {!isSelf ? (
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-[13px]"
              onClick={() =>
                void onSendReset().catch(fail("Couldn't send the link"))
              }
            >
              <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
              Send reset link
            </DropdownMenuItem>
          ) : null}
          {user.blockedAt ? (
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-[13px]"
              onClick={() => void onUnblock().catch(fail("Couldn't unblock"))}
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Unblock sign-in
            </DropdownMenuItem>
          ) : null}
          {!isSelf ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-[13px]"
                onClick={() =>
                  void onToggleActive().catch(fail("Couldn't update the account"))
                }
              >
                <Power className="h-3.5 w-3.5" aria-hidden="true" />
                {user.isActive ? "Deactivate account" : "Activate account"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-[13px] text-console-red focus:text-console-red"
                onClick={() => void onDelete().catch(fail("Couldn't delete"))}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete user
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <RoleChangeDialog
        user={user}
        open={roleDialogOpen}
        onOpenChange={setRoleDialogOpen}
      />
      {confirmationDialog}
    </span>
  );
}
