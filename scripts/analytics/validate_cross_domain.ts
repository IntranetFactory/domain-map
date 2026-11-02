#!/usr/bin/env bun
//
// Mode b2 / Discover Pass 0 — Cross-domain handoff substrate sanity (read-only).
// Plus Pass 1 (PCF_OVERRIDES sanity) and Pass 1.5 (coverage gap audit).
//
// See:
//   - README.md § b2) Validate cross-domain substrate
//   - .claude/skills/domain-map-analyst/SKILL.md § Validate cross-domain substrate
//   - audits/_validate-cross-domain.md — append-only catalog-wide audit log
//
// Run from project root (semantius reads .env from cwd):
//   bun run scripts/analytics/validate_cross_domain.ts
//
// Read-only by construction. Surfaces defects grouped by the domain that owes the fix.
// Each defect routes to per-domain b1 Validate on the owning domain.
//
// Queries:
//   B10b.1 — NULL source_domain_module_id (source domain has modules)
//   B10b.2 — NULL target_domain_module_id (target domain has modules)
//   B9      — trigger_event data_object NOT publishable from source
//             (source must have role in {master, embedded_master, contributor, derived})
//   B8-rev  — payload NOT touched by target (any role including derived)
//   Orphan  — trigger_event has no handoff AND data_object has no lifecycle_state
//
// B10b.1 / B10b.2 / B9 / Orphan run the shared health rules (scripts/lib/health/logic_b.ts:
// checkHandoffModuleAttribution, isPublishableBy, checkOutboundEvents), so this catalog-wide pass
// and domain_health.ts cannot drift. B8-rev keeps its own query here.

import { spawn } from "bun";
import { checkHandoffModuleAttribution, checkOutboundEvents, isPublishableBy } from "../lib/health/logic_b.ts";

async function get(path: string): Promise<any[]> {
  const proc = spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify({ method: "GET", path }));
  proc.stdin.end();
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`GET ${path} failed (exit ${exitCode}): ${stderr}`);
  }
  return JSON.parse(stdout);
}

function section(title: string) {
  console.log("\n" + "=".repeat(80));
  console.log(title);
  console.log("=".repeat(80));
}

// ---------- Pass 0 / mode b2 (REFINED) ----------
section("PASS 0 / MODE b2 — Cross-domain handoff substrate sanity (REFINED v2)");

const domainModules = await get("/domain_modules?select=id,domain_id");
const modulesByDomain = new Map<number, Set<number>>();
for (const dm of domainModules) {
  if (dm.domain_id == null) continue;
  if (!modulesByDomain.has(dm.domain_id)) modulesByDomain.set(dm.domain_id, new Set());
  modulesByDomain.get(dm.domain_id)!.add(dm.id);
}
console.log(`(${modulesByDomain.size} domains have modules; ${domainModules.length} total domain_modules rows)`);

// bundle-domains master nothing; exclude any handoff touching a bundle from the cross-domain
// substrate audit (plan §4). Inert until §3.
const bundleDomainRows = await get("/domains?domain_kind=eq.bundle&select=id");
const bundleDomainIds = new Set<number>(bundleDomainRows.map((d: any) => d.id));
const allHandoffsForAudit = await get(
  "/handoffs?select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,trigger_event:trigger_events(id,event_name,data_object_id),source_domain:domains!handoffs_source_domain_id_fkey(domain_code),target_domain:domains!handoffs_target_domain_id_fkey(domain_code)"
);
const crossHandoffs = allHandoffsForAudit.filter(
  (h: any) =>
    h.source_domain_id !== h.target_domain_id &&
    !bundleDomainIds.has(h.source_domain_id) &&
    !bundleDomainIds.has(h.target_domain_id)
);
console.log(`(${crossHandoffs.length} cross-domain handoffs of ${allHandoffsForAudit.length} total)`);

// B10b per domain (logic_b.ts checkHandoffModuleAttribution), fed one direction at a time: each
// domain's outbound cross handoffs (q1) or its inbound ones (q2). Every fail it returns is then that
// direction's NULL module FK (a domain without modules is not applicable). Returns handoff ids.
function b10bNullModuleIds(side: "source" | "target"): Set<number> {
  const byDomain = new Map<number, any[]>();
  for (const h of crossHandoffs) {
    const dom = side === "source" ? h.source_domain_id : h.target_domain_id;
    if (!byDomain.has(dom)) byDomain.set(dom, []);
    byDomain.get(dom)!.push(h);
  }
  const ids = new Set<number>();
  for (const [domainId, handoffs] of byDomain) {
    for (const f of checkHandoffModuleAttribution({ domainId, hasModules: modulesByDomain.has(domainId), handoffs })) {
      if (f.result === "fail") for (const id of f.rows ?? []) ids.add(Number(id));
    }
  }
  return ids;
}

// Query 1: NULL source_domain_module_id, source domain has modules
const q1Ids = b10bNullModuleIds("source");
const q1 = crossHandoffs.filter((h: any) => q1Ids.has(h.id));
console.log(`\nB10b.1 — NULL source_domain_module_id (source domain has modules): ${q1.length} defects`);
if (q1.length > 0) {
  const byDom = new Map<string, number>();
  for (const h of q1) byDom.set(h.source_domain.domain_code, (byDom.get(h.source_domain.domain_code) || 0) + 1);
  for (const [d, n] of [...byDom.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${d}: ${n}`);
}

// Query 2: NULL target_domain_module_id, target domain has modules
const q2Ids = b10bNullModuleIds("target");
const q2 = crossHandoffs.filter((h: any) => q2Ids.has(h.id));
console.log(`\nB10b.2 — NULL target_domain_module_id (target domain has modules): ${q2.length} defects`);
if (q2.length > 0) {
  const byDom = new Map<string, number>();
  for (const h of q2) byDom.set(h.target_domain.domain_code, (byDom.get(h.target_domain.domain_code) || 0) + 1);
  for (const [d, n] of [...byDom.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${d}: ${n}`);
}

// Pull DMDO rows once; build per-domain row lists (q3) and per-domain consume sets (q4).
const dmdoAll = await get(
  "/domain_module_data_objects?select=data_object_id,role,domain_module:domain_modules(domain_id)"
);
const CONSUME_ROLES = new Set(["master", "embedded_master", "contributor", "consumer", "derived"]);
const dmdoByDomain = new Map<number, any[]>();              // a domain's rows: who can publish events on a data_object
const consumingByDomain = new Map<number, Set<number>>();   // who can consume a data_object as handoff target
for (const r of dmdoAll) {
  const dom = r.domain_module?.domain_id;
  if (dom == null) continue;
  if (!dmdoByDomain.has(dom)) dmdoByDomain.set(dom, []);
  dmdoByDomain.get(dom)!.push(r);
  if (CONSUME_ROLES.has(r.role)) {
    if (!consumingByDomain.has(dom)) consumingByDomain.set(dom, new Set());
    consumingByDomain.get(dom)!.add(r.data_object_id);
  }
}
// platform_builtin data_objects are present in every deployment — free pass.
const builtins = await get("/data_objects?kind=eq.platform_builtin&select=id");
const builtinSet = new Set<number>(builtins.map((d: any) => d.id));

// Query 3 (REFINED): trigger_event.data_object_id must have role IN (master, embedded_master, contributor, derived) on source.
// Consumer-only is excluded: you don't publish events about something you only read
// (logic_b.ts PUBLISH_ROLES / isPublishableBy, the B9 event_not_publishable rule).
const q3 = crossHandoffs.filter((h: any) => {
  const tev = h.trigger_event;
  if (!tev?.data_object_id) return false;
  if (builtinSet.has(tev.data_object_id)) return false;
  return !isPublishableBy(dmdoByDomain.get(h.source_domain_id) ?? [], tev.data_object_id);
});
console.log(`\nB9 (refined) — trigger_event data_object NOT publishable from source (role in master/embedded_master/contributor/derived): ${q3.length} defects`);
if (q3.length > 0) {
  const byDom = new Map<string, number>();
  for (const h of q3) byDom.set(h.source_domain.domain_code, (byDom.get(h.source_domain.domain_code) || 0) + 1);
  for (const [d, n] of [...byDom.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${d}: ${n}`);
  if (byDom.size > 15) console.log(`  ... and ${byDom.size - 15} more domains`);
}

// Query 4 (REFINED): handoff payload data_object_id must have ANY role (including derived) on target.
const q4 = crossHandoffs.filter((h: any) => {
  if (h.data_object_id == null) return false;
  if (builtinSet.has(h.data_object_id)) return false;
  const tgt = consumingByDomain.get(h.target_domain_id);
  return !(tgt && tgt.has(h.data_object_id));
});
console.log(`\nB8-reverse (refined) — payload NOT touched by target (any role, including derived): ${q4.length} defects`);
if (q4.length > 0) {
  const byDom = new Map<string, number>();
  for (const h of q4) byDom.set(h.target_domain.domain_code, (byDom.get(h.target_domain.domain_code) || 0) + 1);
  for (const [d, n] of [...byDom.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${d}: ${n}`);
  if (byDom.size > 15) console.log(`  ... and ${byDom.size - 15} more domains`);
}

// Query 5 (REFINED): orphaned = no handoff AND no lifecycle_state on the data_object. This is the
// orphan half of logic_b.ts's B9 "event with no handoff anywhere" rule (checkOutboundEvents), run
// catalog-wide: every event's entity is in scope, the publishability sub-rule is off
// (hasModules=false; q3 above covers it), and the finding tagged Q5_TAG is this list.
const allTrigEvents = await get("/trigger_events?select=id,event_name,data_object_id");
const allHandoffsLite = await get("/handoffs?select=trigger_event_id");
const lifecycleDOs = await get("/data_object_lifecycle_states?select=data_object_id");
const Q5_TAG = "validate_cross_domain q5";
const b9 = checkOutboundEvents({
  domainId: -1,
  masterIds: [...new Set<number>(allTrigEvents.map((t: any) => t.data_object_id))],
  events: allTrigEvents,
  states: lifecycleDOs,
  handoffs: allHandoffsLite,
  domainDmdo: [],
  hasModules: false,
  eventEntity: () => undefined,
  isBuiltin: () => false,
});
const eventRowIds = (f: { rows?: (number | string)[] }) =>
  (f.rows ?? []).map(String).filter((r) => r.startsWith("event:")).map((r) => Number(r.slice("event:".length)));
const orphanIds = new Set<number>(b9.filter((f) => f.result === "fail" && f.detail.includes(Q5_TAG)).flatMap(eventRowIds));
// Guard the tag: every unhanded event outside the tagged finding (the leaf half) has a lifecycle.
const lifecycleDOSet = new Set<number>(lifecycleDOs.map((s: any) => s.data_object_id));
const entityOfEvent = new Map<number, number>(allTrigEvents.map((t: any) => [t.id, t.data_object_id]));
if (b9.some((f) => f.result === "fail" && !f.detail.includes(Q5_TAG) && eventRowIds(f).some((id) => !lifecycleDOSet.has(entityOfEvent.get(id)!)))) {
  throw new Error(`logic_b.ts checkOutboundEvents: the orphan finding no longer carries "${Q5_TAG}"; update q5`);
}
const q5 = allTrigEvents.filter((t: any) => orphanIds.has(t.id));
console.log(`\nOrphaned trigger_events (refined: no handoff AND no lifecycle_state on data_object): ${q5.length} defects`);
if (q5.length > 0) {
  const sample = q5.slice(0, 10);
  for (const t of sample) console.log(`  ${t.event_name} (data_object ${t.data_object_id})`);
  if (q5.length > 10) console.log(`  ... and ${q5.length - 10} more`);
}

const passZeroDefects = q1.length + q2.length + q3.length + q4.length + q5.length;
console.log(`\nPass 0 / b2 result: ${passZeroDefects === 0 ? "CLEAN" : `${passZeroDefects} defects across ${[q1, q2, q3, q4, q5].filter((q) => q.length > 0).length} categories`}`);

// ---------- Pass 1: PCF_OVERRIDES sanity ----------
section("PASS 1 — PCF_OVERRIDES sanity");

const PCF_OVERRIDES_LIVE: Record<string, { ext: string; name: string; lvl: number } | null> = {
  employee:               { ext: "20599", name: "Manage employee onboarding, training, and development", lvl: 2 },
  opportunity:            { ext: "10182", name: "Manage leads/opportunities", lvl: 3 },
  task:                   { ext: "10469", name: "Manage employee onboarding", lvl: 3 },
  case:                   { ext: "10388", name: "Manage customer service problems, requests, and inquiries", lvl: 3 },
  order:                  { ext: "10185", name: "Manage sales orders", lvl: 3 },
  contract:               { ext: "10291", name: "Manage contracts", lvl: 3 },
  alert:                  { ext: "20742", name: "Monitor/analyze network intrusion detection data and resolve threats", lvl: 4 },
  payment:                { ext: "10862", name: "Process and distribute payments", lvl: 4 },
  supplier:               { ext: "10280", name: "Manage suppliers", lvl: 3 },
  subscription:           null,
  offer:                  { ext: "10463", name: "Draw up and make offer", lvl: 4 },
  card_transaction:       null,
  customer_golden_record: null,
  dlp_incident:           null,
  data_asset:             null,
};

const nonNullOverrides = Object.entries(PCF_OVERRIDES_LIVE).filter(([, v]) => v != null) as [
  string,
  { ext: string; name: string; lvl: number }
][];
const exts = nonNullOverrides.map(([, v]) => v.ext);
const pcfRows = await get(`/business_processes?external_id=in.(${exts.join(",")})&select=id,external_id,process_name,hierarchy_level`);
const pcfByExt = new Map<string, any>(pcfRows.map((p: any) => [String(p.external_id), p]));

console.log(`\n${nonNullOverrides.length} non-null overrides; checking name agreement:`);
let driftCount = 0;
for (const [prefix, ov] of nonNullOverrides) {
  const live = pcfByExt.get(ov.ext);
  if (!live) {
    console.log(`  ⚠ ${prefix} (ext ${ov.ext}) — NOT FOUND in business_processes (broken override)`);
    driftCount++;
    continue;
  }
  const intended = ov.name.toLowerCase();
  const actual = live.process_name.toLowerCase();
  const match = intended.includes(actual) || actual.includes(intended);
  if (match) {
    console.log(`  ✓ ${prefix} → ${live.process_name} (L${live.hierarchy_level})`);
  } else {
    console.log(`  ⚠ ${prefix} → drift: intended "${ov.name}" but ext ${ov.ext} resolves to "${live.process_name}"`);
    driftCount++;
  }
}
console.log(`\nPass 1 result: ${driftCount === 0 ? "CLEAN" : `${driftCount} drift findings`}`);

// ---------- Pass 1.5: Coverage gap audit (using proposal_source column) ----------
section("PASS 1.5 — Coverage gap audit (with proposal_source)");

const handoffProcesses = await get("/handoff_processes?select=handoff_id,process_id,record_status,proposal_source");

type HPState = {
  rows: Array<{ process_id: number; record_status: string; proposal_source: string }>;
};
const tagsByHandoff = new Map<number, HPState>();
for (const r of handoffProcesses) {
  if (!tagsByHandoff.has(r.handoff_id)) tagsByHandoff.set(r.handoff_id, { rows: [] });
  tagsByHandoff.get(r.handoff_id)!.rows.push({
    process_id: r.process_id,
    record_status: r.record_status,
    proposal_source: r.proposal_source,
  });
}

const categories = {
  authored_approved: 0,
  authored_pending: 0,
  authored_rejected: 0,
  override_approved: 0,
  override_pending: 0,
  override_rejected: 0,
  substring_approved: 0,
  substring_pending: 0,
  substring_rejected: 0,
  untagged: 0,
  conflicting: 0,
};

function bumpCat(source: string, status: string): string {
  // Bucket agent_curated AND human_curated together as "authored" — both are high-context proposals.
  // The distinction (AI agent vs user-typed) is preserved in the row itself for triage; the category
  // collapses for the rollup view.
  if (source === "human_curated" || source === "agent_curated") {
    if (status === "approved") return "authored_approved";
    if (status === "rejected") return "authored_rejected";
    return "authored_pending";
  }
  if (source === "discovery_override") {
    if (status === "approved") return "override_approved";
    if (status === "rejected") return "override_rejected";
    return "override_pending";
  }
  if (status === "approved") return "substring_approved";
  if (status === "rejected") return "substring_rejected";
  return "substring_pending";
}

for (const h of crossHandoffs) {
  const tags = tagsByHandoff.get(h.id);
  if (!tags || tags.rows.length === 0) {
    categories.untagged++;
    continue;
  }
  if (tags.rows.length > 1) {
    // Multiple process_ids for same handoff = conflict
    categories.conflicting++;
    continue;
  }
  const r = tags.rows[0];
  const cat = bumpCat(r.proposal_source, r.record_status);
  (categories as any)[cat]++;
}

console.log(`Cross-domain handoffs: ${crossHandoffs.length}`);
console.log(`\nBy provenance × status:`);
console.log(`  authored (human + agent)  approved/pending/rejected: ${categories.authored_approved} / ${categories.authored_pending} / ${categories.authored_rejected}`);
console.log(`  discovery_override   approved/pending/rejected: ${categories.override_approved} / ${categories.override_pending} / ${categories.override_rejected}`);
console.log(`  discovery_substring  approved/pending/rejected: ${categories.substring_approved} / ${categories.substring_pending} / ${categories.substring_rejected}`);
console.log(`\nTotals:`);
console.log(`  Untagged (Pass 2 substring-matcher targets): ${categories.untagged}`);
console.log(`  Conflicting (>1 process per handoff): ${categories.conflicting}`);

const tagged = crossHandoffs.length - categories.untagged - categories.conflicting;
const coverage = ((tagged / crossHandoffs.length) * 100).toFixed(1);
console.log(`\nCoverage: ${tagged} / ${crossHandoffs.length} tagged (${coverage}%)`);

console.log("\n" + "=".repeat(80));
console.log("SMOKE TEST COMPLETE");
console.log("=".repeat(80));
