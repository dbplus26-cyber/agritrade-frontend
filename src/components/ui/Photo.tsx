"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { bypassOptimizer } from "@/lib/photo-src";
import { cn } from "@/lib/utils";

/**
 * A photograph that cannot break the page.
 *
 * Every picture on the public site comes from somewhere we do not control -
 * an owner-uploaded Cloudinary asset that can be deleted from the console, or
 * a Commons file that can be renamed upstream. When one of those URLs stops
 * resolving, the browser's default is a broken-image glyph with the alt text
 * spilling out of the frame, which is the single most "unfinished" thing a
 * site can show a customer.
 *
 * So a dead URL renders exactly what a missing one does: to the reader there
 * is no difference between a photo that was never filed and a photo that no
 * longer loads. Call sites that already own a no-photo treatment pass it as
 * `fallback`; everything else gets the ruled-ledger panel below.
 *
 * The failure is tracked against the src, so swapping the src (the plot
 * gallery steps through three) gives the new photo its own fair chance rather
 * than inheriting the last one's verdict.
 */
export function Photo({
  // `alt` is required by ImageProps and is pulled out rather than spread so
  // the a11y lint can see it on the element.
  alt,
  fallback,
  fallbackLabel = "PHOTO TO FOLLOW",
  onFailed,
  ...props
}: {
  /** Rendered instead of the default panel when the photo fails to load. */
  fallback?: React.ReactNode;
  /** Wording on the default panel. */
  fallbackLabel?: string;
  /**
   * Told which src failed, so a PARENT can decide the picture is not coming.
   * A call site that would rather remove its frame than fill it needs to know
   * a photo died; on its own this component can only ever swap one box for
   * another inside a frame somebody else drew.
   */
  onFailed?: (src: string) => void;
} & ImageProps) {
  const [failedSrc, setFailedSrc] = useState<null | string>(null);
  const src = typeof props.src === "string" ? props.src : null;

  if (src !== null && failedSrc === src) {
    return (
      <>
        {fallback ?? (
          <PhotoFallback className="absolute inset-0" label={fallbackLabel} />
        )}
      </>
    );
  }

  return (
    <Image
      {...props}
      alt={alt}
      unoptimized={bypassOptimizer(src) || props.unoptimized}
      onError={() => {
        setFailedSrc(src);
        if (src !== null) onFailed?.(src);
      }}
    />
  );
}

/**
 * The stand-in for a picture we do not have: ruled ledger paper with a
 * stencilled note across it, the same idiom the land plots use for a plot
 * with no photo on file. Exported so a call site can render it directly for
 * the genuinely-empty case and get an identical frame either way.
 */
export function PhotoFallback({
  className,
  label = "PHOTO TO FOLLOW",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        // `relative` so the note centres on this panel; a caller passing
        // `absolute inset-0` overrides the position and still positions it.
        "relative bg-surface-alt bg-[repeating-linear-gradient(180deg,transparent_0px,transparent_35px,rgb(89_82_59/0.28)_35px,rgb(89_82_59/0.28)_36px)]",
        className,
      )}
    >
      <span className="stencil absolute left-1/2 top-1/2 min-w-0 max-w-[85%] -translate-x-1/2 -translate-y-1/2 rotate-[-4deg] truncate text-center text-[13px] tracking-[0.16em] text-soil">
        {label}
      </span>
    </div>
  );
}
