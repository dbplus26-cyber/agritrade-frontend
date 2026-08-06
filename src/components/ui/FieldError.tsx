/**
 * Inline field error - sits under the input, never as a toast (design rule).
 * Rendered conditionally so an empty message adds no DOM.
 */
export function FieldError({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  if (!message) return null;
  return (
    <span id={id} role="alert" className="text-[12px] font-medium text-error">
      {message}
    </span>
  );
}
