// Read-only analysis: rank non-reviewed domains by how many OTHER domains depend on them.
// "Blocking" signal = cross-domain handoffs (source publishes -> target consumes, so target
// depends on source; the source domain blocks the target). Self-loops (intra-domain) are
// excluded since they don't block another domain. We also pull the structural master
// dependency (domain_data_objects: a consumer/embedded_master/contributor/derived row in
// domain Y on a data_object mastered by domain X => X blocks Y) as a complementary signal.

async function pg(path: string): Promise<any> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "GET", path })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius failed (${proc.exitCode}) for ${path}\n${err}\n${out}`);
  }
  return JSON.parse(out);
}

type Domain = { id: number; domain_code: string; domain_name: string; record_status: string };

const domains: Domain[] = await pg("/domains?select=id,domain_code,domain_name,record_status&limit=10000");
const byId = new Map<number, Domain>(domains.map((d) => [d.id, d]));
const REVIEWED = new Set(["approved", "rejected"]);

// ---- Signal 2: cross-domain handoffs ----
const handoffs: { source_domain_id: number; target_domain_id: number }[] = await pg(
  "/handoffs?select=source_domain_id,target_domain_id&limit=100000",
);

// blocks: source -> set of distinct target domains (excluding self, excluding null)
const handoffBlocks = new Map<number, Set<number>>();
let crossDomainEdges = 0;
for (const h of handoffs) {
  const s = h.source_domain_id;
  const t = h.target_domain_id;
  if (s == null || t == null || s === t) continue;
  crossDomainEdges++;
  if (!handoffBlocks.has(s)) handoffBlocks.set(s, new Set());
  handoffBlocks.get(s)!.add(t);
}

// ---- Signal 1b: structural master dependency via domain_data_objects ----
// X masters data_object D; Y has a non-master role on D => X blocks Y.
const ddo: { domain_id: number; data_object_id: number; role: string }[] = await pg(
  "/domain_data_objects?select=domain_id,data_object_id,role&limit=100000",
);
const mastersOf = new Map<number, Set<number>>(); // data_object_id -> set of master domain ids
const dependentsOf = new Map<number, Set<number>>(); // data_object_id -> set of dependent domain ids
for (const r of ddo) {
  if (r.role === "master") {
    if (!mastersOf.has(r.data_object_id)) mastersOf.set(r.data_object_id, new Set());
    mastersOf.get(r.data_object_id)!.add(r.domain_id);
  } else {
    if (!dependentsOf.has(r.data_object_id)) dependentsOf.set(r.data_object_id, new Set());
    dependentsOf.get(r.data_object_id)!.add(r.domain_id);
  }
}
const structBlocks = new Map<number, Set<number>>(); // master domain -> set of dependent domains
for (const [doId, masters] of mastersOf) {
  const deps = dependentsOf.get(doId);
  if (!deps) continue;
  for (const m of masters) {
    for (const y of deps) {
      if (y === m) continue;
      if (!structBlocks.has(m)) structBlocks.set(m, new Set());
      structBlocks.get(m)!.add(y);
    }
  }
}

// ---- Combined "blocks" set per domain (union of both signals) ----
const combined = new Map<number, Set<number>>();
for (const [src, set] of handoffBlocks) {
  if (!combined.has(src)) combined.set(src, new Set());
  for (const t of set) combined.get(src)!.add(t);
}
for (const [src, set] of structBlocks) {
  if (!combined.has(src)) combined.set(src, new Set());
  for (const t of set) combined.get(src)!.add(t);
}

// ---- Rank: only non-reviewed blockers, by combined blocked count desc ----
type Row = { d: Domain; ho: number; st: number; comb: number };
const rows: Row[] = [];
for (const d of domains) {
  if (REVIEWED.has(d.record_status)) continue; // only non-reviewed blockers
  const ho = handoffBlocks.get(d.id)?.size ?? 0;
  const st = structBlocks.get(d.id)?.size ?? 0;
  const comb = combined.get(d.id)?.size ?? 0;
  if (comb === 0) continue; // not blocking anyone
  rows.push({ d, ho, st, comb });
}
rows.sort((a, b) => b.comb - a.comb || b.ho - a.ho || a.d.domain_code.localeCompare(b.d.domain_code));

console.log(`Total domains: ${domains.length}`);
const statusCounts: Record<string, number> = {};
for (const d of domains) statusCounts[d.record_status] = (statusCounts[d.record_status] || 0) + 1;
console.log(`record_status distribution: ${JSON.stringify(statusCounts)}`);
console.log(`Cross-domain handoff edges (excl. self-loops): ${crossDomainEdges}`);
console.log(`Non-reviewed domains that block >=1 other domain: ${rows.length}\n`);

console.log("rank\tcode\tcombined\thandoff\tstruct\tname");
rows.forEach((r, i) => {
  console.log(
    `${i + 1}\t${r.d.domain_code}\t${r.comb}\t${r.ho}\t${r.st}\t${r.d.domain_name}`,
  );
});

// Emit a compact JSON the agent can format from
await Bun.write(
  ".tmp_deploy/blocking_domains_result.json",
  JSON.stringify(
    rows.map((r) => ({
      domain_code: r.d.domain_code,
      domain_name: r.d.domain_name,
      record_status: r.d.record_status,
      blocked_combined: r.comb,
      blocked_via_handoffs: r.ho,
      blocked_via_master_dep: r.st,
    })),
    null,
    2,
  ),
);
