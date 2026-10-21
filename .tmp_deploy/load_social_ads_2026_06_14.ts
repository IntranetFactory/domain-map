#!/usr/bin/env bun
// Loads the SOCIAL-ADS (Paid Social Advertising) domain into the live Semantius
// `domain_map` module via the semantius CLI. Idempotent: every table is synced by
// natural key, only missing rows are inserted, then re-read to build id maps.
//
// Phases: A (domain + capabilities + modules + vendors + solutions),
//         B (masters + DMDO + relationships + aliases + lifecycle + events + handoffs),
//         C (business_function_domains), S (system skill + tools + domain_module_tools),
//         E (domain_roles + role_modules + process_raci).
//
// Rules honored: #0 CLI only (no MCP), #1 omit record_status (default new),
// #15 ZERO notes anywhere, #4b TypeScript on Bun, #8 all 7 domain metadata fields,
// #14 >=2 full modules, #16 necessity, #17 one domain-grain system skill + fetch tools,
// #18 no vendor names outside vendors/solutions/aliases, #20 catalog UX fields.

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
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

// Sync by a single natural key. Returns key -> id map over ALL rows (existing + inserted).
async function syncByKey(
  path: string,
  rows: Row[],
  keyField: string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} present (${existing.length} total)`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Sync a junction by a composite key built from the row itself.
async function syncJunction(
  path: string,
  rows: Row[],
  selectCols: string,
  keyOf: (r: Row) => string,
): Promise<void> {
  const existing = await get(`${path}?select=${selectCols}&limit=10000`);
  const existingKeys = new Set(existing.map(keyOf));
  const missing = rows.filter(r => !existingKeys.has(keyOf(r)));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} present (${existing.length} total)`);
  }
}

const out: Record<string, unknown> = {};

// Resolve adjacent domains live (never hard-code).
async function domainId(code: string): Promise<number> {
  const [r] = await get(`/domains?domain_code=eq.${code}&select=id`);
  if (!r) throw new Error(`domain ${code} not found`);
  return Number(r.id);
}

async function main() {
  console.log("== Resolving adjacencies ==");
  const SMM = await domainId("SMM");
  const MA = await domainId("MA");
  const REVINTEL = await domainId("REV-INTEL");
  console.log(`  SMM=${SMM} MA=${MA} REV-INTEL=${REVINTEL}`);

  // ============================================================
  // PHASE A — domain
  // ============================================================
  console.log("== Phase A: domain ==");
  const domainRow = {
    domain_code: "SOCIAL-ADS",
    domain_name: "Paid Social Advertising",
    description:
      "Cross-channel paid social ad campaign orchestration, dynamic creative optimization, ad-set budget reallocation, audience management, and social attribution / incrementality measurement across the Meta, TikTok, LinkedIn, Snapchat, and Pinterest ad platforms. Distinct from SMM (organic social publishing, scheduling, engagement, and listening), from MA (email / SMS lifecycle journeys), and from broader programmatic ad-tech / DSPs. Sits at the paid surface of social: it spends ad budget against social ad accounts, versions and optimizes creative, and ties spend to conversions, where SMM stops at organic reach. Flagship vendors are paid-social pure-plays (Smartly.io, Madgicx, Strike Social, Adsmurai) plus omnichannel performance leaders (Skai).",
    crud_percentage: 55,
    business_logic:
      "Bid and budget optimization across ad sets, dynamic creative optimization (combinatorial generation and performance-weighted selection of creative variants), auto budget reallocation between ad sets on a pacing and ROAS signal, multi-touch attribution and incrementality / conversion-lift modeling, and pacing / anomaly detection on live spend. These are algorithmic decision loops over external ad-platform telemetry rather than declarative CRUD plus state workflow, which is why the JsonLogic-expressible share is moderate.",
    min_org_size: "20 s <500",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 2200,
    market_size_source_year: 2025,
  };
  const domMap = await syncByKey("/domains", [domainRow], "domain_code");
  const SOCIAL_ADS = domMap.get("SOCIAL-ADS")!;
  out.domain_id = SOCIAL_ADS;
  console.log(`  SOCIAL-ADS id=${SOCIAL_ADS}`);

  // catalog UX fields on the domain (Rule #20) — fill empties only.
  {
    const [d] = await get(
      `/domains?id=eq.${SOCIAL_ADS}&select=id,catalog_tagline,catalog_description`,
    );
    const patch: Row = {};
    if (!d.catalog_tagline)
      patch.catalog_tagline =
        "Run paid social across Meta, TikTok, and LinkedIn from one place: orchestrate campaigns, optimize creative, and reallocate budget to what converts.";
    if (!d.catalog_description)
      patch.catalog_description =
        "Manage every paid social campaign across the major ad platforms without living in five ad managers. Structure campaigns, ad sets, and ads against your social ad accounts, build and sync audiences, and push spend where the returns are. Version your creative, let dynamic creative optimization test the combinations, and promote the winners automatically. Watch pacing and performance in real time, reallocate ad-set budgets on a ROAS and pacing signal, and tie spend back to conversions with attribution and incrementality testing so you know what actually drove revenue, not just what the platform reported.";
    if (Object.keys(patch).length > 0) {
      await call({ method: "PATCH", path: `/domains?id=eq.${SOCIAL_ADS}`, body: patch });
      console.log(`  patched domain catalog UX fields: ${Object.keys(patch).join(", ")}`);
    }
  }

  // ---- capabilities ----
  console.log("== Phase A: capabilities ==");
  const capabilities = [
    {
      capability_code: "SOCIAL-ADS-CAMPAIGN-ORCHESTRATION",
      capability_name: "Cross-Channel Paid Social Campaign Orchestration",
      description:
        "Plan, structure, launch, and manage paid social campaigns, ad sets, and ads across multiple ad platforms from a single control surface, keeping objectives, schedules, and placements consistent across Meta, TikTok, LinkedIn, and other social ad channels.",
    },
    {
      capability_code: "SOCIAL-ADS-DCO",
      capability_name: "Dynamic Creative Optimization",
      description:
        "Combinatorially generate and test creative variants from modular assets and product feeds, then weight delivery toward the best-performing combinations automatically.",
    },
    {
      capability_code: "SOCIAL-ADS-BUDGET-REALLOCATION",
      capability_name: "Ad-Set Auto Budget Reallocation",
      description:
        "Continuously redistribute spend across ad sets and campaigns on pacing and return signals, enforcing budget caps and minimizing wasted spend.",
    },
    {
      capability_code: "SOCIAL-ADS-CREATIVE-VERSIONING",
      capability_name: "Social Ad Creative Versioning",
      description:
        "Track creative as versioned assets with named variants, approval state, and platform-specific renditions so teams can iterate, roll back, and audit creative changes.",
    },
    {
      capability_code: "SOCIAL-ADS-ATTRIBUTION-INCREMENTALITY",
      capability_name: "Social Attribution and Incrementality Testing",
      description:
        "Attribute conversions to paid social touchpoints via server-side conversion APIs and measure true incremental lift through holdout and conversion-lift testing rather than relying solely on platform-reported numbers.",
    },
    {
      capability_code: "SOCIAL-ADS-AUDIENCE-MANAGEMENT",
      capability_name: "Audience and Targeting Management",
      description:
        "Build, sync, and govern custom, lookalike, and suppression audiences across ad platforms, including audience refresh from CRM and CDP sources.",
    },
  ];
  const capMap = await syncByKey("/capabilities", capabilities, "capability_code");

  // capability_domains
  await syncJunction(
    "/capability_domains",
    capabilities.map(c => ({ capability_id: capMap.get(c.capability_code)!, domain_id: SOCIAL_ADS })),
    "capability_id,domain_id",
    r => `${r.capability_id}|${r.domain_id}`,
  );

  // ---- modules (>=2 full per Rule #14) ----
  console.log("== Phase A: modules ==");
  const modules = [
    {
      domain_module_code: "SOCIAL-ADS-CAMPAIGN-ORCHESTRATION",
      domain_module_name: "Campaign Orchestration",
      domain_id: SOCIAL_ADS,
      module_kind: "full",
      description:
        "Owns the paid-social campaign structure and live operations: social ad accounts, campaigns, ad sets, ads, audiences, bid strategies, budget allocations, conversion events, and the performance-metric record. Carries the campaign lifecycle and the auto budget-reallocation loop. Used standalone for in-housed paid social and alongside the creative-optimization module when creative versioning is in scope.",
      catalog_tagline:
        "Structure, launch, and steer paid social campaigns across every ad platform from one control plane.",
      catalog_description:
        "Build campaigns, ad sets, and ads against your connected social ad accounts and run them across Meta, TikTok, LinkedIn, and more. Attach audiences and bid strategies, set budgets, and let auto budget reallocation move spend toward the ad sets that are pacing and returning. Ingest conversion events through server-side APIs and watch per-ad performance in real time so the whole paid social estate is managed in one place instead of five native ad managers.",
    },
    {
      domain_module_code: "SOCIAL-ADS-CREATIVE-OPTIMIZATION",
      domain_module_name: "Creative Optimization",
      domain_id: SOCIAL_ADS,
      module_kind: "full",
      description:
        "Owns social ad creative as versioned assets and the dynamic creative optimization loop: creatives, creative variants, creative assets, DCO rules, and product feeds. Generates and tests variant combinations, weights delivery to winners, and keeps a versioned, auditable creative trail. Deploys alongside Campaign Orchestration, which consumes the winning creatives.",
      catalog_tagline:
        "Version your ad creative and let dynamic creative optimization find and scale the winning combinations.",
      catalog_description:
        "Manage creative as versioned assets with named variants, approval state, and platform-specific renditions. Assemble creatives from modular headlines, bodies, images, and product feeds, then let dynamic creative optimization generate and test the combinations and weight delivery toward the best performers. Iterate, roll back, and audit every creative change, and hand the winning variants straight to live campaigns.",
    },
  ];
  const modMap = await syncByKey("/domain_modules", modules, "domain_module_code");
  const M_CAMP = modMap.get("SOCIAL-ADS-CAMPAIGN-ORCHESTRATION")!;
  const M_CREA = modMap.get("SOCIAL-ADS-CREATIVE-OPTIMIZATION")!;
  out.module_campaign_id = M_CAMP;
  out.module_creative_id = M_CREA;

  // domain_module_capabilities (which capability realizes in which module)
  const dmCapPairs: Array<[string, number]> = [
    ["SOCIAL-ADS-CAMPAIGN-ORCHESTRATION", M_CAMP],
    ["SOCIAL-ADS-BUDGET-REALLOCATION", M_CAMP],
    ["SOCIAL-ADS-AUDIENCE-MANAGEMENT", M_CAMP],
    ["SOCIAL-ADS-ATTRIBUTION-INCREMENTALITY", M_CAMP],
    ["SOCIAL-ADS-DCO", M_CREA],
    ["SOCIAL-ADS-CREATIVE-VERSIONING", M_CREA],
  ];
  await syncJunction(
    "/domain_module_capabilities",
    dmCapPairs.map(([code, mid]) => ({
      domain_module_id: mid,
      capability_id: capMap.get(code)!,
    })),
    "domain_module_id,capability_id",
    r => `${r.domain_module_id}|${r.capability_id}`,
  );

  // ---- vendors (all new) ----
  console.log("== Phase A: vendors ==");
  const vendors = [
    {
      vendor_name: "Smartly.io",
      vendor_url: "https://www.smartly.io",
      headquarters_country: "Finland",
      description:
        "Paid social advertising platform for cross-channel campaign orchestration, creative automation, and dynamic creative optimization across Meta, TikTok, Snapchat, and Pinterest.",
    },
    {
      vendor_name: "Madgicx",
      vendor_url: "https://madgicx.com",
      headquarters_country: "Israel",
      description:
        "AI-driven paid social advertising platform focused on Meta ads optimization: audience targeting, creative analytics, and automated bid and budget optimization for e-commerce advertisers.",
    },
    {
      vendor_name: "Strike Social",
      vendor_url: "https://strikesocial.com",
      headquarters_country: "USA",
      description:
        "Social advertising company providing AI-optimized paid social and YouTube ad campaign management as a managed service and proprietary software.",
    },
    {
      vendor_name: "Adsmurai",
      vendor_url: "https://www.adsmurai.com",
      headquarters_country: "Spain",
      description:
        "Paid social advertising platform for campaign management and product-feed-driven dynamic creative across Meta, TikTok, Pinterest, and Google.",
    },
    {
      vendor_name: "Skai",
      vendor_url: "https://skai.io",
      headquarters_country: "Israel",
      description:
        "Omnichannel performance advertising platform covering paid social, paid search, and retail media with incrementality measurement and budget optimization. Formerly Kenshoo.",
    },
  ];
  const venMap = await syncByKey("/vendors", vendors, "vendor_name");

  // ---- solutions ----
  console.log("== Phase A: solutions ==");
  type SolDef = {
    solution_name: string;
    vendor: string;
    solution_type: string;
    solution_url: string;
    description: string;
    coverage: "primary" | "secondary" | "partial";
  };
  const solutions: SolDef[] = [
    {
      solution_name: "Smartly",
      vendor: "Smartly.io",
      solution_type: "saas",
      solution_url: "https://www.smartly.io",
      description:
        "Paid social advertising platform: cross-channel campaign orchestration, template-driven creative automation, dynamic creative optimization, and dynamic product ads across Meta, TikTok, Snapchat, and Pinterest. Absorbed Ad-Lib.io for DCO.",
      coverage: "primary",
    },
    {
      solution_name: "Madgicx",
      vendor: "Madgicx",
      solution_type: "saas",
      solution_url: "https://madgicx.com",
      description:
        "AI Meta-ads optimization platform: creative analytics, AI lookalike audiences, and automated bidding and budget reallocation for high-spend e-commerce advertisers.",
      coverage: "primary",
    },
    {
      solution_name: "Strike Social",
      vendor: "Strike Social",
      solution_type: "saas",
      solution_url: "https://strikesocial.com",
      description:
        "AI-optimized paid social and YouTube ad campaign management software and managed service with proprietary campaign optimization automation.",
      coverage: "primary",
    },
    {
      solution_name: "Adsmurai Marketing Platform",
      vendor: "Adsmurai",
      solution_type: "saas",
      solution_url: "https://www.adsmurai.com",
      description:
        "Paid social campaign management and product-feed-driven dynamic creative across Meta, TikTok, Pinterest, and Google.",
      coverage: "primary",
    },
    {
      solution_name: "Skai Paid Social",
      vendor: "Skai",
      solution_type: "saas",
      solution_url: "https://skai.io/social/",
      description:
        "Paid social product line within Skai's omnichannel performance platform, with cross-channel budget optimization and incrementality measurement. Skai was formerly Kenshoo.",
      coverage: "primary",
    },
  ];
  const solMap = await syncByKey(
    "/solutions",
    solutions.map(s => ({
      solution_name: s.solution_name,
      vendor_id: venMap.get(s.vendor)!,
      solution_type: s.solution_type,
      solution_url: s.solution_url,
      is_active_in_market: true,
      description: s.description,
    })),
    "solution_name",
  );

  await syncJunction(
    "/solution_domains",
    solutions.map(s => ({
      solution_id: solMap.get(s.solution_name)!,
      domain_id: SOCIAL_ADS,
      coverage_level: s.coverage,
    })),
    "solution_id,domain_id",
    r => `${r.solution_id}|${r.domain_id}`,
  );

  // ============================================================
  // PHASE B — masters (data_objects)
  // ============================================================
  console.log("== Phase B: data_objects ==");
  // entity_type drives lifecycle audit; pattern flags are NOT-NULL, set explicitly.
  type DObj = {
    data_object_name: string;
    singular_label: string;
    plural_label: string;
    description: string;
    entity_type: string;
    has_personal_content?: boolean;
    has_submit_lock?: boolean;
    has_single_approver?: boolean;
    module: number; // realizing module for the master DMDO row
  };
  const dobjs: DObj[] = [
    {
      data_object_name: "social_ad_accounts",
      singular_label: "Social Ad Account",
      plural_label: "Social Ad Accounts",
      description:
        "A connected advertiser account on a social ad platform (Meta Business, TikTok Ads, LinkedIn Campaign Manager, etc.) under which campaigns are run and billed.",
      entity_type: "operational_record",
      module: M_CAMP,
    },
    {
      data_object_name: "social_ad_campaigns",
      singular_label: "Social Ad Campaign",
      plural_label: "Social Ad Campaigns",
      description:
        "A paid social campaign defining an advertising objective, schedule, and overall budget, parenting one or more ad sets across one or more ad platforms.",
      entity_type: "operational_workflow",
      has_single_approver: true,
      module: M_CAMP,
    },
    {
      data_object_name: "social_ad_sets",
      singular_label: "Social Ad Set",
      plural_label: "Social Ad Sets",
      description:
        "A targeting and budget unit within a campaign (Meta ad set, TikTok ad group, LinkedIn campaign tier) binding an audience, placements, bid strategy, schedule, and budget to a set of ads.",
      entity_type: "operational_workflow",
      module: M_CAMP,
    },
    {
      data_object_name: "social_ads",
      singular_label: "Social Ad",
      plural_label: "Social Ads",
      description:
        "An individual deliverable ad within an ad set, pairing a creative with destination and tracking parameters and carrying its own delivery and review state on the ad platform.",
      entity_type: "operational_workflow",
      module: M_CAMP,
    },
    {
      data_object_name: "ad_audiences",
      singular_label: "Ad Audience",
      plural_label: "Ad Audiences",
      description:
        "A targetable audience definition: custom (uploaded or pixel-built), lookalike / similar, saved interest-and-demographic, or suppression list, synced to one or more ad platforms.",
      entity_type: "operational_record",
      has_personal_content: true,
      module: M_CAMP,
    },
    {
      data_object_name: "ad_budget_allocations",
      singular_label: "Ad Budget Allocation",
      plural_label: "Ad Budget Allocations",
      description:
        "A budget assignment and pacing record for a campaign or ad set, including caps, the reallocation decisions made by the optimization loop, and the resulting spend split over time.",
      entity_type: "operational_record",
      module: M_CAMP,
    },
    {
      data_object_name: "social_ad_performance_metrics",
      singular_label: "Social Ad Performance Metric",
      plural_label: "Social Ad Performance Metrics",
      description:
        "Time-series delivery and outcome metrics per ad, ad set, or campaign (impressions, clicks, spend, conversions, ROAS, CPA, frequency) pulled from ad-platform insights APIs.",
      entity_type: "computed",
      module: M_CAMP,
    },
    {
      data_object_name: "ad_conversion_events",
      singular_label: "Ad Conversion Event",
      plural_label: "Ad Conversion Events",
      description:
        "A conversion or signal event sent server-side to an ad platform (Meta Conversions API, TikTok Events API) and matched back to paid social delivery for optimization and attribution.",
      entity_type: "operational_record",
      module: M_CAMP,
    },
    {
      data_object_name: "social_ad_creatives",
      singular_label: "Social Ad Creative",
      plural_label: "Social Ad Creatives",
      description:
        "A versioned ad creative: the assembled visual-plus-copy unit (single image, video, carousel, collection) with approval state and platform-specific renditions, used by ads across campaigns.",
      entity_type: "operational_workflow",
      has_submit_lock: true,
      has_single_approver: true,
      module: M_CREA,
    },
    {
      data_object_name: "creative_variants",
      singular_label: "Creative Variant",
      plural_label: "Creative Variants",
      description:
        "A named variation of a creative produced for testing or dynamic creative optimization, combining specific asset choices (headline, body, image, CTA) with its own performance trail.",
      entity_type: "operational_record",
      module: M_CREA,
    },
    {
      data_object_name: "ad_creative_assets",
      singular_label: "Ad Creative Asset",
      plural_label: "Ad Creative Assets",
      description:
        "A reusable creative building block (image, video, headline, body copy, logo, CTA) stored for assembly into creatives and variants.",
      entity_type: "catalog",
      module: M_CREA,
    },
    {
      data_object_name: "dco_rules",
      singular_label: "DCO Rule",
      plural_label: "DCO Rules",
      description:
        "A dynamic creative optimization rule set governing how variants are generated from assets and feeds and how delivery is weighted toward performers.",
      entity_type: "catalog",
      module: M_CREA,
    },
    {
      data_object_name: "ad_product_feeds",
      singular_label: "Ad Product Feed",
      plural_label: "Ad Product Feeds",
      description:
        "A product catalog feed used to drive dynamic product ads and feed-based creative, mapping catalog fields to creative templates per platform.",
      entity_type: "catalog",
      module: M_CREA,
    },
  ];

  const dobjRows = dobjs.map(d => ({
    data_object_name: d.data_object_name,
    singular_label: d.singular_label,
    plural_label: d.plural_label,
    description: d.description,
    kind: "domain_owned",
    entity_type: d.entity_type,
    is_canonical_bare_word: false,
    naming_authority_rationale: "",
    has_personal_content: d.has_personal_content ?? false,
    has_submit_lock: d.has_submit_lock ?? false,
    has_single_approver: d.has_single_approver ?? false,
  }));
  const doMap = await syncByKey("/data_objects", dobjRows, "data_object_name");
  const doid = (name: string): number => {
    const v = doMap.get(name);
    if (!v) throw new Error(`data_object ${name} not found in map`);
    return v;
  };

  // ---- domain_module_data_objects (master rows + Rule #16 necessity) ----
  console.log("== Phase B: domain_module_data_objects ==");
  // Necessity per Rule #16: universal workflow masters required; sector/vendor-conditional optional.
  // ad_product_feeds is vendor/sector-conditional (only feed-driven advertisers) -> master + optional.
  const optionalMasters = new Set(["ad_product_feeds"]);
  const dmdoMaster = dobjs.map(d => ({
    domain_module_id: d.module,
    data_object_id: doid(d.data_object_name),
    role: "master",
    necessity: optionalMasters.has(d.data_object_name) ? "optional" : "required",
  }));
  // Cross-module consumer rows: Campaign Orchestration consumes the winning creatives;
  // Creative Optimization consumes performance metrics to weight variants.
  const dmdoConsumer = [
    {
      domain_module_id: M_CAMP,
      data_object_id: doid("social_ad_creatives"),
      role: "consumer",
      necessity: "optional",
    },
    {
      domain_module_id: M_CREA,
      data_object_id: doid("social_ad_performance_metrics"),
      role: "consumer",
      necessity: "optional",
    },
  ];
  await syncJunction(
    "/domain_module_data_objects",
    [...dmdoMaster, ...dmdoConsumer],
    "domain_module_id,data_object_id,role",
    r => `${r.domain_module_id}|${r.data_object_id}|${r.role}`,
  );

  // ---- data_object_lifecycle_states (operational_workflow masters) ----
  console.log("== Phase B: lifecycle states ==");
  type LState = {
    do: string;
    state: string;
    order: number;
    initial?: boolean;
    terminal?: boolean;
    requiresPerm?: boolean;
    verbOverride?: string;
    module: number;
  };
  const lstates: LState[] = [
    // social_ad_campaigns
    { do: "social_ad_campaigns", state: "draft", order: 1, initial: true, module: M_CAMP },
    { do: "social_ad_campaigns", state: "in_review", order: 2, requiresPerm: true, verbOverride: "submit_campaign", module: M_CAMP },
    { do: "social_ad_campaigns", state: "active", order: 3, requiresPerm: true, verbOverride: "launch_campaign", module: M_CAMP },
    { do: "social_ad_campaigns", state: "paused", order: 4, requiresPerm: true, verbOverride: "pause_campaign", module: M_CAMP },
    { do: "social_ad_campaigns", state: "completed", order: 5, terminal: true, module: M_CAMP },
    { do: "social_ad_campaigns", state: "archived", order: 6, terminal: true, module: M_CAMP },
    // social_ad_sets
    { do: "social_ad_sets", state: "draft", order: 1, initial: true, module: M_CAMP },
    { do: "social_ad_sets", state: "active", order: 2, requiresPerm: true, verbOverride: "activate_ad_set", module: M_CAMP },
    { do: "social_ad_sets", state: "paused", order: 3, module: M_CAMP },
    { do: "social_ad_sets", state: "archived", order: 4, terminal: true, module: M_CAMP },
    // social_ads
    { do: "social_ads", state: "draft", order: 1, initial: true, module: M_CAMP },
    { do: "social_ads", state: "in_review", order: 2, module: M_CAMP },
    { do: "social_ads", state: "active", order: 3, module: M_CAMP },
    { do: "social_ads", state: "rejected", order: 4, terminal: true, module: M_CAMP },
    { do: "social_ads", state: "paused", order: 5, module: M_CAMP },
    { do: "social_ads", state: "archived", order: 6, terminal: true, module: M_CAMP },
    // social_ad_creatives
    { do: "social_ad_creatives", state: "draft", order: 1, initial: true, module: M_CREA },
    { do: "social_ad_creatives", state: "in_review", order: 2, requiresPerm: true, verbOverride: "submit_creative", module: M_CREA },
    { do: "social_ad_creatives", state: "approved", order: 3, requiresPerm: true, verbOverride: "approve_creative", module: M_CREA },
    { do: "social_ad_creatives", state: "published", order: 4, module: M_CREA },
    { do: "social_ad_creatives", state: "archived", order: 5, terminal: true, module: M_CREA },
  ];
  // Sync lifecycle states keyed on (data_object_id, state_name).
  {
    const existing = await get(
      `/data_object_lifecycle_states?select=data_object_id,state_name&limit=10000`,
    );
    const existingKeys = new Set(existing.map(r => `${r.data_object_id}|${r.state_name}`));
    const rows = lstates
      .map(s => ({
        data_object_id: doid(s.do),
        state_name: s.state,
        state_order: s.order,
        is_initial: s.initial ?? false,
        is_terminal: s.terminal ?? false,
        requires_permission: s.requiresPerm ?? false,
        permission_verb_override: s.verbOverride ?? "",
        domain_module_id: s.module,
      }))
      .filter(r => !existingKeys.has(`${r.data_object_id}|${r.state_name}`));
    if (rows.length > 0) {
      console.log(`  /data_object_lifecycle_states: inserting ${rows.length} (${existing.length} existed)`);
      await insert("/data_object_lifecycle_states", rows);
    } else {
      console.log(`  /data_object_lifecycle_states: all present (${existing.length} total)`);
    }
  }

  // ---- data_object_relationships (intra-domain + users edges + cross-domain) ----
  console.log("== Phase B: data_object_relationships ==");
  // Resolve users (platform_builtin) id.
  const [usersRow] = await get(`/data_objects?data_object_name=eq.users&select=id`);
  const USERS = usersRow ? Number(usersRow.id) : null;
  // Pre-load cross-domain target masters where they exist (best-effort; skip if absent).
  const refNames = ["customers", "marketing_campaigns", "social_posts", "leads", "deals", "audiences"];
  const refObjs = await get(
    `/data_objects?data_object_name=in.(${refNames.join(",")})&select=id,data_object_name`,
  );
  const refMap = new Map<string, number>();
  for (const r of refObjs) refMap.set(String(r.data_object_name), Number(r.id));

  type Rel = {
    from: number;
    to: number;
    type: string;
    kind: string;
    verb: string;
    inverse: string;
    required: boolean;
    owner: string;
  };
  const rels: Rel[] = [
    // intra-domain structure
    { from: doid("social_ad_campaigns"), to: doid("social_ad_accounts"), type: "many_to_one" as any, kind: "reference", verb: "runs under", inverse: "hosts", required: true, owner: "target" },
    { from: doid("social_ad_campaigns"), to: doid("social_ad_sets"), type: "one_to_many", kind: "composition", verb: "contains", inverse: "belongs to", required: false, owner: "source" },
    { from: doid("social_ad_sets"), to: doid("social_ads"), type: "one_to_many", kind: "composition", verb: "contains", inverse: "belongs to", required: false, owner: "source" },
    { from: doid("social_ad_sets"), to: doid("ad_audiences"), type: "many_to_one" as any, kind: "reference", verb: "targets", inverse: "is targeted by", required: false, owner: "target" },
    { from: doid("social_ads"), to: doid("social_ad_creatives"), type: "many_to_one" as any, kind: "reference", verb: "renders", inverse: "is rendered by", required: true, owner: "target" },
    { from: doid("ad_budget_allocations"), to: doid("social_ad_sets"), type: "one_to_one", kind: "reference", verb: "paces", inverse: "is paced by", required: false, owner: "target" },
    { from: doid("ad_budget_allocations"), to: doid("social_ad_campaigns"), type: "many_to_one" as any, kind: "reference", verb: "allocates to", inverse: "is allocated by", required: false, owner: "target" },
    { from: doid("social_ad_performance_metrics"), to: doid("social_ads"), type: "many_to_one" as any, kind: "association", verb: "measures", inverse: "is measured by", required: false, owner: "target" },
    { from: doid("ad_conversion_events"), to: doid("social_ads"), type: "many_to_one" as any, kind: "association", verb: "attributes to", inverse: "is attributed", required: false, owner: "target" },
    // creative module
    { from: doid("social_ad_creatives"), to: doid("creative_variants"), type: "one_to_many", kind: "composition", verb: "has variant", inverse: "varies", required: false, owner: "source" },
    { from: doid("creative_variants"), to: doid("ad_creative_assets"), type: "many_to_many", kind: "association", verb: "composed of", inverse: "is used in", required: false, owner: "source" },
    { from: doid("dco_rules"), to: doid("social_ad_creatives"), type: "one_to_many", kind: "reference", verb: "optimizes", inverse: "is optimized by", required: false, owner: "source" },
    { from: doid("ad_product_feeds"), to: doid("social_ad_creatives"), type: "one_to_many", kind: "reference", verb: "feeds", inverse: "is fed by", required: false, owner: "source" },
  ];
  // Normalize relationship_type to live enum (one_to_one / one_to_many / many_to_many).
  const normType = (t: string): string => {
    if (t === "many_to_one") return "one_to_many"; // store from the one-side perspective via owner_side=target
    return t;
  };
  // users edges (Rule #10)
  if (USERS) {
    rels.push(
      { from: USERS, to: doid("social_ad_campaigns"), type: "one_to_many", kind: "association", verb: "manages", inverse: "is managed by", required: false, owner: "source" },
      { from: USERS, to: doid("social_ad_creatives"), type: "one_to_many", kind: "association", verb: "authors", inverse: "is authored by", required: false, owner: "source" },
      { from: USERS, to: doid("social_ad_creatives"), type: "one_to_many", kind: "association", verb: "approves", inverse: "is approved by", required: false, owner: "source" },
      { from: USERS, to: doid("ad_budget_allocations"), type: "one_to_many", kind: "association", verb: "owns", inverse: "is owned by", required: false, owner: "source" },
    );
  }
  // cross-domain edges (only when target master exists live)
  if (refMap.has("social_posts")) {
    rels.push({ from: doid("social_ad_campaigns"), to: refMap.get("social_posts")!, type: "one_to_many", kind: "reference", verb: "promotes", inverse: "is promoted by", required: false, owner: "source" });
  }
  if (refMap.has("audiences")) {
    rels.push({ from: doid("ad_audiences"), to: refMap.get("audiences")!, type: "one_to_one", kind: "association", verb: "syncs from", inverse: "syncs to", required: false, owner: "target" });
  }
  if (refMap.has("customers")) {
    rels.push({ from: doid("ad_conversion_events"), to: refMap.get("customers")!, type: "one_to_many", kind: "association", verb: "converts", inverse: "is converted by", required: false, owner: "target" });
  }
  if (refMap.has("deals")) {
    rels.push({ from: doid("ad_conversion_events"), to: refMap.get("deals")!, type: "one_to_many", kind: "association", verb: "influences", inverse: "is influenced by", required: false, owner: "target" });
  }
  {
    const existing = await get(
      `/data_object_relationships?select=data_object_id,related_data_object_id,relationship_verb&limit=10000`,
    );
    const ekey = (r: Row) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`;
    const existingKeys = new Set(existing.map(ekey));
    const rows = rels
      .map(r => ({
        data_object_id: r.from,
        related_data_object_id: r.to,
        relationship_type: normType(r.type),
        relationship_kind: r.kind,
        relationship_verb: r.verb,
        inverse_verb: r.inverse,
        is_required: r.required,
        owner_side: r.owner,
      }))
      .filter(r => !existingKeys.has(ekey(r)));
    if (rows.length > 0) {
      console.log(`  /data_object_relationships: inserting ${rows.length} (${existing.length} existed)`);
      await insert("/data_object_relationships", rows);
    } else {
      console.log(`  /data_object_relationships: all present (${existing.length} total)`);
    }
  }

  // ---- data_object_aliases ----
  console.log("== Phase B: data_object_aliases ==");
  type Alias = { do: string; alias: string; type: string };
  const aliases: Alias[] = [
    { do: "social_ad_sets", alias: "Ad Group", type: "synonym" },
    { do: "social_ad_sets", alias: "Campaign Tier", type: "synonym" },
    { do: "social_ad_accounts", alias: "Ad Account", type: "synonym" },
    { do: "ad_audiences", alias: "Custom Audience", type: "synonym" },
    { do: "ad_audiences", alias: "Lookalike Audience", type: "synonym" },
    { do: "social_ad_creatives", alias: "Ad Creative", type: "synonym" },
    { do: "creative_variants", alias: "Creative Combination", type: "synonym" },
    { do: "ad_conversion_events", alias: "Conversion Signal", type: "synonym" },
    { do: "social_ad_performance_metrics", alias: "Ad Insights", type: "synonym" },
    { do: "dco_rules", alias: "Dynamic Creative Optimization Ruleset", type: "synonym" },
    { do: "ad_product_feeds", alias: "Catalog Feed", type: "synonym" },
  ];
  {
    const existing = await get(`/data_object_aliases?select=data_object_id,alias_name&limit=10000`);
    const ekey = (r: Row) => `${r.data_object_id}|${r.alias_name}`;
    const existingKeys = new Set(existing.map(ekey));
    const rows = aliases
      .map(a => ({
        data_object_id: doid(a.do),
        alias_name: a.alias,
        alias_type: a.type,
        is_preferred: false,
      }))
      .filter(r => !existingKeys.has(ekey(r)));
    if (rows.length > 0) {
      console.log(`  /data_object_aliases: inserting ${rows.length} (${existing.length} existed)`);
      await insert("/data_object_aliases", rows);
    } else {
      console.log(`  /data_object_aliases: all present (${existing.length} total)`);
    }
  }

  // ---- trigger_events ----
  console.log("== Phase B: trigger_events ==");
  type Evt = {
    name: string;
    do: string;
    from: string;
    to: string;
    category: string;
    description: string;
  };
  const events: Evt[] = [
    {
      name: "social_ad_campaign.launched",
      do: "social_ad_campaigns",
      from: "in_review",
      to: "active",
      category: "lifecycle",
      description:
        "A paid social campaign moved live across its target ad platforms. Downstream: organic-side context in SMM, performance tracking begins.",
    },
    {
      name: "ad_conversion.captured",
      do: "ad_conversion_events",
      from: "",
      to: "captured",
      category: "signal",
      description:
        "A server-side conversion event was matched to paid social delivery. Downstream: attribution and incrementality, revenue analytics.",
    },
    {
      name: "ad_budget.reallocated",
      do: "ad_budget_allocations",
      from: "",
      to: "reallocated",
      category: "state_change",
      description:
        "The optimization loop redistributed spend across ad sets on a pacing and ROAS signal. Downstream: budget owners notified, pacing dashboards update.",
    },
    {
      name: "social_ad_performance.threshold_breached",
      do: "social_ad_performance_metrics",
      from: "",
      to: "breached",
      category: "threshold",
      description:
        "A monitored metric (CPA ceiling, ROAS floor, frequency cap, pacing) crossed a configured threshold. Downstream: alert to the performance marketer, possible auto-pause.",
    },
    {
      name: "social_ad_creative.approved",
      do: "social_ad_creatives",
      from: "in_review",
      to: "approved",
      category: "lifecycle",
      description:
        "A creative cleared review and is eligible to publish into live ads. Downstream: campaign orchestration consumes the approved creative.",
    },
  ];
  {
    const existing = await get(`/trigger_events?select=event_name&limit=10000`);
    const existingKeys = new Set(existing.map(r => String(r.event_name)));
    const rows = events
      .filter(e => !existingKeys.has(e.name))
      .map(e => ({
        event_name: e.name,
        data_object_id: doid(e.do),
        from_state: e.from,
        to_state: e.to,
        description: e.description,
        event_category: e.category,
      }));
    if (rows.length > 0) {
      console.log(`  /trigger_events: inserting ${rows.length} (${existing.length} existed)`);
      await insert("/trigger_events", rows);
    } else {
      console.log(`  /trigger_events: all present (${existing.length} total)`);
    }
  }
  const allEvents = await get(`/trigger_events?select=id,event_name&limit=10000`);
  const evtMap = new Map<string, number>();
  for (const e of allEvents) evtMap.set(String(e.event_name), Number(e.id));

  // ---- handoffs ----
  console.log("== Phase B: handoffs ==");
  type HO = {
    src: number;
    tgt: number;
    payloadDo: string;
    event: string;
    pattern: string;
    friction: string;
    description: string;
    srcMod?: number;
    tgtMod?: number;
  };
  const handoffs: HO[] = [
    {
      src: SOCIAL_ADS,
      tgt: REVINTEL,
      payloadDo: "ad_conversion_events",
      event: "ad_conversion.captured",
      pattern: "event_stream",
      friction: "medium",
      description:
        "Paid social conversion / signal data flows to revenue intelligence for attribution, pipeline influence, and incrementality measurement.",
      srcMod: M_CAMP,
    },
    {
      src: SOCIAL_ADS,
      tgt: MA,
      payloadDo: "ad_conversion_events",
      event: "ad_conversion.captured",
      pattern: "api_call",
      friction: "medium",
      description:
        "Conversion outcomes inform marketing automation nurture and suppression: convert-then-suppress, retarget non-converters.",
      srcMod: M_CAMP,
    },
    {
      src: SOCIAL_ADS,
      tgt: SMM,
      payloadDo: "social_ad_campaigns",
      event: "social_ad_campaign.launched",
      pattern: "api_call",
      friction: "low",
      description:
        "A launched paid campaign gives organic social management context on what is being boosted / promoted so organic and paid stay aligned.",
      srcMod: M_CAMP,
    },
    // intra-domain: approved creative -> live campaign (lifecycle progression across modules)
    {
      src: SOCIAL_ADS,
      tgt: SOCIAL_ADS,
      payloadDo: "social_ad_creatives",
      event: "social_ad_creative.approved",
      pattern: "lifecycle_progression",
      friction: "low",
      description:
        "An approved creative in the Creative Optimization module is picked up by Campaign Orchestration to render live ads.",
      srcMod: M_CREA,
      tgtMod: M_CAMP,
    },
  ];
  {
    const existing = await get(
      `/handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event_id&limit=10000`,
    );
    const ekey = (r: Row) =>
      `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`;
    const existingKeys = new Set(existing.map(ekey));
    const rows = handoffs
      .map(h => ({
        source_domain_id: h.src,
        target_domain_id: h.tgt,
        data_object_id: doid(h.payloadDo),
        trigger_event_id: evtMap.get(h.event)!,
        integration_pattern: h.pattern,
        friction_level: h.friction,
        description: h.description,
        source_domain_module_id: h.srcMod ?? null,
        target_domain_module_id: h.tgtMod ?? null,
      }))
      .filter(r => !existingKeys.has(ekey(r)));
    if (rows.length > 0) {
      console.log(`  /handoffs: inserting ${rows.length} (${existing.length} existed)`);
      await insert("/handoffs", rows);
    } else {
      console.log(`  /handoffs: all present (${existing.length} total)`);
    }
  }

  // ============================================================
  // PHASE C — business_function_domains
  // ============================================================
  console.log("== Phase C: business_function_domains ==");
  const [mktBf] = await get(`/business_functions?business_function_name=eq.Marketing&select=id`);
  const MARKETING = Number(mktBf.id);
  const [salesBf] = await get(`/business_functions?business_function_name=eq.Sales&select=id`);
  const SALES = salesBf ? Number(salesBf.id) : null;
  const bfd = [{ business_function_id: MARKETING, domain_id: SOCIAL_ADS, responsibility_type: "owner" }];
  if (SALES) bfd.push({ business_function_id: SALES, domain_id: SOCIAL_ADS, responsibility_type: "consumer" });
  await syncJunction(
    "/business_function_domains",
    bfd,
    "business_function_id,domain_id",
    r => `${r.business_function_id}|${r.domain_id}`,
  );

  // ============================================================
  // PHASE S — system skill + tools + domain_module_tools
  // ============================================================
  console.log("== Phase S: tools ==");
  type ToolDef = {
    tool_name: string;
    operation_kind: string;
    coverage_tier: string;
    data_object?: string;
    description: string;
  };
  const tools: ToolDef[] = [
    // query (platform / Semantius-covered)
    { tool_name: "query_social_ad_campaigns", operation_kind: "query", coverage_tier: "platform", data_object: "social_ad_campaigns", description: "Read paid social campaigns, their structure, and live state." },
    { tool_name: "query_social_ad_performance_metrics", operation_kind: "query", coverage_tier: "platform", data_object: "social_ad_performance_metrics", description: "Read time-series performance metrics for ads, ad sets, and campaigns." },
    { tool_name: "query_ad_budget_allocations", operation_kind: "query", coverage_tier: "platform", data_object: "ad_budget_allocations", description: "Read budget allocations, caps, and pacing per campaign and ad set." },
    { tool_name: "query_social_ad_creatives", operation_kind: "query", coverage_tier: "platform", data_object: "social_ad_creatives", description: "Read creatives, their variants, and approval state." },
    // mutate (platform)
    { tool_name: "create_social_ad_campaign", operation_kind: "mutate", coverage_tier: "platform", data_object: "social_ad_campaigns", description: "Create or update a paid social campaign and its structure." },
    { tool_name: "reallocate_ad_budget", operation_kind: "mutate", coverage_tier: "platform", data_object: "ad_budget_allocations", description: "Write a budget reallocation decision across ad sets and campaigns." },
    { tool_name: "approve_social_ad_creative", operation_kind: "mutate", coverage_tier: "platform", data_object: "social_ad_creatives", description: "Advance a creative through its review and approval workflow." },
    // fetch (external ad-platform APIs Semantius does not master)
    { tool_name: "fetch_meta_ads_insights", operation_kind: "fetch", coverage_tier: "external", description: "Fetch campaign, ad-set, and ad delivery insights from the Meta (Facebook / Instagram) Marketing API." },
    { tool_name: "fetch_tiktok_ads_insights", operation_kind: "fetch", coverage_tier: "external", description: "Fetch delivery and conversion insights from the TikTok Marketing API." },
    { tool_name: "fetch_linkedin_ads_insights", operation_kind: "fetch", coverage_tier: "external", description: "Fetch campaign analytics from the LinkedIn Marketing (Campaign Manager) API." },
    { tool_name: "push_ad_platform_campaign", operation_kind: "fetch", coverage_tier: "external", description: "Push campaign, ad-set, ad, and budget changes out to the Meta, TikTok, and LinkedIn ad platforms via their Marketing APIs." },
    { tool_name: "send_ad_conversion_event", operation_kind: "fetch", coverage_tier: "external", description: "Send a server-side conversion event to an ad platform via the Meta Conversions API or TikTok Events API." },
    // side_effect (notifications)
    { tool_name: "notify_person", operation_kind: "side_effect", coverage_tier: "external", description: "Notify a single person (e.g. the performance marketer on a threshold breach or budget reallocation)." },
    { tool_name: "notify_team", operation_kind: "side_effect", coverage_tier: "external", description: "Broadcast a notification to a team (e.g. campaign launched, pacing anomaly)." },
  ];
  {
    const existing = await get(`/tools?select=tool_name&limit=10000`);
    const existingNames = new Set(existing.map(r => String(r.tool_name)));
    const rows = tools
      .filter(t => !existingNames.has(t.tool_name))
      .map(t => {
        const r: Row = {
          tool_name: t.tool_name,
          operation_kind: t.operation_kind,
          coverage_tier: t.coverage_tier,
          description: t.description,
        };
        // data_object_id required for query/mutate; must be null for fetch/side_effect/compute.
        if (t.operation_kind === "query" || t.operation_kind === "mutate") {
          r.data_object_id = doid(t.data_object!);
        }
        return r;
      });
    if (rows.length > 0) {
      console.log(`  /tools: inserting ${rows.length} (${existing.length} existed)`);
      await insert("/tools", rows);
    } else {
      console.log(`  /tools: all present (${existing.length} total)`);
    }
  }
  const allTools = await get(`/tools?select=id,tool_name&limit=10000`);
  const toolMap = new Map<string, number>();
  for (const t of allTools) toolMap.set(String(t.tool_name), Number(t.id));

  // system skill (one per domain, domain_id set, domain_module_id NULL)
  console.log("== Phase S: system skill ==");
  {
    const existing = await get(
      `/skills?skill_name=eq.social-ads-system&select=id`,
    );
    if (existing.length === 0) {
      await insert("/skills", [
        {
          skill_name: "social-ads-system",
          skill_type: "system",
          domain_id: SOCIAL_ADS,
          description:
            "The agent surface for the Paid Social Advertising domain. Derives its toolset from the domain's modules' domain_module_tools: read and mutate campaigns, budgets, and creatives in Semantius; fetch insights and push changes to the Meta, TikTok, and LinkedIn ad platforms; send server-side conversion events; and notify owners on threshold breaches and budget reallocations.",
        },
      ]);
      console.log("  /skills: inserted social-ads-system");
    } else {
      console.log("  /skills: social-ads-system present");
    }
  }

  // domain_module_tools (which tools each module requires)
  console.log("== Phase S: domain_module_tools ==");
  type DMT = { module: number; tool: string; level: string };
  const dmt: DMT[] = [
    // Campaign Orchestration
    { module: M_CAMP, tool: "query_social_ad_campaigns", level: "required" },
    { module: M_CAMP, tool: "query_social_ad_performance_metrics", level: "required" },
    { module: M_CAMP, tool: "query_ad_budget_allocations", level: "required" },
    { module: M_CAMP, tool: "create_social_ad_campaign", level: "required" },
    { module: M_CAMP, tool: "reallocate_ad_budget", level: "required" },
    { module: M_CAMP, tool: "fetch_meta_ads_insights", level: "required" },
    { module: M_CAMP, tool: "fetch_tiktok_ads_insights", level: "optional" },
    { module: M_CAMP, tool: "fetch_linkedin_ads_insights", level: "optional" },
    { module: M_CAMP, tool: "push_ad_platform_campaign", level: "required" },
    { module: M_CAMP, tool: "send_ad_conversion_event", level: "optional" },
    { module: M_CAMP, tool: "notify_person", level: "optional" },
    { module: M_CAMP, tool: "notify_team", level: "optional" },
    // Creative Optimization
    { module: M_CREA, tool: "query_social_ad_creatives", level: "required" },
    { module: M_CREA, tool: "approve_social_ad_creative", level: "required" },
    { module: M_CREA, tool: "query_social_ad_performance_metrics", level: "required" },
    { module: M_CREA, tool: "notify_person", level: "optional" },
  ];
  await syncJunction(
    "/domain_module_tools",
    dmt.map(d => ({
      domain_module_id: d.module,
      tool_id: toolMap.get(d.tool)!,
      requirement_level: d.level,
    })),
    "domain_module_id,tool_id",
    r => `${r.domain_module_id}|${r.tool_id}`,
  );

  // ============================================================
  // PHASE E — domain_roles + role_modules + process_raci
  // ============================================================
  console.log("== Phase E: domain_roles ==");
  const roles = [
    {
      role_code: "MARKETING-PAID-SOCIAL-MANAGER",
      role_name: "Paid Social Manager",
      business_function_id: MARKETING,
      description:
        "Owns the paid social estate: campaign strategy, budget allocation across platforms, and overall performance against targets. Accountable for spend and results.",
    },
    {
      role_code: "MARKETING-PERFORMANCE-MARKETER",
      role_name: "Performance Marketer",
      business_function_id: MARKETING,
      description:
        "Operates day-to-day optimization: bid and budget tuning, audience iteration, pacing, and responding to threshold breaches across ad sets.",
    },
    {
      role_code: "MARKETING-CREATIVE-STRATEGIST",
      role_name: "Creative Strategist",
      business_function_id: MARKETING,
      description:
        "Owns ad creative: concepts and variants, dynamic creative optimization rules, and the creative approval workflow that feeds live campaigns.",
    },
  ];
  const roleMap = await syncByKey("/domain_roles", roles, "role_code");

  // role_modules (>=2 modules per persona floor)
  console.log("== Phase E: role_modules ==");
  type RM = { role: string; module: number; level: string };
  const roleModules: RM[] = [
    { role: "MARKETING-PAID-SOCIAL-MANAGER", module: M_CAMP, level: "primary" },
    { role: "MARKETING-PAID-SOCIAL-MANAGER", module: M_CREA, level: "secondary" },
    { role: "MARKETING-PERFORMANCE-MARKETER", module: M_CAMP, level: "primary" },
    { role: "MARKETING-PERFORMANCE-MARKETER", module: M_CREA, level: "secondary" },
    { role: "MARKETING-CREATIVE-STRATEGIST", module: M_CREA, level: "primary" },
    { role: "MARKETING-CREATIVE-STRATEGIST", module: M_CAMP, level: "secondary" },
  ];
  await syncJunction(
    "/role_modules",
    roleModules.map(rm => ({
      role_id: roleMap.get(rm.role)!,
      domain_module_id: rm.module,
      interaction_level: rm.level,
    })),
    "role_id,domain_module_id",
    r => `${r.role_id}|${r.domain_module_id}`,
  );

  // process_raci (real cross-industry PCF marketing nodes)
  // 23 = 3.3 Develop and manage marketing plans (L2); 134 = 3.3.2 Establish marketing budgets (L3);
  // 662 = 3.3.4.2 Develop marketing messages (L4).
  console.log("== Phase E: process_raci ==");
  type RACI = { processId: number; role: string; raci: string; blocking?: boolean };
  const raci: RACI[] = [
    { processId: 23, role: "MARKETING-PAID-SOCIAL-MANAGER", raci: "accountable" },
    { processId: 23, role: "MARKETING-PERFORMANCE-MARKETER", raci: "responsible" },
    { processId: 134, role: "MARKETING-PAID-SOCIAL-MANAGER", raci: "responsible" },
    { processId: 134, role: "MARKETING-PERFORMANCE-MARKETER", raci: "consulted", blocking: false },
    { processId: 662, role: "MARKETING-CREATIVE-STRATEGIST", raci: "responsible" },
    { processId: 662, role: "MARKETING-PAID-SOCIAL-MANAGER", raci: "accountable" },
  ];
  {
    const existing = await get(
      `/process_raci?select=process_id,actor_role_id,raci&limit=10000`,
    );
    const ekey = (r: Row) => `${r.process_id}|${r.actor_role_id}|${r.raci}`;
    const existingKeys = new Set(existing.map(ekey));
    const rows = raci
      .map(r => ({
        process_id: r.processId,
        actor_role_id: roleMap.get(r.role)!,
        raci: r.raci,
        consultation_blocking: r.blocking ?? false,
      }))
      .filter(r => !existingKeys.has(ekey(r)));
    if (rows.length > 0) {
      console.log(`  /process_raci: inserting ${rows.length} (${existing.length} existed)`);
      await insert("/process_raci", rows);
    } else {
      console.log(`  /process_raci: all present (${existing.length} total)`);
    }
  }

  console.log("\n== DONE ==");
  console.log(JSON.stringify(out, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
