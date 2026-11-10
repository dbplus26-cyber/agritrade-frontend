/**
 * Starts a file download from an API link, as following the link would: the
 * reply is an attachment, so the page stays where it is.
 */
export const startDownload = (href: string): void => {
  window.location.assign(href);
};
