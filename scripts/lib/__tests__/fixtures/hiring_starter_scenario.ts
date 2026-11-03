// scripts/lib/__tests__/fixtures/hiring_starter_scenario.ts
//
// A starter-shaped scenario, modeled on the catalog's HIRING-STARTER: a starter module embeds
// entities mastered by four full ATS modules that it does not install, so it realizes their gates
// and handoffs standalone (architect Writing Convention 10). It carries every case the gate
// contract distinguishes:
//   - gated processes with Responsible and Accountable personas, plus Informed and Consulted rows;
//   - a high-risk gate (`job_offers.approved`);
//   - a shared gate code (`candidates.hired` and `job_applications.hired` both -> `hire_candidate`,
//     the second one realized by a module that is not installed either);
//   - an unwired gate (`candidates.do_not_hire`, no process);
//   - an Informed persona with events and one without;
//   - handoffs that cross the unit's boundary (outbound and inbound) and one internal to it.

import {
  buildFixture,
  dataObject,
  dmdoRow,
  domain,
  handoffRow,
  lifecycleState,
  module,
  processRow,
  raciRow,
  triggerEvent,
  usersObject,
  type Fixture,
} from "./build";

export const IDS = {
  // domains
  ATS: 1, HCM: 2, HIRING: 3,
  // modules
  CRM: 10, PIPE: 11, OFFERS: 12, PRE: 14, HCM_WORKFLOWS: 20, HCM_CORE: 21, STARTER: 30,
  // data objects
  USERS: 100, CANDIDATES: 101, POSTINGS: 102, APPLICATIONS: 103, JOB_OFFERS: 104,
  // processes
  HIRE: 501, RECRUIT: 502, OFFER: 503,
  // personas (personas)
  RECRUITER: 7, HIRING_MANAGER: 8, RECRUITING_MANAGER: 9, LEGAL: 6,
} as const;

export function hiringStarterScenario(): Fixture {
  const I = IDS;
  return buildFixture({
    domains: [
      domain({ id: I.ATS, domain_code: "ATS", domain_name: "Applicant Tracking" }),
      domain({ id: I.HCM, domain_code: "HCM", domain_name: "Core HR" }),
      domain({ id: I.HIRING, domain_code: "HIRING", domain_name: "Hiring Starter", domain_kind: "bundle" }),
    ],
    modules: [
      module({ id: I.CRM, domain_module_code: "ATS-CANDIDATE-CRM", domain_id: I.ATS }),
      module({ id: I.PIPE, domain_module_code: "ATS-RECRUITMENT-PIPELINE", domain_id: I.ATS }),
      module({ id: I.OFFERS, domain_module_code: "ATS-OFFERS", domain_id: I.ATS }),
      module({ id: I.PRE, domain_module_code: "ATS-PRE-EMPLOYEE-RECORD", domain_id: I.ATS }),
      module({ id: I.HCM_WORKFLOWS, domain_module_code: "HCM-LIFECYCLE-WORKFLOWS", domain_id: I.HCM }),
      module({ id: I.HCM_CORE, domain_module_code: "HCM-CORE-WORKER", domain_id: I.HCM }),
      module({ id: I.STARTER, domain_module_code: "HIRING-STARTER", domain_module_name: "Hiring Starter", domain_id: I.HIRING, module_kind: "starter" }),
    ],
    dataObjects: [
      usersObject(I.USERS),
      dataObject({ id: I.CANDIDATES, data_object_name: "candidates", singular_label: "Candidate", plural_label: "Candidates", entity_type: "operational_workflow", has_personal_content: true }),
      dataObject({ id: I.POSTINGS, data_object_name: "job_postings", singular_label: "Job Posting", plural_label: "Job Postings", entity_type: "operational_workflow" }),
      dataObject({ id: I.APPLICATIONS, data_object_name: "job_applications", singular_label: "Application", plural_label: "Applications", entity_type: "operational_workflow" }),
      dataObject({ id: I.JOB_OFFERS, data_object_name: "job_offers", singular_label: "Offer", plural_label: "Offers", entity_type: "operational_workflow" }),
    ],
    dmdo: [
      dmdoRow(I.CRM, I.CANDIDATES, "master"),
      dmdoRow(I.PIPE, I.POSTINGS, "master"),
      dmdoRow(I.PIPE, I.APPLICATIONS, "master"),
      dmdoRow(I.OFFERS, I.JOB_OFFERS, "master"),
      dmdoRow(I.STARTER, I.CANDIDATES, "embedded_master"),
      dmdoRow(I.STARTER, I.POSTINGS, "embedded_master"),
      dmdoRow(I.STARTER, I.APPLICATIONS, "embedded_master"),
      dmdoRow(I.STARTER, I.JOB_OFFERS, "embedded_master"),
      dmdoRow(I.STARTER, I.USERS, "consumer"),
    ],
    lifecycle: [
      // candidates: `hired` is wired to the hire process; `do_not_hire` is gated but unwired.
      lifecycleState({ id: 1, data_object_id: I.CANDIDATES, state_name: "prospect", state_order: 1, is_initial: true, description: "Known to recruiting." }),
      lifecycleState({ id: 2, data_object_id: I.CANDIDATES, state_name: "hired", state_order: 2, is_terminal: true, requires_permission: true, permission_verb_override: "hire_candidate", domain_module_id: I.CRM, process_id: I.HIRE, description: "Converted to employee." }),
      lifecycleState({ id: 3, data_object_id: I.CANDIDATES, state_name: "do_not_hire", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "flag_do_not_hire", domain_module_id: I.CRM, description: "Flagged as ineligible." }),
      // job_postings: `published` is wired to the recruiting process.
      lifecycleState({ id: 4, data_object_id: I.POSTINGS, state_name: "draft", state_order: 1, is_initial: true, description: "Being composed." }),
      lifecycleState({ id: 5, data_object_id: I.POSTINGS, state_name: "published", state_order: 2, requires_permission: true, permission_verb_override: "publish_posting", domain_module_id: I.PIPE, process_id: I.RECRUIT, description: "Live on the channel." }),
      lifecycleState({ id: 6, data_object_id: I.POSTINGS, state_name: "closed", state_order: 3, is_terminal: true, description: "Taken down." }),
      // job_applications: `hired` shares the `hire_candidate` code; its realizer (pre-employee
      // record) is not installed either, so the starter mints it.
      lifecycleState({ id: 7, data_object_id: I.APPLICATIONS, state_name: "applied", state_order: 1, is_initial: true, description: "Submitted." }),
      lifecycleState({ id: 8, data_object_id: I.APPLICATIONS, state_name: "hired", state_order: 2, is_terminal: true, requires_permission: true, permission_verb_override: "hire_candidate", domain_module_id: I.PRE, process_id: I.HIRE, description: "Hired against the requisition." }),
      // job_offers: `approved` is the high-risk gate.
      lifecycleState({ id: 9, data_object_id: I.JOB_OFFERS, state_name: "draft", state_order: 1, is_initial: true, description: "Terms being composed." }),
      lifecycleState({ id: 10, data_object_id: I.JOB_OFFERS, state_name: "approved", state_order: 2, requires_permission: true, is_high_risk: true, permission_verb_override: "approve_offer", domain_module_id: I.OFFERS, process_id: I.OFFER, description: "Approver signed off." }),
      lifecycleState({ id: 11, data_object_id: I.JOB_OFFERS, state_name: "accepted", state_order: 3, is_terminal: true, description: "Candidate accepted." }),
    ],
    processes: [
      processRow(I.HIRE, "hire_candidate", { process_name: "Hire candidate", process_code: "7.2.4.3", external_id: "10465", hierarchy_level: 4 }),
      processRow(I.RECRUIT, "recruit_source_candidates", { process_name: "Recruit/Source candidates", process_code: "7.2.2", external_id: "10440", hierarchy_level: 3 }),
      processRow(I.OFFER, "draw_up_make_offer", { process_name: "Draw up and make offer", process_code: "7.2.4.1", external_id: "10463", hierarchy_level: 4 }),
    ],
    personas: [
      { id: I.RECRUITER, persona_code: "RECRUITING-RECRUITER" },
      { id: I.HIRING_MANAGER, persona_code: "HIRING-MANAGER" },
      { id: I.RECRUITING_MANAGER, persona_code: "RECRUITING-MANAGER" },
      { id: I.LEGAL, persona_code: "LEGAL-COMPLIANCE-SPECIALIST" },
    ],
    processRaci: [
      raciRow(1, I.HIRE, I.RECRUITER, "responsible"),
      raciRow(2, I.HIRE, I.HIRING_MANAGER, "accountable"),
      raciRow(3, I.HIRE, I.LEGAL, "informed"),
      raciRow(4, I.RECRUIT, I.RECRUITER, "responsible"),
      raciRow(5, I.RECRUIT, I.RECRUITING_MANAGER, "accountable"),
      raciRow(6, I.RECRUIT, I.HIRING_MANAGER, "informed"),
      raciRow(7, I.OFFER, I.RECRUITER, "responsible"),
      raciRow(8, I.OFFER, I.HIRING_MANAGER, "accountable"),
      raciRow(9, I.OFFER, I.RECRUITING_MANAGER, "consulted"),
    ],
    triggerEvents: [
      triggerEvent({ id: 1, event_name: "candidate.hired", data_object_id: I.CANDIDATES, to_state: "hired" }),
      triggerEvent({ id: 2, event_name: "job_application.hired", data_object_id: I.APPLICATIONS, to_state: "hired" }),
      triggerEvent({ id: 3, event_name: "job_offer.accepted", data_object_id: I.JOB_OFFERS, event_category: "state_change", to_state: "accepted" }),
    ],
    handoffs: [
      // Crosses the unit's boundary outbound: the starter publishes it for the absent CRM.
      handoffRow({ id: 1, source_domain_id: I.ATS, target_domain_id: I.HCM, source_domain_module_id: I.CRM, target_domain_module_id: I.HCM_WORKFLOWS, data_object_id: I.CANDIDATES, payload: "candidates", event: { event_name: "candidate.hired", to_state: "hired" }, friction_level: "high", description: "HCM creates the employee record." }),
      // Crosses inbound: the starter receives it for the absent CRM.
      handoffRow({ id: 2, source_domain_id: I.HCM, target_domain_id: I.ATS, source_domain_module_id: I.HCM_CORE, target_domain_module_id: I.CRM, data_object_id: I.CANDIDATES, payload: "candidates", event: { event_name: "employee.applied_internally", event_category: "signal" }, integration_pattern: "api_call", friction_level: "medium" }),
      // Internal: both endpoint modules are played by the starter, so it is hidden.
      handoffRow({ id: 3, source_domain_id: I.ATS, target_domain_id: I.ATS, source_domain_module_id: I.CRM, target_domain_module_id: I.PIPE, data_object_id: I.APPLICATIONS, payload: "job_applications", event: { event_name: "job_application.submitted" }, integration_pattern: "lifecycle_progression" }),
      // Crosses outbound from the absent offers module.
      handoffRow({ id: 4, source_domain_id: I.ATS, target_domain_id: I.HCM, source_domain_module_id: I.OFFERS, target_domain_module_id: I.HCM_WORKFLOWS, data_object_id: I.JOB_OFFERS, payload: "job_offers", event: { event_name: "job_offer.accepted", event_category: "state_change", to_state: "accepted" }, friction_level: "medium" }),
    ],
    businessFunctions: [{ id: 1, business_function_name: "Recruiting" }, { id: 2, business_function_name: "Finance" }],
    businessFunctionDomains: [
      { business_function_id: 1, domain_id: I.HIRING, responsibility_type: "owner" },
      { business_function_id: 2, domain_id: I.HIRING, responsibility_type: "consumer" },
    ],
  });
}
