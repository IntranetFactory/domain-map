#!/usr/bin/env bun
// State-driven RPA audit execution (2026-06-07). Validate mode, SKILL.md Rule #21.
// Executes the additive/corrective open items from audits/RPA/state.yaml that do NOT
// require the (deferred) Phase-A module build:
//   1. entity_type classification on the 7 RPA masters (B13 / Rule #12).
//   2. catalog_tagline + catalog_description on the RPA domains row (B1A-S2 / A4 / Rule #20).
//   3. intra-domain data_object_relationships among the 7 masters (B1A-S5 / B6).
//   4. data_object_aliases (clean generic synonyms) for the masters (B1B-S8 / B11),
//      EXCLUDING the rpa_activity_logs "audit trail" collision (open b2 B2-S2).
//
// Idempotent: reads live before every write, inserts only what is missing, never
// overwrites a non-empty value. All inserts land at record_status='new' (omitted).
// No `notes` column is ever written (Rule #15). No em-dash, American English.

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

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

const RPA_DOMAIN_ID = 38;
const MASTER_IDS = [523, 524, 525, 526, 527, 528, 529];

// ------------------------------------------------------------
// 1. entity_type classification (B13 / Rule #12)
// ------------------------------------------------------------
// Deterministic from each master's description + the documented state machines
// in B1B-S9. Workflow masters have lifecycle state machines; the two append-only /
// config-shape masters (rpa_activities config-sequence, rpa_activity_logs append-only
// trace) are operational_record (Rule #12-exempt from lifecycle states).
const ENTITY_TYPES: Record<number, string> = {
  523: "operational_workflow", // rpa_bots: draft -> ... -> retired
  524: "operational_workflow", // rpa_executions: queued -> running -> completed|failed
  525: "operational_workflow", // rpa_schedules: inactive -> active -> paused -> ended
  526: "operational_record", // rpa_activities: config sequence step, no own state machine
  527: "operational_record", // rpa_activity_logs: append-only per-execution trace
  528: "operational_workflow", // rpa_bot_credentials: issued -> active -> rotating -> expired -> revoked
  529: "operational_workflow", // rpa_deployment_packages: built -> in_test -> released -> promoted -> archived
};

async function fixEntityTypes(): Promise<number> {
  const live = await get(
    `/data_objects?id=in.(${MASTER_IDS.join(",")})&select=id,data_object_name,entity_type`,
  );
  let patched = 0;
  for (const r of live) {
    const id = Number(r.id);
    const target = ENTITY_TYPES[id];
    if (!target) continue;
    if (r.entity_type === "unclassified" || r.entity_type === null) {
      await patch(`/data_objects?id=eq.${id}`, { entity_type: target });
      console.log(`  PATCH data_objects id=${id} ${r.data_object_name}: entity_type -> ${target}`);
      patched++;
    } else {
      console.log(
        `  skip data_objects id=${id} ${r.data_object_name}: entity_type already '${r.entity_type}' (non-empty, not overwritten)`,
      );
    }
  }
  return patched;
}

// ------------------------------------------------------------
// 2. catalog_tagline + catalog_description (B1A-S2 / A4 / Rule #20)
// ------------------------------------------------------------
// Buyer voice: workflow + value. No vendor/product names (Rule #18). No em-dash.
// American English. Only written if the live value is empty (never overwrites).
const CATALOG_TAGLINE =
  "Automate repetitive, rule-based work across your existing applications without changing the underlying systems.";

const CATALOG_DESCRIPTION =
  "Software robots log in to the applications your team already uses and carry out the keystrokes, " +
  "clicks, and data entry of high-volume manual processes, so people are freed from copy-and-paste work " +
  "and routine swivel-chair tasks. You design a bot once by recording or mapping the steps of a process, " +
  "then run it attended at a person's desk or unattended on a schedule. A central control surface deploys " +
  "bots, queues their work, manages the credentials they use, and keeps a full execution trail of every run. " +
  "The payoff is faster cycle times, fewer manual errors, and around-the-clock throughput on processes that " +
  "would otherwise wait for a human, all without the cost and delay of rebuilding or integrating the legacy " +
  "systems the work touches.";

async function fixCatalogUx(): Promise<number> {
  const [row] = await get(
    `/domains?id=eq.${RPA_DOMAIN_ID}&select=id,catalog_tagline,catalog_description`,
  );
  if (!row) throw new Error(`RPA domain id=${RPA_DOMAIN_ID} not found`);
  const body: Row = {};
  if (!row.catalog_tagline || String(row.catalog_tagline).trim() === "") {
    body.catalog_tagline = CATALOG_TAGLINE;
  } else {
    console.log(`  skip catalog_tagline: already non-empty (not overwritten)`);
  }
  if (!row.catalog_description || String(row.catalog_description).trim() === "") {
    body.catalog_description = CATALOG_DESCRIPTION;
  } else {
    console.log(`  skip catalog_description: already non-empty (not overwritten)`);
  }
  if (Object.keys(body).length === 0) return 0;
  await patch(`/domains?id=eq.${RPA_DOMAIN_ID}`, body);
  console.log(`  PATCH domains id=${RPA_DOMAIN_ID}: ${Object.keys(body).join(", ")}`);
  return Object.keys(body).length;
}

// ------------------------------------------------------------
// 3. intra-domain data_object_relationships among the 7 masters (B1A-S5 / B6)
// ------------------------------------------------------------
// Each row: data_object_id (source), related_data_object_id (target), relationship_verb,
// inverse_verb, relationship_type (cardinality), relationship_kind, is_required, owner_side.
// 523 rpa_bots is the hub. 528 rpa_bot_credentials is M:N with bots (many_to_many).
type RelSpec = {
  src: number;
  tgt: number;
  verb: string;
  inverse: string;
  type: string;
  kind: string;
  required: boolean;
  owner: string;
};

const RELATIONSHIPS: RelSpec[] = [
  {
    src: 523, tgt: 525, verb: "has scheduled runs", inverse: "schedules",
    type: "one_to_many", kind: "reference", required: false, owner: "target",
  },
  {
    src: 523, tgt: 524, verb: "has executions", inverse: "runs",
    type: "one_to_many", kind: "reference", required: true, owner: "target",
  },
  {
    src: 523, tgt: 526, verb: "composed of", inverse: "is_step_in",
    type: "one_to_many", kind: "composition", required: true, owner: "target",
  },
  {
    src: 524, tgt: 527, verb: "produces", inverse: "is_traced_by",
    type: "one_to_many", kind: "composition", required: false, owner: "target",
  },
  {
    src: 523, tgt: 529, verb: "packaged into", inverse: "packages",
    type: "one_to_many", kind: "reference", required: false, owner: "target",
  },
  {
    src: 523, tgt: 528, verb: "uses credentials", inverse: "is_used_by",
    type: "many_to_many", kind: "reference", required: false, owner: "source",
  },
  {
    src: 526, tgt: 527, verb: "traced by", inverse: "records",
    type: "one_to_many", kind: "reference", required: false, owner: "target",
  },
];

const NAME_BY_ID: Record<number, string> = {
  523: "rpa_bots",
  524: "rpa_executions",
  525: "rpa_schedules",
  526: "rpa_activities",
  527: "rpa_activity_logs",
  528: "rpa_bot_credentials",
  529: "rpa_deployment_packages",
};

async function fixRelationships(): Promise<number> {
  const live = await get(
    `/data_object_relationships?data_object_id=in.(${MASTER_IDS.join(",")})&select=id,data_object_id,related_data_object_id,relationship_verb`,
  );
  const liveKeys = new Set(
    live.map(r => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`),
  );
  const missing = RELATIONSHIPS.filter(
    r => !liveKeys.has(`${r.src}|${r.tgt}|${r.verb}`),
  );
  if (missing.length === 0) {
    console.log("  data_object_relationships: all 7 already present, nothing to insert");
    return 0;
  }
  const rows: Row[] = missing.map(r => ({
    data_object_id: r.src,
    related_data_object_id: r.tgt,
    relationship_verb: r.verb,
    inverse_verb: r.inverse,
    relationship_type: r.type,
    relationship_kind: r.kind,
    is_required: r.required,
    owner_side: r.owner,
  }));
  await insert("/data_object_relationships", rows);
  for (const r of missing) {
    console.log(`  INSERT rel: ${NAME_BY_ID[r.src]} ${r.verb} ${NAME_BY_ID[r.tgt]} (${r.type})`);
  }
  return missing.length;
}

// ------------------------------------------------------------
// 4. data_object_aliases (B1B-S8 / B11) -- clean generic synonyms only
// ------------------------------------------------------------
// EXCLUDES the "audit trail" alias for rpa_activity_logs (open collision B2-S2 with
// AUDIT's audit_findings) -- only the non-colliding "execution log" / "bot trace" go in.
// No vendor/product names in the alias text (generic, cross-vendor synonyms).
const ALIASES: Array<{ data_object_id: number; alias_name: string }> = [
  { data_object_id: 523, alias_name: "software robot" },
  { data_object_id: 523, alias_name: "digital worker" },
  { data_object_id: 523, alias_name: "attended bot" },
  { data_object_id: 523, alias_name: "unattended bot" },
  { data_object_id: 524, alias_name: "bot run" },
  { data_object_id: 524, alias_name: "job run" },
  { data_object_id: 524, alias_name: "process instance" },
  { data_object_id: 525, alias_name: "job schedule" },
  { data_object_id: 525, alias_name: "queue trigger" },
  { data_object_id: 526, alias_name: "automation step" },
  { data_object_id: 526, alias_name: "workflow component" },
  { data_object_id: 527, alias_name: "execution log" },
  { data_object_id: 527, alias_name: "bot trace" },
  { data_object_id: 528, alias_name: "vault entry" },
  { data_object_id: 528, alias_name: "robot credential" },
  { data_object_id: 529, alias_name: "process package" },
  { data_object_id: 529, alias_name: "automation package" },
];

async function fixAliases(): Promise<number> {
  const live = await get(
    `/data_object_aliases?data_object_id=in.(${MASTER_IDS.join(",")})&select=id,data_object_id,alias_name`,
  );
  const liveKeys = new Set(
    live.map(r => `${r.data_object_id}|${String(r.alias_name).toLowerCase()}`),
  );
  const missing = ALIASES.filter(
    a => !liveKeys.has(`${a.data_object_id}|${a.alias_name.toLowerCase()}`),
  );
  if (missing.length === 0) {
    console.log("  data_object_aliases: all clean synonyms already present, nothing to insert");
    return 0;
  }
  const rows: Row[] = missing.map(a => ({
    data_object_id: a.data_object_id,
    alias_name: a.alias_name,
    alias_type: "synonym",
    is_preferred: false,
  }));
  await insert("/data_object_aliases", rows);
  for (const a of missing) {
    console.log(`  INSERT alias: ${NAME_BY_ID[a.data_object_id]} <- "${a.alias_name}"`);
  }
  return missing.length;
}

// ------------------------------------------------------------
async function main() {
  console.log("== RPA state-driven audit execution 2026-06-07 ==\n");

  console.log("[1] entity_type classification (B13 / Rule #12)");
  const nEntity = await fixEntityTypes();

  console.log("\n[2] catalog_tagline + catalog_description (B1A-S2 / Rule #20)");
  const nUx = await fixCatalogUx();

  console.log("\n[3] intra-domain data_object_relationships (B1A-S5 / B6)");
  const nRel = await fixRelationships();

  console.log("\n[4] data_object_aliases clean synonyms (B1B-S8 / B11)");
  const nAlias = await fixAliases();

  console.log("\n== Summary ==");
  console.log(`  entity_type PATCHed:            ${nEntity}`);
  console.log(`  catalog UX fields PATCHed:      ${nUx}`);
  console.log(`  relationships inserted:         ${nRel}`);
  console.log(`  aliases inserted:               ${nAlias}`);

  console.log("\n== UI links ==");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domains");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
