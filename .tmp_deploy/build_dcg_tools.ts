#!/usr/bin/env bun
// DCG Phase S: author missing mutate/gate tools and wire domain_module_tools across the
// 6 DCG modules. The dcg-system skill (id 10) already exists and derives its toolset from these.
// Reuses existing query tools (100-111) and existing mutates (171/172/173/1709). Idempotent.
// New CRUD tools get coverage_tier='platform'; compute gets 'external'. Channel rule (F7):
// notifications use the notify_person/notify_team abstractions, never channel primitives.

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [o, e] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if (await proc.exited !== 0) throw new Error(`fail: ${e}\nbody=${JSON.stringify(body)}`);
  const t = o.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
async function post(p: string, rows: Row[]) { if (rows.length) for (let i = 0; i < rows.length; i += 50) await call({ method: "POST", path: p, body: rows.slice(i, i + 50) }); }

const CATALOG = 337, LINEAGE = 338, GLOSSARY = 339, STEWARDSHIP = 340, ACCESSGOV = 341, DATAPRODUCTS = 342;

// New tools: [tool_name, operation_kind, data_object_id|null, coverage_tier, description]
const NEW_TOOLS: [string, string, number | null, string, string][] = [
  ["update_data_asset", "mutate", 300, "platform", "Update the catalog metadata of a data asset (owner, description, tags, storage detail)."],
  ["deprecate_data_asset", "mutate", 300, "platform", "Retire a data asset from active catalog use, flagging downstream consumers and lineage edges."],
  ["create_data_domain", "mutate", 304, "platform", "Create a subject-area data domain grouping for organizing assets and terms."],
  ["create_data_lineage_relationship", "mutate", 301, "platform", "Record a lineage edge from a source data asset to a target data asset with column-level mapping."],
  ["analyze_lineage_impact", "compute", null, "external", "Traverse the lineage graph to compute the downstream impact set of a schema or source change."],
  ["create_glossary_term", "mutate", 302, "platform", "Draft a new business glossary term with definition, steward, and related terms."],
  ["publish_glossary_term", "mutate", 302, "platform", "Publish an approved glossary term, making its term-to-asset linkage live."],
  ["deprecate_glossary_term", "mutate", 302, "platform", "Deprecate a published glossary term and route consumers to its replacement."],
  ["assign_data_steward", "mutate", 305, "platform", "Assign a steward or owner to a data asset, term, or data domain with a responsibility type."],
  ["escalate_stewardship_assignment", "mutate", 305, "platform", "Escalate a stewardship assignment up the escalation chain when a gap or issue persists."],
  ["grant_data_certification", "mutate", 306, "platform", "Grant a production-readiness certification to a data asset with validity period and conditions."],
  ["revoke_data_certification", "mutate", 306, "platform", "Revoke a data asset certification when it no longer meets quality or compliance thresholds."],
  ["propose_data_classification", "mutate", 303, "platform", "Propose a sensitivity classification rule for steward review."],
  ["approve_data_classification", "mutate", 303, "platform", "Approve a proposed classification, locking it against further edits and driving downstream enforcement."],
  ["draft_data_access_policy", "mutate", 307, "platform", "Draft a data access policy controlling who can access an asset under what conditions."],
  ["approve_data_access_policy", "mutate", 307, "platform", "Sign off a data access policy as its single accountable approver and lock it for enforcement."],
  ["publish_data_product", "mutate", 232, "platform", "Publish a governed data product with its contract (schema, SLA, owner, access policy) to the marketplace."],
  ["deprecate_data_product", "mutate", 232, "platform", "Deprecate a published data product and notify its registered consumers."],
];

console.log("== Phase S: author new tools (dedup by tool_name) ==");
{
  const names = NEW_TOOLS.map(t => t[0]);
  const existing = await get(`/tools?tool_name=in.(${names.join(",")})&select=tool_name`);
  const have = new Set(existing.map(r => r.tool_name as string));
  const rows = NEW_TOOLS.filter(t => !have.has(t[0]))
    .map(([tool_name, operation_kind, data_object_id, coverage_tier, description]) =>
      ({ tool_name, operation_kind, data_object_id, coverage_tier, description }));
  if (rows.length) { console.log(`  + ${rows.length} new tools (${have.size} already existed)`); await post("/tools", rows); }
  else console.log("  = all new tools already present");
}

// Build name -> id map for every tool we reference
const REFERENCED = [
  "query_data_assets", "query_data_domains", "query_data_lineage_relationships", "query_glossary_terms",
  "query_ontologies", "query_data_stewardship_assignments", "query_data_certifications", "query_data_classifications",
  "query_data_access_policies", "query_data_usage_metrics", "query_data_products", "query_metric_definitions",
  "classify_data_asset", "certify_data_asset", "approve_data_access_request", "certify_metric_definition",
  "classify_text", "notify_person", "notify_team", ...NEW_TOOLS.map(t => t[0]),
];
const toolRows = await get(`/tools?tool_name=in.(${REFERENCED.join(",")})&select=id,tool_name`);
const toolId = new Map(toolRows.map(r => [r.tool_name as string, Number(r.id)]));
const missing = REFERENCED.filter(n => !toolId.has(n));
if (missing.length) throw new Error(`Referenced tools not found: ${missing.join(", ")}`);

// domain_module_tools: [module_id, tool_name, requirement_level]
const DMT: [number, string, string][] = [
  // CATALOG
  [CATALOG, "query_data_assets", "required"], [CATALOG, "query_data_domains", "required"],
  [CATALOG, "update_data_asset", "required"], [CATALOG, "classify_data_asset", "required"],
  [CATALOG, "certify_data_asset", "required"], [CATALOG, "deprecate_data_asset", "required"],
  [CATALOG, "create_data_domain", "required"], [CATALOG, "query_data_certifications", "optional"],
  [CATALOG, "classify_text", "optional"], [CATALOG, "notify_person", "optional"],
  // LINEAGE
  [LINEAGE, "query_data_lineage_relationships", "required"], [LINEAGE, "query_data_assets", "required"],
  [LINEAGE, "create_data_lineage_relationship", "required"], [LINEAGE, "analyze_lineage_impact", "optional"],
  // GLOSSARY
  [GLOSSARY, "query_glossary_terms", "required"], [GLOSSARY, "query_ontologies", "optional"],
  [GLOSSARY, "create_glossary_term", "required"], [GLOSSARY, "publish_glossary_term", "required"],
  [GLOSSARY, "deprecate_glossary_term", "required"], [GLOSSARY, "notify_person", "optional"],
  // STEWARDSHIP
  [STEWARDSHIP, "query_data_stewardship_assignments", "required"], [STEWARDSHIP, "query_data_certifications", "required"],
  [STEWARDSHIP, "query_data_assets", "required"], [STEWARDSHIP, "assign_data_steward", "required"],
  [STEWARDSHIP, "escalate_stewardship_assignment", "required"], [STEWARDSHIP, "grant_data_certification", "required"],
  [STEWARDSHIP, "revoke_data_certification", "required"], [STEWARDSHIP, "certify_data_asset", "optional"],
  [STEWARDSHIP, "notify_person", "optional"],
  // ACCESS-GOV
  [ACCESSGOV, "query_data_classifications", "required"], [ACCESSGOV, "query_data_access_policies", "required"],
  [ACCESSGOV, "query_data_assets", "required"], [ACCESSGOV, "classify_data_asset", "required"],
  [ACCESSGOV, "propose_data_classification", "required"], [ACCESSGOV, "approve_data_classification", "required"],
  [ACCESSGOV, "draft_data_access_policy", "required"], [ACCESSGOV, "approve_data_access_policy", "required"],
  [ACCESSGOV, "approve_data_access_request", "required"], [ACCESSGOV, "classify_text", "optional"],
  [ACCESSGOV, "notify_person", "optional"],
  // DATA-PRODUCTS
  [DATAPRODUCTS, "query_data_usage_metrics", "required"], [DATAPRODUCTS, "query_data_products", "required"],
  [DATAPRODUCTS, "query_metric_definitions", "optional"], [DATAPRODUCTS, "publish_data_product", "required"],
  [DATAPRODUCTS, "deprecate_data_product", "required"], [DATAPRODUCTS, "certify_metric_definition", "optional"],
  [DATAPRODUCTS, "notify_team", "optional"],
];

console.log("== Phase S: wire domain_module_tools (dedup) ==");
{
  const modIds = [CATALOG, LINEAGE, GLOSSARY, STEWARDSHIP, ACCESSGOV, DATAPRODUCTS];
  const existing = await get(`/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,tool_id`);
  const have = new Set(existing.map(r => `${r.domain_module_id}.${r.tool_id}`));
  const rows = DMT.map(([mid, name, lvl]) => ({ domain_module_id: mid, tool_id: toolId.get(name)!, requirement_level: lvl, notes: "" }))
    .filter(r => !have.has(`${r.domain_module_id}.${r.tool_id}`));
  if (rows.length) { console.log(`  + ${rows.length} domain_module_tools`); await post("/domain_module_tools", rows); }
  else console.log("  = all domain_module_tools present");
}

console.log("== Phase S: Semantius score check ==");
{
  const modIds = [CATALOG, LINEAGE, GLOSSARY, STEWARDSHIP, ACCESSGOV, DATAPRODUCTS];
  const dmt = await get(`/domain_module_tools?domain_module_id=in.(${modIds.join(",")})&select=tool_id,tools(coverage_tier)`);
  const byTool = new Map<number, string>();
  for (const r of dmt) byTool.set(Number(r.tool_id), (r.tools as Row).coverage_tier as string);
  const total = byTool.size;
  const platform = [...byTool.values()].filter(t => t === "platform").length;
  const integration = [...byTool.values()].filter(t => t === "integration").length;
  console.log(`  distinct tools across DCG modules: ${total}`);
  console.log(`  strict_score (platform only): ${platform}/${total} = ${(platform/total*100).toFixed(0)}%`);
  console.log(`  operational_score (platform+integration): ${platform+integration}/${total} = ${((platform+integration)/total*100).toFixed(0)}%`);
  const nonPlatform = [...byTool.entries()].filter(([, t]) => t !== "platform");
  if (nonPlatform.length) {
    const ids = nonPlatform.map(([id]) => id);
    const names = await get(`/tools?id=in.(${ids.join(",")})&select=tool_name,coverage_tier`);
    console.log("  non-platform tools: " + names.map(n => `${n.tool_name}(${n.coverage_tier})`).join(", "));
  }
}
