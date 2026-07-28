import { apiSlice } from "../api-slice";
import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateGrantInput,
  IGrantDetailResponse,
  IGrantListQuery,
  IGrantListResponse,
  IGrantResponse,
} from "@/types/farm.types";
import type { IGrantAgingResponse } from "@/types/ops.types";

/** Authenticated download URL for a private grant document (audited server-side). */
export const grantDocumentUrl = (grantId: string, documentId: string): string =>
  `${env.SERVER_URI}/api/v1/admin/farm/grants/${grantId}/documents/${documentId}`;

/** Grant fields + the required signed agreement as `payload` + `agreement` parts. */
const grantForm = (body: ICreateGrantInput, agreement: File): FormData => {
  const form = new FormData();
  form.append("payload", JSON.stringify(body));
  form.append("agreement", agreement);
  return form;
};

/** Input grants, mirroring `/admin/farm/grants` (owner-only, append-only). */
export const grantsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGrants: builder.query<IGrantListResponse, IGrantListQuery | void>({
      query: (params) => `admin/farm/grants${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Grants" as const, id: "LIST" },
              ...result.data.map((g) => ({ type: "Grants" as const, id: g.id })),
            ]
          : [{ type: "Grants" as const, id: "LIST" }],
    }),

    // Derived read (super-admin): outstanding balances bucketed by how
    // overdue they are. Tagged FarmStats like the other derived farm reads,
    // so new grants/repayments refresh it via the existing invalidations.
    getGrantAging: builder.query<IGrantAgingResponse, void>({
      query: () => "admin/farm/grants/aging",
      providesTags: [{ type: "FarmStats", id: "LIST" }],
    }),

    getGrant: builder.query<IGrantDetailResponse, string>({
      query: (id) => `admin/farm/grants/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Grants", id }],
    }),

    createGrant: builder.mutation<
      IGrantResponse,
      { body: ICreateGrantInput; agreement: File }
    >({
      query: ({ body, agreement }) => ({
        url: "admin/farm/grants",
        method: "POST",
        body: grantForm(body, agreement),
      }),
      // A grant at/above the threshold raises an approval, so refresh the badge.
      invalidatesTags: [
        { type: "Grants", id: "LIST" },
        { type: "FarmStats", id: "LIST" },
        { type: "ApprovalsCount", id: "COUNT" },
      ],
    }),

    addGrantDocument: builder.mutation<
      IGrantDetailResponse,
      { id: string; file: File; name: string }
    >({
      query: ({ id, file, name }) => {
        const form = new FormData();
        form.append("document", file);
        form.append("name", name);
        return {
          url: `admin/farm/grants/${id}/documents`,
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: "Grants", id }],
    }),

    removeGrantDocument: builder.mutation<
      IGrantDetailResponse,
      { id: string; documentId: string }
    >({
      query: ({ id, documentId }) => ({
        url: `admin/farm/grants/${id}/documents/${documentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Grants", id }],
    }),
  }),
});

export const {
  useGetGrantsQuery,
  useGetGrantAgingQuery,
  useGetGrantQuery,
  useCreateGrantMutation,
  useAddGrantDocumentMutation,
  useRemoveGrantDocumentMutation,
} = grantsApi;
