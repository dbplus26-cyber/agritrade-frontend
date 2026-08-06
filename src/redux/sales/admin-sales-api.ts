import { apiSlice } from "../api-slice";
import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateSaleInput,
  IRecordPaymentInput,
  ISaleDetailResponse,
  ISaleListQuery,
  ISaleListResponse,
  ISalePaymentResponse,
  ISaleStatsResponse,
  IUpdateSaleInput,
} from "@/types/admin-sale.types";

/**
 * The admin sales surface, mirroring `/admin/sales`. Recording a payment
 * moves both the sale and the derived stats/debtors, so those tags invalidate
 * together. (The public /pay flow lives in ../sales/sales-api and is separate.)
 */
/** The server-rendered invoice / receipt PDF for a sale. Titled "Invoice"
 * while a balance is outstanding and "Receipt" once it is settled - the same
 * split the on-screen sheet makes. */
export const saleInvoicePdfUrl = (saleId: string): string =>
  `${env.SERVER_URI}/api/v1/admin/receipts/sale/${saleId}.pdf`;

export const adminSalesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSales: builder.query<ISaleListResponse, ISaleListQuery | void>({
      query: (params) => `admin/sales${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Sales" as const, id: "LIST" },
              ...result.data.map((s) => ({ type: "Sales" as const, id: s.id })),
            ]
          : [{ type: "Sales" as const, id: "LIST" }],
    }),

    getSale: builder.query<ISaleDetailResponse, string>({
      query: (id) => `admin/sales/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Sales", id }],
    }),

    getSaleStats: builder.query<ISaleStatsResponse, void>({
      query: () => "admin/sales/stats",
      providesTags: [{ type: "SaleStats", id: "SUMMARY" }],
    }),

    createSale: builder.mutation<ISaleDetailResponse, ICreateSaleInput>({
      query: (body) => ({ url: "admin/sales", method: "POST", body }),
      invalidatesTags: [
        { type: "Sales", id: "LIST" },
        { type: "SaleStats", id: "SUMMARY" },
      ],
    }),

    updateSale: builder.mutation<
      ISaleDetailResponse,
      { id: string; body: IUpdateSaleInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/sales/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
        { type: "SaleStats", id: "SUMMARY" },
      ],
    }),

    confirmSale: builder.mutation<
      ISaleDetailResponse,
      { id: string; paymentPolicyId?: string }
    >({
      query: ({ id, paymentPolicyId }) => ({
        url: `admin/sales/${id}/confirm`,
        method: "PATCH",
        body: paymentPolicyId ? { paymentPolicyId } : {},
      }),
      // Confirming may put the sale into the shippable (eligible) pool.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
        { type: "SaleStats", id: "SUMMARY" },
        { type: "EligibleSales", id: "LIST" },
      ],
    }),

    cancelSale: builder.mutation<
      ISaleDetailResponse,
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `admin/sales/${id}/cancel`,
        method: "PATCH",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
        { type: "Sales", id: "DEBTORS" },
        { type: "SaleStats", id: "SUMMARY" },
        { type: "EligibleSales", id: "LIST" },
      ],
    }),

    recordSalePayment: builder.mutation<
      ISalePaymentResponse,
      { id: string; body: IRecordPaymentInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/sales/${id}/payments`,
        method: "POST",
        body,
      }),
      // A payment can satisfy the loading milestone and make the sale shippable.
      // It also lands on a company account's movement history.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
        { type: "Sales", id: "DEBTORS" },
        { type: "SaleStats", id: "SUMMARY" },
        { type: "EligibleSales", id: "LIST" },
        { type: "PaymentAccounts", id: "HISTORY" },
      ],
    }),

    /**
     * Owner-only. Writes a negative compensating row rather than deleting
     * anything, so a mis-keyed payment stops being permanent. Invalidates the
     * same set a payment does - reversing can reopen a COMPLETED sale and put
     * it back below its loading milestone.
     */
    reverseSalePayment: builder.mutation<
      ISalePaymentResponse,
      { id: string; paymentId: string; reason: string }
    >({
      query: ({ id, paymentId, reason }) => ({
        url: `admin/sales/${id}/payments/${paymentId}/reverse`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
        { type: "Sales", id: "DEBTORS" },
        { type: "SaleStats", id: "SUMMARY" },
        { type: "EligibleSales", id: "LIST" },
        { type: "PaymentAccounts", id: "HISTORY" },
      ],
    }),
  }),
});

export const {
  useReverseSalePaymentMutation,
  useGetSalesQuery,
  useGetSaleQuery,
  useGetSaleStatsQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useConfirmSaleMutation,
  useCancelSaleMutation,
  useRecordSalePaymentMutation,
} = adminSalesApi;
