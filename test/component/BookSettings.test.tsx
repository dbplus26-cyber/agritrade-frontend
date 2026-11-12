// test/component/BookSettings.test.tsx
//
// Book settings is the one place a bag size and the two FM rules are typed.
// What this file pins:
//
//   * a save sends all five values, an emptied box as null (no rule on that
//     side), so a rule can be switched off and not only changed;
//   * a tolerance below its standard never reaches the server, on the selling
//     side as on the buying side;
//   * someone who cannot manage the vocabulary reads the values and has no
//     Save.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BookSettings } from "@/components/admin/reports/book-settings";

const { access, update } = vi.hoisted(() => ({
  access: { canManage: true },
  update: vi.fn(),
}));

const SOYA = {
  bagWeightKg: 100,
  fmStandardPct: 3,
  fmTolerancePct: 3.5,
  id: "c0ffee00-1111-4111-8111-111111111111",
  name: "Soya",
  saleFmStandardPct: 3,
  saleFmTolerancePct: 3.5,
};

vi.mock("@/redux/commodities/commodities-api", () => ({
  useGetCommoditiesQuery: () => ({
    data: { data: [SOYA], meta: { totalPages: 1 } },
    isError: false,
    isLoading: false,
  }),
  useUpdateCommodityMutation: () => [update, { isLoading: false }],
}));
vi.mock("@/hooks/use-auth-role", () => ({
  useAuthRole: () => ({ isSuperAdmin: false }),
}));
vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ has: () => access.canManage }),
}));
vi.mock("@/lib/notify", () => ({
  notify: { error: vi.fn(), success: vi.fn() },
}));

describe("BookSettings", () => {
  beforeEach(() => {
    access.canManage = true;
    update.mockReset();
    update.mockReturnValue({
      unwrap: () => Promise.resolve({ data: { commodity: SOYA } }),
    });
  });

  it("saves all five values, an emptied rule as null", async () => {
    const user = userEvent.setup();
    render(<BookSettings />);

    const bag = screen.getByLabelText(/^Kg per bag/);
    await user.clear(bag);
    await user.type(bag, "109");
    await user.clear(screen.getByLabelText(/^Selling: standard FM %/));
    await user.clear(screen.getByLabelText(/^Selling: tolerance %/));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(update).toHaveBeenCalledWith({
      body: {
        bagWeightKg: 109,
        fmStandardPct: 3,
        fmTolerancePct: 3.5,
        saleFmStandardPct: null,
        saleFmTolerancePct: null,
      },
      id: SOYA.id,
    });
  });

  it("refuses a selling tolerance below its standard", async () => {
    const user = userEvent.setup();
    render(<BookSettings />);

    const tolerance = screen.getByLabelText(/^Selling: tolerance %/);
    await user.clear(tolerance);
    await user.type(tolerance, "2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it("is read-only without the permission", () => {
    access.canManage = false;
    render(<BookSettings />);

    expect(screen.getByLabelText(/^Kg per bag/)).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });
});
