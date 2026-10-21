// Flag the mis-classified "leadership-tier" domains for re-audit under the
// rescinded zero-master exemption (skill-changelog 2026-06-02).
//
// For each affected domain's audits/<CODE>/state.yaml:
//   - prepend a b1a item B1A-RECLASS (the "hint in state what's needed")
//   - set status: audit_stale
//   - set next_action_by: agent  (b1a non-empty => agent, per audits/README.md derivation)
//
// PRM is excluded: its own audit already treats it as non-leadership (master-bearing),
// so there is nothing to reclassify.
//
// Idempotent: skips any file that already contains B1A-RECLASS.
// Local file edits only; no catalog/DB writes.
// Run: bun run .tmp_deploy/flag_leadership_reclass_2026_06_02.ts

const ROOT = "c:/dev/domain-map/audits";

// code -> short master-evidence phrase (drawn from each domain's own b3 / B1B proposals)
const EVIDENCE: Record<string, string> = {
  "REV-INTEL": "masters computed deal_risk_scores and revenue_forecasts (8 of 8 revenue-intelligence flagships model them as first-class records)",
  "SALES-PERF": "masters compensation_plans, quotas, commission_calculations, commission_statements (9 of 9 ICM flagships)",
  "GTM-PLAN": "masters gtm_plans, capacity_models, ideal_customer_profiles, target_account_lists (4 of 4 sales-planning flagships)",
  "ACCT-PLAN": "masters account_plans, mutual_action_plans, relationship_maps, white_space_maps (5 of 5 KAM flagships)",
  "OP-RES": "masters important_business_services, impact_tolerances, resilience_scenarios (DORA-mandated; Fusion, Castellan ship them first-class)",
  "BCM": "masters business_continuity_plans, business_impact_analyses, continuity_exercises, crisis_events (5 flagship BCM vendors)",
  "SECOPS": "genuine umbrella case: the overlay-vs-promote call (B2-1) is still real, but even as an overlay it needs a NON-EMPTY module with consumer DMDOs over ITSM/DLP/DSPM masters; the empty-stub it has today is invalid either way",
  "SOAR": "masters security_playbooks, automation_runs, security_cases (Splunk SOAR, Cortex XSOAR, Tines)",
  "THREAT-INTEL": "masters indicators of compromise, threat actors, intelligence reports (Recorded Future / Mandiant / Anomali class)",
  "TPRM": "masters third-party risk assessments and due-diligence records (crud_percentage 92; OneTrust / ProcessUnity / Prevalent class)",
  "VULN-MGMT": "masters vulnerabilities, scan results, remediation records (Tenable / Qualys / Rapid7); already holds embedded_master + consumer rows",
  "PRIV-MGMT": "masters data_subject_requests, consent_records, processing inventory (ROPA), privacy assessments (crud_percentage 88; OneTrust class)",
  "FINOPS": "mixed: derives on cloud-spend feeds but masters cost_allocations, budgets, showback reports (Apptio Cloudability / CloudHealth class)",
  "INTRANET": "masters intranet pages, news/announcements, targeted communications, journeys (crud_percentage 88; Simpplr / Staffbase / Firstup class)",
  "COLLAB-GOV": "masters workspace inventory, ownership/lifecycle policies, permission-audit and remediation records (crud_percentage 80; AvePoint / ShareGate class)",
};

function reclassBlock(code: string): string {
  const ev = EVIDENCE[code];
  const summary = `Leadership-tier zero-master exemption rescinded 2026-06-02; re-run Validate treating ${code} as master-bearing (overlay test). Build needed, not an exemption.`;
  return [
    `  - id: B1A-RECLASS`,
    `    summary: ${JSON.stringify(summary)}`,
    `    finding: >`,
    `      SKILL.md's fixed leadership-tier exemption was rescinded (references/skill-changelog.md`,
    `      2026-06-02). Under the overlay test ${code} is master-bearing: ${ev}. The prior audit's`,
    `      "keep leadership-tier / ship an empty landing module" option is no longer valid. Live state`,
    `      2026-06-02: 0 domain_modules (M1 fail), so the domain is not deployable today.`,
    `    action: >`,
    `      Re-run the full 4-pass Validate under the corrected rule. The module-shape, promote-scope,`,
    `      and catalog-UX decisions already in b2 still apply and re-surface after the re-audit; this`,
    `      item records only that the classification is settled (master-bearing) and the domain needs`,
    `      a build, not an exemption.`,
    `    extra_reclassified: "2026-06-02 skill-changelog"`,
    ``,
  ].join("\n");
}

const CODES = [
  "REV-INTEL", "SALES-PERF", "GTM-PLAN", "ACCT-PLAN", "OP-RES", "BCM",
  "SECOPS", "SOAR", "THREAT-INTEL", "TPRM", "VULN-MGMT", "PRIV-MGMT",
  "FINOPS", "INTRANET", "COLLAB-GOV",
];

const results: string[] = [];
for (const code of CODES) {
  const path = `${ROOT}/${code}/state.yaml`;
  let text: string;
  try {
    text = await Bun.file(path).text();
  } catch {
    results.push(`SKIP  ${code} (no state.yaml)`);
    continue;
  }
  if (text.includes("B1A-RECLASS")) {
    results.push(`SKIP  ${code} (already flagged)`);
    continue;
  }

  const block = reclassBlock(code);
  let next = text;

  // status / next_action_by flips (anchored full-line)
  next = next.replace(/^status: .*$/m, "status: audit_stale");
  next = next.replace(/^next_action_by: .*$/m, "next_action_by: agent");

  // b1a injection: empty list vs existing items
  if (/^b1a: \[\]\s*$/m.test(next)) {
    next = next.replace(/^b1a: \[\]\s*$/m, `b1a:\n${block}`);
  } else if (/^b1a:\s*$/m.test(next)) {
    next = next.replace(/^b1a:\s*$/m, `b1a:\n${block.replace(/\n$/, "")}`);
  } else {
    results.push(`ERROR ${code} (no recognizable b1a: key)`);
    continue;
  }

  if (next === text) {
    results.push(`ERROR ${code} (no change applied)`);
    continue;
  }
  await Bun.write(path, next);
  results.push(`OK    ${code} -> status: audit_stale, next_action_by: agent, +B1A-RECLASS`);
}

console.log("\n=== Leadership-tier reclass flagging ===\n");
for (const r of results) console.log(r);
console.log(`\n${results.filter((r) => r.startsWith("OK")).length} updated, ` +
  `${results.filter((r) => r.startsWith("SKIP")).length} skipped, ` +
  `${results.filter((r) => r.startsWith("ERROR")).length} errors.`);
