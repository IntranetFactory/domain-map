/**
 * Reclassify ITSM module data_object dependencies for standalone deployability.
 *
 * Audit finding (2026-05-24): the initial M-band load mechanically migrated
 * legacy `domain_data_objects` rows (all `consumer + required`) into per-module
 * rows, which falsely implies modules cannot deploy without external domains.
 *
 * ITSM platforms (ServiceNow, JSM, Freshservice, BMC Helix, Ivanti) ship local
 * CI tables; event-management modules store event records locally; chargeback
 * needs a local cost-centers table when ERP isn't present. Re-classify the
 * existing rows to reflect that.
 *
 * Idempotent. Run from project root: bun run .tmp_deploy/reclassify_itsm_dependencies.ts
 */

const MODULES = {
  INCIDENT: 38,
  REQUEST: 39,
  PROBLEM: 40,
  CHANGE: 41,
  EVENT: 42,
  SLA: 45,
};

const DO = {
  asset_lifecycle_events: 55,
  configuration_items: 76,
  monitoring_alerts: 85,
  service_level_objectives: 91,
  error_groups: 92,
  cost_centers: 196,
};

interface CmdResult { ok: boolean; data: any; status: number; err?: string }

async function postgrestOnce(method: string, path: string, body?: any): Promise<CmdResult> {
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
  if (code !== 0) return { ok: false, data: null, status: code, err: stderr.trim() || stdout.trim() };
  const text = stdout.trim();
  try { return { ok: true, data: text ? JSON.parse(text) : null, status: 0 }; }
  catch { return { ok: true, data: text, status: 0 }; }
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  let r = await postgrestOnce(method, path, body);
  let attempts = 1;
  while (!r.ok && r.err && r.err.includes("required audience not found") && attempts < 5) {
    console.warn(`  JWT-audience transient (attempt ${attempts}, retrying after 4s)...`);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    r = await postgrestOnce(method, path, body);
    attempts++;
  }
  return r;
}

async function patch(path: string, body: any) {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.err}`);
}

async function post(path: string, body: any) {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.err}`);
}

async function get(path: string) {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.err}`);
  return r.data;
}

interface Change {
  module_id: number;
  module_label: string;
  data_object_id: number;
  data_object_label: string;
  new_role: string;
  new_necessity: string;
  notes: string;
}

const PATCHES: Change[] = [
  {
    module_id: MODULES.INCIDENT, module_label: "ITSM-INCIDENT-MGMT",
    data_object_id: DO.configuration_items, data_object_label: "configuration_items",
    new_role: "embedded_master", new_necessity: "required",
    notes: "ITSM local-masters CIs when no CMDB is deployed; reads from CMDB when present. Every flagship ITSM platform ships a local CI table.",
  },
  {
    module_id: MODULES.INCIDENT, module_label: "ITSM-INCIDENT-MGMT",
    data_object_id: DO.monitoring_alerts, data_object_label: "monitoring_alerts",
    new_role: "consumer", new_necessity: "optional",
    notes: "Incidents can be created manually without observability; alert ingestion is one source among many.",
  },
  {
    module_id: MODULES.INCIDENT, module_label: "ITSM-INCIDENT-MGMT",
    data_object_id: DO.error_groups, data_object_label: "error_groups",
    new_role: "consumer", new_necessity: "optional",
    notes: "Optional upstream signal; ITSM functions without error-tracking integration.",
  },
  {
    module_id: MODULES.INCIDENT, module_label: "ITSM-INCIDENT-MGMT",
    data_object_id: DO.service_level_objectives, data_object_label: "service_level_objectives",
    new_role: "consumer", new_necessity: "optional",
    notes: "Optional upstream signal; SLO-breach-driven incident creation needs observability.",
  },
  {
    module_id: MODULES.INCIDENT, module_label: "ITSM-INCIDENT-MGMT",
    data_object_id: DO.asset_lifecycle_events, data_object_label: "asset_lifecycle_events",
    new_role: "contributor", new_necessity: "optional",
    notes: "Contribution only fires when ITAM is also deployed; standalone ITSM does not write to this table.",
  },
  {
    module_id: MODULES.REQUEST, module_label: "ITSM-SERVICE-REQUEST",
    data_object_id: DO.configuration_items, data_object_label: "configuration_items",
    new_role: "embedded_master", new_necessity: "optional",
    notes: "Some catalog items reference target CIs; ITSM holds a local CI table when no CMDB is deployed.",
  },
  {
    module_id: MODULES.PROBLEM, module_label: "ITSM-PROBLEM-MGMT",
    data_object_id: DO.configuration_items, data_object_label: "configuration_items",
    new_role: "embedded_master", new_necessity: "required",
    notes: "Problems reference affected CIs and infrastructure components; ITSM local-masters CIs when no CMDB is deployed.",
  },
  {
    module_id: MODULES.CHANGE, module_label: "ITSM-CHANGE-MGMT",
    data_object_id: DO.configuration_items, data_object_label: "configuration_items",
    new_role: "embedded_master", new_necessity: "required",
    notes: "Changes target specific CIs and require impact assessment; ITSM local-masters CIs when no CMDB is deployed.",
  },
  {
    module_id: MODULES.EVENT, module_label: "ITSM-EVENT-MGMT",
    data_object_id: DO.monitoring_alerts, data_object_label: "monitoring_alerts",
    new_role: "embedded_master", new_necessity: "required",
    notes: "Event-management modules store, deduplicate, and correlate alert records locally; reads from canonical observability domains (ITOM, RMM) when present.",
  },
];

const NEW_ROWS = [
  {
    domain_module_id: MODULES.SLA, module_label: "ITSM-SLA-MGMT",
    data_object_id: DO.cost_centers, data_object_label: "cost_centers",
    role: "embedded_master", necessity: "optional",
    notes: "Chargeback capability holds a local cost-centers table when no ERP-FIN is deployed; reads from ERP-FIN when present.",
  },
];

async function main() {
  console.log("ITSM dependency re-classification (2026-05-24)");
  console.log("===============================================\n");

  console.log("Phase A: PATCH existing rows");
  for (const c of PATCHES) {
    const existing: any[] = await get(
      `/domain_module_data_objects?domain_module_id=eq.${c.module_id}&data_object_id=eq.${c.data_object_id}&select=id,role,necessity`
    );
    if (existing.length === 0) {
      console.warn(`  SKIP ${c.module_label} x ${c.data_object_label}: no existing row`);
      continue;
    }
    const row = existing[0];
    if (row.role === c.new_role && row.necessity === c.new_necessity) {
      console.log(`  noop ${c.module_label} x ${c.data_object_label}: already ${c.new_role}/${c.new_necessity}`);
      continue;
    }
    console.log(`  PATCH ${c.module_label} x ${c.data_object_label}: ${row.role}/${row.necessity} -> ${c.new_role}/${c.new_necessity}`);
    await patch(`/domain_module_data_objects?id=eq.${row.id}`, {
      role: c.new_role,
      necessity: c.new_necessity,
      notes: c.notes,
    });
  }

  console.log("\nPhase B: INSERT new rows");
  for (const n of NEW_ROWS) {
    const existing: any[] = await get(
      `/domain_module_data_objects?domain_module_id=eq.${n.domain_module_id}&data_object_id=eq.${n.data_object_id}&select=id`
    );
    if (existing.length > 0) {
      console.log(`  noop ${n.module_label} x ${n.data_object_label}: already exists`);
      continue;
    }
    console.log(`  INSERT ${n.module_label} x ${n.data_object_label} as ${n.role}/${n.necessity}`);
    await post("/domain_module_data_objects", [{
      domain_module_id: n.domain_module_id,
      data_object_id: n.data_object_id,
      role: n.role,
      necessity: n.necessity,
      notes: n.notes,
    }]);
  }

  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
