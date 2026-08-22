"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebounce } from "./use-debounce";

/**
 * URL-synced table state: page + a debounced search + string filters.
 *
 * Local state is the source of truth; it seeds once from the URL, then mirrors
 * changes back into the query string. The mirror effect reads the *live* URL
 * (window.location) rather than the reactive `searchParams`, so writing the URL
 * can't feed back and cause a render loop, and it only navigates when the URL
 * actually differs (`router.replace(..., { scroll: false })` - no page jump).
 *
 * Session memory: re-entering a table through the sidebar (a bare URL, no
 * params) restores where it was left - page, search and filters - while an
 * explicit URL always wins and a fresh browser session starts clean.
 *
 * `search` is the immediate input value; `queryParams.search` is the debounced
 * value that feeds the RTK query, so typing isn't chatty. Changing the search
 * or a filter resets to page 1. Pass a stable `defaults` (module const) and an
 * optional `prefix` to namespace params when two tables share a page.
 */
export function useTableQuery<F extends Record<string, string>>({
  defaults,
  prefix = "",
  pageSize,
}: {
  defaults: F;
  prefix?: string;
  pageSize?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const key = useCallback(
    (name: string) => (prefix ? `${prefix}_${name}` : name),
    [prefix],
  );

  const [page, setPageState] = useState(() => {
    const parsed = Number(searchParams.get(key("page")) ?? "1");
    return parsed > 0 ? parsed : 1;
  });
  const [searchInput, setSearchInput] = useState(
    () => searchParams.get(key("search")) ?? "",
  );
  const [filters, setFiltersState] = useState<F>(() => {
    const out = { ...defaults };
    for (const name of Object.keys(defaults)) {
      const value = searchParams.get(key(name));
      if (value) (out as Record<string, string>)[name] = value;
    }
    return out;
  });

  const debouncedSearch = useDebounce(searchInput, 350);

  const storageKey = `dbplus-table:${pathname}${prefix ? `:${prefix}` : ""}`;
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const live = new URLSearchParams(window.location.search);
    const names = ["page", "search", ...Object.keys(defaults)];
    if (names.some((n) => live.has(key(n)))) return; // explicit URL wins
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) return;
    const sp = new URLSearchParams(saved);
    const parsedPage = Number(sp.get(key("page")) ?? "1");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot restore on mount
    setPageState(parsedPage > 0 ? parsedPage : 1);
    setSearchInput(sp.get(key("search")) ?? "");
    const next = { ...defaults };
    for (const name of Object.keys(defaults)) {
      const value = sp.get(key(name));
      if (value) (next as Record<string, string>)[name] = value;
    }
    setFiltersState(next);
  }, [defaults, key, storageKey]);

  // State → URL. Depends only on state (never on searchParams), reads the live
  // URL to preserve unrelated params, and navigates only when it changed.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const set = (name: string, value: null | string) => {
      if (value) params.set(key(name), value);
      else params.delete(key(name));
    };
    set("page", page > 1 ? String(page) : null);
    set("search", debouncedSearch.trim() || null);
    for (const [name, value] of Object.entries(filters)) {
      set(name, value && value !== defaults[name] ? value : null);
    }
    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    if (target !== `${window.location.pathname}${window.location.search}`) {
      router.replace(target, { scroll: false });
    }

    // Remember only this table's own params for the session-memory restore.
    const mine = new URLSearchParams();
    if (page > 1) mine.set(key("page"), String(page));
    if (debouncedSearch.trim()) mine.set(key("search"), debouncedSearch.trim());
    for (const [name, value] of Object.entries(filters)) {
      if (value && value !== defaults[name]) mine.set(key(name), value);
    }
    if (mine.toString()) sessionStorage.setItem(storageKey, mine.toString());
    else sessionStorage.removeItem(storageKey);
  }, [page, debouncedSearch, filters, pathname, key, router, defaults, storageKey]);

  // URL → state, for browser back/forward only. The mirror above uses
  // `router.replace` (history.replaceState), which does NOT emit `popstate`, so
  // this listener can't fire from our own writes - no feedback loop. A real
  // back/forward changes the URL without touching our state, so we adopt the
  // popped URL's values here; the mirror then sees the URL already matches state
  // and skips navigating (no extra history entry).
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const parsedPage = Number(params.get(key("page")) ?? "1");
      setPageState(parsedPage > 0 ? parsedPage : 1);
      setSearchInput(params.get(key("search")) ?? "");
      const next = { ...defaults };
      for (const name of Object.keys(defaults)) {
        const value = params.get(key(name));
        if (value) (next as Record<string, string>)[name] = value;
      }
      setFiltersState(next);
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => {
      window.removeEventListener("popstate", syncFromUrl);
    };
  }, [key, defaults]);

  const setSearch = useCallback((value: string) => {
    setSearchInput(value);
    setPageState(1);
  }, []);

  const setFilter = useCallback((name: string, value: string) => {
    setFiltersState((prev) => ({ ...prev, [name]: value }) as F);
    setPageState(1);
  }, []);

  const setPage = useCallback((next: number) => {
    setPageState(Math.max(1, next));
    // A new page of rows starts at the top, not wherever the pager sat.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  /** Back to the default filters (and page 1); the search text stays. */
  const resetFilters = useCallback(() => {
    setFiltersState(defaults);
    setPageState(1);
  }, [defaults]);

  const queryParams = useMemo(() => {
    const clean: Record<string, unknown> = { page };
    if (pageSize) clean.limit = pageSize;
    if (debouncedSearch.trim()) clean.search = debouncedSearch.trim();
    for (const [name, value] of Object.entries(filters)) {
      if (value && value !== defaults[name]) clean[name] = value;
    }
    return clean;
  }, [page, pageSize, debouncedSearch, filters, defaults]);

  return {
    page,
    search: searchInput,
    filters,
    resetFilters,
    setSearch,
    setFilter,
    setPage,
    queryParams,
  };
}
