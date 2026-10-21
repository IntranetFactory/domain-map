#!/usr/bin/env bun
// FSM mobile-tech split (a4=b / B2-MOBILE-TECH-SPLIT): carve FSM-MOBILE-TECH out of FSM-DISPATCH-OPS,
//   moving field_visits (master) + cap 617 + its lifecycle + outbound handoff 229 to the new module.
// PROD-MGMT B9D-OWN-956 (a13=a): author process_raci R+A = PRODUCT-MANAGER (57) on process 956.
// record_status='new'. Idempotent.

import { $ } from "bun";
$.throws(false);
type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const p = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  p.stdin.write(JSON.stringify(body)); await p.stdin.end();
  const [o, e] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  if ((await p.exited) !== 0) throw new Error(`semantius failed: ${e}`);
  const t = o.trim(); return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const post = (p: string, b: Row[]) => call({ method: "POST", path: p, body: b });
const patch = (p: string, b: Row) => call({ method: "PATCH", path: p, body: b });

async function main() {
  // ===== FSM mobile-tech split =====
  let mt = await get("/domain_modules?domain_module_code=eq.FSM-MOBILE-TECH&select=id");
  if (!mt.length) {
    await post("/domain_modules", [{
      domain_module_code: "FSM-MOBILE-TECH", domain_module_name: "Mobile Technician", domain_id: 31, module_kind: "full",
      description: "The technician-side field app: field-visit execution, offline sync, route-of-day, and proof-of-completion. Split out of dispatch operations to match the market shape (every flagship ships a distinct technician mobile app).",
      catalog_tagline: "Give technicians an offline-ready field app: their day's route, the job, and proof it got done.",
      catalog_description: "Put the work in the technician's hand. The mobile module runs the field visit from arrival to sign-off: the route of the day, the job details, parts used, and proof-of-completion, all working offline and syncing when signal returns. Technicians stop juggling paper and phone calls, and the office gets clean, timely completion data the moment the job closes. This is the truck half of field service, separate from the dispatcher's desk.",
    }]);
    mt = await get("/domain_modules?domain_module_code=eq.FSM-MOBILE-TECH&select=id");
  }
  const MT = Number(mt[0].id);
  console.log("FSM-MOBILE-TECH module id:", MT);
  await patch("/domain_module_data_objects?id=eq.818", { domain_module_id: MT });        // field_visits master
  await patch("/domain_module_capabilities?id=eq.316", { domain_module_id: MT });        // FSM-MOBILE-TECH cap 617
  await patch("/data_object_lifecycle_states?id=in.(326,327,328,329)", { domain_module_id: MT }); // field_visits lifecycle
  await patch("/handoffs?id=eq.229", { source_domain_module_id: MT });                   // work_order.completed outbound
  console.log("moved field_visits master + cap 617 + 4 lifecycle states + handoff 229 to FSM-MOBILE-TECH");

  // ===== PROD-MGMT B9D-OWN-956 RACI =====
  const have = new Set((await get("/process_raci?process_id=eq.956&select=raci")).map(r => String(r.raci)));
  const rows = [
    { process_id: 956, actor_role_id: 57, actor_skill_id: null, raci: "responsible", consultation_blocking: false },
    { process_id: 956, actor_role_id: 57, actor_skill_id: null, raci: "accountable", consultation_blocking: false },
  ].filter(r => !have.has(r.raci));
  if (rows.length) await post("/process_raci", rows);
  console.log(`process_raci on 956: +${rows.length} (PRODUCT-MANAGER R+A)`);

  // ===== VERIFY =====
  console.log("\n== VERIFY ==");
  console.log("FSM modules:", (await get("/domain_modules?domain_id=eq.31&select=domain_module_code")).map(r => r.domain_module_code).join(", "));
  console.log("field_visits master module:", (await get("/domain_module_data_objects?id=eq.818&select=domain_module_id"))[0].domain_module_id, "(want " + MT + ")");
  console.log("field_visits lifecycle modules:", (await get("/data_object_lifecycle_states?data_object_id=eq.261&select=domain_module_id")).map(r => r.domain_module_id).join(","));
  console.log("handoff 229 source module:", (await get("/handoffs?id=eq.229&select=source_domain_module_id"))[0].source_domain_module_id);
  console.log("process_raci 956:", JSON.stringify(await get("/process_raci?process_id=eq.956&select=actor_role_id,raci")));
  console.log("DONE.");
}
main();
