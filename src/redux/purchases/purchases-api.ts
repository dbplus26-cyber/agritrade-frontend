import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IAddPurchaseCostInput,
  IAddPurchaseCostResponse,
  ICreatePurchaseInput,
  IPurchaseCostsResponse,
  IPurchaseListQuery,
  IPurchaseListResponse,
  IPurchasePaymentResponse,
  IPurchasePaymentReversalResponse,
  IPurchasePaymentsResponse,
  IPurchaseResponse,
  IReceivePurchaseInput,
  IRecordPurchasePaymentInput,
  IUnpaidPurchasesResponse,
  IVoidPurchaseInput,
} from "@/types/purchase.types";

/** Builds the request body: multipart when a weigh-slip travels with the
 * save (`payload` JSON part + `photo` file), plain JSON otherwise. */
const withOptionalPhoto = (body: object, photo?: File) => {
  if (!photo) return body;
  const form = new FormData();
  form.append("payload", JSON.stringify(body));
  form.append("photo", photo);
  return form;
};

/** The purchase pipeline, mirroring the backend `/admin/purchases` surface. */
export const purchasesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPurchases: builder.query<
      IPurchaseListResponse,
      IPurchaseListQuery | void
    >({
      query: (params) => `admin/purchases${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Purchases" as const, id: "LIST" },
              ...result.data.map((p) => ({
                type: "Purchases" as const,
                id: p.id,
              })),
            ]
          : [{ type: "Purchases" as const, id: "LIST" }],
    }),

    getPurchase: builder.query<IPurchaseResponse, string>({
      query: (id) => `admin/purchases/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Purchases", id }],
    }),

    createPurchase: builder.mutation<
      IPurchaseResponse,
      { body: ICreatePurchaseInput; photo?: File }
    >({
      query: ({ body, photo }) => ({
        url: "admin/purchases",
        method: "POST",
        body: withOptionalPhoto(body, photo),
      }),
      // An AGENT-sourced purchase debits a float the moment it is recorded.
      invalidatesTags: [
        { type: "Purchases", id: "LIST" },
        { type: "Agents", id: "LIST" },
        { type: "FloatLedger", id: "LIST" },
        // The optional pay-on-record posts a movement onto a named account.
        { type: "PaymentAccounts", id: "HISTORY" },
        "CashBook",
      ],
    }),

    markPurchaseInTransit: builder.mutation<IPurchaseResponse, string>({
      query: (id) => ({
        url: `admin/purchases/${id}/in-transit`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Purchases", id },
        { type: "Purchases", id: "LIST" },
      ],
    }),

    receivePurchase: builder.mutation<
      IPurchaseResponse,
      { id: string; body: IReceivePurchaseInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/purchases/${id}/receive`,
        method: "PATCH",
        body,
      }),
      // Receiving is the STOCK event: the backend mints the lot and writes a
      // PURCHASE_RECEIPT movement in the same transaction. Without these two
      // the stock register and the movement log keep serving pre-receipt
      // figures until something else happens to invalidate them.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Purchases", id },
        { type: "Purchases", id: "LIST" },
        { type: "Stock", id: "LIST" },
        { type: "StockMovements", id: "LIST" },
      ],
    }),

    voidPurchase: builder.mutation<
      IPurchaseResponse,
      { id: string; body: IVoidPurchaseInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/purchases/${id}/void`,
        method: "PATCH",
        body,
      }),
      // Voiding compensates the paying float, so balances move too - and
      // voiding a RECEIVED purchase also deletes its lot and writes the
      // reversing stock movement, so the stock views move with it.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Purchases", id },
        { type: "Purchases", id: "LIST" },
        { type: "Agents", id: "LIST" },
        { type: "FloatLedger", id: "LIST" },
        { type: "Stock", id: "LIST" },
        { type: "StockMovements", id: "LIST" },
        // Voiding reverses every standing payment - movements come back.
        { type: "PaymentAccounts", id: "HISTORY" },
        "CashBook",
      ],
    }),

    /**
     * What has been paid for these goods. A purchase is a document; settling
     * it is a separate act, so it has its own ledger.
     */
    getPurchasePayments: builder.query<IPurchasePaymentsResponse, string>({
      query: (purchaseId) => `admin/purchases/${purchaseId}/payments`,
      providesTags: (_r, _e, id) => [{ type: "Purchases", id: `PAY-${id}` }],
    }),

    /** The settle picker's feed: purchases that still owe a supplier money. */
    getUnpaidPurchases: builder.query<
      IUnpaidPurchasesResponse,
      { limit?: number; page?: number; search?: string } | void
    >({
      query: (params) => `admin/purchases/unpaid${toQueryString(params ?? {})}`,
      providesTags: [{ type: "Purchases", id: "UNPAID" }],
    }),

    recordPurchasePayment: builder.mutation<
      IPurchasePaymentResponse,
      { body: IRecordPurchasePaymentInput; purchaseId: string }
    >({
      query: ({ body, purchaseId }) => ({
        url: `admin/purchases/${purchaseId}/payments`,
        method: "POST",
        body,
      }),
      // The money leaves a real account, so the cash book moves with it.
      invalidatesTags: (_r, _e, { purchaseId }) => [
        { type: "Purchases", id: purchaseId },
        { type: "Purchases", id: `PAY-${purchaseId}` },
        { type: "Purchases", id: "LIST" },
        { type: "Purchases", id: "UNPAID" },
        // Bare type: the movement also lands on one account's own ledger view.
        "CashBook",
        { type: "PaymentAccounts", id: "HISTORY" },
      ],
    }),

    reversePurchasePayment: builder.mutation<
      IPurchasePaymentReversalResponse,
      { paymentId: string; purchaseId: string; reason: string }
    >({
      query: ({ paymentId, purchaseId, ...body }) => ({
        url: `admin/purchases/${purchaseId}/payments/${paymentId}/reverse`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { purchaseId }) => [
        { type: "Purchases", id: purchaseId },
        { type: "Purchases", id: `PAY-${purchaseId}` },
        { type: "Purchases", id: "LIST" },
        { type: "Purchases", id: "UNPAID" },
        // Bare type: the movement also lands on one account's own ledger view.
        "CashBook",
        { type: "PaymentAccounts", id: "HISTORY" },
      ],
    }),

    /**
     * The costs incurred to acquire these goods - haulage from the farm gate,
     * loading, porterage - and which of them were taken into the goods.
     *
     * Its own read rather than a slice of the purchase, exactly as the payment
     * ledger is: what a load COST to acquire and what the document says it was
     * bought for are two facts, and folding the first into the second leaves
     * "how much did we make on that purchase" unanswerable.
     */
    getPurchaseCosts: builder.query<IPurchaseCostsResponse, string>({
      query: (purchaseId) => `admin/purchases/${purchaseId}/expenses`,
      providesTags: (_r, _e, id) => [{ type: "Purchases", id: `COST-${id}` }],
    }),

    addPurchaseCost: builder.mutation<
      IAddPurchaseCostResponse,
      {
        body: IAddPurchaseCostInput;
        idempotencyKey: string;
        purchaseId: string;
      }
    >({
      query: ({ body, idempotencyKey, purchaseId }) => ({
        url: `admin/purchases/${purchaseId}/expenses`,
        method: "POST",
        body: { ...body, idempotencyKey },
      }),
      // A capitalised cost changes what the goods cost, so anything that
      // reports on them moves: the purchase itself, its cost list, and the
      // profit report, whose cost of sales this feeds once the grain sells.
      // The Expenses register moves too - a purchase cost is an ordinary
      // voucher there, and it lands unpaid, so the money-out picker that
      // reads unpaid vouchers has to see it.
      invalidatesTags: (_r, _e, { purchaseId }) => [
        { type: "Purchases", id: purchaseId },
        { type: "Purchases", id: `COST-${purchaseId}` },
        { type: "Expenses", id: "LIST" },
        { type: "ExpensePayments", id: "UNPAID" },
        { type: "Reports", id: "LIST" },
        { type: "PaymentAccounts", id: "HISTORY" },
        "CashBook",
      ],
    }),
  }),
});

export const {
  useAddPurchaseCostMutation,
  useGetPurchaseCostsQuery,
  useGetPurchasePaymentsQuery,
  useGetUnpaidPurchasesQuery,
  useRecordPurchasePaymentMutation,
  useReversePurchasePaymentMutation,
  useGetPurchasesQuery,
  useGetPurchaseQuery,
  useCreatePurchaseMutation,
  useMarkPurchaseInTransitMutation,
  useReceivePurchaseMutation,
  useVoidPurchaseMutation,
} = purchasesApi;
