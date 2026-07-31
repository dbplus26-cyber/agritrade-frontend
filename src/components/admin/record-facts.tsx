import { DetailItem } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * The resting state of a record's detail page.
 *
 * These screens used to show their EDIT FORM at rest, greyed out - every
 * value sealed inside a disabled input, long ones clipped at the input's
 * edge with no way to read the rest, and a page of identical grey boxes with
 * no visual hierarchy at all. It looked like a form somebody had switched
 * off, because that is exactly what it was.
 *
 * A record at rest should READ. So the locked state renders the facts
 * plainly: label above value, values free to wrap to their full length, and
 * the empty ones honestly marked rather than shown as an empty box. The form
 * appears only once Edit is pressed, when a form is actually what the reader
 * wants.
 */
export interface RecordFact {
  /** Long prose (directions, notes) - given the full width of the grid. */
  full?: boolean;
  label: string;
  mono?: boolean;
  /** Rendered as "Not recorded" when empty, never as a blank. */
  value: React.ReactNode;
}

/** True for the values that should read as "nothing here" rather than blank. */
const isEmpty = (v: React.ReactNode): boolean =>
  v === null || v === undefined || v === "" || v === false;

export function RecordFacts({
  className,
  columns = 2,
  facts,
}: {
  className?: string;
  columns?: 2 | 3;
  facts: RecordFact[];
}) {
  return (
    // An explicit `minmax` floor rather than plain `grid-cols-2`.
    //
    // DetailItem wraps its value with `overflow-wrap: anywhere` so a single
    // enormous unbroken value cannot overflow its card. But `anywhere` also
    // lets a value's MIN-CONTENT width fall to one character, and a grid
    // track sized from its content will happily collapse that far - which
    // rendered a whole record as a column of single letters several thousand
    // pixels tall. The floor makes each column at least readable-width, and
    // auto-fit still gives one column on a phone.
    <div
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-x-8",
        columns === 2 && "xl:grid-cols-2",
        className,
      )}
    >
      {facts.map((f) => (
        <DetailItem
          className={f.full ? "col-span-full" : undefined}
          key={f.label}
          label={f.label}
          mono={f.mono}
        >
          {isEmpty(f.value) ? (
            <span className="text-soil/50">Not recorded</span>
          ) : (
            f.value
          )}
        </DetailItem>
      ))}
    </div>
  );
}
