// test/component/AgentHome.test.tsx
//
// The field app's home screen, and the one thing it must never say.
//
// A single figure labelled "My float" covers cash in a pocket, money in the
// agent's own mobile-money wallet and money in their own bank, all added
// together: an agent handed GHS 5,000 cash who then sends GHS 3,000 by mobile
// money reads 2,000, while the 5,000 is still in his hand and the company's
// wallet is the thing that emptied.
//
// Two facts, kept apart: what he is HOLDING, pot by pot, and what he may still
// SEND, which is permission to draw on the company's money and holds nothing.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AgentHome } from "@/components/agent/agent-home";

const floatQuery = vi.fn();
const spendingQuery = vi.fn();

vi.mock("@/redux/agent/agent-api", () => ({
  useGetMyFloatQuery: () => floatQuery(),
  useGetMySpendingQuery: () => spendingQuery(),
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ has: () => true }),
}));

const POTS = [
  { balanceGhs: 5000, id: "a1", kind: "CASH" as const, label: "Kwame - cash" },
  {
    balanceGhs: 3000,
    id: "a2",
    kind: "MOMO" as const,
    label: "Kwame - mobile money",
  },
];

const withFloat = (summary: Record<string, unknown>) => {
  floatQuery.mockReturnValue({
    data: { data: [], summary: { balanceGhs: 8000, ...summary } },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
};

const withSpending = (spending: null | Record<string, unknown>) => {
  spendingQuery.mockReturnValue({
    data: spending === null ? undefined : { data: { spending } },
    isError: spending === null,
    isLoading: false,
  });
};

describe("AgentHome", () => {
  it("shows each pot on its own, not one number for all of them", () => {
    withFloat({ pots: POTS });
    withSpending({ capGhs: null, remainingGhs: null, usedGhs: 0 });
    render(<AgentHome />);

    expect(screen.getByText("Kwame - cash")).toBeInTheDocument();
    expect(screen.getByText("Kwame - mobile money")).toBeInTheDocument();
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
    expect(screen.getByText(/3,000/)).toBeInTheDocument();
  });

  it("keeps the total, because it is a real question too", () => {
    withFloat({ pots: POTS });
    withSpending({ capGhs: null, remainingGhs: null, usedGhs: 0 });
    render(<AgentHome />);
    expect(screen.getByText(/8,000/)).toBeInTheDocument();
  });

  it("says an allowance is uncapped rather than showing a zero", () => {
    withFloat({ pots: POTS });
    withSpending({ capGhs: null, remainingGhs: null, usedGhs: 0 });
    render(<AgentHome />);
    expect(screen.getByText(/no limit/i)).toBeInTheDocument();
  });

  it("shows what is left of a cap, apart from what is held", () => {
    withFloat({ pots: POTS });
    withSpending({ capGhs: 2000, remainingGhs: 1500, usedGhs: 500 });
    render(<AgentHome />);
    expect(screen.getByText(/1,500/)).toBeInTheDocument();
  });

  it("says plainly when somebody may not send at all", () => {
    withFloat({ pots: POTS });
    withSpending(null);
    render(<AgentHome />);
    expect(screen.getByText(/not been allowed to send/i)).toBeInTheDocument();
  });

  it("says nothing has been handed over yet rather than showing an empty list", () => {
    withFloat({ balanceGhs: 0, pots: [] });
    withSpending({ capGhs: null, remainingGhs: null, usedGhs: 0 });
    render(<AgentHome />);
    expect(screen.getByText(/nothing has been handed to you/i)).toBeInTheDocument();
  });
});
