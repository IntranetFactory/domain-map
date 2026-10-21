// HRSD state-driven Validate execute (2026-06-07).
// EXECUTE items from audits/HRSD/state.yaml:
//   B1A-ENTITY-TYPE : PATCH entity_type on the 2 HRSD masters (hr_cases -> operational_workflow, case_categories -> catalog).
//   B1A-A4          : write empty domains.catalog_tagline + catalog_description on HRSD (id 22), Rule #20 backfill-empty.
//   B1A-M8          : write empty catalog_tagline + catalog_description on modules 75/76/77, Rule #20 backfill-empty.
// All writes are empty-guarded (never overwrite a non-empty value, Rule #20). entity_type PATCHes only when unclassified.
// No record_status touched (Rule #1). No notes column written (Rule #15). American English, no em-dash, no vendor names (Rule #18).

const BASE = "domain_map";

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (err && err.toLowerCase().includes("jwt")) {
    throw new Error("JWT_AUDIENCE_ERROR: " + err);
  }
  if (proc.exitCode !== 0) {
    throw new Error(`pg ${method} ${path} failed (exit ${proc.exitCode}): ${err || out}`);
  }
  try { return out.trim() ? JSON.parse(out) : null; } catch { return out; }
}

// ---- B1A-ENTITY-TYPE : classify the 2 masters -------------------------------
const entityTypeMap: Record<number, string> = {
  192: "operational_workflow", // hr_cases: 8-state intake -> closed with reopen, requires_permission gates
  193: "catalog",              // case_categories: config-shape taxonomy referenced by hr_cases
};

let entityTypePatched = 0;
const masters = await pg("GET", `/data_objects?id=in.(192,193)&select=id,data_object_name,entity_type`);
for (const m of masters) {
  const want = entityTypeMap[m.id];
  if (!want) continue;
  if (m.entity_type === null || m.entity_type === "unclassified") {
    await pg("PATCH", `/data_objects?id=eq.${m.id}`, { entity_type: want });
    console.log(`  entity_type: ${m.data_object_name} (${m.id}) ${m.entity_type} -> ${want}`);
    entityTypePatched++;
  } else {
    console.log(`  entity_type: ${m.data_object_name} (${m.id}) already '${m.entity_type}', skip`);
  }
}

// ---- B1A-A4 : domain catalog UX (HRSD id 22), empty-guard -------------------
const domainCopy = {
  catalog_tagline:
    "Give employees one place to ask HR questions, get answers, and track every request to resolution.",
  catalog_description:
    "Run employee HR support as a single service experience. Employees raise questions and requests from a self-service portal, find answers in a curated knowledge base, and watch their case move from intake to resolution without chasing anyone.\n\n" +
    "Behind the scenes, incoming cases are triaged and routed to the right HR specialist, escalated across payroll, benefits, access, and other teams when needed, and resolved against documented service levels. Approvals, assignments, and reopen handling are built into the workflow so nothing slips between stages.\n\n" +
    "As cases resolve, the knowledge base grows from real questions, deflecting future requests and freeing HR teams to focus on the cases that genuinely need a human.",
};

let domainWrites = 0;
const [dom] = await pg("GET", `/domains?id=eq.22&select=id,catalog_tagline,catalog_description`);
const domainPatch: Record<string, string> = {};
if (!dom.catalog_tagline || dom.catalog_tagline === "") domainPatch.catalog_tagline = domainCopy.catalog_tagline;
if (!dom.catalog_description || dom.catalog_description === "") domainPatch.catalog_description = domainCopy.catalog_description;
if (Object.keys(domainPatch).length) {
  await pg("PATCH", `/domains?id=eq.22`, domainPatch);
  console.log(`  domain catalog UX: wrote ${Object.keys(domainPatch).join(", ")} on HRSD (22)`);
  domainWrites = Object.keys(domainPatch).length;
} else {
  console.log("  domain catalog UX: both fields already non-empty, skip");
}

// ---- B1A-M8 : per-module catalog UX (75/76/77), empty-guard -----------------
const moduleCopy: Record<number, { tagline: string; description: string }> = {
  75: {
    tagline: "Capture, triage, and resolve every employee HR request in one tracked queue.",
    description:
      "Turn employee questions and requests into structured cases that move through a clear workflow: intake, triage, assignment, work, approval, and resolution. Each case lands with the right specialist, carries its full history, and closes against a service level everyone can see.\n\n" +
      "Route sensitive cases to the right owner, escalate to payroll, benefits, or access teams when a request crosses into their scope, and reopen a closed case cleanly when something changes. Managers get a real-time view of workload, aging, and approvals so HR support stays predictable instead of reactive.",
  },
  76: {
    tagline: "A single front door where employees ask, request, and self-serve HR needs.",
    description:
      "Give employees one place to start anything HR-related. They search for answers first, raise a case when they need a person, and check the status of everything they have open without sending a follow-up email.\n\n" +
      "The portal connects to the same case workflow HR teams use, so a request submitted here arrives fully formed and ready to triage. Familiar self-service patterns reduce inbound volume and let employees resolve common needs on their own time.",
  },
  77: {
    tagline: "Build and publish the HR knowledge that answers employees before they ask.",
    description:
      "Maintain a living library of HR answers, policies, and how-to guidance that employees can find from the portal and that agents can attach to a case in seconds. Articles are organized by the same categories that classify cases, so the right answer surfaces in the right context.\n\n" +
      "Every resolved case is a candidate for new knowledge, so the library compounds over time, deflecting repeat questions and keeping guidance consistent across the whole employee population.",
  },
};

let moduleWrites = 0;
const mods = await pg("GET", `/domain_modules?id=in.(75,76,77)&select=id,domain_module_code,catalog_tagline,catalog_description`);
for (const mod of mods) {
  const copy = moduleCopy[mod.id];
  if (!copy) continue;
  const patch: Record<string, string> = {};
  if (!mod.catalog_tagline || mod.catalog_tagline === "") patch.catalog_tagline = copy.tagline;
  if (!mod.catalog_description || mod.catalog_description === "") patch.catalog_description = copy.description;
  if (Object.keys(patch).length) {
    await pg("PATCH", `/domain_modules?id=eq.${mod.id}`, patch);
    console.log(`  module catalog UX: wrote ${Object.keys(patch).join(", ")} on ${mod.domain_module_code} (${mod.id})`);
    moduleWrites += Object.keys(patch).length;
  } else {
    console.log(`  module catalog UX: ${mod.domain_module_code} (${mod.id}) both fields non-empty, skip`);
  }
}

console.log("\n=== SUMMARY ===");
console.log(`entity_type PATCHed : ${entityTypePatched} masters`);
console.log(`domain catalog UX   : ${domainWrites} fields written`);
console.log(`module catalog UX   : ${moduleWrites} fields written`);
console.log(`UI: https://tests.semantius.app/${BASE}/data_objects`);
console.log(`UI: https://tests.semantius.app/${BASE}/domains`);
console.log(`UI: https://tests.semantius.app/${BASE}/domain_modules`);
