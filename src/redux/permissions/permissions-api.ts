import { apiSlice } from "../api-slice";
import type {
  EditableRole,
  IPermissionMatrixResponse,
  IUserPermissionsResponse,
  Permission,
} from "@/types/permission.types";

/**
 * The owner's permission surface (`/admin/permissions`). A role edit changes
 * what EVERY holder of that role may do, so it drops the whole tag family -
 * every cached per-user state re-reads; a personal edit touches only that
 * user's entry.
 */
export const permissionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPermissionMatrix: builder.query<IPermissionMatrixResponse, void>({
      query: () => "admin/permissions",
      providesTags: [{ type: "Permissions", id: "MATRIX" }],
    }),

    updateRolePermissions: builder.mutation<
      IPermissionMatrixResponse,
      { role: EditableRole; permissions: Permission[] }
    >({
      query: ({ role, permissions }) => ({
        url: `admin/permissions/roles/${role}`,
        method: "PUT",
        body: { permissions },
      }),
      invalidatesTags: ["Permissions"],
    }),

    getUserPermissions: builder.query<IUserPermissionsResponse, string>({
      query: (id) => `admin/permissions/users/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Permissions", id }],
    }),

    setUserPermissions: builder.mutation<
      IUserPermissionsResponse,
      { id: string; permissions: Permission[] }
    >({
      query: ({ id, permissions }) => ({
        url: `admin/permissions/users/${id}`,
        method: "PUT",
        body: { permissions },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Permissions", id }],
    }),
  }),
});

export const {
  useGetPermissionMatrixQuery,
  useUpdateRolePermissionsMutation,
  useGetUserPermissionsQuery,
  useSetUserPermissionsMutation,
} = permissionsApi;
