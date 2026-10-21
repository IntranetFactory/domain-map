#!/usr/bin/env bun
// DAM state-driven Validate execute pass (2026-06-07).
// Executes the additive/corrective open items from audits/DAM/state.yaml.
//
// DAM is an UNBUILT domain: 0 domain_modules, 1 capability (CREATIVE-REVIEW 446),
// 1 master data_object (digital_assets 137). Per the brief's LEAVE rule, the build
// itself (B1B-S1 module set) and the whole b1b cascade are SURFACED, not scaffolded.
// Only the genuinely mechanical, agent-fixable items run here:
//
//   1. entity_type PATCH on digital_assets (137): unclassified -> operational_workflow
//      (Rule #12). digital_assets has a workflow: trigger digital_asset.published (46)
//      plus the upload/review/approve/publish/archive lifecycle.
//   2. Em-dash sanitization (B1A-S12, CLAUDE.md em-dash policy): domains.92
//      business_logic carries a U+2014 between "watermark)" and "irreducible".
//      Replace the em-dash with a comma. Mechanical policy-compliance correction;
//      meaning is preserved, no vendor names present (Rule #18 not implicated).
//   3. Catalog UX (Rule #20, supersedes the stale B2-S4 surface-before-write gate):
//      author buyer-voice catalog_tagline + catalog_description on domain 92 (both
//      empty). No module copy authored: DAM has 0 modules.
//
// Idempotent: reads live before each write; patches only what is missing/wrong.
// All catalog text: no em-dashes, no vendor names, American English. No DELETE,
// no record_status flip, no overwrite of a non-empty value (the business_logic
// patch is a same-meaning policy correction, not a semantic overwrite).

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

const DOMAIN_ID = 92;
const DIGITAL_ASSETS_ID = 137;
const EMDASH = "—";

// ============================================================
// 1. entity_type PATCH (Rule #12 enum)
// ============================================================
async function patchEntityType(): Promise<number> {
  const [r] = await get(
    `/data_objects?id=eq.${DIGITAL_ASSETS_ID}&select=id,data_object_name,entity_type`,
  );
  if (!r) throw new Error("digital_assets (137) not found");
  const target = "operational_workflow";
  if (r.entity_type === target) {
    console.log(`  SKIP entity_type: already '${target}'`);
    return 0;
  }
  if (r.entity_type !== "unclassified") {
    console.log(`  SKIP entity_type: '${r.entity_type}' already typed (not unclassified)`);
    return 0;
  }
  await call({
    method: "PATCH",
    path: `/data_objects?id=eq.${DIGITAL_ASSETS_ID}`,
    body: { entity_type: target },
  });
  console.log(`  PATCH digital_assets entity_type -> ${target}`);
  return 1;
}

// ============================================================
// 2. Em-dash sanitization (B1A-S12, CLAUDE.md policy)
// ============================================================
async function sanitizeEmDash(): Promise<number> {
  const [r] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,business_logic`,
  );
  if (!r) throw new Error("DAM domain row not found");
  const cur = String(r.business_logic ?? "");
  if (!cur.includes(EMDASH)) {
    console.log("  SKIP business_logic: no em-dash present");
    return 0;
  }
  // Replace " <emdash> " (with optional surrounding spaces) by ", " so the prose
  // reads cleanly. Then collapse any em-dash that lacked surrounding spaces.
  let next = cur.replace(/\s*—\s*/g, ", ");
  if (next.includes(EMDASH)) next = next.replace(/—/g, ", ");
  await call({
    method: "PATCH",
    path: `/domains?id=eq.${DOMAIN_ID}`,
    body: { business_logic: next },
  });
  console.log(`  PATCH business_logic em-dash -> comma`);
  console.log(`    new: ${next}`);
  return 1;
}

// ============================================================
// 3. Catalog UX (Rule #20) on the domain row
// ============================================================
const DAM_TAGLINE =
  "Give every team one trusted home for approved photos, video, and brand files, so the right asset is always easy to find, share, and use on brand.";

const DAM_DESCRIPTION =
  "Digital asset management gives marketing, brand, and creative teams a single, organized library for the photos, videos, logos, and design files the business produces and depends on. Instead of hunting through scattered drives, inboxes, and folders, people upload assets once, tag them, and find them again in seconds through search, categories, and curated collections.\n\n" +
  "Built into that library is the control the brand needs: assets move through review and approval before they go live, usage rights and model releases are tracked against each file, and version history keeps the latest approved cut front and center. When an asset is ready, teams generate the right size and format for each channel and share it through expiring, watermarked links or push it straight to the websites, stores, and partners that need it.\n\n" +
  "The payoff is speed and consistency at once: creative work gets reused instead of recreated, every channel ships the approved version, and brand and legal stay confident that what goes out into the world is current, licensed, and on brand.";

async function patchCatalogUx(): Promise<number> {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error("DAM domain row not found");
  const body: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    body.catalog_tagline = DAM_TAGLINE;
  } else {
    console.log("  SKIP catalog_tagline: already populated");
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    body.catalog_description = DAM_DESCRIPTION;
  } else {
    console.log("  SKIP catalog_description: already populated");
  }
  if (Object.keys(body).length === 0) return 0;
  // Defensive em-dash guard on authored copy.
  for (const [k, v] of Object.entries(body)) {
    if (String(v).includes(EMDASH)) throw new Error(`authored ${k} contains an em-dash`);
  }
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
  console.log(`  PATCH domain ${DOMAIN_ID} catalog UX: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ============================================================
// Run
// ============================================================
console.log("== DAM state-driven execute 2026-06-07 ==");
console.log("\n[1] entity_type PATCH");
const nEntity = await patchEntityType();
console.log("\n[2] em-dash sanitization (business_logic)");
const nEmdash = await sanitizeEmDash();
console.log("\n[3] catalog UX");
const nCatalog = await patchCatalogUx();

console.log("\n== Summary ==");
console.log(`entity_type patched: ${nEntity}`);
console.log(`business_logic em-dash sanitized: ${nEmdash}`);
console.log(`catalog UX fields written: ${nCatalog}`);

// Verify
console.log("\n== Verify ==");
const [vdo] = await get(
  `/data_objects?id=eq.${DIGITAL_ASSETS_ID}&select=data_object_name,entity_type`,
);
console.log(`  digital_assets entity_type: ${vdo.entity_type}`);
const [vdom] = await get(
  `/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description,business_logic`,
);
console.log(`  catalog_tagline empty? ${!vdom.catalog_tagline}`);
console.log(`  catalog_description empty? ${!vdom.catalog_description}`);
console.log(`  business_logic has em-dash? ${String(vdom.business_logic).includes(EMDASH)}`);

console.log("\nDone.");
