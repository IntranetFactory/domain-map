#!/usr/bin/env bun
// Pairwise handoff reconciliation: WORK-MGMT (B) <-> 11 partner domains (A in each pair).
// Per SKILL.md "Pairwise handoff reconciliation" procedure. Read-only; emits a single
// consolidated diff file to c:/tmp/reconcile_work_mgmt_partners_2026_05_27.md.

const SEMANTIUS = "semantius";

async function api(path: string) {
  const args = { method: "GET", path };
  const proc = Bun.spawn([SEMANTIUS, "call", "crud", "postgrestRequest"], {
    stdin: new TextEncoder().encode(JSON.stringify(args)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const errOut = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`semantius failed: ${errOut}`);
  return out.trim() ? JSON.parse(out) : [];
}

const WORK_MGMT_ID = 135;
const TASK_EXEC_ID = 149;
const GOALS_OKR_ID = 150;
const WORK_MGMT_MODULES = [TASK_EXEC_ID, GOALS_OKR_ID];

const partners: { id: number; code: string }[] = [
  { id: 9, code: "SPM" },
  { id: 69, code: "CRM" },
  { id: 62, code: "EMP-EXP" },
  { id: 134, code: "NCDB" },
  { id: 40, code: "PROC-MIN" },
  { id: 36, code: "IPAAS" },
  { id: 80, code: "VSDP" },
  { id: 8, code: "TEST-MGMT" },
  { id: 136, code: "BPA" },
  { id: 68, code: "PSA" },
  { id: 101, code: "PROD-MGMT" },
];

// Per partner: which of *its* masters does WORK-MGMT consume (from our just-loaded DMDOs)?
// We pull these from live state rather than hard-coding.

const lines: string[] = [];
lines.push(`# WORK-MGMT pairwise handoff reconciliation`);
lines.push(`Generated 2026-05-27. Partners: ${partners.map((p) => p.code).join(", ")}.`);
lines.push(`Anchor: WORK-MGMT (id=${WORK_MGMT_ID}); modules TASK-EXEC=${TASK_EXEC_ID}, GOALS-OKR=${GOALS_OKR_ID}.`);
lines.push("");

// WORK-MGMT masters and module-of-master map
const wmMastersResp: any[] = await api(
  `/domain_module_data_objects?domain_module_id=in.(${WORK_MGMT_MODULES.join(",")})&role=eq.master&select=domain_module_id,data_object_id,data_objects(data_object_name)`,
);
const wmMasterIds = wmMastersResp.map((r) => r.data_object_id);
const wmMasterModuleMap = new Map<number, number>(wmMastersResp.map((r: any) => [r.data_object_id, r.domain_module_id]));
const wmMasterNameMap = new Map<number, string>(
  wmMastersResp.map((r: any) => [r.data_object_id, r.data_objects.data_object_name]),
);

// WORK-MGMT lifecycle states with requires_permission on its masters
const wmStates: any[] = await api(
  `/data_object_lifecycle_states?data_object_id=in.(${wmMasterIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,domain_module_id`,
);

// WORK-MGMT's trigger_events on its own masters
const wmEvents: any[] = await api(
  `/trigger_events?data_object_id=in.(${wmMasterIds.join(",")})&select=id,event_name,data_object_id`,
);

let totalCandidateAtoB = 0;
let totalCandidateBtoA = 0;
let totalExistingAtoB = 0;
let totalExistingBtoA = 0;
let totalNullFK = 0;
let totalIntegrity = 0;

for (const partner of partners) {
  lines.push(`---\n## ${partner.code} <-> WORK-MGMT`);

  // partner's masters via its modules
  const partnerModulesResp: any[] = await api(
    `/domain_modules?domain_id=eq.${partner.id}&select=id`,
  );
  const partnerModIds = partnerModulesResp.map((m: any) => m.id);
  let partnerMasterRows: any[] = [];
  let partnerMasterIds: number[] = [];
  let partnerMasterNameMap = new Map<number, string>();
  if (partnerModIds.length > 0) {
    const r: any[] = await api(
      `/domain_module_data_objects?domain_module_id=in.(${partnerModIds.join(",")})&role=eq.master&select=domain_module_id,data_object_id,data_objects(data_object_name)`,
    );
    partnerMasterRows = r;
    partnerMasterIds = r.map((x: any) => x.data_object_id);
    partnerMasterNameMap = new Map(r.map((x: any) => [x.data_object_id, x.data_objects.data_object_name]));
  } else {
    // partner not modularized -- fall back to legacy domain_data_objects masters
    const r: any[] = await api(
      `/domain_data_objects?domain_id=eq.${partner.id}&role=eq.master&select=data_object_id,data_objects(data_object_name)`,
    );
    partnerMasterRows = r;
    partnerMasterIds = r.map((x: any) => x.data_object_id);
    partnerMasterNameMap = new Map(r.map((x: any) => [x.data_object_id, x.data_objects.data_object_name]));
    lines.push(`*Note: partner not modularized; using legacy domain_data_objects.*`);
  }

  if (partnerMasterIds.length === 0) {
    lines.push(`Partner has zero masters; skipping. (Leadership-tier or empty.)`);
    continue;
  }

  // partner's lifecycle states with requires_permission
  const partnerStates: any[] =
    partnerMasterIds.length > 0
      ? await api(
          `/data_object_lifecycle_states?data_object_id=in.(${partnerMasterIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,domain_module_id`,
        )
      : [];

  // partner's trigger_events
  const partnerEvents: any[] =
    partnerMasterIds.length > 0
      ? await api(
          `/trigger_events?data_object_id=in.(${partnerMasterIds.join(",")})&select=id,event_name,data_object_id`,
        )
      : [];

  // ----- Direction A->B (partner -> WORK-MGMT) -----
  const aToB: any[] = await api(
    `/handoffs?source_domain_id=eq.${partner.id}&target_domain_id=eq.${WORK_MGMT_ID}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,trigger_events(event_name,data_object_id),data_objects(data_object_name)`,
  );

  // WORK-MGMT DMDOs on partner's masters (these are the records WORK-MGMT consumes)
  const wmDmdoOnPartner: any[] =
    partnerMasterIds.length > 0
      ? await api(
          `/domain_module_data_objects?data_object_id=in.(${partnerMasterIds.join(",")})&domain_module_id=in.(${WORK_MGMT_MODULES.join(",")})&select=domain_module_id,data_object_id,role,necessity`,
        )
      : [];

  lines.push(`\n### ${partner.code} -> WORK-MGMT`);
  lines.push(`**Section 1 - Existing handoffs, fully wired:** ${aToB.filter((h) => h.source_domain_module_id && h.target_domain_module_id).length}`);
  for (const h of aToB.filter((h) => h.source_domain_module_id && h.target_domain_module_id)) {
    lines.push(`  - id=${h.id} \`${h.trigger_events?.event_name}\` payload=\`${h.data_objects?.data_object_name}\` pattern=${h.integration_pattern} friction=${h.friction_level}`);
  }
  totalExistingAtoB += aToB.filter((h) => h.source_domain_module_id && h.target_domain_module_id).length;

  const nullFK = aToB.filter((h) => !h.source_domain_module_id || !h.target_domain_module_id);
  lines.push(`\n**Section 2 - Existing handoffs with NULL module FK:** ${nullFK.length}`);
  for (const h of nullFK) {
    lines.push(
      `  - id=${h.id} \`${h.trigger_events?.event_name}\` src_mod=${h.source_domain_module_id ?? "NULL"} tgt_mod=${h.target_domain_module_id ?? "NULL"} (${h.source_domain_module_id ? `${partner.code} side missing - owed by ${partner.code} B10b` : `WORK-MGMT side missing`})`,
    );
  }
  totalNullFK += nullFK.length;

  // Section 3: missing handoffs the catalog implies
  // For every partner master state with requires_permission=true × WORK-MGMT DMDO on that data_object,
  // check that A->B handoff exists. The signal is: partner publishes a workflow gate, WORK-MGMT consumes the record.
  const existingEventDataObjectPairs = new Set(
    aToB
      .map((h) => `${h.trigger_events?.event_name}::${h.data_object_id}`)
      .filter((x) => x.startsWith("undefined") === false),
  );
  const missingAtoB: { state: any; wmRole: string; wmModule: number }[] = [];
  for (const state of partnerStates) {
    const wmDmdos = wmDmdoOnPartner.filter((d) => d.data_object_id === state.data_object_id);
    if (wmDmdos.length === 0) continue; // WORK-MGMT doesn't consume this master
    // Likely event names: <singular_master>.<state_name> -- but we don't know singular here; check by data_object_id + state name match in events
    const matchingEvents = partnerEvents.filter((e) => e.data_object_id === state.data_object_id && e.event_name.endsWith(`.${state.state_name}`));
    if (matchingEvents.length === 0) continue; // no trigger_event exists for this gate -- partner's own B9 gap
    for (const evt of matchingEvents) {
      const handoffExists = aToB.some((h) => h.trigger_event_id === evt.id);
      if (!handoffExists) {
        for (const dmdo of wmDmdos) {
          missingAtoB.push({ state, wmRole: dmdo.role, wmModule: dmdo.domain_module_id });
        }
      }
    }
  }
  lines.push(`\n**Section 3 - Missing handoffs catalog implies:** ${missingAtoB.length}`);
  for (const m of missingAtoB) {
    const wmModuleCode = m.wmModule === TASK_EXEC_ID ? "TASK-EXEC" : "GOALS-OKR";
    const masterName = partnerMasterNameMap.get(m.state.data_object_id) ?? `do=${m.state.data_object_id}`;
    lines.push(
      `  - ${partner.code} \`${masterName}.${m.state.state_name}\` -> WORK-MGMT-${wmModuleCode} (${m.wmRole}). Author trigger_event if absent, then handoff row.`,
    );
  }
  totalCandidateAtoB += missingAtoB.length;

  // Section 4: integrity gaps -- WORK-MGMT DMDO refs partner data_object that has no master row
  // Already covered by B5 in the audit and our just-loaded DMDOs reference partner-mastered objects.
  // We sanity-check by confirming every WORK-MGMT consumer DMDO has a partner master.
  const integrityGaps = wmDmdoOnPartner.filter((d) => !partnerMasterIds.includes(d.data_object_id));
  lines.push(`\n**Section 4 - Boundary integrity gaps:** ${integrityGaps.length}`);
  for (const g of integrityGaps) {
    lines.push(`  - WORK-MGMT consumes data_object_id=${g.data_object_id} but ${partner.code} doesn't master it. Wrong attribution.`);
  }
  totalIntegrity += integrityGaps.length;

  // ----- Direction B->A (WORK-MGMT -> partner) -----
  const bToA: any[] = await api(
    `/handoffs?source_domain_id=eq.${WORK_MGMT_ID}&target_domain_id=eq.${partner.id}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,trigger_events(event_name,data_object_id),data_objects(data_object_name)`,
  );

  // partner DMDOs on WORK-MGMT masters
  const partnerDmdoOnWM: any[] =
    partnerModIds.length > 0
      ? await api(
          `/domain_module_data_objects?data_object_id=in.(${wmMasterIds.join(",")})&domain_module_id=in.(${partnerModIds.join(",")})&select=domain_module_id,data_object_id,role,necessity`,
        )
      : await api(
          `/domain_data_objects?data_object_id=in.(${wmMasterIds.join(",")})&domain_id=eq.${partner.id}&select=data_object_id,role,necessity`,
        );

  lines.push(`\n### WORK-MGMT -> ${partner.code}`);
  lines.push(`**Section 1 - Existing handoffs, fully wired:** ${bToA.filter((h) => h.source_domain_module_id && h.target_domain_module_id).length}`);
  for (const h of bToA.filter((h) => h.source_domain_module_id && h.target_domain_module_id)) {
    lines.push(`  - id=${h.id} \`${h.trigger_events?.event_name}\` payload=\`${h.data_objects?.data_object_name}\` pattern=${h.integration_pattern} friction=${h.friction_level}`);
  }
  totalExistingBtoA += bToA.filter((h) => h.source_domain_module_id && h.target_domain_module_id).length;

  const nullFK2 = bToA.filter((h) => !h.source_domain_module_id || !h.target_domain_module_id);
  lines.push(`\n**Section 2 - Existing handoffs with NULL module FK:** ${nullFK2.length}`);
  for (const h of nullFK2) {
    lines.push(
      `  - id=${h.id} \`${h.trigger_events?.event_name}\` src_mod=${h.source_domain_module_id ?? "NULL"} tgt_mod=${h.target_domain_module_id ?? "NULL"} (${h.target_domain_module_id ? `WORK-MGMT side patchable` : `${partner.code} side missing - owed by ${partner.code} B10b`})`,
    );
  }
  totalNullFK += nullFK2.length;

  // Section 3: missing B->A
  const missingBtoA: { state: any; partnerRole: string; partnerModule: number | null }[] = [];
  for (const state of wmStates) {
    const partnerDmdos = partnerDmdoOnWM.filter((d) => d.data_object_id === state.data_object_id);
    if (partnerDmdos.length === 0) continue;
    const matchingEvents = wmEvents.filter((e) => e.data_object_id === state.data_object_id && e.event_name.endsWith(`.${state.state_name}`));
    if (matchingEvents.length === 0) continue;
    for (const evt of matchingEvents) {
      const handoffExists = bToA.some((h) => h.trigger_event_id === evt.id);
      if (!handoffExists) {
        for (const dmdo of partnerDmdos) {
          missingBtoA.push({ state, partnerRole: dmdo.role, partnerModule: dmdo.domain_module_id ?? null });
        }
      }
    }
  }
  lines.push(`\n**Section 3 - Missing handoffs catalog implies:** ${missingBtoA.length}`);
  for (const m of missingBtoA) {
    const masterName = wmMasterNameMap.get(m.state.data_object_id) ?? `do=${m.state.data_object_id}`;
    lines.push(
      `  - WORK-MGMT \`${masterName}.${m.state.state_name}\` -> ${partner.code} (partner ${m.partnerRole}). Author trigger_event if absent, then handoff row.`,
    );
  }
  totalCandidateBtoA += missingBtoA.length;

  // Section 4: integrity -- partner DMDO refs WORK-MGMT data_object that isn't mastered
  const intGaps2 = partnerDmdoOnWM.filter((d) => !wmMasterIds.includes(d.data_object_id));
  lines.push(`\n**Section 4 - Boundary integrity gaps:** ${intGaps2.length}`);
  for (const g of intGaps2) {
    lines.push(`  - ${partner.code} refs data_object_id=${g.data_object_id} but WORK-MGMT doesn't master it.`);
  }
  totalIntegrity += intGaps2.length;
}

lines.push("");
lines.push("---\n## Summary");
lines.push(`- Existing A->B fully wired: ${totalExistingAtoB}`);
lines.push(`- Existing B->A fully wired: ${totalExistingBtoA}`);
lines.push(`- NULL-FK rows remaining: ${totalNullFK}`);
lines.push(`- Missing A->B candidates: ${totalCandidateAtoB}`);
lines.push(`- Missing B->A candidates: ${totalCandidateBtoA}`);
lines.push(`- Boundary integrity gaps: ${totalIntegrity}`);

const outPath = "c:/tmp/reconcile_work_mgmt_partners_2026_05_27.md";
await Bun.write(outPath, lines.join("\n"));
console.log(`\nWrote ${outPath}`);
console.log(`Summary: existing A->B=${totalExistingAtoB}, B->A=${totalExistingBtoA}, NULL-FK=${totalNullFK}, missing A->B=${totalCandidateAtoB}, missing B->A=${totalCandidateBtoA}, integrity gaps=${totalIntegrity}`);
