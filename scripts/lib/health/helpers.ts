// scripts/lib/health/helpers.ts
//
// Builders for registry entries, so every band file declares its checks the same way.
//
//   notPorted(...)  mechanical (or mechanical+agent) check whose mechanical half is not ported yet:
//                   one `agent` finding "not yet ported: <SKILL.md query summary>" (plus the
//                   judgment half for mechanical+agent). Replace with a real `run` when porting.
//   agentOnly(...)  judgment-only check: one `agent` finding naming the judgment.
//   delegated(...)  run by another committed script: one `delegated` finding naming it.
//   skipped(...)    retired / reserved ID: one `skipped` finding with the reason.
//   fromInvariants  turn catalog_invariants.ts findings into health findings, grouped by rule.

import type { InvariantFinding } from "../catalog_invariants.ts";
import type { Band, Check, CheckKind, Finding, HealthCtx } from "./types.ts";

export const NOT_PORTED_PREFIX = "not yet ported: ";

export function notPorted(
  id: string,
  band: Band,
  title: string,
  querySummary: string,
  opts: { kind?: Extract<CheckKind, "mechanical" | "mechanical+agent">; judgment?: string } = {},
): Check {
  const kind = opts.kind ?? "mechanical";
  if (kind === "mechanical+agent" && !opts.judgment) throw new Error(`${id}: mechanical+agent needs its judgment half`);
  return {
    id,
    band,
    kind,
    title,
    run: async () => {
      const out: Finding[] = [{ id, result: "agent", detail: NOT_PORTED_PREFIX + querySummary }];
      if (opts.judgment) out.push({ id, result: "agent", detail: `judgment: ${opts.judgment}` });
      return out;
    },
  };
}

export function agentOnly(id: string, band: Band, title: string, judgment: string): Check {
  return { id, band, kind: "agent", title, run: async () => [{ id, result: "agent", detail: `judgment: ${judgment}` }] };
}

export function delegated(id: string, band: Band, title: string, how: string): Check {
  return { id, band, kind: "delegated", title, run: async () => [{ id, result: "delegated", detail: how }] };
}

export function skipped(id: string, band: Band, title: string, reason: string): Check {
  return { id, band, kind: "skipped", title, run: async () => [{ id, result: "skipped", detail: reason }] };
}

// The judgment half of a ported mechanical+agent check.
export function judgment(id: string, text: string): Finding {
  return { id, result: "agent", detail: `judgment: ${text}` };
}

const MAX_DETAIL_ITEMS = 12;

// Group invariant findings by (rule, severity) into one health finding each. `rows` is the union
// of the group's row ids; `detail` leads with the rule and count, then the per-row details.
export function fromInvariants(id: string, findings: InvariantFinding[], label?: (rule: string) => string): Finding[] {
  const groups = new Map<string, InvariantFinding[]>();
  for (const f of findings) {
    const k = `${f.severity}|${f.rule}`;
    const g = groups.get(k);
    if (g) g.push(f);
    else groups.set(k, [f]);
  }
  const out: Finding[] = [];
  for (const [k, g] of groups) {
    const [severity, rule] = k.split("|");
    const rows = [...new Set(g.flatMap((f) => f.rows))];
    const shown = g.slice(0, MAX_DETAIL_ITEMS).map((f) => f.detail);
    const more = g.length > MAX_DETAIL_ITEMS ? `; ...+${g.length - MAX_DETAIL_ITEMS} more` : "";
    out.push({
      id,
      result: severity as Finding["result"],
      rows,
      detail: `${label ? label(rule) : rule} (${g.length}): ${shown.join("; ")}${more}`,
    });
  }
  // fail before warn, then by rule name, so output is stable.
  return out.sort((a, b) => (a.result === b.result ? (a.detail < b.detail ? -1 : 1) : a.result === "fail" ? -1 : 1));
}

// Lifecycle rows of the domain's masters (the E-band / B9c scope).
export function masterLifecycle(ctx: HealthCtx): any[] {
  return ctx.all.lifecycle.filter((s: any) => ctx.masterSet.has(s.data_object_id as number));
}

// "7.2.5.1 Obtain candidate background information (1020)" style label for a process id.
export function processLabel(ctx: HealthCtx, pid: number): string {
  const p = ctx.all.processesById.get(pid);
  if (!p) return `process ${pid}`;
  const code = p.process_code ? `${p.process_code} ` : "";
  return `${code}${p.process_name ?? ""} (process ${pid})`.trim();
}

export function personaLabel(ctx: HealthCtx, personaId: number | null | undefined): string {
  if (personaId == null) return "(no persona)";
  const r = ctx.all.personasById.get(personaId);
  return r ? `${r.persona_name ?? r.persona_code} (persona ${personaId})` : `persona ${personaId}`;
}
