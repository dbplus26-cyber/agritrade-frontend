"use client";

import { useCallback, useState } from "react";
import { useDebounce } from "./use-debounce";

/**
 * The typed query behind a server-searching picker.
 *
 * Pickers over a register that grows without limit (suppliers, farmers,
 * buyers, plots) cannot fetch the whole thing and filter locally - past the
 * fetch limit the register is simply invisible, and the picker says "no
 * matches" for records that exist. So the typed text becomes a query
 * parameter and the server does the matching.
 *
 * `search` is the immediate input value; `query` is the debounced one that
 * feeds the RTK query, so a keystroke is not a request. Undefined rather
 * than "" when empty, so the parameter drops out of the request entirely and
 * the unfiltered first page is a cache hit shared by every picker on the
 * form.
 */
export function useRemoteSearch(delay = 300) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, delay);
  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);
  return { onSearchChange, query: debounced.trim() || undefined, search };
}
