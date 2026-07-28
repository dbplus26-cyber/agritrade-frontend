import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Console primitives: shadcn components re-skinned to the DB Plus Console
 * system (Meridian slate + forest/gold/red accents, mono numerals). The
 * shadcn pieces provide behavior and a11y; the classes here pin the exact
 * console look — screens compose these, never restyle shadcn directly.
 */

/**
 * A label/value row for detail pages. On narrow screens it stacks (label on
 * top, value below) so long values like notes or addresses never get squeezed
 * into a shared row; from ~480px it sits side-by-side (label left, value
 * right). `mono` sets the numeric face; `strong` enlarges/bolds the value.
 */
export function DetailRow({
  label,
  children,
  mono = false,
  strong = false,
}: {
  children: React.ReactNode;
  label: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2 min-[480px]:flex-row min-[480px]:items-baseline min-[480px]:justify-between min-[480px]:gap-3">
      <span className="flex-none text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        {label}
      </span>
      <span
        className={cn(
          "min-w-0 text-[13.5px] text-ink [overflow-wrap:anywhere] min-[480px]:text-right",
          mono && "font-adminmono tabular-nums",
          strong && "text-[15px] font-bold",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * A single labelled fact for `DetailGrid`: stencil micro-cap label ABOVE the
 * value so there is never a label....value gap, with a hairline under each
 * item so the grid reads as ledger lines. `mono`/`strong` mirror DetailRow.
 */
export function DetailItem({
  label,
  children,
  mono = false,
  strong = false,
  className,
}: {
  children: React.ReactNode;
  label: string;
  mono?: boolean;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 border-b border-soil/10 py-2", className)}>
      <p className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        {label}
      </p>
      <div
        className={cn(
          "mt-0.5 min-w-0 text-[13.5px] text-ink [overflow-wrap:anywhere]",
          mono && "font-adminmono tabular-nums",
          strong && "text-[15px] font-bold",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Fact grid for detail cards: 1 column on phones, 2 from `sm`, and (for
 * cards spanning the full main column) 3 from `xl`. Children are
 * `DetailItem`s; columns fill the card so wide screens carry no dead zone.
 */
export function DetailGrid({
  columns = 3,
  className,
  children,
}: {
  /** Max column count at xl (2 keeps side-rail-width cards comfortable). */
  columns?: 2 | 3;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2",
        columns === 3 && "xl:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Two-column detail shell: main content left, a narrower side rail (summary,
 * actions, meta) right from `xl`; below that everything stacks, aside first
 * so status and actions stay above the fold on phones. The rail is sticky
 * under the 54px console topbar so actions stay in reach on long pages.
 */
export function DetailShell({
  main,
  aside,
  asideFirstOnStack = true,
  className,
}: {
  main: React.ReactNode;
  aside: React.ReactNode;
  /** Below xl the rail stacks above the main column (summary/actions above
   * the fold). Pass false when the main column is the page's identity. */
  asideFirstOnStack?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]",
        className,
      )}
    >
      <div className={cn("min-w-0 xl:order-1", asideFirstOnStack && "order-2")}>
        {main}
      </div>
      <div
        className={cn(
          "min-w-0 self-start xl:sticky xl:top-[70px] xl:order-2",
          asideFirstOnStack && "order-1",
        )}
      >
        {aside}
      </div>
    </div>
  );
}

/** The design's six status tones — used by chips, dots and timeline marks.
 * Drawn from the brand palette so chips read in-system on paper grounds. */
export const TONES = {
  sky: { fg: "#33587A", bg: "#E7EDEA", dot: "#3E6B8C" },
  leaf: { fg: "#2F5E3D", bg: "#E3EBDD", dot: "#3E7D62" },
  harvest: { fg: "#7A611C", bg: "#F5ECD6", dot: "#D89C2E" },
  alert: { fg: "#9B3A22", bg: "#F6E7E0", dot: "#9B3A22" },
  slate: { fg: "#59523B", bg: "#E6EAE0", dot: "#A49B7E" },
  forest: { fg: "#155744", bg: "#E1E9E0", dot: "#155744" },
} as const;

export type Tone = keyof typeof TONES;

/** Status chip: shadcn Badge worn as the console's tinted tone pill. */
export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  // Fall back to a neutral tone if an unknown value slips through (e.g. a new
  // backend enum the frontend hasn't mapped yet) - never crash the page.
  const t = TONES[tone] ?? TONES.slate;
  return (
    <Badge
      className={cn(
        "gap-1.5 rounded-full border-transparent px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        className,
      )}
      style={{ color: t.fg, background: t.bg }}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 flex-none rounded-full"
        style={{ background: t.dot }}
      />
      {children}
    </Badge>
  );
}

/** Console card — shadcn Card worn as the site's filed document: paper
 * sheet, soil border, hard offset shadow (screens own padding). */
export function AdminCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "shadow-doc-sm block gap-0 rounded-none border-[1.5px] border-soil/30 bg-paper py-0",
        className,
      )}
    >
      {children}
    </Card>
  );
}

/** Page header: title + sub left, actions right. */
export function AdminPageHeader({
  title,
  sub,
  actions,
  className,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0 max-w-full">
        <h1
          title={title}
          className="truncate text-[19px] font-bold text-forest"
        >
          {title}
        </h1>
        {sub ? (
          <p className="mt-0.5 truncate text-[13px] text-soil" title={sub}>
            {sub}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Tabular mono numeral (money, weights, refs). */
export function Mono({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("font-adminmono tabular-nums", className)}>
      {children}
    </span>
  );
}

/** Console buttons: shadcn Button pinned to the console sizes/colours.
 * primary forest · secondary bordered white · outline bordered transparent
 * (Cancel and friends) · danger red · gold warn · ghost. */
export function AdminButton({
  variant = "primary",
  className,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "variant"> & {
  variant?: "danger" | "ghost" | "gold" | "outline" | "primary" | "secondary";
}) {
  return (
    <Button
      type="button"
      // The base Button carries the site's button grammar; here we only map
      // the console's semantic names onto it and pin the console density.
      variant={
        variant === "primary"
          ? "harvest"
          : variant === "secondary" || variant === "outline"
            ? "outline"
            : variant === "ghost"
              ? "ghost"
              : "default"
      }
      className={cn(
        "h-9 gap-1.5 px-4 text-[13.5px]",
        // Bordered but quiet: transparent until hovered — the Cancel shape.
        variant === "outline" &&
          "border-[1.5px] border-soil/35 text-soil shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-soil/5 hover:text-ink hover:shadow-none",
        variant === "danger" &&
          "bg-console-red text-white shadow-[2.5px_2.5px_0_rgb(31_33_28/0.3)] hover:translate-x-px hover:translate-y-px hover:bg-console-red-deep hover:shadow-[1px_1px_0_rgb(31_33_28/0.3)]",
        variant === "gold" && "bg-console text-white hover:bg-console-deep",
        className,
      )}
      {...props}
    />
  );
}

/** Field label + control wrapper for console forms (shadcn Label inside),
 * in the document idiom of the site's enquiry form: a stencil micro-cap
 * label over the paper field, error/hint filed beneath. */
export function AdminField({
  label,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Label className="block font-normal leading-normal">
      <span className="stencil mb-[7px] block text-[11px] uppercase tracking-[0.14em] text-harvest-deep">
        {label}
        {optional ? <span className="text-harvest-deep/70"> — optional</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-[12px] font-medium text-error">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[12.5px] font-normal text-soil">{hint}</span>
      ) : null}
    </Label>
  );
}

/** The one form-control skin (the enquiry form's document field): paper
 * fill, 2px corners, 1.5px soil border, leaf focus glow, error border when
 * invalid. Layer onto shadcn Input/native selects so every field matches. */
export const adminInputClass =
  "h-[42px] w-full rounded-[2px] border-[1.5px] border-soil/35 bg-[#FBFCF7] px-3.5 text-[14px] font-normal text-ink shadow-none outline-none transition-[border-color,box-shadow] placeholder:text-soil/55 focus:border-leaf focus:shadow-[0_0_0_3px_rgb(62_125_98/0.16)] focus-visible:border-leaf focus-visible:ring-0 aria-invalid:border-error";

export const adminSelectClass = cn(adminInputClass, "cursor-pointer");
