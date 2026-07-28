"use client";

import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Dialog on desktop, bottom sheet on phones - same API shape as dialog.tsx so
 * call sites swap imports 1:1. From `md` it renders the existing Dialog
 * pieces; below `md` a Sheet slides up from the bottom edge with a drag
 * handle, internal scroll (`max-h-[88dvh]`) and safe-area padding, so the
 * submit row is always reachable above the keyboard.
 *
 * Sheet and Dialog wrap the same Radix Dialog primitive, so the shared
 * Header/Title/Description/Footer pieces (and Close/Trigger) work unchanged
 * inside either root.
 */
function ResponsiveDialog(props: React.ComponentProps<typeof Dialog>) {
  const isMobile = useIsMobile();
  return isMobile ? <Sheet {...props} /> : <Dialog {...props} />;
}

function ResponsiveDialogContent({
  className,
  children,
  showCloseButton = true,
  overlayClassName,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <SheetContent
        side="bottom"
        showCloseButton={showCloseButton}
        // The sheet and its overlay sit above the shell's bottom tab bar
        // (z-[60]); floating layers inside (popover/select, z-[80]) still
        // clear the sheet.
        overlayClassName={cn("z-[70]", overlayClassName)}
        className={cn(
          "shadow-doc gap-4 rounded-t-[6px] border-t-[1.5px] border-soil/40 bg-paper p-4 pt-2.5 text-sm text-ink",
          "max-h-[88dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]",
          className,
          // Declared after the caller's classes so tailwind-merge keeps
          // these: the sheet must span the viewport even when a call site
          // sets a desktop width (sm:max-w-[560px] etc.).
          "inset-x-0 z-[70] w-full max-w-none sm:max-w-none",
        )}
        {...props}
      >
        <div
          aria-hidden
          className="mx-auto h-1 w-9 flex-none rounded-full bg-soil/30"
        />
        {children}
      </SheetContent>
    );
  }
  return (
    <DialogContent
      className={className}
      showCloseButton={showCloseButton}
      overlayClassName={overlayClassName}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

// Sheet is the same Radix primitive as Dialog, so these need no switching.
const ResponsiveDialogClose = DialogClose;
const ResponsiveDialogDescription = DialogDescription;
const ResponsiveDialogFooter = DialogFooter;
const ResponsiveDialogHeader = DialogHeader;
const ResponsiveDialogTitle = DialogTitle;
const ResponsiveDialogTrigger = DialogTrigger;

export {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
};
