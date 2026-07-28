import { apiSlice } from "../api-slice";
import type {
  ISubmitFarmApplicationInput,
  ISubmitFarmApplicationResponse,
} from "@/types/public-farm-application.types";

/**
 * The public farming-programme application mutation. Invalidating
 * `FarmApplications` keeps any admin application queue in this store
 * fresh; admin queries live in their own file.
 */
export const publicFarmApplicationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    submitFarmApplication: builder.mutation<
      ISubmitFarmApplicationResponse,
      ISubmitFarmApplicationInput
    >({
      query: (body) => ({
        url: "public/farm-applications",
        method: "POST",
        body,
      }),
      invalidatesTags: ["FarmApplications"],
    }),
  }),
});

export const { useSubmitFarmApplicationMutation } = publicFarmApplicationsApi;
