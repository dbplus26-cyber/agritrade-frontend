import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateSupplierInput,
  IRegistryListResponse,
  ISupplier,
  ISupplierListQuery,
  ISupplierResponse,
  IUpdateSupplierInput,
} from "@/types/registry.types";
import type { IMessageResponse } from "@/types/auth.types";

/** JSON unless a photo rides along, then `payload` + `photo` multipart parts. */
const withOptionalPhoto = (
  body: ICreateSupplierInput | IUpdateSupplierInput,
  photo?: File,
): FormData | ICreateSupplierInput | IUpdateSupplierInput => {
  if (!photo) return body;
  const form = new FormData();
  form.append("payload", JSON.stringify(body));
  form.append("photo", photo);
  return form;
};

/** The supplier directory, mirroring the backend `/admin/suppliers` surface. */
export const suppliersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSuppliers: builder.query<
      IRegistryListResponse<ISupplier>,
      ISupplierListQuery | void
    >({
      query: (params) => `admin/suppliers${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Suppliers" as const, id: "LIST" },
              ...result.data.map((s) => ({
                type: "Suppliers" as const,
                id: s.id,
              })),
            ]
          : [{ type: "Suppliers" as const, id: "LIST" }],
    }),

    getSupplier: builder.query<ISupplierResponse, string>({
      query: (id) => `admin/suppliers/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Suppliers", id }],
    }),

    createSupplier: builder.mutation<
      ISupplierResponse,
      { body: ICreateSupplierInput; photo?: File }
    >({
      query: ({ body, photo }) => ({
        url: "admin/suppliers",
        method: "POST",
        body: withOptionalPhoto(body, photo),
      }),
      invalidatesTags: [{ type: "Suppliers", id: "LIST" }],
    }),

    updateSupplier: builder.mutation<
      ISupplierResponse,
      { id: string; body: IUpdateSupplierInput; photo?: File }
    >({
      query: ({ id, body, photo }) => ({
        url: `admin/suppliers/${id}`,
        method: "PATCH",
        body: withOptionalPhoto(body, photo),
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Suppliers", id },
        { type: "Suppliers", id: "LIST" },
      ],
    }),

    deactivateSupplier: builder.mutation<ISupplierResponse, string>({
      query: (id) => ({
        url: `admin/suppliers/${id}/deactivate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Suppliers", id },
        { type: "Suppliers", id: "LIST" },
      ],
    }),

    activateSupplier: builder.mutation<ISupplierResponse, string>({
      query: (id) => ({
        url: `admin/suppliers/${id}/activate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Suppliers", id },
        { type: "Suppliers", id: "LIST" },
      ],
    }),

    deleteSupplier: builder.mutation<IMessageResponse, string>({
      query: (id) => ({ url: `admin/suppliers/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Suppliers", id: "LIST" }],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useGetSupplierQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeactivateSupplierMutation,
  useActivateSupplierMutation,
  useDeleteSupplierMutation,
} = suppliersApi;
