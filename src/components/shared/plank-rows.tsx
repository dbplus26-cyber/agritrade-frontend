import { StatusBadge } from "@/components/ui/StatusBadge";
import type { CommodityLine } from "@/static-data/availability";
import { cn } from "@/lib/utils";

/** Per-plank wood grain + tilt so the board reads hand-built, not cloned. */
const PLANK_STYLES = [
  { tilt: "rotate(.18deg)", grain: 9, shade: "from-[#12463A] to-[#0E3A30]", offset: "" },
  { tilt: "rotate(-.14deg)", grain: 11, shade: "from-[#114237] to-[#0D372C]", offset: "ml-[3px]" },
  { tilt: "rotate(.1deg)", grain: 8, shade: "from-[#10412F] to-[#0C3628]", offset: "-ml-[2px]" },
];

const TAG_TILTS = ["-1.1deg", "0.8deg", "-0.7deg"];

/**
 * The wood planks of the availability board — stencilled commodity names with
 * nailed gold tags settling in staggered, out-of-stock lines degrading to the
 * dashed "ASK US" (never removed). Deliberately just the planks: each board
 * closes with ONE quiet caption + action of its own, so the section never
 * reads as a wall of buttons ("other grains on request" lives in the caption).
 */
export function PlankRows({ lines }: { lines: CommodityLine[] }) {
  // An empty register (nothing published, or the feed briefly unreachable)
  // gets ONE honest plank - never a stand-in list that makes the warehouse
  // look stocked when the records say otherwise.
  if (lines.length === 0) {
    const plank = PLANK_STYLES[0];
    return (
      <div className="flex flex-col gap-[5px] border-t border-dashed border-surface/30 pt-2.5">
        <div
          className={cn(
            "relative flex items-center justify-between gap-4 border-t border-surface/9 border-b-2 border-b-[#072620] bg-gradient-to-b px-4 py-[18px] shadow-[inset_0_2px_0_rgb(255_255_255/0.05),inset_0_-5px_9px_rgb(0_0_0/0.35)] lg:px-7 lg:py-5",
            plank.shade,
          )}
          style={{ transform: plank.tilt }}
        >
          <span className="min-w-0">
            <span className="stencil block overflow-hidden text-ellipsis whitespace-nowrap pr-16 text-[17px] leading-none tracking-[0.08em] text-surface/85 sm:pr-24 sm:text-[24px] lg:pr-0 lg:tracking-[0.1em] lg:text-[32px]">
              NOTHING ON THE BOARD
            </span>
            <span className="mt-2 hidden text-[12.5px] font-medium tracking-[0.04em] text-surface/65 lg:block">
              The register is being updated - call for today&rsquo;s position
            </span>
          </span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 -rotate-[7deg] lg:hidden">
            <StatusBadge
              variant="dashed"
              className="px-2 py-[7px] text-[8px] tracking-[0.14em] sm:px-2.5 sm:py-2 sm:text-[10px]"
            >
              ASK US
            </StatusBadge>
          </span>
          <span
            className="hidden lg:inline-block"
            style={{ transform: `rotate(${TAG_TILTS[0]})` }}
          >
            <StatusBadge variant="dashed" className="px-5 py-[13px] text-[15px]">
              ASK US
            </StatusBadge>
          </span>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="flex flex-col gap-[5px] border-t border-dashed border-surface/30 pt-2.5">
        {lines.map((line, i) => {
          const plank = PLANK_STYLES[i % PLANK_STYLES.length];
          const label = line.available ? "AVAILABLE NOW" : "ASK US";
          const tagAnimation = `tag-settle .5s cubic-bezier(.2,.9,.3,1) ${String(0.75 + i * 0.1)}s backwards`;
          return (
            <div
              key={line.name}
              className={cn(
                "relative flex items-center justify-between gap-4 border-t border-surface/9 border-b-2 border-b-[#072620] bg-gradient-to-b px-4 py-[18px] shadow-[inset_0_2px_0_rgb(255_255_255/0.05),inset_0_-5px_9px_rgb(0_0_0/0.35)] lg:px-7 lg:py-5",
                plank.shade,
                plank.offset,
              )}
              style={{
                transform: plank.tilt,
                backgroundImage: `repeating-linear-gradient(90deg, rgb(239 241 232 / 0.025) 0px, rgb(239 241 232 / 0.025) 2px, transparent 2px, transparent ${String(plank.grain)}px)`,
              }}
            >
              {/* Name stays on ONE line; the mobile tag is pinned diagonally
                  over the plank's right end instead of competing for width.
                  Desktop planks carry one line of market context, so the board
                  reads as live intelligence rather than three static bars.
                  It CLIPS rather than pushes: a long commodity name at 42px on
                  one line otherwise widened the whole document to 3047px at a
                  1440px viewport and put the entire page into sideways scroll. */}
              <span className="min-w-0">
                <span className="stencil block overflow-hidden text-ellipsis whitespace-nowrap pr-16 text-[21px] leading-none tracking-[0.08em] text-surface sm:pr-24 sm:text-[32px] lg:pr-0 lg:tracking-[0.1em] lg:text-[42px]">
                  {line.name.toUpperCase()}
                </span>
                <span className="mt-2 hidden text-[12.5px] font-medium tracking-[0.04em] text-surface/65 lg:block">
                  {line.meta}
                </span>
              </span>
              <span
                className="absolute right-2 top-1/2 -translate-y-1/2 -rotate-[7deg] lg:hidden"
                style={{ animation: tagAnimation }}
              >
                <StatusBadge
                  variant={line.available ? "gold" : "dashed"}
                  className="px-2 py-[7px] text-[8px] tracking-[0.14em] sm:px-2.5 sm:py-2 sm:text-[10px]"
                >
                  {label}
                </StatusBadge>
              </span>
              <span
                className="hidden lg:inline-block"
                style={{
                  transform: `rotate(${TAG_TILTS[i % TAG_TILTS.length]})`,
                  animation: tagAnimation,
                }}
              >
                <StatusBadge
                  variant={line.available ? "gold" : "dashed"}
                  className="px-5 py-[13px] text-[15px]"
                >
                  {label}
                </StatusBadge>
              </span>
            </div>
          );
        })}
      </div>

    </>
  );
}
