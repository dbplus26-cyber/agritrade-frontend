import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders the file-empty framing with title and description", () => {
    render(
      <EmptyState
        title="No plots on the register"
        description="Ask the office what's coming."
      />,
    );
    expect(screen.getByText("File empty")).toBeInTheDocument();
    expect(screen.getByText("No plots on the register")).toBeInTheDocument();
    expect(
      screen.getByText("Ask the office what's coming."),
    ).toBeInTheDocument();
  });

  it("only offers an action when both label and handler are given", async () => {
    const onAction = vi.fn();
    const { rerender } = render(<EmptyState actionLabel="Add one" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<EmptyState actionLabel="Add one" onAction={onAction} />);
    await userEvent.click(screen.getByRole("button", { name: "Add one" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
