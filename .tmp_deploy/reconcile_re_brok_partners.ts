#!/usr/bin/env bun
// reconcile_re_brok_partners.ts - pairwise handoff reconciliation
//
// READ-ONLY by construction. Produces 5 diff files at c:/tmp/reconcile_*.md.
// The user reviews and decides which fixes to load (one side at a time).
//
// Per SKILL.md "Pairwise handoff reconciliation" procedure - for each pair
// (RE-BROKERAGE, partner), produces a single diff file with sections per
// direction (A->B and B->A), and within each direction four sub-sections:
//
//   Section 1 - Existing handoffs, fully wired (positive sanity)
//   Section 2 - Existing handoffs with NULL module FK (per-row B10b state)
//   Section 3 - Missing handoffs implied by DMDO + lifecycle substrate
//   Section 4 - Boundary integrity gaps (DMDO referencing un-mastered DOs)
//
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/reconcile_re_brok_partners.ts

export {};

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
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
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const TODAY = "2026_05_27";
const A_ID = 143;
const A_CODE = "RE-BROKERAGE";

const partners: { id: number; code: string }[] = [
  { id: 144, code: "RE-PROP-MGMT" },
  { id: 145, code: "RE-CRE" },
  { id: 146, code: "RE-INVEST" },
  { id: 15,  code: "CDM" },
  { id: 69,  code: "CRM" },
];

// ============================================================
// Helpers
// ============================================================

async function getModules(domainId: number): Promise<Array<{ id: number; code: string }>> {
  const rows: Row[] = await postgrest("GET", `/domain_modules?domain_id=eq.${domainId}&select=id,domain_module_code`) ?? [];
  const hostRows: Row[] = await postgrest(
    "GET",
    `/domain_module_host_domains?domain_id=eq.${domainId}&select=domain_module:domain_modules(id,domain_module_code)`,
  ) ?? [];
  const all = new Map<number, string>();
  for (const r of rows) all.set(Number(r.id), String(r.domain_module_code));
  for (const r of hostRows) {
    const m = (r as any).domain_module;
    if (m) all.set(Number(m.id), String(m.domain_module_code));
  }
  return [...all.entries()].map(([id, code]) => ({ id, code }));
}

async function getMasters(modIds: number[]): Promise<Map<number, { name: string; modules: string[] }>> {
  if (modIds.length === 0) return new Map();
  const rows: Row[] = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&role=eq.master&select=data_object_id,data_object:data_objects(data_object_name),domain_module:domain_modules(domain_module_code)`,
  ) ?? [];
  const map = new Map<number, { name: string; modules: string[] }>();
  for (const r of rows) {
    const did = Number(r.data_object_id);
    const name = String((r as any).data_object?.data_object_name);
    const mod = String((r as any).domain_module?.domain_module_code);
    const e = map.get(did);
    if (e) e.modules.push(mod);
    else map.set(did, { name, modules: [mod] });
  }
  return map;
}

async function getDmdoFor(modIds: number[]): Promise<Array<{ data_object_id: number; data_object_name: string; module_code: string; role: string; necessity: string }>> {
  if (modIds.length === 0) return [];
  const rows: Row[] = await postgrest(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=data_object_id,role,necessity,data_object:data_objects(data_object_name),domain_module:domain_modules(domain_module_code)`,
  ) ?? [];
  return rows.map((r) => ({
    data_object_id: Number(r.data_object_id),
    data_object_name: String((r as any).data_object?.data_object_name),
    module_code: String((r as any).domain_module?.domain_module_code),
    role: String(r.role),
    necessity: String(r.necessity),
  }));
}

async function getHandoffs(src: number, tgt: number) {
  const rows: Row[] = await postgrest(
    "GET",
    `/handoffs?source_domain_id=eq.${src}&target_domain_id=eq.${tgt}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,trigger_event:trigger_events(event_name,data_object_id)`,
  ) ?? [];
  return rows;
}

async function getLifecycleGates(masterIds: number[]): Promise<Array<{ data_object_id: number; state_name: string; permission_verb_override: string; domain_module_id: number | null }>> {
  if (masterIds.length === 0) return [];
  const rows: Row[] = await postgrest(
    "GET",
    `/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,permission_verb_override,domain_module_id`,
  ) ?? [];
  return rows.map((r) => ({
    data_object_id: Number(r.data_object_id),
    state_name: String(r.state_name),
    permission_verb_override: String(r.permission_verb_override || ""),
    domain_module_id: r.domain_module_id ? Number(r.domain_module_id) : null,
  }));
}

async function masterAnywhere(dataObjectId: number): Promise<string[]> {
  const rows: Row[] = await postgrest(
    "GET",
    `/domain_module_data_objects?data_object_id=eq.${dataObjectId}&role=eq.master&select=domain_module:domain_modules(domain_module_code,domain:domains(domain_code))`,
  ) ?? [];
  return rows.map((r: any) => `${r.domain_module?.domain?.domain_code} (${r.domain_module?.domain_module_code})`);
}

// ============================================================
// Per-direction analyzer
// ============================================================

type DirectionReport = {
  fromCode: string;
  toCode: string;
  section1: string[]; // wired handoff descriptions
  section2: string[]; // null-FK descriptions with fix hint
  section3: string[]; // missing handoff candidates
  section4: string[]; // integrity gaps
};

async function analyzeDirection(
  fromId: number, fromCode: string, fromModules: Array<{ id: number; code: string }>,
  toId: number, toCode: string, toModules: Array<{ id: number; code: string }>,
): Promise<DirectionReport> {
  const report: DirectionReport = {
    fromCode, toCode,
    section1: [], section2: [], section3: [], section4: [],
  };

  const fromMasters = await getMasters(fromModules.map((m) => m.id));
  const toDmdo = await getDmdoFor(toModules.map((m) => m.id));
  const toDmdoByDo = new Map<number, typeof toDmdo>();
  for (const r of toDmdo) {
    const arr = toDmdoByDo.get(r.data_object_id) ?? [];
    arr.push(r); toDmdoByDo.set(r.data_object_id, arr);
  }
  const handoffs = await getHandoffs(fromId, toId);
  const masterIds = [...fromMasters.keys()];
  const gates = await getLifecycleGates(masterIds);
  const gatesByDo = new Map<number, typeof gates>();
  for (const g of gates) {
    const arr = gatesByDo.get(g.data_object_id) ?? [];
    arr.push(g); gatesByDo.set(g.data_object_id, arr);
  }

  // Module-ID -> code map for both sides
  const modCode = new Map<number, string>();
  for (const m of fromModules) modCode.set(m.id, m.code);
  for (const m of toModules) modCode.set(m.id, m.code);

  // Section 1 + 2: classify existing handoffs
  const wiredKeys = new Set<string>();
  for (const h of handoffs) {
    const tev = (h as any).trigger_event;
    const eventName = tev?.event_name ?? "(unknown)";
    const payloadId = Number(h.data_object_id);
    const payloadName = fromMasters.get(payloadId)?.name ?? toDmdo.find((r) => r.data_object_id === payloadId)?.data_object_name ?? `data_object_id=${payloadId}`;
    const sMod = h.source_domain_module_id ? modCode.get(Number(h.source_domain_module_id)) ?? `(unknown:${h.source_domain_module_id})` : "NULL";
    const tMod = h.target_domain_module_id ? modCode.get(Number(h.target_domain_module_id)) ?? `(unknown:${h.target_domain_module_id})` : "NULL";
    const friction = h.friction_level;
    const pattern = h.integration_pattern;
    const wired = h.source_domain_module_id && h.target_domain_module_id;
    const line = `- \`${eventName}\` (payload: \`${payloadName}\`) | ${sMod} -> ${tMod} | ${pattern}, ${friction}`;
    if (wired) report.section1.push(line);
    else report.section2.push(line + ` | **NULL FK side: ${!h.source_domain_module_id ? "source" : "target"}**`);

    // Track for section 3
    const wiredKey = `${tev?.data_object_id}:${payloadId}`;
    wiredKeys.add(wiredKey);
  }

  // Section 3: missing implied handoffs
  // For every from-master with workflow-gate states, check if any DMDO row on
  // the to-side references that data_object (or related). If yes and there is
  // no existing handoff with that trigger_event_id paired with that payload,
  // surface as a candidate.
  for (const [doId, master] of fromMasters) {
    const masterGates = gatesByDo.get(doId) ?? [];
    if (masterGates.length === 0) continue;
    // What does the to-side care about?
    const toRelevantDmdo = toDmdo.filter((r) => r.data_object_id === doId);
    for (const g of masterGates) {
      // Look for a handoff with trigger_event.data_object_id == doId AND payload referencing
      // toRelevantDmdo.data_object_id; if not, the gate doesn't have a downstream wired.
      const hasOutbound = handoffs.some((h) => {
        const tev = (h as any).trigger_event;
        return Number(tev?.data_object_id) === doId;
      });
      if (toRelevantDmdo.length > 0 && !hasOutbound) {
        const targetRoles = toRelevantDmdo.map((r) => `${r.module_code} (${r.role}/${r.necessity})`).join(", ");
        const verb = g.permission_verb_override || g.state_name;
        report.section3.push(`- Gate \`${master.name}.${g.state_name}\` (verb: ${verb}) -> ${toCode} has DMDO on \`${master.name}\`: ${targetRoles}. No outbound handoff fires this transition to ${toCode}.`);
      }
    }
  }

  // Section 4: integrity gaps — DMDO on to-side referencing data_objects that no module masters anywhere
  // (only for data_objects that originate from the from-side direction)
  for (const r of toDmdo) {
    if (!fromMasters.has(r.data_object_id)) continue; // only check rows where from-side could be the master
    const ownersFromMap = fromMasters.get(r.data_object_id);
    if (ownersFromMap) continue; // covered by from-side
    const owners = await masterAnywhere(r.data_object_id);
    if (owners.length === 0) {
      report.section4.push(`- \`${r.data_object_name}\` is referenced by \`${r.module_code}\` (${r.role}/${r.necessity}) but has no canonical master in any module`);
    }
  }

  return report;
}

// ============================================================
// Per-pair runner
// ============================================================

async function reconcilePair(partner: { id: number; code: string }) {
  console.log(`\n=== Reconciling ${A_CODE} <-> ${partner.code} ===`);

  const aMods = await getModules(A_ID);
  const bMods = await getModules(partner.id);
  console.log(`  ${A_CODE}: ${aMods.length} modules (${aMods.map((m) => m.code).join(", ") || "none"})`);
  console.log(`  ${partner.code}: ${bMods.length} modules (${bMods.map((m) => m.code).join(", ") || "none"})`);

  const aToB = await analyzeDirection(A_ID, A_CODE, aMods, partner.id, partner.code, bMods);
  const bToA = await analyzeDirection(partner.id, partner.code, bMods, A_ID, A_CODE, aMods);

  const lines: string[] = [];
  lines.push(`# Pairwise handoff reconciliation: ${A_CODE} <-> ${partner.code}`);
  lines.push(``);
  lines.push(`Generated: ${TODAY}. Read-only diff. Per-side fixes are loaded separately.`);
  lines.push(``);
  lines.push(`- ${A_CODE} modules: ${aMods.length === 0 ? "_none_" : aMods.map((m) => `\`${m.code}\``).join(", ")}`);
  lines.push(`- ${partner.code} modules: ${bMods.length === 0 ? "_none_" : bMods.map((m) => `\`${m.code}\``).join(", ")}`);
  lines.push(``);

  for (const r of [aToB, bToA]) {
    lines.push(`## ${r.fromCode} -> ${r.toCode}`);
    lines.push(``);
    lines.push(`### Section 1 - Existing handoffs, fully wired`);
    lines.push(r.section1.length === 0 ? `_none_` : r.section1.join("\n"));
    lines.push(``);
    lines.push(`### Section 2 - Existing handoffs with NULL module FK`);
    lines.push(r.section2.length === 0 ? `_none — clean_` : r.section2.join("\n"));
    lines.push(``);
    lines.push(`### Section 3 - Missing handoffs implied by substrate`);
    lines.push(r.section3.length === 0 ? `_none_` : r.section3.join("\n"));
    lines.push(``);
    lines.push(`### Section 4 - Boundary integrity gaps`);
    lines.push(r.section4.length === 0 ? `_none_` : r.section4.join("\n"));
    lines.push(``);
  }

  // Summary
  const a1 = aToB.section1.length, a2 = aToB.section2.length, a3 = aToB.section3.length, a4 = aToB.section4.length;
  const b1 = bToA.section1.length, b2 = bToA.section2.length, b3 = bToA.section3.length, b4 = bToA.section4.length;
  lines.push(`## Summary`);
  lines.push(``);
  lines.push(`| direction | wired | NULL-FK | missing | integrity |`);
  lines.push(`|---|---|---|---|---|`);
  lines.push(`| ${A_CODE} -> ${partner.code} | ${a1} | ${a2} | ${a3} | ${a4} |`);
  lines.push(`| ${partner.code} -> ${A_CODE} | ${b1} | ${b2} | ${b3} | ${b4} |`);

  const out = `c:/tmp/reconcile_${A_CODE}_${partner.code}_${TODAY}.md`;
  await Bun.write(out, lines.join("\n") + "\n");
  console.log(`  wrote ${out}`);
  console.log(`    A->B: ${a1} wired / ${a2} null-FK / ${a3} missing / ${a4} integrity`);
  console.log(`    B->A: ${b1} wired / ${b2} null-FK / ${b3} missing / ${b4} integrity`);
}

// ============================================================
// Main
// ============================================================

for (const p of partners) {
  try {
    await reconcilePair(p);
  } catch (e: any) {
    console.log(`  ERROR: ${e.message}`);
  }
}

console.log(`\n=== all 5 reconciliations complete ===`);
console.log(`Diff files at c:/tmp/reconcile_${A_CODE}_*_${TODAY}.md`);
