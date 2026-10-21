/**
 * LMS rewrite loader 5/6 - Permissions + role rebundle + C2 capability overrides.
 *
 * Phase A: 12 baseline permissions (3 tiers x 4 new modules).
 * Phase B: workflow-gate permissions for every lifecycle state where requires_permission=true
 *          across the 7 LMS modules (new + new states on existing modules).
 * Phase C: role_modules extension for the 4 existing LMS roles to touch the 4 new modules.
 * Phase D: role_permissions extension - tier-level grants on the new modules.
 * Phase E: business_function_capabilities overrides (C2) - CERT-MGMT contributor on GRC,
 *          LMS-PRIVACY-COMPLIANCE owner on GRC.
 *
 * record_status defaults to 'new'.
 * Idempotent: keyed on permission_name; (role_id, domain_module_id); (role_id, permission_id);
 *             (capability_id, business_function_id, responsibility_type).
 *
 * Run: bun run "c:/dev/domain-map/.tmp_deploy/load_lms_rewrite_5_permissions_roles.ts"
 */

const LMS_DOMAIN_ID = 57;
const LMS_CD_MOD = 32;
const LMS_CT_MOD = 33;
const LMS_PATHS_MOD = 34;
const CAP_CERT_MGMT = 22;

const ROLE_LD_LEARNING_ADMIN = 10036;
const ROLE_LD_COURSE_AUTHOR = 10037;
const ROLE_GRC_COMPLIANCE_TRAINING_MGR = 10038;
const ROLE_MGR_AS_LEARNER_MGR = 10039;

const FORBIDDEN = /—/;

interface CmdResult { ok: boolean; data: any; status: number; stderr: string; }

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  const text = stdout.trim();
  try { return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" }; }
  catch (e) { return { ok: false, data: text, status: code, stderr: "JSON parse failed: " + text }; }
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function post(path: string, rows: any[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const r = await postgrest("POST", path, slice);
    if (!r.ok) throw new Error(`POST ${path} failed: ${r.stderr}`);
    out.push(...(Array.isArray(r.data) ? r.data : [r.data]));
  }
  return out;
}

function checkText(label: string, ...vals: (string | null | undefined)[]) {
  for (const v of vals) if (v && FORBIDDEN.test(v)) throw new Error(`em-dash found in ${label}: ${v.slice(0, 80)}`);
}

// Singularize a plural data_object name
const IRREGULAR_SINGULAR: Record<string, string> = {
  waitlist_entries: "waitlist_entry",
  curricula: "curriculum",
};
function singularize(plural: string): string {
  if (IRREGULAR_SINGULAR[plural]) return IRREGULAR_SINGULAR[plural];
  if (plural.endsWith("ies")) return plural.slice(0, -3) + "y";
  if (plural.endsWith("ses") || plural.endsWith("xes") || plural.endsWith("zes")) return plural.slice(0, -2);
  if (plural.endsWith("s")) return plural.slice(0, -1);
  return plural;
}

// Resolve modules
const modRows = (await get(`/domain_modules?domain_id=eq.${LMS_DOMAIN_ID}&select=id,domain_module_code`)) ?? [];
const M: Record<string, number> = {};
for (const r of modRows) M[String(r.domain_module_code)] = Number(r.id);
const ALL_MODS = Object.values(M);
const NEW_MODS = [M["LMS-ILT-DELIVERY"], M["LMS-CREDENTIALS"], M["LMS-CT-GDPR"], M["LMS-AUTOMATION"]];
const MOD_KEBAB: Record<number, string> = {};
for (const [code, id] of Object.entries(M)) MOD_KEBAB[id] = code.toLowerCase();
console.log("modules:", M);

// =========================================================================
// PHASE A - baseline permissions (12)
// =========================================================================
console.log("\n=== PHASE A: baseline permissions for 4 new modules ===");

type PermSpec = { permission_name: string; domain_module_id: number; tier: string; description: string };

const BASELINE: PermSpec[] = [];
const NEW_MOD_CODES = [
  ["LMS-ILT-DELIVERY", "Instructor-led training delivery"],
  ["LMS-CREDENTIALS", "Credentials and badges"],
  ["LMS-CT-GDPR", "Learner data privacy"],
  ["LMS-AUTOMATION", "Learning automation"],
];

for (const [code, label] of NEW_MOD_CODES) {
  const modId = M[code];
  const kebab = code.toLowerCase();
  BASELINE.push({ permission_name: `${kebab}:read`,   domain_module_id: modId, tier: "baseline-read",   description: `Read ${label} records.` });
  BASELINE.push({ permission_name: `${kebab}:manage`, domain_module_id: modId, tier: "baseline-manage", description: `Manage ${label} records (create, update, delete drafts, baseline mutations).` });
  BASELINE.push({ permission_name: `${kebab}:admin`,  domain_module_id: modId, tier: "baseline-admin",  description: `Full administration of ${label}: all baseline + every workflow gate.` });
}

for (const p of BASELINE) checkText(`permission ${p.permission_name}`, p.description);

const baselineNames = BASELINE.map(p => p.permission_name).join(",");
const existingBaseline = (await get(`/permissions?permission_name=in.(${baselineNames})&select=permission_name`)) ?? [];
const existingBaselineSet = new Set(existingBaseline.map((r: any) => String(r.permission_name)));
const newBaseline = BASELINE.filter(p => !existingBaselineSet.has(p.permission_name));

console.log(`  baseline to insert: ${newBaseline.length} (skipping ${BASELINE.length - newBaseline.length} existing)`);
if (newBaseline.length > 0) await post("/permissions", newBaseline);

// =========================================================================
// PHASE B - workflow-gate permissions from lifecycle states
// =========================================================================
console.log("\n=== PHASE B: workflow-gate permissions ===");

// Pull every lifecycle state in any of the 7 LMS modules that needs a permission.
const lcStates = (await get(`/data_object_lifecycle_states?domain_module_id=in.(${ALL_MODS.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,permission_verb_override,domain_module_id,data_objects(data_object_name)`)) ?? [];
console.log(`  lifecycle states requiring permission: ${lcStates.length}`);

const gatePerms: PermSpec[] = [];
const seenGate = new Set<string>();
for (const s of lcStates) {
  const verb = s.permission_verb_override || s.state_name;
  const doName = s.data_objects?.data_object_name;
  if (!doName || !verb || !s.domain_module_id) continue;
  const singular = singularize(doName);
  const kebab = MOD_KEBAB[s.domain_module_id];
  if (!kebab) continue;
  const name = `${kebab}:${verb}_${singular}`;
  if (seenGate.has(name)) continue;
  seenGate.add(name);
  gatePerms.push({
    permission_name: name,
    domain_module_id: s.domain_module_id,
    tier: "workflow-gate",
    description: `Workflow gate: ${verb.replace(/_/g, " ")} a ${singular.replace(/_/g, " ")}.`,
  });
}

console.log(`  gate permissions drafted: ${gatePerms.length}`);
const gateNames = gatePerms.map(p => p.permission_name).join(",");
const existingGate = (await get(`/permissions?permission_name=in.(${gateNames})&select=permission_name`)) ?? [];
const existingGateSet = new Set(existingGate.map((r: any) => String(r.permission_name)));
const newGate = gatePerms.filter(p => !existingGateSet.has(p.permission_name));

console.log(`  gate permissions to insert: ${newGate.length} (skipping ${gatePerms.length - newGate.length} existing)`);
if (newGate.length > 0) await post("/permissions", newGate);

// =========================================================================
// PHASE C - role_modules extension
// =========================================================================
console.log("\n=== PHASE C: role_modules extension ===");

type RmSpec = { role_id: number; domain_module_id: number; interaction_level: string };

const RM_NEW: RmSpec[] = [
  // L-AND-D-LEARNING-ADMIN: 4 new modules; ILT/CRED/AUTO primary; GDPR secondary (coordination w/ Privacy)
  { role_id: ROLE_LD_LEARNING_ADMIN, domain_module_id: M["LMS-ILT-DELIVERY"], interaction_level: "primary" },
  { role_id: ROLE_LD_LEARNING_ADMIN, domain_module_id: M["LMS-CREDENTIALS"], interaction_level: "primary" },
  { role_id: ROLE_LD_LEARNING_ADMIN, domain_module_id: M["LMS-CT-GDPR"], interaction_level: "secondary" },
  { role_id: ROLE_LD_LEARNING_ADMIN, domain_module_id: M["LMS-AUTOMATION"], interaction_level: "primary" },

  // L-AND-D-COURSE-AUTHOR: ILT (offerings depend on courses)
  { role_id: ROLE_LD_COURSE_AUTHOR, domain_module_id: M["LMS-ILT-DELIVERY"], interaction_level: "secondary" },

  // GRC-COMPLIANCE-TRAINING-MANAGER: CRED (compliance certs) + GDPR (privacy primary)
  { role_id: ROLE_GRC_COMPLIANCE_TRAINING_MGR, domain_module_id: M["LMS-CREDENTIALS"], interaction_level: "secondary" },
  { role_id: ROLE_GRC_COMPLIANCE_TRAINING_MGR, domain_module_id: M["LMS-CT-GDPR"], interaction_level: "primary" },

  // MANAGER-AS-LEARNER-MANAGER: read across new ones
  { role_id: ROLE_MGR_AS_LEARNER_MGR, domain_module_id: M["LMS-ILT-DELIVERY"], interaction_level: "secondary" },
  { role_id: ROLE_MGR_AS_LEARNER_MGR, domain_module_id: M["LMS-CREDENTIALS"], interaction_level: "secondary" },
  { role_id: ROLE_MGR_AS_LEARNER_MGR, domain_module_id: M["LMS-AUTOMATION"], interaction_level: "secondary" },
];

const rmRoleIds = Array.from(new Set(RM_NEW.map(r => r.role_id))).join(",");
const existingRm = (await get(`/role_modules?role_id=in.(${rmRoleIds})&select=role_id,domain_module_id`)) ?? [];
const existingRmKeys = new Set(existingRm.map((r: any) => `${r.role_id}|${r.domain_module_id}`));
const newRm = RM_NEW.filter(r => !existingRmKeys.has(`${r.role_id}|${r.domain_module_id}`));

console.log(`  role_modules to insert: ${newRm.length} (skipping ${RM_NEW.length - newRm.length} existing)`);
if (newRm.length > 0) await post("/role_modules", newRm);

// =========================================================================
// PHASE D - role_permissions extension
// =========================================================================
console.log("\n=== PHASE D: role_permissions extension ===");

// Resolve baseline permission ids
const bpNames = ["lms-ilt-delivery:read","lms-ilt-delivery:manage","lms-ilt-delivery:admin","lms-credentials:read","lms-credentials:manage","lms-credentials:admin","lms-ct-gdpr:read","lms-ct-gdpr:manage","lms-ct-gdpr:admin","lms-automation:read","lms-automation:manage","lms-automation:admin"];
const bpRows = (await get(`/permissions?permission_name=in.(${bpNames.join(",")})&select=id,permission_name`)) ?? [];
const P: Record<string, number> = {};
for (const r of bpRows) P[String(r.permission_name)] = Number(r.id);

type RpSpec = { role_id: number; permission_name: string };
const RP_NEW: RpSpec[] = [
  // L-AND-D-LEARNING-ADMIN: admin on ILT/CRED/AUTO; read on GDPR
  { role_id: ROLE_LD_LEARNING_ADMIN, permission_name: "lms-ilt-delivery:admin" },
  { role_id: ROLE_LD_LEARNING_ADMIN, permission_name: "lms-credentials:admin" },
  { role_id: ROLE_LD_LEARNING_ADMIN, permission_name: "lms-automation:admin" },
  { role_id: ROLE_LD_LEARNING_ADMIN, permission_name: "lms-ct-gdpr:read" },

  // L-AND-D-COURSE-AUTHOR: manage on ILT
  { role_id: ROLE_LD_COURSE_AUTHOR, permission_name: "lms-ilt-delivery:manage" },

  // GRC-COMPLIANCE-TRAINING-MANAGER: manage on CRED (compliance certs), admin on GDPR
  { role_id: ROLE_GRC_COMPLIANCE_TRAINING_MGR, permission_name: "lms-credentials:manage" },
  { role_id: ROLE_GRC_COMPLIANCE_TRAINING_MGR, permission_name: "lms-ct-gdpr:admin" },

  // MANAGER-AS-LEARNER-MANAGER: read on all new
  { role_id: ROLE_MGR_AS_LEARNER_MGR, permission_name: "lms-ilt-delivery:read" },
  { role_id: ROLE_MGR_AS_LEARNER_MGR, permission_name: "lms-credentials:read" },
  { role_id: ROLE_MGR_AS_LEARNER_MGR, permission_name: "lms-automation:read" },
];

const rpPayload: any[] = [];
for (const r of RP_NEW) {
  const pid = P[r.permission_name];
  if (!pid) { console.log(`  WARN: permission ${r.permission_name} not found, skipping`); continue; }
  rpPayload.push({ role_id: r.role_id, permission_id: pid });
}

const rpRoleIds = Array.from(new Set(rpPayload.map(r => r.role_id))).join(",");
const existingRp = (await get(`/role_permissions?role_id=in.(${rpRoleIds})&select=role_id,permission_id`)) ?? [];
const existingRpKeys = new Set(existingRp.map((r: any) => `${r.role_id}|${r.permission_id}`));
const newRp = rpPayload.filter(r => !existingRpKeys.has(`${r.role_id}|${r.permission_id}`));

console.log(`  role_permissions to insert: ${newRp.length} (skipping ${rpPayload.length - newRp.length} existing)`);
if (newRp.length > 0) await post("/role_permissions", newRp);

// =========================================================================
// PHASE E - business_function_capabilities overrides (C2)
// =========================================================================
console.log("\n=== PHASE E: business_function_capabilities overrides (C2) ===");

// Resolve function ids
const grcFunc = (await get(`/business_functions?business_function_name=eq.Governance%2C%20Risk%20and%20Compliance&select=id`))?.[0];
if (!grcFunc) throw new Error("GRC business_function not found");
const GRC_FUNC_ID = Number(grcFunc.id);

// Resolve new privacy capability
const privCap = (await get(`/capabilities?capability_code=eq.LMS-PRIVACY-COMPLIANCE&select=id`))?.[0];
if (!privCap) throw new Error("LMS-PRIVACY-COMPLIANCE capability not found");
const CAP_LMS_PRIVACY = Number(privCap.id);

type BfcSpec = { capability_id: number; business_function_id: number; responsibility_type: string };
const BFC_NEW: BfcSpec[] = [
  // CERT-MGMT: GRC contributor (L&D stays owner via domain_business_function for LMS)
  { capability_id: CAP_CERT_MGMT, business_function_id: GRC_FUNC_ID, responsibility_type: "contributor" },
  // LMS-PRIVACY-COMPLIANCE: GRC owner (overrides L&D domain default)
  { capability_id: CAP_LMS_PRIVACY, business_function_id: GRC_FUNC_ID, responsibility_type: "owner" },
];

const bfcCaps = BFC_NEW.map(r => r.capability_id).join(",");
const existingBfc = (await get(`/business_function_capabilities?capability_id=in.(${bfcCaps})&business_function_id=eq.${GRC_FUNC_ID}&select=capability_id,responsibility_type`)) ?? [];
const existingBfcKeys = new Set(existingBfc.map((r: any) => `${r.capability_id}|${r.responsibility_type}`));
const newBfc = BFC_NEW.filter(r => !existingBfcKeys.has(`${r.capability_id}|${r.responsibility_type}`));

console.log(`  business_function_capabilities to insert: ${newBfc.length}`);
if (newBfc.length > 0) await post("/business_function_capabilities", newBfc);

// =========================================================================
// SUMMARY
// =========================================================================
console.log("\n=== SUMMARY ===");

const totalPerms = (await get(`/permissions?domain_module_id=in.(${ALL_MODS.join(",")})&select=id`)).length;
const totalRm = (await get(`/role_modules?domain_module_id=in.(${ALL_MODS.join(",")})&select=id`)).length;

console.log(`  permissions across 7 LMS modules: ${totalPerms}`);
console.log(`  role_modules covering 7 LMS modules: ${totalRm}`);
console.log("\n  UI:");
console.log("    https://adenin.semantius.app/domain_map/permissions");
console.log("    https://adenin.semantius.app/domain_map/role_modules");
console.log("    https://adenin.semantius.app/domain_map/role_permissions");
console.log("    https://adenin.semantius.app/domain_map/business_function_capabilities");

console.log("\n=== DONE: loader 5/6 (permissions + roles + C2 overrides) ===");
console.log("Next: loader 6/6 - TRAINING-RECORDS-STARTER (with Rule #19 validators)");
