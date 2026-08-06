import { cn } from "@/lib/utils";

/**
 * The general loader - a miniature of the site's signature availability
 * board: three planks settle in one after another while a gold "FETCHING…"
 * tag swings on its nail. Pure CSS, honours prefers-reduced-motion (the
 * global rule freezes the keyframes, leaving a readable static board).
 */
export function LoadingScreen({
  label = "Fetching the ledger",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-[320px] flex-col items-center justify-center gap-7 px-6 py-16",
        className,
      )}
    >
      <div className="texture-grain-dark w-[min(320px,86vw)] bg-board p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-harvest opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-harvest shadow-[0_0_0_4px_rgb(216_156_46/0.2)]" />
          </span>
          <span className="stencil text-[10px] tracking-[0.3em] text-surface">
            At the warehouse
          </span>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-dashed border-surface/30 pt-3">
          {[0, 1, 2].map((plank) => (
            <div
              key={plank}
              className="flex items-center justify-between border-b-2 border-[#072620] bg-gradient-to-b from-[#12463A] to-[#0E3A30] px-4 py-3 shadow-[inset_0_2px_0_rgb(255_255_255/0.05),inset_0_-5px_9px_rgb(0_0_0/0.35)]"
              style={{
                animation: `sack-drop 0.55s cubic-bezier(0.2, 0.9, 0.3, 1) ${String(0.12 * plank)}s backwards`,
                transform: `rotate(${plank === 1 ? "-0.14" : "0.16"}deg)`,
              }}
            >
              <span className="h-3 w-24 animate-pulse rounded-[2px] bg-surface/25" />
              <span
                className="stencil rounded-[2px] bg-harvest px-2.5 py-1.5 text-[9px] leading-none tracking-[0.18em] text-ink shadow-[2px_3px_0_rgb(0_0_0/0.4)]"
                style={{
                  animation: `tag-settle 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) ${String(0.3 + 0.12 * plank)}s backwards`,
                  transform: `rotate(${plank % 2 === 0 ? "-1.1" : "0.8"}deg)`,
                }}
              >
                WEIGHING…
              </span>
            </div>
          ))}
        </div>
      </div>
      <span className="stencil animate-pulse text-[12px] tracking-[0.3em] text-soil">
        {label}…
      </span>
    </div>
  );
}
