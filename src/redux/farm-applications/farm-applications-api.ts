import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IConvertFarmApplicationResponse,
  IFarmApplicationListQuery,
  IFarmApplicationListResponse,
  IFarmApplicationResponse,
  IFarmApplicationStatsResponse,
  IUpdateFarmApplicationInput,
} from "@/types/inbox.types";
import type { IMessageResponse } from "@/types/auth.types";

/**
 * The super-admin review surface for farming-programme applications
 * (`/admin/farm-applications`). The public submit mutation lives in
 * `public-farm-applications-api.ts`; both share the `FarmApplications` tag.
 * Converting also invalidates `Farmers` - it creates a farmer record.
 */
export const adminFarmApplicationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFarmApplications: builder.query<
      IFarmApplicationListResponse,
      IFarmApplicationListQuery | void
    >({
      query: (params) => `admin/farm-applications${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "FarmApplications" as const, id: "LIST" },
              ...result.data.map((a) => ({
                type: "FarmApplications" as const,
                id: a.id,
              })),
            ]
          : [{ type: "FarmApplications" as const, id: "LIST" }],
    }),

    getFarmApplicationStats: builder.query<IFarmApplicationStatsResponse, void>({
      query: () => "admin/farm-applications/stats",
      providesTags: [{ type: "FarmApplications", id: "STATS" }],
    }),

    getFarmApplication: builder.query<IFarmApplicationResponse, string>({
      query: (id) => `admin/farm-applications/${id}`,
      providesTags: (_r, _e, id) => [{ type: "FarmApplications", id }],
    }),

    updateFarmApplication: builder.mutation<
      IFarmApplicationResponse,
      { id: string; body: IUpdateFarmApplicationInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/farm-applications/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "FarmApplications", id },
        { type: "FarmApplications", id: "LIST" },
        { type: "FarmApplications", id: "STATS" },
      ],
    }),

    convertFarmApplication: builder.mutation<
      IConvertFarmApplicationResponse,
      string
    >({
      query: (id) => ({
        url: `admin/farm-applications/${id}/convert`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "FarmApplications", id },
        { type: "FarmApplications", id: "LIST" },
        { type: "FarmApplications", id: "STATS" },
        { type: "Farmers", id: "LIST" },
      ],
    }),

    deleteFarmApplication: builder.mutation<IMessageResponse, string>({
      query: (id) => ({
        url: `admin/farm-applications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "FarmApplications", id: "LIST" },
        { type: "FarmApplications", id: "STATS" },
      ],
    }),
  }),
});

export const {
  useGetFarmApplicationsQuery,
  useGetFarmApplicationStatsQuery,
  useGetFarmApplicationQuery,
  useUpdateFarmApplicationMutation,
  useConvertFarmApplicationMutation,
  useDeleteFarmApplicationMutation,
} = adminFarmApplicationsApi;
