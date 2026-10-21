#!/usr/bin/env bun
// PORT-MONIT (Portfolio Monitoring for Private Capital) state-driven Validate execute
// (2026-06-07). Executes only the non-blocked additive/corrective items from
// audits/PORT-MONIT/state.yaml per SKILL.md Rule #21.
//
// Items executed here:
//   1. entity_type PATCH (B1A-ENTITY-TYPE / B13 / Rule #12): 7 masters unclassified.
//      Per-master classification:
//        763 portfolio_companies        -> operational_workflow (active/exited/written_off)
//        764 portco_kpi_periods         -> operational_workflow (KPI submission cycle)
//        765 portco_esg_records         -> operational_workflow (ESG submission cycle)
//        766 portco_valuations          -> operational_workflow (submit_lock + single_approver)
//        767 fund_position_returns      -> computed (per-position IRR/MOIC/TVPI/DPI calc)
//        768 fund_performance_periods   -> computed (fund-level derived metrics + PME + J-curve)
//        769 lp_quarterly_reports       -> operational_workflow (draft/review/published/archived)
//   2. Catalog UX (Rule #20): domain 161 + 4 modules (16,17,18,19) catalog_tagline +
//      catalog_description, all currently empty. Buyer-voice; no vendor names; no em-dash.
//   3. data_object_aliases (B1A-S6 / B11): generic synonyms on the 6 non-aliased masters
//      (alias_type='synonym'; masters carry no industry_id so no industry conditioning).
//   4. trigger_event 1188 (portco_valuation.final) domain_module_id NULL -> 17
//      (deterministic NULL module-FK backfill; master 766 is mastered in module 17).
//
// Idempotent: reads live before every write; only inserts missing / patches still-empty.
// All inserts land at record_status default ('new'); no approved/pending stamping.

import { } from "bun";

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

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const DOMAIN_ID = 161;
const MASTER_IDS = [763, 764, 765, 766, 767, 768, 769];

// ============================================================
// 1. entity_type PATCH (B1A-ENTITY-TYPE / B13 / Rule #12)
// ============================================================
const ENTITY_TYPES: Record<number, string> = {
  763: "operational_workflow",
  764: "operational_workflow",
  765: "operational_workflow",
  766: "operational_workflow",
  767: "computed",
  768: "computed",
  769: "operational_workflow",
};

async function patchEntityTypes(): Promise<number> {
  const live = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  let n = 0;
  for (const r of live) {
    const target = ENTITY_TYPES[Number(r.id)];
    if (!target) continue;
    if (r.entity_type !== "unclassified" && r.entity_type !== null) {
      // Already classified; never overwrite a non-unclassified value.
      continue;
    }
    await call({
      method: "PATCH",
      path: `/data_objects?id=eq.${r.id}`,
      body: { entity_type: target },
    });
    console.log(`  entity_type: ${r.data_object_name} (${r.id}) -> ${target}`);
    n++;
  }
  if (n === 0) console.log("  entity_type: all 7 masters already classified, nothing to patch");
  return n;
}

// ============================================================
// 2. Catalog UX (Rule #20): domain + 4 modules
// ============================================================
const DOMAIN_TAGLINE =
  "Turn raw portfolio company data into LP-ready performance, valuations, and fund returns in one place.";
const DOMAIN_DESCRIPTION =
  "Run the full private capital monitoring cycle without stitching spreadsheets together. Collect KPI and ESG data from portfolio companies each reporting period, mark holdings to fair value with a defensible methodology trail, and compute fund and position returns (IRR, MOIC, TVPI, DPI) across vintages with public market equivalent benchmarking and J-curve normalization. Then package quarterly LP performance reports that tie every fund-level number back to the underlying marks. Built so investment teams, fund controllers, and investor relations work from one source of truth, close reporting cycles faster, and answer LP questions with confidence.";

const MODULE_COPY: Record<number, { tagline: string; description: string }> = {
  16: {
    tagline:
      "Collect KPI, ESG, and diversity data from every portfolio company on a predictable reporting cadence.",
    description:
      "Stand up a reliable pipeline for the numbers behind every holding. Request and capture KPI submissions per portfolio company each period, gather ESG and diversity metrics for LP disclosure, and review and accept what comes in before it flows downstream. Keep a clean, period-by-period record of revenue, runway, headcount, margins, and sustainability indicators so analysts stop chasing data and start comparing it across the portfolio.",
  },
  17: {
    tagline:
      "Mark holdings to fair value each cycle with a methodology trail you can defend in an audit.",
    description:
      "Produce quarter-end fair-value marks per portfolio company with the valuation methodology recorded alongside every number. Move each mark through proposal, review, and approval, lock it once final, and keep the rationale attached so the audit trail is complete. Built for the fair-value reporting that LPs and auditors expect, with a single-approver gate where it matters.",
  },
  18: {
    tagline:
      "Compute fund and position returns across vintages with benchmarking and J-curve normalization.",
    description:
      "Roll holdings up into the performance numbers that define a fund: time-weighted IRR, MOIC, TVPI, and DPI at both the position and fund level. Normalize for the J-curve on early-stage vintages and benchmark against public market equivalents so results are comparable and credible. Give the team aggregate dashboards over the whole portfolio instead of a maze of disconnected return calculations.",
  },
  19: {
    tagline:
      "Package quarterly LP performance reports that tie every fund number back to the marks behind it.",
    description:
      "Assemble the quarterly story LPs read: position-level marks, fund-level performance metrics, GP commentary, and portfolio highlights in one report per fund. Move each report through draft, review, and publication, and lock it once distributed so the version LPs receive is the version of record. Turn the latest valuations and returns into a polished, defensible LP narrative without rebuilding it by hand every quarter.",
  },
};

async function patchOneCatalog(
  table: string,
  id: number,
  tagline: string,
  description: string,
): Promise<number> {
  const [row] = await get(
    `/${table}?id=eq.${id}&select=id,catalog_tagline,catalog_description`,
  );
  if (!row) throw new Error(`${table} ${id} not found`);
  const body: Row = {};
  if (!row.catalog_tagline || String(row.catalog_tagline).trim() === "") {
    body.catalog_tagline = tagline;
  }
  if (!row.catalog_description || String(row.catalog_description).trim() === "") {
    body.catalog_description = description;
  }
  if (Object.keys(body).length === 0) {
    console.log(`  catalog UX: ${table} ${id} already populated, nothing to write`);
    return 0;
  }
  await call({ method: "PATCH", path: `/${table}?id=eq.${id}`, body });
  console.log(`  catalog UX: ${table} ${id} wrote ${Object.keys(body).join(" + ")}`);
  return Object.keys(body).length;
}

async function patchCatalogCopy(): Promise<number> {
  let n = 0;
  n += await patchOneCatalog("domains", DOMAIN_ID, DOMAIN_TAGLINE, DOMAIN_DESCRIPTION);
  for (const [idStr, copy] of Object.entries(MODULE_COPY)) {
    n += await patchOneCatalog("domain_modules", Number(idStr), copy.tagline, copy.description);
  }
  return n;
}

// ============================================================
// 3. data_object_aliases (B1A-S6 / B11): generic synonyms
// ============================================================
// Generic descriptive synonyms only (Rule #18: no vendor/product names).
// Masters carry no industry_id, so alias_type='synonym' (not industry_term).
const ALIASES: Record<number, string[]> = {
  764: ["portco_metrics", "kpi_packets"],        // portco_kpi_periods
  765: ["esg_packets", "sustainability_reports"], // portco_esg_records
  766: ["fair_value_marks", "quarterly_marks"],  // portco_valuations
  767: ["position_returns", "position_irr_records"], // fund_position_returns
  768: ["fund_quarterly_metrics"],               // fund_performance_periods
  769: ["lp_quarterly_packets", "gp_reports"],   // lp_quarterly_reports
};

async function insertAliases(): Promise<number> {
  const live = await get(
    `/data_object_aliases?data_object_id=in.(${MASTER_IDS.join(",")})&select=data_object_id,alias_name`,
  );
  const existing = new Set(
    live.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const rows: Row[] = [];
  for (const [doidStr, names] of Object.entries(ALIASES)) {
    const doid = Number(doidStr);
    for (const name of names) {
      if (existing.has(`${doid}|${name.toLowerCase()}`)) continue;
      rows.push({
        data_object_id: doid,
        alias_name: name,
        alias_type: "synonym",
        is_preferred: false,
      });
    }
  }
  if (rows.length === 0) {
    console.log("  aliases: all enumerated synonyms already present");
    return 0;
  }
  await insert("/data_object_aliases", rows);
  console.log(`  aliases: inserted ${rows.length} synonym rows across 6 masters`);
  return rows.length;
}

// ============================================================
// 4. trigger_event 1188 NULL module-FK backfill
// ============================================================
// portco_valuation.final's master (766 portco_valuations) is mastered in module 17.
async function patchTriggerEventModule(): Promise<number> {
  const [ev] = await get(
    `/trigger_events?id=eq.1188&select=id,event_name,domain_module_id`,
  );
  if (!ev) {
    console.log("  trigger_event: 1188 not found, skipping");
    return 0;
  }
  if (ev.domain_module_id !== null && ev.domain_module_id !== undefined) {
    console.log(`  trigger_event: 1188 already has domain_module_id=${ev.domain_module_id}, nothing to backfill`);
    return 0;
  }
  await call({
    method: "PATCH",
    path: `/trigger_events?id=eq.1188`,
    body: { domain_module_id: 17 },
  });
  console.log("  trigger_event: 1188 (portco_valuation.final) domain_module_id NULL -> 17");
  return 1;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("PORT-MONIT state-driven execute (2026-06-07)\n");

  console.log("1. entity_type PATCH (B1A-ENTITY-TYPE / B13 / Rule #12):");
  const nEntity = await patchEntityTypes();

  console.log("\n2. Catalog UX (Rule #20), domain + 4 modules:");
  const nCatalog = await patchCatalogCopy();

  console.log("\n3. data_object_aliases (B1A-S6 / B11):");
  const nAlias = await insertAliases();

  console.log("\n4. trigger_event NULL module-FK backfill:");
  const nTrig = await patchTriggerEventModule();

  console.log("\n=== SUMMARY ===");
  console.log(`  entity_type patched:        ${nEntity}`);
  console.log(`  catalog fields written:     ${nCatalog}`);
  console.log(`  alias rows inserted:        ${nAlias}`);
  console.log(`  trigger_event FK backfilled: ${nTrig}`);

  console.log("\n=== UI LINKS ===");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(763,764,765,766,767,768,769)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.161");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.161");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(764,765,766,767,768,769)");
  console.log("  https://tests.semantius.app/domain_map/trigger_events?id=eq.1188");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
