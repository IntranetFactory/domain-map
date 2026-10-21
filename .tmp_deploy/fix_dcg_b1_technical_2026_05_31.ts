// Residual B1 technical fixes for DCG (Data Catalog and Governance), domain_id=88.
// Applies the technical, agent-fixable items from audits/DCG.md that do not
// depend on architectural decisions (B2 surface-for-user calls):
//
//   B1-S3: PATCH event_category on 7 DCG-owned trigger_events (Rule #13 enum backfill).
//   B1-S5: DELETE 3 duplicate domain-rollup rows in domain_data_objects (audit
//          pre-specifies row IDs 395, 456, 458).
//   B1-S8: PATCH domains.business_logic on row 88 to replace U+2014 em-dash
//          (CLAUDE.md em-dash ban).
//   B1-H1: INSERT 14 handoff_processes rows where the audit pre-specifies
//          handoff_id + resolvable PCF process_id and no existing handoff_processes
//          row exists for that handoff (Discover Pass 3 deferrals 683/685/698/699
//          and audit-flagged REPLACE cases 158/220/263/264 are skipped).
//
// Skipped per the prompt's DEFER list: B1-S1 (new modules), B1-S2 (new capabilities),
// B1-S4 (lifecycle states, gated on S1+B2-S4 user picks), B1-S6 (handoff module FKs,
// gated on S1), B1-S7 (handoff description wording, gated on B2-S3), B1-S9 (owed by
// other domains), B2-S* (all user-judgment items).
//
// Run from c:/dev/domain-map: bun run .tmp_deploy/fix_dcg_b1_technical_2026_05_31.ts

type Json = unknown;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    if (stderr.includes("This JWT does not have authorization")) {
      console.error("JWT-AUDIENCE ERROR (verbatim):");
      console.error(stderr);
      console.error("Command was: semantius call crud postgrestRequest", JSON.stringify(payload));
      throw new Error("JWT_AUDIENCE_HALT");
    }
    throw new Error(`semantius ${method} ${path} failed (code ${code}): ${stderr || stdout}`);
  }
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function banner(s: string) {
  console.log("");
  console.log(`=== ${s} ===`);
}

// ---------- B1-S3: trigger_events event_category backfill ----------
//
// Audit assignments (audits/DCG.md, B1-S3):
//   738 data_domain.created                  -> lifecycle
//   739 data_domain.steward_changed          -> state_change
//   740 data_lineage_relationship.created    -> lifecycle
//   741 data_lineage_relationship.broken     -> signal
//   742 data_certification.granted           -> state_change
//   743 data_certification.revoked           -> state_change
//   744 data_usage_metric.spike_detected     -> signal
const triggerEventPatches: Array<{ id: number; event_category: string }> = [
  { id: 738, event_category: "lifecycle" },
  { id: 739, event_category: "state_change" },
  { id: 740, event_category: "lifecycle" },
  { id: 741, event_category: "signal" },
  { id: 742, event_category: "state_change" },
  { id: 743, event_category: "state_change" },
  { id: 744, event_category: "signal" },
];

async function applyTriggerEventPatches() {
  banner("B1-S3 PATCH trigger_events.event_category");
  for (const p of triggerEventPatches) {
    const res = await semantius("PATCH", `/trigger_events?id=eq.${p.id}`, {
      event_category: p.event_category,
    });
    console.log(`  PATCH trigger_events id=${p.id} event_category=${p.event_category}`, res);
  }
  // Verify all 7 are populated.
  const verify = (await semantius(
    "GET",
    "/trigger_events?id=in.(738,739,740,741,742,743,744)&select=id,event_name,event_category"
  )) as Array<{ id: number; event_name: string; event_category: string }>;
  const empty = verify.filter((r) => !r.event_category);
  if (empty.length > 0) {
    throw new Error(
      `B1-S3 verification failed: rows still have empty event_category: ${JSON.stringify(empty)}`
    );
  }
  console.log("  B1-S3 verified, all 7 trigger_events carry event_category.");
}

// ---------- B1-S5: DMDO duplicate-role DELETEs ----------
//
// Audit (audits/DCG.md, B1-S5) pre-specifies row IDs:
//   395 (88, 232, contributor)  -- delete, keep master 518
//   456 (88, 252, contributor)  -- delete, keep master 517
//   458 (88, 254, consumer)     -- delete, keep master 519
const dmdoDeletes: Array<{ id: number; data_object_id: number; role: string }> = [
  { id: 395, data_object_id: 232, role: "contributor" },
  { id: 456, data_object_id: 252, role: "contributor" },
  { id: 458, data_object_id: 254, role: "consumer" },
];

async function applyDmdoDeletes() {
  banner("B1-S5 DELETE duplicate domain_data_objects rows");
  // Pre-flight: verify the master row sibling still exists for each, so the
  // DELETE does not leave the data_object orphaned at the domain rollup.
  for (const d of dmdoDeletes) {
    const siblings = (await semantius(
      "GET",
      `/domain_data_objects?domain_id=eq.88&data_object_id=eq.${d.data_object_id}&select=id,role`
    )) as Array<{ id: number; role: string }>;
    const master = siblings.find((r) => r.role === "master");
    if (!master) {
      throw new Error(
        `B1-S5 pre-flight failed: data_object_id=${d.data_object_id} has no master sibling row; refusing to delete id=${d.id}`
      );
    }
    const targetRow = siblings.find((r) => r.id === d.id);
    if (!targetRow) {
      console.log(`  SKIP, row id=${d.id} (${d.role}) no longer exists; nothing to delete.`);
      continue;
    }
    if (targetRow.role !== d.role) {
      throw new Error(
        `B1-S5 pre-flight mismatch: row id=${d.id} role is "${targetRow.role}" not "${d.role}"; refusing to delete`
      );
    }
    const res = await semantius("DELETE", `/domain_data_objects?id=eq.${d.id}`);
    console.log(`  DELETE domain_data_objects id=${d.id} (88, ${d.data_object_id}, ${d.role})`, res);
  }
  // Verify the duplicates are gone.
  const verify = (await semantius(
    "GET",
    "/domain_data_objects?domain_id=eq.88&data_object_id=in.(232,252,254)&select=id,data_object_id,role&order=data_object_id.asc"
  )) as Array<{ id: number; data_object_id: number; role: string }>;
  const dupes = verify.filter((r) => r.role !== "master");
  if (dupes.length > 0) {
    throw new Error(
      `B1-S5 verification failed: non-master rollup rows still present: ${JSON.stringify(dupes)}`
    );
  }
  console.log("  B1-S5 verified, only master rollup rows remain for data_object_ids 232/252/254.");
}

// ---------- B1-S8: domains.business_logic em-dash PATCH ----------
//
// Current value (verified live):
//   "Lineage extraction, automated tagging, and profiling — the metadata
//    harvesting layer beneath the catalog UI."
// CLAUDE.md bans U+2014. Replace " — " with ", " per project guidance
// (comma is the closest equivalent, no semantic loss).
const DOMAIN_ID = 88;
const businessLogicNew =
  "Lineage extraction, automated tagging, and profiling, the metadata harvesting layer beneath the catalog UI.";

async function applyDomainBusinessLogicPatch() {
  banner("B1-S8 PATCH domains.business_logic, remove U+2014");
  const before = (await semantius(
    "GET",
    `/domains?id=eq.${DOMAIN_ID}&select=id,business_logic`
  )) as Array<{ id: number; business_logic: string }>;
  if (before.length !== 1) throw new Error(`B1-S8: expected exactly 1 domains row id=${DOMAIN_ID}`);
  if (!before[0].business_logic.includes("—")) {
    console.log("  SKIP, business_logic already free of U+2014; no change.");
    return;
  }
  if (businessLogicNew.includes("—")) {
    throw new Error("B1-S8: replacement string still contains U+2014, abort");
  }
  const res = await semantius("PATCH", `/domains?id=eq.${DOMAIN_ID}`, {
    business_logic: businessLogicNew,
  });
  console.log(`  PATCH domains id=${DOMAIN_ID} business_logic`, res);
  const after = (await semantius(
    "GET",
    `/domains?id=eq.${DOMAIN_ID}&select=id,business_logic`
  )) as Array<{ id: number; business_logic: string }>;
  if (after[0].business_logic.includes("—")) {
    throw new Error(`B1-S8 verification failed: business_logic still contains U+2014: ${after[0].business_logic}`);
  }
  console.log("  B1-S8 verified, business_logic free of U+2014.");
}

// ---------- B1-H1: handoff_processes inserts where audit pre-specifies handoff + PCF ----------
//
// The audit (audits/DCG.md, H1 table) pre-specifies handoff_id + process_id pairs.
// We insert ONLY where:
//   (a) the handoff has zero existing handoff_processes rows (avoid the "decide
//       whether to add a second PCF" judgment, which the prompt defers), AND
//   (b) the PCF id is resolvable in /processes, AND
//   (c) the audit does not flag the row as a Discover Pass 3 candidate (the
//       4 medium-confidence handoffs 683 / 685 / 698 / 699 may stay
//       discovery_substring until Discover Pass 3 authors custom processes).
//
// REPLACE candidates 158 (existing process_id=273), 220 (existing 505), 263
// (existing 557 discovery_substring), 264 (same) are skipped because REPLACE
// is a "decide" call. Handoffs 259, 268, 688, 707, 711, 713, 726 already carry
// an agent_curated row; the audit's proposed PCF for these either matches the
// existing row (688, 711, 707, 259, 726) or differs (268, 713) where the
// existing row was authored after this audit and adding a second PCF would be
// a "decide" call.
const handoffProcessInserts: Array<{ handoff_id: number; process_id: number; note: string }> = [
  { handoff_id: 152, process_id: 1203, note: "DATA-AI-PLAT->DCG data_product.published, confident L4" },
  { handoff_id: 223, process_id: 275, note: "DCG->KGP ontology.published, confident L3" },
  { handoff_id: 260, process_id: 1203, note: "DCG->DLP data_asset.classified" },
  { handoff_id: 261, process_id: 1203, note: "DCG->DSPM data_asset.classified" },
  { handoff_id: 262, process_id: 1203, note: "DCG->DQ data_asset.certified" },
  { handoff_id: 265, process_id: 275, note: "DCG->KGP glossary_term.published, confident L3" },
  { handoff_id: 285, process_id: 275, note: "DSPM->DCG data_asset.classified, confident L3" },
  { handoff_id: 694, process_id: 1208, note: "AUDIT->DCG query_lineage.captured" },
  { handoff_id: 708, process_id: 1208, note: "DCG->DQ data_certification.granted" },
  { handoff_id: 709, process_id: 1203, note: "DCG->DLP data_domain.created" },
  { handoff_id: 710, process_id: 1171, note: "DCG->AUDIT data_lineage_relationship.broken" },
  { handoff_id: 712, process_id: 1203, note: "DCG->DSPM data_usage_metric.spike_detected" },
  { handoff_id: 719, process_id: 115, note: "MDM->DCG merge_rule.published" },
  { handoff_id: 846, process_id: 275, note: "DSPM->DCG cloud_database.discovered" },
];

async function applyHandoffProcessInserts() {
  banner("B1-H1 INSERT handoff_processes (audit-prespecified, no-conflict subset)");
  // Pre-flight: verify each handoff is row-zero on handoff_processes, and each
  // PCF id resolves in /processes.
  const handoffIds = handoffProcessInserts.map((r) => r.handoff_id);
  const processIds = Array.from(new Set(handoffProcessInserts.map((r) => r.process_id)));
  const existing = (await semantius(
    "GET",
    `/handoff_processes?handoff_id=in.(${handoffIds.join(",")})&select=handoff_id,process_id`
  )) as Array<{ handoff_id: number; process_id: number }>;
  const conflictedHandoffs = new Set(existing.map((r) => r.handoff_id));
  const processCheck = (await semantius(
    "GET",
    `/processes?id=in.(${processIds.join(",")})&select=id`
  )) as Array<{ id: number }>;
  const validProcessIds = new Set(processCheck.map((r) => r.id));

  const toInsert: Array<{ handoff_id: number; process_id: number; proposal_source: string; role: string }> = [];
  for (const row of handoffProcessInserts) {
    if (conflictedHandoffs.has(row.handoff_id)) {
      console.log(
        `  SKIP handoff_id=${row.handoff_id}, handoff_processes row already exists; "${row.note}"`
      );
      continue;
    }
    if (!validProcessIds.has(row.process_id)) {
      console.log(
        `  SKIP handoff_id=${row.handoff_id}, process_id=${row.process_id} not resolvable; "${row.note}"`
      );
      continue;
    }
    toInsert.push({
      handoff_id: row.handoff_id,
      process_id: row.process_id,
      proposal_source: "agent_curated",
      role: "implements",
      // record_status omitted, defaults to "new" per Rule #1.
      // notes omitted per Rule #15.
    });
  }
  if (toInsert.length === 0) {
    console.log("  Nothing to insert (all candidates conflict or fail pre-flight).");
    return;
  }
  console.log(`  Inserting ${toInsert.length} handoff_processes rows...`);
  const res = await semantius("POST", "/handoff_processes", toInsert);
  console.log("  POST handoff_processes ->", res);
  // Verify count.
  const after = (await semantius(
    "GET",
    `/handoff_processes?handoff_id=in.(${toInsert.map((r) => r.handoff_id).join(",")})&proposal_source=eq.agent_curated&select=handoff_id,process_id`
  )) as Array<{ handoff_id: number; process_id: number }>;
  const presentPairs = new Set(after.map((r) => `${r.handoff_id}.${r.process_id}`));
  const missing = toInsert.filter((r) => !presentPairs.has(`${r.handoff_id}.${r.process_id}`));
  if (missing.length > 0) {
    throw new Error(
      `B1-H1 verification failed: missing rows after insert: ${JSON.stringify(missing)}`
    );
  }
  console.log(`  B1-H1 verified, ${toInsert.length} rows present with proposal_source=agent_curated.`);
}

// ---------- main ----------
async function main() {
  try {
    await applyTriggerEventPatches();
    await applyDmdoDeletes();
    await applyDomainBusinessLogicPatch();
    await applyHandoffProcessInserts();
    banner("DONE, all residual B1 technical fixes applied.");
    console.log("UI: https://tests.semantius.app/domain_map/trigger_events");
    console.log("UI: https://tests.semantius.app/domain_map/domain_data_objects");
    console.log("UI: https://tests.semantius.app/domain_map/domains");
    console.log("UI: https://tests.semantius.app/domain_map/handoff_processes");
  } catch (e) {
    if ((e as Error).message === "JWT_AUDIENCE_HALT") {
      // The verbatim error was already printed in semantius() before throwing.
      process.exit(2);
    }
    throw e;
  }
}

await main();
