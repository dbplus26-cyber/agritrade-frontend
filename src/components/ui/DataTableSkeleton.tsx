import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Loading shape for tabular data: the real Table chrome with shimmering
 * ledger rows, so the layout never jumps when data lands. Column count/rows
 * mirror the table it stands in for.
 */
export function DataTableSkeleton({
  columns = 5,
  rows = 8,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("shadow-doc border border-soil/35 bg-paper", className)}
    >
      <div className="flex items-baseline justify-between border-b-[1.5px] border-soil/50 px-6 py-4">
        <Skeleton className="h-3.5 w-36 rounded-[2px]" />
        <Skeleton className="h-3 w-16 rounded-[2px]" />
      </div>
      <Table>
        <TableHeader>
          <TableRow className="border-soil/30 hover:bg-transparent">
            {Array.from({ length: columns }, (_, col) => (
              <TableHead key={col}>
                <Skeleton className="h-3 w-[70%] min-w-14 rounded-[2px]" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, row) => (
            <TableRow
              key={row}
              className="border-dotted border-soil/30 hover:bg-transparent"
            >
              {Array.from({ length: columns }, (_, col) => (
                <TableCell key={col}>
                  <Skeleton
                    className="h-3.5 rounded-[2px]"
                    style={{ width: `${String(55 + ((row + col) % 3) * 15)}%` }}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
