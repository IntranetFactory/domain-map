#!/usr/bin/env bun
// 2026-06-07 EM-FUND-PLATFORM state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (DB default) or PATCH of
// empty/NULL fields. Idempotent: re-reads live before every write and skips done work.
//
// Domain 163 (EM-FUND-PLATFORM), 4 FULL modules: 26 EM-FUND-FORMATION, 27 EM-FUND-SPV,
// 28 EM-FUND-OPS-LITE, 29 EM-FUND-CAPTABLE-LITE.
// Masters: fund_formations(781)@26, spvs(782)@27, spv_subscriptions(783)@27.
//
// EXECUTE-classified open state items handled here:
//   1. B1A-ENTITY-TYPE : classify 781/782/783 (unclassified -> operational_workflow, Rule #12)
//   2. Catalog UX (#20): author empty catalog_tagline/description on domain 163 + 4 modules
//   3. B1A-B6          : 2 intra-domain data_object_relationships (fund_formations spawns spvs;
//                        fund_formations spawns cap_tables)
//   4. B1A-B9b         : 3 intra-domain handoffs on fund_formation.operational (event 1192)
//                        (4th candidate EM-FUND-SPV->OPS-LITE on spv.active LEFT: gated on B1A-L2,
//                         the spv.active trigger_event does not exist yet)
//   5. B1A-S5 (B11)    : data_object_aliases generic synonyms on fund_formations(781) +
//                        spv_subscriptions(783); enumerated in the 2026-05-30 audit
//
// NOT touched (surfaced / left / blocked):
//   - B1A-W1..W5  : new master entities (entity_filings, banking_onboardings, spv_kyc_records,
//                   templated_documents) + lp_kyc_records embedded shell. New-entity authoring;
//                   W5 module placement blocked on b2 B2-2; lp_kyc_records(1022) canonical master
//                   already exists. Not in the mechanical-EXECUTE allow-list; left open.
//   - B1A-H1a     : handoff 1046 defer-to-Discover (report; no clean PCF match)
//   - B1A-PHASE-P : personas / RACI -> DEFER (do not author)
//   - B1B-L1/L2/L3, B1B-S6/S7 : blocked on b2 B2-3 (starter-kit decision) + lifecycle deps
//   - B1B-S2/S3   : pattern flags + user-verb user edges (b2 / user pick)
//   - all b2, all b3

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
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const result = await call({ method: "POST", path, body: rows.slice(i, i + CHUNK) });
    out.push(...result);
  }
  return out;
}

// ============================================================
// 1. entity_type classification (Rule #12)
//   fund_formations(781)   : drafted -> filed -> operational lifecycle  -> operational_workflow
//   spvs(782)              : forming -> active -> wound_down lifecycle   -> operational_workflow
//   spv_subscriptions(783) : drafted -> signed -> funded -> confirmed    -> operational_workflow
// ============================================================
const entityTypes = [
  { id: 781, name: "fund_formations", entity_type: "operational_workflow" },
  { id: 782, name: "spvs", entity_type: "operational_workflow" },
  { id: 783, name: "spv_subscriptions", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification ==");
  const live = await get("/data_objects?id=in.(781,782,783)&select=id,entity_type");
  const cur = new Map(live.map(r => [Number(r.id), String(r.entity_type ?? "")]));
  let n = 0;
  for (const e of entityTypes) {
    const c = cur.get(e.id);
    if (c && c !== "unclassified") {
      console.log(`  skip ${e.name}: already '${c}'`);
      continue;
    }
    await patch(`/data_objects?id=eq.${e.id}`, { entity_type: e.entity_type });
    console.log(`  set  ${e.name} -> ${e.entity_type}`);
    n++;
  }
  console.log(`  entity_type updated: ${n}`);
  return n;
}

// ============================================================
// 2. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites.
//    Buyer-voice (workflow + value); no vendor names (Rule #18); no em-dash; American English.
// ============================================================
const domainCopy = {
  catalog_tagline:
    "Stand up a fund or a single-deal vehicle in days, then run capital calls, investor onboarding, and your LP portal from one place built for solo and small-team managers.",
  catalog_description:
    "Launch a fund or special purpose vehicle without stitching together a stack of separate tools. Form the legal entity, file what the regulators expect, open the bank account, and put your subscription documents in front of investors, all from a single workspace shaped for a manager running lean.\n\nOnce the vehicle is live, run the day-to-day. Issue capital calls and track who has funded, onboard limited partners with the verification checks built in, and keep a simple cap table of who owns what across the vehicle. For deal-by-deal raises, spin up a vehicle per opportunity, collect investor commitments, and close.\n\nGive your investors a clean experience. They see their commitments, capital-call notices, and documents in one portal instead of a thread of emails. The result is a fund or syndicate that runs end to end, from formation through ongoing operations, at a fraction of the cost and effort of assembling the pieces yourself.",
};

type ModCopy = { id: number; code: string; tagline: string; description: string };
const moduleCopy: ModCopy[] = [
  {
    id: 26,
    code: "EM-FUND-FORMATION",
    tagline:
      "Form the legal vehicle, file with the state and IRS, open the bank account, and get subscription documents in front of investors.",
    description:
      "Take a new fund or vehicle from idea to operational. Set up the entity, prepare and track the formation filings, apply for the tax identification number, and start the banking application, all in one checklist you can actually finish. Generate the limited partnership agreement and side letters from proven templates instead of paying for every document from scratch.\n\nKeep every artifact in one record so nothing stalls. See which filings are pending, which are accepted, and what is blocking the vehicle from going live, then hand the operational vehicle off to the teams that run capital calls, cap table, and the investor portal.",
  },
  {
    id: 27,
    code: "EM-FUND-SPV",
    tagline:
      "Spin up a single-deal vehicle, collect investor subscriptions, run the verification checks, and close.",
    description:
      "Raise deal by deal without standing up a whole fund. Create a special purpose vehicle for the opportunity, send subscription documents, and track each investor from draft through signed, funded, and confirmed. Run know-your-customer and anti-money-laundering checks per subscription so the close is clean.\n\nWatch the raise fill in real time and see exactly who still needs to sign or wire. When the vehicle is active, the capital it gathers flows into the same operations and reporting your investors expect, so a one-off syndicate runs as smoothly as a full fund.",
  },
  {
    id: 28,
    code: "EM-FUND-OPS-LITE",
    tagline:
      "Run capital calls, onboard limited partners, and keep investors informed without a back-office team.",
    description:
      "Handle the recurring work of running a live vehicle. Issue capital calls, track who has funded and who is late, and onboard new limited partners with the verification steps built in. Keep investor communications and documents in one place so the people who put money in always know where things stand.\n\nThe workflow is sized for a manager running lean: enough structure to stay compliant and organized, without the overhead of a full fund-administration platform. When the operation outgrows the lite shape, the records are ready to carry forward.",
  },
  {
    id: 29,
    code: "EM-FUND-CAPTABLE-LITE",
    tagline:
      "Keep a clear record of who owns what across the vehicle, with allocations and positions in one view.",
    description:
      "Track ownership across the fund or vehicle without a standalone equity platform. Record each holder's position, see allocations at a glance, and keep the cap table current as commitments fund and the vehicle evolves.\n\nThis is the lite shape: the ownership picture a solo or small-team manager needs to answer investor questions and prepare reporting, kept in step with formation and ongoing operations so the numbers always reconcile.",
  },
];

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  // Domain
  const [dom] = await get("/domains?id=eq.163&select=catalog_tagline,catalog_description");
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim())
    dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.163", dBody);
    console.log(`  domain 163: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 163: already populated, skip");
  }
  // Modules
  const liveMods = await get(
    "/domain_modules?id=in.(26,27,28,29)&select=id,catalog_tagline,catalog_description",
  );
  const modCur = new Map(liveMods.map(r => [Number(r.id), r]));
  for (const m of moduleCopy) {
    const cur = modCur.get(m.id);
    const body: Row = {};
    if (!String(cur?.catalog_tagline ?? "").trim()) body.catalog_tagline = m.tagline;
    if (!String(cur?.catalog_description ?? "").trim()) body.catalog_description = m.description;
    if (Object.keys(body).length) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      console.log(`  module ${m.code} (${m.id}): wrote ${Object.keys(body).join(", ")}`);
      n++;
    } else {
      console.log(`  module ${m.code} (${m.id}): already populated, skip`);
    }
  }
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 3. B1A-B6 - intra-domain data_object_relationships (2 edges)
//    fund_formations(781) spawns spvs(782)        : 1:N composition, owner=source (parent)
//    fund_formations(781) spawns cap_tables(770)  : 1:N composition, owner=source (parent)
//    Day-1 deploy shape: an operational fund vehicle spawns its SPVs and its cap table.
//    Idempotent on (data_object_id, relationship_verb, related_data_object_id).
// ============================================================
const relEdges = [
  {
    from: 781,
    to: 782,
    verb: "spawns",
    inverse: "is spawned by",
    type: "one_to_many",
    kind: "composition",
    owner_side: "source",
    is_required: false,
  },
  {
    from: 781,
    to: 770,
    verb: "spawns",
    inverse: "is spawned by",
    type: "one_to_many",
    kind: "composition",
    owner_side: "source",
    is_required: false,
  },
];

async function insertRelationships() {
  console.log("\n== 3. B1A-B6 intra-domain data_object_relationships ==");
  const involved = [770, 781, 782];
  const existing = await get(
    `/data_object_relationships?or=(data_object_id.in.(${involved.join(",")}),related_data_object_id.in.(${involved.join(",")}))&select=data_object_id,relationship_verb,related_data_object_id`,
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${r.relationship_verb}|${r.related_data_object_id}`),
  );
  const rows: Row[] = [];
  for (const e of relEdges) {
    const key = `${e.from}|${e.verb}|${e.to}`;
    if (seen.has(key)) {
      console.log(`  skip ${e.from} ${e.verb} ${e.to} (exists)`);
      continue;
    }
    rows.push({
      data_object_id: e.from,
      related_data_object_id: e.to,
      relationship_verb: e.verb,
      inverse_verb: e.inverse,
      relationship_type: e.type,
      relationship_kind: e.kind,
      owner_side: e.owner_side,
      is_required: e.is_required,
      notes: "",
    });
  }
  if (rows.length) {
    await insert("/data_object_relationships", rows);
    for (const r of rows)
      console.log(`  +${r.data_object_id} ${r.relationship_verb} ${r.related_data_object_id}`);
  } else {
    console.log("  all relationship edges already present, nothing to insert");
  }
  console.log(`  relationships inserted: ${rows.length}`);
  return rows.length;
}

// ============================================================
// 4. B1A-B9b - intra-domain handoffs (3 rows, all on fund_formation.operational = event 1192)
//    source=target=163, integration_pattern=lifecycle_progression, friction_level=low.
//    payload fund_formations(781). Omit key/handoff_label/notes/record_status (DB generates/defaults).
//    Idempotent on (src_mod,tgt_mod,data_object,trigger_event_id).
//    4th candidate (27->28 on spv.active) LEFT: spv.active trigger_event does not exist (B1A-L2).
// ============================================================
const EVENT_FUND_OPERATIONAL = 1192;
const handoffSpecs = [
  {
    src: 26,
    tgt: 28,
    data_object_id: 781,
    description:
      "Fund vehicle becomes operational; the lite ops module picks it up to begin capital calls, limited-partner onboarding, and investor communications.",
  },
  {
    src: 26,
    tgt: 29,
    data_object_id: 781,
    description:
      "Fund vehicle becomes operational; the lite cap-table module provisions the ownership record for the new vehicle on day one.",
  },
  {
    src: 26,
    tgt: 27,
    data_object_id: 781,
    description:
      "Fund vehicle becomes operational; single-deal vehicles can now be launched under the live parent fund.",
  },
];

async function insertHandoffs() {
  console.log("\n== 4. B1A-B9b intra-domain handoffs ==");
  const live = await get(
    "/handoffs?source_domain_id=eq.163&target_domain_id=eq.163&select=source_domain_module_id,target_domain_module_id,data_object_id,trigger_event_id",
  );
  const liveKey = new Set(
    live.map(
      r =>
        `${r.source_domain_module_id}|${r.target_domain_module_id}|${r.data_object_id}|${r.trigger_event_id}`,
    ),
  );
  const rows: Row[] = [];
  for (const h of handoffSpecs) {
    const key = `${h.src}|${h.tgt}|${h.data_object_id}|${EVENT_FUND_OPERATIONAL}`;
    if (liveKey.has(key)) {
      console.log(`  skip ${h.src}->${h.tgt} (exists)`);
      continue;
    }
    rows.push({
      source_domain_id: 163,
      target_domain_id: 163,
      source_domain_module_id: h.src,
      target_domain_module_id: h.tgt,
      data_object_id: h.data_object_id,
      trigger_event_id: EVENT_FUND_OPERATIONAL,
      integration_pattern: "lifecycle_progression",
      friction_level: "low",
      description: h.description,
    });
  }
  if (rows.length) {
    await insert("/handoffs", rows);
    for (const r of rows) console.log(`  +${r.source_domain_module_id}->${r.target_domain_module_id}`);
  } else {
    console.log("  all intra-domain handoffs already present, nothing to insert");
  }
  console.log(`  handoffs inserted: ${rows.length}`);
  return rows.length;
}

// ============================================================
// 5. B1A-S5 (B11) - data_object_aliases generic synonyms (alias_type='synonym').
//    No vendor/product names (Rule #18). Forms enumerated in the 2026-05-30 audit.
//    fund_formations(781): "fund vehicle setup", "entity formation", "gp entity formation"
//    spv_subscriptions(783): "syndicate subscriptions", "deal subscriptions", "co-invest commitments"
//    Idempotent on (data_object_id, lower(alias_name)).
// ============================================================
const aliases = [
  { data_object_id: 781, alias_name: "fund vehicle setup" },
  { data_object_id: 781, alias_name: "entity formation" },
  { data_object_id: 781, alias_name: "gp entity formation" },
  { data_object_id: 783, alias_name: "syndicate subscriptions" },
  { data_object_id: 783, alias_name: "deal subscriptions" },
  { data_object_id: 783, alias_name: "co-invest commitments" },
];

async function insertAliases() {
  console.log("\n== 5. B1A-S5 (B11) data_object_aliases ==");
  const existing = await get(
    "/data_object_aliases?data_object_id=in.(781,783)&select=data_object_id,alias_name",
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert = aliases
    .filter(a => !seen.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`))
    .map(a => ({ data_object_id: a.data_object_id, alias_name: a.alias_name, alias_type: "synonym" }));
  if (toInsert.length) {
    await insert("/data_object_aliases", toInsert);
    for (const a of toInsert) console.log(`  +${a.data_object_id}  ${a.alias_name}`);
  } else {
    console.log("  all alias rows already present, nothing to insert");
  }
  console.log(`  aliases inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
    relationships: await insertRelationships(),
    handoffs: await insertHandoffs(),
    aliases: await insertAliases(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(781,782,783)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.163");
  console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.163");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.163");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(781,783)");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
