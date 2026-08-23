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
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Dialog on desktop, bottom sheet on phones - same API shape as dialog.tsx so
 * call sites swap imports 1:1. From `md` it renders the existing Dialog
 * pieces; below `md` a Sheet slides up from the bottom edge with a drag
 * handle, internal scroll (`max-h-[88dvh]`) and safe-area padding. While the
 * on-screen keyboard is up the sheet is lifted to sit on top of it and capped
 * to the space that remains, so a short type-to-confirm sheet is not hidden
 * behind the keys and a tall form's field stays in view while typing.
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
  style,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile();
  const keyboard = useKeyboardInset(isMobile);
  if (isMobile) {
    // Inline so it beats any `max-h-*` a call site sets: with the keyboard up
    // the visible area is the only height there is.
    const lifted = keyboard.bottom
      ? { bottom: keyboard.bottom, maxHeight: keyboard.height }
      : undefined;
    return (
      <SheetContent
        side="bottom"
        showCloseButton={showCloseButton}
        style={{ ...style, ...lifted }}
        // The sheet and its overlay sit above the shell's bottom tab bar
        // (z-[60]); floating layers inside (popover/select, z-[80]) still
        // clear the sheet.
        overlayClassName={cn("z-[70]", overlayClassName)}
        className={cn(
          "shadow-doc gap-4 rounded-t-none border-t-[1.5px] border-soil/40 bg-paper p-4 pt-2.5 text-[12px] text-ink",
          // `overscroll-contain`: a sheet scrolled to its end must not hand
          // the gesture to the page behind it, which on a phone reads as the
          // sheet dragging the whole console around under itself.
          "max-h-[88dvh] overscroll-contain overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]",
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
  // The desktop dialog is centred and sized by its content, so uncapped a
  // form taller than the viewport runs off the top and bottom with no way to
  // reach either end. Capped and scrolled here rather than at each call site,
  // because "is this dialog tall enough to overflow" depends on the reader's
  // screen and on content that grows later, which no call site can know.
  //
  // Declared BEFORE the caller's classes so a call site can still override the
  // cap deliberately; tailwind-merge keeps the last one.
  return (
    <DialogContent
      className={cn("max-h-[88dvh] overscroll-contain overflow-y-auto", className)}
      showCloseButton={showCloseButton}
      overlayClassName={overlayClassName}
      style={style}
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
