#!/usr/bin/env bun
// Backfills the Headless Content Management (HCMS, id 93) market.
// Domain already exists; 10 vendors already exist. This loader adds:
//   8 capabilities, 8 capability_domains, 10 solutions, 10 solution_domains,
//   80 solution_capabilities. Idempotent: re-runs are no-ops.

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

async function syncTable<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=10000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${existing.length} already present, nothing to insert`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=10000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// ============================================================
// CAPABILITIES (under HCMS)
// ============================================================
const capabilities = [
  {
    capability_code: "HCMS-MODEL",
    capability_name: "API-First Content Modeling",
    domain: "HCMS",
    description:
      "Define content types, fields, references, and validation rules via UI or code, exposed automatically as REST and/or GraphQL endpoints so any frontend can consume the same content store.",
  },
  {
    capability_code: "HCMS-DELIVERY",
    capability_name: "Multi-Channel Content Delivery",
    domain: "HCMS",
    description:
      "Serve a single content source to multiple channels (web, mobile apps, IoT, kiosks, voice, marketing tools) through cached, low-latency content delivery APIs.",
  },
  {
    capability_code: "HCMS-AUTHORING",
    capability_name: "Content Authoring and Editorial Workflow",
    domain: "HCMS",
    description:
      "Non-technical authoring UI with rich text, references, draft/publish, scheduling, role-based approvals, and collaboration on content entries.",
  },
  {
    capability_code: "HCMS-I18N",
    capability_name: "Localization and Translation Management",
    domain: "HCMS",
    description:
      "Multi-locale content with field-level or entry-level translations, locale fallbacks, translation status, and integrations with translation service providers.",
  },
  {
    capability_code: "HCMS-DAM",
    capability_name: "Headless Asset and Media Management",
    domain: "HCMS",
    description:
      "Storage and management of images, video, and documents with on-the-fly transformations (resize, crop, format conversion), CDN delivery, and metadata.",
  },
  {
    capability_code: "HCMS-VERSIONING",
    capability_name: "Content Versioning and Preview",
    domain: "HCMS",
    description:
      "Draft/published separation, version history, scheduled releases, branches or workspaces, and live preview of unpublished content against the live frontend.",
  },
  {
    capability_code: "HCMS-WEBHOOKS",
    capability_name: "Webhook and Integration Framework",
    domain: "HCMS",
    description:
      "Outbound webhooks and integration hooks that trigger downstream actions (static site builds, ISR revalidation, search indexing, third-party syncs) on content state changes.",
  },
  {
    capability_code: "HCMS-VISUAL",
    capability_name: "Visual and Live Editing for Composable Frontends",
    domain: "HCMS",
    description:
      "In-context editing on the rendered site so authors edit content where it appears, including component-aware visual builders for composable architectures.",
  },
];

// ============================================================
// SOLUTIONS (all vendors already exist in catalog)
// ============================================================
type SolutionSpec = {
  solution_name: string;
  vendor: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  description: string;
  notes?: string;
  primary?: string[];
  secondary?: string[];
  partial?: string[];
};

const solutions: SolutionSpec[] = [
  {
    solution_name: "Contentful",
    vendor: "Contentful",
    solution_type: "saas",
    description:
      "Category-defining headless CMS with content modeling, REST and GraphQL delivery APIs, authoring UI, and a composable content platform around it (Studio Experiences, Compose, Launch).",
    primary: ["HCMS"],
  },
  {
    solution_name: "Sanity",
    vendor: "Sanity",
    solution_type: "saas",
    description:
      "Structured-content platform with a real-time content lake, GROQ/GraphQL APIs, the customizable Sanity Studio, and the Presentation tool for visual editing of composable frontends.",
    primary: ["HCMS"],
  },
  {
    solution_name: "Storyblok",
    vendor: "Storyblok",
    solution_type: "saas",
    description:
      "Visual-editor-first headless CMS: component-aware block editor with live preview, multi-channel content delivery, and an enterprise-friendly authoring experience.",
    primary: ["HCMS"],
  },
  {
    solution_name: "Strapi",
    vendor: "Strapi",
    solution_type: "open_source",
    description:
      "Open-source, self-hostable headless CMS in Node.js with admin UI, auto-generated REST/GraphQL APIs, and a plugin ecosystem; commercial cloud and enterprise editions available.",
    primary: ["HCMS"],
  },
  {
    solution_name: "Hygraph",
    vendor: "Hygraph",
    solution_type: "saas",
    description:
      "GraphQL-native headless CMS (formerly GraphCMS) with federation/Content Federation for stitching multiple content sources behind a single API.",
    primary: ["HCMS"],
  },
  {
    solution_name: "Kontent.ai",
    vendor: "Kontent.ai",
    solution_type: "saas",
    description:
      "Enterprise headless CMS (formerly Kentico Kontent) with structured content, multi-language and workflow capabilities, and the Web Spotlight in-context editor.",
    primary: ["HCMS"],
  },
  {
    solution_name: "Contentstack",
    vendor: "Contentstack",
    solution_type: "saas",
    description:
      "Enterprise composable headless CMS with Automate, Brand Kit, Personalize, and a Visual Builder; positioned as a Digital Experience Platform after the Lytics (CDP) acquisition.",
    notes:
      "Contentstack increasingly markets itself as a composable DXP since acquiring Lytics in 2023; modelled as primary HCMS with secondary DXP coverage.",
    primary: ["HCMS"],
    secondary: ["DXP"],
  },
  {
    solution_name: "Prismic",
    vendor: "Prismic",
    solution_type: "saas",
    description:
      "Developer-led headless CMS with Slice Machine for component-driven content modelling and visual previews of slices in the local development environment.",
    primary: ["HCMS"],
  },
  {
    solution_name: "ButterCMS",
    vendor: "ButterCMS",
    solution_type: "saas",
    description:
      "Lightweight SaaS headless CMS targeted at small teams and marketing sites, with simple content modelling, blogging features, and REST APIs.",
    primary: ["HCMS"],
  },
  {
    solution_name: "Payload CMS",
    vendor: "Payload",
    solution_type: "open_source",
    description:
      "Code-first TypeScript headless CMS / framework: self-hostable with a Next.js-based admin UI, auto-generated REST/GraphQL APIs, and strong developer ergonomics around access control and hooks.",
    primary: ["HCMS"],
  },
];

// ============================================================
// SOLUTION_CAPABILITIES (delivery_strength matrix)
// ============================================================
type SolCapSpec = {
  solution: string;
  capability: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  notes?: string;
};

const solCaps: SolCapSpec[] = [
  // Contentful
  { solution: "Contentful", capability: "HCMS-MODEL", delivery_strength: "native" },
  { solution: "Contentful", capability: "HCMS-DELIVERY", delivery_strength: "native", notes: "REST and GraphQL delivery APIs with CDN." },
  { solution: "Contentful", capability: "HCMS-AUTHORING", delivery_strength: "native" },
  { solution: "Contentful", capability: "HCMS-I18N", delivery_strength: "native", notes: "Field-level locales, locale fallbacks, integrations with translation vendors." },
  { solution: "Contentful", capability: "HCMS-DAM", delivery_strength: "native", notes: "Images API with on-the-fly transforms; deeper DAM via partner integrations." },
  { solution: "Contentful", capability: "HCMS-VERSIONING", delivery_strength: "native" },
  { solution: "Contentful", capability: "HCMS-WEBHOOKS", delivery_strength: "native" },
  { solution: "Contentful", capability: "HCMS-VISUAL", delivery_strength: "partial", notes: "Studio Experiences (Experience Builder) brings native visual editing; still maturing vs Storyblok/Sanity." },

  // Sanity
  { solution: "Sanity", capability: "HCMS-MODEL", delivery_strength: "native", notes: "Schemas defined in code; Studio is a React app." },
  { solution: "Sanity", capability: "HCMS-DELIVERY", delivery_strength: "native", notes: "GROQ and GraphQL APIs over the Content Lake." },
  { solution: "Sanity", capability: "HCMS-AUTHORING", delivery_strength: "native", notes: "Real-time collaborative Studio." },
  { solution: "Sanity", capability: "HCMS-I18N", delivery_strength: "native", notes: "Document- and field-level translation plugins are first-party." },
  { solution: "Sanity", capability: "HCMS-DAM", delivery_strength: "native", notes: "Native asset pipeline with image transformations." },
  { solution: "Sanity", capability: "HCMS-VERSIONING", delivery_strength: "native", notes: "History, drafts, and Content Releases." },
  { solution: "Sanity", capability: "HCMS-WEBHOOKS", delivery_strength: "native" },
  { solution: "Sanity", capability: "HCMS-VISUAL", delivery_strength: "native", notes: "Presentation tool provides in-context visual editing." },

  // Storyblok
  { solution: "Storyblok", capability: "HCMS-MODEL", delivery_strength: "native", notes: "Block-and-component-based content modelling." },
  { solution: "Storyblok", capability: "HCMS-DELIVERY", delivery_strength: "native" },
  { solution: "Storyblok", capability: "HCMS-AUTHORING", delivery_strength: "native" },
  { solution: "Storyblok", capability: "HCMS-I18N", delivery_strength: "native", notes: "Field-level and folder-level translations, locale fallbacks." },
  { solution: "Storyblok", capability: "HCMS-DAM", delivery_strength: "native", notes: "Asset library with image service and tags." },
  { solution: "Storyblok", capability: "HCMS-VERSIONING", delivery_strength: "native" },
  { solution: "Storyblok", capability: "HCMS-WEBHOOKS", delivery_strength: "native" },
  { solution: "Storyblok", capability: "HCMS-VISUAL", delivery_strength: "native", notes: "Visual editor with component-level live preview is the flagship differentiator." },

  // Strapi
  { solution: "Strapi", capability: "HCMS-MODEL", delivery_strength: "native", notes: "Content-Type Builder generates REST/GraphQL automatically." },
  { solution: "Strapi", capability: "HCMS-DELIVERY", delivery_strength: "native" },
  { solution: "Strapi", capability: "HCMS-AUTHORING", delivery_strength: "native", notes: "Admin UI with Draft & Publish; review workflows are enterprise-tier." },
  { solution: "Strapi", capability: "HCMS-I18N", delivery_strength: "partial", notes: "i18n plugin supports per-locale entries; complex translation workflows require integrations." },
  { solution: "Strapi", capability: "HCMS-DAM", delivery_strength: "partial", notes: "Media Library is core but transformations and CDN delivery rely on third-party providers." },
  { solution: "Strapi", capability: "HCMS-VERSIONING", delivery_strength: "partial", notes: "Content History and Releases are part of paid editions; OSS has Draft & Publish only." },
  { solution: "Strapi", capability: "HCMS-WEBHOOKS", delivery_strength: "native" },
  { solution: "Strapi", capability: "HCMS-VISUAL", delivery_strength: "partial", notes: "Preview functionality available; in-context visual editing is limited compared to Storyblok/Sanity." },

  // Hygraph
  { solution: "Hygraph", capability: "HCMS-MODEL", delivery_strength: "native", notes: "GraphQL-native modelling with Content Federation across sources." },
  { solution: "Hygraph", capability: "HCMS-DELIVERY", delivery_strength: "native" },
  { solution: "Hygraph", capability: "HCMS-AUTHORING", delivery_strength: "native" },
  { solution: "Hygraph", capability: "HCMS-I18N", delivery_strength: "native" },
  { solution: "Hygraph", capability: "HCMS-DAM", delivery_strength: "partial", notes: "Asset management with transformation; relies on external DAMs for advanced workflows." },
  { solution: "Hygraph", capability: "HCMS-VERSIONING", delivery_strength: "native", notes: "Draft/Published stages and scheduled publishing." },
  { solution: "Hygraph", capability: "HCMS-WEBHOOKS", delivery_strength: "native" },
  { solution: "Hygraph", capability: "HCMS-VISUAL", delivery_strength: "partial", notes: "Live preview supported; component-level visual editing is integration-led." },

  // Kontent.ai
  { solution: "Kontent.ai", capability: "HCMS-MODEL", delivery_strength: "native" },
  { solution: "Kontent.ai", capability: "HCMS-DELIVERY", delivery_strength: "native" },
  { solution: "Kontent.ai", capability: "HCMS-AUTHORING", delivery_strength: "native", notes: "Enterprise workflow with custom steps and roles." },
  { solution: "Kontent.ai", capability: "HCMS-I18N", delivery_strength: "native" },
  { solution: "Kontent.ai", capability: "HCMS-DAM", delivery_strength: "native" },
  { solution: "Kontent.ai", capability: "HCMS-VERSIONING", delivery_strength: "native" },
  { solution: "Kontent.ai", capability: "HCMS-WEBHOOKS", delivery_strength: "native" },
  { solution: "Kontent.ai", capability: "HCMS-VISUAL", delivery_strength: "partial", notes: "Web Spotlight provides in-context preview; component-level visual editing depends on frontend conventions." },

  // Contentstack
  { solution: "Contentstack", capability: "HCMS-MODEL", delivery_strength: "native" },
  { solution: "Contentstack", capability: "HCMS-DELIVERY", delivery_strength: "native" },
  { solution: "Contentstack", capability: "HCMS-AUTHORING", delivery_strength: "native" },
  { solution: "Contentstack", capability: "HCMS-I18N", delivery_strength: "native" },
  { solution: "Contentstack", capability: "HCMS-DAM", delivery_strength: "native" },
  { solution: "Contentstack", capability: "HCMS-VERSIONING", delivery_strength: "native" },
  { solution: "Contentstack", capability: "HCMS-WEBHOOKS", delivery_strength: "native", notes: "Automate (Automation Hub) extends webhooks into a low-code workflow engine." },
  { solution: "Contentstack", capability: "HCMS-VISUAL", delivery_strength: "native", notes: "Visual Builder is part of the platform." },

  // Prismic
  { solution: "Prismic", capability: "HCMS-MODEL", delivery_strength: "native", notes: "Slice-based modelling via Slice Machine." },
  { solution: "Prismic", capability: "HCMS-DELIVERY", delivery_strength: "native" },
  { solution: "Prismic", capability: "HCMS-AUTHORING", delivery_strength: "native" },
  { solution: "Prismic", capability: "HCMS-I18N", delivery_strength: "partial", notes: "Multi-language locales supported; advanced translation workflows are integration-led." },
  { solution: "Prismic", capability: "HCMS-DAM", delivery_strength: "partial", notes: "Media library with imgix integration; not a DAM-class product." },
  { solution: "Prismic", capability: "HCMS-VERSIONING", delivery_strength: "native" },
  { solution: "Prismic", capability: "HCMS-WEBHOOKS", delivery_strength: "native" },
  { solution: "Prismic", capability: "HCMS-VISUAL", delivery_strength: "partial", notes: "Slice previews and Page Builder; visual editing is more developer-led than Storyblok." },

  // ButterCMS
  { solution: "ButterCMS", capability: "HCMS-MODEL", delivery_strength: "native" },
  { solution: "ButterCMS", capability: "HCMS-DELIVERY", delivery_strength: "native" },
  { solution: "ButterCMS", capability: "HCMS-AUTHORING", delivery_strength: "partial", notes: "Lightweight authoring without rich approval workflows." },
  { solution: "ButterCMS", capability: "HCMS-I18N", delivery_strength: "partial", notes: "Multi-locale support is plan-tiered." },
  { solution: "ButterCMS", capability: "HCMS-DAM", delivery_strength: "partial" },
  { solution: "ButterCMS", capability: "HCMS-VERSIONING", delivery_strength: "partial" },
  { solution: "ButterCMS", capability: "HCMS-WEBHOOKS", delivery_strength: "native" },
  { solution: "ButterCMS", capability: "HCMS-VISUAL", delivery_strength: "not_supported", notes: "No in-context visual editor; preview only." },

  // Payload CMS
  { solution: "Payload CMS", capability: "HCMS-MODEL", delivery_strength: "native", notes: "Schemas defined in TypeScript with strong typing throughout." },
  { solution: "Payload CMS", capability: "HCMS-DELIVERY", delivery_strength: "native", notes: "Auto-generated REST and GraphQL APIs." },
  { solution: "Payload CMS", capability: "HCMS-AUTHORING", delivery_strength: "partial", notes: "Admin UI is solid; complex review workflows require custom hooks." },
  { solution: "Payload CMS", capability: "HCMS-I18N", delivery_strength: "partial", notes: "Field-level localization is first-class; translation workflow tooling is light." },
  { solution: "Payload CMS", capability: "HCMS-DAM", delivery_strength: "partial", notes: "Media collections with file storage; transformations and CDN rely on adapters." },
  { solution: "Payload CMS", capability: "HCMS-VERSIONING", delivery_strength: "native", notes: "Drafts, versions, and scheduled publishing." },
  { solution: "Payload CMS", capability: "HCMS-WEBHOOKS", delivery_strength: "native", notes: "Hook system across collection lifecycle events." },
  { solution: "Payload CMS", capability: "HCMS-VISUAL", delivery_strength: "partial", notes: "Live Preview is built-in; component-level visual editing is integration-led." },
];

// ============================================================
// RUN
// ============================================================
async function main() {
  console.log("\n=== Domains (HCMS already exists) ===");
  const allDomainsRaw = await get("/domains?select=id,domain_code&limit=10000");
  const allDomainMap = new Map<string, number>();
  for (const d of allDomainsRaw) allDomainMap.set(String(d.domain_code), Number(d.id));
  if (!allDomainMap.has("HCMS")) throw new Error("HCMS domain not found");
  console.log(`  HCMS resolved to id ${allDomainMap.get("HCMS")}`);

  console.log("\n=== Capabilities ===");
  const capRows = capabilities.map(c => ({
    capability_code: c.capability_code,
    capability_name: c.capability_name,
    description: c.description,
  }));
  const capMap = await syncTable("/capabilities", capRows, "capability_code");

  console.log("\n=== capability_domains junctions ===");
  const existingCapDomLinks = await get("/capability_domains?select=capability_id,domain_id&limit=10000");
  const existingCapDomSet = new Set(existingCapDomLinks.map(r => `${r.capability_id}:${r.domain_id}`));
  const newCapDomRows: Row[] = [];
  for (const c of capabilities) {
    const cid = capMap.get(c.capability_code)!;
    const did = allDomainMap.get(c.domain)!;
    const key = `${cid}:${did}`;
    if (existingCapDomSet.has(key)) continue;
    newCapDomRows.push({ capability_id: cid, domain_id: did, notes: "" });
  }
  if (newCapDomRows.length > 0) {
    console.log(`  inserting ${newCapDomRows.length} capability_domains rows`);
    await insert("/capability_domains", newCapDomRows);
  } else {
    console.log("  no new capability_domains rows");
  }

  console.log("\n=== Vendors (all 10 already exist) ===");
  const fullVendorsRaw = await get("/vendors?select=id,vendor_name&limit=10000");
  const vendorMap = new Map<string, number>();
  for (const v of fullVendorsRaw) vendorMap.set(String(v.vendor_name), Number(v.id));
  for (const s of solutions) {
    if (!vendorMap.has(s.vendor)) throw new Error(`Vendor not found for solution ${s.solution_name}: ${s.vendor}`);
  }
  console.log(`  all ${solutions.length} solution vendors resolved`);

  console.log("\n=== Solutions ===");
  const solutionRows = solutions.map(s => ({
    solution_name: s.solution_name,
    description: s.description,
    solution_url: "",
    vendor_id: vendorMap.get(s.vendor)!,
    solution_type: s.solution_type,
    is_active_in_market: true,
    notes: s.notes ?? "",
  }));
  const solutionMap = await syncTable("/solutions", solutionRows, "solution_name");

  console.log("\n=== solution_domains junctions ===");
  const existingSolDomLinks = await get("/solution_domains?select=solution_id,domain_id,coverage_level&limit=10000");
  const existingSolDomSet = new Set(existingSolDomLinks.map(r => `${r.solution_id}:${r.domain_id}:${r.coverage_level}`));
  const newSolDomRows: Row[] = [];
  let skippedSolDom = 0;
  for (const s of solutions) {
    const sid = solutionMap.get(s.solution_name)!;
    const buildLink = (code: string, coverage: "primary" | "secondary" | "partial") => {
      const did = allDomainMap.get(code);
      if (!did) { console.warn(`  ! domain ${code} not found for ${s.solution_name}`); return; }
      const key = `${sid}:${did}:${coverage}`;
      if (existingSolDomSet.has(key)) { skippedSolDom++; return; }
      existingSolDomSet.add(key);
      newSolDomRows.push({ solution_id: sid, domain_id: did, coverage_level: coverage, notes: "" });
    };
    for (const code of s.primary ?? []) buildLink(code, "primary");
    for (const code of s.secondary ?? []) buildLink(code, "secondary");
    for (const code of s.partial ?? []) buildLink(code, "partial");
  }
  if (newSolDomRows.length > 0) {
    console.log(`  inserting ${newSolDomRows.length} solution_domains rows (${skippedSolDom} already present)`);
    await insert("/solution_domains", newSolDomRows);
  } else {
    console.log(`  no new solution_domains rows (${skippedSolDom} already present)`);
  }

  console.log("\n=== solution_capabilities junctions ===");
  const existingSolCapLinks = await get("/solution_capabilities?select=solution_id,capability_id&limit=10000");
  const existingSolCapSet = new Set(existingSolCapLinks.map(r => `${r.solution_id}:${r.capability_id}`));
  const newSolCapRows: Row[] = [];
  let skippedSolCap = 0;
  for (const sc of solCaps) {
    const sid = solutionMap.get(sc.solution);
    const cid = capMap.get(sc.capability);
    if (!sid) throw new Error(`Solution not found: ${sc.solution}`);
    if (!cid) throw new Error(`Capability not found: ${sc.capability}`);
    const key = `${sid}:${cid}`;
    if (existingSolCapSet.has(key)) { skippedSolCap++; continue; }
    existingSolCapSet.add(key);
    newSolCapRows.push({
      solution_id: sid,
      capability_id: cid,
      delivery_strength: sc.delivery_strength,
      notes: sc.notes ?? "",
    });
  }
  if (newSolCapRows.length > 0) {
    console.log(`  inserting ${newSolCapRows.length} solution_capabilities rows (${skippedSolCap} already present)`);
    await insert("/solution_capabilities", newSolCapRows);
  } else {
    console.log(`  no new solution_capabilities rows (${skippedSolCap} already present)`);
  }

  // ===== Final counts (HCMS scope) =====
  const hcmsDomainId = allDomainMap.get("HCMS")!;
  const counts = {
    hcms_capability_domains: (await get(`/capability_domains?domain_id=eq.${hcmsDomainId}&select=capability_id&limit=10000`)).length,
    hcms_solution_domains: (await get(`/solution_domains?domain_id=eq.${hcmsDomainId}&select=solution_id&limit=10000`)).length,
    hcms_solutions_via_primary: (await get(`/solution_domains?domain_id=eq.${hcmsDomainId}&coverage_level=eq.primary&select=solution_id&limit=10000`)).length,
    hcms_solution_capabilities: (await get(
      `/solution_capabilities?capability_id=in.(${capabilities.map(c => capMap.get(c.capability_code)).join(",")})&select=solution_id,capability_id&limit=10000`,
    )).length,
  };
  console.log("\n=== Final counts ===");
  console.log(JSON.stringify(counts, null, 2));
}

await main();
