"use client";

import { useEffect, useRef, useState } from "react";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A figure that counts to its value: on first paint and whenever the value
 * changes, the number runs from where it was to where it is over ~600ms.
 * `format` renders the in-between values (money, kilos, plain counts).
 * Under prefers-reduced-motion it just shows the value.
 */
export function CountUp({
  value,
  format,
  duration = 600,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const begin = from.current;
    const step = (now: number) => {
      if (reduce || !Number.isFinite(value)) {
        from.current = value;
        setShown(value);
        return;
      }
      const t = Math.min(1, (now - start) / duration);
      const next = begin + (value - begin) * easeOut(t);
      setShown(next);
      if (t < 1) frame.current = requestAnimationFrame(step);
      else from.current = value;
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      from.current = value;
    };
  }, [value, duration]);

  return <>{format(shown)}</>;
}
