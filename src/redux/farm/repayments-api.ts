import { apiSlice } from "../api-slice";
import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateRepaymentInput,
  IRepaymentDetailResponse,
  IRepaymentListQuery,
  IRepaymentListResponse,
  IRepaymentResponse,
} from "@/types/farm.types";

/** Authenticated download URL for a private repayment document (audited server-side). */
export const repaymentDocumentUrl = (
  repaymentId: string,
  documentId: string,
): string =>
  `${env.SERVER_URI}/api/v1/admin/farm/repayments/${repaymentId}/documents/${documentId}`;

/** Repayment fields + the required signed receipt as `payload` + `receipt` parts. */
const repaymentForm = (body: ICreateRepaymentInput, receipt: File): FormData => {
  const form = new FormData();
  form.append("payload", JSON.stringify(body));
  form.append("receipt", receipt);
  return form;
};

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

    getRepayment: builder.query<IRepaymentDetailResponse, string>({
      query: (id) => `admin/farm/repayments/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Repayments", id }],
    }),

    createRepayment: builder.mutation<
      IRepaymentResponse,
      { body: ICreateRepaymentInput; receipt: File }
    >({
      query: ({ body, receipt }) => ({
        url: "admin/farm/repayments",
        method: "POST",
        body: repaymentForm(body, receipt),
      }),
      // May mint a stock lot + movement, and always moves the farmer balance.
      invalidatesTags: [
        { type: "Repayments", id: "LIST" },
        { type: "FarmStats", id: "LIST" },
        { type: "Stock", id: "LIST" },
        { type: "StockMovements", id: "LIST" },
      ],
    }),

    addRepaymentDocument: builder.mutation<
      IRepaymentDetailResponse,
      { id: string; file: File; name: string }
    >({
      query: ({ id, file, name }) => {
        const form = new FormData();
        form.append("document", file);
        form.append("name", name);
        return {
          url: `admin/farm/repayments/${id}/documents`,
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: "Repayments", id }],
    }),

    removeRepaymentDocument: builder.mutation<
      IRepaymentDetailResponse,
      { id: string; documentId: string }
    >({
      query: ({ id, documentId }) => ({
        url: `admin/farm/repayments/${id}/documents/${documentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Repayments", id }],
    }),
  }),
});

export const {
  useGetRepaymentsQuery,
  useGetRepaymentQuery,
  useCreateRepaymentMutation,
  useAddRepaymentDocumentMutation,
  useRemoveRepaymentDocumentMutation,
} = repaymentsApi;
