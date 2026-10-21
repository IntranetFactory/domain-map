#!/usr/bin/env bun
// B1A-S5 — author 8 intra-domain data_object_relationships across the 5 LCAP masters.
// B1A-S14-ITSM — author 1 cross-domain relationship lcap_apps opens service_incidents (47).
//
// Both bundled here per the b1a action ("Bundle with B1A-S5 if running together").
//
// Edge set (B1A-S5, intra-domain):
//   1. lcap_apps            contains_pages       lcap_pages            (1:N composition, owner=apps)
//   2. lcap_apps            contains_workflows   lcap_workflows        (1:N composition, owner=apps)
//   3. lcap_apps            defines              lcap_business_objects (1:N composition, owner=apps)
//   4. lcap_apps            binds_to             lcap_data_sources     (M:N association)
//   5. lcap_pages           displays             lcap_business_objects (M:N association)
//   6. lcap_workflows       operates_on          lcap_business_objects (M:N association)
//   7. lcap_workflows       triggers_from        lcap_pages            (M:N association)
//   8. lcap_business_objects sources_from        lcap_data_sources     (M:N association)
//
// Cross-domain (B1A-S14-ITSM):
//   9. lcap_apps            opens                service_incidents (47, ITSM master) (M:N association)
//
// owner_side names the PARENT (cascade root). For the 1:N composition edges that is lcap_apps (source).
// For M:N association edges there is no cascade parent; owner_side=source is the canonical default
// (no composition / one_to_many invariant applies). is_required=false (presence-conditional, Rule #16).
// notes='' per Rule #15. record_status omitted (DB default 'new', Rule #1).
//
// Natural-key dedup on (data_object_id, relationship_verb, related_data_object_id).
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/lcap_b1a_intra_relationships_2026_06_06.ts

export {};

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path}: ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

const APPS = 220, BO = 221, WF = 222, PAGES = 715, DS = 716, INCIDENTS = 47;

type Edge = {
  from: number;
  verb: string;
  to: number;
  inverse: string;
  type: "one_to_many" | "many_to_many" | "one_to_one";
  kind: "composition" | "reference" | "association";
  owner_side: "source" | "target";
};

const EDGES: Edge[] = [
  // intra-domain (B1A-S5)
  { from: APPS, verb: "contains_pages", to: PAGES, inverse: "belongs_to_app", type: "one_to_many", kind: "composition", owner_side: "source" },
  { from: APPS, verb: "contains_workflows", to: WF, inverse: "belongs_to_app", type: "one_to_many", kind: "composition", owner_side: "source" },
  { from: APPS, verb: "defines", to: BO, inverse: "is_defined_by_app", type: "one_to_many", kind: "composition", owner_side: "source" },
  { from: APPS, verb: "binds_to", to: DS, inverse: "is_bound_by_app", type: "many_to_many", kind: "association", owner_side: "source" },
  { from: PAGES, verb: "displays", to: BO, inverse: "is_displayed_on_page", type: "many_to_many", kind: "association", owner_side: "source" },
  { from: WF, verb: "operates_on", to: BO, inverse: "is_operated_on_by_workflow", type: "many_to_many", kind: "association", owner_side: "source" },
  { from: WF, verb: "triggers_from", to: PAGES, inverse: "triggers_workflow", type: "many_to_many", kind: "association", owner_side: "source" },
  { from: BO, verb: "sources_from", to: DS, inverse: "supplies_business_object", type: "many_to_many", kind: "association", owner_side: "source" },
  // cross-domain (B1A-S14-ITSM)
  { from: APPS, verb: "opens", to: INCIDENTS, inverse: "is_opened_by_app", type: "many_to_many", kind: "association", owner_side: "source" },
];

// Pre-flight: pull existing edges touching these data_objects to dedup by natural key.
const involved = [APPS, BO, WF, PAGES, DS, INCIDENTS];
const existing: any[] = await postgrest(
  "GET",
  `/data_object_relationships?or=(data_object_id.in.(${involved.join(",")}),related_data_object_id.in.(${involved.join(",")}))&select=data_object_id,relationship_verb,related_data_object_id`,
);
const seen = new Set(existing.map((r) => `${r.data_object_id}|${r.relationship_verb}|${r.related_data_object_id}`));
console.log(`Existing edges touching these objects: ${existing.length}`);

const toInsert: Record<string, unknown>[] = [];
for (const e of EDGES) {
  const key = `${e.from}|${e.verb}|${e.to}`;
  if (seen.has(key)) {
    console.log(`  SKIP (dup): ${key}`);
    continue;
  }
  toInsert.push({
    data_object_id: e.from,
    related_data_object_id: e.to,
    relationship_verb: e.verb,
    inverse_verb: e.inverse,
    relationship_type: e.type,
    relationship_kind: e.kind,
    owner_side: e.owner_side,
    is_required: false,
    notes: "",
  });
}

console.log(`Inserting ${toInsert.length} relationships...`);
if (toInsert.length > 0) {
  const res = await postgrest("POST", "/data_object_relationships", toInsert);
  console.log(`  inserted ${Array.isArray(res) ? res.length : toInsert.length}`);
}

// Verify
const after: any[] = await postgrest(
  "GET",
  `/data_object_relationships?and=(data_object_id.in.(${[APPS, BO, WF, PAGES, DS].join(",")}),related_data_object_id.in.(${[APPS, BO, WF, PAGES, DS, INCIDENTS].join(",")}))&select=id,data_object_id,relationship_verb,related_data_object_id,relationship_type,relationship_kind,owner_side&order=id.asc`,
);
console.log(`\nPost-load: ${after.length} forward edges from LCAP masters (intra + the ITSM cross-domain):`);
for (const r of after) console.log(`  ${r.id}: ${r.data_object_id} ${r.relationship_verb} ${r.related_data_object_id} (${r.relationship_type}/${r.relationship_kind}, owner=${r.owner_side})`);
