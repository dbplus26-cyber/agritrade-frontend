// test/component/StatementCashSource.test.tsx
//
// The two registers that held a money figure and moved no money at all. What
// is pinned here is what the schema alone cannot say - that the forms ASK the
// question, and that the answer reaches the wire in the one shape the API
// accepts:
//
//   * a drawing or an asset names an account OR says why none moved, never
//     both and never neither (CASH_SOURCE_AMBIGUOUS / CASH_SOURCE_REQUIRED);
//   * a disposal is asked where its proceeds landed only when it raised
//     something - an asset scrapped or given away names nowhere
//     (DISPOSAL_ACCOUNT_UNUSED);
//   * an asset whose acquisition has posted is not OFFERED an edit the API
//     will refuse (COST_LOCKED, ACQUISITION_DATE_LOCKED), and says why.
//
// The dialogs are module-private, so they are driven the way a person reaches
// them: render the screen, click the action. The RTK hooks are mocked at the
// boundary like PaymentDialog.test.tsx, and the account picker is stubbed to a
// plain input - it is its own screen with its own query, and this file is
// about the question, not the register behind it.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { DrawingsScreen } from "@/components/admin/statements/drawings-screen";
import { FixedAssetsScreen } from "@/components/admin/statements/fixed-assets-screen";
import type { IFixedAsset } from "@/types/statement.types";

const {
  assetsQuery,
  createDrawing,
  disposeAsset,
  errorToast,
  updateAsset,
} = vi.hoisted(() => ({
  assetsQuery: vi.fn(),
  createDrawing: vi.fn(),
  disposeAsset: vi.fn(),
  errorToast: vi.fn(),
  updateAsset: vi.fn(),
}));

vi.mock("@/redux/statements/statements-api", () => ({
  useCreateAssetClassMutation: () => [vi.fn(), { isLoading: false }],
  useCreateDrawingMutation: () => [createDrawing, { isLoading: false }],
  useCreateFixedAssetMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteDrawingMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteFixedAssetMutation: () => [vi.fn(), { isLoading: false }],
  useDisposeFixedAssetMutation: () => [disposeAsset, { isLoading: false }],
  useGetAssetClassesQuery: () => ({
    data: {
      data: {
        assetClasses: [
          {
            capitalAllowancePool: "Pool 2",
            capitalAllowanceRatePct: 30,
            createdAt: "2026-01-01T00:00:00.000Z",
            depreciationRatePct: 10,
            id: "class-1",
            isActive: true,
            name: "Motor vehicles",
            sortOrder: 0,
          },
        ],
      },
    },
  }),
  useGetDrawingsQuery: () => ({
    data: { data: { drawings: [] } },
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useGetFixedAssetsQuery: () => assetsQuery(),
  useUpdateFixedAssetMutation: () => [updateAsset, { isLoading: false }],
}));

// Its own screen with its own query. Stubbed to a plain input so this file
// tests the question the forms ask, not the register behind the answer.
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
  usePathname: () => "/admin/drawings",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: errorToast, success: vi.fn() },
}));

const userEvent = userEventBase.setup({ delay: null });

const ASSET: IFixedAsset = {
  acquiredAt: "2026-02-01T00:00:00.000Z",
  classId: "class-1",
  className: "Motor vehicles",
  costGhs: 80000,
  createdAt: "2026-02-01T00:00:00.000Z",
  disposalAccount: null,
  disposalProceedsGhs: null,
  disposedAt: null,
  id: "asset-1",
  name: "Sinotruk Howo tipper",
  noCashReason: null,
  notes: null,
  paymentAccount: {
    id: "account-1",
    kind: "BANK",
    label: "Fidelity current account",
  },
};

const withAssets = (assets: IFixedAsset[]) => {
  assetsQuery.mockReturnValue({
    data: { data: { assets } },
    error: undefined,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  });
};

/** A date input takes its value whole; jsdom has no calendar to click. */
const setDate = (label: RegExp | string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

beforeEach(() => {
  createDrawing.mockReset();
  disposeAsset.mockReset();
  updateAsset.mockReset();
  errorToast.mockReset();
  createDrawing.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  disposeAsset.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  updateAsset.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  withAssets([ASSET]);
});

const openDrawingDialog = async () => {
  render(<DrawingsScreen />);
  await userEvent.click(
    screen.getByRole("button", { name: /Record drawing/i }),
  );
  return screen.findByRole("dialog");
};

const saveDrawing = () =>
  userEvent.click(screen.getByRole("button", { name: "Record drawing" }));

describe("recording a drawing", () => {
  it("sends the account the money came out of, and no reason", async () => {
    await openDrawingDialog();

    await userEvent.type(screen.getByLabelText(/Amount/i), "5000");
    setDate(/^Date/i, "2026-03-04");
    await userEvent.type(
      screen.getByLabelText(/Taken out of which account/i),
      "account-1",
    );
    await saveDrawing();

    expect(createDrawing).toHaveBeenCalledTimes(1);
    expect(createDrawing.mock.calls[0][0]).toEqual({
      amountGhs: 5000,
      occurredAt: "2026-03-04",
      paymentAccountId: "account-1",
    });
  });

  it("takes a reason instead when no company money moved", async () => {
    await openDrawingDialog();

    await userEvent.type(screen.getByLabelText(/Amount/i), "300");
    setDate(/^Date/i, "2026-03-04");
    await userEvent.click(
      screen.getByRole("radio", { name: /No company money moved/i }),
    );
    // The escape is a real second answer, offered with the words people
    // actually use rather than an empty box they must argue with.
    await userEvent.click(
      screen.getByRole("button", { name: "Took stock rather than money" }),
    );
    await saveDrawing();

    expect(createDrawing).toHaveBeenCalledTimes(1);
    // Never both: naming an account AND a reason is refused by the API
    // (CASH_SOURCE_AMBIGUOUS), so the form cannot produce it.
    expect(createDrawing.mock.calls[0][0]).toEqual({
      amountGhs: 300,
      noCashReason: "Took stock rather than money",
      occurredAt: "2026-03-04",
    });
  });

  it("refuses a drawing that names neither, before the wire", async () => {
    await openDrawingDialog();

    await userEvent.type(screen.getByLabelText(/Amount/i), "5000");
    setDate(/^Date/i, "2026-03-04");
    await saveDrawing();

    expect(
      await screen.findByText(/Choose the account the money moved through/i),
    ).toBeInTheDocument();
    expect(createDrawing).not.toHaveBeenCalled();
  });
});

describe("disposing of an asset", () => {
  const openDispose = async () => {
    render(<FixedAssetsScreen />);
    await userEvent.click(screen.getAllByRole("button", { name: "Dispose" })[0]);
    return screen.findByRole("dialog");
  };

  it("asks where the proceeds landed only once there are proceeds", async () => {
    await openDispose();

    // Scrapped or given away: nothing came in, so there is nowhere for it to
    // have landed, and naming an account is refused by the API.
    expect(
      screen.queryByLabelText(/Proceeds paid into which account/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/so no account is named/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Proceeds/i), "12000");
    expect(
      await screen.findByLabelText(/Proceeds paid into which account/i),
    ).toBeInTheDocument();
  });

  it("sends the account the proceeds were paid into", async () => {
    await openDispose();

    setDate(/Disposed on/i, "2026-06-30");
    await userEvent.type(screen.getByLabelText(/^Proceeds/i), "12000");
    await userEvent.type(
      await screen.findByLabelText(/Proceeds paid into which account/i),
      "account-2",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Dispose of asset" }),
    );

    expect(disposeAsset).toHaveBeenCalledTimes(1);
    expect(disposeAsset.mock.calls[0][0]).toEqual({
      assetId: "asset-1",
      body: {
        disposalAccountId: "account-2",
        disposalProceedsGhs: 12000,
        disposedAt: "2026-06-30",
      },
    });
  });
});

describe("editing an asset", () => {
  const openEdit = async () => {
    render(<FixedAssetsScreen />);
    await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    return screen.findByRole("dialog");
  };

  it("does not offer a cost or a date it knows will be refused", async () => {
    const dialog = await openEdit();

    expect(within(dialog).queryByLabelText(/Cost/i)).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText(/Acquired on/i),
    ).not.toBeInTheDocument();
    // And says why, rather than leaving the reader to wonder where the two
    // facts they came to change went.
    expect(
      within(dialog).getByText(/already paid for this/i),
    ).toBeInTheDocument();

    // The descriptive side stays editable, and only what changed is sent: a
    // PATCH carrying the frozen pair would be refused for fields nobody
    // touched.
    await userEvent.clear(within(dialog).getByLabelText(/^Asset/i));
    await userEvent.type(
      within(dialog).getByLabelText(/^Asset/i),
      "Sinotruk Howo tipper (GT 4417)",
    );
    await userEvent.click(
      within(dialog).getByRole("button", { name: /Save changes/i }),
    );

    expect(updateAsset).toHaveBeenCalledTimes(1);
    expect(updateAsset.mock.calls[0][0]).toEqual({
      assetId: "asset-1",
      body: { name: "Sinotruk Howo tipper (GT 4417)" },
    });
  });

  it("leaves an asset that posted nothing fully editable", async () => {
    // Owned before the books started: no movement to contradict, so nothing
    // is frozen.
    withAssets([
      {
        ...ASSET,
        noCashReason: "Owned before the books started",
        paymentAccount: null,
      },
    ]);
    const dialog = await openEdit();

    expect(within(dialog).getByLabelText(/Cost/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Acquired on/i)).toBeInTheDocument();
  });
});
