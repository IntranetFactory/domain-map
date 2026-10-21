#!/usr/bin/env bun
// State-driven IGA audit execute pass (2026-06-07).
// Works the EXECUTE-classified open items in audits/IGA/state.yaml:
//   1. B1A-ENTITY-TYPE  : PATCH data_objects.entity_type on the 6 IGA masters (all currently 'unclassified').
//   2. B1A-B6           : INSERT the missing iga_user_entitlements (964) -> iga_sod_violations (707) relationship.
//   3. Catalog UX (Rule #20, prompt-authorized): author + PATCH catalog_tagline / catalog_description
//      on the IGA domain row (35) and the 5 modules (144-148) where empty.
//   4. B1A-APQC         : INSERT handoff_processes rows for the clean-PCF subset
//      (286 -> 273, 289 -> 273, 378 -> 224). DLP handoffs 281/845 deferred (no clean PCF home).
//
// Idempotent: every write reads live first and only acts on the missing / unset rows.
// Never overwrites a non-empty catalog value. record_status omitted on inserts (defaults to 'new').

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

async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// ============================================================
// 1. B1A-ENTITY-TYPE : classify the 6 IGA masters
// ============================================================
const entityTypes: Record<number, string> = {
  704: "operational_workflow", // iga_access_requests: draft->submitted->...->completed
  705: "operational_workflow", // iga_access_certifications: campaign lifecycle
  706: "catalog",              // iga_entitlement_definitions: config-shape draft->published->retired
  707: "operational_workflow", // iga_sod_violations: detected->triaged->mitigated remediation workflow
  708: "operational_record",   // iga_provisioning_events: append-only execution event log
  964: "operational_workflow", // iga_user_entitlements: requested->approved->granted->certified->revoked
};

async function fixEntityType(): Promise<number> {
  console.log("\n== 1. B1A-ENTITY-TYPE ==");
  const ids = Object.keys(entityTypes).join(",");
  const live = await get(`/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`);
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = entityTypes[id];
    if (!want) continue;
    if (r.entity_type === want) {
      console.log(`  ${r.data_object_name} (${id}): already ${want}`);
      continue;
    }
    await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
    console.log(`  ${r.data_object_name} (${id}): ${r.entity_type} -> ${want}`);
    patched++;
  }
  return patched;
}

// ============================================================
// 2. B1A-B6 : iga_user_entitlements (964) -> iga_sod_violations (707)
// ============================================================
async function fixB6Relationship(): Promise<number> {
  console.log("\n== 2. B1A-B6 relationship 964 -> 707 ==");
  const existing = await get(
    "/data_object_relationships?data_object_id=eq.964&related_data_object_id=eq.707&select=id",
  );
  if (existing.length > 0) {
    console.log(`  already present (id ${existing[0].id}), skipping`);
    return 0;
  }
  await insert("/data_object_relationships", [
    {
      data_object_id: 964,
      related_data_object_id: 707,
      relationship_verb: "implicated_in_sod_violation",
      inverse_verb: "implicates_entitlement",
      relationship_type: "many_to_many",
      relationship_kind: "association",
      is_required: false,
      owner_side: "source",
    },
  ]);
  console.log("  inserted 964 -implicated_in_sod_violation-> 707");
  return 1;
}

// ============================================================
// 3. Catalog UX (Rule #20) : domain row + 5 modules
//    Buyer-voice, workflow+value, no vendor/product names, no em-dash, American English.
//    Only write where the live value is empty; never overwrite a non-empty value.
// ============================================================
const domainCatalog = {
  catalog_tagline:
    "Govern who has access to what across every system, from the first day on the job to the last.",
  catalog_description:
    "Identity governance gives security and IT teams one place to control the full lifecycle of access. When someone joins, moves, or leaves, the right entitlements are granted, adjusted, or revoked automatically, so nobody keeps access they no longer need.\n\nBusiness owners review and certify access on a schedule, segregation-of-duties rules catch toxic combinations before they become audit findings, and a single entitlement catalog keeps every grant traceable. Provisioning connectors push approved changes out to downstream systems and pull back proof that they landed.\n\nThe payoff is faster onboarding, cleaner audits, and far less standing risk: access stays current, every decision is recorded, and compliance evidence is a query away rather than a fire drill.",
};

const moduleCatalog: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  144: {
    catalog_tagline: "Let people request the access they need and route it through the right approvals automatically.",
    catalog_description:
      "Access requests turn a manual, email-driven scramble into a guided workflow. People pick what they need from a clear catalog, the request is checked for segregation-of-duties conflicts before anyone approves it, and it routes to the right approvers based on the entitlement and the requester.\n\nApprovals are tracked end to end, and an approved request hands off straight to provisioning so the access actually shows up without a separate ticket. The result is faster time-to-access, fewer help-desk tickets, and a complete record of who asked for what, who approved it, and why.",
  },
  145: {
    catalog_tagline: "Run access reviews on a schedule so reviewers confirm what people should keep and revoke the rest.",
    catalog_description:
      "Access certification puts business owners in the driver's seat for periodic reviews. Campaigns are scheduled, scoped to the right population, and routed to the reviewers who actually know whether each grant still makes sense.\n\nReviewers approve or revoke line by line, and revocation decisions feed straight into provisioning so removals happen instead of sitting in a spreadsheet. Every campaign produces clean, timestamped evidence that auditors can trust, which turns recurring compliance reviews from a quarterly fire drill into a routine that runs itself.",
  },
  146: {
    catalog_tagline: "Catch toxic access combinations before they become audit findings.",
    catalog_description:
      "Segregation-of-duties management defines the access combinations that should never sit with one person and watches for them continuously. Rules are evaluated when access is requested and across the existing population, so conflicts surface at the moment of decision rather than at audit time.\n\nDetected violations move through a clear remediation path: triage, mitigate, or formally accept the risk, with every step recorded. Owners get a defensible trail of how each conflict was handled, which keeps financial and regulatory controls intact without slowing the business down.",
  },
  147: {
    catalog_tagline: "Maintain one authoritative catalog of what each entitlement means and who can request it.",
    catalog_description:
      "The entitlement catalog is the single source of truth for the access an organization can grant. Each entitlement is defined once, with a clear owner, description, and lifecycle from draft to published to retired, so requesters and reviewers always see accurate, business-friendly choices instead of cryptic system permissions.\n\nPublished definitions feed the request and review workflows and keep segregation-of-duties rules anchored to real, current entitlements. Curating access centrally means fewer orphaned permissions, cleaner reviews, and a catalog that stays trustworthy as systems change.",
  },
  148: {
    catalog_tagline: "Push approved access changes out to connected systems automatically and prove they landed.",
    catalog_description:
      "Automated provisioning closes the loop between a governance decision and the systems that enforce it. When access is approved, certified, or revoked, connectors apply the change to the target systems without manual rework, and the result is captured as a tracked event.\n\nEach provisioning run records whether it completed, failed, or rolled back, so there is always proof that the intended access state was actually achieved. That removes the gap between what was approved and what is real, cuts the standing risk of lingering access, and gives auditors hard evidence that decisions were carried out.",
  },
};

async function fixCatalogUX(): Promise<{ domain: number; modules: number }> {
  console.log("\n== 3. Catalog UX (Rule #20) ==");
  let domainWrites = 0;
  let moduleWrites = 0;

  // Domain row 35
  const [dom] = await get("/domains?id=eq.35&select=id,catalog_tagline,catalog_description");
  const domBody: Row = {};
  if (dom && (dom.catalog_tagline === "" || dom.catalog_tagline === null)) {
    domBody.catalog_tagline = domainCatalog.catalog_tagline;
  }
  if (dom && (dom.catalog_description === "" || dom.catalog_description === null)) {
    domBody.catalog_description = domainCatalog.catalog_description;
  }
  if (Object.keys(domBody).length > 0) {
    await patch("/domains?id=eq.35", domBody);
    console.log(`  domain 35: wrote ${Object.keys(domBody).join(" + ")}`);
    domainWrites = Object.keys(domBody).length;
  } else {
    console.log("  domain 35: catalog fields already populated, skipping");
  }

  // Modules 144-148
  const mods = await get(
    "/domain_modules?domain_id=eq.35&select=id,domain_module_code,catalog_tagline,catalog_description&order=id",
  );
  for (const m of mods) {
    const id = Number(m.id);
    const copy = moduleCatalog[id];
    if (!copy) continue;
    const body: Row = {};
    if (m.catalog_tagline === "" || m.catalog_tagline === null) body.catalog_tagline = copy.catalog_tagline;
    if (m.catalog_description === "" || m.catalog_description === null) {
      body.catalog_description = copy.catalog_description;
    }
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      console.log(`  module ${m.domain_module_code} (${id}): wrote ${Object.keys(body).join(" + ")}`);
      moduleWrites += Object.keys(body).length;
    } else {
      console.log(`  module ${m.domain_module_code} (${id}): already populated, skipping`);
    }
  }
  return { domain: domainWrites, modules: moduleWrites };
}

// ============================================================
// 4. B1A-APQC : handoff_processes for the clean-PCF subset
//    286 (iam_access_policy.permission_escalation_detected) -> 273 Manage IT user identity and authorization
//    289 (iam_access_policy.permission_change)              -> 273 Manage IT user identity and authorization
//    378 (employment_event.recorded)                        -> 224 Manage employee onboarding
//    Deferred (no clean PCF home): 281 dlp_incident.escalated, 845 dlp_user_activity.flagged.
//    389/391/392 already tagged (process 97) in a prior pass.
// ============================================================
const apqcTags: { handoff_id: number; process_id: number }[] = [
  { handoff_id: 286, process_id: 273 },
  { handoff_id: 289, process_id: 273 },
  { handoff_id: 378, process_id: 224 },
];

async function fixApqcTags(): Promise<number> {
  console.log("\n== 4. B1A-APQC handoff_processes ==");
  const hids = apqcTags.map(t => t.handoff_id).join(",");
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${hids})&select=handoff_id,process_id`,
  );
  const seen = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const toInsert = apqcTags
    .filter(t => !seen.has(`${t.handoff_id}|${t.process_id}`))
    .map(t => ({
      handoff_id: t.handoff_id,
      process_id: t.process_id,
      proposal_source: "agent_curated",
      role: "implements",
    }));
  if (toInsert.length === 0) {
    console.log("  all clean-PCF tags already present, skipping");
    return 0;
  }
  await insert("/handoff_processes", toInsert);
  for (const t of toInsert) console.log(`  inserted handoff ${t.handoff_id} -> process ${t.process_id}`);
  return toInsert.length;
}

// ============================================================
async function main() {
  const et = await fixEntityType();
  const b6 = await fixB6Relationship();
  const cat = await fixCatalogUX();
  const apqc = await fixApqcTags();

  console.log("\n== SUMMARY ==");
  console.log(`  entity_type PATCHed:        ${et}`);
  console.log(`  B6 relationship INSERTed:   ${b6}`);
  console.log(`  catalog domain fields:      ${cat.domain}`);
  console.log(`  catalog module fields:      ${cat.modules}`);
  console.log(`  APQC handoff_processes:     ${apqc}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/handoff_processes");
}

await main();
