// Shared helpers for the EHS loader phases.
// Idempotent natural-key loads, chunked POSTs, stdin to avoid Windows cmdline limits.

export type Row = Record<string, unknown>;

export async function ehsCall(body: Row): Promise<Row[]> {
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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}\nbody=${JSON.stringify(body).slice(0, 400)}`);
  }
  const text = stdout.trim();
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response: ${text.slice(0, 400)}`);
  }
}

export async function get(path: string): Promise<Row[]> {
  return ehsCall({ method: "GET", path });
}

// Normalize a batch to the union of keys so PostgREST bulk insert accepts it.
function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map(r => {
    const out: Row = {};
    for (const k of keys) out[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return out;
  });
}

export async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const result = await ehsCall({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

export async function syncTable<T extends Row>(
  path: string,
  rows: T[],
  keyField: keyof T & string,
): Promise<Map<string, number>> {
  const existing = await get(`${path}?select=id,${keyField}&limit=20000`);
  const existingKeys = new Set(existing.map(r => String(r[keyField])));
  const missing = rows.filter(r => !existingKeys.has(String(r[keyField])));
  if (missing.length > 0) {
    console.log(`  inserting ${missing.length} new rows into ${path} (${existing.length} existed)`);
    await insert(path, missing);
  } else {
    console.log(`  ${path}: ${rows.length} rows already present, nothing to insert (${existing.length} total)`);
  }
  const all = await get(`${path}?select=id,${keyField}&limit=20000`);
  const map = new Map<string, number>();
  for (const r of all) map.set(String(r[keyField]), Number(r.id));
  return map;
}

// Rule #8: hard-fail any domains row missing business metadata before the POST.
export function validateDomainRow(d: Row): void {
  const crud = Number(d.crud_percentage);
  const minOrg = String(d.min_org_size ?? "");
  const costBand = String(d.cost_band ?? "");
  const bizLogic = String(d.business_logic ?? "");
  const usa = Number(d.usa_market_size_usd_m);
  const year = Number(d.market_size_source_year);
  const errs: string[] = [];
  if (!(crud > 0)) errs.push("crud_percentage must be > 0");
  if (minOrg === "") errs.push("min_org_size empty");
  if (costBand === "") errs.push("cost_band empty");
  if (bizLogic === "" && crud < 95) errs.push("business_logic empty while crud_percentage < 95");
  if (!(usa > 0)) errs.push("usa_market_size_usd_m must be > 0");
  if (!(year > 0)) errs.push("market_size_source_year must be > 0");
  if (typeof d.certification_required !== "boolean") errs.push("certification_required must be boolean");
  if (errs.length) {
    throw new Error(`validateDomainRow failed for ${d.domain_code}: ${errs.join("; ")}`);
  }
}
