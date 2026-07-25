import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateGrantInput,
  IGrantListQuery,
  IGrantListResponse,
  IGrantResponse,
} from "@/types/farm.types";

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

    createGrant: builder.mutation<IGrantResponse, ICreateGrantInput>({
      query: (body) => ({ url: "admin/farm/grants", method: "POST", body }),
      // A grant at/above the threshold raises an approval, so refresh the badge.
      invalidatesTags: [
        { type: "Grants", id: "LIST" },
        { type: "FarmStats", id: "LIST" },
        { type: "ApprovalsCount", id: "COUNT" },
      ],
    }),
  }),
});

export const { useGetGrantsQuery, useCreateGrantMutation } = grantsApi;
