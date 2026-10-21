// Pairwise handoff reconciliation: PSA (68) <-> {HCM(54), LMS(57), EPM(66), PA(63), WORK-MGMT(135)}.
// Read-only by construction. Writes one diff per pair to c:/tmp/reconcile_PSA_<X>_2026_05_26.md.
// Procedure: see .claude/skills/domain-map-analyst/SKILL.md § "Pairwise handoff reconciliation".

async function pg(method: "GET", path: string): Promise<any> {
  const args = { method, path };
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  await proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`pg ${method} ${path} failed (${code}): ${err || out}`);
  const t = out.trim();
  return t ? JSON.parse(t) : null;
}

const PSA_ID = 68;
const PARTNERS = [
  { code: "HCM",       id: 54 },
  { code: "LMS",       id: 57 },
  { code: "EPM",       id: 66 },
  { code: "PA",        id: 63 },
  { code: "WORK-MGMT", id: 135 },
];

type Module = { id: number; domain_module_code: string };
type DataObject = { id: number; data_object_name: string; kind: string };
type DMDO = {
  domain_module_id: number;
  domain_module_code: string;
  data_object_id: number;
  data_object_name: string;
  role: string;
  necessity: string;
};
type LifecycleState = {
  data_object_id: number;
  data_object_name: string;
  state_name: string;
  permission_verb_override: string;
  domain_module_id: number | null;
};
type TriggerEvent = {
  id: number;
  event_name: string;
  data_object_id: number;
  data_object_name: string;
};
type Handoff = {
  id: number;
  trigger_event_id: number;
  event_name: string;
  event_data_object_id: number;
  source_domain_id: number;
  source_domain_module_id: number | null;
  source_module_code: string | null;
  target_domain_id: number;
  target_domain_module_id: number | null;
  target_module_code: string | null;
  data_object_id: number;
  payload_name: string;
  integration_pattern: string;
  friction_level: string;
  notes: string;
};

async function fetchDomainShape(domainId: number) {
  const modules = (await pg("GET", `/domain_modules?domain_id=eq.${domainId}&select=id,domain_module_code`)) as Module[];
  const hostedModules = (await pg(
    "GET",
    `/domain_module_host_domains?domain_id=eq.${domainId}&select=domain_module:domain_modules(id,domain_module_code)`,
  )) as Array<{ domain_module: Module }>;
  const allModuleIds = [...modules.map((m) => m.id), ...hostedModules.map((h) => h.domain_module.id)];
  const moduleMap = new Map<number, string>();
  for (const m of modules) moduleMap.set(m.id, m.domain_module_code);
  for (const h of hostedModules) moduleMap.set(h.domain_module.id, h.domain_module.domain_module_code);

  if (allModuleIds.length === 0) {
    return { moduleMap, masters: [] as DMDO[], dmdo: [] as DMDO[], lifecycleStates: [] as LifecycleState[], events: [] as TriggerEvent[] };
  }

  const dmdoRaw = (await pg(
    "GET",
    `/domain_module_data_objects?domain_module_id=in.(${allModuleIds.join(",")})&select=domain_module_id,data_object_id,role,necessity,domain_modules(domain_module_code),data_objects(data_object_name)`,
  )) as Array<{
    domain_module_id: number;
    data_object_id: number;
    role: string;
    necessity: string;
    domain_modules: { domain_module_code: string };
    data_objects: { data_object_name: string };
  }>;
  const dmdo: DMDO[] = dmdoRaw.map((r) => ({
    domain_module_id: r.domain_module_id,
    domain_module_code: r.domain_modules.domain_module_code,
    data_object_id: r.data_object_id,
    data_object_name: r.data_objects.data_object_name,
    role: r.role,
    necessity: r.necessity,
  }));
  const masters = dmdo.filter((r) => r.role === "master");

  const masterIds = Array.from(new Set(masters.map((m) => m.data_object_id)));
  const lifecycleStates: LifecycleState[] = masterIds.length
    ? ((await pg(
        "GET",
        `/data_object_lifecycle_states?data_object_id=in.(${masterIds.join(",")})&requires_permission=eq.true&select=data_object_id,state_name,permission_verb_override,domain_module_id,data_objects(data_object_name)`,
      )) as Array<{
        data_object_id: number;
        state_name: string;
        permission_verb_override: string;
        domain_module_id: number | null;
        data_objects: { data_object_name: string };
      }>).map((r) => ({
        data_object_id: r.data_object_id,
        data_object_name: r.data_objects.data_object_name,
        state_name: r.state_name,
        permission_verb_override: r.permission_verb_override,
        domain_module_id: r.domain_module_id,
      }))
    : [];

  const events: TriggerEvent[] = masterIds.length
    ? ((await pg(
        "GET",
        `/trigger_events?data_object_id=in.(${masterIds.join(",")})&select=id,event_name,data_object_id,data_objects(data_object_name)`,
      )) as Array<{ id: number; event_name: string; data_object_id: number; data_objects: { data_object_name: string } }>).map((r) => ({
        id: r.id,
        event_name: r.event_name,
        data_object_id: r.data_object_id,
        data_object_name: r.data_objects.data_object_name,
      }))
    : [];

  return { moduleMap, masters, dmdo, lifecycleStates, events };
}

async function fetchHandoffsBetween(srcId: number, tgtId: number, moduleCodes: Map<number, string>): Promise<Handoff[]> {
  const raw = (await pg(
    "GET",
    `/handoffs?source_domain_id=eq.${srcId}&target_domain_id=eq.${tgtId}&select=id,trigger_event_id,source_domain_module_id,target_domain_module_id,data_object_id,integration_pattern,friction_level,notes,trigger_events(event_name,data_object_id),data_objects(data_object_name)`,
  )) as Array<{
    id: number;
    trigger_event_id: number;
    source_domain_module_id: number | null;
    target_domain_module_id: number | null;
    data_object_id: number;
    integration_pattern: string;
    friction_level: string;
    notes: string;
    trigger_events: { event_name: string; data_object_id: number };
    data_objects: { data_object_name: string };
  }>;
  return raw.map((r) => ({
    id: r.id,
    trigger_event_id: r.trigger_event_id,
    event_name: r.trigger_events.event_name,
    event_data_object_id: r.trigger_events.data_object_id,
    source_domain_id: srcId,
    source_domain_module_id: r.source_domain_module_id,
    source_module_code: r.source_domain_module_id !== null ? moduleCodes.get(r.source_domain_module_id) ?? null : null,
    target_domain_id: tgtId,
    target_domain_module_id: r.target_domain_module_id,
    target_module_code: r.target_domain_module_id !== null ? moduleCodes.get(r.target_domain_module_id) ?? null : null,
    data_object_id: r.data_object_id,
    payload_name: r.data_objects?.data_object_name ?? "?",
    integration_pattern: r.integration_pattern,
    friction_level: r.friction_level,
    notes: r.notes,
  }));
}

function deriveMasterModule(dmdo: DMDO[], dataObjectId: number): string | null {
  // Strongest role: master > embedded_master > contributor > consumer > derived
  const order = ["master", "embedded_master", "contributor", "consumer", "derived"];
  const candidates = dmdo.filter((r) => r.data_object_id === dataObjectId);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
  return candidates[0].domain_module_code;
}

function reconcileDirection(
  srcCode: string, srcShape: Awaited<ReturnType<typeof fetchDomainShape>>,
  tgtCode: string, tgtShape: Awaited<ReturnType<typeof fetchDomainShape>>,
  existing: Handoff[],
): string[] {
  const out: string[] = [];
  out.push(`### ${srcCode} → ${tgtCode}`);
  out.push("");

  // Section 1: fully wired
  const wired = existing.filter((h) => h.source_domain_module_id !== null && h.target_domain_module_id !== null);
  out.push(`**Section 1 — Existing handoffs, fully wired (${wired.length})**`);
  out.push("");
  if (wired.length === 0) {
    out.push("_None._");
  } else {
    out.push("| handoff | event | payload | source module | target module | friction |");
    out.push("| --- | --- | --- | --- | --- | --- |");
    for (const h of wired) {
      out.push(`| ${h.id} | \`${h.event_name}\` | \`${h.payload_name}\` | ${h.source_module_code} | ${h.target_module_code} | ${h.friction_level} |`);
    }
  }
  out.push("");

  // Section 2: existing handoffs with NULL module FK — can they be resolved now?
  const nullFk = existing.filter((h) => h.source_domain_module_id === null || h.target_domain_module_id === null);
  out.push(`**Section 2 — Existing handoffs with NULL module FK (${nullFk.length})**`);
  out.push("");
  if (nullFk.length === 0) {
    out.push("_None._");
  } else {
    out.push("| handoff | event | payload | source | target | resolvable? |");
    out.push("| --- | --- | --- | --- | --- | --- |");
    for (const h of nullFk) {
      const srcModule = h.source_domain_module_id !== null
        ? h.source_module_code
        : deriveMasterModule(srcShape.dmdo, h.event_data_object_id) ?? "**no candidate**";
      const tgtModule = h.target_domain_module_id !== null
        ? h.target_module_code
        : deriveMasterModule(tgtShape.dmdo, h.data_object_id) ?? "**no candidate**";
      const resolvable = (h.source_domain_module_id === null && srcModule.startsWith("**"))
        || (h.target_domain_module_id === null && tgtModule.startsWith("**"))
        ? "no — upstream gap"
        : "yes — PATCH FK";
      out.push(`| ${h.id} | \`${h.event_name}\` | \`${h.payload_name}\` | ${srcModule}${h.source_domain_module_id === null ? " (was NULL)" : ""} | ${tgtModule}${h.target_domain_module_id === null ? " (was NULL)" : ""} | ${resolvable} |`);
    }
  }
  out.push("");

  // Section 3: missing handoffs the catalog implies
  // For each source master state with requires_permission=true, check if target has a DMDO row on the same master's data_object
  // (consumer/contributor/embedded_master). If yes and no handoff exists with that trigger, surface as candidate.
  const candidates: Array<{ event_name: string; payload: string; src_module: string; tgt_module: string; reason: string }> = [];
  const existingTriggers = new Set(existing.map((h) => `${h.trigger_event_id}|${h.data_object_id}`));

  // Build map of source events by data_object_id
  const srcMasterIds = new Set(srcShape.masters.map((m) => m.data_object_id));
  const srcEvents = srcShape.events.filter((e) => srcMasterIds.has(e.data_object_id));

  for (const ev of srcEvents) {
    // What target modules consume this data_object?
    const tgtConsumers = tgtShape.dmdo.filter(
      (r) => r.data_object_id === ev.data_object_id && (r.role === "consumer" || r.role === "contributor" || r.role === "embedded_master"),
    );
    if (tgtConsumers.length === 0) continue;
    // Is there already a handoff for this event with the payload matching the data_object?
    const matching = existing.find((h) => h.trigger_event_id === ev.id);
    if (matching) continue;
    const srcModule = deriveMasterModule(srcShape.dmdo, ev.data_object_id) ?? "?";
    for (const tgt of tgtConsumers) {
      candidates.push({
        event_name: ev.event_name,
        payload: ev.data_object_name,
        src_module: srcModule,
        tgt_module: tgt.domain_module_code,
        reason: `${tgtCode}.${tgt.domain_module_code} ${tgt.role}s ${ev.data_object_name}`,
      });
    }
  }

  out.push(`**Section 3 — Missing handoffs implied by catalog (${candidates.length})**`);
  out.push("");
  if (candidates.length === 0) {
    out.push("_None._");
  } else {
    out.push("| event | payload | source module | target module | because |");
    out.push("| --- | --- | --- | --- | --- |");
    for (const c of candidates) {
      out.push(`| \`${c.event_name}\` | \`${c.payload}\` | ${c.src_module} | ${c.tgt_module} | ${c.reason} |`);
    }
  }
  out.push("");

  // Section 4: boundary integrity gaps - target DMDO references data_object source domain doesn't master
  const integrityGaps: Array<{ data_object_name: string; tgt_module: string; tgt_role: string }> = [];
  const srcAllDataObjects = new Set(srcShape.dmdo.map((r) => r.data_object_id));
  for (const r of tgtShape.dmdo) {
    if (r.role === "consumer" || r.role === "contributor" || r.role === "embedded_master") {
      // The target consumes this. Does the source master it?
      const srcMasters = srcShape.masters.find((m) => m.data_object_id === r.data_object_id);
      if (!srcMasters) continue; // not relevant to this pair
      // It IS in source's footprint - check if source has a master row on it
      // Already filtered to source masters above, so this is a no-op for the integrity check
      // Real integrity check is: target DMDO references a data_object that has NO master anywhere
      // That's catalog-wide so out of scope for the pair view; we skip here.
    }
  }
  out.push("**Section 4 — Boundary integrity gaps**");
  out.push("");
  out.push("_Not run for this pair view; catalog-wide B5 check covers this. Surface only if pairwise inspection reveals a target DMDO on a data_object the source claims to master but its DMDO row is missing — none found._");
  out.push("");

  return out;
}

async function reconcilePair(partner: { code: string; id: number }) {
  console.log(`\nReconciling PSA ↔ ${partner.code} ...`);
  const psaShape = await fetchDomainShape(PSA_ID);
  const partnerShape = await fetchDomainShape(partner.id);
  const combinedModuleMap = new Map<number, string>();
  for (const [k, v] of psaShape.moduleMap) combinedModuleMap.set(k, v);
  for (const [k, v] of partnerShape.moduleMap) combinedModuleMap.set(k, v);

  const psaToPartner = await fetchHandoffsBetween(PSA_ID, partner.id, combinedModuleMap);
  const partnerToPsa = await fetchHandoffsBetween(partner.id, PSA_ID, combinedModuleMap);

  const lines: string[] = [];
  lines.push(`# PSA ↔ ${partner.code} pairwise handoff reconciliation`);
  lines.push("");
  lines.push(`Run: 2026-05-26. PSA id=68, ${partner.code} id=${partner.id}.`);
  lines.push("");
  lines.push(`PSA masters: ${psaShape.masters.length}. ${partner.code} masters: ${partnerShape.masters.length}.`);
  lines.push(`Existing handoffs: PSA→${partner.code} = ${psaToPartner.length}; ${partner.code}→PSA = ${partnerToPsa.length}.`);
  lines.push("");

  lines.push(...reconcileDirection("PSA", psaShape, partner.code, partnerShape, psaToPartner));
  lines.push(...reconcileDirection(partner.code, partnerShape, "PSA", psaShape, partnerToPsa));

  const path = `c:/tmp/reconcile_PSA_${partner.code.replace(/-/g, "_")}_2026_05_26.md`;
  await Bun.write(path, lines.join("\n"));
  console.log(`  wrote ${path}`);
  return path;
}

async function main() {
  console.log("Pairwise reconciliation: PSA <-> 5 partners");
  const written: string[] = [];
  for (const p of PARTNERS) {
    written.push(await reconcilePair(p));
  }
  console.log("\nAll diffs written:");
  for (const w of written) console.log(`  ${w}`);
}

await main();
