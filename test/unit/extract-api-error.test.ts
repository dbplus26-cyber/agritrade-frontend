import { describe, expect, it } from "vitest";
import { extractApiError } from "@/lib/extract-api-error";

describe("extractApiError", () => {
  it("passes through plain strings", () => {
    expect(extractApiError("boom").message).toBe("boom");
  });

  it("maps RTK network errors to a human message", () => {
    const result = extractApiError({ status: "FETCH_ERROR", error: "failed" });
    expect(result.message).toMatch(/couldn't reach the server/i);
    expect(result.hasFieldErrors).toBe(false);
  });

  it("reads the backend `{ status, data }` envelope with field errors", () => {
    const result = extractApiError({
      status: 400,
      data: {
        status: "error",
        message: "Check the highlighted fields and try again.",
        code: "VALIDATION_ERROR",
        details: {
          errors: [
            { field: "phone", message: "We need a phone number to reach you." },
            { field: "phone", message: "duplicate is ignored" },
          ],
        },
      },
    });
    expect(result.message).toBe("Check the highlighted fields and try again.");
    expect(result.code).toBe("VALIDATION_ERROR");
    expect(result.hasFieldErrors).toBe(true);
    expect(result.fieldErrors).toEqual({
      phone: "We need a phone number to reach you.",
    });
  });

  it("falls back to a status message when the envelope has no message", () => {
    const result = extractApiError({ status: 404, data: {} });
    expect(result.message).toMatch(/couldn't find/i);
    expect(result.status).toBe(404);
  });

  it("never surfaces a bare Aborted", () => {
    expect(
      extractApiError({ name: "AbortError", message: "Aborted" }).message,
    ).toMatch(/interrupted/i);
  });
});
