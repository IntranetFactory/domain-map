#!/usr/bin/env bun
/**
 * VMS (Vendor Management System) B1 truly-technical fixes (2026-05-31 continuation).
 *
 * Applies ONLY the audit's pre-specified, no-judgment items:
 *
 *   1. B1-H1  INSERT 6 handoff_processes rows pre-specified by the audit
 *      with handoff_id + PCF external_id. proposal_source='agent_curated'.
 *      Skips handoff 117 (audit explicitly qualifies its tag as
 *      "assuming entity 187 resolves to SOW; if PM, the verb belongs to
 *      EAM and the handoff itself is mis-modeled"). That conditional makes
 *      it judgment, gated on Bucket 2 #B2-1.
 *
 * Deferred (NOT applied by this loader), with reasons:
 *   - B1-S1  (M1) Zero `domain_modules`: new entities, also gated on
 *            Bucket 2 #B2-1 (module naming + entity 187 identity).
 *   - B1-S2  (M5) Lifecycle state module attribution: cascades from B1-S1.
 *   - B1-S3  (M7) Single-master invariant post-modularization: cascades
 *            from B1-S1.
 *   - B1-S4  (F1) Retire legacy skill 118 + author 2 new system skills:
 *            cascades from B1-S1 (new modules required).
 *   - B1-S5  (A4) catalog_tagline / catalog_description: Rule #20 buyer-voice
 *            draft, surface to user BEFORE writing.
 *   - B1-S6  (B2) Recorded pass.
 *   - B1-S7  (B3) Rule #9 naming arbitration on `rate_cards`: user picks
 *            canonical-bare-word vs prefix vs abort.
 *   - B1-S8  (B4) Pattern flag flips on 5 masters: explicit "decide" /
 *            "user confirms" surface in audit (Bucket 2 #B2-3).
 *   - B1-S9  (B6) Semantically-suspect relationship rows: gated on
 *            Bucket 2 #B2-1.
 *   - B1-S10 (B7) Recorded pass.
 *   - B1-S11 (B9) INSERT 2 new `handoffs` for `rate_card.published`: new
 *            entities (handoffs rows), not in the technical-scope list.
 *   - B1-S12 (B9b) Intra-domain handoffs: gated on B1-S1.
 *   - B1-S13 (B10b) PATCH `handoffs.source_domain_module_id` for 7 rows:
 *            NOT derivable from existing modules (VMS has zero modules);
 *            cascades from B1-S1.
 *   - B1-S14 (B11) Recorded pass.
 *   - B1-S15 (B12) Lifecycle states + workflow gates: new entities,
 *            gated on B1-S1.
 *   - B1-S16 (E1) Roles + role_modules + role_permissions: new entities,
 *            gated on B1-S1.
 *   - B1-B1  Cross-domain DOR mirrors: gated on Bucket 2 #B2-1.
 *   - B1-B2  INSERT `data_object_relationships` row
 *            `contingent_workers converts_to employees`: target=employees
 *            (id=31), NOT a Rule #10 user-edge (Rule #10 covers edges to
 *            `kind='platform_builtin'` rows, today only `users` id=748);
 *            verb selection here is judgment.
 *
 * Idempotent: reads existing state and inserts only the missing rows.
 *
 * Run from project root (c:/dev/domain-map) per CLAUDE.md:
 *   bun run c:/dev/domain-map/.tmp_deploy/fix_vms_b1_technical_2026_05_31.ts
 */

type Row = Record<string, unknown>;

async function semCall(tool: string, payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const get = (path: string) =>
  semCall("postgrestRequest", { method: "GET", path }) as Promise<any[]>;
const post = (path: string, body: Row | Row[]) =>
  semCall("postgrestRequest", { method: "POST", path, body }) as Promise<any[]>;

const VMS_DOMAIN_ID = 64;

// ---------------------------------------------------------------------------
// B1-H1: INSERT 6 handoff_processes rows pre-specified by the audit.
// Audit table B1-H1 has 7 curated rows. Of those:
//   - handoff 117 (VMS -> S2P) is DEFERRED. The audit's own confidence
//     note qualifies the PCF tag as "confident L3 (assuming entity 187
//     resolves to SOW; if PM, the verb belongs to EAM and the handoff
//     itself is mis-modeled)". That conditional gates on Bucket 2 #B2-1
//     (entity 187 identity), so the tag is judgment, not pre-specified.
//   - The other 6 (118, 587, 588, 589, 590, 591) are unambiguous L3/L4
//     and get inserted.
// ---------------------------------------------------------------------------

type HandoffProcess = {
  handoff_id: number;
  process_id: number;
  expected_external_id: string;
  pcf_name: string; // for logging only
};

const HANDOFF_PROCESSES: HandoffProcess[] = [
  { handoff_id: 118, process_id: 222, expected_external_id: "10443", pcf_name: "Manage new hire/re-hire" },
  { handoff_id: 587, process_id: 923, expected_external_id: "10392", pcf_name: "Track workforce utilization" },
  { handoff_id: 588, process_id: 315, expected_external_id: "10756", pcf_name: "Process accounts payable (AP)" },
  { handoff_id: 589, process_id: 315, expected_external_id: "10756", pcf_name: "Process accounts payable (AP)" },
  { handoff_id: 590, process_id: 1418, expected_external_id: "10858", pcf_name: "Enter employee time worked into payroll system" },
  { handoff_id: 591, process_id: 167, expected_external_id: "10280", pcf_name: "Manage suppliers" },
];

async function insertHandoffProcesses() {
  console.log("\n=== B1-H1: INSERT handoff_processes (agent_curated) ===");

  const handoffIds = [...new Set(HANDOFF_PROCESSES.map((r) => r.handoff_id))];
  const processIds = [...new Set(HANDOFF_PROCESSES.map((r) => r.process_id))];

  const [handoffs, processes] = await Promise.all([
    get(`/handoffs?select=id,source_domain_id,target_domain_id&id=in.(${handoffIds.join(",")})`),
    get(`/processes?select=id,external_id&id=in.(${processIds.join(",")})`),
  ]);
  const handoffMap = new Map<number, { source: number; target: number }>(
    handoffs.map((h) => [
      Number(h.id),
      { source: Number(h.source_domain_id), target: Number(h.target_domain_id) },
    ]),
  );
  const processMap = new Map<number, string>(
    processes.map((p) => [Number(p.id), String(p.external_id)]),
  );

  // Pre-flight: each handoff touches VMS and each external_id matches audit.
  for (const row of HANDOFF_PROCESSES) {
    const h = handoffMap.get(row.handoff_id);
    if (!h) {
      throw new Error(`pre-flight: handoff_id=${row.handoff_id} not found`);
    }
    if (h.source !== VMS_DOMAIN_ID && h.target !== VMS_DOMAIN_ID) {
      throw new Error(
        `pre-flight: handoff id=${row.handoff_id} (source=${h.source}, target=${h.target}) does not touch VMS (${VMS_DOMAIN_ID})`,
      );
    }
    const liveExternal = processMap.get(row.process_id);
    if (!liveExternal) {
      throw new Error(`pre-flight: process_id=${row.process_id} not found`);
    }
    if (liveExternal !== row.expected_external_id) {
      throw new Error(
        `pre-flight: process_id=${row.process_id} external_id is "${liveExternal}", audit expected "${row.expected_external_id}". Refusing to write.`,
      );
    }
  }
  console.log(`  + pre-flight: all ${HANDOFF_PROCESSES.length} (handoff_id, process_id) pairs verified`);

  // Existing rows on this set of handoff_ids: skip duplicates and competing.
  const existing = await get(
    `/handoff_processes?select=id,handoff_id,process_id&handoff_id=in.(${handoffIds.join(",")})`,
  );
  const existingKey = new Set(existing.map((r) => `${r.handoff_id}|${r.process_id}`));
  const existingByHandoff = new Map<number, number[]>();
  for (const r of existing) {
    const hid = Number(r.handoff_id);
    const list = existingByHandoff.get(hid) ?? [];
    list.push(Number(r.process_id));
    existingByHandoff.set(hid, list);
  }

  const toInsert: Row[] = [];
  for (const row of HANDOFF_PROCESSES) {
    const key = `${row.handoff_id}|${row.process_id}`;
    if (existingKey.has(key)) {
      console.log(`  = handoff_id=${row.handoff_id} process_id=${row.process_id}: exists, skipping`);
      continue;
    }
    const competing = existingByHandoff.get(row.handoff_id);
    if (competing && competing.length > 0) {
      console.log(
        `  ! handoff_id=${row.handoff_id}: already has process_id(s) ${competing.join(",")} loaded; audit asks ${row.process_id}. Skipping (rubric does not license PATCH or competing append).`,
      );
      continue;
    }
    toInsert.push({
      handoff_id: row.handoff_id,
      process_id: row.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> defaults to 'new' per Rule #1.
      // notes omitted -> empty per Rule #15.
    });
  }

  if (toInsert.length === 0) {
    console.log("  (nothing to insert)");
    return;
  }
  const inserted = await post("/handoff_processes", toInsert);
  for (const r of inserted) {
    const audit = HANDOFF_PROCESSES.find(
      (a) => a.handoff_id === Number(r.handoff_id) && a.process_id === Number(r.process_id),
    );
    console.log(
      `  + id=${r.id} handoff_id=${r.handoff_id} -> process_id=${r.process_id} (${audit?.pcf_name}) key="${r.key}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("VMS B1 truly-technical fixes (2026-05-31)");
  console.log("=========================================");

  await insertHandoffProcesses();

  console.log("\nDone.");
  console.log("  UI links:");
  console.log("    https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
