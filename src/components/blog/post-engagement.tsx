"use client";

import { useState } from "react";
import { Check, Heart, Link2 } from "lucide-react";
import { FacebookIcon } from "@/components/ui/SocialIcons";
import { WhatsAppIcon } from "@/components/ui/WhatsAppIcon";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetPostLikeQuery,
  useTogglePostLikeMutation,
} from "@/redux/blog/blog-public-api";

const pill =
  "inline-flex min-h-[44px] items-center gap-2 rounded-[2px] border-[1.5px] px-4 text-[14px] font-bold transition-colors disabled:opacity-60";

/**
 * Like toggle. The article HTML is cached, so the count and "did I like
 * this" are read live; the button shows the server's answer after each click
 * (the backend dedupes per browser).
 */
export function LikeButton({
  slug,
  initialCount,
}: {
  slug: string;
  initialCount: number;
}) {
  const { data } = useGetPostLikeQuery(slug);
  const [toggle, { isLoading }] = useTogglePostLikeMutation();
  const liked = data?.data.liked ?? false;
  const count = data?.data.likeCount ?? initialCount;

  return (
    <button
      type="button"
      aria-pressed={liked}
      disabled={isLoading}
      onClick={() => {
        toggle(slug)
          .unwrap()
          .catch(() => notify.error("Couldn't save that like - try again."));
      }}
      className={cn(
        pill,
        liked
          ? "border-error/60 bg-error/5 text-error"
          : "border-forest/40 text-forest hover:bg-forest/5",
      )}
    >
      <Heart
        className={cn("h-4 w-4", liked && "fill-current")}
        aria-hidden="true"
      />
      {liked ? "Liked" : "Like"}
      <span className="tabular-nums text-[13px] font-semibold opacity-80">
        {count}
      </span>
    </button>
  );
}

/** WhatsApp first: it is how articles actually travel here. */
export function ShareBar({ title, url }: { title: string; url: string }) {
  const [copied, setCopied] = useState(false);
  const text = encodeURIComponent(`${title} ${url}`);
  const link = encodeURIComponent(url);
  const shareLink =
    "inline-flex h-11 w-11 items-center justify-center rounded-[2px] border-[1.5px] border-forest/40 text-forest transition-colors hover:bg-forest/5";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="stencil mr-1 text-[11px] tracking-[0.18em] text-soil">
        SHARE
      </span>
      <a
        href={`https://wa.me/?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className={shareLink}
      >
        <WhatsAppIcon className="h-4 w-4" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${link}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className={shareLink}
      >
        <FacebookIcon className="h-4 w-4" />
      </a>
      <a
        href={`https://x.com/intent/post?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className={cn(shareLink, "text-[15px] font-bold")}
      >
        <span aria-hidden="true">X</span>
      </a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            .writeText(url)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => notify.error("Couldn't copy the link."));
        }}
        aria-label={copied ? "Link copied" : "Copy link"}
        className={shareLink}
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
