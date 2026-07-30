import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IBalanceTransfer,
  IBalanceTransferListResponse,
  IBalanceTransferResponse,
  ICreateTransferInput,
  ITransferListQuery,
  ITreasuryResponse,
} from "@/types/disbursement.types";

/**
 * The company's own position at Hubtel (`/admin/treasury`), owner-only.
 *
 * Two accounts: the COLLECTION account, where customers' money lands, and the
 * DISBURSEMENT account, which every payout is drawn on. Topping the second up
 * from the first is the whole point of this slice - when the disbursement
 * account empties, nobody in the business can send, whatever their float says.
 */
export const treasuryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Both balances. The server keeps a short read cache, so ordinary page
     * loads are cheap; `force` is the explicit refresh button and skips it.
     */
    getTreasury: builder.query<ITreasuryResponse, { force?: boolean } | void>({
      query: (params) => `admin/treasury${toQueryString(params ?? {})}`,
      providesTags: [{ type: "Treasury", id: "OVERVIEW" }],
    }),

    getBalanceTransfers: builder.query<
      IBalanceTransferListResponse,
      ITransferListQuery | void
    >({
      query: (params) =>
        `admin/treasury/transfers${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Treasury" as const, id: "TRANSFERS" },
              ...result.data.map((t) => ({
                type: "Treasury" as const,
                id: t.id,
              })),
            ]
          : [{ type: "Treasury" as const, id: "TRANSFERS" }],
    }),

    getBalanceTransfer: builder.query<IBalanceTransferResponse, string>({
      query: (id) => `admin/treasury/transfers/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Treasury", id }],
    }),

    /**
     * Move funds across. Idempotency-Key matters as much here as on a payout:
     * a re-submitted transfer after a timeout would otherwise move the money
     * twice.
     */
    createBalanceTransfer: builder.mutation<
      IBalanceTransferResponse,
      { body: ICreateTransferInput; idempotencyKey: string }
    >({
      query: ({ body, idempotencyKey }) => ({
        url: "admin/treasury/transfers",
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body,
      }),
      invalidatesTags: [
        { type: "Treasury", id: "TRANSFERS" },
        { type: "Treasury", id: "OVERVIEW" },
      ],
    }),

    checkTransferStatus: builder.mutation<IBalanceTransferResponse, string>({
      query: (id) => ({
        url: `admin/treasury/transfers/${id}/check-status`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Treasury", id },
        { type: "Treasury", id: "TRANSFERS" },
        { type: "Treasury", id: "OVERVIEW" },
      ],
    }),

    resolveTransfer: builder.mutation<
      IBalanceTransferResponse,
      { id: string; outcome: "FAILED" | "SUCCESS"; reason: string }
    >({
      query: ({ id, ...body }) => ({
        url: `admin/treasury/transfers/${id}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Treasury", id },
        { type: "Treasury", id: "TRANSFERS" },
        { type: "Treasury", id: "OVERVIEW" },
      ],
    }),
  }),
});

export const {
  useCheckTransferStatusMutation,
  useCreateBalanceTransferMutation,
  useGetBalanceTransferQuery,
  useGetBalanceTransfersQuery,
  useGetTreasuryQuery,
  useResolveTransferMutation,
} = treasuryApi;

export const transferIsSettled = (t: IBalanceTransfer): boolean =>
  t.status === "SUCCESS" || t.status === "FAILED";
