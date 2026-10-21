// SMP catalog UX copy (A4/M8) + persona re-authoring (B2-E1), 2026-06-02 follow-up.
// - Catalog copy: user-approved drafts; written ONLY into currently-empty fields (Rule #20 no-overwrite guard).
// - Personas: re-author the 3 SMP personas deleted by Plan 3, under the domain_roles + role_modules model.
//   Bundle is DERIVED from reach (role_modules) + entity-type tier policy; no permission list authored.
//   process_raci / lifecycle process_id wiring (E4/E6) is a separate follow-on, not done here.
// Idempotent: catalog copy guarded on empty; personas keyed on role_code; reach keyed on (role_id, module).

type Json = any;

async function call(method: string, path: string, body?: unknown): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(arg));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius ${method} ${path} failed (exit ${proc.exitCode}):\n${err}\n${out}`);
  }
  try { return JSON.parse(out); } catch { return out; }
}
const get = (p: string) => call("GET", p);
const patch = (p: string, b: unknown) => call("PATCH", p, b);

function uniformize(rows: Json[]): Json[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const o: Json = {};
    for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return o;
  });
}
async function insert(path: string, rows: Json[]): Promise<void> {
  if (rows.length === 0) return;
  for (let i = 0; i < rows.length; i += 50) await call("POST", path, uniformize(rows.slice(i, i + 50)));
}

// ---------------------------------------------------------------------------
// A4 / M8 — catalog UX copy (write only into empty fields)
// ---------------------------------------------------------------------------
const CATALOG: { path: string; label: string; tagline: string; description: string }[] = [
  {
    path: "/domains?id=eq.85",
    label: "SMP (domain)",
    tagline: "See every SaaS app your company pays for, cut wasted licenses, and never miss a renewal.",
    description:
      "Discover every SaaS application in use, sanctioned or not, see who owns each one, and track real usage against what you pay for. Reclaim idle licenses automatically, run renewals on a schedule instead of in a panic, and give employees a self-service catalog to request the apps they need. One place to manage your whole SaaS portfolio, from first sign-up to final offboarding.",
  },
  {
    path: "/domain_modules?id=eq.30",
    label: "SMP-DISCOVERY",
    tagline: "Find every SaaS app in use, including the ones nobody told you about.",
    description:
      "Automatically discover sanctioned and shadow SaaS across your org, assign an owner to each app, and connect the integrations that feed usage and spend data. Publish a clean app catalog, stage each application through its portfolio lifecycle, and get alerted the moment something needs attention.",
  },
  {
    path: "/domain_modules?id=eq.184",
    label: "SMP-OPTIMIZATION",
    tagline: "Stop paying for licenses nobody uses.",
    description:
      "Track real usage for every SaaS seat, surface rightsizing and savings recommendations, and reclaim idle or duplicate licenses with a safe grace period. Benchmark your cost-per-seat against peers so you know where you are overspending and act on it.",
  },
  {
    path: "/domain_modules?id=eq.31",
    label: "SMP-RENEWAL-VENDOR",
    tagline: "Run every SaaS renewal on your terms, not the vendor's deadline.",
    description:
      "Track every upcoming renewal, assign renewal tasks, and manage vendor negotiations from first outreach to signed agreement. Allocate spend across cost centers, coordinate contracts with procurement and legal, and keep a per-vendor risk and attestation record so renewals are decisions, not surprises.",
  },
  {
    path: "/domain_modules?id=eq.185",
    label: "SMP-AUTOMATION",
    tagline: "Automate the busywork of granting, moving, and removing app access.",
    description:
      "Build declarative workflows that provision and deprovision SaaS access automatically, track every run, and give employees a self-service way to request the apps they need with manager and IT approval built in. Less manual ticket-pushing, faster access, cleaner offboarding.",
  },
];

async function writeCatalogCopy() {
  for (const c of CATALOG) {
    const [row] = await get(`${c.path}&select=catalog_tagline,catalog_description`);
    const body: Json = {};
    if (!row?.catalog_tagline) body.catalog_tagline = c.tagline;
    if (!row?.catalog_description) body.catalog_description = c.description;
    if (Object.keys(body).length === 0) {
      console.log(`  catalog: ${c.label} already populated, skipped (Rule #20 no-overwrite)`);
      continue;
    }
    await patch(c.path, body);
    console.log(`  catalog: wrote ${Object.keys(body).join(" + ")} for ${c.label}`);
  }
}

// ---------------------------------------------------------------------------
// B2-E1 — personas (domain_roles) + reach (role_modules)
// ---------------------------------------------------------------------------
const PERSONAS = [
  {
    role_code: "IT-SAAS-ADMIN",
    role_name: "SaaS Administrator",
    business_function_id: 27, // IT Operations
    description:
      "IT Operations persona that runs day-to-day SaaS administration: discovering and triaging applications, managing integrations and owners, optimizing license usage and reclamation, and operating automation workflows and self-service requests.",
    reach: [
      { m: 30, level: "primary" },
      { m: 184, level: "primary" },
      { m: 185, level: "primary" },
      { m: 31, level: "secondary" },
    ],
  },
  {
    role_code: "PROCUREMENT-SAAS-RENEWAL-OWNER",
    role_name: "SaaS Renewal Owner",
    business_function_id: 19, // Procurement
    description:
      "Procurement persona that owns the commercial SaaS lifecycle: renewal pipeline, vendor negotiations, spend allocation, and vendor risk attestation, with read access to discovery and usage data that informs renewal decisions.",
    reach: [
      { m: 31, level: "primary" },
      { m: 30, level: "secondary" },
      { m: 184, level: "secondary" },
    ],
  },
  {
    role_code: "ITAM-SAAS-PORTFOLIO-MANAGER",
    role_name: "SaaS Portfolio Manager",
    business_function_id: 84, // IT Asset Management (SMP owner function, C1)
    description:
      "IT Asset Management persona that governs the SaaS portfolio end to end across discovery, optimization, renewal, and automation; the cross-module owner accountable for portfolio cost, compliance, and lifecycle.",
    reach: [
      { m: 30, level: "primary" },
      { m: 31, level: "primary" },
      { m: 184, level: "primary" },
      { m: 185, level: "primary" },
    ],
  },
];

async function authorPersonas() {
  // 1. domain_roles, idempotent by role_code
  const codes = PERSONAS.map((p) => p.role_code);
  const existing: Json[] = await get(
    `/domain_roles?role_code=in.(${codes.join(",")})&select=id,role_code`,
  );
  const have = new Set(existing.map((r) => r.role_code));
  const toInsert = PERSONAS.filter((p) => !have.has(p.role_code)).map((p) => ({
    role_code: p.role_code,
    role_name: p.role_name,
    business_function_id: p.business_function_id,
    description: p.description,
    // record_status omitted -> 'new'
  }));
  await insert("/domain_roles", toInsert);
  console.log(`  personas: inserted ${toInsert.length} domain_roles (${existing.length} already present)`);

  // 2. re-read to build role_code -> id
  const all: Json[] = await get(
    `/domain_roles?role_code=in.(${codes.join(",")})&select=id,role_code`,
  );
  const idByCode = new Map<string, number>(all.map((r) => [r.role_code, Number(r.id)]));

  // 3. role_modules reach, idempotent by (role_id, domain_module_id)
  const roleIds = [...idByCode.values()];
  const existingRm: Json[] = await get(
    `/role_modules?role_id=in.(${roleIds.join(",")})&select=role_id,domain_module_id`,
  );
  const rmSeen = new Set(existingRm.map((r) => `${r.role_id}|${r.domain_module_id}`));
  const rmRows: Json[] = [];
  for (const p of PERSONAS) {
    const rid = idByCode.get(p.role_code)!;
    for (const r of p.reach) {
      if (rmSeen.has(`${rid}|${r.m}`)) continue;
      rmRows.push({ role_id: rid, domain_module_id: r.m, interaction_level: r.level });
    }
  }
  await insert("/role_modules", rmRows);
  console.log(`  personas: inserted ${rmRows.length} role_modules reach rows`);
  for (const p of PERSONAS) {
    console.log(`    ${p.role_code} (id ${idByCode.get(p.role_code)}) -> ${p.reach.map((r) => `${r.m}:${r.level}`).join(", ")}`);
  }
}

async function main() {
  console.log("=== SMP catalog copy + personas ===");
  console.log("A4/M8 catalog UX copy:");
  await writeCatalogCopy();
  console.log("B2-E1 personas + reach:");
  await authorPersonas();
  console.log("=== done ===");
}
await main();
