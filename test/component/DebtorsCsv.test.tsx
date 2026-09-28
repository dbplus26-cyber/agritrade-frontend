import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DebtorsTable } from "@/components/admin/reports/debtors-table";

const mocks = vi.hoisted(() => ({ fetchRows: vi.fn(), download: vi.fn() }));
vi.mock("@/hooks/use-money-visibility", () => ({
  useMoneyVisibility: () => true,
}));
vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: (value: string) => value,
}));
vi.mock("@/redux/exports/exports-api", () => ({
  useGetCsvRowsMutation: () => [mocks.fetchRows, { reset: vi.fn() }],
}));
vi.mock("@/lib/csv-export", async (original) => ({
  ...(await original<typeof import("@/lib/csv-export")>()),
  downloadCsv: mocks.download,
}));
vi.mock("@/redux/reports/reports-api", () => ({
  useGetDebtorsQuery: () => ({
    data: {
      data: [
        {
          id: "sale-1",
          buyer: { id: "buyer-1", name: "Ama", phone: null },
          kind: "COMMODITY",
          subject: "Maize",
          status: "CONFIRMED",
          agreedGhs: 150,
          paidGhs: 50,
          balanceGhs: 100,
        },
      ],
      meta: { page: 1, limit: 10, total: 12, totalPages: 2 },
    },
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

it("exports all debtor pages using the current buyer search", async () => {
  mocks.fetchRows.mockReturnValue({
    unwrap: async () => [
      {
        buyer: { name: "Ama", phone: null },
        kind: "LAND",
        subject: "Plot A",
        status: "CONFIRMED",
        agreedGhs: 150,
        paidGhs: 50,
        balanceGhs: 100,
      },
    ],
    abort: vi.fn(),
  });
  render(<DebtorsTable />);
  fireEvent.change(
    screen.getByRole("textbox", { name: "Search debtors by buyer name" }),
    { target: { value: " Ama " } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
  await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());
  expect(mocks.fetchRows).toHaveBeenCalledWith({
    url: "admin/reports/debtors",
    params: { search: "Ama" },
  });
  expect(mocks.download.mock.calls[0][1]).toContain(
    '"Ama","","Plot A","CONFIRMED","150","50","100"',
  );
});
