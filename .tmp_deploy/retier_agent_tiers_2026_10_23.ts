// .tmp_deploy/retier_agent_tiers_2026_10_23.ts
//
// Second coverage_tier refactor, user-approved 2026-10-23: `agent` splits into agent_native /
// agent_common / agent_first, `integration` (0 rows) is dropped, and the remaining `external`
// tools are re-sorted into agent_first (an agent uses it with a subscription, no integration
// work) vs external (certified, contracted, device-bound, or always-on inbound integration).
// Final enum: semantius / agent_native / agent_common / agent_first / vendor_platform / external.
// Prior state: .tmp_deploy/snapshots/*_2026_10_23b.json (revert source).
//
// Run from the project root: bun run c:/dev/domain-map/.tmp_deploy/retier_agent_tiers_2026_10_23.ts [--dry-run]

import { readFileSync } from "node:fs";
import { pg } from "../scripts/lib/catalog";

const DRY = process.argv.includes("--dry-run");

// from `agent`: Google Workspace / Microsoft 365 connectors (mail, calendar, chat)
const AGENT_TO_COMMON = ["notify_team", "post_chat_message", "create_calendar_event", "fetch_email_activity"];
// from `agent`: an agent-ready outside service the customer subscribes to (issue trackers, code hosts)
const AGENT_TO_FIRST = ["fetch_toolchain_work_items"];
// every other `agent` tool becomes agent_native (the model itself or a host built-in)

// from `external`
const EXTERNAL_TO_SEMANTIUS = ["receive_scanner_callback", "receive_crawler_completion"]; // Semantius webhook receivers
const EXTERNAL_TO_NATIVE = [
  "scan_content_quality", // web fetch + reasoning
  "invoke_webhook", // HTTP POST from the host sandbox
  "generate_1094c_form", // document generation in the host sandbox
  "generate_1095c_form",
  "fetch_weather_forecast", // public data via web search / fetch
];
const EXTERNAL_TO_COMMON = [
  "store_blob", // Drive / OneDrive
  "crawl_intranet_source", // SharePoint / Google Sites
];
const EXTERNAL_TO_FIRST = [
  // AI services
  "transcribe_audio",
  "generate_image",
  "embed_text",
  // e-signature, payments, telephony and messaging
  "sign_document",
  "execute_payment",
  "make_phone_call",
  "send_sms",
  // marketing, social, and ad platforms
  "fetch_linkedin_ads_insights",
  "fetch_meta_ads_insights",
  "fetch_tiktok_ads_insights",
  "push_ad_platform_campaign",
  "send_ad_conversion_event",
  "post_social_message",
  "post_to_social_network",
  "fetch_social_share_engagement",
  "fetch_seo_serp_data",
  // commerce and web delivery
  "syndicate_to_shopify",
  "syndicate_to_google_merchant",
  "purge_cdn_cache",
  "submit_redirect_request",
  "scan_content_accessibility",
  "trigger_external_a11y_rescan",
  // optimization and market data APIs
  "optimize_route",
  "optimize_nightly_rate",
  "fetch_competitor_rates",
  "fetch_exploit_intel",
  "fetch_livestock_market_prices",
];

const ENUM = [
  { value: "semantius", label: "Semantius", description: "Semantius provides it out of the box (crud MCP server and semantius CLI)." },
  { value: "agent_native", label: "Agent native", description: "The agent itself: its model or a host built-in (web search and fetch, code sandbox)." },
  { value: "agent_common", label: "Agent common", description: "The agent through the customer's Google Workspace or Microsoft 365." },
  { value: "agent_first", label: "Agent first", description: "An agent-ready outside service (MCP server or self-serve API); needs a subscription, no integration work." },
  { value: "vendor_platform", label: "Vendor platform", description: "The engine of a vendor's own platform, not sold standalone: build or approximate." },
  { value: "external", label: "External", description: "Needs integration work: certified, contracted, device-bound, or always-on inbound." },
];

const COVERAGE_TIER_DESCRIPTION =
  "Who provides the tool's implementation, ordered by what the customer must add. `semantius` = Semantius covers it out of the box; flip a tool to `semantius` only when the capability ships on BOTH the `crud` MCP server AND the `semantius` CLI. `agent_native` = the agent itself: its model (generation, classification, extraction, translation, vision, matching, reasoning over records) or a host built-in (web search and fetch, code sandbox). `agent_common` = the agent through the customer's Google Workspace or Microsoft 365 (mail, calendar, chat, files, intranet). `agent_first` = an agent-ready outside service (an MCP server or a self-serve API) the agent uses with a subscription and no integration work (e-signature, payments, telephony, transcription, ad and social platforms). `vendor_platform` = the engine of a vendor's own platform (proprietary scoring, forecasting, inference, runtime, endpoint agent), not sold as a standalone service, so it must be built or approximated. `external` = needs integration work: certified or contracted access (tax and regulatory filings, EDI, MLS, GDS), devices, or always-on inbound channels. semantius_score covers `semantius`; semantius_agent_core adds `agent_native` + `agent_common`; semantius_agent_first adds `agent_first`. Score derivations read this column, not `operation_kind`.";

const REQUIREMENT_LEVEL_DESCRIPTION =
  "Whether the tool is irreducible for this unit's primary workflows (`required`) or covers a degraded / augmenting mode (`optional`). The Semantius scores (semantius_score, semantius_agent_core, semantius_agent_first) count required and optional tools in their denominator.";

for (const text of [COVERAGE_TIER_DESCRIPTION, REQUIREMENT_LEVEL_DESCRIPTION, ...ENUM.map((e) => e.description)]) {
  if (text.includes("\u2014")) throw new Error("em-dash in authored text");
}

// ---------- plan from the snapshot ----------

const tools: any[] = JSON.parse(readFileSync("c:/dev/domain-map/.tmp_deploy/snapshots/tools_coverage_tier_2026_10_23b.json", "utf8"));
const byName = new Map(tools.map((t) => [t.tool_name, t]));
const target = new Map<string, string>(); // tool_name -> new tier
const assign = (names: string[], from: string, to: string) => {
  for (const n of names) {
    const t = byName.get(n);
    if (!t) throw new Error(`unknown tool ${n}`);
    if (t.coverage_tier !== from) throw new Error(`${n} is ${t.coverage_tier}, expected ${from}`);
    if (target.has(n)) throw new Error(`${n} assigned twice`);
    target.set(n, to);
  }
};
assign(AGENT_TO_COMMON, "agent", "agent_common");
assign(AGENT_TO_FIRST, "agent", "agent_first");
for (const t of tools) if (t.coverage_tier === "agent" && !target.has(t.tool_name)) target.set(t.tool_name, "agent_native");
assign(EXTERNAL_TO_SEMANTIUS, "external", "semantius");
assign(EXTERNAL_TO_NATIVE, "external", "agent_native");
assign(EXTERNAL_TO_COMMON, "external", "agent_common");
assign(EXTERNAL_TO_FIRST, "external", "agent_first");
if (tools.some((t) => t.coverage_tier === "integration")) throw new Error("integration rows exist; plan assumed none");

const moves: Record<string, number> = {};
for (const [n, to] of target) moves[`${byName.get(n).coverage_tier} -> ${to}`] = (moves[`${byName.get(n).coverage_tier} -> ${to}`] ?? 0) + 1;
console.log(moves);
console.log("external stays:", tools.filter((t) => t.coverage_tier === "external" && !target.has(t.tool_name)).length);
if (DRY) process.exit(0);

async function crud(tool: string, payload: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`${tool}: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// 1. widen the enum (keep agent / integration for the migration)
await crud("update_field", { id: "tools.coverage_tier", data: { enum_values: [...ENUM, "agent", "integration"] } });
console.log("enum widened");

// 2. move rows, grouped by (from, to); the from-guard keeps re-runs idempotent
const groups = new Map<string, number[]>();
for (const [n, to] of target) {
  const key = `${byName.get(n).coverage_tier}|${to}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(byName.get(n).id);
}
for (const [key, ids] of groups) {
  const [from, to] = key.split("|");
  await pg("PATCH", `/tools?id=in.(${ids.join(",")})&coverage_tier=eq.${from}`, { coverage_tier: to });
  console.log(`moved ${ids.length} ${from} -> ${to}`);
}

// 3. narrow the enum, rewrite descriptions
const left: any[] = await pg("GET", "/tools?coverage_tier=in.(agent,integration)&select=id");
if (left.length) throw new Error(`${left.length} tools still agent / integration; enum not narrowed`);
await crud("update_field", {
  id: "tools.coverage_tier",
  data: { enum_values: ENUM, default_value: "external", description: COVERAGE_TIER_DESCRIPTION },
});
for (const id of ["domain_module_tools.requirement_level", "process_tools.requirement_level"]) {
  await crud("update_field", { id, data: { description: REQUIREMENT_LEVEL_DESCRIPTION } });
}
console.log("enum narrowed; descriptions updated");

const after: any[] = await pg("GET", "/tools?select=coverage_tier&limit=20000");
const tally: Record<string, number> = {};
for (const t of after) tally[t.coverage_tier] = (tally[t.coverage_tier] ?? 0) + 1;
console.log("final tiers:", tally);
