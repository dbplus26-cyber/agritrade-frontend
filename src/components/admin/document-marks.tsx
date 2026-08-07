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

/**
 * An EMPTY ink line for a counterparty who signs at handover (a waybill's
 * driver, a statement's farmer). Same box and caption treatment as the
 * authorised block beside it, so a signature row reads as one row - and
 * matches the PDF's rendering of the same document exactly.
 */
export function InkSignatureLine({
  className,
  label,
}: {
  className?: string;
  label: string;
}) {
  return (
    <div className={cn("w-[190px] max-w-full", className)}>
      <div className="h-[44px]" aria-hidden="true" />
      <div className="border-t border-adm-strong pt-1 text-center text-[12px]">
        {label}
      </div>
    </div>
  );
}

/**
 * The authorised-signature block, exactly as the PDFs draw it: the saved
 * signature (when there is one) over a rule with the caption beneath.
 * Without a saved signature the line still prints, empty, for ink.
 */
export function AuthorisedSignature({ className }: { className?: string }) {
  const { signatureUrl } = useDocumentBranding();
  return (
    <div className={cn("w-[190px] max-w-full", className)}>
      <div className="flex h-[44px] items-end justify-center">
        {signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary preview
          <img
            src={signatureUrl}
            alt="Authorised signature"
            className="max-h-[40px] max-w-[150px] object-contain"
          />
        ) : null}
      </div>
      <div className="border-t border-adm-strong pt-1 text-center text-[12px]">
        Authorised signature
      </div>
    </div>
  );
}
