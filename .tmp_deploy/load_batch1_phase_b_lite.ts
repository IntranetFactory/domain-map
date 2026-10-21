#!/usr/bin/env bun
// Batch-1 Phase-B Lite backfill — 11 of 12 candidate domains (EAM deferred).
//
// Scope: data_objects + master domain_data_objects ONLY. Trigger_events and
// cross_domain_handoffs are deferred — agent outputs were too inconsistent to
// load programmatically. record_status='new' triggers human review per rule #1.
//
//   bun run load_batch1_phase_b_lite.ts          -> DRY RUN
//   bun run load_batch1_phase_b_lite.ts --apply  -> Live

import { $ } from "bun";
$.throws(false);
const APPLY = process.argv.includes("--apply");

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
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
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  return out;
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

// Per-domain master proposals extracted from batch-1 agent drafts.
type Master = { name: string; label: string; desc: string };
const proposals: { code: string; masters: Master[] }[] = [
  { code: "PROD-MGMT", masters: [
    { name: "product_lines", label: "Product Line", desc: "Software product line under development and go-to-market. Higher-level than B2C-COMM `products` (SKUs); a product_line bundles features and product_releases over its lifecycle. PROD-MGMT flagship." },
    { name: "product_features", label: "Product Feature", desc: "Capability / story / epic within a product roadmap. Atomic unit of feature prioritisation and customer-to-release mapping." },
    { name: "product_releases", label: "Product Release", desc: "Versioned software release; bundles features and defines delivery date and scope." },
    { name: "product_roadmaps", label: "Product Roadmap", desc: "Timeline view of features grouped by release, product, or theme. Marquee PROD-MGMT capability." },
    { name: "feature_requests", label: "Feature Request", desc: "Customer request for new capability; input to the prioritisation workflow." },
    { name: "customer_feedback_items", label: "Customer Feedback Item", desc: "Qualitative or quantitative feedback from customers on product experience, gaps, or opportunities." },
    { name: "product_metrics", label: "Product Metric", desc: "KPI tracked over time per product (adoption %, NPS, DAU, feature usage, churn risk)." },
    { name: "beta_programs", label: "Beta Program", desc: "Controlled release cohort (customers, features, date range) for validation before GA." },
  ]},
  { code: "KMS", masters: [
    { name: "knowledge_base_articles", label: "Knowledge Base Article", desc: "Authored, versioned content unit. The KMS standalone-market master, distinct from ITSM/CSM/HRSD/LSD bundled `knowledge_articles` (which are platform-embedded). Lifecycle: draft → published → archived." },
    { name: "knowledge_categories", label: "Knowledge Category", desc: "Hierarchical organisation of articles (topics, sections, tags, search facets)." },
    { name: "article_revisions", label: "Article Revision", desc: "Audit trail of article edits: prior_version_id, author, timestamp, change_summary, revert capability." },
    { name: "article_feedback", label: "Article Feedback", desc: "User satisfaction signals: rating, helpful/not-helpful votes, comments." },
    { name: "knowledge_search_queries", label: "Knowledge Search Query", desc: "Logged search events for analytics; identifies gaps (zero-result queries)." },
    { name: "knowledge_collections", label: "Knowledge Collection", desc: "Curated groupings of articles (product docs, process guides, FAQs, onboarding playbooks). Audience tags + expiration." },
  ]},
  { code: "CPQ", masters: [
    { name: "quotes", label: "Sales Quote", desc: "Versioned, numbered quote document with quote date, validity, currency, terms, status (draft → presented → accepted → lost), total-price rollup. N:1 to CRM `opportunities`." },
    { name: "quote_lines", label: "Quote Line", desc: "Atomic configured-SKU line: unit price, quantity, line total; bundle nesting; line-level discounts and approval gates." },
    { name: "product_configurations", label: "Product Configuration", desc: "Captures user selections when building a quote line (options on a base SKU mapping to a variant)." },
    { name: "pricing_rules", label: "CPQ Pricing Rule", desc: "Calculation engine: tiered/volume discounts, seat-based pricing, duration-based pricing, bundle discounts, segment overrides." },
    { name: "quote_discounts", label: "Quote Discount", desc: "Line- and quote-level discounts: source (rule / manual / competitive), amount, approval status." },
    { name: "discount_approvals", label: "Discount Approval", desc: "Workflow records gating discount authority: approver (manager / finance / sales-ops), accept/reject." },
    { name: "product_bundles", label: "Product Bundle", desc: "Reusable package definitions: groups SKUs + mandatory/optional selection rules + bundled-discount rules." },
    { name: "contract_drafts", label: "CPQ Contract Draft", desc: "Approved-quote handoff artifact; precursor to CLM `contracts`. CPQ owns the draft; CLM owns the signed contract + amendments." },
  ]},
  { code: "OMS", masters: [
    { name: "order_allocations", label: "Order Allocation", desc: "Inventory-allocation decision per order line across warehouses/stores/3PLs. State: allocated / partially_allocated / backorder_pending. Core OMS function for split orders and cross-dock routing." },
    { name: "inventory_locations", label: "Inventory Location", desc: "Stock-location catalog: location_code, type (warehouse / store / 3pl / hub), on_hand, reserved, available_for_allocation. WMS will co-master balances when loaded." },
    { name: "sourcing_decisions", label: "Sourcing Decision", desc: "OMS routing logic output: which warehouse will fulfill which line, with rationale (lowest_cost / fastest_ship / fulfills_split / 3pl_preference / exception_override) and confidence_score." },
    { name: "return_authorizations", label: "Return Authorization (RMA)", desc: "RMA header created by OMS in response to a customer-initiated return or shipment.returned event. Refund_status (pending / authorized / refunded), return_location, tracking." },
    { name: "store_pickup_orders", label: "Store Pickup Order", desc: "B2C-COMM order subcase where fulfillment = store pickup. OMS masters store-assignment and hold-time orchestration: allocated_store_id, hold_window_start/end, pickup_status." },
  ]},
  { code: "ECM", masters: [
    { name: "documents", label: "Document", desc: "Binary file + metadata container; the ECM flagship entity. Distinct from DCG `data_assets` (metadata catalog) and DAM `digital_assets` (creative/brand)." },
    { name: "document_versions", label: "Document Version", desc: "Version history / audit trail per document; tracks publication and revision lineage." },
    { name: "document_folders", label: "Document Folder", desc: "Hierarchical containment for documents (SharePoint library, OpenText folder)." },
    { name: "document_classifications", label: "Document Classification", desc: "Metadata classification per ECM taxonomy (DCAT-style, custom records-class). Distinct from DCG `data_classifications` (sensitivity)." },
    { name: "records_retention_policies", label: "Records Retention Policy", desc: "Legal hold + disposition rules per document class (regulatory retention periods, destruction dates)." },
  ]},
  { code: "DI", masters: [
    { name: "pipeline_runs", label: "Pipeline Run", desc: "Execution instance of a data pipeline: runtime status, lineage snapshot, error state. References `data_pipelines` (DATA-AI-PLAT-mastered)." },
    { name: "source_connectors", label: "Source Connector", desc: "Connection metadata to upstream systems: auth mechanism, sync schedule, incremental-capture state, connector plugin type." },
    { name: "sink_connectors", label: "Sink Connector", desc: "Connection metadata to downstream targets: auth, batch/stream mode, upsert keys, schema enforcement rules." },
    { name: "transformation_jobs", label: "Transformation Job", desc: "In-flight data transformation logic: mappings, UDFs, validation rules, masking policies. May delegate to Spark/dbt/SQL engines." },
    { name: "schema_registries", label: "Schema Registry", desc: "Canonical schemas for data flowing through pipelines: field contracts, versioning, evolution rules. Feeds lineage." },
    { name: "change_data_capture_streams", label: "CDC Stream", desc: "Change-data-capture log metadata: source database table, captured columns, capture mode (row-level / query-level), watermark positions." },
    { name: "integration_flows", label: "Data Integration Flow", desc: "Higher-level orchestration composing multiple pipelines and connectors. Note potential overlap with DATA-AI-PLAT `data_pipelines` — DI lens is integration-tool, DATA-AI-PLAT lens is platform-engine." },
  ]},
  { code: "DXP", masters: [
    { name: "web_pages", label: "Web Page", desc: "Storable, URL-routable page composition assembled from content_components for a DXP-served digital channel." },
    { name: "content_components", label: "Content Component", desc: "Reusable composable block (hero, CTA, text, image, form). Many components per page." },
    { name: "experiences", label: "Digital Experience", desc: "Named digital experience / journey (e.g. 'post-purchase flow', 'lead nurture campaign'). Mapped to segments + A/B variants." },
    { name: "personalization_rules", label: "Personalization Rule", desc: "Context-aware branching logic (IF segment X THEN show variant Y) applied to experiences." },
    { name: "ab_tests", label: "A/B Test", desc: "Experimentation configuration: control vs variant, success metric, duration." },
    { name: "segments_dxp", label: "DXP Segment", desc: "DXP-local audience cluster for personalization (distinct from CDP `audience_segments` which are behavioural cross-channel)." },
    { name: "journey_steps", label: "Journey Step", desc: "Sequential node in an experience flow (step 1 → step 2 → exit)." },
  ]},
  { code: "KUBE-PLAT", masters: [
    { name: "kubernetes_clusters", label: "Kubernetes Cluster", desc: "Cluster resource: name, version, control-plane config, network CIDR, CNI choice, feature gates, API-server settings." },
    { name: "cluster_node_pools", label: "Cluster Node Pool", desc: "Worker-node grouping: instance type/size, scaling config, taints/tolerations, labels, zone distribution." },
    { name: "container_workloads", label: "Container Workload", desc: "Pod / Deployment / StatefulSet / Job / DaemonSet primitives: replica counts, restart policy, QoS class, affinity rules." },
    { name: "helm_releases", label: "Helm Release", desc: "Helm deployment tracking: chart name/version, values overrides, release namespace, installed status." },
    { name: "service_meshes", label: "Service Mesh", desc: "Istio / Linkerd / Consul / App Mesh / Tanzu Service Mesh installations: traffic policy, mTLS enforcement, distributed tracing config." },
    { name: "operator_installations", label: "Operator Installation", desc: "CRDs + controller deployments (cert-manager, kube-prometheus, flux, ArgoCD operators)." },
    { name: "platform_pipelines", label: "Platform Pipeline", desc: "CI/CD wired into cluster (GitOps, fleet orchestration): ArgoCD, Flux, Spinnaker, Jenkins-on-k8s." },
    { name: "container_registries", label: "Container Registry", desc: "Image repositories scoped to the cluster: ECR/ACR/GCR/Harbor/Artifactory policies, pull secrets, image scanning." },
  ]},
  { code: "APIM", masters: [
    { name: "api_versions", label: "API Version", desc: "Versioning lineage (v1.0, v2.0, sunset dates); each version has distinct policies, deployments, audience." },
    { name: "api_specifications", label: "API Specification", desc: "OpenAPI / AsyncAPI / GraphQL schema defining the interface contract. APIM publishes; APM `application_interfaces` reference via FK." },
    { name: "api_deployments", label: "API Deployment", desc: "Runtime instance: which API version runs where (prod, staging, regional). Tracks rollout, canary, regional distribution." },
    { name: "api_policies", label: "API Policy", desc: "Rules governing access, transformation, rate limits, authentication." },
    { name: "api_usage_metrics", label: "API Usage Metric", desc: "Aggregate call counts, latency percentiles, error rates per version/consumer. APIM observability layer." },
    { name: "api_gateways", label: "API Gateway", desc: "Gateway infrastructure (Kong, Apigee, Azure API Mgmt, AWS API GW) — deployment targets, throughput config." },
    { name: "api_consumers", label: "API Consumer Registration", desc: "Runtime registration of an API consumer: API key provisioning, scopes assigned, quota allocation, on/off toggle. SUB-MGMT co-master decision for `api_subscriptions` (business slice) deferred." },
  ]},
  { code: "APP-PAAS", masters: [
    { name: "paas_applications", label: "PaaS Application", desc: "Core app record: name, slug, region, buildpack/runtime, git repo, environment variables, domain bindings. Heroku-style." },
    { name: "paas_deployments", label: "PaaS Deployment", desc: "Activation/release record: app reference, version/commit, build status, release timestamp, deployment status (success / rollback / in_progress), deployer." },
    { name: "paas_environments", label: "PaaS Environment", desc: "Multi-tenancy: dev/staging/prod with env-specific config overrides, resource limits, addon bindings." },
    { name: "paas_runtime_instances", label: "PaaS Runtime Instance", desc: "Running compute unit (Heroku 'dyno' generalised): type/size, process type, uptime, memory/CPU metrics, status." },
    { name: "paas_addons", label: "PaaS Addon", desc: "Backing service (database, queue, cache, logging) per app: type, plan, provisioning status, plan cost." },
    { name: "paas_build_records", label: "PaaS Build Record", desc: "CI-side artifact capture: buildpack output, slug size, build time, buildpack version, env changes." },
  ]},
  { code: "IPAAS", masters: [
    { name: "integration_recipes", label: "Integration Recipe", desc: "Named, versioned template for recurring event-driven flows (Workato recipes, Boomi processes, Tray.io workflows)." },
    { name: "integration_runs", label: "Integration Run", desc: "Execution log per recipe invocation: timestamp, status, input_id, output_id, error_log, latency_ms." },
    { name: "connectors", label: "IPAAS Connector", desc: "Vendor connector definition (Salesforce, Slack, SAP, NetSuite) with auth_type (OAuth / API key / basic / mTLS)." },
    { name: "webhook_subscriptions", label: "Webhook Subscription", desc: "Event subscription: source_system, event_type, target_recipe, retry_policy, filter_logic." },
    { name: "integration_triggers", label: "Integration Trigger", desc: "Event source (scheduled / webhook / database-change / queue) with polling or push config." },
    { name: "integration_data_mappings", label: "Integration Data Mapping", desc: "Transformation rule: source_field → target_field, mapping_logic, transformation_type (direct / computed / lookup)." },
  ]},
];

// Resolve domain ids
const domainsRows = await get(`/domains?select=id,domain_code&limit=10000`);
const domainId = new Map(domainsRows.map(x => [String(x.domain_code), Number(x.id)]));

// Build data_object insert payload
const dataObjectPayload: Row[] = [];
const ddoPayload: Row[] = [];
const allMasterNames = new Set<string>();
for (const p of proposals) {
  for (const m of p.masters) {
    if (allMasterNames.has(m.name)) continue;
    allMasterNames.add(m.name);
    dataObjectPayload.push({ data_object_name: m.name, display_label: m.label, description: m.desc });
  }
}

// Verify no existing data_objects collide (re-check just before insert)
const existing = await get(`/data_objects?select=id,data_object_name&data_object_name=in.(${[...allMasterNames].join(",")})`);
const existingNames = new Set(existing.map(r => String(r.data_object_name)));
const toInsertDOs = dataObjectPayload.filter(d => !existingNames.has(String(d.data_object_name)));

console.log(`Section 1 — data_objects: ${dataObjectPayload.length} planned, ${toInsertDOs.length} to insert (${dataObjectPayload.length - toInsertDOs.length} already exist).`);
if (toInsertDOs.length > 0) await insert("/data_objects", toInsertDOs);

// Re-read data_object ids for ddo wiring
const allDOs = await get(`/data_objects?select=id,data_object_name&limit=10000`);
const doId = new Map(allDOs.map(x => [String(x.data_object_name), Number(x.id)]));

// domain_data_objects (master rows; idempotent on (domain, data_object, role))
const existingDdoRows = await get(`/domain_data_objects?select=domain_id,data_object_id,role&limit=20000`);
const ddoKey = (d: number, o: number, r: string) => `${d}:${o}:${r}`;
const existingDdos = new Set(existingDdoRows.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));

for (const p of proposals) {
  const did = domainId.get(p.code);
  if (did === undefined) { console.log(`  skip ${p.code}: domain not found`); continue; }
  for (const m of p.masters) {
    const oid = doId.get(m.name);
    if (oid === undefined) {
      if (!APPLY) { console.log(`  [DRY] ${p.code}/${m.name} ddo: data_object pending insert`); continue; }
      throw new Error(`data_object missing after insert: ${m.name}`);
    }
    if (existingDdos.has(ddoKey(did, oid, "master"))) continue;
    ddoPayload.push({ domain_id: did, data_object_id: oid, role: "master", notes: "Phase-B Lite batch 1 — agent-derived; trigger_events + handoffs deferred to follow-up audit pass" });
  }
}

console.log(`Section 2 — domain_data_objects (master): ${ddoPayload.length} to insert.`);
if (ddoPayload.length > 0) await insert("/domain_data_objects", ddoPayload);

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
