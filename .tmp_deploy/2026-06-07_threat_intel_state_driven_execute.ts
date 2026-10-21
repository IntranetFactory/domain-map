#!/usr/bin/env bun
// State-driven execute for THREAT-INTEL (Threat Intelligence), 2026-06-07.
// Works ONLY the open EXECUTE-class items in audits/THREAT-INTEL/state.yaml;
// idempotent (read live, act only on what is still open).
//
// THREAT-INTEL (domain 14, leadership-tier sub-domain under SECOPS id 11) is
// UNBUILT: 0 domain_modules, 0 capability_domains, 0 masters (it masters ZERO
// data_objects of its own today), 0 DMDOs, 0 skills, 0 roles. Per the prompt's
// UNBUILT rule the build (B1A-BUILD / B1B-T1 modules, B1B-T2 capabilities, and
// the entire B/F/E cascade T6-T12) is SURFACED, not scaffolded, and its cascade
// is left. The build is gated on the keystone B2-T1 (module-split topology)
// decision and the dependent b2 picks (B2-T3 lifecycle exemptions, B2-T4
// cross-cutting capability promotion, B2-T5 MITRE-ATTACK master architecture).
//
// Because THREAT-INTEL masters no data_objects, there is NO entity_type PATCH
// owed, NO data_object_alias work (B11/T10 gated on masters), NO intra-domain
// relationship/handoff work owed, NO APQC handoff tagging (zero cross-domain
// handoffs). domain_aliases (T13) is not in the EXECUTE bucket and stays
// surfaced. B1A-T14 (description British->American spelling fix) overwrites a
// NON-EMPTY value -> DESTRUCTIVE, SURFACED only, not applied here.
//
// EXECUTE items available without a build:
//   1. A4 catalog UX (Rule #20, B1B-T3 / B2-T2): author buyer-voice
//      catalog_tagline + catalog_description into the EMPTY fields on domain 14.
//      The prompt's EXECUTE rule overrides the stale Rule #20 "surface-before-
//      write" gate (B2-T2). Never overwrite a non-empty value. No modules exist,
//      so there is no module-level catalog UX to write.
//   2. C1 business_function_domains (B1B-T5): INSERT 2 clearly-correct rows ->
//      Security (id 28) contributor; Governance, Risk and Compliance (id 31)
//      consumer. The existing owner (Security Operations Center id 64) is left
//      untouched. Idempotent against (domain_id, business_function_id).
//
// SURFACED (not written): B1A-T14 description spelling overwrite (DESTRUCTIVE);
// all b2 (B2-T1 split, B2-T2 [executed via EXECUTE override], B2-T3, B2-T4,
// B2-T5); personas/RACI (Phase P, deferred, domain is single-pre-build).
// LEFT: b1b cascade gated on the build (T6-T12), T10 aliases gated on masters,
// T13 domain_aliases (carve-out, not in EXECUTE bucket); b3 (12 candidates).

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
const post = (path: string, body: Row[]) => call({ method: "POST", path, body });

const DOMAIN_ID = 14;
const DOMAIN_NAME = "Threat Intelligence";
const EM_DASH = "—";

// ============================================================
// A4 catalog UX (Rule #20): buyer-voice copy into EMPTY fields only.
// Workflow + value, buyer voice, no vendor/product names. Public reference
// frameworks (MITRE ATT&CK, STIX, TAXII, TLP) and feed/standard names are
// generic standards, not vendor products, so they are allowed in description.
// ============================================================
const DOMAIN_COPY = {
  catalog_tagline:
    "Pull threat indicators and adversary intelligence from open and commercial feeds, curate them, then push the high-confidence signals straight into your detection stack.",
  catalog_description:
    "Bring every threat indicator your team relies on into one curated catalog. Pull hashes, IP addresses, domains, URLs, and exploited CVEs from open feeds, commercial intelligence providers, and information-sharing communities, then normalize them across STIX, TAXII, and the formats each source uses, deduplicate the overlap, and score what is left by confidence and by how relevant it is to your environment. Track the actors, campaigns, and malware families behind the indicators, map the techniques they use to the MITRE ATT&CK framework, and write finished-intelligence reports your analysts, responders, and leadership can act on.\n\nTurn that catalog into protection. Push high-confidence indicators directly into your SIEM, endpoint tooling, firewalls, and DNS controls for blocking and detection, and record a sighting every time your own telemetry matches a known indicator so you see who is being targeted and where. Manage priority intelligence requirements so collection stays focused on what leadership actually cares about, retract false positives quickly, and share back to the community in formats that respect Traffic Light Protocol handling.\n\nKeep the program defensible. Show coverage against the requirements you set, evidence how indicators flowed from feed to block, and connect threat intelligence to the incidents, vulnerabilities, and risks it informs across the rest of your security operations.",
};

function assertHygiene() {
  for (const b of [DOMAIN_COPY.catalog_tagline, DOMAIN_COPY.catalog_description]) {
    if (b.includes(EM_DASH)) throw new Error(`em-dash found in authored copy: ${b}`);
    if (/\b\w+is(e|ed|ing|ation)\b/.test(b)) {
      // crude British-spelling tripwire for normalise/operationalise families
      const hits = b.match(/\b\w+is(?:e|ed|ing|ation)\b/g) ?? [];
      const suspect = hits.filter(h => /(normalis|operationalis|prioritis|organis|categoris|optimis|recognis|analys)/i.test(h));
      if (suspect.length) throw new Error(`possible British spelling in copy: ${suspect.join(", ")}`);
    }
  }
}

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
    console.log("  domain 14 catalog UX: both fields already non-empty, skipping");
    return 0;
  }
  await patch(`/domains?id=eq.${DOMAIN_ID}`, body);
  console.log(`  domain 14 catalog UX written: ${Object.keys(body).join(", ")}`);
  return 1;
}

// ============================================================
// C1 business_function_domains (B1B-T5): clearly-correct contributor/consumer.
// owner (Security Operations Center, fn 64) already exists and is left untouched.
// Idempotent against (domain_id, business_function_id).
// ============================================================
const BFD_ROWS: Array<{
  business_function_id: number;
  fn_name: string;
  responsibility_type: "contributor" | "consumer";
}> = [
  { business_function_id: 28, fn_name: "Security", responsibility_type: "contributor" },
  { business_function_id: 31, fn_name: "Governance, Risk and Compliance", responsibility_type: "consumer" },
];

async function authorBFD(): Promise<number> {
  const existing = await get(
    `/business_function_domains?domain_id=eq.${DOMAIN_ID}&select=business_function_id`,
  );
  const have = new Set(existing.map(r => Number(r.business_function_id)));
  const toInsert = BFD_ROWS.filter(r => !have.has(r.business_function_id)).map(r => ({
    domain_id: DOMAIN_ID,
    business_function_id: r.business_function_id,
    responsibility_type: r.responsibility_type,
    business_function_domain_label: `${r.fn_name} / ${DOMAIN_NAME}`,
    // record_status omitted -> defaults to 'new' (Rule #1).
  }));
  if (toInsert.length === 0) {
    console.log("  business_function_domains: all clearly-correct rows already present");
    return 0;
  }
  await post("/business_function_domains", toInsert);
  console.log(
    `  business_function_domains inserted: ${toInsert
      .map(r => `${r.business_function_domain_label} (${r.responsibility_type})`)
      .join("; ")}`,
  );
  return toInsert.length;
}

async function main() {
  assertHygiene();

  console.log("== A4 catalog UX (Rule #20) ==");
  const uxCount = await authorCatalogUX();

  console.log("\n== C1 business_function_domains (B1B-T5) ==");
  const bfdCount = await authorBFD();

  console.log("\n== SUMMARY ==");
  console.log(`  domain catalog UX written:        ${uxCount}`);
  console.log(`  business_function_domains rows:   ${bfdCount}`);
  console.log("  (THREAT-INTEL is UNBUILT: build + B/F/E cascade SURFACED/LEFT, not scaffolded)");

  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.14");
  console.log("  https://tests.semantius.app/domain_map/business_function_domains?domain_id=eq.14");
}

await main();
