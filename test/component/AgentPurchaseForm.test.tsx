// test/component/AgentPurchaseForm.test.tsx
//
// The village-scale purchase form, and specifically its promise printed
// right under the button: "Bad network? ... just press the button again. It
// can never charge your float twice." That promise is carried entirely by
// the idempotency key lifecycle:
//
//   * the key is minted once per DRAFT and persisted with the values, so a
//     failed submit, a retry, and even a reload-then-retry all reach the
//     backend under the same key - one purchase, one float charge;
//   * the draft (key included) is cleared ONLY on confirmed success. Cleared
//     on failure, the retry double-charges; kept past success, the next
//     purchase would silently resolve to the old one.
//
// Real draft-storage against jsdom's real localStorage - the persistence IS
// the subject. Mocked at the RTK hook boundary like PaymentDialog.test.tsx;
// FilePicker is stubbed because the photo-staging path is its own screen
// (and under separate construction), not part of the key lifecycle.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { pickOption } from "../helpers/pick-option";

import { AgentPurchaseForm } from "@/components/agent/agent-purchase-form";
import { loadDraft } from "@/components/agent/draft-storage";

const { createPurchase, replaceMock, successToast } = vi.hoisted(() => ({
  createPurchase: vi.fn(),
  replaceMock: vi.fn(),
  successToast: vi.fn(),
}));

vi.mock("@/redux/agent/agent-api", () => ({
  useCreateMyPurchaseMutation: () => [createPurchase, { isLoading: false }],
  useGetAgentCommoditiesQuery: () => ({
    data: { data: { commodities: [{ id: "c-maize", name: "Maize" }] } },
    isLoading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: vi.fn(), success: successToast },
}));

vi.mock("@/components/ui/FilePicker", () => ({
  FilePicker: () => <div data-testid="file-picker" />,
}));

const userEvent = userEventBase.setup({ delay: null });

const DRAFT_KEY = "dbplus.agent.purchase.draft";

type PurchaseCall = [
  { body: Record<string, unknown>; idempotencyKey: string; photo?: File },
];

const fillForm = async () => {
  await pickOption(screen.getByLabelText("Commodity"), "Maize");
  await userEvent.type(screen.getByLabelText(/Weight \(kg\)/i), "120");
  await userEvent.type(screen.getByLabelText(/Price \/ kg/i), "5.00");
};

const submit = () =>
  userEvent.click(screen.getByRole("button", { name: "Record purchase" }));

const sentKey = (call: number) =>
  (createPurchase.mock.calls[call] as unknown as PurchaseCall)[0]
    .idempotencyKey;

beforeEach(() => {
  localStorage.clear();
  createPurchase.mockReset();
  replaceMock.mockReset();
  successToast.mockReset();
  createPurchase.mockReturnValue({
    unwrap: () => Promise.resolve({ data: { purchase: { id: "p1" } } }),
  });
});

describe("AgentPurchaseForm - key lifecycle", () => {
  it("keeps the draft and its key through a failed submit, and resends the SAME key on retry", async () => {
    createPurchase.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({
          data: { message: "The office line is busy." },
          status: 503,
        }),
    });
    render(<AgentPurchaseForm />);

    await fillForm();
    await submit();

    // The failure is shown, and nothing was cleared: the entry is still on
    // the phone, exactly as the copy under the button promises.
    expect(
      await screen.findByText(/The office line is busy/i),
    ).toBeInTheDocument();
    const draft = loadDraft<{ weightKg: string }>(DRAFT_KEY);
    expect(draft?.values.weightKg).toBe("120");
    expect(draft?.key).toBe(sentKey(0));

    await submit();

    // The retry is the same purchase, so it must carry the same key - this
    // is the line between "pressed twice" and "charged twice".
    expect(createPurchase).toHaveBeenCalledTimes(2);
    expect(sentKey(1)).toBe(sentKey(0));
  });

  it("survives a reload: a fresh mount reuses the persisted values AND key", async () => {
    createPurchase.mockReturnValueOnce({
      unwrap: () => Promise.reject({ data: { message: "Timed out" } }),
    });
    const first = render(<AgentPurchaseForm />);
    await fillForm();
    await submit();
    const keyBeforeReload = sentKey(0);
    first.unmount();

    // The "reload": a brand-new mount with only localStorage carried over.
    render(<AgentPurchaseForm />);
    expect(screen.getByLabelText(/Weight \(kg\)/i)).toHaveValue("120");
    await submit();

    expect(sentKey(1)).toBe(keyBeforeReload);
  });

  it("clears the draft the moment success is confirmed", async () => {
    render(<AgentPurchaseForm />);
    await fillForm();
    await submit();

    // Success confirmed: draft gone, agent told, sent back to the list.
    expect(loadDraft(DRAFT_KEY)).toBeNull();
    expect(successToast).toHaveBeenCalledWith(
      expect.stringMatching(/float has been charged/i),
    );
    expect(replaceMock).toHaveBeenCalledWith("/agent/purchases");
  });

  it("the cleared draft STAYS cleared through the post-success re-render, and the next visit mints a fresh key", async () => {
    // Regression pin: the `watch()` persist effect used to re-run on the
    // re-render react-hook-form schedules after submit - after clearDraft but
    // before navigation unmounted the form - writing the old values AND the
    // spent idempotency key back into localStorage. The next visit then
    // submitted under that spent key, the backend's dedupe returned the
    // ORIGINAL purchase, and the new one was silently never recorded. The
    // persist effect is now gated shut the moment success is confirmed.
    const first = render(<AgentPurchaseForm />);
    await fillForm();
    await submit();
    const spentKey = sentKey(0);
    expect(loadDraft(DRAFT_KEY)).toBeNull(); // cleared...

    first.unmount(); // ...and unmounting flushes the pending re-render

    expect(loadDraft(DRAFT_KEY)).toBeNull(); // ...and it STAYS cleared

    // A fresh mount starts a new draft under a new key: the spent key can
    // never be presented to the backend again.
    render(<AgentPurchaseForm />);
    await fillForm();
    await submit();
    expect(sentKey(1)).not.toBe(spentKey);
  });
});

describe("AgentPurchaseForm - the payload", () => {
  it("converts the typed strings to numbers and drops empty notes", async () => {
    render(<AgentPurchaseForm />);
    await fillForm();
    await submit();

    const [{ body }] = createPurchase.mock.calls[0] as unknown as PurchaseCall;
    // Strings in the form (fields must be emptiable while typing), numbers
    // on the wire (a Decimal column is waiting).
    expect(body.weightKg).toBe(120);
    expect(body.unitPriceGhs).toBe(5);
    expect(body.commodityId).toBe("c-maize");
    // Absent, not "": the backend treats an empty string as supplied notes.
    expect(body).not.toHaveProperty("notes");
  });

  it("blocks a submit with no commodity or weight before any money moves", async () => {
    render(<AgentPurchaseForm />);
    await submit();

    expect(
      await screen.findByText(/Choose the commodity/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Enter the weight in kg/i),
    ).toBeInTheDocument();
    expect(createPurchase).not.toHaveBeenCalled();
  });
});
