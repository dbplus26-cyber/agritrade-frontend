/**
 * Retry-safe draft persistence for the field forms: the form's values AND its
 * idempotency key survive reloads and dead zones in localStorage, and are
 * cleared only on a confirmed success. The same key retried against the
 * backend returns the original record - never a duplicate charge on the
 * float.
 */

export interface Draft<T> {
  key: string;
  values: T;
}

const newKey = () => crypto.randomUUID();

export function loadDraft<T>(storageKey: string): Draft<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft<T>;
    if (!parsed.key) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft<T>(storageKey: string, draft: Draft<T>): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Storage full/blocked: the form still works, it just won't survive a
    // reload. Never let persistence break the submission path.
  }
}

export function clearDraft(storageKey: string): void {
  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Same tolerance as saveDraft.
  }
}

/** An existing draft's key, or a fresh one for a new submission attempt. */
export function draftKey<T>(storageKey: string): string {
  return loadDraft<T>(storageKey)?.key ?? newKey();
}

/**
 * The known draft keys, so ending a session can sweep them. Drafts hold real
 * business figures (a purchase's weight and price, a cost and its category)
 * typed on what is often a SHARED phone at a buying station - surviving logout
 * meant the next person to sign in on the device saw the last agent's numbers.
 * Registered here rather than discovered by prefix, because localStorage
 * enumeration is what a typo in the prefix silently breaks.
 */
const DRAFT_KEYS = [
  "dbplus.agent.expense.draft",
  "dbplus.agent.purchase.draft",
];

/** Sweeps every field-form draft. Called when the session ends. */
export function clearAllDrafts(): void {
  for (const key of DRAFT_KEYS) clearDraft(key);
}
