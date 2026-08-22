"use client";

import { useState } from "react";
import { AdminButton } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  /** Extra friction for irreversible actions: user must type this exactly. */
  requireExactMatch?: string;
}

/**
 * The confirm gate, in this design's paperwork style: title, plain-language
 * consequence, optional type-to-confirm, and a destructive variant that goes
 * error-red. A centred card on desktop, a bottom sheet on phones - compact
 * either way.
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  requireExactMatch,
}: ConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState("");

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) setInputValue("");
  };

  // Trimmed because a phone keyboard appends a space after an autocomplete
  // pick, and an untrimmed compare then leaves the confirm button dead with
  // the right word visibly typed into the box and nothing saying why.
  const confirmDisabled = requireExactMatch
    ? inputValue.trim() !== requireExactMatch.trim()
    : false;

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent
        showCloseButton={false}
        className="sm:max-w-sm"
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="font-display text-forest">
            {title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-soil">
            {description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {requireExactMatch ? (
          <div className="space-y-2">
            <Label htmlFor="confirm-input" className="inline leading-relaxed">
              Type{" "}
              <span className="font-mono font-bold">{requireExactMatch}</span>{" "}
              to confirm:
            </Label>
            <Input
              id="confirm-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={requireExactMatch}
              className="font-mono"
            />
          </div>
        ) : null}

        {/*
          Phones get the two buttons stacked with CANCEL on the bottom edge,
          not the commit. This is the one dialog in the app whose confirm
          button voids a purchase or hands over cash, and a bottom sheet puts
          its footer exactly where a thumb already rests - so a row here means
          the destructive button sits under the thumb, one pixel from Cancel,
          on a 360px screen. Reversing the column keeps the safe button in the
          resting position and moves the commit up out of the way. Desktop,
          where the pointer has to travel to the button either way, keeps the
          conventional Cancel-then-commit row.
        */}
        <ResponsiveDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <AdminButton
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => handleOpenChange(false)}
          >
            {cancelText}
          </AdminButton>
          <AdminButton
            variant={isDestructive ? "danger" : "primary"}
            size="lg"
            className="w-full sm:w-auto"
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmText}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
