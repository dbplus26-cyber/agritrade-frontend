# CSV exports

Use **Export CSV** on a register or payment history. Register exports include all
rows matching the active search and filters, starting from page one. Locally
filtered tables export all matching rows before pagination. A download captures
the filters when it starts; changing filters does not alter an in-flight export.

## Coverage

- Purchases, sales, shipments and their payment histories, including agent purchases.
- Stock balances, supplier holdings, movements, transfers, stocktakes and count lines.
- Expenses, expense payments, cash-book balances, account ledgers and payment history.
- Disbursements, treasury transfers, float holders and agents.
- Farmers, seasons, inputs, grants, repayments, grant aging and season farmer balances.
- Land plots, acquisitions, sales, sellers and land payment histories.
- Buyers, suppliers, commodities, warehouses, drivers, delivery addresses, expense
  categories, payment accounts and users.
- Approvals, audit records, enquiries, farm applications, drawings and fixed assets.
- Debtors, including the active buyer search. Existing profit and agent-performance
  report exports remain available.

Notification inboxes, interactive configuration grids and printable document
layouts do not receive duplicate export controls.

## Behavior and limits

Exports use the same authenticated reads, permission checks and money redaction
as the screen. Only explicitly listed fields are included; attachments, retry keys
and other internal fields are excluded. Hidden financial columns are omitted.
Numbers retain their underlying precision and units are named in the headings.
Dates retain the API's ISO representation. Signed payment amounts and reversal
fields are retained where supplied by the API.

Downloads use UTF-8 with a BOM and quoted CSV fields for Excel/Sheets. Formula-like
text is escaped. No spreadsheet dependency is required.

Paginated exports read at most 50,000 rows in requests of up to 100 rows. Larger
registers must be narrowed using filters. Cancel stops an in-flight export.
A failed page, changed total or repeated row fails the download without producing
a partial file. These reads are not a database snapshot: updates to existing
records can still occur between requests.

The backend uses a unique ID as the final sort key on the exported paginated
registers so equal dates or names have a consistent order across pages.
