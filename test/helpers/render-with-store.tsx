import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "@/redux/store";

/** Exercise connected controls inside otherwise isolated component fixtures. */
export function renderWithStore(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const store = makeStore();
  return render(<Provider store={store}>{ui}</Provider>, options);
}
