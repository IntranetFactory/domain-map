// Apply v3 proposed text to the 68 dirty `domains` rows.
// Reads c:/tmp/domains_proposals_all_v3.json; PATCHes one row at a time via
// semantius CLI. Does NOT touch record_status (Rule #1: never approve from a
// loader). Per-row PATCH bodies are small enough for inline CLI args; no
// stdin/chunking needed here.
//
//   bun run .tmp_deploy/patch_domains_third_party.ts

type FieldEdit = { deleted_sentences: string[]; current: string; proposed: string };
type Proposal = { id: number; domain_code: string; status: "clean" | "dirty"; fields?: Record<string, FieldEdit> };

const proposals = (await Bun.file("c:/tmp/domains_proposals_all_v3.json").json()) as Proposal[];
const dirty = proposals.filter((p) => p.status === "dirty");
console.log(`patching ${dirty.length} domain rows`);

let ok = 0;
let fail = 0;
const failures: Array<{ id: number; code: string; error: string }> = [];

for (const r of dirty) {
  const body: Record<string, string> = {};
  for (const [field, info] of Object.entries(r.fields ?? {})) {
    body[field] = info.proposed;
  }
  const payload = {
    method: "PATCH",
    path: `/domains?id=eq.${r.id}`,
    body,
  };
  const proc = Bun.spawn(
    ["semantius", "call", "crud", "postgrestRequest", JSON.stringify(payload)],
    { stdout: "pipe", stderr: "pipe" },
  );
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0 || (err && err.toLowerCase().includes("error"))) {
    fail++;
    failures.push({ id: r.id, code: r.domain_code, error: err.slice(0, 300) + " | stdout: " + out.slice(0, 300) });
    console.log(`  [FAIL] ${r.domain_code} (id=${r.id})`);
  } else {
    ok++;
    if (ok % 10 === 0) console.log(`  ...${ok}/${dirty.length} patched`);
  }
}

console.log(`\ndone: ${ok} ok, ${fail} failed`);
if (failures.length) {
  console.log("\nfailures:");
  for (const f of failures) console.log(`  ${f.code} (id=${f.id}): ${f.error}`);
}
