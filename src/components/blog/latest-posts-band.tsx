import Link from "next/link";
import { PostCard } from "@/components/blog/post-card";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { fetchBlogPosts } from "@/lib/public-blog";
import { routes } from "@/lib/routes";

/** The three newest articles on the home page; nothing when there are none. */
export async function LatestPostsBand() {
  const latest = await fetchBlogPosts({ limit: 3 });
  if (!latest || latest.posts.length === 0) return null;
  return (
    <section className="texture-grain bg-surface py-14 lg:py-[88px]">
      <div className="mx-auto max-w-[1312px] px-5 lg:px-8">
        <Reveal>
          <div className="mb-9 flex flex-col gap-4 lg:mb-12 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <SectionHeading
              eyebrow="FROM THE BLOG"
              title="Notes from the grain trade."
            />
            <Link
              href={routes.blog}
              className="w-fit text-[14px] font-bold text-forest underline decoration-harvest decoration-2 underline-offset-4 transition-colors hover:text-harvest-deep"
            >
              All articles →
            </Link>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
            {latest.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
