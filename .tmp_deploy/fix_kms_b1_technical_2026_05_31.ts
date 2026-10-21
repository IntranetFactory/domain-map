#!/usr/bin/env bun
// KMS B1 technical fixes (per audits/KMS.md continuation 2026-05-31).
//
// Applies only the deterministic, audit-pre-specified fixes:
//   B1-S3: PATCH data_objects.id=413 plural_label "Article Feedbacks" -> "Article Feedback"
//   B1-S4 intra: 5 intra-KMS data_object_relationships edges
//   B1-S4 cross: 4 outbound cross-domain edges (CCAAS contact_center_agents
//                row deferred, master not yet enumerated)
//   B1-S5: 6 users-edge relationships (Rule #10)
//   B1-H1: 11 handoff_processes agent_curated rows
//
// Everything else in Bucket 1 (B1-S1 module shape, B1-S2 catalog UX text)
// is gated on Bucket 2 item 1 user judgment and is intentionally skipped.
//
// Idempotent: existing-row pre-flight before each insert; safe to re-run.

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
// Data-object ID constants (verified live before drafting)
// ============================================================
const D = {
  knowledge_base_articles: 410,
  knowledge_categories: 411,
  article_revisions: 412,
  article_feedback: 413,
  knowledge_search_queries: 414,
  knowledge_collections: 415,
  users: 748,
  hr_cases: 192,
  customer_cases: 103,
  conversation_flows: 701,
};

// PCF process IDs (looked up by process_name on live /processes)
const P = {
  maintain_service_support_knowledge_repository: 1293,
  deliver_approved_content: 429,
  harvest_knowledge: 919,
  control_delivered_content: 430,
  manage_content_infrastructure: 427,
  define_content_taxonomies: 1744,
};

// ============================================================
// 1. B1-S3: PATCH article_feedback plural_label
// ============================================================
console.log("\n=== B1-S3: PATCH article_feedback plural_label ===");
{
  const [existing] = await get(
    `/data_objects?id=eq.${D.article_feedback}&select=id,plural_label`,
  );
  if (!existing) throw new Error("article_feedback (id 413) not found");
  if (existing.plural_label === "Article Feedback") {
    console.log("  already 'Article Feedback', skip");
  } else {
    console.log(`  current plural_label = ${JSON.stringify(existing.plural_label)}, patching`);
    await call({
      method: "PATCH",
      path: `/data_objects?id=eq.${D.article_feedback}`,
      body: { plural_label: "Article Feedback" },
    });
    console.log("  PATCHed to 'Article Feedback'");
  }
}

// ============================================================
// 2. B1-S4 intra-KMS data_object_relationships (5 edges)
// ============================================================
// Schema reminder:
//   data_object_id          = source / parent-voice subject
//   related_data_object_id  = target / object
//   relationship_verb       = parent-voice (source -> target)
//   inverse_verb            = target -> source
//   owner_side              = which side's delete cascades
//   relationship_type       = one_to_one / one_to_many / many_to_many
//   relationship_kind       = composition / reference / association / inheritance
//   is_required             = boolean
//   record_status omitted   = column default 'new' (Rule #1)
console.log("\n=== B1-S4 intra: 5 intra-KMS relationships ===");

type RelSpec = {
  data_object_id: number;
  related_data_object_id: number;
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_many";
  relationship_kind: "composition" | "reference" | "association" | "inheritance";
  owner_side: "source" | "target";
  is_required: boolean;
};

const intraKmsEdges: RelSpec[] = [
  // knowledge_base_articles -> classified_under -> knowledge_categories
  {
    data_object_id: D.knowledge_base_articles,
    related_data_object_id: D.knowledge_categories,
    relationship_verb: "classified_under",
    inverse_verb: "classifies",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "target",
    is_required: false,
  },
  // knowledge_base_articles -> has_revisions -> article_revisions
  {
    data_object_id: D.knowledge_base_articles,
    related_data_object_id: D.article_revisions,
    relationship_verb: "has_revisions",
    inverse_verb: "revises",
    relationship_type: "one_to_many",
    relationship_kind: "composition",
    owner_side: "source",
    is_required: true,
  },
  // knowledge_base_articles -> receives -> article_feedback
  {
    data_object_id: D.knowledge_base_articles,
    related_data_object_id: D.article_feedback,
    relationship_verb: "receives",
    inverse_verb: "rates",
    relationship_type: "one_to_many",
    relationship_kind: "composition",
    owner_side: "source",
    is_required: false,
  },
  // knowledge_base_articles -> appears_in -> knowledge_collections
  {
    data_object_id: D.knowledge_base_articles,
    related_data_object_id: D.knowledge_collections,
    relationship_verb: "appears_in",
    inverse_verb: "contains",
    relationship_type: "many_to_many",
    relationship_kind: "association",
    owner_side: "target",
    is_required: false,
  },
  // knowledge_search_queries -> resolved_by -> knowledge_base_articles
  {
    data_object_id: D.knowledge_search_queries,
    related_data_object_id: D.knowledge_base_articles,
    relationship_verb: "resolved_by",
    inverse_verb: "resolves",
    relationship_type: "many_to_many",
    relationship_kind: "association",
    owner_side: "source",
    is_required: false,
  },
];

// ============================================================
// 3. B1-S4 cross-domain outbound (4 edges; CCAAS deferred)
// ============================================================
const crossOutEdges: RelSpec[] = [
  // knowledge_base_articles -> resolves -> hr_cases (KMS -> HRSD)
  {
    data_object_id: D.knowledge_base_articles,
    related_data_object_id: D.hr_cases,
    relationship_verb: "resolves",
    inverse_verb: "resolved_by",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  // knowledge_base_articles -> resolves -> customer_cases (KMS -> CSM)
  {
    data_object_id: D.knowledge_base_articles,
    related_data_object_id: D.customer_cases,
    relationship_verb: "resolves",
    inverse_verb: "resolved_by",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  // knowledge_base_articles -> trains -> conversation_flows (KMS -> CONV-AI)
  {
    data_object_id: D.knowledge_base_articles,
    related_data_object_id: D.conversation_flows,
    relationship_verb: "trains",
    inverse_verb: "trained_by",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
  // knowledge_search_queries -> reveals_gap_in -> conversation_flows (KMS -> CONV-AI)
  {
    data_object_id: D.knowledge_search_queries,
    related_data_object_id: D.conversation_flows,
    relationship_verb: "reveals_gap_in",
    inverse_verb: "exposed_by",
    relationship_type: "many_to_many",
    relationship_kind: "reference",
    owner_side: "source",
    is_required: false,
  },
];

// ============================================================
// 4. B1-S5: 6 users edges (Rule #10)
// ============================================================
// users-as-source pattern: users authors knowledge_base_articles, etc.
// Each row has a parent-voice verb on the users side and an inverse
// on the master side.
const usersEdges: RelSpec[] = [
  // users -> authors -> knowledge_base_articles
  {
    data_object_id: D.users,
    related_data_object_id: D.knowledge_base_articles,
    relationship_verb: "authors",
    inverse_verb: "authored_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "target",
    is_required: true,
  },
  // users -> owns -> knowledge_base_articles (steward / SME)
  {
    data_object_id: D.users,
    related_data_object_id: D.knowledge_base_articles,
    relationship_verb: "owns",
    inverse_verb: "owned_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "target",
    is_required: false,
  },
  // users -> edits -> article_revisions
  {
    data_object_id: D.users,
    related_data_object_id: D.article_revisions,
    relationship_verb: "edits",
    inverse_verb: "edited_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "target",
    is_required: true,
  },
  // users -> approves -> article_revisions
  {
    data_object_id: D.users,
    related_data_object_id: D.article_revisions,
    relationship_verb: "approves",
    inverse_verb: "approved_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "target",
    is_required: false,
  },
  // users -> submits -> article_feedback
  {
    data_object_id: D.users,
    related_data_object_id: D.article_feedback,
    relationship_verb: "submits",
    inverse_verb: "submitted_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "target",
    is_required: false,
  },
  // users -> curates -> knowledge_collections
  {
    data_object_id: D.users,
    related_data_object_id: D.knowledge_collections,
    relationship_verb: "curates",
    inverse_verb: "curated_by",
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    owner_side: "target",
    is_required: true,
  },
];

const allRels: RelSpec[] = [...intraKmsEdges, ...crossOutEdges, ...usersEdges];

// Pre-flight: skip any relationship already loaded (idempotent).
// Idempotency key: (data_object_id, related_data_object_id, relationship_verb).
const allTouchedDois = Array.from(
  new Set(allRels.flatMap(r => [r.data_object_id, r.related_data_object_id])),
);
const existingRels = await get(
  `/data_object_relationships?or=(data_object_id.in.(${allTouchedDois.join(",")}),related_data_object_id.in.(${allTouchedDois.join(",")}))&select=data_object_id,related_data_object_id,relationship_verb`,
);
const existingRelKey = new Set(
  existingRels.map(
    r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`,
  ),
);

const newRels = allRels.filter(
  r =>
    !existingRelKey.has(
      `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`,
    ),
);

console.log(`\n=== relationships: ${allRels.length} proposed, ${newRels.length} new ===`);
if (newRels.length > 0) {
  await insert("/data_object_relationships", newRels as unknown as Row[]);
  console.log(`  inserted ${newRels.length} rows`);
} else {
  console.log("  nothing to insert");
}

// ============================================================
// 5. B1-H1: 11 handoff_processes agent_curated rows
// ============================================================
console.log("\n=== B1-H1: 11 handoff_processes agent_curated rows ===");

type HpSpec = {
  handoff_id: number;
  process_id: number;
  proposal_source: "agent_curated";
};

const hpRows: HpSpec[] = [
  // # 1: h-720 KMS -> CSM `knowledge_base_article.published`
  { handoff_id: 720, process_id: P.maintain_service_support_knowledge_repository, proposal_source: "agent_curated" },
  // # 2: h-721 KMS -> HRSD `knowledge_base_article.published`
  { handoff_id: 721, process_id: P.maintain_service_support_knowledge_repository, proposal_source: "agent_curated" },
  // # 3: h-722 KMS -> CCAAS `knowledge_base_article.updated`
  { handoff_id: 722, process_id: P.deliver_approved_content, proposal_source: "agent_curated" },
  // # 4: h-723 KMS -> CONV-AI `knowledge_base_article.published`
  { handoff_id: 723, process_id: P.deliver_approved_content, proposal_source: "agent_curated" },
  // # 5: h-724 KMS -> CONV-AI `knowledge_search_query.no_result`
  { handoff_id: 724, process_id: P.harvest_knowledge, proposal_source: "agent_curated" },
  // # 6: h-1120 HRSD -> KMS `hr_case.resolved`
  { handoff_id: 1120, process_id: P.harvest_knowledge, proposal_source: "agent_curated" },
  // # 7: h-334 LEGAL-PRACT-MGMT -> KMS `legal_matter.closed`
  { handoff_id: 334, process_id: P.harvest_knowledge, proposal_source: "agent_curated" },
  // # 8: h-745 CONV-AI -> KMS `conversation_flow.fallback_triggered`
  { handoff_id: 745, process_id: P.harvest_knowledge, proposal_source: "agent_curated" },
  // # 9: h-818 WEB-CONTOPS -> KMS `content_lifecycle.review_due`
  { handoff_id: 818, process_id: P.control_delivered_content, proposal_source: "agent_curated" },
  // # 10: h-819 WEB-CONTOPS -> KMS `content_inventory.refreshed`
  { handoff_id: 819, process_id: P.manage_content_infrastructure, proposal_source: "agent_curated" },
  // # 11: h-447 HRSD -> KMS `case_category.updated`
  { handoff_id: 447, process_id: P.define_content_taxonomies, proposal_source: "agent_curated" },
];

const targetHandoffIds = Array.from(new Set(hpRows.map(r => r.handoff_id)));
const existingHp = await get(
  `/handoff_processes?handoff_id=in.(${targetHandoffIds.join(",")})&select=handoff_id,process_id`,
);
const existingHpKey = new Set(
  existingHp.map(r => `${r.handoff_id}|${r.process_id}`),
);
const newHp = hpRows.filter(
  r => !existingHpKey.has(`${r.handoff_id}|${r.process_id}`),
);

console.log(`  ${hpRows.length} proposed, ${newHp.length} new`);
if (newHp.length > 0) {
  await insert("/handoff_processes", newHp as unknown as Row[]);
  console.log(`  inserted ${newHp.length} rows`);
} else {
  console.log("  nothing to insert");
}

// ============================================================
// Verification summary
// ============================================================
console.log("\n=== Post-write verification ===");

const [afterAf] = await get(
  `/data_objects?id=eq.${D.article_feedback}&select=plural_label`,
);
console.log(`article_feedback.plural_label = ${JSON.stringify(afterAf?.plural_label)}`);

const finalRels = await get(
  `/data_object_relationships?or=(data_object_id.in.(${allTouchedDois.join(",")}),related_data_object_id.in.(${allTouchedDois.join(",")}))&select=id`,
);
console.log(`relationships touching KMS masters or users: ${finalRels.length}`);

const finalHp = await get(
  `/handoff_processes?handoff_id=in.(${targetHandoffIds.join(",")})&select=handoff_id,process_id,proposal_source`,
);
console.log(`handoff_processes on KMS handoffs: ${finalHp.length}`);
for (const r of finalHp) {
  console.log(`  h-${r.handoff_id} -> p-${r.process_id} (${r.proposal_source})`);
}

console.log("\nDone.");
