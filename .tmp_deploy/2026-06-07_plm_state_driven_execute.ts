#!/usr/bin/env bun
// 2026-06-07 PLM state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/NULL fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// PLM (domain 165) is BUILT: 5 full modules (66 PLM-ENG-CORE, 67 PLM-CAD-PDM,
// 68 PLM-MFG-PROCESS, 69 PLM-COMPLIANCE, 70 PLM-REQUIREMENTS), 12 masters.
//
// EXECUTE (this loader):
//   1. B1A-ENTITY-TYPE (B13): classify 9 of 12 masters unclassified -> Rule #12 enum.
//        - 6 workflow-bearing masters (already carry lifecycle states) -> operational_workflow
//        - engineering_bom_items (799) -> junction  (BOM line, follows parent part)
//        - plm_product_variants  (804) -> catalog   (configurator/variant rules)
//        - regulated_substances  (806) -> catalog   (regulator reference data)
//      The 3 ambiguous masters cad_models (800), cad_drawings (801),
//      manufacturing_routings (803) are LEFT unclassified and SURFACED in
//      B2-LIFECYCLE-STATES-6-MASTERS (their classification IS that b2 decision:
//      workflow-bearing vs config-shape).
//   2. Catalog UX (Rule #20): author EMPTY catalog_tagline/description on domain
//      165 and on all 5 modules. Never overwrites a non-empty value.
//   3. B1A-B9B-INTRA-DOMAIN (B9b): insert 6 intra-domain handoffs
//      (source_domain_id=target_domain_id=165), integration_pattern
//      'lifecycle_progression', friction per the state spec (low default;
//      medium for COMPLIANCE->ENG-CORE expiry).
//
// SURFACED, not executed (b2 / destructive / personas / blocked / superseded):
//   B2-CATALOG-COPY (gate ignored per prompt, executed above), B2-LIFECYCLE-STATES-6-MASTERS,
//   B2-E6-RBAC-CONVENTION, B2-H1-APPROVE-TAGS (record_status flip = user-only),
//   B1A-PHASE-P personas, B1B-* blocked, B1A-F2/B2-F2 RETIRED (per-module skills),
//   B3-PLM-PORTFOLIO backlog.

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
    const err = stderr.trim();
    if (err.includes("required audience not found")) {
      console.error(
        "\n*** JWT AUDIENCE ERROR - STOPPING per SKILL Rule #6 ***\n" +
          err +
          "\nCommand body: " +
          JSON.stringify(body) +
          "\n",
      );
      process.exit(2);
    }
    throw new Error(`semantius call failed (exit ${exitCode}): ${err}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
async function post(path: string, body: Row[]): Promise<Row[]> {
  if (body.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < body.length; i += CHUNK) {
    const res = await call({ method: "POST", path, body: body.slice(i, i + CHUNK) });
    out.push(...res);
  }
  return out;
}

// ============================================================
// 1. entity_type classification (B13 / Rule #12)
// ============================================================
const PLM_MASTER_IDS = [796, 797, 798, 799, 800, 801, 802, 803, 804, 805, 806, 807];
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  // 6 workflow-bearing masters (carry lifecycle state machines today)
  { id: 796, name: "engineering_parts", entity_type: "operational_workflow" },
  { id: 797, name: "engineering_revisions", entity_type: "operational_workflow" },
  { id: 798, name: "engineering_change_orders", entity_type: "operational_workflow" },
  { id: 802, name: "manufacturing_boms", entity_type: "operational_workflow" },
  { id: 805, name: "product_compliance_declarations", entity_type: "operational_workflow" },
  { id: 807, name: "engineering_requirements", entity_type: "operational_workflow" },
  // 3 unambiguous non-workflow masters
  { id: 799, name: "engineering_bom_items", entity_type: "junction" },
  { id: 804, name: "plm_product_variants", entity_type: "catalog" },
  { id: 806, name: "regulated_substances", entity_type: "catalog" },
  // 800 cad_models, 801 cad_drawings, 803 manufacturing_routings -> LEFT unclassified
  //   (surfaced as B2-LIFECYCLE-STATES-6-MASTERS; classification is the b2 decision)
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification (B13) ==");
  const live = await get(
    `/data_objects?id=in.(${PLM_MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  const cur = new Map(live.map(r => [Number(r.id), String(r.entity_type ?? "")]));
  let n = 0;
  for (const e of entityTypes) {
    const c = cur.get(e.id);
    if (c && c !== "unclassified") {
      console.log(`  skip ${e.name}: already '${c}'`);
      continue;
    }
    await patch(`/data_objects?id=eq.${e.id}`, { entity_type: e.entity_type });
    console.log(`  set  ${e.name} -> ${e.entity_type}`);
    n++;
  }
  const stillUnclassified = live
    .filter(r => String(r.entity_type ?? "") === "unclassified" &&
      !entityTypes.find(e => e.id === Number(r.id)))
    .map(r => `${r.id} ${r.data_object_name}`);
  console.log(`  entity_type updated: ${n}`);
  console.log(`  deliberately left unclassified (b2-surfaced): ${stillUnclassified.join(", ") || "none"}`);
  return n;
}

// ============================================================
// 2. Catalog UX (Rule #20) - writes EMPTY fields only, never overwrites
// ============================================================
const domainCopy = {
  catalog_tagline: "Run the digital thread of every product from concept to end of life.",
  catalog_description:
    "Hold the single source of truth for what a physical product is and how it changes over time. Author and release the part master, engineering BOM, and revisions; drive every change through a controlled change-order workflow with impact analysis and approval; keep CAD models and drawings in a managed vault; hand a clean manufacturing BOM and routing to the shop floor; trace requirements from definition through verification; and prove material and substance compliance for each market you ship into. Replace scattered spreadsheets and folder shares with a connected as-designed, as-built, and as-maintained chain that downstream manufacturing, procurement, and service teams can trust.",
};

type ModCopy = { id: number; code: string; tagline: string; description: string };
const moduleCopy: ModCopy[] = [
  {
    id: 66,
    code: "PLM-ENG-CORE",
    tagline: "Own the part master, BOM, and engineering change control.",
    description:
      "Author and release engineering parts, revisions, and bills of material, then govern every change through a structured change-order workflow: open the change, run a where-used impact assessment, take it through review and approval, and release the controlled result. Keep one authoritative item master that the rest of the product record extends, so a released part means the same thing to engineering, manufacturing, and procurement.",
  },
  {
    id: 67,
    code: "PLM-CAD-PDM",
    tagline: "Vault, version, and release your CAD models and drawings.",
    description:
      "Give design teams a managed vault for CAD models and drawings with check-in, check-out, and revision history so the latest controlled geometry is never in doubt. Tie each model and drawing to its engineering part and release it as the controlled artifact that manufacturing and field service rely on, ending the lost-file and wrong-version problems of shared folders.",
  },
  {
    id: 68,
    code: "PLM-MFG-PROCESS",
    tagline: "Turn the engineering BOM into a buildable manufacturing process.",
    description:
      "Translate the as-designed engineering BOM into a manufacturing BOM and routing the shop floor can actually build, and resolve configurable products into concrete variants at order time. Release the manufacturing process as a controlled output so production execution and ERP pick up a consistent, costed, change-aware definition instead of a hand-reconciled copy.",
  },
  {
    id: 69,
    code: "PLM-COMPLIANCE",
    tagline: "Prove material and substance compliance for every market.",
    description:
      "Collect supplier material declarations, track regulated substances, and roll the results up into product compliance declarations that show each part meets the rules for the regions you sell into. Manage declaration validity and expiry, re-flag affected parts when a declaration lapses, and keep an auditable record for regulators instead of scrambling for evidence after the fact.",
  },
  {
    id: 70,
    code: "PLM-REQUIREMENTS",
    tagline: "Trace requirements from definition through verification.",
    description:
      "Capture and decompose product requirements, link them to the parts and changes that satisfy them, and build a traceability matrix that shows what is covered, reviewed, approved, and verified. Catch unmet or orphaned requirements before release so the product you ship is the product that was actually specified.",
  },
];

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  // domain
  const [dom] = await get("/domains?id=eq.165&select=catalog_tagline,catalog_description");
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim()) dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.165", dBody);
    console.log(`  domain 165: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 165: already populated, skip");
  }
  // modules
  const mods = await get(
    "/domain_modules?domain_id=eq.165&select=id,domain_module_code,catalog_tagline,catalog_description",
  );
  const modById = new Map(mods.map(m => [Number(m.id), m]));
  for (const mc of moduleCopy) {
    const live = modById.get(mc.id);
    if (!live) {
      console.log(`  WARN: module ${mc.code} (${mc.id}) not found live, skip`);
      continue;
    }
    const body: Row = {};
    if (!String(live.catalog_tagline ?? "").trim()) body.catalog_tagline = mc.tagline;
    if (!String(live.catalog_description ?? "").trim()) body.catalog_description = mc.description;
    if (Object.keys(body).length) {
      await patch(`/domain_modules?id=eq.${mc.id}`, body);
      console.log(`  module ${mc.code} (${mc.id}): wrote ${Object.keys(body).join(", ")}`);
      n++;
    } else {
      console.log(`  module ${mc.code} (${mc.id}): already populated, skip`);
    }
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 3. intra-domain handoffs (B9b / B1A-B9B-INTRA-DOMAIN)
// ============================================================
// 6 cross-module flows implied by data_object_relationships. Trigger events
// resolved live (engineering_part.released 1211, engineering_change_order.released
// 1210, cad_drawing.released 1215, product_compliance_declaration.expired 1474).
// integration_pattern='lifecycle_progression' (in-process state read, no message
// moves). friction 'low' default; 'medium' for the COMPLIANCE->ENG-CORE expiry.
// Natural key for idempotency: (src, tgt, srcmod, tgtmod, event, data_object).
const intraHandoffs: {
  source_domain_module_id: number;
  target_domain_module_id: number;
  data_object_id: number;
  trigger_event_id: number;
  friction_level: string;
  description: string;
}[] = [
  {
    source_domain_module_id: 66, target_domain_module_id: 67,
    data_object_id: 796, trigger_event_id: 1211, friction_level: "low",
    description: "A released engineering part promotes its latest revision into the CAD vault index so design teams check out and reference the correct controlled geometry. Low friction: both modules share the same item master in-process.",
  },
  {
    source_domain_module_id: 66, target_domain_module_id: 68,
    data_object_id: 798, trigger_event_id: 1210, friction_level: "low",
    description: "A released engineering change order signals manufacturing process management to refresh the manufacturing BOM and routing for the affected parts. Low friction: the change order and the manufacturing process read the same engineering record in-process.",
  },
  {
    source_domain_module_id: 66, target_domain_module_id: 69,
    data_object_id: 796, trigger_event_id: 1211, friction_level: "low",
    description: "A released engineering part triggers compliance to request or refresh supplier material declarations and roll up the part's substance compliance. Low friction: compliance extends the same released item master.",
  },
  {
    source_domain_module_id: 66, target_domain_module_id: 70,
    data_object_id: 796, trigger_event_id: 1211, friction_level: "low",
    description: "A released engineering part updates the requirements traceability matrix so coverage and verification status reflect the released design. Low friction: requirements management reads the released part state directly.",
  },
  {
    source_domain_module_id: 67, target_domain_module_id: 68,
    data_object_id: 801, trigger_event_id: 1215, friction_level: "low",
    description: "A released CAD drawing becomes the controlled artifact that the manufacturing routing references for work instructions and inspection. Low friction: the vault and the manufacturing process share the released drawing in-process.",
  },
  {
    source_domain_module_id: 69, target_domain_module_id: 66,
    data_object_id: 805, trigger_event_id: 1474, friction_level: "medium",
    description: "An expired product compliance declaration re-flags the affected engineering part for change-order review so a non-compliant part cannot stay silently released. Medium friction: a lapse re-opens a controlled engineering record and forces a change decision.",
  },
];

async function insertIntraHandoffs() {
  console.log("\n== 3. intra-domain handoffs (B9b) ==");
  const existing = await get(
    "/handoffs?source_domain_id=eq.165&target_domain_id=eq.165&select=source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id",
  );
  const seen = new Set(
    existing.map(
      r => `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.data_object_id}|${r.trigger_event_id}`,
    ),
  );
  const toInsert = intraHandoffs
    .filter(
      h => !seen.has(
        `${h.source_domain_module_id}|${h.target_domain_module_id}|${h.data_object_id}|${h.trigger_event_id}`,
      ),
    )
    .map(h => ({
      source_domain_id: 165,
      target_domain_id: 165,
      source_domain_module_id: h.source_domain_module_id,
      target_domain_module_id: h.target_domain_module_id,
      data_object_id: h.data_object_id,
      trigger_event_id: h.trigger_event_id,
      integration_pattern: "lifecycle_progression",
      friction_level: h.friction_level,
      description: h.description,
      notes: "",
    }));
  console.log(
    `  ${intraHandoffs.length} proposed; ${intraHandoffs.length - toInsert.length} already present; ${toInsert.length} to insert`,
  );
  if (toInsert.length) {
    const created = await post("/handoffs", toInsert);
    for (const c of created)
      console.log(`  +handoff ${c.id}: mod ${c.source_domain_module_id} -> ${c.target_domain_module_id} (${c.friction_level})`);
  }
  console.log(`  intra-domain handoffs inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
async function main() {
  console.log("=== PLM state-driven Validate execute - 2026-06-07 ===");
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
    intra_handoffs: await insertIntraHandoffs(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(796,797,798,799,800,801,802,803,804,805,806,807)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.165");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.165");
  console.log("  https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.165&target_domain_id=eq.165");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
