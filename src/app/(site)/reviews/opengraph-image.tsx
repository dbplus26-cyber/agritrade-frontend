import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-template";

export const alt = "DB Plus reviews - every one tied to a transaction on record";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function ReviewsOpengraphImage() {
  return brandOgImage({
    eyebrow: "Reviews · Verified by transaction",
    title: "Buyers on record.",
    subtitle:
      "Every review here is tied to a real sale, purchase or grant in our books.",
    cta: "Read the reviews →",
  });
}
