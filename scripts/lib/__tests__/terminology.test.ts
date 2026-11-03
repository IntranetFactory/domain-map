// A `reference` or `parent` field between two entities is a "relationship", and "role" means a
// permission role only. CLAUDE.md has both rules. This fails on the words "link", "edge" and "connect"
// in the files below unless the line matches the allow-list, and on the old persona table and column names.
// Left out on purpose:
// - audits/: its history is full of URLs, brands, vendor copy and catalog ids, so a line check would be noise.
// - catalog/blueprints/: their remaining wording comes from catalog rows, which change only with the
//   owner's approval (audits/_relationship-wording-inventory.md).
// - .claude/skills/llm-wiki/: every use there is a wiki hyperlink.
// - .agents/skills/, .tmp_deploy/, backups/, .cache/, plans/snapshots/ and raw logs: copies and raw records.
// - root *.md and research/: brand names and third-party template copy would need a long allow-list.
// The British spelling check has its own, wider scope: see BRITISH_DIRS.
import { describe, expect, test } from "bun:test";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { findBritishInFile } from "../british_spelling.ts";

const ROOT = resolve(import.meta.dir, "../../..");
const SCOPE = ["scripts", "plans", ".claude/skills/domain-map-analyst", ".claude/skills/domain-list"];
const SKIP_PATH = /(^|\/)(node_modules|snapshots|\.tmp_deploy)\/|__tests__\/terminology\.test\.ts$/;

const ALLOW: { why: string; re: RegExp }[] = [
  { why: "web and UI hyperlinks", re: /https?:\/\/|ui_baseurl|\bUI( [\w-]+)? links?\b|\bspot-check links?\b|\bmarkdown link|\blink the user to the UI\b|\bthis link reviewers\b|\blink the filtered view\b|\bdangling link\b|\bboth link `references|\bthose links if the file\b|\bSKILL\.md links\b|\bReference links in SKILL\.md\b|\blink fix\b|\blinks the prior\b|<link to revert/i },
  { why: "file-system senses", re: /\bunlinkSync\b|\bsymlink/ },
  { why: "brands and products", re: /LinkedIn|linkedin|LinkSquares|Linkfluence|Mavenlink|Linkerd/ },
  { why: "domain things that really are URLs", re: /broken[ _-]links?|\b(recording|envelope|share|tracking|booking) link|WEB-CONTOPS-SEO-LINKS|web-contops-seo-links-system|WCO-(SEO-)?LINKS|Link Governance|link_rot|link rot/i },
  { why: "catalog text in old loaders, renamed only with the owner's approval", re: /^\s*(\{.*)?\b(description|notes|capability_name|singular_label|plural_label)\s*:|^\s*["`]/ },
];

// "Edge" may stay only for a line in a Mermaid diagram, or where it is not about data at all. Each allowed
// phrase is removed from the line first, so another "edge" on the same line still fails.
const EDGE_ALLOW: RegExp[] = [
  /(?:mermaid|diagram|dotted)(?:[ -][§\w.]+)?[ -]edges?\b/gi, // a line in the diagram
  /\w*diagram-?edges?\w*|\w*DottedEdges?\w*|\bMEdge\b/gi, // the same thing, as identifiers
  /\bedge[- ]cases?\b/gi, // unrelated senses
];
const EDGE_WORD = /edge/i;
// Words that contain the letters and mean something else.
const NOT_EDGE = /\w*(?:ledg|hedg|wedg)\w*/gi;

// "Connect" may stay only where it is not a relationship. "Connector" and brand names such as ConnectWise
// do not match the word at all.
const CONNECT_WORD = /\b(?:dis|un)?connect(?:s|ed|ing|ion|ions)?\b/i;
const CONNECT_ALLOW: { why: string; re: RegExp }[] = [
  { why: "the user-facing word for a junction", re: /connecting records?/i },
  { why: "an HTTP or MCP connection to a server", re: /\bserver\b/i },
  { why: "a graph term for the handoff DAG, not a relationship", re: /densely connected subgraphs/ },
  { why: "the diagram drawn with no lines", re: /mermaid rendered with disconnected nodes/ },
  { why: "integrating a vendor tool", re: /"build it" from "connect it"/ },
  { why: "a catalog tagline quoted as a sample", re: /connected pipeline from sourcing/ },
];

// A loader's catalog text stays as it was loaded, like the "link" rule above. A changelog's entry for this
// rename is the one place that may name the old words.
const CATALOG_TEXT = /^\s*(\{.*)?\b(description|notes|capability_name|singular_label|plural_label|solution_name|domain_name)\s*:|^\s*["`]/;
const WORD_RENAME_ENTRY = /^##+ .*"Relationship" replaces "edge" and "connect"/;

// The old names of personas, persona_modules and the process_raci actor columns. `role_code` has a word
// boundary on purpose, so the platform's `catalog_role_code` does not trip it.
const OLD_PERSONA_NAMES = /\b(domain_roles|role_modules|actor_role_id|actor_skill_id|role_module_label|role_code)\b/;
// The skill changelog's entry for this rename is the one place that may name them.
const PERSONA_RENAME_ENTRY = /^##+ .*Persona and `held_as` replace/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    const st = lstatSync(p);
    if (st.isSymbolicLink()) return [];
    return st.isDirectory() ? (name === "node_modules" ? [] : files(p)) : [p];
  });
}

function violations(): string[] {
  const out: string[] = [];
  for (const base of SCOPE) {
    for (const full of files(join(ROOT, base))) {
      const rel = relative(ROOT, full).split("\\").join("/");
      if (SKIP_PATH.test(rel) || !/\.(ts|mjs|js|md|yaml)$/.test(rel)) continue;
      const isLoader = rel.startsWith("scripts/loaders/");
      readFileSync(full, "utf8").split(/\r?\n/).forEach((line, i) => {
        if (!/link/i.test(line)) return;
        const allowed = ALLOW.some(({ why, re }) => (why.startsWith("catalog text") ? isLoader : true) && re.test(line));
        if (!allowed) out.push(`${rel}:${i + 1}: ${line.trim().slice(0, 140)}`);
      });
    }
  }
  return out;
}

function edgeOrConnectViolations(): string[] {
  const out: string[] = [];
  for (const base of SCOPE) {
    for (const full of files(join(ROOT, base))) {
      const rel = relative(ROOT, full).split("\\").join("/");
      if (SKIP_PATH.test(rel) || !/\.(ts|mjs|js|md|yaml)$/.test(rel)) continue;
      const isLoader = rel.startsWith("scripts/loaders/");
      let inRenameEntry = false;
      readFileSync(full, "utf8").split(/\r?\n/).forEach((line, i) => {
        if (/^##+ /.test(line)) inRenameEntry = rel.endsWith("skill-changelog.md") && WORD_RENAME_ENTRY.test(line);
        if (inRenameEntry || (isLoader && CATALOG_TEXT.test(line))) return;
        const rest = EDGE_ALLOW.reduce((s, re) => s.replace(re, " "), line.replace(NOT_EDGE, " "));
        const badConnect = CONNECT_WORD.test(line) && !CONNECT_ALLOW.some(({ re }) => re.test(line));
        if (EDGE_WORD.test(rest) || badConnect) out.push(`${rel}:${i + 1}: ${line.trim().slice(0, 140)}`);
      });
    }
  }
  return out;
}

function oldPersonaNames(): string[] {
  const out: string[] = [];
  for (const base of SCOPE) {
    for (const full of files(join(ROOT, base))) {
      const rel = relative(ROOT, full).split("\\").join("/");
      if (SKIP_PATH.test(rel) || !/\.(ts|mjs|js|md|yaml)$/.test(rel)) continue;
      let inRenameEntry = false;
      readFileSync(full, "utf8").split(/\r?\n/).forEach((line, i) => {
        if (/^##+ /.test(line)) inRenameEntry = rel.endsWith("skill-changelog.md") && PERSONA_RENAME_ENTRY.test(line);
        if (!inRenameEntry && OLD_PERSONA_NAMES.test(line)) out.push(`${rel}:${i + 1}: ${line.trim().slice(0, 140)}`);
      });
    }
  }
  return out;
}

// American English only (CLAUDE.md). Any British spelling in a scanned file fails, using the same detection as check B16
// and scripts/analytics/be_spelling_sweep.ts, plus the allow-list in scripts/lib/british_spelling.ts (real names, rule
// examples, records of a correction). Unlike the checks above, this one covers audits/, root docs and research/.
const BRITISH_DIRS = ["audits", "plans", "scripts", "catalog", "research", ".claude/skills"];
const BRITISH_TEXT = /\.(md|mdx|ts|tsx|js|mjs|cjs|json|yaml|yml|csv|tsv|txt|html|toml|sql|sh|py)$/i;
const BRITISH_SKIP: { why: string; re: RegExp }[] = [
  { why: "the word map itself", re: /^scripts\/lib\/british_spelling\.ts$/ },
  { why: "tests that use British words on purpose", re: /^scripts\/lib\/__tests__\/(health_b|catalog_invariants|terminology)\.test\.ts$/ },
  { why: "the two CLAUDE.md files, which agents may not edit", re: /(^|\/)CLAUDE\.md$/ },
  { why: "third-party skill", re: /^\.claude\/skills\/llm-wiki\// },
  { why: "scripts that compare against exact old values", re: /(^|\/)\.tmp_deploy\// },
  { why: "exact snapshots of past catalog data", re: /^plans\/snapshots\/.*\.json$|^domain_map.*\.json$/ },
  { why: "a raw scrape of a third-party web page", re: /^tmpmonday_templates\.html$/ },
  { why: "raw logs", re: /^crud.*\.log$/ },
];

function britishViolations(): string[] {
  const roots = readdirSync(ROOT).map((n) => join(ROOT, n)).filter((p) => lstatSync(p).isFile());
  const all = [...roots, ...BRITISH_DIRS.filter((b) => existsSync(join(ROOT, b))).flatMap((b) => files(join(ROOT, b)))];
  const out: string[] = [];
  for (const full of all) {
    const rel = relative(ROOT, full).split("\\").join("/");
    if (!BRITISH_TEXT.test(rel) || BRITISH_SKIP.some(({ re }) => re.test(rel))) continue;
    for (const hit of findBritishInFile(readFileSync(full, "utf8"))) out.push(`${rel}:${hit.line}: ${hit.hits.join(", ")}`);
  }
  return out;
}

describe("terminology", () => {
  test("no British spelling in any scanned file", () => {
    expect(britishViolations()).toEqual([]);
  });

  test("the semantius-agent copy of the detection is identical", () => {
    const copy = resolve(ROOT, "../semantius-agent/scripts/british_spelling.ts");
    if (!existsSync(copy)) return;
    expect(readFileSync(copy, "utf8")).toBe(readFileSync(join(ROOT, "scripts/lib/british_spelling.ts"), "utf8"));
  });

  test('a relationship is never called a "link"', () => {
    expect(violations()).toEqual([]);
  });

  test('a relationship is never called an "edge" or a "connection"', () => {
    expect(edgeOrConnectViolations()).toEqual([]);
  });

  test("the edge check tells a diagram line from a relationship", () => {
    const rest = (s: string) => EDGE_ALLOW.reduce((t, re) => t.replace(re, " "), s.replace(NOT_EDGE, " "));
    expect(EDGE_WORD.test(rest("the §2 Mermaid edge label"))).toBe(false);
    expect(EDGE_WORD.test(rest("one dotted §2 edge per row"))).toBe(false);
    expect(EDGE_WORD.test(rest("knowledge_articles in the ledger"))).toBe(false);
    expect(EDGE_WORD.test(rest("a users edge"))).toBe(true);
    expect(EDGE_WORD.test(rest("a diagram edge for each cross-domain edge"))).toBe(true);
  });

  test("the connect check allows a junction, not a relationship", () => {
    const bad = (s: string) => CONNECT_WORD.test(s) && !CONNECT_ALLOW.some(({ re }) => re.test(s));
    expect(bad("relationships connect all masters")).toBe(true);
    expect(bad("the connecting records")).toBe(false);
    expect(bad("ConnectWise and external_connector")).toBe(false);
  });

  test("the old persona table and column names are gone", () => {
    expect(oldPersonaNames()).toEqual([]);
  });

  test("the role_code check leaves catalog_role_code alone", () => {
    expect(OLD_PERSONA_NAMES.test("roles.catalog_role_code")).toBe(false);
    expect(OLD_PERSONA_NAMES.test("personas.role_code")).toBe(true);
  });
});
