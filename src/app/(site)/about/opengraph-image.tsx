import { brandOgImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-template";

export const alt =
  "About DB Plus - the yard, the scales and the people behind the trade";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function AboutOpengraphImage() {
  return brandOgImage({
    eyebrow: "The company · Tamale, Northern Region",
    title: "Weighed honestly.",
    subtitle: "The yard, the scales and the people behind DB Plus.",
    cta: "Meet the company →",
  });
}
