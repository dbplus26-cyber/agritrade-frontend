import { z } from "zod";
import {
  BLOG_COMMENT_MAX,
  BLOG_COMMENT_NAME_MAX,
  BLOG_EXCERPT_MAX,
  BLOG_TAGS_MAX,
  BLOG_TITLE_MAX,
} from "@/lib/limits";

/** Public comment form. Mirrors the backend's `createCommentSchema`. */
export const commentSchema = z.object({
  authorName: z
    .string()
    .trim()
    .max(BLOG_COMMENT_NAME_MAX, "Please keep your name shorter."),
  content: z
    .string()
    .trim()
    .min(1, "Write a comment first.")
    .max(
      BLOG_COMMENT_MAX,
      `Please keep it under ${String(BLOG_COMMENT_MAX)} characters.`,
    ),
  website: z.string().optional(),
});
export type CommentValues = z.infer<typeof commentSchema>;

/** The console's post form. Mirrors `createPostSchema`. */
export const postSchema = z.object({
  categoryId: z.string(),
  content: z
    .string()
    .refine(
      (html) =>
        /<img\b/i.test(html) ||
        html.replace(/<[^>]*>|&nbsp;/g, "").trim().length > 0,
      "Write the article first.",
    ),
  excerpt: z
    .string()
    .trim()
    .min(1, "Add a short summary for the blog list and search results.")
    .max(
      BLOG_EXCERPT_MAX,
      `Keep it under ${String(BLOG_EXCERPT_MAX)} characters.`,
    ),
  isFeatured: z.boolean(),
  tagIds: z
    .array(z.string())
    .max(BLOG_TAGS_MAX, `Up to ${String(BLOG_TAGS_MAX)} tags.`),
  title: z
    .string()
    .trim()
    .min(1, "Give the post a title.")
    .max(BLOG_TITLE_MAX, `Keep it under ${String(BLOG_TITLE_MAX)} characters.`),
});
export type PostValues = z.infer<typeof postSchema>;
