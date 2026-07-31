"use client";

import { useState } from "react";
import { Loader2, Navigation } from "lucide-react";

// Office location — Industrial Area, off Bolgatanga Road, Tamale. Coordinates
// approximate the area; nudge when the real pin is confirmed.
const OFFICE_LAT = 9.4449;
const OFFICE_LNG = -0.8394;
const OFFICE_LABEL = "DB Plus Trading Ltd";

/**
 * Live Google Maps embed (website-frontend's LocationMap pattern, worn in
 * this design's paperwork style): `q=label@lat,lng` drops a labelled pin,
 * the map sits desaturated at rest so it stays in-palette and clears to full
 * colour on hover, and a directions pill is always reachable.
 */
export function LocationMap() {
  const [isLoading, setIsLoading] = useState(true);

  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${OFFICE_LABEL}@${String(OFFICE_LAT)},${String(OFFICE_LNG)}`,
  )}&t=&z=15&ie=UTF8&iwloc=B&output=embed`;

  const directionsLink = `https://www.google.com/maps/dir/?api=1&destination=${String(OFFICE_LAT)},${String(OFFICE_LNG)}`;

  return (
    <div className="group relative h-[240px] overflow-hidden border-b-[1.5px] border-soil/50 bg-surface-alt lg:h-[280px]">
      {isLoading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-alt">
          <div className="flex flex-col items-center gap-2.5">
            <Loader2
              aria-hidden="true"
              strokeWidth={1.5}
              className="h-8 w-8 animate-spin text-forest"
            />
            <span className="stencil text-[10px] tracking-[0.2em] text-harvest-deep">
              LOADING MAP
            </span>
          </div>
        </div>
      ) : null}

      <iframe
        src={mapUrl}
        width="100%"
        height="100%"
        style={{
          border: 0,
          // Muted at rest so the map sits in-palette; hover restores colour.
          filter: "grayscale(45%) sepia(8%) contrast(1.02) opacity(0.95)",
        }}
        allowFullScreen
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        referrerPolicy="no-referrer-when-downgrade"
        title="DB Plus warehouse location - Tamale"
        className="transition-[filter] duration-700 ease-in-out group-hover:filter-none"
      />

      <span className="stencil pointer-events-none absolute left-3 top-3 z-20 bg-ink/60 px-2.5 py-[7px] text-[9px] leading-none tracking-[0.2em] text-surface">
        TAMALE · NORTHERN REGION
      </span>

      <a
        href={directionsLink}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 rounded-[2px] bg-harvest px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink shadow-[2px_2px_0_rgb(31_33_28/0.4)] transition-[transform,box-shadow] duration-100 hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_rgb(31_33_28/0.4)]"
      >
        <Navigation aria-hidden="true" className="h-3 w-3" strokeWidth={2} />
        Directions
      </a>
    </div>
  );
}
