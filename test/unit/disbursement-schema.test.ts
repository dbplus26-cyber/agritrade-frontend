// test/unit/disbursement-schema.test.ts
//
// The money-OUT form's rules. This is the only screen in the console that
// moves company money to somebody outside it, and the two rails need different
// things: a MoMo send needs a network and a 233-format number, a bank send
// needs a bank and an account. Getting one of those wrong does not fail
// harmlessly - Hubtel accepts a well-formed request and pays the wrong person.
//
// Tested at the schema rather than through the dialog on purpose: these are
// the rules, the dialog only renders them, and a schema test cannot be broken
// by a label change.
import { describe, expect, it } from "vitest";

import { disbursementSchema } from "@/validations/disbursement-schema";

const MOMO = {
  amountGhs: "250.00",
  channel: "mtn-gh",
  description: "Porters, Sagnarigu loading",
  rail: "MOMO" as const,
  recipientMsisdn: "233249111411",
  recipientName: "Abdul Karim",
};

const BANK = {
  amountGhs: "12500.00",
  bankAccountNumber: "1441000123456",
  bankCode: "300302",
  description: "Maize purchase settlement",
  rail: "BANK" as const,
  recipientName: "Northern Grains Ltd",
};

/** The `path` of every issue a parse raised, for terse assertions. */
const issuePaths = (input: unknown): string[] => {
  const result = disbursementSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => String(i.path[0]));
};

describe("disbursementSchema", () => {
  it("accepts a well-formed send on either rail", () => {
    expect(disbursementSchema.safeParse(MOMO).success).toBe(true);
    expect(disbursementSchema.safeParse(BANK).success).toBe(true);
  });

  it("requires a network and an international number on the MoMo rail", () => {
    expect(issuePaths({ ...MOMO, channel: undefined })).toContain("channel");
    // 0-prefixed local format is what people actually type, and it is the one
    // Hubtel's rail will not take.
    expect(issuePaths({ ...MOMO, recipientMsisdn: "0249111411" })).toContain(
      "recipientMsisdn",
    );
    expect(issuePaths({ ...MOMO, recipientMsisdn: "23324911141" })).toContain(
      "recipientMsisdn",
    );
  });

  it("requires a bank and an account number on the bank rail", () => {
    expect(issuePaths({ ...BANK, bankCode: undefined })).toContain("bankCode");
    expect(issuePaths({ ...BANK, bankAccountNumber: "" })).toContain(
      "bankAccountNumber",
    );
  });

  it("does not hold one rail to the other rail's fields", () => {
    // A bank send carries no msisdn or channel, and a MoMo send no bank
    // details. Neither absence is an error, or the form could never submit.
    expect(issuePaths(BANK)).toEqual([]);
    expect(issuePaths(MOMO)).toEqual([]);
  });

  it("insists on a description Hubtel can carry", () => {
    expect(issuePaths({ ...MOMO, description: "x" })).toContain("description");
    expect(issuePaths({ ...MOMO, description: "y".repeat(101) })).toContain(
      "description",
    );
  });

  it("rejects a nameless recipient", () => {
    expect(issuePaths({ ...MOMO, recipientName: "" })).toContain(
      "recipientName",
    );
  });
});
