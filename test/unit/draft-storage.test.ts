// test/unit/draft-storage.test.ts
//
// The field forms' retry-safety floor. draft-storage keeps the form values
// AND the idempotency key in localStorage so a dead zone, a reload or a
// killed webview never loses an entry - and, more importantly, never mints a
// SECOND key for the same purchase. Two rules matter and both fail quiet:
//
//   * draftKey must return the SAME key for as long as a draft exists, and a
//     fresh one only when there is none - a fresh key per attempt is a
//     double float charge, a stale key past success is a purchase that
//     silently never happens;
//   * storage trouble (full quota, blocked, corrupt JSON) must degrade to
//     "no draft", never to a thrown error inside the submission path.
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearDraft,
  draftKey,
  loadDraft,
  saveDraft,
} from "@/components/agent/draft-storage";

const KEY = "dbplus.test.draft";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

beforeEach(() => {
  localStorage.clear();
});

describe("draft-storage - round trip", () => {
  it("returns exactly what was saved, key included", () => {
    saveDraft(KEY, { key: "k-1", values: { weightKg: "120" } });
    expect(loadDraft<{ weightKg: string }>(KEY)).toEqual({
      key: "k-1",
      values: { weightKg: "120" },
    });
  });

  it("clears to nothing", () => {
    saveDraft(KEY, { key: "k-1", values: {} });
    clearDraft(KEY);
    expect(loadDraft(KEY)).toBeNull();
  });
});

describe("draft-storage - key lifecycle", () => {
  it("mints a fresh UUID when no draft exists", () => {
    expect(draftKey(KEY)).toMatch(UUID_RE);
  });

  it("mints a DIFFERENT key each time while nothing is stored", () => {
    // draftKey does not itself persist - a caller that never saves must not
    // get the same key twice, or two separate purchases would dedupe.
    expect(draftKey(KEY)).not.toBe(draftKey(KEY));
  });

  it("returns the stored draft's key, not a fresh one", () => {
    saveDraft(KEY, { key: "the-original", values: {} });
    // THE retry guarantee: as long as the draft lives, every submission
    // attempt - across reloads - reuses the one key.
    expect(draftKey(KEY)).toBe("the-original");
    expect(draftKey(KEY)).toBe("the-original");
  });
});

describe("draft-storage - hostile storage", () => {
  it("treats corrupt JSON as no draft", () => {
    localStorage.setItem(KEY, "{not json");
    expect(loadDraft(KEY)).toBeNull();
    // And draftKey therefore mints fresh rather than crashing the form.
    expect(draftKey(KEY)).toMatch(UUID_RE);
  });

  it("treats a keyless record as no draft", () => {
    // A draft without its key is unusable for the retry guarantee; loading
    // it would submit with `key: undefined` and lose the dedupe.
    localStorage.setItem(KEY, JSON.stringify({ values: { weightKg: "1" } }));
    expect(loadDraft(KEY)).toBeNull();
  });

  it("never lets a failing setItem break the submission path", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });
    try {
      expect(() =>
        saveDraft(KEY, { key: "k-1", values: {} }),
      ).not.toThrow();
    } finally {
      setItem.mockRestore();
    }
  });

  it("never lets a failing removeItem break the success path", () => {
    const removeItem = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("SecurityError");
      });
    try {
      expect(() => clearDraft(KEY)).not.toThrow();
    } finally {
      removeItem.mockRestore();
    }
  });
});
