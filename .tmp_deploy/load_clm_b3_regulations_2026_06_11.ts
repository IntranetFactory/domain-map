// CLM b3 regulation load (greenlit a10=yes). Link GDPR/SOX/HIPAA to CLM (conditional); create FAR+DFARS then link.
// Idempotent. record_status omitted (DB default 'new'). American English, no em-dash.

const CLM = 26;
const USA = 3;

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const arg = JSON.stringify({ method, path, ...(body ? { body } : {}) });
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", arg], { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  if (code !== 0) throw new Error(`semantius exit ${code}: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// 1. Create FAR + DFARS if absent
const NEW_REGS = [
  { code: "FAR", name: "Federal Acquisition Regulation", type: "other",
    body: "US General Services Administration, Department of Defense, and NASA",
    desc: "Primary regulation governing acquisition of goods and services by US federal executive agencies; sets mandatory contract clauses for federal contracts." },
  { code: "DFARS", name: "Defense Federal Acquisition Regulation Supplement", type: "other",
    body: "US Department of Defense",
    desc: "Department of Defense supplement to the Federal Acquisition Regulation; adds defense-specific contract clauses including cybersecurity and supply-chain requirements." },
];
for (const r of NEW_REGS) {
  const ex = await call("GET", `/regulations?regulation_code=eq.${r.code}&select=id`);
  if (ex?.length) { console.log(`regulation ${r.code}: exists (id ${ex[0].id})`); continue; }
  await call("POST", "/regulations", {
    regulation_name: r.name, regulation_code: r.code, regulation_type: r.type,
    jurisdiction_id: USA, issuing_body: r.body, description: r.desc, certification_required: false,
  });
  const row = await call("GET", `/regulations?regulation_code=eq.${r.code}&select=id`);
  console.log(`regulation ${r.code}: INSERTED (id ${row[0].id})`);
}

// 2. Resolve regulation ids by code
const codes = ["GDPR", "SOX", "HIPAA", "FAR", "DFARS"];
const regs = await call("GET", `/regulations?regulation_code=in.(${codes.join(",")})&select=id,regulation_code`);
const idByCode: Record<string, number> = {};
for (const r of regs) idByCode[r.regulation_code] = r.id;

// 3. Link each to CLM via domain_regulations, applicability='conditional' (jurisdiction/sector-gated)
for (const code of codes) {
  const rid = idByCode[code];
  if (!rid) { console.log(`!! ${code} unresolved, skipping`); continue; }
  const ex = await call("GET", `/domain_regulations?domain_id=eq.${CLM}&regulation_id=eq.${rid}&select=domain_id`);
  if (ex?.length) { console.log(`domain_regulations CLM x ${code}: exists`); continue; }
  await call("POST", "/domain_regulations", { domain_id: CLM, regulation_id: rid, applicability: "conditional" });
  console.log(`domain_regulations CLM x ${code} (id ${rid}): INSERTED conditional`);
}

// verify
console.log("\n=== CLM domain_regulations now ===");
const out = await call("GET", `/domain_regulations?domain_id=eq.${CLM}&select=applicability,regulations(regulation_code,regulation_name)&order=regulation_id.asc`);
for (const o of out) console.log(`  ${o.regulations.regulation_code} (${o.applicability})`);
