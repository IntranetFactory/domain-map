#!/usr/bin/env bun
// scripts/analytics/be_spelling_sweep.ts
//
// Catalog-wide British-English -> American-English spelling sweep / lint. American English is the
// only allowed dialect (CLAUDE.md "American English only"); this is the enforcement tool the
// per-domain audit's BE band points at.
//
// It uses a CURATED word map, never a blanket `-ise -> -ize` transform: a naive transform would
// corrupt AE-native words (enterprise, comprise, surprise, advertise, supervise, franchise, ...).
// The -ize forms are generated only from explicit verb stems that are genuinely -ize verbs, so no
// AE-native word is ever rewritten.
//
// AUTOFIX columns (prose we author) are patched on --write. REPORT columns (natural keys / codes
// whose rename would cascade to FKs, plus externally-sourced names: APQC processes, statutes,
// vendor / solution proper names) are listed only, never auto-changed.
//
// Usage:
//   bun run scripts/analytics/be_spelling_sweep.ts            # dry-run: list every proposed change
//   bun run scripts/analytics/be_spelling_sweep.ts --write    # apply AUTOFIX changes
//
// Every write changes ONLY the spelling; record_status is never touched (Rule #1). Re-runnable and
// idempotent: a clean catalog produces zero findings (and the BE audit band passes).

export {};

import { pg } from "../lib/catalog";

const WRITE = process.argv.includes("--write");

// ---------------------------------------------------------------------------
// BE -> AE dictionary (curated)
// ---------------------------------------------------------------------------

// Confirmed -ize verb STEMS (text before "ise"). Each stem+suffix below is a real BE form whose AE
// spelling swaps `is` for `iz`; AE-native -ise words are NOT here, so they are never generated.
const IZE_STEMS = [
  "organ", "priorit", "categor", "optim", "normal", "standard", "central", "decentral", "util",
  "special", "visual", "synchron", "author", "capital", "final", "material", "monet", "digit",
  "mobil", "harmon", "custom", "minim", "maxim", "emphas", "summar", "recogn", "real", "character",
  "commercial", "industrial", "legitim", "familiar", "regular", "modern", "formal", "neutral",
  "rational", "revital", "stabil", "steril", "subsid", "apolog", "colon", "critic", "homogen",
  "hospital", "hypothes", "motor", "patron", "penal", "pressur", "public", "random", "scrutin",
  "sensit", "social", "symbol", "sympath", "theor", "marginal", "liberal", "fertil", "civil",
  "item", "global", "local", "computer", "personal", "token",
];
const IZE_SUFFIXES: [string, string][] = [
  ["ise", "ize"], ["ised", "ized"], ["ising", "izing"], ["ises", "izes"],
  ["isation", "ization"], ["isations", "izations"], ["iser", "izer"], ["isers", "izers"],
  ["isable", "izable"], ["isational", "izational"], ["isationally", "izationally"],
];

// -yse verbs (analyse / paralyse / catalyse). "analyses" is deliberately omitted: it is also the AE
// plural of "analysis", so rewriting it would corrupt correct AE.
const YSE: [string, string][] = [
  ["analyse", "analyze"], ["analysed", "analyzed"], ["analysing", "analyzing"], ["analyser", "analyzer"],
  ["paralyse", "paralyze"], ["paralysed", "paralyzed"], ["paralysing", "paralyzing"],
  ["catalyse", "catalyze"], ["catalysed", "catalyzed"], ["catalysing", "catalyzing"],
];

// Explicit pairs (whole-word, case-insensitive). Grouped only for readability.
const EXPLICIT: [string, string][] = [
  // -our -> -or
  ["behaviour", "behavior"], ["behaviours", "behaviors"], ["behavioural", "behavioral"],
  ["colour", "color"], ["colours", "colors"], ["coloured", "colored"], ["colouring", "coloring"], ["colourful", "colorful"],
  ["favour", "favor"], ["favours", "favors"], ["favoured", "favored"], ["favourite", "favorite"], ["favourites", "favorites"], ["favourable", "favorable"],
  ["flavour", "flavor"], ["flavours", "flavors"],
  ["honour", "honor"], ["honours", "honors"], ["honoured", "honored"],
  ["labour", "labor"], ["laboured", "labored"],
  ["neighbour", "neighbor"], ["neighbours", "neighbors"], ["neighbouring", "neighboring"],
  ["rumour", "rumor"], ["rumours", "rumors"], ["vapour", "vapor"], ["vigour", "vigor"], ["odour", "odor"],
  ["harbour", "harbor"], ["valour", "valor"], ["savour", "savor"], ["endeavour", "endeavor"], ["endeavours", "endeavors"],
  ["splendour", "splendor"], ["demeanour", "demeanor"], ["candour", "candor"], ["clamour", "clamor"],
  ["parlour", "parlor"], ["fervour", "fervor"], ["rigour", "rigor"], ["rigours", "rigors"], ["saviour", "savior"],
  // -re -> -er
  ["centre", "center"], ["centres", "centers"], ["centred", "centered"], ["centring", "centering"],
  ["theatre", "theater"], ["theatres", "theaters"], ["fibre", "fiber"], ["fibres", "fibers"],
  ["calibre", "caliber"], ["metre", "meter"], ["metres", "meters"], ["litre", "liter"], ["litres", "liters"],
  ["spectre", "specter"], ["lustre", "luster"], ["sombre", "somber"], ["meagre", "meager"], ["sabre", "saber"],
  ["kilometre", "kilometer"], ["centimetre", "centimeter"], ["millimetre", "millimeter"],
  // -ence/-ense, -ise/-ice (nouns/verbs that change c<->s)
  ["licence", "license"], ["licences", "licenses"], ["defence", "defense"], ["defences", "defenses"],
  ["offence", "offense"], ["offences", "offenses"], ["pretence", "pretense"],
  ["practise", "practice"], ["practised", "practiced"], ["practising", "practicing"],
  // -logue -> -log
  ["catalogue", "catalog"], ["catalogues", "catalogs"], ["catalogued", "cataloged"], ["cataloguing", "cataloging"],
  ["dialogue", "dialog"], ["dialogues", "dialogs"], ["analogue", "analog"], ["analogues", "analogs"],
  // BE double-L -> AE single-L
  ["cancelled", "canceled"], ["cancelling", "canceling"], ["canceller", "canceler"], ["cancellation", "cancellation"],
  ["modelling", "modeling"], ["modelled", "modeled"], ["modeller", "modeler"],
  ["labelling", "labeling"], ["labelled", "labeled"], ["labeller", "labeler"],
  ["signalling", "signaling"], ["signalled", "signaled"],
  ["travelling", "traveling"], ["travelled", "traveled"], ["traveller", "traveler"], ["travellers", "travelers"],
  ["fuelling", "fueling"], ["fuelled", "fueled"], ["levelling", "leveling"], ["levelled", "leveled"],
  ["totalling", "totaling"], ["totalled", "totaled"], ["channelling", "channeling"], ["channelled", "channeled"],
  ["counselling", "counseling"], ["counselled", "counseled"], ["counsellor", "counselor"], ["counsellors", "counselors"],
  ["dialling", "dialing"], ["dialled", "dialed"], ["funnelling", "funneling"], ["funnelled", "funneled"],
  ["marvelled", "marveled"], ["parcelled", "parceled"], ["pencilled", "penciled"], ["rivalled", "rivaled"],
  ["jewellery", "jewelry"], ["jeweller", "jeweler"],
  // BE single-L -> AE double-L
  ["fulfil", "fulfill"], ["fulfils", "fulfills"], ["fulfilment", "fulfillment"], ["fulfilments", "fulfillments"],
  ["enrol", "enroll"], ["enrols", "enrolls"], ["enrolment", "enrollment"], ["enrolments", "enrollments"],
  ["instalment", "installment"], ["instalments", "installments"], ["instil", "instill"], ["instils", "instills"],
  ["skilful", "skillful"], ["wilful", "willful"], ["distil", "distill"], ["distils", "distills"],
  // misc
  ["programme", "program"], ["programmes", "programs"], ["grey", "gray"], ["greyscale", "grayscale"],
  ["ageing", "aging"], ["judgement", "judgment"], ["judgements", "judgments"],
  ["acknowledgement", "acknowledgment"], ["acknowledgements", "acknowledgments"],
  ["manoeuvre", "maneuver"], ["manoeuvres", "maneuvers"], ["mould", "mold"], ["moulds", "molds"],
  ["smoulder", "smolder"], ["draught", "draft"], ["plough", "plow"],
  ["sceptical", "skeptical"], ["sceptic", "skeptic"], ["scepticism", "skepticism"],
  ["cheque", "check"], ["cheques", "checks"], ["chequebook", "checkbook"], ["kerb", "curb"],
  ["tyre", "tire"], ["tyres", "tires"], ["speciality", "specialty"], ["specialities", "specialties"],
  ["storey", "story"], ["storeys", "stories"], ["cosy", "cozy"], ["dependant", "dependent"], ["dependants", "dependents"],
  ["whilst", "while"], ["amongst", "among"], ["focussed", "focused"], ["focussing", "focusing"],
  ["co-ordinate", "coordinate"], ["co-ordination", "coordination"], ["co-operate", "cooperate"], ["co-operation", "cooperation"],
  ["benefitted", "benefited"], ["benefitting", "benefiting"], ["organisational", "organizational"],
];

const MAP = new Map<string, string>();
for (const stem of IZE_STEMS) for (const [be, ae] of IZE_SUFFIXES) MAP.set(stem + be, stem + ae);
for (const [be, ae] of YSE) MAP.set(be, ae);
for (const [be, ae] of EXPLICIT) if (be !== ae) MAP.set(be, ae);

// Single whole-word, case-insensitive matcher over every BE key (longest first).
const KEYS = [...MAP.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
const RE = new RegExp(`\\b(${KEYS.join("|")})\\b`, "gi");

function applyCase(match: string, ae: string): string {
  if (match === match.toUpperCase() && match !== match.toLowerCase()) return ae.toUpperCase();
  if (match[0] === match[0].toUpperCase()) return ae[0].toUpperCase() + ae.slice(1);
  return ae;
}

// Returns [fixed, hits] where hits lists each old->new substitution made.
function fix(text: string): { fixed: string; hits: string[] } {
  const hits: string[] = [];
  const fixed = text.replace(RE, (m) => {
    const ae = MAP.get(m.toLowerCase());
    if (!ae) return m;
    const out = applyCase(m, ae);
    if (out !== m) hits.push(`${m}->${out}`);
    return out;
  });
  return { fixed, hits };
}

// ---------------------------------------------------------------------------
// Column scope
// ---------------------------------------------------------------------------

// AUTOFIX: prose columns we author. Patched on --write.
const AUTOFIX: Record<string, string[]> = {
  domains: ["domain_name", "description", "business_logic", "catalog_tagline", "catalog_description", "naming_authority_rationale", "notes"],
  domain_modules: ["domain_module_name", "description", "catalog_tagline", "catalog_description", "specification_requirements", "notes"],
  data_objects: ["singular_label", "plural_label", "description", "notes"],
  capabilities: ["capability_name", "description"],
  handoffs: ["description", "notes"],
  // state/event vocabulary is free text (not an FK natural key) and is only cross-referenced
  // within the lifecycle+event model, so renaming is safe as long as all of state_name / to_state /
  // from_state move together in one sweep (they do, all listed here).
  trigger_events: ["description", "event_name", "to_state", "from_state"],
  data_object_aliases: ["alias_name", "notes"],
  data_object_lifecycle_states: ["description", "notes", "state_name", "permission_verb_override"],
  business_functions: ["business_function_name", "description"],
  domain_roles: ["role_name", "description"],
  skills: ["description", "trigger_keywords"],
  tools: ["description"],
};

// REPORT-ONLY: natural keys / codes (renaming cascades to FKs) + externally-sourced names
// (APQC processes, statutes, vendor / solution proper names). Listed, never auto-changed.
const REPORT: Record<string, string[]> = {
  domains: ["domain_code"],
  domain_modules: ["domain_module_code"],
  data_objects: ["data_object_name"],
  capabilities: ["capability_code"],
  domain_roles: ["role_code"],
  tools: ["tool_name"],
  skills: ["skill_name"],
  processes: ["process_name", "description"],
  regulations: ["regulation_name", "description"],
  solutions: ["solution_name", "description", "notes"],
  vendors: ["vendor_name", "description", "notes"],
  industries: ["industry_name"],
};

const L = 100000;
const tablesToFetch = [...new Set([...Object.keys(AUTOFIX), ...Object.keys(REPORT)])];

let autofixRows = 0;
let autofixSubs = 0;
let reportHits = 0;
const patches: { table: string; id: number; body: Record<string, string> }[] = [];

for (const table of tablesToFetch) {
  const rows: any[] = (await pg("GET", `/${table}?select=*&limit=${L}`)) ?? [];
  const autoCols = AUTOFIX[table] ?? [];
  const reportCols = REPORT[table] ?? [];

  for (const row of rows) {
    const body: Record<string, string> = {};
    for (const col of autoCols) {
      const v = row[col];
      if (typeof v !== "string" || v.length === 0) continue;
      const { fixed, hits } = fix(v);
      if (hits.length > 0) {
        body[col] = fixed;
        autofixSubs += hits.length;
        console.log(`FIX  ${table}.${col} id=${row.id}: ${hits.join(", ")}`);
      }
    }
    if (Object.keys(body).length > 0) {
      autofixRows++;
      patches.push({ table, id: row.id as number, body });
    }
    for (const col of reportCols) {
      const v = row[col];
      if (typeof v !== "string" || v.length === 0) continue;
      const { hits } = fix(v);
      if (hits.length > 0) {
        reportHits += hits.length;
        console.log(`REPORT (manual) ${table}.${col} id=${row.id}: ${hits.join(", ")}`);
      }
    }
  }
}

console.error(
  `\nscan complete: ${autofixRows} row(s) / ${autofixSubs} substitution(s) AUTOFIX, ${reportHits} REPORT-only hit(s) across ${tablesToFetch.length} tables`,
);

if (!WRITE) {
  console.error(`dry-run: nothing written. Re-run with --write to apply the AUTOFIX changes.`);
  process.exit(0);
}

let written = 0;
let failed = 0;
for (const p of patches) {
  try {
    await pg("PATCH", `/${p.table}?id=eq.${p.id}`, p.body);
    written++;
  } catch (e) {
    failed++;
    console.error(`FAILED ${p.table} id=${p.id}: ${(e as Error).message}`);
  }
}
console.error(`wrote ${written}/${patches.length} row(s)${failed ? `, ${failed} failed` : ""} (record_status untouched)`);
