/**
 * Pairwise handoff reconciliation between two domains.
 *
 * Implements the procedure defined in
 * .claude/skills/domain-map-analyst/SKILL.md
 * § "Pairwise handoff reconciliation (focused, on-demand)".
 *
 * READ-ONLY. Produces a diff file at c:/tmp/reconcile_<A>_<B>_<YYYY_MM_DD>.md.
 * Never patches. The user reviews the diff and loads accepted fixes via
 * the normal Phase-B / Phase-M loaders on the side that owes them.
 *
 * Usage (hard-coded for ATS<->HCM in this run; parameterize for reuse):
 *   bun run .tmp_deploy/reconcile_handoffs.ts
 */

const A_CODE = "ATS";
const A_ID = 56;
const B_CODE = "HCM";
const B_ID = 54;

const ROLE_RANK: Record<string, number> = {
  master: 0,
  embedded_master: 1,
  contributor: 2,
  consumer: 3,
  derived: 4,
};

async function postgrest(method: string, path: string, body?: any): Promise<any> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${method} ${path} failed (${code}): ${stderr.trim() || stdout.trim()}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

async function get(path: string) {
  return postgrest("GET", path);
}

type DomainContext = {
  code: string;
  id: number;
  masters: { data_object_id: number; data_object_name: string }[];
  modules: { id: number; domain_module_code: string }[];
  masterIds: number[];
  moduleIds: number[];
  lifecycleStates: {
    id: number;
    data_object_id: number;
    data_object_name: string;
    state_name: string;
    requires_permission: boolean;
    domain_module_id: number | null;
  }[];
  triggerEvents: { id: number; event_name: string; data_object_id: number }[];
  // DMDO rows on the OTHER domain's data_objects (i.e., this domain's role on the partner's masters)
};

async function loadDomain(code: string, id: number): Promise<DomainContext> {
  const masters = await get(
    `/domain_data_objects?domain_id=eq.${id}&role=eq.master&select=data_object_id,data_objects(data_object_name)`
  );
  const flatMasters = masters.map((m: any) => ({
    data_object_id: m.data_object_id,
    data_object_name: m.data_objects.data_object_name,
  }));
  const modules = await get(
    `/domain_modules?domain_id=eq.${id}&select=id,domain_module_code&order=id.asc`
  );
  const masterIds = flatMasters.map((m: any) => m.data_object_id);
  const lifecycleStates = masterIds.length
    ? (await get(
        `/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&select=id,data_object_id,state_name,requires_permission,domain_module_id,data_objects(data_object_name)&order=data_object_id.asc,state_order.asc`
      )).map((s: any) => ({
        id: s.id,
        data_object_id: s.data_object_id,
        data_object_name: s.data_objects.data_object_name,
        state_name: s.state_name,
        requires_permission: s.requires_permission,
        domain_module_id: s.domain_module_id,
      }))
    : [];
  const triggerEvents = masterIds.length
    ? await get(
        `/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id,event_name,data_object_id`
      )
    : [];
  return {
    code,
    id,
    masters: flatMasters,
    modules,
    masterIds,
    moduleIds: modules.map((m: any) => m.id),
    lifecycleStates,
    triggerEvents,
  };
}

type Handoff = {
  id: number;
  source_domain_id: number;
  target_domain_id: number;
  source_domain_module_id: number | null;
  target_domain_module_id: number | null;
  trigger_event_id: number;
  data_object_id: number;
  event_name: string;
  trigger_data_object_id: number;
  payload_name: string;
  notes: string;
};

async function loadHandoffsBetween(srcId: number, tgtId: number): Promise<Handoff[]> {
  const rows = await get(
    `/handoffs?source_domain_id=eq.${srcId}&target_domain_id=eq.${tgtId}&select=id,source_domain_id,target_domain_id,source_domain_module_id,target_domain_module_id,trigger_event_id,data_object_id,notes,trigger_events(event_name,data_object_id),data_objects!data_object_id(data_object_name)`
  );
  return rows.map((r: any) => ({
    id: r.id,
    source_domain_id: r.source_domain_id,
    target_domain_id: r.target_domain_id,
    source_domain_module_id: r.source_domain_module_id,
    target_domain_module_id: r.target_domain_module_id,
    trigger_event_id: r.trigger_event_id,
    data_object_id: r.data_object_id,
    event_name: r.trigger_events?.event_name ?? "?",
    trigger_data_object_id: r.trigger_events?.data_object_id ?? -1,
    payload_name: r.data_objects?.data_object_name ?? "?",
    notes: r.notes ?? "",
  }));
}

type DMDO = {
  domain_module_id: number;
  data_object_id: number;
  role: string;
  necessity: string;
};

async function loadDmdoOnPartnerMasters(thisModuleIds: number[], partnerMasterIds: number[]): Promise<DMDO[]> {
  if (thisModuleIds.length === 0 || partnerMasterIds.length === 0) return [];
  return get(
    `/domain_module_data_objects?domain_module_id=in.(${thisModuleIds.join(",")})&data_object_id=in.(${partnerMasterIds.join(",")})&select=domain_module_id,data_object_id,role,necessity`
  );
}

type DirectionDiff = {
  src: DomainContext;
  tgt: DomainContext;
  srcModuleById: Map<number, string>;
  tgtModuleById: Map<number, string>;
  handoffs: Handoff[];
  tgtDmdoOnSrcMasters: DMDO[]; // target's DMDO coverage on source's masters
  section1: Handoff[]; // fully wired
  section2: { handoff: Handoff; nullColumn: string; resolvable: boolean; suggestedModuleId: number | null; note: string }[];
  section3a: { trigger_event_id: number; event_name: string; data_object_name: string; data_object_id: number; subscribed_modules: { id: number; code: string; role: string }[] }[]; // event published, B has DMDO, no handoff
  section3b: { state_id: number; data_object_name: string; state_name: string; consuming_modules: { id: number; code: string; role: string }[] }[]; // workflow-gate with no trigger_event, but B consumes
  section4: { side: string; data_object_id: number; data_object_name: string; role: string; reason: string }[];
};

function buildDirection(
  src: DomainContext,
  tgt: DomainContext,
  handoffs: Handoff[],
  tgtDmdoOnSrcMasters: DMDO[],
  allDataObjects: Map<number, { name: string; kind: string }>,
  allMasterDataObjectIds: Set<number>
): DirectionDiff {
  const srcModuleById = new Map(src.modules.map((m: any) => [m.id, m.domain_module_code]));
  const tgtModuleById = new Map(tgt.modules.map((m: any) => [m.id, m.domain_module_code]));

  // Section 1 + 2
  const section1: Handoff[] = [];
  const section2: DirectionDiff["section2"] = [];
  // Build tgt DMDO index for the resolvability check on section 2 NULL target_domain_module_id
  const tgtDmdoIdx = new Map<number, DMDO[]>(); // data_object_id -> DMDOs
  for (const d of tgtDmdoOnSrcMasters) {
    if (!tgtDmdoIdx.has(d.data_object_id)) tgtDmdoIdx.set(d.data_object_id, []);
    tgtDmdoIdx.get(d.data_object_id)!.push(d);
  }
  function strongestModule(dmdos: DMDO[]): number | null {
    if (dmdos.length === 0) return null;
    const minRank = Math.min(...dmdos.map((d) => ROLE_RANK[d.role] ?? 99));
    const tops = dmdos.filter((d) => (ROLE_RANK[d.role] ?? 99) === minRank);
    if (tops.length === 1) return tops[0].domain_module_id;
    return null; // tie -> unresolvable
  }

  for (const h of handoffs) {
    const sNull = h.source_domain_module_id === null;
    const tNull = h.target_domain_module_id === null;
    if (!sNull && !tNull) {
      section1.push(h);
      continue;
    }
    // Section 2: NULL FK
    if (sNull) {
      // Try to resolve via src's DMDO on the trigger_event's data_object
      // (we'd need src DMDO too — for ATS↔HCM we don't have it loaded yet, but the source-side
      //  resolution can be checked via the source domain's DMDO. Skip for simplicity in v1; mark as
      //  "needs source-side audit".
      section2.push({
        handoff: h,
        nullColumn: "source_domain_module_id",
        resolvable: false,
        suggestedModuleId: null,
        note: `source side ${src.code} owes B10b derivation (run that domain's audit)`,
      });
    }
    if (tNull) {
      const dmdos = tgtDmdoIdx.get(h.data_object_id) ?? [];
      const suggested = strongestModule(dmdos);
      if (suggested !== null) {
        section2.push({
          handoff: h,
          nullColumn: "target_domain_module_id",
          resolvable: true,
          suggestedModuleId: suggested,
          note: `${tgt.code} now has DMDO ${dmdos.map((d) => `${d.role}@${tgtModuleById.get(d.domain_module_id)}`).join(", ")} on payload ${h.payload_name} — PATCH-resolvable`,
        });
      } else if (dmdos.length === 0) {
        section2.push({
          handoff: h,
          nullColumn: "target_domain_module_id",
          resolvable: false,
          suggestedModuleId: null,
          note: `${tgt.code} has no DMDO on payload ${h.payload_name} (B10b sub-case 2) — load a consumer DMDO row, then re-run`,
        });
      } else {
        section2.push({
          handoff: h,
          nullColumn: "target_domain_module_id",
          resolvable: false,
          suggestedModuleId: null,
          note: `${tgt.code} has tied DMDOs on payload ${h.payload_name}: ${dmdos.map((d) => `${d.role}@${tgtModuleById.get(d.domain_module_id)}`).join(", ")}`,
        });
      }
    }
  }

  // Section 3a: trigger_events on src exist for X, tgt has DMDO on X, but no handoff src->tgt for that event_id
  const handoffByEventId = new Map<number, Handoff[]>();
  for (const h of handoffs) {
    if (!handoffByEventId.has(h.trigger_event_id)) handoffByEventId.set(h.trigger_event_id, []);
    handoffByEventId.get(h.trigger_event_id)!.push(h);
  }
  const section3a: DirectionDiff["section3a"] = [];
  for (const te of src.triggerEvents) {
    const subscribers = tgtDmdoIdx.get(te.data_object_id) ?? [];
    if (subscribers.length === 0) continue;
    const existing = handoffByEventId.get(te.id) ?? [];
    if (existing.length === 0) {
      const masterName = src.masters.find((m) => m.data_object_id === te.data_object_id)?.data_object_name ?? "?";
      section3a.push({
        trigger_event_id: te.id,
        event_name: te.event_name,
        data_object_name: masterName,
        data_object_id: te.data_object_id,
        subscribed_modules: subscribers.map((s) => ({
          id: s.domain_module_id,
          code: tgtModuleById.get(s.domain_module_id) ?? "?",
          role: s.role,
        })),
      });
    }
  }

  // Section 3b: workflow-gate states (requires_permission=true) on src masters where tgt has DMDO on the master, but no trigger_event for that state exists
  const triggerEventsByDataObject = new Map<number, typeof src.triggerEvents>();
  for (const te of src.triggerEvents) {
    if (!triggerEventsByDataObject.has(te.data_object_id)) triggerEventsByDataObject.set(te.data_object_id, []);
    triggerEventsByDataObject.get(te.data_object_id)!.push(te);
  }
  const section3b: DirectionDiff["section3b"] = [];
  const seenStateKeys = new Set<string>();
  for (const ls of src.lifecycleStates) {
    if (!ls.requires_permission) continue;
    const consumers = tgtDmdoIdx.get(ls.data_object_id) ?? [];
    if (consumers.length === 0) continue;
    const events = triggerEventsByDataObject.get(ls.data_object_id) ?? [];
    // Heuristic: does any event_name end with `.<state_name>` or contain the state? If yes, treat as covered (event likely exists).
    const stateHasEvent = events.some(
      (e) => e.event_name === `${ls.data_object_name.replace(/s$/, "")}.${ls.state_name}` ||
             e.event_name.endsWith(`.${ls.state_name}`)
    );
    if (stateHasEvent) continue;
    const key = `${ls.data_object_id}:${ls.state_name}`;
    if (seenStateKeys.has(key)) continue;
    seenStateKeys.add(key);
    section3b.push({
      state_id: ls.id,
      data_object_name: ls.data_object_name,
      state_name: ls.state_name,
      consuming_modules: consumers.map((c) => ({
        id: c.domain_module_id,
        code: tgtModuleById.get(c.domain_module_id) ?? "?",
        role: c.role,
      })),
    });
  }

  // Section 4: boundary integrity — tgt DMDO references src masters that don't exist or aren't mastered anywhere.
  // For pairwise reconciliation, this only catches the case where tgt declares DMDO on a data_object_id that
  // src is claimed to master but doesn't actually have a master row.
  const section4: DirectionDiff["section4"] = [];
  const srcMasterSet = new Set(src.masterIds);
  for (const d of tgtDmdoOnSrcMasters) {
    if (!srcMasterSet.has(d.data_object_id)) {
      const doInfo = allDataObjects.get(d.data_object_id);
      if (doInfo?.kind === "platform_builtin") continue; // built-ins are exempt per Rule #10
      const masteredSomewhere = allMasterDataObjectIds.has(d.data_object_id);
      if (!masteredSomewhere) {
        section4.push({
          side: tgt.code,
          data_object_id: d.data_object_id,
          data_object_name: doInfo?.name ?? `id ${d.data_object_id}`,
          role: d.role,
          reason: `${tgt.code} module ${tgtModuleById.get(d.domain_module_id)} declares ${d.role} on data_object ${doInfo?.name ?? d.data_object_id} but it has NO master row anywhere in the catalog — B5 integrity failure`,
        });
      }
    }
  }

  return {
    src,
    tgt,
    srcModuleById,
    tgtModuleById,
    handoffs,
    tgtDmdoOnSrcMasters,
    section1,
    section2,
    section3a,
    section3b,
    section4,
  };
}

function fmtDirection(d: DirectionDiff): string {
  const lines: string[] = [];
  const dir = `${d.src.code} → ${d.tgt.code}`;
  lines.push(`\n## Direction: ${dir}\n`);
  lines.push(`- Existing handoffs: **${d.handoffs.length}** total (Section 1: ${d.section1.length} fully wired; Section 2: ${d.section2.length} with NULL module FK)`);
  lines.push(`- Section 3a (event published, partner has DMDO, no handoff): **${d.section3a.length}**`);
  lines.push(`- Section 3b (workflow-gate state with no trigger_event, partner consumes master): **${d.section3b.length}**`);
  lines.push(`- Section 4 (boundary integrity): **${d.section4.length}**`);

  // Section 1
  lines.push(`\n### S1: existing handoffs fully wired (${d.section1.length})`);
  if (d.section1.length === 0) {
    lines.push(`_None._`);
  } else {
    lines.push(`| id | event_name | payload | src module | tgt module |`);
    lines.push(`|---|---|---|---|---|`);
    for (const h of d.section1) {
      lines.push(
        `| ${h.id} | \`${h.event_name}\` | \`${h.payload_name}\` | ${d.srcModuleById.get(h.source_domain_module_id!) ?? "?"} | ${d.tgtModuleById.get(h.target_domain_module_id!) ?? "?"} |`
      );
    }
  }

  // Section 2
  lines.push(`\n### S2: existing handoffs with NULL module FK (${d.section2.length})`);
  if (d.section2.length === 0) {
    lines.push(`_None._`);
  } else {
    lines.push(`| id | event_name | payload | NULL column | resolvable? | note |`);
    lines.push(`|---|---|---|---|---|---|`);
    for (const s of d.section2) {
      const h = s.handoff;
      lines.push(
        `| ${h.id} | \`${h.event_name}\` | \`${h.payload_name}\` | ${s.nullColumn} | ${s.resolvable ? `PATCH to module id ${s.suggestedModuleId}` : "no"} | ${s.note} |`
      );
    }
  }

  // Section 3a
  lines.push(`\n### S3a: events ${d.src.code} publishes that ${d.tgt.code} consumes (no handoff yet) (${d.section3a.length})`);
  if (d.section3a.length === 0) {
    lines.push(`_None — every cross-published event is wired._`);
  } else {
    lines.push(`| trigger_event id | event_name | published on | ${d.tgt.code} consumer modules (role) |`);
    lines.push(`|---|---|---|---|`);
    for (const c of d.section3a) {
      lines.push(
        `| ${c.trigger_event_id} | \`${c.event_name}\` | \`${c.data_object_name}\` | ${c.subscribed_modules.map((m) => `${m.code} (${m.role})`).join(", ")} |`
      );
    }
  }

  // Section 3b
  lines.push(`\n### S3b: workflow-gate states with no trigger_event but the partner consumes the master (${d.section3b.length})`);
  if (d.section3b.length === 0) {
    lines.push(`_None._`);
  } else {
    lines.push(`| state id | master.state | ${d.tgt.code} modules consuming master |`);
    lines.push(`|---|---|---|`);
    for (const c of d.section3b) {
      lines.push(
        `| ${c.state_id} | \`${c.data_object_name}.${c.state_name}\` | ${c.consuming_modules.map((m) => `${m.code} (${m.role})`).join(", ")} |`
      );
    }
    lines.push(`\n_These imply an upstream Phase-B gap: ${d.src.code} likely owes a \`trigger_events\` row for each, then a handoff to the consuming module._`);
  }

  // Section 4
  lines.push(`\n### S4: boundary integrity (${d.section4.length})`);
  if (d.section4.length === 0) {
    lines.push(`_None._`);
  } else {
    for (const s of d.section4) {
      lines.push(`- ${s.reason}`);
    }
  }

  return lines.join("\n");
}

async function main() {
  console.log(`Pairwise handoff reconciliation: ${A_CODE} <-> ${B_CODE}\n`);

  console.log(`Loading ${A_CODE}...`);
  const A = await loadDomain(A_CODE, A_ID);
  console.log(`  ${A.masters.length} masters, ${A.modules.length} modules, ${A.lifecycleStates.length} lifecycle states, ${A.triggerEvents.length} trigger_events`);

  console.log(`Loading ${B_CODE}...`);
  const B = await loadDomain(B_CODE, B_ID);
  console.log(`  ${B.masters.length} masters, ${B.modules.length} modules, ${B.lifecycleStates.length} lifecycle states, ${B.triggerEvents.length} trigger_events`);

  console.log("Loading handoffs both directions...");
  const handoffsAB = await loadHandoffsBetween(A.id, B.id);
  const handoffsBA = await loadHandoffsBetween(B.id, A.id);
  console.log(`  ${A_CODE} -> ${B_CODE}: ${handoffsAB.length}`);
  console.log(`  ${B_CODE} -> ${A_CODE}: ${handoffsBA.length}`);

  console.log("Loading DMDO cross-coverage...");
  const bDmdoOnAMasters = await loadDmdoOnPartnerMasters(B.moduleIds, A.masterIds);
  const aDmdoOnBMasters = await loadDmdoOnPartnerMasters(A.moduleIds, B.masterIds);
  console.log(`  ${B_CODE} DMDO rows on ${A_CODE} masters: ${bDmdoOnAMasters.length}`);
  console.log(`  ${A_CODE} DMDO rows on ${B_CODE} masters: ${aDmdoOnBMasters.length}`);

  console.log("Loading data_object catalog (for boundary check kind=platform_builtin discrimination)...");
  const allDataObjectIds = new Set<number>([
    ...A.masterIds,
    ...B.masterIds,
    ...bDmdoOnAMasters.map((d) => d.data_object_id),
    ...aDmdoOnBMasters.map((d) => d.data_object_id),
  ]);
  const dataObjectRows = await get(
    `/data_objects?id=in.(${[...allDataObjectIds].join(",")})&select=id,data_object_name,kind`
  );
  const allDataObjects = new Map<number, { name: string; kind: string }>(
    dataObjectRows.map((r: any) => [r.id, { name: r.data_object_name, kind: r.kind ?? "" }])
  );
  const masterRows = await get(
    `/domain_data_objects?role=eq.master&data_object_id=in.(${[...allDataObjectIds].join(",")})&select=data_object_id`
  );
  const allMasterDataObjectIds = new Set<number>(masterRows.map((r: any) => r.data_object_id));

  console.log("Computing diffs...\n");
  const dirAB = buildDirection(A, B, handoffsAB, bDmdoOnAMasters, allDataObjects, allMasterDataObjectIds);
  const dirBA = buildDirection(B, A, handoffsBA, aDmdoOnBMasters, allDataObjects, allMasterDataObjectIds);

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "_");
  const filePath = `c:/tmp/reconcile_${A_CODE}_${B_CODE}_${date}.md`;

  const totals = {
    s1: dirAB.section1.length + dirBA.section1.length,
    s2: dirAB.section2.length + dirBA.section2.length,
    s3a: dirAB.section3a.length + dirBA.section3a.length,
    s3b: dirAB.section3b.length + dirBA.section3b.length,
    s4: dirAB.section4.length + dirBA.section4.length,
  };

  const body = `# Pairwise reconciliation: ${A_CODE} <-> ${B_CODE} (${date.replace(/_/g, "-")})

## Summary (both directions combined)

- **S1 fully-wired:** ${totals.s1}
- **S2 NULL-FK:** ${totals.s2}
- **S3a missing-handoff (event exists, no edge):** ${totals.s3a}
- **S3b missing trigger_event upstream:** ${totals.s3b}
- **S4 boundary integrity:** ${totals.s4}

${A_CODE} catalog: ${A.masters.length} masters, ${A.modules.length} modules.
${B_CODE} catalog: ${B.masters.length} masters, ${B.modules.length} modules.

DMDO cross-coverage:
- ${B_CODE} modules hold ${bDmdoOnAMasters.length} role rows on ${A_CODE} masters.
- ${A_CODE} modules hold ${aDmdoOnBMasters.length} role rows on ${B_CODE} masters.
${fmtDirection(dirAB)}
${fmtDirection(dirBA)}
`;

  await Bun.write(filePath, body);
  console.log(`Diff written to ${filePath}\n`);
  console.log("Section totals (combined):");
  console.log(`  S1 fully wired:               ${totals.s1}`);
  console.log(`  S2 NULL-FK:                   ${totals.s2}`);
  console.log(`  S3a missing handoff:          ${totals.s3a}`);
  console.log(`  S3b missing trigger_event:    ${totals.s3b}`);
  console.log(`  S4 boundary integrity:        ${totals.s4}`);
}

main();
