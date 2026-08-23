import type { CardSlot } from "@/components/admin/data-table";
import { cn } from "@/lib/utils";
import { HelpWrap } from "@/components/admin/help-tip";
import { ToneBadge } from "@/components/admin/ui";
import { PurchaseSource } from "@/types/registry.types";

/**
 * Shared bits for the live registry screens (commodities, warehouses,
 * suppliers, buyers, expense categories) - the same idiom the Users register
 * established.
 */

export const SOURCE_LABEL: Record<PurchaseSource, string> = {
  [PurchaseSource.INDIVIDUAL]: "Individual",
  [PurchaseSource.COMPANY]: "Company",
  [PurchaseSource.AGENT]: "Agent",
};

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <HelpWrap text="In use, so it still appears wherever this is chosen.">
      <ToneBadge tone="leaf">Active</ToneBadge>
    </HelpWrap>
  ) : (
    <HelpWrap text="Kept for old records but no longer offered when creating new ones.">
      <ToneBadge tone="slate">Inactive</ToneBadge>
    </HelpWrap>
  );
}

export function PublishedBadge({ published }: { published: boolean }) {
  return published ? (
    <HelpWrap text="Showing on the public website, where customers can see it.">
      <ToneBadge tone="harvest">On website</ToneBadge>
    </HelpWrap>
  ) : (
    <HelpWrap text="Held back from the public website; only this console shows it.">
      <ToneBadge tone="slate">Not published</ToneBadge>
    </HelpWrap>
  );
}

/**
 * Where a secondary column starts appearing. Not every fact earns room at
 * every width: a table that shows all twelve of its columns on a laptop is a
 * table that scrolls sideways, and the reader loses the first column - the one
 * that says WHICH row they are looking at - the moment they go looking for the
 * last. So the columns that identify a row are always present, and the rest
 * arrive as the screen can afford them.
 */
const REVEAL_AT = {
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
} as const;

/** Column meta shared by every register table. */
export const columnMeta = (opts?: {
  /** Show this column only from a breakpoint up. */
  at?: keyof typeof REVEAL_AT;
  /**
   * Which slot this column fills on the phone card - see CardSlot. A column
   * that names none is table-only: it stays on the record and on the detail
   * screen, and does not crowd a list a person is scanning on a phone.
   */
  card?: CardSlot;
  className?: string;
  /**
   * Marks this as the table's primary column: 40% of the table width, with
   * the cell truncating at ~90% of it. Exactly one per table - see
   * ConsoleColumnMeta.stretch for why a share beats a fixed cap.
   */
  stretch?: boolean;
  /** Older shorthand for `at: "xl"`, kept so existing tables read the same. */
  wide?: boolean;
}) => ({
  className: cn(
    // No font size here. The shared table body is 14px (data-table.tsx td);
    // a `text-[13px]` in this meta silently overrides it on every register
    // that uses columnMeta while screens without it stay at 14px - and the
    // phone card view (which ignores meta) stays at 14px everywhere. One
    // table, two sizes, depending on the width of the screen.
    "px-4 py-0",
    opts?.at
      ? REVEAL_AT[opts.at]
      : opts?.wide
        ? REVEAL_AT.xl
        : "table-cell",
    opts?.className,
  ),
  headerClassName:
    "h-[38px] whitespace-nowrap bg-adm-sunken py-0 text-[10.5px] font-bold uppercase tracking-[0.09em] text-adm-muted",
  ...(opts?.card ? { card: opts.card } : {}),
  ...(opts?.stretch ? { stretch: true as const } : {}),
});

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

export type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]["value"];

/** Maps the status facet onto the backend's isActive filter. */
export const statusToQuery = (
  status: StatusFilter,
): { isActive?: boolean } => {
  if (status === "active") return { isActive: true };
  if (status === "inactive") return { isActive: false };
  return {};
};

/** "-" placeholder the console uses for absent optional values. */
export function Absent() {
  return <span className="text-adm-faint">-</span>;
}
