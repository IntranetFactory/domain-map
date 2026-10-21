#!/usr/bin/env bun
// .tmp_deploy/lms_a_processing_2026-06-07.ts
//
// Processes audits/LMS/a-LMS.md decisions for the LMS domain (domains.id=57):
//
//   a3 (B2-M9-DECISION = "a"): flip the last remaining M9 consumer+required cross-domain
//     row, policy_attestations (DMDO id 295, module 33, data_object 286, mastered by GRC),
//     to necessity=optional. The other 3 M9 rows were already flipped in the 2026-06-06 b1a
//     pass. The a-file IS the user approval for this decision.
//
//   a5 (B2-CATALOG-COPY): backfill empty catalog_tagline + catalog_description on the LMS
//     domain row (57) and all 8 modules. Per Rule #20/#21 empty catalog UX fields are written
//     without a pre-write gate; the row's record_status carries the review signal. Empty-guard
//     per field: write only when the current value is empty (never overwrite a non-empty value).
//
// Idempotent (read-before-write). Re-runnable. Bun + semantius CLI only.
import { pg } from "../scripts/lib/catalog";

// ---------------------------------------------------------------------------
// a3 -- policy_attestations (DMDO 295) -> necessity=optional
// ---------------------------------------------------------------------------
{
  const cur = await pg(
    "GET",
    `/domain_module_data_objects?id=eq.295&select=role,necessity,data_objects(data_object_name)`,
  );
  if (!cur || !cur.length) {
    console.log("a3 SKIP: DMDO 295 not found");
  } else if (cur[0].necessity === "optional") {
    console.log("a3 already optional: policy_attestations (DMDO 295)");
  } else if (cur[0].role !== "consumer" || cur[0].necessity !== "required") {
    console.log(`a3 SKIP (unexpected shape role=${cur[0].role} necessity=${cur[0].necessity})`);
  } else {
    await pg("PATCH", `/domain_module_data_objects?id=eq.295`, { necessity: "optional" });
    console.log("a3 flipped to optional: policy_attestations (DMDO 295, module 33)");
  }
}

// ---------------------------------------------------------------------------
// a5 -- catalog UX copy backfill (domain 57 + 8 modules), empty-guard per field
// ---------------------------------------------------------------------------
type Copy = { tagline: string; description: string };

const DOMAIN_COPY: Copy = {
  tagline:
    "Train your whole workforce and prove it, from first enrollment to audit-ready completion records.",
  description:
    "Run corporate learning end to end. Author and publish courses, deliver them online or in the classroom, and track every enrollment through to completion. Issue the certifications and badges that show who is qualified, and keep the evidence auditors and regulators ask for. Assign mandatory training automatically, chase overdue learners without manual follow-up, and feed completion signals to the HR, compliance, and identity systems that depend on them.",
};

// domain_module_code -> copy
const MODULE_COPY: Record<string, Copy> = {
  "LMS-COURSE-DELIVERY": {
    tagline:
      "Build, publish, and deliver online courses, then track every enrollment through to completion.",
    description:
      "Create courses from lessons, content assets, and assessments, and publish new versions when material changes. Enroll learners, deliver self-paced training in the browser, and grade quizzes and exams as they go. Watch progress and completion in real time, and keep a clean record of who finished what.",
  },
  "LMS-COMPLIANCE-TRAINING": {
    tagline:
      "Assign mandatory training, chase overdue learners automatically, and capture the evidence regulators ask for.",
    description:
      "Run regulatory and policy training as repeatable campaigns. Assign required courses to the right people, track completion against deadlines, and escalate overdue assignments without manual chasing. Capture signed training evidence, manage recertification, and produce the filings and audit records compliance reviewers expect.",
  },
  "LMS-PATHS": {
    tagline: "Guide learners along structured paths that build the skills each role needs.",
    description:
      "Sequence courses into curricula and learning paths so learners always know what comes next. Tie each step to the skills and proficiency a role requires, recommend the next best course, and roll individual development into longer-term career plans. Track progress across the whole path, not just one course at a time.",
  },
  "LMS-ILT-DELIVERY": {
    tagline:
      "Run instructor-led and virtual classroom training: schedule sessions, book rooms, and track attendance.",
    description:
      "Plan classroom and virtual instructor-led training from one place. Schedule offerings and sessions, reserve rooms and resources, and manage rosters, waitlists, and cancellations. Record attendance and completion so classroom learning lands in the same record as everything else.",
  },
  "LMS-CREDENTIALS": {
    tagline:
      "Issue certifications and digital badges, then manage renewals and let others verify them.",
    description:
      "Define certifications and badges, issue them when learners qualify, and track expiry and renewal across the workforce. Let learners share verifiable credentials and let third parties confirm them, so a qualification is easy to prove long after the course is done.",
  },
  "LMS-CT-GDPR": {
    tagline:
      "Handle learner data-subject requests, consent, and retention so training data stays privacy-compliant.",
    description:
      "Give learners control over their training data. Capture and track consent, process data-subject access and deletion requests, and enforce retention policies that remove records when they should expire. Keep a defensible trail of how learner data is handled.",
  },
  "LMS-AUTOMATION": {
    tagline:
      "Automate enrollments, reminders, and escalations so the right training reaches the right people on time.",
    description:
      "Put routine learning administration on autopilot. Enroll people automatically based on role, team, or hire date, send reminders and nudges before deadlines, and escalate when training slips. Set the cadence once and let the rules keep learners on track.",
  },
  "TRAINING-RECORDS-STARTER": {
    tagline:
      "A lightweight way to assign training and keep completion records, ready to deploy on day one.",
    description:
      "Start small without standing up the full learning suite. Assign training, record completions, and keep the essential evidence a small or first-time team needs. Upgrade to the full modules later without losing any of the records you have already captured.",
  },
};

// helper: PATCH only the empty fields of a row
async function backfill(
  table: "domains" | "domain_modules",
  id: number,
  label: string,
  copy: Copy,
) {
  const cur = await pg(
    "GET",
    `/${table}?id=eq.${id}&select=catalog_tagline,catalog_description`,
  );
  if (!cur || !cur.length) {
    console.log(`copy SKIP (no row): ${label}`);
    return;
  }
  const body: Record<string, string> = {};
  if (!cur[0].catalog_tagline || cur[0].catalog_tagline === "") body.catalog_tagline = copy.tagline;
  if (!cur[0].catalog_description || cur[0].catalog_description === "")
    body.catalog_description = copy.description;
  if (Object.keys(body).length === 0) {
    console.log(`copy already populated (no overwrite): ${label}`);
    return;
  }
  await pg("PATCH", `/${table}?id=eq.${id}`, body);
  console.log(`copy written (${Object.keys(body).join("+")}): ${label}`);
}

// domain
await backfill("domains", 57, "LMS (domain 57)", DOMAIN_COPY);

// modules: resolve ids by code from live state (avoid hard-coding the wrong id)
const mods = await pg(
  "GET",
  `/domain_modules?domain_id=eq.57&select=id,domain_module_code&order=id.asc`,
);
for (const m of mods as { id: number; domain_module_code: string }[]) {
  const copy = MODULE_COPY[m.domain_module_code];
  if (!copy) {
    console.log(`copy SKIP (no copy authored for ${m.domain_module_code})`);
    continue;
  }
  await backfill("domain_modules", m.id, `${m.domain_module_code} (module ${m.id})`, copy);
}

console.log("done.");
