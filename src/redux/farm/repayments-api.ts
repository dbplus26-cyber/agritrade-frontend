import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateRepaymentInput,
  IRepaymentListQuery,
  IRepaymentListResponse,
  IRepaymentResponse,
} from "@/types/farm.types";

/** Produce repayments, mirroring `/admin/farm/repayments` (owner-only). */
export const repaymentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRepayments: builder.query<
      IRepaymentListResponse,
      IRepaymentListQuery | void
    >({
      query: (params) => `admin/farm/repayments${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Repayments" as const, id: "LIST" },
              ...result.data.map((r) => ({
                type: "Repayments" as const,
                id: r.id,
              })),
            ]
          : [{ type: "Repayments" as const, id: "LIST" }],
    }),

    createRepayment: builder.mutation<IRepaymentResponse, ICreateRepaymentInput>({
      query: (body) => ({ url: "admin/farm/repayments", method: "POST", body }),
      // May mint a stock lot + movement, and always moves the farmer balance.
      invalidatesTags: [
        { type: "Repayments", id: "LIST" },
        { type: "FarmStats", id: "LIST" },
        { type: "Stock", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetRepaymentsQuery, useCreateRepaymentMutation } =
  repaymentsApi;
