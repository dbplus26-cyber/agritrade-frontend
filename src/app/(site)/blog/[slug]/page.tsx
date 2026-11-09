import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentsSection } from "@/components/blog/comments-section";
import { PostMeta } from "@/components/blog/post-card";
import { LikeButton, ShareBar } from "@/components/blog/post-engagement";
import { Photo } from "@/components/ui/Photo";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { fetchBlogPost } from "@/lib/public-blog";
import { routes } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { siteConfig, siteUrl } from "@/lib/site";

/** One article. Cached under the `blog` tag with the register; likes and
 * comments are read live in the browser. */
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (!post) {
    return pageMetadata({
      title: "Article not found",
      description: "This article is not on the DB Plus blog.",
      path: routes.blogPost(slug),
      index: false,
    });
  }
  // No `image`: the sibling opengraph-image.tsx draws the share card.
  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: routes.blogPost(post.slug),
    keywords: [
      ...(post.category ? [post.category.name] : []),
      ...post.tags.map((t) => t.name),
    ],
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await fetchBlogPost(slug);
  if (!post) notFound();
  const url = `${siteUrl}${routes.blogPost(post.slug)}`;

  // Article structured data; JSON (not script), so CSP has nothing to run.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    ...(post.coverImage ? { image: [post.coverImage] } : {}),
    datePublished: post.publishedAt ?? post.createdAt,
    dateModified: post.updatedAt,
    author: { "@type": "Person", name: post.author.name },
    publisher: { "@type": "Organization", name: siteConfig.legalName },
    mainEntityOfPage: url,
  };

  return (
    <div className="texture-grain bg-surface">
      <script
        type="application/ld+json"
        // `<` escaped so a title can never close the script element.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <article className="mx-auto max-w-[780px] px-5 pb-16 pt-8 lg:px-0 lg:pb-24 lg:pt-14">
        <Link
          href={routes.blog}
          className="stencil mb-6 inline-flex min-h-[44px] items-center text-[11px] tracking-[0.2em] text-forest hover:text-harvest-deep"
        >
          ← ALL ARTICLES
        </Link>
        <header className="mb-7">
          {post.category ? (
            <Link
              href={`${routes.blog}?category=${encodeURIComponent(post.category.slug)}`}
              className="mb-3 inline-block"
            >
              <StencilLabel className="text-[11px] tracking-[0.24em] lg:text-[12px]">
                {post.category.name.toUpperCase()}
              </StencilLabel>
            </Link>
          ) : null}
          <h1 className="mb-4 font-display text-[30px] font-bold leading-[1.1] tracking-[-0.01em] text-forest [overflow-wrap:anywhere] lg:text-[46px] lg:leading-[1.05]">
            {post.title}
          </h1>
          <p className="mb-4 text-[16px] leading-[1.65] text-soil lg:text-[18px]">
            {post.excerpt}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-dotted border-soil/40 py-3 text-[13px]">
            <span className="font-bold text-forest">By {post.author.name}</span>
            <PostMeta post={post} className="text-[13px]" />
          </div>
        </header>

        {post.coverImage ? (
          <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden border border-soil/35">
            <Photo
              src={post.coverImage}
              alt=""
              fill
              loading="eager"
              sizes="(min-width: 800px) 780px, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}

        <div
          className="blog-prose"
          // Sanitized by the backend at write (allow-listed tags, https-only
          // images, no scripts or event handlers).
          dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
        />

        {post.tags.length > 0 ? (
          <ul aria-label="Tags" className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <li key={t.id} className="max-w-full">
                <Link
                  href={`${routes.blog}?tag=${encodeURIComponent(t.slug)}`}
                  className="inline-flex min-h-[36px] max-w-full items-center rounded-[2px] border-[1.5px] border-forest/35 px-3 text-[13px] font-medium text-forest hover:bg-forest/5 [overflow-wrap:anywhere]"
                >
                  #{t.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 flex flex-col gap-4 border-t-[1.5px] border-soil/50 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <LikeButton slug={post.slug} initialCount={post.likeCount} />
          <ShareBar title={post.title} url={url} />
        </div>

        <div className="mt-12">
          <CommentsSection slug={post.slug} initialCount={post.commentCount} />
        </div>
      </article>
    </div>
  );
}
