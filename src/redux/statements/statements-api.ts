// The financial-statement surface, mirroring `/admin/statements` on the API:
// the fixed-asset register, the drawings ledger, the opening position, the
// per-year draft/final flag, and the composed statement preview. All of it is
// owner-only server-side.
//
// One tag pair covers the whole surface: every input register feeds the SAME
// composed document, so any input mutation invalidates "Statements" (the
// preview) alongside "StatementInputs" (the registers themselves).
import { apiSlice } from "@/redux/api-slice";
import { env } from "@/lib/env";
import type {
  IAssetClass,
  IAssetClassBody,
  IDisposeAssetBody,
  IDrawing,
  IDrawingBody,
  IFixedAsset,
  IFixedAssetBody,
  IOpeningBalance,
  IOpeningBalanceBody,
  IStatementPeriod,
  IStatementPreview,
} from "@/types/statement.types";

/** The generated book itself - opened in a new tab, cookie-authenticated. */
export const statementPdfUrl = (year: number): string =>
  `${env.SERVER_URI}/api/v1/admin/statements/financial-statement.pdf?year=${String(year)}`;

export const statementsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createAssetClass: builder.mutation<
      { data: { assetClass: IAssetClass } },
      IAssetClassBody
    >({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: (body) => ({ body, method: "POST", url: "/admin/statements/asset-classes" }),
    }),
    createDrawing: builder.mutation<
      { data: { drawing: IDrawing } },
      IDrawingBody
    >({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: (body) => ({ body, method: "POST", url: "/admin/statements/drawings" }),
    }),
    createFixedAsset: builder.mutation<
      { data: { asset: IFixedAsset } },
      IFixedAssetBody
    >({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: (body) => ({ body, method: "POST", url: "/admin/statements/assets" }),
    }),
    deleteAssetClass: builder.mutation<{ message: string }, string>({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: (classId) => ({
        method: "DELETE",
        url: `/admin/statements/asset-classes/${classId}`,
      }),
    }),
    deleteDrawing: builder.mutation<{ message: string }, string>({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: (drawingId) => ({
        method: "DELETE",
        url: `/admin/statements/drawings/${drawingId}`,
      }),
    }),
    deleteFixedAsset: builder.mutation<{ message: string }, string>({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: (assetId) => ({
        method: "DELETE",
        url: `/admin/statements/assets/${assetId}`,
      }),
    }),
    disposeFixedAsset: builder.mutation<
      { data: { asset: IFixedAsset } },
      { assetId: string; body: IDisposeAssetBody }
    >({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: ({ assetId, body }) => ({
        body,
        method: "POST",
        url: `/admin/statements/assets/${assetId}/dispose`,
      }),
    }),
    getAssetClasses: builder.query<{ data: { assetClasses: IAssetClass[] } }, void>({
      providesTags: ["StatementInputs"],
      query: () => "/admin/statements/asset-classes",
    }),
    getDrawings: builder.query<{ data: { drawings: IDrawing[] } }, void>({
      providesTags: ["StatementInputs"],
      query: () => "/admin/statements/drawings",
    }),
    getFixedAssets: builder.query<{ data: { assets: IFixedAsset[] } }, void>({
      providesTags: ["StatementInputs"],
      query: () => "/admin/statements/assets",
    }),
    getOpeningBalance: builder.query<
      { data: { openingBalance: IOpeningBalance | null } },
      void
    >({
      providesTags: ["StatementInputs"],
      query: () => "/admin/statements/opening-balance",
    }),
    getStatementPeriods: builder.query<
      { data: { periods: IStatementPeriod[] } },
      void
    >({
      providesTags: ["StatementInputs"],
      query: () => "/admin/statements/periods",
    }),
    removeStatementLogo: builder.mutation<{ message: string }, void>({
      invalidatesTags: ["Settings", "Statements"],
      query: () => ({ method: "DELETE", url: "/admin/statements/logo" }),
    }),
    uploadStatementLogo: builder.mutation<
      { data: { statementLogoUrl: string } },
      File
    >({
      invalidatesTags: ["Settings", "Statements"],
      query: (file) => {
        const form = new FormData();
        form.append("logo", file);
        return { body: form, method: "POST", url: "/admin/statements/logo" };
      },
    }),
    getStatementPreview: builder.query<
      { data: { statement: IStatementPreview } },
      number
    >({
      providesTags: ["Statements"],
      query: (year) => `/admin/statements/financial-statement?year=${String(year)}`,
    }),
    setPeriodStatus: builder.mutation<
      { data: { period: IStatementPeriod } },
      { status: "DRAFT" | "FINAL"; year: number }
    >({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: (body) => ({ body, method: "PUT", url: "/admin/statements/periods" }),
    }),
    updateAssetClass: builder.mutation<
      { data: { assetClass: IAssetClass } },
      { body: Partial<IAssetClassBody> & { isActive?: boolean }; classId: string }
    >({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: ({ body, classId }) => ({
        body,
        method: "PATCH",
        url: `/admin/statements/asset-classes/${classId}`,
      }),
    }),
    updateFixedAsset: builder.mutation<
      { data: { asset: IFixedAsset } },
      { assetId: string; body: Partial<IFixedAssetBody> }
    >({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: ({ assetId, body }) => ({
        body,
        method: "PATCH",
        url: `/admin/statements/assets/${assetId}`,
      }),
    }),
    upsertOpeningBalance: builder.mutation<
      { data: { openingBalance: IOpeningBalance } },
      IOpeningBalanceBody
    >({
      invalidatesTags: ["StatementInputs", "Statements"],
      query: (body) => ({
        body,
        method: "PUT",
        url: "/admin/statements/opening-balance",
      }),
    }),
  }),
});

export const {
  useCreateAssetClassMutation,
  useCreateDrawingMutation,
  useCreateFixedAssetMutation,
  useDeleteAssetClassMutation,
  useDeleteDrawingMutation,
  useDeleteFixedAssetMutation,
  useDisposeFixedAssetMutation,
  useGetAssetClassesQuery,
  useGetDrawingsQuery,
  useGetFixedAssetsQuery,
  useGetOpeningBalanceQuery,
  useGetStatementPeriodsQuery,
  useGetStatementPreviewQuery,
  useRemoveStatementLogoMutation,
  useSetPeriodStatusMutation,
  useUpdateAssetClassMutation,
  useUpdateFixedAssetMutation,
  useUploadStatementLogoMutation,
  useUpsertOpeningBalanceMutation,
} = statementsApi;
