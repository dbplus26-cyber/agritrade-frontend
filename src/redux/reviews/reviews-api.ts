import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IAdminReviewListResponse,
  IAdminReviewResponse,
  ICreateAdminReviewInput,
  IReviewListQuery,
  IReviewStatsResponse,
} from "@/types/inbox.types";
import type { IMessageResponse } from "@/types/auth.types";

/**
 * The review moderation console (`/admin/reviews`): queue, stats, decisions
 * and office-recorded reviews. The public "leave a review" mutation lives in
 * `public-reviews-api.ts`; both share the `Reviews` tag, so a public
 * submission refreshes the moderation queue automatically.
 */
export const adminReviewsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAdminReviews: builder.query<
      IAdminReviewListResponse,
      IReviewListQuery | void
    >({
      query: (params) => `admin/reviews${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Reviews" as const, id: "LIST" },
              ...result.data.map((r) => ({
                type: "Reviews" as const,
                id: r.id,
              })),
            ]
          : [{ type: "Reviews" as const, id: "LIST" }],
    }),

    getReviewStats: builder.query<IReviewStatsResponse, void>({
      query: () => "admin/reviews/stats",
      providesTags: [{ type: "Reviews", id: "STATS" }],
    }),

    getAdminReview: builder.query<IAdminReviewResponse, string>({
      query: (id) => `admin/reviews/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Reviews", id }],
    }),

    publishReview: builder.mutation<IAdminReviewResponse, string>({
      query: (id) => ({ url: `admin/reviews/${id}/publish`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Reviews", id },
        { type: "Reviews", id: "LIST" },
        { type: "Reviews", id: "STATS" },
      ],
    }),

    rejectReview: builder.mutation<IAdminReviewResponse, string>({
      query: (id) => ({ url: `admin/reviews/${id}/reject`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Reviews", id },
        { type: "Reviews", id: "LIST" },
        { type: "Reviews", id: "STATS" },
      ],
    }),

    createAdminReview: builder.mutation<
      IAdminReviewResponse,
      ICreateAdminReviewInput
    >({
      query: (body) => ({ url: "admin/reviews", method: "POST", body }),
      invalidatesTags: [
        { type: "Reviews", id: "LIST" },
        { type: "Reviews", id: "STATS" },
      ],
    }),

    deleteReview: builder.mutation<IMessageResponse, string>({
      query: (id) => ({ url: `admin/reviews/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Reviews", id: "LIST" },
        { type: "Reviews", id: "STATS" },
      ],
    }),
  }),
});

export const {
  useGetAdminReviewsQuery,
  useGetReviewStatsQuery,
  useGetAdminReviewQuery,
  usePublishReviewMutation,
  useRejectReviewMutation,
  useCreateAdminReviewMutation,
  useDeleteReviewMutation,
} = adminReviewsApi;
