#!/usr/bin/env bun
// SALES-PERF state-driven Validate (2026-06-07): execute B1B-A1 only.
// Writes catalog_tagline + catalog_description on the SALES-PERF domains row (id 102),
// which are currently empty strings (A4 fail). Per the audit brief's Catalog UX (Rule #20)
// execute clause, the stale "surface-before-write" approval gate is ignored: empty domain-row
// catalog UX is authored and written in buyer voice (workflow + value), no vendor names,
// no em-dash, American English.
//
// Idempotent: reads the live row first and only PATCHes a field if it is currently empty.
// Never overwrites a non-empty value. No record_status change. No notes write.

import {} from "bun";

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

const DOMAIN_ID = 102;

const TAGLINE =
  "Plan, allocate, and pay your sales organization. Design territories and quotas, " +
  "model commission plans, and run accurate commission statements every period.";

const DESCRIPTION = [
  "Sales Performance Management runs the planning and pay side of your sales motion. " +
    "Design territories and roll up quotas to match your go-to-market segments, then build " +
    "commission plans with the rate tables, accelerators, draws, and SPIFs your sales leaders " +
    "need to motivate the team.",
  "Each period, every credited transaction flows into the engine, calculates commissions per " +
    "plan, and posts a payee statement your sellers can audit. Sellers raise disputes against " +
    "statements, finance signs off on commission expense, and the next plan cycle starts with " +
    "clean territory and quota data.",
  "Built for sales-ops and rev-ops teams who own quota strategy and commission accuracy, with " +
    "finance partnering on commission expense (ASC 606 amortization) and HR partnering on payee " +
    "eligibility.",
].join("\n\n");

function assertNoEmDash(label: string, s: string): void {
  if (s.includes("—")) {
    throw new Error(`${label} contains an em-dash (U+2014); forbidden by project rules.`);
  }
}

async function main(): Promise<void> {
  assertNoEmDash("tagline", TAGLINE);
  assertNoEmDash("description", DESCRIPTION);

  const [row] = await call({
    method: "GET",
    path: `/domains?id=eq.${DOMAIN_ID}&select=id,domain_code,catalog_tagline,catalog_description`,
  });
  if (!row) throw new Error(`SALES-PERF domain id ${DOMAIN_ID} not found`);
  if (row.domain_code !== "SALES-PERF") {
    throw new Error(`id ${DOMAIN_ID} is ${row.domain_code}, not SALES-PERF; aborting`);
  }

  const patch: Row = {};
  const taglineEmpty = !row.catalog_tagline || String(row.catalog_tagline).trim() === "";
  const descEmpty =
    !row.catalog_description || String(row.catalog_description).trim() === "";

  if (taglineEmpty) patch.catalog_tagline = TAGLINE;
  else console.log("  catalog_tagline already non-empty; leaving untouched.");

  if (descEmpty) patch.catalog_description = DESCRIPTION;
  else console.log("  catalog_description already non-empty; leaving untouched.");

  if (Object.keys(patch).length === 0) {
    console.log("Nothing to write: both catalog UX fields are already populated.");
    return;
  }

  const updated = await call({
    method: "PATCH",
    path: `/domains?id=eq.${DOMAIN_ID}`,
    body: patch,
  });
  console.log(`PATCHed SALES-PERF (id ${DOMAIN_ID}) fields: ${Object.keys(patch).join(", ")}`);
  console.log(JSON.stringify(updated, null, 2));
  console.log("\nUI: https://tests.semantius.app/domain_map/domains?id=eq.102");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
