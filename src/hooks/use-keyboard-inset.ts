"use client";

import { useEffect, useState } from "react";

export interface KeyboardInset {
  /** Height in px of the strip at the bottom of the layout viewport that the
   *  on-screen keyboard covers - 0 while the keyboard is closed. */
  bottom: number;
  /** Height in px of the visible (visual) viewport above that strip. */
  height: number;
}

const CLOSED: KeyboardInset = { bottom: 0, height: 0 };

function measure(vv: VisualViewport): KeyboardInset {
  // A `position: fixed; bottom: 0` element is pinned to the layout viewport,
  // which phones do NOT shrink for the keyboard (Android Chrome's default
  // `interactive-widget=resizes-visual`, and iOS always). Only the visual
  // viewport shrinks - and on iOS it can also pan down (offsetTop), so the
  // covered strip is what's left below the visual viewport's bottom edge.
  const bottom = Math.max(
    0,
    Math.round(window.innerHeight - vv.height - vv.offsetTop),
  );
  return { bottom, height: Math.round(vv.height) };
}

/**
 * Tracks how much of the bottom of the screen the on-screen keyboard covers,
 * so a bottom-anchored sheet can be lifted above it instead of hiding behind
 * it. Listens only while `enabled` (a mounted-but-desktop dialog pays
 * nothing); reports zero whenever the browser has no visualViewport.
 */
export function useKeyboardInset(enabled: boolean): KeyboardInset {
  const [inset, setInset] = useState<KeyboardInset>(CLOSED);

  useEffect(() => {
    const vv = enabled ? window.visualViewport : null;
    if (!vv) return;
    const update = () => setInset(measure(vv));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setInset(CLOSED);
    };
  }, [enabled]);

  useEffect(() => {
    // Once the sheet has moved up and shrunk, the field being typed into may
    // sit below the sheet's own scroll fold - bring it back into view. The
    // frame delay lets the new bottom/max-height lay out first.
    if (!inset.bottom) return;
    const id = requestAnimationFrame(() => {
      const el = document.activeElement;
      if (el instanceof HTMLElement) el.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [inset.bottom]);

  return inset;
}
