/**
 * INV-CRM b1 technical fixes (audit 2026-05-30).
 *
 * Applies the subset of Bucket 1 findings that are truly technical
 * (M5 PATCH on pre-named lifecycle-state row IDs, Rule #10 user-edges
 * with pre-specified actor lists, domain_regulations INSERT for the
 * one regulation already in the catalog, handoff_processes INSERTs
 * where the audit pre-specifies handoff_id + resolvable PCF id).
 *
 * Deferred to follow-up gated on user / Bucket 2 answers:
 *   B1-M1..M6  new entities (data_objects)
 *   B1-S1      catalog_tagline / catalog_description (Rule #20 wording)
 *   B1-S3      new trigger_events (no exact-tuple list with categories)
 *   B1-S4      lifecycle states + config-shape exemption (surface-to-user)
 *   B1-S6      roles (gated on Bucket 2 #4 naming approval)
 *   B1-S7      system skills + tools (full Phase-S load)
 *   B1-S8      domain_regulations for GDPR / CCPA / SEC IAA
 *              (those regulation rows do not exist yet; Bucket 2 #3 scope)
 *   B1-S9      data_object_aliases (audit does not pre-specify exact
 *              alias_name tuples)
 *   B1-B1      intra-domain handoffs (depend on B1-S3 trigger events)
 *
 * Idempotent: every write is preceded by a read against the natural key
 * or composed key, and skipped when already present.
 *
 * Run from project root: bun run .tmp_deploy/fix_inv_crm_b1_technical_2026_05_31.ts
 */

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: err.trim() || out.trim(), code };
  return { ok: true, data: out.trim() ? JSON.parse(out.trim()) : null, stderr: "", code };
}

async function get(path: string): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "GET", path });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "PATCH", path, body });
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

async function post(path: string, body: any): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "POST", path, body });
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
  return r.data;
}

// Resolved IDs (verified live before authoring this loader).
const USERS_DO_ID = 748;
const INV_CRM_DOMAIN_ID = 159;
const INV_CRM_DEAL_PIPELINE_MODULE_ID = 9;
const CAN_SPAM_REGULATION_ID = 59;
const DO = {
  investor_contacts: 753,
  lp_prospects: 754,
} as const;

// =====================================================================
// B1-S5: PATCH domain_module_id on 3 lifecycle states
// Audit names rows 445 (ic_review), 446 (term_sheet), 447 (closed) on
// vc_deals (data_object_id 750); set domain_module_id to 9
// (INV-CRM-DEAL-PIPELINE) so workflow-gate permissions materialize
// with the correct module prefix.
// =====================================================================
async function fixB1S5() {
  console.log("\n[B1-S5] domain_module_id backfill on vc_deals lifecycle states");
  const targetIds = [445, 446, 447];
  const expectedNames = new Map<number, string>([
    [445, "ic_review"],
    [446, "term_sheet"],
    [447, "closed"],
  ]);
  const live = await get(
    `/data_object_lifecycle_states?id=in.(${targetIds.join(",")})&select=id,data_object_id,state_name,requires_permission,domain_module_id`,
  );
  if (live.length !== 3) {
    throw new Error(`expected 3 lifecycle-state rows, got ${live.length}`);
  }
  for (const r of live) {
    const id = Number(r.id);
    const expected = expectedNames.get(id);
    if (r.state_name !== expected) {
      throw new Error(
        `state_name mismatch on id=${id}: live='${r.state_name}', expected='${expected}'`,
      );
    }
    if (Number(r.data_object_id) !== 750) {
      throw new Error(`data_object_id mismatch on id=${id}: live=${r.data_object_id}, expected=750 (vc_deals)`);
    }
    if (r.domain_module_id === INV_CRM_DEAL_PIPELINE_MODULE_ID) {
      console.log(`  id=${id} (${r.state_name}) already on module ${INV_CRM_DEAL_PIPELINE_MODULE_ID}, skip`);
      continue;
    }
    await patch(`/data_object_lifecycle_states?id=eq.${id}`, {
      domain_module_id: INV_CRM_DEAL_PIPELINE_MODULE_ID,
    });
    console.log(
      `  id=${id} (${r.state_name}) domain_module_id ${JSON.stringify(r.domain_module_id)} -> ${INV_CRM_DEAL_PIPELINE_MODULE_ID}`,
    );
  }
}

// =====================================================================
// B1-S2: INSERT data_object_relationships user-edges (Rule #10)
// Audit pre-specifies actor list per master:
//   investor_contacts (753): relationship_owner, source_introducer
//   lp_prospects     (754): lp_relations_lead
// =====================================================================
async function fixB1S2() {
  console.log("\n[B1-S2] users edges per Rule #10");
  type Edge = {
    related_data_object_id: number;
    relationship_verb: string;
    inverse_verb: string;
  };
  // source = users (748); target = each master. Verb is parent-voice
  // (user is_X master); inverse points from master back to user.
  const edges: Edge[] = [
    // investor_contacts: relationship_owner + source_introducer
    {
      related_data_object_id: DO.investor_contacts,
      relationship_verb: "owns relationship with",
      inverse_verb: "is owned by",
    },
    {
      related_data_object_id: DO.investor_contacts,
      relationship_verb: "introduced",
      inverse_verb: "was introduced by",
    },
    // lp_prospects: lp_relations_lead
    {
      related_data_object_id: DO.lp_prospects,
      relationship_verb: "leads relations with",
      inverse_verb: "is led by",
    },
  ];

  const targetIds = Object.values(DO).join(",");
  const existing = await get(
    `/data_object_relationships?data_object_id=eq.${USERS_DO_ID}&related_data_object_id=in.(${targetIds})&select=id,related_data_object_id,relationship_verb`,
  );
  const existingKey = new Set(
    existing.map((r: any) => `${r.related_data_object_id}::${r.relationship_verb}`),
  );

  const toInsert = edges
    .filter(e => !existingKey.has(`${e.related_data_object_id}::${e.relationship_verb}`))
    .map(e => ({
      data_object_id: USERS_DO_ID,
      related_data_object_id: e.related_data_object_id,
      relationship_verb: e.relationship_verb,
      inverse_verb: e.inverse_verb,
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "target",
      is_required: false,
      // record_status omitted -> defaults to 'new'
      // notes omitted -> defaults to ''
    }));

  if (toInsert.length === 0) {
    console.log(`  all ${edges.length} user edges already present, nothing to insert`);
    return;
  }
  console.log(`  inserting ${toInsert.length} user edges (${existing.length} pre-existing)`);
  await post(`/data_object_relationships`, toInsert);
  console.log(`  done`);
}

// =====================================================================
// B1-S8 (partial): INSERT domain_regulations for CAN-SPAM Act (id 59)
// Only the regulation that already exists in /regulations is loaded
// here. GDPR / CCPA / SEC Investment Advisers Act need /regulations
// INSERTs first and are gated on Bucket 2 #3 (user scope confirmation).
// =====================================================================
async function fixB1S8Partial() {
  console.log("\n[B1-S8 partial] domain_regulations INSERT for CAN-SPAM Act");
  const existing = await get(
    `/domain_regulations?domain_id=eq.${INV_CRM_DOMAIN_ID}&regulation_id=eq.${CAN_SPAM_REGULATION_ID}&select=id`,
  );
  if (existing.length > 0) {
    console.log(`  CAN-SPAM Act already linked to INV-CRM (row ${existing[0].id}), skip`);
    return;
  }
  await post(`/domain_regulations`, [
    {
      domain_id: INV_CRM_DOMAIN_ID,
      regulation_id: CAN_SPAM_REGULATION_ID,
      applicability: "conditional",
      // record_status omitted -> 'new'
      // condition_notes omitted -> ''
      // notes omitted -> '' (Rule #15)
    },
  ]);
  console.log(`  inserted CAN-SPAM Act link (applicability='conditional')`);
}

// =====================================================================
// B1-H1: INSERT handoff_processes for outbound INV-CRM handoffs with
// resolvable PCF (audit pre-specifies handoff_id + PCF id + external_id).
//   handoff 1038 (INV-CRM -> FUND-ADMIN, vc_deal.closed, capital_calls)
//     -> process 321 "Manage debt and investment" (PCF 10761, L3)
//   handoff 1039 (INV-CRM -> PORT-MONIT, vc_deal.closed, portfolio_companies)
//     -> process 409 "Manage portfolio" (PCF 16401, L3)
// proposal_source = 'agent_curated' per Phase B7.
// =====================================================================
async function fixB1H1() {
  console.log("\n[B1-H1] handoff_processes INSERT (agent_curated)");
  const rows: Array<{ handoff_id: number; process_id: number; note: string }> = [
    { handoff_id: 1038, process_id: 321, note: "Manage debt and investment (INV-CRM->FUND-ADMIN vc_deal.closed)" },
    { handoff_id: 1039, process_id: 409, note: "Manage portfolio (INV-CRM->PORT-MONIT vc_deal.closed)" },
  ];

  // Resolve every process_id exists in /processes.
  const processIds = Array.from(new Set(rows.map(r => r.process_id))).join(",");
  const processCheck = await get(`/processes?id=in.(${processIds})&select=id,process_name,source_framework,external_id`);
  const foundProcessIds = new Set(processCheck.map((p: any) => Number(p.id)));
  for (const r of rows) {
    if (!foundProcessIds.has(r.process_id)) {
      throw new Error(`process_id ${r.process_id} (${r.note}) not found in /processes; aborting before any insert`);
    }
  }
  console.log(`  verified ${processCheck.length} PCF processes resolvable`);

  // Verify both handoffs exist.
  const handoffIds = rows.map(r => r.handoff_id).join(",");
  const handoffCheck = await get(`/handoffs?id=in.(${handoffIds})&select=id`);
  if (handoffCheck.length !== rows.length) {
    throw new Error(`expected ${rows.length} handoffs, got ${handoffCheck.length}`);
  }

  // Idempotency: pull existing (handoff_id, process_id) pairs.
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${handoffIds})&select=handoff_id,process_id`,
  );
  const existingKey = new Set(
    existing.map((r: any) => `${r.handoff_id}::${r.process_id}`),
  );

  const toInsert = rows
    .filter(r => !existingKey.has(`${r.handoff_id}::${r.process_id}`))
    .map(r => ({
      handoff_id: r.handoff_id,
      process_id: r.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> 'new'
      // notes omitted -> '' (Rule #15)
    }));

  for (const r of rows) {
    if (existingKey.has(`${r.handoff_id}::${r.process_id}`)) {
      console.log(`  (${r.handoff_id}, ${r.process_id}) already present, skip`);
    }
  }
  if (toInsert.length === 0) {
    console.log(`  nothing to insert`);
    return;
  }
  console.log(`  inserting ${toInsert.length} agent_curated handoff_processes rows`);
  for (const row of toInsert) {
    await post(`/handoff_processes`, [row]);
    console.log(`  + (${row.handoff_id}, ${row.process_id})`);
  }
}

// =====================================================================
// MAIN
// =====================================================================
async function main() {
  // Sanity check tenant.
  const who = await call("crud", "getCurrentUser", {});
  if (!who.ok) throw new Error(`getCurrentUser failed: ${who.stderr}`);
  const email = who.data?.email ?? "<unknown>";
  console.log(`Authenticated as ${email}`);
  const dm = (who.data?.modules ?? []).find((m: any) => Number(m.id) === 1001);
  if (!dm) throw new Error(`domain_map module (1001) not in tenant scope; aborting`);

  await fixB1S5();
  await fixB1S2();
  await fixB1S8Partial();
  await fixB1H1();

  console.log("\nDone.");
  console.log("UI: https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("UI: https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("UI: https://tests.semantius.app/domain_map/domain_regulations");
  console.log("UI: https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
