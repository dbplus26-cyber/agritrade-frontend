import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Drive the rendered SimpleSelect the way a user does: open the trigger,
 * click the named option. Replaces `userEvent.selectOptions`, which only
 * works on native <select> elements - and those are gone; every dropdown
 * renders through ui/select now.
 */
export async function pickOption(
  trigger: HTMLElement,
  option: RegExp | string,
): Promise<void> {
  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole("option", { name: option }));
}

/**
 * Drive a cmdk SearchableSelect: open it, type to filter, Enter to take the
 * top match - the combobox's own selection path, which is also the one a
 * user actually types.
 */
export async function pickSearchOption(
  trigger: HTMLElement,
  text: string,
): Promise<void> {
  await userEvent.click(trigger);
  await userEvent.keyboard(text);
  await userEvent.keyboard("{Enter}");
}
