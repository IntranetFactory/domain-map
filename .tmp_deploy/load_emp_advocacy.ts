#!/usr/bin/env bun
// EMP-ADVOCACY (Employee Advocacy Platform) full domain build.
// Phases A (market shape) / B (data-object footprint) / C (functional ownership) /
// S (system skill + tools) / E (personas + RACI).
// Idempotent: every table reads existing rows by natural key, inserts only the missing
// ones, re-reads to build a complete natural-key -> id map. Safe to re-run.
//
// Rule #0 CLI only. Rule #1 omit record_status (defaults to new). Rule #15 zero notes.
// Rule #4b TypeScript on Bun. Rule #8 full domain metadata. Rule #18 no vendor names
// outside vendors/solutions/aliases. American English, no em-dash.

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
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
async function syncByKey<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map((r) => String(r[keyField])));
  const missing = rows.filter((r) => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} new (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Generic idempotent junction loader, keyed on a composite natural key derived in JS.
async function syncJunction(
  path: string,
  rows: Row[],
  keyOf: (r: Row) => string,
  selectCols: string,
): Promise<void> {
  if (rows.length === 0) return;
  const existing = await get(`${path}?select=${selectCols}&limit=20000`);
  const existingKeys = new Set(existing.map(keyOf));
  const missing = rows.filter((r) => !existingKeys.has(keyOf(r)));
  if (missing.length > 0) {
    console.log(`  ${path}: inserting ${missing.length} junction rows (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: all ${rows.length} junction rows present`);
  }
}

function validateDomainRow(d: Row): void {
  if (
    !d.crud_percentage ||
    d.min_org_size === "" ||
    d.cost_band === "" ||
    (d.business_logic === "" && (d.crud_percentage as number) < 95) ||
    !d.usa_market_size_usd_m ||
    !d.market_size_source_year
  ) {
    throw new Error(`validateDomainRow failed: ${JSON.stringify(d)}`);
  }
}

// ====== Resolved live IDs (verified before the run) ======
const SMM = 106, EMP_EXP = 62, HCM = 54, INTRANET = 126, REV_INTEL = 103, FRONTLINE = 180;
const USERS_DO = 748;          // platform_builtin
const EMPLOYEES_DO = 31;       // HCM master (HCM-CORE-WORKER, module 54)
const SOCIAL_POSTS_DO = 125;   // SMM master (SMM-PUBLISHING, module 299)
const HCM_CORE_WORKER_MOD = 54;
const SMM_PUBLISHING_MOD = 299;
const SMM_INFLUENCER_MOD = 302;
const REV_INTEL_ACTIVITY_MOD = 190;
const NOTIFY_PERSON = 913, NOTIFY_TEAM = 914;

async function main() {
  console.log("=== EMP-ADVOCACY build ===");

  // ============================================================
  // PHASE A — Market shape
  // ============================================================
  console.log("\n[Phase A] domain + metadata");
  const domainRow: Row = {
    domain_code: "EMP-ADVOCACY",
    domain_name: "Employee Advocacy Platform",
    description:
      "Software market for curating brand content and broadcasting it to employees, who reshare it to their own personal social networks to extend organic reach, strengthen employer brand, and drive social selling. Tracks each employee share, gamifies participation with points and leaderboards, scores advocate influence, generates internal newsletters of shareable content, and attributes resulting clicks, reach, and pipeline back to revenue. Distinct from Social Media Management (brand-owned channels and external influencer programs), Employee Communications and Intranet (internal-only news and announcements), Frontline / Deskless Worker Communication (internal deskless comms), and Employee Experience and Engagement (engagement and pulse surveys). The advocate is an employee resharing externally, not a brand channel and not an internal audience.",
    crud_percentage: 80,
    business_logic:
      "Advocate influence scoring and reach / earned-media-value computation over per-share engagement; share-to-pipeline attribution modeling; gamification point and leaderboard ranking engines; AI content recommendation and personalized share-copy generation for each advocate.",
    min_org_size: "20 s <500",
    cost_band: "$$",
    certification_required: false,
    usa_market_size_usd_m: 380,
    market_size_source_year: 2025,
    catalog_tagline:
      "Turn your employees into your most trusted social channel: curate content, make sharing one click, and measure the reach and pipeline it drives.",
    catalog_description:
      "Give your team a steady stream of approved, on-brand content and let them share it to their own LinkedIn, X, and Facebook networks in a single click, with ready-to-post copy they can personalize. Reward participation with points, badges, and leaderboards, surface your top advocates, and send each person a tailored newsletter of what is worth sharing this week. See exactly what every share earned in clicks, reach, and earned media value, and connect that activity to the pipeline and revenue it influenced. Built for marketing and communications teams who want authentic employee reach without chasing people for screenshots.",
  };
  validateDomainRow(domainRow);
  const domainMap = await syncByKey("/domains", [domainRow], "domain_code");
  const DOMAIN = domainMap.get("EMP-ADVOCACY")!;
  console.log(`  EMP-ADVOCACY domain id = ${DOMAIN}`);

  console.log("[Phase A] capabilities");
  const capabilities = [
    { capability_code: "EMP-ADV-CONTENT-CURATION", capability_name: "Advocacy Content Curation", description: "Sourcing, approving, and packaging brand content into shareable items distributed to employees for resharing." },
    { capability_code: "EMP-ADV-EMPLOYEE-SHARING", capability_name: "Employee Social Sharing", description: "One-click resharing of curated content by employees to their personal social networks, with personalizable share copy." },
    { capability_code: "EMP-ADV-INTERNAL-NEWSLETTERS", capability_name: "Internal Advocacy Newsletters", description: "Automated generation and delivery of personalized digests of shareable content to each advocate." },
    { capability_code: "EMP-ADV-GAMIFICATION", capability_name: "Advocacy Gamification and Leaderboards", description: "Points, badges, challenges, and leaderboards that incentivize and rank employee sharing participation." },
    { capability_code: "EMP-ADV-INFLUENCE-SCORING", capability_name: "Advocate Influence Scoring", description: "Scoring of each advocate's reach and influence based on network size, engagement, and share performance." },
    { capability_code: "EMP-ADV-REACH-ANALYTICS", capability_name: "Advocacy Reach and EMV Analytics", description: "Measurement of clicks, impressions, reach, and earned media value generated by employee shares." },
    { capability_code: "EMP-ADV-REVENUE-ATTRIBUTION", capability_name: "Social Share Revenue Attribution", description: "Attribution of employee-share-driven traffic to leads, pipeline, and revenue for social-selling programs." },
  ];
  const capMap = await syncByKey("/capabilities", capabilities, "capability_code");

  console.log("[Phase A] domain_modules");
  const modules = [
    {
      domain_module_code: "EMP-ADVOCACY-CONTENT-DISTRIBUTION",
      domain_module_name: "Advocacy Content Distribution",
      domain_id: DOMAIN,
      module_kind: "full",
      description:
        "Curates brand content into shareable items, organizes it into topic streams and time-boxed campaigns, broadcasts it to enrolled advocates with personalizable share copy, and records every employee share to their linked social accounts. Masters the advocacy program, content, share, advocate profile, and campaign records; consumes HCM employees and SMM social content; sends each advocate a personalized internal newsletter.",
      catalog_tagline: "Curate on-brand content and put one-click sharing in front of every employee, with copy they can make their own.",
      catalog_description:
        "Build a steady pipeline of approved content, sort it into the topics your people care about, and run focused sharing campaigns around launches and events. Employees enroll, link their LinkedIn, X, and Facebook accounts, and reshare in one click using suggested copy they can personalize. A weekly newsletter lands in each person's inbox with exactly what is worth sharing, so participation does not depend on chasing anyone. Every share is captured automatically, ready to be scored and measured.",
    },
    {
      domain_module_code: "EMP-ADVOCACY-GAMIFICATION-ANALYTICS",
      domain_module_name: "Advocacy Gamification and Analytics",
      domain_id: DOMAIN,
      module_kind: "full",
      description:
        "Incentivizes and measures employee advocacy. Awards points and badges for sharing, ranks advocates on leaderboards, runs a reward catalog with redemptions, scores each advocate's influence, and computes reach, earned media value, and share-to-revenue attribution. Masters the leaderboard, reward, points-ledger, advocate-score, and share-metric records; reads the shares produced by content distribution; hands reach and pipeline signals to Revenue Intelligence.",
      catalog_tagline: "Reward the people who show up, rank your top advocates, and prove the reach and pipeline their shares drive.",
      catalog_description:
        "Turn sharing into something people want to do: award points and badges, run challenges, and put a leaderboard front and center. Let advocates redeem points from a reward catalog, and surface who is genuinely moving the needle with an influence score per person. Then connect the dots to results: clicks, impressions, reach, and earned media value per share, rolled up to the program and tied to the leads and pipeline that employee shares influenced. Marketing finally gets a defensible number for what advocacy is worth.",
    },
  ];
  const modMap = await syncByKey("/domain_modules", modules, "domain_module_code");
  const M_CONTENT = modMap.get("EMP-ADVOCACY-CONTENT-DISTRIBUTION")!;
  const M_GAMIFY = modMap.get("EMP-ADVOCACY-GAMIFICATION-ANALYTICS")!;

  console.log("[Phase A] capability_domains");
  await syncJunction(
    "/capability_domains",
    capabilities.map((c) => ({ capability_id: capMap.get(c.capability_code)!, domain_id: DOMAIN, notes: "" })),
    (r) => `${r.capability_id}|${r.domain_id}`,
    "capability_id,domain_id",
  );

  console.log("[Phase A] domain_module_capabilities");
  const capToModule: Record<string, number> = {
    "EMP-ADV-CONTENT-CURATION": M_CONTENT,
    "EMP-ADV-EMPLOYEE-SHARING": M_CONTENT,
    "EMP-ADV-INTERNAL-NEWSLETTERS": M_CONTENT,
    "EMP-ADV-GAMIFICATION": M_GAMIFY,
    "EMP-ADV-INFLUENCE-SCORING": M_GAMIFY,
    "EMP-ADV-REACH-ANALYTICS": M_GAMIFY,
    "EMP-ADV-REVENUE-ATTRIBUTION": M_GAMIFY,
  };
  await syncJunction(
    "/domain_module_capabilities",
    capabilities.map((c) => ({ domain_module_id: capToModule[c.capability_code], capability_id: capMap.get(c.capability_code)!, notes: "" })),
    (r) => `${r.domain_module_id}|${r.capability_id}`,
    "domain_module_id,capability_id",
  );

  console.log("[Phase A] vendors (reuse + new)");
  const newVendors = [
    { vendor_name: "EveryoneSocial", vendor_url: "https://everyonesocial.com", headquarters_country: "USA", description: "Enterprise employee advocacy and social-selling platform. Acquired by sales-enablement vendor Seismic in 2024 and marketed as EveryoneSocial by Seismic.", notes: "" },
    { vendor_name: "Seismic Software Inc", vendor_url: "https://seismic.com", headquarters_country: "USA", description: "Sales enablement and content platform; owner of the EveryoneSocial employee advocacy product following its 2024 acquisition.", notes: "" },
    { vendor_name: "GaggleAMP Inc", vendor_url: "https://www.gaggleamp.com", headquarters_country: "USA", description: "Independent, founder-owned employee advocacy platform focused on gamified employee content sharing across social networks.", notes: "" },
    { vendor_name: "DSMN8 Ltd", vendor_url: "https://dsmn8.com", headquarters_country: "UK", description: "Independent employee advocacy platform for discovering, sharing, and creating branded content, with usability and analytics focus.", notes: "" },
    { vendor_name: "Oktopost Ltd", vendor_url: "https://www.oktopost.com", headquarters_country: "UK", description: "Independent B2B social engagement suite spanning social media management, employee advocacy, listening, and revenue-connected analytics.", notes: "" },
  ];
  const vendorMap = await syncByKey("/vendors", newVendors, "vendor_name");
  // merge reused vendor ids
  const reusedVendors = await get("/vendors?vendor_name=in.(Hootsuite Inc,Sprinklr Inc,Sprout Social Inc,Sociabble,Haiilo GmbH,Poppulo Limited)&select=id,vendor_name");
  for (const v of reusedVendors) vendorMap.set(String(v.vendor_name), Number(v.id));

  console.log("[Phase A] solutions + solution_domains");
  type SolDef = { solution_name: string; vendor: string; solution_url: string; description: string; coverage: "primary" | "secondary" | "partial" };
  const solutions: SolDef[] = [
    { solution_name: "EveryoneSocial", vendor: "EveryoneSocial", solution_url: "https://everyonesocial.com", description: "Enterprise employee advocacy and social-selling platform: curated content streams, one-click sharing, gamification, advocate analytics, and social-selling attribution.", coverage: "primary" },
    { solution_name: "GaggleAMP", vendor: "GaggleAMP Inc", solution_url: "https://www.gaggleamp.com", description: "Gamification-led employee advocacy platform: assigned share activities, points and leaderboards, and amplification analytics across social networks.", coverage: "primary" },
    { solution_name: "DSMN8 The Employee Advocacy Platform", vendor: "DSMN8 Ltd", solution_url: "https://dsmn8.com", description: "Employee advocacy platform for content discovery, one-click sharing, employee-generated content, leaderboards, and advanced share analytics.", coverage: "primary" },
    { solution_name: "Oktopost", vendor: "Oktopost Ltd", solution_url: "https://www.oktopost.com", description: "B2B social engagement suite combining social media management with employee advocacy, board-and-feed content distribution, and revenue-connected analytics.", coverage: "primary" },
    { solution_name: "Hootsuite Amplify", vendor: "Hootsuite Inc", solution_url: "https://www.hootsuite.com/products/amplify", description: "Employee advocacy module of the Hootsuite social suite: pre-approved content feed for employees to share to their personal networks.", coverage: "primary" },
    { solution_name: "Sprinklr Advocacy", vendor: "Sprinklr Inc", solution_url: "https://www.sprinklr.com", description: "Employee advocacy capability within the Sprinklr unified customer-experience suite for branded content distribution and employee sharing.", coverage: "secondary" },
    { solution_name: "Employee Advocacy by Sprout Social", vendor: "Sprout Social Inc", solution_url: "https://sproutsocial.com", description: "Sprout Social employee advocacy product (formerly Bambu): a curated story feed employees draw from to share to their networks.", coverage: "secondary" },
    // Sociabble solution already exists (id 459, vendor 419); only the solution_domains link is added below.
  ];
  const solMap = await syncByKey(
    "/solutions",
    solutions.map((s) => ({
      solution_name: s.solution_name,
      vendor_id: vendorMap.get(s.vendor)!,
      solution_type: "saas",
      solution_url: s.solution_url,
      description: s.description,
      is_active_in_market: true,
      solution_kind: "standard_solution",
      notes: "",
    })),
    "solution_name",
  );
  // existing Sociabble solution
  const sociabbleSol = await get("/solutions?solution_name=eq.Sociabble&select=id");
  const SOCIABBLE_SOL = Number(sociabbleSol[0]?.id);

  const solDomainRows: Row[] = solutions.map((s) => ({
    solution_id: solMap.get(s.solution_name)!,
    domain_id: DOMAIN,
    coverage_level: s.coverage,
    notes: "",
  }));
  if (SOCIABBLE_SOL) solDomainRows.push({ solution_id: SOCIABBLE_SOL, domain_id: DOMAIN, coverage_level: "primary", notes: "" });
  await syncJunction("/solution_domains", solDomainRows, (r) => `${r.solution_id}|${r.domain_id}`, "solution_id,domain_id");

  // ============================================================
  // PHASE B — Data-object footprint
  // ============================================================
  console.log("\n[Phase B] data_objects");
  // master_module is script-internal (stripped before POST).
  type DOdef = {
    data_object_name: string;
    singular_label: string;
    plural_label: string;
    description: string;
    entity_type: "operational_workflow" | "operational_record" | "catalog" | "junction" | "computed";
    master_module: number;
    has_personal_content?: boolean;
    has_submit_lock?: boolean;
    has_single_approver?: boolean;
  };
  const dataObjects: DOdef[] = [
    // --- Content Distribution module masters ---
    { data_object_name: "advocacy_programs", singular_label: "Advocacy Program", plural_label: "Advocacy Programs", description: "A configured employee advocacy program: its enrolled audience, content topics, sharing rules, branding, and goals. The container an organization runs advocacy within.", entity_type: "operational_workflow", master_module: M_CONTENT },
    { data_object_name: "advocacy_content", singular_label: "Advocacy Content Item", plural_label: "Advocacy Content Items", description: "A curated, approved content item (article, post, image, video, or link) made available to advocates to reshare, with suggested share copy and a sharing window.", entity_type: "operational_workflow", master_module: M_CONTENT, has_submit_lock: true, has_single_approver: true },
    { data_object_name: "advocacy_content_streams", singular_label: "Advocacy Content Stream", plural_label: "Advocacy Content Streams", description: "A topic channel or feed that groups advocacy content by theme so advocates can follow and filter the subjects relevant to them.", entity_type: "catalog", master_module: M_CONTENT },
    { data_object_name: "advocacy_shares", singular_label: "Advocacy Share", plural_label: "Advocacy Shares", description: "A single act of an employee resharing an advocacy content item to one of their linked personal social accounts, including the channel, timestamp, and any personalized copy.", entity_type: "operational_workflow", master_module: M_CONTENT },
    { data_object_name: "advocate_profiles", singular_label: "Advocate Profile", plural_label: "Advocate Profiles", description: "An employee enrolled as an advocate: their participation status, opted-in topics, gamification standing, and the personal social accounts they have linked for sharing.", entity_type: "operational_workflow", master_module: M_CONTENT, has_personal_content: true },
    { data_object_name: "advocacy_social_accounts", singular_label: "Advocate Social Account", plural_label: "Advocate Social Accounts", description: "A personal social network account (LinkedIn, X, Facebook, Instagram) an advocate has connected and authorized for one-click resharing.", entity_type: "operational_record", master_module: M_CONTENT, has_personal_content: true },
    { data_object_name: "advocacy_campaigns", singular_label: "Advocacy Campaign", plural_label: "Advocacy Campaigns", description: "A time-boxed push that groups advocacy content around a launch, event, or theme and sets participation targets for advocates over a defined period.", entity_type: "operational_workflow", master_module: M_CONTENT },
    { data_object_name: "advocacy_internal_newsletters", singular_label: "Advocacy Newsletter", plural_label: "Advocacy Newsletters", description: "An automated, personalized digest of shareable content sent to advocates to prompt participation, generated per advocate from their opted-in topics.", entity_type: "operational_record", master_module: M_CONTENT },
    // --- Gamification and Analytics module masters ---
    { data_object_name: "advocacy_leaderboards", singular_label: "Advocacy Leaderboard", plural_label: "Advocacy Leaderboards", description: "A ranking board of advocates by points, shares, reach, or earned media value over a period, used to recognize and motivate participation.", entity_type: "operational_workflow", master_module: M_GAMIFY },
    { data_object_name: "advocacy_rewards", singular_label: "Advocacy Reward", plural_label: "Advocacy Rewards", description: "A reward in the advocacy catalog that advocates can redeem with earned points (gift cards, swag, recognition), including its cost and redemption lifecycle.", entity_type: "operational_workflow", master_module: M_GAMIFY },
    { data_object_name: "advocacy_points_ledger", singular_label: "Advocacy Points Entry", plural_label: "Advocacy Points Entries", description: "An append-only ledger entry recording points awarded to or redeemed by an advocate for a specific action (share, content creation, challenge completion).", entity_type: "operational_record", master_module: M_GAMIFY },
    { data_object_name: "advocate_scores", singular_label: "Advocate Score", plural_label: "Advocate Scores", description: "A computed influence score for an advocate derived from network size, engagement rate, reach, and share performance over a window.", entity_type: "computed", master_module: M_GAMIFY },
    { data_object_name: "advocacy_share_metrics", singular_label: "Advocacy Share Metric", plural_label: "Advocacy Share Metrics", description: "Per-share engagement measurements: clicks, impressions, reactions, comments, reach, and earned media value attributed to an employee share.", entity_type: "computed", master_module: M_GAMIFY },
    { data_object_name: "advocacy_attribution_records", singular_label: "Advocacy Attribution Record", plural_label: "Advocacy Attribution Records", description: "A record linking advocacy-share-driven traffic to a lead, opportunity, or pipeline value for social-selling attribution and program ROI.", entity_type: "computed", master_module: M_GAMIFY },
  ];
  const insertableDOs = dataObjects.map(({ master_module, ...rest }) => ({
    ...rest,
    has_personal_content: rest.has_personal_content ?? false,
    has_submit_lock: rest.has_submit_lock ?? false,
    has_single_approver: rest.has_single_approver ?? false,
  }));
  const doMap = await syncByKey("/data_objects", insertableDOs, "data_object_name");
  // reference data_objects from other domains
  doMap.set("users", USERS_DO);
  doMap.set("employees", EMPLOYEES_DO);
  doMap.set("social_posts", SOCIAL_POSTS_DO);
  const doid = (name: string): number => {
    const id = doMap.get(name);
    if (!id) throw new Error(`unknown data_object ${name}`);
    return id;
  };

  console.log("[Phase B] domain_module_data_objects");
  type DMDO = { mod: number; name: string; role: "master" | "embedded_master" | "consumer" | "contributor" | "derived"; necessity: "required" | "optional" };
  const dmdo: DMDO[] = [
    // Content Distribution masters
    { mod: M_CONTENT, name: "advocacy_programs", role: "master", necessity: "required" },
    { mod: M_CONTENT, name: "advocacy_content", role: "master", necessity: "required" },
    { mod: M_CONTENT, name: "advocacy_content_streams", role: "master", necessity: "required" },
    { mod: M_CONTENT, name: "advocacy_shares", role: "master", necessity: "required" },
    { mod: M_CONTENT, name: "advocate_profiles", role: "master", necessity: "required" },
    { mod: M_CONTENT, name: "advocacy_social_accounts", role: "master", necessity: "required" },
    { mod: M_CONTENT, name: "advocacy_campaigns", role: "master", necessity: "required" },
    { mod: M_CONTENT, name: "advocacy_internal_newsletters", role: "master", necessity: "optional" },
    // Content Distribution consumes
    { mod: M_CONTENT, name: "employees", role: "consumer", necessity: "required" },
    { mod: M_CONTENT, name: "social_posts", role: "consumer", necessity: "optional" },
    { mod: M_CONTENT, name: "users", role: "consumer", necessity: "required" },
    // Gamification and Analytics masters
    { mod: M_GAMIFY, name: "advocacy_leaderboards", role: "master", necessity: "required" },
    { mod: M_GAMIFY, name: "advocacy_rewards", role: "master", necessity: "optional" },
    { mod: M_GAMIFY, name: "advocacy_points_ledger", role: "master", necessity: "required" },
    { mod: M_GAMIFY, name: "advocate_scores", role: "master", necessity: "required" },
    { mod: M_GAMIFY, name: "advocacy_share_metrics", role: "master", necessity: "required" },
    { mod: M_GAMIFY, name: "advocacy_attribution_records", role: "master", necessity: "optional" },
    // Gamification reads the shares + advocate profiles produced by content distribution (embedded shells for standalone deploy)
    { mod: M_GAMIFY, name: "advocacy_shares", role: "embedded_master", necessity: "required" },
    { mod: M_GAMIFY, name: "advocate_profiles", role: "embedded_master", necessity: "required" },
    { mod: M_GAMIFY, name: "users", role: "consumer", necessity: "required" },
  ];
  await syncJunction(
    "/domain_module_data_objects",
    dmdo.map((d) => ({ domain_module_id: d.mod, data_object_id: doid(d.name), role: d.role, necessity: d.necessity, notes: "" })),
    (r) => `${r.domain_module_id}|${r.data_object_id}`,
    "domain_module_id,data_object_id",
  );

  console.log("[Phase B] data_object_aliases");
  type Alias = { do: string; alias: string; type: "synonym" | "solution_term"; solution?: string };
  const aliases: Alias[] = [
    { do: "advocate_profiles", alias: "brand ambassadors", type: "synonym" },
    { do: "advocate_profiles", alias: "advocates", type: "synonym" },
    { do: "advocacy_content", alias: "shareable content", type: "synonym" },
    { do: "advocacy_content_streams", alias: "topics", type: "synonym" },
    { do: "advocacy_shares", alias: "employee shares", type: "synonym" },
    { do: "advocacy_points_ledger", alias: "gamification points", type: "synonym" },
    { do: "advocate_scores", alias: "influencer scores", type: "synonym" },
    { do: "advocacy_share_metrics", alias: "earned media value", type: "synonym" },
    { do: "advocacy_internal_newsletters", alias: "content digests", type: "synonym" },
  ];
  await syncJunction(
    "/data_object_aliases",
    aliases.map((a) => ({
      data_object_id: doid(a.do),
      alias_name: a.alias,
      alias_type: a.type === "solution_term" ? "solution_term" : "synonym",
      is_preferred: false,
      notes: "",
      ...(a.solution ? { solution_id: solMap.get(a.solution)! } : {}),
    })),
    (r) => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`,
    "data_object_id,alias_name",
  );

  console.log("[Phase B] data_object_lifecycle_states");
  type LState = { do: string; mod: number | null; states: Array<{ name: string; order: number; initial?: boolean; terminal?: boolean; gate?: boolean; verb?: string }> };
  const lifecycles: LState[] = [
    { do: "advocacy_programs", mod: M_CONTENT, states: [
      { name: "draft", order: 1, initial: true },
      { name: "active", order: 2, gate: true, verb: "activate_program" },
      { name: "paused", order: 3 },
      { name: "archived", order: 4, terminal: true },
    ] },
    { do: "advocacy_content", mod: M_CONTENT, states: [
      { name: "submitted", order: 1, initial: true },
      { name: "in_review", order: 2 },
      { name: "approved", order: 3, gate: true, verb: "approve_content" },
      { name: "published", order: 4, gate: true, verb: "publish_content" },
      { name: "expired", order: 5, terminal: true },
      { name: "rejected", order: 6, terminal: true },
    ] },
    { do: "advocacy_shares", mod: M_CONTENT, states: [
      { name: "queued", order: 1, initial: true },
      { name: "posted", order: 2 },
      { name: "failed", order: 3, terminal: true },
      { name: "retracted", order: 4, terminal: true },
    ] },
    { do: "advocate_profiles", mod: M_CONTENT, states: [
      { name: "invited", order: 1, initial: true },
      { name: "active", order: 2 },
      { name: "dormant", order: 3 },
      { name: "opted_out", order: 4, terminal: true },
    ] },
    { do: "advocacy_campaigns", mod: M_CONTENT, states: [
      { name: "planned", order: 1, initial: true },
      { name: "running", order: 2, gate: true, verb: "launch_campaign" },
      { name: "completed", order: 3, terminal: true },
    ] },
    { do: "advocacy_leaderboards", mod: M_GAMIFY, states: [
      { name: "draft", order: 1, initial: true },
      { name: "live", order: 2, gate: true, verb: "publish_leaderboard" },
      { name: "closed", order: 3, terminal: true },
    ] },
    { do: "advocacy_rewards", mod: M_GAMIFY, states: [
      { name: "available", order: 1, initial: true },
      { name: "redeemed", order: 2, gate: true, verb: "approve_redemption" },
      { name: "fulfilled", order: 3, terminal: true },
      { name: "retired", order: 4, terminal: true },
    ] },
  ];
  const lsRows: Row[] = [];
  for (const lc of lifecycles) {
    for (const s of lc.states) {
      lsRows.push({
        data_object_id: doid(lc.do),
        state_name: s.name,
        state_order: s.order,
        is_initial: !!s.initial,
        is_terminal: !!s.terminal,
        requires_permission: !!s.gate,
        permission_verb_override: s.verb ?? "",
        domain_module_id: lc.mod,
      });
    }
  }
  await syncJunction(
    "/data_object_lifecycle_states",
    lsRows,
    (r) => `${r.data_object_id}|${r.state_name}`,
    "data_object_id,state_name",
  );

  console.log("[Phase B] trigger_events");
  type TEvt = { event: string; do: string; from: string; to: string; category: "lifecycle" | "state_change" | "threshold" | "signal"; description: string };
  const events: TEvt[] = [
    { event: "advocacy_content.published", do: "advocacy_content", from: "approved", to: "published", category: "lifecycle", description: "An approved advocacy content item is published to advocates and becomes shareable. Triggers newsletter inclusion and availability in advocate feeds." },
    { event: "advocacy_share.posted", do: "advocacy_shares", from: "queued", to: "posted", category: "lifecycle", description: "An employee share is successfully posted to a linked personal social account. Drives share-metric collection, points award, and downstream reach and attribution." },
    { event: "advocacy_campaign.launched", do: "advocacy_campaigns", from: "planned", to: "running", category: "lifecycle", description: "An advocacy campaign goes live, opening its content set and participation targets to advocates for the campaign window." },
    { event: "advocacy_share.reach_threshold_reached", do: "advocacy_shares", from: "posted", to: "posted", category: "threshold", description: "Cumulative reach or earned media value from advocacy shares crosses a reporting threshold, signaling material program impact for revenue attribution." },
  ];
  await syncJunction(
    "/trigger_events",
    events.map((e) => ({
      event_name: e.event,
      data_object_id: doid(e.do),
      from_state: e.from,
      to_state: e.to,
      event_category: e.category,
      description: e.description,
    })),
    (r) => String(r.event_name),
    "event_name",
  );
  const evtRows = await get(`/trigger_events?event_name=in.(${events.map((e) => e.event).join(",")})&select=id,event_name`);
  const evtMap = new Map<string, number>();
  for (const r of evtRows) evtMap.set(String(r.event_name), Number(r.id));

  console.log("[Phase B] data_object_relationships");
  type Rel = { from: string; to: string; type: "one_to_one" | "one_to_many" | "many_to_many"; kind: "composition" | "reference" | "association" | "inheritance"; verb: string; inverse: string; required: boolean; owner: "source" | "target" };
  const rels: Rel[] = [
    // intra-domain
    { from: "advocacy_programs", to: "advocacy_content", type: "one_to_many", kind: "composition", verb: "curates", inverse: "belongs to", required: true, owner: "source" },
    { from: "advocacy_programs", to: "advocate_profiles", type: "one_to_many", kind: "composition", verb: "enrolls", inverse: "is enrolled in", required: true, owner: "source" },
    { from: "advocacy_programs", to: "advocacy_content_streams", type: "one_to_many", kind: "composition", verb: "organizes", inverse: "belongs to", required: true, owner: "source" },
    { from: "advocacy_content_streams", to: "advocacy_content", type: "one_to_many", kind: "association", verb: "groups", inverse: "is grouped in", required: false, owner: "source" },
    { from: "advocacy_campaigns", to: "advocacy_content", type: "many_to_many", kind: "association", verb: "features", inverse: "is featured in", required: false, owner: "source" },
    { from: "advocate_profiles", to: "advocacy_social_accounts", type: "one_to_many", kind: "composition", verb: "links", inverse: "belongs to", required: false, owner: "source" },
    { from: "advocate_profiles", to: "advocacy_shares", type: "one_to_many", kind: "composition", verb: "performs", inverse: "is performed by", required: true, owner: "source" },
    { from: "advocacy_content", to: "advocacy_shares", type: "one_to_many", kind: "reference", verb: "is reshared as", inverse: "reshares", required: true, owner: "source" },
    { from: "advocacy_shares", to: "advocacy_social_accounts", type: "many_to_one", kind: "reference", verb: "is posted to", inverse: "receives", required: true, owner: "target" },
    { from: "advocacy_shares", to: "advocacy_share_metrics", type: "one_to_one", kind: "composition", verb: "accrues", inverse: "measures", required: false, owner: "source" },
    { from: "advocate_profiles", to: "advocacy_points_ledger", type: "one_to_many", kind: "composition", verb: "earns", inverse: "credits", required: false, owner: "source" },
    { from: "advocate_profiles", to: "advocate_scores", type: "one_to_one", kind: "composition", verb: "is scored as", inverse: "scores", required: false, owner: "source" },
    { from: "advocacy_leaderboards", to: "advocate_profiles", type: "many_to_many", kind: "association", verb: "ranks", inverse: "appears on", required: false, owner: "source" },
    { from: "advocacy_rewards", to: "advocacy_points_ledger", type: "one_to_many", kind: "reference", verb: "is redeemed via", inverse: "debits", required: false, owner: "source" },
    { from: "advocacy_internal_newsletters", to: "advocacy_content", type: "many_to_many", kind: "association", verb: "compiles", inverse: "is compiled into", required: false, owner: "source" },
    { from: "advocacy_share_metrics", to: "advocacy_attribution_records", type: "one_to_many", kind: "reference", verb: "feeds", inverse: "derives from", required: false, owner: "source" },
    // users edges (Rule #10)
    { from: "advocate_profiles", to: "users", type: "one_to_one", kind: "reference", verb: "is the employee", inverse: "is an advocate as", required: true, owner: "target" },
    { from: "advocacy_content", to: "users", type: "many_to_one", kind: "reference", verb: "is curated by", inverse: "curates", required: false, owner: "target" },
    { from: "advocacy_programs", to: "users", type: "many_to_one", kind: "reference", verb: "is managed by", inverse: "manages", required: false, owner: "target" },
    { from: "advocacy_rewards", to: "users", type: "many_to_one", kind: "reference", verb: "is approved by", inverse: "approves", required: false, owner: "target" },
    // cross-domain outbound (payload -> target master)
    { from: "advocate_profiles", to: "employees", type: "one_to_one", kind: "reference", verb: "represents", inverse: "is enrolled as", required: true, owner: "target" },
    { from: "advocacy_content", to: "social_posts", type: "many_to_one", kind: "reference", verb: "draws from", inverse: "seeds", required: false, owner: "target" },
  ];
  // normalize many_to_one -> one_to_many with owner=target (catalog enum has no many_to_one)
  const relRows = rels.map((r) => {
    let type = r.type as string;
    let verb = r.verb, inverse = r.inverse, from = r.from, to = r.to, owner = r.owner;
    if (type === "many_to_one") {
      // flip to one_to_many parent-first
      type = "one_to_many";
      [from, to] = [to, from];
      [verb, inverse] = [inverse, verb];
      owner = owner === "target" ? "source" : "target";
    }
    return {
      data_object_id: doid(from),
      related_data_object_id: doid(to),
      relationship_type: type,
      relationship_kind: r.kind,
      relationship_verb: verb,
      inverse_verb: inverse,
      is_required: r.required,
      owner_side: owner,
      notes: "",
    };
  });
  await syncJunction(
    "/data_object_relationships",
    relRows,
    (r) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`,
    "data_object_id,related_data_object_id,relationship_verb",
  );

  console.log("[Phase B] handoffs");
  // outbound cross-domain + intra-domain cross-module
  type HO = { src: number; tgt: number; srcMod: number | null; tgtMod: number | null; payload: string; event: string; pattern: string; friction: "low" | "medium" | "high"; description: string };
  const handoffs: HO[] = [
    // intra-domain: content distribution -> gamification (share posted drives metrics/points)
    { src: DOMAIN, tgt: DOMAIN, srcMod: M_CONTENT, tgtMod: M_GAMIFY, payload: "advocacy_shares", event: "advocacy_share.posted", pattern: "lifecycle_progression", friction: "low", description: "A posted employee share flows from content distribution into gamification and analytics, where it triggers points award, leaderboard update, share-metric collection, and influence rescoring." },
    // outbound: share posted -> SMM (publishing) for organic social attribution
    { src: DOMAIN, tgt: SMM, srcMod: M_GAMIFY, tgtMod: SMM_PUBLISHING_MOD, payload: "advocacy_share_metrics", event: "advocacy_share.posted", pattern: "api_call", friction: "medium", description: "Employee-share reach and engagement metrics flow to Social Media Management so brand-channel social analytics can fold organic advocacy reach into total social attribution alongside owned-channel performance." },
    // outbound: reach threshold -> REV-INTEL (activity capture) for pipeline attribution
    { src: DOMAIN, tgt: REV_INTEL, srcMod: M_GAMIFY, tgtMod: REV_INTEL_ACTIVITY_MOD, payload: "advocacy_attribution_records", event: "advocacy_share.reach_threshold_reached", pattern: "api_call", friction: "medium", description: "Advocacy-driven reach and pipeline-attribution signals flow to Revenue Intelligence so social-selling activity by employees is captured against accounts and opportunities for revenue analysis." },
    // outbound: content published -> SMM influencer/creator programs (content reuse seam)
    { src: DOMAIN, tgt: SMM, srcMod: M_CONTENT, tgtMod: SMM_INFLUENCER_MOD, payload: "advocacy_content", event: "advocacy_content.published", pattern: "api_call", friction: "low", description: "Published advocacy content is made available to Social Media Management so brand and influencer program teams can coordinate which curated assets employees and external creators amplify." },
  ];
  const handoffRows = handoffs.map((h) => ({
    source_domain_id: h.src,
    target_domain_id: h.tgt,
    source_domain_module_id: h.srcMod,
    target_domain_module_id: h.tgtMod,
    data_object_id: doid(h.payload),
    trigger_event_id: evtMap.get(h.event)!,
    integration_pattern: h.pattern,
    friction_level: h.friction,
    description: h.description,
    notes: "",
  }));
  await syncJunction(
    "/handoffs",
    handoffRows,
    (r) => `${r.source_domain_id}|${r.target_domain_id}|${r.data_object_id}|${r.trigger_event_id}`,
    "source_domain_id,target_domain_id,data_object_id,trigger_event_id",
  );

  // ============================================================
  // PHASE C — Functional ownership
  // ============================================================
  console.log("\n[Phase C] business_function_domains");
  const MARKETING = 22, HR = 3, MKT_COMMS = 56;
  const bfd = [
    { business_function_id: MARKETING, responsibility_type: "owner" },
    { business_function_id: MKT_COMMS, responsibility_type: "contributor" },
    { business_function_id: HR, responsibility_type: "contributor" },
  ];
  await syncJunction(
    "/business_function_domains",
    bfd.map((b) => ({ business_function_id: b.business_function_id, domain_id: DOMAIN, responsibility_type: b.responsibility_type, notes: "" })),
    (r) => `${r.business_function_id}|${r.domain_id}`,
    "business_function_id,domain_id",
  );

  // ============================================================
  // PHASE S — System skill + tools + domain_module_tools
  // ============================================================
  console.log("\n[Phase S] skills");
  await syncByKey(
    "/skills",
    [{ skill_name: "emp-advocacy-system", skill_type: "system", domain_id: DOMAIN, description: "Domain agent for employee advocacy: curate and approve content, broadcast to advocates, post employee shares to external social networks, track shares and reach, run gamification and leaderboards, score advocate influence, generate internal newsletters, and attribute share-driven activity to revenue. Derives its toolset from the advocacy modules' domain_module_tools and discovers which modules are installed at runtime." }],
    "skill_name",
  );

  console.log("[Phase S] tools");
  type ToolDef = { tool_name: string; operation_kind: "query" | "mutate" | "side_effect" | "compute" | "fetch"; do?: string; coverage_tier: "platform" | "external" | "integration"; description: string };
  const tools: ToolDef[] = [
    // queries
    { tool_name: "query_advocacy_content", operation_kind: "query", do: "advocacy_content", coverage_tier: "platform", description: "Read advocacy content items, their approval state, topics, and sharing windows." },
    { tool_name: "query_advocate_profiles", operation_kind: "query", do: "advocate_profiles", coverage_tier: "platform", description: "Read advocate profiles, participation status, opted-in topics, and linked social accounts." },
    { tool_name: "query_advocacy_shares", operation_kind: "query", do: "advocacy_shares", coverage_tier: "platform", description: "Read employee share records across content items, advocates, and channels." },
    { tool_name: "query_advocacy_leaderboards", operation_kind: "query", do: "advocacy_leaderboards", coverage_tier: "platform", description: "Read advocacy leaderboard rankings and standings." },
    { tool_name: "query_advocacy_share_metrics", operation_kind: "query", do: "advocacy_share_metrics", coverage_tier: "platform", description: "Read per-share engagement and earned-media-value metrics." },
    // mutates
    { tool_name: "create_advocacy_content", operation_kind: "mutate", do: "advocacy_content", coverage_tier: "platform", description: "Create or update advocacy content items, suggested share copy, and sharing windows." },
    { tool_name: "approve_advocacy_content", operation_kind: "mutate", do: "advocacy_content", coverage_tier: "platform", description: "Advance advocacy content through review to approved and published states (workflow gate)." },
    { tool_name: "record_advocacy_share", operation_kind: "mutate", do: "advocacy_shares", coverage_tier: "platform", description: "Record an employee share and advance it through queued, posted, or failed states." },
    { tool_name: "award_advocacy_points", operation_kind: "mutate", do: "advocacy_points_ledger", coverage_tier: "platform", description: "Award or debit advocate points for shares, content creation, or challenge completion." },
    { tool_name: "approve_advocacy_reward_redemption", operation_kind: "mutate", do: "advocacy_rewards", coverage_tier: "platform", description: "Approve and fulfill an advocate reward redemption (workflow gate)." },
    // compute
    { tool_name: "compute_advocate_influence_score", operation_kind: "compute", coverage_tier: "external", description: "Compute an advocate influence score from network size, engagement, reach, and share performance." },
    { tool_name: "generate_advocacy_newsletter", operation_kind: "compute", coverage_tier: "external", description: "Generate a personalized newsletter of shareable content for an advocate from their opted-in topics." },
    // fetch / side_effect to external social platforms (Semantius does not own the schema)
    { tool_name: "post_to_social_network", operation_kind: "side_effect", coverage_tier: "external", description: "Post an advocate's reshare to an external personal social network (LinkedIn, X, Facebook) the platform does not own." },
    { tool_name: "fetch_social_share_engagement", operation_kind: "fetch", coverage_tier: "external", description: "Fetch engagement data (clicks, reactions, comments, reach) for a posted share from the external social network API." },
  ];
  const toolMap = await syncByKey(
    "/tools",
    tools.map((t) => ({
      tool_name: t.tool_name,
      operation_kind: t.operation_kind,
      coverage_tier: t.coverage_tier,
      data_object_id: t.do ? doid(t.do) : null,
      description: t.description,
    })),
    "tool_name",
  );
  toolMap.set("notify_person", NOTIFY_PERSON);
  toolMap.set("notify_team", NOTIFY_TEAM);

  console.log("[Phase S] domain_module_tools");
  type DMT = { mod: number; tool: string; level: "required" | "optional" };
  const dmt: DMT[] = [
    // Content Distribution
    { mod: M_CONTENT, tool: "query_advocacy_content", level: "required" },
    { mod: M_CONTENT, tool: "query_advocate_profiles", level: "required" },
    { mod: M_CONTENT, tool: "create_advocacy_content", level: "required" },
    { mod: M_CONTENT, tool: "approve_advocacy_content", level: "required" },
    { mod: M_CONTENT, tool: "record_advocacy_share", level: "required" },
    { mod: M_CONTENT, tool: "post_to_social_network", level: "required" },
    { mod: M_CONTENT, tool: "generate_advocacy_newsletter", level: "optional" },
    { mod: M_CONTENT, tool: "notify_person", level: "optional" },
    // Gamification and Analytics
    { mod: M_GAMIFY, tool: "query_advocacy_shares", level: "required" },
    { mod: M_GAMIFY, tool: "query_advocacy_leaderboards", level: "required" },
    { mod: M_GAMIFY, tool: "query_advocacy_share_metrics", level: "required" },
    { mod: M_GAMIFY, tool: "award_advocacy_points", level: "required" },
    { mod: M_GAMIFY, tool: "approve_advocacy_reward_redemption", level: "optional" },
    { mod: M_GAMIFY, tool: "compute_advocate_influence_score", level: "required" },
    { mod: M_GAMIFY, tool: "fetch_social_share_engagement", level: "required" },
    { mod: M_GAMIFY, tool: "notify_team", level: "optional" },
  ];
  await syncJunction(
    "/domain_module_tools",
    dmt.map((d) => ({ domain_module_id: d.mod, tool_id: toolMap.get(d.tool)!, requirement_level: d.level, notes: "" })),
    (r) => `${r.domain_module_id}|${r.tool_id}`,
    "domain_module_id,tool_id",
  );

  // ============================================================
  // PHASE E — Personas + RACI
  // ============================================================
  console.log("\n[Phase E] domain_roles");
  const roles = [
    { role_code: "MKT-ADVOCACY-PROGRAM-MANAGER", role_name: "Advocacy Program Manager", business_function_id: MARKETING, description: "Owns the employee advocacy program end to end: enrolls advocates, sets topics and goals, runs campaigns, oversees gamification and rewards, and reports reach and pipeline impact to marketing leadership." },
    { role_code: "MKT-ADVOCACY-CONTENT-CURATOR", role_name: "Advocacy Content Curator", business_function_id: MKT_COMMS, description: "Sources, writes, and approves shareable content and suggested share copy, organizes it into topic streams, and keeps the advocate feed and newsletters fresh and on-brand." },
    { role_code: "EMP-ADVOCATE", role_name: "Employee Advocate", business_function_id: null, description: "An enrolled employee who reshares curated content to their personal social networks, earns points and recognition, and represents the employer brand to their own audience." },
  ];
  const roleMap = await syncByKey("/domain_roles", roles, "role_code");

  console.log("[Phase E] role_modules");
  type RM = { role: string; mod: number; level: "primary" | "secondary" };
  const roleModules: RM[] = [
    { role: "MKT-ADVOCACY-PROGRAM-MANAGER", mod: M_CONTENT, level: "primary" },
    { role: "MKT-ADVOCACY-PROGRAM-MANAGER", mod: M_GAMIFY, level: "primary" },
    { role: "MKT-ADVOCACY-CONTENT-CURATOR", mod: M_CONTENT, level: "primary" },
    { role: "MKT-ADVOCACY-CONTENT-CURATOR", mod: M_GAMIFY, level: "secondary" },
    { role: "EMP-ADVOCATE", mod: M_CONTENT, level: "primary" },
    { role: "EMP-ADVOCATE", mod: M_GAMIFY, level: "secondary" },
  ];
  await syncJunction(
    "/role_modules",
    roleModules.map((rm) => ({ role_id: roleMap.get(rm.role)!, domain_module_id: rm.mod, interaction_level: rm.level, notes: "" })),
    (r) => `${r.role_id}|${r.domain_module_id}`,
    "role_id,domain_module_id",
  );

  console.log("[Phase E] wire gated lifecycle states to PCF processes, then process_raci");
  // Real PCF cross-industry nodes that fit employee advocacy:
  //   665  3.3.4.5  Execute promotional activities      -> campaign launch + content publish
  //   666  3.3.4.6  Evaluate promotional performance metrics -> leaderboard publish (reach analytics)
  const PCF_EXECUTE_PROMO = 665;
  const PCF_EVALUATE_PROMO = 666;
  // PATCH process_id onto the matching gated lifecycle states (additive; record_status untouched).
  async function wireProcess(doName: string, stateName: string, processId: number) {
    const did = doid(doName);
    await call({
      method: "PATCH",
      path: `/data_object_lifecycle_states?data_object_id=eq.${did}&state_name=eq.${stateName}&process_id=is.null`,
      body: { process_id: processId },
    });
    console.log(`  wired ${doName}.${stateName} -> process ${processId}`);
  }
  await wireProcess("advocacy_campaigns", "running", PCF_EXECUTE_PROMO);
  await wireProcess("advocacy_content", "published", PCF_EXECUTE_PROMO);
  await wireProcess("advocacy_leaderboards", "live", PCF_EVALUATE_PROMO);

  console.log("[Phase E] process_raci");
  const pmRole = roleMap.get("MKT-ADVOCACY-PROGRAM-MANAGER")!;
  const curatorRole = roleMap.get("MKT-ADVOCACY-CONTENT-CURATOR")!;
  const raci = [
    // Execute promotional activities (665): curator responsible for content; PM accountable
    { process_id: PCF_EXECUTE_PROMO, actor_role_id: curatorRole, raci: "responsible", consultation_blocking: false },
    { process_id: PCF_EXECUTE_PROMO, actor_role_id: pmRole, raci: "accountable", consultation_blocking: false },
    // Evaluate promotional performance metrics (666): PM responsible + accountable for reporting reach
    { process_id: PCF_EVALUATE_PROMO, actor_role_id: pmRole, raci: "responsible", consultation_blocking: false },
    { process_id: PCF_EVALUATE_PROMO, actor_role_id: pmRole, raci: "accountable", consultation_blocking: false },
  ];
  await syncJunction(
    "/process_raci",
    raci,
    (r) => `${r.process_id}|${r.actor_role_id}|${r.raci}`,
    "process_id,actor_role_id,raci",
  );

  console.log("\n=== build complete ===");
  console.log(`DOMAIN_ID=${DOMAIN} M_CONTENT=${M_CONTENT} M_GAMIFY=${M_GAMIFY}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
