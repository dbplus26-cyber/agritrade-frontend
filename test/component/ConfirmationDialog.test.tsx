import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  title: "Strike this plot off?",
  description: "This can't be undone from here.",
};

describe("ConfirmationDialog", () => {
  it("confirms straight away without an exact-match requirement", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmationDialog {...baseProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("keeps confirm disabled until the exact match is typed", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        {...baseProps}
        onConfirm={onConfirm}
        requireExactMatch="PLOT-14"
        confirmText="Strike it off"
      />,
    );
    const confirm = screen.getByRole("button", { name: "Strike it off" });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/to confirm/i), "PLOT-1");
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/to confirm/i), "4");
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("forgives the space a phone keyboard adds after an autocomplete", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        {...baseProps}
        onConfirm={onConfirm}
        requireExactMatch="Yakubu"
        confirmText="Hand it over"
      />,
    );
    await userEvent.type(screen.getByLabelText(/to confirm/i), "Yakubu ");
    expect(screen.getByRole("button", { name: "Hand it over" })).toBeEnabled();
  });

  it("still refuses a near miss, so the typing is a real check", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        {...baseProps}
        onConfirm={onConfirm}
        requireExactMatch="Yakubu"
        confirmText="Hand it over"
      />,
    );
    await userEvent.type(screen.getByLabelText(/to confirm/i), "yakubu");
    expect(screen.getByRole("button", { name: "Hand it over" })).toBeDisabled();
  });

  it("cancels without confirming, and cancelling is what the sheet's bottom edge does", () => {
    const onOpenChange = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmationDialog
        {...baseProps}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );
    const cancel = screen.getByRole("button", { name: "Cancel" });
    const footer = cancel.parentElement;

    // A bottom sheet puts its footer under the resting thumb, so on phones the
    // column is reversed and CANCEL takes that edge. If this class is ever
    // dropped the commit button silently moves under the thumb, which is the
    // whole failure this dialog exists to prevent.
    expect(footer).toHaveClass("flex-col-reverse");
    expect(footer).toHaveClass("sm:flex-row");

    cancel.click();
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
