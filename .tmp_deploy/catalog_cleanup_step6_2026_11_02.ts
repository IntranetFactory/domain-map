#!/usr/bin/env bun
// Step 6 of plans/blueprint-external-links-plan.md (user: "apply all", 2026-11-02):
//   A  users links: many_to_many references become one person per record, as q3 did for ATS
//   B  owner_side: 470 links whose cardinality and owner_side disagree, each decided by meaning
//      (q4 rows as drafted in audits/ATS/history.md; the rest from the decisions file)
//   C  composition: an optional link whose child has no other parent becomes required; a link whose
//      child has several possible parents becomes a reference, because two `parent` fields cannot
//      both be mandatory
//   D  descriptions that R7 flags
// Backs up every touched row first. record_status is never sent. Idempotent: rows already correct
// are skipped. Dry-run by default; pass --apply to write. Prevention rules are a separate script.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

type Row = Record<string, any>;
const APPLY = process.argv.includes("--apply");
const DECISIONS = process.argv.find((a) => a.endsWith(".json"));
if (!DECISIONS) throw new Error("pass the decisions json path");
const BACKUP = "backups/catalog-cleanup-step6-2026-11-02.json";

async function semantius(tool: string, body: unknown): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  if ((await proc.exited) !== 0) throw new Error(`semantius ${tool} failed: ${stderr || stdout}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}
const get = (path: string) => semantius("postgrestRequest", { method: "GET", path });
const patch = (path: string, body: Row) => semantius("postgrestRequest", { method: "PATCH", path, body });

const rels: Row[] = await get("/data_object_relationships?select=*&order=id&limit=100000");
const objs: Row[] = await get("/data_objects?select=id,data_object_name&limit=100000");
const name = new Map(objs.map((o) => [o.id, o.data_object_name]));
const USERS = objs.find((o) => o.data_object_name === "users")!.id;
const byId = new Map(rels.map((r) => [r.id, r]));
const updates = new Map<number, Row>();
const merge = (id: number, body: Row) => updates.set(id, { ...(updates.get(id) ?? {}), ...body });
const view = (id: number): Row => ({ ...byId.get(id)!, ...(updates.get(id) ?? {}) });

// ---------- A: users links ----------
const isUsersM2mRef = (r: Row) => r.relationship_type === "many_to_many" && r.relationship_kind === "reference" && (r.data_object_id === USERS || r.related_data_object_id === USERS);
// Blank verbs: authored here, because the catalog gives no role to swap.
const BLANK_VERBS: Record<number, [string, string]> = {
  1847: ["uses", "is used by"],
  1848: ["enrolls", "is enrolled by"],
  1849: ["issues", "is issued by"],
  1850: ["owns", "is owned by"],
  1851: ["owns", "is owned by"],
  1852: ["publishes", "is published by"],
};
// A genuinely many-person link stays many_to_many, as an association rather than a reference.
const MANY_PEOPLE = new Set([1062, 1666]);
// `assignees <table>` is not a verb; the link is now one assignee per record.
const ASSIGNEE_VERB = new Set([1579, 1581, 1582, 1584]);
let usersCount = 0;
for (const r of rels.filter(isUsersM2mRef)) {
  usersCount++;
  if (MANY_PEOPLE.has(r.id)) {
    merge(r.id, { relationship_kind: "association" });
    continue;
  }
  const fromUsers = r.data_object_id === USERS;
  const entity = fromUsers ? r.related_data_object_id : r.data_object_id;
  let verb = fromUsers ? r.relationship_verb : r.inverse_verb;
  let inverse = fromUsers ? r.inverse_verb : r.relationship_verb;
  if (BLANK_VERBS[r.id]) [verb, inverse] = BLANK_VERBS[r.id];
  if (ASSIGNEE_VERB.has(r.id)) verb = "is assigned";
  if (!String(verb ?? "").trim() || !String(inverse ?? "").trim()) throw new Error(`users link ${r.id} has a blank verb`);
  merge(r.id, { data_object_id: USERS, related_data_object_id: entity, relationship_type: "one_to_many", relationship_verb: verb, inverse_verb: inverse, owner_side: "source" });
}

// ---------- B: owner_side ----------
const reorient = (r: Row, verb: string, inverse: string): Row => ({
  data_object_id: r.related_data_object_id,
  related_data_object_id: r.data_object_id,
  relationship_type: "one_to_many",
  relationship_verb: verb,
  inverse_verb: inverse,
  owner_side: "source",
});
// q4, as drafted in audits/ATS/history.md.
for (const id of [810, 812, 813, 814, 1295, 1297, 1299, 1303]) merge(id, { owner_side: "source" });
merge(1316, { owner_side: "source", relationship_verb: "receives" });
merge(811, reorient(byId.get(811)!, "is referred through", "introduces"));

const decisions: { id: number; parent: "source" | "target"; verb_ok: boolean; confidence: string; note?: string }[] = JSON.parse(readFileSync(DECISIONS, "utf8"));
const conflict = (r: Row) => (r.relationship_type === "one_to_many" && r.owner_side === "target") || (r.relationship_type === "many_to_one" && r.owner_side === "source");
let ownerCount = 0;
for (const d of decisions) {
  const r = byId.get(d.id);
  if (!r || !conflict(r)) continue;
  ownerCount++;
  // Neither end is the one side: many on each. Nothing to flip, and no single field to place.
  if (/really many-to-many/i.test(d.note ?? "")) {
    merge(d.id, { relationship_type: "many_to_many", owner_side: "source" });
    continue;
  }
  if (d.parent === "source") {
    merge(d.id, { owner_side: "source", ...(d.verb_ok ? {} : { relationship_verb: r.inverse_verb, inverse_verb: r.relationship_verb }) });
  } else {
    // `to` is the parent. The row flips, so the inverse verb becomes the forward one, unless the
    // verbs were stored the wrong way round to begin with.
    merge(d.id, d.verb_ok ? reorient(r, r.inverse_verb, r.relationship_verb) : reorient(r, r.relationship_verb, r.inverse_verb));
  }
}

// ---------- C: composition, read through the updates above ----------
const child = (r: Row) => (r.relationship_type === "one_to_many" ? r.related_data_object_id : r.relationship_type === "many_to_one" ? r.data_object_id : r.owner_side === "target" ? r.data_object_id : r.related_data_object_id);
const comps = rels.map((r) => view(r.id)).filter((r) => r.relationship_kind === "composition");
const parentsByChild = new Map<number, number>();
for (const r of comps) parentsByChild.set(child(r), (parentsByChild.get(child(r)) ?? 0) + 1);
let madeRequired = 0;
const madeReference: string[] = [];
for (const r of comps) {
  if (r.is_required !== false) continue;
  if ((parentsByChild.get(child(r)) ?? 0) === 1) {
    merge(r.id, { is_required: true });
    madeRequired++;
  } else {
    merge(r.id, { relationship_kind: "reference" });
    madeReference.push(`${r.id} ${name.get(r.data_object_id)} ${r.relationship_verb} ${name.get(r.related_data_object_id)}`);
  }
}

// ---------- D: descriptions R7 flags ----------
const modules: Row[] = await get("/domain_modules?select=id,domain_module_code,description,catalog_description&domain_module_code=in.(ITOM-OPS-AUTOMATION,RMM-AUTOMATION)");
const moduleUpdates: { id: number; code: string; body: Row }[] = [];
const itom = modules.find((m) => m.domain_module_code === "ITOM-OPS-AUTOMATION");
if (itom && String(itom.description).includes("executed with approval gates for common")) {
  moduleUpdates.push({ id: itom.id, code: itom.domain_module_code, body: { description: String(itom.description).replace("executed with approval gates for common", "for common") } });
}
const rmm = modules.find((m) => m.domain_module_code === "RMM-AUTOMATION");
const RMM_SENTENCE = " Approval gates keep risky changes from reaching endpoints before a human has signed off.";
if (rmm && String(rmm.catalog_description).includes(RMM_SENTENCE)) {
  moduleUpdates.push({ id: rmm.id, code: rmm.domain_module_code, body: { catalog_description: String(rmm.catalog_description).replace(RMM_SENTENCE, "") } });
}

// ---------- report ----------
const changed = [...updates.entries()].filter(([id, body]) => Object.entries(body).some(([k, v]) => byId.get(id)![k] !== v));
console.log(`mode: ${APPLY ? "APPLY" : "dry-run"}`);
console.log(`A users links: ${usersCount}`);
console.log(`B owner_side: ${ownerCount} from decisions, plus q4; low confidence: ${decisions.filter((d) => d.confidence === "low").length}`);
console.log(`C composition: ${madeRequired} made required, ${madeReference.length} made reference`);
for (const m of madeReference) console.log(`    ${m}`);
console.log(`D descriptions: ${moduleUpdates.map((m) => m.code).join(", ") || "none"}`);
console.log(`rows to write: ${changed.length} relationships, ${moduleUpdates.length} modules`);
if (!APPLY) process.exit(0);

// ---------- back up first, never overwriting an earlier backup ----------
if (!existsSync(BACKUP)) {
  writeFileSync(BACKUP, JSON.stringify({ taken_at: new Date().toISOString(), data_object_relationships: changed.map(([id]) => byId.get(id)), domain_modules: modules }));
  console.log(`backup written: ${BACKUP}`);
}

// ---------- apply, 8 at a time ----------
const failed: string[] = [];
let done = 0;
for (let i = 0; i < changed.length; i += 8) {
  await Promise.all(
    changed.slice(i, i + 8).map(async ([id, body]) => {
      try {
        await patch(`/data_object_relationships?id=eq.${id}`, body);
        done++;
      } catch (e) {
        failed.push(`${id}: ${(e as Error).message.slice(0, 200)}`);
      }
    }),
  );
}
for (const m of moduleUpdates) await patch(`/domain_modules?id=eq.${m.id}`, m.body);
console.log(`written: ${done} of ${changed.length}; failed: ${failed.length}`);
for (const f of failed) console.log(`  ${f}`);
