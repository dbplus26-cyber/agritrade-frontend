import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IBlogComment,
  IBlogCommentListResponse,
  ILikeStatus,
} from "@/types/blog.types";

/**
 * Anonymous reader engagement. The backend keys every like and comment to a
 * signed, httpOnly guest cookie (the api slice already sends credentials).
 * Comments and likes are read live; the article itself is ISR-cached.
 */
export const blogPublicApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPostComments: builder.query<
      IBlogCommentListResponse,
      { slug: string; page?: number; sort?: "newest" | "oldest" }
    >({
      query: ({ slug, ...params }) =>
        `public/blog/posts/${slug}/comments${toQueryString(params)}`,
      providesTags: (_r, _e, { slug }) => [{ type: "BlogComments", id: slug }],
    }),

    createPostComment: builder.mutation<
      { data: { comment: IBlogComment } },
      {
        slug: string;
        content: string;
        authorName?: string;
        turnstileToken?: string;
        website?: string;
      }
    >({
      query: ({ slug, ...body }) => ({
        url: `public/blog/posts/${slug}/comments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { slug }) => [
        { type: "BlogComments", id: slug },
      ],
    }),

    getPostLike: builder.query<{ data: ILikeStatus }, string>({
      query: (slug) => `public/blog/posts/${slug}/like`,
    }),

    togglePostLike: builder.mutation<{ data: ILikeStatus }, string>({
      query: (slug) => ({
        url: `public/blog/posts/${slug}/like`,
        method: "POST",
      }),
      // Write the server's answer straight into the status query.
      async onQueryStarted(slug, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: null }));
        if (!data) return;
        dispatch(blogPublicApi.util.upsertQueryData("getPostLike", slug, data));
      },
    }),

    toggleCommentLike: builder.mutation<
      { data: ILikeStatus },
      { commentId: string; slug: string }
    >({
      query: ({ commentId }) => ({
        url: `public/blog/comments/${commentId}/like`,
        method: "POST",
      }),
    }),
  }),
});

export const {
  useCreatePostCommentMutation,
  useGetPostCommentsQuery,
  useGetPostLikeQuery,
  useToggleCommentLikeMutation,
  useTogglePostLikeMutation,
} = blogPublicApi;
