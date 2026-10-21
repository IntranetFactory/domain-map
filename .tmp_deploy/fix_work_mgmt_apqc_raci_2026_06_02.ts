#!/usr/bin/env bun
// WORK-MGMT (domain 135) — APQC tagging (H1) + process_raci/lifecycle wiring (E4).
// Idempotent. All handoff_processes rows: proposal_source='agent_curated',
// role='implements', record_status default 'new' (Rule #1). No notes (Rule #15).

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  if ((await proc.exited) !== 0) throw new Error(`semantius failed: ${stderr}\nbody=${JSON.stringify(body)}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += 50) out.push(...(await call({ method: "POST", path, body: rows.slice(i, i + 50) })));
  return out;
}

// ---- APQC tagging (H1) ----
const TAGS: { handoff_id: number; process_id: number }[] = [
  { handoff_id: 176, process_id: 411 },
  { handoff_id: 177, process_id: 411 },
  { handoff_id: 179, process_id: 411 },
  { handoff_id: 1325, process_id: 411 },
  { handoff_id: 1327, process_id: 411 },
  { handoff_id: 1024, process_id: 411 },
  { handoff_id: 178, process_id: 98 },
  { handoff_id: 1323, process_id: 98 },
  { handoff_id: 1326, process_id: 98 },
  { handoff_id: 1320, process_id: 225 },
  { handoff_id: 1321, process_id: 225 },
  { handoff_id: 1324, process_id: 506 },
  { handoff_id: 240, process_id: 409 },
  { handoff_id: 244, process_id: 409 },
  { handoff_id: 796, process_id: 409 },
  { handoff_id: 1008, process_id: 1262 },
  { handoff_id: 1012, process_id: 625 },
  { handoff_id: 1017, process_id: 180 },
  { handoff_id: 1249, process_id: 917 },
  { handoff_id: 175, process_id: 147 },
];

async function apqc() {
  console.log("\n=== APQC tagging (H1) ===");
  const hIds = [...new Set(TAGS.map(t => t.handoff_id))].join(",");
  const existing = await get(`/handoff_processes?handoff_id=in.(${hIds})&select=handoff_id,process_id`);
  const have = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const rows = TAGS.filter(t => !have.has(`${t.handoff_id}|${t.process_id}`)).map(t => ({
    handoff_id: t.handoff_id, process_id: t.process_id, role: "implements", proposal_source: "agent_curated",
  }));
  await insert("/handoff_processes", rows);
  console.log(`  handoff_processes: ${rows.length} inserted (${existing.length} of these pairs already present)`);
}

// ---- process_raci + lifecycle process_id wiring (E4) ----
// role ids: 12 PROGRAM-LEAD, 13 CONTRIBUTOR, 14 CAMPAIGN-MGR, 15 OKR-OWNER
const RACI: { process_id: number; raci: string; actor_role_id: number }[] = [
  { process_id: 411, raci: "responsible", actor_role_id: 13 },
  { process_id: 411, raci: "accountable", actor_role_id: 12 },
  { process_id: 98, raci: "responsible", actor_role_id: 15 },
  { process_id: 98, raci: "accountable", actor_role_id: 15 },
];
// lifecycle gate -> process wiring (data_object_id, state_name, domain_module_id, process_id)
const GATE_WIRING: { data_object_id: number; state_name: string; domain_module_id: number; process_id: number }[] = [
  { data_object_id: 244, state_name: "completed", domain_module_id: 149, process_id: 411 },
  { data_object_id: 243, state_name: "cancelled", domain_module_id: 149, process_id: 411 },
  { data_object_id: 245, state_name: "committed", domain_module_id: 150, process_id: 98 },
  { data_object_id: 245, state_name: "scored", domain_module_id: 150, process_id: 98 },
];

async function raci() {
  console.log("\n=== process_raci + lifecycle process_id wiring (E4) ===");
  // RACI rows (idempotent on (process_id, raci, actor_role_id))
  const procIds = [...new Set(RACI.map(r => r.process_id))].join(",");
  const existRaci = await get(`/process_raci?process_id=in.(${procIds})&select=process_id,raci,actor_role_id`);
  const haveRaci = new Set(existRaci.map(r => `${r.process_id}|${r.raci}|${r.actor_role_id}`));
  const raciRows = RACI.filter(r => !haveRaci.has(`${r.process_id}|${r.raci}|${r.actor_role_id}`)).map(r => ({
    process_id: r.process_id, raci: r.raci, actor_role_id: r.actor_role_id,
  }));
  await insert("/process_raci", raciRows);
  console.log(`  process_raci: ${raciRows.length} inserted (${existRaci.length} already present for these processes)`);

  // wire lifecycle gates to processes (PATCH where process_id is null)
  let wired = 0;
  for (const g of GATE_WIRING) {
    const cur = await get(`/data_object_lifecycle_states?data_object_id=eq.${g.data_object_id}&state_name=eq.${g.state_name}&domain_module_id=eq.${g.domain_module_id}&select=id,process_id`);
    if (!cur.length) { console.log(`  WARN: no lifecycle row for ${g.data_object_id}/${g.state_name}/mod${g.domain_module_id}`); continue; }
    for (const row of cur) {
      if (row.process_id === g.process_id) continue;
      await call({ method: "PATCH", path: `/data_object_lifecycle_states?id=eq.${row.id}`, body: { process_id: g.process_id } });
      wired++;
    }
  }
  console.log(`  lifecycle process_id: ${wired} gates wired`);
}

await apqc();
await raci();
console.log("\n=== DONE. UI: https://tests.semantius.app/domain_map/handoff_processes ===");
