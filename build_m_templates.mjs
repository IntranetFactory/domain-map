import fs from "node:fs";

const d = JSON.parse(fs.readFileSync("c:/tmp/next_data.json", "utf8"));
const sols = d.props.pageProps.allSolutions;
const cats = d.props.pageProps.allCategories;
const t = d.props.pageProps.translations;

function slugify(s) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function urlFor(s) {
  return `https://monday.com/templates/template/${s.app_feature_reference_id}/${slugify(s.name)}`;
}

function md(s) {
  return (s || "").replace(/\r?\n+/g, " ").replace(/\|/g, "\\|").trim();
}

const catLabel = Object.fromEntries(cats.map(c => {
  const label = c.label.startsWith("template_store") ? c.value.toUpperCase() : c.label;
  return [c.value, label];
}));

const catTitle = slug => t[`templateCenter.category.title.${slug}`] || catLabel[slug] || slug;
const catDesc = slug => t[`templateCenter.category.description.${slug}`] || "";

const bySlug = {};
for (const s of sols) {
  const slugs = (s.data.categories && s.data.categories.length) ? s.data.categories : ["_uncategorized"];
  for (const c of slugs) (bySlug[c] ||= []).push(s);
}

const order = cats.map(c => c.value);
if (bySlug._uncategorized) order.push("_uncategorized");

const lines = [];
lines.push("# monday.com template catalog");
lines.push("");
lines.push(`Source: <https://monday.com/templates> · ${sols.length} unique templates across ${cats.length} categories.`);
lines.push("");

for (const slug of order) {
  const items = bySlug[slug] || [];
  if (!items.length) continue;
  const title = slug === "_uncategorized" ? "Uncategorized" : catTitle(slug);
  const desc = slug === "_uncategorized" ? "" : catDesc(slug);
  lines.push(`## ${title}`);
  lines.push("");
  if (desc) { lines.push(`_${desc}_`); lines.push(""); }
  lines.push(`Category URL: <https://monday.com/templates/category/${slug}>`);
  lines.push("");
  lines.push("| Title | Overview | Description | URL |");
  lines.push("|---|---|---|---|");
  for (const s of items) {
    const u = urlFor(s);
    lines.push(`| ${md(s.name)} | ${md(s.data.shortDescription)} | ${md(s.data.description)} | <${u}> |`);
  }
  lines.push("");
}

fs.writeFileSync("c:/dev/domain-map/m_templates.md", lines.join("\n"));

// Print all URLs grouped by category, as the user requested.
console.log(`\nProcessing ${sols.length} unique templates across ${cats.length} categories:\n`);
for (const slug of order) {
  const items = bySlug[slug] || [];
  if (!items.length) continue;
  console.log(`-- ${catTitle(slug)} (${items.length}) --`);
  for (const s of items) console.log("  " + urlFor(s));
}
console.log(`\nWrote m_templates.md (${lines.length} lines)`);
