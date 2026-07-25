import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateInputItemInput,
  IInputItemListQuery,
  IInputItemListResponse,
  IInputItemResponse,
  IUpdateInputItemInput,
} from "@/types/farm.types";

/** The input catalogue, mirroring `/admin/farm/input-items` (owner-only). */
export const inputItemsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInputItems: builder.query<
      IInputItemListResponse,
      IInputItemListQuery | void
    >({
      query: (params) => `admin/farm/input-items${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "InputItems" as const, id: "LIST" },
              ...result.data.map((i) => ({
                type: "InputItems" as const,
                id: i.id,
              })),
            ]
          : [{ type: "InputItems" as const, id: "LIST" }],
    }),

    getInputItem: builder.query<IInputItemResponse, string>({
      query: (id) => `admin/farm/input-items/${id}`,
      providesTags: (_r, _e, id) => [{ type: "InputItems", id }],
    }),

    createInputItem: builder.mutation<IInputItemResponse, ICreateInputItemInput>({
      query: (body) => ({ url: "admin/farm/input-items", method: "POST", body }),
      invalidatesTags: [{ type: "InputItems", id: "LIST" }],
    }),

    updateInputItem: builder.mutation<
      IInputItemResponse,
      { id: string; body: IUpdateInputItemInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/farm/input-items/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "InputItems", id },
        { type: "InputItems", id: "LIST" },
      ],
    }),

    setInputItemActive: builder.mutation<
      IInputItemResponse,
      { id: string; active: boolean }
    >({
      query: ({ id, active }) => ({
        url: `admin/farm/input-items/${id}/${active ? "activate" : "deactivate"}`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "InputItems", id },
        { type: "InputItems", id: "LIST" },
      ],
    }),

    deleteInputItem: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `admin/farm/input-items/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "InputItems", id: "LIST" }],
    }),
  }),
});

export const {
  useGetInputItemsQuery,
  useGetInputItemQuery,
  useCreateInputItemMutation,
  useUpdateInputItemMutation,
  useSetInputItemActiveMutation,
  useDeleteInputItemMutation,
} = inputItemsApi;
