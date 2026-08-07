import { apiSlice } from "../api-slice";
import type {
  ISettingsResponse,
  IUpdateSettingsInput,
} from "@/types/settings.types";

/** Owner-editable system settings (`/admin/settings`, super-admin only). */
export const settingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<ISettingsResponse, void>({
      query: () => "admin/settings",
      providesTags: [{ type: "Settings", id: "ALL" }],
    }),

    updateSettings: builder.mutation<ISettingsResponse, IUpdateSettingsInput>({
      query: (body) => ({ url: "admin/settings", method: "PATCH", body }),
      invalidatesTags: [{ type: "Settings", id: "ALL" }],
    }),

    /** The owner's signature - uploaded as an image, or drawn on the pad
     * and sent as one. Stamped server-side on every document. */
    uploadDocumentSignature: builder.mutation<
      { data: { documentSignatureUrl: string } },
      File
    >({
      query: (file) => {
        const form = new FormData();
        form.append("signature", file);
        return { body: form, method: "POST", url: "admin/settings/signature" };
      },
      invalidatesTags: [{ type: "Settings", id: "ALL" }],
    }),

    removeDocumentSignature: builder.mutation<{ message: string }, void>({
      query: () => ({ method: "DELETE", url: "admin/settings/signature" }),
      invalidatesTags: [{ type: "Settings", id: "ALL" }],
    }),
  }),
});

export const {
  useGetSettingsQuery,
  useRemoveDocumentSignatureMutation,
  useUpdateSettingsMutation,
  useUploadDocumentSignatureMutation,
} = settingsApi;
