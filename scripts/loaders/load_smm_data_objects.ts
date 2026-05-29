#!/usr/bin/env bun
// Loads the SMM data-object footprint into the domain_map module:
//   - 6 new data_objects (SMM-mastered)
//   - 11 domain_data_objects rows (6 master + 3 contributor + 2 consumer)
//   - 6 cross_domain_handoffs rows (SMM → CSM/CRM/CDP/MA)
// Idempotent: reads natural/composite keys first, only inserts missing rows.

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

// ============================================================
// DATA OBJECTS (SMM-mastered)
// ============================================================
const newDataObjects = [
  {
    data_object_name: "social_posts",
    singular_label: "Social Post",
    plural_label: "Social Posts",
    display_label: "Social Post",
    description:
      "Authored social-channel post (draft, scheduled, or published) with per-channel variants, media assets, copy, lifecycle state, and approval history. The unit of work in publishing tools.",
  },
  {
    data_object_name: "social_accounts",
    singular_label: "Social Account",
    plural_label: "Social Accounts",
    display_label: "Social Account",
    description:
      "Brand-owned connected account on a specific social network (Facebook Page, Instagram Business, LinkedIn Company Page, X Handle, TikTok account, YouTube channel, Pinterest, Reddit) with credentials, permissions, and channel-specific metadata.",
  },
  {
    data_object_name: "social_messages",
    singular_label: "Social Message",
    plural_label: "Social Messages",
    display_label: "Social Message",
    description:
      "Inbound conversation in the unified inbox: comment, direct message, mention-reply, or review on a brand-owned account. The unit of engagement. Distinct from social_mentions (off-channel listening artifacts).",
  },
  {
    data_object_name: "social_mentions",
    singular_label: "Social Mention",
    plural_label: "Social Mentions",
    display_label: "Social Mention",
    description:
      "Brand or keyword mention detected by social listening across networks, news, blogs, forums, and review sites — typically off-channel and from non-followers. Distinct from social_messages (on-channel inbox).",
  },
  {
    data_object_name: "social_listening_topics",
    singular_label: "Social Listening Topic",
    plural_label: "Social Listening Topics",
    display_label: "Social Listening Topic",
    description:
      "Saved monitoring query/topic (keywords, hashtags, competitors, geographies, sentiment filters) that drives the listening pipeline. Configuration data with a long lifecycle.",
  },
  {
    data_object_name: "influencers",
    singular_label: "Influencer",
    plural_label: "Influencers",
    display_label: "Influencer",
    description:
      "Creator/influencer profile managed in influencer-marketing tools: audience metrics, content history, contracts, payments, and campaign attribution. Distinct from contacts (which represent customer/prospect individuals).",
  },
];

// ============================================================
// DOMAIN_DATA_OBJECTS (master / contributor / consumer roles)
// ============================================================
// SMM domain_code is referenced; existing data_objects referenced by name; existing domain ids resolved at runtime.
type DdoSpec = {
  domain_code: string;
  data_object_name: string;
  role: "master" | "contributor" | "consumer" | "derived";
  notes?: string;
};

const ddoRows: DdoSpec[] = [
  // SMM as master of the 6 new objects
  { domain_code: "SMM", data_object_name: "social_posts", role: "master", notes: "" },
  { domain_code: "SMM", data_object_name: "social_accounts", role: "master", notes: "" },
  {
    domain_code: "SMM",
    data_object_name: "social_messages",
    role: "master",
    notes:
      "Owns inbound on-channel conversations (comments, DMs, mention-replies, reviews). CSM is a consumer that creates cases from messages — cases remain a CSM-mastered separate data_object.",
  },
  {
    domain_code: "SMM",
    data_object_name: "social_mentions",
    role: "master",
    notes:
      "Owns off-channel brand/keyword mentions surfaced by listening. CDP is a consumer (engagement signals for unified profile); CSM is a consumer (negative-sentiment-triggered proactive outreach).",
  },
  { domain_code: "SMM", data_object_name: "social_listening_topics", role: "master", notes: "" },
  { domain_code: "SMM", data_object_name: "influencers", role: "master", notes: "" },

  // SMM as contributor to existing cluster-owned objects
  {
    domain_code: "SMM",
    data_object_name: "customers",
    role: "contributor",
    notes:
      "Contributes social-channel engagement signals (likes, shares, replies, video views), sentiment, and channel preferences. Identity-resolved by CDP into the unified profile alongside CRM/CSM/SUB-MGMT operational records.",
  },
  {
    domain_code: "SMM",
    data_object_name: "contacts",
    role: "contributor",
    notes:
      "Contributes social handles per network, public profile data, social engagement state, and engagement-derived lifecycle attributes that enrich the CRM-mastered contact record.",
  },
  {
    domain_code: "SMM",
    data_object_name: "campaigns",
    role: "contributor",
    notes:
      "Contributes the social-channel and influencer-marketing slice of multi-channel campaigns. MA masters the umbrella campaign; SMM owns per-channel social assets, schedules, and performance.",
  },

  // SMM as consumer of existing CDP/CRM-owned objects
  {
    domain_code: "SMM",
    data_object_name: "audience_segments",
    role: "consumer",
    notes:
      "Reads CDP-mastered segments for targeted organic posts and paid amplification (custom audiences, lookalikes).",
  },
  {
    domain_code: "SMM",
    data_object_name: "leads",
    role: "consumer",
    notes:
      "Reads CRM-mastered leads to match social interactions back to known leads (handle → contact → lead resolution).",
  },
];

// ============================================================
// CROSS_DOMAIN_HANDOFFS (Signal 2)
// ============================================================
type HandoffSpec = {
  source_domain_code: string;
  target_domain_code: string;
  data_object_name: string;
  trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "high" | "medium" | "low";
  description: string;
  notes?: string;
};

const handoffs: HandoffSpec[] = [
  {
    source_domain_code: "SMM",
    target_domain_code: "CSM",
    data_object_name: "social_messages",
    trigger_event: "social_message.received",
    integration_pattern: "api_call",
    friction_level: "high",
    description:
      "Inbound social message (comment, DM, mention-reply) classified as a service issue (complaint, order question, technical problem) triggers case creation in CSM with the message payload, customer context (if resolvable), and channel metadata. Failure modes: classifier misfires flood the CSM queue with non-service items; social-handle-to-customer-record reconciliation is unreliable across networks; cases reopened in CSM rarely sync back to the originating SMM thread, fragmenting conversation history.",
    notes: "Probabilistic-signal-becomes-deterministic-action pattern; aggravated by identity reconciliation across handle namespaces.",
  },
  {
    source_domain_code: "SMM",
    target_domain_code: "CSM",
    data_object_name: "social_mentions",
    trigger_event: "social_mention.detected",
    integration_pattern: "event_stream",
    friction_level: "high",
    description:
      "Listening pipeline detects a brand/product mention with negative sentiment or high reach off-channel (Reddit thread, Twitter complaint without @mention, review-site post) and routes it to CSM for proactive outreach. Failure modes: sentiment classification false positives consume agent time; off-channel mentions rarely include a resolvable customer identity; coordination with PR/comms is manual.",
    notes: "Off-channel companion to social_message.received; same probabilistic-signal shape but without an inbox conversation to reply into.",
  },
  {
    source_domain_code: "SMM",
    target_domain_code: "CRM",
    data_object_name: "leads",
    trigger_event: "social_lead.captured",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "Social interaction with explicit intent — DM asking pricing, click-through on a lead-gen form, message-ad reply — converts into a CRM-mastered lead with handle, captured form data, and source attribution. Failure modes: handle-to-existing-contact reconciliation produces duplicate leads; form-data quality from social lead-gen ads is inconsistent across networks (Meta Lead Ads, LinkedIn Lead Gen Forms, TikTok Lead Generation).",
    notes: "Identity-reconciliation pattern; usually well-supported in MA/CRM connectors but quality is uneven.",
  },
  {
    source_domain_code: "SMM",
    target_domain_code: "CDP",
    data_object_name: "customers",
    trigger_event: "social_engagement.recorded",
    integration_pattern: "event_stream",
    friction_level: "high",
    description:
      "Social engagement events (likes, shares, comments, video-view depth, story interactions, profile visits) stream to CDP to enrich the unified customer profile with behavioral signals across channels. Failure modes: identity reconciliation across handle namespaces (Facebook ID, Instagram ID, LinkedIn URN, X user ID, TikTok ID) is unreliable; many engagement events lack a resolvable user; cross-platform deduplication of the same person is hard.",
    notes: "Identity-reconciliation pattern at scale; the single biggest CDP-enrichment headache in the social stack.",
  },
  {
    source_domain_code: "SMM",
    target_domain_code: "MA",
    data_object_name: "campaigns",
    trigger_event: "influencer_campaign.completed",
    integration_pattern: "batch_sync",
    friction_level: "medium",
    description:
      "Completed influencer-marketing campaign performance (reach, engagement, conversions, earned media value, content samples) feeds back from the influencer tool to MA campaign attribution and ROI reporting. Failure modes: cross-vendor schemas don't align on attribution windows; influencer-driven conversions are hard to attribute deterministically; payout reconciliation is often manual.",
    notes: "Cross-vendor stack pattern — influencer module (Tagger, Klear, Brandwatch Influence) ≠ MA platform; lossy aggregation common.",
  },
  {
    source_domain_code: "SMM",
    target_domain_code: "MA",
    data_object_name: "campaigns",
    trigger_event: "social_post.published",
    integration_pattern: "api_call",
    friction_level: "medium",
    description:
      "Published social post tied to a multi-channel campaign in MA emits a publish event with channel, post URL, and tracked UTM parameters so MA can attribute downstream conversions to the campaign. Failure modes: campaign-id mapping between SMM tool and MA platform is brittle; UTM consistency depends on author discipline; engagement data from the social network arrives on a different cadence than the publish event.",
    notes: "Cross-vendor stack pattern; weakest of the six handoffs — implementation-dependent and bypassable in single-vendor stacks.",
  },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Data objects ===");
  const existingDoRaw = await get("/data_objects?select=id,data_object_name&limit=10000");
  const existingDoNames = new Set(existingDoRaw.map(r => String(r.data_object_name)));
  const missingDo = newDataObjects.filter(d => !existingDoNames.has(d.data_object_name));
  if (missingDo.length > 0) {
    console.log(`  inserting ${missingDo.length} new data_objects (${existingDoRaw.length} existed)`);
    await insert("/data_objects", missingDo);
  } else {
    console.log(`  no new data_objects to insert`);
  }
  const allDoRaw = await get("/data_objects?select=id,data_object_name&limit=10000");
  const doMap = new Map<string, number>();
  for (const r of allDoRaw) doMap.set(String(r.data_object_name), Number(r.id));

  // Domain map (existing + the SMM row created in the previous load)
  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const domainMap = new Map<string, number>();
  for (const d of allDomainsRaw) domainMap.set(String(d.domain_code), Number(d.id));

  console.log("\n=== domain_data_objects (Signal 1) ===");
  const existingDdoRaw = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=10000");
  const existingDdoSet = new Set(existingDdoRaw.map(r => `${r.domain_id}:${r.data_object_id}:${r.role}`));
  const newDdoRows: Row[] = [];
  let skippedDdo = 0;
  for (const d of ddoRows) {
    const did = domainMap.get(d.domain_code);
    const oid = doMap.get(d.data_object_name);
    if (!did) throw new Error(`Domain not found: ${d.domain_code}`);
    if (!oid) throw new Error(`Data object not found: ${d.data_object_name}`);
    const key = `${did}:${oid}:${d.role}`;
    if (existingDdoSet.has(key)) { skippedDdo++; continue; }
    existingDdoSet.add(key);
    newDdoRows.push({
      domain_id: did,
      data_object_id: oid,
      role: d.role,
      notes: d.notes ?? "",
    });
  }
  if (newDdoRows.length > 0) {
    console.log(`  inserting ${newDdoRows.length} domain_data_objects rows (${skippedDdo} already present)`);
    await insert("/domain_data_objects", newDdoRows);
  } else {
    console.log(`  no new domain_data_objects rows (${skippedDdo} already present)`);
  }

  console.log("\n=== cross_domain_handoffs (Signal 2) ===");
  const existingHandoffsRaw = await get(
    "/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000",
  );
  const existingHandoffSet = new Set(
    existingHandoffsRaw.map(
      r => `${r.source_domain_id}:${r.target_domain_id}:${r.data_object_id}:${r.trigger_event}`,
    ),
  );
  const newHandoffRows: Row[] = [];
  let skippedHandoff = 0;
  for (const h of handoffs) {
    const src = domainMap.get(h.source_domain_code);
    const tgt = domainMap.get(h.target_domain_code);
    const oid = doMap.get(h.data_object_name);
    if (!src) throw new Error(`Source domain not found: ${h.source_domain_code}`);
    if (!tgt) throw new Error(`Target domain not found: ${h.target_domain_code}`);
    if (!oid) throw new Error(`Data object not found: ${h.data_object_name}`);
    const key = `${src}:${tgt}:${oid}:${h.trigger_event}`;
    if (existingHandoffSet.has(key)) { skippedHandoff++; continue; }
    existingHandoffSet.add(key);
    newHandoffRows.push({
      source_domain_id: src,
      target_domain_id: tgt,
      data_object_id: oid,
      trigger_event: h.trigger_event,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: h.notes ?? "",
    });
  }
  if (newHandoffRows.length > 0) {
    console.log(`  inserting ${newHandoffRows.length} cross_domain_handoffs rows (${skippedHandoff} already present)`);
    await insert("/cross_domain_handoffs", newHandoffRows);
  } else {
    console.log(`  no new cross_domain_handoffs rows (${skippedHandoff} already present)`);
  }

  // ===== Final counts (SMM scope) =====
  const smmDomainId = domainMap.get("SMM")!;
  const smmDoIds = newDataObjects.map(d => doMap.get(d.data_object_name)!).filter(Boolean);
  const counts = {
    data_objects_total: (await get("/data_objects?select=id&limit=10000")).length,
    domain_data_objects_total: (await get("/domain_data_objects?select=domain_id&limit=10000")).length,
    cross_domain_handoffs_total: (await get("/cross_domain_handoffs?select=id&limit=10000")).length,
    smm_mastered_data_objects: (
      await get(`/domain_data_objects?domain_id=eq.${smmDomainId}&role=eq.master&select=data_object_id&limit=10000`)
    ).length,
    smm_contributor_data_objects: (
      await get(`/domain_data_objects?domain_id=eq.${smmDomainId}&role=eq.contributor&select=data_object_id&limit=10000`)
    ).length,
    smm_consumer_data_objects: (
      await get(`/domain_data_objects?domain_id=eq.${smmDomainId}&role=eq.consumer&select=data_object_id&limit=10000`)
    ).length,
    smm_outbound_handoffs: (
      await get(`/cross_domain_handoffs?source_domain_id=eq.${smmDomainId}&select=id&limit=10000`)
    ).length,
    smm_data_object_ids: smmDoIds,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
