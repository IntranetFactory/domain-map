#!/usr/bin/env bun
/**
 * b9d_resolver.ts -- committed, bidirectional B9d cross-domain payload-realization resolver.
 *
 * Supersedes the B9d role of validate_cross_domain.ts (which is read-only and one-directional).
 * Plan of record: plans/b9d-reconciliation-handoff-brief.md (attempt #9), corrected against the
 * live catalog by the 2026-06-10 deep review. Where the plan's worked-instance values disagree
 * with the live tenant, this resolver follows the live tenant; the divergences are documented
 * inline (search "REVIEW:").
 *
 * What it does (the split-brain fix):
 *   For a domain D, walk EVERY boundary handoff D touches (D as source OR target), BOTH
 *   directions. For each distinct unrealized cross-domain process on those boundaries, determine
 *   the OWNER from the carried entity's mastery, and record a durable obligation in the OWNER's
 *   audit files -- whichever side the owner is. Nothing is "report-only" for ownership.
 *
 * Grain (REVIEW fix, the killer the plan missed): one finding per (process_id, owner_domain),
 * NOT per process_id. Live, a single process_id carries entities mastered by DIFFERENT domains
 * (980 -> SWP/PA/PSA; 1052 -> BEN-ADMIN/PAYROLL), so a per-process key cannot route to multiple
 * owners. The owner item id is B2-B9D-OWN-<process_id>; it is unique WITHIN an owner's file, and
 * the same process legitimately produces one item in each distinct owner's file.
 *
 * Writes AUDIT FILES ONLY. Never writes catalog rows, never touches record_status (Rule #1).
 * Destructive edits (re-point/delete a handoff_processes tag, overwrite an inverted legacy audit
 * item) are surfaced for sign-off, never applied unprompted (Rule #21).
 *
 * Run from the project root (semantius reads .env from cwd):
 *   bun run scripts/analytics/b9d_resolver.ts <DOMAIN_CODE> [--dry-run] [--write]
 *   bun run scripts/analytics/b9d_resolver.ts ATS --dry-run
 *
 * --dry-run (default): classify the full boundary, print every intended owner-file edit. No writes.
 * --write:             apply the additive owner-side b2 + q edits to local audit files.
 *                      Destructive proposals (ROLL-UP re-point, MIS-TAG, legacy migration) are
 *                      printed for sign-off and NOT applied.
 */
export {};
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { pg } from "../lib/catalog";

// ----------------------------------------------------------------------------- args
const argv = process.argv.slice(2);
const DOMAIN_CODE = (argv.find((a) => !a.startsWith("--")) ?? "").toUpperCase();
const WRITE = argv.includes("--write");
const MIGRATE = argv.includes("--migrate-legacy");
const DRY = !WRITE || argv.includes("--dry-run");
if (!DOMAIN_CODE && !MIGRATE) {
  console.error("usage: bun run scripts/analytics/b9d_resolver.ts <DOMAIN_CODE> [--dry-run|--write]");
  console.error("       bun run scripts/analytics/b9d_resolver.ts --migrate-legacy   (scan inverted legacy records)");
  process.exit(1);
}
const AUDITS = "c:/dev/domain-map/audits";
const SECTION = /^(b1a|b1b|b2|b3):/;

// ----------------------------------------------------------------------------- read layer
type Row = Record<string, any>;
const get = (path: string) => pg("GET", path) as Promise<Row[]>;

console.error(`b9d_resolver: ${DOMAIN_CODE} (${WRITE ? "WRITE" : "DRY-RUN"})`);

const [
  domains, domainModules, dataObjects, processes,
  dmdoMasters, lifecycleGated, raci, domainRoles, roleModules, boundaryTags,
] = await Promise.all([
  get("/domains?select=id,domain_code,domain_name,domain_kind&limit=10000"),
  get("/domain_modules?select=id,domain_id,domain_module_code&limit=20000"),
  get("/data_objects?select=id,data_object_name,singular_label,entity_type&limit=20000"),
  get("/processes?select=id,process_code,process_name,hierarchy_level&limit=20000"),
  get("/domain_module_data_objects?role=in.(master,embedded_master)&select=data_object_id,role,domain_module_id&limit=20000"),
  // gated states only: a process is realizable on an entity when it has a permission-gated state.
  get("/data_object_lifecycle_states?requires_permission=eq.true&process_id=not.is.null&select=process_id,data_object_id,state_name&limit=20000"),
  get("/process_raci?select=process_id,actor_role_id,raci&limit=20000"),
  get("/domain_roles?select=id,role_name&limit=20000"),
  get("/role_modules?select=role_id,domain_module_id&limit=20000"),
  // every cross-domain handoff_processes tag, with its handoff endpoints + carried payload entity.
  get("/handoff_processes?select=id,process_id,record_status,proposal_source,handoff:handoffs!inner(id,source_domain_id,target_domain_id,data_object_id,trigger_events(event_name))&limit=40000"),
]);

// ----------------------------------------------------------------------------- indices
const domainById = new Map<number, Row>(domains.map((d) => [d.id, d]));
const domainByCode = new Map<string, Row>(domains.map((d) => [d.domain_code, d]));
const moduleById = new Map<number, Row>(domainModules.map((m) => [m.id, m]));
const doById = new Map<number, Row>(dataObjects.map((d) => [d.id, d]));
const procById = new Map<number, Row>(processes.map((p) => [p.id, p]));
const roleNameById = new Map<number, string>(domainRoles.map((r) => [r.id, r.role_name]));

// ----------------------------------------------------------------------------- --migrate-legacy (read-only scan)
// The 8 prior outbound-only runs seeded INVERTED B9d records ("owed by <target>" / "owed to <X>")
// that a naive idempotency check would preserve. This scan enumerates every legacy B9d audit item
// across the corpus and its disposition. It NEVER writes (removal is destructive: Rule #21). The
// canonical replacement is the per-domain resolver run (B2-B9D-OWN-<process_id> on the true owner).
if (MIGRATE) {
  const dirs = readdirSync(AUDITS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const ID_RE = /^\s*-\s*id:\s*([A-Za-z0-9_-]+)\s*$/;
  const HEADER = "=".repeat(92);
  console.log(`${HEADER}\nB9d LEGACY MIGRATION SCAN (read-only; nothing written)\n${HEADER}`);
  console.log(`Canonical replacement for every item below = a per-domain resolver run that writes`);
  console.log(`B2-B9D-OWN-<process_id> onto the TRUE owner (carried-entity mastery). Removing the`);
  console.log(`legacy item is DESTRUCTIVE and needs your sign-off.\n`);
  let total = 0, inverted = 0, verify = 0, pending = 0;
  for (const dir of dirs) {
    const path = `${AUDITS}/${dir}/state.yaml`;
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    const lines = raw.split(/\r?\n/);
    const hits: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(ID_RE);
      if (!m) continue;
      const id = m[1];
      if (!/B9D/i.test(id)) continue;
      if (/^B2-B9D-OWN-/.test(id)) continue; // canonical, not legacy
      // capture the block (until next id / section / EOF) to detect the inverted shape
      let j = i + 1, block = "";
      for (; j < lines.length; j++) { if (ID_RE.test(lines[j]) || SECTION.test(lines[j])) break; block += lines[j] + "\n"; }
      void block; // (kept for future content-based checks)
      // INVERTED = the bad creditor-direction id pattern: B1B-B9D-OWED-<X> / B1B-B9D-ORPHANS.
      // NOT a MISTAG/RETAG/CROSS-OWED (those are valid pending source-side or surfaced items).
      const isInverted = /-OWED-|-ORPHANS\b/i.test(id);
      const isVerify = /B9D-VERIFY/i.test(id);
      const isPending = /MISTAG|RETAG|CROSS-OWED/i.test(id);
      let disp: string;
      if (isInverted) { disp = "INVERTED: re-home each process to its true owner (resolver), then DELETE this record."; inverted++; }
      else if (isVerify) { disp = "SUPERSEDED: replace with a committed resolver run (and the old b1b wording is illegal)."; verify++; }
      else if (isPending) { disp = "VALID pending B9d item (source-side tag fix / surfaced cross-owed): keep; resolve on sign-off."; pending++; }
      else disp = "LEGACY B9d record: review, supersede with the resolver run, then DELETE.";
      hits.push(`    ${id.padEnd(26)} -> ${disp}`);
      total++;
    }
    if (hits.length) { console.log(`### ${dir}`); for (const h of hits) console.log(h); }
  }
  console.log(`\n${HEADER}`);
  console.log(`legacy B9d items found: ${total}  (inverted creditor/debtor: ${inverted}, stale VERIFY: ${verify}, valid pending: ${pending})`);
  console.log(`Disposition needs sign-off. Recommended order: run the resolver --write on each true owner`);
  console.log(`(or catalog-wide) so the canonical B2-B9D-OWN-* items exist, THEN approve deletion of the`);
  console.log(`legacy items above so no inverted record survives.`);
  process.exit(0);
}

const D = domainByCode.get(DOMAIN_CODE);
if (!D) { console.error(`unknown domain_code ${DOMAIN_CODE}`); process.exit(1); }
// bundle-domains master nothing, so they own no handoff payloads and have no B9d work to resolve
// (and can never be routed an owner item, since owner routing follows carried-entity mastery).
// Exclude them explicitly (plan §4). Inert until §3.
if (D.domain_kind === "bundle") {
  console.error(`${DOMAIN_CODE} is domain_kind='bundle' (masters nothing); B9d is N/A for bundles. Nothing to resolve.`);
  process.exit(0);
}
const DID = D.id as number;

// modules per domain
const modulesByDomain = new Map<number, Set<number>>();
for (const m of domainModules) {
  if (m.domain_id == null) continue;
  if (!modulesByDomain.has(m.domain_id)) modulesByDomain.set(m.domain_id, new Set());
  modulesByDomain.get(m.domain_id)!.add(m.id);
}

// carried-entity mastery -> domain ids that master each data_object (REVIEW: may be >1)
const masterDomainsOfDO = new Map<number, { domain: number; role: string }[]>();
for (const r of dmdoMasters) {
  const mod = moduleById.get(r.domain_module_id);
  const dom = mod?.domain_id;
  if (dom == null) continue;
  if (!masterDomainsOfDO.has(r.data_object_id)) masterDomainsOfDO.set(r.data_object_id, []);
  masterDomainsOfDO.get(r.data_object_id)!.push({ domain: dom, role: r.role });
}

// realized set: process_id that has a gated state AND >=1 responsible AND >=1 accountable.
const gatedEntitiesByProcess = new Map<number, Set<number>>(); // process_id -> data_object_ids it gates
for (const s of lifecycleGated) {
  if (!gatedEntitiesByProcess.has(s.process_id)) gatedEntitiesByProcess.set(s.process_id, new Set());
  gatedEntitiesByProcess.get(s.process_id)!.add(s.data_object_id);
}
const raciByProcess = new Map<number, { responsible: number[]; accountable: number[] }>();
for (const r of raci) {
  if (!raciByProcess.has(r.process_id)) raciByProcess.set(r.process_id, { responsible: [], accountable: [] });
  const bucket = raciByProcess.get(r.process_id)!;
  if (r.raci === "responsible" && r.actor_role_id != null) bucket.responsible.push(r.actor_role_id);
  if (r.raci === "accountable" && r.actor_role_id != null) bucket.accountable.push(r.actor_role_id);
}
const hasRA = (pid: number) => {
  const b = raciByProcess.get(pid);
  return !!b && b.responsible.length > 0 && b.accountable.length > 0;
};
const isRealized = (pid: number) => gatedEntitiesByProcess.has(pid) && hasRA(pid);

// reach -> built domains
const reachedModules = new Set<number>(roleModules.map((r) => r.domain_module_id));
const isBuilt = (domainId: number) => {
  const mods = modulesByDomain.get(domainId);
  if (!mods) return false;
  for (const m of mods) if (reachedModules.has(m)) return true;
  return false;
};

// ----------------------------------------------------------------------------- helpers
const code = (pid: number) => String(procById.get(pid)?.process_code ?? "");
const pname = (pid: number) => String(procById.get(pid)?.process_name ?? "");
const isAnc = (a: string, b: string) => !!a && !!b && (a === b || b.startsWith(a + "."));
const segs = (c: string) => c.split(".").length;
const firstSeg = (c: string) => c.split(".")[0];
const domName = (domId: number) => String(domainById.get(domId)?.domain_name ?? domainById.get(domId)?.domain_code ?? `domain ${domId}`);
const domCode = (domId: number) => String(domainById.get(domId)?.domain_code ?? domId);

// owner of a carried entity. Returns {domain, ambiguous, none}. When several domains master it,
// pick the one whose realized processes share the tag's APQC category; else flag ambiguous.
function ownerOfPayload(doId: number, tagCode: string): { domain: number | null; note: string } {
  const masters = masterDomainsOfDO.get(doId) ?? [];
  if (masters.length === 0) return { domain: null, note: "no-master" };
  // prefer role=master over embedded_master
  const realMasters = masters.filter((m) => m.role === "master");
  const pool = realMasters.length ? realMasters : masters;
  const uniq = [...new Set(pool.map((m) => m.domain))];
  if (uniq.length === 1) return { domain: uniq[0], note: pool[0].role };
  // multiple masters: disambiguate by APQC category of each candidate's realized set
  const cat = firstSeg(tagCode);
  const matches = uniq.filter((dom) => {
    // does this domain realize anything in category `cat`?
    for (const [pid, ents] of gatedEntitiesByProcess) {
      if (!isRealized(pid)) continue;
      if (firstSeg(code(pid)) !== cat) continue;
      for (const e of ents) if ((masterDomainsOfDO.get(e) ?? []).some((m) => m.domain === dom)) return true;
    }
    return false;
  });
  if (matches.length === 1) return { domain: matches[0], note: `multi-master, category-${cat} match` };
  return { domain: uniq[0], note: `AMBIGUOUS multi-master ${uniq.map(domCode).join("/")}` };
}

// realized sibling for persona mirroring: prefer a realized process gating the SAME carried
// entity; else nearest realized ancestor/descendant by code distance among the owner's realized set.
function siblingFor(ownerDom: number, payloadDO: number, tagCode: string): { pid: number; sameEntity: boolean } | null {
  const ownerMods = modulesByDomain.get(ownerDom) ?? new Set();
  const ownerRealized: number[] = [];
  for (const [pid, ents] of gatedEntitiesByProcess) {
    if (!isRealized(pid)) continue;
    // realized "by this owner" = the gated entity is mastered by ownerDom
    const ownedHere = [...ents].some((e) => (masterDomainsOfDO.get(e) ?? []).some((m) => m.domain === ownerDom));
    if (ownedHere) ownerRealized.push(pid);
  }
  // same-entity sibling (strongest signal)
  const sameEnt = ownerRealized.filter((pid) => gatedEntitiesByProcess.get(pid)!.has(payloadDO));
  if (sameEnt.length) return { pid: sameEnt[0], sameEntity: true };
  // nearest by dotted-code distance, restricted to ancestor/descendant
  const rel = ownerRealized
    .filter((pid) => isAnc(code(pid), tagCode) || isAnc(tagCode, code(pid)))
    .sort((a, b) => Math.abs(segs(code(a)) - segs(tagCode)) - Math.abs(segs(code(b)) - segs(tagCode)));
  if (rel.length) return { pid: rel[0], sameEntity: false };
  return null;
}

function raPair(pid: number): { r: string | null; a: string | null } {
  const b = raciByProcess.get(pid);
  return {
    r: b?.responsible.length ? roleNameById.get(b.responsible[0]) ?? null : null,
    a: b?.accountable.length ? roleNameById.get(b.accountable[0]) ?? null : null,
  };
}

// deterministic plain gloss of a process_name -- NON-authoring (lowercase lead, '/' -> ' or ',
// drop a trailing " and plan"/" and plans"). REVIEW: the plan called this a "gloss" (an LLM step);
// here it is a fixed string transform so the resolver stays deterministic.
function work(pid: number): string {
  let s = pname(pid).trim();
  s = s.replace(/\s+and\s+plans?$/i, "");
  s = s.replace(/\//g, " or ");
  if (s.length > 1) s = s[0].toLowerCase() + s.slice(1);
  return s;
}

const BANNED = [
  /\bprocess[_ ]?key\b/i, /\bORPHAN\b/, /\bROLL-?UP\b/, /\bMIS-?TAG\b/, /\brealize[ds]?\b/i,
  /\bRACI\b/, /\bpersona pool\b/i, /\bb1[ab]\b/i, /\bb2\b/i, /\bB9d\b/i, /\bPHASE-P\b/i,
  /\bgated? state\b/i, /\bdata[_ ]object\b/i, /\bhandoff\b/i, /\bpayload\b/i,
  /\bembedded_master\b/i, /\bdomain[_ ]module\b/i, /\breach the\b/i, /\b\d+\.\d+(\.\d+)*\b/,
];
function lintHuman(text: string): string[] {
  return BANNED.filter((re) => re.test(text)).map((re) => String(re));
}

// ----------------------------------------------------------------------------- classify
type Cls = "RESOLVED" | "ROLL-UP" | "REFERENCE-READ" | "ORPHAN" | "MIS-TAG" | "RE-TAG" | "UNOWNED";
type Finding = {
  process_id: number;
  owner: number | null;
  ownerNote: string;
  cls: Cls;
  payloadDOs: Set<number>;
  handoffs: { id: number; src: number; tgt: number; dir: "in" | "out"; senderTagOwns: boolean }[];
  rollupTo?: number;
  built?: boolean;
};

// boundary = every cross-domain handoff_processes tag where D is an endpoint.
const boundary = boundaryTags.filter((hp) => {
  const h = hp.handoff;
  return h && h.source_domain_id !== h.target_domain_id && (h.source_domain_id === DID || h.target_domain_id === DID);
});

// group tags by (process_id, owner_domain). owner derived from the carried entity, NOT the tag.
const groups = new Map<string, Finding>();
for (const hp of boundary) {
  const pid = hp.process_id as number;
  const h = hp.handoff;
  const payloadDO = h.data_object_id as number;
  const tagCode = code(pid);
  const own = ownerOfPayload(payloadDO, tagCode);
  const key = `${pid}|${own.domain ?? "none"}`;
  if (!groups.has(key)) {
    groups.set(key, {
      process_id: pid, owner: own.domain, ownerNote: own.note, cls: "ORPHAN",
      payloadDOs: new Set(), handoffs: [],
    });
  }
  const f = groups.get(key)!;
  f.payloadDOs.add(payloadDO);
  const dir: "in" | "out" = h.target_domain_id === DID ? "in" : "out";
  // sender owns the tag-row edit (re-point/delete) -- the source domain authored the tag.
  const senderTagOwns = own.domain != null && own.domain === h.source_domain_id;
  f.handoffs.push({ id: h.id, src: h.source_domain_id, tgt: h.target_domain_id, dir, senderTagOwns });
}

// precompute: for each carried entity, the UNREALIZED process tags on this boundary.
// Used to detect a coarser tag superseded by a more-specific tag on the same entity (RE-TAG).
const unrealizedTagsByEntity = new Map<number, Set<number>>();
for (const hp of boundary) {
  const pid = hp.process_id as number;
  if (isRealized(pid)) continue;
  const doId = hp.handoff.data_object_id as number;
  if (!unrealizedTagsByEntity.has(doId)) unrealizedTagsByEntity.set(doId, new Set());
  unrealizedTagsByEntity.get(doId)!.add(pid);
}
// the realized "home" of an entity: a realized process that gates it.
function realizedHomeOf(doId: number): number | null {
  for (const [rid, ents] of gatedEntitiesByProcess) {
    if (isRealized(rid) && ents.has(doId)) return rid;
  }
  return null;
}

for (const f of groups.values()) {
  const pid = f.process_id;
  const tagCode = code(pid);
  // 1. RESOLVED
  if (isRealized(pid)) { f.cls = "RESOLVED"; continue; }
  // 2. ROLL-UP (entity-family guarded): a strict ancestor/descendant is realized AND its gated
  //    entity is in the same family (same entity, or mastered by the same domain) as a payload.
  let rollup: number | null = null;
  for (const [rid, ents] of gatedEntitiesByProcess) {
    if (rid === pid || !isRealized(rid)) continue;
    const rcode = code(rid);
    if (!(isAnc(rcode, tagCode) || isAnc(tagCode, rcode))) continue;
    const sameFamily = [...ents].some((e) => {
      if (f.payloadDOs.has(e)) return true;
      const eOwners = (masterDomainsOfDO.get(e) ?? []).map((m) => m.domain);
      for (const p of f.payloadDOs) {
        const pOwners = (masterDomainsOfDO.get(p) ?? []).map((m) => m.domain);
        if (eOwners.some((x) => pOwners.includes(x))) return true;
      }
      return false;
    });
    if (sameFamily) { rollup = rid; break; }
  }
  if (rollup != null) { f.cls = "ROLL-UP"; f.rollupTo = rollup; continue; }
  // 3. UNOWNED: carried entity has no master row. Never silently drop (REVIEW: do277 on 905).
  if (f.owner == null) { f.cls = "UNOWNED"; continue; }
  // 4. REFERENCE-READ: carried entity is config/reference data, not a workflow. Not gate-able.
  const allRef = [...f.payloadDOs].every((d) => ["catalog", "reference"].includes(String(doById.get(d)?.entity_type)));
  if (allRef) { f.cls = "REFERENCE-READ"; continue; }
  // 5. MIS-TAG: the carried entity already has a realized home under a process that is NOT an
  //    ancestor/descendant of this tag. The tag points at the wrong process for an entity that is
  //    already realized elsewhere. Source re-points/deletes (sign-off). NOT firing when the owner
  //    is merely unbuilt -- this requires a POSITIVE realized home, never "owner realizes nothing"
  //    (REVIEW: that false-positive wrongly flagged SWP 980; this rule leaves it an ORPHAN).
  //    background_checks (realized under 1020) tagged 7.4, and candidates (realized under 220)
  //    tagged 7.3, both land here.
  let misHome: number | null = null;
  for (const p of f.payloadDOs) {
    const home = realizedHomeOf(p);
    if (home != null && !(isAnc(code(home), tagCode) || isAnc(tagCode, code(home)))) { misHome = home; break; }
  }
  if (misHome != null) { f.cls = "MIS-TAG"; f.rollupTo = misHome; continue; }
  // 6. RE-TAG: a more specific (deeper-code) UNREALIZED tag exists on the same carried entity on
  //    this boundary. This coarser tag should re-point to the specific one on the source. (7.3/41
  //    on benefit_enrollments -> 7.5.2.2/1052.)
  let deeper: number | null = null;
  for (const p of f.payloadDOs) {
    for (const other of unrealizedTagsByEntity.get(p) ?? []) {
      if (other !== pid && segs(code(other)) > segs(tagCode) && (masterDomainsOfDO.get(p) ?? []).some((m) => m.domain === f.owner)) { deeper = other; break; }
    }
    if (deeper != null) break;
  }
  if (deeper != null) { f.cls = "RE-TAG"; f.rollupTo = deeper; continue; }
  // 7. ORPHAN: real missing work owned here.
  f.cls = "ORPHAN";
  f.built = isBuilt(f.owner);
}

// ----------------------------------------------------------------------------- q rendering
function entityPhrase(dos: Set<number>): string {
  const labels = [...dos].map((d) => String(doById.get(d)?.singular_label ?? doById.get(d)?.data_object_name ?? `item ${d}`));
  return labels[0] ?? "this record";
}
function senderName(f: Finding): string {
  const h = f.handoffs.find((x) => x.dir === "in") ?? f.handoffs[0];
  const other = h.src === f.owner ? h.tgt : h.src;
  // the "sender" we name in the q is the OTHER endpoint vs the owner (who forwards work to the owner)
  const counterpart = h.src === f.owner ? h.tgt : h.src;
  return domName(counterpart);
}

type QParts = { lead: string; options: string[]; recommended: string };
function renderOrphanQ(
  f: Finding,
  qN: number,
): { block: string; token: string; lint: string[]; parts: QParts } {
  const owner = f.owner!;
  const ent = entityPhrase(f.payloadDOs);
  const w = work(f.process_id);
  const ownerNm = domName(owner);
  const sender = senderName(f);
  const isComputed = [...f.payloadDOs].every((d) => String(doById.get(d)?.entity_type) === "computed");
  let lead: string, options: string[], recommended: string;
  if (f.built) {
    const sib = siblingFor(owner, [...f.payloadDOs][0], code(f.process_id));
    const ra = sib ? raPair(sib.pid) : { r: null, a: null };
    const r = ra.r ?? "a named owner";
    const a = ra.a ?? r;
    const sibWork = sib ? work(sib.pid) : "";
    // a real approver alternative: a different accountable role the owner uses on another step.
    let altA: string | null = null;
    for (const [pid2, ents] of gatedEntitiesByProcess) {
      if (!isRealized(pid2)) continue;
      if (![...ents].some((e) => (masterDomainsOfDO.get(e) ?? []).some((m) => m.domain === owner))) continue;
      const a2 = raPair(pid2).a;
      if (a2 && a2 !== a && a2 !== r) { altA = a2; break; }
    }
    const optB = altA
      ? `The ${r} runs it and the ${altA} approves.`
      : a !== r ? `The ${r} both runs and approves it.` : `Someone else you name runs and approves it.`;
    lead = `${sender} hands work to ${ownerNm}, but ${ownerNm} has no one assigned to ${w}, so that step currently has nobody responsible for it. Who should own it?`;
    options = [
      `The ${r} runs it and ${a !== r ? `the ${a} approves` : "approves it"}${sibWork ? `, the same pairing ${ownerNm} already uses for ${sibWork}` : ""}.`,
      optB,
      `Leave it unassigned for now.`,
    ];
    recommended = `a. ${ownerNm} already assigns the ${r}${a !== r ? ` and ${a}` : ""} to ${sibWork || "work of this kind"}, so (a) fills this gap the same way and gives the work a named owner.`;
  } else {
    lead = isComputed
      ? `${sender} sends ${ownerNm} an automatically calculated ${ent.toLowerCase()} that feeds ${w}, but ${ownerNm} does not yet have anyone assigned to that work, so this step has no owner. How should it be handled?`
      : `${sender} forwards ${ent.toLowerCase()} to ${ownerNm} to ${w}, but ${ownerNm} does not yet have anyone assigned to ${w}, so this step has no owner. How should it be handled?`;
    options = [
      `Record it now as work ${ownerNm} owns, and assign a named owner once ${ownerNm} sets up who does this work.`,
      isComputed ? `Treat it as an automatically calculated figure with no one to own, and leave it off the list.` : `Leave it off the list for now.`,
    ];
    recommended = `a. Recording it now means that the moment ${ownerNm} decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.`;
  }
  const letters = "abcdefgh";
  const block =
    `q${qN}: ${lead}\n` +
    options.map((o, i) => `- ${letters[i]}) ${o}`).join("\n") +
    `\n\nRecommended: ${recommended}\n\na${qN}:`;
  return { block, token: `q${qN}=B2-B9D-OWN-${f.process_id}`, lint: lintHuman(block), parts: { lead, options, recommended } };
}

// ----------------------------------------------------------------------------- writers (local audit files only)
const today = new Date().toISOString().slice(0, 10);
const yq = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function buildB2Lines(f: Finding, qN: number, parts: QParts): string[] {
  const ownerNm = domName(f.owner!);
  return [
    `  - id: B2-B9D-OWN-${f.process_id}`,
    `    summary: ${yq(`${ownerNm}: name an owner for "${pname(f.process_id)}" (no one is responsible for it today)`)}`,
    `    question: |`,
    `      ${parts.lead}`,
    `    options:`,
    ...parts.options.map((o) => `      - ${yq(o)}`),
    `    why: |`,
    `      ${parts.recommended.replace(/^a\.\s*/, "")} Surfaced as q-${domCode(f.owner!)}.md q${qN}.`,
    `    extra_b9d_added: ${yq(today)}`,
  ];
}

// insert a b2 item, idempotent by id, comment-preserving (surgical, never YAML round-trip).
function insertB2(ownerCode: string, itemLines: string[], id: string): "added" | "exists" | "nofile" {
  const path = `${AUDITS}/${ownerCode}/state.yaml`;
  if (!existsSync(path)) return "nofile";
  const raw = readFileSync(path, "utf8");
  if (new RegExp(`\\bid:\\s*${id}\\b`).test(raw)) return "exists";
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^status:/.test(lines[i])) lines[i] = "status: feedback_needed";
    else if (/^next_action_by:/.test(lines[i])) lines[i] = "next_action_by: user";
  }
  const b2Idx = lines.findIndex((l) => /^b2:/.test(l));
  if (b2Idx >= 0) {
    if (/^b2:\s*\[\s*\]\s*$/.test(lines[b2Idx])) lines[b2Idx] = "b2:";
    let next = lines.length;
    for (let i = b2Idx + 1; i < lines.length; i++) { if (SECTION.test(lines[i])) { next = i; break; } }
    let lastNonBlank = next - 1;
    while (lastNonBlank > b2Idx && lines[lastNonBlank].trim() === "") lastNonBlank--;
    lines.splice(lastNonBlank + 1, 0, ...itemLines);
  } else {
    const b3Idx = lines.findIndex((l) => /^b3:/.test(l));
    const at = b3Idx >= 0 ? b3Idx : lines.length;
    lines.splice(at, 0, "b2:", ...itemLines, "");
  }
  writeFileSync(path, lines.join(eol), "utf8");
  return "added";
}

// add a one-line reference-read note as a header comment, idempotent by substring.
function insertNote(ownerCode: string, note: string): "added" | "exists" | "nofile" {
  const path = `${AUDITS}/${ownerCode}/state.yaml`;
  if (!existsSync(path)) return "nofile";
  const raw = readFileSync(path, "utf8");
  const comment = `# B9d reference-read (${today}): ${note}`;
  if (raw.includes(note)) return "exists";
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  let at = lines.findIndex((l) => /^last_audit:/.test(l));
  if (at < 0) at = lines.findIndex((l) => SECTION.test(l)) - 1;
  if (at < 0) at = 0;
  lines.splice(at + 1, 0, comment);
  writeFileSync(path, lines.join(eol), "utf8");
  return "added";
}

// insert a blocking question, idempotent by footer token; create the file if missing.
function insertQ(ownerCode: string, ownerId: number, f: Finding): { qN: number; status: "added" | "exists" | "created" } {
  const path = `${AUDITS}/${ownerCode}/q-${ownerCode}.md`;
  const id = `B2-B9D-OWN-${f.process_id}`;
  if (existsSync(path)) {
    const raw = readFileSync(path, "utf8");
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    if (raw.includes(`=${id}`)) {
      const m = raw.match(new RegExp(`q(\\d+)=${id}\\b`));
      return { qN: m ? Number(m[1]) : 0, status: "exists" };
    }
    const lines = raw.split(/\r?\n/);
    let maxN = 0;
    for (const l of lines) { const m = l.match(/^q(\d+):/); if (m) maxN = Math.max(maxN, Number(m[1])); }
    const qN = maxN + 1;
    const { block } = renderOrphanQ(f, qN);
    const footerIdx = lines.findIndex((l) => /<!--\s*agent map/i.test(l));
    const optIdx = lines.findIndex((l) => /^##\s+Optional/i.test(l));
    const anchor = optIdx >= 0 ? optIdx : footerIdx >= 0 ? footerIdx : lines.length;
    lines.splice(anchor, 0, ...block.split("\n"), "", "---", "");
    const fIdx = lines.findIndex((l) => /<!--\s*agent map/i.test(l));
    if (fIdx >= 0) lines[fIdx] = lines[fIdx].replace(/\s*\|\s*domain_id=/, ` q${qN}=${id} | domain_id=`);
    writeFileSync(path, lines.join(eol), "utf8");
    return { qN, status: "added" };
  }
  const qN = 1;
  const { block } = renderOrphanQ(f, qN);
  const content =
    `# ${domName(ownerId)}: questions waiting for you\n\n` +
    `## What this domain is\n${domName(ownerId)}.\n\n---\n\n` +
    `${block}\n\n---\n\n` +
    `<!-- agent map, ignore: q${qN}=${id} | domain_id=${ownerId} -->\n`;
  const { mkdirSync } = require("node:fs") as typeof import("node:fs");
  mkdirSync(`${AUDITS}/${ownerCode}`, { recursive: true });
  writeFileSync(path, content, "utf8");
  return { qN, status: "created" };
}

// ----------------------------------------------------------------------------- report
const order: Record<Cls, number> = { ORPHAN: 0, "REFERENCE-READ": 1, "RE-TAG": 2, "ROLL-UP": 3, "MIS-TAG": 4, UNOWNED: 5, RESOLVED: 6 };
const findings = [...groups.values()].sort((a, b) => order[a.cls] - order[b.cls] || a.process_id - b.process_id);

const line = "=".repeat(92);
console.log(`\n${line}\nB9d resolver -- ${DOMAIN_CODE} (domain ${DID}) -- ${WRITE ? "WRITE" : "DRY-RUN"}\n${line}`);
console.log(`boundary tags: ${boundary.length} | distinct (process,owner) findings: ${groups.size}`);
const counts: Record<string, number> = {};
for (const f of findings) counts[f.cls] = (counts[f.cls] ?? 0) + 1;
console.log(`verdicts: ${JSON.stringify(counts)}\n`);

// owner-side writes we would make, grouped by owner file
const ownerEdits = new Map<string, string[]>();

for (const f of findings) {
  const c = code(f.process_id);
  const nm = pname(f.process_id);
  const ownerLabel = f.owner != null ? `${domCode(f.owner)}${f.cls === "ORPHAN" ? (f.built ? " (built)" : " (unbuilt)") : ""}` : "(no owner)";
  const hs = f.handoffs.map((h) => `${h.id}:${domCode(h.src)}->${domCode(h.tgt)}`).join(", ");
  console.log(`[${f.cls}] ${c} "${nm}" (pid ${f.process_id}) owner=${ownerLabel} ${f.ownerNote}`);
  console.log(`    payload(s): ${[...f.payloadDOs].map((d) => doById.get(d)?.data_object_name).join(", ")} | handoffs: ${hs}`);

  if (f.cls === "ORPHAN" && f.owner != null) {
    const ownerCode = domCode(f.owner);
    const { block, lint } = renderOrphanQ(f, 0 /* qN assigned at file-merge time */);
    if (!ownerEdits.has(ownerCode)) ownerEdits.set(ownerCode, []);
    ownerEdits.get(ownerCode)!.push(
      `  state.yaml: + b2 item  id: B2-B9D-OWN-${f.process_id}  (summary: assign an owner for "${nm}" handed ${ownerCode === domCode(f.owner) ? `to ${ownerCode}` : ""})`,
    );
    ownerEdits.get(ownerCode)!.push(`  q-${ownerCode}.md: + blocking question (token q?=B2-B9D-OWN-${f.process_id}):`);
    ownerEdits.get(ownerCode)!.push(block.split("\n").map((l) => "      " + l).join("\n"));
    if (lint.length) ownerEdits.get(ownerCode)!.push(`  !! WORDING LINT: banned tokens in human text: ${lint.join(", ")}`);
  } else if (f.cls === "REFERENCE-READ" && f.owner != null) {
    const ownerCode = domCode(f.owner);
    if (!ownerEdits.has(ownerCode)) ownerEdits.set(ownerCode, []);
    ownerEdits.get(ownerCode)!.push(
      `  state.yaml: + one-line note (no question): "${entityPhrase(f.payloadDOs)}" is reference/config data of ${ownerCode}; ` +
      `it becomes ownable work only if ${ownerCode} later runs a workflow on it.`,
    );
  } else if (f.cls === "ROLL-UP") {
    console.log(`    -> SOURCE EDIT (sign-off): re-point tag ${c} -> ${code(f.rollupTo!)} (realized at the same entity family).`);
  } else if (f.cls === "MIS-TAG") {
    const sender = f.handoffs[0]?.src;
    console.log(`    -> SENDER EDIT (sign-off): ${sender != null ? domCode(sender) : "?"} mis-tagged this; the carried entity is already realized under ${code(f.rollupTo!)} "${pname(f.rollupTo!)}". Re-point ${c} -> ${code(f.rollupTo!)} or delete the tag.`);
  } else if (f.cls === "RE-TAG") {
    const sender = f.handoffs[0]?.src;
    console.log(`    -> SOURCE EDIT (sign-off): ${sender != null ? domCode(sender) : "?"} tagged this coarsely; a more specific tag ${code(f.rollupTo!)} "${pname(f.rollupTo!)}" exists on the same entity. Re-point ${c} -> ${code(f.rollupTo!)}.`);
  } else if (f.cls === "UNOWNED") {
    console.log(`    -> UNOWNED DEPENDENCY: carried entity has no master row anywhere; surface on the sender, do not drop.`);
  }
}

console.log(`\n${line}\nINTENDED OWNER-FILE EDITS (additive; ${DRY ? "DRY-RUN, nothing written" : "WRITE"})\n${line}`);
if (ownerEdits.size === 0) {
  console.log("(none)");
} else {
  for (const [owner, edits] of [...ownerEdits.entries()].sort()) {
    const exists = existsSync(`${AUDITS}/${owner}/state.yaml`);
    console.log(`\n### ${owner}  ${exists ? "" : "(no audit dir yet!)"}`);
    for (const e of edits) console.log(e);
  }
}

console.log(`\n${line}`);
if (DRY) {
  console.log("DRY-RUN complete. No files written. Re-run with --write to apply the additive owner-side edits.");
  console.log("Destructive proposals (ROLL-UP re-point, MIS-TAG, legacy migration) always require explicit sign-off.");
} else {
  console.log("WRITE mode: applying additive owner-side edits to LOCAL audit files (no catalog writes).\n");
  const applied: string[] = [];
  const signoff: string[] = [];
  for (const f of findings) {
    if (f.cls === "ORPHAN" && f.owner != null) {
      const owner = domCode(f.owner);
      const q = insertQ(owner, f.owner, f);
      const b2 = insertB2(owner, buildB2Lines(f, q.qN, renderOrphanQ(f, q.qN).parts), `B2-B9D-OWN-${f.process_id}`);
      applied.push(`  ${owner.padEnd(14)} q-file:${q.status.padEnd(8)} (q${q.qN})  state.yaml:${b2}  <- B2-B9D-OWN-${f.process_id} "${pname(f.process_id)}"`);
    } else if (f.cls === "REFERENCE-READ" && f.owner != null) {
      const owner = domCode(f.owner);
      const note = `"${entityPhrase(f.payloadDOs)}" is reference/config data of ${owner}; it becomes ownable work only if ${owner} later runs a workflow on it.`;
      const r = insertNote(owner, note);
      applied.push(`  ${owner.padEnd(14)} state.yaml:${r}  <- reference-read note (${[...f.payloadDOs].map((d) => doById.get(d)?.data_object_name).join(", ")})`);
    } else if (f.cls === "ROLL-UP" || f.cls === "RE-TAG") {
      signoff.push(`  SOURCE re-point (sign-off): ${code(f.process_id)} -> ${code(f.rollupTo!)} on ${f.handoffs.map((h) => `#${h.id}`).join(", ")} (source ${domCode(f.handoffs[0].src)})`);
    } else if (f.cls === "MIS-TAG") {
      signoff.push(`  SENDER mis-tag (sign-off): ${code(f.process_id)} -> ${code(f.rollupTo!)} or delete, on ${f.handoffs.map((h) => `#${h.id}`).join(", ")} (source ${domCode(f.handoffs[0].src)})`);
    } else if (f.cls === "UNOWNED") {
      signoff.push(`  UNOWNED dependency (review): ${code(f.process_id)} on ${f.handoffs.map((h) => `#${h.id}`).join(", ")} -- carried entity has no master row anywhere.`);
    }
  }
  console.log("APPLIED (additive, local audit files):");
  for (const a of applied) console.log(a);
  if (signoff.length) {
    console.log("\nNOT APPLIED -- destructive / judgment, need your sign-off:");
    for (const s of signoff) console.log(s);
  }
  console.log("\nWRITE complete. Review the edited audit files; nothing was written to the catalog/database.");
}
