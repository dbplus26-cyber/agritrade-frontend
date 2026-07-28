"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

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
 * The confirm gate (dms-frontend convention, worn in this design's paperwork
 * style): title, plain-language consequence, optional type-to-confirm, and a
 * destructive variant that goes error-red. A centred card on desktop, a
 * bottom sheet on phones - compact either way.
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

  const confirmDisabled = requireExactMatch
    ? inputValue !== requireExactMatch
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

        <ResponsiveDialogFooter className="justify-end gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={cn(
              isDestructive && "bg-error text-surface hover:bg-error/90",
            )}
          >
            {confirmText}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
