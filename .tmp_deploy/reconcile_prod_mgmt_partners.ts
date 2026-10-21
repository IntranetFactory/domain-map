#!/usr/bin/env bun
// Pairwise reconciliation: PROD-MGMT (id=101) ↔ each related domain.
// Read-only. Produces a single summary diff at c:/tmp/reconcile_PROD-MGMT_all_2026_05_26.md.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const jsonStr = JSON.stringify(body);
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", jsonStr], {
    stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  if ((await proc.exited) !== 0) throw new Error(`call failed: ${stderr}`);
  return stdout.trim() ? JSON.parse(stdout) : [];
}

const PROD_MGMT = 101;
const PROD_MGMT_CODE = "PROD-MGMT";
const PROD_MGMT_MASTERS = [402, 403, 404, 405, 406, 407, 408, 409];

const partners = [
  { id: 30,  code: "CSM" },
  { id: 72,  code: "CDP" },
  { id: 69,  code: "CRM" },
  { id: 77,  code: "DXP" },
  { id: 135, code: "WORK-MGMT" },
  { id: 65,  code: "ERP-FIN" },
  { id: 136, code: "BPA" },
  { id: 9,   code: "SPM" },
  { id: 80,  code: "VSDP" },
  { id: 8,   code: "TEST-MGMT" },
];

const out: string[] = [];
out.push(`# Pairwise reconciliation: ${PROD_MGMT_CODE} ↔ related domains`);
out.push(`Generated: 2026-05-26 (post Phase M / S / B12 / B10b)\n`);
out.push(`This report walks each cross-domain boundary with PROD-MGMT and reports four sections per direction (8 per partner):`);
out.push(`1. Existing handoffs fully wired (informational)`);
out.push(`2. Existing handoffs with NULL module FK on the other side (owed by partner B10b)`);
out.push(`3. Missing handoffs the catalog implies should exist`);
out.push(`4. Boundary integrity gaps (B5 / B10b sub-case 2)\n`);

// Pull PROD-MGMT's workflow states + trigger_events once
const pmStates = await call({ method: "GET", path: `/data_object_lifecycle_states?data_object_id=in.(${PROD_MGMT_MASTERS.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,domain_module_id` });
const pmEvents = await call({ method: "GET", path: `/trigger_events?data_object_id=in.(${PROD_MGMT_MASTERS.join(",")})&select=id,event_name,data_object_id` });

// PROD-MGMT modules' DMDO map
const pmDmdo = await call({ method: "GET", path: `/domain_module_data_objects?domain_module_id=in.(130,131)&select=domain_module_id,data_object_id,role,necessity` });

for (const p of partners) {
  out.push(`---\n\n## ${p.code} (id ${p.id})\n`);

  // Pull partner modules + masters
  const pModules = await call({ method: "GET", path: `/domain_modules?domain_id=eq.${p.id}&select=id,domain_module_code` });
  const pHostModules = await call({ method: "GET", path: `/domain_module_host_domains?domain_id=eq.${p.id}&select=domain_module:domain_modules(id,domain_module_code)` });
  const pModuleIds = [...pModules.map(m => Number(m.id)), ...pHostModules.flatMap(h => h.domain_module ? [Number((h.domain_module as Row).id)] : [])];
  out.push(`Partner modules (${pModuleIds.length}): ${[...pModules.map(m=>m.domain_module_code), ...pHostModules.map(h => (h.domain_module as Row)?.domain_module_code)].filter(Boolean).join(", ") || "(none)"}\n`);

  // Outbound PROD-MGMT -> partner (PROD-MGMT publishes)
  const outboundHandoffs = await call({ method: "GET", path: `/handoffs?source_domain_id=eq.${PROD_MGMT}&target_domain_id=eq.${p.id}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,trigger_events(event_name,data_object_id)` });
  out.push(`### ${PROD_MGMT_CODE} → ${p.code}\n`);
  out.push(`Existing handoffs: ${outboundHandoffs.length}`);

  // Section 1+2: list each
  const wired: Row[] = [];
  const nullTarget: Row[] = [];
  for (const h of outboundHandoffs) {
    const ev = h.trigger_events as Row;
    const evName = ev?.event_name ?? "(unknown)";
    if (h.source_domain_module_id && h.target_domain_module_id) {
      wired.push({ ...h, evName });
    } else if (!h.target_domain_module_id) {
      nullTarget.push({ ...h, evName });
    } else {
      wired.push({ ...h, evName });
    }
  }
  if (wired.length > 0) {
    out.push(`\n**§1 Fully wired (${wired.length}):**`);
    for (const h of wired) out.push(`- \`${h.evName}\` — src_mod=${h.source_domain_module_id}, tgt_mod=${h.target_domain_module_id}`);
  }
  if (nullTarget.length > 0) {
    out.push(`\n**§2 NULL target_domain_module_id — owed by ${p.code} B10b (consumer DMDO on the receiving module):**`);
    for (const h of nullTarget) {
      const evDo = (h.trigger_events as Row)?.data_object_id;
      out.push(`- id=${h.id} \`${h.evName}\` payload do=${h.data_object_id} (event do=${evDo}) — ${p.code} owes target_domain_module_id`);
    }
  }

  // Section 3: missing outbound handoffs the catalog implies
  // For each (PROD-MGMT workflow state) × (partner DMDO row consuming/contributing/embedded-mastering the master's data_object), check if a handoff exists.
  const partnerDmdo = pModuleIds.length === 0 ? [] : await call({ method: "GET", path: `/domain_module_data_objects?data_object_id=in.(${PROD_MGMT_MASTERS.join(",")})&domain_module_id=in.(${pModuleIds.join(",")})&role=in.(consumer,contributor,embedded_master)&select=domain_module_id,data_object_id,role,necessity` });
  const partnerConsumesByDo = new Map<number, Row[]>();
  for (const r of partnerDmdo) {
    const doId = Number(r.data_object_id);
    if (!partnerConsumesByDo.has(doId)) partnerConsumesByDo.set(doId, []);
    partnerConsumesByDo.get(doId)!.push(r);
  }
  const candidatePairs: string[] = [];
  for (const ev of pmEvents) {
    const evDo = Number(ev.data_object_id);
    const partnerRows = partnerConsumesByDo.get(evDo) || [];
    if (partnerRows.length === 0) continue;
    // Is there a handoff for this event into this partner?
    const matching = outboundHandoffs.find(h => Number(h.trigger_event_id) === Number(ev.id));
    if (!matching) {
      candidatePairs.push(`- \`${ev.event_name}\` (do ${evDo}) — ${p.code} consumes this data_object, no handoff exists`);
    }
  }
  if (candidatePairs.length > 0) {
    out.push(`\n**§3 Missing outbound handoffs (PROD-MGMT publishes, ${p.code} consumes):**`);
    out.push(...candidatePairs);
  }

  // Inbound partner -> PROD-MGMT (PROD-MGMT consumes)
  const inboundHandoffs = await call({ method: "GET", path: `/handoffs?source_domain_id=eq.${p.id}&target_domain_id=eq.${PROD_MGMT}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,trigger_events(event_name,data_object_id)` });
  out.push(`\n### ${p.code} → ${PROD_MGMT_CODE}\n`);
  out.push(`Existing handoffs: ${inboundHandoffs.length}`);
  const inWired: Row[] = [];
  const inNullSrc: Row[] = [];
  for (const h of inboundHandoffs) {
    const ev = h.trigger_events as Row;
    const evName = ev?.event_name ?? "(unknown)";
    if (h.source_domain_module_id && h.target_domain_module_id) {
      inWired.push({ ...h, evName });
    } else if (!h.source_domain_module_id) {
      inNullSrc.push({ ...h, evName });
    } else {
      inWired.push({ ...h, evName });
    }
  }
  if (inWired.length > 0) {
    out.push(`\n**§1 Fully wired (${inWired.length}):**`);
    for (const h of inWired) out.push(`- \`${h.evName}\` — src_mod=${h.source_domain_module_id}, tgt_mod=${h.target_domain_module_id}`);
  }
  if (inNullSrc.length > 0) {
    out.push(`\n**§2 NULL source_domain_module_id — owed by ${p.code} B10b (publishing module attribution):**`);
    for (const h of inNullSrc) {
      out.push(`- id=${h.id} \`${h.evName}\` — ${p.code} owes source_domain_module_id`);
    }
  }

  // Section 3 inbound: partner masters that PROD-MGMT consumes/contributes-to, where partner has workflow states, but no handoff exists
  if (pModuleIds.length > 0) {
    const partnerMasters = await call({ method: "GET", path: `/domain_module_data_objects?domain_module_id=in.(${pModuleIds.join(",")})&role=eq.master&select=data_object_id` });
    const partnerMasterIds = partnerMasters.map(r => Number(r.data_object_id));
    if (partnerMasterIds.length > 0) {
      const pmConsumes = pmDmdo.filter(r => partnerMasterIds.includes(Number(r.data_object_id)) && ["consumer", "contributor", "embedded_master"].includes(String(r.role)));
      const consumedDoIds = pmConsumes.map(r => Number(r.data_object_id));
      if (consumedDoIds.length > 0) {
        const partnerEvents = await call({ method: "GET", path: `/trigger_events?data_object_id=in.(${consumedDoIds.join(",")})&select=id,event_name,data_object_id` });
        const candIn: string[] = [];
        for (const ev of partnerEvents) {
          const matching = inboundHandoffs.find(h => Number(h.trigger_event_id) === Number(ev.id));
          if (!matching) {
            candIn.push(`- \`${ev.event_name}\` (do ${ev.data_object_id}) — PROD-MGMT consumes this data_object, no handoff exists`);
          }
        }
        if (candIn.length > 0) {
          out.push(`\n**§3 Missing inbound handoffs (${p.code} publishes, PROD-MGMT consumes):**`);
          out.push(...candIn);
        }
      }
    }
  }

  out.push("");
}

const path = "c:/tmp/reconcile_PROD-MGMT_all_2026_05_26.md";
await Bun.write(path, out.join("\n"));
console.log(`Wrote diff to ${path}`);
console.log(`Total lines: ${out.length}`);
