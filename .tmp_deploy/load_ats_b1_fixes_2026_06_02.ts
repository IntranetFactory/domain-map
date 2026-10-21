#!/usr/bin/env bun
/**
 * load_ats_b1_fixes_2026_06_02.ts — ATS Bucket-1 audit fixes (user-approved "b1 all").
 *  Phase H: 37 handoff_processes APQC tags (proposal_source='agent_curated', role='implements', record_status default 'new').
 *  Phase B7: 22 data_object_relationships user edges to users (#748), matching ATS convention
 *            (relationship_kind='reference', relationship_type='many_to_many', owner_side='source').
 * Reads the verified draft JSON from c:/tmp. Idempotent. record_status omitted -> DB default 'new' (Rule #1).
 */
export {};

const USERS_ID = 748;

async function call(method: string, path: string, body?: unknown): Promise<any[]> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe", stderr: "pipe",
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`${method} ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out.trim()) : [];
}
const get = (p: string) => call("GET", p);
async function post(path: string, rows: any[]): Promise<number> {
  let n = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const slice = rows.slice(i, i + 50);
    const res = await call("POST", path, slice);
    n += Array.isArray(res) ? res.length : slice.length;
  }
  return n;
}

// ---------- Phase H: APQC handoff_processes ----------
const apqc = JSON.parse(await Bun.file("c:/tmp/ats-apqc-tags-2026-06-02.json").text())
  .filter((r: any) => r.process_id != null); // drop the 1 deferred (predictive_model.scored)

const apqcHandoffIds = [...new Set(apqc.map((r: any) => r.handoff_id))];
const existingHP = await get(`/handoff_processes?handoff_id=in.(${apqcHandoffIds.join(",")})&select=handoff_id,process_id`);
const hpSeen = new Set(existingHP.map((r: any) => `${r.handoff_id}|${r.process_id}`));
const hpRows = apqc
  .filter((r: any) => !hpSeen.has(`${r.handoff_id}|${r.process_id}`))
  .map((r: any) => ({ handoff_id: r.handoff_id, process_id: r.process_id, role: "implements", proposal_source: "agent_curated" }));

console.log(`Phase H (APQC): ${apqc.length} draft tags, ${hpRows.length} new to insert (${apqc.length - hpRows.length} already present)`);
const hpInserted = hpRows.length ? await post("/handoff_processes", hpRows) : 0;
console.log(`  inserted ${hpInserted} handoff_processes rows`);

// ---------- Phase B7: data_object_relationships user edges ----------
const inverseByRole: Record<string, string> = {
  approver: "approves", author: "authors", adjudicator: "adjudicates",
  recruiter: "engages", owner: "owns",
};
const edges = JSON.parse(await Bun.file("c:/tmp/ats-b7-user-edges-2026-06-02.json").text()).proposed_edges;
const edgeIds = edges.map((e: any) => e.data_object_id);
const existingEdges = await get(`/data_object_relationships?related_data_object_id=eq.${USERS_ID}&data_object_id=in.(${edgeIds.join(",")})&select=data_object_id`);
const edgeSeen = new Set(existingEdges.map((r: any) => Number(r.data_object_id)));
const edgeRows = edges
  .filter((e: any) => !edgeSeen.has(Number(e.data_object_id)))
  .map((e: any) => ({
    data_object_id: e.data_object_id,
    related_data_object_id: USERS_ID,
    relationship_verb: e.relationship_verb,                       // "has <role>"
    inverse_verb: inverseByRole[e.actor_role] ?? `${e.actor_role}s`,
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    is_required: e.is_required,
    owner_side: "source",
  }));

console.log(`\nPhase B7 (user edges): ${edges.length} draft edges, ${edgeRows.length} new to insert (${edges.length - edgeRows.length} already present)`);
const edgeInserted = edgeRows.length ? await post("/data_object_relationships", edgeRows) : 0;
console.log(`  inserted ${edgeInserted} data_object_relationships rows`);

console.log(`\nDONE. APQC tags +${hpInserted}, user edges +${edgeInserted}.`);
console.log(`UI: https://tests.semantius.app/domain_map/handoff_processes`);
console.log(`UI: https://tests.semantius.app/domain_map/data_object_relationships`);
