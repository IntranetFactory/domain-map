// scripts/lib/health/checks_h.ts
//
// H band: handoff APQC coverage (SKILL.md "H. Handoff APQC coverage"). H1 is NOT optional.
// Each entry's id matches the SKILL.md checklist; registry.ts asserts coverage.
//
// H1 runs on ctx.all.handoffs + ctx.all.handoffProcesses (no extra query); the pure logic lives in
// logic_cefh.ts (ported from audit_backlog.ts H1). Row ids: handoffs.id. The catalog half (a
// handoff_processes row exists) is mechanical; the defer-to-Discover half lives in the audit's
// free-text APQC TAGGING section, which the script cannot read, so an untagged handoff fails and an
// `agent` finding asks the reviewer to confirm any deferral.

import { judgment } from "./helpers.ts";
import { checkHandoffTags, crossDomainHandoffs, handoffTagCoverage } from "./logic_cefh.ts";
import type { Check, Finding } from "./types.ts";

export const H_CHECKS: Check[] = [
  {
    id: "H1",
    band: "H",
    kind: "mechanical",
    title: "cross-domain handoffs carry an APQC tag",
    run: async (ctx) => {
      const cross = crossDomainHandoffs(ctx.all.handoffs, ctx.domainId);
      const cov = handoffTagCoverage(cross, ctx.all.handoffProcesses, ctx.domainId);
      const byId = new Map(cross.map((h: any) => [h.id as number, h]));
      const label = (id: number) => {
        const h: any = byId.get(id);
        if (!h) return `handoff ${id}`;
        const out = h.source_domain_id === ctx.domainId;
        const other = ctx.index.domainsById.get((out ? h.target_domain_id : h.source_domain_id) as number)?.domain_code ?? "?";
        const ev = h.trigger_events?.event_name ?? h.data_objects?.data_object_name ?? "?";
        return `${id} ${out ? "->" : "<-"} ${other} (${ev})`;
      };
      const v = checkHandoffTags(cov, label);
      const out: Finding[] = [{ id: "H1", ...v }];
      if (v.result === "fail") {
        out.push(judgment("H1", `an untagged handoff passes only when the audit's Bucket 1 APQC TAGGING section defers it to Discover with a reason; tag the rest (agent_curated, record_status='new') per references/domain-audit-procedure.md`));
      }
      return out;
    },
  },
];
