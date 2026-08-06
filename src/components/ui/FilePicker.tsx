"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { AdminButton } from "@/components/admin/ui";
import { notify } from "@/lib/notify";
import { optimizeImage } from "@/lib/optimize-image";
import { cn } from "@/lib/utils";

/**
 * Choose a file, LOOK at it, then decide.
 *
 * The pattern this replaces was select-and-send: the native picker's onChange
 * fired the upload directly, so a mis-tapped file was already in Cloudinary and
 * attached to the record before the user saw what they had picked. On a phone,
 * where the gallery is a grid of near-identical weigh-slip photos, that is a
 * routine mistake with no undo short of deleting the uploaded asset.
 *
 * So: pick → preview → Save or Clear. Nothing leaves the browser until the
 * user confirms. Images preview as a thumbnail (after downscaling, so the
 * preview shows exactly what will upload, not a 12MP original); anything else
 * previews as a name + size chip, which is all a PDF can honestly offer.
 *
 * Two shapes, because "save" means different things:
 *
 *   default - the picker owns the action. Preview, then Save uploads it now.
 *             Used on detail screens where the file IS the change.
 *   stage   — the picker is a form FIELD. The chosen file goes into form state
 *             immediately so the form's own submit carries it, and the preview
 *             plus Clear are what let the user check and change their mind
 *             before that submit. A second "Save" here would be a button that
 *             saves nothing.
 */
/** A readable size. Sub-kilobyte files show bytes - "0 KB" reads as an error. */
const fileSize = (bytes: number): string => {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function FilePicker({
  accept = "image/*",
  busy = false,
  /** Hint under the control, e.g. "JPG or PNG, up to 10MB". */
  hint,
  /** Camera-first on phones. Set for weigh slips and other field capture. */
  capture,
  className,
  confirmLabel = "Save",
  /** Downscale images before preview + upload. On by default for images. */
  optimize = true,
  onConfirm,
  /** Form-field mode: stage into form state on pick; the form submits it. */
  stage = false,
  triggerLabel = "Choose file",
}: {
  accept?: string;
  busy?: boolean;
  capture?: "environment" | "user";
  className?: string;
  confirmLabel?: string;
  hint?: string;
  /** Receives the prepared file - on confirm, or immediately when staging. */
  onConfirm: (file: null | File) => Promise<void> | void;
  optimize?: boolean;
  stage?: boolean;
  triggerLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<null | string>(null);
  const [staged, setStaged] = useState<null | { file: File; url: null | string }>(
    null,
  );
  const [preparing, setPreparing] = useState(false);

  const revoke = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
  };
  // A preview URL still alive at unmount would leak the blob for the tab's life.
  useEffect(() => revoke, []);

  const clear = () => {
    revoke();
    setStaged(null);
    // Reset the input, or re-picking the SAME file fires no change event.
    if (inputRef.current) inputRef.current.value = "";
    // In form mode the field owns a value, so clearing has to reach the form.
    if (stage) void onConfirm(null);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setPreparing(true);
    try {
      const isImage = file.type.startsWith("image/");
      const prepared = isImage && optimize ? await optimizeImage(file) : file;
      revoke();
      const url = isImage ? URL.createObjectURL(prepared) : null;
      objectUrl.current = url;
      setStaged({ file: prepared, url });
      if (stage) await onConfirm(prepared);
    } catch {
      notify.error("Couldn't read that file. Try another one.");
      clear();
    } finally {
      setPreparing(false);
    }
  };

  const confirm = async () => {
    if (!staged) return;
    try {
      await onConfirm(staged.file);
      clear();
    } catch {
      // The caller toasts. Keep the preview so the user can retry or clear
      // rather than having to find the file again.
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {staged ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[6px] border border-console-gold/50 bg-console-gold/5 p-2.5">
          {staged.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img
              src={staged.url}
              alt="Selected file preview"
              className="h-16 w-16 flex-none rounded object-cover"
            />
          ) : (
            <span className="flex h-16 w-16 flex-none items-center justify-center rounded bg-soil/10">
              <FileText className="h-6 w-6 text-soil" aria-hidden="true" />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink [overflow-wrap:anywhere]">
              {staged.file.name}
            </p>
            <p className="text-[11.5px] text-soil">
              {fileSize(staged.file.size)} ·{" "}
              {stage ? "attached, sends when you save" : "not uploaded yet"}
            </p>
          </div>

          <div className="flex flex-none flex-wrap gap-2">
            {stage ? null : (
              <AdminButton
                type="button"
                className="h-8 px-3 text-[12.5px]"
                disabled={busy}
                onClick={() => void confirm()}
              >
                {busy ? "Saving…" : confirmLabel}
              </AdminButton>
            )}
            <AdminButton
              type="button"
              variant="ghost"
              className="h-8 px-2.5 text-[12.5px]"
              disabled={busy}
              onClick={clear}
              aria-label="Discard the selected file"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </AdminButton>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton
            type="button"
            variant="ghost"
            className="h-8 px-3 text-[12.5px]"
            disabled={busy || preparing}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            {preparing ? "Reading…" : triggerLabel}
          </AdminButton>
          {hint ? (
            <span className="text-[11.5px] text-soil/70">{hint}</span>
          ) : null}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </div>
  );
}
