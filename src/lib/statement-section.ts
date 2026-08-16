/**
 * Where an expense category files on the financial statements, in the words
 * the owner uses rather than the accountant's.
 *
 * The statements group every cost by this. Get it wrong and the profit and
 * loss is wrong in a way no single expense will ever reveal: a haulage
 * category filed as administrative overstates gross profit by every load of
 * the year, and a tax category filed anywhere but TAX charges the year's tax
 * twice - once as the provision the statements compute, once as the bill.
 *
 * Strings only, no components: read by the registry form and by whatever
 * prints a category, and the wording has to be identical in both.
 */
export type StatementSection =
  | "ADMINISTRATIVE"
  | "COST_OF_SALES"
  | "FINANCE"
  | "TAX";

export interface StatementSectionOption {
  hint: string;
  label: string;
  value: StatementSection;
}

export const STATEMENT_SECTION_LEGEND = "Where it files on the statements";

/** Administrative first: it is the default, and the most common answer. */
export const STATEMENT_SECTION_OPTIONS: StatementSectionOption[] = [
  {
    hint: "Running the business: salaries, rent, phones, stationery, repairs. Comes off gross profit.",
    label: "Running costs",
    value: "ADMINISTRATIVE",
  },
  {
    hint: "Spent to buy, move or ship the grain itself: haulage, loading, bagging, fumigation. Comes off sales before gross profit.",
    label: "Cost of the goods sold",
    value: "COST_OF_SALES",
  },
  {
    hint: "The cost of borrowed money: bank charges, loan interest.",
    label: "Bank and loan charges",
    value: "FINANCE",
  },
  {
    hint: "Income tax paid to GRA. Not a cost of the year: the statements already set tax aside as a provision, and a bill filed here pays that provision down instead of being charged again.",
    label: "Tax paid",
    value: "TAX",
  },
];

export const statementSectionLabel = (value: StatementSection): string =>
  STATEMENT_SECTION_OPTIONS.find((o) => o.value === value)?.label ?? value;
