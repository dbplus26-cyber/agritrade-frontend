import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type { IEnquiryInput, IEnquiryResponse } from "@/types/enquiry.types";
import type {
  IAdminEnquiryListResponse,
  IAdminEnquiryResponse,
  IEnquiryListQuery,
  IEnquiryStatsResponse,
  IUpdateEnquiryInput,
} from "@/types/inbox.types";
import type { IMessageResponse } from "@/types/auth.types";

/**
 * Contact enquiries: the public "send an enquiry" mutation plus the staff
 * console surface (`/admin/enquiries` - list, stats, read, work, delete).
 * Everything shares the `Enquiries` tag, so a public submission or a status
 * change refreshes the queue and the stat strip together.
 */
export const enquiriesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createEnquiry: builder.mutation<IEnquiryResponse, IEnquiryInput>({
      query: (body) => ({ url: "public/enquiries", method: "POST", body }),
      invalidatesTags: ["Enquiries"],
    }),

    getEnquiries: builder.query<
      IAdminEnquiryListResponse,
      IEnquiryListQuery | void
    >({
      query: (params) => `admin/enquiries${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Enquiries" as const, id: "LIST" },
              ...result.data.map((e) => ({
                type: "Enquiries" as const,
                id: e.id,
              })),
            ]
          : [{ type: "Enquiries" as const, id: "LIST" }],
    }),

    getEnquiryStats: builder.query<IEnquiryStatsResponse, void>({
      query: () => "admin/enquiries/stats",
      providesTags: [{ type: "Enquiries", id: "STATS" }],
    }),

    getEnquiry: builder.query<IAdminEnquiryResponse, string>({
      query: (id) => `admin/enquiries/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Enquiries", id }],
    }),

    updateEnquiry: builder.mutation<
      IAdminEnquiryResponse,
      { id: string; body: IUpdateEnquiryInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/enquiries/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Enquiries", id },
        { type: "Enquiries", id: "LIST" },
        { type: "Enquiries", id: "STATS" },
      ],
    }),

    deleteEnquiry: builder.mutation<IMessageResponse, string>({
      query: (id) => ({ url: `admin/enquiries/${id}`, method: "DELETE" }),
      invalidatesTags: [
        { type: "Enquiries", id: "LIST" },
        { type: "Enquiries", id: "STATS" },
      ],
    }),
  }),
});

export const {
  useCreateEnquiryMutation,
  useGetEnquiriesQuery,
  useGetEnquiryStatsQuery,
  useGetEnquiryQuery,
  useUpdateEnquiryMutation,
  useDeleteEnquiryMutation,
} = enquiriesApi;
