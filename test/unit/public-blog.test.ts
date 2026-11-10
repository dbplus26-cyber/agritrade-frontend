// test/unit/public-blog.test.ts
//
// Which blog lists are kept in the data cache. The unfiltered register is
// what the site links to and is purged by the `blog` tag; a search word,
// category or tag is typed into the address bar, so caching those would let
// anyone mint a cache entry per made-up value.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchBlogPosts } from "@/lib/public-blog";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ data: [], meta: { totalPages: 1 } })),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const optionsOf = async (filters: Parameters<typeof fetchBlogPosts>[0]) => {
  await fetchBlogPosts(filters);
  return fetchMock.mock.lastCall?.[1] as RequestInit & {
    next?: { tags?: string[] };
  };
};

describe("fetchBlogPosts caching", () => {
  it("caches the unfiltered register under the blog tag", async () => {
    const options = await optionsOf({ limit: 9, page: 2 });
    expect(options.next?.tags).toEqual(["blog"]);
    expect(options.cache).toBeUndefined();
  });

  it.each([
    { search: "maize" },
    { category: "market-news" },
    { tag: "soya" },
    { page: 51 },
  ])("reads %o live", async (filters) => {
    expect(await optionsOf(filters)).toEqual({ cache: "no-store" });
  });
});
