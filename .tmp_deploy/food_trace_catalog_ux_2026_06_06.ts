#!/usr/bin/env bun
// B1A-CATALOG-UX (FOOD-TRACE, domain 155; modules 256/257/258)
// Rule #20: write buyer-voice catalog_tagline + catalog_description straight into
// EMPTY fields. Empty-guard per field: only write where the current value is "".
// NEVER overwrite a non-empty value. record_status carries the review signal.

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }

// Buyer voice (workflow + value). No vendor/product names. No em-dashes. American English.
const DOMAIN_COPY = {
  tagline:
    "Trace every lot from origin to shelf, prove provenance, and execute recalls in hours instead of days.",
  description:
    "Capture the critical tracking events and key data elements that food safety rules require, so any lot can be traced forward to its customers and backward to its source on demand. When a problem surfaces, identify every affected lot from the genealogy graph, notify the right consignees, place stock on hold, and file the required regulatory submissions from one place.\n\nKeep supplier certifications, origin claims, and provenance documents current and verifiable, with expiry and renewal tracking so a lapsed certificate never slips through. Respond to regulator and trading-partner trace requests within the mandated window, and turn day-to-day production records into an audit-ready traceability trail.",
};

const MODULE_COPY: Record<number, { tagline: string; description: string }> = {
  256: {
    tagline:
      "Record receive, transform, and ship events against lot codes and walk lot genealogy in both directions.",
    description:
      "Log the critical tracking events and key data elements for every lot as it moves through receiving, transformation, and shipping. Each event is tied to a lot code so the full history of a product is always reconstructable.\n\nWalk the genealogy graph forward from a raw-material lot through transformation to finished goods, or backward from a finished SKU to its sources, and produce the sortable record needed to answer a traceback request inside the required timeframe.",
  },
  257: {
    tagline:
      "Run a recall end to end: find affected lots, notify consignees, hold stock, and file with regulators.",
    description:
      "Start a recall and immediately identify every affected lot using lot genealogy, then classify it by severity to set the right notification and filing path. Track who has been notified, what stock is on hold, and what has been recovered, all against a single recall record.\n\nKeep a defensible communications log per recipient, file the required regulatory submissions, verify that the recall was effective, and close it out with a complete, audit-ready trail.",
  },
  258: {
    tagline:
      "Keep supplier certifications and provenance claims current, verified, and ready for audit.",
    description:
      "Hold supplier certifications in one vault with expiry and renewal tracking, so an out-of-date or revoked certificate is caught before it affects a shipment. Onboard new documents, validate them, and flag the ones that need attention.\n\nVerify origin and provenance claims against the documents that back them, and surface trustworthy provenance to the people and partners who depend on it.",
  },
};

async function patchIfEmpty(path: string, current: Row, copy: { tagline: string; description: string }, label: string) {
  const body: Row = {};
  if ((current.catalog_tagline ?? "") === "") body.catalog_tagline = copy.tagline;
  else console.log(`  SKIP ${label} catalog_tagline (non-empty, overwrite-protected)`);
  if ((current.catalog_description ?? "") === "") body.catalog_description = copy.description;
  else console.log(`  SKIP ${label} catalog_description (non-empty, overwrite-protected)`);
  if (Object.keys(body).length === 0) { console.log(`  ${label}: nothing to write`); return; }
  await call({ method: "PATCH", path, body });
  console.log(`  PATCHed ${label}: [${Object.keys(body).join(", ")}]`);
}

// Domain 155
const dom = (await get("/domains?id=eq.155&select=id,catalog_tagline,catalog_description"))[0];
await patchIfEmpty("/domains?id=eq.155", dom, { tagline: DOMAIN_COPY.tagline, description: DOMAIN_COPY.description }, "domain FOOD-TRACE");

// Modules 256/257/258
const mods = await get("/domain_modules?id=in.(256,257,258)&select=id,domain_module_code,catalog_tagline,catalog_description");
for (const m of mods) {
  const id = Number(m.id);
  await patchIfEmpty(`/domain_modules?id=eq.${id}`, m, MODULE_COPY[id], `module ${m.domain_module_code}`);
}

// Verify
const domV = await get("/domains?id=eq.155&select=catalog_tagline,catalog_description");
const modsV = await get("/domain_modules?id=in.(256,257,258)&select=domain_module_code,catalog_tagline,catalog_description");
console.log("\nVERIFY domain:", JSON.stringify(domV));
console.log("VERIFY modules non-empty:", modsV.map((m: Row) => `${m.domain_module_code}: tag=${(m.catalog_tagline as string).length>0} desc=${(m.catalog_description as string).length>0}`).join(" | "));
