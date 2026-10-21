// State-driven Validate-mode execute pass for PAYROLL (domain 55).
// Works ONLY the open EXECUTE-classified items in audits/PAYROLL/state.yaml:
//   - B1A-ENTITY-TYPE : PATCH entity_type on the 8 PAYROLL masters (unclassified -> enum)
//   - A4 / M8 (Rule #20): author + write catalog_tagline/catalog_description on domain 55
//     and the 4 modules (empty fields only; never overwrite a non-empty value)
//   - B1A-S11 : INSERT generic-synonym data_object_aliases for the 8 masters
//   - B1A-S12 : INSERT business_function_domains HR(3) contributor (IT consumer surfaced, not written)
//   - B1A-S13 : INSERT users(748) consumer/required DMDO on modules 90/91/92/93
//   - B1A-S6r : PATCH handoff 414 source_domain_module_id=90 (FK backfill; notes untouched)
//   - B1A-S4  : INSERT 8 intra-PAYROLL master-to-master data_object_relationships
//   - B1A-H1  : INSERT agent_curated handoff_processes for the still-untagged handoffs
//               with a clean live-resolved PCF match (idempotent on (handoff_id, process_id))
//
// All writes land at record_status default ('new'); never approved. No `notes` column written.
// Idempotent: read live, insert only missing, empty-guard the catalog text.
// Run: bun run "c:/dev/domain-map/.tmp_deploy/fix_payroll_state_2026_06_07.ts"

type Row = Record<string, unknown>;

async function sem(payload: object): Promise<{ ok: boolean; out: string }> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (/required audience not found|This JWT does not have authorization/i.test(out + err)) {
    throw new Error("JWT-AUDIENCE ERROR (stop): " + (err || out));
  }
  if (proc.exitCode !== 0) {
    throw new Error(`semantius failed (exit ${proc.exitCode}): ${err || out}`);
  }
  return { ok: true, out };
}
async function get(path: string): Promise<Row[]> {
  const r = await sem({ method: "GET", path });
  const t = r.out.trim();
  return t ? JSON.parse(t) : [];
}
async function post(path: string, body: Row[]): Promise<void> {
  if (body.length === 0) return;
  await sem({ method: "POST", path, body });
}
function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

const MASTERS: Record<number, string> = {
  138: "pay_runs", 139: "pay_slips", 140: "earning_codes", 141: "deduction_codes",
  142: "tax_authorities", 143: "tax_filings", 144: "garnishment_orders", 145: "payroll_journal_entries",
};
const MODULES: Record<number, string> = {
  90: "PAYROLL-RUN", 91: "PAYROLL-TAX-COMPLIANCE", 92: "PAYROLL-EARNINGS-DEDUCTIONS", 93: "PAYROLL-EMPLOYEE-PAY-STATEMENTS",
};

const summary: string[] = [];

// ============================================================
// 1) B1A-ENTITY-TYPE : PATCH entity_type on the 8 masters
//    operational_workflow = has a lifecycle/state machine; catalog = config reference table.
// ============================================================
const ENTITY_TYPE: Record<number, string> = {
  138: "operational_workflow", 139: "operational_workflow", 143: "operational_workflow",
  144: "operational_workflow", 145: "operational_workflow",
  140: "catalog", 141: "catalog", 142: "catalog",
};
{
  let wrote = 0, skip = 0;
  const live = await get(`/data_objects?id=in.(${Object.keys(MASTERS).join(",")})&select=id,entity_type`);
  for (const r of live) {
    const id = Number(r.id);
    const target = ENTITY_TYPE[id];
    if (r.entity_type === target) { skip++; continue; }
    if (r.entity_type !== "unclassified" && r.entity_type !== null) {
      // never overwrite an already-classified non-default value
      console.log(`SKIP entity_type ${MASTERS[id]} already=${r.entity_type}`);
      skip++; continue;
    }
    await sem({ method: "PATCH", path: `/data_objects?id=eq.${id}`, body: { entity_type: target } });
    console.log(`WROTE entity_type ${MASTERS[id]} -> ${target}`);
    wrote++;
  }
  summary.push(`entity_type PATCH: ${wrote} (skipped ${skip})`);
}

// ============================================================
// 2) A4 + M8 : catalog UX copy (Rule #20). Buyer voice, no vendor names, no em-dash.
// ============================================================
const CATALOG: { table: "domains" | "domain_modules"; id: number; code: string; tagline: string; description: string }[] = [
  { table: "domains", id: 55, code: "PAYROLL",
    tagline: "Pay your people accurately and on time, with taxes filed and every paystub in their hands.",
    description: "Run the full pay cycle end to end: pull in hours, earnings, and deductions, calculate gross-to-net for every employee, and disburse net pay on schedule. File the statutory tax returns each jurisdiction requires, process court-ordered wage garnishments correctly, and post the resulting journal entries to your books. Give every employee a clear, accurate pay statement and keep a defensible record of how each amount was calculated." },
  { table: "domain_modules", id: 90, code: "PAYROLL-RUN",
    tagline: "Take each pay cycle from open to disbursed, with gross-to-net calculated for every employee.",
    description: "Open a pay run, gather the earnings and deductions that apply, and calculate gross-to-net pay for everyone in the cycle. Route the run for approval, disburse net pay, and post the results so the next cycle starts clean. Track every run through its lifecycle and keep the full calculation trail for audit." },
  { table: "domain_modules", id: 91, code: "PAYROLL-TAX-COMPLIANCE",
    tagline: "Calculate, file, and track every statutory payroll tax return to acceptance.",
    description: "Determine which taxing authorities apply to each pay run, calculate the taxes owed, and prepare the statutory filings each jurisdiction requires. Submit returns, track acceptance or rejection, and manage amendments and corrections, with a clean record of what was filed and when." },
  { table: "domain_modules", id: 92, code: "PAYROLL-EARNINGS-DEDUCTIONS",
    tagline: "Define the earning and deduction codes that shape every paycheck, and process garnishments correctly.",
    description: "Maintain the catalog of earning and deduction codes that drive how pay is calculated: pre-tax and post-tax deductions, recurring and one-time earnings, and the rules behind each. Take in court-ordered wage garnishments, apply them to the right runs within legal limits, and track each order from receipt to release." },
  { table: "domain_modules", id: 93, code: "PAYROLL-EMPLOYEE-PAY-STATEMENTS",
    tagline: "Publish accurate pay statements and give every employee on-demand access to their pay history.",
    description: "Generate a clear pay statement for every employee each cycle, showing earnings, deductions, taxes, and net pay. Publish statements on schedule, handle amendments and reissues when corrections happen, and keep an accessible archive so employees can retrieve their pay history whenever they need it." },
];
{
  let wrote = 0, skip = 0;
  for (const r of CATALOG) {
    const cur = await get(`/${r.table}?id=eq.${r.id}&select=catalog_tagline,catalog_description`);
    const row = cur[0] ?? {};
    const patch: Record<string, string> = {};
    if (isEmpty(row.catalog_tagline)) patch.catalog_tagline = r.tagline;
    if (isEmpty(row.catalog_description)) patch.catalog_description = r.description;
    if (Object.keys(patch).length === 0) { console.log(`SKIP catalog ${r.code} (non-empty)`); skip++; continue; }
    await sem({ method: "PATCH", path: `/${r.table}?id=eq.${r.id}`, body: patch });
    console.log(`WROTE catalog ${r.table} ${r.code} [${Object.keys(patch).join(", ")}]`);
    wrote++;
  }
  summary.push(`catalog UX PATCH: ${wrote} rows (skipped ${skip})`);
}

// ============================================================
// 3) B1A-S11 : generic-synonym aliases (alias_type='synonym'; no industry_id available)
// ============================================================
const ALIASES: { data_object_id: number; names: string[] }[] = [
  { data_object_id: 138, names: ["payroll runs", "pay cycles", "payroll cycles"] },
  { data_object_id: 139, names: ["paystubs", "pay statements", "paychecks", "wage statements", "payslips"] },
  { data_object_id: 140, names: ["pay codes", "earnings types"] },
  { data_object_id: 141, names: ["benefit deduction codes", "pre-tax deductions", "post-tax deductions"] },
  { data_object_id: 142, names: ["taxing authorities", "tax jurisdictions", "revenue agencies"] },
  { data_object_id: 143, names: ["statutory filings", "tax returns", "RTI submissions"] },
  { data_object_id: 144, names: ["wage garnishments", "wage attachments", "court orders", "attachment of earnings orders"] },
  { data_object_id: 145, names: ["payroll journals", "payroll GL entries", "payroll postings"] },
];
{
  const existing = await get(`/data_object_aliases?data_object_id=in.(${Object.keys(MASTERS).join(",")})&select=data_object_id,alias_name`);
  const have = new Set(existing.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`));
  const rows: Row[] = [];
  for (const a of ALIASES) for (const n of a.names) {
    if (have.has(`${a.data_object_id}|${n.toLowerCase()}`)) continue;
    rows.push({ data_object_id: a.data_object_id, alias_name: n, alias_type: "synonym", is_preferred: false });
  }
  await post("/data_object_aliases", rows);
  console.log(`WROTE aliases: ${rows.length}`);
  summary.push(`data_object_aliases INSERT: ${rows.length} rows`);
}

// ============================================================
// 4) B1A-S12 : business_function_domains -- HR(3) contributor (clean). IT consumer surfaced only.
// ============================================================
{
  const existing = await get(`/business_function_domains?domain_id=eq.55&select=business_function_id,responsibility_type`);
  const have = new Set(existing.map(r => `${r.business_function_id}|${r.responsibility_type}`));
  const rows: Row[] = [];
  if (!have.has("3|contributor")) rows.push({ domain_id: 55, business_function_id: 3, responsibility_type: "contributor" });
  await post("/business_function_domains", rows);
  console.log(`WROTE business_function_domains: ${rows.length} (HR contributor)`);
  summary.push(`business_function_domains INSERT: ${rows.length} (HR contributor; IT consumer surfaced)`);
}

// ============================================================
// 5) B1A-S13 : users(748) consumer/required DMDO on each module
// ============================================================
{
  const existing = await get(`/domain_module_data_objects?data_object_id=eq.748&domain_module_id=in.(90,91,92,93)&select=domain_module_id`);
  const have = new Set(existing.map(r => Number(r.domain_module_id)));
  const rows: Row[] = [];
  for (const mid of [90, 91, 92, 93]) {
    if (have.has(mid)) continue;
    rows.push({
      domain_module_id: mid, data_object_id: 748, role: "consumer", necessity: "required",
      domain_module_data_object_label: `${MODULES[mid]} / users`,
    });
  }
  await post("/domain_module_data_objects", rows);
  console.log(`WROTE users DMDO: ${rows.length}`);
  summary.push(`users(748) DMDO INSERT: ${rows.length} rows`);
}

// ============================================================
// 6) B1A-S6r : PATCH handoff 414 source_domain_module_id=90 (FK is currently NULL)
// ============================================================
{
  const [h] = await get(`/handoffs?id=eq.414&select=id,source_domain_module_id`);
  if (h && h.source_domain_module_id === null) {
    await sem({ method: "PATCH", path: `/handoffs?id=eq.414`, body: { source_domain_module_id: 90 } });
    console.log(`WROTE handoff 414 source_domain_module_id=90`);
    summary.push(`handoff 414 source FK PATCH: 1`);
  } else {
    console.log(`SKIP handoff 414 (source=${h?.source_domain_module_id})`);
    summary.push(`handoff 414 source FK PATCH: 0 (already set)`);
  }
}

// ============================================================
// 7) B1A-S4 : 8 intra-PAYROLL master-to-master data_object_relationships
//    relationship_kind='reference' (matches the catalog's intra-domain convention).
// ============================================================
type Rel = { src: number; tgt: number; verb: string; inv: string; type: string; req: boolean };
const RELS: Rel[] = [
  { src: 138, tgt: 139, verb: "produces", inv: "produced by", type: "one_to_many", req: true },
  { src: 138, tgt: 145, verb: "books", inv: "booked from", type: "one_to_many", req: true },
  { src: 138, tgt: 143, verb: "feeds", inv: "fed by", type: "one_to_many", req: true },
  { src: 142, tgt: 143, verb: "scopes", inv: "scoped by", type: "one_to_many", req: true },
  { src: 140, tgt: 139, verb: "contributes_to", inv: "composed from", type: "many_to_many", req: true },
  { src: 141, tgt: 139, verb: "contributes_to", inv: "composed from", type: "many_to_many", req: true },
  { src: 144, tgt: 138, verb: "deducts_via", inv: "applies", type: "one_to_many", req: true },
  { src: 139, tgt: 145, verb: "evidences", inv: "evidenced by", type: "one_to_one", req: false },
];
{
  const existing = await get(
    `/data_object_relationships?or=(data_object_id.in.(${Object.keys(MASTERS).join(",")}),related_data_object_id.in.(${Object.keys(MASTERS).join(",")}))&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const have = new Set(existing.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`));
  const rows: Row[] = [];
  for (const r of RELS) {
    if (have.has(`${r.src}|${r.tgt}|${r.verb}`)) continue;
    rows.push({
      data_object_id: r.src, related_data_object_id: r.tgt,
      relationship_type: r.type, relationship_kind: "reference",
      relationship_verb: r.verb, inverse_verb: r.inv, is_required: r.req, owner_side: "source",
      data_object_relationship_label: `${MASTERS[r.src]} ${r.verb} ${MASTERS[r.tgt]}`,
    });
  }
  await post("/data_object_relationships", rows);
  console.log(`WROTE intra-domain relationships: ${rows.length}`);
  summary.push(`data_object_relationships INSERT: ${rows.length} rows`);
}

// ============================================================
// 8) B1A-H1 : agent_curated handoff_processes for still-untagged handoffs with a clean
//    LIVE-resolved PCF match. process_id = processes.id (verified live this pass).
//    Idempotent on (handoff_id, process_id).
// ============================================================
// Clean PCF nodes resolved live 2026-06-07 (processes.id : process_name):
//   224  Manage employee onboarding (L3)
//   236  Administer Payroll (L3)
//   1046 Administer compensation and rewards to employees (L4)
//   248  Implement workforce analytics (L3)
//   316  Process expense reimbursements (L3)
//   1430 File regulatory payroll tax forms (L4)
//   1052 Administer benefit enrollment (L4)
//   1420 Maintain and administer applicable deductions (L4)
const TAGS: { handoff_id: number; process_id: number; note: string }[] = [
  { handoff_id: 411, process_id: 224, note: "ONBOARDING doc-collection -> payroll onboarding" },
  { handoff_id: 377, process_id: 236, note: "HCM employment_event -> administer payroll" },
  { handoff_id: 380, process_id: 236, note: "HCM contract.executed -> administer payroll" },
  { handoff_id: 383, process_id: 236, note: "HCM contract.expired -> administer payroll" },
  { handoff_id: 105, process_id: 1046, note: "COMP merit -> administer comp/rewards" },
  { handoff_id: 187, process_id: 1046, note: "COMP merit pay_slips -> administer comp/rewards" },
  { handoff_id: 1140, process_id: 1046, note: "COMP earning_code.created -> administer comp/rewards" },
  { handoff_id: 423, process_id: 1046, note: "COMP equity_grant.vested -> administer comp/rewards" },
  { handoff_id: 25, process_id: 248, note: "PAYROLL -> PA people_kpis (workforce analytics)" },
  { handoff_id: 102, process_id: 248, note: "PAYROLL -> PA pay_slips (workforce analytics)" },
  { handoff_id: 1155, process_id: 248, note: "PAYROLL -> PA pay_runs (workforce analytics)" },
  { handoff_id: 1157, process_id: 316, note: "PAYROLL -> EXPENSE expense_reports (reimbursements)" },
  { handoff_id: 415, process_id: 1430, note: "PAYROLL-TAX -> GRC tax_filing.submitted (file regulatory payroll tax)" },
  { handoff_id: 1153, process_id: 1420, note: "PAYROLL-E-D -> GRC garnishment_order (administer deductions)" },
  { handoff_id: 412, process_id: 236, note: "PAYROLL -> HCM pay_cycle.closed pay_slips (administer payroll)" },
  { handoff_id: 1154, process_id: 236, note: "PAYROLL -> HCM pay_slip.published (administer payroll)" },
  { handoff_id: 413, process_id: 1052, note: "PAYROLL -> BEN-ADMIN pay_cycle.closed (administer benefit enrollment)" },
];
{
  const hIds = TAGS.map(t => t.handoff_id).join(",");
  const existing = await get(`/handoff_processes?handoff_id=in.(${hIds})&select=handoff_id,process_id`);
  const have = new Set(existing.map(r => `${r.handoff_id}|${r.process_id}`));
  const rows: Row[] = [];
  for (const t of TAGS) {
    if (have.has(`${t.handoff_id}|${t.process_id}`)) continue;
    rows.push({ handoff_id: t.handoff_id, process_id: t.process_id, role: "implements", proposal_source: "agent_curated" });
  }
  await post("/handoff_processes", rows);
  console.log(`WROTE handoff_processes (agent_curated): ${rows.length}`);
  summary.push(`handoff_processes INSERT: ${rows.length} agent_curated rows`);
}

console.log("\n==== SUMMARY ====");
for (const s of summary) console.log("  " + s);
console.log("\nUI links:");
console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(138,139,140,141,142,143,144,145)");
console.log("  https://tests.semantius.app/domain_map/domains?id=eq.55");
console.log("  https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.55");
console.log("  https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(138,139,140,141,142,143,144,145)");
console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
console.log("  https://tests.semantius.app/domain_map/handoff_processes");
console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects?data_object_id=eq.748");
