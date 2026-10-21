#!/usr/bin/env bun
// 2026-06-07 APIM state-driven Validate execute (SKILL.md Rule #21, bulk batch).
// Additive/corrective only; everything lands record_status='new' (or PATCH of empty/NULL fields).
// Idempotent: re-reads live before every write and skips work already done.
//
// APIM (domain 79) is UNBUILT (0 domain_modules, 0 capability_domains). Per the prompt's
// LEAVE rule, the build and its cascade (B1A-BUILD, B1B-S1/S2/S10, module-grain lifecycle,
// module FK backfills) are SURFACED, not executed here. Only build-independent additive/
// corrective items run:
//   1. B1A entity_type  : classify 7 APIM masters (unclassified -> Rule #12 enum)
//   2. Catalog UX (#20) : author empty catalog_tagline/description on domain 79 (no modules)
//   3. B1A-S14 (C1)     : insert Security contributor business_function_domains row
//   4. B1A-S9 (B11)     : insert generic synonym data_object_aliases for 5 masters
//   5. B1A-S6 (B6)      : insert 7 intra-domain data_object_relationships edges
//   6. B1A-S3 (A3)      : link 9 flagship solutions via solution_domains (create missing
//                         vendor/solution rows; reuse by name)
//
// Destructive / blocked / deferred / superseded items are NOT touched (surfaced to user).

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

// ============================================================
// 1. entity_type classification (Rule #12)
// ============================================================
// 456 api_versions       operational_workflow : draft -> published -> deprecated -> retired
// 457 api_specifications operational_workflow : draft -> reviewed -> approved -> published
// 458 api_deployments    operational_workflow : pending -> published -> rolled_back
// 459 api_policies       operational_workflow : draft -> active -> superseded
// 460 api_usage_metrics  computed             : aggregate call counts / latency / error rates
// 461 api_gateways       catalog              : gateway infra config (deployment targets, throughput)
// 462 api_consumers      operational_workflow : pending -> onboarded -> revoked
const entityTypes: { id: number; name: string; entity_type: string }[] = [
  { id: 456, name: "api_versions", entity_type: "operational_workflow" },
  { id: 457, name: "api_specifications", entity_type: "operational_workflow" },
  { id: 458, name: "api_deployments", entity_type: "operational_workflow" },
  { id: 459, name: "api_policies", entity_type: "operational_workflow" },
  { id: 460, name: "api_usage_metrics", entity_type: "computed" },
  { id: 461, name: "api_gateways", entity_type: "catalog" },
  { id: 462, name: "api_consumers", entity_type: "operational_workflow" },
];

async function classifyEntityTypes() {
  console.log("\n== 1. entity_type classification ==");
  const live = await get(
    "/data_objects?id=in.(456,457,458,459,460,461,462)&select=id,entity_type",
  );
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
// 2. Catalog UX (Rule #20) - only writes EMPTY fields, never overwrites
// ============================================================
const domainCopy = {
  catalog_tagline: "Design, secure, publish, and monetize your APIs from one place.",
  catalog_description:
    "Run the full life of every API: author the contract, version it cleanly, and push it through gateways with the access, authentication, and rate-limit rules you need. Onboard the developers and partners who consume your APIs, give them a self-service portal and keys, and watch real usage with per-consumer call volumes, latency, and error rates. Catch breaking changes before they reach subscribers, hold deprecated versions to a sunset plan, and turn API traffic into a billable, governed product instead of an unmanaged back door.",
};

async function authorCatalogUX() {
  console.log("\n== 2. Catalog UX (Rule #20) ==");
  let n = 0;
  const [dom] = await get(
    "/domains?id=eq.79&select=catalog_tagline,catalog_description",
  );
  const dBody: Row = {};
  if (!String(dom?.catalog_tagline ?? "").trim()) dBody.catalog_tagline = domainCopy.catalog_tagline;
  if (!String(dom?.catalog_description ?? "").trim()) dBody.catalog_description = domainCopy.catalog_description;
  if (Object.keys(dBody).length) {
    await patch("/domains?id=eq.79", dBody);
    console.log(`  domain 79: wrote ${Object.keys(dBody).join(", ")}`);
    n++;
  } else {
    console.log("  domain 79: already populated, skip");
  }
  // No domain_modules on APIM (unbuilt): module-level catalog UX is N/A this pass.
  console.log(`  catalog UX rows updated: ${n}`);
  return n;
}

// ============================================================
// 3. business_function_domains contributor (B1A-S14 / C1)
// ============================================================
// Canonical 20-function-spine name for "Information Security" is "Security" (id 28;
// description: "InfoSec policy, security operations, identity and access management...").
// Scope: policy authoring and consumer access governance.
async function insertSecurityContributor() {
  console.log("\n== 3. business_function_domains (B1A-S14) ==");
  const existing = await get(
    "/business_function_domains?domain_id=eq.79&business_function_id=eq.28&select=id",
  );
  if (existing.length) {
    console.log(`  skip: Security (28) BFD row already present (id ${existing[0].id})`);
    return 0;
  }
  await post("/business_function_domains", [
    { domain_id: 79, business_function_id: 28, responsibility_type: "contributor" },
  ]);
  console.log("  +Security (28) contributor on APIM");
  return 1;
}

// ============================================================
// 4. data_object_aliases generic synonyms (B1A-S9 / B11)
// ============================================================
// Generic, cross-vendor synonyms only (Rule #18: aliases may carry generic synonyms).
const aliases: { data_object_id: number; master: string; alias_name: string }[] = [
  { data_object_id: 457, master: "api_specifications", alias_name: "API Proxy" },
  { data_object_id: 457, master: "api_specifications", alias_name: "API Definition" },
  { data_object_id: 457, master: "api_specifications", alias_name: "API Contract" },
  { data_object_id: 462, master: "api_consumers", alias_name: "API Subscriber" },
  { data_object_id: 462, master: "api_consumers", alias_name: "API Client App" },
  { data_object_id: 458, master: "api_deployments", alias_name: "API Revision" },
  { data_object_id: 458, master: "api_deployments", alias_name: "API Environment Deployment" },
  { data_object_id: 461, master: "api_gateways", alias_name: "API Runtime" },
  { data_object_id: 461, master: "api_gateways", alias_name: "API Proxy Gateway" },
  { data_object_id: 459, master: "api_policies", alias_name: "Gateway Plugin" },
  { data_object_id: 459, master: "api_policies", alias_name: "Traffic Policy" },
];

async function insertAliases() {
  console.log("\n== 4. data_object_aliases (B1A-S9) ==");
  const existing = await get(
    "/data_object_aliases?data_object_id=in.(456,457,458,459,460,461,462)&select=data_object_id,alias_name",
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const toInsert = aliases
    .filter(a => !seen.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`))
    .map(a => ({
      data_object_id: a.data_object_id,
      alias_name: a.alias_name,
      alias_type: "synonym",
      is_preferred: false,
    }));
  if (toInsert.length) {
    await post("/data_object_aliases", toInsert);
    for (const a of toInsert) console.log(`  +${a.alias_name} -> do ${a.data_object_id}`);
  } else {
    console.log("  all aliases already present, nothing to insert");
  }
  console.log(`  aliases inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
// 5. intra-domain data_object_relationships (B1A-S6 / B6)
// ============================================================
// 7 edges between the APIM masters (source data_object_id, target related_data_object_id).
const intraRels: {
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: string;
  relationship_kind: string;
  is_required: boolean;
  owner_side: string;
}[] = [
  // Modeled source -> target as one_to_many (source is the "one"), composition where the
  // child cannot exist without the parent, else reference. Valid enums:
  // relationship_kind in (association, composition, reference);
  // relationship_type in (one_to_one, one_to_many, many_to_many).
  { data_object_id: 457, related_data_object_id: 456, relationship_verb: "has versions", inverse_verb: "belongs to", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
  { data_object_id: 456, related_data_object_id: 458, relationship_verb: "is run by", inverse_verb: "runs", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { data_object_id: 461, related_data_object_id: 458, relationship_verb: "hosts", inverse_verb: "targets", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
  { data_object_id: 459, related_data_object_id: 458, relationship_verb: "applies to", inverse_verb: "is governed by", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { data_object_id: 458, related_data_object_id: 460, relationship_verb: "is measured by", inverse_verb: "measures", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { data_object_id: 458, related_data_object_id: 462, relationship_verb: "is consumed by", inverse_verb: "consumes", relationship_type: "many_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  { data_object_id: 462, related_data_object_id: 460, relationship_verb: "attributed to", inverse_verb: "attributes usage to", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "target" },
];

async function insertIntraRels() {
  console.log("\n== 5. intra-domain data_object_relationships (B1A-S6) ==");
  const existing = await get(
    "/data_object_relationships?or=(data_object_id.in.(456,457,458,459,460,461,462),related_data_object_id.in.(456,457,458,459,460,461,462))&select=data_object_id,related_data_object_id",
  );
  const seen = new Set(
    existing.map(r => `${r.data_object_id}|${r.related_data_object_id}`),
  );
  const toInsert = intraRels.filter(
    r => !seen.has(`${r.data_object_id}|${r.related_data_object_id}`),
  );
  if (toInsert.length) {
    await post("/data_object_relationships", toInsert);
    for (const r of toInsert)
      console.log(`  +${r.data_object_id} ${r.relationship_verb} ${r.related_data_object_id}`);
  } else {
    console.log("  all intra-domain edges already present, nothing to insert");
  }
  console.log(`  intra-domain rels inserted: ${toInsert.length}`);
  return toInsert.length;
}

// ============================================================
// 6. solutions + solution_domains for flagship vendors (B1A-S3 / A3)
// ============================================================
// Reuse existing vendors by name; create WSO2 if missing. Reuse existing solutions by
// name (MuleSoft Anypoint Platform 173 already exists). Link each via solution_domains
// to domain 79 with coverage_level=primary.
const vendorNames: Record<string, number | null> = {
  Google: 217,
  Kong: 246,
  "Salesforce Inc": 2,
  Microsoft: 25,
  "Amazon Web Services": 223,
  IBM: 15,
  Tyk: 248,
  Postman: 249,
  WSO2: null, // create
};

type SolDef = {
  solution_name: string;
  vendor: string;
  solution_type: string;
  description: string;
  coverage_level: string;
};
const flagshipSolutions: SolDef[] = [
  { solution_name: "Apigee", vendor: "Google", solution_type: "saas", description: "Full lifecycle API management platform for designing, securing, publishing, and analyzing APIs.", coverage_level: "primary" },
  { solution_name: "Kong Konnect", vendor: "Kong", solution_type: "saas", description: "Cloud-native API gateway and management platform with plugin-based policy enforcement.", coverage_level: "primary" },
  { solution_name: "MuleSoft Anypoint Platform", vendor: "Salesforce Inc", solution_type: "saas", description: "Integration and API platform for designing, deploying, and managing APIs.", coverage_level: "primary" },
  { solution_name: "Azure API Management", vendor: "Microsoft", solution_type: "saas", description: "Managed API gateway and developer portal for publishing, securing, and analyzing APIs.", coverage_level: "primary" },
  { solution_name: "Amazon API Gateway", vendor: "Amazon Web Services", solution_type: "saas", description: "Managed service for creating, publishing, securing, and monitoring APIs at scale.", coverage_level: "primary" },
  { solution_name: "IBM API Connect", vendor: "IBM", solution_type: "saas", description: "API lifecycle platform for creating, securing, socializing, and monetizing APIs.", coverage_level: "primary" },
  { solution_name: "Tyk", vendor: "Tyk", solution_type: "hybrid", description: "Open-source-rooted API gateway and management platform with a developer portal.", coverage_level: "primary" },
  { solution_name: "WSO2 API Manager", vendor: "WSO2", solution_type: "hybrid", description: "Open-source API management platform covering the gateway, portal, and lifecycle.", coverage_level: "primary" },
  { solution_name: "Postman API Platform", vendor: "Postman", solution_type: "saas", description: "API design, testing, documentation, and collaboration platform with a public API network.", coverage_level: "primary" },
];

async function linkSolutions() {
  console.log("\n== 6. solutions + solution_domains (B1A-S3) ==");
  // 6a. ensure WSO2 vendor
  let wso2Id = vendorNames["WSO2"];
  if (wso2Id == null) {
    const [v] = await get("/vendors?vendor_name=eq.WSO2&select=id");
    if (v) {
      wso2Id = Number(v.id);
      console.log(`  WSO2 vendor already present (id ${wso2Id})`);
    } else {
      const [created] = await post("/vendors", [
        { vendor_name: "WSO2", vendor_url: "https://wso2.com", headquarters_country: "Sri Lanka", description: "Open-source API management and integration vendor." },
      ]);
      wso2Id = Number(created.id);
      console.log(`  +WSO2 vendor (id ${wso2Id})`);
    }
    vendorNames["WSO2"] = wso2Id;
  }

  // 6b. ensure solutions (look up each by exact name to avoid in()-encoding pitfalls)
  const solByName = new Map<string, number>();
  for (const s of flagshipSolutions) {
    const found = await get(
      `/solutions?solution_name=eq.${encodeURIComponent(s.solution_name)}&select=id,solution_name`,
    );
    if (found.length) solByName.set(s.solution_name, Number(found[0].id));
  }
  const toCreate = flagshipSolutions.filter(s => !solByName.has(s.solution_name));
  let solCreated = 0;
  if (toCreate.length) {
    const bodies = toCreate.map(s => ({
      solution_name: s.solution_name,
      vendor_id: vendorNames[s.vendor],
      solution_type: s.solution_type,
      description: s.description,
      solution_kind: "standard_solution",
      is_active_in_market: true,
    }));
    const created = await post("/solutions", bodies);
    for (const c of created) {
      solByName.set(String(c.solution_name), Number(c.id));
      console.log(`  +solution ${c.solution_name} (id ${c.id})`);
      solCreated++;
    }
  } else {
    console.log("  all flagship solutions already present");
  }

  // 6c. link solution_domains to domain 79
  const existingLinks = await get(
    "/solution_domains?domain_id=eq.79&select=solution_id",
  );
  const linkedSolIds = new Set(existingLinks.map(r => Number(r.solution_id)));
  const linkBodies: Row[] = [];
  for (const s of flagshipSolutions) {
    const sid = solByName.get(s.solution_name);
    if (sid == null) {
      console.log(`  WARN: no solution id for ${s.solution_name}, skip link`);
      continue;
    }
    if (linkedSolIds.has(sid)) {
      console.log(`  skip link ${s.solution_name}: already linked`);
      continue;
    }
    linkBodies.push({ solution_id: sid, domain_id: 79, coverage_level: s.coverage_level });
  }
  let linksCreated = 0;
  if (linkBodies.length) {
    await post("/solution_domains", linkBodies);
    linksCreated = linkBodies.length;
    console.log(`  +${linksCreated} solution_domains links to APIM`);
  } else {
    console.log("  all flagship solution_domains links already present");
  }
  console.log(`  solutions created: ${solCreated}, links created: ${linksCreated}`);
  return { solCreated, linksCreated };
}

// ============================================================
async function main() {
  const counts = {
    entity_type: await classifyEntityTypes(),
    catalog_ux: await authorCatalogUX(),
    bfd_security: await insertSecurityContributor(),
    aliases: await insertAliases(),
    intra_rels: await insertIntraRels(),
    solutions: await linkSolutions(),
  };
  console.log("\n== SUMMARY ==");
  console.log(JSON.stringify(counts, null, 2));
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(456,457,458,459,460,461,462)");
  console.log("  https://tests.semantius.app/domain_map/domains?id=eq.79");
  console.log("  https://tests.semantius.app/domain_map/business_function_domains?domain_id=eq.79");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(456,457,458,459,460,461,462)");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships?data_object_id=in.(456,457,458,459,460,461,462)");
  console.log("  https://tests.semantius.app/domain_map/solution_domains?domain_id=eq.79");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
