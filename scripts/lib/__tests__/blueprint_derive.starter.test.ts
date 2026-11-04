// The starter-shaped scenario (fixtures/hiring_starter_scenario.ts) through the whole derivation:
// every rule of the gate-permission contract on one unit that embeds entities from full modules it
// does not install. The per-rule fixtures are in blueprint_derive.rules.test.ts.

import { describe, expect, test } from "bun:test";
import { deriveModuleModel } from "../blueprint_derive";
import { hiringStarterScenario, IDS } from "./fixtures/hiring_starter_scenario";

const fx = hiringStarterScenario();
const model = deriveModuleModel(fx.index.modulesById.get(IDS.STARTER)!, fx.ctx);
const pm = model.perModule[0];

describe("hiring-starter scenario", () => {
  test("§7: every embedded gate keeps the name of the module that realizes it, so the two hire gates stay separate", () => {
    const gates = model.lifecycle.flatMap((l) =>
      l.states.filter((s) => s.state.requires_permission).map((s) => `${l.dataObject.data_object_name}.${s.state.state_name} -> ${s.gate?.code}`),
    );
    expect(gates).toEqual([
      "candidates.hired -> ats-candidate-crm:hire_candidate",
      "candidates.do_not_hire -> ats-candidate-crm:flag_do_not_hire",
      "job_applications.hired -> ats-pre-employee-record:hire_candidate",
      "job_offers.approved -> ats-offers:approve_offer",
      "job_postings.published -> ats-recruitment-pipeline:publish_posting",
    ]);
  });

  test("§8.1: bundles keep the unit's slug; entity rows, gates and overrides carry the owner's; the high-risk gate is not in :admin", () => {
    expect(pm.permissions.map((p) => [p.code, p.tier, p.description, p.includedInAdmin])).toEqual([
      ["hiring-starter:read", "baseline-read", "Read access to every entity in the module", true],
      ["hiring-starter:manage", "baseline-manage", "Edit operational records", true],
      ["hiring-starter:admin", "baseline-admin", "Edit reference data and inherit every workflow gate below except the high-risk ones", false],
      ["ats-candidate-crm:read_candidates", "entity-read", "Read Candidates", true],
      ["ats-candidate-crm:write_candidates", "entity-write", "Write Candidates", true],
      ["ats-recruitment-pipeline:read_job_postings", "entity-read", "Read Job Postings", true],
      ["ats-recruitment-pipeline:write_job_postings", "entity-write", "Write Job Postings", true],
      ["ats-recruitment-pipeline:read_job_applications", "entity-read", "Read Applications", true],
      ["ats-recruitment-pipeline:write_job_applications", "entity-write", "Write Applications", true],
      ["ats-offers:read_job_offers", "entity-read", "Read Offers", true],
      ["ats-offers:write_job_offers", "entity-write", "Write Offers", true],
      ["ats-candidate-crm:hire_candidate", "workflow-gate (lifecycle)", "Transition `candidates` into state `hired`", true],
      ["ats-candidate-crm:flag_do_not_hire", "workflow-gate (lifecycle)", "Transition `candidates` into state `do_not_hire`", true],
      ["ats-recruitment-pipeline:publish_posting", "workflow-gate (lifecycle)", "Transition `job_postings` into state `published`", true],
      ["ats-pre-employee-record:hire_candidate", "workflow-gate (lifecycle)", "Transition `job_applications` into state `hired`", true],
      ["ats-offers:approve_offer", "workflow-gate (lifecycle)", "Transition `job_offers` into state `approved`", false],
      ["ats-candidate-crm:view_all_candidates", "override (personal_content)", "View all `candidates` rows beyond row-scope", true],
      ["ats-candidate-crm:manage_all_candidates", "override (personal_content)", "Manage all `candidates` rows beyond row-scope", true],
    ]);
  });

  test("§9.1: the admin role exists, the bundles hold each entity's permissions, and the hierarchy rolls up every gate except the high-risk one", () => {
    expect(pm.baselineRoles.map((r) => r.code)).toEqual(["hiring-starter_viewer", "hiring-starter_manager", "hiring-starter_admin"]);
    expect(pm.hierarchy.map((e) => `${e.including} -> ${e.included}`)).toEqual([
      "hiring-starter:admin -> hiring-starter:manage",
      "hiring-starter:manage -> hiring-starter:read",
      "hiring-starter:read -> ats-candidate-crm:read_candidates",
      "hiring-starter:read -> ats-recruitment-pipeline:read_job_postings",
      "hiring-starter:read -> ats-recruitment-pipeline:read_job_applications",
      "hiring-starter:read -> ats-offers:read_job_offers",
      "hiring-starter:manage -> ats-candidate-crm:write_candidates",
      "ats-candidate-crm:write_candidates -> ats-candidate-crm:read_candidates",
      "hiring-starter:manage -> ats-recruitment-pipeline:write_job_postings",
      "ats-recruitment-pipeline:write_job_postings -> ats-recruitment-pipeline:read_job_postings",
      "hiring-starter:manage -> ats-recruitment-pipeline:write_job_applications",
      "ats-recruitment-pipeline:write_job_applications -> ats-recruitment-pipeline:read_job_applications",
      "hiring-starter:manage -> ats-offers:write_job_offers",
      "ats-offers:write_job_offers -> ats-offers:read_job_offers",
      "hiring-starter:admin -> ats-candidate-crm:hire_candidate",
      "hiring-starter:admin -> ats-candidate-crm:flag_do_not_hire",
      "hiring-starter:admin -> ats-recruitment-pipeline:publish_posting",
      "hiring-starter:admin -> ats-pre-employee-record:hire_candidate",
      "hiring-starter:admin -> ats-candidate-crm:view_all_candidates",
      "hiring-starter:admin -> ats-candidate-crm:manage_all_candidates",
    ]);
  });

  test("§9.1 RACI: the Accountable row holds its process's gates once, Responsible the write tier, Informed the events", () => {
    expect(pm.raci.map((g) => `${g.process} | ${g.raci} | ${g.actor} | ${g.realization}`)).toEqual([
      "hire_candidate | responsible | RECRUITING-RECRUITER | the gated entities' write tier",
      "hire_candidate | accountable | HIRING-MANAGER | grant gates [ats-candidate-crm:hire_candidate, ats-pre-employee-record:hire_candidate] + the gated entities' write tier",
      "hire_candidate | informed | LEGAL-COMPLIANCE-SPECIALIST | notify on trigger_events [candidate.hired, job_application.hired]",
      "recruit_source_candidates | responsible | RECRUITING-RECRUITER | the gated entities' write tier",
      "recruit_source_candidates | accountable | RECRUITING-MANAGER | grant gates [ats-recruitment-pipeline:publish_posting] + the gated entities' write tier",
      "recruit_source_candidates | informed | HIRING-MANAGER | ⚠ no event wired",
      "draw_up_make_offer | responsible | RECRUITING-RECRUITER | the gated entities' write tier",
      "draw_up_make_offer | accountable | HIRING-MANAGER | grant gates [ats-offers:approve_offer] + the gated entities' write tier",
      "draw_up_make_offer | consulted | RECRUITING-MANAGER | advisory read grant",
    ]);
    expect(pm.wiredProcesses.map((p) => p.key)).toEqual(["hire_candidate", "recruit_source_candidates", "draw_up_make_offer"]);
    expect(model.personas).toEqual(["HIRING-MANAGER", "LEGAL-COMPLIANCE-SPECIALIST", "RECRUITING-MANAGER", "RECRUITING-RECRUITER"]);
  });

  test("every minted gate wired to a process is held by exactly one Accountable row, and every granted gate is minted", () => {
    const minted = new Set(pm.gates.map((g) => g.code));
    const held = new Map<string, number>();
    for (const g of pm.raci.filter((r) => r.raci === "accountable")) {
      const m = g.realization.match(/grant gates \[([^\]]*)\]/);
      const codes = m ? m[1].split(", ") : [];
      expect(new Set(codes).size).toBe(codes.length); // no gate listed twice
      for (const c of codes) {
        expect(minted.has(c)).toBe(true);
        held.set(c, (held.get(c) ?? 0) + 1);
      }
    }
    for (const g of pm.gates) expect(held.get(g.code) ?? 0).toBe(g.processIds.length > 0 ? 1 : 0);
  });

  test("§6: the starter stands in for the absent owners and the internal handoff is hidden", () => {
    const show = (rows: typeof model.handoffs.outbound) =>
      rows.map((h) => `${h.row.trigger_events.event_name}: ${h.sourceModule?.domain_module_code} -> ${h.targetModule?.domain_module_code}`);
    expect(show(model.handoffs.outbound)).toEqual([
      "candidate.hired: HIRING-STARTER -> HCM-LIFECYCLE-WORKFLOWS",
      "job_offer.accepted: HIRING-STARTER -> HCM-LIFECYCLE-WORKFLOWS",
    ]);
    expect(show(model.handoffs.inbound)).toEqual(["employee.applied_internally: HCM-CORE-WORKER -> HIRING-STARTER"]);
  });
});
