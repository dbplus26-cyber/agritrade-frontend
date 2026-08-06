import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The empty folder illustration the registers share, in warm palette inks. */
function EmptyFolder({ className }: { className?: string }) {
  return (
    <svg
      width="60"
      height="52"
      viewBox="0 0 72 60"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M22 14 L50 14 L54 22 L54 50 Q54 54 50 54 L22 54 Q18 54 18 50 L18 22 Z"
        stroke="#CFC9B6"
        strokeWidth="1.6"
        fill="none"
      />
      <path d="M18 22 L54 22" stroke="#CFC9B6" strokeWidth="1.6" />
      <path
        d="M28 33 Q36 40 44 33"
        stroke="#B3AB92"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/**
 * "Nothing on file" - the empty document tray.
 *
 * `card` (default): the style guide's dashed file card with a stencil header,
 * for page-level empties. `plain`: the registers' inline folder - no
 * container - for use INSIDE a data-table card (the purchases-register
 * shape).
 */
export function EmptyState({
  variant = "card",
  title = "Nothing on file yet",
  description = "When something is recorded it will be filed here.",
  actionLabel,
  onAction,
  className,
}: {
  variant?: "card" | "plain";
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  if (variant === "plain") {
    return (
      <div className={cn("w-full min-w-0 px-6 py-14 text-center", className)}>
        <EmptyFolder className="mx-auto mb-3.5" />
        <div className="mb-1 break-words text-[15px] font-bold [color:var(--state-title)]">
          {title}
        </div>
        <p className="mx-auto mb-0 max-w-[42ch] break-words text-[13.5px] leading-[1.6] [color:var(--state-body)]">
          {description}
        </p>
        {actionLabel && onAction ? (
          <Button onClick={onAction} variant="outline" className="mt-5 h-9 px-4 text-[13px]">
            {actionLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col items-center justify-center px-3 py-10 text-center sm:px-6 sm:py-16",
        className,
      )}
    >
      <div className="w-[min(420px,100%)] min-w-0 border px-4 py-8 [border-color:var(--state-frame)] [border-radius:var(--state-radius)] [border-style:var(--state-frame-style)] [box-shadow:var(--state-shadow)] [background:var(--state-ground)] sm:px-8 sm:py-10">
        <span className="stencil mb-6 inline-block border-b border-dotted border-soil/40 pb-2 text-[10px] tracking-[0.28em] [color:var(--state-caption)]">
          File empty
        </span>
        <EmptyFolder className="mx-auto mb-4" />
        <h3 className="mb-2 break-words font-display text-[17px] font-semibold [color:var(--state-title)] sm:text-[19px]">
          {title}
        </h3>
        <p className="mx-auto mb-0 max-w-[38ch] break-words text-[13px] leading-[1.65] [color:var(--state-body)] sm:text-[13.5px]">
          {description}
        </p>
        {actionLabel && onAction ? (
          <Button onClick={onAction} className="mt-6">
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
