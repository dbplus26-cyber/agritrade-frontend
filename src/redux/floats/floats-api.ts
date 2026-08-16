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

    /**
     * Handing somebody money, which is a TRANSFER: it leaves a named company
     * account and lands in one of theirs.
     *
     * `fromAccountId` is required by the server and used not to be sent at
     * all, so this call refused every time it was made - a top-up that names
     * no source is a bare credit, and the business's own position never fell
     * by what it had just handed over. `toKind` says which of their pots it
     * landed in, because a pocket, a wallet and a bank are different money.
     */
    topUpHolderFloat: builder.mutation<
      IFloatTransactionResponse,
      {
        amountGhs: number;
        fromAccountId: string;
        idempotencyKey: string;
        reason?: string;
        toKind: "BANK" | "CASH" | "MOMO";
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

    /**
     * What somebody may SEND, and out of which company account.
     *
     * A separate act from handing them money, deliberately: one is permission
     * and the other is cash, and the float made them the same thing, so a
     * top-up silently widened what an agent could draw on the company wallet.
     *
     * Both fields optional - raising a limit should not mean restating where
     * it draws from - and `capGhs: null` CLEARS the cap rather than setting it
     * to nothing. A cap of zero is refused by the server: zero is not a cap,
     * it is a suspension, and there is a switch for that below.
     */
    setHolderAuthority: builder.mutation<
      IMessageResponse,
      {
        capGhs?: null | number;
        drawsOnAccountId?: null | string;
        userId: string;
      }
    >({
      query: ({ userId, ...body }) => ({
        url: `admin/floats/${userId}/authority`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { userId }) => [
        { type: "FloatHolders", id: "LIST" },
        { type: "FloatHolders", id: userId },
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
  useSetHolderAuthorityMutation,
  useTopUpHolderFloatMutation,
} = floatsApi;
