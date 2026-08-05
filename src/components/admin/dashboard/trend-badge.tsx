"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ITrend } from "@/types/report.types";

/**
 * A period-over-period trend arrow + percentage. Green reads as "good": for
 * money-in/sales that's an increase, but for cost-like figures (purchases out,
 * expenses) an increase is worse, so pass `inverse` to flip the colour meaning.
 * The arrow direction always follows the actual movement; only colour flips.
 */
export function TrendBadge({
  trend,
  inverse = false,
  className,
}: {
  className?: string;
  inverse?: boolean;
  trend: ITrend;
}) {
  const { direction, percentage } = trend;

  if (direction === "neutral") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-adm-faint",
          className,
        )}
      >
        <Minus className="h-3 w-3" aria-hidden="true" />
        0%
      </span>
    );
  }

  const isUp = direction === "up";
  // "Good" when up (or down while inverted). Green good, red bad.
  const good = inverse ? !isUp : isUp;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11.5px] font-semibold",
        good ? "text-console" : "text-console-red",
        className,
      )}
      title="vs the previous period of equal length"
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {Math.abs(percentage)}%
    </span>
  );
}
