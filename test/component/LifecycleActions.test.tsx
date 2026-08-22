// test/component/LifecycleActions.test.tsx
//
// The activate / deactivate / delete row every register's edit page ends with:
// commodities, warehouses, suppliers, buyers, drivers, expense categories,
// delivery addresses, land sellers, payment accounts. One component, so one
// mistake in it is a mistake in all of them.
//
// What is pinned here is the GRADING, which is the part that rots:
//
//   * deleting is permanent, so it is held behind typing - and a delete that
//     fires from a single tap on a phone is the failure this row exists to
//     prevent;
//   * deactivating is undone by the same button, so it is NOT held behind
//     anything: a dialog on the button people actually use, sitting beside the
//     button that destroys, only teaches them to dismiss the dialog in this
//     row on the way to what they wanted;
//   * the sentence such a dialog would carry is on screen instead, where it is
//     read before the tap rather than after it.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { LifecycleActions } from "@/components/admin/registry/lifecycle-actions";

const { errorToast, replace } = vi.hoisted(() => ({
  errorToast: vi.fn(),
  replace: vi.fn(),
}));

// Owner-only by design: staff are not offered a button the API would refuse.
vi.mock("@/hooks/use-auth-role", () => ({
  useAuthRole: () => ({ isSuperAdmin: true }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace }),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: errorToast, success: vi.fn() },
}));

const userEvent = userEventBase.setup({ delay: null });

const props = () => ({
  listHref: "/admin/commodities",
  name: "White maize",
  noun: "commodity",
  onActivate: vi.fn().mockResolvedValue({}),
  onDeactivate: vi.fn().mockResolvedValue({}),
  onDelete: vi.fn().mockResolvedValue({}),
});

/** The dialog, found by its title so the row's own buttons are never matched. */
const gate = async (title: RegExp) => {
  const heading = await screen.findByText(title);
  const dialog = heading.closest('[role="dialog"]');
  if (!dialog) throw new Error("the gate's title is not inside a dialog");
  return dialog as HTMLElement;
};

beforeEach(() => {
  errorToast.mockReset();
  replace.mockReset();
});

describe("deleting from a register", () => {
  it("deletes nothing on the tap alone, and says what the server will check", async () => {
    const p = { ...props(), isActive: true };
    render(<LifecycleActions {...p} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(p.onDelete).not.toHaveBeenCalled();
    // Not a duplicate of the server's rule, a translation of it: what it means
    // when the delete goes through, and what to do when it does not.
    const dialog = await gate(/Delete White maize\?/);
    expect(
      within(dialog).getByText(/refuses it while anything at all still references/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(/deactivating is the answer/i),
    ).toBeInTheDocument();
  });

  it("holds the delete until the word is typed", async () => {
    const p = { ...props(), isActive: true };
    render(<LifecycleActions {...p} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await gate(/Delete White maize\?/);
    const commit = within(dialog).getByRole("button", { name: "Delete" });
    expect(commit).toBeDisabled();

    await userEvent.type(within(dialog).getByLabelText(/to confirm/i), "delete");
    expect(commit).toBeEnabled();
    await userEvent.click(commit);

    expect(p.onDelete).toHaveBeenCalledTimes(1);
    // Off to the list: the page it was on no longer has a record behind it.
    expect(replace).toHaveBeenCalledWith("/admin/commodities");
  });

  it("deletes nothing, and navigates nowhere, when the gate is cancelled", async () => {
    const p = { ...props(), isActive: true };
    render(<LifecycleActions {...p} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await gate(/Delete White maize\?/);
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(p.onDelete).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("keeps the record's page when the server refuses the delete", async () => {
    const p = { ...props(), isActive: true };
    p.onDelete = vi
      .fn()
      .mockRejectedValue({ data: { message: "Still used by 4 purchases" }, status: 409 });
    render(<LifecycleActions {...p} />);

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await gate(/Delete White maize\?/);
    await userEvent.type(within(dialog).getByLabelText(/to confirm/i), "delete");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(errorToast).toHaveBeenCalledWith(
      "Couldn't delete the commodity",
      expect.objectContaining({ description: "Still used by 4 purchases" }),
    );
    // Navigating away on a refusal would strand the operator on a list with no
    // idea the record is still there.
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("retiring a register entry", () => {
  it("deactivates on the tap, with nothing in the way", async () => {
    const p = { ...props(), isActive: true };
    render(<LifecycleActions {...p} />);

    await userEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    // Undone by the same button, so it is not worth a dialog - and a dialog
    // here is what teaches people to click through the one on Delete.
    expect(p.onDeactivate).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("activates on the tap too", async () => {
    const p = { ...props(), isActive: false };
    render(<LifecycleActions {...p} />);

    await userEvent.click(screen.getByRole("button", { name: "Activate" }));

    expect(p.onActivate).toHaveBeenCalledTimes(1);
    expect(p.onDeactivate).not.toHaveBeenCalled();
  });

  it("still says what the ungated button does, before it is tapped", () => {
    const { rerender } = render(
      <LifecycleActions {...props()} isActive />,
    );
    expect(
      screen.getByText(/stops new transactions offering this commodity/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/you can activate it again from here/i),
    ).toBeInTheDocument();

    rerender(<LifecycleActions {...props()} isActive={false} />);
    expect(
      screen.getByText(/selectable in new transactions again/i),
    ).toBeInTheDocument();
  });
});
