// Tests for the `checks:` text splice in scripts/lib/health/record.ts (domain_health.ts --record):
// comments and every byte outside the block survive, a second splice is idempotent, and the
// block reads back through js-yaml. Pure, offline.

import { describe, expect, test } from "bun:test";
import yaml from "js-yaml";
import {
  recordedChecklistVersion,
  renderChecksBlock,
  spliceChecksBlock,
  verifySplice,
  type CheckRecord,
} from "../health/record.ts";

const RESULTS: CheckRecord[] = [
  { id: "B7b", result: "fail", rows: [822, 823] },
  { id: "E4b", result: "warn", rows: [207, "label:with: colon"] },
  { id: "E5", result: "skipped", rows: [] },
];
const block = (runAt = "2026-11-01T00:00:00.000Z", results = RESULTS, v = 1) => renderChecksBlock(v, runAt, results);

const STATE = [
  "# header comment",
  "schema_version: 2",
  "domain: ATS",
  "status: feedback_needed   # inline comment",
  "",
  "b1a: []",
  "",
  "# column-0 comment before b2",
  "b2:",
  "  - id: B2-X",
  "    summary: keep me",
  "",
  "b3: []",
  "",
].join("\n");

describe("checks: block splice", () => {
  test("appends when absent; the original bytes are an exact prefix", () => {
    const out = spliceChecksBlock(STATE, block());
    expect(out.startsWith(STATE)).toBe(true);
    // STATE ends with one newline, so one blank separator line precedes the block.
    expect(out.slice(STATE.length)).toBe("\n" + block().join("\n") + "\n");
    expect(verifySplice(STATE, out, { checklistVersion: 1, results: RESULTS })).toBeNull();
  });

  test("adds a blank separator and a newline when the file ends without one", () => {
    const noNl = "schema_version: 2\nb3: []";
    const out = spliceChecksBlock(noNl, block());
    expect(out).toBe(noNl + "\n\n" + block().join("\n") + "\n");
  });

  test("second splice with the same block is byte-identical (idempotent)", () => {
    const once = spliceChecksBlock(STATE, block());
    expect(spliceChecksBlock(once, block())).toBe(once);
  });

  test("re-recording replaces only the block: a new run_at changes one line", () => {
    const once = spliceChecksBlock(STATE, block("2026-11-01T00:00:00.000Z"));
    const twice = spliceChecksBlock(once, block("2026-11-02T00:00:00.000Z"));
    const a = once.split("\n");
    const b = twice.split("\n");
    expect(a.length).toBe(b.length);
    const changed = a.map((l, i) => (l === b[i] ? null : i)).filter((i) => i !== null);
    expect(changed.length).toBe(1);
    expect(b[changed[0]!]).toContain('run_at: "2026-11-02T00:00:00.000Z"');
  });

  test("a block in the middle is replaced in place; comments and keys around it survive byte for byte", () => {
    const before = "schema_version: 2\n# about checks\nchecks:\n  checklist_version: 0\n  results: []\n\n\n# column-0 comment after\nb2: []  # inline\n# trailing comment\n";
    const out = spliceChecksBlock(before, block());
    expect(out).toBe("schema_version: 2\n# about checks\n" + block().join("\n") + "\n\n\n# column-0 comment after\nb2: []  # inline\n# trailing comment\n");
    expect(verifySplice(before, out, { checklistVersion: 1, results: RESULTS })).toBeNull();
    // shrinking and growing the result list both stay in place
    const shrunk = spliceChecksBlock(out, block(undefined, [RESULTS[0]]));
    expect(shrunk.endsWith("\n\n\n# column-0 comment after\nb2: []  # inline\n# trailing comment\n")).toBe(true);
    expect(spliceChecksBlock(shrunk, block())).toBe(out);
  });

  test("CRLF files keep CRLF, including inside the block", () => {
    const crlf = STATE.replace(/\n/g, "\r\n");
    const out = spliceChecksBlock(crlf, block());
    expect(out.startsWith(crlf)).toBe(true);
    expect(out.replace(/\r\n/g, "")).not.toContain("\n");
    expect(spliceChecksBlock(out, block())).toBe(out);
  });

  test("the block reads back through js-yaml with checklist_version and per-check rows", () => {
    const out = spliceChecksBlock(STATE, block());
    const doc: any = yaml.load(out);
    expect(doc.checks.checklist_version).toBe(1);
    expect(doc.checks.results).toEqual(RESULTS);
    expect(doc.b2[0].summary).toBe("keep me");
    expect(recordedChecklistVersion(out)).toBe(1);
    expect(recordedChecklistVersion(STATE)).toBeNull();
  });

  test("result items are flow-style, never a '- id: X' line (b9d_resolver --migrate-legacy scans those)", () => {
    for (const l of block()) expect(/^\s*-\s*id:/.test(l)).toBe(false);
  });

  test("verifySplice catches a change outside the block and an unparsable original", () => {
    const out = spliceChecksBlock(STATE, block()).replace("summary: keep me", "summary: changed");
    expect(verifySplice(STATE, out, { checklistVersion: 1, results: RESULTS })).toContain("outside the checks: block");
    expect(verifySplice("a: [\n", "a: [\n", { checklistVersion: 1, results: [] })).toContain("does not parse");
  });

  test("an empty result list renders as results: []", () => {
    const out = spliceChecksBlock("domain: X\n", block(undefined, []));
    expect((yaml.load(out) as any).checks.results).toEqual([]);
  });
});
