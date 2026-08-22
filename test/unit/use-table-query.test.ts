// test/unit/use-table-query.test.ts
//
// The URL-synced table state every console register stands on. Its design
// note promises four things that are easy to break separately and hard to
// notice breaking together:
//
//   * the URL mirror must never feed back into state (the hook reads the
//     LIVE URL, not the reactive searchParams, precisely so writing the URL
//     cannot re-trigger a write - a loop here is an infinite replace());
//   * search reaches the query debounced, so typing isn't a request per key;
//   * a bare sidebar URL restores where the table was left (sessionStorage),
//     while an EXPLICIT url always wins over that memory;
//   * browser back/forward adopts the popped URL without minting an extra
//     history entry.
//
// next/navigation is mocked at the seam the hook actually uses: replace()
// writes to jsdom's real history, so window.location - the thing the mirror
// effect reads - behaves exactly as in the browser.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useTableQuery } from "@/hooks/use-table-query";

const { replaceMock, pushMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

// Stable module const, as the hook's contract demands - an inline object
// literal would re-run the restore/mirror effects every render.
const DEFAULTS = { size: "10", status: "all" };

const setUrl = (url: string) => {
  window.history.replaceState({}, "", url);
};

const currentUrl = () =>
  `${window.location.pathname}${window.location.search}`;

const mount = (opts?: { pageSize?: number; prefix?: string }) =>
  renderHook(() =>
    useTableQuery({ defaults: DEFAULTS, ...opts }),
  );

beforeEach(() => {
  sessionStorage.clear();
  setUrl("/admin/things");
  // router.replace behaves like the real one: history.replaceState, which
  // updates window.location WITHOUT emitting popstate. Tests that assert the
  // anti-feedback guarantee depend on this fidelity.
  replaceMock.mockImplementation((url: string) => {
    setUrl(url);
  });
  // jsdom has no scrollTo; setPage calls it on every page turn.
  vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
  replaceMock.mockReset();
  pushMock.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useTableQuery - seeding and mirroring", () => {
  it("seeds page, search and filters from an explicit URL", () => {
    setUrl("/admin/things?page=3&search=maize&status=VOID");
    const { result } = mount();

    expect(result.current.page).toBe(3);
    expect(result.current.search).toBe("maize");
    expect(result.current.filters.status).toBe("VOID");
    // The debounce's FIRST value is emitted immediately, so a shared URL
    // queries what it says straight away, not 350ms later.
    expect(result.current.queryParams).toMatchObject({
      page: 3,
      search: "maize",
      status: "VOID",
    });
  });

  it("mirrors state changes into the URL, preserving unrelated params", () => {
    setUrl("/admin/things?tab=ledger");
    const { result } = mount();

    act(() => {
      result.current.setPage(2);
    });

    // Another feature's param must ride along untouched: the mirror edits
    // the live query string, it does not rebuild it from its own state.
    const params = new URLSearchParams(window.location.search);
    expect(params.get("page")).toBe("2");
    expect(params.get("tab")).toBe("ledger");
  });

  it("keeps default-valued state OUT of the URL", () => {
    const { result } = mount();

    act(() => {
      result.current.setFilter("status", "VOID");
    });
    act(() => {
      result.current.setFilter("status", "all");
    });

    // Back at the default there is nothing to say: a URL of ?status=all on
    // every register is noise, and page=1 is where every table starts.
    expect(currentUrl()).toBe("/admin/things");
  });

  it("does not navigate again when the URL already matches state", () => {
    const { result, rerender } = mount();

    act(() => {
      result.current.setFilter("status", "VOID");
    });
    const callsAfterChange = replaceMock.mock.calls.length;
    expect(callsAfterChange).toBeGreaterThan(0);

    // Re-renders with unchanged state must be free: the mirror compares
    // against the live URL and skips the replace. A regression here is the
    // render->replace->render loop the design note warns about.
    rerender();
    rerender();
    expect(replaceMock.mock.calls.length).toBe(callsAfterChange);
  });

  it("namespaces every param under the prefix so two tables share a page", () => {
    const { result } = mount({ prefix: "tx" });

    // Filter first: changing a filter resets to page 1, so the page turn
    // must come after it to survive.
    act(() => {
      result.current.setFilter("status", "VOID");
    });
    act(() => {
      result.current.setPage(4);
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get("tx_page")).toBe("4");
    expect(params.get("tx_status")).toBe("VOID");
    // Nothing leaks into the unprefixed names another table would read.
    expect(params.get("page")).toBeNull();
    expect(params.get("status")).toBeNull();
  });
});

describe("useTableQuery - debounced search", () => {
  it("holds typing back for 350ms, then queries once and resets to page 1", () => {
    vi.useFakeTimers();
    const { result } = mount();

    act(() => {
      result.current.setPage(3);
    });
    act(() => {
      result.current.setSearch("ya");
    });
    act(() => {
      result.current.setSearch("yam");
    });

    // The input echoes immediately; the QUERY must not follow yet.
    expect(result.current.search).toBe("yam");
    expect(result.current.queryParams.search).toBeUndefined();
    // A new search starts from page 1 - page 3 of a different result set is
    // a page of rows the reader wasn't looking for.
    expect(result.current.page).toBe(1);

    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.queryParams.search).toBe("yam");
    expect(new URLSearchParams(window.location.search).get("search")).toBe(
      "yam",
    );
  });

  it("trims whitespace-only search out of the query and the URL", () => {
    vi.useFakeTimers();
    const { result } = mount();

    act(() => {
      result.current.setSearch("   ");
    });
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.queryParams.search).toBeUndefined();
    expect(currentUrl()).toBe("/admin/things");
  });
});

describe("useTableQuery - session memory", () => {
  it("restores page, search and filters when re-entered through a bare URL", () => {
    vi.useFakeTimers();
    sessionStorage.setItem(
      "dbplus-table:/admin/things",
      "page=2&search=yam&status=VOID",
    );
    const { result } = mount();

    expect(result.current.page).toBe(2);
    expect(result.current.search).toBe("yam");
    expect(result.current.filters.status).toBe("VOID");

    // The restored state then mirrors into the URL (after the debounce), so
    // a reload of the restored view is stable rather than starting over.
    act(() => {
      vi.advanceTimersByTime(350);
    });
    const params = new URLSearchParams(window.location.search);
    expect(params.get("page")).toBe("2");
    expect(params.get("search")).toBe("yam");
  });

  it("lets an explicit URL beat the session memory", () => {
    sessionStorage.setItem(
      "dbplus-table:/admin/things",
      "page=9&status=VOID",
    );
    setUrl("/admin/things?page=5");
    const { result } = mount();

    // Someone followed or typed THIS url; silently teleporting them to a
    // remembered page 9 would make shared links lie.
    expect(result.current.page).toBe(5);
    expect(result.current.filters.status).toBe("all");
  });

  it("forgets a table put back to its defaults", () => {
    const { result } = mount();

    act(() => {
      result.current.setFilter("status", "VOID");
    });
    expect(sessionStorage.getItem("dbplus-table:/admin/things")).toContain(
      "status=VOID",
    );

    act(() => {
      result.current.resetFilters();
    });
    // Nothing worth remembering: a stored "everything default" entry would
    // still count as memory and shadow later legitimate restores.
    expect(sessionStorage.getItem("dbplus-table:/admin/things")).toBeNull();
  });
});

describe("useTableQuery - reset and guards", () => {
  it("resetFilters returns to defaults and page 1 but keeps the search text", () => {
    const { result } = mount();

    act(() => {
      result.current.setFilter("status", "VOID");
    });
    act(() => {
      result.current.setSearch("maize");
    });
    act(() => {
      result.current.setPage(3);
    });
    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters).toEqual(DEFAULTS);
    expect(result.current.page).toBe(1);
    // Documented contract: "the search text stays".
    expect(result.current.search).toBe("maize");
  });

  it("clamps nonsense page values to 1", () => {
    setUrl("/admin/things?page=-4");
    const { result } = mount();
    expect(result.current.page).toBe(1);

    act(() => {
      result.current.setPage(0);
    });
    expect(result.current.page).toBe(1);
  });

  it("includes the limit only when a pageSize is given", () => {
    const bare = mount();
    expect(bare.result.current.queryParams.limit).toBeUndefined();

    const sized = mount({ pageSize: 20 });
    expect(sized.result.current.queryParams.limit).toBe(20);
  });
});

describe("useTableQuery - browser back/forward", () => {
  it("adopts the popped URL's state without minting an extra history entry", () => {
    vi.useFakeTimers();
    const { result } = mount();

    act(() => {
      result.current.setFilter("status", "VOID");
    });
    replaceMock.mockClear();

    // A real back: the browser changes the URL itself and fires popstate.
    act(() => {
      setUrl("/admin/things?page=4&status=all");
      window.dispatchEvent(new PopStateEvent("popstate"));
      vi.advanceTimersByTime(350);
    });

    expect(result.current.page).toBe(4);
    expect(result.current.filters.status).toBe("all");
    // The mirror then finds the URL already matching the adopted state and
    // stays quiet - replacing here would overwrite the history entry the
    // reader just navigated to.
    expect(currentUrl()).toBe("/admin/things?page=4");
  });

  it("adopts a popped search after the debounce settles", () => {
    vi.useFakeTimers();
    const { result } = mount();

    act(() => {
      setUrl("/admin/things?search=rice");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    // The input adopts immediately; the query catches up when the debounce
    // fires, same as typing would.
    expect(result.current.search).toBe("rice");
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(result.current.queryParams.search).toBe("rice");
    expect(new URLSearchParams(window.location.search).get("search")).toBe(
      "rice",
    );
  });
});
