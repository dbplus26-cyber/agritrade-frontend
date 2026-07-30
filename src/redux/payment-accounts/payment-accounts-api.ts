import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type { IMessageResponse } from "@/types/auth.types";
import type {
  IAccountHistoryQuery,
  ICreatePaymentAccountInput,
  IPayableAccountsResponse,
  IPaymentAccount,
  IPaymentAccountHistoryResponse,
  IPaymentAccountListQuery,
  IPaymentAccountResponse,
  IUpdatePaymentAccountInput,
} from "@/types/payment-account.types";
import type { IRegistryListResponse } from "@/types/registry.types";

/**
 * The payment destinations the owner maintains, mirroring
 * `/admin/payment-accounts`. Reading is staff-wide (an invoice renders from
 * it, and staff quote accounts down the phone); every write is owner-only,
 * because changing an account number silently redirects future payments.
 */
export const paymentAccountsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentAccounts: builder.query<
      IRegistryListResponse<IPaymentAccount>,
      IPaymentAccountListQuery | void
    >({
      query: (params) => `admin/payment-accounts${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "PaymentAccounts" as const, id: "LIST" },
              ...result.data.map((a) => ({
                type: "PaymentAccounts" as const,
                id: a.id,
              })),
            ]
          : [{ type: "PaymentAccounts" as const, id: "LIST" }],
    }),

    /** What a document prints: live and published, in display order. */
    getPayableAccounts: builder.query<IPayableAccountsResponse, void>({
      query: () => "admin/payment-accounts/payable",
      providesTags: [{ type: "PaymentAccounts", id: "PAYABLE" }],
    }),

    getPaymentAccount: builder.query<IPaymentAccountResponse, string>({
      query: (id) => `admin/payment-accounts/${id}`,
      providesTags: (_r, _e, id) => [{ type: "PaymentAccounts", id }],
    }),

    /**
     * The account's detail-page ledger: every payment row (sale, land-sale
     * or acquisition) that named this account, newest first, with all-time
     * in/net/out totals. Provides the shared HISTORY tag so recording or
     * reversing a payment anywhere refreshes every account's view.
     */
    getPaymentAccountHistory: builder.query<
      IPaymentAccountHistoryResponse,
      { id: string } & IAccountHistoryQuery
    >({
      query: ({ id, ...params }) =>
        `admin/payment-accounts/${id}/payments${toQueryString(params)}`,
      providesTags: (_r, _e, { id }) => [
        { type: "PaymentAccounts", id },
        { type: "PaymentAccounts", id: "HISTORY" },
      ],
    }),

    createPaymentAccount: builder.mutation<
      IPaymentAccountResponse,
      ICreatePaymentAccountInput
    >({
      query: (body) => ({
        url: "admin/payment-accounts",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "PaymentAccounts", id: "LIST" },
        { type: "PaymentAccounts", id: "PAYABLE" },
      ],
    }),

    updatePaymentAccount: builder.mutation<
      IPaymentAccountResponse,
      { id: string; body: IUpdatePaymentAccountInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/payment-accounts/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "PaymentAccounts", id },
        { type: "PaymentAccounts", id: "LIST" },
        { type: "PaymentAccounts", id: "PAYABLE" },
      ],
    }),

    deactivatePaymentAccount: builder.mutation<IPaymentAccountResponse, string>({
      query: (id) => ({
        url: `admin/payment-accounts/${id}/deactivate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "PaymentAccounts", id },
        { type: "PaymentAccounts", id: "LIST" },
        { type: "PaymentAccounts", id: "PAYABLE" },
      ],
    }),

    activatePaymentAccount: builder.mutation<IPaymentAccountResponse, string>({
      query: (id) => ({
        url: `admin/payment-accounts/${id}/activate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "PaymentAccounts", id },
        { type: "PaymentAccounts", id: "LIST" },
        { type: "PaymentAccounts", id: "PAYABLE" },
      ],
    }),

    deletePaymentAccount: builder.mutation<IMessageResponse, string>({
      query: (id) => ({
        url: `admin/payment-accounts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "PaymentAccounts", id: "LIST" },
        { type: "PaymentAccounts", id: "PAYABLE" },
      ],
    }),
  }),
});

export const {
  useGetPaymentAccountsQuery,
  useGetPayableAccountsQuery,
  useGetPaymentAccountQuery,
  useGetPaymentAccountHistoryQuery,
  useCreatePaymentAccountMutation,
  useUpdatePaymentAccountMutation,
  useDeactivatePaymentAccountMutation,
  useActivatePaymentAccountMutation,
  useDeletePaymentAccountMutation,
} = paymentAccountsApi;
