#!/usr/bin/env bun
// SKILLS-MGMT (domain 169) state-driven Validate execute, 2026-06-07.
// Executes only the additive/corrective open state items that are agent-fixable:
//   B1A-ENTITY-TYPE  PATCH 7 masters unclassified -> typed enum (only if unclassified)
//                    catalog: skill_taxonomies(852), skills(854), competency_models(857)
//                    operational_workflow: skill_profiles(172), skill_assessments(855),
//                                          skill_endorsements(856), skill_inference_runs(858)
//   B2-1 (A4/M8)     PATCH domain 169 + modules 173/174 catalog_tagline + catalog_description
//                    (empty-guarded; buyer voice; no vendor names; American English; no em-dash)
//   B11 aliases      INSERT skill_taxonomies generic synonyms (idempotent by data_object_id+alias_name)
// NOT executed here (surfaced/blocked): B1A-S2 (new trigger_events authoring),
//   B1B-S3/B1B-TLNTINTEL-FANOUT (blocked on S2), B1A-S4/S5 (blocked on B2-2), b2 destructive items.
// Idempotent: reads live before every write; never overwrites a non-empty value.
// Run from project root:  bun run ".tmp_deploy/skills_mgmt_state_execute_2026_06_07.ts"

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
const post = (path: string, body: Row | Row[]) => call({ method: "POST", path, body });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

// ---------------------------------------------------------------------------
// B1A-ENTITY-TYPE  (per-master target type)
// ---------------------------------------------------------------------------
const ENTITY_TYPE: Record<number, "catalog" | "operational_workflow"> = {
  852: "catalog",              // skill_taxonomies  (config/taxonomy referenced by others)
  854: "catalog",              // skills            (ontology node definitions)
  857: "catalog",              // competency_models (configured role-to-skill bundles)
  172: "operational_workflow", // skill_profiles    (initialized->self_assessed->validated->inactive)
  855: "operational_workflow", // skill_assessments (pending->completed/cancelled)
  856: "operational_workflow", // skill_endorsements(requested->issued->revoked)
  858: "operational_workflow", // skill_inference_runs (queued->running->completed/failed)
};

async function fixEntityType() {
  const ids = Object.keys(ENTITY_TYPE).join(",");
  const rows = await get(
    `/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of rows) {
    const et = String(r.entity_type ?? "");
    const target = ENTITY_TYPE[Number(r.id)];
    if (et === "unclassified" || et === "" || r.entity_type === null) {
      await patch(`/data_objects?id=eq.${r.id}`, { entity_type: target });
      console.log(`  entity_type: ${r.data_object_name} (${r.id}) -> ${target}`);
      patched++;
    } else {
      console.log(`  entity_type: ${r.data_object_name} (${r.id}) already '${et}', skip`);
    }
  }
  console.log(`B1A-ENTITY-TYPE: patched ${patched} masters`);
  return patched;
}

// ---------------------------------------------------------------------------
// B11 aliases  (clearly-enumerated generic synonyms on skill_taxonomies)
// ---------------------------------------------------------------------------
const ALIASES: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 852, alias_name: "skills ontology" },
  { data_object_id: 852, alias_name: "competency framework" },
];

async function loadAliases() {
  const ids = [...new Set(ALIASES.map(a => a.data_object_id))].join(",");
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${ids})&select=id,data_object_id,alias_name`,
  );
  const have = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert = ALIASES.filter(
    a => !have.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  ).map(a => ({
    data_object_id: a.data_object_id,
    alias_name: a.alias_name,
    alias_type: "synonym",
    is_preferred: false,
  }));
  if (toInsert.length > 0) {
    await post("/data_object_aliases", toInsert);
    console.log(`B11 aliases: inserted ${toInsert.length} synonym rows on skill_taxonomies`);
  } else {
    console.log(`B11 aliases: all already present, skip`);
  }
  return toInsert.length;
}

// ---------------------------------------------------------------------------
// B2-1 (A4 + M8) catalog UX (empty-guarded, buyer voice)
// ---------------------------------------------------------------------------
const DOMAIN_TAGLINE =
  "Give every team one trusted view of who can do what, with a living skills graph that learning, mobility, and planning all read from.";
const DOMAIN_DESCRIPTION =
  "Build one source of truth for skills across your workforce. Curate a shared skills ontology and competency frameworks, then keep a current skill profile for every worker that other talent processes can rely on.\n\n" +
  "Let skills surface themselves. Pull signals from learning, performance, and recruiting, infer skills automatically, and combine them with self-ratings, assessments, and peer endorsements so each profile stays accurate without manual upkeep.\n\n" +
  "Turn skills into decisions. Compare people against role requirements, see where the gaps are, and feed clean skill and gap signals to learning, internal mobility, and workforce planning so the right people get to the right work.";

const MODULE_COPY: Record<number, { tagline: string; description: string }> = {
  173: {
    tagline:
      "Curate the shared skills ontology and the role-to-skill competency frameworks the rest of the business reads from.",
    description:
      "Own the language of skills. Define and organize skills, relationships, and proficiency scales in one curated ontology so every team is talking about the same thing.\n\n" +
      "Tie skills to roles. Build competency frameworks that say what each role needs, and publish versions cleanly so downstream profiles and gap analysis always assess against the current standard.\n\n" +
      "Govern change with confidence. Move taxonomies and competency models through draft, active, and deprecated states, and signal each change so profiles and inferences re-key against the new substrate.",
  },
  174: {
    tagline:
      "Keep an accurate, up-to-date skill profile for every worker, blending inference, assessment, and endorsement.",
    description:
      "Maintain a living profile for each person. Combine inferred skills, self-ratings, formal assessments, and peer endorsements into one profile that reflects what someone can actually do.\n\n" +
      "Let evidence build the picture. Run inference against incoming signals, capture assessments and validations, and record endorsements so proficiency reflects real activity rather than a one-time survey.\n\n" +
      "Find and close the gaps. Compare profiles to role requirements, produce gap and inventory analytics, and hand clean signals to learning, mobility, and planning so development effort lands where it matters.",
  },
};

async function fixDomainCatalog() {
  const [d] = await get(
    `/domains?id=eq.169&select=id,catalog_tagline,catalog_description`,
  );
  if (!d) throw new Error("domain 169 not found");
  const body: Row = {};
  if (!String(d.catalog_tagline ?? "").trim()) body.catalog_tagline = DOMAIN_TAGLINE;
  if (!String(d.catalog_description ?? "").trim()) body.catalog_description = DOMAIN_DESCRIPTION;
  if (Object.keys(body).length > 0) {
    await patch(`/domains?id=eq.169`, body);
    console.log(`B2-1 (A4): wrote domain 169 catalog fields: ${Object.keys(body).join(", ")}`);
    return 1;
  }
  console.log(`B2-1 (A4): domain 169 catalog fields already populated, skip`);
  return 0;
}

async function fixModuleCatalog() {
  const mods = await get(
    `/domain_modules?id=in.(173,174)&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  let count = 0;
  for (const m of mods) {
    const copy = MODULE_COPY[Number(m.id)];
    if (!copy) continue;
    const body: Row = {};
    if (!String(m.catalog_tagline ?? "").trim()) body.catalog_tagline = copy.tagline;
    if (!String(m.catalog_description ?? "").trim()) body.catalog_description = copy.description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      console.log(`B2-1 (M8): wrote module ${m.domain_module_code} (${m.id}) catalog fields: ${Object.keys(body).join(", ")}`);
      count++;
    } else {
      console.log(`B2-1 (M8): module ${m.domain_module_code} (${m.id}) already populated, skip`);
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("== SKILLS-MGMT state execute 2026-06-07 ==");
  const etCount = await fixEntityType();
  const aliasCount = await loadAliases();
  const domCount = await fixDomainCatalog();
  const modCount = await fixModuleCatalog();

  console.log("\n== Summary ==");
  console.log(`entity_type patched: ${etCount}`);
  console.log(`aliases inserted: ${aliasCount}`);
  console.log(`domain catalog rows written: ${domCount}`);
  console.log(`module catalog rows written: ${modCount}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(172,852,854,855,856,857,858)");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=eq.852");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.169");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.169");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
