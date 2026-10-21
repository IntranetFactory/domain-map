#!/usr/bin/env bun
// WORK-MGMT catalog UX copy (A4 + M8) — user-approved verbatim 2026-06-02 (Rule #20).
// PATCHes domain 135 + modules 149/150/183 catalog_tagline + catalog_description.

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius failed: ${err}`);
  const t = out.trim();
  return t ? JSON.parse(t) : [];
}

const patches: { path: string; tagline: string; description: string }[] = [
  {
    path: "/domains?id=eq.135",
    tagline: "Run every team's projects, tasks, and goals in one place, from first request to finished work.",
    description:
      "Bring structured work out of scattered spreadsheets and inboxes. Create projects, break them into assignable tasks with owners and due dates, map dependencies, and watch progress on boards, timelines, and dashboards that update as the work moves.\n\n" +
      "Set team objectives and key results, then connect them to the tasks that move them so progress rolls up automatically. Standardize repeatable work with templates, and let automations handle status changes, reminders, and routing.\n\n" +
      "Built for operations, marketing, and any team running cross-functional work that needs one shared view of who is doing what, by when.",
  },
  {
    path: "/domain_modules?id=eq.149",
    tagline: "Plan projects, assign tasks, and track them from kickoff to done.",
    description:
      "Organize work into projects and sections, then assign tasks with owners, due dates, priorities, and dependencies. Track everything on boards, lists, and timelines, and keep work moving with approval steps, milestones, and automations that handle routine status changes and notifications.\n\n" +
      "Standardize recurring work with reusable project and task templates, tailor records with custom fields, and use workload views to spot who is over or under capacity before deadlines slip.",
  },
  {
    path: "/domain_modules?id=eq.150",
    tagline: "Set objectives, score key results, and see progress roll up from the work behind them.",
    description:
      "Define objectives and measurable key results for the quarter or year, assign owners, and keep them current with regular check-ins. Link objectives to the tasks and projects that drive them so progress updates as work gets done instead of being re-entered by hand.\n\n" +
      "Commit objectives once agreed, track them through the cycle, and score them at close so the team learns what worked.",
  },
  {
    path: "/domain_modules?id=eq.183",
    tagline: "Capture work requests through structured forms and route them straight into the right project.",
    description:
      "Replace ad-hoc requests with structured intake forms that collect exactly what the team needs to start. Submissions are triaged and converted into work items in the right project, with the requester's details captured along the way.\n\n" +
      "Standardized intake means no lost requests in chat or email, a consistent starting point for every piece of work, and a clear record of what was asked and what happened next.",
  },
];

for (const p of patches) {
  await call({ method: "PATCH", path: p.path, body: { catalog_tagline: p.tagline, catalog_description: p.description } });
  console.log(`  patched ${p.path}`);
}
console.log("=== catalog UX done: 4 rows (1 domain + 3 modules) ===");
