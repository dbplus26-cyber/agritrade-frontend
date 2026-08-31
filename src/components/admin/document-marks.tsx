"use client";

import { apiSlice } from "@/redux/api-slice";
import { cn } from "@/lib/utils";

/**
 * The marks every on-screen document sheet carries, mirroring what the
 * server stamps on the PDFs: the business logo in the header and the
 * owner's saved signature over the authorised-signature line. Staff can
 * read this (unlike the full settings), because staff print waybills.
 */
const brandingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDocumentBranding: builder.query<
      {
        data: {
          branding: { logoUrl: null | string; signatureUrl: null | string };
        };
      },
      void
    >({
      // Provided under the settings tag so saving or removing a logo or
      // signature refreshes every open sheet.
      providesTags: [{ id: "ALL", type: "Settings" }],
      query: () => "admin/receipts/branding",
    }),
  }),
});

export const { useGetDocumentBrandingQuery } = brandingApi;

/** Branding with the PDF's fallback applied: no uploaded logo → site mark. */
export function useDocumentBranding() {
  const { data } = useGetDocumentBrandingQuery();
  return {
    logoUrl: data?.data.branding.logoUrl ?? "/logo-mark.png",
    signatureUrl: data?.data.branding.signatureUrl ?? null,
  };
}

/** The header logo, sized for the sheets' company block. */
export function DocumentLogo({ className }: { className?: string }) {
  const { logoUrl } = useDocumentBranding();
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Cloudinary or public asset
    <img
      src={logoUrl}
      alt=""
      aria-hidden="true"
      className={cn("h-12 w-12 flex-none object-contain", className)}
    />
  );
}
