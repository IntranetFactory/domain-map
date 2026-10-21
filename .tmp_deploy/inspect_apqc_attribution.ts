// Print untruncated cell text from key sheets.
import * as XLSX from "xlsx";
const PATH = "c:/dev/domain-map/K016808_APQC Process Classification Framework (PCF) - Cross-Industry - Excel Version 8.0.xlsx";
const wb = XLSX.readFile(PATH);

function dumpSheet(name: string, opts: { full?: boolean; limit?: number } = {}) {
  const sheet = wb.Sheets[name];
  if (!sheet) { console.log(`(no sheet "${name}")`); return; }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true }) as any[][];
  console.log(`\n=== "${name}" (${rows.length} rows) ===`);
  const lim = opts.limit ?? rows.length;
  for (let i = 0; i < Math.min(rows.length, lim); i++) {
    for (let j = 0; j < rows[i].length; j++) {
      const v = String(rows[i][j] ?? "");
      if (v.trim() === "") continue;
      const display = opts.full ? v : (v.length > 200 ? v.slice(0, 200) + "…" : v);
      console.log(`  [${i},${j}] ${display.replace(/\r?\n/g, "\\n")}`);
    }
  }
}

dumpSheet("Copyright and Attribution", { full: true });
dumpSheet("About", { full: true });
dumpSheet("Introduction", { full: true });
dumpSheet("Combined", { limit: 5 });
console.log(`\nCombined header row: ${JSON.stringify((XLSX.utils.sheet_to_json(wb.Sheets["Combined"]!, { header: 1, defval: "", raw: true }) as any[][])[0])}`);
console.log(`Combined total rows: ${(XLSX.utils.sheet_to_json(wb.Sheets["Combined"]!, { header: 1, defval: "" }) as any[][]).length}`);
