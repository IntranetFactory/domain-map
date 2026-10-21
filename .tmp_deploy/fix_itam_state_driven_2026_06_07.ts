#!/usr/bin/env bun
// ITAM state-driven review (Validate mode, SKILL.md Rule #21), 2026-06-07.
//
// Executes ONLY the agent-doable open items from audits/ITAM/state.yaml:
//   - B1A-ENTITY-TYPE: classify entity_type on the 2 masters (54, 55).
//   - B1A-E1: backfill empty trigger_events.event_category on 613-616.
//   - B1B-S1: Rule #20 catalog UX backfill on the ITAM domain row (3) and all 4
//     modules (57-60). The stale "surface-before-write" gate is RESCINDED by
//     Rule #20 / Rule #21: empty catalog UX fields are WRITTEN, not surfaced.
//
// Everything else (b2 forks, destructive notes wipes, M9 DMDO role/necessity
// rewrite, business_logic em-dash overwrite, personas/RACI) is surfaced or
// deferred, never written here. All writes are additive/corrective, land at
// record_status='new' (catalog UX columns ride the existing row's status), and
// are idempotent: every field is written only when its current value is empty,
// and every PATCH re-reads live state first.

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
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

// ============================================================
// B1A-ENTITY-TYPE: classify the 2 masters.
//   54 asset_contracts -> operational_workflow
//      (carries a 5-state lifecycle draft->active->expiring->expired->terminated
//       plus has_submit_lock + has_single_approver: a managed workflow entity).
//   55 asset_lifecycle_events -> operational_record
//      (append-only cross-cutting audit/event log; zero lifecycle states because
//       every state is captured by the event row itself: the config-shape that
//       Rule #12 classifies structurally rather than via a notes exemption).
// ============================================================

const entityTypeFixes: Array<{ id: number; name: string; entity_type: string }> = [
  { id: 54, name: "asset_contracts", entity_type: "operational_workflow" },
  { id: 55, name: "asset_lifecycle_events", entity_type: "operational_record" },
];

async function classifyMasters(): Promise<number> {
  console.log("[B1A-ENTITY-TYPE] classify entity_type on masters 54, 55");
  const rows = await get("/data_objects?id=in.(54,55)&select=id,data_object_name,entity_type");
  const byId = new Map(rows.map(r => [Number(r.id), r]));
  let n = 0;
  for (const f of entityTypeFixes) {
    const live = byId.get(f.id);
    if (!live) throw new Error(`data_object ${f.id} (${f.name}) not found`);
    const cur = String(live.entity_type ?? "");
    if (cur !== "" && cur !== "unclassified") {
      console.log(`  ${f.name} (id=${f.id}) already classified '${cur}'; skipping`);
      continue;
    }
    await patch(`/data_objects?id=eq.${f.id}`, { entity_type: f.entity_type });
    console.log(`  PATCH data_objects.id=${f.id} (${f.name}) entity_type -> ${f.entity_type}`);
    n++;
  }
  return n;
}

// ============================================================
// B1A-E1: backfill empty trigger_events.event_category to 'state_change'
// on 613, 614, 615, 616 (1209 already state_change). Rule #13 enum:
// lifecycle / state_change / threshold / signal. All four are state changes on
// their master (renewed, expired, recorded, retired_for_disposal).
// ============================================================

const eventCategoryIds = [613, 614, 615, 616];

async function backfillEventCategory(): Promise<number> {
  console.log("[B1A-E1] backfill trigger_events.event_category='state_change' on 613-616");
  const rows = await get(
    `/trigger_events?id=in.(${eventCategoryIds.join(",")})&select=id,event_name,event_category`,
  );
  let n = 0;
  for (const r of rows) {
    const cur = String(r.event_category ?? "");
    if (cur !== "") {
      console.log(`  ${r.event_name} (id=${r.id}) already '${cur}'; skipping`);
      continue;
    }
    await patch(`/trigger_events?id=eq.${r.id}`, { event_category: "state_change" });
    console.log(`  PATCH trigger_events.id=${r.id} (${r.event_name}) event_category -> state_change`);
    n++;
  }
  return n;
}

// ============================================================
// B1B-S1: Rule #20 catalog UX backfill. Buyer voice (workflow + value), no
// vendor/product names, no em-dash, American English. Empty-guard per field:
// write only when the current value is empty; never overwrite a non-empty value.
// ============================================================

const domainCopy: { id: number; catalog_tagline: string; catalog_description: string } = {
  id: 3,
  catalog_tagline:
    "Know every asset you own, what it costs, and where it is in its life, across hardware, software, SaaS, and cloud.",
  catalog_description:
    "Manage your entire technology estate from one place. Track every asset from purchase through deployment, transfer, and retirement, and keep a single record of the contracts, leases, warranties, and support agreements that govern them. Reconcile the inconsistent ways each feed names the same hardware and software so your inventory is clean and trustworthy. Roll the whole portfolio up into total-cost-of-ownership and position reporting that finance, procurement, and IT can all act on, so you renew on time, cut waste, and prove what you have when audit or compliance asks.",
};

const moduleCopy: Array<{
  id: number;
  code: string;
  catalog_tagline: string;
  catalog_description: string;
}> = [
  {
    id: 57,
    code: "ITAM-NORMALIZATION-CATALOG",
    catalog_tagline:
      "Turn messy, inconsistent asset feeds into one clean, trusted inventory.",
    catalog_description:
      "Every discovery source names the same hardware and software a little differently, leaving you with duplicate and mismatched records. This module reconciles those feeds into a single normalized catalog, so one model means one entry no matter where it was found. Keep your reference data current and let the rest of your asset management work from inventory you can trust.",
  },
  {
    id: 58,
    code: "ITAM-CONTRACTS",
    catalog_tagline:
      "Keep every lease, warranty, and support agreement tied to the assets it covers.",
    catalog_description:
      "Track the contracts that govern your assets, from leases and maintenance to warranties and support, in one connected record. See which assets each agreement covers, when it activates, renews, or expires, and act before a deadline catches you off guard. Stay ahead of renewals, avoid lapses in coverage, and keep procurement and finance aligned on what is committed and when.",
  },
  {
    id: 59,
    code: "ITAM-LIFECYCLE",
    catalog_tagline:
      "Follow every asset from procurement to disposal in one audit-ready timeline.",
    catalog_description:
      "Record every step in an asset's life, procurement, deployment, transfer, retirement, and disposal, as a single connected history that spans hardware, software, and SaaS. Capture events as they happen, including the ones triggered elsewhere such as an incident, a provisioning request, or an employee leaving, so the record is always complete. When you need to prove what happened to an asset and when, the timeline is already there.",
  },
  {
    id: 60,
    code: "ITAM-PORTFOLIO-REPORTING",
    catalog_tagline:
      "See total cost and portfolio position across your whole technology estate.",
    catalog_description:
      "Roll your assets, contracts, and lifecycle activity into total-cost-of-ownership and portfolio-position reporting that the whole organization can use. Spot redundant spend, plan refreshes, and answer finance, procurement, and leadership with numbers you trust. Turn a scattered estate into clear decisions about what to keep, renew, consolidate, or retire.",
  },
];

async function backfillCatalogUX(): Promise<{ domain: number; modules: number }> {
  console.log("[B1B-S1] Rule #20 catalog UX backfill (domain 3 + modules 57-60)");

  // Domain row.
  let domainWrites = 0;
  const [dom] = await get(
    "/domains?id=eq.3&select=id,catalog_tagline,catalog_description",
  );
  if (!dom) throw new Error("ITAM domain row (id=3) not found");
  const domBody: Row = {};
  if (String(dom.catalog_tagline ?? "") === "") domBody.catalog_tagline = domainCopy.catalog_tagline;
  if (String(dom.catalog_description ?? "") === "")
    domBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(domBody).length > 0) {
    await patch("/domains?id=eq.3", domBody);
    domainWrites = 1;
    console.log(`  PATCH domains.id=3 wrote [${Object.keys(domBody).join(", ")}]`);
  } else {
    console.log("  domains.id=3 catalog UX already populated; skipping");
  }

  // Modules.
  const liveMods = await get(
    "/domain_modules?id=in.(57,58,59,60)&select=id,domain_module_code,catalog_tagline,catalog_description",
  );
  const byId = new Map(liveMods.map(m => [Number(m.id), m]));
  let moduleWrites = 0;
  for (const m of moduleCopy) {
    const live = byId.get(m.id);
    if (!live) throw new Error(`module ${m.id} (${m.code}) not found`);
    const body: Row = {};
    if (String(live.catalog_tagline ?? "") === "") body.catalog_tagline = m.catalog_tagline;
    if (String(live.catalog_description ?? "") === "")
      body.catalog_description = m.catalog_description;
    if (Object.keys(body).length === 0) {
      console.log(`  module ${m.id} (${m.code}) catalog UX already populated; skipping`);
      continue;
    }
    await patch(`/domain_modules?id=eq.${m.id}`, body);
    moduleWrites++;
    console.log(`  PATCH domain_modules.id=${m.id} (${m.code}) wrote [${Object.keys(body).join(", ")}]`);
  }

  return { domain: domainWrites, modules: moduleWrites };
}

// ============================================================
// Guard: forbidden em-dash in any authored copy. Fail loudly before writing.
// ============================================================

function assertNoEmDash(): void {
  const blobs = [
    domainCopy.catalog_tagline,
    domainCopy.catalog_description,
    ...moduleCopy.flatMap(m => [m.catalog_tagline, m.catalog_description]),
  ];
  for (const b of blobs) {
    if (b.includes("—")) throw new Error(`em-dash found in authored copy: ${b}`);
  }
}

// ============================================================
// Main
// ============================================================

const start = Date.now();
assertNoEmDash();

const nEntity = await classifyMasters();
const nEvent = await backfillEventCategory();
const ux = await backfillCatalogUX();

console.log("\n=== SUMMARY ===");
console.log(`entity_type classified:        ${nEntity} (of 2 masters)`);
console.log(`event_category backfilled:     ${nEvent} (of 4 events)`);
console.log(`catalog UX domain rows:        ${ux.domain} (of 1)`);
console.log(`catalog UX module rows:        ${ux.modules} (of 4)`);
console.log(`\nITAM state-driven fixes complete in ${((Date.now() - start) / 1000).toFixed(1)}s`);
console.log("UI: https://tests.semantius.app/domain_map/data_objects?id=in.(54,55)");
console.log("UI: https://tests.semantius.app/domain_map/trigger_events");
console.log("UI: https://tests.semantius.app/domain_map/domains?id=eq.3");
console.log("UI: https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.3");
