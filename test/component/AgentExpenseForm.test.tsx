// test/component/AgentExpenseForm.test.tsx
//
// The field expense form. An expense may name the purchase it was incurred
// for, and say where the cost belongs - and nothing else about the form
// changes for it: an ordinary porter's fee still travels with no attribution
// keys on the wire at all, and the retry-safe idempotency key still holds
// across the attribution fields.
//
// Same rig as AgentPurchaseForm.test.tsx: real draft-storage against jsdom's
// localStorage, mocked at the RTK hook boundary.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { pickOption } from "../helpers/pick-option";

import { AgentExpenseForm } from "@/components/agent/agent-expense-form";
import { COST_TREATMENT_LEGEND } from "@/lib/cost-treatment";

const { createExpense, replaceMock, successToast } = vi.hoisted(() => ({
  createExpense: vi.fn(),
  replaceMock: vi.fn(),
  successToast: vi.fn(),
}));

vi.mock("@/redux/agent/agent-api", () => ({
  useCreateMyExpenseMutation: () => [createExpense, { isLoading: false }],
  useGetAgentExpenseCategoriesQuery: () => ({
    data: {
      data: { expenseCategories: [{ id: "cat-haulage", name: "Haulage" }] },
    },
    isLoading: false,
  }),
  useGetMyPurchasesQuery: () => ({
    data: {
      data: [
        {
          id: "pur-42",
          transactionNo: "PUR-2026-00042",
          status: "RECORDED",
          commodity: { id: "c-maize", name: "Maize" },
          weightKg: 1000,
        },
        {
          id: "pur-41",
          transactionNo: "PUR-2026-00041",
          status: "RECEIVED",
          commodity: { id: "c-soya", name: "Soya" },
          weightKg: 250,
        },
      ],
      meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
    },
    isLoading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: vi.fn(), success: successToast },
}));

const userEvent = userEventBase.setup({ delay: null });

type ExpenseCall = [{ body: Record<string, unknown>; idempotencyKey: string }];

const fillForm = async () => {
  await pickOption(screen.getByLabelText("Category"), "Haulage");
  await userEvent.type(screen.getByLabelText(/Amount \(GH₵\)/i), "400");
};

const choosePurchase = () =>
  pickOption(screen.getByLabelText(/For a purchase/i), /PUR-2026-00042/);

const submit = () =>
  userEvent.click(screen.getByRole("button", { name: "Record expense" }));

const sentCall = (call: number) =>
  (createExpense.mock.calls[call] as unknown as ExpenseCall)[0];

beforeEach(() => {
  localStorage.clear();
  createExpense.mockReset();
  replaceMock.mockReset();
  successToast.mockReset();
  createExpense.mockReturnValue({
    unwrap: () => Promise.resolve({ data: { transaction: { id: "t1" } } }),
  });
});

describe("AgentExpenseForm - attributing a cost to a purchase", () => {
  it("lists the agent's purchases by number, commodity and weight, and only asks where the cost belongs once one is chosen", async () => {
    render(<AgentExpenseForm />);

    // Not asked up front: an ordinary porter's fee has no such question.
    expect(screen.queryByText(COST_TREATMENT_LEGEND)).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/For a purchase/i));
    expect(
      await screen.findByRole("option", { name: "PUR-2026-00042 - Maize 1,000 kg" }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("option", { name: "PUR-2026-00042 - Maize 1,000 kg" }),
    );

    expect(screen.getByText(COST_TREATMENT_LEGEND)).toBeInTheDocument();
    // Goods first and pre-chosen: it is what nearly every field cost is.
    expect(
      screen.getByRole("radio", { name: /Part of what these goods cost/i }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: /A cost of this month/i }),
    ).not.toBeChecked();
  });

  it("sends an ordinary field cost exactly as before: no attribution keys at all", async () => {
    render(<AgentExpenseForm />);
    await fillForm();
    await submit();

    const { body } = sentCall(0);
    expect(body).toEqual({
      categoryId: "cat-haulage",
      amountGhs: 400,
      incurredAt: expect.any(String),
    });
    expect(body).not.toHaveProperty("purchaseId");
    expect(body).not.toHaveProperty("capitalise");
    expect(successToast).toHaveBeenCalledWith("Expense recorded off your float");
  });

  it("sends the purchase and, by default, files the cost into the goods", async () => {
    render(<AgentExpenseForm />);
    await fillForm();
    await choosePurchase();
    await submit();

    const { body } = sentCall(0);
    expect(body.purchaseId).toBe("pur-42");
    // Sent, not left to the server's default: the treatment is unchangeable
    // once saved, so what was chosen on the phone is what travels.
    expect(body.capitalise).toBe(true);
    expect(successToast).toHaveBeenCalledWith(
      "Recorded - it is now part of what those goods cost",
    );
    expect(replaceMock).toHaveBeenCalledWith("/agent");
  });

  it("sends capitalise: false when the cost belongs to the month", async () => {
    render(<AgentExpenseForm />);
    await fillForm();
    await choosePurchase();
    await userEvent.click(
      screen.getByRole("radio", { name: /A cost of this month/i }),
    );
    await submit();

    const { body } = sentCall(0);
    expect(body.purchaseId).toBe("pur-42");
    expect(body.capitalise).toBe(false);
    expect(successToast).toHaveBeenCalledWith(
      "Recorded as a cost of this month",
    );
  });

  it("says in plain words when the server does not know the purchase as this agent's", async () => {
    createExpense.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({
          data: { message: "Purchase not found" },
          status: 404,
        }),
    });
    render(<AgentExpenseForm />);
    await fillForm();
    await choosePurchase();
    await submit();

    expect(
      await screen.findByText(
        "That purchase is not one of yours, or was removed. Choose it again.",
      ),
    ).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("says in plain words when the purchase was voided", async () => {
    createExpense.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({
          data: { code: "PURCHASE_VOIDED", message: "Purchase is voided" },
          status: 400,
        }),
    });
    render(<AgentExpenseForm />);
    await fillForm();
    await choosePurchase();
    await submit();

    expect(
      await screen.findByText(
        "That purchase was voided, so nothing more can be charged to it.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the SAME idempotency key across a retry of the same submission", async () => {
    createExpense.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({
          data: { message: "The office line is busy." },
          status: 503,
        }),
    });
    render(<AgentExpenseForm />);
    await fillForm();
    await choosePurchase();
    await submit();

    expect(
      await screen.findByText(/The office line is busy/i),
    ).toBeInTheDocument();

    await submit();

    // Pressed twice is not charged twice: same key, same purchase named.
    expect(createExpense).toHaveBeenCalledTimes(2);
    expect(sentCall(1).idempotencyKey).toBe(sentCall(0).idempotencyKey);
    expect(sentCall(1).body.purchaseId).toBe("pur-42");
  });
});
