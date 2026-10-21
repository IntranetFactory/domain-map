#!/usr/bin/env bun
// Discovery pass: for each cross-cutting capability, list all solutions
// covering any of its linked domains. Output for me to classify.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const ec = await proc.exited;
  if (ec !== 0) throw new Error(`exit ${ec}: ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}

const CROSSCUT: Record<string, string[]> = {
  "KNOWLEDGE-MGMT":            ["KMS", "ITSM", "CSM", "HRSD", "LSD"],
  "AI-TRIAGE-CLASSIFICATION":  ["ITSM", "CSM", "HRSD"],
  "SLA-MGMT":                  ["ITSM", "CSM", "CCAAS", "PSA"],
  "SELF-SERVICE-PORTAL":       ["ITSM", "HRSD", "LSD"],
  "IDENTITY-RESOLUTION":       ["CDP", "MDM", "IGA"],
  "TIME-TRACKING":             ["WFM", "PSA", "EXPENSE"],
  "COMPLIANCE-TRAIN":          ["LMS", "GRC"],
  "CUSTOMER-360":              ["CRM", "CDP", "MDM"],
  "APPROVAL-WORKFLOW":         ["CLM", "CPQ", "S2P", "HCM", "HRSD", "ITSM", "AP-AUTO"],
  "WORKFORCE-SCHEDULING":      ["WFM", "FSM", "MFG-OPS", "RET-STORE"],
};

async function main() {
  // id maps
  const caps = await call({ method: "GET", path: "/capabilities?capability_code=in.(" + Object.keys(CROSSCUT).map(c => `"${c}"`).join(",") + ")&select=id,capability_code" });
  const capId = new Map<string, number>();
  for (const r of caps) capId.set(String(r.capability_code), Number(r.id));

  const allDomCodes = [...new Set(Object.values(CROSSCUT).flat())];
  const doms = await call({ method: "GET", path: "/domains?domain_code=in.(" + allDomCodes.map(c => `"${c}"`).join(",") + ")&select=id,domain_code" });
  const domId = new Map<string, number>();
  const domCodeById = new Map<number, string>();
  for (const r of doms) {
    domId.set(String(r.domain_code), Number(r.id));
    domCodeById.set(Number(r.id), String(r.domain_code));
  }

  // solutions per domain via solution_domains
  const allDomIds = [...domId.values()].join(",");
  const solDoms = await call({ method: "GET", path: `/solution_domains?domain_id=in.(${allDomIds})&select=solution_id,domain_id,coverage_level&limit=10000` });
  const solById = new Map<number, string>();
  const solRows = await call({ method: "GET", path: `/solutions?select=id,solution_name&limit=10000` });
  for (const r of solRows) solById.set(Number(r.id), String(r.solution_name));

  // For each capability, collect solutions covering any of its linked domains
  const existingSCRows = await call({ method: "GET", path: `/solution_capabilities?capability_id=in.(${[...capId.values()].join(",")})&select=capability_id,solution_id&limit=10000` });
  const existingPairs = new Set(existingSCRows.map(r => `${r.capability_id}:${r.solution_id}`));

  const out: any[] = [];
  for (const [capCode, domainCodes] of Object.entries(CROSSCUT)) {
    const cid = capId.get(capCode)!;
    const targetDomainIds = new Set(domainCodes.map(c => domId.get(c)!));
    const solsInScope = new Map<number, { name: string; domains: string[] }>();
    for (const sd of solDoms) {
      if (!targetDomainIds.has(Number(sd.domain_id))) continue;
      const sid = Number(sd.solution_id);
      const dCode = domCodeById.get(Number(sd.domain_id))!;
      if (!solsInScope.has(sid)) solsInScope.set(sid, { name: solById.get(sid)!, domains: [] });
      solsInScope.get(sid)!.domains.push(dCode);
    }
    const existingForCap = [...solsInScope.entries()].filter(([sid]) => existingPairs.has(`${cid}:${sid}`)).map(([sid, info]) => info.name);
    const missing = [...solsInScope.entries()].filter(([sid]) => !existingPairs.has(`${cid}:${sid}`));
    out.push({
      capability: capCode,
      total_solutions_in_scope: solsInScope.size,
      existing_count: existingForCap.length,
      missing_count: missing.length,
      missing: missing.map(([sid, info]) => `${info.name} (id=${sid}, in: ${info.domains.sort().join("+")})`),
    });
  }

  for (const r of out) {
    console.log(`\n=== ${r.capability} ===`);
    console.log(`  total in scope: ${r.total_solutions_in_scope}, existing: ${r.existing_count}, MISSING: ${r.missing_count}`);
    for (const m of r.missing) console.log(`    - ${m}`);
  }

  const totalMissing = out.reduce((s, r) => s + r.missing_count, 0);
  console.log(`\n\nGRAND TOTAL missing rows to load: ${totalMissing}`);
}

await main();
