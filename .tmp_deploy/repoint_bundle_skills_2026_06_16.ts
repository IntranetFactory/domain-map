/**
 * §3 DESTRUCTIVE skill `domain_id` repoint. DRY-RUN by default; pass --execute to write.
 *
 * Repoints each bundle's system skill `domain_id` from its HOST market to the new bundle-domain,
 * KEEPING `domain_module_id` (module-anchored, Rule #19 #6). New target = the bundle-domain the
 * skill's module now belongs to (skill.domain_module_id -> module.domain_id, set in §3-additive).
 *
 * This OVERWRITES a non-empty FK (Rule #21 destructive): never auto-runs. Without --execute it
 * only prints exact old->new. Old values are recoverable from
 * .tmp_deploy/domain_kind_promote_snapshot.json. Touches ONLY domain_id (never domain_module_id,
 * never record_status).
 *
 * Run: bun run .tmp_deploy/repoint_bundle_skills_2026_06_16.ts            # dry-run
 *      bun run .tmp_deploy/repoint_bundle_skills_2026_06_16.ts --execute  # apply (after sign-off)
 */
const EXECUTE = process.argv.includes("--execute");
const SKILL_IDS = [220, 236, 474];

async function call(method: string, path: string, body?: any): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body === undefined ? { method, path } : { method, path, body }));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`${method} ${path}: ${err || out}`);
  return out.trim() ? JSON.parse(out.trim()) : null;
}
const get = (p: string) => call("GET", p);
const patch = (p: string, b: any) => call("PATCH", p, b);

async function main() {
  console.log(`§3 skill domain_id repoint — ${EXECUTE ? "EXECUTE (writing)" : "DRY-RUN (no writes)"}`);
  console.log("=".repeat(64) + "\n");

  const skills = await get(`/skills?id=in.(${SKILL_IDS.join(",")})&select=id,skill_name,skill_type,domain_id,domain_module_id`);
  const modIds = [...new Set(skills.map((s: any) => s.domain_module_id).filter((x: any) => x != null))];
  const mods = await get(`/domain_modules?id=in.(${modIds.join(",")})&select=id,domain_module_code,domain_id`);
  const modById = new Map<number, any>(mods.map((m: any) => [m.id, m]));
  const domIds = [...new Set([...skills.map((s: any) => s.domain_id), ...mods.map((m: any) => m.domain_id)].filter((x: any) => x != null))];
  const domains = await get(`/domains?id=in.(${domIds.join(",")})&select=id,domain_code,domain_kind`);
  const domById = new Map<number, any>(domains.map((d: any) => [d.id, d]));

  const plan: { id: number; name: string; oldDom: number | null; newDom: number; same: boolean }[] = [];
  const problems: string[] = [];

  for (const s of skills) {
    if (s.skill_type !== "system") problems.push(`skill ${s.id} is skill_type='${s.skill_type}', not system`);
    if (s.domain_module_id == null) { problems.push(`skill ${s.id} has NULL domain_module_id (not module-anchored) — cannot derive target`); continue; }
    const mod = modById.get(s.domain_module_id);
    if (!mod) { problems.push(`skill ${s.id} domain_module_id=${s.domain_module_id} not found`); continue; }
    const newDom = mod.domain_id;
    if (newDom == null) { problems.push(`skill ${s.id} module ${mod.domain_module_code} still has NULL domain_id — run §3-additive first`); continue; }
    const newKind = domById.get(newDom)?.domain_kind;
    if (newKind !== "bundle") { problems.push(`skill ${s.id} target domain ${newDom} is domain_kind='${newKind}', expected 'bundle'`); continue; }
    plan.push({ id: s.id, name: s.skill_name, oldDom: s.domain_id, newDom, same: s.domain_id === newDom });
  }

  const codeOf = (id: number | null) => (id == null ? "null" : `${id} ${domById.get(id)?.domain_code ?? "?"}`);
  console.log("skill_id  skill_name                  domain_module_id(KEPT)  old domain_id        ->  new domain_id");
  for (const p of plan) {
    const s = skills.find((x: any) => x.id === p.id);
    console.log(
      `${String(p.id).padEnd(9)} ${String(p.name).padEnd(27)} ${String(s.domain_module_id).padEnd(22)} ${codeOf(p.oldDom).padEnd(20)} -> ${codeOf(p.newDom)}${p.same ? "  (already repointed)" : ""}`,
    );
  }

  if (problems.length) {
    console.log(`\n⚠ ${problems.length} problem(s) — NOT writing:`);
    for (const x of problems) console.log(`  - ${x}`);
    process.exit(1);
  }

  const toWrite = plan.filter((p) => !p.same);
  console.log(`\n${toWrite.length} skill(s) need repoint; ${plan.length - toWrite.length} already repointed.`);

  if (!EXECUTE) {
    console.log("\nDRY-RUN: nothing written. Re-run with --execute after sign-off to apply.");
    return;
  }

  for (const p of toWrite) {
    await patch(`/skills?id=eq.${p.id}`, { domain_id: p.newDom }); // ONLY domain_id; domain_module_id + record_status untouched
    console.log(`  + skill ${p.id} (${p.name}) domain_id ${codeOf(p.oldDom)} -> ${codeOf(p.newDom)}`);
  }

  // verify: no bundle's system skill still points at a non-bundle domain; F2 host-domain skills intact.
  const after = await get(`/skills?id=in.(${SKILL_IDS.join(",")})&select=id,skill_name,domain_id,domain_module_id`);
  console.log("\nverify (post-write):");
  for (const s of after) console.log(`  skill ${s.id} domain_id=${codeOf(s.domain_id)} domain_module_id=${s.domain_module_id}`);
}

await main();
