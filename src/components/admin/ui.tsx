import React, { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { HelpTip } from "@/components/admin/help-tip";
import { cn } from "@/lib/utils";

/**
 * Console primitives: shadcn components re-skinned to the DB Plus Console
 * system (Meridian slate + forest/gold/red accents, mono numerals). The
 * shadcn pieces provide behavior and a11y; the classes here pin the exact
 * console look - screens compose these, never restyle shadcn directly.
 */

/**
 * A label/value row for detail pages. Stacks (label above value) until there
 * is genuinely room to sit side by side.
 *
 * Measured against its CONTAINER, not the viewport. These rows live mostly in
 * the 340px side rail, and a viewport query is always satisfied on a desktop -
 * so a note or a warehouse name is pushed into a narrow right-hand column
 * while its label sits alone at the top of a cell several lines deep, and the
 * pair reads as broken. Sized by the rail, a long value takes the row under
 * its label instead.
 *
 * `mono` sets the numeric face; `strong` enlarges/bolds the value.
 */
export function DetailRow({
  label,
  children,
  hint,
  mono = false,
  strong = false,
}: {
  children: React.ReactNode;
  /**
   * One sentence on what this fact IS, on hover beside the label.
   *
   * A detail page is a column of two-word labels - Basis, Float, Milestone,
   * Outstanding - and two words cannot teach a term to somebody meeting it for
   * the first time. The label keeps its brevity; the sentence sits behind it.
   */
  hint?: string;
  label: string;
  mono?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2 @min-[420px]:flex-row @min-[420px]:items-baseline @min-[420px]:justify-between @min-[420px]:gap-3">
      <span className="flex flex-none items-center gap-1 text-[10.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What is ${label}?`} text={hint} /> : null}
      </span>
      <span
        className={cn(
          "min-w-0 text-[11.5px] text-adm-ink [overflow-wrap:anywhere] @min-[420px]:text-right",
          mono && "font-adminmono tabular-nums",
          strong && "text-[13px] font-bold",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * A single labelled fact for `DetailGrid`: micro-cap label ABOVE the
 * value so there is never a label....value gap, with a hairline under each
 * item so the grid reads as ledger lines. `mono`/`strong` mirror DetailRow.
 */
export function DetailItem({
  label,
  children,
  full = false,
  hint,
  mono = false,
  strong = false,
  className,
}: {
  children: React.ReactNode;
  /**
   * Long prose - terms, notes, directions, an address - takes the whole row.
   *
   * Without it a paragraph and a date share a row, and because grid items
   * stretch to the tallest in their row, the date is left stranded at the top
   * of a cell several lines deep with nothing under it. The pair reads as
   * broken rather than as two facts. Prose has no natural width, so it gets
   * the row; everything short shares the one above or below it.
   *
   * Same flag, same reason, as RecordFacts' `full`.
   */
  full?: boolean;
  /** One sentence on what this fact IS, on hover beside the label. */
  hint?: string;
  label: string;
  mono?: boolean;
  strong?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 border-b border-adm-hairline py-2",
        full && "col-span-full",
        className,
      )}
    >
      <p className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What is ${label}?`} text={hint} /> : null}
      </p>
      <div
        className={cn(
          "mt-1 min-w-0 text-[12px] font-medium text-adm-ink [overflow-wrap:anywhere]",
          mono && "font-adminmono tabular-nums",
          strong && "text-[13px] font-bold",
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
        // auto-fit against a real MINIMUM, not a fixed column count.
        //
        // Fixed `sm:grid-cols-2 xl:grid-cols-3` gave every fact the same
        // narrow slot regardless of what was in it, so a long free-text value
        // - a route, a note, an address - became a several-hundred-pixel
        // ribbon of text with empty columns sitting beside it, while short
        // values wasted the room they were handed. Sizing from a floor lets
        // rows carry as many facts as genuinely fit and no more.
        //
        // The floor also stops a column collapsing to nothing: DetailItem
        // wraps with `overflow-wrap: anywhere`, which lets a value's
        // min-content width fall to a single character, and a content-sized
        // grid track will happily shrink that far.
        "grid gap-x-8 gap-y-1",
        columns === 3
          ? "grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]"
          : "grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))]",
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
 * under the console topbar (its height plus a gap) so actions stay in reach
 * on long pages.
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
          // @container so DetailRow (and anything else inside) sizes against
          // the RAIL rather than the viewport - the rail is 340px however wide
          // the screen is.
          "@container min-w-0 self-start xl:sticky xl:top-[calc(var(--adm-topbar-h)+16px)] xl:order-2",
          asideFirstOnStack && "order-1",
        )}
      >
        {aside}
      </div>
    </div>
  );
}

/** The design's six status tones - used by chips, dots and timeline marks.
 * Drawn from the brand palette so chips read in-system on paper grounds. */
export const TONES = {
  sky: { fg: "#3E6B8C", bg: "#EAF1F6", dot: "#3E6B8C" },
  leaf: { fg: "#2F5E3D", bg: "#E8F2EA", dot: "#2F5E3D" },
  harvest: { fg: "#7A5407", bg: "#F7EED8", dot: "#B8860B" },
  alert: { fg: "#8E2E24", bg: "#F8E9E7", dot: "#B03A2E" },
  slate: { fg: "#4C5765", bg: "#ECEFF3", dot: "#9BA6B3" },
  forest: { fg: "#1E3D2B", bg: "#E8F2EA", dot: "#1E3D2B" },
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
        "gap-1.5 rounded-[2px] border-transparent px-2.5 py-0.5 text-[10px] font-bold tracking-[0.08em] uppercase whitespace-nowrap",
        className,
      )}
      style={{ color: t.fg, background: t.bg }}
    >
      <span
        aria-hidden="true"
        className="h-[5px] w-[5px] flex-none rounded-full"
        style={{ background: t.dot }}
      />
      {children}
    </Badge>
  );
}

/**
 * Console card: a white sheet with a hairline border and the faintest lift.
 *
 * Not the public site's filed document - tinted paper, 1.5px soil border,
 * hard offset shadow, squared corners. A page carrying six of those reads as
 * six slabs shouting at each other; the console is read for hours and wants
 * surfaces that sit quietly under the data. Screens own their padding.
 */
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
        "animate-in fade-in block gap-0 rounded-none border border-adm-line bg-adm-card py-0 shadow-[0_1px_2px_rgba(16,24,40,0.05)] duration-200 ease-out",
        className,
      )}
    >
      {children}
    </Card>
  );
}

/**
 * The heading of a section INSIDE a detail page.
 *
 * A section title is a heading and looks like one. Titled with the 10.5px
 * muted uppercase eyebrow the fact labels underneath it wear, a card announces
 * itself no louder than the smallest thing inside it, and a long page reads as
 * one undifferentiated column with no way to find "Payments" by scanning.
 *
 * Renders a real `<h2>`, so the page also has an outline a screen reader can
 * navigate rather than a run of styled spans.
 */
export function SectionHeading({
  actions,
  children,
  className,
  hint,
}: {
  /** Right-aligned slot: a count, a total, a small action. */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** One sentence explaining the section, on hover beside the title. */
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1",
        className,
      )}
    >
      <h2 className="flex min-w-0 items-center gap-1.5 text-[13px] font-semibold tracking-tight text-adm-ink">
        <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
        {hint ? <HelpTip label={`About this section`} text={hint} /> : null}
      </h2>
      {actions ? <div className="flex-none">{actions}</div> : null}
    </div>
  );
}

/**
 * Page heading for list, dashboard and settings screens: the title with its
 * one-line description underneath, and nothing else in the row unless the
 * page has a control that belongs at the top (the dashboard's date range).
 * Register actions ("+ Add") live in the toolbar's count row, not here.
 */
export function AdminPageHeader({
  title,
  sub,
  actions,
  className,
  hint,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  className?: string;
  /**
   * One sentence on what this screen is for, shown on hover beside the title.
   * The sub-line says what is ON the page; this says why anyone comes here.
   */
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-adm-ink">
          {title}
          {hint ? (
            <HelpTip
              className="ml-1.5 translate-y-[-1px]"
              label={`What is the ${title} page for?`}
              text={hint}
            />
          ) : null}
        </h1>
        {sub ? <p className="mt-1 text-[12px] text-adm-muted">{sub}</p> : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/**
 * Heading for a single record's page (detail, create, edit), under the
 * DetailNav: badges that identify the record's state, the title (wrapping,
 * never truncated), a meta line, and the record's actions grouped below.
 *
 * On phones the badges and the actions share one top row (badges left,
 * buttons right) above the title: a status badge and a "View PDF" button are
 * each a few characters wide, and giving them a row apiece stacked four thin
 * rows where one structured header would do. From `md` the actions drop back
 * under the meta line, where there is room for them to read as a toolbar.
 */
export function DetailHeader({
  title,
  sub,
  badges,
  actions,
  className,
  hint,
}: {
  title: string;
  /** The meta line under the title: "Recorded 12 Mar 2026", a counterparty. */
  sub?: React.ReactNode;
  /** Status / approval badges, shown on the row beneath the meta line. */
  badges?: React.ReactNode;
  /** Edit, PDF, lifecycle buttons. */
  actions?: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  const hasTopRow = Boolean(badges || actions);
  return (
    // One reading order at every width: what this page is, what this record
    // is, then its state and what can be done about it. The state of a record
    // is not the first thing to say about it, and a badge sitting above the
    // title made the title look like a caption on the badge.
    <div className={cn("mb-6", className)}>
      <h1 className="text-lg font-bold tracking-tight [overflow-wrap:anywhere] text-adm-ink sm:text-xl lg:text-2xl">
        {title}
        {hint ? (
          <HelpTip
            className="ml-1.5 translate-y-[-1px]"
            label={`What is the ${title} page for?`}
            text={hint}
          />
        ) : null}
      </h1>
      {sub ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-adm-muted">
          {sub}
        </div>
      ) : null}
      {hasTopRow ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          {badges ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {badges}
            </div>
          ) : null}
          {actions ? (
            <div
              className={cn(
                "flex flex-wrap items-center gap-2",
                // Beside a badge the buttons take the far end of the row, so
                // the two read as one line rather than a huddle. With no badge
                // to sit beside, they own the phone row and share it equally.
                badges
                  ? "ml-auto"
                  : "w-full *:grow *:basis-[calc(50%-0.25rem)] sm:w-auto sm:*:grow-0 sm:*:basis-auto",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}
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
  size = "md",
  className,
  loading = false,
  disabled,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "variant"> & {
  /**
   * A pending state for the action this button fires: a spinner takes the
   * icon slot, the button is disabled and announced busy, and the label
   * stays so the button keeps its width.
   */
  loading?: boolean;
  /**
   * The console's THREE button heights, and the only three.
   *
   * A screen picking its own number via className is how eight different
   * pixel heights spelled eleven ways (`h-9` beside `h-[36px]`, `h-8` beside
   * `h-[32px]`…) get across the console. Sizes are semantic: `md` (34px) is
   * every standing action - toolbars, rails, inline; `lg` (38px, matching the
   * 38px inputs it sits under) is the commit row of a form or dialog; `sm`
   * (28px) is a compact affordance inside a dense row.
   */
  size?: "lg" | "md" | "sm";
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
        // Meridian controls: 34px, 6px radius, no offset shadow anywhere. A
        // button that shifts on hover like a stamped plate is charming once
        // and tiring on the fortieth click of a working day.
        "gap-1.5 rounded-none font-semibold shadow-none transition-[color,background-color,border-color,opacity,transform] duration-150 ease-out hover:translate-x-0 hover:translate-y-0 hover:shadow-none active:scale-[0.98]",
        size === "md" && "h-[34px] px-3.5 text-[11.5px]",
        size === "lg" && "h-[38px] px-[18px] text-[11.5px]",
        // 28px is a deliberate visual density for row and card actions, but a
        // 28px TARGET is a miss on a phone - and these are the buttons that
        // void a purchase or reverse a payment. The plate stays small; the
        // touch area is padded out to 44px underneath it, which costs no
        // layout because it is drawn as a pseudo-element.
        size === "sm" &&
          "relative h-7 px-2.5 text-[11px] before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-full before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
        variant === "primary" &&
          "bg-console text-white hover:bg-console-hover",
        (variant === "secondary" || variant === "outline") &&
          "border border-adm-line bg-adm-card text-adm-body hover:bg-adm-sunken hover:text-adm-ink",
        // A light border at REST. Bare text that only grows a background on
        // hover does not read as a button until the pointer arrives - and on a
        // touch screen the pointer never arrives. Transparent rather than
        // filled is what separates it from `secondary`, which sits on the card
        // colour.
        variant === "ghost" &&
          "border border-adm-line bg-transparent text-adm-body hover:bg-adm-sunken hover:text-adm-ink",
        variant === "danger" &&
          "bg-console-red text-white hover:bg-console-red-deep",
        variant === "gold" && "bg-console-gold text-white hover:bg-console-gold-deep",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {/* ONE child, always: `asChild` hands the children to a Slot, which
          accepts exactly one element, so the spinner joins the label inside
          a fragment only while loading. */}
      {loading ? (
        <>
          <Loader2
            className="h-4 w-4 flex-none animate-spin"
            aria-hidden="true"
          />
          {children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

/** Field label + control wrapper for console forms (shadcn Label inside),
 * in the document idiom of the site's enquiry form: a micro-cap
 * label over the paper field, error/hint filed beneath. */
interface AriaProps {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export function AdminField({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  /** Placement inside a form grid, e.g. `sm:col-span-2` for a wide textarea. */
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = useId();
  const hintId = useId();
  // Wire the invalid state AND the hint onto the control itself rather than
  // leaving it to each of the ~40 forms to remember.
  //
  // A field in error signalled by RED TEXT ALONE leaves the control on its
  // normal border (the `aria-invalid:border-console-red` in adminInputClass
  // has nothing setting aria-invalid to react to), and a screen reader moving
  // back to the input announces a plain, valid-looking field with no hint that
  // anything is wrong or what. Colour is not a status, and the error message
  // is not much use if it is never associated with the thing it is about.
  //
  // The hint travels the same way: its visible affordance is a pointer-only
  // tooltip icon (see HelpTip's inLabel note - a button or aria-label inside
  // the label would hijack the field's own name), so the TEXT reaches
  // assistive tech as the control's description instead.
  //
  // Cloning here means every AdminField gets it, and a control that already
  // sets either prop keeps its own value. Components that ignore the props are
  // unharmed.
  const describedBy =
    [hint ? hintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const control =
    (hint ?? error) && React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement<AriaProps>, {
          "aria-describedby":
            (children.props as AriaProps)["aria-describedby"] ?? describedBy,
          ...(error
            ? {
                "aria-invalid":
                  (children.props as AriaProps)["aria-invalid"] ?? true,
              }
            : {}),
        })
      : children;

  return (
    // A flex COLUMN filling its grid cell, with the whole field content
    // anchored to the bottom (justify-end). When two fields share a grid row
    // and only one carries a hint, the extra text would push that field's
    // control below its neighbour's and the mixed row would come out stepped.
    // Grid rows stretch both cells to the same height; bottom-anchoring the
    // shorter field's CONTENT - label and control together - lands both
    // inputs on one line with each label sitting directly on its own input,
    // instead of a lone label hanging at the top of the cell.
    <Label
      // No h-full: as a direct grid child the Label is stretched to the row
      // height by the grid itself, and a percentage height inside nested
      // wrapper divs would only invite circular-sizing surprises.
      //
      // items-stretch and gap-0 are load-bearing, not decoration: the base
      // Label ships `flex items-center gap-2`, which a `block` display keeps
      // dormant and flex-col wakes up - items-center shrinks every control to
      // content width and centres it, gap-2 pads the label/hint/control rhythm
      // the mb-* utilities already set.
      className={cn(
        "flex flex-col items-stretch justify-end gap-0 font-normal leading-normal",
        className,
      )}
    >
      {/* ONE line of text per field: the label. A hint is a tooltip beside
          it (hover on desktop, tap on mobile), never a paragraph of its own -
          a form where every field carries a sentence of guidance reads as a
          wall of prose, and the reader can no longer tell the questions
          from the commentary. The label is ink and sentence case: it is the
          question being asked. "Optional" stays faint, because it qualifies
          the label rather than competing with it. */}
      <span className="mb-1 flex items-center gap-1 text-[11.5px] font-semibold text-adm-ink">
        <span className="min-w-0">
          {label}
          {optional ? (
            <span className="font-normal text-adm-faint"> (optional)</span>
          ) : null}
        </span>
        {hint ? <HelpTip inLabel text={hint} /> : null}
      </span>
      {hint ? (
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      ) : null}
      {control}
      {error ? (
        <span
          id={errorId}
          className="mt-1.5 block text-[11px] font-medium text-console-red"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </Label>
  );
}

/**
 * A stacked pair of radio cards: one question, two answers, the whole row a
 * tap target.
 *
 * A fieldset rather than a label around the group: a label wrapping two radios
 * gives BOTH of them the whole group's text as their accessible name, so a
 * screen reader reads every option on every option. The legend names the group;
 * each option's own label names itself.
 */
export function ChoiceCards<T extends string>({
  legend,
  name,
  onChange,
  options,
  value,
}: {
  legend: string;
  /** Radio group name - must be unique per form. */
  name: string;
  onChange: (value: T) => void;
  options: { hint?: string; label: string; value: T }[];
  value: T;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-[11.5px] font-semibold text-adm-ink">
        {legend}
      </legend>
      {/* Stacked at every width, never two-up: both answers are sentences, and
          a phone splits a sentence across three lines to save a row it did not
          need. */}
      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-2.5 rounded-[3px] border px-3 py-2.5 transition-colors",
              value === option.value
                ? "border-console bg-adm-sunken"
                : "border-adm-line hover:bg-adm-sunken",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => {
                onChange(option.value);
              }}
              className="mt-[3px] flex-none accent-console"
            />
            <span className="min-w-0">
              <span className="block text-[11.5px] font-semibold text-adm-ink">
                {option.label}
              </span>
              {option.hint ? (
                <span className="mt-0.5 block text-[11px] leading-[1.45] text-adm-muted">
                  {option.hint}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** The one form-control skin (the enquiry form's document field): paper
 * fill, 2px corners, 1.5px soil border, leaf focus glow, error border when
 * invalid. Layer onto shadcn Input/native selects so every field matches. */
/**
 * The console control: 36px tall, 6px radius, hairline border, white ground.
 * Meridian sizes controls for density - the 42px squared field on tinted paper
 * is a public-site form control, not one for a working tool.
 */
export const adminInputClass =
  "h-[38px] w-full rounded-none border border-adm-line bg-adm-card px-3 text-[12px] font-medium text-adm-ink shadow-none outline-none transition-[border-color,box-shadow] placeholder:text-adm-faint focus:border-console focus:shadow-[0_0_0_3px_rgba(30,61,43,0.12)] focus-visible:border-console focus-visible:ring-0 aria-invalid:border-console-red";

export const adminSelectClass = cn(adminInputClass, "cursor-pointer");

/**
 * The console's one cross-reference link: a record named somewhere it is not
 * the subject, pointing at the page where it IS.
 *
 * Ink-coloured with an underline that only appears on hover, the one way to
 * discover that a supplier, a warehouse or a shipment is reachable is to
 * sweep the pointer over the page and watch for something to move. A link has
 * to read as a link AT REST, so it carries the
 * console green - the one accent the reader already reads as "the system's own
 * colour" - and keeps the underline for hover so the resting page is not a
 * field of rules.
 *
 * The focus ring is an outline rather than a `ring`: a link is inline text
 * that can wrap across two lines, and an outline follows both fragments where
 * a box-shadow ring draws one rectangle around the lot.
 *
 * One exception by design: `TitleCell` keeps a table's identity column in ink.
 * Every row of a register is a link, and a column of forty green names reads
 * as a wall rather than as a set of names.
 */
export const adminLinkClass =
  "text-console underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console rounded-[2px]";

/**
 * The action row for a console form that opens read-only and unlocks on Edit.
 *
 * The `key` on each branch is load-bearing, not decoration. Without it React
 * reuses the SAME <button> element across a branch swap: clicking "Edit"
 * flips that element to type="submit" before the browser runs the click's
 * own default action, so the form submits itself the instant somebody tries to
 * unlock it - the fields stay disabled and a "saved" toast appears over a
 * PATCH nobody asked for. Distinct keys make React build a fresh element.
 *
 * `onSubmitGuard` is the second belt: a submit that arrives while the form is
 * locked is not a save, whatever fired it.
 */
export function EditableFormActions({
  mode,
  saving,
  createLabel,
  editLabel,
  onCancel,
  onEdit,
}: {
  /** "create" has no read-only state; the other two toggle. */
  mode: "create" | "editing" | "locked";
  saving: boolean;
  createLabel: string;
  editLabel: string;
  onCancel: () => void;
  onEdit: () => void;
}) {
  // Actions sit at the RIGHT edge, cancel before the primary, so every form
  // in the console ends the same way a dialog does: the eye finds the commit
  // action in the same place everywhere.
  if (mode === "create") {
    return (
      <CommitRow key="create" className="mt-1">
        <AdminButton
          type="button"
          variant="outline"
          size="lg"
          className="px-3.5"
          onClick={onCancel}
        >
          Cancel
        </AdminButton>
        <AdminButton type="submit" disabled={saving} loading={saving} size="lg">
          {saving ? "Saving…" : createLabel}
        </AdminButton>
      </CommitRow>
    );
  }

  if (mode === "editing") {
    return (
      <CommitRow key="editing" className="mt-1">
        <AdminButton
          type="button"
          variant="outline"
          size="lg"
          className="px-3.5"
          onClick={onCancel}
        >
          Cancel
        </AdminButton>
        <AdminButton type="submit" disabled={saving} loading={saving} size="lg">
          {saving ? "Saving…" : "Save changes"}
        </AdminButton>
      </CommitRow>
    );
  }

  return (
    <CommitRow key="locked" className="mt-1">
      <AdminButton type="button" variant="gold" size="lg" onClick={onEdit}>
        {editLabel}
      </AdminButton>
    </CommitRow>
  );
}

/**
 * A row of a record's or a section's action buttons. On phones the buttons
 * share the row's full width equally - two to a row, a lone one stretching
 * across - so a short button never sits with empty space beside it. From `sm`
 * they take their natural width again.
 */
export function ActionRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 *:grow *:basis-[calc(50%-0.25rem)] sm:*:grow-0 sm:*:basis-auto",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The cancel/commit pair that ends a form (DOM order: cancel, then the
 * commit). On phones the buttons stack full width with the commit on top and
 * cancel on the bottom edge - the same shape as the confirm gate and the
 * dialog footer, so every form in the console ends the same way; from `sm` a
 * right-aligned row.
 */
export function CommitRow({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 *:w-full sm:flex-row sm:flex-wrap sm:justify-end sm:*:w-auto",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Opens a server-rendered PDF in a new tab.
 *
 * The console's one way of handing over a document. Printing a screen is the
 * wrong way: the browser captures whatever is on the page - rail, topbar,
 * crumbs, footer - and the reader gets the console with a document somewhere
 * in the middle of it. The API already renders these
 * as real PDFs (`/admin/receipts/<type>/<id>.pdf`), correctly paginated, with
 * nothing on them that is not the document, and reaching one is a link rather
 * than a print dialog and a set of browser settings to get right.
 *
 * Styled as a quiet action, not a button: on every screen that has one there
 * is already a primary action beside it, and the document is something to
 * fetch, not the thing the page is for.
 */
export function PdfLink({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        adminLinkClass,
        "inline-flex h-9 flex-none items-center px-3 text-[11.5px] whitespace-nowrap",
        className,
      )}
    >
      {children}
    </a>
  );
}
