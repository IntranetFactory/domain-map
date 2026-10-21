// Inspect the APQC PCF Excel — list sheets, peek at rows, find attribution text.
// Run from project root: bun run c:/dev/domain-map/.tmp_deploy/inspect_apqc_pcf.ts
import * as XLSX from "xlsx";

const PATH = "c:/dev/domain-map/K016808_APQC Process Classification Framework (PCF) - Cross-Industry - Excel Version 8.0.xlsx";

const wb = XLSX.readFile(PATH);
console.log(`Sheets (${wb.SheetNames.length}):`);
for (const name of wb.SheetNames) console.log(`  - "${name}"`);

for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const ref = sheet["!ref"];
  console.log(`\n=== "${name}" (range ${ref}) ===`);
  // Convert to array-of-arrays to preserve raw cell contents
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true }) as any[][];
  console.log(`  rows: ${rows.length}`);
  const preview = rows.slice(0, 12);
  for (let i = 0; i < preview.length; i++) {
    const r = preview[i];
    const cells = r.slice(0, 8).map(v => {
      const s = String(v ?? "");
      return s.length > 60 ? s.slice(0, 57) + "…" : s;
    });
    console.log(`  [${i}] ${JSON.stringify(cells)}`);
  }
  if (rows.length > 12) {
    console.log(`  …`);
    const last = rows.slice(-3);
    for (let i = 0; i < last.length; i++) {
      const r = last[i];
      const cells = r.slice(0, 8).map(v => {
        const s = String(v ?? "");
        return s.length > 60 ? s.slice(0, 57) + "…" : s;
      });
      console.log(`  [${rows.length - last.length + i}] ${JSON.stringify(cells)}`);
    }
  }
}
