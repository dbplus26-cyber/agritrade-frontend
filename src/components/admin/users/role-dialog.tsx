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
import { AdminButton, adminSelectClass } from "@/components/admin/ui";
import { useChangeUserRoleMutation } from "@/redux/users/users-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { UserRole, type IUser } from "@/types/user.types";
import { ROLE_LABEL, ROLE_OPTIONS } from "./user-bits";

/**
 * Role change as a modal (dms convention) — used from the detail page and the
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

  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) setRole(user.role);
  };

  const apply = async () => {
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
      <ResponsiveDialogContent className="border-soil/25 p-5 sm:max-w-[400px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-[15px] font-bold text-ink">
            Change role - {user.firstName} {user.lastName}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-[12.5px] leading-[1.55] text-soil">
            The user is signed out everywhere and their access changes the
            moment they sign back in.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="grid gap-1 py-1">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-soil/70">
            Access level
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
    </ResponsiveDialog>
  );
}
