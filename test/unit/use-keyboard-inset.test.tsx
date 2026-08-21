import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";

/** A stand-in for window.visualViewport: height/offsetTop plus resize events. */
class FakeVisualViewport extends EventTarget {
  height = 800;
  offsetTop = 0;
  set(next: { height: number; offsetTop?: number }, event = "resize") {
    this.height = next.height;
    this.offsetTop = next.offsetTop ?? 0;
    this.dispatchEvent(new Event(event));
  }
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

describe("useKeyboardInset", () => {
  it("reports no inset while the keyboard is closed", () => {
    const { result } = renderHook(() => useKeyboardInset(true));
    expect(result.current).toEqual({ bottom: 0, height: 800 });
  });

  it("measures the strip the keyboard covers when the visual viewport shrinks", () => {
    const { result } = renderHook(() => useKeyboardInset(true));
    act(() => vv.set({ height: 500 }));
    expect(result.current).toEqual({ bottom: 300, height: 500 });
  });

  it("subtracts the visual viewport's own scroll offset (iOS pans the page)", () => {
    const { result } = renderHook(() => useKeyboardInset(true));
    act(() => vv.set({ height: 500, offsetTop: 100 }, "scroll"));
    expect(result.current).toEqual({ bottom: 200, height: 500 });
  });

  it("drops back to zero when the keyboard closes again", () => {
    const { result } = renderHook(() => useKeyboardInset(true));
    act(() => vv.set({ height: 500 }));
    act(() => vv.set({ height: 800 }));
    expect(result.current).toEqual({ bottom: 0, height: 800 });
  });

  it("does nothing while disabled, and resets when disabled later", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useKeyboardInset(enabled),
      { initialProps: { enabled: false } },
    );
    act(() => vv.set({ height: 500 }));
    expect(result.current.bottom).toBe(0);

    rerender({ enabled: true });
    expect(result.current).toEqual({ bottom: 300, height: 500 });

    rerender({ enabled: false });
    expect(result.current.bottom).toBe(0);
  });
});
