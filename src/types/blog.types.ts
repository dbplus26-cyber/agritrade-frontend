import type { IPaginationMeta } from "./api";

/** Mirrors the backend blog DTOs (`utils/mappers/blog.mapper.ts`). */
export interface IBlogTaxonomy {
  id: string;
  name: string;
  slug: string;
}

export interface IBlogTaxonomyWithCount extends IBlogTaxonomy {
  postCount: number;
}

export interface IBlogPost {
  author: { name: string; profilePicture: string | null };
  category: IBlogTaxonomy | null;
  commentCount: number;
  /** Sanitized HTML; present on single-post reads only. */
  content?: string;
  coverImage: string | null;
  createdAt: string;
  excerpt: string;
  id: string;
  isFeatured: boolean;
  isPublished: boolean;
  likeCount: number;
  publishedAt: string | null;
  readMinutes: number;
  slug: string;
  tags: IBlogTaxonomy[];
  title: string;
  updatedAt: string;
}

export interface IBlogComment {
  authorName: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  flaggedAt: string | null;
  id: string;
  isStaff: boolean;
  liked: boolean;
  likeCount: number;
  post?: { id: string; slug: string; title: string };
  postId: string;
  replies?: IBlogComment[];
}

export interface IBlogPostListResponse {
  data: IBlogPost[];
  message: string;
  meta: IPaginationMeta;
}

export interface IBlogPostResponse {
  data: { post: IBlogPost };
  message: string;
}

export interface IBlogCommentListResponse {
  data: IBlogComment[];
  message: string;
  meta: IPaginationMeta;
}

export interface IBlogPostListQuery {
  categoryId?: string;
  featured?: boolean;
  limit?: number;
  page?: number;
  search?: string;
  status?: "draft" | "published";
  tagId?: string;
}

/** Create/update body. Sent as JSON, or as multipart `payload` + `coverImage`. */
export interface IBlogPostInput {
  categoryId?: string | null;
  content?: string;
  excerpt?: string;
  isFeatured?: boolean;
  isPublished?: boolean;
  removeCover?: boolean;
  tagIds?: string[];
  title?: string;
}

export interface ILikeStatus {
  liked: boolean;
  likeCount: number;
}
