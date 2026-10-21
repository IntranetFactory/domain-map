// B1A-DDO-ROLLUP: regenerate the legacy domain_data_objects rollup for LMS (domain 57) from the
// domain_module_data_objects junction (strongest-role-wins, required>optional within role).
// Idempotent: inserts missing rows, PATCHes role/necessity drift, never deletes (reports stale).
// Run: bun run "<abs path>"

const DOMAIN_ID = 57;
const MODULES = [32, 33, 34, 178, 179, 180, 181, 182];
const ROLE_RANK: Record<string, number> = {
  master: 5, embedded_master: 4, contributor: 3, consumer: 2, derived: 1,
};

async function pg(method: string, path: string, body?: unknown): Promise<string> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn({
    cmd: ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  const blob = `${out}\n${err}`;
  if (blob.includes("required audience not found")) {
    console.error("JWT-AUDIENCE ERROR (Rule #6) — STOP and surface verbatim:\n" + blob);
    process.exit(2);
  }
  if (proc.exitCode !== 0) throw new Error(`pg ${method} ${path} failed: ${err || out}`);
  return out;
}

type DMDO = { data_object_id: number; role: string; necessity: string };
const dmdo = JSON.parse(
  await pg("GET", `/domain_module_data_objects?domain_module_id=in.(${MODULES.join(",")})&select=data_object_id,role,necessity`),
) as DMDO[];

// strongest role wins; within winning role, required beats optional
const target = new Map<number, { role: string; necessity: string }>();
for (const r of dmdo) {
  const cur = target.get(r.data_object_id);
  if (!cur) { target.set(r.data_object_id, { role: r.role, necessity: r.necessity }); continue; }
  const better = ROLE_RANK[r.role] > ROLE_RANK[cur.role];
  const same = ROLE_RANK[r.role] === ROLE_RANK[cur.role];
  if (better) target.set(r.data_object_id, { role: r.role, necessity: r.necessity });
  else if (same && cur.necessity !== "required" && r.necessity === "required") cur.necessity = "required";
}

type DDO = { data_object_id: number; role: string; necessity: string };
const existing = JSON.parse(
  await pg("GET", `/domain_data_objects?domain_id=eq.${DOMAIN_ID}&select=data_object_id,role,necessity`),
) as DDO[];
const existingMap = new Map(existing.map((r) => [r.data_object_id, r]));

const toInsert: { domain_id: number; data_object_id: number; role: string; necessity: string }[] = [];
const toPatch: { data_object_id: number; role: string; necessity: string }[] = [];
for (const [doId, t] of target) {
  const cur = existingMap.get(doId);
  if (!cur) toInsert.push({ domain_id: DOMAIN_ID, data_object_id: doId, role: t.role, necessity: t.necessity });
  else if (cur.role !== t.role || cur.necessity !== t.necessity) toPatch.push({ data_object_id: doId, ...t });
}
const stale = existing.filter((r) => !target.has(r.data_object_id));

console.log(`DMDO distinct data_objects: ${target.size}`);
console.log(`existing DDO rows: ${existing.length}`);
console.log(`to insert: ${toInsert.length}, to patch: ${toPatch.length}, stale (NOT auto-deleted): ${stale.length}`);
if (stale.length) console.log("stale rows (review manually):", JSON.stringify(stale));

for (let i = 0; i < toInsert.length; i += 50) {
  const chunk = toInsert.slice(i, i + 50);
  await pg("POST", "/domain_data_objects", chunk);
  console.log(`inserted ${chunk.length} (${i + chunk.length}/${toInsert.length})`);
}
for (const p of toPatch) {
  await pg("PATCH", `/domain_data_objects?domain_id=eq.${DOMAIN_ID}&data_object_id=eq.${p.data_object_id}`, { role: p.role, necessity: p.necessity });
  console.log(`patched ${p.data_object_id} -> ${p.role}/${p.necessity}`);
}

const after = JSON.parse(
  await pg("GET", `/domain_data_objects?domain_id=eq.${DOMAIN_ID}&select=data_object_id`),
) as unknown[];
console.log(`OK: domain_data_objects for LMS now ${after.length} rows (was ${existing.length}).`);
