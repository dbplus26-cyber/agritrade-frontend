"use client";

import { useSyncExternalStore } from "react";

// Never subscribes: the snapshot flips exactly once, when React hydrates.
const emptySubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * Hydration-safe "are we on the client yet" - false on the server and on the
 * first client render, true right after, with no setState-in-effect.
 *
 * Gate anything read from localStorage (the persisted console user) on this:
 * the server can't see localStorage, so rendering it on the first client pass
 * makes React report a hydration mismatch and throw the markup away.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot);
}
