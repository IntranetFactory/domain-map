#!/usr/bin/env bun
/**
 * apply_phase_p_triage.ts — write the Phase P triage backlog into audits/<DOMAIN>/state.yaml.
 *
 * Reads the JSON emitted by phase_p_triage.ts and, for every domain with agent-solvable
 * work, surgically merges the readiness b1a items into its state.yaml. It edits LOCAL
 * git-tracked files only; it performs NO tenant writes.
 *
 * Merge contract (plan: plans/phase-p-catalog-sweep.md):
 *   - PRESERVE existing b1b / b2 / b3 sections and any b1a item whose id is NOT one of the
 *     Phase-P-owned ids, byte-for-byte.
 *   - ADD or REFRESH (replace by id) the Phase-P-owned b1a items for this domain.
 *   - Remove a previously-written Phase-P item that no longer applies (idempotent re-run:
 *     e.g. a domain that gained personas drops B1A-PHASE-P).
 *   - set next_action_by: agent (forced by the schema: b1a non-empty => agent).
 *   - status: schema-faithful (audits/README.md enum is audit_stale|feedback_needed|passed).
 *     Preserve feedback_needed / passed; normalize anything else to audit_stale. Never
 *     introduce a non-enum value. last_audit is left untouched (this is a triage, not a
 *     full Validate audit); the triage date is recorded per-item via extra_phase_p_triage.
 *
 * Usage (from project root):
 *   bun run scripts/analytics/apply_phase_p_triage.ts --only CRM,INTRANET   # subset (preview)
 *   bun run scripts/analytics/apply_phase_p_triage.ts                       # all flagged domains
 */
export {};
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const TRIAGE_DATE = "2026-06-02";
const JSON_IN = "c:/dev/domain-map/.tmp_deploy/phase_p_triage.json";
const ONLY = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 && process.argv[i + 1] ? new Set(process.argv[i + 1].split(",")) : null;
})();

// The ids this sweep owns. On merge, existing items with these ids are dropped and
// re-emitted from the current triage (so a no-longer-applicable one disappears).
const OWNED_IDS = new Set([
  "B1A-BUILD",
  "B1A-MODULARIZE",
  "B1A-VERIFY-SCOPE",
  "B1A-PHASE-P",
  "B1A-ENTITY-TYPE",
  "B1A-SELF-CONTAIN",
]);

type Rec = {
  domain_code: string;
  module_count: number;
  capability_count: number;
  persona_count: number;
  unclassified_masters: number;
  unclassified_master_names: string[];
  m9_shapes: number;
  m9_details: { entity: string; module: string; role: string; necessity: string | null; master_domains: string[] }[];
  verdict: string;
  b1a_codes: string[];
};

const records: Rec[] = JSON.parse(readFileSync(JSON_IN, "utf8"));

// ---- YAML emit helpers (deliberately minimal: we only emit known shapes) ----
const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

type Item = { id: string; summary: string; finding: string; action: string; afterAction?: string[] };

function emitItem(it: Item): string[] {
  const out = [
    `  - id: ${it.id}`,
    `    summary: ${q(it.summary)}`,
    `    finding: ${q(it.finding)}`,
    `    action: ${q(it.action)}`,
  ];
  if (it.afterAction) out.push(...it.afterAction);
  out.push(`    extra_phase_p_triage: ${q(TRIAGE_DATE)}`);
  return out;
}

// ---- per-code item builders ----
function buildItems(r: Rec): Item[] {
  const items: Item[] = [];
  for (const code of r.b1a_codes) {
    if (code === "B1A-BUILD") {
      items.push({
        id: code,
        summary: `Unbuilt domain: 0 domain_modules (M1 fail), ${r.capability_count} capabilities awaiting a build.`,
        finding: `Live triage ${TRIAGE_DATE}: this domain has 0 domain_modules rows (M1 fail) and ${r.capability_count} capability_domains rows, so it is not deployable today. It must be built before any persona / RACI work applies.`,
        action: `Run Phase A then M then B then S to author the module set, capabilities, masters, and the system skill. If the result is multi-module, run Phase P (personas, role_modules, process_raci, lifecycle.process_id) afterward.`,
      });
    } else if (code === "B1A-MODULARIZE") {
      items.push({
        id: code,
        summary: `1 module but ${r.capability_count} capabilities (M2 fail): under-modularized.`,
        finding: `Live triage ${TRIAGE_DATE}: 1 domain_module with ${r.capability_count} capability_domains rows (>= 3 threshold) implies M2 wants >= 2 modules.`,
        action: `Split into multiple modules per Phase M, then run Phase P.`,
      });
    } else if (code === "B1A-VERIFY-SCOPE") {
      items.push({
        id: code,
        summary: `1 module, ${r.capability_count} capabilities: confirm the domain is genuinely small.`,
        finding: `Live triage ${TRIAGE_DATE}: 1 domain_module and ${r.capability_count} capability_domains rows (< 3). This may be correct (a genuinely small single-module domain) or it may be under-researched in Phase A / B.`,
        action: `Confirm the scope is real. If genuinely small, no personas are needed and this item clears. If under-researched, run Phase A / B to expand, then re-triage.`,
      });
    } else if (code === "B1A-PHASE-P") {
      items.push({
        id: code,
        summary: `Multi-module (${r.module_count} modules) with 0 personas post-Plan-3 (E1 fail): author the persona / RACI layer.`,
        finding: `Live triage ${TRIAGE_DATE}: ${r.module_count} domain_modules and 0 domain_roles reaching this domain via role_modules. Plan 3 deleted the old _core personas, so E1 fires on this multi-module domain.`,
        action: `Author domain_roles (operational personas) function-anchored per references/roles.md section 7, wire role_modules reach across the ${r.module_count} modules, add process_raci responsibility rows, and wire data_object_lifecycle_states.process_id. ATS is the worked reference (scripts/loaders/load_ats_personas_pilot.ts).`,
      });
    } else if (code === "B1A-ENTITY-TYPE") {
      const names = r.unclassified_master_names;
      items.push({
        id: code,
        summary: `${r.unclassified_masters} masters carry entity_type unclassified/null (B13): classify them.`,
        finding: `Live triage ${TRIAGE_DATE}: ${r.unclassified_masters} data_objects mastered by this domain have entity_type null or 'unclassified' (enumerated in affected_entities). Unclassified entity_type degrades the per-entity write tier (plan-2-entity-type-tiers.md).`,
        action: `Classify each master's data_objects.entity_type (operational_workflow / operational_record / catalog / junction / computed) per plan-2-entity-type-tiers.md.`,
        afterAction: [`    affected_entities: [${names.join(", ")}]`],
      });
    } else if (code === "B1A-SELF-CONTAIN") {
      const shapeLines = r.m9_details.map(
        (m) => `      - {entity: ${m.entity}, module: ${m.module}, role: ${m.role}, master_domain: ${m.master_domains.join("+")}}`,
      );
      items.push({
        id: code,
        summary: `${r.m9_shapes} contributor/required-consumer rows break module self-containment (M9): embed or relax each.`,
        finding: `Live triage ${TRIAGE_DATE}: ${r.m9_shapes} domain_module_data_objects rows on this domain's modules are role=contributor or role=consumer with necessity=required, pointing at an entity mastered by another domain and not embedded_master here (enumerated in extra_m9_shapes). Each is an M9 self-containment violation.`,
        action: `Per row, convert to embedded_master (carry a local shell) or set necessity=optional (presence-conditional), per references/modules.md section 5 and SKILL.md M9. Do not document the dependency.`,
        afterAction: ["    extra_m9_shapes:", ...shapeLines],
      });
    }
  }
  return items;
}

// ---- state.yaml surgical merge ----
const SECTION_RE = /^(b1a|b1b|b2|b3):/;

function newStatus(cur: string): string {
  return cur === "feedback_needed" || cur === "passed" ? cur : "audit_stale";
}

// Parse the id out of one b1a item's lines (first `id:` field).
function itemId(lines: string[]): string | null {
  for (const ln of lines) {
    const m = ln.match(/\bid:\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

function mergeFile(path: string, newItems: Item[]): { changed: boolean; eol: string } {
  const raw = readFileSync(path, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);

  // locate first section key
  let firstSectionIdx = lines.findIndex((l) => SECTION_RE.test(l));
  if (firstSectionIdx < 0) firstSectionIdx = lines.length; // no sections at all

  // find b1a span
  const b1aIdx = lines.findIndex((l) => /^b1a:/.test(l));
  let headerEnd: number; // exclusive end of header region (lines kept verbatim, edited in place)
  let existingItemLines: string[][] = [];
  let tailStart: number; // index where b1b/b2/b3 (or anything after b1a) begins

  if (b1aIdx >= 0) {
    headerEnd = b1aIdx; // header = [0, b1aIdx)
    // end of b1a region = next section after b1a, else EOF
    let next = -1;
    for (let i = b1aIdx + 1; i < lines.length; i++) {
      if (SECTION_RE.test(lines[i])) { next = i; break; }
    }
    tailStart = next >= 0 ? next : lines.length;
    // collect item bodies between b1aIdx+1 and tailStart, dropping trailing blanks
    let body = lines.slice(b1aIdx + 1, tailStart);
    while (body.length && body[body.length - 1].trim() === "") body.pop();
    let cur: string[] | null = null;
    for (const ln of body) {
      if (/^  - /.test(ln)) { if (cur) existingItemLines.push(cur); cur = [ln]; }
      else if (cur) cur.push(ln);
    }
    if (cur) existingItemLines.push(cur);
  } else {
    headerEnd = firstSectionIdx; // insert b1a right before first existing section (or at end)
    tailStart = firstSectionIdx;
  }

  // header (verbatim, with in-place status / next_action_by edits)
  const header = lines.slice(0, headerEnd);
  for (let i = 0; i < header.length; i++) {
    if (/^status:/.test(header[i])) {
      const cur = header[i].replace(/^status:\s*/, "").trim();
      header[i] = `status: ${newStatus(cur)}`;
    } else if (/^next_action_by:/.test(header[i])) {
      header[i] = "next_action_by: agent";
    }
  }
  // strip trailing blank lines off the header; we re-add exactly one separator blank
  while (header.length && header[header.length - 1].trim() === "") header.pop();

  // keep existing items whose id is not Phase-P-owned, then append new items
  const kept = existingItemLines.filter((it) => {
    const id = itemId(it);
    return id !== null && !OWNED_IDS.has(id);
  });
  const b1aBlock: string[] = ["b1a:"];
  for (const it of kept) b1aBlock.push(...it);
  for (const it of newItems) b1aBlock.push(...emitItem(it));

  // tail (verbatim) = everything from tailStart on, with leading blanks stripped
  let tail = lines.slice(tailStart);
  while (tail.length && tail[0].trim() === "") tail.shift();
  while (tail.length && tail[tail.length - 1].trim() === "") tail.pop();

  // reassemble: header + blank + b1aBlock + (blank + tail)?  end with single newline
  const outLines = [...header, "", ...b1aBlock];
  if (tail.length) outLines.push("", ...tail);
  const out = outLines.join(eol) + eol;

  const changed = out !== raw;
  if (changed) writeFileSync(path, out, "utf8");
  return { changed, eol };
}

// ---- run ----
let touched = 0, skipped = 0, missing = 0;
const summary: string[] = [];
for (const r of records) {
  if (r.b1a_codes.length === 0) continue;
  if (ONLY && !ONLY.has(r.domain_code)) continue;
  const path = `c:/dev/domain-map/audits/${r.domain_code}/state.yaml`;
  if (!existsSync(path)) { console.error(`MISSING ${path}`); missing++; continue; }
  const items = buildItems(r);
  const { changed } = mergeFile(path, items);
  if (changed) { touched++; summary.push(`  ${r.domain_code.padEnd(22)} ${r.b1a_codes.join(", ")}`); }
  else skipped++;
}

console.log(`Phase P state update (local audit files only, no tenant writes)`);
console.log(`  changed:  ${touched}`);
console.log(`  no-op:    ${skipped} (already current; idempotent)`);
if (missing) console.log(`  MISSING:  ${missing}`);
if (touched) { console.log(`\nchanged files:`); for (const s of summary) console.log(s); }
