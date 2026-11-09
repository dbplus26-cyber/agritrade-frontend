import {
  brandOgImage,
  fetchOgPhoto,
  OG_CONTENT_TYPE,
  OG_SIZE,
} from "@/lib/og-template";
import { fetchBlogPost } from "@/lib/public-blog";

export const alt = "An article on the DB Plus blog";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/** Per-article share card; an unknown slug falls back to the blog card. */
export default async function BlogPostOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (!post) {
    return brandOgImage({
      eyebrow: "Blog · Field notes",
      title: "Notes from the grain trade.",
      subtitle: "Market notes, farming advice and news from Tamale.",
      cta: "Read the blog →",
    });
  }
  return brandOgImage({
    eyebrow: `Blog${post.category ? ` · ${post.category.name}` : ""}`,
    title: post.title,
    subtitle: `${String(post.readMinutes)} min read`,
    cta: "Read the article →",
    photo: await fetchOgPhoto(post.coverImage),
  });
}
