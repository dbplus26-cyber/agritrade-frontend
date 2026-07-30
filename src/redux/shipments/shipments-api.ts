import { apiSlice } from "../api-slice";
import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IAddShipmentSalesInput,
  IAllocationInput,
  IAvailableLotsResponse,
  ICreateShipmentInput,
  IDispatchShipmentInput,
  IEligibleSalesResponse,
  IShipmentExpenseInput,
  IShipmentListQuery,
  IShipmentListResponse,
  IShipmentResponse,
  IRemoveShipmentSaleInput,
} from "@/types/admin-shipment.types";

/** Authenticated download URL for a private shipment document (audited
 * server-side; the API 302-redirects to a signed URL). */
export const shipmentDocumentUrl = (
  shipmentId: string,
  documentId: string,
): string =>
  `${env.SERVER_URI}/api/v1/admin/shipments/${shipmentId}/documents/${documentId}`;

/** The staff-accessible, money-free waybill PDF for a shipment. */
export const shipmentWaybillPdfUrl = (shipmentId: string): string =>
  `${env.SERVER_URI}/api/v1/admin/receipts/shipment/${shipmentId}.pdf`;

/**
 * The shipments surface, mirroring `/admin/shipments`. Dispatch writes stock
 * movements and can fulfil the sales, so it invalidates Stock and Sales too.
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

    /** Sales a new truck may carry: CONFIRMED, payment terms met, unshipped
     * weight left, and not already planned onto an active shipment. */
    getEligibleSales: builder.query<IEligibleSalesResponse, void>({
      query: () => "admin/shipments/eligible-sales",
      providesTags: [{ type: "EligibleSales", id: "LIST" }],
    }),

    createShipment: builder.mutation<IShipmentResponse, ICreateShipmentInput>({
      query: (body) => ({ url: "admin/shipments", method: "POST", body }),
      // Planning a truck takes its sales out of the eligible pool.
      invalidatesTags: [
        { type: "Shipments", id: "LIST" },
        { type: "EligibleSales", id: "LIST" },
      ],
    }),

    /** Take on more orders while the truck is still planned - a half-empty
     * truck is a trip's margin lost. Both sides move the eligible pool. */
    addShipmentSales: builder.mutation<
      IShipmentResponse,
      IAddShipmentSalesInput
    >({
      query: ({ id, saleIds }) => ({
        url: `admin/shipments/${id}/sales`,
        method: "POST",
        body: { saleIds },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
        // A new sale can bring new commodities, so the lot picker changes too.
        { type: "Shipments", id: `LOTS-${id}` },
        { type: "EligibleSales", id: "LIST" },
      ],
    }),

    removeShipmentSale: builder.mutation<
      IShipmentResponse,
      IRemoveShipmentSaleInput
    >({
      query: ({ id, saleId }) => ({
        url: `admin/shipments/${id}/sales/${saleId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
        { type: "Shipments", id: `LOTS-${id}` },
        { type: "EligibleSales", id: "LIST" },
      ],
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
        { type: "EligibleSales", id: "LIST" },
      ],
    }),

    dispatchShipment: builder.mutation<
      IShipmentResponse,
      IDispatchShipmentInput
    >({
      query: ({ id, departedAt, overrideMissingWaybill }) => ({
        url: `admin/shipments/${id}/dispatch`,
        method: "PATCH",
        body: {
          ...(departedAt ? { departedAt } : {}),
          ...(overrideMissingWaybill ? { overrideMissingWaybill } : {}),
        },
      }),
      // Dispatch deducts stock, may fulfil the sales, and moves each sale's
      // remaining (shippable) weight.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
        { type: "Stock", id: "LIST" },
        { type: "Sales", id: "LIST" },
        { type: "EligibleSales", id: "LIST" },
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
      // Cancelling an active plan returns its sales to the eligible pool.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
        { type: "EligibleSales", id: "LIST" },
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

    /**
     * Owner-only. A wrong voucher is voided with a reason, never
     * hard-deleted - the row keeps its number and amount so "what happened
     * to EXP-2026-00042" stays answerable. Voiding moves the trip's profit,
     * and the voided cost leaves the general expenses register too.
     */
    voidShipmentExpense: builder.mutation<
      IShipmentResponse,
      { id: string; expenseId: string; reason: string }
    >({
      query: ({ id, expenseId, reason }) => ({
        url: `admin/shipments/${id}/expenses/${expenseId}/void`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Expenses", id: "LIST" },
        { type: "Reports", id: "LIST" },
      ],
    }),

    addShipmentDocument: builder.mutation<
      IShipmentResponse,
      { id: string; file: File; name: string }
    >({
      query: ({ id, file, name }) => {
        // Multipart per the backend contract: `payload` JSON part + `document`.
        const form = new FormData();
        form.append("payload", JSON.stringify({ name }));
        form.append("document", file);
        return {
          url: `admin/shipments/${id}/documents`,
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: (_r, _e, { id }) => [{ type: "Shipments", id }],
    }),

    removeShipmentDocument: builder.mutation<
      IShipmentResponse,
      { id: string; documentId: string }
    >({
      query: ({ id, documentId }) => ({
        url: `admin/shipments/${id}/documents/${documentId}`,
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
  useGetEligibleSalesQuery,
  useCreateShipmentMutation,
  useAddShipmentSalesMutation,
  useRemoveShipmentSaleMutation,
  useSetAllocationsMutation,
  useDispatchShipmentMutation,
  useArriveShipmentMutation,
  useCloseShipmentMutation,
  useCancelShipmentMutation,
  useAddShipmentExpenseMutation,
  useVoidShipmentExpenseMutation,
  useAddShipmentDocumentMutation,
  useRemoveShipmentDocumentMutation,
} = shipmentsApi;
