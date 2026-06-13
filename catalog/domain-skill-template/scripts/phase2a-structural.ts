/**
 * Phase 2a — script-driven structural discovery via the provenance resolution ladder.
 *
 * Runs after Phase 1. For each uber-model concept the domain assumes, resolves it
 * against the live deployment using the resolution ladder (deterministic platform
 * reads against the provenance columns shipped in core v0.1.2). First hit wins:
 *
 *   step 1  FK reachability   — a live FK in the domain's own entities whose
 *                               reference_table resolves to an entity carrying
 *                               catalog_entity_code = X  ->  that entity IS X for D.
 *                               Reseating is universal (silo, same-name share, and
 *                               reuse/merge all repoint the FK), so this resolves all
 *                               topologies whenever X has a surviving consumer in D.
 *   step 2  owned canonical   — catalog_entity_code = X AND module_id in the domain's
 *                               catalog_module_code slice. Catches masters D owns and
 *                               D's own silos (table_name is X-renamed), incl. an X
 *                               with no incoming FK.
 *   step 3  alias             — an entity whose catalog_entity_aliases contains
 *                               { alias_code: X, source_domain: D } (JSONB containment;
 *                               resolve on the pair, never alias_code alone). Catches the
 *                               reuse/merge where X was renamed onto a differently-named
 *                               host and left no FK shadow.
 *   step 4  absent            — none of the above -> X is genuinely not deployed in D.
 *
 * catalog_entity_code stamps the CANONICAL uber-model code (D6); table_name holds the
 * deployed name and may drift (silo/dialect). A resolution whose live table_name differs
 * from X is a rename, recorded deterministically — no name heuristic, no user prompt.
 *
 * The name/alias/label heuristic survives ONLY as a fallback for live rows whose
 * catalog_entity_code is EMPTY ('' — created outside the deploy pipeline: hand-built,
 * pre-provenance, or simply not yet stamped by the modeler). Those raise an ambiguity for
 * Phase 2b (agent + user). A fully stamped deployment resolves with zero ambiguities.
 *
 * Platform schema notes (core v0.1.2, verified live):
 *   - `entities` is keyed by `table_name` (no `name`, no `id` column). Entity identity is
 *     the table_name; module_id locates it.
 *   - Empties are '' (text) / '{}' (json object) / '[]' (json array) / 'unclassified'
 *     (entity_type). NEVER SQL NULL — test against the empty value, never `IS NULL`.
 *
 * Output:
 *   - discovered.json (sibling of spec.json) — full snapshot + per-concept resolution map.
 *   - stdout JSON — pass/fail + ambiguities list for the agent (Phase 2b).
 *
 * Exit code: 0 on success (even with ambiguities), non-zero on hard failure.
 *
 * Run from the project root:
 *   bun run .claude/skills/use-<domain>/scripts/phase2a-structural.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

type Spec = {
  domain: { code: string; name: string };
  modules: Array<{
    code: string;
    name: string;
    masters: string[];
    embedded_masters?: string[];
    consumers?: string[];
  }>;
  data_objects: Array<{
    name: string;
    singular_label?: string;
    plural_label?: string;
    aliases?: Array<{ name: string; source: string }>;
  }>;
};

type Phase1Result = {
  ok: boolean;
  modules: Array<{
    code: string;
    name: string;
    catalog_module_code?: string;
    present: boolean;
    module_id: number | null;
  }>;
};

type AliasElement = { alias_code: string; source_domain: string; [k: string]: any };

type LiveEntity = {
  table_name: string;
  singular_label: string;
  plural_label: string;
  module_id: number;
  catalog_entity_code: string;
  canonical_owner_module: string;
  pattern_flags: Record<string, boolean>;
  entity_type: string;
  catalog_entity_aliases: AliasElement[];
};

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: err.trim() || out.trim(), code };
  return { ok: true, data: out.trim() ? JSON.parse(out.trim()) : null, stderr: "", code };
}

async function get(path: string): Promise<any> {
  const r = await call("crud", "postgrestRequest", { method: "GET", path });
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

// Empty-value tests (core v0.1.2): never IS NULL.
const codeEmpty = (v: unknown): boolean => !v || v === "";
const asAliases = (v: unknown): AliasElement[] => (Array.isArray(v) ? (v as AliasElement[]) : []);
const asFlags = (v: unknown): Record<string, boolean> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, boolean>) : {};

async function main() {
  const skillDir = resolve(import.meta.dir, "..");
  const specPath = resolve(skillDir, "spec.json");
  const phase1Path = resolve(skillDir, ".phase1-cache.json");
  const discoveredPath = resolve(skillDir, "discovered.json");

  const spec: Spec = JSON.parse(readFileSync(specPath, "utf-8"));
  const domainCode = (spec.domain.code || "").toLowerCase();

  // Module presence from the Phase 1 cache, or re-derived by the catalog_module_code
  // domain axis (NOT slug guessing).
  let phase1: Phase1Result;
  try {
    phase1 = JSON.parse(readFileSync(phase1Path, "utf-8"));
  } catch {
    const codes = spec.modules.map((m) => m.code);
    const live = await get(
      `/modules?catalog_module_code=in.(${codes.join(",")})&select=id,module_slug,module_name,catalog_module_code`,
    );
    const byCode = new Map((live as any[]).map((m) => [m.catalog_module_code, m]));
    phase1 = {
      ok: true,
      modules: spec.modules.map((m) => {
        const hit = byCode.get(m.code);
        return { code: m.code, name: m.name, catalog_module_code: m.code, present: !!hit, module_id: hit?.id ?? null };
      }),
    };
  }

  const presentModules = phase1.modules.filter((m) => m.present && m.module_id !== null);
  const presentModuleIds = new Set(presentModules.map((m) => m.module_id as number));

  // The domain's uber-model concept set: every entity the domain's modules reference
  // (masters + embedded_masters + consumers). Each name IS its canonical code (D6).
  const concepts = new Set<string>();
  for (const m of spec.modules) {
    for (const n of [...(m.masters ?? []), ...(m.embedded_masters ?? []), ...(m.consumers ?? [])]) concepts.add(n);
  }
  for (const o of spec.data_objects ?? []) concepts.add(o.name);

  // ---- Pull live entities (with provenance) for the domain's present modules. ----
  // entities is keyed by table_name; there is no `name`/`id` column.
  const ENT_SELECT =
    "table_name,singular_label,plural_label,module_id,catalog_entity_code," +
    "canonical_owner_module,pattern_flags,catalog_entity_aliases,entity_type";
  const FLD_SELECT =
    "field_name,catalog_field_code,format,is_nullable,default_value,reference_table,enum_values";

  const liveByTable = new Map<string, LiveEntity>(); // in-domain entities, by table_name
  const fieldsByTable = new Map<string, any[]>();
  for (const mod of presentModules) {
    const ents = (await get(`/entities?module_id=eq.${mod.module_id}&select=${ENT_SELECT}`)) as LiveEntity[];
    for (const e of ents) {
      liveByTable.set(e.table_name, e);
      const fields = await get(`/fields?table_name=eq.${e.table_name}&select=${FLD_SELECT}&order=field_order.asc`);
      fieldsByTable.set(e.table_name, fields as any[]);
    }
  }
  const inDomain = [...liveByTable.values()];

  // ---- Build the three ladder indices. ----

  // step 2: catalog_entity_code -> in-domain entities owning that canonical code.
  const byOwnedCode = new Map<string, LiveEntity[]>();
  for (const e of inDomain) {
    if (codeEmpty(e.catalog_entity_code)) continue;
    (byOwnedCode.get(e.catalog_entity_code) ?? byOwnedCode.set(e.catalog_entity_code, []).get(e.catalog_entity_code)!).push(e);
  }

  // step 3: alias_code (scoped to this domain) -> host entity that absorbed it.
  const byAlias = new Map<string, LiveEntity[]>();
  for (const e of inDomain) {
    for (const a of asAliases(e.catalog_entity_aliases)) {
      if ((a.source_domain || "").toLowerCase() !== domainCode) continue;
      (byAlias.get(a.alias_code) ?? byAlias.set(a.alias_code, []).get(a.alias_code)!).push(e);
    }
  }

  // step 1: FK reachability. Walk every FK on the domain's entities, resolve its
  // reference_table to the target's catalog_entity_code. The target may live in another
  // module (same-name share), so resolve any table not already pulled.
  const codeByTable = new Map<string, string>(); // table_name -> catalog_entity_code
  for (const e of inDomain) if (!codeEmpty(e.catalog_entity_code)) codeByTable.set(e.table_name, e.catalog_entity_code);
  const refTables = new Set<string>();
  for (const fields of fieldsByTable.values()) for (const f of fields) if (f.reference_table) refTables.add(f.reference_table);
  const unresolved = [...refTables].filter((t) => !codeByTable.has(t));
  if (unresolved.length > 0) {
    const rows = (await get(`/entities?table_name=in.(${unresolved.join(",")})&select=table_name,catalog_entity_code`)) as Array<{
      table_name: string;
      catalog_entity_code: string;
    }>;
    for (const r of rows) if (!codeEmpty(r.catalog_entity_code)) codeByTable.set(r.table_name, r.catalog_entity_code);
  }
  const fkReach = new Map<string, string>(); // catalog_entity_code -> reachable table_name
  for (const fields of fieldsByTable.values()) {
    for (const f of fields) {
      if (!f.reference_table) continue;
      const code = codeByTable.get(f.reference_table);
      if (code && !fkReach.has(code)) fkReach.set(code, f.reference_table);
    }
  }

  // ---- Run the ladder per concept. ----
  const resolutions: Record<string, any> = {};
  const entityRenames: Record<string, string> = {};
  const omitted: string[] = [];
  const resolvedTables = new Set<string>();
  const ambiguities: Array<{ kind: string; concept?: string; live_name?: string; reason: string }> = [];

  for (const X of concepts) {
    // step 1 — FK reachability
    if (fkReach.has(X)) {
      const table = fkReach.get(X) as string;
      resolutions[X] = { via: "fk_reachability", live_table: table, renamed: table !== X };
      if (table !== X) entityRenames[X] = table;
      resolvedTables.add(table);
      continue;
    }
    // step 2 — owned canonical code in the domain's module slice
    const owned = (byOwnedCode.get(X) ?? []).filter((e) => presentModuleIds.has(e.module_id));
    if (owned.length === 1) {
      const e = owned[0];
      resolutions[X] = { via: "owned_code", live_table: e.table_name, module_id: e.module_id, renamed: e.table_name !== X };
      if (e.table_name !== X) entityRenames[X] = e.table_name;
      resolvedTables.add(e.table_name);
      continue;
    }
    if (owned.length > 1) {
      ambiguities.push({
        kind: "multi_owner",
        concept: X,
        reason: `Concept "${X}" resolves to ${owned.length} entities in this domain (${owned.map((e) => e.table_name).join(", ")}). Cannot pick one deterministically.`,
      });
      continue;
    }
    // step 3 — alias (reuse/merge into a differently-named host)
    const aliased = byAlias.get(X) ?? [];
    if (aliased.length >= 1) {
      const e = aliased[0];
      resolutions[X] = { via: "alias", live_table: e.table_name, module_id: e.module_id, renamed: true };
      entityRenames[X] = e.table_name; // X merged into e.table_name
      resolvedTables.add(e.table_name);
      continue;
    }
    // step 4 — absent (true omission)
    resolutions[X] = { via: "absent" };
    omitted.push(X);
  }

  // ---- Custom / unstamped entities: in-domain live rows not claimed by any concept. ----
  // A row with EMPTY catalog_entity_code is outside the pipeline (hand-built, pre-provenance,
  // or not yet stamped) — fall back to name/alias/label to guess a pre-provenance rename of an
  // unresolved concept (confirm) or a genuine custom entity (classify). A non-empty code that no
  // concept claimed is a stamped-but-not-this-domain entity (record, no prompt).
  const conceptLower = new Map<string, string>();
  for (const X of concepts) conceptLower.set(X.toLowerCase(), X);
  for (const o of spec.data_objects ?? []) {
    for (const a of o.aliases ?? []) conceptLower.set(a.name.toLowerCase(), o.name);
    if (o.singular_label) conceptLower.set(o.singular_label.toLowerCase(), o.name);
    if (o.plural_label) conceptLower.set(o.plural_label.toLowerCase(), o.name);
  }

  const customEntities: Array<{ live_name: string; module_id: number; catalog_entity_code: string }> = [];
  for (const e of inDomain) {
    if (resolvedTables.has(e.table_name)) continue;
    if (!codeEmpty(e.catalog_entity_code)) {
      customEntities.push({ live_name: e.table_name, module_id: e.module_id, catalog_entity_code: e.catalog_entity_code });
      continue;
    }
    const guess =
      conceptLower.get(e.table_name.toLowerCase()) ||
      conceptLower.get((e.singular_label || "").toLowerCase()) ||
      conceptLower.get((e.plural_label || "").toLowerCase());
    if (guess && resolutions[guess]?.via === "absent") {
      ambiguities.push({
        kind: "rename_candidate",
        live_name: e.table_name,
        concept: guess,
        reason: `Live entity "${e.table_name}" has no catalog_entity_code (outside the deploy pipeline / not yet stamped) but its name/label matches the unresolved concept "${guess}". Possible rename — confirm.`,
      });
    } else {
      ambiguities.push({
        kind: "custom_entity",
        live_name: e.table_name,
        reason: `Live entity "${e.table_name}" (${e.singular_label}/${e.plural_label}) has no catalog_entity_code and matches no concept. Classify its role (master, log, reference data) or confirm it is custom.`,
      });
    }
    customEntities.push({ live_name: e.table_name, module_id: e.module_id, catalog_entity_code: "" });
  }

  // ---- Build discovered.json (full snapshot), keyed by table_name. ----
  const discoveredEntities: Record<string, any> = {};
  for (const e of inDomain) {
    const fields = fieldsByTable.get(e.table_name) ?? [];
    const lifecycleField = fields.find((f: any) => ["status", "state", "lifecycle_state"].includes(f.field_name));
    discoveredEntities[e.table_name] = {
      catalog_entity_code: e.catalog_entity_code || "", // canonical code; '' = outside pipeline
      canonical_owner_module: e.canonical_owner_module || "",
      entity_type: e.entity_type || "unclassified",
      pattern_flags: asFlags(e.pattern_flags),
      catalog_entity_aliases: asAliases(e.catalog_entity_aliases),
      module_id: e.module_id,
      singular_label: e.singular_label,
      plural_label: e.plural_label,
      fields: fields.map((f: any) => ({
        name: f.field_name,
        catalog_field_code: f.catalog_field_code || "", // '' = outside pipeline
        format: f.format,
        is_nullable: f.is_nullable,
        default_value: f.default_value,
        reference_table: f.reference_table || "",
        enum_values: f.enum_values || null,
      })),
      lifecycle_field: lifecycleField?.field_name ?? null,
      lifecycle_values: lifecycleField?.enum_values ?? null,
    };
  }

  const discovered = {
    discovered_at: new Date().toISOString().slice(0, 10),
    discovered_against_emitted: (spec as any).emitted,
    discovered_against_major: (spec as any).facts_major,
    domain_code: spec.domain.code,
    resolution: resolutions, // per-concept: { via, live_table, renamed }
    entity_renames: entityRenames, // canonical concept -> live table_name
    omitted_entities: omitted,
    custom_entities: customEntities,
    entities: discoveredEntities,
  };

  writeFileSync(discoveredPath, JSON.stringify(discovered, null, 2));

  const resolvedCount = Object.values(resolutions).filter((r: any) => r.via !== "absent").length;
  console.log(JSON.stringify({
    ok: true,
    phase: "2a",
    entities_discovered: Object.keys(discoveredEntities).length,
    concepts_total: concepts.size,
    concepts_resolved: resolvedCount,
    renames: Object.keys(entityRenames).length,
    omitted: omitted.length,
    custom: customEntities.length,
    ambiguities,
    next: ambiguities.length === 0
      ? "Phase 2a resolved every concept deterministically via the provenance ladder. bootstrap.ts can write ready.flag."
      : `Phase 2a left ${ambiguities.length} genuine ambiguities (empty-code rows or multi-recurrence). Phase 2b (agent-driven) must surface these to the user before ready.flag is written.`,
  }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, phase: "2a", reason: err.message }, null, 2));
  process.exit(2);
});
