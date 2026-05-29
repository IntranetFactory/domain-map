#!/usr/bin/env bun
// P2.5A.i — System-skill `skill_tools` derivation for the 12 hypothesis candidates.
//
// Adds:
//   - new query tools (one per master / required-consumer data_object that lacks one)
//   - new mutate tools (one per master data_object with an obvious write workflow)
//   - 12 `skills` rows (skill_type='system', domain_id set, one per candidate domain)
//   - skill_tools rows with requirement_level ∈ {required, optional}
//
// Idempotent on natural keys (tool_name, skill_name, (skill_id, tool_id)).
//
//   bun run load_p25a_i.ts          -> DRY RUN
//   bun run load_p25a_i.ts --apply  -> Live

import { $ } from "bun";

$.throws(false);

const APPLY = process.argv.includes("--apply");

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`  [DRY] POST ${rows.length} → ${path}`); return []; }
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const r = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...r);
  }
  return out;
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

// ============================================================================
// RESOLVERS
// ============================================================================
let domainId = new Map<string, number>();
let doId = new Map<string, number>();
let toolId = new Map<string, number>();
let skillId = new Map<string, number>();

async function refreshDomains() {
  const r = await get(`/domains?select=id,domain_code&limit=10000`);
  domainId = new Map(r.map(x => [String(x.domain_code), Number(x.id)]));
}
async function refreshDOs() {
  const r = await get(`/data_objects?select=id,data_object_name&limit=10000`);
  doId = new Map(r.map(x => [String(x.data_object_name), Number(x.id)]));
}
async function refreshTools() {
  const r = await get(`/tools?select=id,tool_name&limit=10000`);
  toolId = new Map(r.map(x => [String(x.tool_name), Number(x.id)]));
}
async function refreshSkills() {
  const r = await get(`/skills?select=id,skill_name&limit=10000`);
  skillId = new Map(r.map(x => [String(x.skill_name), Number(x.id)]));
}
await Promise.all([refreshDomains(), refreshDOs(), refreshTools(), refreshSkills()]);

const existingSkillToolRows = await get(`/skill_tools?select=skill_id,tool_id&limit=20000`);
const stKey = (s: number, t: number) => `${s}:${t}`;
const existingSkillTools = new Set(existingSkillToolRows.map(r => stKey(Number(r.skill_id), Number(r.tool_id))));

console.log(`Resolved: ${domainId.size} domains, ${doId.size} data_objects, ${toolId.size} tools, ${skillId.size} skills, ${existingSkillTools.size} skill_tools.\n`);

// ============================================================================
// NEW TOOLS — query (one per master / required-consumer DO that lacks one)
// ============================================================================
type ToolDraft = { tool_name: string; operation_kind: "query" | "mutate"; data_object_name: string; description: string };

// All unique data_objects referenced as query targets across the 12 system skills.
// (Already-existing query tools from P2.3 are excluded.)
const newQueryTools: ToolDraft[] = [
  // APM
  { tool_name: "query_enterprise_applications", operation_kind: "query", data_object_name: "enterprise_applications", description: "Read enterprise applications in the APM portfolio via Semantius CRUD." },
  { tool_name: "query_application_costs", operation_kind: "query", data_object_name: "application_costs", description: "Read application TCO records via Semantius CRUD." },
  { tool_name: "query_technology_platforms", operation_kind: "query", data_object_name: "technology_platforms", description: "Read technology platform / tech-stack inventory via Semantius CRUD." },
  { tool_name: "query_technology_fit_assessments", operation_kind: "query", data_object_name: "technology_fit_assessments", description: "Read architecture fit assessments via Semantius CRUD." },
  { tool_name: "query_application_interfaces", operation_kind: "query", data_object_name: "application_interfaces", description: "Read integration-point inventory via Semantius CRUD." },
  { tool_name: "query_application_value_scores", operation_kind: "query", data_object_name: "application_value_scores", description: "Read multi-dimensional application value scores via Semantius CRUD." },
  { tool_name: "query_business_capability_maps", operation_kind: "query", data_object_name: "business_capability_maps", description: "Read business capability maps via Semantius CRUD." },
  { tool_name: "query_saas_applications", operation_kind: "query", data_object_name: "saas_applications", description: "Read SMP-mastered SaaS application records via Semantius CRUD." },
  { tool_name: "query_software_titles", operation_kind: "query", data_object_name: "software_titles", description: "Read SAM software titles via Semantius CRUD." },
  // SPM
  { tool_name: "query_portfolios", operation_kind: "query", data_object_name: "portfolios", description: "Read strategic portfolios via Semantius CRUD." },
  { tool_name: "query_strategic_initiatives", operation_kind: "query", data_object_name: "strategic_initiatives", description: "Read strategic initiatives via Semantius CRUD." },
  { tool_name: "query_roadmap_items", operation_kind: "query", data_object_name: "roadmap_items", description: "Read roadmap items via Semantius CRUD." },
  { tool_name: "query_business_value_assessments", operation_kind: "query", data_object_name: "business_value_assessments", description: "Read business value assessments via Semantius CRUD." },
  { tool_name: "query_resource_allocations", operation_kind: "query", data_object_name: "resource_allocations", description: "Read resource allocations via Semantius CRUD." },
  { tool_name: "query_demand_intake_requests", operation_kind: "query", data_object_name: "demand_intake_requests", description: "Read demand intake requests via Semantius CRUD." },
  { tool_name: "query_scenario_plans", operation_kind: "query", data_object_name: "scenario_plans", description: "Read strategic scenario plans via Semantius CRUD." },
  { tool_name: "query_dependency_chains", operation_kind: "query", data_object_name: "dependency_chains", description: "Read initiative-level dependency chains via Semantius CRUD." },
  { tool_name: "query_benefits_tracking_records", operation_kind: "query", data_object_name: "benefits_tracking_records", description: "Read benefits tracking records via Semantius CRUD." },
  { tool_name: "query_okr_objectives", operation_kind: "query", data_object_name: "okr_objectives", description: "Read OKR objectives via Semantius CRUD." },
  { tool_name: "query_financial_scenarios", operation_kind: "query", data_object_name: "financial_scenarios", description: "Read EPM financial scenarios via Semantius CRUD." },
  { tool_name: "query_workforce_scenarios", operation_kind: "query", data_object_name: "workforce_scenarios", description: "Read SWP workforce scenarios via Semantius CRUD." },
  // GRC
  { tool_name: "query_risks", operation_kind: "query", data_object_name: "risks", description: "Read enterprise risk register via Semantius CRUD." },
  { tool_name: "query_controls", operation_kind: "query", data_object_name: "controls", description: "Read GRC control definitions via Semantius CRUD." },
  { tool_name: "query_control_assessments", operation_kind: "query", data_object_name: "control_assessments", description: "Read continuous control assessments via Semantius CRUD." },
  { tool_name: "query_policies", operation_kind: "query", data_object_name: "policies", description: "Read governance policies via Semantius CRUD." },
  { tool_name: "query_policy_attestations", operation_kind: "query", data_object_name: "policy_attestations", description: "Read policy attestation records via Semantius CRUD." },
  { tool_name: "query_compliance_obligations", operation_kind: "query", data_object_name: "compliance_obligations", description: "Read compliance obligations via Semantius CRUD." },
  { tool_name: "query_compliance_evidence", operation_kind: "query", data_object_name: "compliance_evidence", description: "Read compliance evidence artifacts via Semantius CRUD." },
  { tool_name: "query_issues", operation_kind: "query", data_object_name: "issues", description: "Read GRC issues via Semantius CRUD." },
  { tool_name: "query_remediation_plans", operation_kind: "query", data_object_name: "remediation_plans", description: "Read remediation plans via Semantius CRUD." },
  { tool_name: "query_risk_assessments", operation_kind: "query", data_object_name: "risk_assessments", description: "Read risk assessment runs via Semantius CRUD." },
  { tool_name: "query_contract_obligations", operation_kind: "query", data_object_name: "contract_obligations", description: "Read CLM contract obligations via Semantius CRUD." },
  { tool_name: "query_employees", operation_kind: "query", data_object_name: "employees", description: "Read employee records via Semantius CRUD." },
  // AUDIT
  { tool_name: "query_audit_plans", operation_kind: "query", data_object_name: "audit_plans", description: "Read audit plans via Semantius CRUD." },
  { tool_name: "query_audit_engagements", operation_kind: "query", data_object_name: "audit_engagements", description: "Read audit engagements via Semantius CRUD." },
  { tool_name: "query_audit_findings", operation_kind: "query", data_object_name: "audit_findings", description: "Read audit findings via Semantius CRUD." },
  { tool_name: "query_work_papers", operation_kind: "query", data_object_name: "work_papers", description: "Read audit work papers via Semantius CRUD." },
  { tool_name: "query_control_tests", operation_kind: "query", data_object_name: "control_tests", description: "Read audit-exercise control tests via Semantius CRUD." },
  { tool_name: "query_audit_recommendations", operation_kind: "query", data_object_name: "audit_recommendations", description: "Read audit recommendations via Semantius CRUD." },
  { tool_name: "query_audit_reports", operation_kind: "query", data_object_name: "audit_reports", description: "Read audit reports via Semantius CRUD." },
  { tool_name: "query_follow_up_actions", operation_kind: "query", data_object_name: "follow_up_actions", description: "Read audit follow-up actions via Semantius CRUD." },
  { tool_name: "query_forecasts", operation_kind: "query", data_object_name: "forecasts", description: "Read EPM rolling forecasts via Semantius CRUD." },
  // query_vendors dropped: `vendors` is the catalog reference table (legal entities), not a Semantius data_object. AUDIT's vendor consumer maps to `query_suppliers`.
  // DCG
  { tool_name: "query_data_assets", operation_kind: "query", data_object_name: "data_assets", description: "Read cataloged data assets via Semantius CRUD." },
  { tool_name: "query_data_lineage_relationships", operation_kind: "query", data_object_name: "data_lineage_relationships", description: "Read data-lineage edges via Semantius CRUD." },
  { tool_name: "query_glossary_terms", operation_kind: "query", data_object_name: "glossary_terms", description: "Read business glossary terms via Semantius CRUD." },
  { tool_name: "query_data_classifications", operation_kind: "query", data_object_name: "data_classifications", description: "Read data classification taxonomy via Semantius CRUD." },
  { tool_name: "query_data_domains", operation_kind: "query", data_object_name: "data_domains", description: "Read data subject-area groupings via Semantius CRUD." },
  { tool_name: "query_data_stewardship_assignments", operation_kind: "query", data_object_name: "data_stewardship_assignments", description: "Read steward assignments via Semantius CRUD." },
  { tool_name: "query_data_certifications", operation_kind: "query", data_object_name: "data_certifications", description: "Read data certification records via Semantius CRUD." },
  { tool_name: "query_data_access_policies", operation_kind: "query", data_object_name: "data_access_policies", description: "Read governance data access policies via Semantius CRUD." },
  { tool_name: "query_data_usage_metrics", operation_kind: "query", data_object_name: "data_usage_metrics", description: "Read data usage metrics via Semantius CRUD." },
  { tool_name: "query_metric_definitions", operation_kind: "query", data_object_name: "metric_definitions", description: "Read metric definitions via Semantius CRUD." },
  { tool_name: "query_data_products", operation_kind: "query", data_object_name: "data_products", description: "Read data products via Semantius CRUD." },
  { tool_name: "query_ontologies", operation_kind: "query", data_object_name: "ontologies", description: "Read formal ontology models via Semantius CRUD." },
  // DQ
  { tool_name: "query_quality_rules", operation_kind: "query", data_object_name: "quality_rules", description: "Read data quality rules via Semantius CRUD." },
  { tool_name: "query_quality_incidents", operation_kind: "query", data_object_name: "quality_incidents", description: "Read data quality incidents via Semantius CRUD." },
  { tool_name: "query_profile_results", operation_kind: "query", data_object_name: "profile_results", description: "Read data profile results via Semantius CRUD." },
  { tool_name: "query_dq_dimensions", operation_kind: "query", data_object_name: "dq_dimensions", description: "Read DQ dimension reference data via Semantius CRUD." },
  { tool_name: "query_dq_scorecards", operation_kind: "query", data_object_name: "dq_scorecards", description: "Read DQ scorecards via Semantius CRUD." },
  { tool_name: "query_dq_sla_definitions", operation_kind: "query", data_object_name: "dq_sla_definitions", description: "Read DQ SLA definitions via Semantius CRUD." },
  // MDM
  { tool_name: "query_customer_golden_records", operation_kind: "query", data_object_name: "customer_golden_records", description: "Read resolved customer golden records via Semantius CRUD." },
  { tool_name: "query_supplier_golden_records", operation_kind: "query", data_object_name: "supplier_golden_records", description: "Read resolved supplier golden records via Semantius CRUD." },
  { tool_name: "query_employee_golden_records", operation_kind: "query", data_object_name: "employee_golden_records", description: "Read resolved employee golden records via Semantius CRUD." },
  { tool_name: "query_match_rules", operation_kind: "query", data_object_name: "match_rules", description: "Read MDM match rules via Semantius CRUD." },
  { tool_name: "query_merge_rules", operation_kind: "query", data_object_name: "merge_rules", description: "Read MDM merge / survivorship rules via Semantius CRUD." },
  { tool_name: "query_source_records", operation_kind: "query", data_object_name: "source_records", description: "Read pre-merge source records via Semantius CRUD." },
  { tool_name: "query_suppliers", operation_kind: "query", data_object_name: "suppliers", description: "Read supplier master records via Semantius CRUD (note: query_suppliers already exists in P2.3 — this is a no-op if duplicate)." },
  // ESG
  { tool_name: "query_emissions_records", operation_kind: "query", data_object_name: "emissions_records", description: "Read GHG emissions records via Semantius CRUD." },
  { tool_name: "query_emission_factors", operation_kind: "query", data_object_name: "emission_factors", description: "Read emission factor lookup via Semantius CRUD." },
  { tool_name: "query_activity_data_records", operation_kind: "query", data_object_name: "activity_data_records", description: "Read ESG activity data records via Semantius CRUD." },
  { tool_name: "query_esg_targets", operation_kind: "query", data_object_name: "esg_targets", description: "Read ESG targets via Semantius CRUD." },
  { tool_name: "query_esg_metrics", operation_kind: "query", data_object_name: "esg_metrics", description: "Read ESG metric rollups via Semantius CRUD." },
  { tool_name: "query_esg_disclosures", operation_kind: "query", data_object_name: "esg_disclosures", description: "Read ESG disclosure packages via Semantius CRUD." },
  { tool_name: "query_supplier_esg_assessments", operation_kind: "query", data_object_name: "supplier_esg_assessments", description: "Read supplier ESG assessments via Semantius CRUD." },
  { tool_name: "query_facility_emissions", operation_kind: "query", data_object_name: "facility_emissions", description: "Read per-facility emissions rollups via Semantius CRUD." },
  { tool_name: "query_esg_initiatives", operation_kind: "query", data_object_name: "esg_initiatives", description: "Read ESG action programs via Semantius CRUD." },
  { tool_name: "query_supplier_qualifications", operation_kind: "query", data_object_name: "supplier_qualifications", description: "Read SUP-LIFE supplier qualifications via Semantius CRUD." },
  { tool_name: "query_financial_plans", operation_kind: "query", data_object_name: "financial_plans", description: "Read EPM financial plans via Semantius CRUD." },
  // CMDB extras (5 masters)
  { tool_name: "query_ci_relationships", operation_kind: "query", data_object_name: "ci_relationships", description: "Read CMDB CI relationships via Semantius CRUD." },
  { tool_name: "query_ci_baselines", operation_kind: "query", data_object_name: "ci_baselines", description: "Read CMDB CI baselines via Semantius CRUD." },
  { tool_name: "query_ci_classes", operation_kind: "query", data_object_name: "ci_classes", description: "Read CMDB CI class hierarchy via Semantius CRUD." },
  { tool_name: "query_service_maps", operation_kind: "query", data_object_name: "service_maps", description: "Read CMDB service maps via Semantius CRUD." },
  // EPM
  { tool_name: "query_budgets", operation_kind: "query", data_object_name: "budgets", description: "Read approved budgets via Semantius CRUD." },
  { tool_name: "query_variance_analyses", operation_kind: "query", data_object_name: "variance_analyses", description: "Read variance analyses via Semantius CRUD." },
  // PA
  { tool_name: "query_attrition_forecasts", operation_kind: "query", data_object_name: "attrition_forecasts", description: "Read PA attrition forecasts via Semantius CRUD." },
  { tool_name: "query_people_kpis", operation_kind: "query", data_object_name: "people_kpis", description: "Read PA people KPI rollups via Semantius CRUD." },
  { tool_name: "query_workforce_segments", operation_kind: "query", data_object_name: "workforce_segments", description: "Read PA workforce segment definitions via Semantius CRUD." },
  { tool_name: "query_engagement_surveys", operation_kind: "query", data_object_name: "engagement_surveys", description: "Read engagement survey responses via Semantius CRUD." },
  { tool_name: "query_predictive_models", operation_kind: "query", data_object_name: "predictive_models", description: "Read PA predictive model outputs via Semantius CRUD." },
  { tool_name: "query_employment_events", operation_kind: "query", data_object_name: "employment_events", description: "Read HCM employment event stream via Semantius CRUD." },
  { tool_name: "query_performance_reviews", operation_kind: "query", data_object_name: "performance_reviews", description: "Read performance review records via Semantius CRUD." },
  { tool_name: "query_learning_records", operation_kind: "query", data_object_name: "learning_records", description: "Read LMS learning records via Semantius CRUD." },
  { tool_name: "query_absence_requests", operation_kind: "query", data_object_name: "absence_requests", description: "Read absence requests via Semantius CRUD." },
  { tool_name: "query_pay_slips", operation_kind: "query", data_object_name: "pay_slips", description: "Read pay-slip records via Semantius CRUD." },
  // SWP
  { tool_name: "query_workforce_plans", operation_kind: "query", data_object_name: "workforce_plans", description: "Read workforce plans via Semantius CRUD." },
  { tool_name: "query_headcount_plans", operation_kind: "query", data_object_name: "headcount_plans", description: "Read headcount plans via Semantius CRUD." },
  { tool_name: "query_position_demand_forecasts", operation_kind: "query", data_object_name: "position_demand_forecasts", description: "Read position demand forecasts via Semantius CRUD." },
  { tool_name: "query_skills_gap_analyses", operation_kind: "query", data_object_name: "skills_gap_analyses", description: "Read skills-gap analyses via Semantius CRUD." },
  { tool_name: "query_org_designs", operation_kind: "query", data_object_name: "org_designs", description: "Read SWP organisational designs via Semantius CRUD." },
  { tool_name: "query_workforce_cost_projections", operation_kind: "query", data_object_name: "workforce_cost_projections", description: "Read workforce cost projections via Semantius CRUD." },
  { tool_name: "query_labor_market_benchmarks", operation_kind: "query", data_object_name: "labor_market_benchmarks", description: "Read labor market benchmarks via Semantius CRUD." },
];

// ============================================================================
// NEW TOOLS — mutate (selective, one per master DO with obvious write workflow)
// ============================================================================
const newMutateTools: ToolDraft[] = [
  // APM
  { tool_name: "update_enterprise_application", operation_kind: "mutate", data_object_name: "enterprise_applications", description: "Update an enterprise application's lifecycle state, owner, or scoring." },
  { tool_name: "update_application_value_score", operation_kind: "mutate", data_object_name: "application_value_scores", description: "Refresh an application's value-score snapshot." },
  // SPM
  { tool_name: "create_strategic_initiative", operation_kind: "mutate", data_object_name: "strategic_initiatives", description: "Open a new strategic initiative." },
  { tool_name: "update_roadmap_item", operation_kind: "mutate", data_object_name: "roadmap_items", description: "Advance or update a roadmap item." },
  { tool_name: "approve_demand_intake_request", operation_kind: "mutate", data_object_name: "demand_intake_requests", description: "Approve a demand intake request and authorise an initiative." },
  { tool_name: "create_okr_objective", operation_kind: "mutate", data_object_name: "okr_objectives", description: "Open a new OKR objective." },
  // GRC
  { tool_name: "create_issue", operation_kind: "mutate", data_object_name: "issues", description: "Open a new GRC issue." },
  { tool_name: "update_remediation_plan", operation_kind: "mutate", data_object_name: "remediation_plans", description: "Update a GRC remediation plan." },
  { tool_name: "create_policy_attestation", operation_kind: "mutate", data_object_name: "policy_attestations", description: "Record a user policy acknowledgement." },
  // AUDIT
  { tool_name: "create_audit_finding", operation_kind: "mutate", data_object_name: "audit_findings", description: "Open a new audit finding." },
  { tool_name: "create_audit_engagement", operation_kind: "mutate", data_object_name: "audit_engagements", description: "Open a new audit engagement." },
  { tool_name: "update_audit_report", operation_kind: "mutate", data_object_name: "audit_reports", description: "Update an audit report's state (draft / reviewed / issued)." },
  { tool_name: "close_follow_up_action", operation_kind: "mutate", data_object_name: "follow_up_actions", description: "Close an audit follow-up action; triggers GRC issue closure handoff." },
  // DCG
  { tool_name: "classify_data_asset", operation_kind: "mutate", data_object_name: "data_assets", description: "Apply or update a sensitivity classification on a cataloged data asset." },
  { tool_name: "certify_data_asset", operation_kind: "mutate", data_object_name: "data_assets", description: "Certify a data asset as production-ready; triggers DQ monitoring activation." },
  { tool_name: "approve_data_access_request", operation_kind: "mutate", data_object_name: "data_access_policies", description: "Approve a data access request; signals downstream IGA / DLP." },
  // DQ
  { tool_name: "create_quality_rule", operation_kind: "mutate", data_object_name: "quality_rules", description: "Create a new data quality rule." },
  { tool_name: "raise_quality_incident", operation_kind: "mutate", data_object_name: "quality_incidents", description: "Open a new data quality incident from a rule breach." },
  // MDM
  { tool_name: "merge_records", operation_kind: "mutate", data_object_name: "source_records", description: "Apply merge decision across source records to resolve a golden record." },
  { tool_name: "update_match_rule", operation_kind: "mutate", data_object_name: "match_rules", description: "Update an MDM match rule definition." },
  // ESG
  { tool_name: "create_emissions_record", operation_kind: "mutate", data_object_name: "emissions_records", description: "Record a new GHG emissions fact." },
  { tool_name: "update_esg_disclosure", operation_kind: "mutate", data_object_name: "esg_disclosures", description: "Update an ESG disclosure draft." },
  { tool_name: "update_esg_target", operation_kind: "mutate", data_object_name: "esg_targets", description: "Update an ESG target's status or commitment." },
  // CMDB
  { tool_name: "update_configuration_item", operation_kind: "mutate", data_object_name: "configuration_items", description: "Update a CMDB configuration item." },
  // EPM
  { tool_name: "update_budget", operation_kind: "mutate", data_object_name: "budgets", description: "Update an approved budget allocation." },
  { tool_name: "update_forecast", operation_kind: "mutate", data_object_name: "forecasts", description: "Update an EPM rolling forecast." },
  // PA
  { tool_name: "update_predictive_model", operation_kind: "mutate", data_object_name: "predictive_models", description: "Update or refresh a PA predictive model's outputs." },
  // SWP
  { tool_name: "approve_headcount_plan", operation_kind: "mutate", data_object_name: "headcount_plans", description: "Approve a headcount plan; triggers ATS handoff (headcount.approved)." },
  { tool_name: "update_workforce_plan", operation_kind: "mutate", data_object_name: "workforce_plans", description: "Update an SWP workforce plan." },
];

const allNewTools = [...newQueryTools, ...newMutateTools];

// ============================================================================
// SKILLS (12, one per candidate domain, skill_type='system')
// ============================================================================
type SkillDraft = { skill_name: string; domain_code: string; description: string };
const newSkills: SkillDraft[] = [
  { skill_name: "apm-system", domain_code: "APM", description: "System skill for Application Portfolio Management — rationalises the enterprise application portfolio via TIME scoring, technology fit assessment, cost analytics, and capability-map alignment." },
  { skill_name: "cmdb-system", domain_code: "CMDB", description: "System skill for the Configuration Management Database — maintains the CI inventory, relationships, baselines, and service maps; detects drift and triggers incidents on unauthorized changes." },
  { skill_name: "epm-system", domain_code: "EPM", description: "System skill for Enterprise Performance Management — budgeting, rolling forecasts, variance analysis, scenario modeling." },
  { skill_name: "pa-system", domain_code: "PA", description: "System skill for People Analytics — workforce segmentation, attrition forecasting, engagement-survey distribution and analysis, predictive modeling on top of the HR stack." },
  { skill_name: "spm-system", domain_code: "SPM", description: "System skill for Strategic Portfolio Management — portfolio composition, initiative lifecycle, demand intake, scenario evaluation, benefits tracking." },
  { skill_name: "swp-system", domain_code: "SWP", description: "System skill for Strategic Workforce Planning — multi-year workforce plans, scenarios, headcount approvals, skills-gap analyses; triggers ATS recruiting on headcount approval." },
  { skill_name: "grc-system", domain_code: "GRC", description: "System skill for Governance, Risk and Compliance — risk register, control assessments, policy attestations, compliance obligations and evidence, issue + remediation lifecycle." },
  { skill_name: "audit-system", domain_code: "AUDIT", description: "System skill for Audit Management — audit plans, engagements, fieldwork findings, work papers, recommendations and report lifecycle; flows findings to GRC issues." },
  { skill_name: "dcg-system", domain_code: "DCG", description: "System skill for Data Catalog and Governance — data-asset inventory, classification, lineage, glossary, stewardship, certification, access policies, usage metrics." },
  { skill_name: "dq-system", domain_code: "DQ", description: "System skill for Data Quality — quality rules, incidents, profile results, scorecards, SLA tracking; escalates SLA-critical breaches to ITSM." },
  { skill_name: "mdm-system", domain_code: "MDM", description: "System skill for Master Data Management — match/merge/survivorship rules; resolves customer / supplier / employee golden records; publishes to downstream consumers." },
  { skill_name: "esg-system", domain_code: "ESG", description: "System skill for ESG Management — emissions records, targets, metrics rollups, disclosure packages, supplier ESG assessments, sustainability initiatives." },
];

// ============================================================================
// SKILL_TOOLS matrix
// (per skill, list [tool_name, requirement_level, notes])
// requirement_level: required | optional | fallback
// ============================================================================
type SkillToolTuple = [string, "required" | "optional" | "fallback"] | [string, "required" | "optional" | "fallback", string];

const skillToolsMatrix: Record<string, SkillToolTuple[]> = {
  "apm-system": [
    ["query_enterprise_applications", "required"],
    ["query_application_costs", "required"],
    ["query_technology_platforms", "required"],
    ["query_technology_fit_assessments", "required"],
    ["query_application_interfaces", "required"],
    ["query_application_value_scores", "required"],
    ["query_business_capability_maps", "required"],
    ["update_enterprise_application", "required"],
    ["update_application_value_score", "required"],
    ["query_saas_applications", "optional", "Cross-reads SMP for SaaS slice"],
    ["query_software_titles", "optional", "Cross-reads SAM for installed-software slice"],
    ["query_configuration_items", "optional", "Cross-reads CMDB for infrastructure dependency context"],
  ],
  "cmdb-system": [
    ["query_configuration_items", "required"],
    ["query_ci_relationships", "required"],
    ["query_ci_baselines", "required"],
    ["query_ci_classes", "required"],
    ["query_service_maps", "required"],
    ["update_configuration_item", "required"],
    ["create_incident", "required", "Fires on ci.unauthorized_change_detected handoff to ITSM"],
  ],
  "epm-system": [
    ["query_financial_plans", "required"],
    ["query_budgets", "required"],
    ["query_forecasts", "required"],
    ["query_variance_analyses", "required"],
    ["query_financial_scenarios", "required"],
    ["update_budget", "required"],
    ["update_forecast", "required"],
    ["query_journal_entries", "required", "Consumer from ERP-FIN — variance reporting input"],
    ["generate_text", "optional", "Variance commentary / narrative generation"],
  ],
  "pa-system": [
    // Masters
    ["query_attrition_forecasts", "required"],
    ["query_people_kpis", "required"],
    ["query_workforce_segments", "required"],
    ["query_engagement_surveys", "required"],
    ["query_predictive_models", "required"],
    ["update_predictive_model", "required"],
    // Consumers (PA's surface is wide — 8 consumer relationships)
    ["query_employees", "required", "Reads HCM employee master"],
    ["query_employment_events", "required", "Reads HCM event stream for tenure / time-based metrics"],
    ["query_performance_reviews", "required", "Reads for rater-bias + hi-po analytics"],
    ["query_learning_records", "required", "Reads LMS for L&D ROI / skill-gap closure"],
    ["query_absence_requests", "required", "Reads for burnout / absenteeism analytics"],
    ["query_pay_slips", "required", "Reads for pay-equity analytics"],
    // The compute + side_effect that drag PA below 100% Semantius
    ["generate_text", "required", "Attrition-narrative + survey-response analysis; PA workflow cannot complete without LLM generation"],
    ["send_email", "required", "Engagement-survey distribution; PA's survey workflow distributes via email"],
    ["embed_text", "optional", "Workforce-segment clustering via embeddings"],
    ["detect_sentiment", "optional", "Survey-response sentiment scoring"],
  ],
  "spm-system": [
    ["query_portfolios", "required"],
    ["query_strategic_initiatives", "required"],
    ["query_roadmap_items", "required"],
    ["query_business_value_assessments", "required"],
    ["query_resource_allocations", "required"],
    ["query_demand_intake_requests", "required"],
    ["query_scenario_plans", "required"],
    ["query_dependency_chains", "required"],
    ["query_benefits_tracking_records", "required"],
    ["query_okr_objectives", "required"],
    ["create_strategic_initiative", "required"],
    ["update_roadmap_item", "required"],
    ["approve_demand_intake_request", "required"],
    ["create_okr_objective", "required"],
    ["query_work_items", "required", "Rolls up WORK-MGMT completion for portfolio KPIs"],
    ["query_financial_scenarios", "required", "Reads EPM scenarios for financial impact of portfolio decisions"],
    ["query_workforce_scenarios", "required", "Reads SWP scenarios for resource-impact modelling"],
  ],
  "swp-system": [
    ["query_workforce_plans", "required"],
    ["query_headcount_plans", "required"],
    ["query_position_demand_forecasts", "required"],
    ["query_skills_gap_analyses", "required"],
    ["query_workforce_scenarios", "required"],
    ["query_org_designs", "required"],
    ["query_workforce_cost_projections", "required"],
    ["query_labor_market_benchmarks", "required"],
    ["query_job_requisitions", "required", "Co-master with ATS"],
    ["approve_headcount_plan", "required"],
    ["update_workforce_plan", "required"],
    ["create_candidate", "required", "Fires on headcount.approved → ATS handoff"],
    ["query_people_kpis", "required", "Consumer from PA — attrition / fill-rate inputs"],
    ["web_scrape", "optional", "Labor-market data ingestion fallback when no external_connector exists"],
  ],
  "grc-system": [
    ["query_risks", "required"],
    ["query_controls", "required"],
    ["query_control_assessments", "required"],
    ["query_policies", "required"],
    ["query_policy_attestations", "required"],
    ["query_compliance_obligations", "required"],
    ["query_compliance_evidence", "required"],
    ["query_issues", "required"],
    ["query_remediation_plans", "required"],
    ["query_risk_assessments", "required"],
    ["create_issue", "required"],
    ["update_remediation_plan", "required"],
    ["create_policy_attestation", "required"],
    ["query_contract_obligations", "required", "Consumer from CLM"],
    ["query_employees", "required", "For policy-attestation targeting"],
    ["create_incident", "required", "Fires on control.failed → ITSM handoff"],
    ["send_email", "optional", "Policy-update re-attestation notifications (Semantius can drive via in-app workflow instead)"],
  ],
  "audit-system": [
    ["query_audit_plans", "required"],
    ["query_audit_engagements", "required"],
    ["query_audit_findings", "required"],
    ["query_work_papers", "required"],
    ["query_control_tests", "required"],
    ["query_audit_recommendations", "required"],
    ["query_audit_reports", "required"],
    ["query_follow_up_actions", "required"],
    ["create_audit_finding", "required"],
    ["create_audit_engagement", "required"],
    ["update_audit_report", "required"],
    ["close_follow_up_action", "required", "Closure → GRC issue closure handoff"],
    ["query_journal_entries", "required", "Consumer from ERP-FIN for forensic review"],
    ["query_forecasts", "required", "Consumer from EPM for forecast-accuracy audit"],
    ["query_issues", "required", "Reads GRC issues created from AUDIT findings"],
    ["query_employees", "required", "For fieldwork roster + SoD testing"],
    ["query_suppliers", "required", "For third-party audit procedures (suppliers data_object covers vendor-mastered records)"],
    ["generate_text", "optional", "Audit-narrative generation"],
  ],
  "dcg-system": [
    ["query_data_assets", "required"],
    ["query_data_lineage_relationships", "required"],
    ["query_glossary_terms", "required"],
    ["query_data_classifications", "required"],
    ["query_data_domains", "required"],
    ["query_data_stewardship_assignments", "required"],
    ["query_data_certifications", "required"],
    ["query_data_access_policies", "required"],
    ["query_data_usage_metrics", "required"],
    ["query_metric_definitions", "required"],
    ["query_data_products", "required"],
    ["query_ontologies", "required"],
    ["classify_data_asset", "required"],
    ["certify_data_asset", "required"],
    ["approve_data_access_request", "required"],
    ["classify_text", "optional", "Auto-classification via LLM — humans-in-the-loop primary"],
    ["embed_text", "optional", "Semantic asset search"],
  ],
  "dq-system": [
    ["query_quality_rules", "required"],
    ["query_quality_incidents", "required"],
    ["query_profile_results", "required"],
    ["query_dq_dimensions", "required"],
    ["query_dq_scorecards", "required"],
    ["query_dq_sla_definitions", "required"],
    ["create_quality_rule", "required"],
    ["raise_quality_incident", "required"],
    ["create_incident", "required", "Fires on SLA-critical breach → ITSM handoff"],
    ["query_data_assets", "required", "Reads DCG-mastered assets to apply rules"],
  ],
  "mdm-system": [
    ["query_customer_golden_records", "required"],
    ["query_supplier_golden_records", "required"],
    ["query_employee_golden_records", "required"],
    ["query_match_rules", "required"],
    ["query_merge_rules", "required"],
    ["query_source_records", "required"],
    ["merge_records", "required"],
    ["update_match_rule", "required"],
    ["query_customers", "required", "Reads operational customer master to publish golden ID"],
    ["query_suppliers", "required", "Reads operational supplier master"],
    ["query_employees", "required", "Reads operational employee master"],
    ["embed_text", "optional", "ML-driven matching fallback when rule-based match is ambiguous"],
  ],
  "esg-system": [
    ["query_emissions_records", "required"],
    ["query_emission_factors", "required"],
    ["query_activity_data_records", "required"],
    ["query_esg_targets", "required"],
    ["query_esg_metrics", "required"],
    ["query_esg_disclosures", "required"],
    ["query_supplier_esg_assessments", "required"],
    ["query_facility_emissions", "required"],
    ["query_esg_initiatives", "required"],
    ["create_emissions_record", "required"],
    ["update_esg_disclosure", "required"],
    ["update_esg_target", "required"],
    ["query_supplier_qualifications", "required", "Contributor on SUP-LIFE supplier_qualifications"],
    ["query_suppliers", "required", "Reads supplier master"],
    ["query_financial_plans", "required", "Reads EPM for intensity-ratio calc"],
    ["generate_text", "optional", "Disclosure narrative generation (CSRD / TCFD prose) — manual drafting primary"],
  ],
};

// ============================================================================
// EXECUTION
// ============================================================================

// Validate all tool data_objects exist
for (const t of allNewTools) {
  if (!doId.has(t.data_object_name)) throw new Error(`data_object not found for tool ${t.tool_name}: ${t.data_object_name}`);
}

// --- Section 1: insert new tools (idempotent by tool_name) ---
const missingTools = allNewTools.filter(t => !toolId.has(t.tool_name));
console.log(`Section 1 — tools: ${allNewTools.length} planned (${newQueryTools.length} query + ${newMutateTools.length} mutate), ${missingTools.length} new to insert.`);
if (missingTools.length > 0) {
  const payload = missingTools.map(t => ({
    tool_name: t.tool_name,
    description: t.description,
    operation_kind: t.operation_kind,
    data_object_id: doId.get(t.data_object_name),
  }));
  await insert("/tools", payload);
  if (APPLY) await refreshTools();
}

// --- Section 2: insert skills (idempotent by skill_name) ---
const missingSkills = newSkills.filter(s => !skillId.has(s.skill_name));
console.log(`Section 2 — skills: ${newSkills.length} planned, ${missingSkills.length} new to insert.`);
if (missingSkills.length > 0) {
  const payload: Row[] = [];
  for (const s of missingSkills) {
    const did = domainId.get(s.domain_code);
    if (did === undefined) throw new Error(`Domain not found: ${s.domain_code}`);
    payload.push({ skill_name: s.skill_name, description: s.description, skill_type: "system", domain_id: did });
  }
  await insert("/skills", payload);
  if (APPLY) await refreshSkills();
}

// --- Section 3: insert skill_tools (idempotent on (skill_id, tool_id)) ---
const stPayload: Row[] = [];
const stSkipped: string[] = [];
let stPlanned = 0;
for (const [skillName, tools] of Object.entries(skillToolsMatrix)) {
  const sid = skillId.get(skillName);
  for (const t of tools) {
    stPlanned++;
    const [toolName, level, notes] = t.length === 3 ? t : [t[0], t[1], ""] as [string, string, string];
    const tid = toolId.get(toolName);
    if (sid === undefined) {
      if (!APPLY) { stSkipped.push(`${skillName}: skill pending insert`); continue; }
      throw new Error(`Skill not found: ${skillName}`);
    }
    if (tid === undefined) {
      if (!APPLY) { stSkipped.push(`${skillName}→${toolName}: tool pending`); continue; }
      throw new Error(`Tool not found: ${toolName}`);
    }
    if (existingSkillTools.has(stKey(sid, tid))) continue;
    stPayload.push({ skill_id: sid, tool_id: tid, requirement_level: level, notes });
  }
}
console.log(`Section 3 — skill_tools: ${stPlanned} planned, ${stPayload.length} to insert, ${stSkipped.length} dry-run skipped (resolve on apply).`);
if (stPayload.length > 0) await insert("/skill_tools", stPayload);

// --- Section 4: hypothesis-test rollup (post-load) ---
if (APPLY) {
  console.log(`\n=== Killer hypothesis test ===`);
  console.log(`For each system skill, % of required tools whose operation_kind ∈ {query, mutate} (= Semantius-covered today):\n`);
  const allTools = await get(`/tools?select=id,tool_name,operation_kind&limit=10000`);
  const opKindByTool = new Map(allTools.map(t => [String(t.tool_name), String(t.operation_kind)]));
  for (const [skillName, tools] of Object.entries(skillToolsMatrix)) {
    const required = tools.filter(t => t[1] === "required");
    const semantiusCovered = required.filter(t => {
      const op = opKindByTool.get(t[0]);
      return op === "query" || op === "mutate";
    });
    const pct = (semantiusCovered.length / required.length) * 100;
    const flag = pct === 100 ? "✅ 100%" : `❌ ${pct.toFixed(0)}%`;
    console.log(`  ${flag.padEnd(8)} ${skillName.padEnd(16)} ${semantiusCovered.length}/${required.length} required tools are Semantius-covered`);
    if (pct < 100) {
      const dragsBelow = required.filter(t => {
        const op = opKindByTool.get(t[0]);
        return !(op === "query" || op === "mutate");
      });
      for (const d of dragsBelow) {
        console.log(`           ↳ NOT covered: ${d[0]} (${opKindByTool.get(d[0])})`);
      }
    }
  }
}

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
