#!/usr/bin/env bun
// DISCOVERY B1 technical fixes residual pass (audits/DISCOVERY.md,
// 2026-05-30 Validate b1).
//
// Applies only truly-technical, no-judgment Bucket 1 fixes per the
// continuation prompt. Everything else (modules, capabilities, solutions,
// DMDO re-anchoring, lifecycle states, system skills, intra-domain
// relationships, aliases, catalog UX, trigger-event coverage options) is
// deferred (recorded in the audit continuation).
//
// Scope of THIS loader:
//
//  1. B1-S1: PATCH domains.business_logic on DISCOVERY (id 5) to remove
//     the U+2014 em-dash and replace with parentheses, per project
//     CLAUDE.md "No em-dashes" rule. Audit pre-specifies exact text.
//
//  2. B1-B1: DELETE two stale discovery_substring handoff_processes rows
//     (ids 51 and 53) that mis-tag DISCOVERY->CMDB handoffs (48 -> proc 9
//     "Manage Financial Resources", 49 -> proc 12 "Manage External
//     Relationships"). Both are obvious false positives matching the verb
//     "manage" only. Audit pre-specifies the row identities.
//
//  3. B1-B2: DELETE legacy domain_data_objects row id 145 (domain 5,
//     data_object 79 = service_maps). Live DMDO master is CMDB-SERVICE-
//     MAPPING; the legacy rollup is wrong. Audit pre-specifies this row.
//     (Note: live role is 'contributor', audit says 'master'; either way
//     the delete is correct per the audit's recommendation.)
//
//  4. B1-S10 (Rule #10 user-edges): INSERT 3 data_object_relationships
//     rows pointing the 3 DISCOVERY masters at the platform_builtin users
//     row (data_object 748):
//       - discovery_scans (81)   -> users (748)  initiated_by (scan_operator)
//       - discovered_devices (82) -> users (748) reviewed_by (reconciliation reviewer)
//       - discovery_sources (83)  -> users (748) owned_by (credential / connector owner)
//
//  5. B1-H1 (APQC tagging): INSERT 9 new agent_curated handoff_processes
//     rows for DISCOVERY handoffs that have no agent_curated row yet AND
//     whose stale discovery_substring row (handoffs 48, 49) is being
//     cleared by step 2. Audit pre-specifies handoff_id + PCF process_id
//     for all 14 DISCOVERY-related handoffs, but:
//       - handoff 33 already has a discovery_substring row at the correct
//         PCF 1258; the proposal_source upgrade is NOT a technical PATCH
//         in the prompt's allow-list, so we leave it alone.
//       - handoffs 50, 621, 625 already carry agent_curated rows pointing
//         at DIFFERENT PCFs than the audit proposes; per Rule #1 we do
//         not silently overwrite prior curated decisions.
//       - handoff 1199 already has an agent_curated row at the audit's
//         proposed PCF (1309); already correct, no-op.
//
//     Inserts (handoff_id -> process_id):
//       32  -> 1312 (Maintain IT asset records)
//       47  ->  294 (Manage infrastructure resource administration)
//       48  -> 1309 (Manage infrastructure configuration)
//       49  -> 1309 (Manage infrastructure configuration)
//      147  -> 1309 (Manage infrastructure configuration)
//      622  -> 1312 (Maintain IT asset records)
//      623  -> 1312 (Maintain IT asset records)
//      624  -> 1301 (Operate and monitor online systems)
//      626  -> 1301 (Operate and monitor online systems)
//
// Deferred (NOT applied here, recorded in audit continuation):
//   - B1-S2 capabilities (new entities; gated on Bucket 2 #1)
//   - B1-S3 solution backfill (new entities)
//   - B1-S4 catalog_tagline / catalog_description (Rule #20 surface-to-user)
//   - B1-S5 domain_modules (new entities; gated on Bucket 2 #1)
//   - B1-S6 / S7 domain_module_capabilities (gated on B1-S5)
//   - B1-S8 DMDO re-anchoring (gated on B1-S5)
//   - B1-S9 intra-domain data_object_relationships (NOT user-edges;
//           deferred per prompt's "data_object_relationships user-edges
//           Rule #10 audit pre-specifies" scope)
//   - B1-S11 data_object_aliases ("borderline" judgment + vendor terminology
//           risk per Rule #18)
//   - B1-S12 lifecycle states (gated on B1-S5; need realizing module FK)
//   - B1-S13 / S14 skill renames + module anchoring (gated on B1-S5)
//   - B1-T1..T5 trigger-event coverage (all judgment / "may want" / "decide")
//
// Idempotent: re-reads each target before writing; skips already-correct
// or already-deleted rows.
//
// Run from project root:
//   bun run .tmp_deploy/fix_discovery_b1_technical_2026_05_31.ts

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const post = (path: string, body: Row | Row[]) => call({ method: "POST", path, body });
const del = (path: string) => call({ method: "DELETE", path });

const DISCOVERY_DOMAIN_ID = 5;
const USERS_DATA_OBJECT_ID = 748;
const DISCOVERY_SCANS_ID = 81;
const DISCOVERED_DEVICES_ID = 82;
const DISCOVERY_SOURCES_ID = 83;
const SERVICE_MAPS_DATA_OBJECT_ID = 79;

// ---------------------------------------------------------------------------
// B1-S1: PATCH em-dash out of domains.business_logic
// ---------------------------------------------------------------------------

const BUSINESS_LOGIC_TARGET =
  "Scanning, fingerprinting, and credentialed inspection across networks, " +
  "cloud APIs, and agents (code-dominant collection plane).";

async function fixBusinessLogic() {
  const rows = await get(
    `/domains?id=eq.${DISCOVERY_DOMAIN_ID}&select=id,domain_code,business_logic`,
  );
  if (rows.length !== 1) {
    throw new Error(`B1-S1: DISCOVERY domain (id ${DISCOVERY_DOMAIN_ID}) not found`);
  }
  const current = String(rows[0].business_logic);
  if (current === BUSINESS_LOGIC_TARGET) {
    console.log(`B1-S1: business_logic already correct; skipping`);
    return { patched: 0, skipped: 1 };
  }
  if (!current.includes("—")) {
    console.warn(
      `B1-S1: live business_logic does not contain U+2014 but differs from target.\n` +
      `       live:   ${JSON.stringify(current)}\n` +
      `       target: ${JSON.stringify(BUSINESS_LOGIC_TARGET)}\n` +
      `       Refusing to PATCH without explicit confirmation.`,
    );
    return { patched: 0, skipped: 1 };
  }
  await patch(`/domains?id=eq.${DISCOVERY_DOMAIN_ID}`, {
    business_logic: BUSINESS_LOGIC_TARGET,
  });
  console.log(`B1-S1: PATCHED domains.business_logic on DISCOVERY (em-dash -> parens)`);
  return { patched: 1, skipped: 0 };
}

// ---------------------------------------------------------------------------
// B1-B1: DELETE 2 stale discovery_substring handoff_processes
// ---------------------------------------------------------------------------
// Audit-named rows: handoff 48 -> proc 9 (id 51), handoff 49 -> proc 12
// (id 53). Both are discovery_substring false-positives on "manage".

const staleHandoffProcessIds: Array<{ id: number; handoff_id: number; process_id: number }> = [
  { id: 51, handoff_id: 48, process_id: 9 },
  { id: 53, handoff_id: 49, process_id: 12 },
];

async function deleteStaleHandoffProcesses() {
  const ids = staleHandoffProcessIds.map(r => r.id);
  const existing = await get(
    `/handoff_processes?id=in.(${ids.join(",")})&select=id,handoff_id,process_id,proposal_source`,
  );
  let deleted = 0;
  for (const expected of staleHandoffProcessIds) {
    const live = existing.find(e => Number(e.id) === expected.id);
    if (!live) {
      console.log(`B1-B1: id=${expected.id} already gone; skipping`);
      continue;
    }
    if (
      Number(live.handoff_id) !== expected.handoff_id ||
      Number(live.process_id) !== expected.process_id ||
      live.proposal_source !== "discovery_substring"
    ) {
      console.warn(
        `B1-B1: id=${expected.id} drifted from audit expectation ` +
        `(handoff=${live.handoff_id} process=${live.process_id} source=${live.proposal_source}); ` +
        `skipping to avoid destructive surprise`,
      );
      continue;
    }
    await del(`/handoff_processes?id=eq.${expected.id}`);
    console.log(
      `B1-B1: DELETED handoff_processes id=${expected.id} ` +
      `(handoff=${expected.handoff_id}, stale proc=${expected.process_id})`,
    );
    deleted += 1;
  }
  return { deleted, found: existing.length };
}

// ---------------------------------------------------------------------------
// B1-B2: DELETE legacy domain_data_objects row (id 145)
// ---------------------------------------------------------------------------
// Domain 5 (DISCOVERY), data_object 79 (service_maps). Live DMDO master
// is in CMDB-SERVICE-MAPPING; the legacy rollup row here is stale.

const LEGACY_DDO_ID = 145;

async function deleteLegacyDdo() {
  const rows = await get(
    `/domain_data_objects?id=eq.${LEGACY_DDO_ID}&select=id,domain_id,data_object_id,role`,
  );
  if (rows.length === 0) {
    console.log(`B1-B2: id=${LEGACY_DDO_ID} already gone; skipping`);
    return { deleted: 0 };
  }
  const r = rows[0];
  if (
    Number(r.domain_id) !== DISCOVERY_DOMAIN_ID ||
    Number(r.data_object_id) !== SERVICE_MAPS_DATA_OBJECT_ID
  ) {
    throw new Error(
      `B1-B2: SAFETY: id=${LEGACY_DDO_ID} maps domain=${r.domain_id} data_object=${r.data_object_id}, ` +
      `expected ${DISCOVERY_DOMAIN_ID}/${SERVICE_MAPS_DATA_OBJECT_ID}. Refusing to delete.`,
    );
  }
  await del(`/domain_data_objects?id=eq.${LEGACY_DDO_ID}`);
  console.log(
    `B1-B2: DELETED domain_data_objects id=${LEGACY_DDO_ID} (DISCOVERY x service_maps, was role=${r.role})`,
  );
  return { deleted: 1 };
}

// ---------------------------------------------------------------------------
// B1-S10: INSERT 3 Rule #10 user-edges
// ---------------------------------------------------------------------------
// Each master has user-typed actors; per Rule #10 the edge MUST be
// recorded against the platform_builtin users data_object.
//
// Edge shape (all): source = master, target = users (748),
// relationship_type=many_to_many (catalog convention for actor edges to
// the platform_builtin users row; the enum only allows one_to_one /
// one_to_many / many_to_many, and existing user-edge rows uniformly use
// many_to_many),
// relationship_kind=reference (loose link, not lifecycle),
// owner_side=source (master cascades, users does not).
//
// notes omitted -> Rule #15 default ''.
// record_status omitted -> Rule #1 default 'new'.

const userEdges: Array<{
  source: number;
  source_label: string;
  verb: string;
  inverse: string;
}> = [
  {
    source: DISCOVERY_SCANS_ID,
    source_label: "discovery_scans",
    verb: "initiated by",
    inverse: "initiates",
  },
  {
    source: DISCOVERED_DEVICES_ID,
    source_label: "discovered_devices",
    verb: "reviewed by",
    inverse: "reviews",
  },
  {
    source: DISCOVERY_SOURCES_ID,
    source_label: "discovery_sources",
    verb: "owned by",
    inverse: "owns",
  },
];

async function insertUserEdges() {
  // Idempotent check: skip any (source, target) pair that already exists.
  const sources = userEdges.map(e => e.source).join(",");
  const existing = await get(
    `/data_object_relationships?data_object_id=in.(${sources})&related_data_object_id=eq.${USERS_DATA_OBJECT_ID}&select=id,data_object_id,related_data_object_id,relationship_verb`,
  );
  const existingByPair = new Set(
    existing.map(r => `${r.data_object_id}->${r.related_data_object_id}`),
  );
  const toInsert = userEdges
    .filter(e => !existingByPair.has(`${e.source}->${USERS_DATA_OBJECT_ID}`))
    .map(e => ({
      data_object_id: e.source,
      related_data_object_id: USERS_DATA_OBJECT_ID,
      relationship_type: "many_to_many",
      relationship_kind: "reference",
      relationship_verb: e.verb,
      inverse_verb: e.inverse,
      owner_side: "source",
      is_required: false,
    }));
  console.log(
    `B1-S10: ${userEdges.length} target edges; ${existing.length} already exist; inserting ${toInsert.length}`,
  );
  if (toInsert.length > 0) {
    const out = await post(`/data_object_relationships`, toInsert);
    console.log(`  INSERTED ${out.length} data_object_relationships rows`);
    for (const e of userEdges.filter(
      e => !existingByPair.has(`${e.source}->${USERS_DATA_OBJECT_ID}`),
    )) {
      console.log(`    + ${e.source_label} (${e.source}) -[${e.verb}]-> users (${USERS_DATA_OBJECT_ID})`);
    }
  }
  return { inserted: toInsert.length, existing: existing.length };
}

// ---------------------------------------------------------------------------
// B1-H1: INSERT 9 new agent_curated handoff_processes
// ---------------------------------------------------------------------------

const handoffProcessRows: Array<{
  handoff_id: number;
  process_id: number;
  note: string;
}> = [
  { handoff_id: 32,  process_id: 1312, note: "DISCOVERY->HAM device.discovered (Maintain IT asset records)" },
  { handoff_id: 47,  process_id: 294,  note: "DISCOVERY->SMP sso_login.unsanctioned_app (Manage infrastructure resource administration)" },
  { handoff_id: 48,  process_id: 1309, note: "DISCOVERY->CMDB ci.discovered (Manage infrastructure configuration)" },
  { handoff_id: 49,  process_id: 1309, note: "DISCOVERY->CMDB relationship.discovered (Manage infrastructure configuration)" },
  { handoff_id: 147, process_id: 1309, note: "RMM->DISCOVERY network_device.discovered (Manage infrastructure configuration)" },
  { handoff_id: 622, process_id: 1312, note: "DISCOVERY->HAM discovery_scan.completed (Maintain IT asset records)" },
  { handoff_id: 623, process_id: 1312, note: "DISCOVERY->SAM discovery_scan.completed (Maintain IT asset records)" },
  { handoff_id: 624, process_id: 1301, note: "DISCOVERY->ITSM discovery_scan.failed (Operate and monitor online systems)" },
  { handoff_id: 626, process_id: 1301, note: "DISCOVERY->ITSM discovery_source.disconnected (Operate and monitor online systems)" },
];

// Handoffs the audit also addresses but this loader does NOT touch:
//   33  : existing discovery_substring at correct PCF 1258 (audit says keep);
//         re-stamping proposal_source isn't in the technical PATCH allow-list.
//   50  : existing agent_curated at PCF 1301; audit proposes 1297. Prior
//         curated decision; do not overwrite without user license.
//   621 : existing agent_curated at PCF 1309; audit proposes 1288. Skip.
//   625 : existing agent_curated at PCF 1309; audit proposes 1311. Skip.
//   1199: existing agent_curated at PCF 1309; audit also proposes 1309. No-op.
const skippedHandoffs = [33, 50, 621, 625, 1199];

async function insertHandoffProcesses() {
  // Verify each target handoff exists and each PCF id resolves before
  // composing the insert batch. (Both pre-verified out-of-band; this
  // re-check makes the loader self-contained / idempotent.)
  const handoffIds = handoffProcessRows.map(r => r.handoff_id);
  const handoffs = await get(
    `/handoffs?id=in.(${handoffIds.join(",")})&select=id`,
  );
  const handoffSet = new Set(handoffs.map(h => Number(h.id)));
  for (const r of handoffProcessRows) {
    if (!handoffSet.has(r.handoff_id)) {
      throw new Error(`B1-H1: handoff id ${r.handoff_id} not found; aborting`);
    }
  }

  const processIds = [...new Set(handoffProcessRows.map(r => r.process_id))];
  const processes = await get(
    `/processes?id=in.(${processIds.join(",")})&select=id`,
  );
  const procSet = new Set(processes.map(p => Number(p.id)));
  for (const pid of processIds) {
    if (!procSet.has(pid)) {
      throw new Error(`B1-H1: process id ${pid} not found; aborting`);
    }
  }

  // Idempotent: skip if any prior agent_curated row exists for the
  // handoff (don't silently overwrite prior curated decisions).
  const allConsidered = [...handoffIds, ...skippedHandoffs];
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${allConsidered.join(",")})&select=id,handoff_id,process_id,proposal_source`,
  );
  const agentCuratedByHandoff = new Map<number, Row>();
  for (const e of existing) {
    if (e.proposal_source === "agent_curated") {
      agentCuratedByHandoff.set(Number(e.handoff_id), e);
    }
  }
  // Warn on any in-scope conflict (shouldn't happen given the skip-list
  // above, but guard against drift).
  for (const r of handoffProcessRows) {
    const prior = agentCuratedByHandoff.get(r.handoff_id);
    if (prior && Number(prior.process_id) !== r.process_id) {
      console.warn(
        `  CONFLICT: handoff ${r.handoff_id} already has agent_curated -> process ${prior.process_id}; ` +
        `audit proposes ${r.process_id}; skipping to preserve prior curated decision`,
      );
    } else if (prior) {
      console.log(
        `  NOOP: handoff ${r.handoff_id} already agent_curated at correct process ${r.process_id}`,
      );
    }
  }

  const toInsert = handoffProcessRows
    .filter(r => !agentCuratedByHandoff.has(r.handoff_id))
    .map(r => ({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      proposal_source: "agent_curated",
    }));

  console.log(
    `B1-H1: ${handoffProcessRows.length} target rows; inserting ${toInsert.length}`,
  );
  for (const hid of skippedHandoffs) {
    const prior = agentCuratedByHandoff.get(hid);
    if (prior) {
      console.log(
        `    SKIP handoff ${hid}: prior agent_curated -> process ${prior.process_id}`,
      );
    } else {
      console.log(
        `    SKIP handoff ${hid}: see audit (existing discovery_substring kept or noop)`,
      );
    }
  }

  if (toInsert.length > 0) {
    const out = await post(`/handoff_processes`, toInsert);
    console.log(`  INSERTED ${out.length} handoff_processes rows`);
    for (const r of toInsert) {
      const meta = handoffProcessRows.find(x => x.handoff_id === r.handoff_id)!;
      console.log(`    + handoff=${r.handoff_id} process=${r.process_id}  // ${meta.note}`);
    }
  }
  return { inserted: toInsert.length, skipped: skippedHandoffs.length };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
console.log("DISCOVERY B1 technical fixes (2026-05-31 continuation)");
console.log("=======================================================");
console.log("");

const sS1   = await fixBusinessLogic();
const sB1   = await deleteStaleHandoffProcesses();
const sB2   = await deleteLegacyDdo();
const sS10  = await insertUserEdges();
const sH1   = await insertHandoffProcesses();

console.log("");
console.log("Summary:");
console.log(`  B1-S1   business_logic em-dash PATCH:    ${sS1.patched} patched / ${sS1.skipped} already correct`);
console.log(`  B1-B1   stale handoff_processes DELETE:  ${sB1.deleted} deleted / ${sB1.found} found`);
console.log(`  B1-B2   legacy DDO row DELETE:           ${sB2.deleted} deleted`);
console.log(`  B1-S10  Rule #10 user-edges INSERT:      ${sS10.inserted} inserted / ${sS10.existing} existing`);
console.log(`  B1-H1   agent_curated handoff_processes: ${sH1.inserted} inserted / ${sH1.skipped} prior-curated or noop skipped`);
console.log("");
console.log("UI:");
console.log("  https://tests.semantius.app/domain_map/domains");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
