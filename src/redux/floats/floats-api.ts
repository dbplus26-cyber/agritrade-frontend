import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IFloatHolderListQuery,
  IFloatHolderListResponse,
  IFloatLedgerQuery,
  IFloatLedgerResponse,
  IFloatTransactionResponse,
} from "@/types/agent.types";
import type { IMessageResponse } from "@/types/auth.types";

/**
 * Allocations (`/admin/floats`): who is holding company money to spend.
 *
 * Staff and field agents are listed together because the question the owner
 * is asking - "who is holding my money" - does not care which of the two
 * somebody is. The agent-specific screens (purchases, sit-down counts) stay
 * on `/admin/agents`; this is only the money side.
 *
 * Reads are staff-wide (amounts are still redacted per the financial
 * visibility grant); every write is the owner deciding who may hold cash.
 */
export const floatsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFloatHolders: builder.query<
      IFloatHolderListResponse,
      IFloatHolderListQuery | void
    >({
      query: (params) => `admin/floats${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "FloatHolders" as const, id: "LIST" },
              ...result.data.map((h) => ({
                type: "FloatHolders" as const,
                id: h.userId,
              })),
            ]
          : [{ type: "FloatHolders" as const, id: "LIST" }],
    }),

    /**
     * One holder's statement. Somebody who has never been funded reads back
     * an empty ledger rather than a 404 - opening their page must not be what
     * creates their allocation.
     */
    getFloatHolderLedger: builder.query<
      IFloatLedgerResponse,
      { userId: string } & IFloatLedgerQuery
    >({
      query: ({ userId, ...params }) =>
        `admin/floats/${userId}${toQueryString(params)}`,
      providesTags: (_r, _e, { userId }) => [
        { type: "FloatLedger", id: userId },
        { type: "FloatLedger", id: "LIST" },
      ],
    }),

    topUpHolderFloat: builder.mutation<
      IFloatTransactionResponse,
      {
        amountGhs: number;
        idempotencyKey: string;
        method: "BANK" | "CASH" | "MOMO";
        reason?: string;
        userId: string;
      }
    >({
      query: ({ idempotencyKey, userId, ...body }) => ({
        url: `admin/floats/${userId}/top-up`,
        method: "POST",
        body: { ...body, idempotencyKey },
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "FloatHolders", id: "LIST" },
        { type: "FloatHolders", id: userId },
        { type: "FloatLedger", id: userId },
        { type: "FloatLedger", id: "LIST" },
        { type: "Agents", id: "LIST" },
      ],
    }),

    /** Suspending stops spending; it does not touch a line of history. */
    setFloatHolderStatus: builder.mutation<
      IMessageResponse,
      { isActive: boolean; userId: string }
    >({
      query: ({ userId, ...body }) => ({
        url: `admin/floats/${userId}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "FloatHolders", id: "LIST" },
        { type: "FloatHolders", id: userId },
        { type: "FloatLedger", id: userId },
      ],
    }),

    openFloatAccount: builder.mutation<IMessageResponse, string>({
      query: (userId) => ({
        url: `admin/floats/${userId}`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, userId) => [
        { type: "FloatHolders", id: "LIST" },
        { type: "FloatHolders", id: userId },
      ],
    }),
  }),
});

export const {
  useGetFloatHolderLedgerQuery,
  useGetFloatHoldersQuery,
  useOpenFloatAccountMutation,
  useSetFloatHolderStatusMutation,
  useTopUpHolderFloatMutation,
} = floatsApi;
