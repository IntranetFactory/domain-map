// .tmp_deploy/move_embed_text_2026_10_23.ts
// User-approved 2026-10-23: embed_text (agent_first, partial MCP coverage only) moves to vendor_platform.
// Prior state: .tmp_deploy/snapshots/tools_coverage_tier_2026_10_23c.json
import { pg } from "../scripts/lib/catalog";
await pg("PATCH", "/tools?tool_name=eq.embed_text&coverage_tier=eq.agent_first", { coverage_tier: "vendor_platform" });
console.log(await pg("GET", "/tools?tool_name=eq.embed_text&select=tool_name,coverage_tier"));
