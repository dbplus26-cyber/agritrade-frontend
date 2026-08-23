import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { columnMeta } from "@/components/admin/registry/registry-bits";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/expense-categories",
  useRouter: () => ({ prefetch: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

interface Row {
  active: boolean;
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
];

const data: Row[] = [{ active: true, count: 4, id: "1", name: "Transport" }];

describe("the phone card of a console table", () => {
  it("puts a display-column badge on the same row as the figure", () => {
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

    // The badges/figures row is the card's first child; both belong to it.
    const row = card?.firstElementChild;
    expect(row?.contains(badge!)).toBe(true);
    expect(row?.contains(count!)).toBe(true);
  });
});
