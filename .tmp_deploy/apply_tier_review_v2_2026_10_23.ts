// .tmp_deploy/apply_tier_review_v2_2026_10_23.ts
//
// Applies audits/_coverage-tier-review-2026-10-23-v2.csv (user-approved 2026-10-23: the 102 suggested
// changes as is, the 68 keyword-flagged rows keep their tier). `semantius` splits into
// semantius_crud / semantius_workflow / semantius_platform plus business_logic; validation rule 99009
// (query / mutate must be `semantius`) is deleted, user-approved.
// Prior state: .tmp_deploy/snapshots/*_2026_10_23d.json (revert source).
//
// Run from the project root: bun run c:/dev/domain-map/.tmp_deploy/apply_tier_review_v2_2026_10_23.ts [--dry-run]

import { readFileSync } from "node:fs";
import { pg } from "../scripts/lib/catalog";

const DRY = process.argv.includes("--dry-run");
const SNAP = "c:/dev/domain-map/.tmp_deploy/snapshots";

const ENUM = [
  { value: "semantius_crud", label: "Semantius CRUD", description: "Semantius within one record: read and write, computed fields, validations, one related-record lookup; reads across records." },
  { value: "semantius_workflow", label: "Semantius workflow", description: "Semantius state transition on one record, with permission gates and RACI." },
  { value: "semantius_platform", label: "Semantius platform", description: "Semantius platform services beyond CRUD: transactional email, webhook receivers, inbound ingest." },
  { value: "business_logic", label: "Business logic", description: "Needs code: keeps several records consistent (sums, balances, numbering, multi-record transactions, batch runs)." },
  { value: "agent_native", label: "Agent native", description: "The agent itself: its model or a host built-in (web search and fetch, code sandbox)." },
  { value: "agent_common", label: "Agent common", description: "The agent through the customer's Google Workspace or Microsoft 365, including the agent's schedule (cron)." },
  { value: "agent_first", label: "Agent first", description: "An agent-ready outside service with a vendor-published MCP server or toolkit; needs a subscription." },
  { value: "vendor_platform", label: "Vendor platform", description: "A vendor's proprietary engine, or a service without vendor-maintained agent access: build or approximate." },
  { value: "external", label: "External", description: "Needs integration work: certified, contracted, device-bound, or always-on inbound." },
];

const DESCRIPTION =
  "Who delivers the tool, ordered by what the customer must add. `semantius_crud` = Semantius within one record (read and write, JsonLogic computed fields and validations, a lookup of one related record, unique fields) plus reads across records via the analytics layer. `semantius_workflow` = a Semantius state transition on one record with permission gates and RACI. `semantius_platform` = Semantius platform services beyond CRUD (transactional email via crud sendEmail, webhook receivers, inbound ingest); count a capability only when it ships on BOTH the `crud` MCP server AND the `semantius` CLI. `business_logic` = needs code because several records must stay consistent (sums or balances across rows, gap-free numbering, multi-record transactions, batch runs). `agent_native` = the agent itself (its model, or host tools such as web search and fetch, code sandbox). `agent_common` = the agent through the customer's Google Workspace or Microsoft 365, including time-triggered work run on the agent's schedule. `agent_first` = an agent-ready outside service with a vendor-published MCP server or toolkit, needing only a subscription. `vendor_platform` = a vendor's proprietary engine, or a service without vendor-maintained agent access; build or approximate. `external` = needs integration work (certified or contracted access, devices, always-on inbound channels). semantius_score covers all semantius_* tiers; semantius_agent_core adds agent_native + agent_common; semantius_agent_first adds agent_first.";

for (const t of [DESCRIPTION, ...ENUM.map((e) => e.description)]) if (t.includes("\u2014")) throw new Error("em-dash");

// ---------- plan ----------

const parse = (l: string) => { const o: string[] = []; let c = "", q = false; for (let i = 0; i < l.length; i++) { const ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { c += '"'; i++; } else if (ch === '"') q = false; else c += ch; } else if (ch === '"') q = true; else if (ch === ",") { o.push(c); c = ""; } else c += ch; } o.push(c); return o; };
const review = readFileSync("c:/dev/domain-map/audits/_coverage-tier-review-2026-10-23-v2.csv", "utf8").trim().split("\n").slice(1).map(parse);
const target = new Map(review.map((r) => [r[0], r[4]])); // tool_name -> v2_tier
const allowed = new Set(ENUM.map((e) => e.value));
for (const [n, t] of target) if (!allowed.has(t)) throw new Error(`${n}: unknown tier ${t}`);

const tools: any[] = JSON.parse(readFileSync(`${SNAP}/tools_coverage_tier_2026_10_23d.json`, "utf8"));
const semantius = tools.filter((t) => t.coverage_tier === "semantius");
const missing = semantius.filter((t) => !target.has(t.tool_name)).map((t) => t.tool_name);
if (missing.length) throw new Error(`no v2 tier for: ${missing.join(", ")}`);
if (target.size !== semantius.length) throw new Error(`v2 has ${target.size} rows, catalog has ${semantius.length} semantius tools`);

const groups = new Map<string, number[]>();
for (const t of semantius) {
  const to = target.get(t.tool_name)!;
  if (!groups.has(to)) groups.set(to, []);
  groups.get(to)!.push(t.id);
}
for (const [to, ids] of groups) console.log(`${to.padEnd(20)} ${ids.length}`);
if (DRY) process.exit(0);

async function crud(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`${tool}: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// 1. delete validation rule 99009
const [entity] = JSON.parse(readFileSync(`${SNAP}/tools_validation_rules_2026_10_23d.json`, "utf8"));
const keep = entity.validation_rules.filter((r: any) => r.code !== "99009");
if (keep.length !== entity.validation_rules.length - 1) throw new Error("rule 99009 not found exactly once");
await crud("update_entity", { table_name: "tools", data: { validation_rules: keep } });
console.log("rule 99009 deleted; remaining:", keep.map((r: any) => r.code).join(", "));

// 2. widen the enum (keep `semantius` for the migration)
await crud("update_field", { id: "tools.coverage_tier", data: { enum_values: [...ENUM, "semantius"] } });
console.log("enum widened");

// 3. retier in chunks; the from-guard keeps re-runs idempotent
for (const [to, ids] of groups) {
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    await pg("PATCH", `/tools?id=in.(${chunk.join(",")})&coverage_tier=eq.semantius`, { coverage_tier: to });
  }
  console.log(`moved ${ids.length} -> ${to}`);
}

// 4. narrow the enum, rewrite the description
const left: any[] = await pg("GET", "/tools?coverage_tier=eq.semantius&select=id");
if (left.length) throw new Error(`${left.length} tools still 'semantius'; enum not narrowed`);
await crud("update_field", { id: "tools.coverage_tier", data: { enum_values: ENUM, default_value: "external", description: DESCRIPTION } });
console.log("enum narrowed; description updated");

const after: any[] = await pg("GET", "/tools?select=coverage_tier&limit=20000");
const tally: Record<string, number> = {};
for (const t of after) tally[t.coverage_tier] = (tally[t.coverage_tier] ?? 0) + 1;
console.log("final tiers:", tally);
