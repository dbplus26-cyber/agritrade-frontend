"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll reveal - the design files' `data-reveal` behaviour: a section fades
 * and rises the first time it enters the viewport. Content is server-rendered
 * visible (SEO/no-JS safe); the hide-then-reveal only engages after hydration,
 * and never under prefers-reduced-motion or without IntersectionObserver.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  /** Stagger offset in ms. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // null = not armed (render natural) · false = armed, waiting · true = shown
  const [shown, setShown] = useState<boolean | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    // Already on screen (above the fold / restored scroll)? Never hide it.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    setShown(false);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${String(delay)}ms` } : undefined}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-out",
        shown === false && "translate-y-4 opacity-0",
        shown === true && "translate-y-0 opacity-100",
        className,
      )}
    >
      {children}
    </div>
  );
}
