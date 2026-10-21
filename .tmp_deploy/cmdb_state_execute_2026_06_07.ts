#!/usr/bin/env bun
// CMDB state-driven Validate execute (2026-06-07). SKILL.md Rule #21.
// Executes ONLY the agent-fixable additive/corrective open items from
// audits/CMDB/state.yaml:
//   1. B1A-ENTITY-TYPE  - PATCH data_objects.entity_type on the 5 CMDB masters
//   2. B2-8 Catalog UX  - PATCH catalog_tagline/catalog_description on domain 4
//                          and modules 108/109/110 (all currently empty)
//   3. B1A-M7           - INSERT ISO/IEC 19770-1 regulation + domain_regulations link
//   4. B1A-Pair-ITSM-1  - INSERT data_object_relationships service_changes(50)
//                          -> references -> ci_baselines(80)
//
// Idempotent: reads live, only writes what is missing / still empty. Never
// overwrites a non-empty catalog field (Rule #20). Never writes a `notes`
// column (Rule #15). No record_status stamped (defaults to 'new', Rule #1).

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
const post = (path: string, body: Row[] | Row) => call({ method: "POST", path, body });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

// ============================================================
// 1. entity_type classification (B1A-ENTITY-TYPE)
// ------------------------------------------------------------
// configuration_items (76): real-world workflow object (discovered ->
//   registered -> in_use -> retired -> archived) -> operational_workflow
// ci_relationships  (77): N:M graph edge between CIs -> junction
// ci_classes        (78): class taxonomy / config-shape -> catalog
// service_maps      (79): published business-service projection -> operational_workflow
// ci_baselines      (80): captured/validated/superseded snapshot -> operational_workflow
// ============================================================
const entityTypeByMaster: Record<number, string> = {
  76: "operational_workflow",
  77: "junction",
  78: "catalog",
  79: "operational_workflow",
  80: "operational_workflow",
};

async function execEntityTypes(): Promise<number> {
  const ids = Object.keys(entityTypeByMaster).map(Number);
  const live = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = entityTypeByMaster[id];
    const cur = String(r.entity_type ?? "");
    if (cur === want) {
      console.log(`  entity_type ${r.data_object_name}: already ${want}`);
      continue;
    }
    if (cur !== "" && cur !== "unclassified") {
      // Do not overwrite a real classification we did not author.
      console.log(
        `  entity_type ${r.data_object_name}: leaving existing '${cur}' (not null/unclassified)`,
      );
      continue;
    }
    await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
    console.log(`  entity_type ${r.data_object_name}: ${cur || "null"} -> ${want}`);
    patched++;
  }
  return patched;
}

// ============================================================
// 2. Catalog UX backfill (B2-8 / Rule #20). Buyer voice: workflow + value,
//    no vendor names, no em-dash, American English, no taxonomy/handoff talk.
//    Only writes when the field is currently empty (never overwrites).
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Keep one trusted record of every server, application, database, and the connections between them, so changes and incidents can be reasoned about in minutes.",
  catalog_description:
    "Build a single, authoritative picture of your IT estate. Bring infrastructure, applications, and the dependencies that tie them together into one place, organize it with a class model you control, and keep it current as the environment changes. When something breaks or a change is proposed, you can see exactly what it touches and what depends on it before you act.\n\nThe same trusted graph powers the work around it: map components up into the business services they support, capture point-in-time baselines to catch unauthorized drift, and give every record an owner who keeps it accurate. The result is faster, safer change, quicker incident diagnosis, and an estate you can stand behind at audit time.",
};

const moduleCopy: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  108: {
    catalog_tagline:
      "Maintain the authoritative inventory of every configuration item and the relationships that connect them.",
    catalog_description:
      "Register, classify, and govern every configuration item in one place, from servers and databases to applications and the dependencies that link them. Bring in records from across the environment, organize them under a class model you control, and move each item through its lifecycle from first sighting to retirement.\n\nWith ownership and access controls on the records that matter, the inventory stays trustworthy: people see what depends on what, changes are reasoned about against real relationships, and the rest of your IT operation works from a single source of truth.",
  },
  109: {
    catalog_tagline:
      "Map infrastructure and applications up into the business services they support.",
    catalog_description:
      "Turn a flat list of components into a living map of the services your business actually runs on. Connect applications, hosts, and dependencies into service views, publish them for the teams that rely on them, and keep them current as the underlying estate shifts.\n\nWhen an incident hits or a change is planned, you can see the affected service end to end and who it touches, so impact is understood before work begins instead of discovered afterward.",
  },
  110: {
    catalog_tagline:
      "Capture configuration baselines and catch unauthorized drift before it becomes an incident.",
    catalog_description:
      "Take point-in-time snapshots of how your configuration items are set up, then compare live state against those approved baselines on an ongoing basis. When something changes outside the approved path, you see the deviation early and can act on it.\n\nValidated baselines give change and compliance teams a defensible record of what good looks like, so drift is surfaced, reviewed, and resolved rather than left to surface as an outage or an audit finding.",
  },
};

async function execCatalogUx(): Promise<{ domain: number; modules: number }> {
  let domainWrites = 0;
  let moduleWrites = 0;

  // domain row 4
  const [dom] = await get(
    "/domains?id=eq.4&select=id,catalog_tagline,catalog_description",
  );
  if (dom) {
    const patchBody: Row = {};
    if (String(dom.catalog_tagline ?? "") === "")
      patchBody.catalog_tagline = domainCopy.catalog_tagline;
    if (String(dom.catalog_description ?? "") === "")
      patchBody.catalog_description = domainCopy.catalog_description;
    if (Object.keys(patchBody).length > 0) {
      await patch("/domains?id=eq.4", patchBody);
      domainWrites = Object.keys(patchBody).length;
      console.log(`  domain CMDB: wrote ${Object.keys(patchBody).join(", ")}`);
    } else {
      console.log("  domain CMDB: catalog copy already present, skipping");
    }
  }

  // modules 108/109/110
  const mods = await get(
    "/domain_modules?id=in.(108,109,110)&select=id,domain_module_code,catalog_tagline,catalog_description",
  );
  for (const m of mods) {
    const id = Number(m.id);
    const copy = moduleCopy[id];
    if (!copy) continue;
    const patchBody: Row = {};
    if (String(m.catalog_tagline ?? "") === "")
      patchBody.catalog_tagline = copy.catalog_tagline;
    if (String(m.catalog_description ?? "") === "")
      patchBody.catalog_description = copy.catalog_description;
    if (Object.keys(patchBody).length > 0) {
      await patch(`/domain_modules?id=eq.${id}`, patchBody);
      moduleWrites += Object.keys(patchBody).length;
      console.log(`  module ${m.domain_module_code}: wrote ${Object.keys(patchBody).join(", ")}`);
    } else {
      console.log(`  module ${m.domain_module_code}: catalog copy already present, skipping`);
    }
  }
  return { domain: domainWrites, modules: moduleWrites };
}

// ============================================================
// 3. ISO/IEC 19770-1 regulation + CMDB link (B1A-M7)
// ============================================================
async function execIso19770(): Promise<{ regInserted: boolean; linkInserted: boolean }> {
  let regId: number | null = null;
  const existing = await get(
    "/regulations?or=(regulation_code.eq.ISO-19770-1,regulation_name.ilike.*19770-1*)&select=id,regulation_code",
  );
  if (existing.length > 0) {
    regId = Number(existing[0].id);
    console.log(`  regulation ISO-19770-1: already present (id ${regId})`);
  } else {
    const [ins] = await post("/regulations", {
      regulation_name: "ISO/IEC 19770-1 IT Asset Management",
      regulation_code: "ISO-19770-1",
      regulation_type: "industry_standard",
      jurisdiction_id: 1, // International
      issuing_body: "ISO/IEC",
      regulation_url: "",
      certification_required: false,
      description:
        "Process framework for IT asset management. Sets the management-system requirements an organization uses to govern its hardware and software assets, with the configuration record acting as the substrate that asset and license management build on.",
    });
    regId = Number(ins.id);
    console.log(`  regulation ISO-19770-1: inserted id ${regId}`);
  }

  // domain_regulations link CMDB(4) -> regId
  const link = await get(
    `/domain_regulations?domain_id=eq.4&regulation_id=eq.${regId}&select=id`,
  );
  let linkInserted = false;
  if (link.length > 0) {
    console.log(`  domain_regulations CMDB->ISO-19770-1: already present (id ${link[0].id})`);
  } else {
    const [linkIns] = await post("/domain_regulations", {
      domain_id: 4,
      regulation_id: regId,
      applicability: "mandatory",
    });
    console.log(`  domain_regulations CMDB->ISO-19770-1: inserted id ${linkIns.id}`);
    linkInserted = true;
  }
  return { regInserted: existing.length === 0, linkInserted };
}

// ============================================================
// 4. service_changes(50) -> references -> ci_baselines(80) (B1A-Pair-ITSM-1)
// ============================================================
async function execServiceChangeBaselineEdge(): Promise<boolean> {
  const existing = await get(
    "/data_object_relationships?data_object_id=eq.50&related_data_object_id=eq.80&select=id,relationship_verb",
  );
  if (existing.length > 0) {
    console.log(`  rel service_changes->ci_baselines: already present (id ${existing[0].id})`);
    return false;
  }
  const [ins] = await post("/data_object_relationships", {
    data_object_id: 50,
    related_data_object_id: 80,
    relationship_verb: "references",
    inverse_verb: "referenced_by_change",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    is_required: false,
    owner_side: "target",
  });
  console.log(`  rel service_changes->ci_baselines: inserted id ${ins.id}`);
  return true;
}

// ============================================================
async function main() {
  console.log("== B1A-ENTITY-TYPE ==");
  const etCount = await execEntityTypes();

  console.log("== B2-8 Catalog UX ==");
  const ux = await execCatalogUx();

  console.log("== B1A-M7 ISO/IEC 19770-1 ==");
  const iso = await execIso19770();

  console.log("== B1A-Pair-ITSM-1 service_changes->ci_baselines ==");
  const relInserted = await execServiceChangeBaselineEdge();

  console.log("\n== SUMMARY ==");
  console.log(`entity_type PATCHed:           ${etCount} master(s)`);
  console.log(`catalog fields written:        domain ${ux.domain}, modules ${ux.modules}`);
  console.log(`ISO-19770-1 reg inserted:      ${iso.regInserted}`);
  console.log(`ISO-19770-1 link inserted:     ${iso.linkInserted}`);
  console.log(`service_changes->baselines rel: ${relInserted ? "inserted" : "already present"}`);

  console.log("\nUI:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.4");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.4");
  console.log("  https://tests.semantius.app/domain_map/regulations?regulation_code=eq.ISO-19770-1");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
