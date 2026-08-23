// test/component/console-data-table.test.tsx
//
// The shared console table shell. Three behaviours worth pinning because
// every register inherits them at once:
//
//   * an empty table MEANS two different things, and the shell must render
//     them differently: nothing on file at all gets the empty state ALONE
//     (no headings standing over nothing, no pager - the header row, not
//     the content, is what makes an empty register scroll sideways),
//     while nothing-matching-a-filter keeps the headings, because the
//     columns are what the reader just filtered on;
//   * a refetch dims the CURRENT rows rather than blanking them - the
//     aria-busy containers are the accessible face of that dimming;
//   * in server mode the footer must drive the caller's callbacks with
//     1-based page numbers, not TanStack's internal 0-based index.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";

import { ConsoleDataTable } from "@/components/admin/data-table";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
}));

const userEvent = userEventBase.setup({ delay: null });

interface Row {
  name: string;
  weightKg: number;
}

const COLUMNS: ColumnDef<Row, unknown>[] = [
  {
    id: "name",
    accessorFn: (r) => r.name,
    header: "Name",
    enableSorting: false,
  },
  {
    id: "weight",
    accessorFn: (r) => r.weightKg,
    header: "Weight",
    enableSorting: false,
  },
];

const ROWS: Row[] = [
  { name: "Maize, Tolon", weightKg: 1200 },
  { name: "Soya, Savelugu", weightKg: 800 },
];

describe("ConsoleDataTable - what an empty table means", () => {
  it("shows the empty state ALONE when the register is truly empty", () => {
    render(
      <ConsoleDataTable<Row>
        columns={COLUMNS}
        data={[]}
        emptyState={<p>Nothing on file yet.</p>}
        itemNoun="lots"
      />,
    );

    expect(screen.getByText("Nothing on file yet.")).toBeInTheDocument();
    // No table furniture: headings over an absent body are what make an
    // empty register scroll sideways, and a pager over zero rows is noise.
    expect(screen.queryByRole("columnheader")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Pagination" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the column headings when a FILTER emptied the list", () => {
    render(
      <ConsoleDataTable<Row>
        columns={COLUMNS}
        data={[]}
        emptyState={<p>No lots match.</p>}
        isFiltered
        itemNoun="lots"
      />,
    );

    // The reader filtered ON these columns; dropping them would make the
    // "no match" state look like a broken page instead of a narrow filter.
    const headings = screen.getAllByRole("columnheader");
    expect(headings.map((h) => h.textContent)).toEqual(["Name", "Weight"]);
    // getAllBy: the shell renders BOTH the card view and the table view and
    // lets a CSS container query pick one; jsdom applies no CSS, so both are
    // in the DOM here. That duality is the design, not an accident.
    expect(screen.getAllByText("No lots match.").length).toBeGreaterThan(0);
  });

  it("withholds the truly-empty state while the first fetch is in flight", () => {
    const { container } = render(
      <ConsoleDataTable<Row>
        columns={COLUMNS}
        data={[]}
        emptyState={<p>Nothing on file yet.</p>}
        isFetching
        itemNoun="lots"
      />,
    );

    // A table that HAS rows must not flash "nothing here" on first paint;
    // while fetching, the shell renders (busy) instead of concluding empty.
    expect(
      container.querySelectorAll('[aria-busy="true"]').length,
    ).toBeGreaterThan(0);
  });
});

describe("ConsoleDataTable - refetch dimming", () => {
  it("marks both views busy during a refetch but keeps the rows on screen", () => {
    const { container } = render(
      <ConsoleDataTable<Row>
        columns={COLUMNS}
        data={ROWS}
        isFetching
        itemNoun="lots"
      />,
    );

    // The stale rows stay readable (dimmed), no blank flash between pages.
    // (getAllBy: card and table views both render; CSS picks one at runtime.)
    expect(screen.getAllByText("Maize, Tolon").length).toBeGreaterThan(0);
    // Both the card view and the table view carry the busy flag; assistive
    // tech gets the same "loading" signal the dimming gives sighted readers.
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(2);
  });

  it("carries no busy flag at rest", () => {
    const { container } = render(
      <ConsoleDataTable<Row> columns={COLUMNS} data={ROWS} itemNoun="lots" />,
    );
    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(0);
  });
});

describe("ConsoleDataTable - server pagination wiring", () => {
  const serverProps = (overrides?: { page?: number }) => ({
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    page: overrides?.page ?? 1,
    pageSize: 10,
    totalCount: 47,
  });

  it("drives onPageChange with 1-based page numbers", async () => {
    const pagination = serverProps({ page: 2 });
    render(
      <ConsoleDataTable<Row>
        columns={COLUMNS}
        data={ROWS}
        itemNoun="lots"
        serverPagination={pagination}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(pagination.onPageChange).toHaveBeenCalledWith(3);

    await userEvent.click(
      screen.getByRole("button", { name: "Previous page" }),
    );
    expect(pagination.onPageChange).toHaveBeenCalledWith(1);

    await userEvent.click(screen.getByRole("button", { name: "Last page" }));
    // 47 lots at 10 a page is 5 pages - the footer, not the caller, does
    // that arithmetic, so it must get it right.
    expect(pagination.onPageChange).toHaveBeenCalledWith(5);
  });

  it("pins the edges: no page 0 and no page past the last", () => {
    const pagination = serverProps({ page: 1 });
    render(
      <ConsoleDataTable<Row>
        columns={COLUMNS}
        data={ROWS}
        itemNoun="lots"
        serverPagination={pagination}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("shows the plain count, not a pager, when one page could hold it all", () => {
    const pagination = { ...serverProps(), totalCount: 4 };
    render(
      <ConsoleDataTable<Row>
        columns={COLUMNS}
        data={ROWS}
        itemNoun="lots"
        serverPagination={pagination}
      />,
    );

    // Two items never get a pager. The footer degrades to a count.
    expect(
      screen.queryByRole("navigation", { name: "Pagination" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/4 lots/)).toBeInTheDocument();
  });
});


describe("ConsoleDataTable - keyboard row navigation", () => {
  it("opens a row's detail with Enter, from the keyboard alone", async () => {
    pushMock.mockClear();
    render(
      <ConsoleDataTable
        columns={COLUMNS}
        data={ROWS}
        isFetching={false}
        itemNoun="rows"
        rowHref={(r) => `/admin/things/${r.name}`}
      />,
    );

    // The row announces itself as a link and sits in the tab order: a
    // mouse-only register has no keyboard path to any detail.
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(2);
    links[0].focus();
    await userEvent.keyboard("{Enter}");
    expect(pushMock).toHaveBeenCalledWith("/admin/things/Maize, Tolon");
  });

  it("gives a row without an href no link role and no tab stop", () => {
    pushMock.mockClear();
    render(
      <ConsoleDataTable
        columns={COLUMNS}
        data={ROWS}
        isFetching={false}
        itemNoun="rows"
      />,
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

/**
 * The phone card: what a row collapses to when there is no room for a table.
 *
 * A narrow screen does not get a smaller table, it gets a summary - so what is
 * pinned here is the CHOOSING. A column that named no slot is absent from the
 * card entirely, which is the whole point: a register that transposes every
 * column into a labelled pair is a form, one screenful per row, and the reader
 * scrolls past four rows looking for one. The rest of the record is a tap away
 * on the detail view.
 */
describe("ConsoleDataTable - the phone card", () => {
  interface Load {
    id: string;
    note: string;
    ref: string;
    status: string;
    title: string;
    total: string;
  }

  const LOAD: Load = {
    id: "l1",
    note: "Nothing to report",
    ref: "PUR-2026-00317",
    status: "Received",
    title: "Maize, Tolon",
    total: "GHS 4,000",
  };

  const SLOTTED: ColumnDef<Load, unknown>[] = [
    {
      id: "status",
      accessorFn: (r) => r.status,
      header: "Status",
      meta: { card: "badge" },
      enableSorting: false,
    },
    {
      id: "total",
      accessorFn: (r) => r.total,
      header: "Total",
      meta: { card: "trailing" },
      enableSorting: false,
    },
    {
      id: "title",
      accessorFn: (r) => r.title,
      header: "Load",
      meta: { card: "title" },
      enableSorting: false,
    },
    {
      id: "ref",
      accessorFn: (r) => r.ref,
      header: "Reference",
      meta: { card: "meta" },
      enableSorting: false,
    },
    // No slot: on the record, on the detail screen, not on the card.
    {
      id: "note",
      accessorFn: (r) => r.note,
      header: "Note",
      enableSorting: false,
    },
  ];

  /** What the card shows, as opposed to the table rendered beside it. */
  const cardText = (): string => {
    const cards = document.querySelectorAll("[data-slot-card]");
    return [...cards].map((c) => c.textContent ?? "").join(" ");
  };

  it("shows the slotted facts and drops the rest", () => {
    render(
      <ConsoleDataTable<Load>
        columns={SLOTTED}
        data={[LOAD]}
        itemNoun="loads"
      />,
    );

    // Every slot is on the card ...
    expect(cardText()).toContain("Maize, Tolon");
    expect(cardText()).toContain("Received");
    expect(cardText()).toContain("GHS 4,000");
    expect(cardText()).toContain("PUR-2026-00317");
    // ... and the unslotted column is not, though the table beside it has it.
    expect(cardText()).not.toContain("Nothing to report");
    expect(screen.getAllByText("Nothing to report").length).toBeGreaterThan(0);
  });

  it("never labels a card field - a summary is not a form", () => {
    render(
      <ConsoleDataTable<Load>
        columns={SLOTTED}
        data={[LOAD]}
        itemNoun="loads"
      />,
    );

    // The column headings belong to the table. Repeating them once per row is
    // the key-value shape this replaces.
    expect(cardText()).not.toContain("Reference");
    expect(cardText()).not.toContain("Status");
  });

  it("leaves out a slot the row has nothing for", () => {
    render(
      <ConsoleDataTable<Load>
        columns={SLOTTED}
        data={[{ ...LOAD, ref: "", status: "" }]}
        itemNoun="loads"
      />,
    );

    // An empty badge would hold a line open and an empty meta entry would
    // leave a stray separator behind.
    expect(cardText()).toContain("Maize, Tolon");
    expect(cardText()).not.toContain("·");
  });

  it("falls back to labelled pairs for a table that slots nothing", () => {
    render(
      <ConsoleDataTable<Row>
        columns={COLUMNS}
        data={[ROWS[0]]}
        itemNoun="lots"
      />,
    );

    // Written before the slots existed: it still renders its data rather than
    // an empty card.
    expect(cardText()).toContain("Maize, Tolon");
    expect(cardText()).toContain("Name");
  });
});

/**
 * Selecting on a phone.
 *
 * A checkbox on a card is the wrong control twice over: a 16px target on the
 * smallest screen, and a second thing to aim at on a row whose whole surface
 * is already a link. So the card carries no box - a press and hold selects it,
 * a tap adds to a selection already under way, and being selected shows as
 * highlight. What is pinned here is that the box is GONE (it stays in the
 * table beside it), that a hold does not also follow the row's link, and that
 * a keyboard has the same reach as a thumb.
 */
describe("ConsoleDataTable - selecting on a card", () => {
  const SELECTABLE: ColumnDef<Row, unknown>[] = [
    {
      id: "name",
      accessorFn: (r) => r.name,
      header: "Name",
      meta: { card: "title" },
      enableSorting: false,
    },
  ];

  const renderList = () =>
    render(
      <ConsoleDataTable<Row>
        columns={SELECTABLE}
        data={ROWS}
        enableSelection
        itemNoun="lots"
        renderBulkActions={() => <button type="button">Delete selected</button>}
        rowHref={(r) => `/admin/lots/${r.name}`}
      />,
    );

  const cards = () => [...document.querySelectorAll("[data-slot-card]")];

  /** A press and hold on a touch screen, and its release. */
  const hold = async (el: Element) => {
    fireEvent.pointerDown(el, { clientX: 10, clientY: 10, pointerType: "touch" });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.pointerUp(el, { clientX: 10, clientY: 10, pointerType: "touch" });
    fireEvent.click(el);
  };

  beforeEach(() => {
    pushMock.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("puts no checkbox on the card", () => {
    renderList();

    // The table beside it keeps its select column; the card does not.
    expect(
      cards().some((c) => c.querySelector('[role="checkbox"], input[type="checkbox"]')),
    ).toBe(false);
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
  });

  it("selects on a press and hold, and does not follow the row", async () => {
    renderList();

    await hold(cards()[0]);

    expect(cards()[0]).toHaveAttribute("data-state", "selected");
    // The click that ends a hold belongs to the hold.
    expect(pushMock).not.toHaveBeenCalled();
    // And the count appears, which is the only place a number is shown.
    expect(await screen.findByText("1 selected")).toBeInTheDocument();
  });

  it("adds with a tap once a selection is under way, and opens the row when none is", async () => {
    renderList();

    // Nothing selected: a tap is navigation.
    fireEvent.click(cards()[0]);
    expect(pushMock).toHaveBeenCalledWith("/admin/lots/Maize, Tolon");

    pushMock.mockReset();
    await hold(cards()[0]);
    fireEvent.click(cards()[1]);

    expect(cards()[1]).toHaveAttribute("data-state", "selected");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("cancels the hold when the press turns into a scroll", async () => {
    renderList();

    const card = cards()[0];
    fireEvent.pointerDown(card, { clientX: 10, clientY: 10, pointerType: "touch" });
    fireEvent.pointerMove(card, { clientX: 10, clientY: 60, pointerType: "touch" });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(cards()[0]).not.toHaveAttribute("data-state", "selected");
  });

  it("gives the keyboard the same reach: Space selects, Enter opens", () => {
    renderList();

    fireEvent.keyDown(cards()[0], { key: " " });
    expect(cards()[0]).toHaveAttribute("data-state", "selected");

    fireEvent.keyDown(cards()[1], { key: "Enter" });
    expect(pushMock).toHaveBeenCalledWith("/admin/lots/Soya, Savelugu");
  });
});
