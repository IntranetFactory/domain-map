#!/usr/bin/env bun
// Backfill the 6 remaining metadata fields on the 11 domains that were inserted
// with defaults (cost_band already updated by recompute_cost_band.ts).

type DomainMeta = {
  crud_percentage: number;
  business_logic: string;
  min_org_size: string;
  certification_required: boolean;
  usa_market_size_usd_m: number;
  market_size_source_year: number;
};

const backfill: Record<string, DomainMeta> = {
  "ACCT-PLAN": {
    crud_percentage: 80,
    business_logic: "Opportunity-graph rollups and white-space scoring across account hierarchies; coverage and influence maps over key-account org charts.",
    min_org_size: "20 s <500",
    certification_required: false,
    usa_market_size_usd_m: 400,
    market_size_source_year: 2024,
  },
  "COLLAB-GOV": {
    crud_percentage: 80,
    business_logic: "M365 graph inventory crawling, ownership inference, sprawl detection, and external-sharing risk scoring over collaboration metadata.",
    min_org_size: "30 m <2500",
    certification_required: false,
    usa_market_size_usd_m: 800,
    market_size_source_year: 2024,
  },
  "GTM-PLAN": {
    crud_percentage: 65,
    business_logic: "Territory carving optimization, quota distribution algorithms, capacity modeling against revenue targets and seller productivity benchmarks.",
    min_org_size: "30 m <2500",
    certification_required: false,
    usa_market_size_usd_m: 600,
    market_size_source_year: 2024,
  },
  "INTRANET": {
    crud_percentage: 88,
    business_logic: "Audience targeting algorithms, content personalization, federated search ranking across employee directories and content sources.",
    min_org_size: "20 s <500",
    certification_required: false,
    usa_market_size_usd_m: 1500,
    market_size_source_year: 2024,
  },
  "ONBOARDING": {
    crud_percentage: 92,
    business_logic: "Conditional task generation based on role, location, and employment type; cross-system orchestration to HCM, IGA, and Payroll.",
    min_org_size: "20 s <500",
    certification_required: false,
    usa_market_size_usd_m: 500,
    market_size_source_year: 2024,
  },
  "PROD-MGMT": {
    crud_percentage: 85,
    business_logic: "Feedback aggregation and clustering, RICE / value-vs-effort scoring, dependency-aware release timeline computation.",
    min_org_size: "10 xs <50",
    certification_required: false,
    usa_market_size_usd_m: 1200,
    market_size_source_year: 2024,
  },
  "REV-INTEL": {
    crud_percentage: 35,
    business_logic: "Conversation transcription and topic extraction, deal-risk scoring from activity signals, forecast roll-up models over CRM.",
    min_org_size: "20 s <500",
    certification_required: false,
    usa_market_size_usd_m: 1500,
    market_size_source_year: 2024,
  },
  "SALES-PERF": {
    crud_percentage: 60,
    business_logic: "Commission calculation engine over complex plan rules, retroactive adjustments, territory crediting, payout reconciliation.",
    min_org_size: "20 s <500",
    certification_required: false,
    usa_market_size_usd_m: 2500,
    market_size_source_year: 2024,
  },
  "SMM": {
    crud_percentage: 78,
    business_logic: "Social listening sentiment classification, audience clustering, optimal posting-time prediction across channels.",
    min_org_size: "10 xs <50",
    certification_required: false,
    usa_market_size_usd_m: 2500,
    market_size_source_year: 2024,
  },
  "SWP": {
    crud_percentage: 55,
    business_logic: "Workforce supply/demand modeling, scenario planning across role taxonomies, skills-gap projection over time.",
    min_org_size: "30 m <2500",
    certification_required: false,
    usa_market_size_usd_m: 800,
    market_size_source_year: 2024,
  },
  "WEB-CONTOPS": {
    crud_percentage: 70,
    business_logic: "Accessibility (WCAG) scanning and scoring, technical SEO crawling, broken-link detection, brand-voice and content quality scoring.",
    min_org_size: "20 s <500",
    certification_required: false,
    usa_market_size_usd_m: 700,
    market_size_source_year: 2024,
  },
};

async function semantius(args: string[], jsonBody?: object): Promise<unknown> {
  const proc = Bun.spawn(["semantius", ...args], {
    stdin: jsonBody ? "pipe" : "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  if (jsonBody && proc.stdin) {
    proc.stdin.write(JSON.stringify(jsonBody));
    proc.stdin.end();
  }
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) throw new Error(`semantius exit ${exitCode}: ${stderr}`);
  return JSON.parse(stdout);
}

let ok = 0;
for (const [code, meta] of Object.entries(backfill)) {
  const body = {
    method: "PATCH",
    path: `/domains?domain_code=eq.${encodeURIComponent(code)}`,
    body: meta,
    headers: { Prefer: "return=representation" },
  };
  const result = (await semantius(["call", "crud", "postgrestRequest"], body)) as Array<{ domain_code: string }>;
  if (result.length !== 1) throw new Error(`${code}: expected 1 row, got ${result.length}`);
  console.log(`${code.padEnd(14)} crud=${meta.crud_percentage} org=${meta.min_org_size} tam=${meta.usa_market_size_usd_m}M`);
  ok++;
}

console.log(`\nBackfilled: ${ok} / 11`);
