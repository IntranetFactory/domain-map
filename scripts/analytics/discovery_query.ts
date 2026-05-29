// Discovery query — process-skill candidate ranker.
//
// Implements the procedure from plan-process-skill-discovery.md § Discovery procedure.
// Primary signal: trigger-event prefix.
//
// CLI:
//   bun run .tmp_deploy/discovery_query.ts            # full ranked table
//   bun run .tmp_deploy/discovery_query.ts --top 20   # top N only
//   bun run .tmp_deploy/discovery_query.ts --json     # JSON dump for downstream tools
//   bun run .tmp_deploy/discovery_query.ts --bucket <prefix>   # detail for one bucket
//   bun run .tmp_deploy/discovery_query.ts --persist  # also write proposed handoff_processes
//                                                     # rows (record_status='new') per
//                                                     # plan-handoff-processes.md §5.

const args = process.argv.slice(2);
const TOP = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : Infinity;
const JSON_OUT = args.includes("--json");
const BUCKET_FILTER = args.includes("--bucket") ? args[args.indexOf("--bucket") + 1] : null;
const PERSIST = args.includes("--persist");

async function call(body: any): Promise<any[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(body));
  await p.stdin.end();
  const out = await new Response(p.stdout).text();
  await p.exited;
  return JSON.parse(out);
}
const get = (path: string) => call({ method: "GET", path });
const post = (path: string, body: any) => call({ method: "POST", path, body });

const [handoffs, triggers, domains, dos, bfd, functions, pcf] = await Promise.all([
  get(`/handoffs?select=id,source_domain_id,target_domain_id,data_object_id,trigger_event_id,friction_level&limit=10000`),
  get(`/trigger_events?select=id,event_name,data_object_id&limit=10000`),
  get(`/domains?select=id,domain_code,domain_name&limit=10000`),
  get(`/data_objects?select=id,data_object_name&limit=10000`),
  get(`/business_function_domains?select=business_function_id,domain_id&limit=10000`),
  get(`/business_functions?select=id,business_function_name&limit=200`),
  get(`/processes?source_framework=eq.apqc_pcf_cross_industry&select=id,process_name,external_id,hierarchy_level&limit=10000`),
]);

const triggerById = new Map<number, { event_name: string; data_object_id: number }>(
  triggers.map((t: any) => [t.id, t]),
);
const domainById = new Map<number, { domain_code: string; domain_name: string }>(
  domains.map((d: any) => [d.id, d]),
);
const doNameById = new Map<number, string>(dos.map((d: any) => [d.id, d.data_object_name]));
const functionById = new Map<number, string>(functions.map((f: any) => [f.id, f.business_function_name]));
const functionsByDomain = new Map<number, Set<number>>();
for (const r of bfd) {
  const arr = functionsByDomain.get(r.domain_id) ?? new Set();
  arr.add(r.business_function_id);
  functionsByDomain.set(r.domain_id, arr);
}
// PCF lookup by lowercased process_name + by stripped variant
const pcfByLowerName = new Map<string, any>();
for (const p of pcf) {
  pcfByLowerName.set(p.process_name.toLowerCase().trim(), p);
}

const FRICTION_SCORE: Record<string, number> = { high: 3, medium: 2, low: 1 };

// ---- Bucket handoffs by trigger-event prefix ----
type Bucket = {
  prefix: string;
  handoff_ids: number[];
  trigger_event_ids: Set<number>;
  domain_ids: Set<number>;
  function_ids: Set<number>;
  friction_score: number;
  friction_high_count: number;
  data_object_ids: Set<number>;
  trigger_event_counts: Map<string, number>;
};
const buckets = new Map<string, Bucket>();

for (const h of handoffs) {
  const t = triggerById.get(h.trigger_event_id);
  if (!t) continue;
  const prefix = t.event_name.split(".")[0];
  let b = buckets.get(prefix);
  if (!b) {
    b = {
      prefix,
      handoff_ids: [],
      trigger_event_ids: new Set(),
      domain_ids: new Set(),
      function_ids: new Set(),
      friction_score: 0,
      friction_high_count: 0,
      data_object_ids: new Set(),
      trigger_event_counts: new Map(),
    };
    buckets.set(prefix, b);
  }
  b.handoff_ids.push(h.id);
  b.trigger_event_ids.add(h.trigger_event_id);
  b.domain_ids.add(h.source_domain_id);
  b.domain_ids.add(h.target_domain_id);
  b.friction_score += FRICTION_SCORE[h.friction_level] ?? 0;
  if (h.friction_level === "high") b.friction_high_count++;
  if (h.data_object_id != null) b.data_object_ids.add(h.data_object_id);
  for (const di of [h.source_domain_id, h.target_domain_id]) {
    const fns = functionsByDomain.get(di);
    if (fns) for (const f of fns) b.function_ids.add(f);
  }
  b.trigger_event_counts.set(t.event_name, (b.trigger_event_counts.get(t.event_name) ?? 0) + 1);
}

// ---- Rank ----
type Row = {
  prefix: string;
  process_name_guess: string;
  apqc_pcf_id: string | null;
  apqc_pcf_name: string | null;
  apqc_hierarchy_level: number | null;
  handoff_count: number;
  domain_count: number;
  function_count: number;
  friction_score: number;
  friction_high_count: number;
  rank_score: number;
  top_events: { event_name: string; count: number }[];
  domains: string[];
  functions: string[];
  meets_success_criteria: boolean;
};

// Manually curated PCF overrides for top discovery buckets (subagent semantic review 2026-05-22).
// Keys are trigger-event prefixes. Values are { external_id, name, level } from /processes.
// Set value to null to force "no PCF match — promote to CUSTOM-*".
const PCF_OVERRIDES: Record<string, { ext: string; name: string; lvl: number } | null> = {
  employee:               { ext: "20599", name: "Manage employee onboarding, training, and development", lvl: 2 },
  opportunity:            { ext: "10182", name: "Manage leads/opportunities", lvl: 3 },
  task:                   { ext: "10469", name: "Manage employee onboarding", lvl: 3 },
  case:                   { ext: "10388", name: "Manage customer service problems, requests, and inquiries", lvl: 3 },
  order:                  { ext: "10185", name: "Manage sales orders", lvl: 3 },
  contract:               { ext: "10291", name: "Manage contracts", lvl: 3 },
  alert:                  { ext: "20742", name: "Monitor/analyze network intrusion detection data and resolve threats", lvl: 4 },
  payment:                { ext: "10862", name: "Process and distribute payments", lvl: 4 },
  supplier:               { ext: "10280", name: "Manage suppliers", lvl: 3 },
  subscription:           null, // no PCF match — CUSTOM-SUBSCRIPTION-LIFECYCLE
  offer:                  { ext: "10463", name: "Draw up and make offer", lvl: 4 },
  card_transaction:       null, // no PCF match — CUSTOM-CARD-TRANSACTION
  customer_golden_record: null, // no PCF match — CUSTOM-CUSTOMER-GOLDEN-RECORD
  dlp_incident:           null, // no PCF match — CUSTOM-DLP-INCIDENT
  data_asset:             null, // no PCF match — CUSTOM-DATA-ASSET
};

function guessPcfMatch(prefix: string): { id: number | null; name: string | null; ext: string | null; lvl: number | null } {
  if (prefix in PCF_OVERRIDES) {
    const o = PCF_OVERRIDES[prefix];
    if (o === null) return { id: null, name: null, ext: null, lvl: null };
    return { id: null, name: o.name, ext: o.ext, lvl: o.lvl };
  }
  const stripped = prefix.replace(/_/g, " ");
  for (const variant of [stripped, `${stripped}s`, `manage ${stripped}s`, `manage ${stripped}`, `${stripped} management`, `${stripped} lifecycle`]) {
    const m = pcfByLowerName.get(variant.toLowerCase().trim());
    if (m) return { id: m.id, name: m.process_name, ext: m.external_id, lvl: m.hierarchy_level };
  }
  // Substring fallback — find the lowest-hierarchy-level PCF row whose name contains the prefix (or vice versa)
  let best: any = null;
  for (const p of pcf) {
    const lower = p.process_name.toLowerCase();
    if (lower.includes(stripped) || stripped.includes(lower)) {
      if (!best || p.hierarchy_level < best.hierarchy_level) best = p;
    }
  }
  if (best) return { id: best.id, name: best.process_name, ext: best.external_id, lvl: best.hierarchy_level };
  return { id: null, name: null, ext: null, lvl: null };
}

const rows: Row[] = [];
for (const b of buckets.values()) {
  const pcfMatch = guessPcfMatch(b.prefix);
  const topEvents = [...b.trigger_event_counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([event_name, count]) => ({ event_name, count }));
  const row: Row = {
    prefix: b.prefix,
    process_name_guess: pcfMatch.name ?? `CUSTOM-${b.prefix.toUpperCase().replace(/_/g, "-")}`,
    apqc_pcf_id: pcfMatch.ext,
    apqc_pcf_name: pcfMatch.name,
    apqc_hierarchy_level: pcfMatch.lvl,
    handoff_count: b.handoff_ids.length,
    domain_count: b.domain_ids.size,
    function_count: b.function_ids.size,
    friction_score: b.friction_score,
    friction_high_count: b.friction_high_count,
    rank_score: b.friction_score * b.function_ids.size,
    top_events: topEvents,
    domains: [...b.domain_ids].map(id => domainById.get(id)?.domain_code ?? `?#${id}`).sort(),
    functions: [...b.function_ids].map(id => functionById.get(id) ?? `?#${id}`).sort(),
    meets_success_criteria:
      b.domain_ids.size >= 3 &&
      b.function_ids.size >= 3 &&
      b.handoff_ids.length >= 4 &&
      b.friction_high_count >= 1,
  };
  rows.push(row);
}

rows.sort((a, b) => b.rank_score - a.rank_score);

if (BUCKET_FILTER) {
  const r = rows.find(r => r.prefix === BUCKET_FILTER);
  if (!r) { console.error(`Bucket '${BUCKET_FILTER}' not found.`); process.exit(1); }
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}

if (JSON_OUT) {
  console.log(JSON.stringify(rows.slice(0, TOP === Infinity ? undefined : TOP), null, 2));
  process.exit(0);
}

// Human table
console.log(`Discovery query — ${rows.length} candidate buckets from ${handoffs.length} handoffs / ${triggers.length} trigger_events`);
console.log(`Success criteria (top 3): ≥3 domains, ≥3 functions, ≥4 handoffs, ≥1 high-friction\n`);
console.log("rank  prefix                     score   h   d   f  highF  PCF match (level / id)                                 process_name");
console.log("─".repeat(160));
let n = 0;
for (const r of rows) {
  if (++n > TOP) break;
  const ok = r.meets_success_criteria ? "✓" : " ";
  const pcfStr = r.apqc_pcf_name
    ? `L${r.apqc_hierarchy_level} ${r.apqc_pcf_id} ${r.apqc_pcf_name.slice(0, 40)}`
    : "(unmatched — CUSTOM)";
  console.log(
    `${ok} ${String(n).padStart(3)}  ${r.prefix.padEnd(26)} ${String(r.rank_score).padStart(5)}  ${String(r.handoff_count).padStart(3)} ${String(r.domain_count).padStart(3)} ${String(r.function_count).padStart(3)} ${String(r.friction_high_count).padStart(5)}  ${pcfStr.padEnd(55)} ${r.process_name_guess.slice(0, 40)}`,
  );
}

const meets = rows.filter(r => r.meets_success_criteria).length;
console.log(`\n${meets} buckets meet all four success criteria (≥3 domains, ≥3 functions, ≥4 handoffs, ≥1 high-friction).`);
console.log(`${rows.length} buckets total. Use --bucket <prefix> for detailed drill-down on any row.`);

// ---- Persist handoff_processes (opt-in, plan-handoff-processes.md §5) ----
// Fan out each matched bucket's PCF process across every handoff in the bucket.
// Skip buckets where the matcher returns no PCF (CUSTOM-* and unmatched).
// Skip pairs whose key already exists in handoff_processes (sticky-rejection contract).
if (PERSIST) {
  console.log(`\n--- Persistence pass (handoff_processes) ---`);

  // Resolve process_id from external_id for PCF_OVERRIDES (which only carry ext, not id).
  const pcfByExt = new Map<string, any>();
  for (const p of pcf) pcfByExt.set(String(p.external_id), p);

  // Load existing handoff_processes keys upfront.
  const existing = await get(`/handoff_processes?select=key&limit=100000`);
  const existingKeys = new Set<string>(existing.map((r: any) => String(r.key)));
  console.log(`  ${existingKeys.size} handoff_processes rows already in place`);

  // Build candidate (handoff_id, process_id, proposal_source) tuples.
  // proposal_source distinguishes curated PCF_OVERRIDES hits ('discovery_override') from
  // substring fallback ('discovery_substring'). Phase B authored rows live alongside
  // both with 'human_curated'; this script never writes that value.
  type Candidate = {
    handoff_id: number;
    process_id: number;
    key: string;
    prefix: string;
    proposal_source: "discovery_override" | "discovery_substring";
  };
  const candidates: Candidate[] = [];
  let skippedNoPcf = 0;
  let skippedExisting = 0;
  for (const b of buckets.values()) {
    const m = guessPcfMatch(b.prefix);
    let processId: number | null = m.id;
    let proposalSource: "discovery_override" | "discovery_substring";
    if (b.prefix in PCF_OVERRIDES) {
      // Curated override (null entries already returned m.ext=null, skipped below)
      proposalSource = "discovery_override";
    } else {
      proposalSource = "discovery_substring";
    }
    if (processId == null && m.ext != null) {
      const p = pcfByExt.get(String(m.ext));
      if (p) processId = Number(p.id);
    }
    if (processId == null) {
      skippedNoPcf++;
      continue;
    }
    for (const hid of b.handoff_ids) {
      const key = `${hid}.${processId}`;
      if (existingKeys.has(key)) {
        skippedExisting++;
        continue;
      }
      candidates.push({ handoff_id: hid, process_id: processId, key, prefix: b.prefix, proposal_source: proposalSource });
    }
  }
  console.log(`  ${candidates.length} new (handoff, process) pairs to insert`);
  console.log(`  ${skippedNoPcf} buckets skipped (no PCF match)`);
  console.log(`  ${skippedExisting} pairs skipped (already in handoff_processes regardless of record_status)`);

  if (candidates.length > 0) {
    const CHUNK = 100;
    let inserted = 0;
    for (let i = 0; i < candidates.length; i += CHUNK) {
      const slice = candidates.slice(i, i + CHUNK).map(c => ({
        handoff_id: c.handoff_id,
        process_id: c.process_id,
        role: "implements",
        notes: "",
        record_status: "new",
        proposal_source: c.proposal_source,
      }));
      const result = await post(`/handoff_processes`, slice);
      inserted += result.length;
      if (i % (CHUNK * 5) === 0) console.log(`    ... ${inserted}/${candidates.length}`);
    }
    console.log(`  + inserted ${inserted} rows with record_status='new'`);
  }
  console.log(`\nReview pending rows: https://tests.semantius.app/domain_map/handoff_processes?record_status=eq.new`);
} else {
  console.log(`\n(Pass --persist to write proposed handoff_processes rows.)`);
}
