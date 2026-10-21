// Rewrites the mass-injected B1A-B9D-VERIFY item across every audits/<CODE>/state.yaml
// so it no longer re-states the (now-wrong) OUTBOUND-only procedure. The single source of
// truth is the SKILL.md B9d band, which is now BIDIRECTIONAL. Each item becomes a thin
// pointer carrying only the one load-bearing fact: classify both directions, route each
// ORPHAN to the OWNER's audit files on either side.
//
// Literal string replace; verified uniform (1 distinct finding, 1 distinct action) before run.
// Read-only to the catalog DB (touches no catalog rows); edits audit bookkeeping files only.

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const AUDITS = "audits";

const OLD_FINDING =
  "The B9d semantic band (classify each outbound cross-domain handoff APQC payload tag as RESOLVED / ROLL-UP / ORPHAN / MIS-TAG against realized work, i.e. a gated data_object_lifecycle_states.process_id that also carries process_raci) was added 2026-06-09 and has only ever been run on HRSD. This domain was last audited before the B9d resolver existed, so its outbound handoff_processes tags are B9d-unverified.";

const NEW_FINDING =
  "B9d (handoff payload realization) was added 2026-06-09 and last ran in bulk only on HRSD; this domain was last audited before it existed, so its handoff payload tags are B9d-unverified in BOTH directions (inbound and outbound).";

const OLD_ACTION =
  "Run B9d per the SKILL.md per-domain checklist over this domain outbound cross-domain handoffs: re-point ROLL-UPs to the realized code, realize or route ORPHANs to the owner domain, surface MIS-TAGs. INBOUND payloads are report-only. Do not touch record_status without an explicit user request (Rule #1).";

const NEW_ACTION =
  "Run B9d per the SKILL.md B9d band: classify every handoff payload on every boundary in BOTH directions (do not treat the inbound half as report-only), re-point ROLL-UPs on the source, surface MIS-TAGs on the source, and for each ORPHAN write a durable b1b item plus a q into the OWNER domain's audit files on whichever side owns it (state.yaml hygiene carve-out (b)). Do not touch record_status without an explicit user request (Rule #1).";

let changed = 0;
let skipped = 0;
const touched: string[] = [];

for (const code of readdirSync(AUDITS)) {
  const path = join(AUDITS, code, "state.yaml");
  if (!existsSync(path)) continue;
  const before = readFileSync(path, "utf8");
  if (!before.includes("B1A-B9D-VERIFY")) continue;
  let after = before;
  if (after.includes(OLD_FINDING)) after = after.replace(OLD_FINDING, NEW_FINDING);
  if (after.includes(OLD_ACTION)) after = after.replace(OLD_ACTION, NEW_ACTION);
  if (after !== before) {
    writeFileSync(path, after);
    changed++;
    touched.push(code);
  } else {
    skipped++;
    console.log(`  no-match (left as-is): ${code}`);
  }
}

console.log(`\nB9d-VERIFY rewrite complete: ${changed} files updated, ${skipped} carried the item but matched neither string.`);
