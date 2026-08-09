"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MAX_UPLOAD_BYTES } from "@/lib/limits";
import { notify } from "@/lib/notify";
import { optimizeImage } from "@/lib/optimize-image";

interface StagedPhoto {
  file: File;
  url: string;
}

/**
 * Staged-photo state for the record forms (supplier, buyer, driver,
 * commodity): the pending File, its preview object URL, and the `removePhoto`
 * flag the API uses to clear an existing photo server-side. The staged file
 * and the flag travel with the save exactly as before - the hook only owns
 * the staging, not the request.
 *
 * Owning the object URL here is the point of the extraction: every form used
 * to mint `URL.createObjectURL(file)` and never revoke it (one even minted a
 * fresh URL per render), so each staged preview leaked its blob for the life
 * of the tab. The URL is now revoked whenever the staged file is replaced or
 * dropped, and on unmount.
 */
export function usePhotoStaging(existingUrl: string | null | undefined) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<StagedPhoto | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  // The live object URL is mirrored in a ref so the handlers and the unmount
  // cleanup can revoke it without reading render state.
  const liveUrlRef = useRef<string | null>(null);
  const swapLiveUrl = useCallback((url: string | null) => {
    if (liveUrlRef.current) URL.revokeObjectURL(liveUrlRef.current);
    liveUrlRef.current = url;
  }, []);

  useEffect(() => {
    return () => {
      swapLiveUrl(null);
    };
  }, [swapLiveUrl]);

  // Clearing the native input matters on its own (without dropping the staged
  // file): the record-sync callbacks run it while reading, so re-picking the
  // same photo later still fires onChange.
  const clearInput = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const onSelectFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      swapLiveUrl(url);
      setStaged({ file, url });
      // Picking a photo cancels a pending removal.
      setRemovePhoto(false);
    },
    [swapLiveUrl],
  );

  /**
   * Downscale, size-check, then stage - the whole pick, in one place.
   *
   * Every record form used to spell this out itself as
   * `optimizeImage(file).then(onSelectFile)`, four identical copies with no
   * size check between them: an oversized file was uploaded in full and
   * refused by the server, and the form could only report that something had
   * gone wrong. The cap is checked AFTER downscaling because that is what
   * actually gets sent.
   */
  const onPickFile = useCallback(
    async (file: File) => {
      try {
        const prepared = await optimizeImage(file);
        if (prepared.size > MAX_UPLOAD_BYTES) {
          notify.error("That photo is too large", {
            description: `It is over the ${String(MAX_UPLOAD_BYTES / (1024 * 1024))}MB limit even after resizing. Try another photo.`,
          });
          clearInput();
          return;
        }
        onSelectFile(prepared);
      } catch {
        notify.error("Couldn't read that photo. Try another one.");
        clearInput();
      }
    },
    [clearInput, onSelectFile],
  );

  const onRemove = useCallback(() => {
    swapLiveUrl(null);
    setStaged(null);
    setRemovePhoto(true);
    clearInput();
  }, [swapLiveUrl, clearInput]);

  /** Back to "nothing staged, nothing removed" - cancel and after-save. */
  const reset = useCallback(() => {
    swapLiveUrl(null);
    setStaged(null);
    setRemovePhoto(false);
    clearInput();
  }, [swapLiveUrl, clearInput]);

  // Preview precedence: a staged file always wins; otherwise the record's
  // existing photo, unless it has been marked for removal.
  const previewUrl =
    staged?.url ?? (!removePhoto ? (existingUrl ?? null) : null);

  return {
    fileInputRef,
    photoFile: staged?.file ?? null,
    removePhoto,
    previewUrl,
    onSelectFile,
    onPickFile,
    onRemove,
    reset,
    clearInput,
  };
}
