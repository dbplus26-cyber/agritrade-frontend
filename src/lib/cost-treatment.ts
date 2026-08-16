/**
 * The one decision a cost recorded against a purchase exists to ask, in the
 * words the business uses.
 *
 * "Capitalise" is the accountant's word for the first answer and it is not on
 * either screen on purpose: the person recording a cost at a village scale
 * knows perfectly well whether the money was spent getting the grain in, and
 * does not know what capitalising is. Both answers are legitimate - haulage
 * belongs in the goods, a late-permit fine does not - which is exactly why it
 * is asked rather than assumed from the fact that the cost names a purchase.
 *
 * The order is not arbitrary: the goods answer is first and is the default,
 * because it is the overwhelming majority of what gets recorded here.
 *
 * It lives here, in a module of nothing but strings, because the question is
 * asked in two places by two different kits - the console dialog and the
 * agent's field form - and the one thing that must never differ between them
 * is the wording. Two screens describing the same irreversible decision in
 * two ways is how the same cost ends up filed two ways. Deliberately free of
 * component imports so the field bundle, which is loaded over a village 2G
 * line, pulls in the sentences and nothing else.
 */

/** "goods" rides on the purchase; "month" lands in the current period. */
export type CostTreatment = "goods" | "month";

export interface CostTreatmentOption {
  hint: string;
  label: string;
  value: CostTreatment;
}

/** The question, asked identically wherever it is asked. */
export const COST_TREATMENT_LEGEND = "Where does this cost belong?";

export const COST_TREATMENT_OPTIONS: CostTreatmentOption[] = [
  {
    hint: "Haulage, loading, porters, bagging - money spent getting this grain in. It counts against the profit when the grain is sold, not this month.",
    label: "Part of what these goods cost",
    value: "goods",
  },
  {
    hint: "A licence or a fine: tied to this purchase, but not part of what the grain cost to buy. It lands in this month's costs.",
    label: "A cost of this month",
    value: "month",
  },
];

/**
 * What the two answers mean on the wire.
 *
 * The boolean is what the API takes and the radio group is what a person
 * reads, so the mapping between them is written once rather than as a `? :`
 * at each call site - an inverted one at either end would file every cost the
 * wrong way round and say the right thing while doing it.
 */
export const treatmentToCapitalise = (treatment: CostTreatment): boolean =>
  treatment === "goods";

export const capitaliseToTreatment = (capitalise: boolean): CostTreatment =>
  capitalise ? "goods" : "month";
