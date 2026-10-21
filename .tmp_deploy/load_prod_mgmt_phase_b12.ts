#!/usr/bin/env bun
// Phase B12 for PROD-MGMT: lifecycle states for 7 masters + config-shape exemption note for product_metrics.
// Pattern flags also updated where non-default.
// Idempotent on (data_object_id, state_name).

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  // Pass the JSON via a temp file to avoid stdin race conditions in Bun on Windows.
  const tmpPath = `c:\\tmp\\semantius_call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.json`;
  await Bun.write(tmpPath, JSON.stringify(body));
  const proc = Bun.spawn(["bash", "-c", `semantius call crud postgrestRequest < "${tmpPath.replace(/\\/g, "/")}"`], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  // Best-effort cleanup; ignore failure.
  if (exitCode !== 0) {
    console.error(`Temp file kept for debug: ${tmpPath}`);
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  try { await Bun.file(tmpPath).unlink?.(); } catch {}
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

const DISCOVERY_ID = 130;
const ROADMAP_ID = 131;

// Compact factory for lifecycle state rows.
type LS = {
  data_object_id: number;
  state_name: string;
  state_order: number;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  notes?: string;
  domain_module_id?: number | null;
};

const states: LS[] = [
  // ============================================================
  // product_lines (402) — PM-ROADMAP-DELIVERY
  // ============================================================
  { data_object_id: 402, state_name: "concept",  state_order: 1, is_initial: true,  description: "Product line is being scoped but not yet sold.", domain_module_id: ROADMAP_ID },
  { data_object_id: 402, state_name: "active",   state_order: 2, requires_permission: true, description: "Product line is active and accepting new releases.", domain_module_id: ROADMAP_ID },
  { data_object_id: 402, state_name: "sunset",   state_order: 3, requires_permission: true, description: "Product line is end-of-life but still maintained; no new features.", domain_module_id: ROADMAP_ID },
  { data_object_id: 402, state_name: "retired",  state_order: 4, is_terminal: true,  requires_permission: true, description: "Product line is fully decommissioned.", domain_module_id: ROADMAP_ID },

  // ============================================================
  // product_features (403) — PM-ROADMAP-DELIVERY
  // ============================================================
  { data_object_id: 403, state_name: "in_discovery", state_order: 1, is_initial: true,  description: "Feature is being explored; under research or prioritization.", domain_module_id: ROADMAP_ID },
  { data_object_id: 403, state_name: "prioritized",  state_order: 2, description: "Feature has been accepted into the backlog and ranked.", domain_module_id: ROADMAP_ID },
  { data_object_id: 403, state_name: "in_delivery",  state_order: 3, description: "Feature is being built; engineering work in flight.", domain_module_id: ROADMAP_ID },
  { data_object_id: 403, state_name: "released",     state_order: 4, requires_permission: true, description: "Feature has shipped to the target audience.", domain_module_id: ROADMAP_ID },
  { data_object_id: 403, state_name: "deprecated",   state_order: 5, is_terminal: true, requires_permission: true, description: "Feature is end-of-life; removal scheduled or completed.", domain_module_id: ROADMAP_ID },

  // ============================================================
  // product_releases (404) — PM-ROADMAP-DELIVERY
  // ============================================================
  { data_object_id: 404, state_name: "planned",     state_order: 1, is_initial: true,  description: "Release plan exists with target date and feature set.", domain_module_id: ROADMAP_ID },
  { data_object_id: 404, state_name: "in_progress", state_order: 2, description: "Release work in flight; features merging in.", domain_module_id: ROADMAP_ID },
  { data_object_id: 404, state_name: "shipped",     state_order: 3, is_terminal: true, requires_permission: true, description: "Release has gone live to the target audience.", domain_module_id: ROADMAP_ID },
  { data_object_id: 404, state_name: "rolled_back", state_order: 4, is_terminal: true, requires_permission: true, description: "Release was pulled after shipping due to defects or business reasons.", domain_module_id: ROADMAP_ID },
  { data_object_id: 404, state_name: "cancelled",   state_order: 5, is_terminal: true, requires_permission: true, description: "Release was cancelled before shipping.", domain_module_id: ROADMAP_ID },

  // ============================================================
  // product_roadmaps (405) — PM-ROADMAP-DELIVERY
  // ============================================================
  { data_object_id: 405, state_name: "draft",     state_order: 1, is_initial: true,  description: "Roadmap is being authored; not visible to wider audiences.", domain_module_id: ROADMAP_ID },
  { data_object_id: 405, state_name: "published", state_order: 2, requires_permission: true, description: "Roadmap version is published; visible to the configured audience.", domain_module_id: ROADMAP_ID },
  { data_object_id: 405, state_name: "archived",  state_order: 3, is_terminal: true, description: "Roadmap version is superseded; kept for historical reference.", domain_module_id: ROADMAP_ID },

  // ============================================================
  // feature_requests (406) — PM-DISCOVERY
  // ============================================================
  { data_object_id: 406, state_name: "new",         state_order: 1, is_initial: true,  description: "Feature request just captured; awaiting triage.", domain_module_id: DISCOVERY_ID },
  { data_object_id: 406, state_name: "triaged",     state_order: 2, description: "Request has been reviewed and deemed in-scope for the product.", domain_module_id: DISCOVERY_ID },
  { data_object_id: 406, state_name: "prioritized", state_order: 3, description: "Request has been ranked relative to other backlog items.", domain_module_id: DISCOVERY_ID },
  { data_object_id: 406, state_name: "accepted",    state_order: 4, is_terminal: true, requires_permission: true, description: "Request has been accepted; converted to a product_feature row.", domain_module_id: DISCOVERY_ID },
  { data_object_id: 406, state_name: "rejected",    state_order: 5, is_terminal: true, requires_permission: true, description: "Request will not be built; rationale captured.", domain_module_id: DISCOVERY_ID },
  { data_object_id: 406, state_name: "archived",    state_order: 6, is_terminal: true, description: "Old or duplicate request; out of consideration for filtering.", domain_module_id: DISCOVERY_ID },

  // ============================================================
  // customer_feedback_items (407) — PM-DISCOVERY
  // ============================================================
  { data_object_id: 407, state_name: "new",        state_order: 1, is_initial: true, description: "Feedback just landed from a source channel; not yet processed.", domain_module_id: DISCOVERY_ID },
  { data_object_id: 407, state_name: "classified", state_order: 2, description: "Feedback has been categorized (bug, request, sentiment, etc.).", domain_module_id: DISCOVERY_ID },
  { data_object_id: 407, state_name: "linked",     state_order: 3, description: "Feedback has been linked to a feature_request or product_feature.", domain_module_id: DISCOVERY_ID },
  { data_object_id: 407, state_name: "archived",   state_order: 4, is_terminal: true, description: "Feedback closed; spam, duplicate, or processed and no longer actionable.", domain_module_id: DISCOVERY_ID },

  // ============================================================
  // beta_programs (409) — PM-ROADMAP-DELIVERY
  // ============================================================
  { data_object_id: 409, state_name: "planning",   state_order: 1, is_initial: true, description: "Beta program is being scoped: cohort, success criteria, timeline.", domain_module_id: ROADMAP_ID },
  { data_object_id: 409, state_name: "recruiting", state_order: 2, description: "Beta participants are being enrolled.", domain_module_id: ROADMAP_ID },
  { data_object_id: 409, state_name: "active",     state_order: 3, requires_permission: true, permission_verb_override: "launch_beta_program", description: "Beta is live; participants have access and are using the features.", domain_module_id: ROADMAP_ID },
  { data_object_id: 409, state_name: "closed",     state_order: 4, is_terminal: true, requires_permission: true, description: "Beta has concluded successfully; findings captured.", domain_module_id: ROADMAP_ID },
  { data_object_id: 409, state_name: "cancelled",  state_order: 5, is_terminal: true, requires_permission: true, description: "Beta was cancelled before completion.", domain_module_id: ROADMAP_ID },
];

console.log(`[1/3] data_object_lifecycle_states`);
const dataObjectIds = [402, 403, 404, 405, 406, 407, 409];
const existingStates = await get(`/data_object_lifecycle_states?data_object_id=in.(${dataObjectIds.join(",")})&select=data_object_id,state_name`);
const lsKey = (r: Row) => `${r.data_object_id}|${r.state_name}`;
const existingLsKeys = new Set(existingStates.map(lsKey));
const missingStates = states.filter(s => !existingLsKeys.has(lsKey(s)));
if (missingStates.length > 0) {
  console.log(`  inserting ${missingStates.length} new lifecycle state rows (${existingStates.length} existed)`);
  await insert("/data_object_lifecycle_states", missingStates);
} else {
  console.log(`  all ${existingStates.length} present, nothing to insert`);
}

// ============================================================
// 2. Config-shape exemption note on product_metrics (id 408)
// ============================================================
console.log(`\n[2/3] product_metrics config-shape exemption note`);
const pm = await get(`/data_objects?id=eq.408&select=id,notes`);
if (pm.length === 1) {
  const currentNotes = String(pm[0].notes || "");
  const exemption = "Config-shaped; no workflow. Time-series measurement records (adoption, usage, quality, business KPIs) linked to features and releases. Status is derivable from threshold breaches via computed_fields; no per-state permissions needed.";
  if (currentNotes.includes("Config-shaped")) {
    console.log(`  exemption already present`);
  } else {
    const merged = currentNotes ? `${currentNotes}\n\n${exemption}` : exemption;
    await patch(`/data_objects?id=eq.408`, { notes: merged });
    console.log(`  exemption note added`);
  }
}

// ============================================================
// 3. Pattern flag PATCH: customer_feedback_items has personal content
// ============================================================
console.log(`\n[3/3] pattern flags`);
const cfi = await get(`/data_objects?id=eq.407&select=id,has_personal_content`);
if (cfi.length === 1 && cfi[0].has_personal_content !== true) {
  await patch(`/data_objects?id=eq.407`, { has_personal_content: true });
  console.log(`  customer_feedback_items.has_personal_content -> true (PII in raw feedback content)`);
} else {
  console.log(`  customer_feedback_items pattern flags already correct`);
}

console.log("\nPhase B12 load complete.");
