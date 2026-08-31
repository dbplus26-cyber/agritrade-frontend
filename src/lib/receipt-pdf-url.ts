import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import type { IDocumentWindow } from "@/types/document.types";

/**
 * A server-rendered document PDF (`/admin/receipts/<type>/<id>.pdf`) - the
 * console's one route to paper. The period statements accept a window via
 * `params` ({ from, to, seasonId }); single documents take none.
 */
export const receiptPdfUrl = (
  type: string,
  id: string,
  params: IDocumentWindow = {},
): string =>
  `${env.SERVER_URI}/api/v1/admin/receipts/${type}/${id}.pdf${toQueryString(params)}`;
