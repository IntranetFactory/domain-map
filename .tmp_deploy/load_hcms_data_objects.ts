#!/usr/bin/env bun
// Loads HCMS (id 93) data_objects + domain_data_objects + cross_domain_handoffs.
// Includes one pre-populated multi-domain row: digital_assets is mastered by
// DAM (id 92) and contributed-to by HCMS, anchoring the DAM↔HCMS integration
// signal ahead of a full DAM data_objects load.
// Idempotent: all writes guarded by natural-key checks.

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
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

async function get(path: string): Promise<Row[]> { return call({ method: "GET", path }); }
async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50; const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

const HCMS = 93;
const DAM = 92;
const DXP = 77;
const B2C_COMM = 71;
const MA = 70;

const dataObjects = [
  {
    data_object_name: "content_types",
    singular_label: "Content Type",
    plural_label: "Content Types",
    display_label: "Content Type",
    description: "Schema definition for a class of content entries: fields, references, validation, and locale settings. CMS-specific configuration; renames or removals couple tightly to downstream frontend code. Called Models (Contentful), Schemas (Sanity), Content Types (Strapi/Storyblok/Kontent.ai).",
  },
  {
    data_object_name: "content_entries",
    singular_label: "Content Entry",
    plural_label: "Content Entries",
    display_label: "Content Entry",
    description: "Individual structured content record conforming to a content_type, served via the CMS delivery API to any channel. The thing a headless CMS exists to manage. Called Entries (Contentful), Documents (Sanity), Stories (Storyblok), Entries (Contentstack), Documents (Prismic).",
  },
  {
    data_object_name: "content_releases",
    singular_label: "Content Release",
    plural_label: "Content Releases",
    display_label: "Content Release",
    description: "A scheduled batch of content changes published together, used to coordinate go-lives across many entries (campaign launch, product update). Called Releases (Contentstack, Sanity), Launch (Contentful), Scheduled Releases (Storyblok).",
  },
  {
    data_object_name: "editorial_workflows",
    singular_label: "Editorial Workflow",
    plural_label: "Editorial Workflows",
    display_label: "Editorial Workflow",
    description: "Workflow definition for editorial review and publishing: named states (draft / in_review / approved / published), transitions, and role-based step ownership. Distinct from ECM document workflows (different content shape and lifecycle).",
  },
  {
    data_object_name: "content_locales",
    singular_label: "Content Locale",
    plural_label: "Content Locales",
    display_label: "Content Locale",
    description: "Configured locale available within a CMS account or environment, including fallback chain, default locale flag, and translation status conventions. Drives field-level localization on content entries.",
  },
  {
    data_object_name: "content_environments",
    singular_label: "Content Environment",
    plural_label: "Content Environments",
    display_label: "Content Environment",
    description: "Isolated working copy of a CMS's content: dev, staging, or production environment; dataset, branch, or space. Used to test content-type changes and content migrations safely before promoting.",
  },
  {
    data_object_name: "digital_assets",
    singular_label: "Digital Asset",
    plural_label: "Digital Assets",
    display_label: "Digital Asset",
    description: "Image, video, audio, document, or design file with metadata, rights, taxonomy, and delivery URLs. The DAM master; HCMSs contribute content-bound assets uploaded inline to entries and consume DAM-hosted assets by URL reference. PIM and B2C-COMM also reference product imagery via DAM.",
  },
];

type DomDoSpec = {
  domain_id: number;
  data_object_name: string;
  role: "master" | "contributor" | "consumer" | "derived";
  notes: string;
};

const domainDataObjects: DomDoSpec[] = [
  // HCMS-mastered (6)
  { domain_id: HCMS, data_object_name: "content_types", role: "master", notes: "HCMS owns the schema definitions for headless content entries." },
  { domain_id: HCMS, data_object_name: "content_entries", role: "master", notes: "HCMS owns structured content entries served to channels. DXP suites with bundled CMSs co-master from their side (to be linked when DXP data_objects load)." },
  { domain_id: HCMS, data_object_name: "content_releases", role: "master", notes: "HCMS owns scheduled batches of content publication." },
  { domain_id: HCMS, data_object_name: "editorial_workflows", role: "master", notes: "HCMS owns the editorial workflow definitions for its content lifecycle." },
  { domain_id: HCMS, data_object_name: "content_locales", role: "master", notes: "HCMS owns the locale configuration for content entries." },
  { domain_id: HCMS, data_object_name: "content_environments", role: "master", notes: "HCMS owns the environment / dataset / space concept for isolated content work." },

  // Multi-domain: digital_assets
  { domain_id: DAM, data_object_name: "digital_assets", role: "master", notes: "DAM is the enterprise system of record for creative assets, rights, taxonomy, and approved-for-use status. Slice: brand-level asset library, lifecycle, and rights management." },
  { domain_id: HCMS, data_object_name: "digital_assets", role: "contributor", notes: "HCMS contributes content-bound assets uploaded inline to entries (Contentful Assets, Sanity Files, Storyblok Assets). In integrated stacks HCMS consumes DAM-hosted assets by URL reference; standalone HCMS effectively masters its own asset library until a DAM is introduced." },
];

type HandoffSpec = {
  source_domain_id: number;
  target_domain_id: number;
  data_object_name: string;
  trigger_event: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop";
  friction_level: "high" | "medium" | "low";
  description: string;
};

const handoffs: HandoffSpec[] = [
  {
    source_domain_id: HCMS, target_domain_id: DXP, data_object_name: "content_entries",
    trigger_event: "content_entry.published", integration_pattern: "api_call", friction_level: "medium",
    description: "HCMS publishes a content entry; DXP must re-render the affected pages, invalidate its CDN cache, or trigger an ISR rebuild. Payload typically includes content_type, entry_id, locale, and changed fields. Low friction when DXP and HCMS are the same vendor's integrated stack; bespoke and medium-friction when HCMS and DXP are from different vendors (Contentful + Acquia, Sanity + Adobe AEM).",
  },
  {
    source_domain_id: HCMS, target_domain_id: B2C_COMM, data_object_name: "content_entries",
    trigger_event: "content_entry.published", integration_pattern: "api_call", friction_level: "medium",
    description: "Storefront refreshes product copy, banner content, or marketing pages when CMS publishes. Common in composable-commerce stacks (commercetools + Contentful, Shopify + Sanity). Failure modes: stale storefront caches when the webhook silently fails; mis-localized content when the storefront's locale resolution diverges from the CMS's.",
  },
  {
    source_domain_id: HCMS, target_domain_id: MA, data_object_name: "content_entries",
    trigger_event: "content_entry.published", integration_pattern: "manual_handoff", friction_level: "high",
    description: "Marketing-Automation campaigns reference content snippets, hero copy, and CTAs that live in the CMS, but the link between a CMS entry and a campaign template is rarely event-driven. Marketers manually copy CMS content into the MA email/SMS template; CMS-side changes after the campaign is built don't propagate. Shadow-data pattern: the campaign's content of record diverges silently from the CMS source.",
  },
  {
    source_domain_id: HCMS, target_domain_id: DXP, data_object_name: "content_releases",
    trigger_event: "content_release.scheduled", integration_pattern: "api_call", friction_level: "medium",
    description: "Scheduled CMS release triggers a build pipeline ahead of go-live time so the rendered frontend is ready when the release publishes. SSG/ISR build kickoff via webhook. Failure modes: build pipeline runs against partial release content; release time changes don't re-trigger the build.",
  },
  {
    source_domain_id: HCMS, target_domain_id: B2C_COMM, data_object_name: "content_releases",
    trigger_event: "content_release.published", integration_pattern: "event_stream", friction_level: "medium",
    description: "Coordinated go-live of a content release and commerce changes (new collection launch, pricing campaign). The release event fans out to the storefront which invalidates caches and refreshes catalog-adjacent content. Friction increases when the commerce platform's content cache TTL is uncoordinated with the release window.",
  },
  {
    source_domain_id: HCMS, target_domain_id: DXP, data_object_name: "content_types",
    trigger_event: "content_type.changed", integration_pattern: "manual_handoff", friction_level: "high",
    description: "Field renames, type changes, or removals on content_types break frontend renderers that are coupled to the schema. Typically handled through dev coordination (PR + deploy) rather than event-driven propagation. Cross-vendor stack with same logical entity pattern: the CMS schema and the frontend's TypeScript types must move together but live in different repos / different vendor tools.",
  },
  {
    source_domain_id: DAM, target_domain_id: HCMS, data_object_name: "digital_assets",
    trigger_event: "digital_asset.published", integration_pattern: "api_call", friction_level: "high",
    description: "DAM publishes an approved asset; HCMS authors need the asset to appear in their picker for inclusion in content entries. Integration typically resolves asset URLs at content delivery time, so DAM URL rotation, taxonomy renames, or rights-revocations break already-published HCMS entries downstream. Identity-reconciliation pattern: same asset, different identifier spaces across DAM and HCMS, no canonical resolver in most stacks.",
  },
];

async function main() {
  console.log("\n=== data_objects ===");
  const existingDO = await get("/data_objects?select=id,data_object_name&limit=10000");
  const existingDONames = new Set(existingDO.map(r => String(r.data_object_name)));
  const missingDO = dataObjects.filter(d => !existingDONames.has(d.data_object_name));
  if (missingDO.length > 0) {
    console.log(`  inserting ${missingDO.length} new data_objects (${existingDO.length} existed)`);
    await insert("/data_objects", missingDO);
  } else {
    console.log("  all data_objects already present");
  }
  const allDO = await get("/data_objects?select=id,data_object_name&limit=10000");
  const doIdByName = new Map<string, number>();
  for (const r of allDO) doIdByName.set(String(r.data_object_name), Number(r.id));

  console.log("\n=== domain_data_objects ===");
  const existingDDO = await get("/domain_data_objects?select=domain_id,data_object_id,role&limit=10000");
  const ddoKey = (d: number, o: number) => `${d}:${o}`;
  const existingDDOSet = new Set(existingDDO.map(r => ddoKey(Number(r.domain_id), Number(r.data_object_id))));
  const newDDORows: Row[] = [];
  for (const spec of domainDataObjects) {
    const oid = doIdByName.get(spec.data_object_name);
    if (!oid) throw new Error(`data_object missing: ${spec.data_object_name}`);
    const k = ddoKey(spec.domain_id, oid);
    if (existingDDOSet.has(k)) { console.log(`  skip existing ${spec.data_object_name} @ domain ${spec.domain_id}`); continue; }
    newDDORows.push({ domain_id: spec.domain_id, data_object_id: oid, role: spec.role, notes: spec.notes });
  }
  if (newDDORows.length > 0) {
    console.log(`  inserting ${newDDORows.length} domain_data_objects rows`);
    await insert("/domain_data_objects", newDDORows);
  } else {
    console.log("  no new domain_data_objects rows");
  }

  console.log("\n=== cross_domain_handoffs ===");
  const existingCDH = await get("/cross_domain_handoffs?select=source_domain_id,target_domain_id,data_object_id,trigger_event&limit=10000");
  const cdhKey = (s: number, t: number, o: number, e: string) => `${s}:${t}:${o}:${e}`;
  const existingCDHSet = new Set(existingCDH.map(r => cdhKey(Number(r.source_domain_id), Number(r.target_domain_id), Number(r.data_object_id), String(r.trigger_event))));
  const newCDHRows: Row[] = [];
  for (const h of handoffs) {
    const oid = doIdByName.get(h.data_object_name);
    if (!oid) throw new Error(`data_object missing for handoff: ${h.data_object_name}`);
    const k = cdhKey(h.source_domain_id, h.target_domain_id, oid, h.trigger_event);
    if (existingCDHSet.has(k)) { console.log(`  skip existing handoff ${h.trigger_event} ${h.source_domain_id}->${h.target_domain_id}`); continue; }
    newCDHRows.push({
      source_domain_id: h.source_domain_id,
      target_domain_id: h.target_domain_id,
      data_object_id: oid,
      trigger_event: h.trigger_event,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: "",
    });
  }
  if (newCDHRows.length > 0) {
    console.log(`  inserting ${newCDHRows.length} cross_domain_handoffs rows`);
    await insert("/cross_domain_handoffs", newCDHRows);
  } else {
    console.log("  no new cross_domain_handoffs rows");
  }

  // ===== Final counts =====
  const hcmsMastered = await get(`/domain_data_objects?domain_id=eq.${HCMS}&role=eq.master&select=data_object_id&limit=10000`);
  const hcmsContrib = await get(`/domain_data_objects?domain_id=eq.${HCMS}&role=eq.contributor&select=data_object_id&limit=10000`);
  const damMastered = await get(`/domain_data_objects?domain_id=eq.${DAM}&role=eq.master&select=data_object_id&limit=10000`);
  const hcmsSrcHandoffs = await get(`/cross_domain_handoffs?source_domain_id=eq.${HCMS}&select=id&limit=10000`);
  const hcmsTgtHandoffs = await get(`/cross_domain_handoffs?target_domain_id=eq.${HCMS}&select=id&limit=10000`);
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify({
    hcms_mastered_objects: hcmsMastered.length,
    hcms_contributor_objects: hcmsContrib.length,
    dam_mastered_objects: damMastered.length,
    hcms_outbound_handoffs: hcmsSrcHandoffs.length,
    hcms_inbound_handoffs: hcmsTgtHandoffs.length,
  }, null, 2));
}

await main();
