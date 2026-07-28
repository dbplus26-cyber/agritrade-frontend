import { apiSlice } from "../api-slice";
import type {
  ISubmitPublicReviewInput,
  ISubmitPublicReviewResponse,
} from "@/types/public-review.types";

/**
 * The public "leave a review" mutation. Submissions are moderated, so a 201
 * only means "received" - the review appears on the site once the office
 * approves it. Invalidating `Reviews` keeps any admin moderation list in
 * this store fresh; admin review queries live in their own file.
 */
export const publicReviewsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    submitPublicReview: builder.mutation<
      ISubmitPublicReviewResponse,
      ISubmitPublicReviewInput
    >({
      query: (body) => ({ url: "public/reviews", method: "POST", body }),
      invalidatesTags: ["Reviews"],
    }),
  }),
});

export const { useSubmitPublicReviewMutation } = publicReviewsApi;
