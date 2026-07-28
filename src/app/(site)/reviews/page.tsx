import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewForm } from "@/components/reviews/review-form";
import { StencilLabel } from "@/components/ui/StencilLabel";
import { Reveal } from "@/components/ui/Reveal";
import { fetchPublicReviews } from "@/lib/public-reviews";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Reviews",
  description:
    "What buyers, suppliers and farmers say about dealing with DB Plus - every review checked against a real transaction before it goes on record.",
  path: "/reviews",
  keywords: [
    "DB Plus reviews",
    "grain trader reviews Tamale",
    "DB Plus customer feedback",
  ],
});

export default async function ReviewsPage() {
  // Approved reviews only, cached under the `reviews` tag (API caps at 50).
  // None on file (or the API briefly down) renders the honest empty ledger
  // line - never stand-in testimonials.
  const reviews = (await fetchPublicReviews(50)) ?? [];

  return (
    <div className="texture-grain bg-surface">
      <section className="mx-auto max-w-[1312px] px-5 pb-10 pt-10 lg:px-8 lg:pb-14 lg:pt-20">
        <div className="max-w-[900px]">
          <div className="mb-4 flex items-center gap-2.5">
            <span aria-hidden="true" className="h-0.5 w-[22px] bg-harvest" />
            <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
              REVIEWS · WORD OF MOUTH
            </StencilLabel>
          </div>
          <h1 className="mb-4 font-display text-[32px] font-bold leading-[1.1] tracking-[-0.015em] text-forest lg:mb-[18px] lg:text-[52px] lg:leading-[1.05]">
            What people put on record about us.
          </h1>
          <p className="text-[14px] leading-[1.65] text-soil lg:text-[16px] lg:leading-[1.7]">
            Every review here was written by someone who actually dealt with
            us - we match each one to a transaction number before it goes up.
            Been our customer? Add yours below.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1312px] px-5 pb-14 lg:px-8 lg:pb-20">
        {reviews.length === 0 ? (
          <p className="max-w-[52ch] border-t border-dotted border-soil/40 pt-6 text-[14px] leading-[1.65] text-soil lg:text-[15px]">
            No reviews on file yet. If you have traded with us, yours can be
            the first - the form below takes a minute.
          </p>
        ) : (
          <Reveal>
            <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </Reveal>
        )}
      </section>

      {/* Alternate ground marks where reading ends and writing begins. */}
      <section
        id="leave-a-review"
        className="texture-grain bg-surface-alt py-14 lg:py-20"
      >
        <div className="mx-auto max-w-[1312px] px-5 lg:px-8">
        <div className="max-w-[860px]">
          <div className="mb-4 flex items-center gap-2.5">
            <span aria-hidden="true" className="h-0.5 w-[22px] bg-harvest" />
            <StencilLabel className="text-[11px] tracking-[0.3em] lg:text-[12px]">
              LEAVE A REVIEW
            </StencilLabel>
          </div>
          <h2 className="mb-3 font-display text-[26px] font-bold leading-[1.15] text-forest lg:text-[34px]">
            Dealt with us? Put it on record.
          </h2>
          <p className="mb-7 max-w-[56ch] text-[14px] leading-[1.65] text-soil lg:mb-9 lg:text-[15px]">
            You&rsquo;ll need the transaction number from your receipt or
            waybill and the phone number you used - that&rsquo;s how we keep
            the reviews real. Approved reviews appear on this page.
          </p>
          <ReviewForm />
        </div>
        </div>
      </section>
    </div>
  );
}
