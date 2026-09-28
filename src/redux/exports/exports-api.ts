import { apiSlice } from "../api-slice";
import { collectExportRows, type CsvSource } from "@/lib/csv-export";
import { toQueryString } from "@/lib/to-query-string";
import { extractApiError } from "@/lib/extract-api-error";

export const exportsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // A GET-only mutation avoids retaining every exported page in the list cache.
    getCsvRows: builder.mutation<unknown[], CsvSource>({
      async queryFn(source, api, _extraOptions, baseQuery) {
        try {
          const rows = await collectExportRows(async (page) => {
            const result = await baseQuery({
              url: `${source.url}${toQueryString({ ...source.params, page, limit: 100 })}`,
              method: "GET",
            });
            if (result.error) throw result.error;
            return result.data;
          }, api.signal);
          return { data: rows };
        } catch (error) {
          return {
            error: {
              status: "CUSTOM_ERROR",
              error: extractApiError(error).message,
              data: { message: extractApiError(error).message },
            },
          };
        }
      },
    }),
  }),
});

export const { useGetCsvRowsMutation } = exportsApi;
