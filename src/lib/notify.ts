import { toast } from "sonner";

/**
 * The one toast door. Wraps sonner so call sites never import it directly -
 * pairing naturally with `extractApiError`:
 *
 *   notify.error("Couldn't send your enquiry", {
 *     description: extractApiError(err).message,
 *   });
 *
 * Styling comes from the themed <Toaster /> in the root layout, so every
 * toast wears the trading-house look without per-call effort.
 */
export interface NotifyOptions {
  description?: string;
  duration?: number;
}

export const notify = {
  success: (title: string, opts?: NotifyOptions) =>
    toast.success(title, { description: opts?.description, duration: opts?.duration }),
  error: (title: string, opts?: NotifyOptions) =>
    toast.error(title, { description: opts?.description, duration: opts?.duration }),
  info: (title: string, opts?: NotifyOptions) =>
    toast.info(title, { description: opts?.description, duration: opts?.duration }),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
