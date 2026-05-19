import fs from "node:fs";
import path from "node:path";

const dir = "c:/tmp/airtable_pages";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));

const domains = JSON.parse(fs.readFileSync("c:/tmp/domains.json", "utf8"));
const domainByCode = Object.fromEntries(domains.map(x => [x.domain_code, x.domain_name]));

const md = s => (s || "").replace(/\r?\n+/g, " ").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();

// Dedupe templates by href.
const uniq = new Map();
for (const f of files) {
  const slug = f.replace(".json", "");
  const j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const it of j.items) {
    if (!uniq.has(it.href)) uniq.set(it.href, { ...it, categories: [slug] });
    else uniq.get(it.href).categories.push(slug);
  }
}
const items = [...uniq.values()].sort((a, b) => a.title.localeCompare(b.title));

// Deterministic keyword rules. Order matters — first match wins.
// Patterns are matched (case-insensitive) against the TEMPLATE TITLE ONLY by
// default (more precise). Stay conservative: a match must imply "this is the
// same software market a catalog domain names" — not just "marketing template
// touches marketing".
const RULES = [
  // Sales / CRM
  { domain: "CRM",        patterns: [/\bcrm\b/i, /sales pipeline/i, /lead management/i] },
  { domain: "CSM",        patterns: [/customer service/i, /customer support/i, /help desk/i, /support ticket/i] },
  { domain: "CPQ",        patterns: [/\bcpq\b/i, /configure.?price.?quote/i, /quote management/i] },
  { domain: "SALES-ENG",  patterns: [/sales enablement/i, /sales engagement/i] },
  // Marketing
  { domain: "MA",         patterns: [/marketing automation/i, /marketing campaign track/i, /campaign track/i, /campaign management/i, /email marketing/i] },
  { domain: "DAM",        patterns: [/digital asset management/i, /brand asset management/i, /marketing asset management/i] },
  { domain: "ECM",        patterns: [/enterprise content management/i, /document management/i] },
  // HR
  { domain: "ATS",        patterns: [/applicant track/i, /\brecruit(ing|ment)\b/i, /hiring pipeline/i, /job application/i, /candidate track/i, /interview questions/i] },
  { domain: "ONBOARDING", patterns: [/employee onboarding/i, /new[- ]hire onboarding/i] },
  { domain: "EMP-EXP",    patterns: [/employee engagement/i, /employee well/i, /employee survey/i, /employee experience/i, /pulse survey/i] },
  { domain: "HRSD",       patterns: [/hr request/i, /hr service/i, /hr ticket/i] },
  { domain: "HCM",        patterns: [/employee directory/i, /\bhris\b/i, /human resource information/i] },
  { domain: "PAYROLL",    patterns: [/\bpayroll\b/i] },
  { domain: "BEN-ADMIN",  patterns: [/benefits administration/i, /benefits enrollment/i] },
  { domain: "COMP-MGMT",  patterns: [/compensation management/i, /salary planning/i, /merit cycle/i] },
  { domain: "TALENT-MGMT",patterns: [/performance review/i, /talent management/i, /succession plan/i, /career development/i] },
  { domain: "LMS",        patterns: [/learning management/i, /course management/i, /training catalog/i, /\bLMS\b/] },
  { domain: "WFM",        patterns: [/workforce management/i, /shift schedul/i, /time and attendance/i] },
  // Finance / Procurement
  { domain: "EXPENSE",    patterns: [/expense track/i, /expense report/i, /expense management/i] },
  { domain: "AP-AUTO",    patterns: [/accounts payable/i, /\bap automation\b/i, /invoice processing/i] },
  { domain: "S2P",        patterns: [/source.?to.?pay/i, /procurement/i, /\bpurchase order\b/i] },
  { domain: "CLM",        patterns: [/contract lifecycle/i, /contract management/i] },
  { domain: "ESIGN",      patterns: [/electronic signature/i, /\be.?signature\b/i, /\besign\b/i] },
  { domain: "SUB-MGMT",   patterns: [/subscription management/i, /recurring billing/i, /revenue lifecycle/i] },
  // IT
  { domain: "ITSM",       patterns: [/it service desk/i, /it ticket/i, /service desk/i, /it help desk/i, /it management/i, /incident management/i, /\bitil\b/i, /\bit request\b/i] },
  { domain: "KMS",        patterns: [/knowledge base/i, /knowledge management/i] },
  { domain: "ITAM",       patterns: [/it asset/i] },
  { domain: "HAM",        patterns: [/hardware asset/i] },
  { domain: "SAM",        patterns: [/software asset/i, /saas management/i, /\bsam\b/i] },
  { domain: "CMDB",       patterns: [/\bcmdb\b/i, /configuration management database/i] },
  { domain: "VULN-MGMT",  patterns: [/vulnerability/i] },
  { domain: "SECOPS",     patterns: [/security operations/i, /\bsoc\b/i] },
  { domain: "DCIM",       patterns: [/data center infrastructure/i] },
  { domain: "OBS",        patterns: [/observability/i, /\bapm\b/i] },
  { domain: "TEST-MGMT",  patterns: [/test case management/i, /test management/i, /qa management/i] },
  // Operations
  { domain: "FSM",        patterns: [/field service/i, /dispatch management/i] },
  { domain: "IWMS",       patterns: [/facilit(y|ies) (request|management)/i, /space management/i, /room booking/i, /desk booking/i, /workplace management/i] },
  { domain: "EAM",        patterns: [/enterprise asset management/i, /equipment maintenance/i, /asset maintenance/i] },
  { domain: "OMS",        patterns: [/order management/i] },
  { domain: "FINOPS",     patterns: [/cloud cost/i, /cloud financial/i, /\bfinops\b/i] },
  { domain: "SUP-LIFE",   patterns: [/supplier lifecycle/i, /supplier management/i, /vendor management/i] },
  // Project / Portfolio
  { domain: "SPM",        patterns: [/project portfolio management/i, /\bppm\b/i, /strategic portfolio/i] },
  { domain: "PSA",        patterns: [/professional services automation/i, /\bpsa\b/i] },
  // Data
  { domain: "BI",         patterns: [/business intelligence/i] },
  { domain: "MDM",        patterns: [/master data management/i, /\bmdm\b/i] },
  { domain: "DCG",        patterns: [/data catalog/i, /data governance/i] },
  { domain: "DQ",         patterns: [/data quality/i] },
  // Compliance
  { domain: "GRC",        patterns: [/\bgrc\b/i, /governance.{0,5}risk/i, /compliance tracking/i, /compliance management/i] },
  { domain: "AUDIT",      patterns: [/audit management/i, /internal audit/i] },
  { domain: "TPRM",       patterns: [/third.?party risk/i, /vendor risk/i] },
  { domain: "PRIV-MGMT",  patterns: [/privacy management/i, /data subject request/i, /\bdsar\b/i] },
];

function match(it) {
  // Title-only by design — keyword matches in descriptions produced noisy
  // false positives (e.g. "Pet medical history" hitting CRM via "contacts").
  for (const r of RULES) for (const p of r.patterns) if (p.test(it.title)) return r.domain;
  return null;
}

let matched = 0;
const rows = items.map(it => {
  const code = match(it);
  if (code) matched++;
  return {
    domain: code ? domainByCode[code] : "",
    domainCode: code || "",
    title: it.title,
    description: it.description,
    url: it.href,
    isAI: it.isAI,
  };
});

const lines = [];
lines.push("# Airtable templates vs. Domain Map");
lines.push("");
lines.push(`Source: <https://www.airtable.com/templates> · ${items.length} unique Airtable templates · ${matched} matched to a domain in our catalog · ${items.length - matched} have no matching domain (the delta).`);
lines.push("");
lines.push("The `Domain` column shows the matching entry from our `domain_map.domains` table when a clear point-solution-market match exists (keyword-rule based; conservative). Blank = the delta. `AI` prefix in `Title` marks Airtable's AI-powered template flag.");
lines.push("");
lines.push("| Domain | Title | Description | URL |");
lines.push("|---|---|---|---|");
for (const r of rows) {
  const title = (r.isAI ? "AI · " : "") + r.title;
  lines.push(`| ${md(r.domain)} | ${md(title)} | ${md(r.description)} | <${r.url}> |`);
}

fs.writeFileSync("c:/dev/domain-map/a_domains.md", lines.join("\n") + "\n");

// Summary printout
console.log(`\nMatched ${matched} / ${items.length} templates:`);
const byDomain = {};
for (const r of rows) if (r.domain) (byDomain[r.domain] ||= []).push(r.title);
for (const dn of Object.keys(byDomain).sort()) {
  console.log(`  ${dn} (${byDomain[dn].length})`);
  for (const t of byDomain[dn]) console.log(`    - ${t}`);
}
console.log(`\nUnmatched (the delta — ${items.length - matched}). First 30:`);
let n = 0;
for (const r of rows) if (!r.domain && n++ < 30) console.log(`  - ${r.title}`);
if (items.length - matched > 30) console.log(`  … and ${items.length - matched - 30} more`);
console.log("\nWrote a_domains.md");
