// .tmp_deploy/move_to_vendor_platform_2026_10_23.ts
// User-approved 2026-10-23: agent_first tools with no vendor-maintained MCP server / agent toolkit
// (community- or aggregator-only, or fewer than 2 providers) move to vendor_platform.
// Prior state: .tmp_deploy/snapshots/tools_coverage_tier_2026_10_23c.json
import { pg } from "../scripts/lib/catalog";

const NAMES = [
  // community / aggregator coverage only
  "generate_image",
  "purge_cdn_cache",
  "fetch_tiktok_ads_insights",
  "fetch_linkedin_ads_insights",
  "syndicate_to_google_merchant",
  "syndicate_to_shopify",
  "fetch_exploit_intel",
  // fewer than 2 providers
  "send_ad_conversion_event",
  "fetch_livestock_market_prices",
];

const rows: any[] = await pg("GET", `/tools?tool_name=in.(${NAMES.join(",")})&select=id,tool_name,coverage_tier`);
if (rows.length !== NAMES.length) throw new Error(`expected ${NAMES.length} tools, found ${rows.length}`);
const wrong = rows.filter((r) => r.coverage_tier !== "agent_first" && r.coverage_tier !== "vendor_platform");
if (wrong.length) throw new Error(`unexpected tiers: ${wrong.map((r) => `${r.tool_name}=${r.coverage_tier}`).join(", ")}`);
await pg("PATCH", `/tools?id=in.(${rows.map((r) => r.id).join(",")})&coverage_tier=eq.agent_first`, { coverage_tier: "vendor_platform" });
const after: any[] = await pg("GET", `/tools?tool_name=in.(${NAMES.join(",")})&select=tool_name,coverage_tier`);
for (const r of after) console.log(r.tool_name.padEnd(32), r.coverage_tier);
