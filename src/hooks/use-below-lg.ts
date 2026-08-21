import * as React from "react";

// Tailwind breakpoints the console toolbar and detail headers fold at.
const LG_BREAKPOINT = 1024;
const MD_BREAKPOINT = 768;
const SM_BREAKPOINT = 640;

function useIsBelow(maxWidth: number) {
  const [isBelow, setIsBelow] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${String(maxWidth - 1)}px)`);
    const onChange = () => {
      setIsBelow(mql.matches);
    };
    onChange();
    mql.addEventListener("change", onChange);
    return () => {
      mql.removeEventListener("change", onChange);
    };
  }, [maxWidth]);

  return isBelow;
}

/** Below lg the multi-filter panel renders in a bottom drawer, not inline. */
export function useIsBelowLg() {
  return useIsBelow(LG_BREAKPOINT);
}

/** Below md (tablet portrait). */
export function useIsBelowMd() {
  return useIsBelow(MD_BREAKPOINT);
}

/** Below sm a single inline filter collapses into the drawer behind the icon. */
export function useIsBelowSm() {
  return useIsBelow(SM_BREAKPOINT);
}
