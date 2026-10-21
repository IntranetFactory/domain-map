#!/usr/bin/env bun
// FRONTLINE-COMMS domain build (Phases A / B / C / S / E) into the live Semantius
// domain_map module via the semantius CLI. Idempotent: reads by natural key, inserts
// only missing rows, re-reads to build id maps. Rule #1: record_status omitted (DB
// default 'new'). Rule #15: every notes column written as empty string.
//
// Verdict: promote-as-domain (Phase 0 report: .tmp_deploy/FRONTLINE-COMMS-phase0-2026-06-14.md).

import {} from "bun";

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }

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
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}
async function syncTable<T extends Row>(path: string, rows: T[], keyField: keyof T & string): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const have = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !have.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} (had ${existing.length})`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present, none to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}
// Generic junction sync keyed on a composite natural key built from the row.
async function syncJunction(path: string, rows: Row[], keyOf: (r: Row) => string, selectCols: string): Promise<void> {
  const existing = await get(`${path}?select=${selectCols}&limit=20000`);
  const have = new Set(existing.map(keyOf));
  const missing = rows.filter(r => !have.has(keyOf(r)));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} (had ${existing.length})`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present, none to insert`);
  }
}

function validateDomainRow(d: Row): void {
  if (
    !d.crud_percentage || d.min_org_size === "" || d.cost_band === "" ||
    (d.business_logic === "" && Number(d.crud_percentage) < 95) ||
    !d.usa_market_size_usd_m || !d.market_size_source_year
  ) {
    throw new Error(`domains row fails Rule #8 metadata validation: ${JSON.stringify(d)}`);
  }
}

// ============================================================
async function main() {
  const DOMAIN_CODE = "FRONTLINE-COMMS";

  // ---------- resolve adjacent ids live (never hard-code) ----------
  const adj = await get("/domains?domain_code=in.(WFM,INTRANET,EMP-EXP,RET-STORE,HCM)&select=id,domain_code");
  const domByCode = new Map(adj.map(r => [String(r.domain_code), Number(r.id)]));
  const WFM = domByCode.get("WFM")!, INTRANET = domByCode.get("INTRANET")!,
    EMPEXP = domByCode.get("EMP-EXP")!, RETSTORE = domByCode.get("RET-STORE")!, HCM = domByCode.get("HCM")!;
  for (const [k, v] of [["WFM", WFM], ["INTRANET", INTRANET], ["EMP-EXP", EMPEXP], ["RET-STORE", RETSTORE], ["HCM", HCM]] as const)
    if (!v) throw new Error(`adjacent domain ${k} not resolved`);

  // WFM scheduling module (target for shift-swap-approved handoff)
  const wfmMods = await get(`/domain_modules?domain_id=eq.${WFM}&select=id,domain_module_code`);
  const WFM_SCHED = Number(wfmMods.find(m => m.domain_module_code === "WFM-SCHEDULING")?.id) || null;

  // shared masters we consume
  const refObjs = await get("/data_objects?data_object_name=in.(users,employees,work_shifts)&select=id,data_object_name,kind");
  const USERS = Number(refObjs.find(r => r.data_object_name === "users")?.id);
  const EMPLOYEES = Number(refObjs.find(r => r.data_object_name === "employees")?.id);
  const WORK_SHIFTS = Number(refObjs.find(r => r.data_object_name === "work_shifts")?.id);
  if (!USERS || !EMPLOYEES || !WORK_SHIFTS) throw new Error("shared masters (users/employees/work_shifts) not resolved");

  // reusable tools
  const reuseTools = await get("/tools?tool_name=in.(notify_person,notify_team,receive_webhook)&select=id,tool_name");
  const toolByName = new Map(reuseTools.map(r => [String(r.tool_name), Number(r.id)]));

  // APQC processes for RACI / handoffs
  const procs = await get("/processes?process_code=in.(7.8,7.8.3,7.5.1,7.3.3.3)&select=id,process_code");
  const procByCode = new Map(procs.map(r => [String(r.process_code), Number(r.id)]));

  // business functions
  const HR_FN = 3, BIZOPS_FN = 34, WFM_FN = 40, MFG_FN = 48;

  // ============================================================
  // PHASE A — domain + capabilities + modules + vendors + solutions
  // ============================================================
  console.log("\n=== PHASE A ===");

  const domainRow: Row = {
    domain_code: DOMAIN_CODE,
    domain_name: "Frontline / Deskless Worker Communication",
    description:
      "Mobile-first operations platform for non-desk workers who have no corporate email or workstation: broadcast messaging and acknowledgement, task and checklist execution, shift-swap conversations, microlearning, and recognition delivered through a single branded app, kiosk, or shared device. Bought by store, plant, and field operations rather than internal communications or HR. Consumes the workforce's employees from HCM and shifts from Workforce Management, and hands work back to those systems. Distinct from Employee Communications and Intranet (office-comms publishing platform, internal-comms buyer), Workforce Management (owns the shift record and swap approval), Retail Store Operations (retail-only task execution), and Employee Experience and Engagement (survey listening, not broadcast or recognition).",
    crud_percentage: 90,
    business_logic:
      "Audience targeting and supervisor-cascade routing to workers without unique work email; mandatory-read acknowledgement tracking; multilingual content delivery under union and works-council content rules; offline-tolerant task submission sync from shared and personal devices.",
    min_org_size: "30 m <2500",
    cost_band: "$$$",
    certification_required: false,
    usa_market_size_usd_m: 900,
    market_size_source_year: 2025,
    catalog_tagline: "Reach, task, and recognize your frontline workforce from one mobile app, no corporate email required.",
    catalog_description:
      "Connect every deskless worker on the floor through a branded mobile app, kiosk, or shared device. Broadcast targeted announcements and confirm who has read them, push tasks and checklists that workers complete and submit from their phones, and let teams swap shifts, finish bite-size training, and recognize each other in the same place. Built for store, plant, warehouse, and field staff who never had a work email, with handoff back to scheduling and store operations.",
  };
  validateDomainRow(domainRow);
  const domMap = await syncTable("/domains", [domainRow], "domain_code");
  const DID = domMap.get(DOMAIN_CODE)!;
  console.log(`  domain_id = ${DID}`);

  // capabilities (5) -> >=2 modules required
  const capabilities = [
    { capability_code: "FRONTLINE-BROADCAST-MESSAGING", capability_name: "Frontline Broadcast Messaging",
      description: "Targeted broadcast and supervisor-cascade messaging to deskless workers across mobile, kiosk, and shared-device channels, with mandatory-read acknowledgement tracking and multilingual delivery." },
    { capability_code: "FRONTLINE-TASK-EXECUTION", capability_name: "Frontline Task and Checklist Execution",
      description: "Push of tasks and checklists to frontline workers with mobile completion, photo and form submission, and roll-up of completion evidence to store, plant, or field operations." },
    { capability_code: "FRONTLINE-SHIFT-SWAP", capability_name: "Shift Swap and Coverage Conversations",
      description: "Worker-initiated shift-swap and open-shift coverage conversations on the worker's device, with manager approval and handoff of the approved swap to the workforce-management schedule of record." },
    { capability_code: "FRONTLINE-MICROLEARNING", capability_name: "Frontline Microlearning",
      description: "Bite-size, mobile-delivered training and just-in-time content for frontline workers, with completion tracking tied to the worker and role." },
    { capability_code: "FRONTLINE-RECOGNITION", capability_name: "Frontline Recognition",
      description: "Peer and manager recognition delivered in the frontline feed, tied to the worker and visible to the team, distinct from engagement-survey listening." },
  ];
  const capMap = await syncTable("/capabilities", capabilities, "capability_code");

  await syncJunction("/capability_domains",
    capabilities.map(c => ({ capability_id: capMap.get(c.capability_code)!, domain_id: DID, notes: "" })),
    r => `${r.capability_id}:${r.domain_id}`, "capability_id,domain_id");

  // modules (2 full)
  const modules = [
    { domain_module_code: "FRONTLINE-COMMS-BROADCAST-ENGAGEMENT", domain_module_name: "Broadcast and Engagement", domain_id: DID, module_kind: "full",
      description: "The mobile-first reach and engagement surface. Masters frontline broadcasts and message channels; carries broadcast audiences, mandatory-read acknowledgements, and recognitions. Consumes the workforce's employees so messages and recognition target real people on the floor.",
      catalog_tagline: "Reach every frontline worker and prove they saw it.",
      catalog_description: "Send targeted announcements and let supervisors cascade them down to their teams across mobile, kiosk, and shared devices. Confirm who has read mandatory messages, recognize good work in the same feed, and deliver content in the language and policy rules each location needs." },
    { domain_module_code: "FRONTLINE-COMMS-TASK-EXECUTION", domain_module_name: "Task and Shift Execution", domain_id: DID, module_kind: "full",
      description: "The do-the-work surface. Masters frontline tasks, checklists, shift-swap requests, and learning modules; carries task submissions and learning completions. Consumes shifts from Workforce Management and emits handoffs when a swap is approved or a task is completed.",
      catalog_tagline: "Push the work, get it done, and prove it from any phone.",
      catalog_description: "Send tasks and checklists to the floor and collect photo and form evidence as workers complete them. Let workers swap shifts and pick up open coverage on their own devices with one manager tap, finish short training between tasks, and hand approved swaps back to scheduling and completed work back to store and plant operations." },
  ];
  const modMap = await syncTable("/domain_modules", modules, "domain_module_code");
  const BCAST = modMap.get("FRONTLINE-COMMS-BROADCAST-ENGAGEMENT")!;
  const TASKEX = modMap.get("FRONTLINE-COMMS-TASK-EXECUTION")!;

  // domain_module_capabilities
  const dmc = [
    { m: BCAST, c: "FRONTLINE-BROADCAST-MESSAGING" },
    { m: BCAST, c: "FRONTLINE-RECOGNITION" },
    { m: TASKEX, c: "FRONTLINE-TASK-EXECUTION" },
    { m: TASKEX, c: "FRONTLINE-SHIFT-SWAP" },
    { m: TASKEX, c: "FRONTLINE-MICROLEARNING" },
  ];
  await syncJunction("/domain_module_capabilities",
    dmc.map(x => ({ domain_module_id: x.m, capability_id: capMap.get(x.c)!, notes: "" })),
    r => `${r.domain_module_id}:${r.capability_id}`, "domain_module_id,capability_id");

  // vendors (reuse existing by name; add missing). headquarters_country required.
  const vendorDefs = [
    { vendor_name: "WorkJam", vendor_url: "https://www.workjam.com", headquarters_country: "Canada",
      description: "Frontline digital workplace combining communications, task management, scheduling, shift swap, training, and surveys for retail, hospitality, and healthcare deskless workers." },
    { vendor_name: "Beekeeper AG", vendor_url: "https://www.beekeeper.io", headquarters_country: "Switzerland",
      description: "Frontline success platform with secure mobile chat, broadcast announcements, and automated workflows for hourly workers; merged with intranet vendor LumApps in 2025 to form a combined desk-and-frontline employee hub." },
    { vendor_name: "YOOBIC Ltd", vendor_url: "https://www.yoobic.com", headquarters_country: "United Kingdom",
      description: "Frontline employee experience platform combining communication, task and operations execution, and microlearning for retail, restaurant, grocery, beauty, pharmaceutical, logistics, and manufacturing teams." },
    { vendor_name: "Speakap B.V.", vendor_url: "https://www.speakap.com", headquarters_country: "Netherlands",
      description: "White-label frontline employee experience app for retail, hospitality, manufacturing, construction, and logistics, with fast setup aimed at mid-market buyers." },
    { vendor_name: "Flip GmbH", vendor_url: "https://www.getflip.com", headquarters_country: "Germany",
      description: "Mobile employee communication app for frontline and non-desk workers with news feed, chat, document sharing, shift-plan integration, surveys, and onboarding, focused on simplicity and multilingual reach." },
  ];
  // reuse WorkJam id 165 etc. by syncing on vendor_name
  const vendorMap = await syncTable("/vendors",
    vendorDefs.map(v => ({ ...v, notes: "" })), "vendor_name");

  // solutions (one flagship product per vendor). solution_type saas; solution_kind default standard_solution.
  const solutionDefs = [
    { solution_name: "WorkJam", vendor: "WorkJam", solution_url: "https://www.workjam.com",
      description: "Frontline digital workplace: broadcast communications, task and checklist execution, open-shift and shift-swap marketplace, training, surveys, and recognition in one mobile app." },
    { solution_name: "Beekeeper", vendor: "Beekeeper AG", solution_url: "https://www.beekeeper.io",
      description: "Frontline success platform: secure mobile chat and broadcast streams, mandatory-read campaigns, task and workflow automation, shift and document tools; combined with LumApps from 2025 into a desk-and-frontline hub." },
    { solution_name: "YOOBIC", vendor: "YOOBIC Ltd", solution_url: "https://www.yoobic.com",
      description: "Frontline operations and engagement: task and checklist execution with photo evidence, communication feed, and microlearning for distributed retail, hospitality, and service teams." },
    { solution_name: "Speakap", vendor: "Speakap B.V.", solution_url: "https://www.speakap.com",
      description: "White-label frontline employee app: company feed, targeted broadcasts, chat, schedules, and recognition for deskless workforces, deployed with minimal IT involvement." },
    { solution_name: "Flip", vendor: "Flip GmbH", solution_url: "https://www.getflip.com",
      description: "Mobile frontline communication app: news feed, secure chat, document sharing, surveys, onboarding, and shift-plan integration with multilingual delivery for non-desk workers." },
  ];
  const existingSolNames = new Set((await get("/solutions?select=solution_name&limit=10000")).map(r => String(r.solution_name)));
  const solInserts = solutionDefs
    .filter(s => !existingSolNames.has(s.solution_name))
    .map(s => ({
      solution_name: s.solution_name, description: s.description, solution_url: s.solution_url,
      vendor_id: vendorMap.get(s.vendor)!, solution_type: "saas", is_active_in_market: true,
      solution_kind: "standard_solution", notes: "",
    }));
  if (solInserts.length) { console.log(`  /solutions: inserting ${solInserts.length}`); await insert("/solutions", solInserts); }
  else console.log("  /solutions: all present");
  const solAll = await get("/solutions?select=id,solution_name&limit=10000");
  const solMap = new Map(solAll.map(r => [String(r.solution_name), Number(r.id)]));

  // solution_domains: all primary on FRONTLINE-COMMS
  await syncJunction("/solution_domains",
    solutionDefs.map(s => ({ solution_id: solMap.get(s.solution_name)!, domain_id: DID, coverage_level: "primary", notes: "" })),
    r => `${r.solution_id}:${r.domain_id}`, "solution_id,domain_id");

  // ============================================================
  // PHASE B — masters, DMDO, relationships, aliases, lifecycle, trigger_events, handoffs
  // ============================================================
  console.log("\n=== PHASE B ===");

  // data_objects (7 masters). entity_type + pattern flags set per Rule #12.
  const masters = [
    { data_object_name: "frontline_broadcasts", singular_label: "Frontline Broadcast", plural_label: "Frontline Broadcasts",
      description: "A targeted announcement sent to a frontline audience, with optional mandatory-read requirement, scheduled or supervisor-cascade delivery, and read/acknowledgement tracking.",
      entity_type: "operational_workflow", has_submit_lock: true, module: BCAST, necessity: "required" },
    { data_object_name: "frontline_message_channels", singular_label: "Frontline Message Channel", plural_label: "Frontline Message Channels",
      description: "A delivery channel or stream (location feed, team channel, kiosk display, SMS fallback) through which broadcasts and conversations reach deskless workers.",
      entity_type: "catalog", module: BCAST, necessity: "required" },
    { data_object_name: "content_acknowledgements", singular_label: "Content Acknowledgement", plural_label: "Content Acknowledgements",
      description: "A per-worker record that a mandatory broadcast or piece of content was read and acknowledged, used as read-receipt proof under union and policy content rules.",
      entity_type: "operational_record", module: BCAST, necessity: "required" },
    { data_object_name: "frontline_recognitions", singular_label: "Frontline Recognition", plural_label: "Frontline Recognitions",
      description: "A peer or manager recognition of a frontline worker, delivered in the frontline feed and visible to the team, tied to the recognized worker.",
      entity_type: "operational_record", module: BCAST, necessity: "required" },
    { data_object_name: "frontline_tasks", singular_label: "Frontline Task", plural_label: "Frontline Tasks",
      description: "A unit of work pushed to a frontline worker or location, completed on a mobile or shared device, with photo or form evidence collected on completion.",
      entity_type: "operational_workflow", module: TASKEX, necessity: "required" },
    { data_object_name: "frontline_checklists", singular_label: "Frontline Checklist", plural_label: "Frontline Checklists",
      description: "A reusable template of ordered task items (opening, closing, audit, compliance) instantiated against a location and shift for frontline execution.",
      entity_type: "catalog", module: TASKEX, necessity: "required" },
    { data_object_name: "shift_swap_requests", singular_label: "Shift Swap Request", plural_label: "Shift Swap Requests",
      description: "A worker-initiated request to swap or give up a shift, or to pick up an open shift, conducted as a conversation on the worker's device and routed for manager approval before handoff to the workforce-management schedule.",
      entity_type: "operational_workflow", has_single_approver: true, module: TASKEX, necessity: "required" },
    { data_object_name: "frontline_learning_modules", singular_label: "Frontline Learning Module", plural_label: "Frontline Learning Modules",
      description: "A bite-size training unit delivered to frontline workers on a mobile device, with completion tracked per worker and role.",
      entity_type: "catalog", module: TASKEX, necessity: "optional" },
    { data_object_name: "frontline_learning_completions", singular_label: "Frontline Learning Completion", plural_label: "Frontline Learning Completions",
      description: "A per-worker record that a frontline learning module was completed, with score or pass status where the module is assessed.",
      entity_type: "operational_record", module: TASKEX, necessity: "optional" },
    { data_object_name: "frontline_task_submissions", singular_label: "Frontline Task Submission", plural_label: "Frontline Task Submissions",
      description: "A per-worker submission completing a frontline task or checklist item, carrying the photo, form, or attestation evidence the task required.",
      entity_type: "operational_record", module: TASKEX, necessity: "required" },
  ];
  const masterObjs = masters.map(m => ({
    data_object_name: m.data_object_name, singular_label: m.singular_label, plural_label: m.plural_label,
    description: m.description, kind: "domain_owned", entity_type: m.entity_type,
    has_personal_content: false, has_submit_lock: m.has_submit_lock ?? false, has_single_approver: m.has_single_approver ?? false,
    is_canonical_bare_word: false, naming_authority_rationale: "",
  }));
  const doMap = await syncTable("/data_objects", masterObjs, "data_object_name");
  const doid = (n: string) => { const v = doMap.get(n); if (!v) throw new Error(`data_object ${n} not found`); return v; };

  // DMDO: master rows on the realizing module + consumer rows for shared masters
  const dmdo: Row[] = masters.map(m => ({
    domain_module_id: m.module, data_object_id: doid(m.data_object_name), role: "master", necessity: m.necessity, notes: "",
  }));
  // consume employees (HCM) on both modules; shifts (WFM) on task-execution
  dmdo.push({ domain_module_id: BCAST, data_object_id: EMPLOYEES, role: "consumer", necessity: "required", notes: "" });
  dmdo.push({ domain_module_id: TASKEX, data_object_id: EMPLOYEES, role: "consumer", necessity: "required", notes: "" });
  dmdo.push({ domain_module_id: TASKEX, data_object_id: WORK_SHIFTS, role: "consumer", necessity: "required", notes: "" });
  await syncJunction("/domain_module_data_objects", dmdo,
    r => `${r.domain_module_id}:${r.data_object_id}`, "domain_module_id,data_object_id");

  // data_object_aliases (vendor / industry synonyms)
  const aliases = [
    { data_object_name: "frontline_broadcasts", alias_name: "Announcement", alias_type: "synonym" },
    { data_object_name: "frontline_broadcasts", alias_name: "Campaign", alias_type: "synonym" },
    { data_object_name: "frontline_message_channels", alias_name: "Stream", alias_type: "synonym" },
    { data_object_name: "content_acknowledgements", alias_name: "Read Receipt", alias_type: "synonym" },
    { data_object_name: "frontline_recognitions", alias_name: "Shout-out", alias_type: "synonym" },
    { data_object_name: "frontline_tasks", alias_name: "Mission", alias_type: "synonym" },
    { data_object_name: "frontline_checklists", alias_name: "Audit", alias_type: "synonym" },
    { data_object_name: "shift_swap_requests", alias_name: "Open Shift", alias_type: "synonym" },
    { data_object_name: "frontline_learning_modules", alias_name: "Microlearning", alias_type: "synonym" },
  ];
  await syncJunction("/data_object_aliases",
    aliases.map(a => ({ data_object_id: doid(a.data_object_name), alias_name: a.alias_name, alias_type: a.alias_type, is_preferred: false, notes: "" })),
    r => `${r.data_object_id}:${r.alias_name}`, "data_object_id,alias_name");

  // data_object_relationships: intra-domain, users edges, cross-domain payload->target
  type Rel = { from: number; to: number; type: string; kind: string; verb: string; inverse: string; req: boolean; owner: "source" | "target" };
  const rels: Rel[] = [
    // intra-domain
    { from: doid("frontline_broadcasts"), to: doid("frontline_message_channels"), type: "many_to_many", kind: "association", verb: "is delivered through", inverse: "delivers", req: false, owner: "source" },
    { from: doid("frontline_broadcasts"), to: doid("content_acknowledgements"), type: "one_to_many", kind: "composition", verb: "is acknowledged by", inverse: "acknowledges", req: false, owner: "source" },
    { from: doid("frontline_checklists"), to: doid("frontline_tasks"), type: "one_to_many", kind: "composition", verb: "templates", inverse: "is instantiated from", req: false, owner: "source" },
    { from: doid("frontline_tasks"), to: doid("frontline_task_submissions"), type: "one_to_many", kind: "composition", verb: "is completed by", inverse: "completes", req: false, owner: "source" },
    { from: doid("frontline_learning_modules"), to: doid("frontline_learning_completions"), type: "one_to_many", kind: "composition", verb: "is completed by", inverse: "completes", req: false, owner: "source" },
    // users edges (frontline worker + manager are user-typed)
    { from: USERS, to: doid("frontline_broadcasts"), type: "one_to_many", kind: "association", verb: "publishes", inverse: "is published by", req: false, owner: "source" },
    { from: USERS, to: doid("content_acknowledgements"), type: "one_to_many", kind: "association", verb: "records", inverse: "is recorded by", req: false, owner: "source" },
    { from: USERS, to: doid("frontline_recognitions"), type: "one_to_many", kind: "association", verb: "gives", inverse: "is given by", req: false, owner: "source" },
    { from: USERS, to: doid("frontline_tasks"), type: "one_to_many", kind: "association", verb: "is assigned", inverse: "is assigned to", req: false, owner: "source" },
    { from: USERS, to: doid("frontline_task_submissions"), type: "one_to_many", kind: "association", verb: "submits", inverse: "is submitted by", req: false, owner: "source" },
    { from: USERS, to: doid("shift_swap_requests"), type: "one_to_many", kind: "association", verb: "requests", inverse: "is requested by", req: false, owner: "source" },
    { from: USERS, to: doid("frontline_learning_completions"), type: "one_to_many", kind: "association", verb: "earns", inverse: "is earned by", req: false, owner: "source" },
    // consume shared masters
    { from: doid("frontline_recognitions"), to: EMPLOYEES, type: "many_to_one", kind: "reference", verb: "recognizes", inverse: "is recognized in", req: true, owner: "target" },
    // cross-domain payload->target (outbound): shift swap -> WFM shift
    { from: doid("shift_swap_requests"), to: WORK_SHIFTS, type: "many_to_one", kind: "reference", verb: "concerns", inverse: "is concerned by", req: true, owner: "target" },
  ];
  await syncJunction("/data_object_relationships",
    rels.map(r => ({
      data_object_id: r.from, related_data_object_id: r.to,
      relationship_type: r.type === "many_to_one" ? "one_to_many" : r.type, // store canonical; many_to_one auto-flips
      relationship_kind: r.kind, relationship_verb: r.verb, inverse_verb: r.inverse,
      is_required: r.req, owner_side: r.owner, notes: "",
    })),
    r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`,
    "data_object_id,related_data_object_id,relationship_verb");

  // lifecycle states on the 3 operational_workflow masters
  type St = { obj: string; module: number; states: Array<{ name: string; order: number; initial?: boolean; terminal?: boolean; gate?: boolean; verb?: string }> };
  const lifecycles: St[] = [
    { obj: "frontline_broadcasts", module: BCAST, states: [
      { name: "draft", order: 1, initial: true },
      { name: "scheduled", order: 2 },
      { name: "published", order: 3, gate: true, verb: "publish_broadcast" },
      { name: "archived", order: 4, terminal: true },
    ] },
    { obj: "frontline_tasks", module: TASKEX, states: [
      { name: "assigned", order: 1, initial: true },
      { name: "in_progress", order: 2 },
      { name: "completed", order: 3, gate: true, verb: "complete_task" },
      { name: "verified", order: 4, terminal: true, gate: true, verb: "verify_task" },
      { name: "cancelled", order: 5, terminal: true },
    ] },
    { obj: "shift_swap_requests", module: TASKEX, states: [
      { name: "requested", order: 1, initial: true },
      { name: "claimed", order: 2 },
      { name: "approved", order: 3, gate: true, verb: "approve_shift_swap" },
      { name: "rejected", order: 4, terminal: true },
      { name: "cancelled", order: 5, terminal: true },
    ] },
  ];
  const lcRows: Row[] = [];
  for (const lc of lifecycles) for (const s of lc.states) lcRows.push({
    data_object_id: doid(lc.obj), state_name: s.name, state_order: s.order,
    is_initial: !!s.initial, is_terminal: !!s.terminal, requires_permission: !!s.gate,
    permission_verb_override: s.verb ?? "", domain_module_id: lc.module, notes: "",
  });
  await syncJunction("/data_object_lifecycle_states", lcRows,
    r => `${r.data_object_id}:${r.state_name}`, "data_object_id,state_name");

  // trigger_events on masters
  const events = [
    { obj: "frontline_broadcasts", event_name: "frontline_broadcast.published", from: "scheduled", to: "published", cat: "lifecycle",
      desc: "A frontline broadcast was published to its audience; downstream channels deliver it and acknowledgement tracking starts." },
    { obj: "content_acknowledgements", event_name: "content_acknowledgement.recorded", from: "", to: "recorded", cat: "state_change",
      desc: "A worker acknowledged a mandatory broadcast; the read-receipt is recorded as policy-compliance proof." },
    { obj: "frontline_tasks", event_name: "frontline_task.completed", from: "in_progress", to: "completed", cat: "lifecycle",
      desc: "A frontline task was completed with its required evidence; store, plant, or field operations consumes the completion." },
    { obj: "shift_swap_requests", event_name: "shift_swap_request.approved", from: "claimed", to: "approved", cat: "lifecycle",
      desc: "A manager approved a shift swap; the approved swap is handed to Workforce Management to update the schedule of record." },
    { obj: "frontline_recognitions", event_name: "frontline_recognition.given", from: "", to: "given", cat: "state_change",
      desc: "A worker received recognition in the frontline feed; the recognition is visible to the team." },
    { obj: "frontline_learning_completions", event_name: "frontline_learning.completed", from: "", to: "completed", cat: "state_change",
      desc: "A frontline worker completed a microlearning module; completion is tracked against the worker and role." },
  ];
  const existingEv = new Set((await get(`/trigger_events?data_object_id=in.(${masters.map(m => doid(m.data_object_name)).join(",")})&select=event_name&limit=1000`)).map(r => String(r.event_name)));
  const evInserts = events.filter(e => !existingEv.has(e.event_name)).map(e => ({
    data_object_id: doid(e.obj), event_name: e.event_name, from_state: e.from, to_state: e.to,
    description: e.desc, event_category: e.cat,
  }));
  if (evInserts.length) { console.log(`  /trigger_events: inserting ${evInserts.length}`); await insert("/trigger_events", evInserts); }
  else console.log("  /trigger_events: all present");
  const evAll = await get(`/trigger_events?data_object_id=in.(${masters.map(m => doid(m.data_object_name)).join(",")})&select=id,event_name&limit=1000`);
  const evMap = new Map(evAll.map(r => [String(r.event_name), Number(r.id)]));

  // handoffs: outbound cross-domain + intra-domain. target module FK only when target is modularized.
  type Hf = { src: number; tgt: number; srcMod: number | null; tgtMod: number | null; payload: number; event: string; pattern: string; friction: string; desc: string };
  const handoffs: Hf[] = [
    // shift swap approved -> WFM (WFM modularized: WFM-SCHEDULING)
    { src: DID, tgt: WFM, srcMod: TASKEX, tgtMod: WFM_SCHED, payload: WORK_SHIFTS, event: "shift_swap_request.approved",
      pattern: "api_call", friction: "high", desc: "When a frontline shift swap is approved, the worker-facing swap is handed to Workforce Management to update the authoritative schedule and roster." },
    // task completed -> RET-STORE (RET-STORE not modularized: leave tgtMod NULL)
    { src: DID, tgt: RETSTORE, srcMod: TASKEX, tgtMod: null, payload: doid("frontline_tasks"), event: "frontline_task.completed",
      pattern: "event_stream", friction: "medium", desc: "When a frontline task or checklist is completed, the completion and its evidence flow to store operations for compliance roll-up and exception follow-up." },
    // broadcast published -> INTRANET (not modularized: leave tgtMod NULL)
    { src: DID, tgt: INTRANET, srcMod: BCAST, tgtMod: null, payload: doid("frontline_broadcasts"), event: "frontline_broadcast.published",
      pattern: "api_call", friction: "medium", desc: "A frontline broadcast published to deskless workers is mirrored to the corporate communications platform so internal comms can see frontline reach alongside office-channel reach." },
    // recognition given -> EMP-EXP (not modularized: leave tgtMod NULL)
    { src: DID, tgt: EMPEXP, srcMod: BCAST, tgtMod: null, payload: doid("frontline_recognitions"), event: "frontline_recognition.given",
      pattern: "event_stream", friction: "low", desc: "Frontline recognition events feed employee-experience analytics so recognition signal is available alongside engagement-survey listening." },
  ];
  await syncJunction("/handoffs",
    handoffs.map(h => ({
      source_domain_id: h.src, target_domain_id: h.tgt,
      source_domain_module_id: h.srcMod, target_domain_module_id: h.tgtMod,
      data_object_id: h.payload, trigger_event_id: evMap.get(h.event)!,
      integration_pattern: h.pattern, friction_level: h.friction, description: h.desc, notes: "",
    })),
    r => `${r.source_domain_id}:${r.target_domain_id}:${r.data_object_id}:${r.trigger_event_id}`,
    "source_domain_id,target_domain_id,data_object_id,trigger_event_id");

  // handoff_processes: tag the broadcast handoff with APQC 7.8.3 Deliver employee communications
  const hfAll = await get(`/handoffs?source_domain_id=eq.${DID}&select=id,trigger_event_id,target_domain_id`);
  const hfByEvent = new Map(hfAll.map(r => [`${r.trigger_event_id}:${r.target_domain_id}`, Number(r.id)]));
  const hpRows: Row[] = [];
  const bcastHf = hfByEvent.get(`${evMap.get("frontline_broadcast.published")}:${INTRANET}`);
  if (bcastHf && procByCode.get("7.8.3")) hpRows.push({ handoff_id: bcastHf, process_id: procByCode.get("7.8.3")!, role: "implements", proposal_source: "agent_curated", notes: "" });
  if (hpRows.length) {
    await syncJunction("/handoff_processes", hpRows, r => `${r.handoff_id}:${r.process_id}`, "handoff_id,process_id");
  }

  // ============================================================
  // PHASE C — business_function_domains
  // ============================================================
  console.log("\n=== PHASE C ===");
  const bfd = [
    { fn: HR_FN, role: "owner" },          // Human Resources owns frontline comms program
    { fn: BIZOPS_FN, role: "consumer" },   // Business Operations (store/plant ops) consumes
    { fn: WFM_FN, role: "contributor" },   // Workforce Management contributes shifts
    { fn: MFG_FN, role: "consumer" },      // Manufacturing Operations consumes (plant floor)
  ];
  await syncJunction("/business_function_domains",
    bfd.map(b => ({ business_function_id: b.fn, domain_id: DID, responsibility_type: b.role, notes: "" })),
    r => `${r.business_function_id}:${r.domain_id}`, "business_function_id,domain_id");

  // ============================================================
  // PHASE S — system skill + tools + domain_module_tools
  // ============================================================
  console.log("\n=== PHASE S ===");
  const skillRow = {
    skill_name: "frontline-comms-system",
    description: "Domain agent for Frontline / Deskless Worker Communication. Publishes and targets broadcasts, tracks mandatory-read acknowledgements, pushes and verifies tasks and checklists, brokers shift-swap conversations, delivers microlearning, and posts recognition, deriving its toolset from the domain's Broadcast and Engagement and Task and Shift Execution modules. Consumes the workforce's employees and shifts and notifies people and teams across whatever frontline channel the deployment wires up.",
    skill_type: "system", domain_id: DID, domain_module_id: null, process_id: null,
  };
  await syncTable("/skills", [skillRow], "skill_name");
  const skillId = Number((await get(`/skills?skill_name=eq.frontline-comms-system&select=id`))[0]?.id);

  // tools: query/mutate per master (coverage_tier platform) + reuse notify_person/notify_team + receive_webhook
  type ToolDef = { tool_name: string; op: "query" | "mutate" | "side_effect" | "inbound"; obj?: string; desc: string };
  const toolDefs: ToolDef[] = [
    { tool_name: "query_frontline_broadcasts", op: "query", obj: "frontline_broadcasts", desc: "Read frontline broadcasts and their audience, schedule, and acknowledgement status." },
    { tool_name: "create_frontline_broadcast", op: "mutate", obj: "frontline_broadcasts", desc: "Compose and schedule a targeted frontline broadcast." },
    { tool_name: "publish_frontline_broadcast", op: "mutate", obj: "frontline_broadcasts", desc: "Publish a frontline broadcast to its audience and start acknowledgement tracking." },
    { tool_name: "query_content_acknowledgements", op: "query", obj: "content_acknowledgements", desc: "Read read-receipt and acknowledgement status for mandatory broadcasts." },
    { tool_name: "query_frontline_message_channels", op: "query", obj: "frontline_message_channels", desc: "Read the frontline delivery channels and streams configured for the workforce." },
    { tool_name: "create_frontline_recognition", op: "mutate", obj: "frontline_recognitions", desc: "Post a recognition for a frontline worker into the team feed." },
    { tool_name: "query_frontline_recognitions", op: "query", obj: "frontline_recognitions", desc: "Read recognition posted to or about frontline workers." },
    { tool_name: "query_frontline_tasks", op: "query", obj: "frontline_tasks", desc: "Read frontline tasks, their assignees, and completion state." },
    { tool_name: "create_frontline_task", op: "mutate", obj: "frontline_tasks", desc: "Push a task or checklist instance to a frontline worker or location." },
    { tool_name: "complete_frontline_task", op: "mutate", obj: "frontline_tasks", desc: "Mark a frontline task completed and attach its submission evidence." },
    { tool_name: "query_frontline_task_submissions", op: "query", obj: "frontline_task_submissions", desc: "Read the evidence submissions completing frontline tasks and checklist items." },
    { tool_name: "query_frontline_checklists", op: "query", obj: "frontline_checklists", desc: "Read frontline checklist templates and their item sets." },
    { tool_name: "query_shift_swap_requests", op: "query", obj: "shift_swap_requests", desc: "Read shift-swap and open-shift coverage requests and their approval state." },
    { tool_name: "approve_shift_swap_request", op: "mutate", obj: "shift_swap_requests", desc: "Approve a shift-swap request and trigger handoff to Workforce Management." },
    { tool_name: "query_frontline_learning_modules", op: "query", obj: "frontline_learning_modules", desc: "Read the microlearning modules available to frontline workers." },
    { tool_name: "query_frontline_learning_completions", op: "query", obj: "frontline_learning_completions", desc: "Read per-worker microlearning completion records." },
  ];
  const existingTools = await get(`/tools?tool_name=in.(${toolDefs.map(t => t.tool_name).join(",")})&select=id,tool_name`);
  const existingToolNames = new Set(existingTools.map(r => String(r.tool_name)));
  const toolInserts = toolDefs.filter(t => !existingToolNames.has(t.tool_name)).map(t => ({
    tool_name: t.tool_name, description: t.desc, operation_kind: t.op,
    data_object_id: t.obj ? doid(t.obj) : null,
    coverage_tier: (t.op === "query" || t.op === "mutate") ? "platform" : "external",
  }));
  if (toolInserts.length) { console.log(`  /tools: inserting ${toolInserts.length}`); await insert("/tools", toolInserts); }
  else console.log("  /tools: all present");
  const allFcTools = await get(`/tools?tool_name=in.(${toolDefs.map(t => t.tool_name).join(",")})&select=id,tool_name`);
  for (const r of allFcTools) toolByName.set(String(r.tool_name), Number(r.id));

  // domain_module_tools: assign each tool to its realizing module + notify abstractions + receive_webhook
  const dmt: Array<{ mod: number; tool: string; req: "required" | "optional" }> = [
    // broadcast module
    { mod: BCAST, tool: "query_frontline_broadcasts", req: "required" },
    { mod: BCAST, tool: "create_frontline_broadcast", req: "required" },
    { mod: BCAST, tool: "publish_frontline_broadcast", req: "required" },
    { mod: BCAST, tool: "query_content_acknowledgements", req: "required" },
    { mod: BCAST, tool: "query_frontline_message_channels", req: "optional" },
    { mod: BCAST, tool: "create_frontline_recognition", req: "required" },
    { mod: BCAST, tool: "query_frontline_recognitions", req: "optional" },
    { mod: BCAST, tool: "notify_person", req: "required" },
    { mod: BCAST, tool: "notify_team", req: "required" },
    // task module
    { mod: TASKEX, tool: "query_frontline_tasks", req: "required" },
    { mod: TASKEX, tool: "create_frontline_task", req: "required" },
    { mod: TASKEX, tool: "complete_frontline_task", req: "required" },
    { mod: TASKEX, tool: "query_frontline_task_submissions", req: "required" },
    { mod: TASKEX, tool: "query_frontline_checklists", req: "optional" },
    { mod: TASKEX, tool: "query_shift_swap_requests", req: "required" },
    { mod: TASKEX, tool: "approve_shift_swap_request", req: "required" },
    { mod: TASKEX, tool: "query_frontline_learning_modules", req: "optional" },
    { mod: TASKEX, tool: "query_frontline_learning_completions", req: "optional" },
    { mod: TASKEX, tool: "notify_person", req: "required" },
    { mod: TASKEX, tool: "receive_webhook", req: "optional" },
  ];
  await syncJunction("/domain_module_tools",
    dmt.map(x => {
      const tid = toolByName.get(x.tool);
      if (!tid) throw new Error(`tool ${x.tool} not resolved`);
      return { domain_module_id: x.mod, tool_id: tid, requirement_level: x.req, notes: "" };
    }),
    r => `${r.domain_module_id}:${r.tool_id}`, "domain_module_id,tool_id");

  // ============================================================
  // PHASE E — domain_roles + role_modules + process_raci
  // ============================================================
  console.log("\n=== PHASE E ===");
  const roleDefs = [
    { role_code: "FRONTLINE-COMMS-ADMIN", role_name: "Frontline Communications Admin", business_function_id: HR_FN,
      description: "Configures channels, audiences, checklist templates, and learning modules, and authors and schedules company-wide frontline broadcasts and recognition programs." },
    { role_code: "FRONTLINE-MANAGER", role_name: "Frontline Manager", business_function_id: null,
      description: "Store, plant, or field manager who cascades broadcasts to their team, assigns and verifies tasks, approves shift swaps, and recognizes workers. Cross-functional: reports into store or plant operations, not internal comms." },
    { role_code: "FRONTLINE-WORKER", role_name: "Frontline Worker", business_function_id: null,
      description: "Deskless worker who reads and acknowledges broadcasts, completes and submits tasks and checklists, requests and claims shift swaps, finishes microlearning, and sends and receives recognition from a mobile or shared device." },
  ];
  const roleMap = await syncTable("/domain_roles", roleDefs, "role_code");

  // role_modules (>=2 per persona)
  const rmods: Array<{ role: string; mod: number; level: "primary" | "secondary" }> = [
    { role: "FRONTLINE-COMMS-ADMIN", mod: BCAST, level: "primary" },
    { role: "FRONTLINE-COMMS-ADMIN", mod: TASKEX, level: "secondary" },
    { role: "FRONTLINE-MANAGER", mod: BCAST, level: "primary" },
    { role: "FRONTLINE-MANAGER", mod: TASKEX, level: "primary" },
    { role: "FRONTLINE-WORKER", mod: BCAST, level: "primary" },
    { role: "FRONTLINE-WORKER", mod: TASKEX, level: "primary" },
  ];
  await syncJunction("/role_modules",
    rmods.map(x => ({ role_id: roleMap.get(x.role)!, domain_module_id: x.mod, interaction_level: x.level, notes: "" })),
    r => `${r.role_id}:${r.domain_module_id}`, "role_id,domain_module_id");

  // wire lifecycle gate process_id for RACI resolution: broadcast.published -> 7.8.3
  const lcPublish = (await get(`/data_object_lifecycle_states?data_object_id=eq.${doid("frontline_broadcasts")}&state_name=eq.published&select=id,process_id`))[0];
  if (lcPublish && !lcPublish.process_id && procByCode.get("7.8.3")) {
    await call({ method: "PATCH", path: `/data_object_lifecycle_states?id=eq.${lcPublish.id}`, body: { process_id: procByCode.get("7.8.3")! } });
    console.log("  wired data_object_lifecycle_states.published.process_id = 7.8.3");
  }

  // process_raci on 7.8.3 Deliver employee communications
  const p783 = procByCode.get("7.8.3");
  if (p783) {
    const raci = [
      { actor_role_id: roleMap.get("FRONTLINE-COMMS-ADMIN")!, raci: "responsible" },
      { actor_role_id: roleMap.get("FRONTLINE-MANAGER")!, raci: "accountable" },
      { actor_role_id: roleMap.get("FRONTLINE-WORKER")!, raci: "informed" },
    ];
    const existRaci = await get(`/process_raci?process_id=eq.${p783}&select=actor_role_id,raci`);
    const haveRaci = new Set(existRaci.map(r => `${r.actor_role_id}:${r.raci}`));
    const raciInserts = raci.filter(r => !haveRaci.has(`${r.actor_role_id}:${r.raci}`)).map(r => ({
      process_id: p783, actor_role_id: r.actor_role_id, actor_skill_id: null, raci: r.raci, consultation_blocking: false,
    }));
    if (raciInserts.length) { console.log(`  /process_raci: inserting ${raciInserts.length}`); await insert("/process_raci", raciInserts); }
    else console.log("  /process_raci: all present");
  }

  // ============================================================
  // VERIFY — counts + notes audit
  // ============================================================
  console.log("\n=== COUNTS ===");
  const c = async (p: string) => (await get(p)).length;
  const counts = {
    domain: await c(`/domains?id=eq.${DID}&select=id`),
    capabilities: await c(`/capability_domains?domain_id=eq.${DID}&select=capability_id`),
    modules: await c(`/domain_modules?domain_id=eq.${DID}&select=id`),
    dmc: await c(`/domain_module_capabilities?domain_module_id=in.(${BCAST},${TASKEX})&select=id`),
    solutions: await c(`/solution_domains?domain_id=eq.${DID}&select=solution_id`),
    masters: await c(`/domain_module_data_objects?domain_module_id=in.(${BCAST},${TASKEX})&role=eq.master&select=id`),
    dmdo: await c(`/domain_module_data_objects?domain_module_id=in.(${BCAST},${TASKEX})&select=id`),
    relationships: rels.length,
    aliases: await c(`/data_object_aliases?data_object_id=in.(${masters.map(m => doid(m.data_object_name)).join(",")})&select=id`),
    lifecycle_states: await c(`/data_object_lifecycle_states?data_object_id=in.(${masters.map(m => doid(m.data_object_name)).join(",")})&select=id`),
    trigger_events: await c(`/trigger_events?data_object_id=in.(${masters.map(m => doid(m.data_object_name)).join(",")})&select=id`),
    handoffs: await c(`/handoffs?source_domain_id=eq.${DID}&select=id`),
    handoff_processes: hpRows.length,
    business_function_domains: await c(`/business_function_domains?domain_id=eq.${DID}&select=id`),
    skills: await c(`/skills?domain_id=eq.${DID}&select=id`),
    tools: allFcTools.length,
    domain_module_tools: await c(`/domain_module_tools?domain_module_id=in.(${BCAST},${TASKEX})&select=id`),
    domain_roles: roleDefs.length,
    role_modules: await c(`/role_modules?domain_module_id=in.(${BCAST},${TASKEX})&select=id`),
    process_raci: p783 ? await c(`/process_raci?process_id=eq.${p783}&actor_role_id=in.(${[...roleMap.values()].join(",")})&select=id`) : 0,
  };
  console.log(JSON.stringify(counts, null, 2));

  // NOTES AUDIT (Rule #15): confirm every notes column we touched is empty
  console.log("\n=== NOTES AUDIT (must all be 0) ===");
  const masterIds = masters.map(m => doid(m.data_object_name));
  const solIds = solutionDefs.map(s => solMap.get(s.solution_name)!);
  const vendIds = vendorDefs.map(v => vendorMap.get(v.vendor_name)!);
  const notesChecks: Record<string, number> = {
    solutions: (await get(`/solutions?id=in.(${solIds.join(",")})&notes=neq.&select=id`)).length,
    vendors: (await get(`/vendors?id=in.(${vendIds.join(",")})&notes=neq.&select=id`)).length,
    solution_domains: (await get(`/solution_domains?domain_id=eq.${DID}&notes=neq.&select=id`)).length,
    domain_module_data_objects: (await get(`/domain_module_data_objects?domain_module_id=in.(${BCAST},${TASKEX})&notes=neq.&select=id`)).length,
    data_object_relationships: (await get(`/data_object_relationships?data_object_id=in.(${masterIds.join(",")})&notes=neq.&select=id`)).length,
    data_object_aliases: (await get(`/data_object_aliases?data_object_id=in.(${masterIds.join(",")})&notes=neq.&select=id`)).length,
    data_object_lifecycle_states: (await get(`/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&notes=neq.&select=id`)).length,
    domain_module_tools: (await get(`/domain_module_tools?domain_module_id=in.(${BCAST},${TASKEX})&notes=neq.&select=id`)).length,
    role_modules: (await get(`/role_modules?domain_module_id=in.(${BCAST},${TASKEX})&notes=neq.&select=id`)).length,
    handoffs: (await get(`/handoffs?source_domain_id=eq.${DID}&notes=neq.&select=id`)).length,
    capability_domains: (await get(`/capability_domains?domain_id=eq.${DID}&notes=neq.&select=id`)).length,
    domain_module_capabilities: (await get(`/domain_module_capabilities?domain_module_id=in.(${BCAST},${TASKEX})&notes=neq.&select=id`)).length,
    business_function_domains: (await get(`/business_function_domains?domain_id=eq.${DID}&notes=neq.&select=id`)).length,
  };
  console.log(JSON.stringify(notesChecks, null, 2));
  const polluted = Object.entries(notesChecks).filter(([, n]) => n > 0);
  if (polluted.length) console.log(`  !! NOTES POLLUTION: ${JSON.stringify(polluted)} -- PATCH to '' required`);
  else console.log("  notes clean across all touched tables");

  console.log(`\nDOMAIN_ID=${DID} BCAST=${BCAST} TASKEX=${TASKEX} skill=${skillId}`);
  console.log("UI: https://adenin.semantius.app/domain_map/domains");
}
await main();
console.log("Done.");
