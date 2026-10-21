#!/usr/bin/env bun
// State-driven execute for KMS (Knowledge Management), 2026-06-07.
// Works ONLY the open EXECUTE-class items in audits/KMS/state.yaml; idempotent
// (read live, act only on what is still open). KMS is UNBUILT (0 domain_modules),
// so B1B-S1 module build is SURFACED, not scaffolded; the M/F/B10b cascade is left.
//
// Write types (all additive/corrective; record_status omitted -> default 'new'):
//   1. B1A-S6: corrective normalization on domains row 33:
//        - business_logic: replace the U+2014 em-dash with a comma (no-em-dash rule)
//        - description: British "organisational" -> American "organizational"
//      Surgical typography/spelling fix mandated by CLAUDE.md + prompt HARD RULES;
//      meaning preserved, not a content overwrite. Empty-guard not applicable
//      (corrective, in place), but each write is verified live before applying.
//   2. B1A-S7: PATCH event_category on the 8 KMS-master-source trigger_events
//      (754-758, 761 -> lifecycle; 759, 760 -> signal). Only fills rows still ''.
//   3. B1B-B11: INSERT generic-synonym data_object_aliases on the 6 KMS masters
//      (alias_type='synonym', no industry_id). Idempotent on (data_object_id, alias_name).
//   4. B12 / Rule #12: PATCH data_objects.entity_type off 'unclassified' on the 6 masters.
//   5. A4 catalog UX (Rule #20): author buyer-voice catalog_tagline + catalog_description
//      into the empty fields on domain 33. Never overwrite a non-empty value.
//      (No modules exist, so there is no module-level catalog UX to write.)

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
async function post(path: string, body: Row[]): Promise<Row[]> {
  return call({ method: "POST", path, body });
}

const DOMAIN_ID = 33;
const EM_DASH = "—";

// ============================================================
// 1. B1A-S6: corrective normalization on the domain row
// ============================================================
async function fixDomainText(): Promise<number> {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,description,business_logic`,
  );
  if (!dom) throw new Error("domain 33 not found");
  const body: Row = {};

  const bl = String(dom.business_logic ?? "");
  if (bl.includes(EM_DASH)) {
    // "corpus <em-dash> vector" -> "corpus, vector"
    body.business_logic = bl.replace(/\s*—\s*/g, ", ");
  }

  const desc = String(dom.description ?? "");
  if (/organis/i.test(desc)) {
    body.description = desc
      .replace(/organisational/g, "organizational")
      .replace(/Organisational/g, "Organizational")
      .replace(/organisation/g, "organization")
      .replace(/Organisation/g, "Organization");
  }

  if (Object.keys(body).length === 0) {
    console.log("  domain text: no em-dash / British spelling left, nothing to do");
    return 0;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
  console.log(`  domain 33 text corrected: ${Object.keys(body).join(", ")}`);
  return 1;
}

// ============================================================
// 2. B1A-S7: event_category fills on 8 trigger_events
// ============================================================
const EVENT_CATEGORY: Record<number, string> = {
  754: "lifecycle", // knowledge_base_article.published
  755: "lifecycle", // knowledge_base_article.deprecated
  756: "lifecycle", // knowledge_base_article.updated
  757: "lifecycle", // knowledge_category.restructured
  758: "lifecycle", // article_revision.approved
  759: "signal", // article_feedback.negative (quality signal)
  760: "signal", // knowledge_search_query.no_result (retrieval gap signal)
  761: "lifecycle", // knowledge_collection.published
};

async function fillEventCategories(): Promise<number> {
  const ids = Object.keys(EVENT_CATEGORY).join(",");
  const rows = await get(
    `/trigger_events?id=in.(${ids})&select=id,event_name,event_category`,
  );
  let n = 0;
  for (const r of rows) {
    const cur = String(r.event_category ?? "");
    if (cur.trim() !== "") {
      console.log(`  trigger_event ${r.id} (${r.event_name}): already '${cur}', skipping`);
      continue;
    }
    const cat = EVENT_CATEGORY[Number(r.id)];
    await patch(`/trigger_events?id=eq.${r.id}`, { event_category: cat });
    console.log(`  trigger_event ${r.id} (${r.event_name}) event_category -> ${cat}`);
    n++;
  }
  return n;
}

// ============================================================
// 3. B1B-B11: generic-synonym aliases on the 6 masters
// ============================================================
const ALIASES: { data_object_id: number; names: string[] }[] = [
  {
    data_object_id: 410, // knowledge_base_articles
    names: ["KB Article", "Support Article", "Help Center Article", "Wiki Page"],
  },
  {
    data_object_id: 411, // knowledge_categories
    names: ["KB Taxonomy", "Category", "Topic"],
  },
  {
    data_object_id: 412, // article_revisions
    names: ["Article Version", "Draft", "Edit History"],
  },
  {
    data_object_id: 413, // article_feedback
    names: ["Article Rating", "Helpfulness Vote"],
  },
  {
    data_object_id: 414, // knowledge_search_queries
    names: ["KB Search", "Help Search Query", "Knowledge Lookup"],
  },
  {
    data_object_id: 415, // knowledge_collections
    names: ["KB Space", "Playbook", "Knowledge Pack"],
  },
];

async function loadAliases(): Promise<number> {
  const doIds = ALIASES.map(a => a.data_object_id).join(",");
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${doIds})&select=data_object_id,alias_name`,
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert: Row[] = [];
  for (const grp of ALIASES) {
    for (const name of grp.names) {
      const key = `${grp.data_object_id}|${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      toInsert.push({
        data_object_id: grp.data_object_id,
        alias_name: name,
        alias_type: "synonym",
        is_preferred: false,
      });
    }
  }
  if (toInsert.length === 0) {
    console.log("  aliases: all already present, nothing to insert");
    return 0;
  }
  await post("/data_object_aliases", toInsert);
  console.log(`  data_object_aliases inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
// 4. B12 / Rule #12: classify entity_type on the 6 masters
// ============================================================
const ENTITY_TYPE: Record<number, string> = {
  410: "operational_workflow", // articles: draft/in_review/published[gated]/retired
  411: "catalog", // taxonomy referenced by articles
  412: "operational_record", // per-article version / edit-history trail
  413: "operational_workflow", // feedback: submitted/triaged/closed
  414: "operational_record", // append-only search event stream
  415: "catalog", // curated grouping / collection config
};

async function classifyEntityTypes(): Promise<number> {
  const ids = Object.keys(ENTITY_TYPE).join(",");
  const rows = await get(
    `/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`,
  );
  let n = 0;
  for (const r of rows) {
    const cur = r.entity_type;
    if (cur !== null && cur !== "unclassified") {
      console.log(`  ${r.data_object_name} (${r.id}): already '${cur}', skipping`);
      continue;
    }
    const et = ENTITY_TYPE[Number(r.id)];
    await patch(`/data_objects?id=eq.${r.id}`, { entity_type: et });
    console.log(`  entity_type -> ${et} on ${r.data_object_name} (${r.id})`);
    n++;
  }
  return n;
}

// ============================================================
// 5. A4 catalog UX (Rule #20): buyer-voice copy into empty fields only
// ============================================================
const DOMAIN_COPY = {
  catalog_tagline:
    "Capture, organize, and govern your organization's know-how, then surface the right answer wherever people and assistants ask for it.",
  catalog_description:
    "Turn scattered tribal knowledge into a single trusted corpus. Authors draft articles, route them through review and approval, publish them to the audiences that need them, and retire what is out of date, with every revision tracked so you always know what changed and who approved it.\n\nOrganize the corpus with categories and taxonomies, group related material into curated collections, and gather reader feedback so the articles that fall short get flagged and fixed. See what people actually search for, where the answer was found, and where the search came up empty, so the gaps become a worklist instead of a guess.\n\nFeed the same governed corpus to help centers, support agents, and AI assistants, so self-service deflection, agent answers, and retrieval-augmented assistants all draw from one reviewed source of truth instead of stale copies scattered across teams.",
};

async function authorCatalogUX(): Promise<number> {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  const body: Row = {};
  if (!dom?.catalog_tagline || String(dom.catalog_tagline).trim() === "")
    body.catalog_tagline = DOMAIN_COPY.catalog_tagline;
  if (!dom?.catalog_description || String(dom.catalog_description).trim() === "")
    body.catalog_description = DOMAIN_COPY.catalog_description;
  if (Object.keys(body).length === 0) {
    console.log("  domain catalog UX: both fields already non-empty, skipping");
    return 0;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
  console.log(`  domain 33 catalog UX written: ${Object.keys(body).join(", ")}`);
  return 1;
}

// ============================================================
// guard: no em-dash anywhere in the copy we are about to write
// ============================================================
function assertNoEmDash() {
  const blobs = [
    DOMAIN_COPY.catalog_tagline,
    DOMAIN_COPY.catalog_description,
    ...ALIASES.flatMap(a => a.names),
  ];
  for (const b of blobs) {
    if (b.includes(EM_DASH)) throw new Error(`em-dash found in authored copy: ${b}`);
  }
}

async function main() {
  assertNoEmDash();

  console.log("== 1. B1A-S6 domain text correction ==");
  const textFix = await fixDomainText();

  console.log("== 2. B1A-S7 event_category fills ==");
  const evCount = await fillEventCategories();

  console.log("== 3. B1B-B11 aliases ==");
  const aliasCount = await loadAliases();

  console.log("== 4. B12 entity_type classification ==");
  const etCount = await classifyEntityTypes();

  console.log("== 5. A4 catalog UX ==");
  const uxCount = await authorCatalogUX();

  console.log("\n== SUMMARY ==");
  console.log(`  domain text corrections: ${textFix}`);
  console.log(`  trigger_events event_category filled: ${evCount}`);
  console.log(`  data_object_aliases inserted: ${aliasCount}`);
  console.log(`  entity_type PATCHed: ${etCount}`);
  console.log(`  domain catalog UX written: ${uxCount}`);
}

await main();
