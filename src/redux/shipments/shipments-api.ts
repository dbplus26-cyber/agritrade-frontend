import { apiSlice } from "../api-slice";
import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import type {
  IAddShipmentSalesInput,
  IAllocationInput,
  IArriveShipmentInput,
  IRecordArrivalInput,
  IAvailableLotsResponse,
  ICreateShipmentInput,
  IDispatchShipmentInput,
  IEligibleSalesResponse,
  IShipmentExpenseInput,
  IRevokeSignatureInput,
  IShipmentListQuery,
  IShipmentListResponse,
  IShipmentResponse,
  IRemoveShipmentSaleInput,
  ISignShipmentInput,
  IUpdateShipmentInput,
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

    /** Edit a plan that has not left: destination, driver, truck, ETA, and
     * the sheds the truck loads at. Changing the sheds moves which lots the
     * allocate screen offers first. */
    updateShipment: builder.mutation<IShipmentResponse, IUpdateShipmentInput>({
      query: ({ id, ...body }) => ({
        url: `admin/shipments/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
        { type: "Shipments", id: `LOTS-${id}` },
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
      // remaining (shippable) weight. A farm-gate slice moves no shed balance
      // but does empty what its supplier was holding.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
        { type: "Stock", id: "LIST" },
        { type: "Stock", id: "AT_SUPPLIERS" },
        { type: "StockMovements", id: "LIST" },
        { type: "Sales", id: "LIST" },
        { type: "EligibleSales", id: "LIST" },
        { type: "ApprovalsCount", id: "COUNT" },
      ],
    }),

    /**
     * Mark the trip arrived, and - when somebody has weighed it - record what
     * actually came off it. The figures move each sale's settled total, which
     * is what its balance, the debtors list and the sale stats are measured
     * against, so the sales side invalidates with the shipment.
     */
    arriveShipment: builder.mutation<IShipmentResponse, IArriveShipmentInput>({
      query: ({ id, arrivedAt, sales }) => ({
        url: `admin/shipments/${id}/arrive`,
        method: "PATCH",
        body: {
          ...(arrivedAt ? { arrivedAt } : {}),
          // Absent, not empty: `sales: []` and "nobody has weighed it" are the
          // same request, and an empty array only invites the server to walk it.
          ...(sales?.length ? { sales } : {}),
        },
      }),
      invalidatesTags: (_r, _e, { id, sales }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
        ...(sales?.length
          ? [
              ...sales.map((s) => ({ type: "Sales" as const, id: s.saleId })),
              { type: "Sales" as const, id: "LIST" },
              { type: "Reports" as const, id: "DEBTORS" },
              { type: "SaleStats" as const, id: "SUMMARY" },
              { type: "Reports" as const, id: "LIST" },
            ]
          : []),
      ],
    }),

    /**
     * The figures for a trip already marked arrived, or a correction to ones
     * recorded earlier. A trip is routinely marked arrived from the yard,
     * before the weighbridge ticket reaches the office, and without this the
     * buyer would stay billed at the loaded weight for good.
     *
     * Invalidates exactly what `arriveShipment` does with figures: these move
     * the same settled totals.
     */
    recordArrivalFigures: builder.mutation<
      IShipmentResponse,
      IRecordArrivalInput
    >({
      query: ({ id, sales }) => ({
        url: `admin/shipments/${id}/arrival-figures`,
        method: "PATCH",
        body: { sales },
      }),
      invalidatesTags: (_r, _e, { id, sales }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
        ...sales.map((s) => ({ type: "Sales" as const, id: s.saleId })),
        { type: "Sales" as const, id: "LIST" },
        { type: "Reports" as const, id: "DEBTORS" },
        { type: "SaleStats" as const, id: "SUMMARY" },
        { type: "Reports" as const, id: "LIST" },
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
      // A shipment expense IS an ordinary Expense voucher, so the general
      // expenses register and the reports built on it must refresh too, exactly
      // as voiding one below does.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Expenses", id: "LIST" },
        { type: "Reports", id: "LIST" },
      ],
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

    /**
     * The driver's mark, taken at the depot. Multipart per the backend
     * contract, and the file is compulsory: a name with no signature attached
     * is refused with SIGNATURE_REQUIRED, which is the right answer.
     */
    signShipmentDriver: builder.mutation<IShipmentResponse, ISignShipmentInput>({
      query: ({ id, file, signedName }) => {
        const form = new FormData();
        form.append("payload", JSON.stringify(signedName ? { signedName } : {}));
        if (file) form.append("signature", file);
        return {
          url: `admin/shipments/${id}/signatures/driver`,
          method: "POST",
          body: form,
        };
      },
      // Signing satisfies the dispatch gate, so the list's status column and
      // the trip both change meaning.
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
      ],
    }),

    /**
     * The owner's countersignature. Owner-only at the router, so the console
     * only ever offers it to a super admin. Sending NO file applies the
     * signature saved in Settings - the owner does not redraw it per trip.
     */
    signShipmentOwner: builder.mutation<IShipmentResponse, ISignShipmentInput>({
      query: ({ id, file, signedName }) => {
        const form = new FormData();
        form.append("payload", JSON.stringify(signedName ? { signedName } : {}));
        if (file) form.append("signature", file);
        return {
          url: `admin/shipments/${id}/signatures/owner`,
          method: "POST",
          body: form,
        };
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
      ],
    }),

    /**
     * Owner-only. A mark is never signed over: correcting one withdraws it
     * with a reason, and the struck-out row stays on the record.
     */
    revokeShipmentSignature: builder.mutation<
      IShipmentResponse,
      IRevokeSignatureInput
    >({
      query: ({ id, reason, role }) => ({
        url: `admin/shipments/${id}/signatures/${role}/revoke`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Shipments", id },
        { type: "Shipments", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetShipmentsQuery,
  useGetShipmentQuery,
  useGetAvailableLotsQuery,
  useGetEligibleSalesQuery,
  useCreateShipmentMutation,
  useUpdateShipmentMutation,
  useAddShipmentSalesMutation,
  useRemoveShipmentSaleMutation,
  useSetAllocationsMutation,
  useDispatchShipmentMutation,
  useArriveShipmentMutation,
  useRecordArrivalFiguresMutation,
  useCloseShipmentMutation,
  useCancelShipmentMutation,
  useAddShipmentExpenseMutation,
  useVoidShipmentExpenseMutation,
  useAddShipmentDocumentMutation,
  useRemoveShipmentDocumentMutation,
  useSignShipmentDriverMutation,
  useSignShipmentOwnerMutation,
  useRevokeShipmentSignatureMutation,
} = shipmentsApi;
