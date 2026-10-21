/**
 * MA (domain 70) b1a execution - 2026-06-06.
 *
 * Executes the agent-solvable pending actions from audits/MA/state.yaml b1a:
 *   1. B1A-B10b-OUTBOUND  - PATCH source_domain_module_id on 8 outbound handoffs.
 *   2. B1A-B10b-INBOUND   - PATCH target_domain_module_id on 11 inbound handoffs.
 *   3. B1A-H1-APQC-TAGGING - INSERT agent_curated handoff_processes; replace 232; skip 78 (stale premise).
 *   4. B1A-M-SYSTEM-SKILLS - author 4 per-module system skills, re-point 12 legacy skill_tools, DELETE legacy skill 17.
 *   5. B1A-M8-MODULE-UX    - write empty catalog_tagline/catalog_description on modules 197-200 + domains.MA.
 *
 * Idempotent: every write is guarded by a live re-read. Safe to re-run.
 * Run from project root: bun run .tmp_deploy/ma_b1a_execution_2026_06_06.ts
 */

interface CmdResult { ok: boolean; data: any; status: number; err: string; }

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
    return { ok: false, data: null, status: code, err: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, err: "" };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.err}`);
  return r.data;
}
async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.err}`);
  return r.data;
}
async function post(path: string, body: any): Promise<any> {
  const r = await postgrest("POST", path, body);
  if (!r.ok) throw new Error(`POST ${path} failed: ${r.err}`);
  return r.data;
}
async function del(path: string): Promise<any> {
  const r = await postgrest("DELETE", path);
  if (!r.ok) throw new Error(`DELETE ${path} failed: ${r.err}`);
  return r.data;
}

const MA = 70;

async function main() {
  console.log("MA b1a execution (2026-06-06)\n=============================\n");

  // ============================================================
  // 1 + 2. B10b handoff module FK backfill (explicit routing maps)
  // ============================================================
  const outboundRouting: Record<number, number> = {
    60: 199, 84: 199, 507: 199, 509: 199, 510: 199,
    69: 198, 74: 198, 508: 200,
  };
  const inboundRouting: Record<number, number> = {
    78: 198, 85: 197, 90: 197, 91: 197, 94: 197,
    232: 198, 327: 198, 328: 198, 506: 197, 808: 198, 811: 198,
  };

  console.log("STEP 1/2 - B10b handoff module FK backfill");
  const allHandoffIds = [...Object.keys(outboundRouting), ...Object.keys(inboundRouting)].map(Number);
  const handoffs: any[] = await get(
    `/handoffs?id=in.(${allHandoffIds.join(",")})&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id&order=id.asc`
  );
  const hById = new Map<number, any>(handoffs.map((h) => [h.id, h]));

  let outPatched = 0, outSkipped = 0;
  for (const [hidStr, modId] of Object.entries(outboundRouting)) {
    const hid = Number(hidStr);
    const h = hById.get(hid);
    if (!h) { console.log(`  ! outbound ${hid}: NOT FOUND`); continue; }
    if (h.source_domain_id !== MA) { console.log(`  ! outbound ${hid}: source_domain_id=${h.source_domain_id} != MA - SKIP`); outSkipped++; continue; }
    if (h.source_domain_module_id !== null) {
      console.log(`  = outbound ${hid}: source_domain_module_id already ${h.source_domain_module_id} (target ${modId}) - SKIP (guard)`);
      outSkipped++; continue;
    }
    await patch(`/handoffs?id=eq.${hid}`, { source_domain_module_id: modId });
    console.log(`  + outbound ${hid}: source_domain_module_id NULL -> ${modId}`);
    outPatched++;
  }

  let inPatched = 0, inSkipped = 0;
  for (const [hidStr, modId] of Object.entries(inboundRouting)) {
    const hid = Number(hidStr);
    const h = hById.get(hid);
    if (!h) { console.log(`  ! inbound ${hid}: NOT FOUND`); continue; }
    if (h.target_domain_id !== MA) { console.log(`  ! inbound ${hid}: target_domain_id=${h.target_domain_id} != MA - SKIP`); inSkipped++; continue; }
    if (h.target_domain_module_id !== null) {
      console.log(`  = inbound ${hid}: target_domain_module_id already ${h.target_domain_module_id} (target ${modId}) - SKIP (guard)`);
      inSkipped++; continue;
    }
    await patch(`/handoffs?id=eq.${hid}`, { target_domain_module_id: modId });
    console.log(`  + inbound ${hid}: target_domain_module_id NULL -> ${modId}`);
    inPatched++;
  }
  console.log(`  outbound: ${outPatched} patched, ${outSkipped} skipped; inbound: ${inPatched} patched, ${inSkipped} skipped\n`);

  // ============================================================
  // 3. H1 APQC tagging - agent_curated handoff_processes
  // ============================================================
  console.log("STEP 3 - H1 APQC handoff_processes tagging");
  // proposed (handoff_id -> process_id) inserts, all proposal_source=agent_curated
  const proposedTags: Array<{ handoff_id: number; process_id: number }> = [
    { handoff_id: 60, process_id: 709 },
    { handoff_id: 84, process_id: 147 },
    { handoff_id: 507, process_id: 709 },
    { handoff_id: 509, process_id: 147 },
    { handoff_id: 69, process_id: 23 },
    { handoff_id: 74, process_id: 23 },
    { handoff_id: 508, process_id: 708 },
    { handoff_id: 510, process_id: 147 },
    { handoff_id: 85, process_id: 1862 },
    { handoff_id: 90, process_id: 23 },
    { handoff_id: 91, process_id: 23 },
    { handoff_id: 94, process_id: 23 },
    { handoff_id: 327, process_id: 23 },
    { handoff_id: 328, process_id: 23 },
    { handoff_id: 506, process_id: 23 },
    { handoff_id: 808, process_id: 23 },
    { handoff_id: 811, process_id: 23 },
    // 232 replace: handled below (delete discovery_substring 641, insert 23).
    // 78 replace: SKIPPED - finding premise (existing 133/discovery_substring) is stale;
    //   live row is process 132 / agent_curated (id 81). Coverage already satisfied. Not executed.
  ];

  const tagHandoffIds = [...new Set([...proposedTags.map((t) => t.handoff_id), 78, 232])];
  const existingHP: any[] = await get(
    `/handoff_processes?handoff_id=in.(${tagHandoffIds.join(",")})&select=id,handoff_id,process_id,proposal_source,record_status&order=handoff_id.asc`
  );
  const existingKey = new Set(existingHP.map((r) => `${r.handoff_id}.${r.process_id}`));
  console.log(`  existing handoff_processes for these handoffs: ${existingHP.length}`);
  for (const r of existingHP) console.log(`    handoff ${r.handoff_id} -> process ${r.process_id} (${r.proposal_source}/${r.record_status}, id ${r.id})`);

  const toInsert = proposedTags.filter((t) => !existingKey.has(`${t.handoff_id}.${t.process_id}`));
  const skippedExisting = proposedTags.filter((t) => existingKey.has(`${t.handoff_id}.${t.process_id}`));
  for (const s of skippedExisting) console.log(`  = tag ${s.handoff_id}->${s.process_id} already exists - SKIP`);

  let hpInserted = 0;
  if (toInsert.length > 0) {
    const rows = toInsert.map((t) => ({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      role: "implements",
      proposal_source: "agent_curated",
      // record_status omitted -> default 'new'; notes omitted -> default '' (Rule #15)
    }));
    const inserted = await post(`/handoff_processes`, rows);
    hpInserted = Array.isArray(inserted) ? inserted.length : 0;
    for (const t of toInsert) console.log(`  + tag ${t.handoff_id} -> process ${t.process_id} (agent_curated/new)`);
  }

  // 232 replace: snapshot + delete the discovery_substring->641 row, insert agent_curated->23.
  let hp232Replaced = false;
  const row232 = existingHP.find((r) => r.handoff_id === 232 && r.process_id === 641 && r.proposal_source === "discovery_substring");
  const already232to23 = existingHP.some((r) => r.handoff_id === 232 && r.process_id === 23);
  if (already232to23) {
    console.log(`  = 232 replace: target tag 232->23 already exists - SKIP`);
  } else if (row232) {
    console.log(`  ~ 232 replace: SNAPSHOT prior row id=${row232.id} handoff=232 process=641 proposal_source=discovery_substring record_status=${row232.record_status}`);
    await del(`/handoff_processes?id=eq.${row232.id}`);
    await post(`/handoff_processes`, [{ handoff_id: 232, process_id: 23, role: "implements", proposal_source: "agent_curated" }]);
    console.log(`  + 232 replace: deleted id ${row232.id} (232->641 discovery_substring); inserted 232->23 (agent_curated/new)`);
    hp232Replaced = true;
  } else {
    console.log(`  ! 232 replace: expected discovery_substring->641 row not found - SKIP (premise changed)`);
  }
  console.log(`  H1: ${hpInserted} inserted, ${skippedExisting.length} already-present skips, 232 replaced=${hp232Replaced}; 78 replace intentionally skipped (stale premise)\n`);

  // ============================================================
  // 4. System skills - 4 per-module skills, re-point legacy skill_tools, DELETE skill 17
  // ============================================================
  console.log("STEP 4 - system skills (Rule #17)");
  const LEGACY_SKILL = 17;

  // Module -> new skill spec. Descriptions: workflow-shaped, no vendor names, no em-dashes.
  const skillSpecs: Array<{ module_id: number; skill_name: string; description: string }> = [
    {
      module_id: 197,
      skill_name: "ma_campaign_authoring_agent",
      description: "Authors and sends marketing campaigns and emails: queries and creates campaigns, composes and sends email, and runs A/B variant tests.",
    },
    {
      module_id: 198,
      skill_name: "ma_journey_orch_agent",
      description: "Orchestrates cross-channel nurture journeys: queries journeys and drives the journey lifecycle across email, push, in-app, and SMS steps.",
    },
    {
      module_id: 199,
      skill_name: "ma_lead_scoring_agent",
      description: "Scores and nurtures leads: queries lead scores, computes behavioral and demographic scores, and triggers nurture on score thresholds.",
    },
    {
      module_id: 200,
      skill_name: "ma_landing_forms_agent",
      description: "Captures leads through hosted landing pages and forms: queries forms and records submissions with progressive profiling.",
    },
  ];

  // Idempotent: only insert skills that don't already exist for the module.
  const existingModuleSkills: any[] = await get(
    `/skills?skill_type=eq.system&domain_module_id=in.(197,198,199,200)&select=id,skill_name,domain_module_id`
  );
  const skillByModule = new Map<number, any>(existingModuleSkills.map((s) => [s.domain_module_id, s]));

  const newSkillRows = skillSpecs
    .filter((s) => !skillByModule.has(s.module_id))
    .map((s) => ({
      skill_name: s.skill_name,
      skill_type: "system",
      domain_id: MA,
      domain_module_id: s.module_id,
      description: s.description,
      // record_status omitted -> 'new'
    }));

  let skillsInserted = 0;
  if (newSkillRows.length > 0) {
    const inserted = await post(`/skills`, newSkillRows);
    for (const s of inserted) {
      skillByModule.set(s.domain_module_id, s);
      console.log(`  + skill ${s.id} ${s.skill_name} (module ${s.domain_module_id})`);
    }
    skillsInserted = inserted.length;
  }
  for (const s of existingModuleSkills) console.log(`  = skill ${s.id} ${s.skill_name} (module ${s.domain_module_id}) already exists - SKIP`);

  // Resolve module -> new skill id map
  const newSkillIdByModule = new Map<number, number>();
  for (const spec of skillSpecs) {
    const s = skillByModule.get(spec.module_id);
    if (!s) throw new Error(`No skill resolved for module ${spec.module_id}`);
    newSkillIdByModule.set(spec.module_id, s.id);
  }

  // Re-point the 12 legacy skill_tools (by tool_id) to the owning module's skill.
  // tool_id -> target module id (per B2-SYSTEM-SKILL-SPLIT + finding routing).
  const toolToModule: Record<number, number> = {
    223: 197, // query_campaigns (do 116)
    224: 197, // query_marketing_emails (do 117)
    255: 197, // create_campaign (do 116)
    256: 197, // send_marketing_email (do 117)
    37:  197, // send_email (side_effect) - email send workflow
    49:  197, // generate_text (compute, optional) - GenAI content authoring
    227: 198, // query_nurture_journeys (do 119)
    258: 198, // update_nurture_journey (do 119)
    225: 199, // query_lead_scores (do 118)
    257: 199, // score_lead (do 118)
    53:  199, // classify_text (compute) - lead scoring
    226: 200, // query_forms (do 120)
  };

  const legacyST: any[] = await get(
    `/skill_tools?skill_id=eq.${LEGACY_SKILL}&select=id,skill_id,tool_id,requirement_level&order=id.asc`
  );
  console.log(`  legacy skill_tools on skill ${LEGACY_SKILL}: ${legacyST.length}`);

  let stRepointed = 0;
  for (const st of legacyST) {
    const targetMod = toolToModule[st.tool_id];
    if (targetMod === undefined) {
      console.log(`  ! skill_tools id ${st.id} tool ${st.tool_id}: NO routing - leaving in place (manual review)`);
      continue;
    }
    const targetSkill = newSkillIdByModule.get(targetMod)!;
    await patch(`/skill_tools?id=eq.${st.id}`, { skill_id: targetSkill });
    console.log(`  ~ skill_tools id ${st.id} tool ${st.tool_id}: skill ${LEGACY_SKILL} -> ${targetSkill} (module ${targetMod})`);
    stRepointed++;
  }

  // Verify legacy skill now has zero skill_tools, then DELETE it.
  const remainingLegacyST: any[] = await get(
    `/skill_tools?skill_id=eq.${LEGACY_SKILL}&select=id`
  );
  let legacyDeleted = false;
  if (remainingLegacyST.length === 0) {
    console.log(`  ~ legacy skill ${LEGACY_SKILL} (ma-system) SNAPSHOT: skill_type=system domain_id=70 domain_module_id=null record_status=new, 12 skill_tools re-pointed`);
    await del(`/skills?id=eq.${LEGACY_SKILL}`);
    console.log(`  - DELETED legacy skill ${LEGACY_SKILL} (ma-system)`);
    legacyDeleted = true;
  } else {
    console.log(`  ! legacy skill ${LEGACY_SKILL} still has ${remainingLegacyST.length} skill_tools - NOT deleting`);
  }
  console.log(`  skills: ${skillsInserted} inserted, ${stRepointed} skill_tools re-pointed, legacy deleted=${legacyDeleted}\n`);

  // ============================================================
  // 5. M8 catalog UX - write empty fields only (empty-guard)
  // ============================================================
  console.log("STEP 5 - M8/A4 catalog UX copy (Rule #20, empty-guard)");

  const moduleCopy: Record<number, { tagline: string; description: string }> = {
    197: {
      tagline: "Build, send, and optimize marketing email campaigns from one workspace.",
      description: "Create marketing campaigns and design the emails that go with them, then schedule and send to your audience. Compose content, run A/B variant tests, and let your campaigns reach the right people at the right time. Track how each send performs so you can refine the next one and keep improving results across every campaign you run.",
    },
    198: {
      tagline: "Guide every contact through multi-step nurture journeys across email, push, in-app, and SMS.",
      description: "Design automated journeys that move each contact through the right sequence of touches, from a first welcome to a re-engagement nudge. Reach people on whichever channel fits the moment, whether that is email, push, in-app, or SMS, and branch the path based on how they respond. Keep every journey running on its own without manual follow-up, so the right message arrives at the right step for each person.",
    },
    199: {
      tagline: "Score and prioritize leads automatically, and trigger nurture the moment they are ready.",
      description: "Rank your leads with scores that combine what they do with who they are, so your team always knows who to focus on first. Set the signals that matter and let scores update as behavior changes. When a lead crosses the threshold you set, kick off the right nurture automatically and hand the best leads to sales at exactly the right moment.",
    },
    200: {
      tagline: "Capture leads with hosted landing pages and forms that grow richer over time.",
      description: "Publish landing pages and lead-capture forms without waiting on a developer, and start collecting interest right away. Use progressive profiling to ask for a little more each visit, so a contact record fills in over time instead of all at once. Turn every submission into a known lead, ready to score, nurture, and route to the rest of your marketing workflow.",
    },
  };

  const domainCopy = {
    tagline: "Orchestrate marketing emails, nurture journeys, and lead scoring across email, SMS, push, and the web.",
    description: "Run your marketing across every channel from one place. Author and send email campaigns, build multi-step nurture journeys that reach people on email, SMS, push, and in-app, and capture new leads through hosted landing pages and forms. Score and prioritize those leads automatically so the best ones reach sales at the right moment. Connect what each contact does back into the next message they receive, so every touch builds on the last and your whole funnel keeps moving without manual handoffs.",
  };

  const modRows: any[] = await get(
    `/domain_modules?id=in.(197,198,199,200)&select=id,domain_module_code,catalog_tagline,catalog_description&order=id.asc`
  );
  let uxWrites = 0;
  for (const m of modRows) {
    const copy = moduleCopy[m.id];
    if (!copy) continue;
    const body: any = {};
    if ((m.catalog_tagline ?? "") === "") body.catalog_tagline = copy.tagline;
    else console.log(`  = module ${m.id} catalog_tagline non-empty - SKIP (overwrite-protected)`);
    if ((m.catalog_description ?? "") === "") body.catalog_description = copy.description;
    else console.log(`  = module ${m.id} catalog_description non-empty - SKIP (overwrite-protected)`);
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      console.log(`  + module ${m.id} ${m.domain_module_code}: wrote ${Object.keys(body).join(" + ")}`);
      uxWrites++;
    }
  }

  const domRows: any[] = await get(`/domains?id=eq.${MA}&select=id,domain_code,catalog_tagline,catalog_description`);
  const dom = domRows[0];
  const dbody: any = {};
  if ((dom.catalog_tagline ?? "") === "") dbody.catalog_tagline = domainCopy.tagline;
  else console.log(`  = domain ${MA} catalog_tagline non-empty - SKIP (overwrite-protected)`);
  if ((dom.catalog_description ?? "") === "") dbody.catalog_description = domainCopy.description;
  else console.log(`  = domain ${MA} catalog_description non-empty - SKIP (overwrite-protected)`);
  if (Object.keys(dbody).length > 0) {
    await patch(`/domains?id=eq.${MA}`, dbody);
    console.log(`  + domain ${MA} ${dom.domain_code}: wrote ${Object.keys(dbody).join(" + ")}`);
    uxWrites++;
  }
  console.log(`  catalog UX: ${uxWrites} rows written\n`);

  // ============================================================
  // Verification pass
  // ============================================================
  console.log("VERIFICATION");
  const outNull = await get(`/handoffs?id=in.(${Object.keys(outboundRouting).join(",")})&source_domain_module_id=is.null&select=id`);
  const inNull = await get(`/handoffs?id=in.(${Object.keys(inboundRouting).join(",")})&target_domain_module_id=is.null&select=id`);
  console.log(`  outbound handoffs still NULL source module: ${outNull.length} (${outNull.map((r:any)=>r.id).join(",")})`);
  console.log(`  inbound handoffs still NULL target module: ${inNull.length} (${inNull.map((r:any)=>r.id).join(",")})`);

  const hpAll = await get(`/handoff_processes?handoff_id=in.(${tagHandoffIds.join(",")})&select=handoff_id&order=handoff_id.asc`);
  const coveredHandoffs = new Set(hpAll.map((r:any)=>r.handoff_id));
  const allCross = [...Object.keys(outboundRouting), ...Object.keys(inboundRouting)].map(Number);
  const uncovered = allCross.filter((h)=>!coveredHandoffs.has(h));
  console.log(`  cross-domain handoffs with >=1 handoff_processes row: ${coveredHandoffs.size}/${allCross.length}; uncovered: [${uncovered.join(",")}]`);

  const skillsNow = await get(`/skills?skill_type=eq.system&domain_module_id=in.(197,198,199,200)&select=id,skill_name,domain_module_id&order=domain_module_id.asc`);
  console.log(`  module system skills now: ${skillsNow.length}`);
  for (const s of skillsNow) {
    const stc = await get(`/skill_tools?skill_id=eq.${s.id}&select=id`);
    console.log(`    module ${s.domain_module_id} ${s.skill_name} (skill ${s.id}): ${stc.length} skill_tools`);
  }
  const legacyNow = await get(`/skills?id=eq.${LEGACY_SKILL}&select=id`);
  console.log(`  legacy skill ${LEGACY_SKILL} present: ${legacyNow.length > 0}`);

  const uxNow = await get(`/domain_modules?id=in.(197,198,199,200)&select=id,catalog_tagline,catalog_description&order=id.asc`);
  for (const m of uxNow) console.log(`  module ${m.id}: tagline ${m.catalog_tagline ? "set" : "EMPTY"}, description ${m.catalog_description ? "set" : "EMPTY"}`);
  const domNow = await get(`/domains?id=eq.${MA}&select=catalog_tagline,catalog_description`);
  console.log(`  domain ${MA}: tagline ${domNow[0].catalog_tagline ? "set" : "EMPTY"}, description ${domNow[0].catalog_description ? "set" : "EMPTY"}`);

  console.log("\nDONE.");
}

main().catch((e) => { console.error("\nFATAL:", e?.message || e); process.exit(1); });
