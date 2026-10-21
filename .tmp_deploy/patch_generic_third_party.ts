// Generic patcher: reads proposals JSON file + table name, PATCHes dirty rows.
//   bun run .tmp_deploy/patch_generic_third_party.ts <table> <proposals.json>

const table = process.argv[2];
const file = process.argv[3];
if (!table || !file) { console.error("usage: <table> <proposals.json>"); process.exit(1); }

type FieldEdit = { current: string; proposed: string; [k: string]: any };
type Proposal = { id: number; status: "clean" | "dirty"; fields?: Record<string, FieldEdit>; [k: string]: any };

const proposals = (await Bun.file(file).json()) as Proposal[];
const dirty = proposals.filter((p) => p.status === "dirty");
console.log(`patching ${dirty.length} ${table} rows from ${file}`);

let ok = 0;
let fail = 0;
for (const r of dirty) {
  const body: Record<string, string> = {};
  for (const [field, info] of Object.entries(r.fields ?? {})) body[field] = info.proposed;
  const payload = { method: "PATCH", path: `/${table}?id=eq.${r.id}`, body };
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)], { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0 || (err && err.toLowerCase().includes("error"))) {
    fail++;
    console.log(`  [FAIL] id=${r.id}: ${err.slice(0, 200)}`);
  } else {
    ok++;
    if (ok % 20 === 0) console.log(`  ...${ok}/${dirty.length}`);
  }
}
console.log(`done: ${ok} ok, ${fail} failed`);
