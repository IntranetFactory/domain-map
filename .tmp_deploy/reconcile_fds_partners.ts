#!/usr/bin/env bun
// Pairwise handoff reconciliation: FARMER-DIRECT-SALES (158) against the four
// partner domains it shares handoffs with — ERP-FIN (65), CRM (69), FOOD-TRACE
// (155), FMIS (154). Read-only by construction. Emits one diff per pair at
// c:/tmp/reconcile_FDS_<partner_code>_2026_05_26.md.

import { writeFileSync, mkdirSync } from "node:fs";

async function call(body: Record<string, unknown>): Promise<any[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exit = await proc.exited;
  if (exit !== 0) throw new Error(`semantius failed (exit ${exit}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (p: string) => call({ method: "GET", path: p });

const DATE = "2026_05_26";
mkdirSync("c:/tmp", { recursive: true });

type DomShape = {
  id: number;
  code: string;
  name: string;
  masters: Array<{ id: number; name: string }>; // ids of master data_objects (excludes embedded_master)
  modules: Array<{ id: number; code: string }>;
  states: Array<{ data_object_id: number; state_name: string; requires_permission: boolean; domain_module_id: number | null }>;
  triggerEvents: Array<{ id: number; event_name: string; data_object_id: number; description: string }>;
  dmdo: Array<{ domain_module_id: number; data_object_id: number; role: string; necessity: string }>;
};

async function loadDomain(id: number): Promise<DomShape> {
  const dom = (await get(`/domains?id=eq.${id}&select=id,domain_code,domain_name`))[0];
  const ddo = await get(`/domain_data_objects?domain_id=eq.${id}&role=eq.master&select=data_object_id,data_objects(data_object_name)`);
  const masters = ddo.map((r: any) => ({ id: r.data_object_id, name: r.data_objects.data_object_name }));
  const masterIds = masters.map(m => m.id);
  const modules = (await get(`/domain_modules?domain_id=eq.${id}&select=id,domain_module_code`))
    .map((r: any) => ({ id: r.id, code: r.domain_module_code }));
  const states = masterIds.length
    ? await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=data_object_id,state_name,requires_permission,domain_module_id`)
    : [];
  const triggerEvents = masterIds.length
    ? await get(`/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id,event_name,data_object_id,description`)
    : [];
  const dmdo = modules.length
    ? await get(`/domain_module_data_objects?domain_module_id=in.(${modules.map(m => m.id).join(",")})&select=domain_module_id,data_object_id,role,necessity`)
    : [];
  return { id: dom.id, code: dom.domain_code, name: dom.domain_name, masters, modules, states, triggerEvents, dmdo };
}

type Handoff = {
  id: number;
  trigger_event_id: number;
  source_domain_id: number;
  source_domain_module_id: number | null;
  target_domain_id: number;
  target_domain_module_id: number | null;
  data_object_id: number;
  integration_pattern: string;
  friction_level: string;
  notes: string;
  trigger_events: { event_name: string; data_object_id: number };
};

async function getHandoffs(a: number, b: number): Promise<Handoff[]> {
  return await get(`/handoffs?source_domain_id=eq.${a}&target_domain_id=eq.${b}&select=id,trigger_event_id,source_domain_id,source_domain_module_id,target_domain_id,target_domain_module_id,data_object_id,integration_pattern,friction_level,notes,trigger_events(event_name,data_object_id)`);
}

const ROLE_ORDER = ["master", "embedded_master", "contributor", "consumer", "derived"];

function diffOneDirection(A: DomShape, B: DomShape, AtoB: Handoff[]): string {
  let md = "";

  // Section 1 — existing, fully wired
  const wired = AtoB.filter(h => h.source_domain_module_id !== null && h.target_domain_module_id !== null);
  md += `### Section 1 — Existing handoffs, fully wired (${wired.length})\n\n`;
  if (wired.length === 0) {
    md += `_(none)_\n\n`;
  } else {
    md += `| handoff_id | trigger | payload | src_module | tgt_module | pattern | friction |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    for (const h of wired) {
      const srcMod = A.modules.find(m => m.id === h.source_domain_module_id)?.code ?? "?";
      const tgtMod = B.modules.find(m => m.id === h.target_domain_module_id)?.code ?? "?";
      const payload = A.masters.find(m => m.id === h.data_object_id)?.name ?? B.masters.find(m => m.id === h.data_object_id)?.name ?? `id=${h.data_object_id}`;
      md += `| ${h.id} | \`${h.trigger_events.event_name}\` | \`${payload}\` | ${srcMod} | ${tgtMod} | ${h.integration_pattern} | ${h.friction_level} |\n`;
    }
    md += "\n";
  }

  // Section 2 — existing with NULL module FK
  const partials = AtoB.filter(h => h.source_domain_module_id === null || h.target_domain_module_id === null);
  md += `### Section 2 — Existing handoffs with NULL module FK (${partials.length})\n\n`;
  if (partials.length === 0) {
    md += `_(none)_\n\n`;
  } else {
    md += `| handoff_id | trigger | payload | src_module | tgt_module | resolution |\n`;
    md += `|---|---|---|---|---|---|\n`;
    for (const h of partials) {
      const evtDoId = h.trigger_events.data_object_id;
      const payloadId = h.data_object_id;
      // attempt B10b derivation
      let srcCell: string;
      if (h.source_domain_module_id !== null) {
        srcCell = A.modules.find(m => m.id === h.source_domain_module_id)?.code ?? "?";
      } else {
        // find best A module for evtDoId
        const cand = A.dmdo.filter(d => d.data_object_id === evtDoId);
        cand.sort((x, y) => ROLE_ORDER.indexOf(x.role) - ROLE_ORDER.indexOf(y.role));
        if (cand[0]) {
          const code = A.modules.find(m => m.id === cand[0].domain_module_id)?.code ?? "?";
          srcCell = `NULL → patch \`${code}\` (role=${cand[0].role})`;
        } else {
          srcCell = `NULL (no A module masters event_do=${evtDoId})`;
        }
      }
      let tgtCell: string;
      if (h.target_domain_module_id !== null) {
        tgtCell = B.modules.find(m => m.id === h.target_domain_module_id)?.code ?? "?";
      } else {
        if (B.modules.length === 0) {
          tgtCell = `NULL (B not modularized — legitimate per write-time policy)`;
        } else {
          const cand = B.dmdo.filter(d => d.data_object_id === payloadId);
          cand.sort((x, y) => ROLE_ORDER.indexOf(x.role) - ROLE_ORDER.indexOf(y.role));
          if (cand[0]) {
            const code = B.modules.find(m => m.id === cand[0].domain_module_id)?.code ?? "?";
            tgtCell = `NULL → patch \`${code}\` (role=${cand[0].role})`;
          } else {
            tgtCell = `NULL (no B module declares payload_do=${payloadId}; needs B DMDO row first)`;
          }
        }
      }
      const payloadName = A.masters.find(m => m.id === payloadId)?.name ?? B.masters.find(m => m.id === payloadId)?.name ?? `id=${payloadId}`;
      const resolution = (srcCell.startsWith("NULL") || tgtCell.startsWith("NULL")) ? "needs upstream fix or partner modularization" : "ready to PATCH on this side";
      md += `| ${h.id} | \`${h.trigger_events.event_name}\` | \`${payloadName}\` | ${srcCell} | ${tgtCell} | ${resolution} |\n`;
    }
    md += "\n";
  }

  // Section 3 — missing handoffs the catalog implies should exist
  // Heuristic: for each A trigger_event NOT in AtoB, see if B has a DMDO row on the event's data_object OR on any related payload.
  const usedEventIds = new Set(AtoB.map(h => h.trigger_event_id));
  const orphanEvents = A.triggerEvents.filter(e => !usedEventIds.has(e.id));
  md += `### Section 3 — A trigger_events NOT (yet) producing a handoff to B (${orphanEvents.length})\n\n`;
  if (orphanEvents.length === 0) {
    md += `_(none — every ${A.code} trigger_event has at least one handoff somewhere)_\n\n`;
  } else {
    md += `Either each event has subscribers elsewhere in the catalog (not B), OR a handoff to ${B.code} is genuinely missing.\n\n`;
    md += `| trigger | event_do | B consumes event_do? | description |\n`;
    md += `|---|---|---|---|\n`;
    for (const e of orphanEvents) {
      const eventDoName = A.masters.find(m => m.id === e.data_object_id)?.name ?? `id=${e.data_object_id}`;
      const bConsumes = B.dmdo.find(d => d.data_object_id === e.data_object_id);
      const bCell = bConsumes
        ? `YES (${B.modules.find(m => m.id === bConsumes.domain_module_id)?.code} role=${bConsumes.role})`
        : (B.modules.length === 0 ? "(B not modularized; check legacy domain_data_objects)" : "no");
      md += `| \`${e.event_name}\` | \`${eventDoName}\` | ${bCell} | ${(e.description ?? "").slice(0, 100)} |\n`;
    }
    md += "\n";
  }

  // Section 4 — boundary integrity gaps
  // B has DMDO rows on data_objects A masters but no actual handoff covers them yet?
  // Already covered by section 3. Surface the inverse: A has DMDO rows on B-mastered data_objects but no inbound handoff from B yet.
  const bMasterIds = new Set(B.masters.map(m => m.id));
  const aDependenciesOnB = A.dmdo.filter(d => bMasterIds.has(d.data_object_id) && d.role !== "master");
  md += `### Section 4 — Boundary integrity (A's dependencies on B masters: ${aDependenciesOnB.length})\n\n`;
  if (aDependenciesOnB.length === 0) {
    md += `_(none — ${A.code} has no DMDO row on any ${B.code} master)_\n\n`;
  } else {
    md += `These are dependencies ${A.code} declares on ${B.code} masters. If ${B.code} has no outbound handoff for the state-changes that drive ${A.code}'s consumption, that's a B9 gap on ${B.code}.\n\n`;
    md += `| A module | A's role | B master | necessity |\n`;
    md += `|---|---|---|---|\n`;
    for (const d of aDependenciesOnB) {
      const aMod = A.modules.find(m => m.id === d.domain_module_id)?.code ?? "?";
      const bName = B.masters.find(m => m.id === d.data_object_id)?.name ?? `id=${d.data_object_id}`;
      md += `| ${aMod} | ${d.role} | \`${bName}\` | ${d.necessity} |\n`;
    }
    md += "\n";
  }

  return md;
}

async function reconcile(FDS: DomShape, partnerId: number) {
  const partner = await loadDomain(partnerId);
  const AtoB = await getHandoffs(FDS.id, partner.id);
  const BtoA = await getHandoffs(partner.id, FDS.id);

  let md = `# Pairwise handoff reconciliation: ${FDS.code} ↔ ${partner.code}\n\n`;
  md += `Generated ${DATE.replace(/_/g, "-")}. Read-only diff per the SKILL pairwise-reconciliation procedure.\n\n`;
  md += `**A = ${FDS.code} (${FDS.name}) — id=${FDS.id}**\n`;
  md += `- masters: ${FDS.masters.length}, modules: ${FDS.modules.length}, trigger_events: ${FDS.triggerEvents.length}\n\n`;
  md += `**B = ${partner.code} (${partner.name}) — id=${partner.id}**\n`;
  md += `- masters: ${partner.masters.length}, modules: ${partner.modules.length}, trigger_events: ${partner.triggerEvents.length}\n`;
  if (partner.modules.length === 0) {
    md += `- ⚠ **${partner.code} is NOT modularized.** All handoffs into ${partner.code} will legitimately have \`target_domain_module_id=NULL\` per the write-time policy until ${partner.code} ships its Phase-M load. The fix for those rows is to modularize ${partner.code}, not to patch the handoff.\n`;
  }
  md += `\n`;

  // Summary counts
  const wired_AtoB = AtoB.filter(h => h.source_domain_module_id !== null && h.target_domain_module_id !== null).length;
  const wired_BtoA = BtoA.filter(h => h.source_domain_module_id !== null && h.target_domain_module_id !== null).length;
  md += `## Summary\n\n`;
  md += `| direction | rows | fully wired | partially wired |\n`;
  md += `|---|---|---|---|\n`;
  md += `| ${FDS.code} → ${partner.code} | ${AtoB.length} | ${wired_AtoB} | ${AtoB.length - wired_AtoB} |\n`;
  md += `| ${partner.code} → ${FDS.code} | ${BtoA.length} | ${wired_BtoA} | ${BtoA.length - wired_BtoA} |\n\n`;

  md += `## Direction A→B (${FDS.code} → ${partner.code})\n\n`;
  md += diffOneDirection(FDS, partner, AtoB);

  md += `## Direction B→A (${partner.code} → ${FDS.code})\n\n`;
  md += diffOneDirection(partner, FDS, BtoA);

  const path = `c:/tmp/reconcile_FDS_${partner.code.replace(/-/g, "_")}_${DATE}.md`;
  writeFileSync(path, md);
  console.log(`wrote ${path}`);
  return { partner_code: partner.code, AtoB_total: AtoB.length, AtoB_partial: AtoB.length - wired_AtoB, BtoA_total: BtoA.length, BtoA_partial: BtoA.length - wired_BtoA, orphan_events_A: FDS.triggerEvents.filter(e => !new Set(AtoB.map(h => h.trigger_event_id)).has(e.id)).length };
}

const FDS = await loadDomain(158);
console.log(`FDS shape: ${FDS.masters.length} masters, ${FDS.modules.length} modules, ${FDS.triggerEvents.length} trigger_events`);

const partners = [65, 69, 155, 154];
const summary: any[] = [];
for (const p of partners) {
  summary.push(await reconcile(FDS, p));
}

console.log("\n=== reconciliation summary ===");
console.table(summary);
