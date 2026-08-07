import Link from "next/link";

/**
 * The public site's one register pager: stencilled PAGE X OF Y between square
 * PREV/NEXT blocks, in the ledger idiom. The commodities board, the plot
 * register and the reviews page all wear this SAME component, so the three
 * registers page identically and a style tweak lands everywhere at once.
 *
 * Steps are LINKS carrying `?page=N`, because the pager follows the SERVER's
 * window: each page is a URL that can be shared, crawled and cached, and the
 * register holds whatever the feed grows to. A step with nowhere to go
 * renders the same block dimmed.
 */
const pagerControl =
  "stencil whitespace-nowrap rounded-[2px] border-[1.5px] border-forest/45 px-3 py-2.5 text-[12px] leading-none tracking-[0.16em] text-forest transition-colors hover:bg-forest/5 sm:px-4";

const pagerControlDisabled =
  "stencil cursor-not-allowed whitespace-nowrap rounded-[2px] border-[1.5px] border-forest/45 px-3 py-2.5 text-[12px] leading-none tracking-[0.16em] text-forest opacity-35 sm:px-4";

function PagerStep({
  children,
  href,
}: {
  children: React.ReactNode;
  href: null | string;
}) {
  if (href === null) {
    return (
      <span aria-disabled="true" className={pagerControlDisabled}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={pagerControl}>
      {children}
    </Link>
  );
}

export function RegisterPager({
  basePath,
  className,
  label = "Register pages",
  page,
  totalPages,
}: {
  /** The route the steps link back into, e.g. routes.commodities. */
  basePath: string;
  className?: string;
  /** The nav's accessible name, e.g. "Plot register pages". */
  label?: string;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  // Page 1 keeps the bare canonical URL rather than `?page=1`.
  const hrefOf = (n: number) =>
    n <= 1 ? basePath : `${basePath}?page=${String(n)}`;

  return (
    <nav
      aria-label={label}
      className={`flex items-center justify-between gap-2 sm:gap-3 ${className ?? ""}`}
    >
      <PagerStep href={page > 1 ? hrefOf(page - 1) : null}>
        {/* Arrow glyphs are sm+ decoration - at fold widths they cost the
            row the space the PAGE label needs. */}
        <span aria-hidden="true" className="hidden sm:inline">
          ←{" "}
        </span>
        PREV
      </PagerStep>
      <span className="stencil text-center text-[11px] leading-[1.5] tracking-[0.12em] text-soil sm:tracking-[0.2em]">
        PAGE {page} OF {totalPages}
      </span>
      <PagerStep href={page < totalPages ? hrefOf(page + 1) : null}>
        NEXT
        <span aria-hidden="true" className="hidden sm:inline">
          {" "}
          →
        </span>
      </PagerStep>
    </nav>
  );
}
