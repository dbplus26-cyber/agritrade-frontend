import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IAllocationInput,
  IAvailableLotsResponse,
  ICreateShipmentInput,
  IShipmentExpenseInput,
  IShipmentListQuery,
  IShipmentListResponse,
  IShipmentResponse,
} from "@/types/admin-shipment.types";

/**
 * The shipments surface, mirroring `/admin/shipments`. Dispatch writes stock
 * movements and can fulfil the sale, so it invalidates Stock and Sales too.
 */
export const shipmentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getShipments: builder.query<
      IShipmentListResponse,
      IShipmentListQuery | void
    >({
      query: (params) => `admin/shipments${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Shipments" as const, id: "LIST" },
              ...result.data.map((s) => ({
                type: "Shipments" as const,
                id: s.id,
              })),
            ]
          : [{ type: "Shipments" as const, id: "LIST" }],
    }),

    getShipment: builder.query<IShipmentResponse, string>({
      query: (id) => `admin/shipments/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Shipments", id }],
    }),

    getAvailableLots: builder.query<IAvailableLotsResponse, string>({
      query: (id) => `admin/shipments/${id}/available-lots`,
      providesTags: (_r, _e, id) => [{ type: "Shipments", id: `LOTS-${id}` }],
    }),

    createShipment: builder.mutation<IShipmentResponse, ICreateShipmentInput>({
      query: (body) => ({ url: "admin/shipments", method: "POST", body }),
      invalidatesTags: [{ type: "Shipments", id: "LIST" }],
    }),

    setAllocations: builder.mutation<
      IShipmentResponse,
      { id: string; allocations: IAllocationInput[] }
    >({
      query: ({ id, allocations }) => ({
        url: `admin/shipments/${id}/allocations`,
        method: "PUT",
        body: { allocations },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: `LOTS-${id}` },
      ],
    }),

    dispatchShipment: builder.mutation<IShipmentResponse, string>({
      query: (id) => ({ url: `admin/shipments/${id}/dispatch`, method: "PATCH" }),
      // Dispatch deducts stock and may fulfil the sale.
      invalidatesTags: (_r, _e, id) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
        { type: "Stock", id: "LIST" },
        { type: "Sales", id: "LIST" },
        { type: "ApprovalsCount", id: "COUNT" },
      ],
    }),

    arriveShipment: builder.mutation<IShipmentResponse, string>({
      query: (id) => ({ url: `admin/shipments/${id}/arrive`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
      ],
    }),

    closeShipment: builder.mutation<IShipmentResponse, string>({
      query: (id) => ({ url: `admin/shipments/${id}/close`, method: "PATCH" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
      ],
    }),

    cancelShipment: builder.mutation<
      IShipmentResponse,
      { id: string; reason: string }
    >({
      query: ({ id, reason }) => ({
        url: `admin/shipments/${id}/cancel`,
        method: "PATCH",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
      ],
    }),

    addShipmentExpense: builder.mutation<
      IShipmentResponse,
      { id: string; body: IShipmentExpenseInput }
    >({
      query: ({ id, body }) => ({
        url: `admin/shipments/${id}/expenses`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Shipments", id }],
    }),

    deleteShipmentExpense: builder.mutation<
      IShipmentResponse,
      { id: string; expenseId: string }
    >({
      query: ({ id, expenseId }) => ({
        url: `admin/shipments/${id}/expenses/${expenseId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Shipments", id }],
    }),
  }),
});

export const {
  useGetShipmentsQuery,
  useGetShipmentQuery,
  useGetAvailableLotsQuery,
  useCreateShipmentMutation,
  useSetAllocationsMutation,
  useDispatchShipmentMutation,
  useArriveShipmentMutation,
  useCloseShipmentMutation,
  useCancelShipmentMutation,
  useAddShipmentExpenseMutation,
  useDeleteShipmentExpenseMutation,
} = shipmentsApi;
