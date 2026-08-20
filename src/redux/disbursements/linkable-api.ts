import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type { ILinkableDisbursementsResponse } from "@/types/disbursement.types";

/**
 * The sends a payment may be booked against: settled, and not yet claimed by
 * any of the three payment books.
 *
 * This is how a payment says it came out of the Hubtel wallet without that
 * account ever appearing in the account picker. The wallet may not be
 * hand-named: its movements are written by the send and the callback, so a hand
 * entry on top would debit the business twice for one transfer - and because
 * the wallet's real balance lives at Hubtel rather than in our ledger, the gap
 * would never reconcile. Naming the SEND says the same thing and invents no
 * second movement.
 *
 * Untagged on purpose: the list is a search, re-run as the reader types, and a
 * cache keyed by every keystroke would grow without ever being read again.
 */
export const linkableDisbursementsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLinkableDisbursements: builder.query<
      ILinkableDisbursementsResponse,
      { limit?: number; search?: string }
    >({
      query: (params) => `admin/disbursements/linkable${toQueryString(params)}`,
    }),
  }),
});

export const { useGetLinkableDisbursementsQuery } = linkableDisbursementsApi;
