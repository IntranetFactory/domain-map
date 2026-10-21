#!/usr/bin/env bun
// State-driven Validate execute pass for HC-PATIENT (domain id 45), 2026-06-07.
// Works ONLY the EXECUTE-classified open state items:
//   - B13 entity_type: PATCH 6 masters unclassified -> operational_workflow.
//   - A4 Catalog UX: write empty catalog_tagline + catalog_description on domain 45 (Rule #20 buyer voice).
//   - B11 aliases: INSERT generic cross-vendor synonyms (alias_type=synonym), idempotent.
//   - B12 lifecycle states: INSERT pre-specified states per master (now operational_workflow), idempotent.
// Idempotent: reads live, never overwrites a non-empty value, inserts only missing rows.
// Run from project root: bun run ".tmp_deploy/fix_hc_patient_state_driven_2026_06_07.ts"

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
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
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const DOMAIN_ID = 45;
const MASTERS: Record<string, number> = {
  patient_appointments: 617,
  clinical_encounters: 618,
  care_plans: 619,
  patient_referrals: 620,
  clinical_orders: 621,
  clinical_notes: 622,
};
const ALL_IDS = Object.values(MASTERS);

// ============================================================
// 1. B13 entity_type: classify unclassified masters -> operational_workflow
// ============================================================
async function fixEntityType(): Promise<number> {
  const rows = await get(
    `/data_objects?id=in.(${ALL_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const targets = rows.filter(r => r.entity_type === "unclassified" || r.entity_type === null);
  let patched = 0;
  for (const r of targets) {
    await call({
      method: "PATCH",
      path: `/data_objects?id=eq.${r.id}`,
      body: { entity_type: "operational_workflow" },
    });
    patched++;
    console.log(`  entity_type: ${r.data_object_name} (${r.id}) -> operational_workflow`);
  }
  if (targets.length === 0) console.log("  entity_type: all masters already classified, nothing to do");
  return patched;
}

// ============================================================
// 2. A4 Catalog UX: domain catalog_tagline + catalog_description (buyer voice)
// ============================================================
const DOMAIN_TAGLINE =
  "Run the patient front office and clinical floor on one record: schedule visits, document encounters, place orders, coordinate care, and route referrals.";
const DOMAIN_DESCRIPTION =
  "Healthcare Patient Operations gives provider organizations a single workflow spine for the work that happens around every visit. " +
  "Front-desk teams book and confirm appointments and manage no-shows; clinicians capture encounters, place lab, imaging, and medication orders, " +
  "and sign clinical notes; care coordinators build and track care plans for chronic conditions and transitions of care; and referral managers " +
  "route patients to specialists and chase the authorizations that keep care in-network. Because every record carries protected health information, " +
  "the platform enforces HIPAA-grade access, immutable signed documentation, and a clear audit trail. Buy this to cut scheduling leakage, speed " +
  "documentation, close referral loops, and give every member of the care team a shared, real-time view of what each patient needs next.";

async function fixCatalogUX(): Promise<number> {
  const [d] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!d) throw new Error("domain 45 not found");
  const body: Row = {};
  if (!d.catalog_tagline || String(d.catalog_tagline).trim() === "") {
    body.catalog_tagline = DOMAIN_TAGLINE;
  }
  if (!d.catalog_description || String(d.catalog_description).trim() === "") {
    body.catalog_description = DOMAIN_DESCRIPTION;
  }
  if (Object.keys(body).length === 0) {
    console.log("  catalog UX: both fields already non-empty, skipped (no overwrite)");
    return 0;
  }
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
  console.log(`  catalog UX: wrote ${Object.keys(body).join(" + ")} on domain ${DOMAIN_ID}`);
  return Object.keys(body).length;
}

// ============================================================
// 3. B11 aliases: generic cross-vendor synonyms (alias_type=synonym)
// ============================================================
const ALIASES: Array<{ master: string; alias_name: string }> = [
  { master: "patient_appointments", alias_name: "Visit" },
  { master: "patient_appointments", alias_name: "Appointment Slot" },
  { master: "patient_appointments", alias_name: "Patient Visit Booking" },
  { master: "clinical_encounters", alias_name: "Encounter" },
  { master: "clinical_encounters", alias_name: "Episode of Care" },
  { master: "clinical_encounters", alias_name: "Patient Visit Event" },
  { master: "care_plans", alias_name: "Treatment Plan" },
  { master: "care_plans", alias_name: "Plan of Care" },
  { master: "care_plans", alias_name: "Care Pathway" },
  { master: "patient_referrals", alias_name: "Consult" },
  { master: "patient_referrals", alias_name: "Specialist Referral" },
  { master: "patient_referrals", alias_name: "Consultation Request" },
  { master: "clinical_orders", alias_name: "Order" },
  { master: "clinical_orders", alias_name: "CPOE Order" },
  { master: "clinical_orders", alias_name: "Provider Order Entry" },
  { master: "clinical_notes", alias_name: "Chart Note" },
  { master: "clinical_notes", alias_name: "Progress Note" },
  { master: "clinical_notes", alias_name: "SOAP Note" },
  { master: "clinical_notes", alias_name: "Encounter Note" },
];

async function fixAliases(): Promise<number> {
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ALL_IDS.join(",")})&select=data_object_id,alias_name`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert = ALIASES.filter(a => {
    const doid = MASTERS[a.master];
    return !existingKeys.has(`${doid}|${a.alias_name.toLowerCase()}`);
  }).map(a => ({
    data_object_id: MASTERS[a.master],
    alias_name: a.alias_name,
    alias_type: "synonym",
  }));
  if (toInsert.length === 0) {
    console.log("  aliases: all present, nothing to insert");
    return 0;
  }
  await insert("/data_object_aliases", toInsert);
  console.log(`  aliases: inserted ${toInsert.length} (of ${ALIASES.length} specified)`);
  return toInsert.length;
}

// ============================================================
// 4. B12 lifecycle states (pre-specified by audit). domain_module_id null (no modules yet).
//    requires_permission=true on workflow gates per state.yaml.
// ============================================================
type LState = {
  name: string;
  order: number;
  initial?: boolean;
  terminal?: boolean;
  gate?: boolean; // requires_permission
  desc: string;
};
const LIFECYCLE: Record<string, LState[]> = {
  patient_appointments: [
    { name: "scheduled", order: 10, initial: true, desc: "Visit booked with provider, location, and time." },
    { name: "checked_in", order: 20, desc: "Patient has arrived and checked in at the front desk." },
    { name: "in_progress", order: 30, desc: "Patient is being seen; the visit is underway." },
    { name: "completed", order: 40, terminal: true, desc: "Visit finished and ready for documentation and billing." },
    { name: "no_show", order: 50, terminal: true, desc: "Patient did not arrive for the scheduled visit." },
    { name: "cancelled", order: 60, terminal: true, gate: true, desc: "Visit cancelled before it took place." },
  ],
  clinical_encounters: [
    { name: "open", order: 10, initial: true, desc: "Encounter created when the patient is seen." },
    { name: "in_progress", order: 20, desc: "Clinical documentation and coding underway." },
    { name: "completed", order: 30, desc: "Encounter content captured and ready for sign-off." },
    { name: "signed", order: 40, gate: true, desc: "Provider has signed the encounter; content is attested." },
    { name: "locked", order: 50, terminal: true, gate: true, desc: "Encounter locked; no further edits without amendment." },
  ],
  care_plans: [
    { name: "draft", order: 10, initial: true, desc: "Care plan being authored by the care coordinator." },
    { name: "active", order: 20, desc: "Care plan in effect and being followed by the care team." },
    { name: "on_hold", order: 30, desc: "Care plan temporarily paused." },
    { name: "completed", order: 40, terminal: true, desc: "Care plan goals met and the plan closed." },
    { name: "withdrawn", order: 50, terminal: true, gate: true, desc: "Care plan withdrawn before completion." },
  ],
  patient_referrals: [
    { name: "created", order: 10, initial: true, desc: "Referral created by the referring provider." },
    { name: "sent", order: 20, desc: "Referral sent to the target specialist or facility." },
    { name: "accepted", order: 30, desc: "Receiving provider has accepted the referral." },
    { name: "declined", order: 40, terminal: true, desc: "Receiving provider has declined the referral." },
    { name: "completed", order: 50, terminal: true, desc: "Referred care has been delivered and the loop is closed." },
    { name: "expired", order: 60, terminal: true, desc: "Referral lapsed without being acted on." },
  ],
  clinical_orders: [
    { name: "placed", order: 10, initial: true, desc: "Order entered by the ordering clinician (CPOE)." },
    { name: "in_progress", order: 20, desc: "Order accepted by the fulfilling department and being worked." },
    { name: "resulted", order: 30, desc: "Result returned for the order." },
    { name: "completed", order: 40, terminal: true, desc: "Order fully fulfilled and closed." },
    { name: "cancelled", order: 50, terminal: true, gate: true, desc: "Order cancelled before fulfillment." },
    { name: "discontinued", order: 60, terminal: true, gate: true, desc: "Order stopped after it began." },
  ],
  clinical_notes: [
    { name: "draft", order: 10, initial: true, desc: "Note being written by the documenting provider." },
    { name: "signed", order: 20, gate: true, desc: "Note signed by the responsible provider; immutable thereafter." },
    { name: "addended", order: 30, terminal: true, gate: true, desc: "Addendum appended to a signed note." },
    { name: "amended", order: 40, terminal: true, gate: true, desc: "Amendment recorded against a signed note." },
  ],
};

async function fixLifecycle(): Promise<number> {
  const existing = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${ALL_IDS.join(",")})&select=data_object_id,state_name`,
  );
  const existingKeys = new Set(
    existing.map(r => `${r.data_object_id}|${r.state_name}`),
  );
  const toInsert: Row[] = [];
  for (const [master, states] of Object.entries(LIFECYCLE)) {
    const doid = MASTERS[master];
    for (const s of states) {
      if (existingKeys.has(`${doid}|${s.name}`)) continue;
      toInsert.push({
        data_object_id: doid,
        state_name: s.name,
        state_order: s.order,
        description: s.desc,
        is_initial: !!s.initial,
        is_terminal: !!s.terminal,
        requires_permission: !!s.gate,
        domain_module_id: null,
      });
    }
  }
  if (toInsert.length === 0) {
    console.log("  lifecycle: all states present, nothing to insert");
    return 0;
  }
  await insert("/data_object_lifecycle_states", toInsert);
  console.log(`  lifecycle: inserted ${toInsert.length} states across 6 masters`);
  return toInsert.length;
}

// ============================================================
// main
// ============================================================
const results: Record<string, number> = {};
console.log("== HC-PATIENT state-driven execute 2026-06-07 ==");
console.log("[1] entity_type (B13)");
results.entity_type = await fixEntityType();
console.log("[2] catalog UX (A4)");
results.catalog_ux = await fixCatalogUX();
console.log("[3] aliases (B11)");
results.aliases = await fixAliases();
console.log("[4] lifecycle states (B12)");
results.lifecycle = await fixLifecycle();

console.log("\n== SUMMARY ==");
console.log(JSON.stringify(results, null, 2));
console.log("\nUI links:");
console.log("https://tests.semantius.app/domain_map/data_objects");
console.log("https://tests.semantius.app/domain_map/domains");
console.log("https://tests.semantius.app/domain_map/data_object_aliases");
console.log("https://tests.semantius.app/domain_map/data_object_lifecycle_states");
