// List domains with AGENT work pending, ranked by how many other domains depend on them.
// Agent work pending = status=='audit_stale' (review needed) OR b1a non-empty (b1a work).
// Blocked count reused from .tmp_deploy/blocking_domains_result.json (combined dependency count).

import { Glob } from "bun";

async function sh(cmd: string[]): Promise<string> {
  const p = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  await p.exited;
  if (p.exitCode !== 0) throw new Error(`${cmd.join(" ")} failed (${p.exitCode}):\n${err}\n${out}`);
  return out;
}

// 1. Catalog domains
const domains: { id: number; domain_code: string }[] = JSON.parse(
  await sh(["semantius", "call", "crud", "postgrestRequest", JSON.stringify({ method: "GET", path: "/domains?select=id,domain_code&limit=10000" })]),
);

// 2. Audit state per domain via yq
const files: string[] = [];
for await (const f of new Glob("audits/*/state.yaml").scan({ cwd: "c:/dev/domain-map" })) files.push("c:/dev/domain-map/" + f);
const tsv = await sh(["yq", "-r", "[.domain, .status, .next_action_by, (.b1a // [] | length)] | @tsv", ...files]);
const state = new Map<string, { status: string; naby: string; b1a: number }>();
for (const line of tsv.trim().split("\n")) {
  const [domain, status, naby, b1a] = line.split("\t");
  if (domain) state.set(domain, { status, naby, b1a: parseInt(b1a || "0", 10) });
}

// 3. Blocking counts
const blocking: { domain_code: string; blocked_combined: number; blocked_via_handoffs: number; blocked_via_master_dep: number }[] =
  JSON.parse(await Bun.file("c:/dev/domain-map/.tmp_deploy/blocking_domains_result.json").text());
const blockedBy = new Map(blocking.map((b) => [b.domain_code, b]));

// 4. Classify
type Row = { code: string; blocked: number; reason: string; status: string; b1a: number };
const rows: Row[] = [];
let noState = 0;
for (const d of domains) {
  const s = state.get(d.domain_code);
  let pending = false;
  let reason = "";
  if (!s) { pending = true; reason = "review needed (no audit file)"; noState++; }
  else if (s.status === "audit_stale") { pending = true; reason = "review needed (audit_stale)"; }
  else if (s.naby === "agent") { pending = true; reason = `agent work (b1a ${s.b1a})`; }
  if (!pending) continue;
  rows.push({
    code: d.domain_code,
    blocked: blockedBy.get(d.domain_code)?.blocked_combined ?? 0,
    reason,
    status: s?.status ?? "(none)",
    b1a: s?.b1a ?? 0,
  });
}
rows.sort((a, b) => b.blocked - a.blocked || a.code.localeCompare(b.code));

// 5. Report
const totalDomains = domains.length;
const totalWithState = state.size;
const stale = [...state.values()].filter((s) => s.status === "audit_stale").length;
const withB1a = [...state.values()].filter((s) => s.b1a > 0).length;
console.log(`Catalog domains: ${totalDomains} | with state.yaml: ${totalWithState} | no audit file: ${noState}`);
console.log(`audit_stale (review needed): ${stale} | b1a non-empty (agent items): ${withB1a}`);
console.log(`Domains with AGENT work pending: ${rows.length} (of which ${rows.filter((r) => r.blocked > 0).length} block >=1 other domain)\n`);

console.log("=== Agent work pending, ranked by domains-that-depend-on-it (blocked desc) ===");
console.log("rank\tcode\tblocks\treason");
rows.filter((r) => r.blocked > 0).forEach((r, i) => console.log(`${i + 1}\t${r.code}\t${r.blocked}\t${r.reason}`));

const zero = rows.filter((r) => r.blocked === 0).map((r) => r.code);
console.log(`\n(${zero.length} more have agent work pending but block 0 other domains: ${zero.join(", ")})`);

// ATS spotlight
const ats = state.get("ATS");
console.log(`\nATS: status=${ats?.status}, next_action_by=${ats?.naby}, b1a=${ats?.b1a} -> agent work pending: ${rows.some((r) => r.code === "ATS")}`);

await Bun.write(
  "c:/dev/domain-map/.tmp_deploy/agent_work_pending_result.json",
  JSON.stringify(rows, null, 2),
);
