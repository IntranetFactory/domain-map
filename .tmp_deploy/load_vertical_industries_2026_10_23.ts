// .tmp_deploy/load_vertical_industries_2026_10_23.ts
//
// Adds three missing top-level industries and fills industry_id on vertical domains that had none.
// Idempotent: industries upsert by industry_name; domains are PATCHed only while industry_id IS NULL
// (never overwrites an existing value). record_status is omitted so the DB default 'new' applies.
//
// Run from the project root: bun run c:/dev/domain-map/.tmp_deploy/load_vertical_industries_2026_10_23.ts

import { pg } from "../scripts/lib/catalog";

const NEW_INDUSTRIES = [
  {
    industry_name: "Arts, Entertainment, and Recreation",
    naics_code: "71",
    description:
      "Establishments that operate facilities or provide services for cultural, entertainment, and recreational interests: performing arts, spectator sports, museums and historical sites, amusement parks and attractions, marinas, recreation centers, and guided recreational activities and experiences.",
  },
  {
    industry_name: "Accommodation",
    naics_code: "721",
    description:
      "Establishments that provide short-term lodging for travelers, vacationers, and others: hotels and motels, inns and bed-and-breakfasts, vacation and short-term rentals, and RV parks and campgrounds.",
  },
  {
    industry_name: "Libraries and Archives",
    naics_code: "519210",
    description:
      "Establishments that provide library or archive services: building and maintaining collections of books, periodicals, documents, recordings, and digital materials, and facilitating their discovery, lending, and use. Covers public, academic, school, and special libraries alike, since NAICS classifies a library by its activity rather than its owner.",
  },
];

const DOMAIN_INDUSTRY: Record<string, string> = {
  "ACTIVITY-BOOKING": "Arts, Entertainment, and Recreation",
  "MARINA-MGMT": "Arts, Entertainment, and Recreation",
  "STR-MGMT": "Accommodation",
  "LIB-MGMT": "Libraries and Archives",
  "LIVESTOCK-MGMT": "Animal Production and Aquaculture",
  "FUND-ADMIN": "Financial Services",
  "PORT-MONIT": "Financial Services",
  "INV-CRM": "Financial Services",
  "EM-FUND-PLATFORM": "Venture Capital",
};

// Pre-flight: no em-dashes in authored text (project rule).
for (const i of NEW_INDUSTRIES) if (i.description.includes("\u2014")) throw new Error(`em-dash in ${i.industry_name}`);

// 1. Industries: insert only the missing ones, then re-read for the name -> id map.
const existing: any[] = await pg("GET", "/industries?select=id,industry_name&limit=10000");
const have = new Set(existing.map((i) => i.industry_name));
const toInsert = NEW_INDUSTRIES.filter((i) => !have.has(i.industry_name));
if (toInsert.length) await pg("POST", "/industries", toInsert);
console.log(`industries: inserted ${toInsert.length}, already present ${NEW_INDUSTRIES.length - toInsert.length}`);

const industries: any[] = await pg("GET", "/industries?select=id,industry_name&limit=10000");
const industryId = new Map(industries.map((i) => [i.industry_name, i.id]));

// 2. Domains: fill industry_id only where it is still NULL.
const codes = Object.keys(DOMAIN_INDUSTRY);
const domains: any[] = await pg(
  "GET",
  `/domains?domain_code=in.(${codes.join(",")})&select=id,domain_code,industry_id`,
);
const missing = codes.filter((c) => !domains.some((d) => d.domain_code === c));
if (missing.length) throw new Error(`unknown domain codes: ${missing.join(", ")}`);

for (const d of domains) {
  const target = industryId.get(DOMAIN_INDUSTRY[d.domain_code]);
  if (target == null) throw new Error(`industry not found: ${DOMAIN_INDUSTRY[d.domain_code]}`);
  if (d.industry_id != null) {
    console.log(`  skip ${d.domain_code}: industry_id already ${d.industry_id}`);
    continue;
  }
  await pg("PATCH", `/domains?id=eq.${d.id}&industry_id=is.null`, { industry_id: target });
  console.log(`  set  ${d.domain_code} -> ${DOMAIN_INDUSTRY[d.domain_code]} (${target})`);
}

// 3. Verify.
const after: any[] = await pg(
  "GET",
  `/domains?domain_code=in.(${codes.join(",")})&select=domain_code,industries(industry_name,naics_code)&order=domain_code.asc`,
);
for (const d of after) console.log(`  ${d.domain_code.padEnd(18)} ${d.industries?.industry_name ?? "NULL"} (${d.industries?.naics_code ?? ""})`);
