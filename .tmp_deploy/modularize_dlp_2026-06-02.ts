#!/usr/bin/env bun
// Idempotent modularization loader for the DLP domain (domains.id = 139).
// Creates 2 full domain_modules (Policy-vs-Runtime split), links existing
// capabilities, and assigns existing data_objects at their preserved role + necessity.
// Reuses existing entities ONLY. Creates NO new data_objects, capabilities,
// lifecycle states, skills, tools, handoffs, or relationships.
// Safe to re-run.

type Json = any;

const DOMAIN_ID = 139;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// ----- Module definitions -----------------------------------------------------

type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
  capability_ids: number[];
  data_objects: { data_object_id: number; role: string; necessity: string }[];
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "DLP-POLICY-CONTROL",
    domain_module_name: "Policy and Classification Control",
    description:
      "Authoring surface for data-protection policies, classification and labeling rules, content fingerprints, and time-limited policy exceptions. Defines what counts as sensitive and which actions (block, quarantine, redact, mask, watermark, alert) apply, then governs the exception lifecycle that relaxes those rules under business justification.",
    // DLP-CLASSIFY (358), DLP-POLICY-ENGINE (359), DLP-FINGERPRINT (365)
    capability_ids: [358, 359, 365],
    data_objects: [
      { data_object_id: 331, role: "master", necessity: "required" },   // dlp_policies
      { data_object_id: 334, role: "master", necessity: "required" },   // dlp_exceptions
      { data_object_id: 303, role: "contributor", necessity: "required" }, // data_classifications (DCG masters)
    ],
  },
  {
    domain_module_code: "DLP-ENFORCEMENT-RUNTIME",
    domain_module_name: "Egress Enforcement and Incident Response",
    description:
      "Runtime detection and enforcement at the egress point across email, endpoint, network, web, and cloud SaaS channels. Captures exfiltration attempts, raises and triages incidents, holds blocked artifacts in quarantine pending review, and records a forensic user-activity trail for investigation and remediation.",
    // DLP-EMAIL-EGRESS (360), DLP-ENDPOINT-AGENT (361), DLP-NETWORK-INLINE (362),
    // DLP-CLOUD-API (363), DLP-INCIDENT-MGMT (364)
    capability_ids: [360, 361, 362, 363, 364],
    data_objects: [
      { data_object_id: 330, role: "master", necessity: "required" },   // dlp_incidents
      { data_object_id: 332, role: "master", necessity: "required" },   // data_exfiltration_attempts
      { data_object_id: 333, role: "master", necessity: "required" },   // dlp_quarantine_items
      { data_object_id: 335, role: "master", necessity: "required" },   // dlp_user_activity_logs
      { data_object_id: 31, role: "consumer", necessity: "required" },  // employees (HCM masters)
    ],
  },
];

// ----- Idempotent upserts -----------------------------------------------------

async function upsertModules(): Promise<Map<string, number>> {
  const codes = MODULES.map(m => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const existingCodes = new Set((existing ?? []).map((r: any) => r.domain_module_code));
  const toInsert = MODULES
    .filter(m => !existingCodes.has(m.domain_module_code))
    .map(m => ({
      domain_module_name: m.domain_module_name,
      domain_module_code: m.domain_module_code,
      description: m.description,
      domain_id: DOMAIN_ID,
      module_kind: "full",
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map(m => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  modules already present; no insert");
  }
  // Re-read for the code -> id map.
  const all = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const map = new Map<string, number>();
  for (const r of all) map.set(r.domain_module_code, r.id);
  return map;
}

async function upsertCapabilities(moduleId: number, capIds: number[]): Promise<void> {
  if (!capIds.length) return;
  const existing = await semantius(
    "GET",
    `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.capability_id));
  const toInsert = capIds
    .filter(id => !existingIds.has(id))
    .map(id => ({ domain_module_id: moduleId, capability_id: id }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_capabilities", toInsert);
    console.log(`  +${toInsert.length} domain_module_capabilities on module ${moduleId}`);
  }
}

async function upsertDataObjects(
  moduleId: number,
  rows: { data_object_id: number; role: string; necessity: string }[]
): Promise<void> {
  if (!rows.length) return;
  const ids = rows.map(r => r.data_object_id);
  const existing = await semantius(
    "GET",
    `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${ids.join(",")})&select=data_object_id`
  );
  const existingIds = new Set((existing ?? []).map((r: any) => r.data_object_id));
  const toInsert = rows
    .filter(r => !existingIds.has(r.data_object_id))
    .map(r => ({
      domain_module_id: moduleId,
      data_object_id: r.data_object_id,
      role: r.role,
      necessity: r.necessity,
    }));
  if (toInsert.length) {
    await semantius("POST", "/domain_module_data_objects", toInsert);
    console.log(`  +${toInsert.length} domain_module_data_objects on module ${moduleId}`);
  }
}

// ----- Main -------------------------------------------------------------------

async function main() {
  console.log("=== Modularizing DLP (domain 139) ===");

  const codeToId = await upsertModules();
  const ownModuleIds = new Set([...codeToId.values()]);

  // Catalog-wide master pre-check: refuse to write a second master anywhere.
  // Exclude this domain's own modules so the loader stays re-runnable after a
  // successful first pass (those rows are the masters we just wrote, not conflicts).
  const intendedMasters = MODULES.flatMap(m =>
    m.data_objects.filter(d => d.role === "master").map(d => d.data_object_id)
  );
  if (intendedMasters.length) {
    const conflicts = (await semantius(
      "GET",
      `/domain_module_data_objects?data_object_id=in.(${intendedMasters.join(",")})&role=eq.master&select=domain_module_id,data_object_id`
    )) ?? [];
    const foreign = conflicts.filter((c: any) => !ownModuleIds.has(c.domain_module_id));
    if (foreign.length) {
      throw new Error(
        `Catalog-wide master conflict; another module already masters: ${JSON.stringify(foreign)}`
      );
    }
  }

  for (const m of MODULES) {
    const moduleId = codeToId.get(m.domain_module_code);
    if (!moduleId) throw new Error(`module id not resolved for ${m.domain_module_code}`);
    console.log(`\n--- ${m.domain_module_code} (id ${moduleId}) ---`);
    await upsertCapabilities(moduleId, m.capability_ids);
    await upsertDataObjects(moduleId, m.data_objects);
  }

  console.log("\nDone.");
}

main().catch(e => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
