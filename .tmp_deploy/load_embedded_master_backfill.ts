#!/usr/bin/env bun
// Load embedded_master + necessity backfill drafts into Semantius.
//
// Reads .tmp_deploy/embedded_master_backfill_<slug>.md, extracts pipe-table rows
// from Section 3 (NEW rows) and Section 4 (CHANGES), resolves natural keys, and
// applies idempotent inserts + updates via the semantius CLI.
//
// Run pattern:
//   bun run .tmp_deploy/load_embedded_master_backfill.ts hr           # one cluster
//   bun run .tmp_deploy/load_embedded_master_backfill.ts hr customer  # multiple
//   bun run .tmp_deploy/load_embedded_master_backfill.ts --dry hr     # parse-only

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const SEM = "C:/Users/MartinAmm/AppData/Local/Programs/Semantius/semantius.exe";

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn([SEM, "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

const ROLES = new Set(["master", "embedded_master", "contributor", "consumer", "derived"]);
const NECESSITIES = new Set(["required", "optional"]);

interface ParsedRow {
  domain_code: string;
  data_object_name: string;
  role?: string;
  necessity?: string;
  from_role?: string;
  from_necessity?: string;
  to_role?: string;
  to_necessity?: string;
  notes?: string;
  raw_cells: string[];
}

function stripMd(s: string): string {
  return s
    .replace(/^\*+|\*+$/g, "")
    .replace(/`/g, "")
    .replace(/^\s+|\s+$/g, "");
}

// Find ## sections and extract pipe-table rows.
// Returns rows parsed loosely: first column = domain_code, second = data_object_name,
// then we sniff each remaining cell for role / necessity / from-to / notes content.
function extractTables(md: string): { newRows: ParsedRow[]; changeRows: ParsedRow[] } {
  const lines = md.split(/\r?\n/);
  const sections: { title: string; tableLines: string[] }[] = [];
  let curTitle = "";
  let curTable: string[] = [];
  let inTable = false;

  const flush = () => {
    if (curTable.length > 0) sections.push({ title: curTitle, tableLines: [...curTable] });
    curTable = [];
    inTable = false;
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      flush();
      curTitle = line.slice(3).trim();
      continue;
    }
    if (line.startsWith("|")) {
      curTable.push(line);
      inTable = true;
    } else if (inTable && line.trim() === "") {
      // table ended by blank line — flush only if there's a sub-header coming
      // we'll accumulate; multiple tables in one section concatenate.
      // (For our docs the section has one table.)
      inTable = false;
    } else if (inTable && !line.startsWith("|")) {
      inTable = false;
    }
  }
  flush();

  const newRows: ParsedRow[] = [];
  const changeRows: ParsedRow[] = [];

  for (const sec of sections) {
    const t = sec.title.toLowerCase();
    const isNew = /^3\b/.test(t) && /(new|add)/.test(t) || /new rows/.test(t);
    const isChange = /^4\b/.test(t) && /(change|flip|demot|necessity|role)/.test(t) || /^changes/.test(t);
    if (!isNew && !isChange) continue;

    // Parse table rows from this section. Skip header + separator.
    const rows = sec.tableLines;
    if (rows.length < 3) continue;
    // First row is header, second is separator (---), rest are data.
    for (let i = 2; i < rows.length; i++) {
      const line = rows[i];
      if (!line.startsWith("|")) continue;
      // Split on | but preserve internal text. Use a simple split since we control format.
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      if (cells.length < 4) continue;
      const domain_code = stripMd(cells[0]).toUpperCase();
      const data_object_name = stripMd(cells[1]);
      if (!domain_code || !data_object_name) continue;
      // Skip header-like rows we mistook for data
      if (data_object_name.toLowerCase().startsWith("data_object")) continue;

      const r: ParsedRow = { domain_code, data_object_name, raw_cells: cells };

      if (isNew) {
        // Expected: domain_code | data_object_name | role | necessity | notes | reasoning
        const role = stripMd(cells[2] ?? "").toLowerCase();
        const necessity = stripMd(cells[3] ?? "").toLowerCase();
        const notes = cells[4] ?? "";
        if (ROLES.has(role)) r.role = role;
        if (NECESSITIES.has(necessity)) r.necessity = necessity;
        if (notes) r.notes = stripMd(notes);
        if (r.role && r.necessity) newRows.push(r);
        else console.warn(`  skip NEW (invalid role/necessity): ${domain_code} | ${data_object_name} | ${cells[2]} | ${cells[3]}`);
      } else {
        // Expected: domain_code | data_object_name | from (role/necessity) | to (role/necessity) | reasoning
        const fromCell = stripMd(cells[2] ?? "").toLowerCase();
        const toCell = stripMd(cells[3] ?? "").toLowerCase();
        const parsePair = (s: string): { role?: string; necessity?: string } => {
          // Patterns: "consumer / required", "consumer / optional", "consumer/required"
          const m = s.match(/([a-z_]+)\s*[\/\|]\s*([a-z]+)/);
          if (!m) return {};
          const role = m[1];
          const nec = m[2];
          return {
            role: ROLES.has(role) ? role : undefined,
            necessity: NECESSITIES.has(nec) ? nec : undefined,
          };
        };
        const f = parsePair(fromCell);
        const t2 = parsePair(toCell);
        r.from_role = f.role;
        r.from_necessity = f.necessity;
        r.to_role = t2.role;
        r.to_necessity = t2.necessity;
        if (r.to_role || r.to_necessity) changeRows.push(r);
        else console.warn(`  skip CHANGE (unparseable from/to): ${domain_code} | ${data_object_name} | ${cells[2]} | ${cells[3]}`);
      }
    }
  }
  return { newRows, changeRows };
}

async function loadCluster(slug: string, dryRun: boolean) {
  const path = resolve(`c:/dev/domain-map/.tmp_deploy/embedded_master_backfill_${slug}.md`);
  const md = readFileSync(path, "utf8");
  console.log(`\n========== ${slug.toUpperCase()} ==========`);
  console.log(`Source: ${path}`);

  const { newRows, changeRows } = extractTables(md);
  console.log(`Parsed: ${newRows.length} NEW rows, ${changeRows.length} CHANGE rows`);

  // Resolve domain_code → id and data_object_name → id
  const allCodes = new Set<string>();
  const allNames = new Set<string>();
  for (const r of [...newRows, ...changeRows]) {
    allCodes.add(r.domain_code);
    allNames.add(r.data_object_name);
  }
  const codeList = [...allCodes].join(",");
  const nameList = [...allNames].join(",");
  const domains = await get(`/domains?domain_code=in.(${codeList})&select=id,domain_code&limit=500`);
  const dobjs = await get(`/data_objects?data_object_name=in.(${nameList})&select=id,data_object_name&limit=2000`);
  const domainMap = new Map<string, number>(domains.map((d: any) => [d.domain_code as string, d.id as number]));
  const dobjMap = new Map<string, number>(dobjs.map((d: any) => [d.data_object_name as string, d.id as number]));

  console.log(`Resolved: ${domainMap.size}/${allCodes.size} domain codes, ${dobjMap.size}/${allNames.size} data_object names`);

  const missingDomains = [...allCodes].filter(c => !domainMap.has(c));
  const missingDobjs = [...allNames].filter(n => !dobjMap.has(n));
  if (missingDomains.length) console.warn(`  Missing domain codes: ${missingDomains.join(", ")}`);
  if (missingDobjs.length) console.warn(`  Missing data_objects: ${missingDobjs.slice(0, 20).join(", ")}${missingDobjs.length > 20 ? ` … (+${missingDobjs.length - 20} more)` : ""}`);

  // Pull existing rows for the cluster's (domain_id, data_object_id) pairs we touch
  const domainIds = [...domainMap.values()];
  if (domainIds.length === 0) {
    console.error("No domain IDs resolved — aborting cluster");
    return;
  }
  const existing = await get(`/domain_data_objects?domain_id=in.(${domainIds.join(",")})&select=id,domain_id,data_object_id,role,necessity,notes&limit=5000`);
  const existingKey = new Map<string, any>();
  for (const r of existing as any[]) existingKey.set(`${r.domain_id}|${r.data_object_id}`, r);

  // Plan NEW inserts (skip ones already present)
  const toInsert: any[] = [];
  const skippedExisting: ParsedRow[] = [];
  for (const r of newRows) {
    const did = domainMap.get(r.domain_code);
    const oid = dobjMap.get(r.data_object_name);
    if (!did || !oid) continue;
    const k = `${did}|${oid}`;
    if (existingKey.has(k)) { skippedExisting.push(r); continue; }
    toInsert.push({
      domain_id: did,
      data_object_id: oid,
      role: r.role,
      necessity: r.necessity,
      notes: r.notes ?? "",
    });
  }

  // Plan CHANGE updates
  const toUpdate: { id: number; patch: any; row: ParsedRow }[] = [];
  const noChangeNeeded: ParsedRow[] = [];
  const missingChangeTarget: ParsedRow[] = [];
  for (const r of changeRows) {
    const did = domainMap.get(r.domain_code);
    const oid = dobjMap.get(r.data_object_name);
    if (!did || !oid) { missingChangeTarget.push(r); continue; }
    const existing = existingKey.get(`${did}|${oid}`);
    if (!existing) { missingChangeTarget.push(r); continue; }
    const patch: any = {};
    if (r.to_role && existing.role !== r.to_role) patch.role = r.to_role;
    if (r.to_necessity && existing.necessity !== r.to_necessity) patch.necessity = r.to_necessity;
    if (Object.keys(patch).length === 0) { noChangeNeeded.push(r); continue; }
    toUpdate.push({ id: existing.id, patch, row: r });
  }

  console.log(`Plan:`);
  console.log(`  NEW inserts:     ${toInsert.length}  (skipped already-present: ${skippedExisting.length})`);
  console.log(`  CHANGE updates:  ${toUpdate.length}  (no-op: ${noChangeNeeded.length}, missing target: ${missingChangeTarget.length})`);
  if (dryRun) {
    console.log(`\nDRY-RUN sample inserts (first 5):`);
    for (const r of toInsert.slice(0, 5)) console.log(`  ${JSON.stringify(r)}`);
    console.log(`\nDRY-RUN sample updates (first 5):`);
    for (const u of toUpdate.slice(0, 5)) console.log(`  id=${u.id} patch=${JSON.stringify(u.patch)}  [${u.row.domain_code} ${u.row.data_object_name}]`);
    return;
  }

  // Apply inserts in chunks of 50
  let inserted = 0;
  const CHUNK = 50;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const slice = toInsert.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path: "/domain_data_objects", body: slice });
    inserted += (result as any[]).length;
    console.log(`  inserted ${inserted}/${toInsert.length}`);
  }

  // Apply updates one by one (PostgREST PATCH on id)
  let updated = 0;
  for (const u of toUpdate) {
    await call({ method: "PATCH", path: `/domain_data_objects?id=eq.${u.id}`, body: u.patch });
    updated++;
    if (updated % 25 === 0 || updated === toUpdate.length) console.log(`  updated ${updated}/${toUpdate.length}`);
  }

  console.log(`Done: ${inserted} inserted, ${updated} updated.`);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry");
const clusters = args.filter(a => !a.startsWith("--"));
if (clusters.length === 0) {
  console.error("Usage: bun run load_embedded_master_backfill.ts [--dry] <slug> [<slug> ...]");
  process.exit(1);
}
for (const slug of clusters) {
  await loadCluster(slug, dryRun);
}
