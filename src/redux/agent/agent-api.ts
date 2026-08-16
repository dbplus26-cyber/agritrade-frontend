import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IAgentExpenseInput,
  IFloatLedgerQuery,
  IFloatLedgerResponse,
  IFloatTransactionResponse,
  IMySpendingResponse,
} from "@/types/agent.types";
import type {
  IAgentCreatePurchaseInput,
  IPurchaseListQuery,
  IPurchaseListResponse,
  IPurchaseResponse,
} from "@/types/purchase.types";

/** Builds the request body: multipart when a weigh-slip travels with the
 * save, plain JSON otherwise (same convention as the admin purchase API). */
const withOptionalPhoto = (body: object, photo?: File) => {
  if (!photo) return body;
  const form = new FormData();
  form.append("payload", JSON.stringify(body));
  form.append("photo", photo);
  return form;
};

/**
 * The field agent's own namespace (`/agent`): my float, my purchases, my
 * expenses - the backend scopes every row to the caller's own profile. Both
 * POSTs carry a client-generated `Idempotency-Key` header so a 2G retry
 * returns the original record instead of double-charging the float.
 */
export const agentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Read-only vocabulary for the field forms (active entries, id + name).
    getAgentCommodities: builder.query<
      { message: string; data: { commodities: { id: string; name: string }[] } },
      void
    >({
      query: () => "agent/commodities",
      providesTags: [{ type: "Commodities", id: "AGENT" }],
    }),

    getAgentExpenseCategories: builder.query<
      {
        message: string;
        data: { expenseCategories: { id: string; name: string }[] };
      },
      void
    >({
      query: () => "agent/expense-categories",
      providesTags: [{ type: "ExpenseCategories", id: "AGENT" }],
    }),

    getMyFloat: builder.query<IFloatLedgerResponse, IFloatLedgerQuery | void>({
      query: (params) => `agent/me/float${toQueryString(params ?? {})}`,
      providesTags: [{ type: "FloatLedger", id: "MINE" }],
    }),

    /**
     * What the caller may still SEND, which is not what they are holding.
     * Tagged with the same ledger id so a top-up or a send refreshes both:
     * an allowance that has been consumed and a balance that has fallen are
     * two consequences of one act, and a screen showing one stale beside the
     * other is how the two came to be confused in the first place.
     */
    getMySpending: builder.query<IMySpendingResponse, void>({
      query: () => "agent/me/spending",
      providesTags: [{ type: "FloatLedger", id: "MINE" }],
    }),

    getMyPurchases: builder.query<
      IPurchaseListResponse,
      IPurchaseListQuery | void
    >({
      query: (params) => `agent/purchases${toQueryString(params ?? {})}`,
      providesTags: [{ type: "Purchases", id: "MINE" }],
    }),

    createMyPurchase: builder.mutation<
      IPurchaseResponse,
      { body: IAgentCreatePurchaseInput; idempotencyKey: string; photo?: File }
    >({
      query: ({ body, idempotencyKey, photo }) => ({
        url: "agent/purchases",
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: withOptionalPhoto(body, photo),
      }),
      invalidatesTags: [
        { type: "Purchases", id: "MINE" },
        { type: "FloatLedger", id: "MINE" },
      ],
    }),

    createMyExpense: builder.mutation<
      IFloatTransactionResponse,
      { body: IAgentExpenseInput; idempotencyKey: string }
    >({
      query: ({ body, idempotencyKey }) => ({
        url: "agent/expenses",
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body,
      }),
      invalidatesTags: [{ type: "FloatLedger", id: "MINE" }],
    }),
  }),
});

export const {
  useGetAgentCommoditiesQuery,
  useGetAgentExpenseCategoriesQuery,
  useGetMyFloatQuery,
  useGetMyPurchasesQuery,
  useGetMySpendingQuery,
  useCreateMyPurchaseMutation,
  useCreateMyExpenseMutation,
} = agentApi;
