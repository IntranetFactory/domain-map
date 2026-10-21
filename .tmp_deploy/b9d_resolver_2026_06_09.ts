#!/usr/bin/env bun
// .tmp_deploy/b9d_resolver_2026_06_09.ts  --  per-domain B9d handoff-payload realization (READ-ONLY)
//
// Classifies each OUTBOUND cross-domain handoff_processes payload tag for a domain into
// RESOLVED / ROLL-UP / ORPHAN / MIS-TAG per SKILL.md B9d. No writes; prints a verdict table.
// Usage: bun run .tmp_deploy/b9d_resolver_2026_06_09.ts <domain_id>
import { pg } from "../scripts/lib/catalog";

const DOMAIN = Number(process.argv[2] ?? "54"); // default HCM

// --- pull payloads (outbound cross-domain), realized set, raci, processes ---
const payloads: any[] = await pg("GET", `/handoff_processes?select=id,process_id,record_status,proposal_source,handoff:handoffs!inner(id,source_domain_id,target_domain_id,trigger_events(event_name)),process:processes(process_code,external_id,process_name,hierarchy_level)&handoff.source_domain_id=eq.${DOMAIN}&handoff.target_domain_id=neq.${DOMAIN}`);
const gated: any[] = await pg("GET", "/data_object_lifecycle_states?process_id=not.is.null&select=process_id");
const raci: any[] = await pg("GET", "/process_raci?select=process_id,raci");
const procs: any[] = await pg("GET", "/processes?select=id,process_code,process_name,hierarchy_level&limit=20000");

const procById = new Map<number, any>(procs.map((p) => [p.id, p]));
const gatedIds = new Set<number>(gated.map((g) => g.process_id));
// raci with >=1 responsible AND >=1 accountable
const raciByProc = new Map<number, Set<string>>();
for (const r of raci) {
  if (!raciByProc.has(r.process_id)) raciByProc.set(r.process_id, new Set());
  raciByProc.get(r.process_id)!.add(r.raci);
}
const hasRA = (pid: number) => { const s = raciByProc.get(pid); return !!s && s.has("responsible") && s.has("accountable"); };
// realized = gated AND has R+A; collect their codes
const realized: { id: number; code: string }[] = [];
for (const pid of gatedIds) {
  if (hasRA(pid) && procById.get(pid)?.process_code) realized.push({ id: pid, code: String(procById.get(pid).process_code) });
}
const realizedByCode = new Map<string, number>(realized.map((r) => [r.code, r.id]));

// dotted-prefix ancestor: A ancestor of B iff B === A or B startsWith A + "."
const isAncestor = (a: string, b: string) => a === b || b.startsWith(a + ".");
const firstSeg = (code: string) => (code || "").split(".")[0];
// HR family categories present in this domain's realized set (for MIS-TAG heuristic)
const homeCats = new Set(realized.map((r) => firstSeg(r.code)).filter(Boolean));

type Verdict = "RESOLVED" | "ROLL-UP" | "ORPHAN" | "MIS-TAG";
const rows: { hpId: number; pid: number; code: string; name: string; event: string; target: number; verdict: Verdict; repointTo?: string; repointPid?: number; note: string }[] = [];

for (const hp of payloads) {
  const pid = hp.process_id as number;
  const code = String(hp.process?.process_code ?? "");
  const name = hp.process?.process_name ?? "";
  const event = hp.handoff?.trigger_events?.event_name ?? "";
  const target = hp.handoff?.target_domain_id;
  let verdict: Verdict; let repointTo: string | undefined; let repointPid: number | undefined; let note = "";

  if (gatedIds.has(pid) && hasRA(pid)) {
    verdict = "RESOLVED";
  } else {
    // ROLL-UP: a strict ancestor or descendant of C is realized
    const cands = realized.filter((r) => r.code !== code && (isAncestor(r.code, code) || isAncestor(code, r.code)));
    if (cands.length) {
      // pick closest by dotted-segment distance
      const segs = (c: string) => c.split(".").length;
      cands.sort((a, b) => Math.abs(segs(a.code) - segs(code)) - Math.abs(segs(b.code) - segs(code)));
      verdict = "ROLL-UP"; repointTo = cands[0].code; repointPid = cands[0].id;
      note = `realized at ${cands[0].code} (${isAncestor(cands[0].code, code) ? "ancestor" : "descendant"})`;
    } else if (code && homeCats.size && !homeCats.has(firstSeg(code))) {
      verdict = "MIS-TAG"; note = `category ${firstSeg(code)} not in home cats {${[...homeCats].join(",")}}`;
    } else {
      verdict = "ORPHAN"; note = `category ${firstSeg(code)}; no realized ancestor/descendant`;
    }
  }
  rows.push({ hpId: hp.id, pid, code, name, event, target, verdict, repointTo, repointPid, note });
}

// summarize
const byVerdict: Record<string, number> = {};
for (const r of rows) byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;
console.log(`B9d domain ${DOMAIN}: ${payloads.length} outbound payload tags | realized set size ${realized.length} | home cats {${[...homeCats].join(",")}}`);
console.log(`verdicts: ${JSON.stringify(byVerdict)}`);
console.log("");
// distinct (process_id -> verdict) summary, since many handoffs share a process_id
const seen = new Set<string>();
for (const r of rows.sort((a, b) => a.verdict.localeCompare(b.verdict) || a.pid - b.pid)) {
  const key = `${r.verdict}|${r.pid}|${r.repointTo ?? ""}`;
  if (seen.has(key)) continue; seen.add(key);
  const n = rows.filter((x) => x.verdict === r.verdict && x.pid === r.pid).length;
  console.log(`[${r.verdict}] pid=${r.pid} code=${r.code} "${r.name}" x${n}${r.repointTo ? ` -> REPOINT ${r.repointTo} (pid ${r.repointPid})` : ""}  ${r.note}`);
}
console.log("");
console.log("ROLL-UP handoff_processes ids (mechanical re-point):");
for (const r of rows.filter((x) => x.verdict === "ROLL-UP")) console.log(`  hp=${r.hpId} pid ${r.pid}->${r.repointPid} (${r.code}->${r.repointTo}) event=${r.event} target=${r.target}`);
