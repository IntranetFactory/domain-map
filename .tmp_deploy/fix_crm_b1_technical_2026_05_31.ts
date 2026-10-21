/**
 * CRM B1 technical fixes (2026-05-31 continuation pass).
 *
 * Applies the deterministic, no-judgment subset of audits/CRM.md Bucket 1:
 *
 *   B1-S2  PATCH trigger_event 462 set event_category='signal'.
 *   B1-S4  PATCH data_objects 102 (sales_activities) notes='' per Rule #15.
 *   B1-S7  DELETE 5 duplicate role_modules rows (ids 388, 389, 390, 391, 393).
 *   B1-S8  DELETE legacy crm-system skill 41 + its 7 dependent skill_tools rows.
 *   B1-S10 PATCH handoffs 1261, 1262 set target_domain_module_id=46.
 *
 * Deferred (out of technical scope for this pass):
 *   B1-S1  Gated on B2-S1 (DELETE vs PROMOTE architectural choice).
 *   B1-S3  5 intra-domain handoffs (audit gives "70 or 160" choice on row (b)).
 *   B1-S5  Report-only (B10b owed by other domains).
 *   B1-S6  Report-only.
 *   B1-S9  Gated on B2-S3 (notes wording or tool-PATCH choice).
 *   B1-H1  75 APQC tag candidates, no resolvable PCF id pre-specified.
 *
 * Run from project root: bun run .tmp_deploy/fix_crm_b1_technical_2026_05_31.ts
 */

interface CmdResult {
  ok: boolean;
  data: any;
  status: number;
  stderr: string;
}

async function postgrest(method: string, path: string, body?: any): Promise<CmdResult> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    return { ok: false, data: null, status: code, stderr: stderr.trim() || stdout.trim() };
  }
  const text = stdout.trim();
  return { ok: true, data: text ? JSON.parse(text) : null, status: 0, stderr: "" };
}

async function get(path: string): Promise<any> {
  const r = await postgrest("GET", path);
  if (!r.ok) throw new Error(`GET ${path} failed: ${r.stderr}`);
  return r.data;
}

async function patch(path: string, body: any): Promise<any> {
  const r = await postgrest("PATCH", path, body);
  if (!r.ok) throw new Error(`PATCH ${path} failed: ${r.stderr}`);
  return r.data;
}

async function del(path: string): Promise<any> {
  const r = await postgrest("DELETE", path);
  if (!r.ok) throw new Error(`DELETE ${path} failed: ${r.stderr}`);
  return r.data;
}

async function main() {
  console.log("CRM B1 technical fixes (2026-05-31)");
  console.log("====================================\n");

  // ---------------------------------------------------------------
  // B1-S2: PATCH trigger_event 462 set event_category='signal'
  // ---------------------------------------------------------------
  console.log("B1-S2: PATCH trigger_event 462 set event_category='signal'");
  {
    const before = await get(`/trigger_events?id=eq.462&select=id,event_name,event_category`);
    console.log(`  before: ${JSON.stringify(before)}`);
    await patch(`/trigger_events?id=eq.462`, { event_category: "signal" });
    const after = await get(`/trigger_events?id=eq.462&select=id,event_name,event_category`);
    console.log(`  after:  ${JSON.stringify(after)}\n`);
  }

  // ---------------------------------------------------------------
  // B1-S4: PATCH data_objects 102 notes='' (Rule #15 revert)
  // ---------------------------------------------------------------
  console.log("B1-S4: PATCH data_objects 102 (sales_activities) notes=''");
  {
    const before = await get(`/data_objects?id=eq.102&select=id,data_object_name,notes`);
    console.log(`  before notes (len ${(before[0]?.notes ?? "").length}): ${JSON.stringify(before[0]?.notes ?? null)}`);
    await patch(`/data_objects?id=eq.102`, { notes: "" });
    const after = await get(`/data_objects?id=eq.102&select=id,data_object_name,notes`);
    console.log(`  after notes (len ${(after[0]?.notes ?? "").length}): ${JSON.stringify(after[0]?.notes ?? null)}\n`);
  }

  // ---------------------------------------------------------------
  // B1-S7: DELETE 5 duplicate role_modules rows
  //   (10098, 46) keep primary 287, delete 388 (secondary dup)
  //   (10098, 47) keep 288 (secondary), delete 389 (secondary dup)
  //   (10099, 46) keep 291 (secondary), delete 390 (secondary dup)
  //   (10099, 47) keep primary 290, delete 391 (secondary dup)
  //   (10101, 46) keep 297 (secondary), delete 393 (secondary dup)
  // ---------------------------------------------------------------
  console.log("B1-S7: DELETE 5 duplicate role_modules rows");
  const dupIds = [388, 389, 390, 391, 393];
  {
    const before = await get(
      `/role_modules?id=in.(${dupIds.join(",")})&select=id,role_id,domain_module_id,interaction_level`
    );
    console.log(`  before: ${JSON.stringify(before)}`);
    for (const id of dupIds) {
      await del(`/role_modules?id=eq.${id}`);
      console.log(`    deleted role_modules id=${id}`);
    }
    const after = await get(
      `/role_modules?id=in.(${dupIds.join(",")})&select=id,role_id,domain_module_id`
    );
    console.log(`  after: ${JSON.stringify(after)}\n`);
  }

  // ---------------------------------------------------------------
  // B1-S8: DELETE legacy crm-system skill 41 + dependent skill_tools
  // ---------------------------------------------------------------
  console.log("B1-S8: DELETE legacy crm-system skill 41 + dependent skill_tools");
  {
    const stBefore = await get(
      `/skill_tools?skill_id=eq.41&select=id,skill_id,tool_id,requirement_level`
    );
    console.log(`  skill_tools dependent on skill 41: ${stBefore.length} rows`);
    for (const r of stBefore) {
      await del(`/skill_tools?id=eq.${r.id}`);
      console.log(`    deleted skill_tools id=${r.id} (tool_id=${r.tool_id})`);
    }
    await del(`/skills?id=eq.41`);
    console.log(`    deleted skills id=41`);
    const skillAfter = await get(`/skills?id=eq.41&select=id,skill_name`);
    const stAfter = await get(`/skill_tools?skill_id=eq.41&select=id`);
    console.log(`  after: skills row=${JSON.stringify(skillAfter)}, skill_tools rows=${stAfter.length}\n`);
  }

  // ---------------------------------------------------------------
  // B1-S10: PATCH handoffs 1261, 1262 set target_domain_module_id=46
  //   FSM publishes both events with payload customers (97), which is
  //   mastered in CRM-ACCT-MGT (46).
  // ---------------------------------------------------------------
  console.log("B1-S10: PATCH handoffs 1261, 1262 set target_domain_module_id=46");
  {
    const before = await get(
      `/handoffs?id=in.(1261,1262)&select=id,source_domain_id,target_domain_id,target_domain_module_id,data_object_id`
    );
    console.log(`  before: ${JSON.stringify(before)}`);
    for (const id of [1261, 1262]) {
      await patch(`/handoffs?id=eq.${id}`, { target_domain_module_id: 46 });
      console.log(`    patched handoffs id=${id} -> target_domain_module_id=46`);
    }
    const after = await get(
      `/handoffs?id=in.(1261,1262)&select=id,target_domain_module_id`
    );
    console.log(`  after: ${JSON.stringify(after)}\n`);
  }

  console.log("Done. Surfaces for review:");
  console.log("  https://tests.semantius.app/domain_map/trigger_events");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/role_modules");
  console.log("  https://tests.semantius.app/domain_map/skills");
  console.log("  https://tests.semantius.app/domain_map/handoffs");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
