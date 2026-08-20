// test/unit/money-rendering.test.ts
//
// The two choke points every money figure on screen passes through, which had
// no tests: format-money.ts (rendering, redaction placeholder, compaction) and
// use-money-visibility (who sees money columns at all). A regression in either
// shows wrong figures - or someone else's figures - on every screen at once.
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  formatCedis,
  formatCedisCompact,
  MONEY_HIDDEN,
} from "@/lib/format-money";
import { useMoneyVisibility } from "@/hooks/use-money-visibility";

const { currentUser } = vi.hoisted(() => ({
  currentUser: { value: null as null | Record<string, unknown> },
}));
vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => currentUser.value,
}));

describe("formatCedis", () => {
  it("renders major units at exactly two decimals", () => {
    expect(formatCedis(4.2)).toBe("GH₵ 4.20");
    expect(formatCedis(12400)).toBe("GH₵ 12,400.00");
    expect(formatCedis(0)).toBe("GH₵ 0.00");
  });

  it("renders the redaction placeholder for null, never 'null' or blank", () => {
    // Null on the wire means the API redacted it. "Nothing here" and "not for
    // you" must not look the same to somebody reading a ledger.
    expect(formatCedis(null)).toBe(MONEY_HIDDEN);
  });
});

describe("formatCedisCompact", () => {
  it("keeps exact figures below 100k and compacts above", () => {
    expect(formatCedisCompact(99_999)).toBe("GH₵ 99,999.00");
    // One decimal while the scaled figure is under 100 of its unit (which in
    // practice means M and B - thousands enter compaction at 100k, already
    // three digits), none above.
    expect(formatCedisCompact(344_680)).toBe("GH₵ 345k");
    expect(formatCedisCompact(1_200_000)).toBe("GH₵ 1.2M");
    expect(formatCedisCompact(2_500_000_000)).toBe("GH₵ 2.5B");
  });

  it("honours redaction like its exact sibling", () => {
    expect(formatCedisCompact(null)).toBe(MONEY_HIDDEN);
  });
});

describe("useMoneyVisibility", () => {
  const see = () => renderHook(() => useMoneyVisibility()).result.current;

  it("shows nothing to a signed-out reader", () => {
    currentUser.value = null;
    expect(see()).toBe(false);
  });

  it("always shows money to the owner and to agents", () => {
    currentUser.value = { role: "SUPER_ADMIN" };
    expect(see()).toBe(true);
    currentUser.value = { role: "AGENT" };
    expect(see()).toBe(true);
  });

  it("gates staff on the effective MONEY_VIEW permission, not the legacy column", () => {
    // A grant made on the Permissions screen never touches the legacy
    // financialVisibility column - reading the column alone would hide money
    // the API is actually sending.
    currentUser.value = {
      financialVisibility: false,
      permissions: ["MONEY_VIEW"],
      role: "STAFF",
    };
    expect(see()).toBe(true);
    currentUser.value = {
      financialVisibility: false,
      permissions: [],
      role: "STAFF",
    };
    expect(see()).toBe(false);
  });

  it("falls back to the legacy column when no permission set arrived", () => {
    currentUser.value = { financialVisibility: true, role: "STAFF" };
    expect(see()).toBe(true);
    currentUser.value = { financialVisibility: false, role: "STAFF" };
    expect(see()).toBe(false);
  });
});
