import { afterEach, describe, expect, it, vi } from "vitest";
import { exportsApi } from "@/redux/exports/exports-api";
import { makeStore } from "@/redux/store";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
afterEach(() => vi.unstubAllGlobals());

describe("CSV API reads", () => {
  it("restarts at page one, preserves every filter, and uses authenticated GET requests", async () => {
    const requests: Request[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        requests.push(request);
        const page = Number(new URL(request.url).searchParams.get("page"));
        return json({
          data: [{ id: String(page), totalGhs: null }],
          meta: { page, limit: 1, total: 2, totalPages: 2 },
        });
      }),
    );
    const store = makeStore();
    const result = store.dispatch(
      exportsApi.endpoints.getCsvRows.initiate({
        url: "admin/purchases",
        params: {
          page: 7,
          limit: 10,
          search: "White maize",
          status: "RECEIVED",
          warehouseId: "shed",
          from: "2026-01-01",
          to: "2026-09-27",
        },
      }),
    );
    expect(await result.unwrap()).toEqual([
      { id: "1", totalGhs: null },
      { id: "2", totalGhs: null },
    ]);
    expect(requests).toHaveLength(2);
    for (const [index, request] of requests.entries()) {
      const url = new URL(request.url);
      expect(request.method).toBe("GET");
      expect(request.credentials).toBe("include");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        page: String(index + 1),
        limit: "100",
        search: "White maize",
        status: "RECEIVED",
        warehouseId: "shed",
        from: "2026-01-01",
        to: "2026-09-27",
      });
    }
    result.reset();
    expect(Object.keys(store.getState().api.mutations)).toHaveLength(0);
  });
  it("fails the entire export when a later page denies access", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        return calls === 1
          ? json({
              data: [{ id: "1" }],
              meta: { page: 1, limit: 1, total: 2, totalPages: 2 },
            })
          : json({ message: "Access removed" }, 403);
      }),
    );
    const store = makeStore();
    const request = store.dispatch(
      exportsApi.endpoints.getCsvRows.initiate({ url: "admin/purchases" }),
    );
    await expect(request.unwrap()).rejects.toMatchObject({
      data: { message: "Access removed" },
    });
    expect(calls).toBe(2);
    request.reset();
  });
  it("uses the existing session refresh flow for an expired access token", async () => {
    let refreshed = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (request: Request) => {
        if (request.url.endsWith("auth/refresh-token")) {
          refreshed = true;
          return json({ data: { user: { id: "owner", role: "SUPER_ADMIN" } } });
        }
        return refreshed
          ? json({
              data: [],
              meta: { page: 1, limit: 100, total: 0, totalPages: 0 },
            })
          : json({ message: "Expired" }, 401);
      }),
    );
    const store = makeStore();
    const request = store.dispatch(
      exportsApi.endpoints.getCsvRows.initiate({ url: "admin/purchases" }),
    );
    expect(await request.unwrap()).toEqual([]);
    expect(refreshed).toBe(true);
    request.reset();
  });
});
