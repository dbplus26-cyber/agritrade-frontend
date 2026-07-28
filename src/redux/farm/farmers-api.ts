import { apiSlice } from "../api-slice";
import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateFarmerInput,
  IFarmerListQuery,
  IFarmerListResponse,
  IFarmerResponse,
  IGuarantorInput,
  IUpdateFarmerInput,
} from "@/types/farm.types";

/** Authenticated download URL for a private farmer document (audited server-side). */
export const farmerDocumentUrl = (
  farmerId: string,
  documentId: string,
): string =>
  `${env.SERVER_URI}/api/v1/admin/farm/farmers/${farmerId}/documents/${documentId}`;

/** Farmer fields + optional photo as the multipart `payload` + `photo` parts. */
const farmerForm = (
  body: ICreateFarmerInput | IUpdateFarmerInput,
  photo?: File,
): FormData => {
  const form = new FormData();
  form.append("payload", JSON.stringify(body));
  if (photo) form.append("photo", photo);
  return form;
};

/** The farmer register, mirroring `/admin/farm/farmers` (owner-only). */
export const farmersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getFarmers: builder.query<IFarmerListResponse, IFarmerListQuery | void>({
      query: (params) => `admin/farm/farmers${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Farmers" as const, id: "LIST" },
              ...result.data.map((f) => ({ type: "Farmers" as const, id: f.id })),
            ]
          : [{ type: "Farmers" as const, id: "LIST" }],
    }),

    getFarmer: builder.query<IFarmerResponse, string>({
      query: (id) => `admin/farm/farmers/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Farmers", id }],
    }),

    createFarmer: builder.mutation<
      IFarmerResponse,
      { body: ICreateFarmerInput; photo?: File }
    >({
      query: ({ body, photo }) => ({
        url: "admin/farm/farmers",
        method: "POST",
        body: farmerForm(body, photo),
      }),
      invalidatesTags: [{ type: "Farmers", id: "LIST" }],
    }),

    updateFarmer: builder.mutation<
      IFarmerResponse,
      { id: string; body: IUpdateFarmerInput; photo?: File }
    >({
      query: ({ id, body, photo }) => ({
        url: `admin/farm/farmers/${id}`,
        method: "PATCH",
        body: farmerForm(body, photo),
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Farmers", id },
        { type: "Farmers", id: "LIST" },
      ],
    }),

    setFarmerActive: builder.mutation<
      IFarmerResponse,
      { id: string; active: boolean }
    >({
      query: ({ id, active }) => ({
        url: `admin/farm/farmers/${id}/${active ? "activate" : "deactivate"}`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Farmers", id },
        { type: "Farmers", id: "LIST" },
      ],
    }),

    addFarmerDocument: builder.mutation<
      IFarmerResponse,
      { id: string; file: File; name: string }
    >({
      query: ({ id, file, name }) => {
        const form = new FormData();
        form.append("document", file);
        form.append("name", name);
        return {
          url: `admin/farm/farmers/${id}/documents`,
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: "Farmers", id }],
    }),

    removeFarmerDocument: builder.mutation<
      IFarmerResponse,
      { id: string; documentId: string }
    >({
      query: ({ id, documentId }) => ({
        url: `admin/farm/farmers/${id}/documents/${documentId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Farmers", id }],
    }),

    addFarmerGuarantor: builder.mutation<
      IFarmerResponse,
      { id: string; body: IGuarantorInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/farm/farmers/${id}/guarantors`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Farmers", id }],
    }),

    updateFarmerGuarantor: builder.mutation<
      IFarmerResponse,
      { id: string; guarantorId: string; body: Partial<IGuarantorInput> }
    >({
      query: ({ id, guarantorId, body }) => ({
        url: `admin/farm/farmers/${id}/guarantors/${guarantorId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Farmers", id }],
    }),

    removeFarmerGuarantor: builder.mutation<
      IFarmerResponse,
      { id: string; guarantorId: string }
    >({
      query: ({ id, guarantorId }) => ({
        url: `admin/farm/farmers/${id}/guarantors/${guarantorId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Farmers", id }],
    }),
  }),
});

export const {
  useGetFarmersQuery,
  useGetFarmerQuery,
  useCreateFarmerMutation,
  useUpdateFarmerMutation,
  useSetFarmerActiveMutation,
  useAddFarmerDocumentMutation,
  useRemoveFarmerDocumentMutation,
  useAddFarmerGuarantorMutation,
  useUpdateFarmerGuarantorMutation,
  useRemoveFarmerGuarantorMutation,
} = farmersApi;
