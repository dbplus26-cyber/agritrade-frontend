"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stamp } from "@/components/ui/Stamp";
import { cn } from "@/lib/utils";

/**
 * The failed-document error state: a ruled paper sheet wearing a red
 * "NOT PROCESSED" stamp, with the human explanation and a retry.
 * Pairs with `extractApiError(error).message` for the description.
 */
export function ErrorMessage({
  title = "That didn't go through",
  description = "Something went wrong on our side. Try again - if it keeps failing, call the office.",
  onRetry,
  retryLabel = "Try again",
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      <div className="shadow-doc w-[min(440px,100%)] border border-soil/35 bg-paper px-8 pb-9 pt-7">
        <div
          aria-hidden="true"
          className="relative mb-6 h-[104px] bg-[repeating-linear-gradient(180deg,transparent_0px,transparent_25px,rgb(89_82_59/0.25)_25px,rgb(89_82_59/0.25)_26px)]"
        >
          <Stamp
            tone="error"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
          >
            Not processed
          </Stamp>
        </div>
        <h3 className="break-words mb-2 font-display text-[20px] font-bold text-forest">
          {title}
        </h3>
        <p className="break-words mx-auto max-w-[40ch] text-[13.5px] leading-[1.65] text-soil">
          {description}
        </p>
        {onRetry ? (
          <Button onClick={onRetry} variant="outline" className="mt-6">
            <RefreshCw aria-hidden="true" data-slot="icon" />
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
