"use client";

import { useEffect, useRef, useState } from "react";

/** Keeps disabled inputs legible as a read view rather than a greyed-out form. */
export const readOnlyControlClass =
  "disabled:cursor-default disabled:opacity-100";

/**
 * The locked-by-default record form: edit screens open READ-ONLY and the Edit
 * button unlocks the inputs, while create screens (no record) are always
 * editable.
 *
 * `syncFromRecord` handles background refetches bumping the record (another
 * tab, a lifecycle action, the publish toggle): the caller resets its form to
 * the fresh values and clears the photo input. INVARIANT: it runs only while
 * NOT editing - an in-progress edit must never be clobbered, which is why
 * these forms are not key-remounted on updatedAt. Callers that key-remount
 * instead (driver) simply pass no callback.
 */
export function useEditableRecordForm<TRecord>(
  record: TRecord | undefined,
  syncFromRecord?: () => void,
) {
  const isEdit = record !== undefined;
  const [isEditing, setIsEditing] = useState(!isEdit);
  const readOnly = !isEditing;
  const roCls = readOnly ? readOnlyControlClass : "";

  // Ref'd so the effect re-runs on record changes only, yet always sees the
  // closure over the freshest record and form reset.
  const syncRef = useRef(syncFromRecord);
  useEffect(() => {
    syncRef.current = syncFromRecord;
  });

  useEffect(() => {
    if (!isEditing) syncRef.current?.();
  }, [record, isEditing]);

  const mode: "create" | "editing" | "locked" = !isEdit
    ? "create"
    : isEditing
      ? "editing"
      : "locked";

  return { isEdit, isEditing, setIsEditing, readOnly, roCls, mode };
}
