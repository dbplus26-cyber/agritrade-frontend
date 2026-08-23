import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { DateTimeCell } from "@/components/admin/date-cell";
import { columnMeta } from "@/components/admin/registry/registry-bits";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/expense-categories",
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

interface Row {
  active: boolean;
  added: string;
  count: number;
  id: string;
  name: string;
}

/**
 * A status badge is almost always a DISPLAY column: the badge is computed in
 * the cell, so there is no accessor to give it. The card view has twice read
 * that as "a row action" and dropped it to a line of its own at the foot of
 * the card, away from the figure it is meant to sit beside - which is a
 * register's rows a third taller on a phone for nothing.
 */
const columns: ColumnDef<Row, unknown>[] = [
  {
    accessorFn: (r) => r.name,
    cell: ({ row }) => <span>{row.original.name}</span>,
    header: "Category",
    id: "name",
    meta: columnMeta({ card: "title", stretch: true }),
  },
  {
    accessorFn: (r) => r.count,
    cell: ({ row }) => <span data-testid="count">{row.original.count}</span>,
    header: "Expenses filed",
    id: "expenses",
    meta: columnMeta({ card: "trailing" }),
  },
  {
    cell: ({ row }) => (
      <span data-testid="badge">
        {row.original.active ? "Active" : "Inactive"}
      </span>
    ),
    header: "Status",
    id: "status",
    meta: columnMeta({ card: "badge" }),
  },
  {
    accessorFn: (r) => r.added,
    cell: ({ row }) => <DateTimeCell value={row.original.added} />,
    header: "Added",
    id: "added",
    meta: columnMeta({ card: "meta" }),
  },
];

const data: Row[] = [
  {
    active: true,
    added: "2026-07-12T14:30:00.000Z",
    count: 4,
    id: "1",
    name: "Transport",
  },
];

describe("the phone card of a console table", () => {
  it("keeps a display-column badge on the card rather than filing it as an action", () => {
    render(
      <ConsoleDataTable<Row>
        columns={columns}
        data={data}
        itemNoun="categories"
      />,
    );

    const card = document.querySelector("[data-slot-card]");
    expect(card).not.toBeNull();

    const badge = card?.querySelector('[data-testid="badge"]');
    const count = card?.querySelector('[data-testid="count"]');
    expect(badge).not.toBeNull();
    expect(count).not.toBeNull();

    // The badges open the card and the figures close it, so the two are not
    // in the same row - what matters is that both are on the card and the
    // figure sits in its closing row alongside anything actionable.
    expect(card?.firstElementChild?.contains(badge!)).toBe(true);
    expect(card?.lastElementChild?.contains(count!)).toBe(true);
  });

  /**
   * The card/table switch is a container query, so a viewport breakpoint
   * cannot follow it: a narrow console column on a wide screen renders cards
   * while the viewport still reads as desktop, and the clock came back on
   * rows with no room for it. The card declares itself compact instead.
   */
  it("drops the clock from a date inside a card", () => {
    render(
      <ConsoleDataTable<Row>
        columns={columns}
        data={data}
        itemNoun="categories"
      />,
    );

    const card = document.querySelector("[data-slot-card]");
    expect(card?.textContent).toContain("Jul 12, 2026");
    // The table beside it keeps the time; the card must not carry one.
    expect(card?.textContent).not.toMatch(/\d{1,2}:\d{2}/);
  });
});
