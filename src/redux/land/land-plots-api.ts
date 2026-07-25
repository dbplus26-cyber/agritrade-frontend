import { apiSlice } from "../api-slice";
import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreatePlotInput,
  ILandPlotListQuery,
  ILandPlotListResponse,
  ILandPlotResponse,
  IUpdatePlotInput,
} from "@/types/land.types";

/** Authenticated download URL for a private plot document (audited server-side). */
export const plotDocumentUrl = (plotId: string, documentId: string): string =>
  `${env.SERVER_URI}/api/v1/admin/land/plots/${plotId}/documents/${documentId}`;

/** The land plot register, mirroring `/admin/land/plots` (owner-only). */
export const landPlotsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPlots: builder.query<ILandPlotListResponse, ILandPlotListQuery | void>({
      query: (params) => `admin/land/plots${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "LandPlots" as const, id: "LIST" },
              ...result.data.map((p) => ({ type: "LandPlots" as const, id: p.id })),
            ]
          : [{ type: "LandPlots" as const, id: "LIST" }],
    }),

    getPlot: builder.query<ILandPlotResponse, string>({
      query: (id) => `admin/land/plots/${id}`,
      providesTags: (_r, _e, id) => [{ type: "LandPlots", id }],
    }),

    createPlot: builder.mutation<ILandPlotResponse, ICreatePlotInput>({
      query: (body) => ({ url: "admin/land/plots", method: "POST", body }),
      invalidatesTags: [{ type: "LandPlots", id: "LIST" }],
    }),

    updatePlot: builder.mutation<
      ILandPlotResponse,
      { id: string; body: IUpdatePlotInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/land/plots/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "LandPlots", id },
        { type: "LandPlots", id: "LIST" },
      ],
    }),

    setPlotArchived: builder.mutation<
      ILandPlotResponse,
      { id: string; archived: boolean }
    >({
      query: ({ id, archived }) => ({
        url: `admin/land/plots/${id}/${archived ? "archive" : "restore"}`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "LandPlots", id },
        { type: "LandPlots", id: "LIST" },
      ],
    }),

    requestPlotPublish: builder.mutation<ILandPlotResponse, string>({
      query: (id) => ({ url: `admin/land/plots/${id}/publish`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "LandPlots", id },
        { type: "ApprovalsCount", id: "COUNT" },
      ],
    }),

    unpublishPlot: builder.mutation<ILandPlotResponse, string>({
      query: (id) => ({
        url: `admin/land/plots/${id}/unpublish`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "LandPlots", id },
        { type: "LandPlots", id: "LIST" },
      ],
    }),

    addPlotPhoto: builder.mutation<
      ILandPlotResponse,
      { id: string; file: File; alt?: string }
    >({
      query: ({ id, file, alt }) => {
        const form = new FormData();
        form.append("photo", file);
        if (alt) form.append("alt", alt);
        return { url: `admin/land/plots/${id}/photos`, method: "POST", body: form };
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: "LandPlots", id }],
    }),

    removePlotPhoto: builder.mutation<
      ILandPlotResponse,
      { id: string; photoId: string }
    >({
      query: ({ id, photoId }) => ({
        url: `admin/land/plots/${id}/photos/${photoId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "LandPlots", id }],
    }),

    addPlotDocument: builder.mutation<
      ILandPlotResponse,
      { id: string; file: File; name: string }
    >({
      query: ({ id, file, name }) => {
        const form = new FormData();
        form.append("document", file);
        form.append("name", name);
        return {
          url: `admin/land/plots/${id}/documents`,
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: "LandPlots", id }],
    }),

    removePlotDocument: builder.mutation<
      ILandPlotResponse,
      { id: string; documentId: string }
    >({
      query: ({ id, documentId }) => ({
        url: `admin/land/plots/${id}/documents/${documentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "LandPlots", id }],
    }),
  }),
});

export const {
  useGetPlotsQuery,
  useGetPlotQuery,
  useCreatePlotMutation,
  useUpdatePlotMutation,
  useSetPlotArchivedMutation,
  useRequestPlotPublishMutation,
  useUnpublishPlotMutation,
  useAddPlotPhotoMutation,
  useRemovePlotPhotoMutation,
  useAddPlotDocumentMutation,
  useRemovePlotDocumentMutation,
} = landPlotsApi;
