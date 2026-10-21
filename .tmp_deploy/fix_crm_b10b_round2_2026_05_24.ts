/**
 * Round 2 — close out remaining 10 unattributed CRM inbound handoffs by
 * loading the missing consumer rows on appropriate CRM modules.
 */

const CRM_DOMAIN_ID = 69;

async function pg(method: string, path: string, body?: any) {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" }
  );
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${method} ${path}: ${stderr.trim() || stdout.trim()}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : null;
}

const CONSUMERS = [
  { do: "merge_rules", mod: "CRM-ACCT-MGT", notes: "MDM merge-rule publication updates account dedup behavior." },
  { do: "mystery_shopper_records", mod: "CRM-ACCT-MGT", notes: "In-store visit observations surface to account view for retail-focused sales." },
  { do: "delivery_routes", mod: "CRM-ACCT-MGT", notes: "Delivery-route dispatch info linked to subscriber account for CSA / direct-to-consumer." },
  { do: "harvest_forecasts", mod: "CRM-ACCT-MGT", notes: "Harvest forecast updates trigger subscriber notification on linked accounts." },
  { do: "return_authorizations", mod: "CRM-ACCT-MGT", notes: "OMS return authorizations surface on account view for sales/CS context." },
  { do: "store_pickup_orders", mod: "CRM-ACCT-MGT", notes: "BOPIS pickup order events surface on account view." },
  { do: "feature_requests", mod: "CRM-ACCT-MGT", notes: "Feature-request shipped events trigger customer-comms feedback loops." },
  { do: "product_features", mod: "CRM-ACCT-MGT", notes: "Product-feature release events feed account-level upsell context." },
  { do: "product_lines", mod: "CRM-ACCT-MGT", notes: "Product-line launch events feed expansion-motion targeting." },
  { do: "quote_discounts", mod: "CRM-PIPELINE-MGT", notes: "Quote discount application affects opportunity-level pricing analytics." },
];

async function main() {
  const mods: any[] = await pg("GET", `/domain_modules?domain_id=eq.${CRM_DOMAIN_ID}&select=id,domain_module_code`);
  const m = new Map(mods.map((x: any) => [x.domain_module_code, x.id]));
  const names = CONSUMERS.map((c) => c.do);
  const dos: any[] = await pg("GET", `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name`);
  const d = new Map(dos.map((x: any) => [x.data_object_name, x.id]));
  const modIds = [...m.values()];
  const existing: any[] = await pg("GET", `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`);
  const have = new Set(existing.map((r: any) => `${r.domain_module_id}:${r.data_object_id}`));

  const inserts: any[] = [];
  for (const c of CONSUMERS) {
    const mid = m.get(c.mod), doid = d.get(c.do);
    if (!mid || !doid) { console.log(`SKIP ${c.mod} <- ${c.do}`); continue; }
    if (have.has(`${mid}:${doid}`)) continue;
    inserts.push({ domain_module_id: mid, data_object_id: doid, role: "consumer", necessity: "optional", notes: c.notes });
  }
  if (inserts.length) await pg("POST", "/domain_module_data_objects", inserts);
  console.log(`Added ${inserts.length} consumer rows`);

  // Re-run B10b inbound
  const ho: any[] = await pg("GET", `/cross_domain_handoffs?target_domain_id=eq.${CRM_DOMAIN_ID}&target_domain_module_id=is.null&select=id,data_object_id`);
  const dmdo: any[] = await pg("GET", `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id,role`);
  const RANK: Record<string, number> = { master: 0, embedded_master: 1, contributor: 2, consumer: 3, derived: 4 };
  function pick(doid: number): number | null {
    const c = dmdo.filter((r: any) => r.data_object_id === doid);
    if (!c.length) return null;
    const min = Math.min(...c.map((r: any) => RANK[r.role] ?? 99));
    const s = c.filter((r: any) => (RANK[r.role] ?? 99) === min);
    return s.length === 1 ? s[0].domain_module_id : null;
  }
  let patched = 0, nul = 0;
  for (const h of ho) {
    const mid = pick(h.data_object_id);
    if (mid !== null) { await pg("PATCH", `/cross_domain_handoffs?id=eq.${h.id}`, { target_domain_module_id: mid }); patched++; }
    else nul++;
  }
  console.log(`Inbound: patched ${patched}, still null ${nul}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
