/**
 * Set `specification_requirements` on the IT-OPS-STARTER module (domain_modules id 403).
 *
 * This converts the parked B3-COST-FIELD-FOLLOWUP backlog note (audits/IT-OPS-STARTER/
 * state.yaml) into a first-class directive that travels WITH the blueprint, instead of
 * dying in the audit sidecar. It is also the end-to-end test of the new field:
 * column -> loaded value -> rendered `## Additional Requirements Specification` blueprint section.
 *
 * Writes into the (empty) field; does NOT touch record_status. Idempotent in effect
 * (re-running overwrites with the same text), but per Rule #20 shape this value must not
 * be overwritten with DIFFERENT text without explicit user approval once reviewed.
 *
 * Run from project root: bun run scripts/loaders/set_it_ops_starter_spec_requirements_2026_06_16.ts
 */

const MODULE_ID = 403;

const REQUIREMENTS = [
  "Cost fields on the embedded shells. For the standalone renewal-and-cost view to resolve, two embedded masters each need a flat cost figure plus a currency code:",
  "",
  "- `asset_contracts`: a flat `renewal_cost` (or `annual_value`) numeric field.",
  "- `saas_subscriptions`: a flat `annual_spend` (or MRR/ARR) numeric field.",
  "",
  "Coexistence: these flat fields are a standalone-only denormalization. They are not needed when the full asset-management and SaaS-management modules are already installed (those carry cost on their own spend entities); when such a full module is added later, the flat field must be deduplicated and reconciled against the canonical source so cost is not double-counted.",
].join("\n");

async function call(server: string, tool: string, payload: any): Promise<{ ok: boolean; data: any; stderr: string }> {
  const proc = Bun.spawn(["semantius", "call", server, tool], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: err.trim() || out.trim() };
  return { ok: true, data: out.trim() ? JSON.parse(out.trim()) : null, stderr: "" };
}

async function main() {
  if (REQUIREMENTS.includes(String.fromCharCode(0x2014))) throw new Error("em-dash (U+2014) found in requirements text (forbidden, see CLAUDE.md)");
  const r = await call("crud", "postgrestRequest", {
    method: "PATCH",
    path: `/domain_modules?id=eq.${MODULE_ID}`,
    body: { specification_requirements: REQUIREMENTS },
  });
  if (!r.ok) throw new Error(`PATCH failed: ${r.stderr}`);
  console.log(`+ set specification_requirements on domain_modules id ${MODULE_ID} (${REQUIREMENTS.length} chars)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
