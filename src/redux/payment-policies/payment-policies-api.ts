import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreatePaymentPolicyInput,
  IPaymentPolicyListResponse,
  IPaymentPolicyResponse,
  IUpdatePaymentPolicyInput,
} from "@/types/admin-sale.types";

/** Payment policies, mirroring `/admin/payment-policies` (owner config). */
export const paymentPoliciesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentPolicies: builder.query<
      IPaymentPolicyListResponse,
      { page?: number; limit?: number; isActive?: boolean; search?: string } | void
    >({
      query: (params) => `admin/payment-policies${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "PaymentPolicies" as const, id: "LIST" },
              ...result.data.map((p) => ({
                type: "PaymentPolicies" as const,
                id: p.id,
              })),
            ]
          : [{ type: "PaymentPolicies" as const, id: "LIST" }],
    }),

    createPaymentPolicy: builder.mutation<
      IPaymentPolicyResponse,
      ICreatePaymentPolicyInput
    >({
      query: (body) => ({ url: "admin/payment-policies", method: "POST", body }),
      // A new default demotes the old one, so refresh the whole list.
      invalidatesTags: [{ type: "PaymentPolicies", id: "LIST" }],
    }),

    updatePaymentPolicy: builder.mutation<
      IPaymentPolicyResponse,
      { id: string; body: IUpdatePaymentPolicyInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/payment-policies/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "PaymentPolicies", id: "LIST" }],
    }),

    deletePaymentPolicy: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `admin/payment-policies/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "PaymentPolicies", id: "LIST" }],
    }),
  }),
});

export const {
  useGetPaymentPoliciesQuery,
  useCreatePaymentPolicyMutation,
  useUpdatePaymentPolicyMutation,
  useDeletePaymentPolicyMutation,
} = paymentPoliciesApi;
