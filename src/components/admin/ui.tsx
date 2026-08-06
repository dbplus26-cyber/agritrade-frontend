import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { HelpTip } from "@/components/admin/help-tip";
import { cn } from "@/lib/utils";

/**
 * Console primitives: shadcn components re-skinned to the DB Plus Console
 * system (Meridian slate + forest/gold/red accents, mono numerals). The
 * shadcn pieces provide behavior and a11y; the classes here pin the exact
 * console look — screens compose these, never restyle shadcn directly.
 */

/**
 * A label/value row for detail pages. Stacks (label above value) until there
 * is genuinely room to sit side by side.
 *
 * Measured against its CONTAINER, not the viewport. These rows live mostly in
 * the 340px side rail, and a viewport query is always satisfied on a desktop -
 * so a note or a warehouse name was pushed into a narrow right-hand column
 * while its label sat alone at the top of a cell several lines deep. The pair
 * read as broken, which is exactly the complaint. Sized by the rail, a long
 * value takes the row under its label instead.
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
      <span className="flex flex-none items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What is ${label}?`} text={hint} /> : null}
      </span>
      <span
        className={cn(
          "min-w-0 text-[13.5px] text-adm-ink [overflow-wrap:anywhere] @min-[420px]:text-right",
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
      <p className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What is ${label}?`} text={hint} /> : null}
      </p>
      <div
        className={cn(
          "mt-0.5 min-w-0 text-[13.5px] text-adm-ink [overflow-wrap:anywhere]",
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
          // @container so DetailRow (and anything else inside) sizes against
          // the RAIL rather than the viewport - the rail is 340px however wide
          // the screen is.
          "@container min-w-0 self-start xl:sticky xl:top-[70px] xl:order-2",
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
        "gap-1.5 rounded-full border-transparent px-2.5 py-0.5 text-[10px] font-bold tracking-[0.08em] uppercase whitespace-nowrap",
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
 * It used to be the public site's filed document - tinted paper, 1.5px soil
 * border, hard offset shadow, squared corners. A page carrying six of those
 * reads as six slabs shouting at each other; the console is read for hours and
 * wants surfaces that sit quietly under the data. Screens own their padding.
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
        "block gap-0 rounded-[8px] border border-adm-line bg-adm-card py-0 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
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
  hint,
}: {
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  className?: string;
  /**
   * One sentence on what this screen is for, shown on hover beside the title.
   * The sub-line says what is ON the page; this says why you would come here.
   */
  hint?: string;
}) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      {/* A detail page is where a record is read IN FULL. Truncating its
          title behind a tooltip meant the one thing identifying the page was
          the one thing you could not read - so the heading wraps (to two
          lines, so it stays a heading rather than a paragraph) and the
          sub-line does the same.
          
          It takes the whole row that the actions leave it, rather than the
          68ch it used to: on a 1216px console page that measured 404px, so
          the heading and its description were folding inside a third of a
          page whose tables and cards below them ran the full width. */}
      <div className="min-w-0 flex-1">
        <h1 className="line-clamp-2 text-[19px] leading-[1.3] font-bold text-adm-ink">
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
          <p className="mt-0.5 line-clamp-2 text-[13px] text-adm-muted" title={sub}>
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
        // Meridian controls: 34px, 6px radius, no offset shadow anywhere. The
        // console's buttons used to shift on hover like a stamped plate, which
        // is charming once and tiring on the fortieth click of a working day.
        "h-[34px] gap-1.5 rounded-[6px] px-3.5 text-[13.5px] font-semibold shadow-none transition-colors hover:translate-x-0 hover:translate-y-0 hover:shadow-none",
        variant === "primary" &&
          "bg-console text-white hover:bg-console-hover",
        (variant === "secondary" || variant === "outline") &&
          "border border-adm-line bg-adm-card text-adm-body hover:bg-adm-sunken hover:text-adm-ink",
        variant === "ghost" && "text-adm-body hover:bg-adm-sunken hover:text-adm-ink",
        variant === "danger" &&
          "bg-console-red text-white hover:bg-console-red-deep",
        variant === "gold" && "bg-console-gold text-white hover:bg-console-gold-deep",
        className,
      )}
      {...props}
    />
  );
}

/** Field label + control wrapper for console forms (shadcn Label inside),
 * in the document idiom of the site's enquiry form: a micro-cap
 * label over the paper field, error/hint filed beneath. */
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
  return (
    <Label className={cn("block font-normal leading-normal", className)}>
      {/* Meridian's eyebrow: small, semibold, wide-tracked, and in the
          neutral - a stencilled gold micro-cap belongs on the printed site,
          not over every field of a working form. */}
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-adm-muted">
        {label}
        {optional ? <span className="text-adm-faint"> - optional</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-[12px] font-medium text-console-red">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-[12.5px] font-normal text-adm-muted">{hint}</span>
      ) : null}
    </Label>
  );
}

/** The one form-control skin (the enquiry form's document field): paper
 * fill, 2px corners, 1.5px soil border, leaf focus glow, error border when
 * invalid. Layer onto shadcn Input/native selects so every field matches. */
/**
 * The console control: 36px tall, 6px radius, hairline border, white ground.
 * Meridian sizes controls for density - the 42px squared field on tinted paper
 * was a public-site form control standing in a working tool.
 */
export const adminInputClass =
  "h-[36px] w-full rounded-[6px] border border-adm-line bg-adm-card px-3 text-[13.5px] font-normal text-adm-ink shadow-none outline-none transition-[border-color,box-shadow] placeholder:text-adm-faint focus:border-console focus:shadow-[0_0_0_3px_rgba(30,61,43,0.12)] focus-visible:border-console focus-visible:ring-0 aria-invalid:border-console-red";

export const adminSelectClass = cn(adminInputClass, "cursor-pointer");

/**
 * The console's one cross-reference link: a record named somewhere it is not
 * the subject, pointing at the page where it IS.
 *
 * These used to be ink-coloured with an underline that appeared on hover,
 * which meant the only way to discover that a supplier, a warehouse or a
 * shipment was reachable was to sweep the pointer over the page and watch for
 * something to move. A link has to read as a link AT REST, so it carries the
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
 * flipped that element to type="submit" before the browser ran the click's
 * own default action, so the form submitted itself the instant you tried to
 * unlock it - the field stayed disabled and a "saved" toast appeared over a
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
  if (mode === "create") {
    return (
      <div key="create" className="mt-1 flex gap-2">
        <AdminButton type="submit" disabled={saving} className="h-[38px] px-[18px]">
          {saving ? "Saving…" : createLabel}
        </AdminButton>
        <AdminButton
          type="button"
          variant="outline"
          className="h-[38px] px-3.5"
          onClick={onCancel}
        >
          Cancel
        </AdminButton>
      </div>
    );
  }

  if (mode === "editing") {
    return (
      <div key="editing" className="mt-1 flex gap-2">
        <AdminButton type="submit" disabled={saving} className="h-[38px] px-[18px]">
          {saving ? "Saving…" : "Save changes"}
        </AdminButton>
        <AdminButton
          type="button"
          variant="outline"
          className="h-[38px] px-3.5"
          onClick={onCancel}
        >
          Cancel
        </AdminButton>
      </div>
    );
  }

  return (
    <div key="locked" className="mt-1 flex gap-2">
      <AdminButton
        type="button"
        variant="gold"
        className="h-[38px] px-[18px]"
        onClick={onEdit}
      >
        {editLabel}
      </AdminButton>
    </div>
  );
}

/**
 * Opens a server-rendered PDF in a new tab.
 *
 * The console's one way of handing over a document. Printing a screen was the
 * other way, and it was the wrong one: the browser captured whatever was on
 * the page - rail, topbar, crumbs, footer - and the reader got the console
 * with a document somewhere in the middle of it. The API already renders these
 * as real PDFs (`/admin/receipts/<type>/<id>.pdf`), correctly paginated, with
 * nothing on them that is not the document, and reaching one is a link rather
 * than a print dialog and a set of browser settings to get right.
 *
 * Styled as a quiet action, not a button: on every screen that has one there
 * is already a primary action beside it, and the document is a thing you
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
        "inline-flex h-9 flex-none items-center px-3 text-[13px] whitespace-nowrap",
        className,
      )}
    >
      {children}
    </a>
  );
}
