#!/usr/bin/env bun
// LSD build (a1=a, 5 modules). Masters 633-640 already exist; this modularizes them,
// authors capabilities + lifecycle states + handoff module FKs + outside-counsel fan-out
// + suspicious-inbound repaints + pattern flags. All record_status='new' (DB default).
// Idempotent: modules/capabilities keyed by code; DMDO/cap-links/lifecycle/handoffs existence-checked.

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body)); await proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius failed: ${err}`);
  const t = out.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, body: Row[]) => call({ method: "POST", path: p, body });
const patch = (p: string, body: Row) => call({ method: "PATCH", path: p, body });

const DID = 25;

async function main() {
  // ---------- Phase M: 5 modules ----------
  const modules = [
    { domain_module_code: "LSD-INTAKE-PORTAL", domain_module_name: "Legal Intake Portal", domain_id: DID, module_kind: "full",
      description: "The single front door to Legal: business users submit requests, which are triaged and routed or converted into matters. Hosts the request intake, triage, and self-service surface.",
      catalog_tagline: "Give the business one front door to Legal and turn every request into tracked, routed work.",
      catalog_description: "Take in legal requests from anywhere in the business through a single intake portal, then triage each one and either resolve it, route it, or open it as a matter. Requesters see status without chasing email, and the legal team works from one prioritized queue instead of scattered inboxes. The result is faster response, clear ownership from the first touch, and a complete record of what the business asked Legal to do." },
    { domain_module_code: "LSD-MATTER-MGMT", domain_module_name: "Legal Matter Management", domain_id: DID, module_kind: "full",
      description: "Running matters end to end: matter records, legal advice records, and case dockets. The operational core where in-house counsel manages active legal work.",
      catalog_tagline: "Run every matter from open to close, with advice and docket activity captured in one place.",
      catalog_description: "Manage each legal matter through its whole life: open it, work it, put it on hold, and close it, with every piece of advice and docket entry attached. In-house counsel keeps a single trusted record of what was asked, what was advised, and what happened, so nothing falls through the cracks and history is always at hand. Spend less time reconstructing context and more time moving the work forward." },
    { domain_module_code: "LSD-LEGAL-HOLD", domain_module_name: "Legal Hold and eDiscovery", domain_id: DID, module_kind: "full",
      description: "Legal holds and ediscovery: issuing and releasing holds, acknowledgement tracking, and the collect-process-review-produce ediscovery workflow. Consumes content documents under hold from ECM.",
      catalog_tagline: "Issue holds, track acknowledgements, and run ediscovery from collection to production.",
      catalog_description: "Preserve evidence the moment a matter requires it: issue legal holds, track custodian acknowledgements, and release holds cleanly when they lapse. Run ediscovery end to end, from collection through processing, review, and production, with a defensible trail at every step. Keep the business out of spoliation risk and give counsel confidence that what should be preserved actually is." },
    { domain_module_code: "LSD-OUTSIDE-COUNSEL", domain_module_name: "Outside Counsel Management", domain_id: DID, module_kind: "full",
      description: "Outside-counsel engagements: proposing, engaging, and completing external-counsel relationships, with scope and accrual handoffs downstream to spend, contract, and conflict-check systems.",
      catalog_tagline: "Engage and manage outside counsel, and keep scope, spend, and conflicts connected.",
      catalog_description: "Propose, engage, and close out external-counsel relationships from one place, with scope and the engagement letter captured up front. As engagements start, the right downstream teams see them: spend tracking accrues the budget, contract management holds the engagement letter, and risk runs its conflict checks. Stop losing track of who is engaged on what, and keep outside-counsel spend and obligations under control." },
    { domain_module_code: "LSD-REGULATORY-RESPONSE", domain_module_name: "Regulatory Response", domain_id: DID, module_kind: "full",
      description: "Regulator and agency inquiries: receiving, acknowledging, responding to, and closing regulatory inquiries as an in-house workflow distinct from enterprise GRC.",
      catalog_tagline: "Take in regulator inquiries and drive each one to an on-time, documented response.",
      catalog_description: "Handle inquiries from regulators and agencies as a managed workflow: log each one, acknowledge it on time, assemble and send the response, and close it with a complete record. Deadlines stay visible, ownership is clear, and the full response history is auditable when it matters. Keep the organization responsive and defensible without running regulator inquiries out of email threads." },
  ];
  const existMods = new Set((await get(`/domain_modules?domain_id=eq.${DID}&select=domain_module_code`)).map(r => r.domain_module_code));
  const newMods = modules.filter(m => !existMods.has(m.domain_module_code));
  if (newMods.length) await post("/domain_modules", newMods);
  const modRows = await get(`/domain_modules?domain_id=eq.${DID}&select=id,domain_module_code`);
  const M: Record<string, number> = {}; for (const r of modRows) M[String(r.domain_module_code)] = Number(r.id);
  console.log("Modules:", M);

  // ---------- Phase A: 6 legal capabilities + capability_domains ----------
  const caps = [
    { capability_code: "LEGAL-INTAKE-TRIAGE", capability_name: "Legal Intake and Triage", description: "Capture, classify, prioritize, and route inbound legal requests from the business into the right matter or resolution path.", mod: "LSD-INTAKE-PORTAL" },
    { capability_code: "LEGAL-MATTER-MGMT", capability_name: "Legal Matter Management", description: "Open, work, hold, and close in-house legal matters, tracking advice and docket activity across the matter lifecycle.", mod: "LSD-MATTER-MGMT" },
    { capability_code: "LEGAL-HOLD-MGMT", capability_name: "Legal Hold Management", description: "Issue, acknowledge, and release litigation holds and track custodian preservation duties.", mod: "LSD-LEGAL-HOLD" },
    { capability_code: "LEGAL-EDISCOVERY", capability_name: "eDiscovery", description: "Collect, process, review, and produce electronically stored information in response to legal and regulatory demands.", mod: "LSD-LEGAL-HOLD" },
    { capability_code: "OUTSIDE-COUNSEL-MGMT", capability_name: "Outside Counsel Management", description: "Engage, scope, and manage external-counsel relationships and the engagement letters and accruals they generate.", mod: "LSD-OUTSIDE-COUNSEL" },
    { capability_code: "REGULATORY-RESPONSE", capability_name: "Regulatory Response", description: "Receive, acknowledge, respond to, and close inquiries from regulators and government agencies.", mod: "LSD-REGULATORY-RESPONSE" },
  ];
  const existCaps = new Set((await get("/capabilities?select=capability_code&limit=10000")).map(r => r.capability_code));
  const newCaps = caps.filter(c => !existCaps.has(c.capability_code)).map(({ mod, ...rest }) => rest);
  if (newCaps.length) await post("/capabilities", newCaps);
  const capRows = await get(`/capabilities?capability_code=in.(${caps.map(c => c.capability_code).join(",")})&select=id,capability_code`);
  const C: Record<string, number> = {}; for (const r of capRows) C[String(r.capability_code)] = Number(r.id);
  // capability_domains links
  const existCD = new Set((await get(`/capability_domains?domain_id=eq.${DID}&select=capability_id`)).map(r => Number(r.capability_id)));
  const newCD = caps.map(c => C[c.capability_code]).filter(id => !existCD.has(id)).map(id => ({ capability_id: id, domain_id: DID }));
  if (newCD.length) await post("/capability_domains", newCD);
  console.log("Capabilities:", C);

  // ---------- domain_module_capabilities (8 caps -> realizing modules) ----------
  // 6 new + KNOWLEDGE-MGMT(187, provisional MATTER-MGMT pending a3) + SELF-SERVICE-PORTAL(188 -> INTAKE-PORTAL)
  const capLinks: Array<[number, string]> = [
    ...caps.map(c => [C[c.capability_code], c.mod] as [number, string]),
    [187, "LSD-MATTER-MGMT"], [188, "LSD-INTAKE-PORTAL"],
  ];
  const existDMC = await get(`/domain_module_capabilities?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,capability_id`);
  const haveDMC = new Set(existDMC.map(r => `${r.domain_module_id}|${r.capability_id}`));
  const newDMC = capLinks.filter(([cid, code]) => !haveDMC.has(`${M[code]}|${cid}`)).map(([cid, code]) => ({ domain_module_id: M[code], capability_id: cid, notes: "" }));
  if (newDMC.length) await post("/domain_module_capabilities", newDMC);
  console.log(`domain_module_capabilities: +${newDMC.length}`);

  // ---------- domain_module_data_objects (8 masters + 1 consumer) ----------
  const dmdo: Array<{ data_object_id: number; mod: string; role: string }> = [
    { data_object_id: 634, mod: "LSD-INTAKE-PORTAL", role: "master" },
    { data_object_id: 633, mod: "LSD-MATTER-MGMT", role: "master" },
    { data_object_id: 638, mod: "LSD-MATTER-MGMT", role: "master" },
    { data_object_id: 640, mod: "LSD-MATTER-MGMT", role: "master" },
    { data_object_id: 635, mod: "LSD-LEGAL-HOLD", role: "master" },
    { data_object_id: 636, mod: "LSD-LEGAL-HOLD", role: "master" },
    { data_object_id: 637, mod: "LSD-OUTSIDE-COUNSEL", role: "master" },
    { data_object_id: 639, mod: "LSD-REGULATORY-RESPONSE", role: "master" },
    { data_object_id: 429, mod: "LSD-LEGAL-HOLD", role: "consumer" }, // content_documents (ECM master) under legal hold
  ];
  const existDMDO = await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&select=domain_module_id,data_object_id`);
  const haveDMDO = new Set(existDMDO.map(r => `${r.domain_module_id}|${r.data_object_id}`));
  const newDMDO = dmdo.filter(d => !haveDMDO.has(`${M[d.mod]}|${d.data_object_id}`)).map(d => ({ domain_module_id: M[d.mod], data_object_id: d.data_object_id, role: d.role, necessity: "required", notes: "" }));
  if (newDMDO.length) await post("/domain_module_data_objects", newDMDO);
  console.log(`domain_module_data_objects: +${newDMDO.length}`);

  // ---------- data_object_lifecycle_states ----------
  type St = { s: string; o: number; init?: boolean; term?: boolean; perm?: boolean; verb?: string; d: string };
  const machines: Array<{ doid: number; mod: string; states: St[] }> = [
    { doid: 633, mod: "LSD-MATTER-MGMT", states: [
      { s: "submitted", o: 1, init: true, d: "Matter requested, not yet triaged." },
      { s: "triaged", o: 2, d: "Reviewed and categorized; routing decided." },
      { s: "opened", o: 3, perm: true, verb: "open_matter", d: "Matter formally opened and assigned." },
      { s: "active", o: 4, d: "Matter is being actively worked." },
      { s: "on_hold", o: 5, d: "Matter paused pending external dependency." },
      { s: "closed", o: 6, term: true, perm: true, verb: "close_matter", d: "Matter resolved and closed." } ] },
    { doid: 634, mod: "LSD-INTAKE-PORTAL", states: [
      { s: "submitted", o: 1, init: true, d: "Request submitted by the business." },
      { s: "triaged", o: 2, d: "Request reviewed and categorized." },
      { s: "approved", o: 3, term: true, perm: true, verb: "approve_intake", d: "Request approved and converted to a matter." },
      { s: "rejected", o: 4, term: true, perm: true, verb: "reject_intake", d: "Request declined." },
      { s: "routed", o: 5, term: true, perm: true, verb: "route_intake", d: "Request routed to another team." } ] },
    { doid: 635, mod: "LSD-LEGAL-HOLD", states: [
      { s: "drafted", o: 1, init: true, d: "Hold notice drafted." },
      { s: "issued", o: 2, perm: true, verb: "issue_hold", d: "Hold issued to custodians." },
      { s: "acknowledged", o: 3, d: "Custodians have acknowledged the hold." },
      { s: "released", o: 4, term: true, perm: true, verb: "release_hold", d: "Hold released; preservation duty ends." } ] },
    { doid: 636, mod: "LSD-LEGAL-HOLD", states: [
      { s: "created", o: 1, init: true, d: "eDiscovery request created." },
      { s: "collecting", o: 2, d: "Sources being collected." },
      { s: "processing", o: 3, d: "Collected data being processed." },
      { s: "reviewing", o: 4, d: "Documents under review." },
      { s: "produced", o: 5, perm: true, verb: "produce_ediscovery", d: "Responsive set produced." },
      { s: "closed", o: 6, term: true, d: "Request closed." } ] },
    { doid: 637, mod: "LSD-OUTSIDE-COUNSEL", states: [
      { s: "proposed", o: 1, init: true, d: "Engagement proposed." },
      { s: "active", o: 2, perm: true, verb: "engage_counsel", d: "Counsel engaged; work underway." },
      { s: "completed", o: 3, term: true, perm: true, verb: "complete_engagement", d: "Engagement completed and closed out." } ] },
    { doid: 638, mod: "LSD-MATTER-MGMT", states: [
      { s: "drafted", o: 1, init: true, d: "Advice drafted." },
      { s: "issued", o: 2, term: true, perm: true, verb: "issue_advice", d: "Advice issued to the requester." } ] },
    { doid: 639, mod: "LSD-REGULATORY-RESPONSE", states: [
      { s: "received", o: 1, init: true, d: "Inquiry received from a regulator." },
      { s: "acknowledged", o: 2, d: "Receipt acknowledged to the regulator." },
      { s: "responding", o: 3, d: "Response being assembled." },
      { s: "responded", o: 4, perm: true, verb: "respond_inquiry", d: "Response submitted." },
      { s: "closed", o: 5, term: true, d: "Inquiry closed." } ] },
    { doid: 640, mod: "LSD-MATTER-MGMT", states: [
      { s: "open", o: 1, init: true, d: "Docket opened." },
      { s: "updated", o: 2, d: "Docket entry added or updated." },
      { s: "closed", o: 3, term: true, perm: true, verb: "close_docket", d: "Docket closed." } ] },
  ];
  const existLS = new Set((await get(`/data_object_lifecycle_states?data_object_id=in.(633,634,635,636,637,638,639,640)&select=data_object_id,state_name`)).map(r => `${r.data_object_id}|${r.state_name}`));
  const lsRows: Row[] = [];
  for (const m of machines) for (const st of m.states) {
    if (existLS.has(`${m.doid}|${st.s}`)) continue;
    lsRows.push({ data_object_id: m.doid, state_name: st.s, state_order: st.o, description: st.d, is_initial: !!st.init, is_terminal: !!st.term, requires_permission: !!st.perm, permission_verb_override: st.verb ?? "", notes: "", domain_module_id: M[m.mod] });
  }
  if (lsRows.length) await post("/data_object_lifecycle_states", lsRows);
  console.log(`lifecycle_states: +${lsRows.length}`);

  // ---------- Pattern flags (a4/a5) ----------
  await patch("/data_objects?id=eq.638", { has_personal_content: true }); // legal_advice_records (privilege)
  await patch("/data_objects?id=eq.637", { has_single_approver: true });  // outside_counsel_engagements (GC sign-off)
  console.log("pattern flags: 638 personal, 637 single_approver");

  // ---------- Handoff backfill: source FK on 11 outbound ----------
  const srcFk: Array<[number, string]> = [
    [911, "LSD-LEGAL-HOLD"], [912, "LSD-LEGAL-HOLD"], [913, "LSD-LEGAL-HOLD"], [916, "LSD-LEGAL-HOLD"],
    [914, "LSD-REGULATORY-RESPONSE"],
    [915, "LSD-MATTER-MGMT"], [1028, "LSD-MATTER-MGMT"], [1029, "LSD-MATTER-MGMT"], [1030, "LSD-MATTER-MGMT"], [1031, "LSD-MATTER-MGMT"], [1032, "LSD-MATTER-MGMT"],
  ];
  for (const [hid, mod] of srcFk) await patch(`/handoffs?id=eq.${hid}`, { source_domain_module_id: M[mod] });
  console.log(`outbound source FK backfilled: ${srcFk.length}`);

  // ---------- Suspicious-inbound repaints (a6/a7=b) + 824 target backfill ----------
  await patch("/handoffs?id=eq.300", { data_object_id: 634, target_domain_module_id: M["LSD-INTAKE-PORTAL"] }); // RE-PROP-MGMT evict -> legal intake
  await patch("/handoffs?id=eq.807", { data_object_id: 634, target_domain_module_id: M["LSD-INTAKE-PORTAL"] }); // HCMS editorial -> legal intake
  await patch("/handoffs?id=eq.824", { target_domain_module_id: M["LSD-LEGAL-HOLD"] });                         // ECM content_document legal hold
  console.log("inbound repaints (300/807) + 824 target backfilled");

  // ---------- Outside-counsel fan-out (a8=d: SPEND-MGMT + CLM + GRC) ----------
  const fan = [
    { target_domain_id: 133, integration_pattern: "api_call", friction_level: "medium", description: "Outside counsel engaged triggers accrual and engagement-letter spend tracking in Spend Management." },
    { target_domain_id: 26, integration_pattern: "api_call", friction_level: "medium", description: "Outside counsel engagement letter flows to Contract Lifecycle Management as a managed contract." },
    { target_domain_id: 15, integration_pattern: "event_stream", friction_level: "medium", description: "Outside counsel engagement triggers conflict-check and independence obligations in GRC." },
  ];
  const existFan = new Set((await get("/handoffs?trigger_event_id=eq.1045&select=target_domain_id")).map(r => Number(r.target_domain_id)));
  const newFan = fan.filter(f => !existFan.has(f.target_domain_id)).map(f => ({
    source_domain_id: DID, target_domain_id: f.target_domain_id, data_object_id: 637, trigger_event_id: 1045,
    source_domain_module_id: M["LSD-OUTSIDE-COUNSEL"], target_domain_module_id: null,
    integration_pattern: f.integration_pattern, friction_level: f.friction_level, description: f.description, notes: "",
  }));
  if (newFan.length) await post("/handoffs", newFan);
  console.log(`outside-counsel fan-out handoffs: +${newFan.length}`);

  // ---------- VERIFY ----------
  console.log("\n== VERIFY ==");
  console.log("modules:", (await get(`/domain_modules?domain_id=eq.${DID}&select=domain_module_code`)).map(r => r.domain_module_code).join(", "));
  console.log("master DMDOs:", (await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(M).join(",")})&role=eq.master&select=data_object_id`)).length, "/8");
  console.log("lifecycle states total:", (await get(`/data_object_lifecycle_states?data_object_id=in.(633,634,635,636,637,638,639,640)&select=id`)).length);
  console.log("outbound w/ source FK:", (await get(`/handoffs?source_domain_id=eq.${DID}&source_domain_module_id=not.is.null&select=id`)).length);
  console.log("inbound w/ target FK:", (await get(`/handoffs?target_domain_id=eq.${DID}&target_domain_module_id=not.is.null&select=id`)).length);
  console.log("trigger-1045 handoffs:", (await get("/handoffs?trigger_event_id=eq.1045&select=target_domain_id")).map(r => r.target_domain_id).join(","));
  console.log("DONE.");
}
main();
