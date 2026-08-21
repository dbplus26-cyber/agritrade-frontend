import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => true }));

class FakeVisualViewport extends EventTarget {
  height = 800;
  offsetTop = 0;
}

let vv: FakeVisualViewport;

beforeEach(() => {
  vv = new FakeVisualViewport();
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: vv,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800,
  });
});

afterEach(() => {
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: undefined,
  });
});

function renderSheet() {
  return render(
    <ResponsiveDialog open onOpenChange={() => {}}>
      <ResponsiveDialogContent showCloseButton={false}>
        <ResponsiveDialogTitle>Reject this?</ResponsiveDialogTitle>
        <ResponsiveDialogDescription>Say why.</ResponsiveDialogDescription>
        <input aria-label="Reason" />
      </ResponsiveDialogContent>
    </ResponsiveDialog>,
  );
}

describe("ResponsiveDialog bottom sheet and the on-screen keyboard", () => {
  it("sits on the bottom edge while the keyboard is closed", () => {
    renderSheet();
    const sheet = screen.getByRole("dialog");
    expect(sheet.style.bottom).toBe("");
    expect(sheet.style.maxHeight).toBe("");
  });

  it("lifts above the keyboard and caps its height to the visible area", () => {
    renderSheet();
    act(() => {
      vv.height = 480;
      vv.dispatchEvent(new Event("resize"));
    });
    const sheet = screen.getByRole("dialog");
    expect(sheet.style.bottom).toBe("320px");
    expect(sheet.style.maxHeight).toBe("480px");
  });

  it("settles back on the bottom edge once the keyboard closes", () => {
    renderSheet();
    act(() => {
      vv.height = 480;
      vv.dispatchEvent(new Event("resize"));
    });
    act(() => {
      vv.height = 800;
      vv.dispatchEvent(new Event("resize"));
    });
    const sheet = screen.getByRole("dialog");
    expect(sheet.style.bottom).toBe("");
    expect(sheet.style.maxHeight).toBe("");
  });
});
