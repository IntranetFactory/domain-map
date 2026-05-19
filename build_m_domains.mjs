import fs from "node:fs";

const d = JSON.parse(fs.readFileSync("c:/tmp/next_data.json", "utf8"));
const sols = d.props.pageProps.allSolutions;
const domains = JSON.parse(fs.readFileSync("c:/tmp/domains.json", "utf8"));
const domainByCode = Object.fromEntries(domains.map(x => [x.domain_code, x.domain_name]));

function slugify(s) {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
const urlFor = s => `https://monday.com/templates/template/${s.app_feature_reference_id}/${slugify(s.name)}`;
const md = s => (s || "").replace(/\r?\n+/g, " ").replace(/\|/g, "\\|").trim();

// Template-id → domain_code (or null). Only set when the template clearly maps to
// a software-market domain we catalog, not when it's a generic workspace board.
// Most monday templates are loose work-management patterns that don't correspond
// to a point-solution market — those stay blank, and that gap IS the delta.
const MATCH = {
  // Marketing
  98312:    "MA",          // Client campaigns for agencies
  72611:    "MA",          // Facebook ads Integration
  114890:   "MA",          // Marketing activities
  35051:    "MA",          // Powerful campaign planning
  // Sales / CRM
  75754:    "CRM",         // Contacts
  82286:    "CRM",         // Real estate CRM
  40547:    "CSM",         // Customer requests
  // Content / DAM
  71895:    "DAM",         // Digital asset management
  // HR / People
  63727:    "EMP-EXP",     // Employee engagement survey
  10046850: "EMP-EXP",     // Employee well-being survey
  40537:    "HRSD",        // HR requests
  67499:    "HRSD",        // HR services
  63721:    "ATS",         // Job application form
  50352:    "ATS",         // Recruitment and onboarding
  67501:    "ATS",         // Recruitment process
  67503:    "ONBOARDING",  // New employee onboarding
  10015408: "ONBOARDING",  // Onboarding plan by Farfetch's marketing team
  // IT / Operations
  53170:    "ITSM",        // IT management
  40541:    "ITSM",        // IT service desk
  40543:    "IWMS",        // Facilities requests
  // Project / Portfolio
  122927:   "SPM",         // Project Portfolio Management
};

sols.sort((a, b) => a.name.localeCompare(b.name));

const rows = sols.map(s => {
  const code = MATCH[s.app_feature_reference_id] || null;
  return {
    domain: code ? domainByCode[code] : "",
    domainCode: code || "",
    title: s.name,
    overview: s.data.shortDescription || "",
    description: s.data.description || "",
    url: urlFor(s),
  };
});

const lines = [];
lines.push("# monday.com templates vs. Domain Map");
lines.push("");
const matched = rows.filter(r => r.domain).length;
lines.push(`Source: <https://monday.com/templates> · ${sols.length} unique monday templates · ${matched} matched to a domain in our catalog · ${sols.length - matched} have no matching domain (the delta).`);
lines.push("");
lines.push("The `Domain` column shows the matching entry from our `domain_map` `domains` table (slug `domain_map`, id 1001). It is left blank when no clear point-solution-market match exists — that gap is the delta.");
lines.push("");
lines.push("| Domain | Title | Overview | Description | URL |");
lines.push("|---|---|---|---|---|");
for (const r of rows) {
  lines.push(`| ${md(r.domain)} | ${md(r.title)} | ${md(r.overview)} | ${md(r.description)} | <${r.url}> |`);
}

fs.writeFileSync("c:/dev/domain-map/m_domains.md", lines.join("\n") + "\n");

// Print match summary
console.log(`\nMatched ${matched} / ${sols.length} templates to a catalog domain:`);
const byDomain = {};
for (const r of rows) if (r.domain) (byDomain[r.domain] ||= []).push(r.title);
for (const dn of Object.keys(byDomain).sort()) {
  console.log(`  ${dn}`);
  for (const t of byDomain[dn]) console.log(`    - ${t}`);
}
console.log(`\nUnmatched (the delta — ${sols.length - matched}):`);
for (const r of rows) if (!r.domain) console.log(`  - ${r.title}`);
console.log(`\nWrote m_domains.md`);
