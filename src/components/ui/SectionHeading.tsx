import { cn } from "@/lib/utils";
import { StencilLabel } from "@/components/ui/StencilLabel";

/**
 * The design's one section-opening pattern: gold dash + stencil eyebrow,
 * display headline, optional lede - used identically on light and dark bands.
 */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  tone = "light",
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
  /** "light" on husk surfaces, "dark" on forest/board bands. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={className}>
      <div className="mb-4 flex items-center gap-2.5">
        <StencilLabel className={dark ? "text-harvest" : undefined}>
          {eyebrow}
        </StencilLabel>
      </div>
      <h2
        className={cn(
          "font-display text-[clamp(26px,3vw,40px)] font-bold leading-[1.1]",
          dark ? "text-surface" : "text-forest",
        )}
      >
        {title}
      </h2>
      {lede ? (
        <p
          className={cn(
            "mt-3.5 max-w-[60ch] text-[15px] leading-[1.7]",
            dark ? "text-surface/75" : "text-soil",
          )}
        >
          {lede}
        </p>
      ) : null}
    </div>
  );
}
