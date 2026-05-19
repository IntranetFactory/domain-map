import fs from "node:fs";
import path from "node:path";

const dir = "c:/tmp/airtable_pages";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();

// Slug → display label, in the order shown on airtable.com sidebar.
const CAT_ORDER = [
  "project-management-v2",
  "marketing-v2",
  "product",
  "sales-and-crm",
  "hr-and-recruiting-v2",
  "finance-and-legal",
  "design-and-ux",
  "it-and-operations",
  "supply-chain-management",
  "education-and-nonprofit",
  "real-estate-v2",
  "media-and-entertainment",
  "personal-v2",
  "small-business-v2",
  "startup-and-venture-capital",
  "ai-powered-v2",
  "forms",
  "interfaces",
  "portals",
];

const md = s => (s || "").replace(/\r?\n+/g, " ").replace(/\|/g, "\\|").trim();
const cleanDesc = s => (s || "").replace(/\r?\n+/g, " ").replace(/\s+/g, " ").replace(/…$/,"…").trim();

const byCat = {};
let totalPlacements = 0;
for (const f of files) {
  const slug = f.replace(".json", "");
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  byCat[slug] = j;
  totalPlacements += j.items.length;
}

// Build unique-template index, in case it's useful.
const uniq = new Map();
for (const slug of Object.keys(byCat)) {
  for (const it of byCat[slug].items) {
    if (!uniq.has(it.href)) uniq.set(it.href, { ...it, categories: [slug] });
    else uniq.get(it.href).categories.push(slug);
  }
}

const lines = [];
lines.push("# Airtable template catalog");
lines.push("");
lines.push(`Source: <https://www.airtable.com/templates> · ${uniq.size} unique templates across ${Object.keys(byCat).length} categories (${totalPlacements} total placements).`);
lines.push("");
lines.push("Card descriptions are truncated by Airtable to ~3 lines per card; a full-detail second pass (one fetch per template page) would recover the complete paragraphs. Title prefixed with `AI` indicates Airtable's AI-powered template flag.");
lines.push("");

for (const slug of CAT_ORDER) {
  const j = byCat[slug];
  if (!j) continue;
  lines.push(`## ${j.h1}`);
  lines.push("");
  if (j.lead) { lines.push(`_${j.lead.replace(/\r?\n+/g, " ").trim()}_`); lines.push(""); }
  lines.push(`Category URL: <https://www.airtable.com/templates/${slug}>`);
  lines.push("");
  lines.push("| Title | Description | URL |");
  lines.push("|---|---|---|");
  for (const it of j.items) {
    const title = (it.isAI ? "AI · " : "") + it.title;
    lines.push(`| ${md(title)} | ${md(cleanDesc(it.description))} | <${it.href}> |`);
  }
  lines.push("");
}

fs.writeFileSync("c:/dev/domain-map/a_templates.md", lines.join("\n"));
console.log(`Wrote a_templates.md — ${uniq.size} unique templates, ${totalPlacements} placements`);
