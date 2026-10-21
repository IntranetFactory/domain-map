// Skills -> domain-grain migration (2026-06-17). Idempotent; run with `bun run`.
//
// Decision (user, this session): skills are domain-grain only. No module-anchored starter
// skills. Single-domain starters use the host domain skill; cross-domain (bundle) starters
// keep their skill but as a domain-grain skill on their bundle domain. Rename skill_type
// enum 'system' -> 'domain'; skill_name = <domain_code lowercased> (no suffix); drop
// skills.domain_module_id; add skills.trigger_keywords (comma-separated trigger terms).
//
// Steps (each idempotent):
//   1. create skills.trigger_keywords (text, comma-separated)
//   2. add 'domain' to skill_type enum (alongside system)
//   3. delete the 4 single-domain starter skills (host domain skill serves them)
//   4. migrate remaining system skills -> skill_type='domain', skill_name=<code>, domain_module_id=null
//   5. update validation_rule domain_required_when_skill_type_is_system -> _is_domain
//   6. remove 'system' from skill_type enum, default_value -> 'domain'
//   7. drop skills.domain_module_id

export {};

const DELETE_IDS = [226, 237, 242, 477]; // hiring / csa / training-records / itsm starter skills

async function sem(method: string, payload: any): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", method], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const out = (await new Response(proc.stdout).text()).trim();
  const err = (await new Response(proc.stderr).text()).trim();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`semantius crud ${method} failed: ${err || out}`);
  if (!out) return null;
  try { return JSON.parse(out); } catch { const i = out.search(/[\[{]/); return i >= 0 ? JSON.parse(out.slice(i)) : null; }
}
const get = (path: string) => sem("postgrestRequest", { method: "GET", path }).then((r) => r ?? []);
const patch = (path: string, body: any) => sem("postgrestRequest", { method: "PATCH", path, body });
const del = (path: string) => sem("postgrestRequest", { method: "DELETE", path });
const log = (m: string) => console.log(m);

// ---- 1. trigger_keywords field ----
log("1. skills.trigger_keywords");
{
  const ex = await get("/fields?table_name=eq.skills&field_name=eq.trigger_keywords&select=field_name");
  if (ex.length === 0) {
    await sem("create_field", {
      data: {
        table_name: "skills",
        field_name: "trigger_keywords",
        title: "Trigger Keywords",
        description:
          "Comma-separated trigger terms appended to the generated SKILL.md routing description (as 'Use for: ...'). Curated synonyms and industry terms a user would type to trigger this domain skill, deduped against the prose at generation time. Author the complement of skills.description: do not repeat words already in the prose.",
        format: "text",
        default_value: "",
        field_order: 1000045,
      },
    });
    log("   + created");
  } else log("   = exists, skipped");
}

// ---- 2. add 'domain' to enum ----
log("2. add 'domain' to skill_type enum");
{
  const [f] = await get("/fields?table_name=eq.skills&field_name=eq.skill_type&select=enum_values");
  const ev = (f?.enum_values ?? []) as string[];
  if (!ev.includes("domain")) {
    await sem("update_field", { id: "skills.skill_type", data: { enum_values: [...ev, "domain"] } });
    log(`   + enum now ${[...ev, "domain"].join(", ")}`);
  } else log("   = already present");
}

// ---- 3. delete the 4 single-domain starter skills ----
log("3. delete 4 single-domain starter skills");
for (const id of DELETE_IDS) {
  const ex = await get(`/skills?id=eq.${id}&select=id,skill_name`);
  if (ex.length) { await del(`/skills?id=eq.${id}`); log(`   - deleted ${id} (${ex[0].skill_name})`); }
  else log(`   = ${id} already gone`);
}

// ---- 4. migrate remaining system skills -> domain-grain ----
log("4. migrate remaining system skills -> domain");
{
  const domains = await get("/domains?select=id,domain_code&limit=10000");
  const codeById = new Map<number, string>(domains.map((d: any) => [Number(d.id), d.domain_code as string]));
  const sys = await get("/skills?skill_type=eq.system&select=id,skill_name,domain_id,domain_module_id");
  log(`   ${sys.length} system skills to migrate`);
  for (const s of sys) {
    const code = codeById.get(Number(s.domain_id));
    if (!code) throw new Error(`skill ${s.id} (domain ${s.domain_id}) has no domain_code`);
    const newName = code.toLowerCase();
    await patch(`/skills?id=eq.${s.id}`, { skill_type: "domain", skill_name: newName, domain_module_id: null });
  }
  log("   migrated (skill_type=domain, skill_name=<code>, domain_module_id=null)");
}

// ---- 5. update validation rule ----
log("5. validation rule -> _is_domain");
{
  const [ent] = await get("/entities?table_name=eq.skills&select=validation_rules");
  const rules = (ent?.validation_rules ?? []) as any[];
  const newRules = rules.map((r) =>
    r.code === "domain_required_when_skill_type_is_system" || r.code === "domain_required_when_skill_type_is_domain"
      ? {
          code: "domain_required_when_skill_type_is_domain",
          message: "A domain_id is required when skill_type is domain.",
          jsonlogic: { or: [{ "!=": [{ var: "skill_type" }, "domain"] }, { "!=": [{ var: "domain_id" }, null] }] },
          description:
            "Domain skills mirror one Domain Map domain by definition; the FK is the only thing that ties the skill to its home market. Process and role skills may legitimately leave the FK null.",
        }
      : r,
  );
  await patch("/entities?table_name=eq.skills", { validation_rules: newRules });
  log("   ~ updated");
}

// ---- 6. remove 'system' from enum, default -> 'domain' ----
log("6. remove 'system' from skill_type enum");
{
  const [f] = await get("/fields?table_name=eq.skills&field_name=eq.skill_type&select=enum_values,default_value");
  const ev = ((f?.enum_values ?? []) as string[]).filter((v) => v !== "system");
  await sem("update_field", { id: "skills.skill_type", data: { enum_values: ev, default_value: "domain" } });
  log(`   ~ enum now ${ev.join(", ")}; default=domain`);
}

// ---- 7. drop skills.domain_module_id ----
log("7. drop skills.domain_module_id");
{
  const ex = await get("/fields?table_name=eq.skills&field_name=eq.domain_module_id&select=field_name");
  if (ex.length) { await sem("delete_field", { id: "skills.domain_module_id" }); log("   - dropped"); }
  else log("   = already gone");
}

// ---- verify ----
const after = await get("/skills?select=skill_type&limit=10000");
const by: Record<string, number> = {};
for (const r of after) by[r.skill_type] = (by[r.skill_type] ?? 0) + 1;
log("\n=== done. skills by type: " + JSON.stringify(by) + " ===");
