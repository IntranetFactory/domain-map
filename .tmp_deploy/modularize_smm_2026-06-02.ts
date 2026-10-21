#!/usr/bin/env bun
// Idempotent modularization loader for the SMM (Social Media Management) domain (id 106).
// Creates 4 full domain_modules, links all 7 existing capabilities, assigns the 6
// in-domain masters + 5 borrowed data_objects at their existing roles. Reuses entities only.
// Safe to re-run.

type Json = any;

const DOMAIN_ID = 106;

async function semantius(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius ${method} ${path} failed: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

type ModuleSpec = {
  domain_module_code: string;
  domain_module_name: string;
  description: string;
};

const MODULES: ModuleSpec[] = [
  {
    domain_module_code: "SMM-PUBLISHING",
    domain_module_name: "Social Publishing and Planning",
    description:
      "Authoring, scheduling, and publishing posts across connected social accounts from a unified queue and editorial calendar, with per-channel variants, approval workflow, bulk upload, an asset library, employee-advocacy content distribution, and cross-channel performance reporting.",
  },
  {
    domain_module_code: "SMM-ENGAGEMENT",
    domain_module_name: "Social Engagement Inbox",
    description:
      "Unified inbox for inbound comments, mentions, direct messages, and reviews on brand-owned accounts, with team assignment, SLA tracking, canned responses, and per-contact conversation history.",
  },
  {
    domain_module_code: "SMM-LISTENING",
    domain_module_name: "Social Listening and Monitoring",
    description:
      "Saved monitoring queries that watch brand mentions, keywords, competitors, hashtags, and sentiment across networks, news, blogs, forums, and review sites, with topic clustering and alerting on off-channel buzz.",
  },
  {
    domain_module_code: "SMM-INFLUENCER",
    domain_module_name: "Influencer and Creator Programs",
    description:
      "Discovery, vetting, contracting, briefing, content review, payment, and measurement of influencer and creator partnerships, including audience-overlap analysis, fraud detection, and user-generated-content campaigns.",
  },
];

// capability_id assignments per module code
const MODULE_CAPABILITIES: Record<string, number[]> = {
  "SMM-PUBLISHING": [125, 129, 131, 128], // SOCIAL-PUB, CONTENT-CAL, EMPLOYEE-ADVOCACY, SOCIAL-ANALYTICS
  "SMM-ENGAGEMENT": [126], // SOCIAL-ENGAGE
  "SMM-LISTENING": [127], // SOCIAL-LISTEN
  "SMM-INFLUENCER": [130], // INFLUENCER-MGMT
};

type DMDORow = { data_object_id: number; role: string; necessity: string };

// data_object assignments per module code.
// In-domain masters (125 social_posts, 126 social_accounts, 127 social_messages,
// 128 social_mentions, 129 social_listening_topics, 130 influencers) keep role=master
// in exactly one module (catalog-wide pre-check 2026-06-02 returned zero existing masters).
// 126 social_accounts is embedded_master in SMM-ENGAGEMENT (single master stays in SMM-PUBLISHING).
// Borrowed rows preserve their existing domain_data_objects role + necessity.
const MODULE_DATA_OBJECTS: Record<string, DMDORow[]> = {
  "SMM-PUBLISHING": [
    { data_object_id: 125, role: "master", necessity: "required" }, // social_posts
    { data_object_id: 126, role: "master", necessity: "required" }, // social_accounts
    { data_object_id: 116, role: "contributor", necessity: "required" }, // marketing_campaigns
    { data_object_id: 113, role: "consumer", necessity: "required" }, // audience_segments
  ],
  "SMM-ENGAGEMENT": [
    { data_object_id: 127, role: "master", necessity: "required" }, // social_messages
    { data_object_id: 126, role: "embedded_master", necessity: "required" }, // social_accounts (mastered in SMM-PUBLISHING)
    { data_object_id: 97, role: "contributor", necessity: "required" }, // customers
    { data_object_id: 98, role: "contributor", necessity: "required" }, // crm_contacts
    { data_object_id: 99, role: "consumer", necessity: "required" }, // crm_leads
  ],
  "SMM-LISTENING": [
    { data_object_id: 128, role: "master", necessity: "required" }, // social_mentions
    { data_object_id: 129, role: "master", necessity: "required" }, // social_listening_topics
  ],
  "SMM-INFLUENCER": [
    { data_object_id: 130, role: "master", necessity: "required" }, // influencers
    { data_object_id: 116, role: "contributor", necessity: "required" }, // marketing_campaigns
  ],
};

async function upsertModules(): Promise<void> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const existing = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=domain_module_code`
  );
  const existingCodes = new Set((existing ?? []).map((r: any) => r.domain_module_code));
  const toInsert = MODULES.filter((m) => !existingCodes.has(m.domain_module_code)).map((m) => ({
    domain_module_name: m.domain_module_name,
    domain_module_code: m.domain_module_code,
    description: m.description,
    domain_id: DOMAIN_ID,
    module_kind: "full",
  }));
  if (toInsert.length) {
    await semantius("POST", "/domain_modules", toInsert);
    console.log(`  +${toInsert.length} domain_modules: ${toInsert.map((m) => m.domain_module_code).join(", ")}`);
  } else {
    console.log("  all modules already present");
  }
}

async function getModuleIdMap(): Promise<Map<string, number>> {
  const codes = MODULES.map((m) => m.domain_module_code);
  const rows = await semantius(
    "GET",
    `/domain_modules?domain_id=eq.${DOMAIN_ID}&domain_module_code=in.(${codes.join(",")})&select=id,domain_module_code`
  );
  const map = new Map<string, number>();
  for (const r of rows ?? []) map.set(r.domain_module_code, r.id);
  for (const code of codes) if (!map.has(code)) throw new Error(`module not found after insert: ${code}`);
  return map;
}

async function upsertCapabilities(idMap: Map<string, number>): Promise<void> {
  for (const [code, capIds] of Object.entries(MODULE_CAPABILITIES)) {
    const moduleId = idMap.get(code)!;
    const existing = await semantius(
      "GET",
      `/domain_module_capabilities?domain_module_id=eq.${moduleId}&capability_id=in.(${capIds.join(",")})&select=capability_id`
    );
    const existingIds = new Set((existing ?? []).map((r: any) => r.capability_id));
    const toInsert = capIds
      .filter((cid) => !existingIds.has(cid))
      .map((cid) => ({ domain_module_id: moduleId, capability_id: cid }));
    if (toInsert.length) {
      await semantius("POST", "/domain_module_capabilities", toInsert);
      console.log(`  +${toInsert.length} DMC rows on ${code}`);
    }
  }
}

async function upsertDataObjects(idMap: Map<string, number>): Promise<void> {
  for (const [code, rows] of Object.entries(MODULE_DATA_OBJECTS)) {
    const moduleId = idMap.get(code)!;
    const doIds = rows.map((r) => r.data_object_id);
    const existing = await semantius(
      "GET",
      `/domain_module_data_objects?domain_module_id=eq.${moduleId}&data_object_id=in.(${doIds.join(",")})&select=data_object_id`
    );
    const existingIds = new Set((existing ?? []).map((r: any) => r.data_object_id));
    const toInsert = rows
      .filter((r) => !existingIds.has(r.data_object_id))
      .map((r) => ({ ...r, domain_module_id: moduleId }));
    if (toInsert.length) {
      await semantius("POST", "/domain_module_data_objects", toInsert);
      console.log(`  +${toInsert.length} DMDO rows on ${code}`);
    }
  }
}

async function main() {
  console.log("=== Modularize SMM (domain 106) ===");
  await upsertModules();
  const idMap = await getModuleIdMap();
  console.log("  module ids:", [...idMap.entries()].map(([c, i]) => `${c}=${i}`).join(", "));
  await upsertCapabilities(idMap);
  await upsertDataObjects(idMap);
  console.log("Done.");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
