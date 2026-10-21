#!/usr/bin/env bun
// State-driven Validate execute for the CONV-AI domain (domain_id=34), 2026-06-07.
//
// CONV-AI is an UNBUILT domain (0 domain_modules, 0 capability_domains). Per the
// state-driven contract, no scaffolding is done here. This loader executes only the
// module-independent additive/corrective items that survive on an unbuilt domain:
//
//   1. entity_type classification (Rule #12 / B13) on the 5 CONV-AI masters,
//      each currently 'unclassified'. Deterministic from each description.
//   2. Catalog UX copy (Rule #20) on the CONV-AI domains row: catalog_tagline +
//      catalog_description, both currently empty strings. No module rows exist, so
//      module-grain catalog copy is N/A.
//
// Idempotent: every PATCH is guarded on the pre-write value (only touch unclassified
// entity_type; only fill an EMPTY catalog field). Non-empty values are never overwritten.

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

const DOMAIN_ID = 34;

// ------------------------------------------------------------------
// 1. entity_type classification (Rule #12 enum)
//    operational_workflow: authored, publish/disable lifecycle masters.
//    operational_record:  persisted runtime records (no authored workflow).
// ------------------------------------------------------------------
const ENTITY_TYPE: Record<number, string> = {
  699: "operational_workflow", // bot_definitions  (authored config, publish-locked)
  700: "operational_workflow", // intent_definitions (authored spec, publish-locked)
  701: "operational_workflow", // conversation_flows (authored dialogue state machine)
  259: "operational_record",   // conversation_transcripts (runtime log record)
  260: "operational_record",   // intent_detections (runtime NLU output record)
};

async function fixEntityTypes(): Promise<number> {
  const ids = Object.keys(ENTITY_TYPE).join(",");
  const live = await get(
    `/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const want = ENTITY_TYPE[id];
    if (!want) continue;
    const cur = String(r.entity_type ?? "");
    if (cur === "unclassified" || cur === "" || cur === "null") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: want });
      console.log(`  entity_type: ${r.data_object_name} (${id}) ${cur || "null"} -> ${want}`);
      patched++;
    } else {
      console.log(`  entity_type: ${r.data_object_name} (${id}) already '${cur}', skip`);
    }
  }
  return patched;
}

// ------------------------------------------------------------------
// 2. Catalog UX copy (Rule #20) on the domains row. Buyer voice,
//    workflow + value, no vendor/product names, no em-dash, American English.
//    Only written when the live value is an empty string.
// ------------------------------------------------------------------
const CATALOG_TAGLINE =
  "Deploy virtual agents that resolve customer and employee questions across chat and voice, around the clock.";

const CATALOG_DESCRIPTION =
  "Conversational AI lets you stand up self-service assistants that understand what a person is asking and carry the conversation through to a resolution. Teams author bots, intents, and dialogue flows once, train them on real utterances, and publish them to every channel a customer or employee uses, from web chat and messaging apps to voice. " +
  "At runtime each conversation is captured turn by turn, intents are detected and scored, and unresolved or sensitive requests are handed off to a live agent with full context. The result is faster answers, lower contact volume in the service center, and a transcript trail that feeds analytics, compliance, and continuous improvement. " +
  "Buy this when you want to deflect routine inquiries, give support and operations teams a way to build and govern automated conversations without deep engineering, and keep human agents focused on the cases that genuinely need them.";

async function fixCatalogCopy(): Promise<number> {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,domain_code,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error(`Domain ${DOMAIN_ID} not found`);
  const body: Row = {};
  if (!String(dom.catalog_tagline ?? "").trim()) body.catalog_tagline = CATALOG_TAGLINE;
  else console.log(`  catalog_tagline already set, skip`);
  if (!String(dom.catalog_description ?? "").trim()) body.catalog_description = CATALOG_DESCRIPTION;
  else console.log(`  catalog_description already set, skip`);
  if (Object.keys(body).length === 0) return 0;
  await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
  console.log(`  catalog copy: wrote ${Object.keys(body).join(", ")} on domain ${dom.domain_code}`);
  return Object.keys(body).length;
}

// em-dash guard: refuse to load if any authored string carries U+2014.
function assertNoEmDash(): void {
  const corpus = [CATALOG_TAGLINE, CATALOG_DESCRIPTION].join("\n");
  if (corpus.includes("—")) throw new Error("Em-dash found in authored copy; aborting.");
}

async function main(): Promise<void> {
  assertNoEmDash();
  console.log("== CONV-AI state-driven execute (2026-06-07) ==");
  console.log("-- entity_type classification --");
  const et = await fixEntityTypes();
  console.log("-- catalog UX copy --");
  const cc = await fixCatalogCopy();
  console.log("");
  console.log(`Done. entity_type patched: ${et}; catalog fields written: ${cc}.`);
  console.log("UI: https://tests.semantius.app/domain_map/data_objects");
  console.log("UI: https://tests.semantius.app/domain_map/domains");
}

await main();
