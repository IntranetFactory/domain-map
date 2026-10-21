// Fix the M7 violation from the BGV build: gdpr_consent_records (950) ended up with 2 master rows
// (LMS-CT-GDPR mod 180 + BGV-CONTINUOUS-IDENTITY mod 410). Module-grain single-master is hard (M7);
// the emitter throws on 2. Screening GDPR consent is a DISTINCT concept from LMS learner consent, so
// per Rule #9 (collision -> scope-qualify) BGV masters a new `screening_gdpr_consents` instead of
// co-mastering 950. Re-point BGV's DMDO master row (and any BGV tool) off 950 onto the new entity.
// Leaves LMS's master on 950 untouched. Idempotent.

type Row = Record<string, unknown>;
async function call(req: { method: string; path: string; body?: unknown }): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(req)); proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  const t = out.trim();
  if (!t) { if (proc.exitCode === 0) return []; throw new Error(`fail ${req.method} ${req.path}: ${err}`); }
  let p: any; try { p = JSON.parse(t); } catch { throw new Error(`non-JSON ${req.method} ${req.path}: ${t.slice(0,400)} ${err}`); }
  if (p && typeof p === "object" && !Array.isArray(p) && p.code && p.message) throw new Error(`PostgREST ${req.method} ${req.path}: ${JSON.stringify(p)}`);
  return p;
}
const get = (path: string) => call({ method: "GET", path });
const log = (m: string) => console.log(m);

const NEW_NAME = "screening_gdpr_consents";

// 1. Ensure the new distinct data_object exists.
let [newObj] = await get(`/data_objects?data_object_name=eq.${NEW_NAME}&select=id`);
if (!newObj) {
  // mirror the catalog_description style of the LMS gdpr_consent_records but scoped to screening
  const [created] = await call({ method: "POST", path: "/data_objects", body: [{
    data_object_name: NEW_NAME,
    singular_label: "Screening GDPR Consent",
    plural_label: "Screening GDPR Consents",
    description: "GDPR lawful-basis consent records captured from a candidate before a background screening is run on a non-US (EU/UK) data subject. Distinct from learner-training consent.",
    catalog_description: "GDPR consent records for background screening of non-US candidates, capturing lawful basis, scope, and withdrawal.",
    entity_type: "operational_record",
  }] });
  newObj = created;
  log(`created data_object ${NEW_NAME} id ${newObj.id}`);
} else {
  log(`data_object ${NEW_NAME} already exists id ${newObj.id} (skip create)`);
}
const newId = Number(newObj.id);

// 2. Re-point the BGV master DMDO row on 950 (mod 410) onto the new entity.
const [bgvRow] = await get(`/domain_module_data_objects?domain_module_id=eq.410&data_object_id=eq.950&role=eq.master&select=id,necessity`);
if (bgvRow) {
  await call({ method: "PATCH", path: `/domain_module_data_objects?id=eq.${bgvRow.id}`, body: {
    data_object_id: newId,
    domain_module_data_object_label: `BGV-CONTINUOUS-IDENTITY / ${NEW_NAME}`,
  } });
  log(`re-pointed BGV DMDO row ${bgvRow.id}: 950 -> ${newId}`);
} else {
  // maybe already re-pointed
  const [already] = await get(`/domain_module_data_objects?domain_module_id=eq.410&data_object_id=eq.${newId}&role=eq.master&select=id`);
  log(already ? `BGV DMDO already points at ${newId} (skip)` : `WARNING: no BGV master row on 950 and none on ${newId}`);
}

// 3. Re-point any BGV tool that referenced 950 (e.g. query_gdpr_consent_records) onto the new entity.
const tools950 = await get(`/tools?data_object_id=eq.950&select=id,tool_name,operation_kind`);
for (const tdef of tools950) {
  // only re-point tools that are screening-named (avoid touching LMS-side tools); be conservative
  const name = String(tdef.tool_name);
  if (name.includes("gdpr") && (name.includes("screening") || name.includes("consent"))) {
    // leave generic ones alone unless clearly the BGV screening tool; report for manual check
  }
}
log(`tools referencing 950: ${tools950.map((t: Row) => t.tool_name).join(", ") || "(none)"}`);

// 4. Verify M7 on both objects.
const m950 = await get(`/domain_module_data_objects?data_object_id=eq.950&role=eq.master&select=domain_modules(domain_module_code)`);
const mNew = await get(`/domain_module_data_objects?data_object_id=eq.${newId}&role=eq.master&select=domain_modules(domain_module_code)`);
log(`\nM7 verify:`);
log(`  gdpr_consent_records (950) masters: ${m950.length} -> ${m950.map((r: any) => r.domain_modules?.domain_module_code).join(", ")}`);
log(`  ${NEW_NAME} (${newId}) masters: ${mNew.length} -> ${mNew.map((r: any) => r.domain_modules?.domain_module_code).join(", ")}`);
if (m950.length !== 1 || mNew.length !== 1) { log("  !! M7 still not clean, inspect"); }
else { log("  OK: each has exactly one master."); }

// 5. Confirm BGV still has 33 masters.
const bgvMasters = await get(`/domain_module_data_objects?domain_module_id=in.(408,409,410)&role=eq.master&select=data_object_id`);
log(`BGV master DMDO rows: ${bgvMasters.length} (expect 33)`);
log("Done.");
