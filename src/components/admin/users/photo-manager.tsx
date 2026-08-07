"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Trash2, X } from "lucide-react";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { optimizeImage } from "@/lib/optimize-image";
import type { IUser } from "@/types/user.types";
import { AdminButton } from "@/components/admin/ui";
import { PhotoViewDialog } from "@/components/admin/photo-view";
import { IdentityAvatar } from "./user-identity";

/**
 * The profile-photo control, shared by the self-service profile and the
 * admin's user detail. Choosing a file shows a LOCAL PREVIEW first - nothing
 * uploads until Save; Decline discards the choice. Saving sends the file
 * multipart (the backend owns Cloudinary); Remove is confirm-gated and has
 * the backend delete the asset and clear the stored URL. Clicking an existing
 * photo opens the square full view.
 */
export function PhotoManager({
  user,
  onSave,
  onRemove,
  isSaving,
  size = 104,
}: {
  user: IUser;
  /** Uploads the chosen file (multipart) - resolves on success. */
  onSave: (file: File) => Promise<void>;
  /** Clears the existing photo server-side - resolves on success. */
  onRemove: () => Promise<void>;
  isSaving: boolean;
  size?: number;
}) {
  const { confirm, confirmationDialog } = useConfirm();
  const fileInput = useRef<HTMLInputElement>(null);
  const [viewing, setViewing] = useState(false);
  // File + its object URL travel together; created in the pick handler,
  // revoked on decline/save and once more on unmount.
  const [chosen, setChosen] = useState<{ file: File; url: string } | null>(
    null,
  );
  const chosenUrl = useRef<string | null>(null);

  const dropPreview = () => {
    if (chosenUrl.current) URL.revokeObjectURL(chosenUrl.current);
    chosenUrl.current = null;
    setChosen(null);
    if (fileInput.current) fileInput.current.value = "";
  };
  // Revoke a still-live preview URL when the control unmounts.
  useEffect(
    () => () => {
      if (chosenUrl.current) URL.revokeObjectURL(chosenUrl.current);
    },
    [],
  );

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify.error("Choose an image file (JPG or PNG).");
      return;
    }
    // Downscaled before staging, so the preview shows exactly what uploads.
    const staged = await optimizeImage(file);
    if (chosenUrl.current) URL.revokeObjectURL(chosenUrl.current);
    const url = URL.createObjectURL(staged);
    chosenUrl.current = url;
    setChosen({ file: staged, url });
  };

  const save = async () => {
    if (!chosen) return;
    try {
      await onSave(chosen.file);
      dropPreview();
    } catch {
      // The wrapper toasts; keep the preview so the user can retry/decline.
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Remove this profile photo?",
      description: "The photo is deleted from storage as well.",
      confirmText: "Remove photo",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await onRemove();
    } catch {
      // The wrapper toasts.
    }
  };

  const previewing = chosen !== null;
  const displaySrc = chosen?.url ?? user.profilePicture;

  return (
    <div className="flex flex-none flex-col items-center gap-2">
      {user.profilePicture && !previewing ? (
        <button
          type="button"
          onClick={() => setViewing(true)}
          aria-label="View profile photo"
          title="View photo"
          className="cursor-zoom-in rounded-full outline-none focus-visible:ring-2 focus-visible:ring-console/40"
        >
          <IdentityAvatar
            user={user}
            src={displaySrc}
            size={size}
            busy={isSaving}
            className="ring-4 ring-white"
          />
        </button>
      ) : (
        <div
          className={cn(
            "rounded-full",
            previewing && "ring-2 ring-console-gold ring-offset-2",
          )}
        >
          <IdentityAvatar
            user={user}
            src={displaySrc}
            size={size}
            busy={isSaving}
            className="ring-4 ring-white"
          />
        </div>
      )}

      {previewing ? (
        // Preview mode: commit or walk away - nothing has uploaded yet.
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] font-semibold text-console-gold">
            Preview - not saved yet
          </span>
          <div className="flex items-center gap-1.5">
            <AdminButton size="sm" onClick={() => void save()} disabled={isSaving}>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {isSaving ? "Saving…" : "Save photo"}
            </AdminButton>
            <AdminButton
              variant="outline"
              size="sm"
              onClick={dropPreview}
              disabled={isSaving}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Decline
            </AdminButton>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <AdminButton
              variant="outline"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={isSaving}
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
              {user.profilePicture ? "Change" : "Add photo"}
            </AdminButton>
            {user.profilePicture ? (
              <AdminButton
                variant="outline"
                size="sm"
                onClick={() => void remove()}
                disabled={isSaving}
                aria-label="Remove photo"
                title="Remove photo"
                className="w-7 px-0"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </AdminButton>
            ) : null}
          </div>
          <span className="text-[11px] text-adm-faint">JPG or PNG</span>
        </>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
      {user.profilePicture ? (
        <PhotoViewDialog
          src={user.profilePicture}
          name={`${user.firstName} ${user.lastName}`}
          open={viewing}
          onOpenChange={setViewing}
        />
      ) : null}
      {confirmationDialog}
    </div>
  );
}
