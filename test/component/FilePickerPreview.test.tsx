import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilePicker } from "@/components/ui/FilePicker";

describe("FilePicker's staged preview", () => {
  it("keeps a long file name in one readable block", async () => {
    render(
      <FilePicker
        accept="image/*"
        confirmLabel="Upload"
        onConfirm={vi.fn()}
        triggerLabel="Choose image"
      />,
    );
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();

    const name =
      "a-very-long-statement-logo-file-name-that-would-otherwise-crush.png";
    await userEvent.upload(input!, new File(["x"], name, { type: "image/png" }));

    const shown = await screen.findByTitle(name);
    expect(shown.textContent).toBe(name);
    // The block must be allowed a real measure, not squeezed to a sliver by
    // the thumbnail and buttons beside it.
    expect(shown.parentElement?.className).toContain("basis-[12rem]");
  });
});
