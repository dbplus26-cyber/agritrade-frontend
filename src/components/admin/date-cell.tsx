import { Absent } from "@/components/admin/registry/registry-bits";
import { formatTableDate, formatTableTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";

/**
 * Date cells for the admin data tables: ONE line, in a DEDICATED date column.
 * Timestamps read "Jul 12, 2026, 2:30 PM"; business dates drop the time.
 * Dates never ride inside another column's cell - they get their own header.
 */

interface IDateCellProps {
  value: string | null | undefined;
  /** Mutes the whole stamp (for secondary columns). */
  muted?: boolean;
}

const isInvalid = (value: string | null | undefined): value is null | undefined =>
  !value || Number.isNaN(new Date(value).getTime());

/** Single-line date + time for timestamp columns (createdAt etc.). */
export function DateTimeCell({ value, muted }: IDateCellProps) {
  if (isInvalid(value)) return <Absent />;
  return (
    <span className={cn("whitespace-nowrap text-[12.5px]", muted && "text-soil")}>
      {formatTableDate(value)}
      <span className="text-soil/70">, {formatTableTime(value)}</span>
    </span>
  );
}

/** Single-line date for business dates where the time is noise. */
export function DateOnlyCell({ value, muted }: IDateCellProps) {
  if (isInvalid(value)) return <Absent />;
  return (
    <span className={cn("whitespace-nowrap text-[12.5px]", muted && "text-soil")}>
      {formatTableDate(value)}
    </span>
  );
}
