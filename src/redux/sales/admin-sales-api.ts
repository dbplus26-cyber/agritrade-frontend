import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateSaleInput,
  IDebtorListResponse,
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

    getDebtors: builder.query<
      IDebtorListResponse,
      { page?: number; limit?: number } | void
    >({
      query: (params) => `admin/sales/debtors${toQueryString(params ?? {})}`,
      providesTags: [{ type: "Sales", id: "DEBTORS" }],
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
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
        { type: "SaleStats", id: "SUMMARY" },
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
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Sales", id },
        { type: "Sales", id: "LIST" },
        { type: "Sales", id: "DEBTORS" },
        { type: "SaleStats", id: "SUMMARY" },
      ],
    }),
  }),
});

export const {
  useGetSalesQuery,
  useGetSaleQuery,
  useGetSaleStatsQuery,
  useGetDebtorsQuery,
  useCreateSaleMutation,
  useUpdateSaleMutation,
  useConfirmSaleMutation,
  useCancelSaleMutation,
  useRecordSalePaymentMutation,
} = adminSalesApi;
