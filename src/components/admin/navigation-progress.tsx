"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The console's navigation bar: a 2px line along the top of the viewport
 * that starts when a navigation begins and completes when the new route
 * commits, so a slow page never feels frozen.
 *
 * A navigation "begins" on a plain click of an in-app link (captured at the
 * document, so every Link and anchor counts) or when a screen calls
 * `navigationStarted()` before a programmatic router.push (the table rows do
 * this). It "commits" when the pathname changes, or on popstate.
 */
const START_EVENT = "console:navigation-start";

export function navigationStarted() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(START_EVENT));
  }
}

export function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<number | null>(null);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    const start = () => {
      startedFor.current = window.location.pathname;
      if (timer.current) window.clearTimeout(timer.current);
      setState("loading");
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest("a[href]");
      if (!anchor) return;
      if (anchor.getAttribute("target") === "_blank") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("//")) return;
      const url = new URL(href, window.location.href);
      if (url.pathname === window.location.pathname) return;
      start();
    };
    window.addEventListener(START_EVENT, start);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener(START_EVENT, start);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  // The route committed: run the line to the end, then let it go.
  useEffect(() => {
    if (startedFor.current === null) return;
    if (startedFor.current === pathname) return;
    startedFor.current = null;
    setState("done");
    timer.current = window.setTimeout(() => {
      setState("idle");
    }, 260);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [pathname]);

  if (state === "idle") return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] print:hidden"
    >
      <div
        className={
          state === "loading"
            ? "h-full w-[80%] bg-console transition-[width] duration-[6000ms] ease-out"
            : "h-full w-full bg-console opacity-0 transition-[width,opacity] duration-200 ease-out"
        }
        style={state === "loading" ? undefined : { transitionDelay: "0ms" }}
      />
    </div>
  );
}
