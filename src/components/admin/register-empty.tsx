import { AdminCard } from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * The one empty rendering every register shares.
 *
 * An empty register means one of two different things, and the copy must say
 * which: nothing on file at all (a register waiting to be started - show the
 * create action), or nothing matching an active search/filter (the reader's
 * criteria, not the register, produced the blank - offer to clear them).
 * Before this component each screen wrote its own AdminCard + EmptyState
 * ternary and the two meanings drifted; several screens told a filtered-empty
 * reader "nothing on file yet".
 *
 * Pair it with the pristine rule from the grants register: when `filtered` is
 * false the caller should also be hiding its ConsoleFilterBar, so the create
 * action here is the page's ONLY action - always pass one where the register
 * has a create path.
 */
export function RegisterEmpty({
  filtered,
  noun,
  description,
  title,
  actionLabel,
  onAction,
  onClear,
  filteredTitle,
  filteredDescription,
}: {
  /** True when a search or filter is narrowing the register. */
  filtered: boolean;
  /** Plural noun for the default titles, e.g. "suppliers". */
  noun: string;
  /** Pristine-empty description - what starts this register off. */
  description: string;
  /** Pristine-empty title; defaults to "No {noun} yet". */
  title?: string;
  /** Pristine-empty create action (omit for system-fed registers). */
  actionLabel?: string;
  onAction?: () => void;
  /** Filtered-empty escape hatch - clears the search and every filter. */
  onClear?: () => void;
  /** Filtered-empty title; defaults to "No matching {noun}". */
  filteredTitle?: string;
  filteredDescription?: string;
}) {
  return (
    <AdminCard className="overflow-hidden">
      {filtered ? (
        <EmptyState
          variant="plain"
          title={filteredTitle ?? `No matching ${noun}`}
          description={
            filteredDescription ??
            "Nothing matches this search and filter combination."
          }
          actionLabel={onClear ? "Clear search & filters" : undefined}
          onAction={onClear}
        />
      ) : (
        <EmptyState
          variant="plain"
          title={title ?? `No ${noun} yet`}
          description={description}
          actionLabel={actionLabel}
          onAction={onAction}
        />
      )}
    </AdminCard>
  );
}
