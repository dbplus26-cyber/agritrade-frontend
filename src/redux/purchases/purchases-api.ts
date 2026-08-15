import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreatePurchaseInput,
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
      // the stock register and the movement log kept serving pre-receipt
      // figures until something else happened to invalidate them.
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
        { type: "CashBook", id: "OVERVIEW" },
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
        { type: "CashBook", id: "OVERVIEW" },
      ],
    }),
  }),
});

export const {
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
