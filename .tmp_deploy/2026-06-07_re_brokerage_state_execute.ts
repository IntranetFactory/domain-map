#!/usr/bin/env bun
// RE-BROKERAGE (domain 143) state-driven Validate execute pass, 2026-06-07.
// Executes the additive/corrective open state items only:
//   1. B1A-ENTITY-TYPE (B13): PATCH entity_type='operational_workflow' on the 5 masters
//      currently 'unclassified' (each has lifecycle states already loaded).
//   2. B2-CATALOG-UX (A4 + M8): author buyer-voice catalog_tagline + catalog_description
//      and write straight into EMPTY columns on domain 143 and its modules 151, 152, 153.
//      Rule #20 (revised): write empty fields; never overwrite a non-empty value.
//
// Idempotent: reads live first, classifies/writes only where currently unclassified/empty.
// No destructive work. record_status untouched (rows stay 'new').

import { $ } from "bun";
$.throws(false);

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
async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}
async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// ============================================================
// 1. entity_type classification (B13 / B1A-ENTITY-TYPE)
// ============================================================
// Each of these is a real-world business object with a workflow lifecycle
// (states confirmed live), so all five classify as operational_workflow.
const ENTITY_TYPE_TARGETS: Record<string, string> = {
  real_estate_listings: "operational_workflow",
  real_estate_transactions: "operational_workflow",
  commission_splits: "operational_workflow",
  tour_appointments: "operational_workflow",
  disclosure_documents: "operational_workflow",
};

async function classifyEntityTypes(): Promise<number> {
  const names = Object.keys(ENTITY_TYPE_TARGETS);
  const rows = await get(
    `/data_objects?data_object_name=in.(${names.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of rows) {
    const name = String(r.data_object_name);
    const target = ENTITY_TYPE_TARGETS[name];
    const current = r.entity_type;
    if (!target) continue;
    // Only write when unclassified/null (never overwrite a real classification).
    if (current === null || current === "unclassified") {
      await patch(`/data_objects?id=eq.${r.id}`, { entity_type: target });
      console.log(`  entity_type: ${name} (id ${r.id}) -> ${target}`);
      patched++;
    } else {
      console.log(`  entity_type: ${name} already '${current}', skipped`);
    }
  }
  return patched;
}

// ============================================================
// 2. Catalog UX (A4 + M8 / B2-CATALOG-UX)
//    Buyer voice (workflow + value). No vendor names. No em-dash. US English.
//    Write only into EMPTY columns.
// ============================================================
const DOMAIN_COPY = {
  catalog_tagline: "Run the brokerage from first lead to closed deal.",
  catalog_description:
    "Capture and nurture buyer and seller leads, publish listings to the MLS, schedule and track tours, and move every offer through escrow, contingencies, and closing. Calculate cooperating-broker and internal agent commission splits, keep state-mandated disclosures complete for compliance, and hand the closed transaction off to property management and accounting. Built for the way agents and brokers actually work a deal, not a generic sales pipeline.",
};

// domain_module_code -> copy. Module 153 is a cross-cutting starter hosted on
// CRM, RE-BROKERAGE, and CLM, so its copy stays domain-neutral.
const MODULE_COPY: Record<string, { catalog_tagline: string; catalog_description: string }> = {
  "RE-BROK-AGENT-OPS": {
    catalog_tagline: "Work every deal from lead to close in one place.",
    catalog_description:
      "Capture leads and turn them into listings, syndicate to the MLS, and schedule showings with access windows and follow-ups. Drive each transaction from accepted offer through inspection, financing, and contingencies to a clean close, with buyer and seller disclosures tracked at every step. The deployable unit for solo agents and small firms.",
  },
  "RE-BROK-BROKERAGE-OPS": {
    catalog_tagline: "Give the broker oversight of money and compliance.",
    catalog_description:
      "Run multi-agent commission splits with franchise overrides and per-agent caps, review transactions and disclosures for compliance before close, and keep trust and escrow accounts reconciled. Add broker-level MLS conformance review so the brokerage scales past informal supervision without losing control of the deal.",
  },
  "REAL-ESTATE-AGENT": {
    catalog_tagline: "A working surface for the real-estate agent.",
    catalog_description:
      "Bring contacts, listings, and the documents behind each deal into one agent-facing workspace. Move leads forward, keep listing and transaction paperwork organized, and stay on top of every active deal from a single view that travels with the agent across the systems they already use.",
  },
};

async function backfillCatalogUx(): Promise<{ domain: number; modules: number }> {
  let domainWrites = 0;
  let moduleWrites = 0;

  // Domain 143
  const [dom] = await get(
    "/domains?id=eq.143&select=id,catalog_tagline,catalog_description",
  );
  if (dom) {
    const body: Row = {};
    if (!dom.catalog_tagline) body.catalog_tagline = DOMAIN_COPY.catalog_tagline;
    if (!dom.catalog_description) body.catalog_description = DOMAIN_COPY.catalog_description;
    if (Object.keys(body).length > 0) {
      await patch("/domains?id=eq.143", body);
      console.log(`  catalog UX: domain 143 wrote [${Object.keys(body).join(", ")}]`);
      domainWrites++;
    } else {
      console.log("  catalog UX: domain 143 already populated, skipped");
    }
  }

  // Modules 151, 152, 153 (153 = cross-cutting starter hosted on 143 via host_domains)
  const mods = await get(
    "/domain_modules?id=in.(151,152,153)&select=id,domain_module_code,catalog_tagline,catalog_description",
  );
  for (const m of mods) {
    const code = String(m.domain_module_code);
    const copy = MODULE_COPY[code];
    if (!copy) {
      console.log(`  catalog UX: module ${code} (id ${m.id}) no copy defined, skipped`);
      continue;
    }
    const body: Row = {};
    if (!m.catalog_tagline) body.catalog_tagline = copy.catalog_tagline;
    if (!m.catalog_description) body.catalog_description = copy.catalog_description;
    if (Object.keys(body).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, body);
      console.log(`  catalog UX: module ${code} (id ${m.id}) wrote [${Object.keys(body).join(", ")}]`);
      moduleWrites++;
    } else {
      console.log(`  catalog UX: module ${code} (id ${m.id}) already populated, skipped`);
    }
  }
  return { domain: domainWrites, modules: moduleWrites };
}

// ============================================================
// main
// ============================================================
console.log("== RE-BROKERAGE state execute (2026-06-07) ==");
console.log("\n[1] entity_type classification (B13)");
const etCount = await classifyEntityTypes();
console.log("\n[2] catalog UX backfill (A4 + M8)");
const ux = await backfillCatalogUx();

console.log("\n== SUMMARY ==");
console.log(`  entity_type PATCHed: ${etCount} master(s)`);
console.log(`  catalog UX domain rows written: ${ux.domain}`);
console.log(`  catalog UX module rows written: ${ux.modules}`);
console.log("\nUI links:");
console.log("  https://tests.semantius.app/domain_map/data_objects?id=in.(352,353,354,355,356)");
console.log("  https://tests.semantius.app/domain_map/domains?id=eq.143");
console.log("  https://tests.semantius.app/domain_map/domain_modules?id=in.(151,152,153)");
