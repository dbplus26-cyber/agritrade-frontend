// test/unit/api-slice-reauth.test.ts
//
// The 401-refresh machinery every console request rides through. This repo
// has a recorded history of auth-guard regressions (the RTK cached-error
// remount gotcha), and the failure modes here are all quiet ones:
//
//   * a refresh STAMPEDE - N concurrent 401s each firing their own
//     `auth/refresh-token` call - would trip the backend's rotation replay
//     detection, because a rotated token dies the moment its successor is
//     minted. The mutex must collapse the burst to exactly one refresh;
//   * a failed refresh must end the session AND empty the query cache, or a
//     still-resolved `getMe` keeps RequireAuth rendering the console for a
//     user who no longer has a session;
//   * after that failure, the cooldown must stop the burst of refetching
//     queries from hammering `auth/refresh-token` in a loop - but only for a
//     while, or one blip locks refresh out forever;
//   * a 401 from `auth/login` IS the answer ("wrong password"), and routing
//     it through the refresh path would abort the request mid-flight and
//     turn "Invalid credentials" into "Aborted".
//
// Driven through a real store (makeStore) and the real apiSlice with only
// global fetch stubbed, so the mutex, the cooldown clock and the dispatches
// are the production code paths, not re-implementations.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiSlice } from "@/redux/api-slice";
import { userLoggedIn } from "@/redux/auth/auth-slice";
import { makeStore } from "@/redux/store";
import type { IUser } from "@/types/user.types";

// Endpoints of our own, injected into the REAL slice: `probe` takes an id so
// concurrent calls are distinct requests (identical args would dedupe into
// one), and `loginProbe` posts to the real login URL to exercise NO_REAUTH.
const testApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    probe: builder.query<unknown, string>({ query: (id) => `probe/${id}` }),
    loginProbe: builder.mutation<unknown, void>({
      query: () => ({ url: "auth/login", method: "POST" }),
    }),
  }),
});

const USER = { id: "u1", name: "Owner", role: "OWNER" } as unknown as IUser;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/** What the fetch stub does per route; tests flip these. */
let refreshCalls: number;
let refreshSucceeds: boolean;
let probeAuthorized: boolean;

const urlOf = (input: Request | string | URL) =>
  input instanceof Request ? input.url : String(input);

beforeEach(() => {
  refreshCalls = 0;
  refreshSucceeds = true;
  probeAuthorized = false;
  localStorage.clear();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request | string | URL) => {
      const url = urlOf(input);
      if (url.endsWith("/auth/refresh-token")) {
        refreshCalls += 1;
        if (refreshSucceeds) {
          probeAuthorized = true; // the retried requests now carry a session
          return json({ data: { user: USER } });
        }
        return json({ message: "Refresh token expired" }, 401);
      }
      if (url.endsWith("/auth/login")) {
        return json({ message: "Invalid credentials" }, 401);
      }
      if (url.includes("/probe/")) {
        return probeAuthorized
          ? json({ ok: true, id: url.split("/probe/")[1] })
          : json({ message: "No session" }, 401);
      }
      throw new Error(`Unrouted request in test: ${url}`);
    }),
  );
});

// `refreshFailedAt` is module state in api-slice.ts and survives across tests
// in this file. Each test starts 60s later than the last, well clear of the
// 5s cooldown, so one test's failure can never mute the next test's refresh.
let now = 1_750_000_000_000;
beforeEach(() => {
  now += 60_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("baseQueryWithReauth - concurrent 401s", () => {
  it("collapses N simultaneous 401s into exactly one refresh call", async () => {
    const store = makeStore();

    const results = await Promise.all([
      store.dispatch(testApi.endpoints.probe.initiate("a")),
      store.dispatch(testApi.endpoints.probe.initiate("b")),
      store.dispatch(testApi.endpoints.probe.initiate("c")),
    ]);

    // The whole point of the mutex: one refresh, however wide the burst.
    expect(refreshCalls).toBe(1);

    // And every one of the original requests was retried to success - the
    // waiters retried after the winner's refresh, not with their stale 401s.
    expect(results.map((r) => r.data)).toEqual([
      { ok: true, id: "a" },
      { ok: true, id: "b" },
      { ok: true, id: "c" },
    ]);
  });

  it("signs the refreshed user back in from the refresh response", async () => {
    const store = makeStore();

    await store.dispatch(testApi.endpoints.probe.initiate("a"));

    // userLoggedIn was dispatched with the envelope's user, so the console's
    // auth state (and its localStorage mirror) reflect the renewed session.
    expect(store.getState().auth.user).toEqual(USER);
  });
});

describe("baseQueryWithReauth - refresh failure", () => {
  it("ends the session, empties the cache, and cools down further attempts", async () => {
    refreshSucceeds = false;
    const store = makeStore();
    store.dispatch(userLoggedIn({ user: USER }));

    // Seed the cache with a resolved query BEFORE the session dies: this is
    // the "still-resolved getMe" that once kept RequireAuth rendering the
    // console after logout. Authorize just this one call.
    probeAuthorized = true;
    await store.dispatch(testApi.endpoints.probe.initiate("seed"));
    probeAuthorized = false;
    expect(
      testApi.endpoints.probe.select("seed")(store.getState()).data,
    ).toEqual({ ok: true, id: "seed" });

    const failed = await store.dispatch(
      testApi.endpoints.probe.initiate("fail-1"),
    );

    expect(refreshCalls).toBe(1);
    // The reset wipes the in-flight request's own cache entry too, so its
    // snapshot resolves UNINITIALIZED rather than as a 401. Nothing zombie
    // survives; the redirect to login is driven by the auth state below, not
    // by this result.
    expect(failed.isUninitialized).toBe(true);
    // Session over: user gone from state...
    expect(store.getState().auth.user).toBeNull();
    // ...and the cached query dropped by resetApiState, so nothing stale can
    // vouch for a session that no longer exists.
    expect(
      testApi.endpoints.probe.select("seed")(store.getState()).isUninitialized,
    ).toBe(true);

    // A second 401 inside the ~5s cooldown must NOT re-attempt the refresh -
    // this is what stops the post-reset refetch burst hammering the endpoint.
    const during = await store.dispatch(
      testApi.endpoints.probe.initiate("fail-2"),
    );
    expect(refreshCalls).toBe(1);
    expect(during.error).toMatchObject({ status: 401 });
  });

  it("tries again once the cooldown has passed - one blip is not a lockout", async () => {
    refreshSucceeds = false;
    const store = makeStore();

    await store.dispatch(testApi.endpoints.probe.initiate("first"));
    expect(refreshCalls).toBe(1);

    // 6s later the failure is stale; a new 401 earns a fresh refresh attempt.
    now += 6_000;
    refreshSucceeds = true;
    const retried = await store.dispatch(
      testApi.endpoints.probe.initiate("second"),
    );
    expect(refreshCalls).toBe(2);
    expect(retried.data).toEqual({ ok: true, id: "second" });
  });
});

describe("baseQueryWithReauth - NO_REAUTH_URLS", () => {
  it("passes a login 401 straight through without touching refresh", async () => {
    const store = makeStore();

    const result = await store.dispatch(
      testApi.endpoints.loginProbe.initiate(),
    );

    // No refresh attempt: there is no session to refresh, and the reset a
    // failed refresh triggers would abort this very request - turning
    // "Invalid credentials" into "Aborted" on the login screen.
    expect(refreshCalls).toBe(0);
    expect(result.error).toMatchObject({
      status: 401,
      data: { message: "Invalid credentials" },
    });
  });
});
