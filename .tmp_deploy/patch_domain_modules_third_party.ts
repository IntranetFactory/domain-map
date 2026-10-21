// Apply proposed text to dirty `domain_modules` rows.
//   bun run .tmp_deploy/patch_domain_modules_third_party.ts

type FieldEdit = { current: string; proposed: string; [k: string]: any };
type Proposal = { id: number; domain_module_code: string; status: "clean" | "dirty"; fields?: Record<string, FieldEdit> };

const proposals = (await Bun.file("c:/tmp/domain_modules_proposals_all.json").json()) as Proposal[];
const dirty = proposals.filter((p) => p.status === "dirty");
console.log(`patching ${dirty.length} domain_modules rows`);

let ok = 0;
let fail = 0;
for (const r of dirty) {
  const body: Record<string, string> = {};
  for (const [field, info] of Object.entries(r.fields ?? {})) body[field] = info.proposed;
  const payload = { method: "PATCH", path: `/domain_modules?id=eq.${r.id}`, body };
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0 || (err && err.toLowerCase().includes("error"))) {
    fail++;
    console.log(`  [FAIL] ${r.domain_module_code} (id=${r.id}): ${err.slice(0, 200)}`);
  } else {
    ok++;
  }
}
console.log(`\ndone: ${ok} ok, ${fail} failed`);
