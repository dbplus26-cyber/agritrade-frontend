import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExistingOutflowPicker } from "@/components/admin/expenses/existing-outflow-picker";

const rows = [
  {
    account: { kind: "MOMO", label: "Office wallet" },
    amountGhs: 100,
    externalReference: "MOMO-ONE",
    id: "one",
    occurredAt: "2026-09-20T10:00:00.000Z",
    reason: "First transfer",
    transactionNo: "CMV-001",
  },
  {
    account: { kind: "MOMO", label: "Office wallet" },
    amountGhs: 75,
    externalReference: "MOMO-TWO",
    id: "two",
    occurredAt: "2026-09-21T10:00:00.000Z",
    reason: "Second transfer",
    transactionNo: "CMV-002",
  },
];

vi.mock("@/redux/expenses/expenses-api", () => ({
  useGetMatchableOutflowsQuery: () => ({
    data: { data: rows },
    isError: false,
    isFetching: false,
  }),
}));

describe("ExistingOutflowPicker", () => {
  it("selects one source for a payable and can clear it", () => {
    const onChange = vi.fn();
    render(
      <ExistingOutflowPicker
        accountId="account-1"
        onChange={onChange}
        single
      />,
    );
    const options = screen.getAllByRole("radio");
    fireEvent.click(options[0]);
    expect(onChange).toHaveBeenLastCalledWith([rows[0]]);
    fireEvent.click(options[1]);
    expect(onChange).toHaveBeenLastCalledWith([rows[1]]);
    expect(options[0]).not.toBeChecked();
    expect(options[1]).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
    expect(options[1]).not.toBeChecked();
  });

  it("still allows several sources for an expense", () => {
    const onChange = vi.fn();
    render(<ExistingOutflowPicker accountId="account-1" onChange={onChange} />);
    const options = screen.getAllByRole("checkbox");
    fireEvent.click(options[0]);
    fireEvent.click(options[1]);
    expect(onChange).toHaveBeenLastCalledWith(rows);
  });
});
