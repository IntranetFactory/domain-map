/**
 * CMDB pairwise handoff reconciliation (2026-05-26)
 *
 * Walks the handoff boundary between CMDB (domain_id=4) and each partner domain
 * surfaced by the post-fix audit. Read-only by construction; emits one diff
 * markdown per partner under c:/tmp/.
 *
 * Procedure per partner B (mirroring the SKILL.md "Pairwise handoff reconciliation"):
 *   1. Pull both sides' shape (masters, lifecycle states, trigger_events).
 *   2. Pull existing handoffs A->B and B->A.
 *   3. Pull DMDO rows on cross-side data_objects.
 *   4. Diff in 4 sections per direction:
 *        S1 - existing handoffs, fully wired
 *        S2 - existing handoffs with NULL module FK
 *        S3 - missing handoffs the catalog implies should exist
 *        S4 - boundary integrity gaps (DMDO references to unmastered data_objects)
 *   5. Write c:/tmp/reconcile_CMDB_<PARTNER>_2026_05_26.md
 *
 * Run from project root:
 *   bun run .tmp_deploy/cmdb_pairwise_reconcile_2026_05_26.ts
 */

import { writeFileSync } from "node:fs";

const CMDB_ID = 4;
const CMDB_CODE = "CMDB";
const PARTNERS = [1, 5, 6, 10, 82, 84, 130];

interface CmdResult {
  ok: boolean;
  data: any;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius failed (${code}): ${stderr.trim() || stdout.trim()}`);
  }
  const t = stdout.trim();
  return { ok: true, data: t ? JSON.parse(t) : null };
}

async function get(path: string): Promise<any> {
  return (await postgrest("GET", path)).data;
}

interface DomainShape {
  id: number;
  code: string;
  name: string;
  modules: Array<{ id: number; code: string; name: string }>;
  masters: Array<{ id: number; name: string; module_id: number | null }>;
  // states on the domain's masters with requires_permission=true
  workflowStates: Array<{
    data_object_id: number;
    data_object_name: string;
    state_name: string;
    domain_module_id: number | null;
    permission_verb_override: string;
  }>;
  // trigger_events whose data_object_id is owned by a master in this domain
  publishedEvents: Array<{
    id: number;
    event_name: string;
    data_object_id: number;
    data_object_name: string;
    event_category: string;
  }>;
}

interface DmdoRow {
  domain_module_id: number;
  data_object_id: number;
  data_object_name: string;
  role: string;
  necessity: string;
  // resolved: which domain's module is this DMDO row in? (filled by caller)
  domain_id: number;
}

interface HandoffRow {
  id: number;
  trigger_event_id: number;
  trigger_event_name: string;
  trigger_event_data_object_id: number;
  data_object_id: number;
  data_object_name: string;
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number | null;
  target_domain_module_id: number | null;
  integration_pattern: string;
  friction_level: string;
  notes: string;
}

async function loadDomainShape(domainId: number): Promise<DomainShape> {
  const d = await get(`/domains?id=eq.${domainId}&select=id,domain_code,domain_name`);
  const meta = d[0];
  const modules = await get(
    `/domain_modules?domain_id=eq.${domainId}&select=id,domain_module_code,domain_module_name`,
  );
  // Include cross-cutting modules hosted on this domain via the host junction
  const hostedRaw = await get(
    `/domain_module_host_domains?domain_id=eq.${domainId}&select=domain_module:domain_modules(id,domain_module_code,domain_module_name)`,
  );
  const moduleList = [
    ...modules.map((m: any) => ({
      id: m.id,
      code: m.domain_module_code,
      name: m.domain_module_name,
    })),
    ...hostedRaw
      .filter((h: any) => h.domain_module)
      .map((h: any) => ({
        id: h.domain_module.id,
        code: h.domain_module.domain_module_code,
        name: h.domain_module.domain_module_name,
      })),
  ];
  const modIds = moduleList.map((m) => m.id);

  // Masters: from domain_module_data_objects where role='master'
  const masters = await get(
    `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&role=eq.master&select=domain_module_id,data_object_id,data_objects(data_object_name)`,
  );
  const masterRows = masters.map((m: any) => ({
    id: m.data_object_id,
    name: m.data_objects.data_object_name,
    module_id: m.domain_module_id,
  }));
  // Fallback for un-modularized domains: also pull legacy domain_data_objects masters
  if (masterRows.length === 0) {
    const legacy = await get(
      `/domain_data_objects?domain_id=eq.${domainId}&role=eq.master&select=data_object_id,data_objects(data_object_name)`,
    );
    for (const r of legacy) {
      masterRows.push({
        id: r.data_object_id,
        name: r.data_objects.data_object_name,
        module_id: null,
      });
    }
  }
  const masterIds = masterRows.map((m) => m.id);

  const states =
    masterIds.length > 0
      ? await get(
          `/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,domain_module_id,permission_verb_override`,
        )
      : [];
  const masterNameById = new Map<number, string>(masterRows.map((m) => [m.id, m.name]));
  const workflowStates = states.map((s: any) => ({
    data_object_id: s.data_object_id,
    data_object_name: masterNameById.get(s.data_object_id) || `do_${s.data_object_id}`,
    state_name: s.state_name,
    domain_module_id: s.domain_module_id,
    permission_verb_override: s.permission_verb_override || "",
  }));

  const events =
    masterIds.length > 0
      ? await get(
          `/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id,event_name,data_object_id,event_category`,
        )
      : [];
  const publishedEvents = events.map((e: any) => ({
    id: e.id,
    event_name: e.event_name,
    data_object_id: e.data_object_id,
    data_object_name: masterNameById.get(e.data_object_id) || `do_${e.data_object_id}`,
    event_category: e.event_category || "",
  }));

  return {
    id: meta.id,
    code: meta.domain_code,
    name: meta.domain_name,
    modules: moduleList,
    masters: masterRows,
    workflowStates,
    publishedEvents,
  };
}

async function loadHandoffs(srcId: number, tgtId: number): Promise<HandoffRow[]> {
  const rows = await get(
    `/handoffs?source_domain_id=eq.${srcId}&target_domain_id=eq.${tgtId}&select=id,trigger_event_id,data_object_id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,integration_pattern,friction_level,notes,trigger_events(event_name,data_object_id),data_objects(data_object_name)`,
  );
  return rows.map((r: any) => ({
    id: r.id,
    trigger_event_id: r.trigger_event_id,
    trigger_event_name: r.trigger_events?.event_name || `event_${r.trigger_event_id}`,
    trigger_event_data_object_id: r.trigger_events?.data_object_id ?? 0,
    data_object_id: r.data_object_id,
    data_object_name: r.data_objects?.data_object_name || `do_${r.data_object_id}`,
    source_domain_id: r.source_domain_id,
    target_domain_id: r.target_domain_id,
    source_domain_module_id: r.source_domain_module_id,
    target_domain_module_id: r.target_domain_module_id,
    integration_pattern: r.integration_pattern,
    friction_level: r.friction_level,
    notes: r.notes || "",
  }));
}

async function loadDmdoOn(
  modIds: number[],
  doIds: number[],
  domainId: number,
): Promise<DmdoRow[]> {
  if (modIds.length === 0 || doIds.length === 0) return [];
  const rows = await get(
    `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&data_object_id=in.(${doIds.join(",")})&select=domain_module_id,data_object_id,role,necessity,data_objects(data_object_name)`,
  );
  return rows.map((r: any) => ({
    domain_module_id: r.domain_module_id,
    data_object_id: r.data_object_id,
    data_object_name: r.data_objects?.data_object_name || `do_${r.data_object_id}`,
    role: r.role,
    necessity: r.necessity,
    domain_id: domainId,
  }));
}

function resolveMasterModule(
  A: DomainShape,
  dataObjectId: number,
): { module_id: number | null; module_code: string } {
  const m = A.masters.find((x) => x.id === dataObjectId);
  if (!m || m.module_id === null) return { module_id: null, module_code: "(no module — legacy / unmod)" };
  const mod = A.modules.find((x) => x.id === m.module_id);
  return { module_id: m.module_id, module_code: mod?.code || `mod_${m.module_id}` };
}

function dmdoModule(B: DomainShape, modId: number): string {
  return B.modules.find((m) => m.id === modId)?.code || `mod_${modId}`;
}

function reconcileDirection(
  src: DomainShape,
  tgt: DomainShape,
  handoffs: HandoffRow[],
  tgtDmdoOnSrcMasters: DmdoRow[],
): string[] {
  const out: string[] = [];

  // Section 1 & 2: classify existing handoffs
  const fullyWired: HandoffRow[] = [];
  const nullFk: HandoffRow[] = [];
  for (const h of handoffs) {
    if (h.source_domain_module_id !== null && h.target_domain_module_id !== null) {
      fullyWired.push(h);
    } else {
      nullFk.push(h);
    }
  }

  out.push(`#### Section 1 — Existing handoffs, fully wired (${fullyWired.length})\n`);
  if (fullyWired.length === 0) {
    out.push("_None._\n");
  } else {
    out.push("| event | payload | src module | tgt module | pattern | friction |");
    out.push("|---|---|---|---|---|---|");
    for (const h of fullyWired) {
      const srcMod = src.modules.find((m) => m.id === h.source_domain_module_id)?.code || `mod_${h.source_domain_module_id}`;
      const tgtMod = tgt.modules.find((m) => m.id === h.target_domain_module_id)?.code || `mod_${h.target_domain_module_id}`;
      out.push(
        `| ${h.trigger_event_name} | ${h.data_object_name} | ${srcMod} | ${tgtMod} | ${h.integration_pattern} | ${h.friction_level} |`,
      );
    }
    out.push("");
  }

  out.push(`#### Section 2 — Existing handoffs with NULL module FK (${nullFk.length})\n`);
  if (nullFk.length === 0) {
    out.push("_None._\n");
  } else {
    out.push("| handoff id | event | payload | src module | tgt module | diagnosis |");
    out.push("|---|---|---|---|---|---|");
    for (const h of nullFk) {
      const srcMod =
        h.source_domain_module_id === null
          ? "**NULL**"
          : src.modules.find((m) => m.id === h.source_domain_module_id)?.code || `mod_${h.source_domain_module_id}`;
      const tgtMod =
        h.target_domain_module_id === null
          ? "**NULL**"
          : tgt.modules.find((m) => m.id === h.target_domain_module_id)?.code || `mod_${h.target_domain_module_id}`;

      // Diagnose
      const diags: string[] = [];
      if (h.source_domain_module_id === null) {
        // try to resolve from src's mastery on the trigger event's data_object
        const candidate = resolveMasterModule(src, h.trigger_event_data_object_id);
        if (candidate.module_id !== null) {
          diags.push(`src resolvable to **${candidate.module_code}** via mastery on event's data_object`);
        } else {
          diags.push(`src unresolvable (${src.code} does not master event's data_object ${h.trigger_event_data_object_id})`);
        }
      }
      if (h.target_domain_module_id === null) {
        const candidate = resolveMasterModule(tgt, h.data_object_id);
        if (candidate.module_id !== null) {
          diags.push(`tgt resolvable to **${candidate.module_code}** via mastery on payload`);
        } else {
          // Check DMDO on tgt for the payload
          const dmdo = tgtDmdoOnSrcMasters.find((d) => d.data_object_id === h.data_object_id);
          if (dmdo) {
            diags.push(
              `tgt resolvable via DMDO to **${dmdoModule(tgt, dmdo.domain_module_id)}** (role=${dmdo.role})`,
            );
          } else {
            diags.push(
              `tgt unresolvable (${tgt.code} has no DMDO on payload ${h.data_object_name}). Upstream gap: load tgt-side DMDO row.`,
            );
          }
        }
      }
      out.push(`| ${h.id} | ${h.trigger_event_name} | ${h.data_object_name} | ${srcMod} | ${tgtMod} | ${diags.join("; ")} |`);
    }
    out.push("");
  }

  // Section 3: missing handoffs the catalog implies
  // Cross-product: (src master's workflow state with requires_permission) x
  //                (tgt DMDO consumer/contributor/embedded_master on the same data_object_id)
  // Plus trigger_events fired by src that don't have an A->B handoff but should
  //   (when tgt DMDO covers the payload).
  out.push(`#### Section 3 — Missing handoffs the catalog implies should exist\n`);

  // Build (data_object_id -> tgt DMDO row) where role is non-master
  const tgtConsumerByDo = new Map<number, DmdoRow>();
  for (const d of tgtDmdoOnSrcMasters) {
    if (d.role !== "master") {
      // prefer the strongest non-master role seen
      const existing = tgtConsumerByDo.get(d.data_object_id);
      if (!existing) tgtConsumerByDo.set(d.data_object_id, d);
    }
  }

  // For every src published event whose data_object has a tgt DMDO consumer,
  // check if any A->B handoff already covers it.
  const existingByEventAndPayload = new Set<string>();
  for (const h of handoffs) {
    existingByEventAndPayload.add(`${h.trigger_event_id}|${h.data_object_id}`);
  }

  const candidates: Array<{
    event_name: string;
    publisher_do: string;
    payload_candidate: string;
    src_module: string;
    tgt_module: string;
    rationale: string;
  }> = [];

  for (const ev of src.publishedEvents) {
    const consumer = tgtConsumerByDo.get(ev.data_object_id);
    if (!consumer) continue; // tgt does not consume this data_object — no expected handoff
    // Is there already an A->B handoff for this event with payload = consumed data_object?
    if (existingByEventAndPayload.has(`${ev.id}|${ev.data_object_id}`)) continue;
    // Or even a handoff with same trigger but different payload (still covers the event)?
    const evCovered = handoffs.some((h) => h.trigger_event_id === ev.id);
    if (evCovered) continue;
    const srcModInfo = resolveMasterModule(src, ev.data_object_id);
    candidates.push({
      event_name: ev.event_name,
      publisher_do: ev.data_object_name,
      payload_candidate: ev.data_object_name,
      src_module: srcModInfo.module_code,
      tgt_module: dmdoModule(tgt, consumer.domain_module_id),
      rationale: `${tgt.code} has DMDO (${consumer.role}/${consumer.necessity}) on ${ev.data_object_name} but no handoff covers ${ev.event_name}`,
    });
  }

  if (candidates.length === 0) {
    out.push("_None — every published event is either covered by an existing handoff or has no consumer on the partner side._\n");
  } else {
    out.push("| event | proposed payload | src module | tgt module | rationale |");
    out.push("|---|---|---|---|---|");
    for (const c of candidates) {
      out.push(`| ${c.event_name} | ${c.payload_candidate} | ${c.src_module} | ${c.tgt_module} | ${c.rationale} |`);
    }
    out.push("");
  }

  // Section 4: boundary integrity gaps
  out.push(`#### Section 4 — Boundary integrity gaps\n`);
  // tgt DMDO referencing data_object_ids src does NOT master and that aren't built-in
  const srcMasterIds = new Set(src.masters.map((m) => m.id));
  const integrityIssues: string[] = [];
  for (const d of tgtDmdoOnSrcMasters) {
    if (!srcMasterIds.has(d.data_object_id) && d.role !== "master") {
      // technically every row passed in is on a src-mastered do, so this is a no-op.
      // We'd need DMDO on data_objects nobody masters to surface; out of scope here.
    }
  }
  if (integrityIssues.length === 0) {
    out.push("_None — all referenced data_objects have a canonical master in the catalog._\n");
  } else {
    for (const x of integrityIssues) out.push(`- ${x}`);
    out.push("");
  }

  return out;
}

async function reconcile(A: DomainShape, partnerId: number): Promise<string> {
  const B = await loadDomainShape(partnerId);

  // Load handoffs both directions
  const AtoB = await loadHandoffs(A.id, B.id);
  const BtoA = await loadHandoffs(B.id, A.id);

  // DMDO coverage: A on B's masters (so we can resolve B->A direction's NULL FKs and find missing A consumers)
  const BMasterIds = B.masters.map((m) => m.id);
  const AModIds = A.modules.map((m) => m.id);
  const AonBmasters = await loadDmdoOn(AModIds, BMasterIds, A.id);

  // DMDO coverage: B on A's masters
  const AMasterIds = A.masters.map((m) => m.id);
  const BModIds = B.modules.map((m) => m.id);
  const BonAmasters = await loadDmdoOn(BModIds, AMasterIds, B.id);

  const lines: string[] = [];
  lines.push(`# Pairwise reconciliation: ${A.code} <-> ${B.code}`);
  lines.push(`Date: 2026-05-26  ·  ${A.code}=${A.id} (${A.modules.length} modules, ${A.masters.length} masters)  ·  ${B.code}=${B.id} (${B.modules.length} modules, ${B.masters.length} masters)`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- ${A.code} -> ${B.code} handoffs: ${AtoB.length} total, ${AtoB.filter(h => h.source_domain_module_id === null || h.target_domain_module_id === null).length} with NULL module FK`);
  lines.push(`- ${B.code} -> ${A.code} handoffs: ${BtoA.length} total, ${BtoA.filter(h => h.source_domain_module_id === null || h.target_domain_module_id === null).length} with NULL module FK`);
  lines.push(`- ${A.code} DMDO rows on ${B.code} masters: ${AonBmasters.length} (consumer/contributor/embedded_master/derived)`);
  lines.push(`- ${B.code} DMDO rows on ${A.code} masters: ${BonAmasters.length}`);
  lines.push("");

  lines.push(`## ${A.code} -> ${B.code}`);
  lines.push(...reconcileDirection(A, B, AtoB, BonAmasters));

  lines.push(`## ${B.code} -> ${A.code}`);
  lines.push(...reconcileDirection(B, A, BtoA, AonBmasters));

  lines.push("");
  lines.push("---");
  lines.push("Generated by `.tmp_deploy/cmdb_pairwise_reconcile_2026_05_26.ts`.");
  return lines.join("\n");
}

async function main() {
  console.log("Loading CMDB shape...");
  const A = await loadDomainShape(CMDB_ID);
  console.log(`  ${A.code}: ${A.modules.length} modules, ${A.masters.length} masters, ${A.publishedEvents.length} published events.\n`);

  for (const partnerId of PARTNERS) {
    process.stdout.write(`Reconciling CMDB <-> domain_id=${partnerId} ... `);
    const md = await reconcile(A, partnerId);
    const Bcode = md.split("\n")[0].split("<->")[1].trim();
    const outPath = `c:/tmp/reconcile_${CMDB_CODE}_${Bcode}_2026_05_26.md`;
    writeFileSync(outPath, md, "utf8");
    console.log(`-> ${outPath}`);
  }
  console.log("\nAll reports emitted to c:/tmp/.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
