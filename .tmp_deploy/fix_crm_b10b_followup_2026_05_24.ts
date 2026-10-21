/**
 * Follow-up: load `consumer` domain_module_data_objects rows for inbound handoff
 * payloads that no CRM module currently holds, then re-run B10b backfill.
 *
 * Run from project root:
 *   bun run .tmp_deploy/fix_crm_b10b_followup_2026_05_24.ts
 */

const CRM_DOMAIN_ID = 69;

const ROLE_RANK: Record<string, number> = {
  master: 0,
  embedded_master: 1,
  contributor: 2,
  consumer: 3,
  derived: 4,
};

async function postgrest(method: string, path: string, body?: any) {
  const payload: any = { method, path };
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
  if (code !== 0) throw new Error(`${method} ${path}: ${stderr.trim() || stdout.trim()}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const get = (p: string) => postgrest("GET", p);
const post = (p: string, b: any) => postgrest("POST", p, b);
const patch = (p: string, b: any) => postgrest("PATCH", p, b);

function strongest<T extends { role: string }>(rows: T[]): T[] {
  if (rows.length === 0) return [];
  const min = Math.min(...rows.map((r) => ROLE_RANK[r.role] ?? 99));
  return rows.filter((r) => (ROLE_RANK[r.role] ?? 99) === min);
}

// Each payload -> the CRM module that should hold it as `consumer`.
// Decided per SKILL.md B10b sub-case 2: "load a consumer row on the receiving module
// (preferred — captures the dependency in the catalog)."
const CONSUMER_ADDITIONS: { data_object_name: string; module_code: string; notes: string }[] = [
  // SALES-ENG payloads
  { data_object_name: "sales_cadences", module_code: "CRM-ACTIVITY",
    notes: "Cadence completion surfaces in CRM activity timeline; informs next-action queue." },
  { data_object_name: "call_recordings", module_code: "CRM-ACTIVITY",
    notes: "Transcribed call recordings logged into account/opportunity activity timeline." },
  // CDP payloads
  { data_object_name: "intent_detections", module_code: "CRM-LEAD-MGT",
    notes: "Anonymous intent signals routed to lead-qualification workflow." },
  // LOYALTY payloads
  { data_object_name: "loyalty_tiers", module_code: "CRM-ACCT-MGT",
    notes: "Loyalty tier surfaces on account record for tier-aware sales motion." },
  // B2C-COMM payloads
  { data_object_name: "commerce_orders", module_code: "CRM-ACCT-MGT",
    notes: "Direct-to-consumer order history surfaces on account view." },
  { data_object_name: "payment_transactions", module_code: "CRM-ACCT-MGT",
    notes: "Payment failure alerts trigger sales/CS intervention on the account." },
  // FARMER-DIRECT-SALES payload (specialty / niche)
  { data_object_name: "csa_share_packs", module_code: "CRM-ACCT-MGT",
    notes: "CSA share pack delivery records linked to subscriber account." },
  // CPQ payload
  { data_object_name: "sales_quotes", module_code: "CRM-PIPELINE-MGT",
    notes: "Quote acceptance progresses the opportunity stage." },
  // CCAAS payload
  { data_object_name: "contact_records", module_code: "CRM-ACCT-MGT",
    notes: "Multi-channel contact records (CCAAS) attributed to the account." },
  // AGENCY-MGMT payload
  { data_object_name: "agency_retainers", module_code: "CRM-ACCT-MGT",
    notes: "Retainer depletion alerts sales for renewal/expansion conversation." },
  // CLM payload
  { data_object_name: "legal_contracts", module_code: "CRM-PIPELINE-MGT",
    notes: "Renewal-due warnings on existing contracts trigger expansion opportunities." },
  // MDM payload
  { data_object_name: "customer_golden_records", module_code: "CRM-ACCT-MGT",
    notes: "MDM golden-record publication refreshes the CRM account view." },
];

async function main() {
  console.log("CRM B10b follow-up (2026-05-24)\n");

  // Resolve module ids
  const mods: any[] = await get(`/domain_modules?domain_id=eq.${CRM_DOMAIN_ID}&select=id,domain_module_code`);
  const modCodeToId = new Map(mods.map((m: any) => [m.domain_module_code, m.id]));

  // Resolve data_object ids
  const names = CONSUMER_ADDITIONS.map((a) => a.data_object_name);
  const dos: any[] = await get(`/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`);
  const nameToId = new Map(dos.map((d: any) => [d.data_object_name, d.id]));

  // Pre-pull existing dmdo for these modules so we don't dupe
  const modIds = [...modCodeToId.values()];
  const existing: any[] = await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`);
  const existsKey = new Set(existing.map((r: any) => `${r.domain_module_id}:${r.data_object_id}`));

  const inserts: any[] = [];
  for (const a of CONSUMER_ADDITIONS) {
    const mid = modCodeToId.get(a.module_code);
    const doid = nameToId.get(a.data_object_name);
    if (!mid || !doid) {
      console.log(`  SKIP ${a.module_code} <- ${a.data_object_name}: ${!mid ? "module missing" : "data_object missing"}`);
      continue;
    }
    if (existsKey.has(`${mid}:${doid}`)) continue;
    inserts.push({
      domain_module_id: mid,
      data_object_id: doid,
      role: "consumer",
      necessity: "optional",
      notes: a.notes,
    });
  }

  if (inserts.length) {
    await post("/domain_module_data_objects", inserts);
    console.log(`Inserted ${inserts.length} consumer rows on CRM modules`);
  } else {
    console.log("No new consumer rows needed");
  }

  // Re-run B10b backfill, INBOUND side only (CRM is target)
  console.log("\nRe-running B10b inbound backfill...");
  const handoffs: any[] = await get(
    `/cross_domain_handoffs?target_domain_id=eq.${CRM_DOMAIN_ID}&target_domain_module_id=is.null&select=id,data_object_id`
  );

  const crmDMDO: any[] = await get(
    `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id,role`
  );

  function pickModule(doid: number): number | null {
    const c = crmDMDO.filter((r: any) => r.data_object_id === doid);
    if (c.length === 0) return null;
    const s = strongest(c);
    return s.length === 1 ? s[0].domain_module_id : null;
  }

  let patched = 0, stillNull = 0;
  for (const h of handoffs) {
    const mid = pickModule(h.data_object_id);
    if (mid !== null) {
      await patch(`/cross_domain_handoffs?id=eq.${h.id}`, { target_domain_module_id: mid });
      patched++;
    } else {
      stillNull++;
    }
  }
  console.log(`  Patched ${patched}; still NULL: ${stillNull}`);

  // Also re-run OUTBOUND side
  console.log("\nRe-running B10b outbound backfill...");
  const out: any[] = await get(
    `/cross_domain_handoffs?source_domain_id=eq.${CRM_DOMAIN_ID}&source_domain_module_id=is.null&select=id,data_object_id,trigger_events(data_object_id)`
  );
  let oPatched = 0, oNull = 0;
  for (const h of out) {
    const eventDoId = h.trigger_events?.data_object_id ?? h.data_object_id;
    const mid = pickModule(eventDoId);
    if (mid !== null) {
      await patch(`/cross_domain_handoffs?id=eq.${h.id}`, { source_domain_module_id: mid });
      oPatched++;
    } else {
      oNull++;
    }
  }
  console.log(`  Patched ${oPatched}; still NULL: ${oNull}`);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
