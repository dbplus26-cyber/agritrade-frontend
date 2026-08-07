"use client";

import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";

/**
 * The shared activate / deactivate / delete action row on registry edit
 * pages. Deactivation retires the record from new transactions (reversible);
 * deletion is permanent and only allowed while nothing references the record
 * - the backend refuses otherwise and the error surfaces here.
 */
export function LifecycleActions({
  noun,
  name,
  isActive,
  listHref,
  onActivate,
  onDeactivate,
  onDelete,
}: {
  /** Lowercase singular, e.g. "commodity". */
  noun: string;
  name: string;
  isActive: boolean;
  listHref: string;
  onActivate: () => Promise<unknown>;
  onDeactivate: () => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) {
  const router = useRouter();
  const { isSuperAdmin } = useAuthRole();
  const { confirm, confirmationDialog } = useConfirm();

  const toggleActive = async () => {
    const ok = await confirm({
      title: isActive ? `Deactivate ${name}?` : `Activate ${name}?`,
      description: isActive
        ? `New transactions will refuse this ${noun}; history and reports keep it. You can activate it again later.`
        : `This ${noun} becomes selectable in new transactions again.`,
      confirmText: isActive ? "Deactivate" : "Activate",
      isDestructive: isActive,
    });
    if (!ok) return;
    try {
      await (isActive ? onDeactivate() : onActivate());
      notify.success(isActive ? "Deactivated" : "Activated");
    } catch (err) {
      notify.error(`Couldn't update the ${noun}`, {
        description: extractApiError(err).message,
      });
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${name}?`,
      description: `This permanently removes the ${noun} from the register. It is only possible while nothing references it - otherwise deactivate instead.`,
      confirmText: "Delete",
      isDestructive: true,
      requireExactMatch: "delete",
    });
    if (!ok) return;
    try {
      await onDelete();
      notify.success(`${name} deleted`);
      router.replace(listHref);
    } catch (err) {
      notify.error(`Couldn't delete the ${noun}`, {
        description: extractApiError(err).message,
      });
    }
  };

  // The register vocabulary is the owner's to change (design doc 4); staff
  // read it. The API refuses these writes either way - this keeps staff from
  // being offered a button that can only fail.
  if (!isSuperAdmin) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <AdminButton
        type="button"
        variant="outline"
        onClick={() => void toggleActive()}
      >
        {isActive ? "Deactivate" : "Activate"}
      </AdminButton>
      <AdminButton
        type="button"
        variant="outline"
        className="border-console-red/40 text-console-red hover:bg-console-red/5"
        onClick={() => void remove()}
      >
        Delete
      </AdminButton>
      {confirmationDialog}
    </div>
  );
}
