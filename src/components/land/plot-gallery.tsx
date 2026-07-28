"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
 */
export function PlotGallery({
  fallbackAlt,
  photos,
}: {
  /** Used when a photo has no alt text of its own. */
  fallbackAlt: string;
  photos: PlotPhoto[];
}) {
  const [index, setIndex] = useState(0);
  const total = photos.length;
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

  return (
    <div
      className="relative h-[180px] border-b-[1.5px] border-soil/50 sm:h-[210px]"
      onTouchStart={(e) => {
        setTouchX(e.touches[0]?.clientX ?? null);
      }}
      onTouchEnd={(e) => {
        onTouchEnd(e.changedTouches[0]?.clientX ?? 0);
      }}
    >
      {photos.map((photo, i) => (
        // No scrim over the plot photo: a buyer is judging the land, so it
        // renders at true colour.
        <Image
          key={`${String(i)}-${photo.url}`}
          src={photo.url}
          alt={photo.alt ?? fallbackAlt}
          fill
          sizes="(min-width: 1024px) 560px, 100vw"
          aria-hidden={i === index ? undefined : "true"}
          className={`object-cover transition-opacity duration-200 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
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
            {index + 1} / {total}
          </p>
        </>
      ) : null}
    </div>
  );
}
