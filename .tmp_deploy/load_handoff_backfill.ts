// Consolidating loader for the handoff backfill (P1.5 follow-up).
//
// Reads cluster JSON files at c:/tmp/p15b_cluster_*.json, validates against schema,
// resolves names to ids against live state, and idempotently inserts:
//   - trigger_events rows (new event names only)
//   - cross_domain_handoffs rows (new (source, target, data_object, trigger_event) 4-tuples only)
//
// CLI:
//   bun run .tmp_deploy/load_handoff_backfill.ts            # dry-run
//   bun run .tmp_deploy/load_handoff_backfill.ts --apply    # apply

const APPLY = process.argv.includes("--apply");
const CHUNK = 50;
import fs from "fs";

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`semantius failed (${p.exitCode}): ${err}`);
  return JSON.parse(out);
}
const get = (path: string) => call({ method: "GET", path });
async function insertChunked(path: string, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`[dry-run] POST ${path}  rows=${rows.length}`); return []; }
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const r = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...(r ?? []));
  }
  return out;
}

// ---- Read cluster files ----

const CLUSTER_IDS = ["A","B","C","D","E","F","G","H","I","J1","J2","K1","K2"];
type TE = { event_name: string; data_object_name: string; category: string; description: string };
type Handoff = { source_domain_code: string; target_domain_code: string; data_object_name: string; trigger_event_name: string; friction_level: string; integration_pattern: string; description: string };
type ClusterFile = { cluster_id: string; trigger_events: TE[]; cross_domain_handoffs: Handoff[] };

const ALLOWED_CATEGORIES = new Set(["lifecycle","state_change","threshold","signal"]);
const ALLOWED_FRICTION = new Set(["high","medium","low"]);
// DB enum: event_stream, api_call, batch_sync, manual_handoff, file_drop
const ALLOWED_PATTERNS = new Set(["event_stream","api_call","batch_sync","manual_handoff","file_drop"]);
const PATTERN_ALIASES: Record<string, string> = { webhook: "api_call", file_export: "file_drop" };

const clusters: ClusterFile[] = [];
const missing: string[] = [];
for (const cid of CLUSTER_IDS) {
  const path = `c:/tmp/p15b_cluster_${cid}.json`;
  if (!fs.existsSync(path)) { missing.push(cid); continue; }
  const raw = fs.readFileSync(path, "utf8");
  let parsed: ClusterFile;
  try { parsed = JSON.parse(raw); } catch (e: any) { throw new Error(`cluster ${cid} JSON parse error: ${e.message}`); }
  if (!parsed.trigger_events || !Array.isArray(parsed.trigger_events)) throw new Error(`cluster ${cid}: missing trigger_events`);
  if (!parsed.cross_domain_handoffs || !Array.isArray(parsed.cross_domain_handoffs)) throw new Error(`cluster ${cid}: missing cross_domain_handoffs`);
  clusters.push(parsed);
}

console.log(`=== Loaded ${clusters.length}/${CLUSTER_IDS.length} cluster files ===`);
if (missing.length) console.log(`Missing: ${missing.join(", ")}`);
const totalTE = clusters.reduce((s, c) => s + c.trigger_events.length, 0);
const totalHO = clusters.reduce((s, c) => s + c.cross_domain_handoffs.length, 0);
console.log(`Inputs: ${totalTE} trigger_events, ${totalHO} cross_domain_handoffs`);

// ---- Resolve live state ----

const [domains, dos, existingTE, existingHO] = await Promise.all([
  get(`/domains?select=id,domain_code&limit=10000`),
  get(`/data_objects?select=id,data_object_name&limit=10000`),
  get(`/trigger_events?select=id,event_name,data_object_id&limit=10000`),
  get(`/cross_domain_handoffs?select=id,source_domain_id,target_domain_id,data_object_id,trigger_event_id&limit=10000`),
]);

const domainId = new Map<string, number>((domains as any[]).map(d => [d.domain_code, d.id]));
const doId = new Map<string, number>((dos as any[]).map(d => [d.data_object_name, d.id]));
const teByName = new Map<string, { id: number; data_object_id: number }>((existingTE as any[]).map(t => [t.event_name, { id: t.id, data_object_id: t.data_object_id }]));
const hoKey = (s: number, t: number, d: number, te: number) => `${s}:${t}:${d}:${te}`;
const existingHOSet = new Set((existingHO as any[]).map(h => hoKey(h.source_domain_id, h.target_domain_id, h.data_object_id, h.trigger_event_id)));

// ---- Validate + dedupe ----

type ValidatedTE = TE & { data_object_id: number };
const planTE: ValidatedTE[] = [];
const seenEventNames = new Set<string>();
const validationErrors: string[] = [];

for (const c of clusters) {
  for (const t of c.trigger_events) {
    if (seenEventNames.has(t.event_name)) continue; // dedupe within batch
    seenEventNames.add(t.event_name);
    if (teByName.has(t.event_name)) continue; // already in catalog
    if (!ALLOWED_CATEGORIES.has(t.category)) { validationErrors.push(`[${c.cluster_id}] bad category '${t.category}' on event ${t.event_name} — normalising to 'signal'`); t.category = "signal"; }
    const doid = doId.get(t.data_object_name);
    if (doid == null) { validationErrors.push(`[${c.cluster_id}] trigger_events.${t.event_name}: data_object '${t.data_object_name}' not in catalog — SKIPPED`); continue; }
    planTE.push({ ...t, data_object_id: doid });
  }
}

console.log(`\n=== trigger_events plan ===`);
console.log(`  proposed: ${planTE.length} new (after dedupe + catalog match)`);
if (validationErrors.length) {
  console.log(`  validation warnings: ${validationErrors.length}`);
  for (const e of validationErrors.slice(0, 15)) console.log(`    ${e}`);
  if (validationErrors.length > 15) console.log(`    ... +${validationErrors.length - 15} more`);
}

// Insert trigger_events
const teRowsToInsert = planTE.map(t => ({
  event_name: t.event_name,
  data_object_id: t.data_object_id,
  description: t.description,
}));
console.log(`\n>>> Inserting ${teRowsToInsert.length} new trigger_events`);
await insertChunked("/trigger_events", teRowsToInsert);

// Refresh teByName for handoff resolution
let teResolved = teByName;
if (APPLY) {
  const fresh = await get(`/trigger_events?select=id,event_name,data_object_id&limit=10000`);
  teResolved = new Map((fresh as any[]).map(t => [t.event_name, { id: t.id, data_object_id: t.data_object_id }]));
}

// ---- Handoff plan ----

type HandoffRow = { source_domain_id: number; target_domain_id: number; data_object_id: number; trigger_event_id: number; friction_level: string; integration_pattern: string; description: string };
const planHO: HandoffRow[] = [];
const handoffErrors: string[] = [];
const seenHOKeys = new Set<string>();

for (const c of clusters) {
  for (const h of c.cross_domain_handoffs) {
    if (h.source_domain_code === h.target_domain_code) { handoffErrors.push(`[${c.cluster_id}] self-handoff ${h.source_domain_code} on ${h.trigger_event_name} — SKIPPED`); continue; }
    const sid = domainId.get(h.source_domain_code);
    const tid = domainId.get(h.target_domain_code);
    if (sid == null) { handoffErrors.push(`[${c.cluster_id}] unknown source_domain_code '${h.source_domain_code}' — SKIPPED`); continue; }
    if (tid == null) { handoffErrors.push(`[${c.cluster_id}] unknown target_domain_code '${h.target_domain_code}' — SKIPPED`); continue; }
    const doid = doId.get(h.data_object_name);
    if (doid == null) { handoffErrors.push(`[${c.cluster_id}] handoff data_object '${h.data_object_name}' not in catalog — SKIPPED`); continue; }
    const te = teResolved.get(h.trigger_event_name);
    if (te == null) {
      if (APPLY) { handoffErrors.push(`[${c.cluster_id}] handoff trigger_event '${h.trigger_event_name}' not resolvable — SKIPPED`); continue; }
      // dry-run: can't resolve new TEs yet
      continue;
    }
    let friction = h.friction_level;
    if (!ALLOWED_FRICTION.has(friction)) { handoffErrors.push(`[${c.cluster_id}] bad friction '${friction}' — normalising to 'medium'`); friction = "medium"; }
    let pattern = h.integration_pattern;
    if (PATTERN_ALIASES[pattern]) pattern = PATTERN_ALIASES[pattern];
    if (!ALLOWED_PATTERNS.has(pattern)) { handoffErrors.push(`[${c.cluster_id}] bad pattern '${h.integration_pattern}' — normalising to 'api_call'`); pattern = "api_call"; }
    const key = hoKey(sid, tid, doid, te.id);
    if (existingHOSet.has(key)) continue; // already exists
    if (seenHOKeys.has(key)) continue; // dedupe within batch
    seenHOKeys.add(key);
    planHO.push({ source_domain_id: sid, target_domain_id: tid, data_object_id: doid, trigger_event_id: te.id, friction_level: friction, integration_pattern: pattern, description: h.description });
  }
}

console.log(`\n=== cross_domain_handoffs plan ===`);
console.log(`  proposed: ${planHO.length} new`);
if (handoffErrors.length) {
  console.log(`  validation warnings: ${handoffErrors.length}`);
  for (const e of handoffErrors.slice(0, 20)) console.log(`    ${e}`);
  if (handoffErrors.length > 20) console.log(`    ... +${handoffErrors.length - 20} more`);
}

console.log(`\n>>> Inserting ${planHO.length} new cross_domain_handoffs`);
await insertChunked("/cross_domain_handoffs", planHO);

console.log(`\nMode: ${APPLY ? "APPLY (writes done)" : "DRY-RUN (no writes)"}`);
console.log(`Summary:`);
console.log(`  Cluster files loaded:        ${clusters.length}/10`);
console.log(`  New trigger_events:          ${teRowsToInsert.length}`);
console.log(`  New cross_domain_handoffs:   ${planHO.length}`);
console.log(`  Validation warnings:         ${validationErrors.length + handoffErrors.length}`);
