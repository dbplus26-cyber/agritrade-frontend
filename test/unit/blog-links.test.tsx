import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { blogHref } from "@/components/blog/blog-sidebar";
import { RegisterPager } from "@/components/ui/RegisterPager";

describe("blog filter links", () => {
  it("keeps only the filters that are set, and drops the page", () => {
    expect(blogHref({})).toBe("/blog");
    expect(blogHref({ category: "market-news", tag: "soya" })).toBe(
      "/blog?category=market-news&tag=soya",
    );
    expect(blogHref({ search: "maize & soya" })).toBe(
      "/blog?search=maize+%26+soya",
    );
  });

  it("pages a filtered register without breaking its query", () => {
    render(<RegisterPager basePath="/blog?tag=soya" page={2} totalPages={3} />);
    expect(screen.getByRole("link", { name: /NEXT/ })).toHaveAttribute(
      "href",
      "/blog?tag=soya&page=3",
    );
    expect(screen.getByRole("link", { name: /PREV/ })).toHaveAttribute(
      "href",
      "/blog?tag=soya",
    );
  });
});
