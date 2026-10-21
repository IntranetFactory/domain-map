#!/usr/bin/env bun
// ESIGN state-driven Validate execute pass (2026-06-07).
// Executes the additive/corrective open items from audits/ESIGN/state.yaml.
// ESIGN is UNBUILT (0 domain_modules, 0 capabilities, 0 solution_domains), so the
// whole module/capability/permission/skill cascade is LEFT (surface the build).
// Per-module system skill + skill_tools items (B1A-S7, B1A-S8, B2-S3) are RETIRED
// per the 2026-06-06 per-domain-skill supersession header. This pass executes only
// the data_object-grain and domain-grain mechanical items that do not depend on the
// build:
//   1. entity_type PATCH on envelopes (251): unclassified -> operational_workflow.
//   2. business_logic em-dash strip (B1A-S4): rule-enforced, replace ONLY the U+2014
//      glyph with a comma; pre-specified text; guarded to fire only if an em-dash is
//      live (corrective, not a content rewrite).
//   3. Catalog UX (Rule #20 / A4 / B2-S1): author buyer-voice catalog_tagline +
//      catalog_description on the ESIGN domain row (both currently empty). No module
//      copy: 0 modules.
//   4. Aliases (B1A-S6 / B11): generic vendor-neutral synonyms on envelopes
//      (agreement, signing session, transaction); alias_type='synonym'.
//
// Idempotent: reads live state before each write, inserts/patches only what is missing.
// All new rows land at record_status='new' (Rule #1). No DELETE, no overwrite of a
// non-empty value (the em-dash strip only swaps the forbidden glyph), no record_status
// flip. business_function_domains (C1) is already complete (5 rows): verify-and-skip.

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

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}

const DOMAIN_ID = 94;
const ENVELOPES_ID = 251;
const EM_DASH = "—";

// ============================================================
// 1. entity_type PATCH (Rule #12 enum) on envelopes
// ============================================================
// envelopes is an e-signature transaction with a full lifecycle
// (draft -> sent -> ... -> completed/declined/voided/expired) and workflow gates
// (sent, voided requires_permission=true). That is operational_workflow.
async function patchEntityType(): Promise<number> {
  const [r] = await get(`/data_objects?id=eq.${ENVELOPES_ID}&select=id,entity_type`);
  if (!r) throw new Error("envelopes data_object not found");
  if (r.entity_type === "operational_workflow") {
    console.log("  SKIP entity_type: already operational_workflow");
    return 0;
  }
  if (r.entity_type !== "unclassified") {
    console.log(`  SKIP entity_type: '${r.entity_type}' already typed (not unclassified)`);
    return 0;
  }
  await call({
    method: "PATCH",
    path: `/data_objects?id=eq.${ENVELOPES_ID}`,
    body: { entity_type: "operational_workflow" },
  });
  console.log("  PATCH envelopes entity_type -> operational_workflow");
  return 1;
}

// ============================================================
// 2. business_logic em-dash strip (B1A-S4) - rule-enforced
// ============================================================
// Replace ONLY the forbidden U+2014 glyph with a comma. The wording is otherwise
// preserved verbatim (matches the pre-specified text in state.yaml B1A-S4). Guarded
// to fire only when an em-dash is actually live, so this is corrective (project-rule
// enforcement) rather than a content overwrite.
async function stripEmDash(): Promise<number> {
  const [r] = await get(`/domains?id=eq.${DOMAIN_ID}&select=id,business_logic`);
  if (!r) throw new Error("ESIGN domain not found");
  const cur = String(r.business_logic ?? "");
  if (!cur.includes(EM_DASH)) {
    console.log("  SKIP business_logic: no em-dash present");
    return 0;
  }
  // Live form: "... and validation — small in surface area ..."
  // Replace " — " (with surrounding spaces) by ", " so the sentence reads cleanly.
  let next = cur.replace(new RegExp(`\\s*${EM_DASH}\\s*`, "g"), ", ");
  if (next.includes(EM_DASH)) {
    next = next.split(EM_DASH).join(", ");
  }
  await call({
    method: "PATCH",
    path: `/domains?id=eq.${DOMAIN_ID}`,
    body: { business_logic: next },
  });
  console.log(`  PATCH business_logic em-dash -> comma`);
  console.log(`    new: ${next}`);
  return 1;
}

// ============================================================
// 3. Catalog UX (Rule #20) on the domain row (A4 / B2-S1)
// ============================================================
// Buyer-voice copy: workflow + value, no vendor product names, no em-dash,
// American English. Statutory frameworks (ESIGN Act, UETA, eIDAS) are allowed.
const ESIGN_TAGLINE =
  "Send agreements out for legally binding electronic signature, verify who is signing, and capture a tamper-evident audit trail for every transaction.";

const ESIGN_DESCRIPTION =
  "Electronic signature software lets your teams prepare a document, route it to the right people in the right order, and collect legally binding signatures without printing, mailing, or chasing paper. A single signing package moves through a clear lifecycle, from draft to sent to completed, so everyone can see exactly where an agreement stands and what is still outstanding.\n\n" +
  "Before a signature is accepted, signer identity can be verified through methods such as email authentication, one-time passcodes, knowledge-based questions, or government ID checks, which raises the legal weight of the result. Once all parties have signed, the platform seals the document and produces a certificate of completion that records who signed, when, and from where, giving you defensible evidence if an agreement is ever questioned.\n\n" +
  "Because signing is a step inside larger business processes, completed agreements flow straight into the systems that need them, such as contract repositories, HR records, and sales operations, while the signing platform remains the system of record for the signature event itself. The result is faster turnaround, fewer errors, and compliance with electronic signature frameworks such as the ESIGN Act, UETA, and eIDAS.";

async function patchCatalogUx(): Promise<number> {
  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!dom) throw new Error("ESIGN domain row not found");
  const body: Row = {};
  if (!dom.catalog_tagline || String(dom.catalog_tagline).trim() === "") {
    body.catalog_tagline = ESIGN_TAGLINE;
  } else {
    console.log("  SKIP catalog_tagline: already populated");
  }
  if (!dom.catalog_description || String(dom.catalog_description).trim() === "") {
    body.catalog_description = ESIGN_DESCRIPTION;
  } else {
    console.log("  SKIP catalog_description: already populated");
  }
  if (Object.keys(body).length === 0) return 0;
  await call({ method: "PATCH", path: `/domains?id=eq.${DOMAIN_ID}`, body });
  console.log(`  PATCH domain ${DOMAIN_ID} catalog UX: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ============================================================
// 4. Generic-synonym aliases (B1A-S6 / B11) on envelopes
// ============================================================
// Vendor-neutral generic synonyms only (Rule #18: generic synonyms allowed in
// data_object_aliases). No vendor product names.
const aliasSpecs: { alias_name: string }[] = [
  { alias_name: "agreement" },
  { alias_name: "signing session" },
  { alias_name: "transaction" },
];

async function insertAliases(): Promise<number> {
  const existing = await get(
    `/data_object_aliases?data_object_id=eq.${ENVELOPES_ID}&select=alias_name`,
  );
  const have = new Set(existing.map(r => String(r.alias_name).toLowerCase()));
  const missing = aliasSpecs
    .filter(a => !have.has(a.alias_name.toLowerCase()))
    .map(a => ({
      data_object_id: ENVELOPES_ID,
      alias_name: a.alias_name,
      alias_type: "synonym",
      is_preferred: false,
    }));
  if (missing.length === 0) {
    console.log("  aliases: all present, nothing to insert");
    return 0;
  }
  await insert("/data_object_aliases", missing);
  console.log(`  inserted ${missing.length} alias rows`);
  return missing.length;
}

// ============================================================
// C1 verify-only (already complete: owner + 3 contributors + 1 consumer)
// ============================================================
async function verifyBfd(): Promise<number> {
  const rows = await get(
    `/business_function_domains?domain_id=eq.${DOMAIN_ID}&select=business_function_id,responsibility_type`,
  );
  console.log(`  business_function_domains present: ${rows.length} (C1 already complete; no insert)`);
  return rows.length;
}

// ============================================================
// Run
// ============================================================
console.log("== ESIGN state-driven execute 2026-06-07 ==");
console.log("\n[1] entity_type PATCH");
const nEntity = await patchEntityType();
console.log("\n[2] business_logic em-dash strip");
const nEmDash = await stripEmDash();
console.log("\n[3] catalog UX");
const nCatalog = await patchCatalogUx();
console.log("\n[4] aliases");
const nAlias = await insertAliases();
console.log("\n[C1] business_function_domains verify");
const nBfd = await verifyBfd();

console.log("\n== Summary ==");
console.log(`entity_type patched: ${nEntity}`);
console.log(`business_logic em-dash stripped: ${nEmDash}`);
console.log(`catalog UX fields written: ${nCatalog}`);
console.log(`aliases inserted: ${nAlias}`);
console.log(`business_function_domains present (verify-only): ${nBfd}`);

// Verify
console.log("\n== Verify ==");
const [venv] = await get(
  `/data_objects?id=eq.${ENVELOPES_ID}&select=id,data_object_name,entity_type`,
);
console.log(`  envelopes entity_type: ${venv.entity_type}`);
const [vdom] = await get(
  `/domains?id=eq.${DOMAIN_ID}&select=business_logic,catalog_tagline,catalog_description`,
);
console.log(`  business_logic has em-dash? ${String(vdom.business_logic).includes(EM_DASH)}`);
console.log(`  catalog_tagline empty? ${!vdom.catalog_tagline}`);
console.log(`  catalog_description empty? ${!vdom.catalog_description}`);
const valias = await get(
  `/data_object_aliases?data_object_id=eq.${ENVELOPES_ID}&select=alias_name,alias_type&order=alias_name`,
);
console.log(`  envelopes aliases now: ${valias.length} (${valias.map(a => a.alias_name).join(", ")})`);

console.log("\nDone.");
