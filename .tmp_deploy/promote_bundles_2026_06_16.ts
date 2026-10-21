/**
 * §2 + §3-ADDITIVE of plans/domain-kind-taxonomy-plan.md. NON-DESTRUCTIVE ONLY.
 *
 * Does NOT do the destructive skill `domain_id` repoint (separate dry-run + sign-off step) and
 * does NOT clear the module catalog copy (§5, later). Everything here is additive/corrective and
 * lands at record_status='new' (omitted -> DB default; Rule #1: never stamp approved).
 *
 * Steps:
 *   §2  flip INTRANET-GOV domain_kind -> emerging_market (confirmed: 6 masters, only partial coverage).
 *   §3  PRE-STEP snapshot (write-once): skills 220/236/474 (domain_id, domain_module_id),
 *        modules 153/171/403 (domain_id [currently null], catalog_tagline, catalog_description).
 *        Captures every value a LATER destructive step overwrites (skill repoint, §5 catalog clear).
 *   §3  industry pre-step: ensure 'HVAC Contractors' (naics_code 238220) exists; RE uses id 15;
 *        IT-OPS is horizontal (null).
 *   §3  create one domain_kind='bundle' domains row per starter (idempotent by domain_code), copying
 *        code/name/description + the module's catalog_tagline/catalog_description, setting
 *        min_org_size / cost_band / certification_required=false / industry_id. Leaves the
 *        market-research fields at default (no TAM for a bundle, §1 carve-out).
 *   §3  set the starter module's domain_id (null -> new bundle-domain). Asserts the null-domain
 *        module set is EXACTLY {153,171,403} first.
 *
 * Idempotent: re-running skips the flip if already emerging, preserves the first snapshot, skips
 * domain creation if the code exists, and re-PATCHes module.domain_id to the same id.
 *
 * Run: bun run .tmp_deploy/promote_bundles_2026_06_16.ts
 */
import { existsSync, writeFileSync } from "node:fs";

type CmdResult = { ok: boolean; data: any; stderr: string };
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
const post = (p: string, b: any) => call("POST", p, b);

const SNAPSHOT_PATH = "c:/dev/domain-map/.tmp_deploy/domain_kind_promote_snapshot.json";

// per-bundle metadata (plan §3 + locked decisions). industry: literal id, "HVAC" sentinel, or null.
const BUNDLES: Record<string, { min_org_size: string; cost_band: string; industry: number | "HVAC" | null }> = {
  "REAL-ESTATE-AGENT": { min_org_size: "10 xs <50", cost_band: "$", industry: 15 },        // Real Estate (existing)
  "HVAC-SVC-MGMT":     { min_org_size: "10 xs <50", cost_band: "$", industry: "HVAC" },     // HVAC Contractors (create)
  "IT-OPS-STARTER":    { min_org_size: "20 s <500", cost_band: "$$", industry: null },      // horizontal
};
const BUNDLE_CODES = Object.keys(BUNDLES);

async function main() {
  console.log("§2 + §3-additive bundle promotion (NON-DESTRUCTIVE) — 2026-06-16");
  console.log("================================================================\n");

  // ---------- §3 PRE-STEP: snapshot (write-once, captured BEFORE any write incl. the §2 flip) ----------
  console.log("§3 pre-step: snapshot");
  const [ig] = await get("/domains?domain_code=eq.INTRANET-GOV&select=id,domain_code,domain_kind");
  if (!ig) throw new Error("INTRANET-GOV not found");
  if (existsSync(SNAPSHOT_PATH)) {
    console.log(`  = snapshot already exists at ${SNAPSHOT_PATH}, preserved (NOT overwritten)`);
  } else {
    const skills = await get("/skills?id=in.(220,236,474)&select=id,skill_name,domain_id,domain_module_id");
    const mods = await get("/domain_modules?id=in.(153,171,403)&select=id,domain_module_code,domain_id,catalog_tagline,catalog_description");
    // intranet_gov captures the §2 pre-flip domain_kind so the snapshot is a complete rollback record.
    const snapshot = { captured: "2026-06-16", note: "pre-promotion recovery values for plan domain-kind-taxonomy §2/§3/§5", intranet_gov: ig, skills, modules: mods };
    writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n", "utf8");
    console.log(`  + wrote snapshot (intranet_gov + ${skills.length} skills + ${mods.length} modules) to ${SNAPSHOT_PATH}`);
  }

  // ---------- §2: flip INTRANET-GOV -> emerging_market ----------
  console.log("\n§2 classify INTRANET-GOV");
  if (ig.domain_kind === "emerging_market") {
    console.log("  = already emerging_market, skipped");
  } else {
    await patch("/domains?domain_code=eq.INTRANET-GOV", { domain_kind: "emerging_market" });
    console.log(`  + INTRANET-GOV ${ig.domain_kind} -> emerging_market`);
  }

  // ---------- §3 industry pre-step: ensure HVAC Contractors (238220) ----------
  console.log("\n§3 industry pre-step: HVAC Contractors (NAICS 238220)");
  let hvacIndustryId: number;
  const existingHvac = await get("/industries?naics_code=eq.238220&select=id,industry_name");
  if (existingHvac.length > 0) {
    hvacIndustryId = existingHvac[0].id;
    console.log(`  = exists: ${existingHvac[0].industry_name} (id ${hvacIndustryId})`);
  } else {
    await post("/industries", {
      industry_name: "HVAC Contractors",
      naics_code: "238220",
      description: "Heating, ventilation, air-conditioning, and refrigeration installation and service contractors. Small field-service operators running install, maintenance, and repair work orders for residential and light-commercial sites.",
    });
    const [created] = await get("/industries?naics_code=eq.238220&select=id,industry_name");
    hvacIndustryId = created.id;
    console.log(`  + created HVAC Contractors (id ${hvacIndustryId})`);
  }

  // ---------- §3 create bundle-domains + wire module.domain_id ----------
  console.log("\n§3 create bundle-domains + wire module.domain_id");

  // Safety assert: the null-domain module set must be EXACTLY {153,171,403} before we touch it.
  const nullDomMods = await get("/domain_modules?domain_id=is.null&select=id,domain_module_code");
  const nullIds = nullDomMods.map((m: any) => m.id).sort((a: number, b: number) => a - b);
  const expected = [153, 171, 403];
  const nullIsExpected = nullIds.length === expected.length && expected.every((id) => nullIds.includes(id));
  if (!nullIsExpected) {
    // Allowed only if the difference is modules we've ALREADY promoted this run (domain_id now set).
    const unexpected = nullIds.filter((id: number) => !expected.includes(id));
    if (unexpected.length > 0) {
      throw new Error(`ABORT: unexpected null-domain module(s) ${unexpected.join(",")} — plan §6 expects ONLY 153/171/403. Investigate before proceeding.`);
    }
    console.log(`  (note: ${nullIds.join(",") || "none"} still null-domain; the rest already wired this run)`);
  }

  for (const code of BUNDLE_CODES) {
    const [mod] = await get(`/domain_modules?domain_module_code=eq.${code}&select=id,domain_module_code,domain_module_name,description,catalog_tagline,catalog_description,domain_id,module_kind`);
    if (!mod) throw new Error(`module ${code} not found`);
    if (mod.module_kind !== "starter") throw new Error(`${code} is module_kind='${mod.module_kind}', not a starter`);

    const cfg = BUNDLES[code];
    const industry_id = cfg.industry === "HVAC" ? hvacIndustryId : cfg.industry;

    // create bundle-domain if absent (idempotent by domain_code)
    let [dom] = await get(`/domains?domain_code=eq.${code}&select=id,domain_code,domain_kind`);
    if (dom) {
      console.log(`  = domain ${code} already exists (id ${dom.id}, kind ${dom.domain_kind})`);
    } else {
      await post("/domains", {
        domain_code: code,
        domain_name: mod.domain_module_name,
        description: (mod.description ?? "").replace(/\borganisation/g, "organization"), // Americanize the copy (CLAUDE.md); module 171 has "organisations"
        domain_kind: "bundle",
        min_org_size: cfg.min_org_size,
        cost_band: cfg.cost_band,
        certification_required: false,
        industry_id, // null for IT-OPS-STARTER
        catalog_tagline: mod.catalog_tagline ?? "",        // COPY from module (NOT cleared here; §5)
        catalog_description: mod.catalog_description ?? "", // COPY from module
        // market-research fields left at default (no TAM for a bundle; §1 carve-out)
      });
      [dom] = await get(`/domains?domain_code=eq.${code}&select=id,domain_code,domain_kind,industry_id,min_org_size,cost_band`);
      console.log(`  + created bundle-domain ${code} (id ${dom.id}, industry_id=${dom.industry_id ?? "null"}, ${dom.min_org_size}, ${dom.cost_band})`);
    }

    // wire the starter module's domain_id -> bundle-domain (null -> id; corrective-additive)
    if (mod.domain_id === dom.id) {
      console.log(`    = module ${code} (id ${mod.id}) already wired to domain ${dom.id}`);
    } else {
      await patch(`/domain_modules?id=eq.${mod.id}`, { domain_id: dom.id });
      console.log(`    + module ${code} (id ${mod.id}) domain_id ${mod.domain_id ?? "null"} -> ${dom.id}`);
    }
  }

  // ---------- verify ----------
  console.log("\nverify:");
  const bundleDomains = await get("/domains?domain_kind=eq.bundle&select=id,domain_code,industry_id,min_org_size,cost_band,catalog_tagline&order=domain_code.asc");
  console.log(`  bundle-domains: ${bundleDomains.length}`);
  for (const d of bundleDomains) console.log(`    ${d.domain_code} (id ${d.id}) industry=${d.industry_id ?? "null"} ${d.min_org_size} ${d.cost_band} tagline="${(d.catalog_tagline ?? "").slice(0, 40)}..."`);
  const stillNull = await get("/domain_modules?domain_id=is.null&select=id,domain_module_code");
  console.log(`  null-domain modules remaining: ${stillNull.length} ${stillNull.length ? "(" + stillNull.map((m: any) => m.domain_module_code).join(",") + ")" : "(none — §6 NOT NULL flip now unblocked)"}`);
  const emerging = await get("/domains?domain_kind=eq.emerging_market&select=domain_code");
  console.log(`  emerging_market: ${emerging.map((d: any) => d.domain_code).join(",") || "none"}`);
  console.log("\n  NOTE: skill domain_id repoint (DESTRUCTIVE) NOT done here — separate dry-run + sign-off.");
}

await main();
