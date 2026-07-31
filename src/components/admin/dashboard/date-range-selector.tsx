"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { IReportWindow } from "@/types/report.types";

/** yyyy-mm-dd in local time (Ghana is UTC, so this matches the server window). */
const ymd = (d: Date): string =>
  `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export type RangePreset =
  | "custom"
  | "last7"
  | "last30"
  | "lastMonth"
  | "thisMonth"
  | "thisQuarter"
  | "thisYear";

const PRESETS: { label: string; value: RangePreset }[] = [
  { label: "Last 7 days", value: "last7" },
  { label: "Last 30 days", value: "last30" },
  { label: "This month", value: "thisMonth" },
  { label: "Last month", value: "lastMonth" },
  { label: "This quarter", value: "thisQuarter" },
  { label: "This year", value: "thisYear" },
  { label: "Custom", value: "custom" },
];

export const DEFAULT_PRESET: RangePreset = "last30";

/** Resolve a preset to a concrete from/to window (custom yields an empty one). */
export const rangeForPreset = (preset: RangePreset): IReportWindow => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = (d: Date): IReportWindow => ({ from: ymd(d), to: ymd(today) });

  switch (preset) {
    case "last7":
      return start(new Date(today.getTime() - 6 * 86400000));
    case "last30":
      return start(new Date(today.getTime() - 29 * 86400000));
    case "lastMonth": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: ymd(from), to: ymd(to) };
    }
    case "thisMonth":
      return start(new Date(now.getFullYear(), now.getMonth(), 1));
    case "thisQuarter":
      return start(
        new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
      );
    case "thisYear":
      return start(new Date(now.getFullYear(), 0, 1));
    case "custom":
      return {};
  }
};

/** The default window the dashboard opens with (kept in sync with the picker). */
export const DEFAULT_RANGE: IReportWindow = rangeForPreset(DEFAULT_PRESET);

/**
 * Date-range filter for the windowed dashboard reads: a preset select plus an
 * inline custom range (two date inputs + Apply). Emits a from/to window upward;
 * mobile-first (full width on phones).
 */
export function DateRangeSelector({
  onChange,
}: {
  onChange: (window: IReportWindow) => void;
}) {
  const [preset, setPreset] = useState<RangePreset>(DEFAULT_PRESET);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const choosePreset = (value: RangePreset) => {
    setPreset(value);
    if (value !== "custom") onChange(rangeForPreset(value));
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    const [from, to] =
      customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    onChange({ from, to });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(v) => choosePreset(v as RangePreset)}>
        <SelectTrigger className="h-9 w-full cursor-pointer text-[13px] sm:w-[164px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value} className="cursor-pointer">
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" ? (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => setCustomFrom(e.target.value)}
            aria-label="From date"
            className="h-9 w-full text-[13px] sm:w-[148px]"
          />
          <span className="text-[12px] text-adm-muted">to</span>
          <Input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => setCustomTo(e.target.value)}
            aria-label="To date"
            className="h-9 w-full text-[13px] sm:w-[148px]"
          />
          <Button
            type="button"
            onClick={applyCustom}
            disabled={!customFrom || !customTo}
            className="h-9"
          >
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  );
}
