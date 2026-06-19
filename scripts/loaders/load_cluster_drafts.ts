#!/usr/bin/env bun
// load_cluster_drafts.ts — Step 5 loader.
//
// Parses .tmp_deploy/cluster_<letter>_draft.md files produced by the Step 5
// sub-agents and loads the contents into:
//   - data_object_relationships  (sections 2, 3, 4 of each domain)
//   - data_object_aliases        (section 5 of each domain)
//
// Default mode is dry-run: prints the parsed counts + the first few rows
// from each cluster, validates every data_object_name resolves to an id,
// validates no duplicate edges. Pass --execute to apply.
//
// Usage:
//   bun run c:/dev/domain-map/.tmp_deploy/load_cluster_drafts.ts                # dry-run, all clusters
//   bun run c:/dev/domain-map/.tmp_deploy/load_cluster_drafts.ts --cluster A    # one cluster
//   bun run c:/dev/domain-map/.tmp_deploy/load_cluster_drafts.ts --execute      # apply all

export {};

import { readFileSync, existsSync } from "node:fs";
import { argv } from "node:process";

const EXECUTE = argv.includes("--execute");
const clusterArgIdx = argv.indexOf("--cluster");
const ONLY_CLUSTER = clusterArgIdx >= 0 ? argv[clusterArgIdx + 1] : null;

console.log(`mode: ${EXECUTE ? "EXECUTE (writes)" : "DRY-RUN (no writes)"}`);
if (ONLY_CLUSTER) console.log(`cluster filter: ${ONLY_CLUSTER}`);
console.log();

const CLUSTERS = ["A", "B", "C", "D", "E", "F"] as const;
const inScope = ONLY_CLUSTER ? [ONLY_CLUSTER as (typeof CLUSTERS)[number]] : [...CLUSTERS];

// ----- PostgREST helper -----
type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

// ----- catalog index -----
const allObjs: any[] = (await postgrest(
  "GET",
  "/data_objects?select=id,data_object_name&limit=5000",
)) ?? [];
const idByName = new Map<string, number>(allObjs.map((o) => [String(o.data_object_name), o.id as number]));

// ----- parser -----
type EdgeRow = {
  from: string;
  verb: string;
  to: string;
  cardinality: string;
  kind: string;
  required: string;
  owner_side: string;
  inverse_verb: string;
  notes: string;
  section: "intra" | "users" | "cross";
  cluster: string;
  domain_code: string;
};

type AliasRow = {
  data_object: string;
  alias_name: string;
  alias_type: string;
  is_preferred: string;
  notes: string;
  cluster: string;
  domain_code: string;
};

function parseTable(lines: string[], startIdx: number): { rows: string[][]; endIdx: number } {
  let i = startIdx;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length || !lines[i].trim().startsWith("|")) return { rows: [], endIdx: i };
  const headerCells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
  i++;
  if (i < lines.length && lines[i].trim().startsWith("|")) i++;
  const rows: string[][] = [];
  const stripBT = (s: string) => s.replace(/^`(.+)`$/, "$1").trim();
  while (i < lines.length && lines[i].trim().startsWith("|")) {
    const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
    const stripped = cells.map(stripBT);
    const isPlaceholder = (c: string) => c === "_" || c === "" || c === "-";
    // empty marker: all cells placeholder, OR first cell + verb are placeholders (notes column free-form)
    if (stripped.every(isPlaceholder) || (isPlaceholder(stripped[0]) && stripped.length > 1 && isPlaceholder(stripped[1]))) {
      i++;
      continue;
    }
    rows.push(cells);
    i++;
  }
  if (rows.length > 0) (rows as any)._header = headerCells;
  return { rows, endIdx: i };
}

const edges: EdgeRow[] = [];
const aliases: AliasRow[] = [];
const parseErrors: string[] = [];

for (const cluster of inScope) {
  const path = `c:/dev/domain-map/.tmp_deploy/cluster_${cluster}_draft.md`;
  if (!existsSync(path)) {
    parseErrors.push(`cluster ${cluster}: file missing — ${path}`);
    continue;
  }
  const text = readFileSync(path, "utf8");
  const lines = text.split(/\r?\n/);

  let currentDomain: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Domain header: "## Domain: <CODE> — <Name>"
    const domainMatch = line.match(/^##\s+Domain:\s+([A-Z][A-Z0-9-]+)\s*[—-]/);
    if (domainMatch) {
      currentDomain = domainMatch[1];
      continue;
    }

    // Section markers
    const sectionMatch = line.match(/^###\s+([12345])\.\s+/);
    if (!sectionMatch || !currentDomain) continue;
    const sectionNum = parseInt(sectionMatch[1], 10);

    // Sections 2, 3, 4 = edges; section 5 = aliases. Section 1 = mermaid (skip).
    if (sectionNum === 1) continue;

    // find next table
    let j = i + 1;
    while (j < lines.length && !lines[j].trim().startsWith("|") && !lines[j].match(/^###?\s/)) j++;
    if (j >= lines.length || lines[j].match(/^###?\s/)) continue;

    const { rows } = parseTable(lines, j);

    if (sectionNum >= 2 && sectionNum <= 4) {
      const sectionTag: EdgeRow["section"] = sectionNum === 2 ? "intra" : sectionNum === 3 ? "users" : "cross";
      for (const cells of rows) {
        if (cells.length < 9) {
          parseErrors.push(`${cluster}/${currentDomain} section ${sectionNum}: row has ${cells.length} cells, expected 9 — ${cells.join(" | ")}`);
          continue;
        }
        const [from, verb, to, cardinality, kind, required, owner_side, inverse_verb, notes] = cells;
        // strip backticks
        const strip = (s: string) => s.replace(/^`(.+)`$/, "$1").trim();
        edges.push({
          from: strip(from),
          verb: strip(verb),
          to: strip(to),
          cardinality: strip(cardinality).toLowerCase(),
          kind: strip(kind).toLowerCase(),
          required: strip(required).toLowerCase(),
          owner_side: strip(owner_side).toLowerCase(),
          inverse_verb: strip(inverse_verb),
          notes: notes,
          section: sectionTag,
          cluster,
          domain_code: currentDomain,
        });
      }
    } else if (sectionNum === 5) {
      for (const cells of rows) {
        if (cells.length < 5) {
          parseErrors.push(`${cluster}/${currentDomain} section 5: row has ${cells.length} cells, expected 5 — ${cells.join(" | ")}`);
          continue;
        }
        const [data_object, alias_name, alias_type, is_preferred, notes] = cells;
        const strip = (s: string) => s.replace(/^`(.+)`$/, "$1").trim();
        aliases.push({
          data_object: strip(data_object),
          alias_name: strip(alias_name),
          alias_type: strip(alias_type).toLowerCase(),
          is_preferred: strip(is_preferred).toLowerCase(),
          notes,
          cluster,
          domain_code: currentDomain,
        });
      }
    }
  }
}

console.log(`parsed: ${edges.length} edges + ${aliases.length} aliases from ${inScope.length} cluster(s)`);
if (parseErrors.length > 0) {
  console.log(`\nPARSE WARNINGS (${parseErrors.length}):`);
  for (const e of parseErrors.slice(0, 20)) console.log(`  ${e}`);
  if (parseErrors.length > 20) console.log(`  …+${parseErrors.length - 20} more`);
}

// ----- validation -----
const validationErrors: string[] = [];

const validCardinality = new Set(["one_to_one", "one_to_many", "many_to_many", "many_to_one"]);
const validKind = new Set(["composition", "reference", "association", "inheritance"]);
const validOwnerSide = new Set(["source", "target"]);
const validAliasType = new Set(["synonym", "industry_term", "solution_term"]);

// Auto-flip many_to_one → one_to_many (swap sides, swap verbs, swap owner_side).
let autoFlipped = 0;
for (const e of edges) {
  if (e.cardinality !== "many_to_one") continue;
  const oldFrom = e.from;
  const oldTo = e.to;
  const oldVerb = e.verb;
  const oldInv = e.inverse_verb;
  e.from = oldTo;
  e.to = oldFrom;
  e.verb = oldInv || `(inverse of ${oldVerb})`;
  e.inverse_verb = oldVerb;
  e.owner_side = e.owner_side === "source" ? "target" : "source";
  e.cardinality = "one_to_many";
  e.notes = `${e.notes ? e.notes + " | " : ""}auto-flipped from many_to_one`;
  autoFlipped++;
}
if (autoFlipped > 0) console.log(`auto-flipped ${autoFlipped} many_to_one edges → one_to_many`);

// Dedupe: keep first occurrence (alphabetical cluster order), drop subsequent duplicates.
const seenEdges = new Map<string, string>(); // key → cluster/domain that first claimed it
const dedupedEdges: EdgeRow[] = [];
let droppedDupes = 0;
for (const e of edges) {
  const key = `${e.from}|${e.verb}|${e.to}`;
  if (seenEdges.has(key)) {
    console.log(`  · dropped cross-cluster duplicate: ${key} (kept ${seenEdges.get(key)}, dropped ${e.cluster}/${e.domain_code})`);
    droppedDupes++;
    continue;
  }
  seenEdges.set(key, `${e.cluster}/${e.domain_code}`);
  dedupedEdges.push(e);
}
if (droppedDupes > 0) console.log(`dropped ${droppedDupes} duplicate edges`);
edges.length = 0;
edges.push(...dedupedEdges);

for (const e of edges) {
  if (!idByName.has(e.from)) validationErrors.push(`edge ${e.cluster}/${e.domain_code}: unknown 'from' data_object '${e.from}'`);
  if (!idByName.has(e.to)) validationErrors.push(`edge ${e.cluster}/${e.domain_code}: unknown 'to' data_object '${e.to}'`);
  if (!validCardinality.has(e.cardinality)) {
    validationErrors.push(`edge ${e.cluster}/${e.domain_code}: invalid cardinality '${e.cardinality}'`);
  }
  if (!validKind.has(e.kind)) validationErrors.push(`edge ${e.cluster}/${e.domain_code}: invalid kind '${e.kind}'`);
  if (!validOwnerSide.has(e.owner_side)) validationErrors.push(`edge ${e.cluster}/${e.domain_code}: invalid owner_side '${e.owner_side}'`);
  if (!["true", "false"].includes(e.required)) validationErrors.push(`edge ${e.cluster}/${e.domain_code}: invalid required '${e.required}'`);
}

// Step C (m4b, m5, M7): relationship shape pre-flight. Soft warnings per Policy 1 — these
// never block the load, but surface edges that violate the owner_side / verb-direction
// invariants so they can be normalized before they reach the catalog.
const shapeWarnings: string[] = [];
for (const e of edges) {
  if (!e.inverse_verb || e.inverse_verb.trim() === "") {
    shapeWarnings.push(`${e.cluster}/${e.domain_code}: empty inverse_verb on '${e.from} ${e.verb} ${e.to}' (m4b)`);
  }
  if ((e.cardinality === "one_to_many" || e.kind === "composition") && e.owner_side === "target") {
    const tag = e.kind === "composition" ? "composition" : "one_to_many";
    shapeWarnings.push(`${e.cluster}/${e.domain_code}: ${tag} edge '${e.from} ${e.verb} ${e.to}' has owner_side=target; owner_side must name the parent (cascade root). If target is genuinely the parent the row is semantically OK but non-canonical; prefer authoring parent-first (owner_side=source, forward verb parent-to-child) (m5/M7)`);
  }
}

const seenAliases = new Set<string>();
for (const a of aliases) {
  if (!idByName.has(a.data_object)) validationErrors.push(`alias ${a.cluster}/${a.domain_code}: unknown data_object '${a.data_object}'`);
  if (!validAliasType.has(a.alias_type)) validationErrors.push(`alias ${a.cluster}/${a.domain_code}: invalid alias_type '${a.alias_type}'`);
  if (!["true", "false"].includes(a.is_preferred)) validationErrors.push(`alias ${a.cluster}/${a.domain_code}: invalid is_preferred '${a.is_preferred}'`);
  // industry_term / solution_term need context ids; skip those in initial load
  if (a.alias_type === "industry_term" || a.alias_type === "solution_term") {
    validationErrors.push(`alias ${a.cluster}/${a.domain_code}: '${a.alias_name}' type=${a.alias_type} requires industry_id/solution_id resolution — will be loaded as synonym for now (review needed)`);
  }
  const key = `${a.data_object}|${a.alias_name}`;
  if (seenAliases.has(key)) validationErrors.push(`alias ${a.cluster}/${a.domain_code}: duplicate ${key}`);
  seenAliases.add(key);
}

// ----- per-cluster summary -----
console.log(`\nPER-CLUSTER SUMMARY`);
for (const c of inScope) {
  const e = edges.filter((x) => x.cluster === c);
  const a = aliases.filter((x) => x.cluster === c);
  console.log(`  ${c}: ${e.length} edges (${e.filter((x) => x.section === "intra").length} intra / ${e.filter((x) => x.section === "users").length} users / ${e.filter((x) => x.section === "cross").length} cross) + ${a.length} aliases`);
}

// Separate hard errors from soft warnings (the industry_term notes are informational).
const hardErrors = validationErrors.filter((e) => !e.includes("type=industry_term") && !e.includes("type=solution_term"));
const softWarnings = validationErrors.filter((e) => e.includes("type=industry_term") || e.includes("type=solution_term"));

if (softWarnings.length > 0) {
  console.log(`\nINFO: ${softWarnings.length} industry_term/solution_term aliases will be loaded as 'synonym' (industry_id/solution_id resolution deferred — review post-load).`);
}

if (shapeWarnings.length > 0) {
  console.log(`\nSHAPE WARNINGS (${shapeWarnings.length}), soft, do not block (m4b/m5/M7):`);
  for (const w of shapeWarnings.slice(0, 30)) console.log(`  ${w}`);
  if (shapeWarnings.length > 30) console.log(`  …+${shapeWarnings.length - 30} more`);
}

if (hardErrors.length > 0) {
  console.log(`\nVALIDATION ERRORS (${hardErrors.length}):`);
  for (const e of hardErrors.slice(0, 30)) console.log(`  ${e}`);
  if (hardErrors.length > 30) console.log(`  …+${hardErrors.length - 30} more`);
  if (EXECUTE) {
    console.error(`\n✗ validation failed — aborting execute`);
    process.exit(1);
  } else {
    console.log(`\n(dry-run — validation errors above must be fixed before --execute)`);
  }
}

if (!EXECUTE) {
  console.log(`\n(dry-run — pass --execute to apply)`);
  process.exit(0);
}

// ----- execute -----
// NOTE: this script ran on 2026-05-22 with per-row POSTs (slow but functional).
// Re-running it would create duplicate rows. If you need to extend it, see
// loader-idiom.md (`insert()` helper + chunked POST array body) — the
// per-row pattern below was a mistake I caught after the fact.
console.log("\nEXECUTING");
let edgesDone = 0;
const errors: string[] = [];
for (const e of edges) {
  const fromId = idByName.get(e.from);
  const toId = idByName.get(e.to);
  if (!fromId || !toId) {
    errors.push(`skipped edge with unknown name: ${e.from} → ${e.to}`);
    continue;
  }
  const body = {
    data_object_id: fromId,
    related_data_object_id: toId,
    relationship_verb: e.verb,
    inverse_verb: e.inverse_verb || `(inverse of ${e.verb})`,
    relationship_type: e.cardinality,
    relationship_kind: e.kind,
    owner_side: e.owner_side,
    is_required: e.required === "true",
    notes: `${e.section} | cluster ${e.cluster} | ${e.domain_code}${e.notes ? " | " + e.notes : ""}`,
    record_status: "new",
  };
  await postgrest("POST", "/data_object_relationships", body);
  edgesDone++;
  if (edgesDone % 25 === 0) console.log(`  …${edgesDone} edges inserted`);
}

let aliasesDone = 0;
for (const a of aliases) {
  const id = idByName.get(a.data_object);
  if (!id) {
    errors.push(`skipped alias with unknown name: ${a.data_object}/${a.alias_name}`);
    continue;
  }
  const body: Row = {
    data_object_id: id,
    alias_name: a.alias_name,
    alias_type: "synonym",
    is_preferred: a.is_preferred === "true",
    notes: `cluster ${a.cluster} | ${a.domain_code}${a.notes ? " | " + a.notes : ""}${a.alias_type !== "synonym" ? ` | originally typed as ${a.alias_type}` : ""}`,
    record_status: "new",
  };
  await postgrest("POST", "/data_object_aliases", body);
  aliasesDone++;
}

console.log(`\n✓ batch complete: ${edgesDone} edges, ${aliasesDone} aliases`);
if (errors.length > 0) {
  console.log(`\nSKIPPED (${errors.length}):`);
  for (const e of errors) console.log(`  ${e}`);
}
