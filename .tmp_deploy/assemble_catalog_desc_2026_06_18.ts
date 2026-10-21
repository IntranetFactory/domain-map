/**
 * Assemble + validate the per-batch catalog_description outputs.
 * Reports coverage (missing / duplicate ids) and quality flags. Writes the merged map
 * and the missing-id list. Does NOT write to the live catalog.
 */
const EMDASH = "—";

const master: any[] = JSON.parse(
  await Bun.file(".tmp_deploy/data_objects_for_catalog_desc_2026_06_18.json").text(),
);
const masterById = new Map<number, any>(master.map((r) => [r.id, r]));
const allIds = new Set<number>(master.map((r) => r.id));

const merged = new Map<number, string>();
const dupes: number[] = [];
let fileErrors: string[] = [];

for (let i = 1; i <= 13; i++) {
  const nn = String(i).padStart(2, "0");
  const path = `.tmp_deploy/catalog_desc_output_${nn}.json`;
  let text: string;
  try {
    text = await Bun.file(path).text();
  } catch {
    fileErrors.push(`${path}: MISSING FILE`);
    continue;
  }
  // tolerate accidental markdown fences
  text = text.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();
  let arr: any[];
  try {
    arr = JSON.parse(text);
  } catch (e) {
    fileErrors.push(`${path}: INVALID JSON (${String(e).slice(0, 80)})`);
    continue;
  }
  for (const el of arr) {
    if (typeof el?.id !== "number" || typeof el?.catalog_description !== "string") {
      fileErrors.push(`${path}: bad element ${JSON.stringify(el).slice(0, 80)}`);
      continue;
    }
    if (merged.has(el.id)) dupes.push(el.id);
    merged.set(el.id, el.catalog_description.trim());
  }
}

const missing = [...allIds].filter((id) => !merged.has(id));
const extra = [...merged.keys()].filter((id) => !allIds.has(id));

// quality flags
const emdash: number[] = [];
const empty: number[] = [];
const tooLong: number[] = [];
const leadingArticle: number[] = [];
const notCapital: number[] = [];
for (const [id, v] of merged) {
  if (!v) empty.push(id);
  if (v.includes(EMDASH)) emdash.push(id);
  if (v.length > 220) tooLong.push(id);
  if (/^(a|an|the)\s/i.test(v)) leadingArticle.push(id);
  if (v && !/^[A-Z0-9]/.test(v)) notCapital.push(id);
}

console.log("=== coverage ===");
console.log("master rows:        ", allIds.size);
console.log("merged (covered):   ", merged.size);
console.log("MISSING:            ", missing.length);
console.log("duplicate ids:      ", dupes.length, dupes.length ? dupes.slice(0, 20) : "");
console.log("extra (not in master):", extra.length, extra.length ? extra.slice(0, 20) : "");
if (fileErrors.length) { console.log("\nFILE ERRORS:"); for (const e of fileErrors) console.log("  " + e); }

console.log("\n=== quality flags ===");
console.log("empty:           ", empty.length);
console.log("em-dash:         ", emdash.length, emdash.slice(0, 10));
console.log("leading article: ", leadingArticle.length, leadingArticle.slice(0, 10));
console.log("not capitalized: ", notCapital.length, notCapital.slice(0, 10));
console.log("too long (>220): ", tooLong.length, tooLong.slice(0, 10));

// write merged + missing for downstream steps
await Bun.write(
  ".tmp_deploy/catalog_desc_merged.json",
  JSON.stringify([...merged].map(([id, catalog_description]) => ({ id, catalog_description })), null, 2),
);
const missingRows = missing.map((id) => {
  const r = masterById.get(id);
  return { id, data_object_name: r.data_object_name, singular_label: r.singular_label, plural_label: r.plural_label, entity_type: r.entity_type, description: r.description };
});
await Bun.write(".tmp_deploy/catalog_desc_missing.json", JSON.stringify(missingRows, null, 2));
console.log(`\nwrote .tmp_deploy/catalog_desc_merged.json (${merged.size}) and .tmp_deploy/catalog_desc_missing.json (${missing.length})`);

// show a varied sample for eyeballing
console.log("\n=== sample (15) ===");
const sampleIds = [...merged.keys()].filter((_, i) => i % Math.floor(merged.size / 15) === 0).slice(0, 15);
for (const id of sampleIds) {
  const r = masterById.get(id);
  console.log(`  [${r.data_object_name}] ${merged.get(id)}`);
}
