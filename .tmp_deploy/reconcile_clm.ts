#!/usr/bin/env bun
// reconcile_clm.ts — pairwise handoff reconciliation between CLM (id=26)
// and each domain it has cross-domain edges with.
//
// Read-only. Produces a single consolidated markdown report at
//   c:/tmp/reconcile_clm_2026_05_26.md
//
// Per SKILL.md "Pairwise handoff reconciliation" section, for each pair (CLM, X)
// and each direction, surfaces four sections:
//   1. Existing handoffs fully wired
//   2. Existing handoffs with NULL module FK (resolvable now?)
//   3. Missing handoffs the catalog implies should exist
//        = (publisher lifecycle states with requires_permission=true)
//          × (consumer DMDO rows on that publisher's data_object on the other side)
//   4. Boundary integrity gaps (DMDO referencing data_object the other side doesn't master)
//
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/reconcile_clm.ts

export {};

type Row = Record<string, unknown>;

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`pg ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const CLM = 26;
const partners: Array<{ id: number; code: string }> = [
  { id: 15, code: "GRC" },
  { id: 27, code: "S2P" },
  { id: 29, code: "AP-AUTO" },
  { id: 30, code: "CSM" },
  { id: 65, code: "ERP-FIN" },
  { id: 68, code: "PSA" },
  { id: 69, code: "CRM" },
  { id: 73, code: "CPQ" },
  { id: 85, code: "SMP" },
  { id: 94, code: "ESIGN" },
  { id: 97, code: "SUB-MGMT" },
  { id: 145, code: "RE-CRE" },
  { id: 150, code: "LEGAL-PRACT-MGMT" },
  { id: 152, code: "ACCT-PRACT-MGMT" },
  { id: 153, code: "AGENCY-MGMT" },
];

// =====================================================================
// 1. Pull CLM state once
// =====================================================================
console.log("=== 1. CLM state ===");

const clmModRows: Row[] = await pg("GET", `/domain_modules?domain_id=eq.${CLM}&select=id,domain_module_code`) ?? [];
const clmModId: Record<string, number> = {};
const clmModCode: Record<number, string> = {};
for (const r of clmModRows) {
  clmModId[String(r.domain_module_code)] = Number(r.id);
  clmModCode[Number(r.id)] = String(r.domain_module_code);
}
const clmModIdList = Object.values(clmModId).join(",");

const clmDMDO: Row[] = await pg("GET", `/domain_module_data_objects?domain_module_id=in.(${clmModIdList})&select=domain_module_id,data_object_id,role,necessity`) ?? [];
// Master/strongest role per data_object across CLM modules
const clmMaster = new Map<number, { module: string; role: string }>();
const roleStrength = (r: string) => r === "master" ? 5 : r === "embedded_master" ? 4 : r === "contributor" ? 3 : r === "consumer" ? 2 : 1;
const clmRoleOnDO = new Map<number, Array<{ module: string; role: string; necessity: string }>>();
for (const r of clmDMDO) {
  const doId = Number(r.data_object_id);
  const mod = clmModCode[Number(r.domain_module_id)];
  const role = String(r.role);
  const nec = String(r.necessity ?? "required");
  if (!clmRoleOnDO.has(doId)) clmRoleOnDO.set(doId, []);
  clmRoleOnDO.get(doId)!.push({ module: mod, role, necessity: nec });
  if (role === "master") clmMaster.set(doId, { module: mod, role });
}

// CLM lifecycle states with requires_permission=true
const clmMasterIds = [...clmMaster.keys()];
const clmLCS: Row[] = clmMasterIds.length === 0 ? [] : await pg(
  "GET",
  `/data_object_lifecycle_states?data_object_id=in.(${clmMasterIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,permission_verb_override,domain_module_id`,
) ?? [];

// CLM trigger events
const clmTriggers: Row[] = await pg("GET", `/trigger_events?data_object_id=in.(${clmMasterIds.join(",")})&select=id,event_name,data_object_id`) ?? [];

// Data_object names for lookup
const allDataObjectIds = new Set<number>();
for (const id of clmMasterIds) allDataObjectIds.add(id);
for (const r of clmDMDO) allDataObjectIds.add(Number(r.data_object_id));

console.log(`  CLM modules: ${Object.keys(clmModId).length}, masters: ${clmMaster.size}, lcs(req_perm): ${clmLCS.length}, triggers: ${clmTriggers.length}`);

// =====================================================================
// 2. Pull each partner's state in one batch
// =====================================================================
console.log("\n=== 2. Partner state ===");

const partnerIdList = partners.map(p => p.id).join(",");
const partnerModRows: Row[] = await pg("GET", `/domain_modules?domain_id=in.(${partnerIdList})&select=id,domain_module_code,domain_id`) ?? [];
const partnerModCode: Record<number, string> = {};
const partnerDomainOfModule: Record<number, number> = {};
const partnerModulesByDomain: Record<number, number[]> = {};
for (const r of partnerModRows) {
  const mid = Number(r.id);
  partnerModCode[mid] = String(r.domain_module_code);
  partnerDomainOfModule[mid] = Number(r.domain_id);
  if (!partnerModulesByDomain[Number(r.domain_id)]) partnerModulesByDomain[Number(r.domain_id)] = [];
  partnerModulesByDomain[Number(r.domain_id)].push(mid);
}

const allPartnerModIds = Object.keys(partnerModCode).map(Number);
const partnerDMDO: Row[] = allPartnerModIds.length === 0 ? [] : await pg(
  "GET",
  `/domain_module_data_objects?domain_module_id=in.(${allPartnerModIds.join(",")})&select=domain_module_id,data_object_id,role,necessity`,
) ?? [];

// per-domain master/strongest role on each data_object
const partnerMastersByDomain: Record<number, Map<number, { module: string; role: string }>> = {};
const partnerRoleByDomainDO: Record<number, Map<number, Array<{ module: string; role: string; necessity: string }>>> = {};
for (const p of partners) {
  partnerMastersByDomain[p.id] = new Map();
  partnerRoleByDomainDO[p.id] = new Map();
}
for (const r of partnerDMDO) {
  const mid = Number(r.domain_module_id);
  const domId = partnerDomainOfModule[mid];
  const doId = Number(r.data_object_id);
  const role = String(r.role);
  const nec = String(r.necessity ?? "required");
  const modCode = partnerModCode[mid];
  allDataObjectIds.add(doId);
  if (!partnerRoleByDomainDO[domId].has(doId)) partnerRoleByDomainDO[domId].set(doId, []);
  partnerRoleByDomainDO[domId].get(doId)!.push({ module: modCode, role, necessity: nec });
  if (role === "master") partnerMastersByDomain[domId].set(doId, { module: modCode, role });
}

// Partner masters' workflow-bearing lifecycle states
const allPartnerMasterIds = new Set<number>();
for (const map of Object.values(partnerMastersByDomain)) for (const id of map.keys()) allPartnerMasterIds.add(id);
const partnerLCS: Row[] = allPartnerMasterIds.size === 0 ? [] : await pg(
  "GET",
  `/data_object_lifecycle_states?data_object_id=in.(${[...allPartnerMasterIds].join(",")})&requires_permission=eq.true&select=data_object_id,state_name,permission_verb_override,domain_module_id`,
) ?? [];
const partnerLCSByDO = new Map<number, Row[]>();
for (const r of partnerLCS) {
  const doId = Number(r.data_object_id);
  if (!partnerLCSByDO.has(doId)) partnerLCSByDO.set(doId, []);
  partnerLCSByDO.get(doId)!.push(r);
}
const clmLCSByDO = new Map<number, Row[]>();
for (const r of clmLCS) {
  const doId = Number(r.data_object_id);
  if (!clmLCSByDO.has(doId)) clmLCSByDO.set(doId, []);
  clmLCSByDO.get(doId)!.push(r);
}

// Partner triggers
const partnerTriggers: Row[] = allPartnerMasterIds.size === 0 ? [] : await pg(
  "GET",
  `/trigger_events?data_object_id=in.(${[...allPartnerMasterIds].join(",")})&select=id,event_name,data_object_id`,
) ?? [];
const partnerTrigByDO = new Map<number, Row[]>();
for (const r of partnerTriggers) {
  const doId = Number(r.data_object_id);
  if (!partnerTrigByDO.has(doId)) partnerTrigByDO.set(doId, []);
  partnerTrigByDO.get(doId)!.push(r);
}
const clmTrigByDO = new Map<number, Row[]>();
for (const r of clmTriggers) {
  const doId = Number(r.data_object_id);
  if (!clmTrigByDO.has(doId)) clmTrigByDO.set(doId, []);
  clmTrigByDO.get(doId)!.push(r);
}

console.log(`  partners: ${partners.length}, partner modules: ${allPartnerModIds.length}, partner masters: ${allPartnerMasterIds.size}`);

// =====================================================================
// 3. Pull all handoffs between CLM and any partner
// =====================================================================
console.log("\n=== 3. Handoffs ===");

const outHandoffs: Row[] = await pg(
  "GET",
  `/handoffs?source_domain_id=eq.${CLM}&target_domain_id=in.(${partnerIdList})&select=id,trigger_event_id,data_object_id,target_domain_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,trigger_event:trigger_events(event_name,data_object_id)`,
) ?? [];
const inHandoffs: Row[] = await pg(
  "GET",
  `/handoffs?target_domain_id=eq.${CLM}&source_domain_id=in.(${partnerIdList})&select=id,trigger_event_id,data_object_id,source_domain_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,trigger_event:trigger_events(event_name,data_object_id)`,
) ?? [];

console.log(`  outbound (CLM->partner): ${outHandoffs.length}, inbound (partner->CLM): ${inHandoffs.length}`);

// Data object name lookup
const doRows: Row[] = await pg("GET", `/data_objects?id=in.(${[...allDataObjectIds].join(",")})&select=id,data_object_name`) ?? [];
const doName: Record<number, string> = {};
for (const r of doRows) doName[Number(r.id)] = String(r.data_object_name);
function dn(id: number): string { return doName[id] ?? `do#${id}`; }

// =====================================================================
// 4. Build the report
// =====================================================================
const lines: string[] = [];
const W = (s = "") => lines.push(s);

W("# CLM pairwise handoff reconciliation");
W("");
W(`Generated 2026-05-26 against live state. CLM (id=${CLM}) vs ${partners.length} partner domains.`);
W("");
W("Each section below covers one pair, two directions, four diff buckets per direction.");
W("Read-only output: fixes belong to the side that owes them, not this script.");
W("");
W("**Summary**");
W("");
W("| Partner | Out | In | Out NULL FK | In NULL FK | Missing out | Missing in | Boundary gaps |");
W("|---|---:|---:|---:|---:|---:|---:|---:|");

const partnerSummary: Array<{ p: typeof partners[number]; out: number; in_: number; outNull: number; inNull: number; missingOut: number; missingIn: number; boundary: number }> = [];

for (const p of partners) {
  const outForP = outHandoffs.filter(r => Number(r.target_domain_id) === p.id);
  const inForP = inHandoffs.filter(r => Number(r.source_domain_id) === p.id);
  const outNull = outForP.filter(r => !r.source_domain_module_id || !r.target_domain_module_id).length;
  const inNull = inForP.filter(r => !r.source_domain_module_id || !r.target_domain_module_id).length;

  // Missing outbound: (CLM lcs requires_permission) on a CLM master + (partner has DMDO consumer/contributor/embedded_master on that data_object)
  let missingOut = 0;
  for (const [doId] of clmMaster) {
    const lcs = clmLCSByDO.get(doId) ?? [];
    const partnerHasRole = partnerRoleByDomainDO[p.id].get(doId);
    if (!partnerHasRole) continue;
    if (lcs.length === 0) continue;
    // does at least one handoff already exist for this (source CLM, target P, data_object doId)?
    const existing = outForP.filter(r => Number(r.data_object_id) === doId || Number((r.trigger_event as Row)?.data_object_id) === doId);
    if (existing.length === 0) missingOut++;
  }
  // Missing inbound: (partner lcs requires_permission) on a partner master + (CLM has DMDO role on that data_object)
  let missingIn = 0;
  const partnerMasterMap = partnerMastersByDomain[p.id];
  for (const [doId] of partnerMasterMap) {
    const lcs = partnerLCSByDO.get(doId) ?? [];
    const clmHasRole = clmRoleOnDO.get(doId);
    if (!clmHasRole) continue;
    if (lcs.length === 0) continue;
    const existing = inForP.filter(r => Number(r.data_object_id) === doId || Number((r.trigger_event as Row)?.data_object_id) === doId);
    if (existing.length === 0) missingIn++;
  }

  // Boundary gaps: CLM DMDO row on a data_object the partner doesn't master AND vice versa (only on data_objects mentioned in handoffs between this pair, otherwise irrelevant)
  const relevantDOs = new Set<number>();
  for (const r of outForP) { relevantDOs.add(Number(r.data_object_id)); const evD = Number((r.trigger_event as Row)?.data_object_id); if (evD) relevantDOs.add(evD); }
  for (const r of inForP) { relevantDOs.add(Number(r.data_object_id)); const evD = Number((r.trigger_event as Row)?.data_object_id); if (evD) relevantDOs.add(evD); }
  let boundary = 0;
  for (const doId of relevantDOs) {
    const clmHas = clmRoleOnDO.get(doId);
    const partnerHas = partnerRoleByDomainDO[p.id].get(doId);
    // If a handoff's data_object is something neither side declares any role on, that's a boundary integrity gap on whichever side is asserting the dependency
    if (!clmHas && !partnerHas) boundary++;
  }

  partnerSummary.push({ p, out: outForP.length, in_: inForP.length, outNull, inNull, missingOut, missingIn, boundary });
  W(`| ${p.code} | ${outForP.length} | ${inForP.length} | ${outNull} | ${inNull} | ${missingOut} | ${missingIn} | ${boundary} |`);
}

W("");
W("**Legend.** Out/In = handoff row counts. NULL FK = at least one of `source_domain_module_id` / `target_domain_module_id` unset. Missing = catalog-implied handoff (publisher state × consumer DMDO) with zero existing rows. Boundary gaps = handoff's payload data_object isn't a master/contributor/consumer on either side.");
W("");

// =====================================================================
// Per-pair detail
// =====================================================================
for (const ps of partnerSummary) {
  const p = ps.p;
  W(`---`);
  W("");
  W(`## CLM ↔ ${p.code} (id=${p.id})`);
  W("");
  W(`Existing: ${ps.out} outbound + ${ps.in_} inbound. Issues: ${ps.outNull} out-NULL FK, ${ps.inNull} in-NULL FK, ${ps.missingOut} missing out, ${ps.missingIn} missing in, ${ps.boundary} boundary gaps.`);
  W("");

  const outForP = outHandoffs.filter(r => Number(r.target_domain_id) === p.id);
  const inForP = inHandoffs.filter(r => Number(r.source_domain_id) === p.id);
  const partnerMasterMap = partnerMastersByDomain[p.id];

  // ===== Direction CLM → partner =====
  W(`### CLM → ${p.code}`);
  W("");

  // Section 1: existing fully wired
  const fullyWiredOut = outForP.filter(r => r.source_domain_module_id && r.target_domain_module_id);
  if (fullyWiredOut.length > 0) {
    W("**1. Existing handoffs, fully wired**");
    W("");
    W("| # | event | payload | src module | tgt module | pattern | friction |");
    W("|---|---|---|---|---|---|---|");
    for (const r of fullyWiredOut) {
      const ev = (r.trigger_event as Row)?.event_name ?? "?";
      const payload = dn(Number(r.data_object_id));
      const srcM = clmModCode[Number(r.source_domain_module_id)] ?? "?";
      const tgtM = partnerModCode[Number(r.target_domain_module_id)] ?? "?";
      W(`| ${r.id} | ${ev} | \`${payload}\` | ${srcM} | ${tgtM} | ${r.integration_pattern} | ${r.friction_level} |`);
    }
    W("");
  }

  // Section 2: NULL module FK
  const nullModOut = outForP.filter(r => !r.source_domain_module_id || !r.target_domain_module_id);
  if (nullModOut.length > 0) {
    W("**2. Existing handoffs with NULL module FK**");
    W("");
    for (const r of nullModOut) {
      const ev = (r.trigger_event as Row)?.event_name ?? "?";
      const payload = dn(Number(r.data_object_id));
      const evDO = Number((r.trigger_event as Row)?.data_object_id);
      const srcM = r.source_domain_module_id ? clmModCode[Number(r.source_domain_module_id)] : null;
      const tgtM = r.target_domain_module_id ? partnerModCode[Number(r.target_domain_module_id)] : null;
      // can we derive the missing side now?
      let fixHint = "";
      if (!srcM) {
        const evDOOwner = clmMaster.get(evDO);
        fixHint += `src derivable=${evDOOwner ? evDOOwner.module : "no"}; `;
      }
      if (!tgtM) {
        const payOwner = partnerMasterMap.get(Number(r.data_object_id));
        const payAny = partnerRoleByDomainDO[p.id].get(Number(r.data_object_id));
        fixHint += `tgt derivable=${payOwner ? payOwner.module : payAny ? `weakest(${payAny.map(a => a.module).join("/")})` : "no canonical owner"}`;
      }
      W(`- #${r.id} \`${ev}\` payload=\`${payload}\` (src=${srcM ?? "NULL"}, tgt=${tgtM ?? "NULL"}) — ${fixHint}`);
    }
    W("");
  }

  // Section 3: missing outbound (catalog-implied)
  const missingOutRows: string[] = [];
  for (const [doId, info] of clmMaster) {
    const lcs = clmLCSByDO.get(doId) ?? [];
    const partnerHasRole = partnerRoleByDomainDO[p.id].get(doId);
    if (!partnerHasRole || lcs.length === 0) continue;
    const existingForDO = outForP.filter(r => Number(r.data_object_id) === doId || Number((r.trigger_event as Row)?.data_object_id) === doId);
    if (existingForDO.length > 0) continue;
    const lcsNames = lcs.map(s => String(s.state_name)).join("/");
    const partnerSummary = partnerHasRole.map(a => `${a.module}(${a.role}/${a.necessity})`).join(", ");
    missingOutRows.push(`- \`${dn(doId)}\` mastered by CLM-${info.module}; lifecycle gates: ${lcsNames}; ${p.code} role: ${partnerSummary}`);
  }
  if (missingOutRows.length > 0) {
    W("**3. Missing handoffs the catalog implies**");
    W("");
    for (const r of missingOutRows) W(r);
    W("");
  }

  // ===== Direction partner → CLM =====
  W(`### ${p.code} → CLM`);
  W("");

  const fullyWiredIn = inForP.filter(r => r.source_domain_module_id && r.target_domain_module_id);
  if (fullyWiredIn.length > 0) {
    W("**1. Existing handoffs, fully wired**");
    W("");
    W("| # | event | payload | src module | tgt module | pattern | friction |");
    W("|---|---|---|---|---|---|---|");
    for (const r of fullyWiredIn) {
      const ev = (r.trigger_event as Row)?.event_name ?? "?";
      const payload = dn(Number(r.data_object_id));
      const srcM = partnerModCode[Number(r.source_domain_module_id)] ?? "?";
      const tgtM = clmModCode[Number(r.target_domain_module_id)] ?? "?";
      W(`| ${r.id} | ${ev} | \`${payload}\` | ${srcM} | ${tgtM} | ${r.integration_pattern} | ${r.friction_level} |`);
    }
    W("");
  }

  const nullModIn = inForP.filter(r => !r.source_domain_module_id || !r.target_domain_module_id);
  if (nullModIn.length > 0) {
    W("**2. Existing handoffs with NULL module FK**");
    W("");
    for (const r of nullModIn) {
      const ev = (r.trigger_event as Row)?.event_name ?? "?";
      const payload = dn(Number(r.data_object_id));
      const evDO = Number((r.trigger_event as Row)?.data_object_id);
      const srcM = r.source_domain_module_id ? partnerModCode[Number(r.source_domain_module_id)] : null;
      const tgtM = r.target_domain_module_id ? clmModCode[Number(r.target_domain_module_id)] : null;
      let fixHint = "";
      if (!srcM) {
        const evDOOwner = partnerMastersByDomain[p.id].get(evDO);
        const evDOAny = partnerRoleByDomainDO[p.id].get(evDO);
        fixHint += `src derivable=${evDOOwner ? evDOOwner.module : evDOAny ? `weakest(${evDOAny.map(a => a.module).join("/")})` : "no canonical owner"}; `;
      }
      if (!tgtM) {
        const payOwner = clmMaster.get(Number(r.data_object_id));
        const payAny = clmRoleOnDO.get(Number(r.data_object_id));
        fixHint += `tgt derivable=${payOwner ? payOwner.module : payAny ? `weakest(${payAny.map(a => a.module).join("/")})` : "no canonical owner"}`;
      }
      W(`- #${r.id} \`${ev}\` payload=\`${payload}\` (src=${srcM ?? "NULL"}, tgt=${tgtM ?? "NULL"}) — ${fixHint}`);
    }
    W("");
  }

  const missingInRows: string[] = [];
  for (const [doId, info] of partnerMasterMap) {
    const lcs = partnerLCSByDO.get(doId) ?? [];
    const clmHasRole = clmRoleOnDO.get(doId);
    if (!clmHasRole || lcs.length === 0) continue;
    const existingForDO = inForP.filter(r => Number(r.data_object_id) === doId || Number((r.trigger_event as Row)?.data_object_id) === doId);
    if (existingForDO.length > 0) continue;
    const lcsNames = lcs.map(s => String(s.state_name)).join("/");
    const clmSummary = clmHasRole.map(a => `${a.module}(${a.role}/${a.necessity})`).join(", ");
    missingInRows.push(`- \`${dn(doId)}\` mastered by ${p.code}-${info.module}; lifecycle gates: ${lcsNames}; CLM role: ${clmSummary}`);
  }
  if (missingInRows.length > 0) {
    W("**3. Missing handoffs the catalog implies**");
    W("");
    for (const r of missingInRows) W(r);
    W("");
  }

  // Boundary gaps (data_objects in handoffs neither side declares any role on)
  const relevantDOs = new Set<number>();
  for (const r of outForP) { relevantDOs.add(Number(r.data_object_id)); const evD = Number((r.trigger_event as Row)?.data_object_id); if (evD) relevantDOs.add(evD); }
  for (const r of inForP) { relevantDOs.add(Number(r.data_object_id)); const evD = Number((r.trigger_event as Row)?.data_object_id); if (evD) relevantDOs.add(evD); }
  const boundaryRows: string[] = [];
  for (const doId of relevantDOs) {
    const clmHas = clmRoleOnDO.get(doId);
    const partnerHas = partnerRoleByDomainDO[p.id].get(doId);
    if (!clmHas && !partnerHas) boundaryRows.push(`- \`${dn(doId)}\` (id=${doId}) — not modelled on either side`);
  }
  if (boundaryRows.length > 0) {
    W("**4. Boundary integrity gaps**");
    W("");
    W("Data objects referenced by handoffs in this pair but not modelled on either side. Owner is wherever the master canonically lives — sometimes a third domain (e.g. envelopes mastered by ESIGN show up here when neither CLM nor the other partner declares a role).");
    W("");
    for (const r of boundaryRows) W(r);
    W("");
  }
}

// Write the report
const outPath = "c:/tmp/reconcile_clm_2026_05_26.md";
await Bun.write(outPath, lines.join("\n"));
console.log(`\n✓ Report written to ${outPath} (${lines.length} lines)`);
