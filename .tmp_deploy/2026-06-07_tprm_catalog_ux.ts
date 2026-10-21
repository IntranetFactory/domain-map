// 2026-06-07 one-off: B2-A4 catalog UX backfill for TPRM (domain id 19).
// State-driven execute (Rule #21 + Rule #20 author guard): both fields empty.
// Idempotent: only PATCHes if the live values are empty. Never overwrite non-empty.
// No em-dashes. American English. No vendor/product names in copy (Rule #18).
// Statutory frameworks (DORA) are allowed in description text.

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) throw new Error(`semantius exit ${code}: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

const tagline =
  "Know who you do business with, prove they are safe before you sign, and catch the risks that surface after the contract goes live.";

const description = [
  "Third-Party Risk Management runs the full lifecycle of vetting and watching the vendors, suppliers, and service providers your organization depends on. Onboard a new third party, classify it by how critical it is and how much data or access it touches, then run the due diligence the tier demands: security questionnaires, document collection, certification checks, and a clear go or no-go before the contract is signed.",
  "After onboarding, keep watching. Re-assess on a cadence set by the vendor's tier, ingest external security-rating and breach signals, and turn findings into tracked remediation that closes before the next review cycle or contract renewal. Escalate the third parties that drift into higher risk so the right reviewers in procurement, security, and compliance see them in time.",
  "Built to give risk, procurement, and security teams one defensible record of every third party, the evidence behind each decision, and the open issues that still need to close. Maps to the frameworks regulated organizations answer to, including DORA's requirements for an information register of ICT providers and visibility into the subcontracting chain.",
].join("\n\n");

// Guard: forbid em-dash anywhere in authored copy.
for (const [name, s] of [["tagline", tagline], ["description", description]] as const) {
  if (s.includes("—")) throw new Error(`em-dash found in ${name}`);
}

const [row] = await call(
  "GET",
  "/domains?id=eq.19&select=id,domain_code,catalog_tagline,catalog_description",
);
if (!row) throw new Error("TPRM domain id 19 not found");
if (row.domain_code !== "TPRM") throw new Error(`id 19 is not TPRM (got ${row.domain_code})`);

const patch: Record<string, string> = {};
if (!row.catalog_tagline || row.catalog_tagline.trim() === "") patch.catalog_tagline = tagline;
else console.log("catalog_tagline already non-empty; leaving untouched (never overwrite non-empty).");
if (!row.catalog_description || row.catalog_description.trim() === "") patch.catalog_description = description;
else console.log("catalog_description already non-empty; leaving untouched.");

if (Object.keys(patch).length === 0) {
  console.log("Nothing to write; both fields already populated.");
} else {
  const res = await call("PATCH", "/domains?id=eq.19", patch);
  console.log("PATCHed domains id 19 (TPRM):", JSON.stringify(res, null, 2));
}
