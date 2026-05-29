#!/usr/bin/env bun
// Loads ATS-domain data_objects into the domain_map module, plus their
// domain_data_objects junction rows (mastery_role: primary, domain_id 56).
//
// Idempotent: reads existing rows by natural key (data_object_name) and only
// inserts missing ones, then re-reads to build the name -> id map for the
// junction insert. Re-running is safe.

import { $ } from "bun";

$.throws(false);

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

const ATS_DOMAIN_ID = 56;

const dataObjects = [
  {
    data_object_name: "job_requisitions",
    singular_label: "Job Requisition",
    plural_label: "Job Requisitions",
    display_label: "Job Requisition",
    description: "Approved request to hire for a specific role. The master ATS work item, carries headcount, level, location, hiring manager, recruiter, and status (draft / open / on_hold / filled / cancelled).",
  },
  {
    data_object_name: "job_postings",
    singular_label: "Job Posting",
    plural_label: "Job Postings",
    display_label: "Job Posting",
    description: "Published, candidate-facing version of a requisition on a career site or job board. One requisition can have many postings (per board, language, or region).",
  },
  {
    data_object_name: "candidates",
    singular_label: "Candidate",
    plural_label: "Candidates",
    display_label: "Candidate",
    description: "Person known to the recruiting org, with or without an active application. Carries contact details, resume, tags, GDPR consent, and source. Distinct from Employee until hired.",
  },
  {
    data_object_name: "applications",
    singular_label: "Application",
    plural_label: "Applications",
    display_label: "Application",
    description: "A candidate's submission against a specific requisition. Carries pipeline stage, status (active / rejected / withdrawn / hired), source, and the full evaluation history.",
  },
  {
    data_object_name: "recruitment_sources",
    singular_label: "Recruitment Source",
    plural_label: "Recruitment Sources",
    display_label: "Recruitment Source",
    description: "Channel a candidate came from: job board, referral, agency, sourcing campaign, career event, or inbound. Used for source-of-hire analytics and channel ROI.",
  },
  {
    data_object_name: "referrals",
    singular_label: "Referral",
    plural_label: "Referrals",
    display_label: "Referral",
    description: "Employee-submitted candidate suggestion linked to a requisition. Tracks the referring employee, candidate, status, and any payable bonus.",
  },
  {
    data_object_name: "talent_pools",
    singular_label: "Talent Pool",
    plural_label: "Talent Pools",
    display_label: "Talent Pool",
    description: "Curated segment or pipeline of candidates kept warm for future roles (e.g. silver medallists, alumni, target-school grads, hard-to-fill skill clusters).",
  },
  {
    data_object_name: "interviews",
    singular_label: "Interview",
    plural_label: "Interviews",
    display_label: "Interview",
    description: "Scheduled assessment event between a candidate and one or more interviewers. Carries time, location/medium, panel, interview kit, and outcome.",
  },
  {
    data_object_name: "interview_scorecards",
    singular_label: "Interview Scorecard",
    plural_label: "Interview Scorecards",
    display_label: "Interview Scorecard",
    description: "Structured interviewer feedback against a defined rubric: per-competency ratings, written notes, and a hire/no-hire recommendation.",
  },
  {
    data_object_name: "assessments",
    singular_label: "Assessment",
    plural_label: "Assessments",
    display_label: "Assessment",
    description: "Skills, cognitive, technical, or personality test result attached to an application. Often sourced from a partner system (HackerRank, Codility, Pymetrics) and referenced here.",
  },
  {
    data_object_name: "offers",
    singular_label: "Offer",
    plural_label: "Offers",
    display_label: "Offer",
    description: "Formal employment offer extended to a candidate. Carries compensation components, start date, terms, approval chain, and status (draft / approved / sent / accepted / declined / rescinded).",
  },
  {
    data_object_name: "background_checks",
    singular_label: "Background Check",
    plural_label: "Background Checks",
    display_label: "Background Check",
    description: "External verification result for a candidate (criminal, employment history, education, credit, identity). Status and findings typically returned by a provider (Checkr, HireRight, Sterling).",
  },
  {
    data_object_name: "recruitment_agencies",
    singular_label: "Recruitment Agency",
    plural_label: "Recruitment Agencies",
    display_label: "Recruitment Agency",
    description: "Third-party recruiter or staffing firm supplying candidates. Tracks contract terms, contact, performance, and the candidates they have submitted.",
  },
  {
    data_object_name: "recruitment_events",
    singular_label: "Recruitment Event",
    plural_label: "Recruitment Events",
    display_label: "Recruitment Event",
    description: "Career fair, on-campus event, hackathon, or meetup used as a sourcing channel. Tracks attendees, captured leads, and event ROI.",
  },
];

async function main() {
  console.log("Loading ATS data_objects...");
  const existing = await call({
    method: "GET",
    path: "/data_objects?select=id,data_object_name&limit=10000",
  });
  const existingNames = new Set(existing.map(r => String(r.data_object_name)));
  const missing = dataObjects.filter(r => !existingNames.has(r.data_object_name));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new data_objects (${existing.length} existed)`);
    await call({ method: "POST", path: "/data_objects", body: missing });
  } else {
    console.log(`  data_objects: all ${dataObjects.length} already present`);
  }

  // Re-read to build name -> id map
  const all = await call({
    method: "GET",
    path: "/data_objects?select=id,data_object_name&limit=10000",
  });
  const idByName = new Map<string, number>();
  for (const r of all) idByName.set(String(r.data_object_name), Number(r.id));

  // Junction: domain_data_objects (ATS, mastery_role: primary)
  console.log("Loading domain_data_objects (ATS -> data_objects)...");
  const existingJunc = await call({
    method: "GET",
    path: `/domain_data_objects?domain_id=eq.${ATS_DOMAIN_ID}&select=data_object_id&limit=10000`,
  });
  const existingJuncIds = new Set(existingJunc.map(r => Number(r.data_object_id)));

  const juncRows = dataObjects
    .map(d => idByName.get(d.data_object_name)!)
    .filter(id => !existingJuncIds.has(id))
    .map(id => ({
      domain_id: ATS_DOMAIN_ID,
      data_object_id: id,
      mastery_role: "primary",
      notes: "",
    }));

  if (juncRows.length > 0) {
    console.log(`  inserting ${juncRows.length} new domain_data_objects rows (${existingJunc.length} existed)`);
    await call({ method: "POST", path: "/domain_data_objects", body: juncRows });
  } else {
    console.log(`  domain_data_objects: all ATS links already present`);
  }

  // Verify
  const finalJunc = await call({
    method: "GET",
    path: `/domain_data_objects?domain_id=eq.${ATS_DOMAIN_ID}&select=data_object_id,mastery_role`,
  });
  console.log(`\nFinal: ${all.length} total data_objects, ${finalJunc.length} ATS links`);
}

await main();
