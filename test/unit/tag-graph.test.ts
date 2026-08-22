// test/unit/tag-graph.test.ts
//
// The cache-invalidation graph, checked statically.
//
// RTK Query invalidations are stringly-typed: a mutation that invalidates
// {Reports, "LIST"} while every reports query provides {Reports, "DASHBOARD"}
// is a silent no-op, and the screen it meant to refresh goes stale - typically
// under a comment describing a refresh that never happens. Nothing in the type
// system catches it, so this test does: every LITERAL id a mutation
// invalidates must be provided, literally, by some query of the same type.
//
// Dynamic ids (template strings, variables) are exempt on both sides - a row
// id can only be checked at runtime. The convention this codebase keeps is
// literal ids for named views (LIST, OVERVIEW, MINE, HISTORY...) and dynamic
// ids for rows, which is exactly the shape a static check can hold.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { apiSliceTags } from "@/types/api";

interface TagRef {
  file: string;
  id: string;
  line: number;
  type: string;
}

interface Graph {
  /** Literal (type, id) pairs some query provides. */
  provided: Set<string>;
  /** Types with at least one provider of any shape. */
  providedTypes: Set<string>;
  /** Literal (type, id) pairs some mutation invalidates. */
  invalidated: TagRef[];
  /** Bare-string type invalidations ("CashBook"). */
  invalidatedTypes: TagRef[];
}

const TAG_TYPES = new Set<string>(apiSliceTags);

/** Walks a directory for *-api.ts files. */
const apiFiles = (dir: string): string[] => {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...apiFiles(full));
    else if (name.endsWith(".ts")) out.push(full);
  }
  return out;
};

/**
 * Attributes every tag literal in a file to the providesTags or
 * invalidatesTags block it sits in, by nearest preceding keyword. Tag entries
 * only ever appear after their keyword and before the next one, so the
 * attribution is exact.
 */
export const parseTagGraph = (files: { path: string; text: string }[]): Graph => {
  const graph: Graph = {
    invalidated: [],
    invalidatedTypes: [],
    provided: new Set(),
    providedTypes: new Set(),
  };

  for (const { path, text } of files) {
    const keywords: { index: number; kind: "inv" | "prov" }[] = [];
    for (const m of text.matchAll(/providesTags|invalidatesTags/g)) {
      keywords.push({
        index: m.index,
        kind: m[0] === "providesTags" ? "prov" : "inv",
      });
    }
    const kindAt = (index: number): "inv" | "none" | "prov" => {
      let kind: "inv" | "none" | "prov" = "none";
      for (const k of keywords) {
        if (k.index > index) break;
        kind = k.kind;
      }
      return kind;
    };
    const lineAt = (index: number): number =>
      text.slice(0, index).split("\n").length;

    // Object-form tags. Literal ids only; `id: someVar` and templates are
    // runtime-checked territory and skipped on both sides.
    for (const m of text.matchAll(
      /\{\s*type:\s*"([A-Za-z]+)"(?:\s*as\s*const)?\s*,\s*id:\s*("([^"]+)"|[^,}]+)\s*\}/g,
    )) {
      const type = m[1];
      if (!TAG_TYPES.has(type)) continue;
      const kind = kindAt(m.index);
      if (kind === "none") continue;
      const literal = m[3];
      if (kind === "prov") {
        graph.providedTypes.add(type);
        if (literal !== undefined) graph.provided.add(`${type}|${literal}`);
      } else if (literal !== undefined) {
        graph.invalidated.push({ file: path, id: literal, line: lineAt(m.index), type });
      }
    }

    // Bare-string tags: a standalone quoted tag type in an array entry.
    for (const m of text.matchAll(/(?<=[[,\n]\s{0,12})"([A-Za-z]+)"\s*(?=[,\]])/g)) {
      const type = m[1];
      if (!TAG_TYPES.has(type)) continue;
      const kind = kindAt(m.index);
      if (kind === "prov") graph.providedTypes.add(type);
      else if (kind === "inv") {
        graph.invalidatedTypes.push({ file: path, id: "*", line: lineAt(m.index), type });
      }
    }
  }
  return graph;
};

const load = () =>
  apiFiles(join(process.cwd(), "src/redux")).map((path) => ({
    path: path.replace(process.cwd() + "/", ""),
    text: readFileSync(path, "utf8"),
  }));

describe("the tag graph has no dead invalidations", () => {
  it("every literal invalidated id is provided by a query of that type", () => {
    const graph = parseTagGraph(load());
    const dead = graph.invalidated.filter(
      (t) => !graph.provided.has(`${t.type}|${t.id}`),
    );
    expect(
      dead.map((t) => `${t.file}:${t.line} invalidates {${t.type}, "${t.id}"} which nothing provides`),
    ).toEqual([]);
  });

  it("every bare-type invalidation has at least one provider", () => {
    const graph = parseTagGraph(load());
    const dead = graph.invalidatedTypes.filter(
      (t) => !graph.providedTypes.has(t.type),
    );
    expect(dead.map((t) => `${t.file}:${t.line} invalidates "${t.type}"`)).toEqual([]);
  });

  it("the parser itself catches a dead tag (self-test)", () => {
    const graph = parseTagGraph([
      {
        path: "fixture.ts",
        text: `
          providesTags: [{ type: "Reports", id: "DASHBOARD" }],
          invalidatesTags: [{ type: "Reports", id: "LIST" }],
        `,
      },
    ]);
    expect(graph.provided.has("Reports|DASHBOARD")).toBe(true);
    const dead = graph.invalidated.filter(
      (t) => !graph.provided.has(`${t.type}|${t.id}`),
    );
    expect(dead).toHaveLength(1);
    expect(dead[0].id).toBe("LIST");
  });
});
