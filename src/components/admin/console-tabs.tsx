"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface ConsoleTab<T extends string> {
  value: T;
  label: React.ReactNode;
  /** A count, a badge: sits after the label. */
  trailing?: React.ReactNode;
}

/**
 * The console's tab strip, with a sliding active plate: the highlight
 * glides from the old tab to the new one instead of jumping. Two skins -
 * `segmented` (a sunken tray, used for views and statuses) and `solid`
 * (free-standing bordered tabs, used for page sections).
 */
export function ConsoleTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  variant = "segmented",
  className,
}: {
  tabs: readonly ConsoleTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the tablist. */
  label: string;
  variant?: "segmented" | "solid";
  className?: string;
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        variant === "segmented"
          ? "flex w-fit max-w-full gap-[3px] bg-adm-sunken p-[3px]"
          : "flex gap-1.5",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative flex cursor-pointer items-center gap-1.5 whitespace-nowrap px-3.5 text-[11.5px] font-semibold transition-colors",
              variant === "segmented" ? "h-[30px]" : "h-[34px] border",
              variant === "solid" &&
                (active
                  ? "border-console"
                  : "border-adm-line bg-adm-card hover:border-console/60"),
              active ? "text-white" : "text-adm-muted hover:text-adm-ink",
            )}
          >
            {active ? (
              <motion.span
                layoutId={`${id}-plate`}
                aria-hidden="true"
                className="absolute inset-0 bg-console"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            ) : null}
            <span className="relative">{tab.label}</span>
            {tab.trailing ? (
              <span className="relative">{tab.trailing}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
