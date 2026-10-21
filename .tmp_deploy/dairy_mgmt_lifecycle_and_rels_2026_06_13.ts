// DAIRY-MGMT substrate pass 2026-06-13: B1B-S8 (lifecycle states on 7 workflow
// masters) + B1B-S3 (intra-domain data_object_relationships).
// Additive only; every row record_status defaults to 'new' (omitted). No notes.
// Idempotent: reads existing rows by natural key and inserts only the missing ones.
// Run from project root: bun run .tmp_deploy/dairy_mgmt_lifecycle_and_rels_2026_06_13.ts

import { $ } from "bun";
$.throws(false);

type Json = any;

async function pg(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  // Write payload to a temp file and feed it as stdin via Bun.spawn's file
  // handle (Bun's $ `<` redirection and stdin.write both fail to deliver the
  // POST body on Windows arm64; a Bun.file stdin handle is reliable).
  const payload = JSON.stringify(arg) + "\n";
  const winTmp = `${process.cwd().replace(/\\/g, "/")}/.tmp_deploy/.pg_payload_${Date.now()}_${Math.random().toString(36).slice(2)}.json`;
  await Bun.write(winTmp, payload);
  const written = await Bun.file(winTmp).text();
  if (written.length !== payload.length) throw new Error(`temp file write mismatch: ${written.length} vs ${payload.length}`);
  // Convert Windows path (C:/...) to bash-mount path (/c/...): bash's `<`
  // redirection inside the login shell does NOT open a `C:/` path and silently
  // feeds empty stdin (the PGRST102 root cause).
  const bashTmp = winTmp.replace(/^([A-Za-z]):/, (_m, d) => `/${d.toLowerCase()}`);
  // Route through bash: its `<` redirection delivers the body to the CLI
  // correctly, where Bun's native stdin handling does not on this platform.
  const cmd = `semantius call crud postgrestRequest < '${bashTmp}'`;
  const tmp = winTmp;
  const proc = Bun.spawn(["bash", "-lc", cmd], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [out0, err0] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  await $`rm -f ${tmp}`.quiet();
  if (exitCode !== 0) {
    throw new Error(`pg ${method} ${path} failed: ${err0 || out0}`);
  }
  const out = out0.trim();
  try {
    return out ? JSON.parse(out) : null;
  } catch {
    return out;
  }
}

// The semantius CLI mis-reads a file-cat stdin over ~480 bytes (PGRST102), but
// an `echo '<json>'` single-write pipe is reliable. Emit a bash driver of
// one-row `echo ... | semantius` commands so each body is a single small write.
async function emitDriver(label: string, path: string, rows: Json[]): Promise<string> {
  const lines = rows.map((r) => {
    const body = JSON.stringify({ method: "POST", path, body: [r] });
    // single-quote-safe (no single quotes occur in our JSON)
    return `echo '${body}' | semantius call crud postgrestRequest | grep -c '"id"'`;
  });
  const f = `.tmp_deploy/.driver_${label}.sh`;
  await Bun.write(f, lines.join("\n") + "\n");
  return f;
}

// ---- module ids -----------------------------------------------------------
const HERD = 227;
const PARLOR = 228;
const MILK_QUALITY = 229;

// ---- LIFECYCLE STATES (B1B-S8) -------------------------------------------
// Each row: data_object_id, state_name, state_order, is_initial, is_terminal,
// requires_permission, permission_verb_override, domain_module_id.
type LS = {
  data_object_id: number;
  state_name: string;
  state_order: number;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  domain_module_id?: number | null;
};

const lifecycleStates: LS[] = [
  // dairy_cows (499) HERD -- productive-animal lifecycle
  { data_object_id: 499, state_name: "active", state_order: 1, is_initial: true, domain_module_id: HERD },
  { data_object_id: 499, state_name: "dry", state_order: 2, domain_module_id: HERD },
  { data_object_id: 499, state_name: "culled", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "cull_cow", domain_module_id: HERD },
  { data_object_id: 499, state_name: "sold", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "sell_cow", domain_module_id: HERD },
  { data_object_id: 499, state_name: "deceased", state_order: 5, is_terminal: true, domain_module_id: HERD },

  // lactation_records (500) HERD -- per-cow lactation cycle
  { data_object_id: 500, state_name: "open", state_order: 1, is_initial: true, domain_module_id: HERD },
  { data_object_id: 500, state_name: "peak", state_order: 2, domain_module_id: HERD },
  { data_object_id: 500, state_name: "declining", state_order: 3, domain_module_id: HERD },
  { data_object_id: 500, state_name: "dried_off", state_order: 4, requires_permission: true, permission_verb_override: "dry_off_lactation", domain_module_id: HERD },
  { data_object_id: 500, state_name: "closed", state_order: 5, is_terminal: true, requires_permission: true, permission_verb_override: "close_lactation", domain_module_id: HERD },

  // milkings (501) PARLOR -- telemetry capture + validation
  { data_object_id: 501, state_name: "recorded", state_order: 1, is_initial: true, domain_module_id: PARLOR },
  { data_object_id: 501, state_name: "validated", state_order: 2, is_terminal: true, domain_module_id: PARLOR },
  { data_object_id: 501, state_name: "flagged", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "flag_milking", domain_module_id: PARLOR },

  // milk_quality_tests (502) MILK-QUALITY -- pending -> passed/failed (trigger: from passed to failed)
  { data_object_id: 502, state_name: "pending", state_order: 1, is_initial: true, domain_module_id: MILK_QUALITY },
  { data_object_id: 502, state_name: "passed", state_order: 2, is_terminal: true, domain_module_id: MILK_QUALITY },
  { data_object_id: 502, state_name: "failed", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "fail_quality_test", domain_module_id: MILK_QUALITY },

  // breeding_events (503) HERD -- service -> preg check
  { data_object_id: 503, state_name: "recorded", state_order: 1, is_initial: true, domain_module_id: HERD },
  { data_object_id: 503, state_name: "preg_check_pending", state_order: 2, domain_module_id: HERD },
  { data_object_id: 503, state_name: "confirmed_pregnant", state_order: 3, is_terminal: true, requires_permission: true, permission_verb_override: "confirm_pregnancy", domain_module_id: HERD },
  { data_object_id: 503, state_name: "open", state_order: 4, is_terminal: true, domain_module_id: HERD },

  // cow_health_events (504) HERD -- reported -> treated -> withdrawal -> recovered (trigger to_state=treatment_administered)
  { data_object_id: 504, state_name: "reported", state_order: 1, is_initial: true, domain_module_id: HERD },
  { data_object_id: 504, state_name: "treatment_administered", state_order: 2, requires_permission: true, permission_verb_override: "administer_treatment", domain_module_id: HERD },
  { data_object_id: 504, state_name: "withdrawal_active", state_order: 3, domain_module_id: HERD },
  { data_object_id: 504, state_name: "recovered", state_order: 4, is_terminal: true, requires_permission: true, permission_verb_override: "clear_health_event", domain_module_id: HERD },

  // bulk_milk_shipments (506) PARLOR -- loading -> dispatched -> accepted/rejected (trigger from loading to dispatched)
  { data_object_id: 506, state_name: "loading", state_order: 1, is_initial: true, domain_module_id: PARLOR },
  { data_object_id: 506, state_name: "dispatched", state_order: 2, requires_permission: true, permission_verb_override: "dispatch_shipment", domain_module_id: PARLOR },
  { data_object_id: 506, state_name: "accepted", state_order: 3, is_terminal: true, domain_module_id: PARLOR },
  { data_object_id: 506, state_name: "rejected", state_order: 4, is_terminal: true, domain_module_id: PARLOR },
];

// ---- INTRA-DOMAIN RELATIONSHIPS (B1B-S3) ----------------------------------
// owner_side names the parent (the "one" / lifecycle-owner side).
// For "parent has_many child" the forward verb reads parent->child, owner_side=source.
type REL = {
  data_object_id: number; // source (parent for one_to_many)
  related_data_object_id: number; // target
  relationship_verb: string;
  inverse_verb: string;
  relationship_type: "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many";
  relationship_kind: "reference" | "composition" | "association";
  is_required?: boolean;
  owner_side: "source" | "target";
};

const DAIRY_COWS = 499, LACTATION = 500, MILKINGS = 501, QUALITY = 502,
      BREEDING = 503, HEALTH = 504, FEED = 505, SHIPMENTS = 506;

const relationships: REL[] = [
  // dairy_cows (parent) has_many lactation_records (composition: cycle owned by the cow)
  { data_object_id: DAIRY_COWS, related_data_object_id: LACTATION, relationship_verb: "has lactations", inverse_verb: "belongs to cow", relationship_type: "one_to_many", relationship_kind: "composition", is_required: true, owner_side: "source" },
  // lactation_records (parent) has_many milkings (cross-module HERD->PARLOR; a milking belongs to a lactation cycle)
  { data_object_id: LACTATION, related_data_object_id: MILKINGS, relationship_verb: "accumulates milkings", inverse_verb: "rolls up to lactation", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // dairy_cows (parent) has_many breeding_events
  { data_object_id: DAIRY_COWS, related_data_object_id: BREEDING, relationship_verb: "has breeding events", inverse_verb: "bred cow", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
  // dairy_cows (parent) has_many cow_health_events
  { data_object_id: DAIRY_COWS, related_data_object_id: HEALTH, relationship_verb: "has health events", inverse_verb: "concerns cow", relationship_type: "one_to_many", relationship_kind: "reference", is_required: true, owner_side: "source" },
  // breeding_events -> lactation_records (a confirmed breeding/calving opens a lactation cycle)
  { data_object_id: BREEDING, related_data_object_id: LACTATION, relationship_verb: "opens lactation", inverse_verb: "originates from breeding", relationship_type: "one_to_one", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // milkings -> bulk_milk_shipments (PARLOR intra; many milkings aggregate into a shipment)
  { data_object_id: SHIPMENTS, related_data_object_id: MILKINGS, relationship_verb: "aggregates milkings", inverse_verb: "contributes to shipment", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // milkings -> milk_quality_tests (PARLOR->MILK-QUALITY; a milking can be sampled for a test)
  { data_object_id: MILKINGS, related_data_object_id: QUALITY, relationship_verb: "is sampled for quality", inverse_verb: "tests milking", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
  // feed_rations -> dairy_cows (FEED->HERD; a ration is fed to many cows via their group)
  { data_object_id: FEED, related_data_object_id: DAIRY_COWS, relationship_verb: "is fed to cows", inverse_verb: "is on ration", relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
];

async function main() {
  // ---- lifecycle states ----
  const existingLS: Json[] = await pg(
    "GET",
    `/data_object_lifecycle_states?data_object_id=in.(499,500,501,502,503,504,506)&select=data_object_id,state_name`,
  );
  const lsSeen = new Set(existingLS.map((r) => `${r.data_object_id}|${r.state_name}`));
  const lsToInsert = lifecycleStates.filter((r) => !lsSeen.has(`${r.data_object_id}|${r.state_name}`));
  const lsDriver = await emitDriver("ls", "/data_object_lifecycle_states", lsToInsert);
  console.log(`lifecycle_states: ${lsToInsert.length} to insert (${lsSeen.size} pre-existing) -> driver ${lsDriver}`);

  // ---- intra-domain relationships ----
  const existingRel: Json[] = await pg(
    "GET",
    `/data_object_relationships?and=(data_object_id.in.(499,500,501,502,503,504,505,506),related_data_object_id.in.(499,500,501,502,503,504,505,506))&select=data_object_id,related_data_object_id`,
  );
  const relSeen = new Set(existingRel.map((r) => `${r.data_object_id}|${r.related_data_object_id}`));
  const relToInsert = relationships.filter(
    (r) => !relSeen.has(`${r.data_object_id}|${r.related_data_object_id}`),
  );
  const relDriver = await emitDriver("rel", "/data_object_relationships", relToInsert);
  console.log(`relationships: ${relToInsert.length} to insert (${relSeen.size} pre-existing) -> driver ${relDriver}`);
}

await main();
