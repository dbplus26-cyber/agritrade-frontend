"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { env } from "@/lib/env";

/**
 * Whether Turnstile is configured. Forms use this to decide whether a token is
 * required before submit - when false (no site key, e.g. local dev), the widget
 * renders nothing and submission proceeds unblocked, matching the backend which
 * skips verification when `TURNSTILE_SECRET_KEY` is unset.
 */
export const TURNSTILE_ENABLED = Boolean(env.TURNSTILE_SITE_KEY);

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "flexible" | "compact";
    },
  ) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileWidgetProps {
  /** Fires with the solved token, or `""` when it expires/errors/resets. */
  onVerify: (token: string) => void;
  /** Bump this number to force the widget to reset and issue a fresh token. */
  resetSignal?: number;
  className?: string;
}

/**
 * Cloudflare Turnstile challenge for the public forms. Renders nothing when no
 * site key is configured, so dev without keys keeps working. Otherwise it loads
 * the Turnstile script once, renders the widget explicitly, surfaces the token
 * via `onVerify`, and resets on expiry/error or when `resetSignal` changes
 * (tokens are single-use, so a failed submit must re-solve before retrying).
 */
export function TurnstileWidget(props: TurnstileWidgetProps) {
  const siteKey = env.TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return <TurnstileInner {...props} siteKey={siteKey} />;
}

/** The widget's fixed rendered size (normal/flexible have a 300px minimum). */
const WIDGET_MIN_WIDTH = 300;
const WIDGET_HEIGHT = 65;

function TurnstileInner({
  onVerify,
  resetSignal = 0,
  className,
  siteKey,
}: TurnstileWidgetProps & { siteKey: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // On containers narrower than the widget's 300px minimum (fold-size screens)
  // the rectangular bar is scaled down to fit instead of swapping to the
  // square compact variant or overflowing the layout.
  const [scale, setScale] = useState(1);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.turnstile),
  );

  // Latest onVerify without re-rendering the widget when the callback identity
  // changes (forms often pass an inline setter).
  const onVerifyRef = useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  // Track the wrapper's real width (it is overflow-hidden, so the 300px iframe
  // can never inflate it or its grid column) and derive the scale from it -
  // measured continuously, not once, so late layout or fold/rotate can't
  // leave the widget overflowing.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.offsetWidth;
      setScale(width > 0 && width < WIDGET_MIN_WIDTH ? width / WIDGET_MIN_WIDTH : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const render = useCallback(() => {
    if (!window.turnstile || !containerRef.current || widgetId.current !== null) {
      return;
    }
    // "normal" (fixed 300×65) rather than "flexible": the bar shouldn't
    // stretch across the whole card on tablet/desktop form widths.
    widgetId.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: "auto",
      size: "normal",
      callback: (token) => onVerifyRef.current(token),
      "expired-callback": () => onVerifyRef.current(""),
      "error-callback": () => onVerifyRef.current(""),
    });
  }, [siteKey]);

  useEffect(() => {
    if (scriptReady) render();
    return () => {
      if (widgetId.current !== null && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [scriptReady, render]);

  // Reset on demand (after a failed submit) for a fresh single-use token.
  useEffect(() => {
    if (resetSignal > 0 && widgetId.current !== null && window.turnstile) {
      window.turnstile.reset(widgetId.current);
      onVerifyRef.current("");
    }
  }, [resetSignal]);

  return (
    <>
      <Script
        src={SCRIPT_SRC}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      {/* Always overflow-hidden: without it the 300px iframe sets the grid
          column's min-content width and forces horizontal overflow on screens
          narrower than the widget (the scale can't help if the column has
          already been inflated by the time it's measured). */}
      <div
        ref={wrapperRef}
        className={
          className ? `${className} max-w-full overflow-hidden` : "max-w-full overflow-hidden"
        }
        style={scale < 1 ? { height: WIDGET_HEIGHT * scale } : undefined}
      >
        <div
          ref={containerRef}
          style={
            scale < 1
              ? {
                  transform: `scale(${scale})`,
                  transformOrigin: "top left",
                  width: WIDGET_MIN_WIDTH,
                }
              : undefined
          }
        />
      </div>
    </>
  );
}
