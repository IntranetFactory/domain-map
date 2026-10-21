// NCDB B1A-CATALOG-UX executor (Rule #20).
// Writes buyer-voice catalog_tagline + catalog_description into the EMPTY fields on the
// NCDB domain row (134) and its three modules (282/283/284). Empty-guard per field:
// write only where the current value is empty; never overwrite a non-empty value.
// Run from project root: bun run .tmp_deploy/ncdb_b1a_catalog_ux_2026_06_06.ts

type Json = any;

async function cli(method: string, path: string, body?: Json): Promise<Json> {
  const arg: Json = { method, path };
  if (body !== undefined) arg.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(arg));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) throw new Error(`CLI failed (${method} ${path}): ${err || out}`);
  if (/required audience not found/i.test(out + err)) throw new Error(`JWT-AUDIENCE: ${out} ${err}`);
  try { return out.trim() ? JSON.parse(out) : null; } catch { return out; }
}
const get = (p: string) => cli("GET", p);
const patch = (p: string, b: Json) => cli("PATCH", p, b);

// Buyer-voice copy (workflow + value; no vendor/product names; no em-dashes; American English).
const DOMAIN = {
  id: 134,
  catalog_tagline:
    "Build a database without code. Model your data, capture it through forms, view it your way, and automate the rest.",
  catalog_description:
    "Stand up a working database in an afternoon, no developer required. Design your own tables, add the field types your work actually needs, and link records across tables so related information stays connected. Your data structure is the product: shape it to match how your team works instead of bending your work to fit a rigid tool.\n\n" +
    "Give everyone a way to read and contribute. Switch the same data between grid, gallery, kanban, calendar, and timeline views, each filtered and sorted to the question at hand, and share any view with the people who need it. Collect new information through forms that write straight into your tables, so submissions land clean and ready to use.\n\n" +
    "Put the busywork on autopilot. Trigger actions when records change or on a schedule, send notifications to the right people, and keep your tables in sync with the other systems you rely on. The result is a single place where your team models, captures, works, and automates its operational data.",
};

const MODULES = [
  {
    id: 282, // NCDB-SCHEMA-BUILDER
    catalog_tagline:
      "Model your data without code: design tables, pick the right field types, and link records across them.",
    catalog_description:
      "Create the data model behind your tools without writing a line of code. Add your own tables, choose from rich field types for text, numbers, dates, attachments, single and multi-select, and more, and connect related records across tables so a customer, a project, or an order pulls in everything tied to it.\n\n" +
      "Go beyond plain storage with formula and rollup columns that calculate and summarize automatically as records change. The schema you build here becomes the foundation the rest of your workspace reads from, so the views, forms, and automations your team uses all stay in step with one source of truth.",
  },
  {
    id: 283, // NCDB-VIEWS-FORMS
    catalog_tagline:
      "See your data your way and collect new records through forms that write straight into your tables.",
    catalog_description:
      "Give every person the right window onto the same data. Switch between grid, gallery, kanban, calendar, and timeline views, and filter, sort, and group each one independently so a planner, a reviewer, and an executive each see exactly what they need. Share a view with a teammate or a stakeholder without handing over the whole table.\n\n" +
      "Capture clean information at the source with forms that write directly into your tables. Publish a form for public or authenticated submissions, and every response lands as a structured record ready to work with, no copying or re-keying. It is the everyday working surface for people who read and contribute data without ever touching the underlying schema.",
  },
  {
    id: 284, // NCDB-AUTOMATION-SYNC
    catalog_tagline:
      "Automate the busywork and keep your tables in sync with the systems you already run on.",
    catalog_description:
      "Replace manual follow-up with automations that run themselves. Trigger actions when a record is created or changes, or on a schedule you set, then notify the right people, update records, and call out to other services as part of the flow. The repetitive steps your team does by hand become reliable, hands-off workflows.\n\n" +
      "Keep your database connected to your systems of record. Sync data in or out, live or on a schedule, so your tables stay current with the canonical source instead of drifting into a stale copy. Your workspace becomes a working surface over real data, not a snapshot that someone has to keep refreshing.",
  },
];

async function main() {
  // Domain row.
  const dRow = await get(`/domains?id=eq.${DOMAIN.id}&select=catalog_tagline,catalog_description`);
  const d = Array.isArray(dRow) ? dRow[0] : dRow;
  const dPatch: Json = {};
  if (!d.catalog_tagline || d.catalog_tagline.trim() === "") dPatch.catalog_tagline = DOMAIN.catalog_tagline;
  else console.log(`domain ${DOMAIN.id} catalog_tagline non-empty -> SKIP (overwrite-protected)`);
  if (!d.catalog_description || d.catalog_description.trim() === "") dPatch.catalog_description = DOMAIN.catalog_description;
  else console.log(`domain ${DOMAIN.id} catalog_description non-empty -> SKIP (overwrite-protected)`);
  if (Object.keys(dPatch).length > 0) {
    await patch(`/domains?id=eq.${DOMAIN.id}`, dPatch);
    console.log(`PATCHed domain ${DOMAIN.id}: ${Object.keys(dPatch).join(", ")}`);
  }

  // Module rows.
  for (const m of MODULES) {
    const mRow = await get(`/domain_modules?id=eq.${m.id}&select=catalog_tagline,catalog_description`);
    const r = Array.isArray(mRow) ? mRow[0] : mRow;
    const p: Json = {};
    if (!r.catalog_tagline || r.catalog_tagline.trim() === "") p.catalog_tagline = m.catalog_tagline;
    else console.log(`module ${m.id} catalog_tagline non-empty -> SKIP (overwrite-protected)`);
    if (!r.catalog_description || r.catalog_description.trim() === "") p.catalog_description = m.catalog_description;
    else console.log(`module ${m.id} catalog_description non-empty -> SKIP (overwrite-protected)`);
    if (Object.keys(p).length > 0) {
      await patch(`/domain_modules?id=eq.${m.id}`, p);
      console.log(`PATCHed module ${m.id}: ${Object.keys(p).join(", ")}`);
    }
  }
  console.log("DONE B1A-CATALOG-UX");
}

await main();
