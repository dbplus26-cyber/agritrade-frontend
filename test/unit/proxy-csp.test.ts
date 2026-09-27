import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

describe("page response policy", () => {
  it("gives each page request its own script nonce without unsafe-inline", () => {
    const first = proxy(new NextRequest("https://dbplus.example/privacy"));
    const second = proxy(new NextRequest("https://dbplus.example/privacy"));
    const firstPolicy = first.headers.get("Content-Security-Policy") ?? "";
    const secondPolicy = second.headers.get("Content-Security-Policy") ?? "";

    expect(firstPolicy).toMatch(/script-src[^;]*'nonce-[^']+'/);
    expect(
      firstPolicy.split("; ").find((part) => part.startsWith("script-src")),
    ).not.toContain("'unsafe-inline'");
    expect(firstPolicy).not.toBe(secondPolicy);
  });

  it("keeps the policy on a session-gate redirect", () => {
    const response = proxy(new NextRequest("https://dbplus.example/admin"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
    expect(response.headers.get("Content-Security-Policy")).toContain(
      "'nonce-",
    );
  });
});
