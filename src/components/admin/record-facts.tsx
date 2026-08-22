import { DetailItem } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/**
 * The resting state of a record's detail page.
 *
 * A record at rest should READ, not sit in a greyed-out edit form: a disabled
 * input seals its value in, clips a long one at the input's edge with no way
 * to read the rest, and turns the page into identical grey boxes with no
 * hierarchy at all.
 *
 * So the locked state renders the facts plainly: label above value, values
 * free to wrap to their full length, and the empty ones honestly marked
 * rather than shown as an empty box. The form
 * appears only once Edit is pressed, when a form is actually what the reader
 * wants.
 */
export interface RecordFact {
  /** Long prose (directions, notes) - given the full width of the grid. */
  full?: boolean;
  /**
   * One sentence on what the fact IS, on hover beside its label. For the
   * domain words a record page is full of - float, basis, milestone, lot -
   * not for the ones that need no help ("Name", "Phone").
   */
  hint?: string;
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
    // Its OWN container, and container queries rather than `xl:`.
    //
    // A viewport query (`xl:grid-cols-2`) is wrong here. On a detail page the
    // facts often sit in a ~340px rail beside the main column, so a wide window
    // would force that rail into two ~155px columns: a name takes half a card
    // it should have all of, and wraps inside it. The width that decides
    // whether two columns fit is this block's own, never the window's.
    //
    // Splitting at @lg (32rem) means each column still clears ~15rem after the
    // gap. Below that it is one full-width column, which is what a rail always
    // gets. Fixed tracks matter as much as the breakpoint: DetailItem wraps
    // values with `overflow-wrap: anywhere`, whose min-content is a single
    // character, so a content-sized track collapses that far and renders a
    // whole record as a column of single letters. `grid-cols-*` tracks are
    // `minmax(0,1fr)`, so they hold their share regardless.
    <div className={cn("@container", className)}>
      <div
        className={cn(
          "grid grid-cols-1 gap-x-8",
          columns === 2 ? "@lg:grid-cols-2" : "@lg:grid-cols-2 @4xl:grid-cols-3",
        )}
      >
        {facts.map((f) => (
          <DetailItem
            className={f.full ? "col-span-full" : undefined}
            hint={f.hint}
            key={f.label}
            label={f.label}
            mono={f.mono}
          >
            {isEmpty(f.value) ? (
              <span className="text-adm-faint">Not recorded</span>
            ) : (
              f.value
            )}
          </DetailItem>
        ))}
      </div>
    </div>
  );
}
