"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A framed photograph that removes ITSELF when there is nothing to show.
 *
 * The register cards keep a picture slot whatever the records hold, because a
 * grid of cards has to stay on one rhythm. A detail page has no such
 * obligation: it is one record, read on its own, and an empty bordered
 * rectangle where a photograph would go tells the reader nothing except that
 * we have nothing. So a record with no photo on file renders no frame at all,
 * and a photo whose URL stops resolving takes the frame down with it.
 */
export function PhotoFrame({
  alt,
  className,
  priority = false,
  sizes,
  src,
}: {
  alt: string;
  /** The frame: border, shadow and height live here. */
  className?: string;
  priority?: boolean;
  sizes: string;
  src: null | string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div className={cn("relative", className)}>
      <Image
        alt={alt}
        className="object-cover"
        fill
        onError={() => {
          setFailed(true);
        }}
        priority={priority}
        sizes={sizes}
        src={src}
      />
    </div>
  );
}
