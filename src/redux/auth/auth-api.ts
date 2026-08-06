import { apiSlice } from "../api-slice";
import { userLoggedIn, userLoggedOut } from "./auth-slice";
import type {
  ILoginResponse,
  IUserLoginInput,
  ITwoFactorVerifyInput,
  ITwoFactorEnabledResponse,
  IRecoveryCodesResponse,
  IForgotPasswordInput,
  IResetPasswordInput,
  IMessageResponse,
} from "@/types/auth.types";
import { isTwoFactorChallenge } from "@/types/auth.types";
import type { IUser, IUserResponse } from "@/types/user.types";

/**
 * Seeds the `getMe` cache with the user a sign-in just returned. Without
 * this, the cache still holds the previous logout's 401 rejection when the
 * console mounts - RequireAuth would read that stale error while the refetch
 * is in flight and tear down the brand-new session (see require-auth.tsx).
 * Seeding also spares the console an extra `/auth/me` round trip on login.
 */
const seedSession = (
  dispatch: (action: unknown) => unknown,
  message: string,
  user: IUser,
) => {
  dispatch(
    authApi.util.upsertQueryData("getMe", undefined, {
      message,
      data: { user },
    }),
  );
};

/**
 * Auth endpoints, injected into the single `apiSlice`. These mirror the
 * agritrade-backend cookie-based contract (base `/api/v1`, httpOnly
 * `accessToken`/`refreshToken`/`twoFactorPending`). No `invalidatesTags`
 * here - session transitions are handled by dispatching auth actions and, on
 * logout, purging the whole cache with `resetApiState`.
 */
export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<ILoginResponse, IUserLoginInput>({
      query: (body) => ({ url: "auth/login", method: "POST", body }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          // A 2FA challenge is not a session - only store a real user.
          if (!isTwoFactorChallenge(data.data)) {
            dispatch(userLoggedIn({ user: data.data.user }));
            seedSession(dispatch, data.message, data.data.user);
          }
        } catch {
          // Surfaced to the caller via `unwrap()`.
        }
      },
    }),

    /**
     * The authoritative session check: `GET /auth/me` returns the current user
     * for a valid access cookie (a 401 falls through the api-slice's silent
     * refresh first). The admin guard uses it to validate the session on load
     * rather than trusting the optimistic, localStorage-persisted user. On
     * success we refresh the stored user; on failure we clear it (fail-closed).
     */
    getMe: builder.query<IUserResponse, void>({
      query: () => ({ url: "auth/me", method: "GET" }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoggedIn({ user: data.data.user }));
        } catch {
          dispatch(userLoggedOut());
        }
      },
    }),

    /** Update the signed-in user's profile; refreshes the stored user. A new
     * photo travels WITH the save as multipart (payload JSON + file) - the
     * backend uploads it to Cloudinary inside the same request and cleans up
     * on failure, so nothing is ever pre-uploaded or orphaned. Clearing an
     * existing photo sends `removeProfilePicture: true`; the backend deletes
     * the Cloudinary asset and nulls the stored URL. A changed email is NOT
     * applied directly - the backend parks it pending mailbox confirmation. */
    updateMe: builder.mutation<
      IUserResponse & { data: { emailChangeRequested?: boolean } },
      {
        body: {
          firstName?: string;
          lastName?: string;
          email?: string;
          phone?: string | null;
          removeProfilePicture?: boolean;
        };
        photo?: File;
      }
    >({
      query: ({ body, photo }) => {
        if (photo) {
          const form = new FormData();
          form.append("payload", JSON.stringify(body));
          form.append("profilePicture", photo);
          return { url: "auth/me", method: "PATCH", body: form };
        }
        return { url: "auth/me", method: "PATCH", body };
      },
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoggedIn({ user: data.data.user }));
        } catch {
          // Surfaced to the caller via `unwrap()`.
        }
      },
    }),

    /** Change the signed-in user's password (requires the current one). */
    changePassword: builder.mutation<
      IUserResponse,
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({ url: "auth/change-password", method: "PATCH", body }),
    }),

    /** Step 2 of a 2FA login: exchanges the emailed code for a session. */
    verifyTwoFactor: builder.mutation<IUserResponse, ITwoFactorVerifyInput>({
      query: (body) => ({ url: "auth/2fa/verify", method: "POST", body }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoggedIn({ user: data.data.user }));
          seedSession(dispatch, data.message, data.data.user);
        } catch {
          // Surfaced to the caller via `unwrap()`.
        }
      },
    }),

    /** Re-send the 2FA code during a pending challenge. */
    resendTwoFactorCode: builder.mutation<IMessageResponse, void>({
      query: () => ({ url: "auth/2fa/resend", method: "POST" }),
    }),

    /** Step-2 fallback: finish the pending 2FA login with a single-use
     * recovery code (for when the mailbox is unreachable). */
    recoveryLogin: builder.mutation<IUserResponse, { code: string }>({
      query: (body) => ({ url: "auth/2fa/recovery", method: "POST", body }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoggedIn({ user: data.data.user }));
          seedSession(dispatch, data.message, data.data.user);
        } catch {
          // Surfaced to the caller via `unwrap()`.
        }
      },
    }),

    /** Emails a confirmation code before enabling 2FA on the account. */
    requestTwoFactorSetup: builder.mutation<IMessageResponse, void>({
      query: () => ({ url: "auth/2fa/enable", method: "POST" }),
    }),

    /** Confirms setup with the emailed code; the response carries the
     * one-time plaintext recovery codes the user must save. */
    confirmTwoFactorSetup: builder.mutation<
      ITwoFactorEnabledResponse,
      ITwoFactorVerifyInput
    >({
      query: (body) => ({
        url: "auth/2fa/enable/confirm",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoggedIn({ user: data.data.user }));
        } catch {
          // Surfaced to the caller via `unwrap()`.
        }
      },
    }),

    disableTwoFactor: builder.mutation<IUserResponse, { password: string }>({
      query: (body) => ({ url: "auth/2fa/disable", method: "POST", body }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(userLoggedIn({ user: data.data.user }));
        } catch {
          // Surfaced to the caller via `unwrap()`.
        }
      },
    }),

    /** Replaces the recovery-code set (password required); returns the new
     * plaintext codes exactly once. */
    regenerateRecoveryCodes: builder.mutation<
      IRecoveryCodesResponse,
      { password: string }
    >({
      query: (body) => ({
        url: "auth/2fa/recovery/regenerate",
        method: "POST",
        body,
      }),
    }),

    forgotPassword: builder.mutation<IMessageResponse, IForgotPasswordInput>({
      query: (body) => ({ url: "auth/forgot-password", method: "POST", body }),
    }),

    resetPassword: builder.mutation<IMessageResponse, IResetPasswordInput>({
      query: (body) => ({ url: "auth/reset-password", method: "POST", body }),
    }),

    logout: builder.mutation<IMessageResponse, void>({
      query: () => ({ url: "auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
        } finally {
          // Clear client session and purge cached data even if the server call
          // failed - the user intends to be logged out regardless.
          dispatch(userLoggedOut());
          dispatch(apiSlice.util.resetApiState());
        }
      },
    }),
  }),
});

export const {
  useGetMeQuery,
  useUpdateMeMutation,
  useChangePasswordMutation,
  useLoginMutation,
  useVerifyTwoFactorMutation,
  useResendTwoFactorCodeMutation,
  useRecoveryLoginMutation,
  useRequestTwoFactorSetupMutation,
  useConfirmTwoFactorSetupMutation,
  useDisableTwoFactorMutation,
  useRegenerateRecoveryCodesMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutMutation,
} = authApi;
