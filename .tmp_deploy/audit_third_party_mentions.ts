// Scans forbidden-zone text fields in the domain_map catalog for vendor / product
// name leaks per Rule #18. Output: violations grouped by (table, field), each
// listing matched names + row id + offending excerpt.
//
// Run from project root:
//   bun run .tmp_deploy/audit_third_party_mentions.ts

type Row = Record<string, unknown>;

async function fetchJson(path: string): Promise<Row[]> {
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "GET", path })],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius failed for ${path}\nstdout: ${out}\nstderr: ${err}`);
  }
  return JSON.parse(out);
}

// Common English words that happen to also be vendor names in the catalog.
// Never flag — the match is almost always the English word, not the vendor.
const NEVER_FLAG = new Set([
  "Action", "Active", "Adobe", "Ada", "Aha", "Aim", "Apple", "Apply", "Arc",
  "Asset", "Audit", "Beam", "Board", "Box", "Brand", "Capital", "Cargo",
  "Cascade", "Channel", "Cloud", "Color", "Compass", "Compose", "Connect",
  "Core", "Domain", "Engine", "Field", "Fleet", "Focus", "Forecast", "Form",
  "Foundry", "Fresh", "Gateway", "Grid", "Group", "Hub", "Insight", "Insights",
  "Interact", "Launch", "Link", "Lite", "Live", "Lock", "Loop", "Master",
  "Match", "Matters", "Metro", "Mix", "Net", "NICE", "Notes", "Open", "Origin",
  "Pay", "Pilot", "Plan", "Platform", "Plus", "Power", "Pro", "Provenance",
  "Pulse", "Push", "Recall", "Relay", "Remote", "Render", "Reply", "Rise",
  "Route", "Sage", "Sigma", "Sign", "Smart", "Space", "Spark", "Square",
  "Stack", "Stash", "Storm", "Strategy", "Stream", "Strike", "Suite", "Sync",
  "Tag", "Talk", "Track", "Trust", "Vault", "View", "Vista", "Vision", "Voice",
  "Wave", "Way", "Wise", "Workflow", "World", "Zest",
  // Short / acronyms that match too aggressively
  "ADP", "BMC", "GE", "HP", "IBM", "OSF", "SAP", "SaaS", "iOS", "Mac", "PHP",
  "PMI", "PRM", "Six", "Sun", "Yes", "ai", "x",
]);

// Forbidden tables + text fields. Per Rule #18 §"Forbidden everywhere else".
const TARGETS: Array<{ table: string; idField: string; nameField?: string; textFields: string[]; selectExtra?: string }> = [
  { table: "domains", idField: "id", nameField: "domain_code", textFields: ["description", "business_logic"] },
  { table: "domain_modules", idField: "id", nameField: "domain_module_code", textFields: ["description"] },
  { table: "data_objects", idField: "id", nameField: "data_object_name", textFields: ["description", "notes"] },
  { table: "handoffs", idField: "id", textFields: ["description", "notes"] },
  { table: "capabilities", idField: "id", nameField: "capability_code", textFields: ["description"] },
  { table: "trigger_events", idField: "id", nameField: "event_name", textFields: ["description"] },
  { table: "processes", idField: "id", nameField: "process_name", textFields: ["description"] },
  { table: "tools", idField: "id", nameField: "tool_name", textFields: ["description"] },
  { table: "skills", idField: "id", nameField: "skill_name", textFields: ["description"] },
  { table: "domain_data_objects", idField: "id", textFields: ["notes"] },
  { table: "domain_module_data_objects", idField: "id", textFields: ["notes"] },
  { table: "data_object_relationships", idField: "id", textFields: ["notes"] },
  { table: "domain_starter_modules", idField: "id", textFields: ["notes"] },
  { table: "skill_tools", idField: "id", textFields: ["notes"] },
];

function tokenize(name: string): string[] {
  // Use the full name as-is, plus a "drop legal suffix" variant for "Foo Inc",
  // "Bar GmbH", etc. Do NOT split into first-word — that was the false-positive
  // engine (Provenance Ltd → "Provenance", Interact Software → "Interact",
  // Strategy Inc → "Strategy"). Multi-word vendor names get matched as multi-word.
  const trimmed = name.trim();
  const dropSuffix = trimmed
    .replace(/\s+(Inc\.?|LLC|Ltd\.?|GmbH|PBC|SE|NV|Pty Ltd|Corporation|Corp\.?|Co\.?|Software|Systems|Software GmbH|Labs Inc\.?)$/i, "")
    .replace(/\s+(Inc\.?|LLC|Ltd\.?|GmbH|PBC|SE|NV|Pty Ltd|Corporation|Corp\.?|Co\.?)$/i, "");
  const out = new Set<string>();
  if (trimmed.length >= 4) out.add(trimmed);
  if (dropSuffix !== trimmed && dropSuffix.length >= 4) out.add(dropSuffix);
  return [...out];
}

function buildNeedles(vendors: Row[], solutions: Row[]): { needle: string; canonical: string }[] {
  const map = new Map<string, string>();
  for (const v of vendors) {
    for (const tok of tokenize(String(v.vendor_name))) {
      if (NEVER_FLAG.has(tok)) continue;
      if (!map.has(tok)) map.set(tok, String(v.vendor_name));
    }
  }
  for (const s of solutions) {
    for (const tok of tokenize(String(s.solution_name))) {
      if (NEVER_FLAG.has(tok)) continue;
      if (!map.has(tok)) map.set(tok, String(s.solution_name));
    }
  }
  return [...map.entries()].map(([needle, canonical]) => ({ needle, canonical }));
}

function scanText(text: string, needles: ReturnType<typeof buildNeedles>): { matched: string; canonical: string }[] {
  const hits: { matched: string; canonical: string }[] = [];
  for (const { needle, canonical } of needles) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Word-boundary, case-sensitive. Vendor names are proper nouns; matching
    // case-sensitively cuts most remaining false positives (e.g. "render" the
    // verb won't match "Render" the vendor).
    const re = new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`);
    if (re.test(text)) hits.push({ matched: needle, canonical });
  }
  return hits;
}

async function main() {
  console.log("Loading vendor + solution name lists ...");
  const vendors = await fetchJson("/vendors?select=vendor_name&limit=5000");
  const solutions = await fetchJson("/solutions?select=solution_name&limit=5000");
  const needles = buildNeedles(vendors, solutions);
  console.log(`  ${vendors.length} vendors, ${solutions.length} solutions => ${needles.length} unique needles\n`);

  const violations: Array<{ table: string; id: number; nameKey: string; field: string; matched: string[]; excerpt: string }> = [];

  for (const t of TARGETS) {
    const cols = ["id", ...(t.nameField ? [t.nameField] : []), ...t.textFields];
    const path = `/${t.table}?select=${cols.join(",")}&limit=10000`;
    let rows: Row[];
    try {
      rows = await fetchJson(path);
    } catch (e) {
      console.error(`  [skip] ${t.table}: ${String(e).slice(0, 200)}`);
      continue;
    }
    let perTable = 0;
    for (const r of rows) {
      for (const f of t.textFields) {
        const txt = r[f];
        if (typeof txt !== "string" || txt.length === 0) continue;
        const hits = scanText(txt, needles);
        if (hits.length === 0) continue;
        const uniq = [...new Set(hits.map((h) => h.canonical))];
        // Capture an excerpt around the first match
        const firstNeedle = hits[0].matched;
        const idx = txt.indexOf(firstNeedle);
        const excerpt = txt.slice(Math.max(0, idx - 60), Math.min(txt.length, idx + firstNeedle.length + 60));
        violations.push({
          table: t.table,
          id: Number(r.id),
          nameKey: t.nameField ? String(r[t.nameField] ?? "") : "",
          field: f,
          matched: uniq,
          excerpt: excerpt.replace(/\s+/g, " ").trim(),
        });
        perTable++;
      }
    }
    console.log(`  ${t.table}: ${rows.length} rows scanned, ${perTable} violation${perTable === 1 ? "" : "s"}`);
  }

  console.log(`\n=== ${violations.length} violation${violations.length === 1 ? "" : "s"} total ===\n`);

  // Group by table for the report
  const byTable = new Map<string, typeof violations>();
  for (const v of violations) {
    if (!byTable.has(v.table)) byTable.set(v.table, []);
    byTable.get(v.table)!.push(v);
  }
  for (const [table, vs] of [...byTable.entries()].sort()) {
    console.log(`\n## ${table} (${vs.length})`);
    for (const v of vs.sort((a, b) => a.id - b.id)) {
      const key = v.nameKey ? `${v.nameKey} (id=${v.id})` : `id=${v.id}`;
      console.log(`  - ${key} . ${v.field}`);
      console.log(`      matched: ${v.matched.join(", ")}`);
      console.log(`      excerpt: "...${v.excerpt}..."`);
    }
  }

  // Also persist as JSON for downstream patching.
  await Bun.write("c:/tmp/audit_third_party_violations.json", JSON.stringify(violations, null, 2));
  console.log(`\nWrote c:/tmp/audit_third_party_violations.json (${violations.length} rows)`);
}

await main();
