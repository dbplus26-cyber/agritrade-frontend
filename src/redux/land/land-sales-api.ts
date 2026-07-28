import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateLandSaleInput,
  ILandSaleListQuery,
  ILandSaleListResponse,
  ILandSaleResponse,
  IRecordLandPaymentInput,
} from "@/types/land.types";

/** The land-sales book, mirroring `/admin/land/sales` (owner-only). */
export const landSalesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLandSales: builder.query<
      ILandSaleListResponse,
      ILandSaleListQuery | void
    >({
      query: (params) => `admin/land/sales${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "LandSales" as const, id: "LIST" },
              ...result.data.map((s) => ({ type: "LandSales" as const, id: s.id })),
            ]
          : [{ type: "LandSales" as const, id: "LIST" }],
    }),

    getLandSale: builder.query<ILandSaleResponse, string>({
      query: (id) => `admin/land/sales/${id}`,
      providesTags: (_r, _e, id) => [{ type: "LandSales", id }],
    }),

    createLandSale: builder.mutation<ILandSaleResponse, ICreateLandSaleInput>({
      query: (body) => ({ url: "admin/land/sales", method: "POST", body }),
      // A confirmed/completed land sale changes the plot's status.
      invalidatesTags: [
        { type: "LandSales", id: "LIST" },
        { type: "LandPlots", id: "LIST" },
      ],
    }),

    confirmLandSale: builder.mutation<ILandSaleResponse, string>({
      query: (id) => ({ url: `admin/land/sales/${id}/confirm`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "LandSales", id },
        { type: "LandSales", id: "LIST" },
        { type: "LandPlots", id: "LIST" },
      ],
    }),

    cancelLandSale: builder.mutation<
      ILandSaleResponse,
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `admin/land/sales/${id}/cancel`,
        method: "PATCH",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "LandSales", id },
        { type: "LandSales", id: "LIST" },
        { type: "LandPlots", id: "LIST" },
      ],
    }),

    recordLandPayment: builder.mutation<
      ILandSaleResponse,
      { id: string; body: IRecordLandPaymentInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/land/sales/${id}/payments`,
        method: "POST",
        body,
      }),
      // Full payment completes the sale and sells the plot.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "LandSales", id },
        { type: "LandSales", id: "LIST" },
        { type: "LandPlots", id: "LIST" },
      ],
    }),

    /**
     * Owner-only. The only way a confirmed sale that fell through releases its
     * plot: cancelling refuses while money is on the ledger, so the refund is
     * recorded as a reversal first. Invalidates plots too - reversing can walk
     * a SOLD plot back to RESERVED.
     */
    reverseLandSalePayment: builder.mutation<
      ILandSaleResponse,
      { id: string; paymentId: string; reason: string }
    >({
      query: ({ id, paymentId, reason }) => ({
        url: `admin/land/sales/${id}/payments/${paymentId}/reverse`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "LandSales", id },
        { type: "LandSales", id: "LIST" },
        { type: "LandPlots", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetLandSalesQuery,
  useGetLandSaleQuery,
  useCreateLandSaleMutation,
  useConfirmLandSaleMutation,
  useCancelLandSaleMutation,
  useRecordLandPaymentMutation,
  useReverseLandSalePaymentMutation,
} = landSalesApi;
