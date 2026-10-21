// B2C-COMM Phase-E personas (E1/E2/E3). Multi-module domain (3 modules, 8 caps) had ZERO personas.
// Additive corrective work on existing module footprint. record_status='new' (default, omitted).
// Idempotent on role_code (domain_roles) and (role_id, domain_module_id) (role_modules).
// Run: bun run c:/dev/domain-map/.tmp_deploy/fix_b2c_comm_personas_2026_06_13.ts [--write]

const WRITE = process.argv.includes("--write");

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const arg: any = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(arg)],
    { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`pg ${method} ${path} failed: ${err}\n${out}`);
  try { return JSON.parse(out); } catch { return out.trim(); }
}

const MOD = { catalog: 213, order: 214, fulfill: 215 };
const MODCODE: Record<number, string> = {
  213: "B2C-COMM-CATALOG-MERCH", 214: "B2C-COMM-ORDER-CAPTURE", 215: "B2C-COMM-FULFILL-SHIP",
};

type Persona = {
  role_code: string; role_name: string; description: string;
  business_function_id: number | null;
  reach: { module: number; level: "primary" | "secondary" }[];
};
const PERSONAS: Persona[] = [
  {
    role_code: "MARKETING-MERCHANDISER", role_name: "Merchandiser",
    description: "Builds and publishes the product catalog, runs the storefront, and launches coupons and promotions. Reads order activity to see what is selling and adjust merchandising.",
    business_function_id: 22, // Marketing
    reach: [{ module: MOD.catalog, level: "primary" }, { module: MOD.order, level: "secondary" }],
  },
  {
    role_code: "COMMERCE-OPERATOR", role_name: "Commerce Operator",
    description: "Runs the order-to-cash flow end to end: captures carts, completes checkouts and payments, creates orders, and drives them through fulfillment and shipping. Cross-functional operations persona.",
    business_function_id: null, // cross-functional
    reach: [{ module: MOD.order, level: "primary" }, { module: MOD.fulfill, level: "primary" }],
  },
  {
    role_code: "OPERATIONS-FULFILLMENT-SPECIALIST", role_name: "Fulfillment Specialist",
    description: "Picks, packs, and ships paid orders and manages shipments and returns. Reads order detail to fulfill against the right line items.",
    business_function_id: 34, // Business Operations
    reach: [{ module: MOD.fulfill, level: "primary" }, { module: MOD.order, level: "secondary" }],
  },
];

async function main() {
  const log: string[] = [];

  const existing: any[] = await pg("GET", `/domain_roles?role_code=in.(${PERSONAS.map(p=>p.role_code).join(",")})&select=id,role_code`);
  const codeToId = new Map<string, number>(existing.map((r: any) => [r.role_code, r.id]));

  for (const p of PERSONAS) {
    let rid = codeToId.get(p.role_code);
    if (!rid) {
      if (WRITE) {
        const ins = await pg("POST", "/domain_roles?select=id,role_code", {
          role_code: p.role_code, role_name: p.role_name,
          description: p.description, business_function_id: p.business_function_id,
        });
        rid = ins[0].id;
        log.push(`  INSERTed persona ${p.role_code} (id ${rid})`);
      } else {
        log.push(`  [dry] would INSERT persona ${p.role_code}`);
      }
    } else {
      log.push(`  persona ${p.role_code} exists (id ${rid})`);
    }

    // reach rows
    const have: any[] = rid ? await pg("GET", `/role_modules?role_id=eq.${rid}&select=domain_module_id`) : [];
    const haveMods = new Set(have.map((r: any) => r.domain_module_id));
    const rmRows = p.reach.filter(r => !haveMods.has(r.module)).map(r => ({
      role_module_label: `${p.role_code} : ${MODCODE[r.module]}`,
      role_id: rid, domain_module_id: r.module, interaction_level: r.level,
    }));
    if (rmRows.length) {
      if (WRITE && rid) { await pg("POST", "/role_modules", rmRows); log.push(`    INSERTed ${rmRows.length} role_modules`); }
      else log.push(`    [dry] would INSERT ${rmRows.length} role_modules`);
    }
  }

  console.log(log.join("\n"));
  console.log(WRITE ? "\nAPPLIED." : "\nDRY RUN (pass --write to apply).");
}

main().catch((e) => { console.error(e); process.exit(1); });
