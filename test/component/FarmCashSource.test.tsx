// test/component/FarmCashSource.test.tsx
//
// The farming-investment book saying where the money went and where it came
// from. What is pinned here is what the schemas alone cannot say - that the
// forms ASK, that the answers reach the wire in the one shape the API accepts,
// and that a cash repayment READS correctly wherever the produce fields are
// printed:
//
//   * a grant names the account that funded it OR says why no company money
//     moved, never both and never neither (CASH_SOURCE_AMBIGUOUS /
//     CASH_SOURCE_REQUIRED);
//   * a cash repayment sends an amount and an account and NO commodity, weight,
//     rate or warehouse, which the server refuses (REPAYMENT_SHAPE);
//   * a produce repayment still names no account at all;
//   * the register and the detail view print neither a null nor a zero weight
//     for a cash repayment - "0 kg" reads as a farmer who handed over nothing,
//     which is the opposite of what happened.
//
// The RTK hooks are mocked at the boundary like PaymentDialog.test.tsx, and the
// account picker is stubbed to a plain input - it is its own screen with its
// own query, and this file is about the questions, not the register behind the
// answers.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { GrantForm } from "@/components/admin/farm/grant-form";
import { RepaymentDetail } from "@/components/admin/farm/repayment-detail";
import { RepaymentForm } from "@/components/admin/farm/repayment-form";
import { RepaymentsRegister } from "@/components/admin/farm/repayments-register";
import type { IRepaymentDetail } from "@/types/farm.types";

const {
  createGrant,
  createRepayment,
  errorToast,
  repaymentDetailQuery,
  repaymentsQuery,
} = vi.hoisted(() => ({
  createGrant: vi.fn(),
  createRepayment: vi.fn(),
  errorToast: vi.fn(),
  repaymentDetailQuery: vi.fn(),
  repaymentsQuery: vi.fn(),
}));

/** One page of rows, in the envelope every list endpoint returns. */
const listOf = <T,>(rows: T[]) => ({
  data: { data: rows, meta: { limit: 10, page: 1, total: rows.length } },
  isError: false,
  isFetching: false,
  isLoading: false,
  refetch: vi.fn(),
});

vi.mock("@/redux/farm/farmers-api", () => ({
  useGetFarmersQuery: () =>
    listOf([{ community: "Kumbungu", id: "farmer-1", name: "Abukari Yakubu" }]),
}));
vi.mock("@/redux/farm/seasons-api", () => ({
  useGetSeasonsQuery: () => listOf([{ id: "season-1", name: "2026 major" }]),
}));
vi.mock("@/redux/farm/input-items-api", () => ({
  useGetInputItemsQuery: () =>
    listOf([{ id: "item-1", name: "NPK fertiliser", unitLabel: "bag" }]),
}));
vi.mock("@/redux/commodities/commodities-api", () => ({
  useGetCommoditiesQuery: () => listOf([{ id: "commodity-1", name: "Maize" }]),
}));
vi.mock("@/redux/warehouses/warehouses-api", () => ({
  useGetWarehousesQuery: () =>
    listOf([{ id: "warehouse-1", name: "Tamale main store" }]),
}));
vi.mock("@/redux/farm/grants-api", () => ({
  useCreateGrantMutation: () => [createGrant, { isLoading: false }],
}));
vi.mock("@/redux/farm/repayments-api", () => ({
  repaymentDocumentUrl: () => "https://example.test/doc",
  useAddRepaymentDocumentMutation: () => [vi.fn(), { isLoading: false }],
  useCreateRepaymentMutation: () => [createRepayment, { isLoading: false }],
  useGetRepaymentQuery: () => repaymentDetailQuery(),
  useGetRepaymentsQuery: () => repaymentsQuery(),
  useRemoveRepaymentDocumentMutation: () => [vi.fn(), { isLoading: false }],
}));

// Its own screen with its own query. Stubbed to a plain input so this file
// tests the questions the forms ask, not the register behind the answers.
vi.mock("@/components/admin/payment-account-field", () => ({
  PaymentAccountField: ({
    error,
    label,
    onChange,
    value,
  }: {
    error?: string;
    label?: string;
    onChange: (value: string) => void;
    value: string;
  }) => (
    <label>
      {label}
      <input
        aria-label={label}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
      />
      {error ? <span>{error}</span> : null}
    </label>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/repayments",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: errorToast, success: vi.fn() },
}));

const userEvent = userEventBase.setup({ delay: null });

/** Stage the required multipart file the way the picker's confirm does. */
const attach = async (triggerLabel: RegExp) => {
  await userEvent.upload(
    document.querySelector("input[type=file]") as HTMLInputElement,
    new File(["x"], "receipt.pdf", { type: "application/pdf" }),
  );
  const confirm = screen.queryByRole("button", { name: triggerLabel });
  if (confirm) await userEvent.click(confirm);
};

/**
 * cmdk combobox: open, type, take the top match. Labels are anchored: the
 * shape question's own hint mentions a bad season, and a loose /season/ lands
 * on that radio instead of the field.
 */
const pickSearch = async (name: RegExp, text: string) => {
  await userEvent.click(screen.getByLabelText(name));
  await userEvent.keyboard(text);
  await userEvent.keyboard("{Enter}");
};

beforeEach(() => {
  createGrant.mockReset();
  createRepayment.mockReset();
  errorToast.mockReset();
  createGrant.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  createRepayment.mockReturnValue({ unwrap: () => Promise.resolve({}) });
});

describe("recording a grant", () => {
  const fillGrant = async () => {
    render(<GrantForm farmerId="farmer-1" />);
    await pickSearch(/^Season$/, "2026");
    await pickSearch(/^Input item$/, "NPK");
    await userEvent.type(screen.getByLabelText("Quantity"), "10");
    await userEvent.type(screen.getByLabelText(/Value \(GHS\)/i), "1200");
    await attach(/Choose agreement/i);
  };

  const save = () =>
    userEvent.click(screen.getByRole("button", { name: "Record grant" }));

  it("sends the account that funded the inputs, and no reason", async () => {
    await fillGrant();
    await userEvent.type(
      screen.getByLabelText("Paid from which account?"),
      "account-1",
    );
    await save();

    expect(createGrant).toHaveBeenCalledTimes(1);
    expect(createGrant.mock.calls[0][0].body).toMatchObject({
      paymentAccountId: "account-1",
      valueGhs: 1200,
    });
    // Never both: naming an account AND a reason is refused by the API
    // (CASH_SOURCE_AMBIGUOUS), so the form cannot produce it.
    expect(createGrant.mock.calls[0][0].body).not.toHaveProperty(
      "noCashReason",
    );
  });

  it("takes a reason instead when the inputs came out of the store", async () => {
    await fillGrant();
    await userEvent.click(
      screen.getByRole("radio", { name: /No company money moved/i }),
    );
    // The escape is a real second answer - grant inputs frequently come out of
    // stock already paid for, where posting again spends the same cedi twice -
    // so it is offered in the words a storekeeper actually uses.
    await userEvent.click(
      screen.getByRole("button", { name: "Inputs came from the store" }),
    );
    await save();

    expect(createGrant).toHaveBeenCalledTimes(1);
    expect(createGrant.mock.calls[0][0].body).toMatchObject({
      noCashReason: "Inputs came from the store",
    });
    expect(createGrant.mock.calls[0][0].body).not.toHaveProperty(
      "paymentAccountId",
    );
  });

  it("refuses a grant that names neither, before the wire", async () => {
    await fillGrant();
    await save();

    expect(
      await screen.findByText(/Choose the account that paid for these inputs/i),
    ).toBeInTheDocument();
    expect(createGrant).not.toHaveBeenCalled();
  });
});

describe("recording a repayment", () => {
  const startRepayment = async () => {
    render(<RepaymentForm farmerId="farmer-1" />);
    await pickSearch(/^Season$/, "2026");
  };

  const save = () =>
    userEvent.click(screen.getByRole("button", { name: "Record repayment" }));

  it("sends produce as a crop, a weight and a rate, naming no account", async () => {
    await startRepayment();
    await pickSearch(/^Commodity$/, "Maize");
    await userEvent.type(screen.getByLabelText("Weight (kg)"), "900");
    await userEvent.type(screen.getByLabelText(/Rate per kg/i), "4.2");
    await attach(/Choose receipt/i);
    await save();

    expect(createRepayment).toHaveBeenCalledTimes(1);
    const { body } = createRepayment.mock.calls[0][0];
    expect(body).toMatchObject({
      commodityId: "commodity-1",
      kind: "PRODUCE",
      ratePerKgGhs: 4.2,
      weightKg: 900,
    });
    // Produce moves no money: it turns a receivable into stock. Naming an
    // account would promise a ledger line that must never be posted.
    expect(body).not.toHaveProperty("amountGhs");
    expect(body).not.toHaveProperty("paymentAccountId");
  });

  it("sends cash as an amount and an account, and nothing about a crop", async () => {
    await startRepayment();
    await userEvent.click(screen.getByRole("radio", { name: /In cash/i }));

    // The produce half of the form is gone, not merely optional: the server
    // refuses a cash repayment carrying any of it.
    expect(screen.queryByLabelText("Weight (kg)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Rate per kg/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Commodity")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Take into stock at/i),
    ).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Amount paid/i), "1500");
    await userEvent.type(
      screen.getByLabelText("Paid into which account?"),
      "account-1",
    );
    await attach(/Choose receipt/i);
    await save();

    expect(createRepayment).toHaveBeenCalledTimes(1);
    const { body } = createRepayment.mock.calls[0][0];
    expect(body).toMatchObject({
      amountGhs: 1500,
      kind: "CASH",
      paymentAccountId: "account-1",
    });
    for (const field of [
      "commodityId",
      "intakeWarehouseId",
      "ratePerKgGhs",
      "weightKg",
    ]) {
      expect(body).not.toHaveProperty(field);
    }
  });

  it("drops a produce answer abandoned on the way to cash", async () => {
    await startRepayment();
    await userEvent.type(screen.getByLabelText("Weight (kg)"), "900");
    await userEvent.click(screen.getByRole("radio", { name: /In cash/i }));
    await userEvent.type(screen.getByLabelText(/Amount paid/i), "1500");
    await userEvent.type(
      screen.getByLabelText("Paid into which account?"),
      "account-1",
    );
    await attach(/Choose receipt/i);
    await save();

    // A stale weight is not a cosmetic leftover: the server refuses the whole
    // save for it, and nobody can see why from a field that is no longer shown.
    expect(createRepayment).toHaveBeenCalledTimes(1);
    expect(createRepayment.mock.calls[0][0].body).not.toHaveProperty("weightKg");
  });

  it("refuses a cash repayment that names no account, before the wire", async () => {
    await startRepayment();
    await userEvent.click(screen.getByRole("radio", { name: /In cash/i }));
    await userEvent.type(screen.getByLabelText(/Amount paid/i), "1500");
    await attach(/Choose receipt/i);
    await save();

    expect(
      await screen.findByText(/Say which account the money was paid into/i),
    ).toBeInTheDocument();
    expect(createRepayment).not.toHaveBeenCalled();
  });
});

const CASH_ROW = {
  commodity: null,
  createdAt: "2026-07-02T09:00:00.000Z",
  documents: [],
  farmer: { id: "farmer-1", name: "Abukari Yakubu" },
  id: "repayment-1",
  intoStock: false,
  kind: "CASH" as const,
  notes: null,
  paymentAccount: { id: "account-1", label: "Fidelity current account" },
  ratePerKgGhs: null,
  receivedAt: "2026-07-01T09:00:00.000Z",
  receivedByName: null,
  season: { id: "season-1", name: "2026 major" },
  transactionNo: "RPY-2026-00042",
  valueGhs: 1500,
  weightKg: null,
};

describe("reading a cash repayment", () => {
  it("names the account on the register, and no weight at all", () => {
    repaymentsQuery.mockReturnValue(listOf([CASH_ROW]));
    render(<RepaymentsRegister />);

    expect(screen.getAllByText("Fidelity current account").length).toBeGreaterThan(0);
    // "0 kg" would read as a farmer who handed over nothing, which is the
    // opposite of what happened.
    expect(screen.queryByText(/0 kg/)).not.toBeInTheDocument();
    expect(screen.queryByText(/kg/)).not.toBeInTheDocument();
  });

  it("shows the account it landed in instead of an empty crop and weight", () => {
    const detail: IRepaymentDetail = {
      ...CASH_ROW,
      farmer: {
        community: "Kumbungu",
        id: "farmer-1",
        name: "Abukari Yakubu",
        phone: null,
        photoUrl: null,
      },
      intakeWarehouse: null,
      recordedBy: null,
    };
    repaymentDetailQuery.mockReturnValue({
      data: { data: { repayment: detail } },
      error: undefined,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    render(<RepaymentDetail id="repayment-1" />);

    expect(screen.getByText("Paid into")).toBeInTheDocument();
    expect(
      screen.getAllByText("Fidelity current account").length,
    ).toBeGreaterThan(0);
    // Money cannot be taken into a warehouse, so the question is not asked -
    // and the three produce facts are not printed as blanks.
    expect(screen.queryByText("Weight")).not.toBeInTheDocument();
    expect(screen.queryByText("Rate per kg")).not.toBeInTheDocument();
    expect(screen.queryByText("Intake warehouse")).not.toBeInTheDocument();
  });
});
