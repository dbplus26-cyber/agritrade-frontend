import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IAccountEntryResponse,
  IAccountLedgerQuery,
  IAccountLedgerResponse,
  IAccountTransferResponse,
  ICashBookResponse,
  IPostAccountEntryInput,
  IReconcileInput,
  IReconciliationListResponse,
  IReconciliationResponse,
  ITransferInput,
} from "@/types/cashbook.types";

/**
 * The cash book (`/admin/accounts`).
 *
 * Reads are open to office staff with the figures nulled for anyone without
 * money visibility; every write needs CASHBOOK_POST, which nobody holds by
 * default. Posting an entry with no document behind it is the one money path
 * the system has nothing to check the figure against.
 *
 * Every mutation invalidates the whole book rather than one account: a
 * transfer moves two accounts and the total, and an entry changes the position
 * the overview prints. Precision here would only be a way to be subtly wrong.
 */
export const cashBookApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCashBook: builder.query<
      ICashBookResponse,
      { asOf?: string; includeInactive?: boolean } | void
    >({
      query: (params) => `admin/accounts${toQueryString(params ?? {})}`,
      providesTags: [{ type: "CashBook", id: "OVERVIEW" }],
    }),

    getAccountLedger: builder.query<
      IAccountLedgerResponse,
      { accountId: string } & IAccountLedgerQuery
    >({
      query: ({ accountId, ...params }) =>
        `admin/accounts/${accountId}/ledger${toQueryString(params)}`,
      providesTags: (_r, _e, { accountId }) => [
        { type: "CashBook", id: accountId },
      ],
    }),

    getAccountReconciliations: builder.query<
      IReconciliationListResponse,
      string
    >({
      query: (accountId) => `admin/accounts/${accountId}/reconciliations`,
      providesTags: (_r, _e, accountId) => [
        { type: "CashBook", id: `RECON-${accountId}` },
      ],
    }),

    postAccountEntry: builder.mutation<
      IAccountEntryResponse,
      { accountId: string; body: IPostAccountEntryInput }
    >({
      query: ({ accountId, body }) => ({
        url: `admin/accounts/${accountId}/entries`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { accountId }) => [
        { type: "CashBook", id: "OVERVIEW" },
        { type: "CashBook", id: accountId },
      ],
    }),

    /**
     * Idempotency-Key matters as much here as on a payout: a re-submitted
     * transfer after a timeout would otherwise move the money twice.
     */
    createAccountTransfer: builder.mutation<
      IAccountTransferResponse,
      { body: ITransferInput; idempotencyKey: string }
    >({
      query: ({ body, idempotencyKey }) => ({
        url: "admin/accounts/transfers",
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: { ...body, idempotencyKey },
      }),
      invalidatesTags: (_r, _e, { body }) => [
        { type: "CashBook", id: "OVERVIEW" },
        { type: "CashBook", id: body.fromAccountId },
        { type: "CashBook", id: body.toAccountId },
      ],
    }),

    reconcileAccount: builder.mutation<
      IReconciliationResponse,
      { accountId: string; body: IReconcileInput }
    >({
      query: ({ accountId, body }) => ({
        url: `admin/accounts/${accountId}/reconciliations`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { accountId }) => [
        { type: "CashBook", id: "OVERVIEW" },
        { type: "CashBook", id: accountId },
        { type: "CashBook", id: `RECON-${accountId}` },
      ],
    }),
  }),
});

export const {
  useCreateAccountTransferMutation,
  useGetAccountLedgerQuery,
  useGetAccountReconciliationsQuery,
  useGetCashBookQuery,
  usePostAccountEntryMutation,
  useReconcileAccountMutation,
} = cashBookApi;
