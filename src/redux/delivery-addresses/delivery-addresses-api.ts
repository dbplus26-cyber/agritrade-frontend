import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateDeliveryAddressInput,
  IDeliveryAddress,
  IDeliveryAddressListQuery,
  IDeliveryAddressResponse,
  IUpdateDeliveryAddressInput,
} from "@/types/logistics.types";
import type { IRegistryListResponse } from "@/types/registry.types";
import type { IMessageResponse } from "@/types/auth.types";

/** Saved delivery addresses, mirroring the backend `/admin/delivery-addresses`
 * surface (registry-shaped, JSON only - no photo). */
export const deliveryAddressesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDeliveryAddresses: builder.query<
      IRegistryListResponse<IDeliveryAddress>,
      IDeliveryAddressListQuery | void
    >({
      query: (params) => `admin/delivery-addresses${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "DeliveryAddresses" as const, id: "LIST" },
              ...result.data.map((a) => ({
                type: "DeliveryAddresses" as const,
                id: a.id,
              })),
            ]
          : [{ type: "DeliveryAddresses" as const, id: "LIST" }],
    }),

    getDeliveryAddress: builder.query<IDeliveryAddressResponse, string>({
      query: (id) => `admin/delivery-addresses/${id}`,
      providesTags: (_r, _e, id) => [{ type: "DeliveryAddresses", id }],
    }),

    createDeliveryAddress: builder.mutation<
      IDeliveryAddressResponse,
      ICreateDeliveryAddressInput
    >({
      query: (body) => ({
        url: "admin/delivery-addresses",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "DeliveryAddresses", id: "LIST" }],
    }),

    updateDeliveryAddress: builder.mutation<
      IDeliveryAddressResponse,
      { id: string; body: IUpdateDeliveryAddressInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/delivery-addresses/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "DeliveryAddresses", id },
        { type: "DeliveryAddresses", id: "LIST" },
      ],
    }),

    deactivateDeliveryAddress: builder.mutation<IDeliveryAddressResponse, string>({
      query: (id) => ({
        url: `admin/delivery-addresses/${id}/deactivate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "DeliveryAddresses", id },
        { type: "DeliveryAddresses", id: "LIST" },
      ],
    }),

    activateDeliveryAddress: builder.mutation<IDeliveryAddressResponse, string>({
      query: (id) => ({
        url: `admin/delivery-addresses/${id}/activate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "DeliveryAddresses", id },
        { type: "DeliveryAddresses", id: "LIST" },
      ],
    }),

    deleteDeliveryAddress: builder.mutation<IMessageResponse, string>({
      query: (id) => ({
        url: `admin/delivery-addresses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "DeliveryAddresses", id: "LIST" }],
    }),
  }),
});

export const {
  useGetDeliveryAddressesQuery,
  useGetDeliveryAddressQuery,
  useCreateDeliveryAddressMutation,
  useUpdateDeliveryAddressMutation,
  useDeactivateDeliveryAddressMutation,
  useActivateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
} = deliveryAddressesApi;
