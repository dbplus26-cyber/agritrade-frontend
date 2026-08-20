"use client";

import { HelpCircle } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A short explanation of what something in the console is or does.
 *
 * The people running this system are not software people. A screen full of
 * unexplained nouns - float, milestone, allocation, reconciliation, basis - is
 * readable to whoever built it and opaque to whoever has to use it at seven in
 * the morning. So the vocabulary explains itself in place, one hover at a time.
 *
 * Rules this component exists to keep:
 *
 * - ONE SENTENCE. If it needs a paragraph the screen needs better labels, not
 *   a longer tooltip. Anything past roughly 140 characters is a sign the
 *   explanation belongs in the page's own copy.
 * - Say what it IS or what it DOES, in the reader's words, never in the
 *   schema's. "Money you have given an agent to buy with" beats "the agent's
 *   spending allocation balance".
 * - Never put the value itself in here. Truncated values are handled by the
 *   table cells (see table-cells.tsx); this is for meaning, not for content.
 *
 * It carries its own TooltipProvider so it works anywhere without depending on
 * some ancestor having mounted one. Nested providers are cheap and the
 * alternative is a component that silently renders nothing when it is used on
 * a page somebody forgot to wrap.
 *
 * The trigger is a real `<button type="button">`, which matters twice over: it
 * is reachable by keyboard and it opens on focus, so this is not a
 * mouse-only affordance; and the explicit type stops it submitting the form it
 * so often sits inside. The click handler stops the event dead so a help icon
 * inside a clickable table row explains the row instead of navigating away
 * from it.
 */
export function HelpTip({
  className,
  inLabel = false,
  label,
  side = "top",
  text,
}: {
  className?: string;
  /**
   * True when this tip sits INSIDE a `<label>` that implicitly labels its
   * control (AdminField). A `<button>` there is fatal twice over: implicit
   * association binds a label to its FIRST labelable descendant, so the
   * label named the help icon and the field lost its name; and any
   * aria-label echoing the field label made two elements answer to it. So
   * in-label the trigger is a plain aria-hidden span - a pointer-and-touch
   * affordance only - and the CALLER must expose the same text to assistive
   * tech on the control itself (AdminField wires it via aria-describedby,
   * exactly as it does the error).
   */
  inLabel?: boolean;
  /**
   * Screen-reader name. Defaults to naming the thing being explained, which
   * is better than every help icon on the page announcing itself as "help".
   */
  label?: string;
  side?: "bottom" | "left" | "right" | "top";
  text: string;
}) {
  const triggerClass = cn(
    "inline-flex size-4 flex-none cursor-help items-center justify-center rounded-full align-middle text-adm-faint transition-colors hover:text-console focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console",
    className,
  );
  const stop = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {inLabel ? (
            <span aria-hidden="true" className={triggerClass} onClick={stop}>
              <HelpCircle className="size-3.5" />
            </span>
          ) : (
            <button
              aria-label={label ?? `What is this? ${text}`}
              className={triggerClass}
              onClick={stop}
              type="button"
            >
              <HelpCircle aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[16rem] text-[12px] leading-[1.45]"
          side={side}
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * The same explanation attached to something that is already on screen - a
 * status pill, a figure, a column heading - rather than to an icon beside it.
 *
 * Use this when adding an icon would clutter a dense row. Use HelpTip when the
 * thing being explained is a word the reader may not know, because there the
 * icon is the affordance that says "there is an explanation here at all".
 */
export function HelpWrap({
  children,
  className,
  side = "top",
  text,
}: {
  children: React.ReactNode;
  className?: string;
  side?: "bottom" | "left" | "right" | "top";
  text: string;
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* tabIndex puts the explanation in the tab order - a span trigger
              is otherwise pointer-only, and Radix opens the tooltip on focus,
              so this one attribute is the whole keyboard path. */}
          <span className={cn("cursor-help", className)} tabIndex={0}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-[16rem] text-[12px] leading-[1.45]"
          side={side}
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
