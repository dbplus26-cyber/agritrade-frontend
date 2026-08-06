"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { avatarOf } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * A filed photograph at full size.
 *
 * Square, because every photo the console holds is filed as one - a profile
 * portrait, a supplier's shop front, a driver's licence photo - and a dialog
 * that changed shape per image would make a gallery of them read as a jumble.
 * The frame is fixed and the picture fills it.
 *
 * Lived in users/user-identity until suppliers, buyers and drivers each
 * reached across for it; it is shared, so it lives somewhere shared.
 */
export function PhotoViewDialog({
  name,
  onOpenChange,
  open,
  src,
}: {
  name: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  src: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] gap-3 border-adm-line p-4">
        <DialogHeader>
          <DialogTitle className="text-[14px] font-semibold text-adm-ink [overflow-wrap:anywhere]">
            {name}
          </DialogTitle>
        </DialogHeader>
        <div className="aspect-square w-full overflow-hidden rounded-[8px] bg-adm-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary, full-view photo */}
          <img src={src} alt={name} className="h-full w-full object-cover" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The record's picture, and the way to see it properly.
 *
 * A thumbnail is a recognition aid, not a photograph - at 96px nobody can read
 * a licence, check a shop front or tell two people apart with confidence. So
 * every filed photo in the console opens: click the thumbnail, get the square
 * dialog. Records with nothing on file fall back to the initials monogram and
 * are inert, since there is nothing to open.
 *
 * One component so the behaviour cannot differ between a user, a supplier and
 * a farmer - it was previously hand-wired on the three screens that had it and
 * simply absent on the rest.
 */
export function ViewablePhoto({
  className,
  name,
  size = 96,
  src,
}: {
  className?: string;
  /** Used as the dialog's title, the alt text and the monogram seed. */
  name: string;
  /** Rendered size in px; the dialog is always full-width square. */
  size?: number;
  src?: null | string;
}) {
  const [open, setOpen] = useState(false);
  const mono = avatarOf(name);

  if (!src) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex flex-none items-center justify-center rounded-full font-bold",
          className,
        )}
        style={{
          background: mono.bg,
          color: mono.fg,
          fontSize: size * 0.32,
          height: size,
          width: size,
        }}
      >
        {mono.init}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${name}'s photo`}
        className={cn(
          "flex-none cursor-pointer overflow-hidden rounded-full transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console",
          className,
        )}
        style={{ height: size, width: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary */}
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          style={{ height: size, width: size }}
        />
      </button>
      <PhotoViewDialog
        name={name}
        onOpenChange={setOpen}
        open={open}
        src={src}
      />
    </>
  );
}
