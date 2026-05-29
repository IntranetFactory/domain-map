#!/usr/bin/env bun
// P2.5A.ii — Obvious-non-Semantius tranche.
//
// 10 system skills (B2C-COMM skipped pending its Phase-B backfill):
//   ITSM, HCM, ATS, MA, SMM, CCAAS, ESIGN, PAYROLL, S2P, LMS
//
// Expected outcome (per plan): every one of these is NOT 100% Semantius — they require
// action or compute_service tools the workflow can't proceed without (email, SMS, e-sign,
// payment, social-platform posting, transcription, etc.).
//
//   bun run load_p25a_ii.ts          -> DRY RUN
//   bun run load_p25a_ii.ts --apply  -> Live

import { $ } from "bun";

$.throws(false);

const APPLY = process.argv.includes("--apply");

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
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius call failed (exit ${code}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  if (!APPLY) { console.log(`  [DRY] POST ${rows.length} → ${path}`); return []; }
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const r = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...r);
  }
  return out;
}

console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}\n`);

// RESOLVERS
let domainId = new Map<string, number>();
let doId = new Map<string, number>();
let toolId = new Map<string, number>();
let skillId = new Map<string, number>();

async function refreshDomains() {
  const r = await get(`/domains?select=id,domain_code&limit=10000`);
  domainId = new Map(r.map(x => [String(x.domain_code), Number(x.id)]));
}
async function refreshDOs() {
  const r = await get(`/data_objects?select=id,data_object_name&limit=10000`);
  doId = new Map(r.map(x => [String(x.data_object_name), Number(x.id)]));
}
async function refreshTools() {
  const r = await get(`/tools?select=id,tool_name&limit=10000`);
  toolId = new Map(r.map(x => [String(x.tool_name), Number(x.id)]));
}
async function refreshSkills() {
  const r = await get(`/skills?select=id,skill_name&limit=10000`);
  skillId = new Map(r.map(x => [String(x.skill_name), Number(x.id)]));
}
await Promise.all([refreshDomains(), refreshDOs(), refreshTools(), refreshSkills()]);

const existingSkillToolRows = await get(`/skill_tools?select=skill_id,tool_id&limit=20000`);
const stKey = (s: number, t: number) => `${s}:${t}`;
const existingSkillTools = new Set(existingSkillToolRows.map(r => stKey(Number(r.skill_id), Number(r.tool_id))));

console.log(`Resolved: ${domainId.size} domains, ${doId.size} data_objects, ${toolId.size} tools, ${skillId.size} skills, ${existingSkillTools.size} skill_tools.\n`);

// ============================================================================
// NEW TOOLS — query (only those not already in catalog)
// ============================================================================
type ToolDraft = { tool_name: string; operation_kind: "query" | "mutate" | "side_effect" | "compute"; data_object_name?: string; description: string };

const newTools: ToolDraft[] = [
  // ITSM queries (incidents/changes/knowledge_articles exist)
  { tool_name: "query_problems", operation_kind: "query", data_object_name: "problems", description: "Read ITSM problems via Semantius CRUD." },
  { tool_name: "query_service_requests", operation_kind: "query", data_object_name: "service_requests", description: "Read ITSM service requests via Semantius CRUD." },
  { tool_name: "query_service_catalog_items", operation_kind: "query", data_object_name: "service_catalog_items", description: "Read ITSM service catalog items via Semantius CRUD." },
  { tool_name: "query_slas", operation_kind: "query", data_object_name: "slas", description: "Read ITSM service level agreements via Semantius CRUD." },
  // S2P queries (purchase_orders/invoices/suppliers exist)
  { tool_name: "query_purchase_requisitions", operation_kind: "query", data_object_name: "purchase_requisitions", description: "Read procurement requisitions via Semantius CRUD." },
  { tool_name: "query_goods_receipts", operation_kind: "query", data_object_name: "goods_receipts", description: "Read goods receipts via Semantius CRUD." },
  { tool_name: "query_sourcing_events", operation_kind: "query", data_object_name: "sourcing_events", description: "Read sourcing events (RFx, auctions) via Semantius CRUD." },
  // HCM queries (employees + employment_events exist)
  { tool_name: "query_employment_contracts", operation_kind: "query", data_object_name: "employment_contracts", description: "Read employment contracts via Semantius CRUD." },
  { tool_name: "query_job_profiles", operation_kind: "query", data_object_name: "job_profiles", description: "Read HCM job profile catalog via Semantius CRUD." },
  { tool_name: "query_org_units", operation_kind: "query", data_object_name: "org_units", description: "Read organisational units via Semantius CRUD." },
  { tool_name: "query_positions", operation_kind: "query", data_object_name: "positions", description: "Read HCM position records via Semantius CRUD." },
  // PAYROLL queries (employees + pay_slips exist)
  { tool_name: "query_pay_runs", operation_kind: "query", data_object_name: "pay_runs", description: "Read payroll runs via Semantius CRUD." },
  { tool_name: "query_payroll_journal_entries", operation_kind: "query", data_object_name: "payroll_journal_entries", description: "Read payroll-side journal entries via Semantius CRUD." },
  { tool_name: "query_tax_filings", operation_kind: "query", data_object_name: "tax_filings", description: "Read payroll tax filings via Semantius CRUD." },
  { tool_name: "query_deduction_codes", operation_kind: "query", data_object_name: "deduction_codes", description: "Read payroll deduction codes via Semantius CRUD." },
  { tool_name: "query_earning_codes", operation_kind: "query", data_object_name: "earning_codes", description: "Read payroll earning codes via Semantius CRUD." },
  { tool_name: "query_garnishment_orders", operation_kind: "query", data_object_name: "garnishment_orders", description: "Read garnishment orders via Semantius CRUD." },
  { tool_name: "query_tax_authorities", operation_kind: "query", data_object_name: "tax_authorities", description: "Read payroll tax authority reference data via Semantius CRUD." },
  // ATS queries (candidates + job_requisitions exist)
  { tool_name: "query_applications", operation_kind: "query", data_object_name: "applications", description: "Read ATS candidate applications via Semantius CRUD." },
  { tool_name: "query_assessments", operation_kind: "query", data_object_name: "assessments", description: "Read ATS candidate assessments via Semantius CRUD." },
  { tool_name: "query_background_checks", operation_kind: "query", data_object_name: "background_checks", description: "Read background check records via Semantius CRUD." },
  { tool_name: "query_interview_scorecards", operation_kind: "query", data_object_name: "interview_scorecards", description: "Read interviewer scorecards via Semantius CRUD." },
  { tool_name: "query_interviews", operation_kind: "query", data_object_name: "interviews", description: "Read interview records via Semantius CRUD." },
  { tool_name: "query_job_postings", operation_kind: "query", data_object_name: "job_postings", description: "Read job postings via Semantius CRUD." },
  { tool_name: "query_offers", operation_kind: "query", data_object_name: "offers", description: "Read ATS offer records via Semantius CRUD." },
  { tool_name: "query_recruitment_agencies", operation_kind: "query", data_object_name: "recruitment_agencies", description: "Read recruitment-agency records via Semantius CRUD." },
  { tool_name: "query_recruitment_events", operation_kind: "query", data_object_name: "recruitment_events", description: "Read recruitment events (job fairs, etc.) via Semantius CRUD." },
  { tool_name: "query_recruitment_sources", operation_kind: "query", data_object_name: "recruitment_sources", description: "Read recruitment-source reference data via Semantius CRUD." },
  { tool_name: "query_referrals", operation_kind: "query", data_object_name: "referrals", description: "Read employee-referral records via Semantius CRUD." },
  { tool_name: "query_talent_pools", operation_kind: "query", data_object_name: "talent_pools", description: "Read ATS talent pool definitions via Semantius CRUD." },
  // LMS queries (learning_records exists)
  { tool_name: "query_courses", operation_kind: "query", data_object_name: "courses", description: "Read LMS course catalog via Semantius CRUD." },
  { tool_name: "query_course_enrollments", operation_kind: "query", data_object_name: "course_enrollments", description: "Read LMS course enrollments via Semantius CRUD." },
  { tool_name: "query_learning_paths", operation_kind: "query", data_object_name: "learning_paths", description: "Read LMS learning paths via Semantius CRUD." },
  { tool_name: "query_certifications", operation_kind: "query", data_object_name: "certifications", description: "Read LMS certifications via Semantius CRUD." },
  { tool_name: "query_compliance_assignments", operation_kind: "query", data_object_name: "compliance_assignments", description: "Read compliance training assignments via Semantius CRUD." },
  { tool_name: "query_skill_profiles", operation_kind: "query", data_object_name: "skill_profiles", description: "Read skill profile records via Semantius CRUD." },
  // MA queries
  { tool_name: "query_campaigns", operation_kind: "query", data_object_name: "campaigns", description: "Read marketing campaigns via Semantius CRUD." },
  { tool_name: "query_marketing_emails", operation_kind: "query", data_object_name: "marketing_emails", description: "Read marketing email templates / sends via Semantius CRUD." },
  { tool_name: "query_lead_scores", operation_kind: "query", data_object_name: "lead_scores", description: "Read MA lead scores via Semantius CRUD." },
  { tool_name: "query_forms", operation_kind: "query", data_object_name: "forms", description: "Read marketing-form definitions via Semantius CRUD." },
  { tool_name: "query_nurture_journeys", operation_kind: "query", data_object_name: "nurture_journeys", description: "Read MA nurture journeys via Semantius CRUD." },
  // SMM queries
  { tool_name: "query_social_posts", operation_kind: "query", data_object_name: "social_posts", description: "Read SMM scheduled / published posts via Semantius CRUD." },
  { tool_name: "query_social_messages", operation_kind: "query", data_object_name: "social_messages", description: "Read SMM inbound/outbound social messages via Semantius CRUD." },
  { tool_name: "query_social_mentions", operation_kind: "query", data_object_name: "social_mentions", description: "Read social-listening mention records via Semantius CRUD." },
  { tool_name: "query_social_accounts", operation_kind: "query", data_object_name: "social_accounts", description: "Read connected social account records via Semantius CRUD." },
  { tool_name: "query_influencers", operation_kind: "query", data_object_name: "influencers", description: "Read influencer database via Semantius CRUD." },
  { tool_name: "query_social_listening_topics", operation_kind: "query", data_object_name: "social_listening_topics", description: "Read social-listening topic definitions via Semantius CRUD." },
  // CCAAS queries
  { tool_name: "query_contact_records", operation_kind: "query", data_object_name: "contact_records", description: "Read CCAAS contact-history records via Semantius CRUD." },
  { tool_name: "query_support_sessions", operation_kind: "query", data_object_name: "support_sessions", description: "Read CCAAS support sessions via Semantius CRUD." },
  { tool_name: "query_queue_statistics", operation_kind: "query", data_object_name: "queue_statistics", description: "Read CCAAS queue statistics via Semantius CRUD." },

  // MUTATES — selective verbs per domain
  // ITSM
  { tool_name: "update_incident_status", operation_kind: "mutate", data_object_name: "incidents", description: "Advance an incident's state (new/in_progress/resolved/closed)." },
  { tool_name: "create_problem", operation_kind: "mutate", data_object_name: "problems", description: "Open a new ITSM problem record." },
  { tool_name: "create_service_request", operation_kind: "mutate", data_object_name: "service_requests", description: "Open a new service request from the catalog." },
  // S2P
  { tool_name: "create_purchase_requisition", operation_kind: "mutate", data_object_name: "purchase_requisitions", description: "Open a new purchase requisition." },
  { tool_name: "approve_purchase_order", operation_kind: "mutate", data_object_name: "purchase_orders", description: "Advance a purchase order through approval workflow." },
  { tool_name: "create_goods_receipt", operation_kind: "mutate", data_object_name: "goods_receipts", description: "Record receipt of goods against a purchase order." },
  // HCM
  { tool_name: "create_position", operation_kind: "mutate", data_object_name: "positions", description: "Create a new HCM position record." },
  { tool_name: "update_position", operation_kind: "mutate", data_object_name: "positions", description: "Update an HCM position's attributes." },
  { tool_name: "create_employment_event", operation_kind: "mutate", data_object_name: "employment_events", description: "Record a new employment lifecycle event (hire/promotion/transfer/etc.)." },
  // PAYROLL
  { tool_name: "create_pay_run", operation_kind: "mutate", data_object_name: "pay_runs", description: "Open a new payroll run for processing." },
  { tool_name: "generate_pay_slips", operation_kind: "mutate", data_object_name: "pay_slips", description: "Generate per-employee pay slip records for a pay run." },
  { tool_name: "file_tax_return", operation_kind: "mutate", data_object_name: "tax_filings", description: "Record a payroll tax filing submission." },
  // ATS
  { tool_name: "update_application_stage", operation_kind: "mutate", data_object_name: "applications", description: "Advance a candidate application through pipeline stages." },
  { tool_name: "create_offer", operation_kind: "mutate", data_object_name: "offers", description: "Create a new candidate offer record." },
  { tool_name: "schedule_interview", operation_kind: "mutate", data_object_name: "interviews", description: "Create / schedule a candidate interview." },
  // LMS
  { tool_name: "enroll_in_course", operation_kind: "mutate", data_object_name: "course_enrollments", description: "Enroll a learner in a course." },
  { tool_name: "complete_course", operation_kind: "mutate", data_object_name: "course_enrollments", description: "Mark a course enrollment as completed; produce learning_records." },
  { tool_name: "assign_compliance_training", operation_kind: "mutate", data_object_name: "compliance_assignments", description: "Assign a compliance training requirement to a learner cohort." },
  // MA
  { tool_name: "create_campaign", operation_kind: "mutate", data_object_name: "campaigns", description: "Open a new MA campaign." },
  { tool_name: "send_marketing_email", operation_kind: "mutate", data_object_name: "marketing_emails", description: "Author / queue a marketing email send (the mutate that records intent; physical send is via send_email side_effect)." },
  { tool_name: "score_lead", operation_kind: "mutate", data_object_name: "lead_scores", description: "Write an updated lead score record." },
  { tool_name: "update_nurture_journey", operation_kind: "mutate", data_object_name: "nurture_journeys", description: "Update an MA nurture journey's structure or membership." },
  // SMM
  { tool_name: "create_social_post", operation_kind: "mutate", data_object_name: "social_posts", description: "Draft / schedule a social post in the SMM tool." },
  { tool_name: "respond_to_social_mention", operation_kind: "mutate", data_object_name: "social_mentions", description: "Record a response to a social mention in the SMM tool." },
  // CCAAS
  { tool_name: "create_support_session", operation_kind: "mutate", data_object_name: "support_sessions", description: "Open a new CCAAS support session." },
  { tool_name: "update_support_session", operation_kind: "mutate", data_object_name: "support_sessions", description: "Update a CCAAS support session (resolution, transfer, escalation)." },
  { tool_name: "log_contact_record", operation_kind: "mutate", data_object_name: "contact_records", description: "Record a contact interaction in CCAAS." },
  // ESIGN
  { tool_name: "create_envelope", operation_kind: "mutate", data_object_name: "envelopes", description: "Create a new e-sign envelope record." },
  { tool_name: "send_envelope", operation_kind: "mutate", data_object_name: "envelopes", description: "Send an envelope to recipients for signing." },
  { tool_name: "void_envelope", operation_kind: "mutate", data_object_name: "envelopes", description: "Void a pending e-sign envelope." },

  // SIDE_EFFECT — new
  { tool_name: "post_social_message", operation_kind: "side_effect", description: "Publish a post or comment to an external social platform (LinkedIn, X/Twitter, Meta, TikTok, Instagram). No business-data return." },
];

// SKILLS
type SkillDraft = { skill_name: string; domain_code: string; description: string };
const newSkills: SkillDraft[] = [
  { skill_name: "itsm-system", domain_code: "ITSM", description: "System skill for IT Service Management — incident, problem, change, service request, knowledge, SLA workflows; notification cascades via email and team chat; CMDB cross-reads." },
  { skill_name: "hcm-system", domain_code: "HCM", description: "System skill for Human Capital Management — employee, position, employment contract, org-unit, employment-event lifecycle; joiner/leaver email cascades; contract signing via e-signature." },
  { skill_name: "ats-system", domain_code: "ATS", description: "System skill for Applicant Tracking and Recruiting — requisition, candidate, application, interview, offer workflow; candidate comms via email, interviews via calendar invites, offer signing via e-signature." },
  { skill_name: "ma-system", domain_code: "MA", description: "System skill for Marketing Automation — campaign, lead-scoring, nurture-journey workflows; email distribution is the core action." },
  { skill_name: "smm-system", domain_code: "SMM", description: "System skill for Social Media Management — post scheduling, listening, response workflows; posts published to external social platforms; mention sentiment scored via compute." },
  { skill_name: "ccaas-system", domain_code: "CCAAS", description: "System skill for Contact Center as a Service — contact records, support sessions, queue stats; voice / SMS via telephony; call transcription + sentiment via compute." },
  { skill_name: "esign-system", domain_code: "ESIGN", description: "System skill for Electronic Signature — envelope lifecycle (create/send/void); signing action via DocuSign/Adobe Sign side_effect." },
  { skill_name: "payroll-system", domain_code: "PAYROLL", description: "System skill for Payroll Management — pay run, pay slip, payroll journal, tax filing workflow; payments executed externally; pay-slip distribution via email." },
  { skill_name: "s2p-system", domain_code: "S2P", description: "System skill for Source-to-Pay — sourcing event, requisition, PO, goods receipt, invoice workflow; supplier comms via email; contract signing via e-signature." },
  { skill_name: "lms-system", domain_code: "LMS", description: "System skill for Learning Management — course, enrollment, learning path, certification, compliance-training workflow; reminder + completion emails." },
];

// SKILL_TOOLS matrix
type SkillToolTuple = [string, "required" | "optional" | "fallback"] | [string, "required" | "optional" | "fallback", string];
const skillToolsMatrix: Record<string, SkillToolTuple[]> = {
  "itsm-system": [
    ["query_incidents", "required"], ["query_problems", "required"], ["query_changes", "required"],
    ["query_knowledge_articles", "required"], ["query_service_requests", "required"],
    ["query_service_catalog_items", "required"], ["query_slas", "required"],
    ["create_incident", "required"], ["update_incident_status", "required"],
    ["create_change_request", "required"], ["create_problem", "required"], ["create_service_request", "required"],
    ["query_configuration_items", "required", "ITSM constantly references CMDB CIs"],
    ["send_email", "required", "Incident assignment / status notifications — standard ITSM workflow"],
    ["post_chat_message", "required", "Major-incident bridge / ChatOps integration (Slack/Teams) is table-stakes"],
    ["classify_text", "optional", "Auto-categorisation of inbound incidents (enhancement)"],
    ["generate_text", "optional", "AI-suggested resolution drafts"],
  ],
  "hcm-system": [
    ["query_employees", "required"], ["query_employment_contracts", "required"], ["query_employment_events", "required"],
    ["query_job_profiles", "required"], ["query_org_units", "required"], ["query_positions", "required"],
    ["update_employee_record", "required"], ["create_position", "required"], ["update_position", "required"],
    ["create_employment_event", "required"],
    ["send_email", "required", "Joiner/leaver cascades, manager-change notifications"],
    ["sign_document", "required", "Employment contracts require e-signature"],
  ],
  "ats-system": [
    // 14 masters
    ["query_candidates", "required"], ["query_job_requisitions", "required"], ["query_applications", "required"],
    ["query_interviews", "required"], ["query_interview_scorecards", "required"], ["query_offers", "required"],
    ["query_job_postings", "required"], ["query_assessments", "required"], ["query_background_checks", "required"],
    ["query_recruitment_sources", "required"], ["query_recruitment_agencies", "required"], ["query_recruitment_events", "required"],
    ["query_referrals", "required"], ["query_talent_pools", "required"],
    // mutates
    ["create_candidate", "required"], ["update_application_stage", "required"], ["create_offer", "required"], ["schedule_interview", "required"],
    // side_effects
    ["send_email", "required", "Candidate comms cascade (acks, rejections, interview invites)"],
    ["sign_document", "required", "Offer letter signing"],
    ["create_calendar_event", "required", "Interview scheduling via calendar invites"],
  ],
  "ma-system": [
    ["query_campaigns", "required"], ["query_marketing_emails", "required"], ["query_lead_scores", "required"],
    ["query_forms", "required"], ["query_nurture_journeys", "required"],
    ["create_campaign", "required"], ["send_marketing_email", "required"],
    ["score_lead", "required"], ["update_nurture_journey", "required"],
    ["send_email", "required", "MA's core function — email distribution to subscriber lists"],
    ["classify_text", "required", "ML-based lead scoring beyond rule-based weights"],
    ["generate_text", "optional", "AI email-copy generation"],
  ],
  "smm-system": [
    ["query_social_posts", "required"], ["query_social_messages", "required"], ["query_social_mentions", "required"],
    ["query_social_accounts", "required"], ["query_influencers", "required"], ["query_social_listening_topics", "required"],
    ["create_social_post", "required"], ["respond_to_social_mention", "required"],
    ["post_social_message", "required", "Posts published externally to LinkedIn / X / Meta / TikTok / Instagram"],
    ["detect_sentiment", "required", "Mention sentiment is core SMM analytics"],
    ["generate_image", "optional", "AI-generated post imagery"],
    ["generate_text", "optional", "AI-generated post copy"],
  ],
  "ccaas-system": [
    ["query_contact_records", "required"], ["query_support_sessions", "required"], ["query_queue_statistics", "required"],
    ["create_support_session", "required"], ["update_support_session", "required"], ["log_contact_record", "required"],
    ["make_phone_call", "required", "Outbound voice is core CCAAS workflow"],
    ["send_sms", "required", "SMS callback / two-factor escalation"],
    ["transcribe_audio", "required", "Call-recording transcription drives downstream sentiment + QA workflows"],
    ["detect_sentiment", "required", "Real-time agent-assist and post-call sentiment"],
  ],
  "esign-system": [
    ["query_envelopes", "required"],
    ["create_envelope", "required"], ["send_envelope", "required"], ["void_envelope", "required"],
    ["sign_document", "required", "The defining action — entire purpose of an ESIGN skill"],
    ["send_email", "required", "Envelope invitations + signing-completion notifications"],
  ],
  "payroll-system": [
    ["query_pay_runs", "required"], ["query_pay_slips", "required"], ["query_payroll_journal_entries", "required"],
    ["query_tax_filings", "required"], ["query_employees", "required"], ["query_earning_codes", "required"],
    ["query_deduction_codes", "required"], ["query_garnishment_orders", "required"], ["query_tax_authorities", "required"],
    ["create_pay_run", "required"], ["generate_pay_slips", "required"], ["file_tax_return", "required"],
    ["execute_payment", "required", "Payroll IS payments — bank transfers / ACH to employees"],
    ["send_email", "required", "Pay-slip distribution / tax-document availability notifications"],
  ],
  "s2p-system": [
    ["query_purchase_requisitions", "required"], ["query_purchase_orders", "required"], ["query_goods_receipts", "required"],
    ["query_invoices", "required"], ["query_sourcing_events", "required"], ["query_suppliers", "required"],
    ["create_purchase_requisition", "required"], ["approve_purchase_order", "required"], ["create_purchase_order", "required"],
    ["create_goods_receipt", "required"], ["update_invoice_status", "required"],
    ["send_email", "required", "Supplier RFx / approval / status comms"],
    ["sign_document", "required", "Supplier contract signing"],
    ["extract_entities", "optional", "Invoice OCR / line-item extraction"],
  ],
  "lms-system": [
    ["query_courses", "required"], ["query_course_enrollments", "required"], ["query_learning_paths", "required"],
    ["query_learning_records", "required"], ["query_certifications", "required"], ["query_compliance_assignments", "required"],
    ["query_skill_profiles", "required"],
    ["enroll_in_course", "required"], ["complete_course", "required"], ["assign_compliance_training", "required"],
    ["send_email", "required", "Enrollment confirmations + due-date reminders + certificate distribution"],
  ],
};

// VALIDATION
for (const t of newTools) {
  if (t.operation_kind === "query" || t.operation_kind === "mutate") {
    if (!t.data_object_name) throw new Error(`${t.tool_name}: ${t.operation_kind} requires data_object`);
    if (!doId.has(t.data_object_name)) throw new Error(`${t.tool_name}: unknown data_object ${t.data_object_name}`);
  } else {
    if (t.data_object_name) throw new Error(`${t.tool_name}: ${t.operation_kind} forbids data_object`);
  }
}

// EXECUTION

// Section 1: new tools
const missingTools = newTools.filter(t => !toolId.has(t.tool_name));
console.log(`Section 1 — tools: ${newTools.length} planned, ${missingTools.length} new to insert.`);
if (missingTools.length > 0) {
  const payload = missingTools.map(t => ({
    tool_name: t.tool_name,
    description: t.description,
    operation_kind: t.operation_kind,
    data_object_id: t.data_object_name ? doId.get(t.data_object_name) : null,
  }));
  await insert("/tools", payload);
  if (APPLY) await refreshTools();
}

// Section 2: skills
const missingSkills = newSkills.filter(s => !skillId.has(s.skill_name));
console.log(`Section 2 — skills: ${newSkills.length} planned, ${missingSkills.length} new to insert.`);
if (missingSkills.length > 0) {
  const payload: Row[] = [];
  for (const s of missingSkills) {
    const did = domainId.get(s.domain_code);
    if (did === undefined) throw new Error(`Domain not found: ${s.domain_code}`);
    payload.push({ skill_name: s.skill_name, description: s.description, skill_type: "system", domain_id: did });
  }
  await insert("/skills", payload);
  if (APPLY) await refreshSkills();
}

// Section 3: skill_tools
const stPayload: Row[] = [];
let stPlanned = 0;
let stSkipped = 0;
for (const [skillName, tools] of Object.entries(skillToolsMatrix)) {
  const sid = skillId.get(skillName);
  for (const t of tools) {
    stPlanned++;
    const [toolName, level, notes] = t.length === 3 ? t : [t[0], t[1], ""] as [string, string, string];
    const tid = toolId.get(toolName);
    if (sid === undefined || tid === undefined) { stSkipped++; continue; }
    if (existingSkillTools.has(stKey(sid, tid))) continue;
    stPayload.push({ skill_id: sid, tool_id: tid, requirement_level: level, notes });
  }
}
console.log(`Section 3 — skill_tools: ${stPlanned} planned, ${stPayload.length} to insert, ${stSkipped} dry-run skipped.`);
if (stPayload.length > 0) await insert("/skill_tools", stPayload);

// Section 4: hypothesis-test rollup
if (APPLY) {
  console.log(`\n=== Killer hypothesis test (P2.5A.ii — expected: 0% at 100%, all below) ===`);
  const allTools = await get(`/tools?select=id,tool_name,operation_kind&limit=10000`);
  const opKindByTool = new Map(allTools.map(t => [String(t.tool_name), String(t.operation_kind)]));
  for (const [skillName, tools] of Object.entries(skillToolsMatrix)) {
    const required = tools.filter(t => t[1] === "required");
    const semantiusCovered = required.filter(t => {
      const op = opKindByTool.get(t[0]);
      return op === "query" || op === "mutate";
    });
    const pct = (semantiusCovered.length / required.length) * 100;
    const flag = pct === 100 ? "✅ 100%" : `⬇ ${pct.toFixed(0)}%`;
    console.log(`  ${flag.padEnd(8)} ${skillName.padEnd(16)} ${semantiusCovered.length}/${required.length} required tools are Semantius-covered`);
    if (pct < 100) {
      const dragsBelow = required.filter(t => {
        const op = opKindByTool.get(t[0]);
        return !(op === "query" || op === "mutate");
      });
      for (const d of dragsBelow) {
        console.log(`           ↳ NOT covered: ${d[0]} (${opKindByTool.get(d[0])})`);
      }
    }
  }
}

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
