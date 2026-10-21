#!/usr/bin/env bun
// WORK-MGMT b1a execution (2026-06-06): A4 + M8 catalog UX backfill.
//
// Writes buyer-voice catalog_tagline / catalog_description into the EMPTY fields
// on domain 135 and modules 149/150/183, per revised Rule #20 (write empty fields
// directly; record_status carries the review signal). The drafted copy was authored
// in the 2026-06-02 audit and lives in audits/WORK-MGMT/history.md.
//
// Per-field empty-guard: re-read the live value immediately before each PATCH and
// write ONLY when the current value is empty. Never overwrite a non-empty value.
// No em-dashes; American English.

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

const get = (path: string) => call({ method: "GET", path });

// Buyer-voice copy (drafted 2026-06-02, in history.md). Paragraph breaks are real newlines.
const DOMAIN_TAGLINE =
  "Run every team's projects, tasks, and goals in one place, from first request to finished work.";

const DOMAIN_DESCRIPTION = [
  "Bring structured work out of scattered spreadsheets and inboxes. Create projects, break them into assignable tasks with owners and due dates, map dependencies, and watch progress on boards, timelines, and dashboards that update as the work moves.",
  "Set team objectives and key results, then connect them to the tasks that move them so progress rolls up automatically. Standardize repeatable work with templates, and let automations handle status changes, reminders, and routing.",
  "Built for operations, marketing, and any team running cross-functional work that needs one shared view of who is doing what, by when.",
].join("\n\n");

const MOD_149_TAGLINE = "Plan projects, assign tasks, and track them from kickoff to done.";
const MOD_149_DESCRIPTION = [
  "Organize work into projects and sections, then assign tasks with owners, due dates, priorities, and dependencies. Track everything on boards, lists, and timelines, and keep work moving with approval steps, milestones, and automations that handle routine status changes and notifications.",
  "Standardize recurring work with reusable project and task templates, tailor records with custom fields, and use workload views to spot who is over or under capacity before deadlines slip.",
].join("\n\n");

const MOD_150_TAGLINE =
  "Set objectives, score key results, and see progress roll up from the work behind them.";
const MOD_150_DESCRIPTION = [
  "Define objectives and measurable key results for the quarter or year, assign owners, and keep them current with regular check-ins. Link objectives to the tasks and projects that drive them so progress updates as work gets done instead of being re-entered by hand.",
  "Commit objectives once agreed, track them through the cycle, and score them at close so the team learns what worked.",
].join("\n\n");

const MOD_183_TAGLINE =
  "Capture work requests through structured forms and route them straight into the right project.";
const MOD_183_DESCRIPTION = [
  "Replace ad-hoc requests with structured intake forms that collect exactly what the team needs to start. Submissions are triaged and converted into work items in the right project, with the requester's details captured along the way.",
  "Standardized intake means no lost requests in chat or email, a consistent starting point for every piece of work, and a clear record of what was asked and what happened next.",
].join("\n\n");

type Target = {
  table: "domains" | "domain_modules";
  id: number;
  label: string;
  tagline: string;
  description: string;
};

const targets: Target[] = [
  { table: "domains", id: 135, label: "WORK-MGMT (domain)", tagline: DOMAIN_TAGLINE, description: DOMAIN_DESCRIPTION },
  { table: "domain_modules", id: 149, label: "WORK-MGMT-TASK-EXEC", tagline: MOD_149_TAGLINE, description: MOD_149_DESCRIPTION },
  { table: "domain_modules", id: 150, label: "WORK-MGMT-GOALS-OKR", tagline: MOD_150_TAGLINE, description: MOD_150_DESCRIPTION },
  { table: "domain_modules", id: 183, label: "WORK-MGMT-INTAKE", tagline: MOD_183_TAGLINE, description: MOD_183_DESCRIPTION },
];

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === "";
}

function assertNoEmDash(s: string, where: string): void {
  if (s.includes("—")) throw new Error(`Em-dash found in ${where}; forbidden.`);
}

let wrote = 0;
let skipped = 0;

for (const t of targets) {
  const [live] = await get(
    `/${t.table}?id=eq.${t.id}&select=id,catalog_tagline,catalog_description`,
  );
  if (!live) throw new Error(`${t.label}: row id=${t.id} not found`);

  const patch: Row = {};
  if (isEmpty(live.catalog_tagline)) {
    assertNoEmDash(t.tagline, `${t.label} tagline`);
    patch.catalog_tagline = t.tagline;
  } else {
    console.log(`  SKIP tagline on ${t.label} (already non-empty)`);
    skipped++;
  }
  if (isEmpty(live.catalog_description)) {
    assertNoEmDash(t.description, `${t.label} description`);
    patch.catalog_description = t.description;
  } else {
    console.log(`  SKIP description on ${t.label} (already non-empty)`);
    skipped++;
  }

  if (Object.keys(patch).length === 0) {
    console.log(`  ${t.label}: nothing to write`);
    continue;
  }

  const result = await call({
    method: "PATCH",
    path: `/${t.table}?id=eq.${t.id}`,
    body: patch,
  });
  const fields = Object.keys(patch).join(", ");
  console.log(`  PATCH ${t.label} (id=${t.id}): wrote ${fields}`);
  wrote += Object.keys(patch).length;
  if (!result || result.length === 0) {
    console.warn(`  WARNING: PATCH on ${t.label} returned no rows (representation?)`);
  }
}

console.log(`\nDone. Fields written: ${wrote}. Fields skipped (already non-empty): ${skipped}.`);

// Verify
console.log("\nVerification (live state after write):");
for (const t of targets) {
  const [r] = await get(
    `/${t.table}?id=eq.${t.id}&select=id,catalog_tagline,catalog_description,record_status`,
  );
  const tag = isEmpty(r?.catalog_tagline) ? "EMPTY" : "set";
  const desc = isEmpty(r?.catalog_description) ? "EMPTY" : "set";
  console.log(`  ${t.label} (id=${t.id}): tagline=${tag}, description=${desc}, record_status=${r?.record_status}`);
}
