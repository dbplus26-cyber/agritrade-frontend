// test/component/SendMoneyDialog.test.tsx
//
// The form that makes real money leave through Hubtel. The backend validates
// everything again, but three things only the CLIENT can get right:
//
//   * the idempotency key: one per OPENING of the form, resent unchanged on
//     every retry, so "just tap send again" on a bad connection resolves to
//     ONE payout - and a fresh opening gets a fresh key, or two intentional
//     sends would dedupe into one;
//   * rail hygiene: a MoMo number typed and then abandoned for a bank send
//     must not ride along in the payload - Hubtel pays whatever well-formed
//     request it is given, wrong recipient included;
//   * refusal wording: the two balance limits (company payout account vs the
//     sender's own float) produce different fixes, so their error codes are
//     rewritten into instructions rather than echoed as "conflict";
//   * the confirm gate: Hubtel pays out to whatever destination it is handed
//     and nobody here can recall it, so the last four digits of that
//     destination must be typed back before anything is sent at all.
//
// Mocked at the RTK hook boundary like PaymentDialog.test.tsx; the bank
// picker is its own searchable screen and is stubbed to a plain select so
// this file tests the dialog's rules, not the picker's.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { pickOption } from "../helpers/pick-option";

import { SendMoneyDialog } from "@/components/admin/disbursements/send-money-dialog";

const { createCompany, createMine, errorToast, successToast } = vi.hoisted(
  () => ({
    createCompany: vi.fn(),
    createMine: vi.fn(),
    errorToast: vi.fn(),
    successToast: vi.fn(),
  }),
);

let companyLoading = false;

vi.mock("@/redux/disbursements/disbursements-api", () => ({
  useCreateDisbursementMutation: () => [
    createCompany,
    { isLoading: companyLoading },
  ],
  useCreateMyDisbursementMutation: () => [createMine, { isLoading: false }],
  // The verified-name hint stays silent in these tests: an unconfigured
  // environment renders nothing, which keeps every assertion about the form
  // itself untouched by the lookup.
  useGetRecipientNameQuery: () => ({
    data: { data: { configured: false, lookup: null }, message: "" },
    isFetching: false,
  }),
  useGetSupportedBanksQuery: () => ({
    data: { data: { banks: [{ code: "300302", name: "GCB Bank" }] } },
    isLoading: false,
  }),
}));

vi.mock("@/components/admin/searchable-select", () => ({
  SearchableSelect: ({
    onChange,
    options,
    value,
  }: {
    onChange: (v: string) => void;
    options: { label: string; value: string }[];
    value: string;
  }) => (
    <select
      aria-label="Bank"
      onChange={(e) => onChange(e.target.value)}
      value={value}
    >
      <option value="">Choose a bank</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: errorToast, success: successToast },
}));

// No inter-keystroke delay: same reasoning as PaymentDialog.test.tsx - paced
// typing into a radix dialog blew the timeout once files ran in parallel.
const userEvent = userEventBase.setup({ delay: null });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fill the fields every send needs, whatever the rail. */
const fillCommon = async () => {
  await userEvent.type(screen.getByLabelText(/Amount \(GH/i), "850.00");
  await userEvent.type(
    screen.getByLabelText(/Recipient's name/i),
    "Ibrahim Fuseini",
  );
  await userEvent.type(
    screen.getByLabelText(/What is it for/i),
    "Maize purchase, Tolon",
  );
};

const fillMomo = async () => {
  await fillCommon();
  await pickOption(screen.getByLabelText(/Network/i), "MTN");
  await userEvent.type(
    screen.getByLabelText(/Mobile money number/i),
    "233249111411",
  );
};

/** The form's own submit. On its own this only raises the confirm gate. */
const submit = () =>
  userEvent.click(screen.getAllByRole("button", { name: "Send money" })[0]);

/**
 * Clears the confirm gate by typing the last four digits of the destination.
 *
 * Scoped to the confirmation dialog: its commit button carries the SAME label
 * as the form's submit ("Send money") and both are in the document at this
 * point, so an unscoped query would be resolving a collision by luck.
 */
const clearGate = async (last4: string) => {
  // Found by the type-back box rather than by taking the last dialog: the box
  // exists only inside the gate, so awaiting it also waits for the gate to
  // open. Taking the last dialog resolves before the gate is up when the
  // submit was dispatched rather than clicked.
  const box = await screen.findByLabelText(/to confirm/i);
  const gate = box.closest('[role="dialog"]');
  if (!gate) throw new Error("the type-back box is not inside a dialog");
  // The box EXISTS before it is clickable: Radix's dismissable layer turns
  // pointer events back on for the new dialog an effect-tick after it mounts,
  // and on a slow CI runner a type landing inside that tick is refused with
  // "pointer-events: none". Hover runs the same pointer check user-event makes
  // before typing, with no side effect, so polling it waits for exactly the
  // condition the type needs - and nothing is typed twice on a retry.
  await waitFor(() => userEvent.hover(box));
  await userEvent.type(box, last4);
  await userEvent.click(
    within(gate as HTMLElement).getByRole("button", { name: "Send money" }),
  );
};

/** Submit and clear the gate: what actually reaches Hubtel. */
const send = async (last4 = "1411") => {
  await submit();
  await clearGate(last4);
};

type SentCall = [{ body: Record<string, unknown>; idempotencyKey: string }];

beforeEach(() => {
  companyLoading = false;
  createCompany.mockReset();
  createMine.mockReset();
  errorToast.mockReset();
  successToast.mockReset();
  createCompany.mockReturnValue({
    unwrap: () => Promise.resolve({ message: "Payment submitted to Hubtel" }),
  });
  createMine.mockReturnValue({
    unwrap: () => Promise.resolve({ message: "Payment submitted to Hubtel" }),
  });
});

describe("SendMoneyDialog - rail rules", () => {
  it("refuses a MoMo send without a network and a 233-format number", async () => {
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    await fillCommon();
    await userEvent.type(
      screen.getByLabelText(/Mobile money number/i),
      "0249111411", // the local format people actually type
    );
    await submit();

    expect(
      await screen.findByText(/Choose the recipient's mobile money network/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Use the international format/i),
    ).toBeInTheDocument();
    expect(createCompany).not.toHaveBeenCalled();
  });

  it("sends a bank payload with the amount as a NUMBER and a UUID key", async () => {
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    await pickOption(
      screen.getByLabelText(/How are they being paid/i),
      "Bank transfer",
    );
    await fillCommon();
    await userEvent.selectOptions(screen.getByLabelText("Bank"), "300302");
    await userEvent.type(
      screen.getByLabelText(/Account number/i),
      "1441000123456",
    );
    await send("3456");

    expect(createCompany).toHaveBeenCalledTimes(1);
    const [{ body, idempotencyKey }] = createCompany.mock
      .calls[0] as unknown as SentCall;
    // Typed into a text input, but a Decimal column is waiting server-side.
    expect(body.amountGhs).toBe(850);
    expect(body).toMatchObject({
      bankAccountNumber: "1441000123456",
      bankCode: "300302",
      rail: "BANK",
      recipientName: "Ibrahim Fuseini",
    });
    expect(idempotencyKey).toMatch(UUID_RE);
  });

  it("never lets an abandoned MoMo number ride along on a bank send", async () => {
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    // Start down the MoMo path, then switch to a bank send.
    await userEvent.type(
      screen.getByLabelText(/Mobile money number/i),
      "233249111411",
    );
    await pickOption(
      screen.getByLabelText(/How are they being paid/i),
      "Bank transfer",
    );
    await fillCommon();
    await userEvent.selectOptions(screen.getByLabelText("Bank"), "300302");
    await userEvent.type(
      screen.getByLabelText(/Account number/i),
      "1441000123456",
    );
    await send("3456");

    const [{ body }] = createCompany.mock.calls[0] as unknown as SentCall;
    expect(body).not.toHaveProperty("recipientMsisdn");
    expect(body).not.toHaveProperty("channel");
  });

  it("routes a holder's send through their own float, not the company account", async () => {
    render(<SendMoneyDialog onClose={vi.fn()} open surface="agent" />);

    await fillMomo();
    await send();

    // The two endpoints spend DIFFERENT pots; crossing them would charge the
    // business for a field agent's send or vice versa.
    expect(createCompany).not.toHaveBeenCalled();
    expect(createMine).toHaveBeenCalledTimes(1);
    expect(createMine.mock.calls[0]?.[0]).toMatchObject({ surface: "agent" });
  });
});

describe("SendMoneyDialog - the confirm gate", () => {
  it("sends nothing on submit alone, and names the destination it would pay", async () => {
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    await fillMomo();
    await submit();

    // A valid form is not a send on its own. What is on screen at this point
    // is the whole point of the gate: who, how much, and down which number.
    expect(createCompany).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/GH₵ 850.00 to Ibrahim Fuseini/),
    ).toBeInTheDocument();
    expect(screen.getByText(/233249111411/)).toBeInTheDocument();
    expect(screen.getByText(/nobody here can recall it/i)).toBeInTheDocument();
  });

  it("holds the send until the destination's last four digits are typed", async () => {
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    await fillMomo();
    await submit();

    const box = await screen.findByLabelText(/to confirm/i);
    const gate = box.closest('[role="dialog"]') as HTMLElement;
    const commit = within(gate).getByRole("button", { name: "Send money" });
    expect(commit).toBeDisabled();

    // The digits of a DIFFERENT number are not the digits of this one.
    await userEvent.type(box, "1234");
    expect(commit).toBeDisabled();

    await userEvent.clear(box);
    await userEvent.type(box, "1411");
    expect(commit).toBeEnabled();
    expect(createCompany).not.toHaveBeenCalled();

    await userEvent.click(commit);
    expect(createCompany).toHaveBeenCalledTimes(1);
  });

  it("sends nothing at all when the gate is cancelled", async () => {
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    await fillMomo();
    await submit();

    const box = await screen.findByLabelText(/to confirm/i);
    const gate = box.closest('[role="dialog"]') as HTMLElement;
    await userEvent.click(within(gate).getByRole("button", { name: "Cancel" }));

    expect(createCompany).not.toHaveBeenCalled();
    expect(createMine).not.toHaveBeenCalled();
    expect(successToast).not.toHaveBeenCalled();
  });
});

describe("SendMoneyDialog - idempotency key lifecycle", () => {
  it("resends the SAME key when a failed send is retried", async () => {
    createCompany.mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { message: "Timed out" }, status: 504 }),
    });
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    await fillMomo();
    await send();
    await send();

    // Same opening, same key: the server resolves both attempts to the one
    // payout. A key-per-attempt here is a double payment waiting for a bad
    // connection.
    expect(createCompany).toHaveBeenCalledTimes(2);
    const [first] = createCompany.mock.calls[0] as unknown as SentCall;
    const [second] = createCompany.mock.calls[1] as unknown as SentCall;
    expect(first.idempotencyKey).toMatch(UUID_RE);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
  });

  it("turns a rapid double-tap on Send into ONE payout", async () => {
    // The submit button only disables once the mutation reports in-flight, and
    // zod validation runs async first, so a fast second tap does reach the
    // handler. It does not reach Hubtel: both taps queue behind the one gate,
    // and the single confirmation releases a single send. The key is checked
    // as well because the backend's dedupe is the last line if anything ever
    // slips past.
    let resolveSend: (v: unknown) => void = () => undefined;
    createCompany.mockReturnValue({
      unwrap: () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
    });
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    await fillMomo();
    // fireEvent, not userEvent: once the gate is up radix makes the form
    // behind it inert, so a real second tap cannot even land. Dispatching it
    // anyway is the stricter test - it proves the collapse is the gate's doing
    // and not just the overlay's.
    const sendButton = screen.getAllByRole("button", { name: "Send money" })[0];
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);
    await clearGate("1411");
    resolveSend({ message: "done" });

    const keys = (createCompany.mock.calls as unknown as SentCall[]).map(
      ([call]) => call.idempotencyKey,
    );
    expect(createCompany).toHaveBeenCalledTimes(1);
    expect(new Set(keys).size).toBe(1);
  });

  it("mints a FRESH key for a fresh opening", async () => {
    const view = render(
      <SendMoneyDialog onClose={vi.fn()} open surface="company" />,
    );
    await fillMomo();
    await send();
    const [first] = createCompany.mock.calls[0] as unknown as SentCall;

    // Close and reopen: this is a NEW send, and reusing the spent key would
    // make the backend silently return the OLD payout instead of paying.
    view.rerender(
      <SendMoneyDialog onClose={vi.fn()} open={false} surface="company" />,
    );
    view.rerender(
      <SendMoneyDialog onClose={vi.fn()} open surface="company" />,
    );
    await fillMomo();
    await send();

    const [second] = createCompany.mock.calls[1] as unknown as SentCall;
    expect(second.idempotencyKey).toMatch(UUID_RE);
    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
  });
});

describe("SendMoneyDialog - in flight and refused", () => {
  it("disables the submit and says so while the send is in flight", () => {
    companyLoading = true;
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    const button = screen.getByRole("button", { name: "Sending…" });
    expect(button).toBeDisabled();
  });

  it("rewrites the float-limit refusal into an instruction", async () => {
    createCompany.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: { code: "INSUFFICIENT_FLOAT", message: "Conflict" },
          status: 409,
        }),
    });
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    await fillMomo();
    await send();

    // The guidance names the fix (check your balance / ask for a top-up);
    // the raw "Conflict" names nothing.
    expect(errorToast).toHaveBeenCalledWith(
      expect.stringMatching(/more than the float you have left/i),
    );
  });

  it("falls back to the server's own words for codes it has no guidance for", async () => {
    createCompany.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: {
            code: "SOMETHING_NEW",
            message: "The recipient's wallet cannot receive payments.",
          },
          status: 400,
        }),
    });
    render(<SendMoneyDialog onClose={vi.fn()} open surface="company" />);

    await fillMomo();
    await send();

    expect(errorToast).toHaveBeenCalledWith(
      "The recipient's wallet cannot receive payments.",
    );
  });
});
