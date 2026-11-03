// scripts/lib/british_spelling.ts
//
// The one definition of "British spelling" for this project (CLAUDE.md "American English only"). The B16 health
// check, scripts/analytics/be_spelling_sweep.ts, the loader pre-flight (preflightAuthoredText in catalog_invariants.ts)
// and the repo-wide file check (__tests__/terminology.test.ts) all use it, so they cannot disagree. A copy lives at
// C:\dev\semantius-agent\scripts\british_spelling.ts for that repo's terminology test; terminology.test.ts here fails
// if the two drift apart.
//
// It uses a CURATED word map, never a blanket `-ise -> -ize` transform, which would corrupt American words such as
// enterprise, exercise, franchise, expertise, revise and premise. The -ize forms are generated only from explicit
// verb stems. Every function here is pure: no I/O.
//
// Two kinds of text, two behaviors:
//   prose       whole British words may be fixed automatically. An identifier-shaped token inside the prose
//               (`retail_labour_schedules`, `cancelledAt`, `booking.cancelled`, `LMS-CATALOGUE`) is reported only.
//   identifier  a name or code column: reported only, never fixed. A rename cascades, and a name may be a real brand.
//
// This file holds British spellings on purpose: the map keys below, and the allow-list.

// Confirmed -ize verb STEMS (the text before "ise"). Each stem + suffix is a real British form whose American
// spelling swaps `is` for `iz`. American -ise words are NOT here, so they are never generated.
const IZE_STEMS = [
  "organ", "priorit", "categor", "optim", "normal", "standard", "central", "decentral", "util",
  "special", "visual", "synchron", "author", "capital", "final", "material", "monet", "digit",
  "mobil", "harmon", "custom", "minim", "maxim", "emphas", "summar", "recogn", "real", "character",
  "commercial", "industrial", "legitim", "familiar", "regular", "modern", "formal", "neutral",
  "rational", "revital", "stabil", "steril", "subsid", "apolog", "colon", "critic", "homogen",
  "hospital", "hypothes", "motor", "patron", "penal", "pressur", "public", "random", "scrutin",
  "sensit", "social", "symbol", "sympath", "theor", "marginal", "liberal", "fertil", "civil",
  "item", "global", "local", "computer", "personal", "token",
  "anonym", "operational", "parallel", "initial", "amort", "notar", "energ", "incentiv", "unauthor", "repriorit", "depriorit",
  "general", "sanit", "alphabet", "production", "uncategor", "deenerg", "equal", "synthes", "plagiar", "hypnot", "legal", "natural",
  "national", "container", "virtual", "serial", "deserial", "reorgan", "unorgan", "disorgan", "unrecogn", "dematerial", "denormal",
  "reinitial", "uninitial", "memor", "immun", "pasteur", "crystall", "reauthor",
];
const IZE_SUFFIXES: [string, string][] = [
  ["ise", "ize"], ["ised", "ized"], ["ising", "izing"], ["ises", "izes"],
  ["isation", "ization"], ["isations", "izations"], ["iser", "izer"], ["isers", "izers"],
  ["isable", "izable"], ["isational", "izational"], ["isationally", "izationally"],
];

// -yse verbs. "analyses" is deliberately omitted: it is also the American plural of "analysis".
const YSE: [string, string][] = [
  ["analyse", "analyze"], ["analysed", "analyzed"], ["analysing", "analyzing"], ["analyser", "analyzer"],
  ["paralyse", "paralyze"], ["paralysed", "paralyzed"], ["paralysing", "paralyzing"],
  ["catalyse", "catalyze"], ["catalysed", "catalyzed"], ["catalysing", "catalyzing"],
];

// Explicit pairs (whole-word, case-insensitive). Grouped only for readability. `dialogue` is deliberately absent: it
// is valid American English for a conversation, and text alone cannot tell that from a software form.
const EXPLICIT: [string, string][] = [
  // -our -> -or
  ["behaviour", "behavior"], ["behaviours", "behaviors"], ["behavioural", "behavioral"],
  ["colour", "color"], ["colours", "colors"], ["coloured", "colored"], ["colouring", "coloring"], ["colourful", "colorful"],
  ["favour", "favor"], ["favours", "favors"], ["favoured", "favored"], ["favourite", "favorite"], ["favourites", "favorites"], ["favourable", "favorable"],
  ["flavour", "flavor"], ["flavours", "flavors"], ["flavoured", "flavored"],
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
  // -ence/-ense, -ise/-ice (nouns and verbs that change c<->s)
  ["licence", "license"], ["licences", "licenses"], ["defence", "defense"], ["defences", "defenses"],
  ["offence", "offense"], ["offences", "offenses"], ["pretence", "pretense"],
  ["practise", "practice"], ["practised", "practiced"], ["practising", "practicing"],
  // -logue -> -log
  ["catalogue", "catalog"], ["catalogues", "catalogs"], ["catalogued", "cataloged"], ["cataloguing", "cataloging"],
  ["analogue", "analog"], ["analogues", "analogs"],
  // British double-L -> American single-L
  ["cancelled", "canceled"], ["cancelling", "canceling"], ["canceller", "canceler"],
  ["modelling", "modeling"], ["modelled", "modeled"], ["modeller", "modeler"],
  ["labelling", "labeling"], ["labelled", "labeled"], ["labeller", "labeler"],
  ["signalling", "signaling"], ["signalled", "signaled"],
  ["travelling", "traveling"], ["travelled", "traveled"], ["traveller", "traveler"], ["travellers", "travelers"],
  ["fuelling", "fueling"], ["fuelled", "fueled"], ["levelling", "leveling"], ["levelled", "leveled"],
  ["totalling", "totaling"], ["totalled", "totaled"], ["channelling", "channeling"], ["channelled", "channeled"],
  ["counselling", "counseling"], ["counselled", "counseled"], ["counsellor", "counselor"], ["counsellors", "counselors"],
  ["dialling", "dialing"], ["dialled", "dialed"], ["dialler", "dialer"], ["diallers", "dialers"],
  ["funnelling", "funneling"], ["funnelled", "funneled"],
  ["marvelled", "marveled"], ["parcelled", "parceled"], ["pencilled", "penciled"], ["rivalled", "rivaled"],
  ["jewellery", "jewelry"], ["jeweller", "jeweler"], ["medallist", "medalist"], ["medallists", "medalists"],
  // British single-L -> American double-L
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
  ["whilst", "while"], ["amongst", "among"], ["learnt", "learned"], ["focussed", "focused"], ["focussing", "focusing"],
  ["co-ordinate", "coordinate"], ["co-ordination", "coordination"], ["co-operate", "cooperate"], ["co-operation", "cooperation"],
  ["benefitted", "benefited"], ["benefitting", "benefiting"], ["organisational", "organizational"],
  ["enquiry", "inquiry"], ["enquiries", "inquiries"], ["enquire", "inquire"], ["enquires", "inquires"], ["enquired", "inquired"], ["enquiring", "inquiring"],
  ["artefact", "artifact"], ["artefacts", "artifacts"], ["aluminium", "aluminum"],
  // the owner's added preferences (2026-11-03), and the -wards adverbs that go with `towards`. `forwards` stays out:
  // it is the ordinary verb form ("forwards the event").
  ["towards", "toward"], ["telecoms", "telecom"], ["wellbeing", "well-being"],
  ["afterwards", "afterward"], ["backwards", "backward"], ["upwards", "upward"], ["downwards", "downward"],
  ["inwards", "inward"], ["outwards", "outward"], ["onwards", "onward"],
  // found by the 2026-11-03 repo-wide hunt, and their obvious siblings
  ["greyed", "grayed"], ["greys", "grays"], ["greying", "graying"], ["haulier", "hauler"], ["hauliers", "haulers"], ["sizeable", "sizable"],
  ["unmodelled", "unmodeled"], ["modellers", "modelers"], ["unlabelled", "unlabeled"], ["mislabelled", "mislabeled"], ["relabelled", "relabeled"],
  ["labours", "labors"], ["labourer", "laborer"], ["labourers", "laborers"], ["labouring", "laboring"],
  ["neighbourhood", "neighborhood"], ["neighbourhoods", "neighborhoods"], ["humour", "humor"], ["tumour", "tumor"], ["tumours", "tumors"],
  ["armour", "armor"], ["armoured", "armored"], ["armouring", "armoring"], ["unarmoured", "unarmored"], ["harbours", "harbors"],
  ["savoury", "savory"], ["watercolour", "watercolor"], ["watercolours", "watercolors"], ["defenceless", "defenseless"], ["licenced", "licensed"],
  ["aeroplane", "airplane"], ["aeroplanes", "airplanes"], ["encyclopaedia", "encyclopedia"],
  ["paediatric", "pediatric"], ["paediatrics", "pediatrics"], ["paediatrician", "pediatrician"], ["orthopaedic", "orthopedic"], ["orthopaedics", "orthopedics"],
  ["anaesthesia", "anesthesia"], ["anaesthetic", "anesthetic"], ["anaesthesiology", "anesthesiology"], ["haematology", "hematology"], ["haemoglobin", "hemoglobin"],
  ["haemophilia", "hemophilia"], ["oestrogen", "estrogen"], ["leukaemia", "leukemia"], ["gynaecology", "gynecology"], ["gynaecologist", "gynecologist"],
  ["foetal", "fetal"], ["foetus", "fetus"], ["diarrhoea", "diarrhea"], ["mediaeval", "medieval"],
  ["sulphur", "sulfur"], ["sulphate", "sulfate"], ["sulphates", "sulfates"], ["sulphide", "sulfide"],
  ["ploughs", "plows"], ["ploughing", "plowing"], ["moulded", "molded"], ["moulding", "molding"], ["mouldings", "moldings"], ["mouldy", "moldy"], ["moult", "molt"],
  ["pyjamas", "pajamas"], ["moustache", "mustache"], ["woollen", "woolen"], ["marvellous", "marvelous"],
  ["despatch", "dispatch"], ["despatched", "dispatched"], ["despatches", "dispatches"], ["despatching", "dispatching"],
  ["transhipment", "transshipment"], ["transhipments", "transshipments"], ["saleable", "salable"], ["likeable", "likable"], ["liveable", "livable"], ["rateable", "ratable"],
  ["lodgement", "lodgment"], ["abridgement", "abridgment"], ["tunnelling", "tunneling"], ["tunnelled", "tunneled"], ["panelling", "paneling"],
  ["panellist", "panelist"], ["panellists", "panelists"], ["trialled", "trialed"], ["trialling", "trialing"], ["equalled", "equaled"], ["equalling", "equaling"],
  ["spoilt", "spoiled"], ["dreamt", "dreamed"], ["leant", "leaned"], ["orientated", "oriented"], ["orientate", "orient"], ["maths", "math"],
];

export const BE_AE_MAP = new Map<string, string>();
for (const stem of IZE_STEMS) for (const [be, ae] of IZE_SUFFIXES) BE_AE_MAP.set(stem + be, stem + ae);
for (const [be, ae] of YSE) BE_AE_MAP.set(be, ae);
for (const [be, ae] of EXPLICIT) if (be !== ae) BE_AE_MAP.set(be, ae);

// Real proper names that happen to spell a map word.
//   anywhere:   a token that may appear in any text (the dotted forms cannot be a sentence).
//   wholeCell:  a bare name, allowed only when it is the entire value of a name column. In a sentence the same letters
//               would be a real misspelling ("Fulfil the order"), so prose does not get this exemption.
// URLs, email addresses and bare domains are masked before any word match, so they need no entry.
export const BE_ALLOWED_NAMES = {
  anywhere: ["Fulfil.IO"],
  wholeCell: ["Fulfil", "Fulfil.IO"],
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Single whole-word, case-insensitive matcher over every map key (longest first).
const BE_KEYS = [...BE_AE_MAP.keys()].sort((a, b) => b.length - a.length).map(escapeRe);
const BE_RE = new RegExp(`\\b(${BE_KEYS.join("|")})\\b`, "gi");

function applyCase(match: string, ae: string): string {
  if (match === match.toUpperCase() && match !== match.toLowerCase()) return ae.toUpperCase();
  if (match[0] === match[0].toUpperCase()) return ae[0].toUpperCase() + ae.slice(1);
  return ae;
}

const URL_SRC = "(?:https?:\\/\\/|ftp:\\/\\/|www\\.)[^\\s<>()\\[\\]\"'`]+";
const EMAIL_SRC = "[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+";
const DOMAIN_SRC = "\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:com|io|org|net|ai|co|uk|eu|de|gov|edu|app|dev)\\b(?:\\/[^\\s<>()\\[\\]\"'`]*)?";
const ALLOWED_SRC = BE_ALLOWED_NAMES.anywhere.map(escapeRe).join("|");
// Text no word match may touch.
const MASK_SRC = `${URL_SRC}|${EMAIL_SRC}|${DOMAIN_SRC}|${ALLOWED_SRC}`;
const MASK_RE = new RegExp(MASK_SRC, "gi");
// An identifier-shaped token inside prose: snake_case, dotted, camelCase, or an all-caps hyphenated code.
const IDENT_SRC = "[A-Za-z0-9]+(?:[_.][A-Za-z0-9]+)+|[A-Za-z0-9]*[a-z][A-Z][A-Za-z0-9]*|[A-Z0-9]+(?:-[A-Z0-9]+)+";
const PROTECT_RE = new RegExp(`(${URL_SRC}|${EMAIL_SRC}|${DOMAIN_SRC})|(${ALLOWED_SRC})|(${IDENT_SRC})`, "g");

function wordHits(text: string, hits: string[]): string {
  return text.replace(BE_RE, (m) => {
    const ae = BE_AE_MAP.get(m.toLowerCase());
    if (!ae) return m;
    const out = applyCase(m, ae);
    if (out !== m) hits.push(`${m}->${out}`);
    return out;
  });
}

// Fixes whole British words in prose. URLs, allowed names and identifier-shaped tokens are left exactly as they are:
// an identifier inside prose is reported by findBritishInIdentifierTokens, never rewritten here.
export function fixBritishSpelling(text: string): { fixed: string; hits: string[] } {
  const hits: string[] = [];
  let fixed = "";
  let last = 0;
  for (const m of text.matchAll(PROTECT_RE)) {
    fixed += wordHits(text.slice(last, m.index), hits) + m[0];
    last = m.index! + m[0].length;
  }
  fixed += wordHits(text.slice(last), hits);
  return { fixed, hits };
}

// Splits on `_`, `.`, camelCase and digit boundaries. A hyphen needs no split, because `\b` already treats it as one.
export function splitIdentifierWords(text: string): string {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/[_.]/g, " ")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2");
}

// Every British word in the text, including inside identifiers. The strictest reading: what the file check uses, and
// what a name or code column gets. Returns `old->new` hits. Fixes nothing.
export function findBritishWords(text: string): string[] {
  const hits: string[] = [];
  wordHits(splitIdentifierWords(text.replace(MASK_RE, " ")), hits);
  return hits;
}

// British words inside identifier-shaped tokens of prose. Report-only.
export function findBritishInIdentifierTokens(text: string): string[] {
  const hits: string[] = [];
  for (const m of text.matchAll(PROTECT_RE)) if (m[3]) hits.push(...findBritishWords(m[3]));
  return hits;
}

export type SpellingKind = "prose" | "identifier" | "excluded";

// Reads a name or code cell: a real brand as the whole value is fine, anything else is reported.
function identifierCellHits(value: string): string[] {
  return BE_ALLOWED_NAMES.wholeCell.includes(value) ? [] : findBritishWords(value);
}

export function scanBritishText(text: string, kind: SpellingKind): { autofix: string[]; report: string[] } {
  if (kind === "excluded") return { autofix: [], report: [] };
  if (kind === "identifier") return { autofix: [], report: identifierCellHits(text) };
  return { autofix: fixBritishSpelling(text).hits, report: findBritishInIdentifierTokens(text) };
}

// ---------- whole files (the repo-wide check in terminology.test.ts) ----------
//
// Every word on a line is checked, split on `_`, `-`, `.`, camelCase and digits, so `cancelled_at` and `labourRate`
// both count. These stay on purpose, and nowhere else may a British spelling appear in a scanned file:

// Exact names and terms inside a line. Each is masked before the word check.
export const BE_ALLOWED_PHRASES: { why: string; re: RegExp }[] = [
  { why: "Fulfil, the inventory ERP vendor and product", re: /\bFulfil(?=\.IO\b|["',)]| \/)/g },
  { why: "Rockwell FactoryTalk ProductionCentre, a product name", re: /\bFactoryTalk Production ?Centre\b/g },
  { why: "the EU Forced Labour Regulation, an official title", re: /\bForced Labour Regulation\b/g },
  { why: "Microsoft Viva's Wellbeing Score, a product term in quotes", re: /"Wellbeing Score"/g },
  { why: "the field of the host's AskUserQuestion result, which the tool defines", re: /`cancelled: true`/g },
];
// A line about the spelling rule itself names the British form on purpose: a note that a value "uses British spellings".
// Two narrower cases are decided per word in fixLine: a rule example ("`normalize` (not `normalise`)"), and the record of
// a correction, where the same line also holds the American form ("`enrolment` -> `enrollment`").
export const BE_NOTE_RE = /\bBritish\b|\bAmerican[- ]English\b|\bUS English\b|\bBE (?:spelling|token|form|word)s?\b|\bspellings?\b/i;
// Whole lines kept by exact text: records of an old catalog value, or a rule example split across two lines. Each stays
// because rewriting it would make the record say something false. A new entry needs the owner's reason.
export const BE_ALLOWED_LINES: { why: string; contains: string }[] = [
  { why: "audits/PSA/history.md: names the British forms a past finding reported", contains: 'uses "recognised"' },
  { why: "audits/SAM/history.md: the prior value of a corrected description", contains: "Prior value: `Discovery, normalisation" },
  { why: "audits/THREAT-INTEL/history.md: names the British form the finding is about", contains: '"operationalisation". Fix is a single-row' },
  { why: "audits/THREAT-INTEL/state.yaml: quotes the current value the fix replaces", contains: "operationalisation of indicators and adversary intelligence." },
  { why: "the optimizer skill's rule example, split across two lines", contains: "modeling not `modelling`" },
];

function maskedParts(line: string): { text: string; masked: boolean }[] {
  const spans: [number, number][] = [];
  for (const m of line.matchAll(MASK_RE)) spans.push([m.index!, m.index! + m[0].length]);
  for (const { re } of BE_ALLOWED_PHRASES) for (const m of line.matchAll(re)) spans.push([m.index!, m.index! + m[0].length]);
  spans.sort((a, b) => a[0] - b[0]);
  const out: { text: string; masked: boolean }[] = [];
  let last = 0;
  for (const [s, e] of spans) {
    if (e <= last) continue;
    const start = Math.max(s, last);
    if (start > last) out.push({ text: line.slice(last, start), masked: false });
    out.push({ text: line.slice(start, e), masked: true });
    last = e;
  }
  if (last < line.length) out.push({ text: line.slice(last), masked: false });
  return out;
}

const CAMEL_SPLIT = /(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/;
const HYPHEN_KEYS = [...BE_AE_MAP.keys()].filter((k) => k.includes("-")).map(escapeRe);
const HYPHEN_RE = HYPHEN_KEYS.length ? new RegExp(`\\b(${HYPHEN_KEYS.join("|")})\\b`, "gi") : null;

function fixLine(line: string, hits: string[]): string {
  const lower = line.toLowerCase();
  const swap = (word: string): string => {
    const ae = BE_AE_MAP.get(word.toLowerCase());
    if (!ae) return word;
    // A correction record joins the old form to the new one ("x" -> "y", "x" to "y", "x" with "y"), and a rule example
    // names the form it bans.
    const be = word.toLowerCase();
    if (new RegExp(`\\b${escapeRe(be)}\\b[^>→]{0,40}(?:->|→|\\bto\\b|\\bwith\\b)[^>→]{0,12}\\b${escapeRe(ae)}\\b`).test(lower)) return word;
    if (lower.includes("not `" + be + "`")) return word;
    const out = applyCase(word, ae);
    hits.push(`${word}->${out}`);
    return out;
  };
  return maskedParts(line)
    .map((p) => {
      if (p.masked) return p.text;
      const hyphened = HYPHEN_RE ? p.text.replace(HYPHEN_RE, swap) : p.text;
      return hyphened.replace(/[A-Za-z]+/g, (run) => run.split(CAMEL_SPLIT).map(swap).join(""));
    })
    .join("");
}

// One pass over a file's text. Line endings are kept exactly, so a CRLF file stays CRLF.
function walkFile(text: string, onLine: (line: string, lineNo: number, isNote: boolean) => string): string {
  const pieces = text.split(/(\r\n|\n)/);
  let n = 0;
  return pieces
    .map((piece, i) => {
      if (i % 2 === 1) return piece;
      n++;
      const isNote = BE_NOTE_RE.test(piece) || BE_ALLOWED_LINES.some((l) => piece.includes(l.contains));
      return onLine(piece, n, isNote);
    })
    .join("");
}

// Every British spelling in the file outside the allow-list, by line.
export function findBritishInFile(text: string): { line: number; hits: string[] }[] {
  const out: { line: number; hits: string[] }[] = [];
  walkFile(text, (line, lineNo, isNote) => {
    if (isNote) return line;
    const hits: string[] = [];
    fixLine(line, hits);
    if (hits.length) out.push({ line: lineNo, hits });
    return line;
  });
  return out;
}

// The same pass, fixing what it finds. Used for the 2026-11-03 cleanup; keep it next to the check so they cannot differ.
export function fixBritishInFile(text: string): { fixed: string; hits: string[] } {
  const hits: string[] = [];
  const fixed = walkFile(text, (line, _no, isNote) => (isNote ? line : fixLine(line, hits)));
  return { fixed, hits };
}

// ---------- which columns hold what ----------

export const DOMAIN_MAP_MODULE_ID = 1001;

// Never authored text, whatever the column is called.
const NON_TEXT_FORMATS = new Set(["int32", "int64", "number", "decimal", "boolean", "date", "date-time", "time", "reference", "parent", "url", "email", "uuid", "json", "jsonb"]);
// Name and identifier columns: a value is reported, never rewritten, because a rename cascades or a name may be a brand.
const IDENTIFIER_COLUMN = /^(key|alias|label|external_id|issuing_body|headquarters_country)$|_(code|key|name|verb|verb_override|state)$/;
// Used only when there is no metadata to read (a loader's incoming row): columns that hold no authored text.
const NON_TEXT_COLUMN = /^(id|search_vector|record_status|key)$|_(id|ids|url|at)$/;
const COMPUTED_LABEL_COLUMN = /_label$/;
const AUTHORED_LABEL_COLUMN = /^(singular|plural)_label$/;

export type SpellingField = { field_name: string; format?: string | null; ctype?: string | null };

// With metadata (the sweep and B16, from /fields and /entities) a new column is classified from its format, so it
// cannot be missed. Without metadata (loader pre-flight) the column name decides. Anything unrecognized that holds text
// counts as prose, so an unknown column is scanned rather than skipped.
export function classifySpellingColumn(field: SpellingField, computed?: ReadonlySet<string>): SpellingKind {
  const name = field.field_name;
  if (computed?.has(name)) return "excluded";
  if (field.format != null) {
    if (NON_TEXT_FORMATS.has(field.format)) return "excluded";
    if (field.format === "enum" || field.ctype === "label" || IDENTIFIER_COLUMN.test(name)) return "identifier";
    return "prose";
  }
  if (NON_TEXT_COLUMN.test(name)) return "excluded";
  if (COMPUTED_LABEL_COLUMN.test(name) && !AUTHORED_LABEL_COLUMN.test(name)) return "excluded";
  return IDENTIFIER_COLUMN.test(name) ? "identifier" : "prose";
}

export type SpellingColumns = Record<string, { prose: string[]; identifier: string[]; excluded: string[] }>;

export function buildSpellingColumns(
  entities: { table_name: string; computed_fields?: { name: string }[] | null }[],
  fields: (SpellingField & { table_name: string })[],
): SpellingColumns {
  const out: SpellingColumns = {};
  for (const e of entities) {
    const computed = new Set((e.computed_fields ?? []).map((c) => c.name));
    const cols = { prose: [] as string[], identifier: [] as string[], excluded: [] as string[] };
    for (const f of fields) if (f.table_name === e.table_name) cols[classifySpellingColumn(f, computed)].push(f.field_name);
    out[e.table_name] = cols;
  }
  return out;
}

export type SpellingHit = { table: string; id: number | string; column: string; hits: string[]; autofix: boolean };

// `columns` comes from buildSpellingColumns. Without it, each row's own keys are classified by name.
export function scanBritishSpelling(table: string, rows: Record<string, unknown>[], columns?: SpellingColumns): SpellingHit[] {
  const known = columns?.[table];
  const out: SpellingHit[] = [];
  rows.forEach((row, i) => {
    const id = (row.id as number | string | undefined) ?? `incoming${i}`;
    const kinds: [string, SpellingKind][] = known
      ? [...known.prose.map((c): [string, SpellingKind] => [c, "prose"]), ...known.identifier.map((c): [string, SpellingKind] => [c, "identifier"])]
      : Object.keys(row).map((c): [string, SpellingKind] => [c, classifySpellingColumn({ field_name: c })]);
    for (const [column, kind] of kinds) {
      const v = row[column];
      if (typeof v !== "string" || v.length === 0) continue;
      const { autofix, report } = scanBritishText(v, kind);
      if (autofix.length) out.push({ table, id, column, hits: autofix, autofix: true });
      if (report.length) out.push({ table, id, column, hits: report, autofix: false });
    }
  });
  return out;
}

// ---------- schema metadata ----------

export type MetadataHit = { table: "entities" | "fields"; id: string; column: string; hits: string[] };

// entities (description, labels) and fields (title, description) of the module. Every hit is reported; a schema write
// needs a reviewed script, so nothing here fixes metadata.
export function scanSchemaMetadata(entities: Record<string, unknown>[], fields: Record<string, unknown>[]): MetadataHit[] {
  const out: MetadataHit[] = [];
  const scan = (table: MetadataHit["table"], id: string, column: string, v: unknown) => {
    if (typeof v !== "string" || !v) return;
    const hits = findBritishWords(v);
    if (hits.length) out.push({ table, id, column, hits });
  };
  for (const e of entities) for (const c of ["description", "singular_label", "plural_label"]) scan("entities", String(e.table_name), c, e[c]);
  for (const f of fields) for (const c of ["title", "description"]) scan("fields", String(f.id), c, f[c]);
  return out;
}
