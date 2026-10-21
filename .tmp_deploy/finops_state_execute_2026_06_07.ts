#!/usr/bin/env bun
// FINOPS state-driven execute pass (2026-06-07).
// Domain is UNBUILT (0 domain_modules, 0 capability_domains, 0 master data_objects):
// per Rule #21 / SKILL.md line 1498 we do NOT scaffold the build. The whole module +
// capability + master + DMDO + skill cascade (B1A-M1, B1A-A2, B1A-B-DMDO, B1A-F-SKILL,
// B1A-B10B-*, B1A-B9-ATTRIB, B1A-BUILD) is the build decision and stays SURFACED.
//
// The only cascade-independent, mechanical, additive item that touches an existing row:
//   - catalog_tagline + catalog_description on the FINOPS domain row (both empty) per Rule #20.
//
// entity_type (Rule #12): vacuous - FINOPS masters nothing, 0 data_objects owned.
// event_category (Rule #13): vacuous - the only related trigger_event (158) is mis-attributed
//   to supplier_invoices (S2P-mastered, a b2 fork) and already carries event_category='threshold'.
// APQC H1: vacuous - all 9 cross-domain handoffs already carry handoff_processes rows.
//
// Idempotent: reads live first, writes only when each target column is still empty.
// Never flips record_status; never overwrites a non-empty value.

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

const DOMAIN_ID = 41;

// ---- catalog UX copy (Rule #20 buyer voice; workflow + value; no vendor/product names per
//      Rule #18; no em-dash U+2014; American English) ----
const CATALOG_TAGLINE =
  "See, allocate, and optimize cloud spend before it surprises you at month-end.";
const CATALOG_DESCRIPTION =
  "Turn an unpredictable cloud bill into a cost line every team can read and own. Pull raw spending from every cloud account into one normalized view, then attribute it by tag, account, team, product, or unit so finance, engineering, and product owners all see the same number and agree on what caused it. Catch anomalies the moment a service starts overspending instead of discovering it on the invoice, and forecast where the next billing cycle is heading.\n\nThe practice closes the loop from visibility to action. Set budgets per team or product that raise an alert before a threshold is crossed, and act on rightsizing, idle-resource cleanup, and commitment-purchase recommendations that lower the bill without slowing delivery. Unit-economics views tie spend back to the business, so cost per customer, per transaction, or per workload becomes a metric leaders can manage rather than a mystery they absorb.";

async function main() {
  console.log("== FINOPS catalog_tagline + catalog_description (Rule #20) ==");
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,domain_code,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error("FINOPS domain row 41 not found");
  if (dom.domain_code !== "FINOPS") {
    throw new Error(`Expected FINOPS at id ${DOMAIN_ID}, got '${dom.domain_code}'`);
  }
  const body: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    body.catalog_tagline = CATALOG_TAGLINE;
  } else {
    console.log("  SKIP catalog_tagline: already non-empty");
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    body.catalog_description = CATALOG_DESCRIPTION;
  } else {
    console.log("  SKIP catalog_description: already non-empty");
  }
  if (Object.keys(body).length > 0) {
    await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
    console.log(`  SET domain 41 fields: ${Object.keys(body).join(", ")}`);
  } else {
    console.log("  catalog UX: nothing to write (both fields already populated)");
  }

  console.log("\n== Done ==");
  console.log(`catalog fields written: ${Object.keys(body).length}`);
  console.log("\nUI link:");
  console.log("  https://tests.semantius.app/domain_map/domains");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
