// One-off: add a B9d-verification b1a item to every domain's state.yaml (except HRSD,
// where B9d was already run 2026-06-09). Idempotent: re-running is a no-op once present.
// Pure local-file edit (text-based, preserves comments); no Semantius / DB writes.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SKIP = new Set(["HRSD"]); // B9d already run there 2026-06-09

const ITEM = [
  `  - id: B1A-B9D-VERIFY`,
  `    summary: "B9d (handoff payload realization) has never run on this domain; run it on the next audit pass."`,
  `    finding: "The B9d semantic band (classify each outbound cross-domain handoff APQC payload tag as RESOLVED / ROLL-UP / ORPHAN / MIS-TAG against realized work, i.e. a gated data_object_lifecycle_states.process_id that also carries process_raci) was added 2026-06-09 and has only ever been run on HRSD. This domain was last audited before the B9d resolver existed, so its outbound handoff_processes tags are B9d-unverified."`,
  `    action: "Run B9d per the SKILL.md per-domain checklist over this domain outbound cross-domain handoffs: re-point ROLL-UPs to the realized code, realize or route ORPHANs to the owner domain, surface MIS-TAGs. INBOUND payloads are report-only. Do not touch record_status without an explicit user request (Rule #1)."`,
].join("\n");

const dirs = readdirSync("audits", { withFileTypes: true }).filter((d) => d.isDirectory());
let modified = 0, already = 0, skipped = 0, newSection = 0;
const problems: string[] = [];
const touched: string[] = [];

for (const d of dirs) {
  const code = d.name;
  const path = join("audits", code, "state.yaml");
  if (!existsSync(path)) continue;
  if (SKIP.has(code)) { skipped++; continue; }

  let content = readFileSync(path, "utf8");
  if (content.includes("B1A-B9D-VERIFY")) { already++; continue; }

  const lines = content.split("\n");

  // 1) next_action_by -> agent (schema derivation: b1a non-empty => agent)
  let setNab = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^next_action_by:/.test(lines[i])) { lines[i] = "next_action_by: agent"; setNab = true; break; }
  }
  if (!setNab) problems.push(`${code}: no next_action_by line`);

  // 2) insert the b1a item
  const idx = lines.findIndex((l) => /^b1a:(\s*\[\])?\s*$/.test(l));
  if (idx === -1) {
    const laIdx = lines.findIndex((l) => /^last_audit:/.test(l));
    if (laIdx === -1) { problems.push(`${code}: no b1a and no last_audit; SKIPPED`); continue; }
    lines.splice(laIdx + 1, 0, "", "b1a:", ITEM);
    newSection++;
  } else {
    lines[idx] = "b1a:"; // normalize "b1a: []" -> "b1a:"
    lines.splice(idx + 1, 0, ITEM);
  }

  writeFileSync(path, lines.join("\n"));
  modified++;
  touched.push(code);
}

console.log(JSON.stringify({
  total_dirs: dirs.length,
  modified,
  already_had: already,
  skipped_HRSD: skipped,
  inserted_new_b1a_section: newSection,
  problems,
}, null, 2));
console.log("touched:", touched.sort().join(", "));
