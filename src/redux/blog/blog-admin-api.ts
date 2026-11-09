import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IBlogComment,
  IBlogCommentListResponse,
  IBlogPostInput,
  IBlogPostListQuery,
  IBlogPostListResponse,
  IBlogPostResponse,
  IBlogTaxonomyWithCount,
} from "@/types/blog.types";

type TaxonomyKind = "categories" | "tags";

/** Multipart when a cover file rides along; plain JSON otherwise. */
const postBody = (body: IBlogPostInput, cover?: File) => {
  if (!cover) return body;
  const form = new FormData();
  form.append("payload", JSON.stringify(body));
  form.append("coverImage", cover);
  return form;
};

/** The blog console, mirroring `/admin/blog` (BLOG_MANAGE). */
export const blogAdminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBlogPosts: builder.query<IBlogPostListResponse, IBlogPostListQuery>({
      query: (params) => `admin/blog/posts${toQueryString(params)}`,
      providesTags: (result) => [
        { type: "BlogPosts" as const, id: "LIST" },
        ...(result?.data ?? []).map((p) => ({
          type: "BlogPosts" as const,
          id: p.id,
        })),
      ],
    }),

    getBlogPost: builder.query<IBlogPostResponse, string>({
      query: (id) => `admin/blog/posts/${id}`,
      providesTags: (_r, _e, id) => [{ type: "BlogPosts", id }],
    }),

    createBlogPost: builder.mutation<
      IBlogPostResponse,
      { body: IBlogPostInput; cover?: File }
    >({
      query: ({ body, cover }) => ({
        url: "admin/blog/posts",
        method: "POST",
        body: postBody(body, cover),
      }),
      invalidatesTags: [
        { type: "BlogPosts", id: "LIST" },
        { type: "BlogTaxonomy", id: "LIST" },
      ],
    }),

    updateBlogPost: builder.mutation<
      IBlogPostResponse,
      { id: string; body: IBlogPostInput; cover?: File }
    >({
      query: ({ id, body, cover }) => ({
        url: `admin/blog/posts/${id}`,
        method: "PATCH",
        body: postBody(body, cover),
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "BlogPosts", id },
        { type: "BlogPosts", id: "LIST" },
        { type: "BlogTaxonomy", id: "LIST" },
      ],
    }),

    deleteBlogPost: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `admin/blog/posts/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "BlogPosts", id },
        { type: "BlogPosts", id: "LIST" },
        { type: "BlogTaxonomy", id: "LIST" },
      ],
    }),

    /** Inline editor image; resolves to its hosted URL. */
    uploadBlogImage: builder.mutation<{ data: { url: string } }, Blob>({
      query: (file) => {
        const form = new FormData();
        form.append("image", file, file instanceof File ? file.name : "image");
        return { url: "admin/blog/images", method: "POST", body: form };
      },
    }),

    getBlogTaxonomy: builder.query<IBlogTaxonomyWithCount[], TaxonomyKind>({
      query: (kind) => `admin/blog/${kind}`,
      transformResponse: (res: {
        data: Record<string, IBlogTaxonomyWithCount[]>;
      }) => Object.values(res.data)[0] ?? [],
      providesTags: [{ type: "BlogTaxonomy", id: "LIST" }],
    }),

    saveBlogTaxonomy: builder.mutation<
      unknown,
      { kind: TaxonomyKind; id?: string; name: string }
    >({
      query: ({ kind, id, name }) => ({
        url: id ? `admin/blog/${kind}/${id}` : `admin/blog/${kind}`,
        method: id ? "PATCH" : "POST",
        body: { name },
      }),
      invalidatesTags: [
        { type: "BlogTaxonomy", id: "LIST" },
        { type: "BlogPosts", id: "LIST" },
      ],
    }),

    deleteBlogTaxonomy: builder.mutation<
      unknown,
      { kind: TaxonomyKind; id: string }
    >({
      query: ({ kind, id }) => ({
        url: `admin/blog/${kind}/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "BlogTaxonomy", id: "LIST" },
        { type: "BlogPosts", id: "LIST" },
      ],
    }),

    getBlogComments: builder.query<
      IBlogCommentListResponse,
      {
        page?: number;
        limit?: number;
        postId?: string;
        status?: "visible" | "flagged";
      }
    >({
      query: (params) => `admin/blog/comments${toQueryString(params)}`,
      providesTags: [{ type: "BlogComments", id: "LIST" }],
    }),

    replyToBlogComment: builder.mutation<
      { data: { comment: IBlogComment } },
      { id: string; content: string }
    >({
      query: ({ id, content }) => ({
        url: `admin/blog/comments/${id}/replies`,
        method: "POST",
        body: { content },
      }),
      invalidatesTags: [{ type: "BlogComments", id: "LIST" }],
    }),

    editBlogComment: builder.mutation<
      { data: { comment: IBlogComment } },
      { id: string; content: string }
    >({
      query: ({ id, content }) => ({
        url: `admin/blog/comments/${id}`,
        method: "PATCH",
        body: { content },
      }),
      invalidatesTags: [{ type: "BlogComments", id: "LIST" }],
    }),

    flagBlogComment: builder.mutation<
      { data: { comment: IBlogComment } },
      { id: string; flagged: boolean }
    >({
      query: ({ id, flagged }) => ({
        url: `admin/blog/comments/${id}/flag`,
        method: "PATCH",
        body: { flagged },
      }),
      invalidatesTags: [
        { type: "BlogComments", id: "LIST" },
        { type: "BlogPosts", id: "LIST" },
      ],
    }),

    deleteBlogComment: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `admin/blog/comments/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "BlogComments", id: "LIST" },
        { type: "BlogPosts", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useCreateBlogPostMutation,
  useDeleteBlogCommentMutation,
  useDeleteBlogPostMutation,
  useDeleteBlogTaxonomyMutation,
  useEditBlogCommentMutation,
  useFlagBlogCommentMutation,
  useGetBlogCommentsQuery,
  useGetBlogPostQuery,
  useGetBlogPostsQuery,
  useGetBlogTaxonomyQuery,
  useReplyToBlogCommentMutation,
  useSaveBlogTaxonomyMutation,
  useUpdateBlogPostMutation,
  useUploadBlogImageMutation,
} = blogAdminApi;
