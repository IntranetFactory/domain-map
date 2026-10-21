#!/usr/bin/env bun
// B9d — Handoff payload realization resolver, ATS (domain 56), OUTBOUND owned.
// Read-only. Classifies each outbound cross-domain handoff's APQC payload as
// RESOLVED / ROLL-UP / ORPHAN / MIS-TAG against the realized set.
//
// realized = a process whose id is a gated data_object_lifecycle_states.process_id
//            AND that carries process_raci with >=1 R and >=1 A.

import { spawn } from "bun";

async function get(path: string): Promise<any[]> {
  const proc = spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const code = await proc.exited;
  if (code !== 0) throw new Error(`GET ${path} failed: ${await new Response(proc.stderr).text()}`);
  return JSON.parse(out);
}

const ATS = 56;

// 1. ATS outbound cross-domain handoffs + their single tag (process_id).
const tags = await get(
  "/handoff_processes?select=handoff_id,process_id,record_status,handoffs!inner(id,source_domain_id,target_domain_id,trigger_event:trigger_events(event_name),payload:data_objects!handoffs_data_object_id_fkey(data_object_name),target_domain:domains!handoffs_target_domain_id_fkey(domain_code))&handoffs.source_domain_id=eq." +
  ATS + "&handoffs.target_domain_id=neq." + ATS
);

// 2. Realized set: gated lifecycle process_ids, then filter to those with >=1 R and >=1 A in process_raci.
const gated = await get("/data_object_lifecycle_states?process_id=not.is.null&select=process_id");
const gatedIds = [...new Set(gated.map((g) => g.process_id))];
const raci = gatedIds.length
  ? await get(`/process_raci?process_id=in.(${gatedIds.join(",")})&select=process_id,raci`)
  : [];
const rByProc = new Map<number, Set<string>>();
for (const r of raci) {
  if (!rByProc.has(r.process_id)) rByProc.set(r.process_id, new Set());
  rByProc.get(r.process_id)!.add((r.raci || "").toLowerCase());
}
const realizedIds = gatedIds.filter((id) => {
  const s = rByProc.get(id);
  return s && s.has("responsible") && s.has("accountable");
});

// 3. process_codes for the realized set + the payload set (one fetch covering both).
const payloadIds = [...new Set(tags.map((t) => t.process_id))];
const allIds = [...new Set([...realizedIds, ...payloadIds])];
const procRows = allIds.length
  ? await get(`/processes?id=in.(${allIds.join(",")})&select=id,process_code,process_name,hierarchy_level`)
  : [];
const procById = new Map<number, any>(procRows.map((p) => [p.id, p]));
const realizedByCode = realizedIds
  .filter((id) => procById.get(id))
  .map((id) => ({ id, code: procById.get(id).process_code, name: procById.get(id).process_name }));

console.log(`Realized set (gated + R + A): ${realizedByCode.length} processes`);
for (const r of realizedByCode.sort((a, b) => a.code.localeCompare(b.code)))
  console.log(`  ${r.code}  ${r.name} (id ${r.id})`);

const isAncestor = (a: string, c: string) => c.startsWith(a + ".");      // a is strict ancestor of c
const isDescendant = (d: string, c: string) => d.startsWith(c + ".");    // d is strict descendant of c

console.log(`\n${tags.length} ATS outbound cross-domain payload tags:\n`);
const counts: Record<string, number> = { RESOLVED: 0, "ROLL-UP": 0, ORPHAN: 0, "MIS-TAG": 0 };
for (const t of tags.sort((a, b) => a.handoff_id - b.handoff_id)) {
  const p = procById.get(t.process_id);
  const C = p?.process_code ?? "?";
  const h = t.handoffs;
  const label = `#${t.handoff_id} ${h.trigger_event?.event_name} -> ${h.target_domain?.domain_code} [${h.payload?.data_object_name}] tag ${C} "${p?.process_name}"`;

  let verdict: string;
  let detail = "";
  if (realizedByCode.some((r) => r.code === C)) {
    verdict = "RESOLVED";
  } else {
    const anc = realizedByCode.filter((r) => isAncestor(r.code, C)).sort((a, b) => b.code.length - a.code.length)[0];
    const desc = realizedByCode.filter((r) => isDescendant(r.code, C)).sort((a, b) => a.code.length - b.code.length)[0];
    const rel = anc || desc;
    if (rel) {
      verdict = "ROLL-UP";
      detail = ` -> re-point to ${rel.code} "${rel.name}" (id ${rel.id})`;
    } else {
      verdict = C.startsWith("7") ? "ORPHAN" : "MIS-TAG";
    }
  }
  counts[verdict]++;
  console.log(`  [${verdict}] ${label}${detail}`);
}
console.log(`\nVerdict tally:`, counts);
