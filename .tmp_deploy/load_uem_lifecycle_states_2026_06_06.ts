/**
 * B1A-LIFECYCLE-STATES (UEM, domain 86).
 *
 * Two-part load, both idempotent:
 *  (1) PATCH entity_type='operational_workflow' on all 8 UEM masters (556-563),
 *      which are currently 'unclassified' (B13). Each has a real device-management
 *      workflow per the b1a action text and the 12 live trigger_events, so
 *      operational_workflow is the deterministic Rule #12 classification. This
 *      satisfies the Rule #12 gate that makes lifecycle states REQUIRED (B12).
 *  (2) INSERT data_object_lifecycle_states for each master, anchored to its
 *      realizing module per B1A-LIFECYCLE-STATES:
 *        556 / 561 / 562 -> 308 (UEM-DEVICE-LIFECYCLE)
 *        557 / 559 / 560 -> 309 (UEM-CONFIG-APPS)
 *        558 / 563       -> 310 (UEM-COMPLIANCE-POSTURE)
 *      Workflow gates (requires_permission=true) marked on governed transitions
 *      (publish / revoke / retire / deploy / decommission). State machine shape
 *      (M4): exactly one is_initial, >=1 is_terminal, unique monotonic state_order.
 *
 * record_status omitted (DB default 'new', Rule #1). notes left empty (Rule #15).
 * Idempotent: skips a master that already has any lifecycle state row.
 *
 * Run from project root: bun run .tmp_deploy/load_uem_lifecycle_states_2026_06_06.ts
 */

interface CmdResult { ok: boolean; data: any; status: number; }
async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`  semantius failed (${code}): ${stderr.trim() || stdout.trim()}`);
    return { ok: false, data: null, status: code };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0 };
}
async function get(path: string): Promise<any> { const r = await postgrest("GET", path); if (!r.ok) throw new Error(`GET ${path} failed`); return r.data; }
async function patch(path: string, body: any): Promise<any> { const r = await postgrest("PATCH", path, body); if (!r.ok) throw new Error(`PATCH ${path} failed`); return r.data; }
async function post(path: string, body: any): Promise<any> { const r = await postgrest("POST", path, body); if (!r.ok) throw new Error(`POST ${path} failed`); return r.data; }

type StateSpec = {
  state_name: string;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
};
type MasterSpec = { data_object_id: number; data_object_name: string; module_id: number; states: StateSpec[] };

// data_object_id -> singular label, used to build data_object_lifecycle_state_label
const LABELS: Record<number, string> = {
  556: "Enrolled Device",
  557: "Device Configuration Profile",
  558: "Device Compliance Policy",
  559: "Mobile App Package",
  560: "Device App Assignment",
  561: "UEM Enrollment Token",
  562: "Device Deployment Result",
  563: "Device Compliance Result",
};

const MASTERS: MasterSpec[] = [
  // ---- Module 308: UEM-DEVICE-LIFECYCLE ----
  {
    data_object_id: 556, data_object_name: "enrolled_devices", module_id: 308,
    states: [
      { state_name: "enrolled", description: "Device has completed enrollment and is under management.", is_initial: true },
      { state_name: "compliant", description: "Device passed its compliance evaluation against assigned policies." },
      { state_name: "non_compliant", description: "Device failed one or more compliance checks and is out of policy." },
      { state_name: "lost_or_stolen", description: "Device reported lost or stolen; remote actions may be invoked.", requires_permission: true, is_terminal: true },
      { state_name: "retired", description: "Device decommissioned and removed from active management.", requires_permission: true, permission_verb_override: "retire_device", is_terminal: true },
    ],
  },
  {
    data_object_id: 561, data_object_name: "enrollment_tokens", module_id: 308,
    states: [
      { state_name: "issued", description: "Enrollment token generated and available for device onboarding.", is_initial: true },
      { state_name: "consumed", description: "Token redeemed by a device completing enrollment.", is_terminal: true },
      { state_name: "revoked", description: "Token invalidated by an administrator before use.", requires_permission: true, is_terminal: true },
      { state_name: "expired", description: "Token passed its validity window without being consumed.", is_terminal: true },
    ],
  },
  {
    data_object_id: 562, data_object_name: "device_deployment_results", module_id: 308,
    states: [
      { state_name: "queued", description: "Deployment action accepted and waiting to run on the device.", is_initial: true },
      { state_name: "succeeded", description: "Deployment action completed successfully on the device.", is_terminal: true },
      { state_name: "failed", description: "Deployment action did not complete; error captured for triage.", is_terminal: true },
    ],
  },
  // ---- Module 309: UEM-CONFIG-APPS ----
  {
    data_object_id: 557, data_object_name: "device_configuration_profiles", module_id: 309,
    states: [
      { state_name: "draft", description: "Profile authored but not yet released for assignment.", is_initial: true },
      { state_name: "published", description: "Profile released and available to assign to devices or groups.", requires_permission: true },
      { state_name: "assigned", description: "Profile targeted at one or more devices or groups." },
      { state_name: "drift_detected", description: "Device configuration no longer matches the assigned profile.", is_terminal: true },
    ],
  },
  {
    data_object_id: 559, data_object_name: "mobile_app_packages", module_id: 309,
    states: [
      { state_name: "uploaded", description: "App package uploaded to the catalog but not yet released.", is_initial: true },
      { state_name: "published", description: "App package released and available for assignment to devices.", requires_permission: true },
      { state_name: "deprecated", description: "App package withdrawn from new assignments.", requires_permission: true, is_terminal: true },
    ],
  },
  {
    data_object_id: 560, data_object_name: "device_app_assignments", module_id: 309,
    states: [
      { state_name: "assigned", description: "App targeted at a device or group, pending delivery.", is_initial: true },
      { state_name: "deployed", description: "App successfully installed on the target device.", requires_permission: true },
      { state_name: "failed", description: "App delivery did not complete on the target device.", is_terminal: true },
      { state_name: "removed", description: "App assignment withdrawn and uninstalled from the device.", is_terminal: true },
    ],
  },
  // ---- Module 310: UEM-COMPLIANCE-POSTURE ----
  {
    data_object_id: 558, data_object_name: "device_compliance_policies", module_id: 310,
    states: [
      { state_name: "draft", description: "Compliance policy authored but not yet enforced.", is_initial: true },
      { state_name: "published", description: "Policy released and actively evaluated against devices.", requires_permission: true },
      { state_name: "revoked", description: "Policy withdrawn from enforcement.", requires_permission: true, is_terminal: true },
    ],
  },
  {
    data_object_id: 563, data_object_name: "device_compliance_results", module_id: 310,
    states: [
      { state_name: "evaluating", description: "Compliance evaluation in progress for a device against a policy.", is_initial: true },
      { state_name: "compliant", description: "Device met all requirements of the evaluated policy.", is_terminal: true },
      { state_name: "non_compliant", description: "Device failed one or more requirements of the evaluated policy.", is_terminal: true },
    ],
  },
];

async function main() {
  console.log("UEM lifecycle states load (2026-06-06)");
  console.log("======================================\n");

  // ---- Part 1: classify entity_type ----
  const ids = MASTERS.map((m) => m.data_object_id);
  const dobjs: { id: number; data_object_name: string; entity_type: string }[] = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,data_object_name,entity_type`
  );
  console.log("Part 1: entity_type classification");
  for (const d of dobjs) {
    if (d.entity_type === "operational_workflow") {
      console.log(`  ${d.data_object_name} (${d.id}) already operational_workflow - skip`);
      continue;
    }
    await patch(`/data_objects?id=eq.${d.id}`, { entity_type: "operational_workflow" });
    console.log(`  ${d.data_object_name} (${d.id}): ${d.entity_type} -> operational_workflow`);
  }

  // ---- Part 2: lifecycle states ----
  console.log("\nPart 2: lifecycle states");
  const existing: { data_object_id: number }[] = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${ids.join(",")})&select=data_object_id`
  );
  const haveStates = new Set(existing.map((e) => e.data_object_id));

  const rows: any[] = [];
  for (const m of MASTERS) {
    if (haveStates.has(m.data_object_id)) {
      console.log(`  ${m.data_object_name}: already has lifecycle states - skip`);
      continue;
    }
    // M4 shape validation before building rows
    const initials = m.states.filter((s) => s.is_initial);
    const terminals = m.states.filter((s) => s.is_terminal);
    if (initials.length !== 1) throw new Error(`${m.data_object_name}: expected exactly 1 initial state, got ${initials.length}`);
    if (terminals.length < 1) throw new Error(`${m.data_object_name}: expected >=1 terminal state, got 0`);

    m.states.forEach((s, i) => {
      const label = LABELS[m.data_object_id];
      const stateTitle = s.state_name.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      rows.push({
        data_object_lifecycle_state_label: `${label} - ${stateTitle}`,
        data_object_id: m.data_object_id,
        domain_module_id: m.module_id,
        state_name: s.state_name,
        state_order: (i + 1) * 10,
        description: s.description,
        is_initial: !!s.is_initial,
        is_terminal: !!s.is_terminal,
        requires_permission: !!s.requires_permission,
        permission_verb_override: s.permission_verb_override ?? "",
        notes: "",
        // record_status omitted -> DB default 'new'
      });
    });
  }

  if (rows.length === 0) {
    console.log("  nothing to insert (all masters already have states).");
  } else {
    const inserted = await post("/data_object_lifecycle_states", rows);
    console.log(`  inserted ${Array.isArray(inserted) ? inserted.length : "?"} lifecycle state rows.`);
  }

  // ---- Verify ----
  console.log("\nVerification:");
  const after: { data_object_id: number; state_name: string; is_initial: boolean; is_terminal: boolean; requires_permission: boolean; domain_module_id: number | null }[] =
    await get(`/data_object_lifecycle_states?data_object_id=in.(${ids.join(",")})&select=data_object_id,state_name,is_initial,is_terminal,requires_permission,domain_module_id&order=data_object_id.asc,state_order.asc`);
  const byMaster = new Map<number, typeof after>();
  for (const r of after) { if (!byMaster.has(r.data_object_id)) byMaster.set(r.data_object_id, [] as any); byMaster.get(r.data_object_id)!.push(r); }
  for (const m of MASTERS) {
    const st = byMaster.get(m.data_object_id) ?? [];
    const gates = st.filter((s) => s.requires_permission).map((s) => s.state_name);
    console.log(`  ${m.data_object_name} (${m.data_object_id}) [module ${m.module_id}]: ${st.length} states [${st.map((s) => s.state_name).join(", ")}] gates=[${gates.join(", ")}]`);
  }
  console.log(`\nTotal UEM lifecycle states: ${after.length}`);
  console.log("\nDone.");
}

main().catch((e) => { console.error("\nFATAL:", e?.message || e); process.exit(1); });
