/**
 * Phase 2a — script-driven structural discovery.
 *
 * Runs after Phase 1 passes. Walks the tenant's live schema for every module
 * found present in Phase 1: entities, fields, relationships, lifecycle field
 * locations. Writes the result to ../discovered.json.
 *
 * Phase 2a is purely structural and deterministic. Where the live name exactly
 * matches the spec name (or a known alias from the spec), the script resolves
 * it without ambiguity. Where it does NOT match (fuzzy match, custom entity,
 * missing entity), Phase 2a emits an "ambiguities" list for Phase 2b (the
 * agent-driven resolution step) to surface to the user.
 *
 * Output:
 *   - discovered.json (sibling of spec.json) — the structural snapshot
 *   - stdout JSON — pass/fail + ambiguities list for the agent
 *
 * Exit code: 0 on success (even with ambiguities), non-zero on hard failure
 * (cannot reach CLI, malformed spec, etc.).
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
  modules: Array<{ code: string; name: string; slug: string; present: boolean; module_id: number | null }>;
};

type LiveEntity = {
  id: number;
  name: string;
  singular_label: string;
  plural_label: string;
  module_id: number;
};

type LiveField = {
  name: string;
  format: string;
  is_nullable: boolean;
  default_value: string;
  reference_table: string;
  enum_values: string[] | null;
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

async function main() {
  const skillDir = resolve(import.meta.dir, "..");
  const specPath = resolve(skillDir, "spec.json");
  const phase1Path = resolve(skillDir, ".phase1-cache.json");
  const discoveredPath = resolve(skillDir, "discovered.json");

  const spec: Spec = JSON.parse(readFileSync(specPath, "utf-8"));

  // Read Phase 1 results if cached (Phase 1 writes its JSON output here when
  // invoked by bootstrap.ts). If absent, re-derive from a live module query.
  let phase1: Phase1Result;
  try {
    phase1 = JSON.parse(readFileSync(phase1Path, "utf-8"));
  } catch {
    // No cache; re-derive minimally for this run.
    const slugs = spec.modules.map((m) => m.code.toLowerCase().replace(/-/g, "_"));
    const slugFilter = slugs.join(",");
    const live = await get(`/modules?module_slug=in.(${slugFilter})&select=id,module_slug,module_name`);
    const presentSlugs = new Map((live as any[]).map((m) => [m.module_slug, m]));
    phase1 = {
      ok: true,
      modules: spec.modules.map((m) => {
        const slug = m.code.toLowerCase().replace(/-/g, "_");
        const hit = presentSlugs.get(slug);
        return {
          code: m.code,
          name: m.name,
          slug,
          present: !!hit,
          module_id: hit?.id ?? null,
        };
      }),
    };
  }

  // Build alias lookup: for each spec data_object, gather candidate names
  // (the canonical name plus every authored alias).
  const aliasLookup = new Map<string, string>(); // alias_lower -> canonical_spec_name
  for (const obj of spec.data_objects) {
    aliasLookup.set(obj.name.toLowerCase(), obj.name);
    for (const a of obj.aliases ?? []) {
      aliasLookup.set(a.name.toLowerCase(), obj.name);
    }
    if (obj.singular_label) aliasLookup.set(obj.singular_label.toLowerCase(), obj.name);
    if (obj.plural_label) aliasLookup.set(obj.plural_label.toLowerCase(), obj.name);
  }

  const presentModules = phase1.modules.filter((m) => m.present && m.module_id !== null);

  // For each present module, pull live entities + fields. Match each against
  // the spec via exact-name, then alias fallback. Mismatches go into the
  // ambiguities list.
  const discoveredEntities: Record<string, any> = {};
  const ambiguities: Array<{ kind: string; module: string; live_name?: string; spec_name?: string; reason: string }> = [];

  for (const mod of presentModules) {
    const moduleEntities = await get(`/entities?module_id=eq.${mod.module_id}&select=id,name,singular_label,plural_label,description`);

    for (const ent of moduleEntities as LiveEntity[]) {
      // Try to map this live entity to a spec entry.
      const liveLower = ent.name.toLowerCase();
      const matchByName = aliasLookup.get(liveLower);
      const matchByLabel = aliasLookup.get((ent.singular_label || "").toLowerCase()) ||
                           aliasLookup.get((ent.plural_label || "").toLowerCase());

      let specName: string | null = null;
      if (matchByName) {
        specName = matchByName;
      } else if (matchByLabel) {
        specName = matchByLabel;
        // Live name differs from spec name but label matches an alias: this is
        // a rename. Record but don't flag as ambiguity; it's resolved.
      } else {
        // No spec match at all: custom entity. Flag for Phase 2b.
        ambiguities.push({
          kind: "custom_entity",
          module: mod.code,
          live_name: ent.name,
          reason: `Live entity "${ent.name}" (${ent.singular_label}/${ent.plural_label}) does not match any spec data_object or known alias.`,
        });
        specName = null;
      }

      // Pull fields and relationships for this entity.
      const fields = await get(`/fields?table_name=eq.${ent.name}&select=field_name,format,is_nullable,default_value,reference_table,enum_values&order=field_order.asc`);

      const lifecycleField = (fields as any[]).find((f) => ["status", "state", "lifecycle_state"].includes(f.field_name));

      discoveredEntities[ent.name] = {
        spec_name: specName,
        entity_id: ent.id,
        module_id: ent.module_id,
        module_code: mod.code,
        singular_label: ent.singular_label,
        plural_label: ent.plural_label,
        fields: (fields as any[]).map((f) => ({
          name: f.field_name,
          format: f.format,
          is_nullable: f.is_nullable,
          default_value: f.default_value,
          reference_table: f.reference_table || null,
          enum_values: f.enum_values || null,
        })),
        lifecycle_field: lifecycleField?.field_name ?? null,
        lifecycle_values: lifecycleField?.enum_values ?? null,
      };
    }

    // Identify spec entities that should exist in this module but are missing live.
    const expectedNames = new Set([
      ...((spec.modules.find((m) => m.code === mod.code)?.masters) ?? []),
      ...((spec.modules.find((m) => m.code === mod.code)?.embedded_masters) ?? []),
    ]);
    const liveNamesInModule = new Set(
      Object.values(discoveredEntities)
        .filter((e: any) => e.module_code === mod.code && e.spec_name)
        .map((e: any) => e.spec_name)
    );
    for (const expected of expectedNames) {
      if (!liveNamesInModule.has(expected)) {
        ambiguities.push({
          kind: "missing_entity",
          module: mod.code,
          spec_name: expected,
          reason: `Spec lists "${expected}" as a master/embedded_master in ${mod.code} but no matching live entity (or known alias) was found. Possible rename, omission, or the entity is named differently in this deployment.`,
        });
      }
    }
  }

  const discovered = {
    discovered_at: new Date().toISOString().slice(0, 10),
    discovered_against_emitted: (spec as any).emitted,
    discovered_against_major: (spec as any).facts_major,
    entities: discoveredEntities,
  };

  writeFileSync(discoveredPath, JSON.stringify(discovered, null, 2));

  console.log(JSON.stringify({
    ok: true,
    phase: "2a",
    entities_discovered: Object.keys(discoveredEntities).length,
    ambiguities,
    next: ambiguities.length === 0
      ? "Phase 2a complete with no ambiguities. bootstrap.ts can write ready.flag."
      : `Phase 2a complete with ${ambiguities.length} ambiguities. Phase 2b (agent-driven) must surface these to the user before ready.flag is written.`,
  }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, phase: "2a", reason: err.message }, null, 2));
  process.exit(2);
});
