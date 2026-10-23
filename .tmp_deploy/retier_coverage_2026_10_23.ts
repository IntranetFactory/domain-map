// .tmp_deploy/retier_coverage_2026_10_23.ts
//
// Refactors tools.coverage_tier from (platform / integration / external) to
// (semantius / agent / integration / vendor_platform / external), user-approved 2026-10-23.
//   1. enum gains the new values (platform kept transitionally)
//   2. validation rule 99009 requires 'semantius' instead of 'platform' for query / mutate tools
//   3. every 'platform' row becomes 'semantius'; the external tools are retiered per the lists below
//   4. 'platform' is dropped from the enum; field descriptions are rewritten to the new contract
// Snapshots of the prior state: .tmp_deploy/snapshots/*_2026_10_23.json (revert source).
//
// Run from the project root: bun run c:/dev/domain-map/.tmp_deploy/retier_coverage_2026_10_23.ts [--dry-run]

import { readFileSync } from "node:fs";
import { pg } from "../scripts/lib/catalog";

const DRY = process.argv.includes("--dry-run");

// External tools whose work is arithmetic or aggregation over Semantius-held data (computed fields / cube).
const TO_SEMANTIUS = [
  "compute_tco_rollup",
  "compute_portfolio_metrics",
  "compute_dc_power_headroom",
  "compute_skills_gap",
  "compute_workforce_skills_heatmap",
  "compute_advocate_influence_score",
];

// Covered by any state-of-the-art agent host: the model itself, or a commodity connector / host tool.
const TO_AGENT = [
  // model-native: generation, classification, extraction, vision, reasoning over records
  "generate_text",
  "classify_text",
  "detect_sentiment",
  "translate_text",
  "summarize_text",
  "extract_entities",
  "read_pdf",
  "analyze_conversation",
  "draft_sales_email",
  "extract_obligations",
  "generate_redline",
  "detect_clause_risk",
  "classify_image",
  "extract_text_from_image",
  "translate_question_to_metric",
  "match_mentor_to_mentee",
  "match_candidate_to_jobs",
  "project_career_paths",
  "match_listing_to_buyer_preferences",
  "generate_advocacy_newsletter",
  "parse_resume",
  "generate_compliance_evidence",
  // commodity connectors and host tools: team chat, calendar, mail, issue trackers, web, sandbox
  "notify_team",
  "post_chat_message",
  "create_calendar_event",
  "fetch_email_activity",
  "fetch_toolchain_work_items",
  "search_web",
  "web_scrape",
  "fetch_wcag_rules",
  "run_shell_command",
];

// The engine of a vendor's own platform, not sold as a standalone service.
const TO_VENDOR_PLATFORM = [
  "compute_deal_risk_score",
  "compute_revenue_forecast",
  "compute_vulnerability_priority",
  "compute_anomaly_score",
  "reconcile_asset_identity",
  "normalize_software_title",
  "run_skill_inference",
  "compute_fit_score",
  "run_match_inference",
  "recommend_mobility_moves",
  "rank_succession_candidates",
  "analyze_lineage_impact",
  "deliver_metric_query",
  "analyze_query_cost",
  "validate_metric_compilation",
  "refresh_materialization_now",
  "serve_metric_via_rest_endpoint",
  "serve_metric_via_sql_endpoint",
  "install_agent",
  "uninstall_agent",
  "execute_patch_job",
  "execute_script_on_endpoint",
  "list_available_patches",
  "invalidate_render_cache",
];

const ENUM = [
  { value: "semantius", label: "Semantius", description: "Semantius provides it natively (crud MCP server and semantius CLI)." },
  { value: "agent", label: "Agent", description: "Any state-of-the-art agent host provides it: the model itself or a commodity connector." },
  { value: "integration", label: "Integration", description: "Semantius maintains a curated out-of-the-box integration." },
  { value: "vendor_platform", label: "Vendor platform", description: "The engine of a vendor's own platform, not sold standalone: build or approximate." },
  { value: "external", label: "External", description: "An outside system, channel, or data provider the customer must connect." },
];

const COVERAGE_TIER_DESCRIPTION =
  "Who provides the tool's implementation. `semantius` = Semantius covers it natively; flip a tool to `semantius` only when the capability ships on BOTH the `crud` MCP server AND the `semantius` CLI. `agent` = any state-of-the-art agent host covers it, through the model itself (generation, classification, extraction, translation, vision, reasoning over records) or a commodity connector or host tool (team chat, calendar, mail, issue trackers, web search and fetch, sandboxed shell). `integration` = Semantius maintains a curated out-of-the-box integration (e.g. an MCP server in the Semantius catalog). `vendor_platform` = the capability is the engine of a vendor's own platform (proprietary scoring, forecasting, inference, runtime, endpoint agent) and is not sold as a standalone service, so it must be built or approximated. `external` = an outside system, channel, or data provider the customer must connect. semantius_score counts `semantius` + `integration` as covered; semantius_agent_score also counts `agent`. Score derivations read this column, not `operation_kind`.";

const REQUIREMENT_LEVEL_DESCRIPTION =
  "Whether the tool is irreducible for this unit's primary workflows (`required`) or covers a degraded / augmenting mode (`optional`). Both Semantius scores (semantius_score, semantius_agent_score) count required and optional tools in their denominator.";

for (const text of [COVERAGE_TIER_DESCRIPTION, REQUIREMENT_LEVEL_DESCRIPTION, ...ENUM.map((e) => e.description)]) {
  if (text.includes("\u2014")) throw new Error("em-dash in authored text");
}

// ---------- pre-flight ----------

const tools: any[] = JSON.parse(readFileSync("c:/dev/domain-map/.tmp_deploy/snapshots/tools_coverage_tier_2026_10_23.json", "utf8"));
const byName = new Map(tools.map((t) => [t.tool_name, t]));
const lists: [string, string[]][] = [
  ["semantius", TO_SEMANTIUS],
  ["agent", TO_AGENT],
  ["vendor_platform", TO_VENDOR_PLATFORM],
];
const seen = new Set<string>();
for (const [tier, names] of lists) {
  for (const n of names) {
    const t = byName.get(n);
    if (!t) throw new Error(`unknown tool ${n}`);
    if (t.coverage_tier !== "external") throw new Error(`${n} is ${t.coverage_tier}, expected external`);
    if (seen.has(n)) throw new Error(`${n} listed twice`);
    seen.add(n);
  }
  console.log(`${tier.padEnd(16)} ${names.length}`);
}
const stayExternal = tools.filter((t) => t.coverage_tier === "external" && !seen.has(t.tool_name));
console.log(`${"external (stays)".padEnd(16)} ${stayExternal.length}`);
console.log(`${"platform->semantius".padEnd(16)} ${tools.filter((t) => t.coverage_tier === "platform").length}`);
if (DRY) process.exit(0);

async function crud(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`${tool}: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// ---------- 1. enum gains the new values (platform kept for the migration) ----------

await crud("update_field", { id: "tools.coverage_tier", data: { enum_values: [...ENUM, "platform"] } });
console.log("enum: new values added");

// ---------- 2. validation rule 99009 -> semantius ----------

const [entity] = JSON.parse(readFileSync("c:/dev/domain-map/.tmp_deploy/snapshots/tools_validation_rules_2026_10_23.json", "utf8"));
const rules = entity.validation_rules.map((r: any) =>
  r.code !== "99009"
    ? r
    : {
        ...r,
        name: "semantius_coverage_when_query_or_mutate",
        message: "coverage_tier must be 'semantius' when operation_kind is query or mutate.",
        jsonlogic: {
          or: [{ "!": [{ in: [{ var: "operation_kind" }, ["query", "mutate"]] }] }, { "==": [{ var: "coverage_tier" }, "semantius"] }],
        },
        description:
          "query and mutate tools operate against a Semantius-mastered data_object (enforced by data_object_required_when_query_or_mutate). Only Semantius can serve queries/mutates against its own data_objects; any other coverage_tier is incoherent for this operation_kind.",
      },
);
await crud("update_entity", { table_name: "tools", data: { validation_rules: rules } });
console.log("rule 99009: now requires 'semantius'");

// ---------- 3. migrate rows ----------

await pg("PATCH", "/tools?coverage_tier=eq.platform", { coverage_tier: "semantius" });
for (const [tier, names] of lists) {
  const ids = names.map((n) => byName.get(n)!.id);
  await pg("PATCH", `/tools?id=in.(${ids.join(",")})&coverage_tier=eq.external`, { coverage_tier: tier });
  console.log(`retiered ${ids.length} -> ${tier}`);
}

// ---------- 4. drop 'platform', rewrite descriptions ----------

const left: any[] = await pg("GET", "/tools?coverage_tier=eq.platform&select=id");
if (left.length) throw new Error(`${left.length} tools still 'platform'; enum not narrowed`);
await crud("update_field", {
  id: "tools.coverage_tier",
  data: { enum_values: ENUM, default_value: "external", description: COVERAGE_TIER_DESCRIPTION },
});
for (const id of ["domain_module_tools.requirement_level", "process_tools.requirement_level"]) {
  await crud("update_field", { id, data: { description: REQUIREMENT_LEVEL_DESCRIPTION } });
}
console.log("enum narrowed; descriptions updated");

// ---------- verify ----------

const after: any[] = await pg("GET", "/tools?select=coverage_tier,operation_kind&limit=20000");
const tally: Record<string, number> = {};
for (const t of after) tally[t.coverage_tier] = (tally[t.coverage_tier] ?? 0) + 1;
console.log("final tiers:", tally);
const bad = after.filter((t) => ["query", "mutate"].includes(t.operation_kind) && t.coverage_tier !== "semantius");
console.log("query/mutate not semantius:", bad.length);
