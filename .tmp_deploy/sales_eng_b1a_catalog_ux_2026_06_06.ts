#!/usr/bin/env bun
// B1A-A-CATALOG-UX execution for SALES-ENG (domains.id 95) and its 3 modules (296, 297, 298).
//
// Writes buyer-voice catalog_tagline / catalog_description ONLY where the live value is empty
// (per-field empty-guard, Rule #20 revised). NEVER overwrites a non-empty value.
// record_status is OMITTED on every PATCH. No `notes` column is touched. No vendor/product
// names, no em-dashes, American English.
//
// JWT-audience errors STOP the run and surface the verbatim error (Rule #6).
//
// Idempotent: a re-run re-reads live state; once a field is non-empty the guard skips it.

import { $ } from "bun";

$.throws(false);

type Row = Record<string, unknown>;

const JWT_AUDIENCE_MARKER = "required audience not found";

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
    if (stderr.includes(JWT_AUDIENCE_MARKER) || stdout.includes(JWT_AUDIENCE_MARKER)) {
      console.error("JWT-AUDIENCE ERROR (Rule #6) -- STOPPING. Verbatim:");
      console.error((stderr + stdout).trim());
      process.exit(2);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr || stdout}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

// Buyer-voice copy. Workflow + value, describes what the buyer can do.
// No vendor/product names; no handoff/parent-domain/taxonomy enumeration; no em-dashes.

const DOMAIN_TAGLINE =
  "Reach more of the right prospects with structured outreach, and turn every call and email into coaching that lifts the whole team.";

const DOMAIN_DESCRIPTION = [
  "Run repeatable outbound motions instead of one-off emails. Build multi-step sequences that mix email, calls, social, and tasks, enroll the right prospects, and let timing and branching rules keep each rep on track so nobody slips through the cracks.",
  "Connect with prospects faster using built-in dialling, tracked email with open and reply visibility, reusable templates, and prospect-facing scheduling that books meetings without the back-and-forth.",
  "Record and transcribe calls and meetings automatically, surface what worked and what stalled, and feed scorecard-driven coaching so managers can ramp new reps quickly and help the whole team sell the way your best reps already do.",
].join("\n\n");

const MODULE_COPY: Record<number, { tagline: string; description: string }> = {
  296: {
    tagline:
      "Put every prospect into a consistent, multi-channel outreach motion and dial through your list without losing the thread.",
    description: [
      "Design multi-step sequences that combine email, calls, social touches, and manual tasks, then enroll prospects in bulk or one at a time. Timing and branching rules advance each prospect automatically, so reps always know exactly who to contact next and never let a follow-up go cold.",
      "Work your call list faster with built-in dialling and let buyer-intent and engagement signals push the warmest prospects to the top of the queue, so your team spends its time where the interest already is.",
    ].join("\n\n"),
  },
  297: {
    tagline:
      "Send personal, trackable sales email and let prospects book time with you in a couple of clicks.",
    description: [
      "Write one-to-one email that still scales, with reusable templates and snippets, and see who opened, clicked, and replied so you can follow up at the right moment. AI-assisted drafting and reply suggestions help reps respond faster and in the prospect's context.",
      "Skip the scheduling back-and-forth with prospect-facing booking links that show real availability, route meetings to the right rep, and qualify attendees up front so the calendar fills with the meetings that matter.",
    ].join("\n\n"),
  },
  298: {
    tagline:
      "Turn every recorded call and meeting into clear next steps and repeatable coaching that ramps the whole team.",
    description: [
      "Record and transcribe sales calls and meetings automatically, then get the highlights without listening to the whole thing: talk ratios, objections raised, commitments made, and the next steps that were agreed.",
      "Use those insights to coach with evidence. Score conversations against your playbook, compare what's working across reps and cadences, and prep managers for one-on-ones so new reps ramp faster and your best techniques spread across the team.",
    ].join("\n\n"),
  },
};

const EM_DASH = "—";

function assertClean(label: string, text: string) {
  if (text.includes(EM_DASH)) {
    throw new Error(`Em-dash found in copy for ${label} -- aborting before any write (CLAUDE.md).`);
  }
}

// Validate all copy is em-dash-free before touching the database.
assertClean("domain.tagline", DOMAIN_TAGLINE);
assertClean("domain.description", DOMAIN_DESCRIPTION);
for (const [id, c] of Object.entries(MODULE_COPY)) {
  assertClean(`module ${id} tagline`, c.tagline);
  assertClean(`module ${id} description`, c.description);
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

async function patchOne(
  table: string,
  id: number,
  desired: { catalog_tagline: string; catalog_description: string },
) {
  const [live] = await get(
    `/${table}?id=eq.${id}&select=id,catalog_tagline,catalog_description`,
  );
  if (!live) throw new Error(`${table} id ${id} not found on re-read`);

  const patch: Row = {};
  if (isEmpty(live.catalog_tagline)) patch.catalog_tagline = desired.catalog_tagline;
  else console.log(`  ${table} ${id}: catalog_tagline already non-empty -> SKIP (overwrite forbidden)`);

  if (isEmpty(live.catalog_description)) patch.catalog_description = desired.catalog_description;
  else console.log(`  ${table} ${id}: catalog_description already non-empty -> SKIP (overwrite forbidden)`);

  if (Object.keys(patch).length === 0) {
    console.log(`  ${table} ${id}: nothing to write (both fields already populated)`);
    return;
  }

  console.log(`  ${table} ${id}: writing ${Object.keys(patch).join(", ")}`);
  await call({
    method: "PATCH",
    path: `/${table}?id=eq.${id}`,
    body: patch,
  });
}

console.log("== SALES-ENG B1A-A-CATALOG-UX: writing empty catalog UX fields ==");

console.log("domains:");
await patchOne("domains", 95, {
  catalog_tagline: DOMAIN_TAGLINE,
  catalog_description: DOMAIN_DESCRIPTION,
});

console.log("domain_modules:");
for (const id of [296, 297, 298]) {
  const c = MODULE_COPY[id];
  await patchOne("domain_modules", id, {
    catalog_tagline: c.tagline,
    catalog_description: c.description,
  });
}

console.log("== done ==");
