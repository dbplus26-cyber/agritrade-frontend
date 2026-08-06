"use client";

import { useState } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpTip } from "@/components/admin/help-tip";
import { AdminButton, adminSelectClass } from "@/components/admin/ui";
import { useConfirm } from "@/hooks/use-confirm";
import { useChangeUserRoleMutation } from "@/redux/users/users-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { UserRole, type IUser } from "@/types/user.types";
import { ROLE_LABEL, ROLE_OPTIONS } from "./user-bits";

/**
 * Role change as a modal (dms convention) - used from the detail page and the
 * table's row-actions menu. The apply button doubles as the confirmation:
 * the dialog itself states the consequence, so there's one deliberate step.
 */
export function RoleChangeDialog({
  user,
  open,
  onOpenChange,
}: {
  user: IUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [changeRole, { isLoading }] = useChangeUserRoleMutation();
  const [role, setRole] = useState<UserRole>(user.role);
  const { confirm, confirmationDialog } = useConfirm();

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) setRole(user.role);
  };

  const apply = async () => {
    // A role change hands out (or takes away) reach over money and stock, so
    // the email is typed back: on a list of similar names it is the one field
    // that proves the right account is being changed.
    const confirmed = await confirm({
      title: `Change ${user.firstName}'s role?`,
      description: `From ${ROLE_LABEL[user.role]} to ${ROLE_LABEL[role]}. ${user.firstName} is signed out everywhere and their access changes at the next sign-in.`,
      confirmText: "Change role",
      requireExactMatch: user.email,
    });
    if (!confirmed) return;

    try {
      await changeRole({ id: user.id, role }).unwrap();
      notify.success(`Role changed to ${ROLE_LABEL[role]}`);
      onOpenChange(false);
    } catch (err) {
      notify.error("Couldn't change the role", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={close}>
      <ResponsiveDialogContent className="border-adm-line p-5 sm:max-w-[400px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-[15px] font-bold text-adm-ink">
            Change role - {user.firstName} {user.lastName}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-[12.5px] leading-[1.55] text-adm-muted">
            The user is signed out everywhere and their access changes the
            moment they sign back in.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="grid gap-1 py-1">
          <span className="flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-adm-faint">
            <span className="min-w-0">Access level</span>
            <HelpTip
              label="What is access level?"
              text="What this person may see and do: a field agent sees only their own work, a super admin sees everything."
            />
          </span>
          <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger className={cn(adminSelectClass, "w-full")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r} className="cursor-pointer">
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ResponsiveDialogFooter className="flex-row justify-end gap-2">
          <AdminButton
            variant="outline"
            className="h-[34px] px-3.5 text-[13px]"
            disabled={isLoading}
            onClick={() => close(false)}
          >
            Cancel
          </AdminButton>
          <AdminButton
            className="h-[34px] px-4 text-[13px]"
            disabled={isLoading || role === user.role}
            onClick={() => void apply()}
          >
            {isLoading ? "Applying…" : "Change role"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
      {confirmationDialog}
    </ResponsiveDialog>
  );
}
