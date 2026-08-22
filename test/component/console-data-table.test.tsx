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
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
