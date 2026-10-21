#!/usr/bin/env bun
// LMS a-LMS.md processing (2026-06-16), Rule #22 a-file workflow.
// Executes the DECIDED items only:
//   a1 = "a"  -> Refactor C (3-entity shape): create compliance_regulations master,
//               wire regulation FK relationship onto training_evidence_records (940),
//               wire DMDO + lifecycle + classify; DELETE the 5 completion entities
//               (944 hipaa, 945 osha, 946 sox, 947 ferpa, 949 bsa_aml) + all dependents.
//               948 fda_part11_audit_trails stays. Destructive structural steps are
//               approved by q-file option (a).
//   a5 = rec(a) -> load the 18 net-new MISSING entities by module group; reconcile
//               data_retention_policies to existing records_retention_policies (433):
//               wire 433 as consumer into LMS-CT-GDPR (180) instead of a duplicate.
//   a6 = rec(a) -> add GDPR(1)+HIPAA(4)+OSHA(101)+SOX(5) to domain_regulations(57).
// NOT executed here (kept open / blocked): a2=b (PRIV-MGMT cross-domain build, out of
//   LMS edit scope + ordering dependency), a7=hold (privacy mis-tags), a3/a4 (questions).
//
// Idempotent: read-before-write on natural keys; deletes guarded by existence check.
// Rule #1: record_status omitted (DB default 'new'); never stamped. Rule #15: notes = "".

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius failed (exit ${exitCode}): ${stderr}`);
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
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    out.push(...(await call({ method: "POST", path, body: uniformize(rows.slice(i, i + CHUNK)) })));
  }
  return out;
}

const M = { COURSE: 32, COMPLIANCE: 33, PATHS: 34, ILT: 178, CREDENTIALS: 179, GDPR: 180, AUTOMATION: 181, STARTER: 182 };
const DOMAIN = 57;

// ---- the 18 net-new MISSING entities (data_retention_policies reconciles to 433) ----
type EntSpec = {
  name: string; singular: string; plural: string; desc: string;
  entity_type: string; module: number; role: string; necessity: string;
  states?: { name: string; order: number; initial?: boolean; terminal?: boolean; verb?: string }[];
  aliases?: string[];
};
const ENTITIES: EntSpec[] = [
  // LMS-COURSE-DELIVERY (32)
  { name: "question_banks", singular: "Question Bank", plural: "Question Banks",
    desc: "Reusable pools of assessment questions independent of any single assessment, drawn from for randomized quizzes and recertification exams.",
    entity_type: "catalog", module: M.COURSE, role: "master", necessity: "optional" },
  { name: "cmi5_assignable_units", singular: "cmi5 Assignable Unit", plural: "cmi5 Assignable Units",
    desc: "cmi5 (ADL) assignable unit launched against an LRS; modern course-package standard supplanting SCORM.",
    entity_type: "catalog", module: M.COURSE, role: "master", necessity: "optional" },
  { name: "lrs_statement_endpoints", singular: "LRS Statement Endpoint", plural: "LRS Statement Endpoints",
    desc: "External Learning Record Store endpoints xAPI statements are routed to.",
    entity_type: "catalog", module: M.COURSE, role: "master", necessity: "optional" },
  { name: "observation_checklists", singular: "Observation Checklist", plural: "Observation Checklists",
    desc: "On-the-job competency checklist an observer scores against; field-skill assessment.",
    entity_type: "catalog", module: M.COURSE, role: "master", necessity: "optional",
    states: [{ name: "draft", order: 1, initial: true }, { name: "published", order: 2, verb: "publish" }, { name: "retired", order: 3, terminal: true, verb: "retire" }] },
  { name: "observation_checklist_results", singular: "Observation Checklist Result", plural: "Observation Checklist Results",
    desc: "A learner's scored result against an observation checklist, with observer signoff.",
    entity_type: "operational_workflow", module: M.COURSE, role: "master", necessity: "optional",
    states: [{ name: "in_progress", order: 1, initial: true }, { name: "submitted", order: 2, verb: "submit" }, { name: "signed_off", order: 3, terminal: true, verb: "sign_off" }] },
  // LMS-ILT-DELIVERY (178)
  { name: "training_room_bookings", singular: "Training Room Booking", plural: "Training Room Bookings",
    desc: "Reservation of a physical or virtual room and resources for an instructor-led session.",
    entity_type: "operational_workflow", module: M.ILT, role: "master", necessity: "optional",
    states: [{ name: "requested", order: 1, initial: true }, { name: "confirmed", order: 2, verb: "confirm" }, { name: "released", order: 3, terminal: true, verb: "release" }] },
  { name: "session_rosters", singular: "Session Roster", plural: "Session Rosters",
    desc: "Pre-session enrollment snapshot for an ILT session; attendance proof basis.",
    entity_type: "operational_record", module: M.ILT, role: "master", necessity: "optional" },
  { name: "session_cancellations", singular: "Session Cancellation", plural: "Session Cancellations",
    desc: "Cancellation or no-show record for an ILT session, driving waitlist promotion.",
    entity_type: "operational_record", module: M.ILT, role: "master", necessity: "optional" },
  // LMS-PATHS (34)
  { name: "skill_targets", singular: "Skill Target", plural: "Skill Targets",
    desc: "A learning-path step bound to a skill plus a target proficiency threshold.",
    entity_type: "catalog", module: M.PATHS, role: "master", necessity: "optional" },
  { name: "learning_recommendations", singular: "Learning Recommendation", plural: "Learning Recommendations",
    desc: "Per-learner suggested content generated from skill gaps and role profile.",
    entity_type: "operational_workflow", module: M.PATHS, role: "master", necessity: "optional",
    states: [{ name: "generated", order: 1, initial: true }, { name: "accepted", order: 2, verb: "accept" }, { name: "dismissed", order: 3, terminal: true, verb: "dismiss" }] },
  // LMS-CREDENTIALS (179)
  { name: "credential_verifications", singular: "Credential Verification", plural: "Credential Verifications",
    desc: "Third-party verification handshake for an issued badge or credential (Open Badges 3.0).",
    entity_type: "operational_workflow", module: M.CREDENTIALS, role: "master", necessity: "optional",
    states: [{ name: "requested", order: 1, initial: true }, { name: "verified", order: 2, verb: "verify" }, { name: "rejected", order: 3, terminal: true, verb: "reject" }] },
  { name: "certification_renewals", singular: "Certification Renewal", plural: "Certification Renewals",
    desc: "Renewal cycle of an existing certification, distinct from initial issuance.",
    entity_type: "operational_workflow", module: M.CREDENTIALS, role: "master", necessity: "optional",
    states: [{ name: "due", order: 1, initial: true }, { name: "submitted", order: 2, verb: "submit" }, { name: "renewed", order: 3, terminal: true, verb: "renew" }] },
  // LMS-COMPLIANCE-TRAINING (33)  -- sequenced after q1 / Refactor C
  { name: "gxp_training_signoffs", singular: "GxP Training Signoff", plural: "GxP Training Signoffs",
    desc: "Witnessed e-signature binding learner, course, content version and timestamp for FDA 21 CFR Part 11 life-sciences training.",
    entity_type: "operational_workflow", module: M.COMPLIANCE, role: "master", necessity: "optional",
    states: [{ name: "pending", order: 1, initial: true }, { name: "signed", order: 2, verb: "sign" }, { name: "locked", order: 3, terminal: true, verb: "lock" }] },
  { name: "phishing_simulations", singular: "Phishing Simulation", plural: "Phishing Simulations",
    desc: "Configured simulated-phishing campaign for security-awareness training (PCI DSS 12.6).",
    entity_type: "catalog", module: M.COMPLIANCE, role: "master", necessity: "optional",
    states: [{ name: "draft", order: 1, initial: true }, { name: "launched", order: 2, verb: "launch" }, { name: "closed", order: 3, terminal: true, verb: "close" }] },
  { name: "phishing_simulation_results", singular: "Phishing Simulation Result", plural: "Phishing Simulation Results",
    desc: "Per-recipient outcome of a phishing simulation (clicked, reported, ignored).",
    entity_type: "operational_record", module: M.COMPLIANCE, role: "master", necessity: "optional" },
  // TRAINING-RECORDS-STARTER (182)
  { name: "dpo_training_acknowledgements", singular: "DPO Training Acknowledgement", plural: "DPO Training Acknowledgements",
    desc: "Data-protection-officer training acknowledgement record (GDPR Art. 39).",
    entity_type: "operational_record", module: M.STARTER, role: "embedded_master", necessity: "optional" },
  { name: "pci_dss_awareness_records", singular: "PCI DSS Awareness Record", plural: "PCI DSS Awareness Records",
    desc: "Card-handler security-awareness training record (PCI DSS 12.6).",
    entity_type: "operational_record", module: M.STARTER, role: "embedded_master", necessity: "optional" },
  // LMS-AUTOMATION (181)
  { name: "reminder_schedules", singular: "Reminder Schedule", plural: "Reminder Schedules",
    desc: "Configured nudge cadence driving automated learner and manager reminders.",
    entity_type: "catalog", module: M.AUTOMATION, role: "master", necessity: "optional" },
];

const baseDO = (name: string, singular: string, plural: string, desc: string, entity_type: string): Row => ({
  data_object_name: name, singular_label: singular, plural_label: plural, description: desc,
  kind: "domain_owned", entity_type, is_canonical_bare_word: false, naming_authority_rationale: "",
  has_personal_content: entity_type === "operational_workflow" || entity_type === "operational_record",
  has_submit_lock: false, has_single_approver: false, notes: "",
});

async function main() {
  const summary: string[] = [];

  // ============ a1: Refactor C ============
  // 1a. Create compliance_regulations master (tenant-scoped reference table).
  let cregId: number;
  {
    const existing = await get(`/data_objects?data_object_name=eq.compliance_regulations&select=id`);
    if (existing.length) {
      cregId = Number(existing[0].id);
      summary.push(`compliance_regulations exists (id ${cregId})`);
    } else {
      const inserted = await insert("/data_objects", [baseDO(
        "compliance_regulations", "Compliance Regulation", "Compliance Regulations",
        "Tenant-scoped reference table of statutes a tenant is subject to (jurisdiction, citation, retention period). Each tenant activates only its applicable subset; the regulation field on training_evidence_records is an FK into this table, and the active rows gate which compliance evidence applies.",
        "catalog")]);
      cregId = Number(inserted[0].id);
      summary.push(`compliance_regulations created (id ${cregId})`);
    }
  }
  // 1b. DMDO: master in LMS-COMPLIANCE-TRAINING (33) + embedded_master in STARTER (182).
  {
    const existing = await get(`/domain_module_data_objects?data_object_id=eq.${cregId}&select=domain_module_id`);
    const have = new Set(existing.map(r => Number(r.domain_module_id)));
    const want: Row[] = [];
    if (!have.has(M.COMPLIANCE)) want.push({ domain_module_id: M.COMPLIANCE, data_object_id: cregId, role: "master", necessity: "required", notes: "" });
    if (!have.has(M.STARTER)) want.push({ domain_module_id: M.STARTER, data_object_id: cregId, role: "embedded_master", necessity: "optional", notes: "" });
    if (want.length) { await insert("/domain_module_data_objects", want); summary.push(`compliance_regulations DMDO +${want.length}`); }
  }
  // 1c. domain_data_objects rollup for compliance_regulations (master/required).
  {
    const existing = await get(`/domain_data_objects?domain_id=eq.${DOMAIN}&data_object_id=eq.${cregId}&select=id`);
    if (!existing.length) {
      await insert("/domain_data_objects", [{ domain_id: DOMAIN, data_object_id: cregId, role: "master", necessity: "required", notes: "" }]);
      summary.push("compliance_regulations rollup +1");
    }
  }
  // 1d. Regulation FK relationship: compliance_regulations (one/parent) -> training_evidence_records (940, many/child holds the FK).
  {
    const existing = await get(`/data_object_relationships?data_object_id=eq.${cregId}&related_data_object_id=eq.940&select=id`);
    if (!existing.length) {
      await insert("/data_object_relationships", [{
        data_object_id: cregId, related_data_object_id: 940,
        relationship_type: "one_to_many", relationship_kind: "reference",
        relationship_verb: "is_evidenced_by", inverse_verb: "documents_compliance_with",
        is_required: false, owner_side: "target", notes: "",
      }]);
      summary.push("compliance_regulations -> 940 FK relationship +1");
    }
  }
  // 1e. DELETE the 5 completion entities + all dependents (approved by q-file option a).
  // 948 fda_part11_audit_trails is KEPT.
  const KILL = [944, 945, 946, 947, 949];
  {
    // Dependents first (FK-safe order). Re-read each set so this is idempotent.
    const inList = `(${KILL.join(",")})`;
    // 1e-i. Tools that tool these 5 entities (and their domain_module_tools links).
    const tools = await get(`/tools?data_object_id=in.${inList}&select=id`);
    if (tools.length) {
      const toolIds = tools.map(r => Number(r.id));
      const toolInList = `(${toolIds.join(",")})`;
      const dmt = await get(`/domain_module_tools?tool_id=in.${toolInList}&select=id`);
      if (dmt.length) { await call({ method: "DELETE", path: `/domain_module_tools?tool_id=in.${toolInList}` }); summary.push(`DELETE domain_module_tools: ${dmt.length}`); }
      await call({ method: "DELETE", path: `/tools?id=in.${toolInList}` }); summary.push(`DELETE tools(5 completion): ${tools.length}`);
    }
    const delsets: { label: string; path: string }[] = [
      { label: "data_object_relationships(related)", path: `/data_object_relationships?related_data_object_id=in.${inList}` },
      { label: "data_object_relationships(src)", path: `/data_object_relationships?data_object_id=in.${inList}` },
      { label: "data_object_lifecycle_states", path: `/data_object_lifecycle_states?data_object_id=in.${inList}` },
      { label: "data_object_aliases", path: `/data_object_aliases?data_object_id=in.${inList}` },
      { label: "domain_module_data_objects", path: `/domain_module_data_objects?data_object_id=in.${inList}` },
      { label: "domain_data_objects", path: `/domain_data_objects?data_object_id=in.${inList}` },
    ];
    for (const d of delsets) {
      const sel = await get(`${d.path}&select=id`);
      if (sel.length) { await call({ method: "DELETE", path: d.path }); summary.push(`DELETE ${d.label}: ${sel.length}`); }
    }
    const dos = await get(`/data_objects?id=in.${inList}&select=id`);
    if (dos.length) { await call({ method: "DELETE", path: `/data_objects?id=in.${inList}` }); summary.push(`DELETE data_objects(5 completion): ${dos.length}`); }
  }

  // ============ a5: load 18 MISSING entities + reconcile 433 ============
  // First insert all data_objects that are missing by name.
  {
    const names = ENTITIES.map(e => e.name);
    const existing = await get(`/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`);
    const have = new Map(existing.map(r => [String(r.data_object_name), Number(r.id)]));
    const toInsert = ENTITIES.filter(e => !have.has(e.name)).map(e => baseDO(e.name, e.singular, e.plural, e.desc, e.entity_type));
    if (toInsert.length) { await insert("/data_objects", toInsert); summary.push(`MISSING data_objects +${toInsert.length}`); }
  }
  // Re-read full id map.
  const idMap = new Map<string, number>();
  {
    const names = ENTITIES.map(e => e.name);
    const all = await get(`/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`);
    for (const r of all) idMap.set(String(r.data_object_name), Number(r.id));
  }
  // DMDO + rollup + lifecycle + aliases for each.
  {
    const dmdoWant: Row[] = []; const rollWant: Row[] = []; const stateWant: Row[] = [];
    for (const e of ENTITIES) {
      const oid = idMap.get(e.name)!;
      const dm = await get(`/domain_module_data_objects?data_object_id=eq.${oid}&domain_module_id=eq.${e.module}&select=id`);
      if (!dm.length) dmdoWant.push({ domain_module_id: e.module, data_object_id: oid, role: e.role, necessity: e.necessity, notes: "" });
      const rl = await get(`/domain_data_objects?domain_id=eq.${DOMAIN}&data_object_id=eq.${oid}&select=id`);
      if (!rl.length) rollWant.push({ domain_id: DOMAIN, data_object_id: oid, role: e.role, necessity: e.necessity, notes: "" });
      if (e.states) {
        const st = await get(`/data_object_lifecycle_states?data_object_id=eq.${oid}&select=id`);
        if (!st.length) for (const s of e.states) stateWant.push({
          data_object_id: oid, domain_module_id: e.module, state_name: s.name, state_order: s.order,
          is_initial: !!s.initial, is_terminal: !!s.terminal, requires_permission: !!s.verb,
          permission_verb_override: s.verb ?? "", description: "", notes: "", process_id: null,
        });
      }
    }
    if (dmdoWant.length) { await insert("/domain_module_data_objects", dmdoWant); summary.push(`MISSING DMDO +${dmdoWant.length}`); }
    if (rollWant.length) { await insert("/domain_data_objects", rollWant); summary.push(`MISSING rollup +${rollWant.length}`); }
    if (stateWant.length) { await insert("/data_object_lifecycle_states", stateWant); summary.push(`MISSING lifecycle states +${stateWant.length}`); }
  }
  // Reconcile data_retention_policies: wire existing records_retention_policies (433) as
  // consumer/optional into LMS-CT-GDPR (180); no duplicate entity created.
  {
    const dm = await get(`/domain_module_data_objects?data_object_id=eq.433&domain_module_id=eq.${M.GDPR}&select=id`);
    if (!dm.length) { await insert("/domain_module_data_objects", [{ domain_module_id: M.GDPR, data_object_id: 433, role: "consumer", necessity: "optional", notes: "" }]); summary.push("reconcile 433 -> LMS-CT-GDPR consumer +1"); }
    const rl = await get(`/domain_data_objects?domain_id=eq.${DOMAIN}&data_object_id=eq.433&select=id`);
    if (!rl.length) { await insert("/domain_data_objects", [{ domain_id: DOMAIN, data_object_id: 433, role: "consumer", necessity: "optional", notes: "" }]); summary.push("reconcile 433 rollup +1"); }
  }

  // ============ a6: domain_regulations +GDPR/HIPAA/OSHA/SOX ============
  {
    const REGS = [1, 4, 101, 5]; // GDPR, HIPAA, OSHA, SOX
    const existing = await get(`/domain_regulations?domain_id=eq.${DOMAIN}&select=regulation_id`);
    const have = new Set(existing.map(r => Number(r.regulation_id)));
    const want = REGS.filter(r => !have.has(r)).map(r => ({ domain_id: DOMAIN, regulation_id: r, applicability: "mandatory", condition_notes: "", notes: "" }));
    if (want.length) { await insert("/domain_regulations", want); summary.push(`domain_regulations +${want.length}`); }
  }

  console.log("\n==== SUMMARY ====");
  for (const s of summary) console.log("  " + s);
}
main().catch(e => { console.error(e); process.exit(1); });
