#!/usr/bin/env bun
// COMP-MGMT state-driven execute (2026-06-07).
//
// Resolves the agent-executable open items in audits/COMP-MGMT/state.yaml against the
// live domain_map module. State snapshot (last_audit 2026-05-31) is stale; every item
// is re-verified live before writing. Idempotent throughout.
//
//   B1A-ENTITY-TYPE   PATCH entity_type on the 7 masters (all 'unclassified' live).
//                     5 operational_workflow (lifecycle-bearing), 2 catalog (config-shape:
//                     salary_bands, compensation_benchmarks - no lifecycle states, reference data).
//   B1A-A4            Backfill empty catalog_tagline + catalog_description on domains row 60.
//   B1A-M8            Backfill empty catalog_tagline + catalog_description on the 4 modules
//                     (78 COMP-PLANNING, 79 COMP-INCENTIVES, 80 COMP-BENCHMARKING, 85 COMP-STATEMENTS).
//   B1A-B11           INSERT 14 data_object_aliases (generic synonyms) across the 7 masters.
//   B1A-B8            INSERT 3 outbound payload-target data_object_relationships
//                     (merit_recommendations/equity_grants/compensation_statements -> employees).
//   B1A-S9            INSERT 6 agent_curated handoff_processes (clean PCF matches) for the
//                     6 of 7 untagged cross-domain handoffs. Handoff 1105 (pay_equity.gap_detected)
//                     has no clean PCF match -> deferred to Discover (NOT written here).
//
// Per-field empty-guard on every catalog write; never overwrite a non-empty value.
// record_status omitted (DB default 'new', Rule #1). notes omitted (Rule #15).

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

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const out: Row = {};
    for (const k of keys)
      out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// ============================================================
// B1A-ENTITY-TYPE - classify the 7 masters (Rule #12 enum)
// ============================================================
// operational_workflow: lifecycle-bearing business objects.
// catalog: config / reference data with no lifecycle (salary_bands = pay-range
//          reference; compensation_benchmarks = externally-sourced market dataset).
const entityTypeByMaster: Record<number, string> = {
  153: "operational_workflow", // compensation_plans (draft/active/archived)
  154: "catalog", // salary_bands (no lifecycle, config-shape reference)
  155: "operational_workflow", // merit_cycles (6-state workflow)
  156: "operational_workflow", // merit_recommendations (draft/submitted/approved/rejected/finalized)
  157: "operational_workflow", // compensation_statements (draft/generated/delivered/acknowledged)
  158: "operational_workflow", // equity_grants (proposed/.../forfeited/expired)
  159: "catalog", // compensation_benchmarks (no lifecycle, external dataset)
};

async function classifyEntityTypes(): Promise<{ patched: number; guarded: number }> {
  const ids = Object.keys(entityTypeByMaster).map(Number);
  const live = await get(
    `/data_objects?id=in.(${ids.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  let guarded = 0;
  for (const o of live) {
    const id = Number(o.id);
    const want = entityTypeByMaster[id];
    if (!want) continue;
    const cur = String(o.entity_type ?? "");
    // Only PATCH if null or 'unclassified' (never overwrite a real classification).
    if (cur === "" || cur === "unclassified") {
      await call({
        method: "PATCH",
        path: `/data_objects?id=eq.${id}`,
        body: { entity_type: want },
      });
      patched++;
      console.log(`  PATCHED ${o.data_object_name} (${id}) entity_type -> ${want}`);
    } else {
      guarded++;
      console.log(
        `  GUARD: ${o.data_object_name} (${id}) already classified '${cur}', skipped`,
      );
    }
  }
  return { patched, guarded };
}

// ============================================================
// B1A-A4 + B1A-M8 - buyer-voice catalog copy (Rule #20)
// ============================================================
// Voice: workflow + value, what the buyer can do. No vendor/product names
// (Rule #18), no em-dash (CLAUDE.md), American English. Does not enumerate
// handoffs or position in the catalog taxonomy.

const domainCopy: { catalog_tagline: string; catalog_description: string } = {
  catalog_tagline:
    "Run pay cycles, benchmark to the market, and reward your people with confidence.",
  catalog_description:
    "Plan and run compensation cycles end to end: set pay ranges from market data, propose merit increases and bonuses, grant equity, and give every employee a clear total-rewards statement. Calibrate awards against budget and pay-equity targets so spend stays fair and on plan, then route every change for the right approvals. Give your compensation team one place to design pay, defend it with data, and deliver it accurately.",
};

const moduleCopy: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  78: {
    catalog_tagline:
      "Plan merit and bonus cycles, calibrate awards to budget, and route them for approval.",
    catalog_description:
      "Open a compensation cycle, set merit and bonus guidelines, and let managers propose increases for their teams. Calibrate recommendations against your budget and pay-equity targets, then route them through review and approval before they post. Give your compensation partners a controlled, transparent way to turn budget into fair, defensible pay decisions.",
  },
  79: {
    catalog_tagline:
      "Grant equity and incentive awards, then track them from proposal through vesting.",
    catalog_description:
      "Propose equity and incentive awards as part of total rewards, approve them, and follow each grant through vesting, exercise, forfeiture, and expiration. Keep award terms, schedules, and statuses in one place so finance, payroll, and your people all see the same numbers. Give your team a clean record of every long-term incentive you have promised.",
  },
  80: {
    catalog_tagline:
      "Benchmark pay to the market and build salary bands you can defend.",
    catalog_description:
      "Bring in market pay data, match your roles to it, and build salary bands and ranges that keep offers and increases competitive. Surface pay gaps against the market and across your workforce so you can close them before they become a risk. Give your compensation team the evidence to set, justify, and update pay structures with confidence.",
  },
  85: {
    catalog_tagline:
      "Generate total-rewards statements and deliver them to every employee.",
    catalog_description:
      "Pull base pay, bonus, equity, and benefits into a single total-rewards statement, generate it for each employee, and deliver it for them to review and acknowledge. Show people the full value of what they earn, not just their paycheck, in a clear and personal format. Give your team a repeatable way to communicate rewards and capture that employees have seen them.",
  },
};

async function backfillDomainCopy(): Promise<{ written: number; guarded: number }> {
  const live = await get(
    "/domains?id=eq.60&select=id,domain_code,catalog_tagline,catalog_description",
  );
  let written = 0;
  let guarded = 0;
  for (const d of live) {
    const patch: Row = {};
    if (String(d.catalog_tagline ?? "") === "") patch.catalog_tagline = domainCopy.catalog_tagline;
    else {
      guarded++;
      console.log(`  GUARD: domain 60 catalog_tagline non-empty, skipped`);
    }
    if (String(d.catalog_description ?? "") === "") patch.catalog_description = domainCopy.catalog_description;
    else {
      guarded++;
      console.log(`  GUARD: domain 60 catalog_description non-empty, skipped`);
    }
    if (Object.keys(patch).length > 0) {
      await call({ method: "PATCH", path: `/domains?id=eq.60`, body: patch });
      written += Object.keys(patch).length;
      console.log(`  PATCHED domain 60: ${Object.keys(patch).join(", ")}`);
    }
  }
  return { written, guarded };
}

async function backfillModuleCopy(): Promise<{ written: number; guarded: number }> {
  const ids = Object.keys(moduleCopy).map(Number);
  const live = await get(
    `/domain_modules?id=in.(${ids.join(",")})&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  let written = 0;
  let guarded = 0;
  for (const m of live) {
    const id = Number(m.id);
    const copy = moduleCopy[id];
    if (!copy) continue;
    const patch: Row = {};
    if (String(m.catalog_tagline ?? "") === "") patch.catalog_tagline = copy.catalog_tagline;
    else {
      guarded++;
      console.log(`  GUARD: module ${id} (${m.domain_module_code}) catalog_tagline non-empty, skipped`);
    }
    if (String(m.catalog_description ?? "") === "") patch.catalog_description = copy.catalog_description;
    else {
      guarded++;
      console.log(`  GUARD: module ${id} (${m.domain_module_code}) catalog_description non-empty, skipped`);
    }
    if (Object.keys(patch).length > 0) {
      await call({ method: "PATCH", path: `/domain_modules?id=eq.${id}`, body: patch });
      written += Object.keys(patch).length;
      console.log(`  PATCHED module ${id} (${m.domain_module_code}): ${Object.keys(patch).join(", ")}`);
    }
  }
  return { written, guarded };
}

// ============================================================
// B1A-B11 - data_object_aliases (generic synonyms)
// ============================================================
// industry_id is null on this domain -> alias_type 'synonym'. notes omitted (Rule #15).
const aliasSpecs: { data_object_id: number; alias_name: string }[] = [
  { data_object_id: 153, alias_name: "comp_plans" },
  { data_object_id: 154, alias_name: "pay_bands" },
  { data_object_id: 154, alias_name: "grade_bands" },
  { data_object_id: 155, alias_name: "comp_cycles" },
  { data_object_id: 155, alias_name: "planning_cycles" },
  { data_object_id: 156, alias_name: "comp_recommendations" },
  { data_object_id: 156, alias_name: "pay_increases" },
  { data_object_id: 157, alias_name: "total_rewards_statements" },
  { data_object_id: 157, alias_name: "trs" },
  { data_object_id: 158, alias_name: "stock_grants" },
  { data_object_id: 158, alias_name: "rsu_grants" },
  { data_object_id: 158, alias_name: "option_grants" },
  { data_object_id: 159, alias_name: "market_benchmarks" },
  { data_object_id: 159, alias_name: "comp_market_data" },
];

async function insertAliases(): Promise<{ inserted: number; existed: number }> {
  const dobjIds = [...new Set(aliasSpecs.map((a) => a.data_object_id))];
  const existing = await get(
    `/data_object_aliases?data_object_id=in.(${dobjIds.join(",")})&select=data_object_id,alias_name`,
  );
  const existKey = new Set(existing.map((r) => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`));
  const missing = aliasSpecs.filter(
    (a) => !existKey.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  );
  if (missing.length > 0) {
    await insert(
      "/data_object_aliases",
      missing.map((a) => ({
        data_object_id: a.data_object_id,
        alias_name: a.alias_name,
        alias_type: "synonym",
        is_preferred: false,
      })),
    );
  }
  for (const a of missing) console.log(`  INSERTED alias ${a.alias_name} -> dobj ${a.data_object_id}`);
  return { inserted: missing.length, existed: aliasSpecs.length - missing.length };
}

// ============================================================
// B1A-B8 - outbound payload-target relationship edges to employees(31)
// ============================================================
const b8Edges: {
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: string;
  relationship_kind: string;
}[] = [
  // merit_cycle.approved -> merit_recommendations applied to the worker (handoff 106/422 to HCM)
  {
    data_object_id: 156,
    related_data_object_id: 31,
    relationship_verb: "applies to",
    inverse_verb: "receives",
    relationship_type: "one_to_one",
    relationship_kind: "reference",
  },
  // equity_grant.vested -> equity_grants granted to the worker (handoff 423 to PAYROLL)
  {
    data_object_id: 158,
    related_data_object_id: 31,
    relationship_verb: "granted to",
    inverse_verb: "holds",
    relationship_type: "one_to_one",
    relationship_kind: "reference",
  },
  // compensation_statement.issued -> statement issued to the worker (handoff 1136 to EMP-EXP)
  {
    data_object_id: 157,
    related_data_object_id: 31,
    relationship_verb: "issued to",
    inverse_verb: "receives",
    relationship_type: "one_to_one",
    relationship_kind: "reference",
  },
];

async function insertB8Edges(): Promise<{ inserted: number; existed: number }> {
  const srcIds = [...new Set(b8Edges.map((e) => e.data_object_id))];
  const existing = await get(
    `/data_object_relationships?data_object_id=in.(${srcIds.join(",")})&related_data_object_id=eq.31&select=data_object_id,related_data_object_id`,
  );
  const existKey = new Set(existing.map((r) => `${r.data_object_id}|${r.related_data_object_id}`));
  const missing = b8Edges.filter((e) => !existKey.has(`${e.data_object_id}|${e.related_data_object_id}`));
  if (missing.length > 0) {
    await insert(
      "/data_object_relationships",
      missing.map((e) => ({
        data_object_id: e.data_object_id,
        related_data_object_id: e.related_data_object_id,
        owner_side: "source",
        relationship_type: e.relationship_type,
        relationship_kind: e.relationship_kind,
        relationship_verb: e.relationship_verb,
        inverse_verb: e.inverse_verb,
        is_required: false,
      })),
    );
  }
  for (const e of missing)
    console.log(`  INSERTED edge ${e.data_object_id} ${e.relationship_verb} employees(31)`);
  return { inserted: missing.length, existed: b8Edges.length - missing.length };
}

// ============================================================
// B1A-S9 - APQC handoff_processes (clean PCF matches, agent_curated)
// ============================================================
// PCF ids resolved live by name lookup (2026-06-07). All resolve in /processes.
//   107  COMP-MGMT -> People Analytics : merit_cycle.closed       -> 1046 Administer compensation and rewards to employees (L4)
//   113  Talent Mgmt -> COMP-PLANNING : calibration.complete      -> 1028 Review employee performance (L4)
//   421  COMP-MGMT -> Talent Mgmt : merit_cycle.closed            -> 1046 Administer compensation and rewards to employees (L4)
//   439  Talent Mgmt -> COMP-PLANNING : nine_box_placement.updated -> 225  Manage employee performance (L3)
//   460  SWP -> COMP-BENCHMARKING : labor_market_benchmark.refreshed -> 216 Develop and implement workforce planning, policies, and strategies (L3)
//   1138 COMP-MGMT -> SWP : compensation_benchmark.refreshed       -> 216  Develop and implement workforce planning, policies, and strategies (L3)
// 1105 (PA -> COMP-BENCHMARKING : pay_equity.gap_detected) has NO clean PCF match
//   (no pay-equity / workforce-metric L3/L4 process in APQC PCF) -> deferred to Discover, NOT written.
const apqcTags: { handoff_id: number; process_id: number }[] = [
  { handoff_id: 107, process_id: 1046 },
  { handoff_id: 113, process_id: 1028 },
  { handoff_id: 421, process_id: 1046 },
  { handoff_id: 439, process_id: 225 },
  { handoff_id: 460, process_id: 216 },
  { handoff_id: 1138, process_id: 216 },
];

async function insertApqcTags(): Promise<{ inserted: number; existed: number }> {
  const hIds = apqcTags.map((t) => t.handoff_id);
  const existing = await get(
    `/handoff_processes?handoff_id=in.(${hIds.join(",")})&select=handoff_id,process_id`,
  );
  const existKey = new Set(existing.map((r) => `${r.handoff_id}|${r.process_id}`));
  const missing = apqcTags.filter((t) => !existKey.has(`${t.handoff_id}|${t.process_id}`));
  if (missing.length > 0) {
    await insert(
      "/handoff_processes",
      missing.map((t) => ({
        handoff_id: t.handoff_id,
        process_id: t.process_id,
        proposal_source: "agent_curated",
        role: "implements",
      })),
    );
  }
  for (const t of missing)
    console.log(`  INSERTED handoff_process handoff ${t.handoff_id} -> process ${t.process_id}`);
  return { inserted: missing.length, existed: apqcTags.length - missing.length };
}

// ============================================================
// run
// ============================================================
console.log("== B1A-ENTITY-TYPE ==");
const et = await classifyEntityTypes();

console.log("== B1A-A4 (domain catalog copy) ==");
const dc = await backfillDomainCopy();

console.log("== B1A-M8 (module catalog copy) ==");
const mc = await backfillModuleCopy();

console.log("== B1A-B11 (aliases) ==");
const al = await insertAliases();

console.log("== B1A-B8 (outbound edges) ==");
const b8 = await insertB8Edges();

console.log("== B1A-S9 (APQC tags) ==");
const ap = await insertApqcTags();

console.log("\n== SUMMARY ==");
console.log(`entity_type: ${et.patched} patched, ${et.guarded} guarded`);
console.log(`domain catalog fields: ${dc.written} written, ${dc.guarded} guarded`);
console.log(`module catalog fields: ${mc.written} written, ${mc.guarded} guarded`);
console.log(`aliases: ${al.inserted} inserted, ${al.existed} existed`);
console.log(`B8 edges: ${b8.inserted} inserted, ${b8.existed} existed`);
console.log(`APQC tags: ${ap.inserted} inserted, ${ap.existed} existed`);

console.log("\n== VERIFY ==");
const vMasters = await get(
  "/data_objects?id=in.(153,154,155,156,157,158,159)&select=id,data_object_name,entity_type&order=id",
);
for (const m of vMasters) console.log(`  ${m.data_object_name} (${m.id}): ${m.entity_type}`);
const vDomain = await get("/domains?id=eq.60&select=catalog_tagline,catalog_description");
console.log(
  `  domain 60: tagline_len=${String(vDomain[0]?.catalog_tagline ?? "").length}, desc_len=${String(vDomain[0]?.catalog_description ?? "").length}`,
);
const vMods = await get(
  "/domain_modules?id=in.(78,79,80,85)&select=id,domain_module_code,catalog_tagline,catalog_description&order=id",
);
for (const m of vMods)
  console.log(
    `  module ${m.id} ${m.domain_module_code}: tagline_len=${String(m.catalog_tagline ?? "").length}, desc_len=${String(m.catalog_description ?? "").length}`,
  );
const vAlias = await get(
  "/data_object_aliases?data_object_id=in.(153,154,155,156,157,158,159)&select=data_object_id&order=data_object_id",
);
console.log(`  alias rows on the 7 masters: ${vAlias.length}`);
const vB8 = await get(
  "/data_object_relationships?data_object_id=in.(156,157,158)&related_data_object_id=eq.31&select=data_object_relationship_label",
);
console.log(`  B8 outbound edges to employees: ${vB8.length}`);
for (const e of vB8) console.log(`    ${e.data_object_relationship_label}`);
const vAp = await get(
  "/handoff_processes?handoff_id=in.(107,113,421,439,460,1138)&select=handoff_id,process_id,proposal_source&order=handoff_id",
);
console.log(`  APQC tags on the 6 handoffs: ${vAp.length}`);
for (const t of vAp) console.log(`    handoff ${t.handoff_id} -> process ${t.process_id} (${t.proposal_source})`);

console.log("\nDONE");
