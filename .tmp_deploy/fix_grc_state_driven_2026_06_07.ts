#!/usr/bin/env bun
// State-driven GRC audit execution (2026-06-07), domain-map-analyst Validate mode.
// Executes ONLY the additive/corrective open items classified EXECUTE from
// audits/GRC/state.yaml. Idempotent: read live, insert/patch only what is missing.
//
// EXECUTE write types:
//   1. entity_type PATCH: 10 GRC masters unclassified -> operational_workflow (Rule #12 / B13).
//   2. Catalog UX (Rule #20): GRC domain row (id 15) empty catalog_tagline/catalog_description.
//      No GRC domain_modules exist (unbuilt), so no module rows to author.
//   3. APQC tag (B1A-APQC): handoff 249 (GRC -> LMS, compliance_policy.updated, policy_attestations)
//      has a clean PCF match -> process 1829 "Train employees on appropriate regulatory requirements".
//   4. Aliases (B1A-S5 / B11): generic cross-vendor synonyms for the 10 masters (alias_type='synonym').
//
// Run from project root: bun run ".tmp_deploy/fix_grc_state_driven_2026_06_07.ts"

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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

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

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

const GRC_MASTERS = [282, 283, 284, 285, 286, 287, 288, 289, 290, 291];

// ============================================================
// 1. entity_type PATCH (B13 / Rule #12)
// All 10 GRC masters are stateful workflow records -> operational_workflow.
// ============================================================
async function fixEntityType(): Promise<number> {
  const rows = await get(
    `/data_objects?id=in.(${GRC_MASTERS.join(",")})&entity_type=eq.unclassified&select=id,data_object_name`,
  );
  if (rows.length === 0) {
    console.log("entity_type: all GRC masters already classified, nothing to patch");
    return 0;
  }
  const ids = rows.map(r => r.id);
  await patch(`/data_objects?id=in.(${ids.join(",")})`, {
    entity_type: "operational_workflow",
  });
  console.log(`entity_type: PATCHed ${ids.length} masters -> operational_workflow (${ids.join(",")})`);
  return ids.length;
}

// ============================================================
// 2. Catalog UX on the GRC domain row (Rule #20)
// Buyer-voice copy: workflow + value, no vendor names, no em-dash, American English.
// ============================================================
const GRC_DOMAIN_TAGLINE =
  "Run risk, compliance, policy, and audit on one connected register so nothing falls through the cracks.";
const GRC_DOMAIN_DESCRIPTION =
  "Bring enterprise risk, controls, policies, regulatory obligations, attestations, and audit issues into a single governed workspace. Identify and score risks, map them to the controls that mitigate them, test those controls on a schedule, and capture the evidence that proves it. Publish policies, drive attestation campaigns, track obligations against frameworks like SOX, ISO 27001, SOC 2, and NIST CSF, and open remediation plans the moment a control fails. Teams get a defensible, always-current view of their compliance posture and a clean audit trail instead of scattered spreadsheets and last-minute scrambles.";

async function fixDomainCatalog(): Promise<number> {
  const [domain] = await get(
    `/domains?domain_code=eq.GRC&select=id,catalog_tagline,catalog_description`,
  );
  if (!domain) throw new Error("GRC domain not found");
  const body: Row = {};
  if (!domain.catalog_tagline || String(domain.catalog_tagline).trim() === "") {
    body.catalog_tagline = GRC_DOMAIN_TAGLINE;
  }
  if (!domain.catalog_description || String(domain.catalog_description).trim() === "") {
    body.catalog_description = GRC_DOMAIN_DESCRIPTION;
  }
  if (Object.keys(body).length === 0) {
    console.log("catalog UX: GRC domain row already has non-empty copy, nothing to write");
    return 0;
  }
  await patch(`/domains?id=eq.${domain.id}`, body);
  console.log(`catalog UX: wrote ${Object.keys(body).join(" + ")} on GRC domain row ${domain.id}`);
  return 1;
}

// ============================================================
// 3. APQC tag for handoff 249 (B1A-APQC)
// GRC -> LMS, compliance_policy.updated, payload policy_attestations.
// Clean PCF match: process 1829 "Train employees on appropriate regulatory requirements" (12772).
// ============================================================
const HANDOFF_249 = 249;
const PCF_249 = 1829;

async function fixApqcTag(): Promise<number> {
  const existing = await get(
    `/handoff_processes?handoff_id=eq.${HANDOFF_249}&select=id,process_id`,
  );
  if (existing.length > 0) {
    console.log(`APQC: handoff ${HANDOFF_249} already tagged (process ${existing[0].process_id}), skipping`);
    return 0;
  }
  // verify the PCF process exists live
  const [proc] = await get(`/processes?id=eq.${PCF_249}&select=id,process_name,external_id`);
  if (!proc) throw new Error(`PCF process ${PCF_249} not found`);
  await insert("/handoff_processes", [
    {
      handoff_id: HANDOFF_249,
      process_id: PCF_249,
      proposal_source: "agent_curated",
      role: "implements",
    },
  ]);
  console.log(
    `APQC: tagged handoff ${HANDOFF_249} -> process ${PCF_249} "${proc.process_name}" (${proc.external_id})`,
  );
  return 1;
}

// ============================================================
// 4. Aliases (B1A-S5 / B11) — generic cross-vendor synonyms
// Per Rule #18, vendor terms allowed only in alias_name; these are generic industry
// terminology (Finding, Observation, Sign-off, etc.), not vendor product names.
// alias_type='synonym' (no industry_id available for these cross-industry terms).
// ============================================================
const ALIASES: Record<number, string[]> = {
  282: ["Risk Item", "Risk Issue", "Risk Register Entry"], // compliance_risks
  283: ["Control Objective", "Safeguard", "Control Activity"], // compliance_controls
  284: ["Control Test", "Control Walkthrough", "Continuous Control Monitoring"], // control_assessments
  285: ["Policy Document", "Standard", "Procedure"], // compliance_policies
  286: ["Acknowledgement", "Sign-off", "Affirmation"], // policy_attestations
  287: ["Requirement", "Regulatory Citation", "Citation"], // compliance_obligations
  288: ["Evidence Item", "Evidence Artifact", "Compliance Artifact"], // compliance_evidence
  289: ["Finding", "Observation", "Deficiency", "Gap"], // audit_issues
  290: ["Action Plan", "Corrective Action", "CAPA Plan"], // remediation_plans
  291: ["Risk Review", "Risk Analysis"], // risk_assessments
};

async function fixAliases(): Promise<number> {
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${GRC_MASTERS.join(",")})&select=data_object_id,alias_name`,
  );
  const existingKey = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert: Row[] = [];
  for (const [doId, names] of Object.entries(ALIASES)) {
    for (const name of names) {
      const key = `${doId}|${name.toLowerCase()}`;
      if (existingKey.has(key)) continue;
      toInsert.push({
        data_object_id: Number(doId),
        alias_name: name,
        alias_type: "synonym",
      });
    }
  }
  if (toInsert.length === 0) {
    console.log("aliases: all enumerated synonyms already present, nothing to insert");
    return 0;
  }
  await insert("/data_object_aliases", toInsert);
  console.log(`aliases: inserted ${toInsert.length} synonym rows across ${Object.keys(ALIASES).length} masters`);
  return toInsert.length;
}

// ============================================================
async function main() {
  console.log("=== GRC state-driven execute (2026-06-07) ===");
  const n1 = await fixEntityType();
  const n2 = await fixDomainCatalog();
  const n3 = await fixApqcTag();
  const n4 = await fixAliases();
  console.log("\n=== Summary ===");
  console.log(`entity_type PATCHed:        ${n1}`);
  console.log(`domain catalog UX written:  ${n2}`);
  console.log(`APQC handoff tags inserted: ${n3}`);
  console.log(`aliases inserted:           ${n4}`);
  console.log("\nUI links:");
  console.log("https://tests.semantius.app/domain_map/data_objects");
  console.log("https://tests.semantius.app/domain_map/domains?domain_code=eq.GRC");
  console.log("https://tests.semantius.app/domain_map/handoff_processes?handoff_id=eq.249");
  console.log("https://tests.semantius.app/domain_map/data_object_aliases");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
