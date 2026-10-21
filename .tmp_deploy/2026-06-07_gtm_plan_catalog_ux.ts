// 2026-06-07 one-off: B1B-A1 catalog UX backfill for GTM-PLAN (domain id 104)
// Idempotent: only PATCHes if the live values are empty. No em-dashes. American English.
const API = process.env.SEMANTIUS_API_BASEURL ?? "";

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const args = ["call", "crud", "postgrestRequest"];
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", ...args], {
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
  "Plan your year. Decide where to play, how much capacity to invest, and which segments to lead with, then push the locked plan to Sales, Marketing, and Finance.";

const description = [
  "Go-to-Market Planning runs the cross-functional planning that decides how you enter and grow markets. Define your ideal customer profile, carve segments, score and tier accounts, draft territories and quotas, and model capacity-to-coverage against your revenue targets.",
  "Run what-if scenarios across geographies, channels, and segments, then layer launch orchestration on top: sequence product launches, gate on readiness, and coordinate the cross-functional motion from product marketing through Sales, Marketing, Support, and Success.",
  "When the plan locks, push the artifacts downstream: territories to sales performance management, target accounts to CRM and marketing automation, and capacity numbers to Finance. Built for Sales Ops and RevOps teams who own the annual go-to-market motion, partnering with Marketing Ops, Product, and Finance.",
].join("\n\n");

// Guard: forbid em-dash
for (const [name, s] of [["tagline", tagline], ["description", description]] as const) {
  if (s.includes("—")) throw new Error(`em-dash found in ${name}`);
}

const [row] = await call("GET", "/domains?id=eq.104&select=id,catalog_tagline,catalog_description");
if (!row) throw new Error("GTM-PLAN domain id 104 not found");

const patch: Record<string, string> = {};
if (!row.catalog_tagline || row.catalog_tagline.trim() === "") patch.catalog_tagline = tagline;
else console.log("catalog_tagline already non-empty; leaving untouched (Rule: never overwrite non-empty).");
if (!row.catalog_description || row.catalog_description.trim() === "") patch.catalog_description = description;
else console.log("catalog_description already non-empty; leaving untouched.");

if (Object.keys(patch).length === 0) {
  console.log("Nothing to write; both fields already populated.");
} else {
  const res = await call("PATCH", "/domains?id=eq.104", patch);
  console.log("PATCHed domains id 104:", JSON.stringify(res, null, 2));
}
