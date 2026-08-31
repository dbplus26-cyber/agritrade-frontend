// The document surface, mirroring `/admin/receipts` on the API.
//
// A document is fetched, never assembled here: the server builds one neutral
// document per record and renders it as the PDF, so the sheet on screen draws
// that same document rather than a second arrangement of the same numbers.
// The URL of the printed copy is built from the same pair of arguments.
import { apiSlice } from "@/redux/api-slice";
import { receiptPdfUrl } from "@/lib/receipt-pdf-url";
import { toQueryString } from "@/lib/to-query-string";
import type { ApiSliceTag } from "@/types/api";
import type {
  DocumentType,
  IDocumentResponse,
  IDocumentWindow,
} from "@/types/document.types";

export interface DocumentArgs {
  id: string;
  /** The period a statement is drawn over; single documents take none. */
  params?: IDocumentWindow;
  type: DocumentType;
}

/**
 * The records a document is drawn from, so an open sheet refreshes when the
 * money behind it moves - recording a payment already invalidates the sale.
 * A type absent from here simply refetches on its next mount; nothing is
 * served from cache in the meantime (see `keepUnusedDataFor` below).
 */
const documentTags = ({
  id,
  type,
}: DocumentArgs): { id: string; type: ApiSliceTag }[] => {
  switch (type) {
    case "agent-statement":
      return [
        { id, type: "Agents" },
        { id: "LIST", type: "FloatLedger" },
      ];
    case "farmer-statement":
      return [
        { id, type: "Farmers" },
        { id: "LIST", type: "FarmStats" },
      ];
    case "sale":
      return [{ id, type: "Sales" }];
    case "shipment":
      return [{ id, type: "Shipments" }];
    default:
      return [];
  }
};

/** Where the printed copy of the document on screen lives. */
export const documentPdfUrl = ({ id, params, type }: DocumentArgs): string =>
  receiptPdfUrl(type, id, params ?? {});

export const documentsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDocument: builder.query<IDocumentResponse, DocumentArgs>({
      // A document states a live balance. Holding one after its screen closes
      // would put a stale figure in front of the next person to open it.
      keepUnusedDataFor: 0,
      providesTags: (_result, _error, args) => documentTags(args),
      query: ({ id, params, type }) =>
        `admin/receipts/${type}/${id}${toQueryString(params ?? {})}`,
    }),
  }),
});

export const { useGetDocumentQuery } = documentsApi;
