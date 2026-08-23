"use client";

import { createContext, useContext } from "react";

import { Absent } from "@/components/admin/registry/registry-bits";
import { formatTableDate, formatTableTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";

/**
 * Date cells for the admin data tables, in a DEDICATED date column - dates
 * never ride inside another column's cell.
 *
 * A timestamp stacks: the date on top, the time muted beneath it. Scanning a
 * register is a date-first job, and a single "Jul 12, 2026, 2:30 PM" line
 * makes every row wide enough to force the columns that carry the actual
 * numbers into a truncation nobody wants. Business dates drop the time.
 */

/**
 * Set by the phone card view.
 *
 * The card/table switch is a CONTAINER query and a viewport breakpoint cannot
 * follow it: a narrow console column on a wide screen renders cards while the
 * viewport still says desktop, and the clock came back on rows that had no
 * room for it. The card says so itself instead.
 */
export const CompactDates = createContext(false);

interface IDateCellProps {
  value: string | null | undefined;
  /** Mutes the whole stamp (for secondary columns). */
  muted?: boolean;
}

const isInvalid = (value: string | null | undefined): value is null | undefined =>
  !value || Number.isNaN(new Date(value).getTime());

/** Stacked date over time for timestamp columns (createdAt etc.). */
export function DateTimeCell({ value, muted }: IDateCellProps) {
  const compact = useContext(CompactDates);
  if (isInvalid(value)) return <Absent />;
  return (
    <span className="block leading-[1.35]">
      <span
        className={cn(
          "block whitespace-nowrap text-[11.5px]",
          muted && "text-adm-muted",
        )}
      >
        {formatTableDate(value)}
      </span>
      {/* A card loses the clock outright; elsewhere a phone loses it. A
          minute past the hour decides nothing an admin does from a list -
          the day does - and the second line cost every row of every register
          its height on the smallest screen. */}
      {compact ? null : (
        <span className="hidden whitespace-nowrap text-[10.5px] text-adm-faint sm:block">
          {formatTableTime(value)}
        </span>
      )}
    </span>
  );
}

/** Single-line date for business dates where the time is noise. */
export function DateOnlyCell({ value, muted }: IDateCellProps) {
  if (isInvalid(value)) return <Absent />;
  return (
    <span className={cn("whitespace-nowrap text-[11.5px]", muted && "text-adm-muted")}>
      {formatTableDate(value)}
    </span>
  );
}
