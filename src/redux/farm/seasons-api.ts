import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateSeasonInput,
  ISeasonListQuery,
  ISeasonListResponse,
  ISeasonResponse,
  IUpdateSeasonInput,
} from "@/types/farm.types";

/** The farming-season register, mirroring `/admin/farm/seasons` (owner-only). */
export const seasonsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSeasons: builder.query<ISeasonListResponse, ISeasonListQuery | void>({
      query: (params) => `admin/farm/seasons${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Seasons" as const, id: "LIST" },
              ...result.data.map((s) => ({ type: "Seasons" as const, id: s.id })),
            ]
          : [{ type: "Seasons" as const, id: "LIST" }],
    }),

    getSeason: builder.query<ISeasonResponse, string>({
      query: (id) => `admin/farm/seasons/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Seasons", id }],
    }),

    createSeason: builder.mutation<ISeasonResponse, ICreateSeasonInput>({
      query: (body) => ({ url: "admin/farm/seasons", method: "POST", body }),
      invalidatesTags: [{ type: "Seasons", id: "LIST" }],
    }),

    updateSeason: builder.mutation<
      ISeasonResponse,
      { id: string; body: IUpdateSeasonInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/farm/seasons/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Seasons", id },
        { type: "Seasons", id: "LIST" },
      ],
    }),

    setSeasonActive: builder.mutation<
      ISeasonResponse,
      { id: string; active: boolean }
    >({
      query: ({ id, active }) => ({
        url: `admin/farm/seasons/${id}/${active ? "activate" : "deactivate"}`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Seasons", id },
        { type: "Seasons", id: "LIST" },
      ],
    }),

    deleteSeason: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `admin/farm/seasons/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Seasons", id: "LIST" }],
    }),
  }),
});

export const {
  useGetSeasonsQuery,
  useGetSeasonQuery,
  useCreateSeasonMutation,
  useUpdateSeasonMutation,
  useSetSeasonActiveMutation,
  useDeleteSeasonMutation,
} = seasonsApi;
