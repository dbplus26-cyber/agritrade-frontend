// test/component/PaymentAccountField.test.tsx
//
// The picker that answers "where did this money actually end up".
//
// Not the payment-accounts register, which answers a different question -
// where customers send money - and so can only ever name a company account.
// An agent who collects GHS 3,000 at a roadside is holding it, and booking
// that to the office till says the money is in a box it is not in. What is
// worth pinning here:
//
//   * held accounts are offered, kept under their own heading, and read as
//     the person holding the money;
//   * naming one says out loud what it means, because it is a real choice
//     with a real consequence for whoever is named;
//   * the method still narrows the list (the backend enforces the same
//     COMPATIBLE_KINDS, and offering an account it will refuse is not
//     offering a choice);
//   * cash may still name nothing at all and fall to the office till, while a
//     transfer may not.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { PaymentAccountField } from "@/components/admin/payment-account-field";

const { settlementQuery } = vi.hoisted(() => ({ settlementQuery: vi.fn() }));

vi.mock("@/redux/payment-accounts/payment-accounts-api", () => ({
  useGetSettlementAccountsQuery: () => settlementQuery(),
}));

const userEvent = userEventBase.setup({ delay: null });

const ACCOUNTS = [
  { holder: null, id: "acc-bank", kind: "BANK", label: "Fidelity current" },
  { holder: null, id: "acc-till", kind: "CASH", label: "Cash till" },
  {
    holder: { id: "u-1", name: "Kwame Mensah" },
    id: "acc-held-cash",
    kind: "CASH",
    label: "Kwame Mensah - cash",
  },
  {
    holder: { id: "u-1", name: "Kwame Mensah" },
    id: "acc-held-momo",
    kind: "MOMO",
    label: "Kwame Mensah - mobile money",
  },
];

type FieldProps = React.ComponentProps<typeof PaymentAccountField>;

const renderField = (props: Partial<FieldProps> = {}) => {
  settlementQuery.mockReturnValue({
    data: { data: { accounts: ACCOUNTS } },
    isError: false,
    isLoading: false,
  });
  const onChange = vi.fn();
  render(
    <PaymentAccountField
      direction="out"
      onChange={onChange}
      value=""
      {...props}
    />,
  );
  return onChange;
};

/** Opens the panel and returns the option labels it offers, in order. */
const openAndList = async (): Promise<string[]> => {
  await userEvent.click(screen.getByLabelText(/money came from/i));
  return screen
    .getAllByRole("option")
    .map((o) => o.textContent?.trim() ?? "");
};

describe("PaymentAccountField", () => {
  it("offers held accounts under their own heading, after the company's", async () => {
    renderField({ method: "CASH" });

    const options = await openAndList();
    expect(options).toEqual([
      "No account named (office till)",
      "Cash till",
      "Kwame Mensah - cash",
    ]);
    expect(screen.getByText("Company accounts")).toBeInTheDocument();
    expect(screen.getByText("In someone's hands")).toBeInTheDocument();
  });

  it("reports the held account that was picked", async () => {
    const onChange = renderField({ method: "CASH" });

    await userEvent.click(screen.getByLabelText(/money came from/i));
    await userEvent.click(
      screen.getByRole("option", { name: "Kwame Mensah - cash" }),
    );

    expect(onChange).toHaveBeenCalledWith("acc-held-cash");
  });

  it("says what naming a held account means for the person named", () => {
    renderField({ method: "CASH", value: "acc-held-cash" });

    expect(
      screen.getByText(/came out of what Kwame Mensah is holding/i),
    ).toBeInTheDocument();
  });

  it("says it the other way round when the money came IN", () => {
    renderField({ direction: "in", method: "CASH", value: "acc-held-cash" });

    expect(
      screen.getByText(/Kwame Mensah is holding this money/i),
    ).toBeInTheDocument();
  });

  it("narrows the list to the accounts the method can move on", async () => {
    renderField({ method: "MOMO" });

    // A MoMo payment cannot touch a bank account or a cash box, so neither is
    // offered - the backend refuses that pairing (ACCOUNT_METHOD_MISMATCH) -
    // and a transfer is never allowed to name nothing at all.
    expect(await openAndList()).toEqual(["Kwame Mensah - mobile money"]);
  });

  it("keeps a held account out of the company group", async () => {
    renderField({ method: "BANK" });

    expect(await openAndList()).toEqual(["Fidelity current"]);
  });
});
