import Link from "next/link";
import { Photo, PhotoFallback } from "@/components/ui/Photo";
import { formatPostDate } from "@/lib/public-blog";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { IBlogPost } from "@/types/blog.types";

/** "12 March 2026 · 4 min read" */
export function PostMeta({
  post,
  className,
}: {
  post: IBlogPost;
  className?: string;
}) {
  return (
    <p className={cn("text-[12.5px] text-soil", className)}>
      {post.publishedAt ? (
        <time dateTime={post.publishedAt}>
          {formatPostDate(post.publishedAt)}
        </time>
      ) : null}
      {post.publishedAt ? " · " : null}
      {post.readMinutes} min read
    </p>
  );
}

/**
 * One article on the blog register: cover, category eyebrow, title, excerpt
 * and date. The whole card is the link (overlay on the title's anchor), and
 * `featured` lays it out side by side from lg for the lead story.
 */
export function PostCard({
  post,
  featured = false,
}: {
  post: IBlogPost;
  featured?: boolean;
}) {
  return (
    <article
      className={cn(
        "shadow-doc group relative flex h-full min-w-0 flex-col border border-soil/35 bg-paper transition-[transform,box-shadow] duration-150 focus-within:shadow-[3px_3px_0_rgb(31_33_28/0.18)] hover:-translate-y-px hover:shadow-[3px_3px_0_rgb(31_33_28/0.18)]",
        featured && "lg:grid lg:grid-cols-[1.15fr_1fr]",
      )}
    >
      <div
        className={cn(
          "relative aspect-[16/9] w-full overflow-hidden border-b-[1.5px] border-soil/50",
          featured &&
            "lg:aspect-auto lg:min-h-[340px] lg:border-b-0 lg:border-r-[1.5px]",
        )}
      >
        {post.coverImage ? (
          <Photo
            src={post.coverImage}
            alt=""
            fill
            loading={featured ? "eager" : undefined}
            sizes={
              featured
                ? "(min-width: 1024px) 700px, 100vw"
                : "(min-width: 1024px) 420px, (min-width: 640px) 50vw, 100vw"
            }
            className="object-cover"
            fallback={<PhotoFallback className="absolute inset-0" />}
          />
        ) : (
          <PhotoFallback className="absolute inset-0" />
        )}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col px-5 pb-6 pt-5 sm:px-6",
          featured && "lg:justify-center lg:px-10 lg:py-10",
        )}
      >
        <span className="stencil mb-2 min-w-0 line-clamp-1 text-[11px] leading-[1.4] tracking-[0.14em] text-harvest-deep [overflow-wrap:anywhere]">
          {featured ? "FEATURED" : null}
          {featured && post.category ? " · " : null}
          {post.category ? post.category.name.toUpperCase() : null}
          {!featured && !post.category ? "NOTES" : null}
        </span>
        <h3
          className={cn(
            "mb-2 min-w-0 line-clamp-3 font-display font-bold leading-[1.25] text-forest [overflow-wrap:anywhere]",
            featured
              ? "text-[20px] lg:text-[30px] lg:leading-[1.15]"
              : "text-[17px] lg:text-[19px]",
          )}
        >
          <Link
            href={routes.blogPost(post.slug)}
            className="focus-visible:outline-none"
          >
            <span aria-hidden="true" className="absolute inset-0 z-[1]" />
            {post.title}
          </Link>
        </h3>
        <p
          className={cn(
            "mb-4 min-w-0 text-[14px] leading-[1.6] text-ink/85 [overflow-wrap:anywhere]",
            featured ? "line-clamp-4 lg:text-[15.5px]" : "line-clamp-3",
          )}
        >
          {post.excerpt}
        </p>
        <PostMeta post={post} className="mt-auto" />
      </div>
    </article>
  );
}
