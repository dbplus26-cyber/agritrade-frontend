/**
 * Shared field limits that MUST match the backend's validation, kept in one
 * place so the two cannot drift apart silently.
 *
 * A review is a recommendation, not an essay, and the public site renders
 * three of them beside each other - which is what the old 2000-character cap
 * could never be laid out inside. The card clamps at seven lines, so anything
 * past this is only ever read by the moderator. Mirrors REVIEW_MAX_CHARS in
 * the backend's `validations/review-validation.ts` and the width of
 * `Review.text`.
 */
export const REVIEW_MAX_CHARS = 450;

/**
 * How long a reviewer's name may be. Mirrors REVIEWER_NAME_MAX in the
 * backend's `validations/review-validation.ts` and the width of
 * `Review.authorName`. A name, not a sentence: at 150 it took the whole
 * footer line of the public review card and pushed the role/date stamp onto a
 * row of its own.
 */
export const REVIEWER_NAME_MAX = 50;

/**
 * How long a buyer's name may be. Mirrors BUYER_NAME_MAX in the backend's
 * `validations/buyer-validation.ts` and the width of `Buyer.name`. The old
 * 150 was a paragraph, not a name, and the debtors report paid for it by
 * handing this one column most of the row.
 */
export const BUYER_NAME_MAX = 80;

/**
 * How long a commodity's display name may be. Mirrors COMMODITY_NAME_MAX in
 * the backend's `validations/commodity-validation.ts` and the width of
 * `Commodity.name`. It is the headline of every plank on the availability
 * board and the title of every lot file, where a name past a few words is
 * clipped to an ellipsis and tells the buyer nothing; variety, grade and
 * description are where the detail belongs.
 */
export const COMMODITY_NAME_MAX = 45;

/**
 * How long a commodity's description may be. Mirrors
 * COMMODITY_DESCRIPTION_MAX in the backend's
 * `validations/commodity-validation.ts` and the width of
 * `Commodity.description`. It is the SEASON note on the public lot file, not
 * the whole standard operating procedure: at 1000 it filled the file with a
 * wall of prose that pushed the enquiry button off the first screen.
 */
export const COMMODITY_DESCRIPTION_MAX = 350;

/**
 * How long a land plot's display title may be. Mirrors LAND_PLOT_TITLE_MAX in
 * the backend's `validations/land-plot-validation.ts` and the width of
 * `LandPlot.locationText`. It heads the public plot card ("Kumbungu Road,
 * Plot 14") and is a title, not a description: at 200 it wrapped to four lines
 * and pushed the plot's own facts down the card.
 */
export const LAND_PLOT_TITLE_MAX = 120;

/**
 * How long a land plot's description may be. Mirrors
 * LAND_PLOT_DESCRIPTION_MAX in the backend's
 * `validations/land-plot-validation.ts` and the width of
 * `LandPlot.description`. Halved from 2000 because the public plot card prints
 * it IN FULL - a plot has no page of its own to carry the rest.
 */
export const LAND_PLOT_DESCRIPTION_MAX = 1000;

/**
 * The largest file the API will accept, in bytes. Mirrors `fileSize` in the
 * backend's `config/multer.ts`.
 *
 * Checked client-side so an oversized pick fails at the moment it is picked,
 * naming the actual problem. Without it a field agent on a rural connection
 * uploaded a 15MB scan for a minute before the server rejected it, and the
 * only thing the app could say afterwards was that something went wrong.
 * The server limit is still the one that counts - this just stops the wasted
 * round trip, and it cannot be the only check.
 *
 * Images are usually downscaled below this before it applies (see
 * `optimizeImage`); PDFs and other documents are sent as picked, so this is
 * the check that actually catches them.
 */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
