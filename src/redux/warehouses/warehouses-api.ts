import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateWarehouseInput,
  IRegistryListQuery,
  IRegistryListResponse,
  IUpdateWarehouseInput,
  IWarehouse,
  IWarehouseResponse,
} from "@/types/registry.types";
import type { IMessageResponse } from "@/types/auth.types";

/** The warehouse register, mirroring the backend `/admin/warehouses` surface. */
export const warehousesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWarehouses: builder.query<
      IRegistryListResponse<IWarehouse>,
      IRegistryListQuery | void
    >({
      query: (params) => `admin/warehouses${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Warehouses" as const, id: "LIST" },
              ...result.data.map((w) => ({
                type: "Warehouses" as const,
                id: w.id,
              })),
            ]
          : [{ type: "Warehouses" as const, id: "LIST" }],
    }),

    getWarehouse: builder.query<IWarehouseResponse, string>({
      query: (id) => `admin/warehouses/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Warehouses", id }],
    }),

    createWarehouse: builder.mutation<
      IWarehouseResponse,
      ICreateWarehouseInput
    >({
      query: (body) => ({ url: "admin/warehouses", method: "POST", body }),
      invalidatesTags: [{ type: "Warehouses", id: "LIST" }],
    }),

    updateWarehouse: builder.mutation<
      IWarehouseResponse,
      { id: string; body: IUpdateWarehouseInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/warehouses/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Warehouses", id },
        { type: "Warehouses", id: "LIST" },
      ],
    }),

    deactivateWarehouse: builder.mutation<IWarehouseResponse, string>({
      query: (id) => ({
        url: `admin/warehouses/${id}/deactivate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Warehouses", id },
        { type: "Warehouses", id: "LIST" },
      ],
    }),

    activateWarehouse: builder.mutation<IWarehouseResponse, string>({
      query: (id) => ({
        url: `admin/warehouses/${id}/activate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Warehouses", id },
        { type: "Warehouses", id: "LIST" },
      ],
    }),

    deleteWarehouse: builder.mutation<IMessageResponse, string>({
      query: (id) => ({ url: `admin/warehouses/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Warehouses", id: "LIST" }],
    }),
  }),
});

export const {
  useGetWarehousesQuery,
  useGetWarehouseQuery,
  useCreateWarehouseMutation,
  useUpdateWarehouseMutation,
  useDeactivateWarehouseMutation,
  useActivateWarehouseMutation,
  useDeleteWarehouseMutation,
} = warehousesApi;
