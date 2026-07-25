import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateLandAcquisitionInput,
  ILandAcquisitionListQuery,
  ILandAcquisitionListResponse,
  ILandAcquisitionResponse,
  IRecordAcquisitionPaymentInput,
  IUpdateLandAcquisitionInput,
} from "@/types/land.types";

/**
 * The land-acquisitions (buying) book, mirroring `/admin/land/acquisitions`
 * (owner-only). Completing an acquisition produces a plot, so those mutations
 * also invalidate the plots list.
 */
export const landAcquisitionsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getLandAcquisitions: builder.query<
      ILandAcquisitionListResponse,
      ILandAcquisitionListQuery | void
    >({
      query: (params) =>
        `admin/land/acquisitions${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "LandAcquisitions" as const, id: "LIST" },
              ...result.data.map((a) => ({
                type: "LandAcquisitions" as const,
                id: a.id,
              })),
            ]
          : [{ type: "LandAcquisitions" as const, id: "LIST" }],
    }),

    getLandAcquisition: builder.query<ILandAcquisitionResponse, string>({
      query: (id) => `admin/land/acquisitions/${id}`,
      providesTags: (_r, _e, id) => [{ type: "LandAcquisitions", id }],
    }),

    createLandAcquisition: builder.mutation<
      ILandAcquisitionResponse,
      ICreateLandAcquisitionInput
    >({
      query: (body) => ({
        url: "admin/land/acquisitions",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "LandAcquisitions", id: "LIST" }],
    }),

    updateLandAcquisition: builder.mutation<
      ILandAcquisitionResponse,
      { id: string; body: IUpdateLandAcquisitionInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/land/acquisitions/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "LandAcquisitions", id },
        { type: "LandAcquisitions", id: "LIST" },
      ],
    }),

    agreeLandAcquisition: builder.mutation<ILandAcquisitionResponse, string>({
      query: (id) => ({
        url: `admin/land/acquisitions/${id}/agree`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "LandAcquisitions", id },
        { type: "LandAcquisitions", id: "LIST" },
      ],
    }),

    completeLandAcquisition: builder.mutation<ILandAcquisitionResponse, string>({
      query: (id) => ({
        url: `admin/land/acquisitions/${id}/complete`,
        method: "PATCH",
      }),
      // Completion produces a new plot in the register.
      invalidatesTags: (_r, _e, id) => [
        { type: "LandAcquisitions", id },
        { type: "LandAcquisitions", id: "LIST" },
        { type: "LandPlots", id: "LIST" },
      ],
    }),

    cancelLandAcquisition: builder.mutation<
      ILandAcquisitionResponse,
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `admin/land/acquisitions/${id}/cancel`,
        method: "PATCH",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "LandAcquisitions", id },
        { type: "LandAcquisitions", id: "LIST" },
      ],
    }),

    recordAcquisitionPayment: builder.mutation<
      ILandAcquisitionResponse,
      { id: string; body: IRecordAcquisitionPaymentInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/land/acquisitions/${id}/payments`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "LandAcquisitions", id },
        { type: "LandAcquisitions", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useAgreeLandAcquisitionMutation,
  useCancelLandAcquisitionMutation,
  useCompleteLandAcquisitionMutation,
  useCreateLandAcquisitionMutation,
  useGetLandAcquisitionQuery,
  useGetLandAcquisitionsQuery,
  useRecordAcquisitionPaymentMutation,
  useUpdateLandAcquisitionMutation,
} = landAcquisitionsApi;
