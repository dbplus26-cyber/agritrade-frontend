"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Photo, PhotoFallback } from "@/components/ui/Photo";
import { cn } from "@/lib/utils";

export interface PlotPhoto {
  alt: null | string;
  url: string;
}

/**
 * The photo frame on a plot document. A plot carries up to three photos and a
 * buyer needs to see all of them, so the frame steps through them with PREV /
 * NEXT plates and a stencilled "1 / 3" count.
 *
 * Every photo is mounted in the same fixed-height frame and only the current
 * one is shown, so stepping never shifts the card. A single photo renders
 * exactly as before: no controls, no count.
 *
 * NOTHING ON FILE MEANS NO FRAME. The gallery renders null when there is no
 * photograph to show, and it owns its own border so that the frame goes with
 * it - the caller cannot collapse a wrapper it drew around a client component
 * whose contents failed after render.
 *
 * "Nothing to show" covers two cases the reader cannot tell apart: no photo
 * was ever filed, and every filed photo has stopped resolving. Only the first
 * was handled before, because it is the only one visible from the server. A
 * plot whose upload had since been deleted still drew the full bordered frame
 * and filled it with the PHOTO TO FOLLOW panel, which is exactly the empty
 * rectangle the frame was supposed to spare the reader.
 */
export function PlotGallery({
  className,
  fallbackAlt,
  frameClassName,
  photos,
}: {
  /** Frame height override - the detail page gives its gallery more room. */
  className?: string;
  /** Used when a photo has no alt text of its own. */
  fallbackAlt: string;
  /** The border around the frame, dropped with it when there is no photo. */
  frameClassName?: string;
  photos: PlotPhoto[];
}) {
  const [index, setIndex] = useState(0);
  // Tracked by src rather than by position: the array is re-created on every
  // render, so an index would move under a photo that had already failed.
  const [failed, setFailed] = useState<string[]>([]);
  const live = photos.filter((photo) => !failed.includes(photo.url));
  const total = live.length;
  // Wrapping keeps a two or three photo set circular - there is no dead end to
  // discover at either edge.
  const step = (delta: number) => {
    setIndex((current) => (current + delta + total) % total);
  };

  // Swipe is the bonus path; the plates are the guaranteed one.
  const [touchX, setTouchX] = useState<null | number>(null);
  const onTouchEnd = (endX: number) => {
    if (touchX === null) return;
    const travel = endX - touchX;
    setTouchX(null);
    if (Math.abs(travel) > 40) step(travel < 0 ? 1 : -1);
  };

  const plate =
    "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-[2px] border-2 border-forest bg-surface text-forest shadow-[2px_2px_0_rgb(31_33_28/0.28)] transition-colors hover:bg-harvest/25 active:bg-harvest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest";

  if (total === 0) return null;

  // The step wraps over what is LEFT, and the index is clamped rather than
  // reset: losing the third of three photos should not throw the reader back
  // to the first one they had already stepped past.
  const current = Math.min(index, total - 1);

  return (
    <div className={frameClassName}>
    <div
      className={cn(
        "relative h-[180px] border-b-[1.5px] border-soil/50 sm:h-[210px]",
        className,
      )}
      onTouchStart={(e) => {
        setTouchX(e.touches[0]?.clientX ?? null);
      }}
      onTouchEnd={(e) => {
        onTouchEnd(e.changedTouches[0]?.clientX ?? 0);
      }}
    >
      {/* The ledger panel is the floor of the frame, and it is only ever seen
          while a photo is still loading. Once every photo has failed the whole
          gallery unmounts above, so it can no longer be left standing as the
          finished state of a plot with nothing on file. */}
      <PhotoFallback className="absolute inset-0" />
      {live.map((photo, i) => (
        // No scrim over the plot photo: a buyer is judging the land, so it
        // renders at true colour.
        <Photo
          key={photo.url}
          src={photo.url}
          alt={photo.alt ?? fallbackAlt}
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
          aria-hidden={i === current ? undefined : "true"}
          className={`object-cover transition-opacity duration-200 ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
          fallback={null}
          onFailed={(src) => {
            setFailed((prev) => (prev.includes(src) ? prev : [...prev, src]));
          }}
        />
      ))}

      {total > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => {
              step(-1);
            }}
            className={`${plate} left-2.5`}
          >
            <ChevronLeft aria-hidden="true" className="size-5" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => {
              step(1);
            }}
            className={`${plate} right-2.5`}
          >
            <ChevronRight aria-hidden="true" className="size-5" strokeWidth={2.4} />
          </button>
          {/* Bottom LEFT: the availability stamp overhangs the bottom-right
              corner of every plot card. */}
          <p
            aria-live="polite"
            className="stencil absolute bottom-2.5 left-2.5 rounded-[2px] bg-forest px-2.5 py-1.5 text-[10px] leading-none tracking-[0.14em] text-surface"
          >
            <span className="sr-only">Photo </span>
            {current + 1} / {total}
          </p>
        </>
      ) : null}
    </div>
    </div>
  );
}
