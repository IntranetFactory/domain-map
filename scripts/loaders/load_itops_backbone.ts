#!/usr/bin/env bun
// Load CMDB + DISCOVERY + ITOM + OBS + AIOPS data_objects, with the
// multi-master signals (Signal 1) and cross-domain handoffs (Signal 2) that
// turn the IT-ops backbone from "lots of contributor references but no master
// data" into a fully populated graph.
//
// 21 data_objects + ~18 multi-master rows + 12 handoffs. Idempotent.

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function semCall(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}

const get = (path: string) => semCall({ method: "GET", path });
const post = (path: string, body: Row | Row[]) => semCall({ method: "POST", path, body });

async function insertChunked(path: string, rows: Row[]): Promise<void> {
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    if (slice.length > 0) await post(path, slice);
  }
}

async function syncByKey<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=20000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insertChunked(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Resolve domain ids
const domainRows = await get(
  "/domains?domain_code=in.(CMDB,DISCOVERY,ITOM,OBS,AIOPS,ITSM,ITAM,HAM,SAM,SMP,SECOPS)&select=id,domain_code",
);
const did = (code: string) => {
  const r = domainRows.find(d => d.domain_code === code);
  if (!r) throw new Error(`domain ${code} not in catalog`);
  return Number(r.id);
};

// =============================================================================
// PHASE 1 — data_objects
// =============================================================================
console.log("\n=== Phase 1: data_objects ===");

type ObjSpec = { data_object_name: string; singular_label?: string; plural_label?: string; display_label: string; description: string; master_domain: string };

const allObjects: ObjSpec[] = [
  // ----- CMDB -----
  {
    data_object_name: "configuration_items",
    singular_label: "Configuration Item",
    plural_label: "Configuration Items",
    display_label: "Configuration Item",
    description: "Canonical record of an IT thing under management: server, container, application, business service, network device, database, cloud resource. The flagship CMDB entity, referenced by changes, incidents, problems, and topology. Multi-feed: DISCOVERY auto-populates, HAM provides the physical-asset overlay for hardware CIs, SAM/SMP overlay for software/SaaS CIs.",
    master_domain: "CMDB",
  },
  {
    data_object_name: "ci_relationships",
    singular_label: "CI Relationship",
    plural_label: "CI Relationships",
    display_label: "CI Relationship",
    description: "Edges in the CI graph: depends-on, runs-on, contains, member-of, hosted-by, communicates-with. The topology that makes service mapping, impact analysis, and event correlation possible.",
    master_domain: "CMDB",
  },
  {
    data_object_name: "ci_classes",
    singular_label: "CI Class",
    plural_label: "CI Classes",
    display_label: "CI Class",
    description: "The CI type hierarchy (Computer → Linux Server → Web Server, Application → Microservice → REST API) defining schema, inherited attributes, and class-level monitoring/discovery policies. The schema-of-schemas for the CMDB.",
    master_domain: "CMDB",
  },
  {
    data_object_name: "service_maps",
    singular_label: "Service Map",
    plural_label: "Service Maps",
    display_label: "Service Map",
    description: "Business-service-to-CI mapping: which CIs underlie a named business service. The bridge between technical topology (CMDB / DISCOVERY) and business impact (used by ITSM, SECOPS, OBS).",
    master_domain: "CMDB",
  },
  {
    data_object_name: "ci_baselines",
    singular_label: "CI Baseline",
    plural_label: "CI Baselines",
    display_label: "CI Baseline",
    description: "Captured configuration state at a point in time, used for drift detection, approved-state validation, and audit evidence. Triggers an unauthorized-change incident when current state diverges.",
    master_domain: "CMDB",
  },
  // ----- DISCOVERY -----
  {
    data_object_name: "discovery_scans",
    singular_label: "Discovery Scan",
    plural_label: "Discovery Scans",
    display_label: "Discovery Scan",
    description: "A discovery job execution: scope (subnet, cloud account, k8s cluster, AD forest), credentials used, start/end timestamps, candidates emitted, errors encountered.",
    master_domain: "DISCOVERY",
  },
  {
    data_object_name: "discovered_devices",
    singular_label: "Discovered Device",
    plural_label: "Discovered Devices",
    display_label: "Discovered Device",
    description: "Pre-CMDB candidate emitted by a scan, awaiting normalization and reconciliation into a configuration_item. The buffer between raw scan output and the curated CMDB; some candidates never promote (transient, duplicate, scope-excluded).",
    master_domain: "DISCOVERY",
  },
  {
    data_object_name: "discovery_sources",
    singular_label: "Discovery Source",
    plural_label: "Discovery Sources",
    display_label: "Discovery Source",
    description: "Connector / probe / credential definition for a discovery integration: vSphere, AWS account, Azure subscription, k8s cluster, Active Directory, SNMP credential. The configuration that drives scans.",
    master_domain: "DISCOVERY",
  },
  // ----- ITOM -----
  {
    data_object_name: "events",
    singular_label: "Event",
    plural_label: "Events",
    display_label: "Event",
    description: "Raw event from a monitored system — state change, threshold crossing, status update, log signal. The firehose, volume-heavy and noisy. AIOPS consumes the full stream for correlation; alerts are the human-relevant subset.",
    master_domain: "ITOM",
  },
  {
    data_object_name: "alerts",
    singular_label: "Alert",
    plural_label: "Alerts",
    display_label: "Alert",
    description: "Filtered, human-relevant subset of events that crossed a threshold, matched a pattern, or were enriched with priority and routing. Alerts are what gets paged or ticketed; events are what feeds the correlation engine.",
    master_domain: "ITOM",
  },
  {
    data_object_name: "monitoring_policies",
    singular_label: "Monitoring Policy",
    plural_label: "Monitoring Policies",
    display_label: "Monitoring Policy",
    description: "What to monitor, at what frequency, with what thresholds, for which CIs. Often auto-bound to CIs by class via DISCOVERY — a new web-server CI inherits the web-server monitoring policy by default.",
    master_domain: "ITOM",
  },
  {
    data_object_name: "capacity_records",
    singular_label: "Capacity Record",
    plural_label: "Capacity Records",
    display_label: "Capacity Record",
    description: "Resource utilization snapshots (CPU, memory, disk, throughput, IOPS) at fixed intervals for capacity planning, trend analysis, and FinOps cost allocation. The infra-side counterpart to OBS metric_series.",
    master_domain: "ITOM",
  },
  // ----- OBS -----
  {
    data_object_name: "metric_series",
    singular_label: "Metric Series",
    plural_label: "Metric Serieses",
    display_label: "Metric Series",
    description: "Time-series metric streams from instrumented applications — counters, gauges, histograms, summaries. The dev-instrumentation counterpart to ITOM's capacity_records, typically higher-cardinality and tied to release versions.",
    master_domain: "OBS",
  },
  {
    data_object_name: "log_entries",
    singular_label: "Log Entry",
    plural_label: "Log Entries",
    display_label: "Log Entry",
    description: "Application log stream entries, structured and unstructured. Indexed for search; correlated with metrics and traces for root-cause analysis.",
    master_domain: "OBS",
  },
  {
    data_object_name: "distributed_traces",
    singular_label: "Distributed Trace",
    plural_label: "Distributed Traces",
    display_label: "Distributed Trace",
    description: "End-to-end request traces across microservices — parent-child spans, service identification, latency attribution. The fundamental observability artifact for diagnosing latency and dependency issues in service meshes.",
    master_domain: "OBS",
  },
  {
    data_object_name: "service_level_objectives",
    singular_label: "SLO",
    plural_label: "SLOs",
    display_label: "SLO",
    description: "Service-level objective definitions and breach state: target (e.g. 99.9% requests under 300ms over 28 days), error budget remaining, burn rate, last breach. Drives the slo.breached handoff that creates incidents.",
    master_domain: "OBS",
  },
  {
    data_object_name: "error_groups",
    singular_label: "Error Group",
    plural_label: "Error Groups",
    display_label: "Error Group",
    description: "Aggregated exception records (Sentry-style): unique exception fingerprint, first/last seen, occurrence count, affected releases, environments, owners, status (unresolved/resolved/ignored).",
    master_domain: "OBS",
  },
  // ----- AIOPS -----
  {
    data_object_name: "event_correlations",
    singular_label: "Event Correlation",
    plural_label: "Event Correlations",
    display_label: "Event Correlation",
    description: "Clustered group of events and alerts identified as a single underlying incident — the noise-reduction artifact. A storm of 200 alerts collapses to one correlation with a candidate root-cause CI and the suggested incident.",
    master_domain: "AIOPS",
  },
  {
    data_object_name: "anomaly_detections",
    singular_label: "Anomaly Detection",
    plural_label: "Anomaly Detections",
    display_label: "Anomaly Detection",
    description: "Detected deviation from learned normal behaviour: KPI excursion outside seasonality bands, novel error pattern, traffic shape change. Feeds correlation and predictive_signals.",
    master_domain: "AIOPS",
  },
  {
    data_object_name: "root_cause_analyses",
    singular_label: "Root Cause Analysis",
    plural_label: "Root Cause Analysises",
    display_label: "Root Cause Analysis",
    description: "RCA record — ML-suggested or human-confirmed. Links candidate root-cause CIs to the correlated event cluster and the resulting incident. Seeds ITSM problem records via the root_cause.identified handoff.",
    master_domain: "AIOPS",
  },
  {
    data_object_name: "predictive_signals",
    singular_label: "Predictive Signal",
    plural_label: "Predictive Signals",
    display_label: "Predictive Signal",
    description: "Proactive forecast emitted before symptoms surface: predicted capacity exhaustion, predicted failure of a CI based on degradation pattern, predicted SLO breach within the burn-rate window.",
    master_domain: "AIOPS",
  },
];

const insertableObjects = allObjects.map(({ master_domain, ...rest }) => rest);
const dataObjMap = await syncByKey("/data_objects", insertableObjects, "data_object_name");

// =============================================================================
// PHASE 2 — master links
// =============================================================================
console.log("\n=== Phase 2: master links ===");

const allDDO = await get("/domain_data_objects?select=domain_id,data_object_id&limit=20000");
const existingDDOKey = new Set(allDDO.map(r => `${r.domain_id}|${r.data_object_id}`));

const masterRows = allObjects
  .map(o => ({
    domain_id: did(o.master_domain),
    data_object_id: dataObjMap.get(o.data_object_name)!,
    role: "master",
    notes: "",
  }))
  .filter(r => !existingDDOKey.has(`${r.domain_id}|${r.data_object_id}`));

if (masterRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${masterRows.length} master links`);
  await insertChunked("/domain_data_objects", masterRows);
} else {
  console.log(`  /domain_data_objects: all master links already present`);
}

// =============================================================================
// PHASE 3 — multi-master / contributor / consumer rows
// =============================================================================
console.log("\n=== Phase 3: multi-master / contributor / consumer rows ===");

type SignalRow = { data_object: string; domain: string; role: "master" | "contributor" | "consumer" | "derived"; notes: string };

const signals: SignalRow[] = [
  // configuration_items — the IT-ops flagship multi-master
  { data_object: "configuration_items", domain: "DISCOVERY", role: "contributor", notes: "Auto-discovered CI candidates feed CMDB via the ci.discovered handoff; reconciliation against existing CIs happens at the CMDB boundary." },
  { data_object: "configuration_items", domain: "HAM", role: "contributor", notes: "Hardware-asset side of the same physical thing — HAM masters the financial/lifecycle view, CMDB masters the operational/topology view. Cross-reference via natural keys (serial, MAC, asset tag)." },
  { data_object: "configuration_items", domain: "SAM", role: "contributor", notes: "Software-installation side feeds CIs that represent installed applications, with version and licence linkage." },
  { data_object: "configuration_items", domain: "SMP", role: "contributor", notes: "SaaS-application side feeds CIs for sanctioned SaaS apps (Slack, Salesforce) so they appear in business-service maps." },
  { data_object: "configuration_items", domain: "ITSM", role: "consumer", notes: "Incidents, problems, and changes reference CIs for impact analysis and routing." },
  { data_object: "configuration_items", domain: "AIOPS", role: "consumer", notes: "Topology and CI metadata power correlation — adjacent CIs in the relationship graph are likelier shared-cause candidates." },

  // ci_relationships — DISCOVERY contributes
  { data_object: "ci_relationships", domain: "DISCOVERY", role: "contributor", notes: "Auto-discovered topology (network flow, dependency probes, k8s service-mesh introspection) feeds the CMDB relationship graph." },

  // service_maps — DISCOVERY contributes, OBS consumes
  { data_object: "service_maps", domain: "DISCOVERY", role: "contributor", notes: "Service-mapping discovery (transaction tracing, dependency walks) produces candidate service maps that CMDB normalizes and publishes." },
  { data_object: "service_maps", domain: "OBS", role: "consumer", notes: "Overlays SLO state and trace-derived dependency information on service maps for engineering-side service health views." },

  // monitoring_policies — DISCOVERY contributes (auto-binds policies to discovered CIs)
  { data_object: "monitoring_policies", domain: "DISCOVERY", role: "contributor", notes: "Auto-binds class-default monitoring policies to newly discovered CIs via the device.requires_monitoring handoff." },

  // events — OBS, SECOPS contribute, AIOPS consumes
  { data_object: "events", domain: "OBS", role: "contributor", notes: "OBS-derived alerts (SLO breach, error-rate spike, anomaly trigger) feed back into the ITOM event stream for unified correlation." },
  { data_object: "events", domain: "SECOPS", role: "contributor", notes: "Security events that require operational coordination are mirrored into the ITOM event stream so AIOPS correlation sees the full picture." },
  { data_object: "events", domain: "AIOPS", role: "consumer", notes: "Primary input to event correlation, anomaly detection, and root-cause analysis." },

  // alerts — AIOPS contributes (suppression/rewriting), ITSM consumes
  { data_object: "alerts", domain: "AIOPS", role: "contributor", notes: "AIOPS rewrites the alert stream by suppressing known-noise patterns and promoting correlated clusters. The 'one alert per incident' goal lives or dies here." },
  { data_object: "alerts", domain: "ITSM", role: "consumer", notes: "Alerts that survive filtering become ITSM incidents via the event.alert_triggered handoff." },

  // error_groups — ITSM consumer
  { data_object: "error_groups", domain: "ITSM", role: "consumer", notes: "Error groups that exceed an occurrence threshold or impact production releases can seed ITSM incidents directly." },

  // distributed_traces — AIOPS consumer
  { data_object: "distributed_traces", domain: "AIOPS", role: "consumer", notes: "Trace-level anomalies (latency spikes on specific spans, error patterns localized to a service) feed AIOPS correlation alongside metric and log signals." },

  // service_level_objectives — ITSM consumer (slo.breached → incident)
  { data_object: "service_level_objectives", domain: "ITSM", role: "consumer", notes: "SLO breach events route into ITSM as incidents when the burn rate exceeds the error-budget threshold." },
];

const signalRows = signals
  .map(s => ({
    domain_id: did(s.domain),
    data_object_id: dataObjMap.get(s.data_object)!,
    role: s.role,
    notes: s.notes,
  }))
  .filter(r => !existingDDOKey.has(`${r.domain_id}|${r.data_object_id}`));

if (signalRows.length > 0) {
  console.log(`  /domain_data_objects: inserting ${signalRows.length} signal rows`);
  await insertChunked("/domain_data_objects", signalRows);
} else {
  console.log(`  /domain_data_objects: all signal rows already present`);
}

// =============================================================================
// PHASE 4 — cross_domain_handoffs
// =============================================================================
console.log("\n=== Phase 4: cross_domain_handoffs ===");

const doid = (name: string) => {
  const id = dataObjMap.get(name);
  if (!id) throw new Error(`data_object ${name} not loaded`);
  return id;
};

const handoffs = [
  {
    source_domain_id: did("DISCOVERY"),
    target_domain_id: did("CMDB"),
    data_object_id: doid("configuration_items"),
    trigger_event: "ci.discovered",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Discovered devices reconcile against the existing CMDB and either match (update existing CI), promote (create new CI), or queue for manual review (ambiguous match). Low friction when DISCOVERY and CMDB are same-vendor; medium otherwise.",
    notes: "",
  },
  {
    source_domain_id: did("DISCOVERY"),
    target_domain_id: did("CMDB"),
    data_object_id: doid("ci_relationships"),
    trigger_event: "relationship.discovered",
    integration_pattern: "event_stream",
    friction_level: "medium",
    description: "Discovered relationships (network flows, dependencies, k8s service-mesh edges) feed the CI relationship graph. Friction is medium — relationship discovery is noisier than device discovery, and pruning false-positive edges requires class-aware rules.",
    notes: "",
  },
  {
    source_domain_id: did("DISCOVERY"),
    target_domain_id: did("ITOM"),
    data_object_id: doid("monitoring_policies"),
    trigger_event: "device.requires_monitoring",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "New CI from DISCOVERY auto-binds to a class-default monitoring policy in ITOM. Friction sits in the class-to-policy mapping, which drifts as policies evolve.",
    notes: "",
  },
  {
    source_domain_id: did("CMDB"),
    target_domain_id: did("ITSM"),
    data_object_id: doid("incidents"),
    trigger_event: "ci.unauthorized_change_detected",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Configuration drift against a CI baseline (or change without a CAB-approved change record) creates a compliance / security incident in ITSM. Friction is medium — false positives from legitimate-but-unrecorded operational tweaks are common.",
    notes: "",
  },
  {
    source_domain_id: did("CMDB"),
    target_domain_id: did("AIOPS"),
    data_object_id: doid("event_correlations"),
    trigger_event: "topology.published",
    integration_pattern: "batch_sync",
    friction_level: "medium",
    description: "Periodic CMDB topology export feeds AIOPS's correlation graph. The latency between CMDB updates and AIOPS topology refresh is a quality lever — stale topology in AIOPS produces miscorrelations.",
    notes: "",
  },
  {
    source_domain_id: did("ITOM"),
    target_domain_id: did("AIOPS"),
    data_object_id: doid("event_correlations"),
    trigger_event: "events.burst_detected",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "Bursts of related events in the ITOM stream are pushed to AIOPS for correlation; AIOPS emits a correlation back. The primary data path for the IT-ops noise-reduction pipeline.",
    notes: "",
  },
  {
    source_domain_id: did("OBS"),
    target_domain_id: did("ITOM"),
    data_object_id: doid("alerts"),
    trigger_event: "alert.threshold_breached",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "OBS-side alerts (from metric thresholds, log patterns, trace anomalies) are mirrored into the ITOM event/alert stream so AIOPS and ITSM see them in the unified pipeline. Modern stacks make this near-trivial.",
    notes: "",
  },
  {
    source_domain_id: did("OBS"),
    target_domain_id: did("ITSM"),
    data_object_id: doid("incidents"),
    trigger_event: "slo.breached",
    integration_pattern: "event_stream",
    friction_level: "high",
    description: "SLO breach (error budget exhausted, burn-rate spike) creates an incident in ITSM. High friction in practice — the routing from a Datadog/Honeycomb SLO-breach event to a correctly assigned ServiceNow/Jira incident is rarely turnkey, especially when the SLO-owning team and the incident-handling team differ.",
    notes: "",
  },
  {
    source_domain_id: did("OBS"),
    target_domain_id: did("AIOPS"),
    data_object_id: doid("anomaly_detections"),
    trigger_event: "anomaly_candidate.detected",
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "OBS-detected anomalies (metric-shape deviations, latency-distribution shifts) feed AIOPS correlation as candidate inputs.",
    notes: "",
  },
  {
    source_domain_id: did("AIOPS"),
    target_domain_id: did("ITSM"),
    data_object_id: doid("incidents"),
    trigger_event: "correlation.identified",
    integration_pattern: "event_stream",
    friction_level: "high",
    description: "A correlated alert cluster surfaces as ONE incident in ITSM instead of N. The defining noise-reduction promise of AIOps — and the hardest integration to land cleanly, because suppressing the underlying alerts requires bidirectional state with ITOM, and ITSM needs to expose the correlated-events bundle as evidence on the incident.",
    notes: "",
  },
  {
    source_domain_id: did("AIOPS"),
    target_domain_id: did("ITSM"),
    data_object_id: doid("problems"),
    trigger_event: "root_cause.identified",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Confirmed RCA seeds an ITSM problem record (the long-lived root-cause artifact) and links it to the incident(s) that triggered it. Friction sits in the human-in-the-loop confirmation step — most AIOps RCAs need analyst sign-off before they reach problem-management.",
    notes: "",
  },
  {
    source_domain_id: did("AIOPS"),
    target_domain_id: did("ITOM"),
    data_object_id: doid("events"),
    trigger_event: "noise.suppression_applied",
    integration_pattern: "api_call",
    friction_level: "low",
    description: "AIOPS-learned noise-suppression rules feed back to ITOM to prune events at the source, reducing pipeline cost. Low friction because the feedback is rule-based and well-bounded.",
    notes: "",
  },
];

const allHandoffs = await get(
  "/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=20000",
);
const handoffKey = (r: Row) =>
  `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event}`;
const existingHoSet = new Set(allHandoffs.map(handoffKey));
const handoffsToInsert = handoffs.filter(h => !existingHoSet.has(handoffKey(h)));

if (handoffsToInsert.length > 0) {
  console.log(`  /cross_domain_handoffs: inserting ${handoffsToInsert.length} new handoffs`);
  await insertChunked("/cross_domain_handoffs", handoffsToInsert);
} else {
  console.log(`  /cross_domain_handoffs: all already present`);
}

// =============================================================================
// SUMMARY + leaderboards
// =============================================================================
console.log("\n=== Summary ===");
const totalDO = (await get("/data_objects?select=id")).length;
const totalDDO = (await get("/domain_data_objects?select=id&limit=20000")).length;
const totalHO = (await get("/cross_domain_handoffs?select=id&limit=20000")).length;
console.log(`  total data_objects:           ${totalDO}`);
console.log(`  total domain_data_objects:    ${totalDDO}`);
console.log(`  total cross_domain_handoffs:  ${totalHO}`);

console.log("\nMulti-master leaderboard (data_objects with role=master count > 1):");
const allMasterRows = await get("/domain_data_objects?role=eq.master&select=data_object_id&limit=20000");
const masterCount = new Map<number, number>();
for (const r of allMasterRows) {
  const id = Number(r.data_object_id);
  masterCount.set(id, (masterCount.get(id) ?? 0) + 1);
}
const multi = [...masterCount.entries()].filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
if (multi.length > 0) {
  const objNames = await get(`/data_objects?id=in.(${multi.map(([id]) => id).join(",")})&select=id,data_object_name`);
  const nameById = new Map(objNames.map(r => [Number(r.id), String(r.data_object_name)]));
  for (const [id, c] of multi) console.log(`  ${c}×  ${nameById.get(id)}`);
}

console.log("\nTotal-degree leaderboard (data_objects with most domain_data_objects rows — masters + contributors + consumers):");
const allDDORows = await get("/domain_data_objects?select=data_object_id&limit=20000");
const degCount = new Map<number, number>();
for (const r of allDDORows) {
  const id = Number(r.data_object_id);
  degCount.set(id, (degCount.get(id) ?? 0) + 1);
}
const topDegObj = [...degCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
const topNames = await get(`/data_objects?id=in.(${topDegObj.map(([id]) => id).join(",")})&select=id,data_object_name`);
const topNameById = new Map(topNames.map(r => [Number(r.id), String(r.data_object_name)]));
for (const [id, c] of topDegObj) console.log(`  ${c}×  ${topNameById.get(id)}`);

console.log("\nHandoff hotspots (top domains by total handoff degree):");
const allHo = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id&limit=20000");
const degree = new Map<number, number>();
for (const r of allHo) {
  degree.set(Number(r.source_domain_id), (degree.get(Number(r.source_domain_id)) ?? 0) + 1);
  degree.set(Number(r.target_domain_id), (degree.get(Number(r.target_domain_id)) ?? 0) + 1);
}
const topDeg = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
const allDoms = await get(`/domains?id=in.(${topDeg.map(([id]) => id).join(",")})&select=id,domain_code`);
const codeById = new Map(allDoms.map(r => [Number(r.id), String(r.domain_code)]));
for (const [id, c] of topDeg) console.log(`  ${c}×  ${codeById.get(id)}`);

console.log("\nUI:");
console.log("  https://tests.semantius.app/domain_map/data_objects");
console.log("  https://tests.semantius.app/domain_map/domain_data_objects");
console.log("  https://tests.semantius.app/domain_map/cross_domain_handoffs");
