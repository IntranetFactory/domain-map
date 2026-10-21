// Make CWM junction labels consistent with the renamed module codes (VMS-* -> CWM-*).
// User-approved consistency cleanup. The domain_module_code on modules 315/316 is already CWM-*;
// this fixes the denormalized *_label fields on the DMDO + capability junction rows. Idempotent.

type Row = Record<string, unknown>;
async function call(req: { method: string; path: string; body?: unknown }): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(req)); proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  const t = out.trim();
  if (!t) { if (proc.exitCode === 0) return []; throw new Error(`fail ${req.method} ${req.path}: ${err}`); }
  let p: any; try { p = JSON.parse(t); } catch { throw new Error(`non-JSON ${req.method} ${req.path}: ${t.slice(0,300)} ${err}`); }
  if (p && typeof p === "object" && !Array.isArray(p) && p.code && p.message) throw new Error(`PostgREST ${req.method} ${req.path}: ${JSON.stringify(p)}`);
  return p;
}
const get = (path: string) => call({ method: "GET", path });
const fix = (s: string) => s.replaceAll("VMS-WORKER-SOURCING", "CWM-WORKER-SOURCING").replaceAll("VMS-TIME-INVOICING", "CWM-TIME-INVOICING");

let n = 0;
// DMDO labels
const dmdo = await get("/domain_module_data_objects?domain_module_id=in.(315,316)&select=id,domain_module_data_object_label");
for (const r of dmdo as Row[]) {
  const cur = String(r.domain_module_data_object_label ?? "");
  const next = fix(cur);
  if (next !== cur) {
    await call({ method: "PATCH", path: `/domain_module_data_objects?id=eq.${r.id}`, body: { domain_module_data_object_label: next } });
    console.log(`DMDO ${r.id}: ${cur} -> ${next}`); n++;
  }
}
// capability labels
const dmc = await get("/domain_module_capabilities?domain_module_id=in.(315,316)&select=id,domain_module_capability_label");
for (const r of dmc as Row[]) {
  const cur = String(r.domain_module_capability_label ?? "");
  const next = fix(cur);
  if (next !== cur) {
    await call({ method: "PATCH", path: `/domain_module_capabilities?id=eq.${r.id}`, body: { domain_module_capability_label: next } });
    console.log(`DMC ${r.id}: ${cur} -> ${next}`); n++;
  }
}
console.log(`\nPatched ${n} labels.`);

// verify none left
const leftA = await get("/domain_module_data_objects?domain_module_id=in.(315,316)&domain_module_data_object_label=ilike.*VMS-*&select=id");
const leftB = await get("/domain_module_capabilities?domain_module_id=in.(315,316)&domain_module_capability_label=ilike.*VMS-*&select=id");
console.log(`remaining VMS- labels: DMDO ${leftA.length}, capability ${leftB.length} (expect 0/0)`);
