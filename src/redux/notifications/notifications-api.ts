import { apiSlice } from "../api-slice";
import { toQueryString } from "@/lib/to-query-string";
import type {
  INotificationListQuery,
  INotificationListResponse,
} from "@/types/notification.types";

/** The notifications log, mirroring `/admin/notifications` (owner monitoring). */
export const notificationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      INotificationListResponse,
      INotificationListQuery | void
    >({
      query: (params) => `admin/notifications${toQueryString(params ?? {})}`,
      providesTags: [{ type: "Notifications", id: "LIST" }],
    }),
  }),
});

export const { useGetNotificationsQuery } = notificationsApi;
