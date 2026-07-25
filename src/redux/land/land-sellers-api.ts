import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type { IMessageResponse } from "@/types/auth.types";
import type {
  ICreateLandSellerInput,
  ILandSellerListQuery,
  ILandSellerListResponse,
  ILandSellerResponse,
  IUpdateLandSellerInput,
} from "@/types/land.types";

/** The land-sellers directory, mirroring `/admin/land/sellers` (owner-only). */
export const landSellersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLandSellers: builder.query<
      ILandSellerListResponse,
      ILandSellerListQuery | void
    >({
      query: (params) => `admin/land/sellers${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "LandSellers" as const, id: "LIST" },
              ...result.data.map((s) => ({
                type: "LandSellers" as const,
                id: s.id,
              })),
            ]
          : [{ type: "LandSellers" as const, id: "LIST" }],
    }),

    getLandSeller: builder.query<ILandSellerResponse, string>({
      query: (id) => `admin/land/sellers/${id}`,
      providesTags: (_r, _e, id) => [{ type: "LandSellers", id }],
    }),

    createLandSeller: builder.mutation<
      ILandSellerResponse,
      ICreateLandSellerInput
    >({
      query: (body) => ({ url: "admin/land/sellers", method: "POST", body }),
      invalidatesTags: [{ type: "LandSellers", id: "LIST" }],
    }),

    updateLandSeller: builder.mutation<
      ILandSellerResponse,
      { id: string; body: IUpdateLandSellerInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/land/sellers/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "LandSellers", id },
        { type: "LandSellers", id: "LIST" },
      ],
    }),

    activateLandSeller: builder.mutation<ILandSellerResponse, string>({
      query: (id) => ({
        url: `admin/land/sellers/${id}/activate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "LandSellers", id },
        { type: "LandSellers", id: "LIST" },
      ],
    }),

    deactivateLandSeller: builder.mutation<ILandSellerResponse, string>({
      query: (id) => ({
        url: `admin/land/sellers/${id}/deactivate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "LandSellers", id },
        { type: "LandSellers", id: "LIST" },
      ],
    }),

    deleteLandSeller: builder.mutation<IMessageResponse, string>({
      query: (id) => ({ url: `admin/land/sellers/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "LandSellers", id: "LIST" }],
    }),
  }),
});

export const {
  useActivateLandSellerMutation,
  useCreateLandSellerMutation,
  useDeactivateLandSellerMutation,
  useDeleteLandSellerMutation,
  useGetLandSellerQuery,
  useGetLandSellersQuery,
  useUpdateLandSellerMutation,
} = landSellersApi;
