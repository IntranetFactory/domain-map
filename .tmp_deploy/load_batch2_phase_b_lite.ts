#!/usr/bin/env bun
// Batch-2 Phase-B Lite backfill — 11 of 12 candidate domains researched
// (CAFM concluded data-object-empty by subagent analysis; tier marker under
// REAL-EST, consumes REAL-EST masters without introducing new ones).
//
// Scope: data_objects + master domain_data_objects ONLY. Trigger_events and
// cross_domain_handoffs are deferred (consistent with batch-1 approach).
// record_status='new' triggers human review.
//
//   bun run load_batch2_phase_b_lite.ts          -> DRY RUN
//   bun run load_batch2_phase_b_lite.ts --apply  -> Live

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
  if (!APPLY) { console.log(`  [DRY] POST ${rows.length} -> ${path}`); return []; }
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(...await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) }));
  return out;
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

type Master = { name: string; label: string; desc: string };
const proposals: { code: string; masters: Master[] }[] = [
  { code: "RPA", masters: [
    { name: "rpa_bots", label: "RPA Bot", desc: "Automated agent definition: name, description, process flow/logic, trigger conditions, error handling rules, version history. The RPA master entity. Distinct from IPAAS `integration_recipes` (server-to-server orchestration) — RPA bots drive UI-level interactions across legacy applications." },
    { name: "rpa_executions", label: "RPA Execution", desc: "Single run of an rpa_bot: start_time, end_time, status (success / failure / paused), execution_log, input_variables, output_results." },
    { name: "rpa_schedules", label: "RPA Schedule", desc: "Recurring bot execution configuration: frequency (cron), timezone, enabled/disabled state, next_run_timestamp, retention_policy for execution logs." },
    { name: "rpa_activities", label: "RPA Activity", desc: "Discrete UI-level action within an rpa_bot (click, type, extract_text, wait, conditional_branch). Sequenced to form the bot logic." },
    { name: "rpa_activity_logs", label: "RPA Activity Log", desc: "Per-execution trace of individual activity: activity_id, sequence, status, screenshot (optional), data_captured, timestamp, error_details." },
    { name: "rpa_bot_credentials", label: "RPA Bot Credential", desc: "Stored secrets used by bots: credential_type (username/password / API key / OAuth token), target_system, encrypted_value, rotation_policy." },
    { name: "rpa_deployment_packages", label: "RPA Deployment Package", desc: "Versioned, distributable bot package: version, release_notes, package_checksum, deployment_timestamp, target_environment (dev / staging / prod), deployed_by." },
  ]},
  { code: "IDP", masters: [
    { name: "capture_batches", label: "Capture Batch", desc: "Collection of physical or digital documents submitted together for IDP processing. Carries batch_id, source_system, capture_date, document_count, status (received / in_progress / completed / failed), and audit metadata." },
    { name: "idp_extraction_models", label: "IDP Extraction Model", desc: "ML or rule-based model trained to extract structured fields from documents (invoices, contracts, forms, receipts). Carries model_type, training lineage, performance metrics, version, deployment_status. Distinct from MLM `ml_models` (generic ML registry)." },
    { name: "extracted_fields", label: "Extracted Field", desc: "Single structured value extracted from a document by an IDP model. Carries document_id, field_name, field_value, extraction_confidence, model_version, extraction_timestamp. The granularity unit for field-level validation." },
    { name: "extracted_records", label: "Extracted Record", desc: "Logical grouping of extracted fields as a single business entity (invoice with line_items, form with section_answers). Carries record_type, aggregate_confidence, extraction_timestamp, status." },
    { name: "idp_validation_results", label: "IDP Validation Result", desc: "Validation outcome for an extracted record/field set. Carries validation_rule_id, status (pass / fail / review), exception_details, validator_id (automated / human), resolution_state." },
    { name: "document_classification_results", label: "Document Classification Result", desc: "Output of document-type classification: classified_document_type (invoice / contract / form / receipt / id / other), classification_confidence, model_version, timestamp." },
    { name: "idp_extraction_templates", label: "IDP Extraction Template", desc: "Reusable definition per document type: field structure, validation rules, target_system mapping. Distinct from ECM `document_classifications` (taxonomy) and CLM `contract_templates` (assembly)." },
    { name: "training_datasets", label: "Training Dataset", desc: "Labeled document samples used to train or fine-tune IDP extraction models. Carries document_type, sample_count, labeling completion, training window, lineage to trained models." },
  ]},
  { code: "NPMD", masters: [
    { name: "network_flow_records", label: "Network Flow Record", desc: "Captured packet/session flows with source/destination IPs, ports, protocols, bytes transferred, duration. The raw observation unit for NPMD traffic analysis." },
    { name: "network_paths", label: "Network Path", desc: "Path trace result from source to destination: ordered hop sequence with per-hop latency, cumulative loss rates, RTT. Used for end-to-end path diagnostics." },
    { name: "network_performance_metrics", label: "Network Performance Metric", desc: "Time-series of latency, jitter, packet loss, throughput sampled across flows, links, application paths. Primary signal for network SLO/KPI reporting." },
    { name: "network_performance_alerts", label: "Network Performance Alert", desc: "Threshold breach or anomaly on network performance metrics. Carries severity, affected path/flow, baseline correlation. Network-specific (vs generic OBS alerts)." },
    { name: "network_interfaces", label: "Network Interface", desc: "Physical or virtual network interface on monitored devices (adapters, ports, logical channels). Collection point for flow capture; distinct from CMDB device CI." },
    { name: "saas_application_performance", label: "SaaS Application Performance", desc: "Synthetic or real-user monitoring of SaaS app availability and response time from multiple geographies, networks, ISPs. Captures internet/WAN path quality as seen by end users." },
    { name: "network_topology_snapshots", label: "Network Topology Snapshot", desc: "Periodic capture of network connectivity: device adjacency, link status, interface roles. Used for topology visualization and root-cause correlation." },
    { name: "network_baseline_thresholds", label: "Network Baseline Threshold", desc: "Historical baseline performance profile (median/p95 latency, loss, jitter) per path/flow/link segment. Used for anomaly detection and alert tuning." },
  ]},
  { code: "DCIM", masters: [
    { name: "dc_racks", label: "Data Center Rack", desc: "Physical rack frame: height in RUs, location (room/row/aisle), power budget, cooling zone, asset tag. Parent = data center site. Holds cabinets and equipment." },
    { name: "dc_cabinets", label: "Data Center Cabinet", desc: "Enclosed or open cabinet within a rack: front/rear layout, power distribution, cable management, access control, temperature sensor zones. Holds servers, network gear, UPS, patch panels." },
    { name: "dc_power_distribution_units", label: "Power Distribution Unit (PDU)", desc: "Rack or cabinet PDU: input phases, output outlets/breakers, per-phase/outlet metering, managed (SNMP) vs manual, firmware version. Critical for capacity planning and load balancing." },
    { name: "dc_power_circuits", label: "DC Power Circuit", desc: "Electrical circuit from site feed to PDU outlet: capacity (amps/watts), utility meter reference, voltage, phase assignment, breaker state, redundancy config." },
    { name: "dc_uninterruptible_power_supplies", label: "UPS / RPP", desc: "UPS or rotary power pool unit: input/output capacity, battery health, last test date, load level, bypass state. Site or zone-level unit." },
    { name: "dc_cooling_units", label: "Data Center Cooling Unit", desc: "CRAC, CRAH, or in-row cooler: capacity (kW), zone served, inlet/outlet temperature setpoint, current power draw, refrigerant state. Required for thermal capacity assessment." },
    { name: "dc_environmental_readings", label: "DC Environmental Reading", desc: "Real-time/historical temperature, humidity, airflow, pressure from cabinet/aisle/zone sensors. Time-series telemetry for hot-spot detection." },
    { name: "dc_capacity_plans", label: "DC Capacity Plan", desc: "Forward-looking projection of power, cooling, space, bandwidth capacity per site/zone/period: utilization forecast, headroom, planned augmentations. Drives growth planning and colo negotiations." },
    { name: "dc_port_connections", label: "DC Port Connection", desc: "Network or power port on a device (server NIC, switch port, PDU outlet): interface name, speed/type (10GbE / 40GbE / RJ45 / IEC309), neighbor endpoint, vlan/circuit assignment, usage status. Topology for network and power connectivity." },
    { name: "dc_cable_connections", label: "DC Cable Connection", desc: "Physical cable plant: from-port → to-port, cable length, type (fiber / copper / power), installation date, test state, failure history. Distinct from dc_port_connections (logical endpoints)." },
  ]},
  { code: "UEM", masters: [
    { name: "enrolled_devices", label: "Enrolled Device", desc: "Device under MDM/UEM management: enrollment identity, status (active / suspended / unenrolled), ownership (corp / byod), managed-by-profile reference, last sync timestamp. Distinct from HAM `hardware_assets` (financial lifecycle) and CMDB `configuration_items` (topology)." },
    { name: "device_configuration_profiles", label: "Device Configuration Profile", desc: "Device settings template: WiFi credentials, VPN config, certificate pinning, security baselines, FileVault, BitLocker, Android hardening. Version-controlled, assigned to device cohorts." },
    { name: "device_compliance_policies", label: "Device Compliance Policy", desc: "Baseline policy defining required device state: OS version floor, encryption enforcement, app blocklist, jailbreak/root detection, password policy. Evaluated per enrolled_device per scan." },
    { name: "mobile_app_packages", label: "Mobile App Package", desc: "App distribution unit: app identifier, version, manifest, app-store link (Apple / Google Play / custom), install silently flag. Distinct from APM `enterprise_applications` (business app portfolio)." },
    { name: "device_app_assignments", label: "Device App Assignment", desc: "Which mobile_app_packages are pushed to which enrolled_devices: assignment status (pending / installed / failed), install timestamp, removal flag." },
    { name: "enrollment_tokens", label: "UEM Enrollment Token", desc: "Zero-touch provisioning credential: token string, QR code, validity window, device-assignment batch, redemption count, expiry. Distributed for device onboarding." },
    { name: "device_deployment_results", label: "Device Deployment Result", desc: "Outcome log for each policy/profile/app deployment: trigger (compliance-push / scheduled / manual), timestamp, success flag, error_code, device state delta." },
    { name: "device_compliance_results", label: "Device Compliance Result", desc: "Periodic scan result per enrolled_device: policies evaluated, pass/fail per policy, non-compliant findings, available remediation actions, scan timestamp." },
  ]},
  { code: "WSC", masters: [
    { name: "chat_channels", label: "Chat Channel", desc: "Persistent conversation space — private, public, or DM. Carries name, topic, member list, retention policy, external guest federation. The foundational WSC organising unit." },
    { name: "chat_messages", label: "Chat Message", desc: "Single message posted to a channel or thread: author, timestamp, content (text, emoji, markdown, rich-text preview), attachments, edit history, reactions. Distinct from email messages or SMS." },
    { name: "chat_threads", label: "Chat Thread", desc: "Nested conversation branch within a channel message: parent_message_id, replies, thread participants, read state. Enables focused sub-conversations." },
    { name: "chat_huddles", label: "Chat Huddle", desc: "Synchronous audio/video meeting spawned from a channel or DM: huddle_type (voice / video), participants, start/end, duration, recording_reference, transcription_reference." },
    { name: "channel_members", label: "Channel Member", desc: "Membership relationship linking a user/external guest to a channel: join_date, role (owner / moderator / member), notification settings, access_level." },
    { name: "external_guest_invitations", label: "External Guest Invitation", desc: "Federated external-user/cross-workspace access invitation (Slack Connect, Teams B2B Connect): inviting_user, invited_email_or_tenant, status (pending / accepted / revoked), expiry, scope." },
    { name: "chat_message_attachments", label: "Chat Message Attachment", desc: "File or link embedded in a message: attachment_type (file / link / image / video / integration_card), file_id/url, file_size, upload_timestamp, virus_scan_status." },
    { name: "channel_file_shares", label: "Channel File Share", desc: "File pinned or shared at channel level (not per-message): file_id, channel_id, shared_by_user, shared_at, expiry_policy, access_permissions. Distinct from KMS authored knowledge." },
  ]},
  { code: "TEST-MGMT", masters: [
    { name: "test_cases", label: "Test Case", desc: "Reusable test definition (manual or automated reference): preconditions, steps, expected results, tags, traceability to requirements and test suites." },
    { name: "test_suites", label: "Test Suite", desc: "Grouping of test_cases by feature/release/type. Enables batch execution, cross-browser/environment matrix, organised reporting." },
    { name: "test_plans", label: "Test Plan", desc: "Master planning document scoping test coverage, timeline, resources, environment assignments, entry/exit criteria for a release or phase." },
    { name: "test_runs", label: "Test Run", desc: "Single execution instance of a test_case or suite against a target environment: outcome (pass / fail / blocked / skipped), duration, environment context, tester, failure logs." },
    { name: "test_defects", label: "Test Defect", desc: "Defect discovered during testing — distinct from ITSM incidents. Carries reproduction steps, environment context, severity, priority, assigned developer, status, root cause." },
    { name: "test_environments", label: "Test Environment", desc: "Configured environment (OS variant, browser, device, SaaS tenant version, DB state) where test execution occurs. Enables matrix testing and environment-specific failure traceability." },
    { name: "requirements_to_test_traceability", label: "Requirements-to-Test Traceability", desc: "M:N links between product requirements (sourced from PROD-MGMT or internal specs) and test_cases that verify them. Supports coverage metrics and impact analysis." },
    // Note: automation_scripts (id 225) already exists; loader will dedup and link as TEST-MGMT master.
    { name: "automation_scripts", label: "Automation Script", desc: "Executable test automation code (Selenium, Cypress, Playwright, Appium). Distinct from test_case (logical test); associated with one or more test_cases. Carries framework, language, library versions, maintenance owner." },
  ]},
  { code: "PROC-MIN", masters: [
    { name: "event_logs", label: "Event Log", desc: "Raw timestamped sequence of business-process events (state transitions, activities, timestamps, actors, resource allocations) extracted from system logs, business documents, or event streams. Primary input artifact for process discovery and conformance checking." },
    { name: "discovered_process_models", label: "Discovered Process Model", desc: "Algorithmic output: inferred process model (DFG, BPMN, Petri net) mined from an event log via discovery (Heuristics Miner, Inductive Miner, Fuzzy Miner). Carries fitted parameters, quality metrics (fitness, precision, generalization)." },
    { name: "process_conformance_results", label: "Process Conformance Result", desc: "Diagnostic from conformance checking: comparison of event log vs reference process model, flagging deviations with severity, deviation_type (missing / extra / out-of-order / timing), trace-level root cause. Supports regulatory audit." },
    { name: "process_variants", label: "Process Variant", desc: "Distinct execution patterns within an event log: cohorts of traces that follow significantly different paths. Carries variant frequency, average cycle time, actor/resource patterns, business drivers." },
    { name: "process_bottleneck_findings", label: "Process Bottleneck Finding", desc: "Resource-constrained or time-trapped steps in a process: high-wait-time activities, resource queue depth, throughput loss points. Carries activity name, severity, estimated throughput impact, recommended mitigation." },
    { name: "business_rules_extracted", label: "Extracted Business Rule", desc: "Declarative rule inferred from event-log patterns: conditional activity orderings, forbidden sequences, timing constraints, resource allocations, decision thresholds. Captures hidden control logic." },
  ]},
  { code: "DEM", masters: [
    { name: "endpoint_experience_scores", label: "Endpoint Experience Score", desc: "Quality-of-experience metric for a user/device/SaaS-app triplet: latency, availability %, error rate, device responsiveness (boot time, app launch, login success %). Aggregates synthetic + RUM signals. DEM flagship." },
    { name: "synthetic_monitoring_results", label: "Synthetic Monitoring Result", desc: "Proactive end-to-end test against a SaaS app from a geo/network location: request/response payload, HTTP status, latency, SSL validity, geo tag, schedule reference. Network-outside-in probes (vs OBS instrumented internals)." },
    { name: "real_user_sessions", label: "Real User Session", desc: "Aggregate session telemetry for an end-user's device over a window: page loads, app launches, network quality samples, DNS query times, VPN toggle state, WiFi/cellular transitions. Distinct from OBS distributed_traces (app-internal) and NPMD (network-internal)." },
    { name: "digital_friction_events", label: "Digital Friction Event", desc: "Detected degradation affecting SaaS consumption: slow boot, app crash, unresponsive login, network disconnect, proxy/firewall block, VPN drop, USB mount failure. Source agent telemetry, severity, affected user count, business-app association." },
    { name: "endpoint_anomaly_findings", label: "Endpoint Anomaly Finding", desc: "ML-derived behavioral deviation on a device: CPU spike during login, memory leak, unexpected network egress, certificate validation failure, impossible-travel pattern. Scored, triaged, feeds InfoSec dashboards." },
  ]},
  { code: "IWMS", masters: [
    { name: "desk_bookings", label: "Desk Booking", desc: "Self-service workplace hoteling: employee reservation of available desk, date/time, work mode. Core to flexible/hybrid workplace policies." },
    { name: "room_reservations", label: "Room Reservation", desc: "Meeting room, event space, or collaborative area reservation by employee or team: time slot, capacity, amenities requested." },
    { name: "workplace_service_requests", label: "Workplace Service Request", desc: "Employee request for workspace changes: desk relocation, accommodation needs, floor reassignment. Routed to facilities for approval/execution. Workplace-scoped (vs generic ITSM service_requests)." },
    { name: "space_utilization_reports", label: "Space Utilization Report", desc: "Analytics on actual office occupancy/usage: peak-hour patterns, underutilization zones, utilization rates. Drives real-estate optimization. Distinct from REAL-EST `occupancy_records` (operational)." },
    { name: "workplace_experience_feedback", label: "Workplace Experience Feedback", desc: "Employee survey/feedback on office experience: comfort, amenities, satisfaction. Informs workplace strategy and EX improvements." },
  ]},
  // CAFM intentionally omitted — research concluded data-object-empty (tier marker under REAL-EST).
  { code: "MFG-OPS", masters: [
    { name: "production_orders", label: "Production Order", desc: "Release-to-floor unit of work: product SKU, quantity, schedule window, build instructions reference, material requirements. Distinct from ERP demand planning; MFG-OPS owns floor execution." },
    { name: "work_instructions", label: "Work Instruction", desc: "Operator-facing step sequence for building/assembling a product variant: sequence, resource requirements, quality checkpoints, safety notes, attached media. References product + production_order." },
    { name: "production_schedules", label: "Production Schedule", desc: "Published build plan for a line, manufacturing cell, or workcenter: time-based slots, assigned orders, sequencing, changeover windows. Product of capacity-planning optimization. Distinct from WFM `work_schedules` (labor-centric)." },
    { name: "produced_units", label: "Produced Unit", desc: "As-built record of a manufactured item: serial number, lot/batch, production_order reference, produced_timestamp, quality_status, embedded costs. Traceability spine for batch/genealogy queries." },
    { name: "production_downtime_events", label: "Production Downtime Event", desc: "Shop-floor equipment/line stoppage: start_time, duration, reason code, impact (throughput loss), resolution. OEE input. Distinct from EAM `eam_work_orders` (maintenance-triggered)." },
    { name: "production_quality_inspections", label: "Production Quality Inspection", desc: "Per-unit/per-batch inspection result: checklist completion, pass/fail, defect classification, produced_unit reference, inspector, timestamp. Feeds quality dashboards and hold/release decisions." },
    { name: "shop_floor_cases", label: "Shop Floor Case", desc: "Operator-initiated issue/escalation: andon pull, quality defect escape, safety concern, equipment anomaly, material shortage. Work item for shop-floor problem-solving team. Distinct from FSM support tickets." },
  ]},
];

// Resolve domain ids
const domainsRows = await get(`/domains?select=id,domain_code&limit=10000`);
const domainId = new Map(domainsRows.map(x => [String(x.domain_code), Number(x.id)]));

// Build data_object insert payload
const dataObjectPayload: Row[] = [];
const allMasterNames = new Set<string>();
for (const p of proposals) {
  for (const m of p.masters) {
    if (allMasterNames.has(m.name)) continue;
    allMasterNames.add(m.name);
    dataObjectPayload.push({ data_object_name: m.name, display_label: m.label, description: m.desc });
  }
}

const existing = await get(`/data_objects?select=id,data_object_name&data_object_name=in.(${[...allMasterNames].join(",")})`);
const existingNames = new Set(existing.map(r => String(r.data_object_name)));
const toInsertDOs = dataObjectPayload.filter(d => !existingNames.has(String(d.data_object_name)));

console.log(`Section 1 - data_objects: ${dataObjectPayload.length} planned, ${toInsertDOs.length} to insert (${dataObjectPayload.length - toInsertDOs.length} already exist).`);
if (existingNames.size > 0) console.log(`  pre-existing (will be linked, not re-inserted): ${[...existingNames].join(", ")}`);
if (toInsertDOs.length > 0) await insert("/data_objects", toInsertDOs);

// Re-read data_object ids for ddo wiring
const allDOs = await get(`/data_objects?select=id,data_object_name&data_object_name=in.(${[...allMasterNames].join(",")})`);
const doId = new Map(allDOs.map(x => [String(x.data_object_name), Number(x.id)]));

// domain_data_objects (master rows; idempotent on (domain, data_object, role))
const existingDdoRows = await get(`/domain_data_objects?select=domain_id,data_object_id,role&limit=20000`);
const ddoKey = (d: number, o: number, r: string) => `${d}:${o}:${r}`;
const existingDdos = new Set(existingDdoRows.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id), String(r.role))));

const ddoPayload: Row[] = [];
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
    ddoPayload.push({ domain_id: did, data_object_id: oid, role: "master", notes: "Phase-B Lite batch 2 - agent-derived; trigger_events + handoffs deferred to follow-up audit pass" });
  }
}

console.log(`\nSection 2 - domain_data_objects (master): ${ddoPayload.length} to insert.`);
if (ddoPayload.length > 0) await insert("/domain_data_objects", ddoPayload);

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
