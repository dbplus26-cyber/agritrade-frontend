import { cn } from "@/lib/utils";

/**
 * The stand-in picture for a commodity with no photograph on file.
 *
 * A drawing, not a photograph: we will not put a stock photo of somebody
 * else's grain on a DB Plus lot and let a buyer read it as ours. It is inline
 * SVG rather than an asset so it costs no request, never 404s, and takes the
 * husk palette straight from the page.
 *
 * It fills its frame, so a lot with no photo keeps the same picture box as a
 * lot that has one and the register stays on one rhythm.
 */
export function CommodityPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex h-full w-full items-center justify-center bg-surface-alt",
        className,
      )}
    >
      <svg
        viewBox="0 0 160 120"
        fill="none"
        className="h-[68%] w-auto max-w-[70%]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Three filled sacks on a warehouse floor line. */}
        <g stroke="#59523B" strokeWidth="3" strokeLinejoin="round">
          <path
            d="M44 96V63c0-9 5-13 5-19l-6-8h26l-6 8c0 6 5 10 5 19v33z"
            fill="#59523B"
            fillOpacity="0.14"
          />
          <path
            d="M84 96V57c0-11 6-15 6-22l-7-9h30l-7 9c0 7 6 11 6 22v39z"
            fill="#59523B"
            fillOpacity="0.2"
          />
          <path
            d="M120 96V70c0-7 4-10 4-15l-5-6h21l-5 6c0 5 4 8 4 15v26z"
            fill="#59523B"
            fillOpacity="0.1"
          />
        </g>
        {/* Two ears of grain leaning against the front sack. */}
        <g stroke="#3E7D62" strokeWidth="2.6" strokeLinecap="round">
          <path d="M24 96V62" />
          <path d="M24 66c-6-1-9-5-9-10 5 0 9 3 9 10z" fill="#3E7D62" fillOpacity="0.25" />
          <path d="M24 78c-6-1-9-5-9-10 5 0 9 3 9 10z" fill="#3E7D62" fillOpacity="0.25" />
          <path d="M24 66c6-1 9-5 9-10-5 0-9 3-9 10z" fill="#3E7D62" fillOpacity="0.25" />
          <path d="M24 78c6-1 9-5 9-10-5 0-9 3-9 10z" fill="#3E7D62" fillOpacity="0.25" />
        </g>
        {/* The floor. */}
        <path d="M8 96h144" stroke="#59523B" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}
