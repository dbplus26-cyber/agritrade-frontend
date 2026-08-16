import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  ICreateDriverInput,
  IDriver,
  IDriverListQuery,
  IDriverResponse,
  IUpdateDriverInput,
} from "@/types/logistics.types";
import type { IRegistryListResponse } from "@/types/registry.types";
import type { IMessageResponse } from "@/types/auth.types";
import type { IDriverPaymentsResponse } from "@/types/driver-settlement.types";

/** JSON unless a photo rides along, then `payload` + `photo` multipart parts. */
const withOptionalPhoto = (
  body: ICreateDriverInput | IUpdateDriverInput,
  photo?: File,
): FormData | ICreateDriverInput | IUpdateDriverInput => {
  if (!photo) return body;
  const form = new FormData();
  form.append("payload", JSON.stringify(body));
  form.append("photo", photo);
  return form;
};

/** The drivers directory, mirroring the backend `/admin/drivers` surface
 * (supplier-shaped: optional photo, activate/deactivate lifecycle). */
export const driversApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDrivers: builder.query<
      IRegistryListResponse<IDriver>,
      IDriverListQuery | void
    >({
      query: (params) => `admin/drivers${toQueryString(params ?? {})}`,
      providesTags: (result) =>
        result
          ? [
              { type: "Drivers" as const, id: "LIST" },
              ...result.data.map((d) => ({
                type: "Drivers" as const,
                id: d.id,
              })),
            ]
          : [{ type: "Drivers" as const, id: "LIST" }],
    }),

    getDriver: builder.query<IDriverResponse, string>({
      query: (id) => `admin/drivers/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Drivers", id }],
    }),

    /**
     * What this driver has been paid, across every trip, each row carrying the
     * voucher its PDF is fetched by. For a driver with no email on file this
     * is the only copy of their receipts, since nothing was ever sent to them.
     *
     * It subscribes to UNSETTLED as well as to the driver. Every driver-payment
     * write - record and reverse alike - invalidates that tag, so it is the
     * console's "a driver ledger moved" broadcast; without it, paying somebody
     * on the shipment screen would leave this list showing yesterday's history
     * to whoever walked over to the driver's record next.
     */
    getDriverPayments: builder.query<
      IDriverPaymentsResponse,
      { driverId: string; page?: number; limit?: number }
    >({
      query: ({ driverId, ...params }) =>
        `admin/drivers/${driverId}/payments${toQueryString(params)}`,
      providesTags: (_r, _e, { driverId }) => [
        { type: "Drivers" as const, id: driverId },
        { type: "DriverSettlement" as const, id: "UNSETTLED" },
      ],
    }),

    createDriver: builder.mutation<
      IDriverResponse,
      { body: ICreateDriverInput; photo?: File }
    >({
      query: ({ body, photo }) => ({
        url: "admin/drivers",
        method: "POST",
        body: withOptionalPhoto(body, photo),
      }),
      invalidatesTags: [{ type: "Drivers", id: "LIST" }],
    }),

    updateDriver: builder.mutation<
      IDriverResponse,
      { id: string; body: IUpdateDriverInput; photo?: File }
    >({
      query: ({ id, body, photo }) => ({
        url: `admin/drivers/${id}`,
        method: "PATCH",
        body: withOptionalPhoto(body, photo),
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Drivers", id },
        { type: "Drivers", id: "LIST" },
      ],
    }),

    deactivateDriver: builder.mutation<IDriverResponse, string>({
      query: (id) => ({
        url: `admin/drivers/${id}/deactivate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Drivers", id },
        { type: "Drivers", id: "LIST" },
      ],
    }),

    activateDriver: builder.mutation<IDriverResponse, string>({
      query: (id) => ({
        url: `admin/drivers/${id}/activate`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Drivers", id },
        { type: "Drivers", id: "LIST" },
      ],
    }),

    // Super admin only; the backend refuses with DEACTIVATE_INSTEAD once the
    // driver has trips.
    deleteDriver: builder.mutation<IMessageResponse, string>({
      query: (id) => ({ url: `admin/drivers/${id}`, method: "DELETE" }),
      invalidatesTags: [{ type: "Drivers", id: "LIST" }],
    }),
  }),
});

export const {
  useGetDriversQuery,
  useGetDriverQuery,
  useGetDriverPaymentsQuery,
  useCreateDriverMutation,
  useUpdateDriverMutation,
  useDeactivateDriverMutation,
  useActivateDriverMutation,
  useDeleteDriverMutation,
} = driversApi;
