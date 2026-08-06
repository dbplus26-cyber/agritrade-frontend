import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query";
import { Mutex } from "async-mutex";
import { env } from "@/lib/env";
import { apiSliceTags } from "@/types/api";
import type { IUserResponse } from "@/types/user.types";
import { userLoggedIn, userLoggedOut } from "./auth/auth-slice";

// A single in-flight refresh at a time: concurrent 401s wait on this mutex
// instead of each firing their own `refresh-token` call (a refresh stampede
// would also trip the backend's replay detection, since a rotated token dies
// the moment its successor is minted).
const mutex = new Mutex();

const baseQuery = fetchBaseQuery({
  // `/api/v1` is appended here; SERVER_URI is just the origin (or empty).
  baseUrl: `${env.SERVER_URI}/api/v1`,
  // Send the httpOnly access/refresh cookies on every request (incl. refresh).
  credentials: "include",
});

/**
 * Endpoints where a 401 IS the answer, not an expired session: refreshing
 * can't help (there's no session yet), and the state reset it triggers would
 * abort the request mid-flight - turning "Invalid credentials" into "Aborted".
 */
const NO_REAUTH_URLS = new Set([
  "auth/login",
  "auth/refresh-token",
  "auth/logout",
  "auth/2fa/verify",
  "auth/2fa/resend",
  "auth/2fa/recovery",
  "auth/forgot-password",
  "auth/reset-password",
  "auth/confirm-email-change",
]);

const requestUrl = (args: string | FetchArgs): string =>
  typeof args === "string" ? args : args.url;

// After a refresh fails there is no session - a retry milliseconds later can't
// succeed either. Back off briefly so a burst of 401s (e.g. queries refetching
// after the reset) doesn't hammer /auth/refresh-token in a loop.
const REFRESH_FAILURE_COOLDOWN_MS = 5_000;
let refreshFailedAt = 0;

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (
    result.error?.status === 401 &&
    !NO_REAUTH_URLS.has(requestUrl(args)) &&
    Date.now() - refreshFailedAt > REFRESH_FAILURE_COOLDOWN_MS
  ) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        // The refresh reads the httpOnly `refreshToken` cookie - no body.
        const refreshResult = (await baseQuery(
          { url: "auth/refresh-token", method: "POST" },
          api,
          extraOptions,
        )) as { data?: IUserResponse; error?: unknown };

        if (refreshResult.data) {
          api.dispatch(userLoggedIn({ user: refreshResult.data.data.user }));
          result = await baseQuery(args, api, extraOptions); // retry original
        } else {
          // Refresh failed → end the session AND drop every cached query so
          // stale data (e.g. a still-resolved `getMe`) can't keep RequireAuth
          // rendering the console; its error path now engages and bounces to
          // login. The refresh call above is a raw `baseQuery` (not routed
          // through this reauth wrapper), so its own 401 never re-triggers us.
          refreshFailedAt = Date.now();
          api.dispatch(userLoggedOut());
          api.dispatch(apiSlice.util.resetApiState());
        }
      } finally {
        release();
      }
    } else {
      // Another call is already refreshing - wait for it, then retry.
      await mutex.waitForUnlock();
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

/**
 * The one and only `createApi`. Feature endpoints attach via
 * `apiSlice.injectEndpoints` - never create a second slice. Auth-refresh and
 * the tag registry live here so nothing else reimplements 401 handling.
 */
export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: apiSliceTags,
  endpoints: () => ({}),
});
