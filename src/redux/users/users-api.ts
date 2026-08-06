import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateUserInput,
  IUpdateUserInput,
  IUserListQuery,
  IUserListResponse,
  IUserResponse,
  UserRole,
} from "@/types/user.types";
import type { IMessageResponse } from "@/types/auth.types";

/**
 * Super-admin user management, mirroring the backend `/admin/users` surface.
 * Every mutation invalidates the list (and the touched user) so the register
 * refetches; the backend enforces the real guards (self-action blocks, the
 * last-active-super-admin rule) - errors surface through `extractApiError`.
 */
export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<IUserListResponse, IUserListQuery | void>({
      query: (params) => `admin/users${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Users" as const, id: "LIST" },
              ...result.data.map((u) => ({ type: "Users" as const, id: u.id })),
            ]
          : [{ type: "Users" as const, id: "LIST" }],
    }),

    getUser: builder.query<IUserResponse, string>({
      query: (id) => `admin/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Users", id }],
    }),

    createUser: builder.mutation<IUserResponse, ICreateUserInput>({
      query: (body) => ({ url: "admin/users", method: "POST", body }),
      invalidatesTags: [{ type: "Users", id: "LIST" }],
    }),

    /** Admin profile edit. A new photo travels WITH the save as multipart
     * (payload JSON + file) - the backend uploads to Cloudinary inside the
     * request; `removeProfilePicture: true` deletes the asset and clears the
     * stored URL. */
    updateUser: builder.mutation<
      IUserResponse,
      { id: string; body: IUpdateUserInput; photo?: File }
    >({
      query: ({ id, body, photo }) => {
        if (photo) {
          const form = new FormData();
          form.append("payload", JSON.stringify(body));
          form.append("profilePicture", photo);
          return { url: `admin/users/${id}`, method: "PATCH", body: form };
        }
        return { url: `admin/users/${id}`, method: "PATCH", body };
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
      ],
    }),

    changeUserRole: builder.mutation<
      IUserResponse,
      { id: string; role: UserRole }
    >({
      query: ({ id, role }) => ({
        url: `admin/users/${id}/role`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
      ],
    }),

    deactivateUser: builder.mutation<IUserResponse, string>({
      query: (id) => ({ url: `admin/users/${id}/deactivate`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
      ],
    }),

    /** Reactivation is the general recovery: it also clears a hard block. */
    activateUser: builder.mutation<IUserResponse, string>({
      query: (id) => ({ url: `admin/users/${id}/activate`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
      ],
    }),

    unblockUser: builder.mutation<IUserResponse, string>({
      query: (id) => ({ url: `admin/users/${id}/unblock`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
      ],
    }),

    resetUserTwoFactor: builder.mutation<IUserResponse, string>({
      query: (id) => ({ url: `admin/users/${id}/2fa/reset`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Users", id },
        { type: "Users", id: "LIST" },
      ],
    }),

    sendUserPasswordReset: builder.mutation<IMessageResponse, string>({
      query: (id) => ({
        url: `admin/users/${id}/send-password-reset`,
        method: "POST",
      }),
    }),

    deleteUser: builder.mutation<IMessageResponse, string>({
      query: (id) => ({ url: `admin/users/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Users", id: "LIST" }],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useChangeUserRoleMutation,
  useDeactivateUserMutation,
  useActivateUserMutation,
  useUnblockUserMutation,
  useResetUserTwoFactorMutation,
  useSendUserPasswordResetMutation,
  useDeleteUserMutation,
} = usersApi;
