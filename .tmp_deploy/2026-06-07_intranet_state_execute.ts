#!/usr/bin/env bun
// 2026-06-07 INTRANET state-driven Validate (Rule #21) executor.
//
// Scope (only the mechanically-additive / corrective open state items that EXECUTE):
//   1. B1B-A4-UX  -> PATCH domains.id=126 catalog_tagline + catalog_description
//                    (empty today; buyer-voice copy per Rule #20; the stale
//                     "surface-before-write" gate is overridden by the run order).
//   2. B2-ALIASES -> INSERT 5 generic synonyms into domain_aliases (B11), idempotent.
//
// NOT in scope (UNBUILT domain: 0 domain_modules, 0 masters): no module/master/handoff
// scaffold. Classification (leadership-tier vs real market vs hybrid) is an open user
// decision and is surfaced, not executed. Cascade is left.
//
// Idempotent: PATCH only writes when the field is empty; aliases insert only the missing.
// record_status omitted on new rows (defaults to 'new'); no `notes` column written (Rule #15).

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

const DOMAIN_ID = 126;

// ---------------------------------------------------------------------------
// 1. Catalog UX copy (B1B-A4-UX)
// ---------------------------------------------------------------------------
const CATALOG_TAGLINE =
  "Reach every employee, from HQ to the shop floor, with one connected internal communications platform.";
const CATALOG_DESCRIPTION =
  "Publish company news, target announcements by department or location, and reach desk-based and frontline workers across web and mobile. Track readership, manage editorial calendars, and run multi-step journeys for onboarding, change initiatives, and policy rollouts. Connect employee directories, surface knowledge across collaboration tools, and let teams amplify approved content on social channels.";

async function patchCatalogUx() {
  const [row] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!row) throw new Error(`domain id ${DOMAIN_ID} not found`);

  const patch: Row = {};
  if (!String(row.catalog_tagline ?? "").trim()) patch.catalog_tagline = CATALOG_TAGLINE;
  if (!String(row.catalog_description ?? "").trim())
    patch.catalog_description = CATALOG_DESCRIPTION;

  if (Object.keys(patch).length === 0) {
    console.log("catalog UX: both fields already non-empty, leaving untouched (no overwrite).");
    return;
  }
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body: patch });
  console.log(`catalog UX: PATCHed domains.id=${DOMAIN_ID} fields: ${Object.keys(patch).join(", ")}`);
}

// ---------------------------------------------------------------------------
// 2. Domain aliases (B2-ALIASES / B11): clearly-generic synonyms, no vendor names
// ---------------------------------------------------------------------------
const ALIASES = [
  "internal communications",
  "employee comms platform",
  "digital workplace platform",
  "employee app",
  "social intranet",
];

async function insertAliases() {
  const existing = await get(
    `/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias`,
  );
  const have = new Set(existing.map(r => String(r.alias).toLowerCase()));
  const missing = ALIASES.filter(a => !have.has(a.toLowerCase()));
  if (missing.length === 0) {
    console.log(`aliases: all ${ALIASES.length} already present, nothing to insert.`);
    return;
  }
  // record_status omitted (defaults 'new'); notes omitted (Rule #15).
  const body = missing.map(a => ({
    domain_id: DOMAIN_ID,
    label: a,
    alias: a,
    alias_type: "synonym",
  }));
  await call({ method: "POST", path: "/domain_aliases", body });
  console.log(`aliases: inserted ${missing.length} new rows (${existing.length} existed).`);
}

async function main() {
  console.log("== INTRANET 2026-06-07 state-driven execute ==");
  await patchCatalogUx();
  await insertAliases();

  // Verification read-back
  const [d] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=catalog_tagline,catalog_description`,
  );
  const aliasRows = await get(
    `/domain_aliases?domain_id=eq.${DOMAIN_ID}&select=alias&order=alias`,
  );
  console.log("\n-- verify --");
  console.log("catalog_tagline:", d?.catalog_tagline);
  console.log("catalog_description:", String(d?.catalog_description ?? "").slice(0, 60) + "...");
  console.log("aliases:", aliasRows.map(r => r.alias).join(" | "));

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.126");
  console.log("  https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.126");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
