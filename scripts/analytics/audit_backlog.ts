#!/usr/bin/env bun
//
// Audit backlog generator — ranks domains by which per-domain audit checks
// would fail right now, plus per-domain entity counts and pending-question
// counts parsed from existing audit files. Lets a backfill pass prioritize
// "low-hanging fruit": lots of entities already loaded, few open questions.
//
// Read-only. No DB writes, no audit-file writes. Produces:
//   - human-readable table (default), split into two sections:
//       1. AUDITED: has an audits/<CODE>/state.yaml; sorted by entities/questions ratio
//       2. UNAUDITED: no state.yaml; sorted by entity_count descending
//   - --json for downstream orchestration (e.g. parallel subagent dispatch)
//
// Run from project root (semantius reads .env from cwd):
//   bun run scripts/analytics/audit_backlog.ts
//   bun run scripts/analytics/audit_backlog.ts --json
//   bun run scripts/analytics/audit_backlog.ts --top 30
//   bun run scripts/analytics/audit_backlog.ts --section audited
//   bun run scripts/analytics/audit_backlog.ts --section unaudited
//
// Checks (each = 1 point toward priority score):
//   A1  domains business metadata zeroed (crud_pct/min_org_size/cost_band/tam)
//   A2  capability_domains count < 3
//   B1  zero master data_objects (skipped for leadership-tier)
//   C1  zero business_function_domains
//   M1  zero domain_modules
//   F2  any full module (module_kind != 'starter') without domain_module_tools
//   H1  cross-domain handoffs with no handoff_processes rows
//   AUD audits/<DOMAIN_CODE>/state.yaml does not exist
//
// Entity count = master data_objects + capabilities + modules + outbound handoffs
//                + linked solutions. The "catalog footprint" of the domain.
//
// Pending questions = items waiting on the user in audits/<CODE>/state.yaml (schema v2, read
// with js-yaml): every b2 decision plus every b1b blocked on a user decision. bucket2 / bucket3
// are the b2 / b3 item counts. NULL when no state.yaml exists.

import { spawn } from "bun";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import yaml from "js-yaml";

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const SECTION = args.includes("--section") ? args[args.indexOf("--section") + 1] : "both";
const TOP = args.includes("--top") ? Number(args[args.indexOf("--top") + 1]) : Infinity;
const STATUS_FILTER = args.includes("--status") ? args[args.indexOf("--status") + 1] : null;

const AUDITS_DIR = resolve(process.cwd(), "audits");

// Leadership-tier domains have zero masters by design — exempt from B1.
const LEADERSHIP_TIER = new Set([
  "REV-INTEL", "SALES-PERF", "GTM-PLAN", "ACCT-PLAN", "PRM",
  "OP-RES", "BCM", "SECOPS", "SOAR", "THREAT-INTEL",
  "TPRM", "VULN-MGMT", "PRIV-MGMT", "FINOPS",
  "INTRANET", "COLLAB-GOV",
]);

async function get(path: string): Promise<any[]> {
  const proc = spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  proc.stdin.end();
  const stdout = await new Response(proc.stdout).text();
  const exit = await proc.exited;
  if (exit !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`GET ${path} failed (${exit}): ${stderr}`);
  }
  return JSON.parse(stdout);
}

const [domains, modules, capDomains, dmdoMasters, bfd, dmTools, handoffs, handoffProc, solDomains] = await Promise.all([
  get(`/domains?select=id,domain_code,domain_name,crud_percentage,business_logic,min_org_size,cost_band,usa_market_size_usd_m,market_size_source_year&limit=10000`),
  get(`/domain_modules?select=id,domain_id,domain_module_code,module_kind&limit=10000`),
  get(`/capability_domains?select=domain_id,capability_id&limit=10000`),
  // Masters come from the module junction (domain_data_objects retired 2026-06-02); rolled up
  // to domain via the module->domain map below. Un-modularized domains report zero masters (an
  // M1 failure, surfaced as no modules), which is the correct post-retirement signal.
  get(`/domain_module_data_objects?role=eq.master&select=domain_module_id,data_object_id&limit=10000`),
  get(`/business_function_domains?select=domain_id&limit=10000`),
  get(`/domain_module_tools?select=domain_module_id&limit=30000`),
  get(`/handoffs?select=id,source_domain_id,target_domain_id&limit=20000`),
  get(`/handoff_processes?select=handoff_id&limit=20000`),
  get(`/solution_domains?select=domain_id&limit=20000`),
]);

const modulesByDomain = new Map<number, any[]>();
for (const m of modules) {
  const arr = modulesByDomain.get(m.domain_id) ?? [];
  arr.push(m);
  modulesByDomain.set(m.domain_id, arr);
}

const capCountByDomain = new Map<number, number>();
for (const c of capDomains) {
  capCountByDomain.set(c.domain_id, (capCountByDomain.get(c.domain_id) ?? 0) + 1);
}

const moduleToDomain = new Map<number, number>();
for (const m of modules) moduleToDomain.set(m.id, m.domain_id);

const masterCountByDomain = new Map<number, number>();
for (const d of dmdoMasters) {
  const domId = moduleToDomain.get(d.domain_module_id);
  if (domId == null) continue;
  masterCountByDomain.set(domId, (masterCountByDomain.get(domId) ?? 0) + 1);
}

const bfCountByDomain = new Map<number, number>();
for (const r of bfd) {
  bfCountByDomain.set(r.domain_id, (bfCountByDomain.get(r.domain_id) ?? 0) + 1);
}

// Post per-domain-skill migration: tool requirements live on modules (`domain_module_tools`);
// the domain's single `system` skill derives from them. F2 now checks module tool presence.
const modulesWithTools = new Set<number>();
for (const r of dmTools) modulesWithTools.add(r.domain_module_id);

const taggedHandoffs = new Set<number>(handoffProc.map((r: any) => r.handoff_id));
const crossDomainByDomain = new Map<number, { total: number; tagged: number }>();
const outboundHandoffsByDomain = new Map<number, number>();
for (const h of handoffs) {
  outboundHandoffsByDomain.set(h.source_domain_id, (outboundHandoffsByDomain.get(h.source_domain_id) ?? 0) + 1);
  if (h.source_domain_id === h.target_domain_id) continue;
  for (const did of [h.source_domain_id, h.target_domain_id]) {
    const r = crossDomainByDomain.get(did) ?? { total: 0, tagged: 0 };
    r.total += 1;
    if (taggedHandoffs.has(h.id)) r.tagged += 1;
    crossDomainByDomain.set(did, r);
  }
}

const solCountByDomain = new Map<number, number>();
for (const r of solDomains) {
  solCountByDomain.set(r.domain_id, (solCountByDomain.get(r.domain_id) ?? 0) + 1);
}

const statePath = (code: string) => resolve(AUDITS_DIR, code, "state.yaml");

// Read audits/<CODE>/state.yaml (schema v2) with js-yaml. null when absent or unparsable.
const stateCache = new Map<string, any | null>();
function readStateYaml(code: string): any | null {
  if (stateCache.has(code)) return stateCache.get(code);
  let doc: any | null = null;
  const p = statePath(code);
  if (existsSync(p)) {
    try {
      doc = yaml.load(readFileSync(p, "utf8")) ?? {};
    } catch {
      console.error(`warning: ${p} does not parse as YAML; treated as missing`);
    }
  }
  stateCache.set(code, doc);
  return doc;
}
const itemCount = (v: unknown): number => (Array.isArray(v) ? v.length : 0);

// status + open questions (b2 decisions + b1b items blocked on a user decision).
function parseAuditStatus(code: string): { status: string; open_questions: number } | null {
  const doc = readStateYaml(code);
  if (!doc || !doc.status) return null;
  const b1b: any[] = Array.isArray(doc.b1b) ? doc.b1b : [];
  const userBlocked = b1b.filter((it) =>
    (Array.isArray(it?.blocked_by) ? it.blocked_by : []).some((b: any) => b?.type === "user_decision"),
  ).length;
  return { status: String(doc.status), open_questions: itemCount(doc.b2) + userBlocked };
}

// b2 / b3 item counts. Returns null when no state.yaml exists.
function parseAuditPending(code: string): { b2: number; b3: number } | null {
  const doc = readStateYaml(code);
  if (!doc) return null;
  return { b2: itemCount(doc.b2), b3: itemCount(doc.b3) };
}

type Finding = { id: string; detail: string };
type Row = {
  domain_code: string;
  domain_name: string;
  leadership_tier: boolean;
  has_audit_file: boolean;
  status: string | null;
  score: number;
  findings: Finding[];
  entity_count: number;
  pending_questions: number | null;
  ratio: number | null;
  counts: {
    modules: number;
    capabilities: number;
    masters: number;
    functions: number;
    solutions: number;
    outbound_handoffs: number;
    cross_domain_handoffs: number;
    apqc_tagged_handoffs: number;
    bucket2: number | null;
    bucket3: number | null;
  };
};

const rows: Row[] = [];

for (const d of domains) {
  const code = d.domain_code as string;
  const isLeadership = LEADERSHIP_TIER.has(code);
  const hasAuditFile = existsSync(statePath(code));
  const findings: Finding[] = [];

  // A1 — metadata zeroed
  const a1Fail =
    (d.crud_percentage ?? 0) === 0 ||
    !d.min_org_size ||
    !d.cost_band ||
    (d.usa_market_size_usd_m ?? 0) === 0 ||
    (d.market_size_source_year ?? 0) === 0 ||
    ((d.crud_percentage ?? 0) < 95 && !d.business_logic);
  if (a1Fail) findings.push({ id: "A1", detail: "domain metadata incomplete (crud_pct/min_org_size/cost_band/tam/business_logic)" });

  // A2 — capability count
  const capCount = capCountByDomain.get(d.id) ?? 0;
  if (capCount < 3) findings.push({ id: "A2", detail: `${capCount} capabilities (need >= 3)` });

  // B1 — master count, skip leadership
  const masterCount = masterCountByDomain.get(d.id) ?? 0;
  if (!isLeadership && masterCount === 0) findings.push({ id: "B1", detail: "zero master data_objects" });

  // C1 — function ownership
  const bfCount = bfCountByDomain.get(d.id) ?? 0;
  if (bfCount === 0) findings.push({ id: "C1", detail: "zero business_function_domains rows" });

  // M1 — modules
  const mods = modulesByDomain.get(d.id) ?? [];
  if (mods.length === 0) findings.push({ id: "M1", detail: "zero domain_modules" });

  // F2 — every full module needs >=1 domain_module_tools (starters exempt). The domain's single
  // domain-grain system skill derives its toolset from these; a full module with none is incomplete.
  if (mods.length > 0) {
    const orphans = mods.filter(m => m.module_kind !== "starter" && !modulesWithTools.has(m.id));
    if (orphans.length > 0) {
      findings.push({
        id: "F2",
        detail: `${orphans.length}/${mods.length} modules lack domain_module_tools: ${orphans.map(o => o.domain_module_code).slice(0, 5).join(", ")}${orphans.length > 5 ? "..." : ""}`,
      });
    }
  }

  // H1 — APQC tagging coverage on cross-domain handoffs
  const cdh = crossDomainByDomain.get(d.id) ?? { total: 0, tagged: 0 };
  if (cdh.total > 0 && cdh.tagged < cdh.total) {
    findings.push({
      id: "H1",
      detail: `${cdh.tagged}/${cdh.total} cross-domain handoffs APQC-tagged`,
    });
  }

  // AUD — audit file presence
  if (!hasAuditFile) findings.push({ id: "AUD", detail: "no audits/<code>/state.yaml" });

  const solCount = solCountByDomain.get(d.id) ?? 0;
  const outboundCount = outboundHandoffsByDomain.get(d.id) ?? 0;
  const entityCount = mods.length + capCount + masterCount + outboundCount + solCount;

  const statusInfo = parseAuditStatus(code);
  const pending = parseAuditPending(code);
  // Prefer the user-facing open-question count from state.yaml; fall back to b2 + b3.
  const pendingQ = statusInfo ? statusInfo.open_questions
                 : pending ? pending.b2 + pending.b3
                 : null;
  // ratio: entities per open question. Higher = more leverage per decision.
  // Use entityCount / max(pendingQ, 1) so domains with zero pending and >0 entities
  // top the list when audited.
  const ratio = pending ? entityCount / Math.max(pendingQ ?? 0, 1) : null;

  rows.push({
    domain_code: code,
    domain_name: d.domain_name,
    leadership_tier: isLeadership,
    has_audit_file: hasAuditFile,
    status: statusInfo?.status ?? null,
    score: findings.length,
    findings,
    entity_count: entityCount,
    pending_questions: pendingQ,
    ratio,
    counts: {
      modules: mods.length,
      capabilities: capCount,
      masters: masterCount,
      functions: bfCount,
      solutions: solCount,
      outbound_handoffs: outboundCount,
      cross_domain_handoffs: cdh.total,
      apqc_tagged_handoffs: cdh.tagged,
      bucket2: pending ? pending.b2 : null,
      bucket3: pending ? pending.b3 : null,
    },
  });
}

let surface = rows.filter(r => r.score > 0 || (r.has_audit_file && (r.pending_questions ?? 0) > 0));

// --status filter: only the audits in that state. When filtering by status,
// the unaudited section is suppressed (status only exists on audited rows).
if (STATUS_FILTER) {
  surface = surface.filter(r => r.status === STATUS_FILTER);
}

// AUDITED — has audit file. Sort by ratio descending (low-hanging fruit first):
//   high ratio = many entities relative to open questions = quick to close.
const audited = surface.filter(r => r.has_audit_file).sort((a, b) => {
  const ra = a.ratio ?? -1;
  const rb = b.ratio ?? -1;
  if (rb !== ra) return rb - ra;
  return b.entity_count - a.entity_count || a.domain_code.localeCompare(b.domain_code);
});

// UNAUDITED — no audit file. Sort by entity_count descending:
//   most-loaded domains first = quickest to surface their hidden pending count.
const unaudited = surface.filter(r => !r.has_audit_file).sort((a, b) => {
  return b.entity_count - a.entity_count || b.score - a.score || a.domain_code.localeCompare(b.domain_code);
});

const auditedShown = TOP !== Infinity ? audited.slice(0, TOP) : audited;
const unauditedShown = TOP !== Infinity ? unaudited.slice(0, TOP) : unaudited;

if (JSON_OUT) {
  console.log(JSON.stringify({ audited: auditedShown, unaudited: unauditedShown }, null, 2));
  process.exit(0);
}

const header = ["code", "name", "status", "ent", "Q", "ratio", "mod", "cap", "mst", "fn", "sol", "h/tag", "score", "findings"];
const widths = [16, 30, 17, 4, 4, 7, 4, 4, 4, 4, 4, 8, 5, 28];
const fmt = (cells: any[]) => cells.map((c, i) => String(c).padEnd(widths[i])).join(" ");
const showRow = (r: Row) => fmt([
  r.domain_code,
  r.domain_name.slice(0, 30),
  r.status ?? "-",
  r.entity_count,
  r.pending_questions ?? "-",
  r.ratio == null ? "-" : r.ratio === Infinity ? "inf" : r.ratio.toFixed(1),
  r.counts.modules,
  r.counts.capabilities,
  r.counts.masters + (r.leadership_tier ? "*" : ""),
  r.counts.functions,
  r.counts.solutions,
  `${r.counts.apqc_tagged_handoffs}/${r.counts.cross_domain_handoffs}`,
  r.score,
  r.findings.map(f => f.id).join(","),
]);

if (SECTION === "both" || SECTION === "audited") {
  const title = STATUS_FILTER
    ? `AUDITED in state '${STATUS_FILTER}' — ${audited.length} domains`
    : `AUDITED — ${audited.length} domains with audit file + open questions or failing checks`;
  console.log(`\n${title}`);
  console.log(`(sorted by entities-per-pending-question ratio descending; low-hanging fruit first)\n`);
  console.log(fmt(header));
  console.log(widths.map(w => "-".repeat(w)).join(" "));
  for (const r of auditedShown) console.log(showRow(r));
}

// --status filter implies "show audited only"; unaudited rows have no status.
if (!STATUS_FILTER && (SECTION === "both" || SECTION === "unaudited")) {
  console.log(`\nUNAUDITED — ${unaudited.length} domains with no audit file (Q unknown until audit runs)`);
  console.log(`(sorted by entity_count descending; most catalog substrate first)\n`);
  console.log(fmt(header));
  console.log(widths.map(w => "-".repeat(w)).join(" "));
  for (const r of unauditedShown) console.log(showRow(r));
}

console.log(`\n* leadership-tier domain — B1 (zero masters) is by-design, not a gap.`);
console.log(`\nColumns:`);
console.log(`  ent    entity_count = masters + capabilities + modules + outbound_handoffs + linked_solutions`);
console.log(`  Q      open user questions in audits/<CODE>/state.yaml (b2 + b1b blocked on a user decision); "-" if no state.yaml`);
console.log(`  ratio  ent / max(Q, 1) - higher = quicker to close out`);
console.log(`  score  count of failing structural checks (A1/A2/B1/C1/M1/F2/H1/AUD)`);
console.log(`\nLegend (findings column):`);
console.log(`  A1=metadata  A2=<3 caps  B1=no masters  C1=no func ownership`);
console.log(`  M1=no modules  F2=full module missing domain_module_tools  H1=untagged xdom handoffs  AUD=no audit file`);
console.log(`\nNext: dispatch a Validate (mode b1) on a low-hanging-fruit batch, or run subagents`);
console.log(`with --json output to refresh audits/<CODE>/state.yaml for human review.\n`);
