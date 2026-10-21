#!/usr/bin/env bun
// B1A-CATALOG-UX (2026-06-06): write buyer-voice catalog_tagline + catalog_description
// into the EMPTY fields on the FMIS domain (154) and its 4 modules (252-255).
// Empty-guard per field: write only where the current value is empty; never overwrite.
// Buyer voice (workflow + value), no vendor/product names, no em-dashes, American English.

type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    if (/required audience not found/i.test(err)) throw new Error(`JWT_AUDIENCE_ERROR: ${err}`);
    throw new Error(`semantius failed (exit ${code}): ${err.trim()}`);
  }
  const t = out.trim();
  return t ? JSON.parse(t) : [];
}
const get = (p: string) => call({ method: "GET", path: p });
const patch = (p: string, b: Row) => call({ method: "PATCH", path: p, body: b });

type UX = { tagline: string; description: string };

const DOMAIN_UX: UX = {
  tagline:
    "Run the whole farm from one record: map every field, plan each season, log every operation, and turn it into yield and profit insight.",
  description:
    "Bring spatial field maps, season crop plans, and day-to-day operations into a single source of truth so you always know what was planted, sprayed, and harvested on every acre. Capture planting passes, chemical and fertilizer applications, and harvest yields as you go, then reconcile them against input stock and machinery activity without chasing paper or spreadsheets.\n\nUse that record to author site-specific application maps, watch input levels before you run out, and answer the questions that move margin: which fields earned their keep, where inputs were over- or under-applied, and how this season compares to the last few. The same trail gives you defensible application and harvest evidence when a buyer, auditor, or regulator asks.",
};

const MODULE_UX: Record<number, UX> = {
  252: {
    tagline:
      "Draw your fields once, then plan every season and rotation on top of accurate boundaries.",
    description:
      "Map field and paddock boundaries from GPS, imagery, or existing records so every operation downstream is tied to the right acres. Adjust boundaries as fields split, merge, or change use, and keep one trusted set of spatial units for the whole operation.\n\nLayer a crop plan onto each field for the coming season and model multi-year rotations to balance soil health, input cost, and market timing. Commit plans when they are ready so planting, spraying, and harvest teams all work from the same intended program.",
  },
  253: {
    tagline:
      "Log what actually happened in each field, pass by pass, with an audit trail you can stand behind.",
    description:
      "Record planting events, chemical and fertilizer applications, and harvest yields as operations happen in the field, on a phone or in the cab. Capture the rate, product, timing, weather, and operator for each pass so nothing is reconstructed from memory at season end.\n\nThe result is a complete, time-stamped history of every field that supports re-entry and pre-harvest interval checks, proves what was applied and when, and feeds traceability and food-safety requests. When a buyer or auditor needs evidence, the record is already there.",
  },
  254: {
    tagline:
      "Turn field data into variable-rate maps and bring your machinery telemetry into the same system.",
    description:
      "Author site-specific prescriptions that vary seed, fertilizer, and chemical rates by zone, built from yield history and soil tests, then publish them to your equipment for execution. Apply inputs where they pay off and pull back where they do not, instead of treating every acre the same.\n\nIngest normalized machinery telemetry from your fleet so as-applied and as-harvested data flows back automatically over standard equipment buses and OEM connections. Close the loop between the map you planned and the work the machines actually did.",
  },
  255: {
    tagline:
      "Know what input stock you have, what each field cost, and which acres returned the most.",
    description:
      "Track seed, fertilizer, and chemical inventory and reconcile it against application and purchase records so on-hand quantities stay accurate and low stock is flagged before it stops an operation. Tie every input draw back to the field and pass that consumed it.\n\nPair that with multi-season yield and field-performance analytics to see profitability per zone and return on each input. Compare fields and seasons, find where money was made or lost, and carry those lessons into next year's plan.",
  },
};

function hasEm(s: string): boolean { return s.includes("—"); }

async function main() {
  // guard: no em-dashes anywhere
  const all = [DOMAIN_UX, ...Object.values(MODULE_UX)];
  for (const u of all) {
    if (hasEm(u.tagline) || hasEm(u.description)) throw new Error("em-dash detected in copy");
  }

  // ---- domain 154 ----
  const dom = (await get("/domains?id=eq.154&select=id,catalog_tagline,catalog_description"))[0];
  const domPatch: Row = {};
  if (!String(dom.catalog_tagline ?? "").trim()) domPatch.catalog_tagline = DOMAIN_UX.tagline;
  else console.log("  domain 154 catalog_tagline non-empty -> guard skip");
  if (!String(dom.catalog_description ?? "").trim()) domPatch.catalog_description = DOMAIN_UX.description;
  else console.log("  domain 154 catalog_description non-empty -> guard skip");
  if (Object.keys(domPatch).length) {
    await patch("/domains?id=eq.154", domPatch);
    console.log(`  PATCHED domain 154: ${Object.keys(domPatch).join(", ")}`);
  }

  // ---- modules 252-255 ----
  const mods = await get(
    "/domain_modules?id=in.(252,253,254,255)&select=id,catalog_tagline,catalog_description&order=id.asc",
  );
  for (const m of mods) {
    const id = Number(m.id);
    const ux = MODULE_UX[id];
    const p: Row = {};
    if (!String(m.catalog_tagline ?? "").trim()) p.catalog_tagline = ux.tagline;
    else console.log(`  module ${id} catalog_tagline non-empty -> guard skip`);
    if (!String(m.catalog_description ?? "").trim()) p.catalog_description = ux.description;
    else console.log(`  module ${id} catalog_description non-empty -> guard skip`);
    if (Object.keys(p).length) {
      await patch(`/domain_modules?id=eq.${id}`, p);
      console.log(`  PATCHED module ${id}: ${Object.keys(p).join(", ")}`);
    }
  }
  console.log("== catalog UX done ==");
}
main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
