#!/usr/bin/env bun
// State-driven CPQ audit execute (domain-map-analyst Validate mode, SKILL.md Rule #21).
// Run from project root:  bun run ".tmp_deploy/fix_cpq_state_driven_2026_06_07.ts"
//
// Executes the agent-fixable open items from audits/CPQ/state.yaml:
//   1. B1A-ENTITY-TYPE  PATCH data_objects.entity_type on the 8 CPQ masters (Rule #12 enum).
//   2. Catalog UX (Rule #20) author empty catalog_tagline + catalog_description on the
//      CPQ domain row (73) and the 3 full modules (164, 165, 166). Buyer voice, no vendor
//      names, no em-dash, American English. NEVER overwrites a non-empty value.
//   3. B1A-S4 (B11) INSERT generic synonym data_object_aliases on the 8 masters.
//   4. B1A-S5 (C1) author lifecycle states on product_configurations (418) and
//      quote_lines (417). pricing_rules (419) + product_bundles (422) are NOT authored:
//      classified entity_type='catalog' (config shape), which carries no Rule #12 gap, and
//      their state-machine authoring stays gated on user decision B2-S5.
//
// Idempotent: reads live, writes only missing / empty. record_status omitted (defaults 'new').

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    out.push(...(await call({ method: "POST", path, body: slice })));
  }
  return out;
}

// ============================================================
// 1. entity_type classification (Rule #12 enum)
// ============================================================
const ENTITY_TYPES: Record<number, string> = {
  416: "operational_workflow", // sales_quotes: draft->presented->accepted->lost, submit lock, approver
  417: "operational_workflow", // quote_lines: line lock + approval gates (state machine authored below)
  418: "operational_workflow", // product_configurations: configuration validation workflow (states below)
  419: "catalog",              // pricing_rules: calculation-engine reference data (config shape)
  420: "operational_workflow", // quote_discounts: proposed->pending_approval->approved/rejected
  421: "operational_workflow", // discount_approvals: approval workflow record
  422: "catalog",              // product_bundles: reusable package definitions (config shape)
  423: "operational_workflow", // contract_drafts: draft->in_review->signed->executed handoff
};

async function fixEntityTypes(): Promise<number> {
  const ids = Object.keys(ENTITY_TYPES).join(",");
  const live = await get(`/data_objects?id=in.(${ids})&select=id,data_object_name,entity_type`);
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = ENTITY_TYPES[id];
    const current = String(r.entity_type ?? "");
    if (current === "unclassified" || current === "") {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
      console.log(`  entity_type ${r.data_object_name} (${id}): ${current || "null"} -> ${target}`);
      patched++;
    } else {
      console.log(`  entity_type ${r.data_object_name} (${id}): already '${current}', skip`);
    }
  }
  return patched;
}

// ============================================================
// 2. Catalog UX (Rule #20) buyer-voice tagline + description
// ============================================================
const DOMAIN_CATALOG = {
  id: 73,
  catalog_tagline:
    "Build accurate, on-brand quotes fast: configure the product, apply the right price, and route discounts for approval without leaving the deal.",
  catalog_description:
    "Configure-price-quote turns a complex product line and pricing playbook into a guided selling motion your reps can run in minutes. Sellers assemble valid configurations, pull the correct price and bundle, and apply discounts that route through the right approvers automatically, so deals move faster and margins stay protected. When a quote is accepted it hands a clean, approved draft straight to contracting, billing, and the rest of revenue, with no rekeying and no surprises. The result is shorter quote cycles, fewer pricing errors, and proposals that look professional every time.",
};

const MODULE_CATALOG: Record<number, { catalog_tagline: string; catalog_description: string }> = {
  164: {
    catalog_tagline:
      "Keep every product, bundle, and pricing rule in one place so quotes are always built on correct, current data.",
    catalog_description:
      "This is the reference layer your quotes are built from: configurable products, reusable bundles, and the pricing rules that decide what each customer pays. Define options and constraints once and every seller inherits them, so no one quotes an invalid configuration or an out-of-date price. Volume tiers, seat-based and duration-based pricing, and segment overrides all live here, ready to drive consistent, defensible numbers across the whole sales team.",
  },
  165: {
    catalog_tagline:
      "Assemble quotes line by line with guided selling, live pricing, and discounts that stay inside policy.",
    catalog_description:
      "This is where sellers actually build the deal: add line items, follow guided-selling prompts to the right configuration, and watch totals update as they go. Discounts apply at the line or quote level and surface for approval the moment they cross a threshold, so reps move quickly without giving away margin. Finished quotes generate a clean, professional document ready to send, and accepted quotes flow straight downstream with no rekeying.",
  },
  166: {
    catalog_tagline:
      "Route discounts and non-standard terms through the right approvers, then hand a clean draft to contracting.",
    catalog_description:
      "This module runs the sign-off path that protects your margins. When a quote carries a deep discount or off-standard terms, it moves through a tiered approval chain with a clear record of who approved what and when. Once it clears, an approved contract draft is generated and handed to your contract lifecycle process, so nothing advances to signature until the deal has passed review. The result is faster, auditable approvals and a clean handoff into execution.",
  },
};

async function fixCatalogUx(): Promise<{ domain: number; modules: number }> {
  let domainW = 0;
  let moduleW = 0;

  const [dom] = await get(
    `/domains?id=eq.${DOMAIN_CATALOG.id}&select=id,catalog_tagline,catalog_description`,
  );
  if (dom) {
    const body: Row = {};
    if (String(dom.catalog_tagline ?? "") === "") body.catalog_tagline = DOMAIN_CATALOG.catalog_tagline;
    if (String(dom.catalog_description ?? "") === "")
      body.catalog_description = DOMAIN_CATALOG.catalog_description;
    if (Object.keys(body).length > 0) {
      await patch(`/domains?id=eq.${DOMAIN_CATALOG.id}`, body);
      console.log(`  catalog domain 73: wrote ${Object.keys(body).join(", ")}`);
      domainW++;
    } else {
      console.log("  catalog domain 73: both fields already non-empty, skip");
    }
  }

  const mids = Object.keys(MODULE_CATALOG).join(",");
  const mods = await get(
    `/domain_modules?id=in.(${mids})&select=id,domain_module_code,catalog_tagline,catalog_description`,
  );
  for (const m of mods) {
    const id = Number(m.id);
    const spec = MODULE_CATALOG[id];
    const body: Row = {};
    if (String(m.catalog_tagline ?? "") === "") body.catalog_tagline = spec.catalog_tagline;
    if (String(m.catalog_description ?? "") === "") body.catalog_description = spec.catalog_description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${id}`, body);
      console.log(`  catalog module ${m.domain_module_code} (${id}): wrote ${Object.keys(body).join(", ")}`);
      moduleW++;
    } else {
      console.log(`  catalog module ${m.domain_module_code} (${id}): already populated, skip`);
    }
  }

  return { domain: domainW, modules: moduleW };
}

// ============================================================
// 3. data_object_aliases (B11) generic synonyms, alias_type='synonym'
// ============================================================
// Generic, vendor-neutral market terms only (Rule #18: no vendor/product names in
// description/tagline/capability text; data_object_aliases MAY carry generic synonyms).
const ALIASES: Array<{ data_object_id: number; alias_name: string }> = [
  { data_object_id: 416, alias_name: "proposals" },
  { data_object_id: 416, alias_name: "bids" },
  { data_object_id: 417, alias_name: "quote_items" },
  { data_object_id: 417, alias_name: "line_items" },
  { data_object_id: 418, alias_name: "configured_products" },
  { data_object_id: 419, alias_name: "discount_schedules" },
  { data_object_id: 419, alias_name: "price_books" },
  { data_object_id: 420, alias_name: "discount_lines" },
  { data_object_id: 421, alias_name: "approval_steps" },
  { data_object_id: 422, alias_name: "bundle_offers" },
  { data_object_id: 423, alias_name: "quote_contracts" },
];

async function fixAliases(): Promise<number> {
  const ids = [...new Set(ALIASES.map(a => a.data_object_id))].join(",");
  const live = await get(
    `/data_object_aliases?data_object_id=in.(${ids})&select=data_object_id,alias_name`,
  );
  const existing = new Set(live.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`));
  const missing = ALIASES.filter(
    a => !existing.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  ).map(a => ({ data_object_id: a.data_object_id, alias_name: a.alias_name, alias_type: "synonym" }));
  if (missing.length > 0) {
    await insert("/data_object_aliases", missing);
    for (const a of missing) console.log(`  alias +${a.alias_name} on data_object ${a.data_object_id}`);
  } else {
    console.log("  aliases: all present, nothing to insert");
  }
  return missing.length;
}

// ============================================================
// 4. data_object_lifecycle_states (C1) on 417 + 418
// ============================================================
type StateSpec = {
  data_object_id: number;
  state_name: string;
  state_order: number;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
};

const LIFECYCLE: StateSpec[] = [
  // product_configurations (418): configuration validation workflow
  { data_object_id: 418, state_name: "draft", state_order: 10, is_initial: true,
    description: "Configuration in progress; options being selected against the base product." },
  { data_object_id: 418, state_name: "validating", state_order: 20,
    description: "Selections submitted to the constraint solver for rule and compatibility checks." },
  { data_object_id: 418, state_name: "valid", state_order: 30,
    description: "Configuration satisfies all constraints and is ready to price into a quote line." },
  { data_object_id: 418, state_name: "invalid", state_order: 40, is_terminal: true,
    description: "Configuration violates one or more constraints and cannot be quoted until corrected." },

  // quote_lines (417): line lifecycle bound to the parent quote
  { data_object_id: 417, state_name: "draft", state_order: 10, is_initial: true,
    description: "Line added to the quote and still editable; price and quantity may change." },
  { data_object_id: 417, state_name: "locked", state_order: 20,
    description: "Line frozen when the parent quote is submitted or approved; no further edits." },
  { data_object_id: 417, state_name: "cancelled", state_order: 30, is_terminal: true,
    description: "Line removed from the active quote; retained for history and audit." },
];

async function fixLifecycle(): Promise<number> {
  const ids = [...new Set(LIFECYCLE.map(s => s.data_object_id))].join(",");
  const live = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${ids})&select=data_object_id,state_name`,
  );
  const existing = new Set(live.map(r => `${r.data_object_id}|${r.state_name}`));
  const missing = LIFECYCLE.filter(s => !existing.has(`${s.data_object_id}|${s.state_name}`)).map(s => ({
    data_object_id: s.data_object_id,
    state_name: s.state_name,
    state_order: s.state_order,
    description: s.description,
    is_initial: s.is_initial ?? false,
    is_terminal: s.is_terminal ?? false,
    requires_permission: s.requires_permission ?? false,
  }));
  if (missing.length > 0) {
    await insert("/data_object_lifecycle_states", missing);
    for (const s of missing)
      console.log(`  lifecycle +${s.state_name} on data_object ${s.data_object_id}`);
  } else {
    console.log("  lifecycle states: all present, nothing to insert");
  }
  return missing.length;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log("== 1. entity_type (Rule #12) ==");
  const et = await fixEntityTypes();
  console.log("== 2. catalog UX (Rule #20) ==");
  const cx = await fixCatalogUx();
  console.log("== 3. aliases (B11) ==");
  const al = await fixAliases();
  console.log("== 4. lifecycle states (C1) ==");
  const lc = await fixLifecycle();

  console.log("\n== SUMMARY ==");
  console.log(`entity_type PATCH:        ${et}`);
  console.log(`catalog UX domain PATCH:  ${cx.domain}`);
  console.log(`catalog UX module PATCH:  ${cx.modules}`);
  console.log(`alias INSERT:             ${al}`);
  console.log(`lifecycle-state INSERT:   ${lc}`);
  console.log("\nUI links:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/domain_modules");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
