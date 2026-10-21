// DLP b1a execution loader (2026-06-05)
// Executes the agent-solvable pending actions for domain DLP (domains.id=139),
// modules 231 (DLP-POLICY-CONTROL) and 232 (DLP-ENFORCEMENT-RUNTIME).
//
// Covers b1a items:
//   B1A-S9-S10-PER-MODULE-SKILLS  (Phase S: 2 system skills + tools + skill_tools, retire legacy skill 50)
//   B1A-S11-HANDOFF-MODULE-FKS    (B10b: backfill outbound source_domain_module_id; inbound has no candidate)
//   B1A-S17-A4-M8-CATALOG-UX      (Rule #20: write empty catalog_tagline/description on domain + 2 modules)
//   B1A-S4-B6-INTRA-MASTER-RELS   (B6: intra-domain data_object_relationships among DLP masters)
//   B1A-S15-B8-OUTBOUND-CROSS-RELS(B8: outbound DLP-master -> partner-master relationships)
//
// All inserts are idempotent by natural key. record_status omitted on every insert (DB default = "new").
// No `notes` column is ever written with content (Rule #15): junction notes left "".

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
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
const del = (path: string) => call({ method: "DELETE", path });

// Data object ids (verified live this session)
const DO = {
  dlp_incidents: 330,
  dlp_policies: 331,
  data_exfiltration_attempts: 332,
  dlp_quarantine_items: 333,
  dlp_exceptions: 334,
  dlp_user_activity_logs: 335,
  data_classifications: 303,
  employees: 31,
  // partner-domain masters for cross-domain (B8) edges (resolved by name at runtime;
  // these constants are informational only and not used for the inserts)
  service_incidents: 47, // ITSM/SECOPS master
  data_subject_requests: 901, // PRIV-MGMT master
};
const MOD = { POLICY: 231, RUNTIME: 232 };

const summary: string[] = [];
function log(s: string) {
  summary.push(s);
  console.log(s);
}

async function main() {
  // ---------------------------------------------------------------------------
  // Resolve partner-master ids needed for B8 (verify by name, never hardcode blind)
  // ---------------------------------------------------------------------------
  const partnerNames = ["service_incidents", "data_subject_requests"];
  const partnerRows = await get(
    `/data_objects?data_object_name=in.(${partnerNames.join(",")})&select=id,data_object_name`,
  );
  const partner: Record<string, number> = {};
  for (const r of partnerRows) partner[String(r.data_object_name)] = Number(r.id);
  log(`Partner masters resolved: ${JSON.stringify(partner)}`);

  // ===========================================================================
  // B1A-S9-S10 : Phase S — tools, skills, skill_tools
  // ===========================================================================

  // 1) Mutate tools (domain-specific, mine to create). Idempotent by tool_name.
  //    coverage_tier=platform (CRUD-delivered writes), matching existing query tools.
  const mutateToolSpecs = [
    { tool_name: "update_dlp_policy", operation_kind: "mutate", data_object_id: DO.dlp_policies,
      coverage_tier: "platform", description: "Update a DLP policy definition: scope, rule expressions, severity, and enforcement action." },
    { tool_name: "approve_dlp_exception", operation_kind: "mutate", data_object_id: DO.dlp_exceptions,
      coverage_tier: "platform", description: "Approve or deny a requested DLP policy exception and set its validity window." },
    { tool_name: "update_dlp_incident_status", operation_kind: "mutate", data_object_id: DO.dlp_incidents,
      coverage_tier: "platform", description: "Advance a DLP incident through triage, investigation, remediation, and closure." },
    { tool_name: "release_dlp_quarantine_item", operation_kind: "mutate", data_object_id: DO.dlp_quarantine_items,
      coverage_tier: "platform", description: "Release or destroy a held DLP quarantine item after review." },
  ];

  const existingTools = await get(
    `/tools?tool_name=in.(${mutateToolSpecs.map(t => t.tool_name).join(",")})&select=id,tool_name`,
  );
  const toolIdByName = new Map<string, number>();
  for (const r of existingTools) toolIdByName.set(String(r.tool_name), Number(r.id));

  const toolsToInsert = mutateToolSpecs.filter(t => !toolIdByName.has(t.tool_name));
  if (toolsToInsert.length) {
    const inserted = await post("/tools", toolsToInsert);
    for (const r of inserted) toolIdByName.set(String(r.tool_name), Number(r.id));
    log(`tools inserted: ${inserted.map(r => r.tool_name).join(", ")}`);
  } else {
    log("tools: all mutate tools already present (idempotent skip)");
  }

  // Reusable / generic tool ids (link existing rows; never recreate).
  const REUSE = {
    query_dlp_incidents: 412,
    query_dlp_policies: 413,
    query_data_exfiltration_attempts: 414,
    query_dlp_quarantine_items: 415,
    query_dlp_exceptions: 416,
    query_dlp_user_activity_logs: 417,
    query_data_classifications: 103,
    query_employees: 13,
    notify_team: 914, // side_effect, broadcast (Rule #9 abstraction)
    receive_webhook: 896, // inbound generic primitive (reused, not a DLP-specific clone)
  };
  // verify reusable rows still exist with expected names
  const reuseIds = Object.values(REUSE);
  const reuseRows = await get(`/tools?id=in.(${reuseIds.join(",")})&select=id,tool_name,operation_kind,data_object_id`);
  const reuseById = new Map<number, Row>();
  for (const r of reuseRows) reuseById.set(Number(r.id), r);
  for (const [name, id] of Object.entries(REUSE)) {
    const r = reuseById.get(id);
    if (!r || String(r.tool_name) !== name) {
      throw new Error(`Reusable tool id ${id} expected name ${name}, got ${r ? r.tool_name : "MISSING"}`);
    }
  }

  const tid = (name: keyof typeof REUSE | string): number => {
    if (name in REUSE) return (REUSE as Record<string, number>)[name];
    const v = toolIdByName.get(name);
    if (v == null) throw new Error(`tool id not resolved for ${name}`);
    return v;
  };

  // 2) System skills (one per module). Idempotent by skill_name.
  // NOTE: the platform still enforces domain_id NOT NULL for skill_type='system'
  // (legacy domain_required_when_skill_type_is_system rule). Set both domain_id and
  // domain_module_id; the module anchor is what makes this a per-module system skill.
  const skillSpecs = [
    { skill_name: "dlp_policy_control_agent", skill_type: "system", domain_id: 139, domain_module_id: MOD.POLICY,
      description: "Agent surface for the DLP Policy and Classification Control module: authors and maintains DLP policies, reviews and approves policy exceptions, and references data classifications." },
    { skill_name: "dlp_enforcement_runtime_agent", skill_type: "system", domain_id: 139, domain_module_id: MOD.RUNTIME,
      description: "Agent surface for the DLP Egress Enforcement and Incident Response module: triages DLP incidents and exfiltration attempts, manages quarantine release, and reviews user activity." },
  ];
  const existingSkills = await get(
    `/skills?skill_name=in.(${skillSpecs.map(s => s.skill_name).join(",")})&select=id,skill_name,domain_module_id`,
  );
  const skillIdByName = new Map<string, number>();
  for (const r of existingSkills) skillIdByName.set(String(r.skill_name), Number(r.id));
  const skillsToInsert = skillSpecs.filter(s => !skillIdByName.has(s.skill_name));
  if (skillsToInsert.length) {
    const inserted = await post("/skills", skillsToInsert);
    for (const r of inserted) skillIdByName.set(String(r.skill_name), Number(r.id));
    log(`skills inserted: ${inserted.map(r => `${r.skill_name}#${r.id}`).join(", ")}`);
  } else {
    log("skills: both system skills already present (idempotent skip)");
  }
  const policySkill = skillIdByName.get("dlp_policy_control_agent")!;
  const runtimeSkill = skillIdByName.get("dlp_enforcement_runtime_agent")!;

  // 3) skill_tools links. Idempotent by (skill_id, tool_id).
  type ST = { skill_id: number; tool_id: number; requirement_level: "required" | "optional" };
  const stSpecs: ST[] = [
    // POLICY-CONTROL (231)
    { skill_id: policySkill, tool_id: tid("query_dlp_policies"), requirement_level: "required" },
    { skill_id: policySkill, tool_id: tid("query_dlp_exceptions"), requirement_level: "required" },
    { skill_id: policySkill, tool_id: tid("update_dlp_policy"), requirement_level: "required" },
    { skill_id: policySkill, tool_id: tid("approve_dlp_exception"), requirement_level: "required" },
    { skill_id: policySkill, tool_id: tid("query_data_classifications"), requirement_level: "optional" },
    { skill_id: policySkill, tool_id: tid("notify_team"), requirement_level: "optional" },
    { skill_id: policySkill, tool_id: tid("receive_webhook"), requirement_level: "optional" },
    // ENFORCEMENT-RUNTIME (232)
    { skill_id: runtimeSkill, tool_id: tid("query_dlp_incidents"), requirement_level: "required" },
    { skill_id: runtimeSkill, tool_id: tid("query_data_exfiltration_attempts"), requirement_level: "required" },
    { skill_id: runtimeSkill, tool_id: tid("query_dlp_quarantine_items"), requirement_level: "required" },
    { skill_id: runtimeSkill, tool_id: tid("query_dlp_user_activity_logs"), requirement_level: "required" },
    { skill_id: runtimeSkill, tool_id: tid("update_dlp_incident_status"), requirement_level: "required" },
    { skill_id: runtimeSkill, tool_id: tid("release_dlp_quarantine_item"), requirement_level: "required" },
    { skill_id: runtimeSkill, tool_id: tid("notify_team"), requirement_level: "required" },
    { skill_id: runtimeSkill, tool_id: tid("receive_webhook"), requirement_level: "required" },
    { skill_id: runtimeSkill, tool_id: tid("query_employees"), requirement_level: "optional" },
  ];
  const existingST = await get(
    `/skill_tools?skill_id=in.(${policySkill},${runtimeSkill})&select=skill_id,tool_id`,
  );
  const stKey = (s: number, t: number) => `${s}|${t}`;
  const existingSTKeys = new Set(existingST.map(r => stKey(Number(r.skill_id), Number(r.tool_id))));
  const stToInsert = stSpecs.filter(s => !existingSTKeys.has(stKey(s.skill_id, s.tool_id)));
  if (stToInsert.length) {
    const inserted = await post("/skill_tools", stToInsert as unknown as Row[]);
    log(`skill_tools inserted: ${inserted.length} rows (policy=${stSpecs.filter(s => s.skill_id === policySkill).length}, runtime=${stSpecs.filter(s => s.skill_id === runtimeSkill).length})`);
  } else {
    log("skill_tools: all links already present (idempotent skip)");
  }

  // 4) Retire legacy domain-level system skill 50 (DELETE skill_tools then the skill).
  //    Snapshot recorded in history.md prior to this run.
  const legacy = await get(`/skills?id=eq.50&select=id,skill_name,domain_module_id`);
  if (legacy.length) {
    const legacyST = await get(`/skill_tools?skill_id=eq.50&select=id,tool_id`);
    log(`legacy skill 50 present; deleting ${legacyST.length} skill_tools rows then the skill`);
    await del(`/skill_tools?skill_id=eq.50`);
    await del(`/skills?id=eq.50`);
    log("legacy skill 50 + its skill_tools deleted");
  } else {
    log("legacy skill 50 already absent (idempotent skip)");
  }

  // ===========================================================================
  // B1A-S11 : Handoff module-FK backfill (B10b) — OUTBOUND side (deterministic)
  // ===========================================================================
  // source_domain_module_id = module mastering trigger_events.data_object_id.
  // All 8 outbound DLP events fire on masters held by module 232 (incidents,
  // exfiltration_attempts, user_activity_logs), so source = 232 for every outbound row.
  const outbound = await get(
    `/handoffs?source_domain_id=eq.139&source_domain_module_id=is.null&select=id,trigger_event_id,trigger_events(data_object_id)`,
  );
  // Determine source module per row from the event's data_object master module.
  const runtimeMasters = new Set([DO.dlp_incidents, DO.data_exfiltration_attempts, DO.dlp_quarantine_items, DO.dlp_user_activity_logs]);
  const policyMasters = new Set([DO.dlp_policies, DO.dlp_exceptions]);
  let outboundPatched = 0;
  for (const h of outbound) {
    const evDo = Number((h.trigger_events as Row)?.data_object_id);
    let srcMod: number | null = null;
    if (runtimeMasters.has(evDo)) srcMod = MOD.RUNTIME;
    else if (policyMasters.has(evDo)) srcMod = MOD.POLICY;
    if (srcMod == null) {
      log(`  outbound handoff ${h.id}: event data_object ${evDo} not a DLP master — left NULL (gap)`);
      continue;
    }
    await patch(`/handoffs?id=eq.${h.id}`, { source_domain_module_id: srcMod });
    outboundPatched++;
  }
  log(`outbound handoffs patched (source_domain_module_id): ${outboundPatched}`);

  // INBOUND side: target_domain_module_id = DLP module holding the payload with the
  // strongest role. DLP models NONE of the 10 inbound payloads (no domain_module_data_objects
  // row on any of them), so the deterministic B10b rule yields "no candidate" (sub-case 2).
  // Per Rule #12 (no guessing on master data) these are left NULL and reported as a gap.
  const inboundNull = await get(
    `/handoffs?target_domain_id=eq.139&target_domain_module_id=is.null&select=id`,
  );
  log(`inbound handoffs with target_domain_module_id=NULL (no DLP-held payload; left NULL, reported as gap): ${inboundNull.length}`);

  // ===========================================================================
  // B1A-S17 : Catalog UX (Rule #20) — write ONLY where the field is currently empty
  // ===========================================================================
  async function writeCatalogUX(
    table: "domains" | "domain_modules",
    id: number,
    tagline: string,
    description: string,
  ) {
    const rows = await get(`/${table}?id=eq.${id}&select=catalog_tagline,catalog_description`);
    if (!rows.length) throw new Error(`${table} id ${id} not found`);
    const cur = rows[0];
    const body: Row = {};
    if (String(cur.catalog_tagline ?? "") === "") body.catalog_tagline = tagline;
    if (String(cur.catalog_description ?? "") === "") body.catalog_description = description;
    if (Object.keys(body).length === 0) {
      log(`  ${table} ${id}: catalog UX already populated (no overwrite)`);
      return;
    }
    await patch(`/${table}?id=eq.${id}`, body);
    log(`  ${table} ${id}: wrote ${Object.keys(body).join(", ")}`);
  }

  await writeCatalogUX(
    "domains",
    139,
    "Stop sensitive data from leaving your organization, and respond fast when it tries to.",
    "Catch confidential and regulated data before it walks out the door across email, web, endpoints, cloud apps, and chat. Define the rules that say what counts as sensitive, watch every egress path in real time, and block, quarantine, or coach users the moment a violation happens.\n\nWhen something slips through, work the incident from detection to closure in one place: triage what happened, hold the artifact for review, grant time-boxed exceptions where the business genuinely needs them, and keep an auditable trail for regulators. Turn a flood of alerts into a managed queue your security team can actually clear.",
  );
  await writeCatalogUX(
    "domain_modules",
    231,
    "Decide what counts as sensitive and the rules that protect it, all in one policy workspace.",
    "Build the policy layer that powers data loss prevention. Classify your data, author detection rules tied to those classifications, and tune severity and enforcement actions per channel and audience.\n\nManage the full lifecycle of every policy from draft through review and approval to retirement, and handle the exceptions that real work demands: review requests, approve time-boxed waivers, and keep them from quietly becoming permanent. The result is a clear, reviewable set of controls your enforcement points can act on with confidence.",
  );
  await writeCatalogUX(
    "domain_modules",
    232,
    "Catch data leaving across every channel and run each incident to a clean close.",
    "Watch email, web, endpoints, cloud apps, and chat for sensitive data on the move, and act the instant a rule fires: block, quarantine, or alert. Every exfiltration attempt and policy violation becomes a tracked incident your team can triage, investigate, and remediate.\n\nHold risky artifacts in quarantine until someone reviews them, release or destroy them on decision, and keep a per-user activity trail so investigators can see the full story. Built to turn raw detection signal into a response workflow that closes the loop.",
  );

  // ===========================================================================
  // B1A-S4 : Intra-domain data_object_relationships (B6) among DLP masters
  // ===========================================================================
  // Idempotent by (data_object_id, related_data_object_id, relationship_verb).
  type Rel = {
    data_object_id: number;
    related_data_object_id: number;
    relationship_verb: string;
    inverse_verb: string;
    relationship_type: "one_to_one" | "one_to_many" | "many_to_many";
    relationship_kind: "composition" | "reference" | "association" | "inheritance";
    is_required: boolean;
    owner_side: "source" | "target";
    notes: string;
  };
  const intraRels: Rel[] = [
    // data_exfiltration_attempt triggers dlp_incident (detection becomes a case)
    { data_object_id: DO.data_exfiltration_attempts, related_data_object_id: DO.dlp_incidents,
      relationship_verb: "triggers", inverse_verb: "is_triggered_by",
      relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", notes: "" },
    // dlp_policy evaluates_against dlp_incident (a policy hit produces the incident)
    { data_object_id: DO.dlp_policies, related_data_object_id: DO.dlp_incidents,
      relationship_verb: "evaluates_against", inverse_verb: "is_raised_by",
      relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", notes: "" },
    // dlp_incident produces dlp_quarantine_item (incident composes the held artifact)
    { data_object_id: DO.dlp_incidents, related_data_object_id: DO.dlp_quarantine_items,
      relationship_verb: "produces", inverse_verb: "is_produced_by",
      relationship_type: "one_to_many", relationship_kind: "composition", is_required: false, owner_side: "source", notes: "" },
    // dlp_exception overrides dlp_policy (exception modifies policy at evaluation)
    { data_object_id: DO.dlp_exceptions, related_data_object_id: DO.dlp_policies,
      relationship_verb: "overrides", inverse_verb: "is_overridden_by",
      relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target", notes: "" },
    // dlp_user_activity_log records dlp_incident (activity trail references incidents)
    { data_object_id: DO.dlp_user_activity_logs, related_data_object_id: DO.dlp_incidents,
      relationship_verb: "records", inverse_verb: "is_recorded_in",
      relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", notes: "" },
  ];

  // ===========================================================================
  // B1A-S15 : Outbound cross-domain data_object_relationships (B8)
  // ===========================================================================
  const crossRels: Rel[] = [];
  // dlp_incidents informs_security_incident -> service_incidents (ITSM/SECOPS)
  if (partner["service_incidents"]) {
    crossRels.push({ data_object_id: DO.dlp_incidents, related_data_object_id: partner["service_incidents"],
      relationship_verb: "informs_security_incident", inverse_verb: "is_informed_by_dlp_incident",
      relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", notes: "" });
  } else {
    log("  B8: service_incidents master not found — skipping that cross edge");
  }
  // dlp_incidents triggers_privacy_review -> data_subject_requests (PRIV-MGMT)
  if (partner["data_subject_requests"]) {
    crossRels.push({ data_object_id: DO.dlp_incidents, related_data_object_id: partner["data_subject_requests"],
      relationship_verb: "triggers_privacy_review", inverse_verb: "is_triggered_by_dlp_incident",
      relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source", notes: "" });
  } else {
    log("  B8: data_subject_requests master not found — skipping that cross edge");
  }

  // Insert relationships idempotently (verb-aware natural key).
  const allRels = [...intraRels, ...crossRels];
  const doIds = Array.from(new Set(allRels.flatMap(r => [r.data_object_id, r.related_data_object_id])));
  const existingRels = await get(
    `/data_object_relationships?data_object_id=in.(${doIds.join(",")})&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const relKey = (a: number, b: number, v: string) => `${a}|${b}|${v}`;
  const existingRelKeys = new Set(
    existingRels.map(r => relKey(Number(r.data_object_id), Number(r.related_data_object_id), String(r.relationship_verb))),
  );
  const relsToInsert = allRels.filter(
    r => !existingRelKeys.has(relKey(r.data_object_id, r.related_data_object_id, r.relationship_verb)),
  );
  if (relsToInsert.length) {
    const inserted = await post("/data_object_relationships", relsToInsert as unknown as Row[]);
    const intraN = inserted.filter(r =>
      [DO.dlp_incidents, DO.dlp_policies, DO.data_exfiltration_attempts, DO.dlp_quarantine_items, DO.dlp_exceptions, DO.dlp_user_activity_logs].includes(Number(r.related_data_object_id)),
    ).length;
    log(`data_object_relationships inserted: ${inserted.length} (intra=${intraN}, cross=${inserted.length - intraN})`);
    log(`  new relationship ids: ${inserted.map(r => r.id).join(", ")}`);
  } else {
    log("data_object_relationships: all edges already present (idempotent skip)");
  }

  // ---------------------------------------------------------------------------
  // Verification counts
  // ---------------------------------------------------------------------------
  log("--- verification ---");
  const vSkills = await get(`/skills?domain_module_id=in.(231,232)&skill_type=eq.system&select=id,skill_name,domain_module_id&order=domain_module_id.asc`);
  log(`system skills on 231/232: ${JSON.stringify(vSkills)}`);
  const vST = await get(`/skill_tools?skill_id=in.(${policySkill},${runtimeSkill})&select=skill_id`);
  log(`skill_tools on the 2 skills: ${vST.length}`);
  const vLegacy = await get(`/skills?id=eq.50&select=id`);
  log(`legacy skill 50 remaining: ${vLegacy.length}`);
  const vOut = await get(`/handoffs?source_domain_id=eq.139&source_domain_module_id=is.null&select=id`);
  log(`outbound handoffs still NULL source module: ${vOut.length}`);
  const vRel = await get(`/data_object_relationships?or=(data_object_id.in.(330,331,332,333,334,335),related_data_object_id.in.(330,331,332,333,334,335))&select=id`);
  log(`relationships touching DLP masters (total): ${vRel.length}`);
  const vDom = await get(`/domains?id=eq.139&select=catalog_tagline,catalog_description`);
  log(`domain catalog UX non-empty: tagline=${String(vDom[0].catalog_tagline ?? "") !== ""}, desc=${String(vDom[0].catalog_description ?? "") !== ""}`);
  const vMods = await get(`/domain_modules?id=in.(231,232)&select=id,catalog_tagline,catalog_description&order=id.asc`);
  for (const m of vMods) log(`module ${m.id} catalog UX non-empty: tagline=${String(m.catalog_tagline ?? "") !== ""}, desc=${String(m.catalog_description ?? "") !== ""}`);

  console.log("\n==== DONE ====");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
