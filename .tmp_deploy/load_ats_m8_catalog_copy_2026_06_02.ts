#!/usr/bin/env bun
/**
 * load_ats_m8_catalog_copy_2026_06_02.ts — M8 backfill: buyer-voice catalog_tagline + catalog_description
 * for the 9 ATS modules (user-approved "M8 load it"). Rule #20: backfill only; guard skips any non-empty field.
 */
export {};

async function call(method: string, path: string, body?: unknown): Promise<any[]> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe", stderr: "pipe",
  });
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`${method} ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out.trim()) : [];
}

const copy: Record<number, { tagline: string; description: string }> = {
  1: {
    tagline: "Build and nurture a pipeline of candidates long before a role opens.",
    description:
      "Capture every candidate, source, and recruiter touchpoint in one place. Run nurture campaigns, log interactions, and keep warm relationships ready so you can fill roles from people who already know you.\n\nConsent and data-subject requests are tracked alongside each profile, so candidate privacy is handled as part of the workflow rather than bolted on.",
  },
  2: {
    tagline: "Group and segment candidates so the right shortlist is one search away.",
    description:
      "Organize candidates into pools and segments, tag them by skill or stage, and save the searches you run most. When a requisition opens, your shortlist is already assembled instead of rebuilt from scratch.",
  },
  3: {
    tagline: "Turn your employees into your best sourcing channel.",
    description:
      "Let employees submit referrals, track each one through the pipeline, and pay out rewards automatically when a hire sticks. Campaigns and reward tiers keep participation high without manual bookkeeping.",
  },
  4: {
    tagline: "Move applicants from requisition to decision on a structured, auditable pipeline.",
    description:
      "Open and approve requisitions, distribute postings, collect applications, and advance candidates through configurable stages, with screening questions, stage transitions, and hiring-team assignments captured as you go.\n\nApplicant-flow and disposition records are built in, so equal-opportunity reporting is a by-product of normal work rather than a separate project.",
  },
  5: {
    tagline: "Run consistent, structured interviews and collect comparable feedback.",
    description:
      "Schedule interviews against panel availability, equip interviewers with kits and question banks, and gather scorecards and assessments in a single structured record. Consistent inputs make hiring decisions easier to defend and faster to reach.",
  },
  6: {
    tagline: "Generate, approve, and send offers without losing a version.",
    description:
      "Draft offers from templates, route them through approval chains, and track every version until acceptance. Generated offer letters stay linked to the offer record, so what was approved is exactly what was sent.",
  },
  7: {
    tagline: "Run compliant background screening with the adverse-action flow built in.",
    description:
      "Order screening packages, track each component to completion, and adjudicate results in one place. The full FCRA flow (disclosures, summary-of-rights acknowledgements, pre-adverse and adverse-action notices, and dispute handling) is modeled as part of the workflow.\n\nScreening is necessity-scoped, so deployments outside FCRA jurisdictions enable only what applies to them.",
  },
  8: {
    tagline: "Hold the new hire's record between offer acceptance and day one.",
    description:
      "Once a candidate accepts, the pre-employee record carries their details through the gap before onboarding starts. It is the clean handoff point to onboarding and your HRIS, so a new hire's first day never starts from a blank page.",
  },
  154: {
    tagline: "Everything a small team needs to hire, in one lightweight package.",
    description:
      "A starter bundle covering the core hiring path (postings, candidates, applications, interviews, and offers) without the breadth of the full module set. Stand up hiring quickly, then grow into the full modules as your volume increases; your data moves with you when you do.",
  },
};

const ids = Object.keys(copy).map(Number);
const current = await call("GET", `/domain_modules?id=in.(${ids.join(",")})&select=id,domain_module_code,catalog_tagline,catalog_description`);
const curById = new Map<number, any>(current.map((m: any) => [Number(m.id), m]));

let patched = 0, skipped = 0;
for (const id of ids) {
  const c = curById.get(id);
  if (!c) { console.log(`  !! module ${id} not found`); continue; }
  if ((c.catalog_tagline && c.catalog_tagline.trim()) || (c.catalog_description && c.catalog_description.trim())) {
    console.log(`  SKIP ${c.domain_module_code} (already has copy — Rule #20 overwrite guard)`);
    skipped++;
    continue;
  }
  await call("PATCH", `/domain_modules?id=eq.${id}`, { catalog_tagline: copy[id].tagline, catalog_description: copy[id].description });
  console.log(`  PATCH ${c.domain_module_code}`);
  patched++;
}
console.log(`\nDONE. patched ${patched}, skipped ${skipped}.`);
console.log(`UI: https://tests.semantius.app/domain_map/domain_modules`);
