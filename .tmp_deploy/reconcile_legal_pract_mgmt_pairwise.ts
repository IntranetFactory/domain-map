#!/usr/bin/env bun
// Pairwise handoff reconciliation:
//   LEGAL-PRACT-MGMT <-> CLM
//   LEGAL-PRACT-MGMT <-> CRM
//
// Read-only by construction. Produces two markdown diff files at c:/tmp/.
// User reviews and decides which fixes to load on which side.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(body)], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius failed (${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (p: string) => call({ method: "GET", path: p });

// ----- domains + modules of interest -----
const LPM_ID = 150;
const CLM_ID = 26;
const CRM_ID = 69;

// LPM module + master state
const LPM_MASTERS = [391, 392, 393, 394, 738, 739]; // legal_matters, trust_accounts, conflict_checks, engagement_letters, external_court_filings, client_invoices
const LPM_MODULE_OF_MASTER: Record<number, number> = {
  391: 132, // legal_matters -> LEGAL-MATTER-MGMT
  392: 135, // trust_accounts -> LEGAL-TRUST-ACCT
  393: 133, // conflict_checks -> LEGAL-INTAKE-CONFLICT
  394: 133, // engagement_letters -> LEGAL-INTAKE-CONFLICT
  738: 136, // external_court_filings -> LEGAL-COURT-DOCKETING
  739: 134, // client_invoices -> LEGAL-TIME-BILLING
};

async function partnerShape(partnerId: number): Promise<{
  code: string;
  modules: Array<{ id: number; code: string; name: string }>;
  masters: Array<{ data_object_id: number; data_object_name: string; module_id: number | null }>;
}> {
  const d = await get(`/domains?id=eq.${partnerId}&select=domain_code`);
  const code = String((d[0] as Row).domain_code);
  const modules = await get(`/domain_modules?domain_id=eq.${partnerId}&select=id,domain_module_code,domain_module_name`);
  const dmdoMasters = await get(`/domain_module_data_objects?domain_module_id=in.(${modules.map(m => m.id).join(",")})&role=eq.master&select=data_object_id,domain_module_id,data_objects(data_object_name)`);
  const masters = dmdoMasters.map(r => ({
    data_object_id: Number(r.data_object_id),
    data_object_name: String((r.data_objects as Row).data_object_name),
    module_id: r.domain_module_id == null ? null : Number(r.domain_module_id),
  }));
  return { code, modules: modules.map(m => ({ id: Number(m.id), code: String(m.domain_module_code), name: String(m.domain_module_name) })), masters };
}

async function reconcile(partnerId: number, partnerCode: string): Promise<string> {
  const partner = await partnerShape(partnerId);

  // --- LPM -> partner outbound handoffs ---
  const lpmOutbound = await get(`/handoffs?source_domain_id=eq.${LPM_ID}&target_domain_id=eq.${partnerId}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,notes,trigger_event:trigger_events(event_name,data_object_id),payload_data_object:data_objects!handoffs_data_object_id_fkey(data_object_name)`);

  // --- partner -> LPM inbound handoffs ---
  const partnerOutbound = await get(`/handoffs?source_domain_id=eq.${partnerId}&target_domain_id=eq.${LPM_ID}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,notes,trigger_event:trigger_events(event_name,data_object_id),payload_data_object:data_objects!handoffs_data_object_id_fkey(data_object_name)`);

  // --- LPM DMDO referencing partner's masters (consumer/contributor) for boundary integrity ---
  const partnerMasterIds = partner.masters.map(m => m.data_object_id);
  let lpmConsumesPartner: Row[] = [];
  let partnerConsumesLpm: Row[] = [];
  if (partnerMasterIds.length > 0) {
    lpmConsumesPartner = await get(`/domain_module_data_objects?data_object_id=in.(${partnerMasterIds.join(",")})&domain_module_id=in.(132,133,134,135,136)&select=data_object_id,domain_module_id,role,necessity,data_objects(data_object_name)`);
  }
  if (LPM_MASTERS.length > 0 && partner.modules.length > 0) {
    partnerConsumesLpm = await get(`/domain_module_data_objects?data_object_id=in.(${LPM_MASTERS.join(",")})&domain_module_id=in.(${partner.modules.map(m => m.id).join(",")})&select=data_object_id,domain_module_id,role,necessity,data_objects(data_object_name)`);
  }

  // --- Lifecycle gates that imply handoff candidates ---
  const lpmGates = await get(`/data_object_lifecycle_states?data_object_id=in.(${LPM_MASTERS.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,permission_verb_override,domain_module_id,data_objects(data_object_name)`);
  const partnerGates = partner.modules.length === 0 ? [] : await get(`/data_object_lifecycle_states?data_object_id=in.(${partnerMasterIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,permission_verb_override,domain_module_id,data_objects(data_object_name)`);

  // --- Build markdown ---
  const lines: string[] = [];
  lines.push(`# Pairwise reconciliation: LEGAL-PRACT-MGMT <-> ${partnerCode}`);
  lines.push("");
  lines.push(`Generated: 2026-05-26. Read-only diff. User decides which fixes to load on which side.`);
  lines.push("");
  lines.push(`LEGAL-PRACT-MGMT (id 150): 5 modules, 6 masters.`);
  lines.push(`${partnerCode} (id ${partnerId}): ${partner.modules.length} modules, ${partner.masters.length} masters.`);
  lines.push("");

  // ===== LPM -> partner =====
  lines.push(`## Direction A: LEGAL-PRACT-MGMT -> ${partnerCode}`);
  lines.push("");

  // Section 1 - fully wired
  const a1FullyWired = lpmOutbound.filter(h => h.source_domain_module_id != null && h.target_domain_module_id != null);
  lines.push(`### A1. Fully-wired handoffs (informational)`);
  lines.push("");
  if (a1FullyWired.length === 0) lines.push("_None._");
  else {
    lines.push("| Trigger | Payload | LPM module | Partner module | Pattern | Friction |");
    lines.push("|---|---|---|---|---|---|");
    for (const h of a1FullyWired) {
      const trig = (h.trigger_event as Row).event_name;
      const payload = (h.payload_data_object as Row)?.data_object_name ?? "-";
      const srcMod = h.source_domain_module_id;
      const tgtMod = partner.modules.find(m => m.id === Number(h.target_domain_module_id))?.code ?? `id=${h.target_domain_module_id}`;
      lines.push(`| ${trig} | ${payload} | id=${srcMod} | ${tgtMod} | ${h.integration_pattern} | ${h.friction_level} |`);
    }
  }
  lines.push("");

  // Section 2 - NULL module FK
  const a2NullFk = lpmOutbound.filter(h => h.source_domain_module_id == null || h.target_domain_module_id == null);
  lines.push(`### A2. Existing handoffs with NULL module FK`);
  lines.push("");
  if (a2NullFk.length === 0) lines.push("_None._");
  else {
    lines.push("| Trigger | Payload | Source FK | Target FK | Recommendation |");
    lines.push("|---|---|---|---|---|");
    for (const h of a2NullFk) {
      const trig = (h.trigger_event as Row).event_name;
      const payload = (h.payload_data_object as Row)?.data_object_name ?? "-";
      const srcOk = h.source_domain_module_id != null ? `id=${h.source_domain_module_id}` : "NULL";
      const tgtOk = h.target_domain_module_id != null ? `id=${h.target_domain_module_id}` : "NULL";
      let rec = "review";
      const payloadDoId = h.data_object_id ? Number(h.data_object_id) : null;
      if (h.source_domain_module_id == null) {
        // resolve via LPM
        if (payloadDoId && LPM_MODULE_OF_MASTER[payloadDoId]) rec = `PATCH source_domain_module_id=${LPM_MODULE_OF_MASTER[payloadDoId]}`;
        else rec = "source unresolvable; review payload";
      }
      if (h.target_domain_module_id == null) {
        // resolve via partner DMDO
        if (payloadDoId) {
          const consumer = partnerConsumesLpm.find(r => Number(r.data_object_id) === payloadDoId);
          if (consumer) rec = `PATCH target_domain_module_id=${consumer.domain_module_id} (${partner.modules.find(m => m.id === Number(consumer.domain_module_id))?.code})`;
          else rec = `${partnerCode} doesn't have a module consuming \`${payload}\`; needs upstream DMDO authoring or accept NULL with note`;
        }
      }
      lines.push(`| ${trig} | ${payload} | ${srcOk} | ${tgtOk} | ${rec} |`);
    }
  }
  lines.push("");

  // Section 3 - missing handoffs catalog implies
  const a3Missing: string[] = [];
  for (const g of lpmGates) {
    const payloadDoId = Number(g.data_object_id);
    // Does partner consume this payload?
    const partnerConsumer = partnerConsumesLpm.find(r => Number(r.data_object_id) === payloadDoId);
    if (!partnerConsumer) continue;
    // Does an outbound handoff already exist for this state? Match by trigger event name <entity>.<state>
    const doName = (g.data_objects as Row).data_object_name;
    const expectedTriggerName = `${String(doName).replace(/s$/, "")}.${g.state_name}`;
    const alreadyExists = lpmOutbound.some(h => {
      const evName = (h.trigger_event as Row).event_name as string;
      return evName.includes(g.state_name as string) && evName.includes(String(doName).split("_")[0]);
    });
    if (alreadyExists) continue;
    const srcMod = LPM_MODULE_OF_MASTER[payloadDoId];
    const srcModCode = ["legal-matter-mgmt","legal-intake-conflict","legal-time-billing","legal-trust-acct","legal-court-docketing"][[132,133,134,135,136].indexOf(srcMod) ?? 0];
    const partnerModCode = partner.modules.find(m => m.id === Number(partnerConsumer.domain_module_id))?.code ?? `id=${partnerConsumer.domain_module_id}`;
    a3Missing.push(`- proposed handoff: \`${expectedTriggerName}\` (LPM ${srcModCode}, id=${srcMod}) -> ${partnerCode} ${partnerModCode}, payload \`${doName}\`. ${partnerCode} has DMDO role=\`${partnerConsumer.role}\` necessity=\`${partnerConsumer.necessity}\` on this data_object.`);
  }
  lines.push(`### A3. Missing handoffs the catalog implies`);
  lines.push("");
  if (a3Missing.length === 0) lines.push("_None — LPM's outbound publishing surface fully covers what ${partnerCode} consumes._");
  else for (const m of a3Missing) lines.push(m);
  lines.push("");

  // Section 4 - boundary integrity
  lines.push(`### A4. Boundary integrity gaps`);
  lines.push("");
  const a4Issues: string[] = [];
  for (const dmdo of lpmConsumesPartner) {
    const doId = Number(dmdo.data_object_id);
    const owns = partner.masters.find(m => m.data_object_id === doId);
    if (!owns) a4Issues.push(`- LPM module id=${dmdo.domain_module_id} consumes \`${(dmdo.data_objects as Row).data_object_name}\` (id=${doId}) but ${partnerCode} does not master it; verify ownership claim.`);
  }
  if (a4Issues.length === 0) lines.push("_None._");
  else for (const i of a4Issues) lines.push(i);
  lines.push("");

  // ===== partner -> LPM =====
  lines.push(`## Direction B: ${partnerCode} -> LEGAL-PRACT-MGMT`);
  lines.push("");

  const b1FullyWired = partnerOutbound.filter(h => h.source_domain_module_id != null && h.target_domain_module_id != null);
  lines.push(`### B1. Fully-wired handoffs (informational)`);
  lines.push("");
  if (b1FullyWired.length === 0) lines.push("_None._");
  else {
    lines.push("| Trigger | Payload | Partner module | LPM module | Pattern | Friction |");
    lines.push("|---|---|---|---|---|---|");
    for (const h of b1FullyWired) {
      const trig = (h.trigger_event as Row).event_name;
      const payload = (h.payload_data_object as Row)?.data_object_name ?? "-";
      const srcMod = partner.modules.find(m => m.id === Number(h.source_domain_module_id))?.code ?? `id=${h.source_domain_module_id}`;
      lines.push(`| ${trig} | ${payload} | ${srcMod} | id=${h.target_domain_module_id} | ${h.integration_pattern} | ${h.friction_level} |`);
    }
  }
  lines.push("");

  const b2NullFk = partnerOutbound.filter(h => h.source_domain_module_id == null || h.target_domain_module_id == null);
  lines.push(`### B2. Existing handoffs with NULL module FK`);
  lines.push("");
  if (b2NullFk.length === 0) lines.push("_None — no inbound rows from ${partnerCode} into LPM exist yet._");
  else {
    lines.push("| Trigger | Payload | Source FK | Target FK |");
    lines.push("|---|---|---|---|");
    for (const h of b2NullFk) {
      const trig = (h.trigger_event as Row).event_name;
      const payload = (h.payload_data_object as Row)?.data_object_name ?? "-";
      lines.push(`| ${trig} | ${payload} | ${h.source_domain_module_id ?? "NULL"} | ${h.target_domain_module_id ?? "NULL"} |`);
    }
  }
  lines.push("");

  // B3 - missing handoffs catalog implies (partner -> LPM)
  lines.push(`### B3. Missing handoffs the catalog implies (owed by ${partnerCode})`);
  lines.push("");
  const b3Missing: string[] = [];
  for (const g of partnerGates) {
    const payloadDoId = Number(g.data_object_id);
    const lpmConsumer = lpmConsumesPartner.find(r => Number(r.data_object_id) === payloadDoId);
    if (!lpmConsumer) continue;
    const doName = (g.data_objects as Row).data_object_name;
    const expectedTrigger = `${String(doName).replace(/s$/, "")}.${g.state_name}`;
    const alreadyExists = partnerOutbound.some(h => {
      const evName = (h.trigger_event as Row).event_name as string;
      return evName.includes(g.state_name as string);
    });
    if (alreadyExists) continue;
    const srcMod = partner.modules.find(m => m.id === Number(g.domain_module_id))?.code ?? `id=${g.domain_module_id}`;
    const lpmModCode = ["legal-matter-mgmt","legal-intake-conflict","legal-time-billing","legal-trust-acct","legal-court-docketing"][[132,133,134,135,136].indexOf(Number(lpmConsumer.domain_module_id)) ?? 0];
    b3Missing.push(`- proposed handoff: \`${expectedTrigger}\` (${partnerCode} ${srcMod}) -> LPM ${lpmModCode}, payload \`${doName}\`. LPM has DMDO role=\`${lpmConsumer.role}\` necessity=\`${lpmConsumer.necessity}\` on this data_object.`);
  }
  // Also: if LPM has consumer/contributor row on a partner master but no corresponding inbound handoff exists, owed
  for (const lpmCons of lpmConsumesPartner) {
    const doId = Number(lpmCons.data_object_id);
    const doName = (lpmCons.data_objects as Row).data_object_name;
    const hasAnyInbound = partnerOutbound.some(h => Number(h.data_object_id) === doId);
    if (!hasAnyInbound) {
      const lpmModCode = ["legal-matter-mgmt","legal-intake-conflict","legal-time-billing","legal-trust-acct","legal-court-docketing"][[132,133,134,135,136].indexOf(Number(lpmCons.domain_module_id)) ?? 0];
      b3Missing.push(`- LPM module \`${lpmModCode}\` is a \`${lpmCons.role}\` / \`${lpmCons.necessity}\` on \`${doName}\` (mastered by ${partnerCode}) but ${partnerCode} publishes no inbound handoff. ${partnerCode} B9 owes outbound on \`${doName}\` -> LPM.`);
    }
  }
  if (b3Missing.length === 0) lines.push("_None._");
  else for (const m of b3Missing) lines.push(m);
  lines.push("");

  // B4 - boundary integrity gaps
  lines.push(`### B4. Boundary integrity gaps`);
  lines.push("");
  const b4Issues: string[] = [];
  for (const dmdo of partnerConsumesLpm) {
    const doId = Number(dmdo.data_object_id);
    if (!LPM_MASTERS.includes(doId)) b4Issues.push(`- ${partnerCode} module id=${dmdo.domain_module_id} consumes \`${(dmdo.data_objects as Row).data_object_name}\` but LPM does not master it; verify ownership.`);
  }
  if (b4Issues.length === 0) lines.push("_None._");
  else for (const i of b4Issues) lines.push(i);
  lines.push("");

  // Summary
  lines.push(`## Summary`);
  lines.push("");
  lines.push(`| Section | Count |`);
  lines.push(`|---|---|`);
  lines.push(`| A1 fully-wired LPM -> ${partnerCode} | ${a1FullyWired.length} |`);
  lines.push(`| A2 NULL-FK LPM -> ${partnerCode} (patchable) | ${a2NullFk.length} |`);
  lines.push(`| A3 missing LPM outbound proposals | ${a3Missing.length} |`);
  lines.push(`| A4 LPM->partner boundary issues | ${a4Issues.length} |`);
  lines.push(`| B1 fully-wired ${partnerCode} -> LPM | ${b1FullyWired.length} |`);
  lines.push(`| B2 NULL-FK ${partnerCode} -> LPM | ${b2NullFk.length} |`);
  lines.push(`| B3 owed by ${partnerCode} (publish inbound) | ${b3Missing.length} |`);
  lines.push(`| B4 partner->LPM boundary issues | ${b4Issues.length} |`);
  lines.push("");
  lines.push(`User reviews this diff and decides which fixes to load. Per the pairwise rule, each side's loads ship from that side's own audit — this script is read-only.`);

  return lines.join("\n");
}

// ----- Run both reconciliations -----
console.log("Reconciling LEGAL-PRACT-MGMT <-> CLM...");
const clm = await reconcile(CLM_ID, "CLM");
await Bun.write("c:/tmp/reconcile_LEGAL-PRACT-MGMT_CLM_2026_05_26.md", clm);
console.log("  -> c:/tmp/reconcile_LEGAL-PRACT-MGMT_CLM_2026_05_26.md");

console.log("\nReconciling LEGAL-PRACT-MGMT <-> CRM...");
const crm = await reconcile(CRM_ID, "CRM");
await Bun.write("c:/tmp/reconcile_LEGAL-PRACT-MGMT_CRM_2026_05_26.md", crm);
console.log("  -> c:/tmp/reconcile_LEGAL-PRACT-MGMT_CRM_2026_05_26.md");

console.log("\nReview both diff files and decide which fixes to load.");
