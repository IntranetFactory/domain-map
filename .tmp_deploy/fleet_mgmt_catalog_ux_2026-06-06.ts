#!/usr/bin/env bun
// B1A-CATALOG-UX-COPY for FLEET-MGMT (domain 147 + modules 204/205/206).
// Writes buyer-voice catalog_tagline / catalog_description into EMPTY fields only.
// Empty-guard per field: never overwrites a non-empty value (Rule #20 / task rule #6).
// Snapshots prior values to stdout so the audit history is reversible.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
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
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
async function get(path: string): Promise<Row[]> {
  return call({ method: "GET", path });
}

// ---- buyer-voice copy (workflow + value; no vendor/product names; no em-dashes) ----

const DOMAIN = {
  id: 147,
  catalog_tagline:
    "Run your whole fleet from one place: every vehicle, every driver, and every fuel dollar, with DOT and IFTA compliance built in.",
  catalog_description:
    "Know what you own and how hard it works. Track each vehicle from the day you acquire it through every assignment, repair, and resale, and see at a glance which units earn their keep and which are costing you money. Put the right driver in the right vehicle, keep licenses and medical cards current, and stay on top of pre-trip and post-trip inspections so nothing rolls out unsafe. Watch fuel and charging spend in real time, catch exceptions before they add up, and turn raw mileage and fuel data into the DOT, IFTA, and IRP filings auditors ask for. Whether you run delivery vans, service trucks, or heavy rigs, you get one clear view of cost, safety, and compliance across the entire fleet.",
};

const MODULES = [
  {
    id: 204, // FLEET-MGMT-VEHICLE-LIFECYCLE
    catalog_tagline:
      "Manage every vehicle as an asset, from acquisition to resale, and know exactly what each one costs you to run.",
    catalog_description:
      "Keep a single, trusted record for every vehicle you own or lease, and follow it through its whole life: acquisition, putting it in service, reassigning it, retiring it, and selling it on. See utilization clearly, productive miles versus idle and deadhead time, and compare cost per mile and cost per hour across the fleet so you can right-size and replace at the right moment. Stop guessing about your assets and make purchase, hold, and disposal decisions on real numbers.",
  },
  {
    id: 205, // FLEET-MGMT-DRIVER-OPS
    catalog_tagline:
      "Match the right driver to the right vehicle, run the daily dispatch board, and keep every inspection on file.",
    catalog_description:
      "Maintain complete driver records, licenses, medical cards, training, and hours-of-service status, so you always know who is cleared to drive. Assign vehicles to drivers, routes, and jobs for set windows, and run a daily dispatch board that matches available capacity to the work in front of you. Capture pre-trip and post-trip inspection reports so defects surface early and nothing unsafe leaves the yard. Everything driver, assignment, and inspection lives together, ready when you need to prove it.",
  },
  {
    id: 206, // FLEET-MGMT-FUEL-COMPLIANCE
    catalog_tagline:
      "Track every fuel and charging dollar, flag the exceptions, and turn the data into your DOT and IFTA filings.",
    catalog_description:
      "Bring every fuel-card and charging transaction into one place, then spot fueling exceptions and mpg trends before they quietly drain the budget. Watch cost per mile and cost per gallon by vehicle and by driver, and act on the outliers. When filing season comes, turn your fuel and mileage data into DOT registration, IFTA fuel-tax, and IRP apportioned-registration reporting, with the audit evidence ready to hand. Spend less time chasing paperwork and more time keeping the fleet compliant.",
  },
];

function guardEmDash(label: string, s: string) {
  if (s.includes("—")) throw new Error(`em-dash found in ${label}`);
}

async function patchRow(
  table: string,
  id: number,
  current: Row,
  proposed: { catalog_tagline: string; catalog_description: string },
): Promise<{ table: string; id: number; wrote: string[]; skipped: string[]; prior: Row }> {
  const body: Row = {};
  const wrote: string[] = [];
  const skipped: string[] = [];
  const prior: Row = {};
  for (const field of ["catalog_tagline", "catalog_description"] as const) {
    guardEmDash(`${table}.${id}.${field}`, proposed[field]);
    const cur = String(current[field] ?? "");
    prior[field] = cur;
    if (cur === "") {
      body[field] = proposed[field];
      wrote.push(field);
    } else {
      skipped.push(field); // empty-guard: never overwrite a non-empty value
    }
  }
  if (wrote.length > 0) {
    await call({
      method: "PATCH",
      path: `/${table}?id=eq.${id}`,
      body,
    });
  }
  return { table, id, wrote, skipped, prior };
}

// ---- domain 147 ----
const domRows = await get(
  `/domains?id=eq.${DOMAIN.id}&select=catalog_tagline,catalog_description`,
);
if (domRows.length !== 1) throw new Error(`domains ${DOMAIN.id} not found`);
const domResult = await patchRow("domains", DOMAIN.id, domRows[0], {
  catalog_tagline: DOMAIN.catalog_tagline,
  catalog_description: DOMAIN.catalog_description,
});

// ---- modules 204/205/206 ----
const modIds = MODULES.map((m) => m.id).join(",");
const modRows = await get(
  `/domain_modules?id=in.(${modIds})&select=id,catalog_tagline,catalog_description`,
);
const modById = new Map(modRows.map((r) => [Number(r.id), r]));
const modResults = [];
for (const m of MODULES) {
  const cur = modById.get(m.id);
  if (!cur) throw new Error(`domain_modules ${m.id} not found`);
  modResults.push(
    await patchRow("domain_modules", m.id, cur, {
      catalog_tagline: m.catalog_tagline,
      catalog_description: m.catalog_description,
    }),
  );
}

// ---- summary ----
console.log("\n=== FLEET-MGMT catalog UX write summary ===");
for (const r of [domResult, ...modResults]) {
  console.log(`\n${r.table} id=${r.id}`);
  console.log(`  wrote:   ${r.wrote.join(", ") || "(none)"}`);
  console.log(`  skipped: ${r.skipped.join(", ") || "(none)"}`);
  console.log(`  prior.catalog_tagline:     ${JSON.stringify(r.prior.catalog_tagline)}`);
  console.log(`  prior.catalog_description: ${JSON.stringify(r.prior.catalog_description)}`);
}

// ---- verify ----
console.log("\n=== verification re-read ===");
const verDom = await get(`/domains?id=eq.${DOMAIN.id}&select=id,catalog_tagline,catalog_description`);
const verMod = await get(
  `/domain_modules?id=in.(${modIds})&select=id,catalog_tagline,catalog_description&order=id.asc`,
);
for (const r of [...verDom, ...verMod]) {
  const t = String(r.catalog_tagline ?? "");
  const d = String(r.catalog_description ?? "");
  console.log(
    `  id=${r.id}: tagline ${t ? "SET(" + t.length + ")" : "EMPTY"}, description ${d ? "SET(" + d.length + ")" : "EMPTY"}`,
  );
}
