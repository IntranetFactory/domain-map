// scripts/lib/health/run.ts
//
// Runs the registry against one HealthCtx and aggregates findings per check.

import { NOT_PORTED_PREFIX } from "./helpers.ts";
import type { CheckRecord } from "./record.ts";
import { RESULT_ORDER, type Check, type CheckKind, type Finding, type HealthCtx, type Result } from "./types.ts";

export type CheckOutcome = {
  id: string;
  band: string;
  kind: CheckKind;
  title: string;
  result: Result; // worst finding (RESULT_ORDER)
  rows: (number | string)[]; // union of the findings' rows
  findings: Finding[];
  notPorted: boolean;
  error?: string; // the check threw (script bug or fetch failure); never recorded
};

export type DomainReport = {
  domain_code: string;
  domain_name: string;
  domain_id: number;
  checklist_version: number;
  run_at: string;
  checks: CheckOutcome[];
  summary: Record<Result, number> & { checks: number; not_ported: number; errors: number };
};

export function worst(results: Result[]): Result {
  for (const r of RESULT_ORDER) if (results.includes(r)) return r;
  return "pass";
}

export async function runDomain(ctx: HealthCtx, checks: Check[], checklistVersion: number, runAt: string): Promise<DomainReport> {
  const outcomes: CheckOutcome[] = [];
  for (const c of checks) {
    let findings: Finding[];
    let error: string | undefined;
    try {
      findings = await c.run(ctx);
      if (findings.length === 0) findings = [{ id: c.id, result: "pass", detail: "ok" }];
      for (const f of findings) {
        if (f.id !== c.id) throw new Error(`check ${c.id} emitted a finding with id ${f.id}`);
      }
    } catch (e) {
      error = (e as Error).message;
      findings = [{ id: c.id, result: "agent", detail: `check errored: ${error}` }];
    }
    // Sorted (numbers ascending, then strings) so a re-recorded checks: block diffs minimally.
    const rows = [...new Set(findings.flatMap((f) => f.rows ?? []))].sort((a, b) =>
      typeof a === "number" && typeof b === "number" ? a - b : typeof a === "number" ? -1 : typeof b === "number" ? 1 : a < b ? -1 : a > b ? 1 : 0,
    );
    outcomes.push({
      id: c.id,
      band: c.band,
      kind: c.kind,
      title: c.title,
      result: worst(findings.map((f) => f.result)),
      rows,
      findings,
      notPorted: findings.some((f) => f.detail.startsWith(NOT_PORTED_PREFIX)),
      error,
    });
  }
  const summary = { pass: 0, fail: 0, warn: 0, agent: 0, delegated: 0, skipped: 0, checks: outcomes.length, not_ported: 0, errors: 0 };
  for (const o of outcomes) {
    summary[o.result]++;
    if (o.notPorted) summary.not_ported++;
    if (o.error) summary.errors++;
  }
  return {
    domain_code: ctx.domainCode,
    domain_name: ctx.domain.domain_name,
    domain_id: ctx.domainId,
    checklist_version: checklistVersion,
    run_at: runAt,
    checks: outcomes,
    summary,
  };
}

export function toRecords(report: DomainReport): CheckRecord[] {
  return report.checks.map((c) => ({ id: c.id, result: c.result, rows: c.rows }));
}
