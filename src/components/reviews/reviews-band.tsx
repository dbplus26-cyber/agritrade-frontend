import Link from "next/link";
import { ReviewCard } from "@/components/reviews/review-card";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { fetchPublicReviews } from "@/lib/public-reviews";
import { routes } from "@/lib/routes";

/** How many reviews the home band shows - one row of three on desktop; the
 * full set lives on /reviews. */
const BAND_LIMIT = 3;

/**
 * The word-of-mouth band for the home page. Honest by design: with no
 * approved reviews on file (or the API down) it renders nothing at all -
 * never stand-in testimonials. When it renders, a quiet link invites past
 * customers to the /reviews page to leave their own.
 */
export async function ReviewsBand() {
  const reviews = await fetchPublicReviews(BAND_LIMIT);
  if (!reviews || reviews.length === 0) return null;

  return (
    // Alternate ground + a closing ledger rule so the band reads as its own
    // section against the CTA that follows on the same surface tone.
    <section className="texture-grain bg-surface-alt py-14 lg:py-[88px]">
      <div className="mx-auto max-w-[1312px] px-5 lg:px-8">
        <Reveal>
          <div className="mb-9 flex flex-col gap-4 lg:mb-12 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <SectionHeading
              eyebrow="WORD OF MOUTH"
              title="What people say about dealing with us."
            />
            <Link
              href={routes.reviews}
              className="w-fit text-[14px] font-bold text-forest underline decoration-harvest decoration-2 underline-offset-4 transition-colors hover:text-harvest-deep"
            >
              Been our customer? Leave a review →
            </Link>
          </div>
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {reviews.slice(0, BAND_LIMIT).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
