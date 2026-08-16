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

  /**
   * Deliberately NOT gated by a confirmation.
   *
   * Retiring is undone by the same button, which turns into Activate the
   * moment it lands - and it used to raise a dialog while sitting in the same
   * row, at the same weight, as Delete. Deactivate is the one of the pair
   * people actually use, so that dialog was teaching them that the dialog in
   * this row is the thing you dismiss on the way to what you wanted. The
   * sentence it carried is now printed under the buttons where it is read
   * BEFORE the click rather than after it, and the friction is spent where it
   * cannot be won back: on Delete.
   */
  const toggleActive = async () => {
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
    // The server refuses this while anything references the record, so the
    // dialog says what that check means rather than repeating it: a delete
    // that goes through took a record nothing was using, and a delete that is
    // refused is telling you to deactivate instead.
    const ok = await confirm({
      title: `Delete ${name}?`,
      description: `This takes the ${noun} off the register for good. The server refuses it while anything at all still references the record, so if it goes through, nothing was using it - and deactivating is the answer for a ${noun} that something was.`,
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
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
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
      </div>
      {/* What the ungated button does, standing where it is read before the
          tap. This is the sentence the deactivate dialog used to carry. */}
      <p className="mt-2 text-[12.5px] text-adm-muted">
        {isActive
          ? `Deactivating stops new transactions offering this ${noun}; history and reports keep it, and you can activate it again from here.`
          : `Activating makes this ${noun} selectable in new transactions again.`}
      </p>
      {confirmationDialog}
    </div>
  );
}
