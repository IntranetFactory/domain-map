// Pairwise handoff reconciliation: ITAM (domain 3) against each partner domain.
// Read-only. Produces one diff file per pair under c:/tmp/.

const DATE = "2026_05_26";
const A_ID = 3;
const A_CODE = "ITAM";
const PARTNERS: Array<{ id: number; code: string }> = [
  { id: 1, code: "ITSM" },
  { id: 10, code: "APM" },
  { id: 15, code: "GRC" },
  { id: 35, code: "IGA" },
  { id: 51, code: "HAM" },
  { id: 54, code: "HCM" },
  { id: 65, code: "ERP-FIN" },
  { id: 81, code: "KUBE-PLAT" },
  { id: 130, code: "RMM" },
];

async function pgGet(path: string, attempt = 1): Promise<any[]> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "GET", path })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    const transient = stderr.includes("TOOL_NOT_FOUND") || stderr.includes("JWT") || stderr.includes("PGRST205");
    if (transient && attempt < 4) {
      await new Promise((r) => setTimeout(r, 750 * attempt));
      return pgGet(path, attempt + 1);
    }
    throw new Error(`semantius failed: ${stderr}\npath: ${path}`);
  }
  return JSON.parse(stdout);
}

// Build a self-contained snapshot per domain.
async function snapshotDomain(domainId: number): Promise<{
  modules: Array<{ id: number; domain_module_code: string }>;
  masters: Array<{ data_object_id: number; domain_module_id: number; necessity: string; data_object_name: string }>;
  workflowStates: Array<{ data_object_id: number; data_object_name: string; state_name: string; domain_module_id: number | null; permission_verb_override: string | null }>;
  triggerEvents: Array<{ id: number; event_name: string; data_object_id: number }>;
  dmdoAll: Array<{ domain_module_id: number; domain_module_code: string; data_object_id: number; data_object_name: string; role: string; necessity: string }>;
}> {
  const modules = await pgGet(`/domain_modules?domain_id=eq.${domainId}&select=id,domain_module_code`);
  const moduleIds = modules.map((m: any) => m.id);
  if (moduleIds.length === 0) {
    return { modules: [], masters: [], workflowStates: [], triggerEvents: [], dmdoAll: [] };
  }
  const dmdoRaw = await pgGet(
    `/domain_module_data_objects?domain_module_id=in.(${moduleIds.join(",")})&select=domain_module_id,data_object_id,role,necessity,data_objects(data_object_name),domain_modules(domain_module_code)`
  );
  const dmdoAll = dmdoRaw.map((r: any) => ({
    domain_module_id: r.domain_module_id,
    domain_module_code: r.domain_modules.domain_module_code,
    data_object_id: r.data_object_id,
    data_object_name: r.data_objects.data_object_name,
    role: r.role,
    necessity: r.necessity,
  }));
  const masters = dmdoAll.filter((r: any) => r.role === "master");
  const masterDoIds = [...new Set(masters.map((m: any) => m.data_object_id))];
  let workflowStates: any[] = [];
  let triggerEvents: any[] = [];
  if (masterDoIds.length) {
    const states = await pgGet(
      `/data_object_lifecycle_states?data_object_id=in.(${masterDoIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,domain_module_id,permission_verb_override,data_objects(data_object_name)`
    );
    workflowStates = states.map((s: any) => ({
      data_object_id: s.data_object_id,
      data_object_name: s.data_objects.data_object_name,
      state_name: s.state_name,
      domain_module_id: s.domain_module_id,
      permission_verb_override: s.permission_verb_override,
    }));
    triggerEvents = await pgGet(
      `/trigger_events?data_object_id=in.(${masterDoIds.join(",")})&select=id,event_name,data_object_id`
    );
  }
  return { modules, masters, workflowStates, triggerEvents, dmdoAll };
}

async function reconcilePair(aId: number, aCode: string, bId: number, bCode: string): Promise<string> {
  const a = await snapshotDomain(aId);
  const b = await snapshotDomain(bId);

  // Existing handoffs A->B and B->A
  const ab = await pgGet(
    `/handoffs?source_domain_id=eq.${aId}&target_domain_id=eq.${bId}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,notes,trigger_events(event_name,data_object_id),data_objects(data_object_name)`
  );
  const ba = await pgGet(
    `/handoffs?source_domain_id=eq.${bId}&target_domain_id=eq.${aId}&select=id,trigger_event_id,data_object_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,notes,trigger_events(event_name,data_object_id),data_objects(data_object_name)`
  );

  const moduleNameForA = new Map<number, string>(a.modules.map((m: any) => [m.id, m.domain_module_code]));
  const moduleNameForB = new Map<number, string>(b.modules.map((m: any) => [m.id, m.domain_module_code]));

  const out: string[] = [];
  out.push(`# Pairwise reconciliation: ${aCode} ↔ ${bCode}`);
  out.push(``);
  out.push(`Generated ${DATE.replace(/_/g, "-")}. Read-only. Use this diff to schedule per-side fixes; do not load from this file.`);
  out.push(``);
  out.push(`## Snapshot summary`);
  out.push(``);
  out.push(`| Side | modules | masters | workflow-gate states | trigger events |`);
  out.push(`|---|---|---|---|---|`);
  out.push(`| ${aCode} | ${a.modules.length} | ${a.masters.length} | ${a.workflowStates.length} | ${a.triggerEvents.length} |`);
  out.push(`| ${bCode} | ${b.modules.length} | ${b.masters.length} | ${b.workflowStates.length} | ${b.triggerEvents.length} |`);
  out.push(``);
  out.push(`Existing handoffs: ${aCode}→${bCode}=${ab.length}, ${bCode}→${aCode}=${ba.length}.`);
  out.push(``);

  function renderDirection(
    dirLabel: string,
    srcCode: string,
    tgtCode: string,
    handoffs: any[],
    src: typeof a,
    tgt: typeof a,
    moduleNameForSrc: Map<number, string>,
    moduleNameForTgt: Map<number, string>,
  ) {
    out.push(`---`);
    out.push(``);
    out.push(`## Direction: ${dirLabel}`);
    out.push(``);

    // SECTION 1: existing handoffs fully wired
    const wired = handoffs.filter((h: any) => h.source_domain_module_id !== null && h.target_domain_module_id !== null);
    out.push(`### Section 1 — Existing handoffs, fully wired (${wired.length})`);
    out.push(``);
    if (wired.length === 0) {
      out.push(`_(none)_`);
    } else {
      out.push(`| event | payload | src module | tgt module | pattern | friction |`);
      out.push(`|---|---|---|---|---|---|`);
      for (const h of wired) {
        const ev = h.trigger_events?.event_name ?? "?";
        const payload = h.data_objects?.data_object_name ?? "?";
        const srcMod = moduleNameForSrc.get(h.source_domain_module_id) ?? `mod#${h.source_domain_module_id}`;
        const tgtMod = moduleNameForTgt.get(h.target_domain_module_id) ?? `mod#${h.target_domain_module_id}`;
        out.push(`| ${ev} | ${payload} | ${srcMod} | ${tgtMod} | ${h.integration_pattern} | ${h.friction_level} |`);
      }
    }
    out.push(``);

    // SECTION 2: existing handoffs with NULL module FK; check resolvability
    const partial = handoffs.filter((h: any) => h.source_domain_module_id === null || h.target_domain_module_id === null);
    out.push(`### Section 2 — Existing handoffs with NULL module FK (${partial.length})`);
    out.push(``);
    if (partial.length === 0) {
      out.push(`_(none)_`);
    } else {
      out.push(`| handoff id | event | payload | NULL side | resolvable now? | rationale |`);
      out.push(`|---|---|---|---|---|---|`);
      for (const h of partial) {
        const ev = h.trigger_events?.event_name ?? "?";
        const payload = h.data_objects?.data_object_name ?? "?";
        const nullSide = h.source_domain_module_id === null ? "source" : "target";
        // For source side (publisher), derive from trigger_event's data_object using src's DMDO; for target side, use handoff payload + tgt's DMDO.
        let rationale = "";
        let resolvable = "no";
        if (nullSide === "source") {
          const teDoId = h.trigger_events?.data_object_id;
          const cand = src.dmdoAll
            .filter((r: any) => r.data_object_id === teDoId)
            .sort((x: any, y: any) => roleOrder(x.role) - roleOrder(y.role));
          if (cand.length === 0) {
            rationale = `${srcCode} has no DMDO row on event's data_object (id=${teDoId})`;
          } else {
            const topRole = cand[0].role;
            const winners = cand.filter((r: any) => r.role === topRole);
            if (winners.length === 1) {
              resolvable = "yes";
              rationale = `${srcCode} module ${winners[0].domain_module_code} (role=${topRole})`;
            } else {
              rationale = `ambiguous: ${winners.length} modules tied at role=${topRole}`;
            }
          }
        } else {
          const cand = tgt.dmdoAll
            .filter((r: any) => r.data_object_id === h.data_object_id)
            .sort((x: any, y: any) => roleOrder(x.role) - roleOrder(y.role));
          if (cand.length === 0) {
            rationale = `${tgtCode} has no DMDO row on payload (do_id=${h.data_object_id})`;
          } else {
            const topRole = cand[0].role;
            const winners = cand.filter((r: any) => r.role === topRole);
            if (winners.length === 1) {
              resolvable = "yes";
              rationale = `${tgtCode} module ${winners[0].domain_module_code} (role=${topRole})`;
            } else {
              rationale = `ambiguous: ${winners.length} modules tied at role=${topRole}`;
            }
          }
        }
        out.push(`| ${h.id} | ${ev} | ${payload} | ${nullSide} | ${resolvable} | ${rationale} |`);
      }
    }
    out.push(``);

    // SECTION 3: missing handoffs the catalog implies should exist.
    // Candidate = (src master with workflow-gate state) X (tgt DMDO on that master's data_object).
    out.push(`### Section 3 — Missing handoffs the catalog implies should exist`);
    out.push(``);
    const srcMasterDoIds = new Set<number>(src.masters.map((m: any) => m.data_object_id));
    const tgtDmdoByDo = new Map<number, any[]>();
    for (const r of tgt.dmdoAll) {
      const arr = tgtDmdoByDo.get(r.data_object_id) ?? [];
      arr.push(r);
      tgtDmdoByDo.set(r.data_object_id, arr);
    }
    const existingByEventAndDo = new Set<string>(
      handoffs.map((h: any) => `${h.trigger_event_id}|${h.data_object_id}`)
    );
    type Candidate = { event_name: string; trigger_event_id: number; event_do: string; tgtRow: any };
    const candidates: Candidate[] = [];
    for (const ev of src.triggerEvents) {
      if (!srcMasterDoIds.has(ev.data_object_id)) continue;
      const consumers = tgtDmdoByDo.get(ev.data_object_id) ?? [];
      // also include cases where tgt consumes a different DO that the handoff payload typically targets;
      // we limit to events on src masters whose data_object is also referenced by tgt's DMDO.
      for (const tgtRow of consumers) {
        // exclude if a handoff exists for this trigger_event + payload combination
        const key = `${ev.id}|${ev.data_object_id}`;
        if (existingByEventAndDo.has(key)) continue;
        candidates.push({
          event_name: ev.event_name,
          trigger_event_id: ev.id,
          event_do: tgtRow.data_object_name,
          tgtRow,
        });
      }
    }
    if (candidates.length === 0) {
      out.push(`_(none implied — every catalog-implied (event × consumer) combination already has a handoff row)_`);
    } else {
      out.push(`| trigger event | shared data_object | tgt module (consumer) | tgt role | tgt necessity |`);
      out.push(`|---|---|---|---|---|`);
      for (const c of candidates) {
        out.push(`| ${c.event_name} | ${c.event_do} | ${c.tgtRow.domain_module_code} | ${c.tgtRow.role} | ${c.tgtRow.necessity} |`);
      }
    }
    out.push(``);

    // SECTION 4: boundary integrity gaps - tgt has DMDO on a data_object src doesn't master and isn't platform_builtin
    out.push(`### Section 4 — Boundary integrity gaps`);
    out.push(``);
    // For each tgt DMDO row that references a data_object src "could" be expected to master:
    // We only flag when tgt has non-master role on a data_object that NO domain in the catalog masters AND isn't platform_builtin.
    // That's a B5 integrity failure; out of scope of pairwise. For pairwise we instead surface DMDO rows tgt holds on src masters
    // versus the absence of a master row anywhere -- already covered by per-domain B5. Skip duplicating that.
    out.push(`_(B5 integrity is per-domain; not duplicated here. If tgt has DMDO on a data_object that no domain masters and isn't platform_builtin, the source-domain audit's B5 will surface it.)_`);
    out.push(``);
  }

  function roleOrder(role: string): number {
    switch (role) {
      case "master": return 0;
      case "embedded_master": return 1;
      case "contributor": return 2;
      case "consumer": return 3;
      case "derived": return 4;
      default: return 5;
    }
  }

  renderDirection(`${aCode} → ${bCode}`, aCode, bCode, ab, a, b, moduleNameForA, moduleNameForB);
  renderDirection(`${bCode} → ${aCode}`, bCode, aCode, ba, b, a, moduleNameForB, moduleNameForA);

  // Summary
  out.push(`---`);
  out.push(``);
  out.push(`## Summary counts`);
  out.push(``);
  const sumWired = ab.filter((h: any) => h.source_domain_module_id !== null && h.target_domain_module_id !== null).length
                 + ba.filter((h: any) => h.source_domain_module_id !== null && h.target_domain_module_id !== null).length;
  const sumPartial = ab.filter((h: any) => h.source_domain_module_id === null || h.target_domain_module_id === null).length
                   + ba.filter((h: any) => h.source_domain_module_id === null || h.target_domain_module_id === null).length;
  out.push(`- Fully wired (Section 1, both directions): ${sumWired}`);
  out.push(`- NULL-module rows (Section 2, both directions): ${sumPartial}`);
  out.push(``);

  return out.join("\n");
}

async function main() {
  console.log(`Reconciliation for ${A_CODE} (id=${A_ID}) against ${PARTNERS.length} partners`);
  console.log();
  for (const p of PARTNERS) {
    const path = `c:/tmp/reconcile_${A_CODE}_${p.code.replace(/-/g, "_")}_${DATE}.md`;
    const body = await reconcilePair(A_ID, A_CODE, p.id, p.code);
    await Bun.write(path, body);
    // print a one-line per-pair summary
    const lines = body.split("\n");
    const sumIdx = lines.findIndex((l) => l.startsWith("Existing handoffs:"));
    console.log(`  ${A_CODE} ↔ ${p.code.padEnd(10)} -> ${path}`);
    if (sumIdx >= 0) console.log(`      ${lines[sumIdx]}`);
  }
}

await main();
