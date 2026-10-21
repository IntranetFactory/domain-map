// DXP b1a — B1A-CATALOG-UX
// Write buyer-voice catalog_tagline / catalog_description into the EMPTY fields on
// domain 77 and modules 236/237/238 (revised Rule #20: write straight into empty
// columns; record_status carries the review signal). Empty-guard per field: only
// write where the current value is empty; never overwrite a non-empty value.

type Row = Record<string, unknown>;

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const req: Row = { method, path };
  if (body !== undefined) req.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(req));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (err && err.toLowerCase().includes("required audience not found")) {
    throw new Error("JWT_AUDIENCE_ERROR: " + err);
  }
  if (proc.exitCode !== 0) throw new Error(`semantius call failed (${method} ${path}): ${err || out}`);
  try { return JSON.parse(out); } catch { return out; }
}
const get = (p: string) => call("GET", p);

const isEmpty = (v: unknown) => v === null || v === undefined || String(v).trim() === "";

type Copy = { tagline: string; description: string };

const domainCopy: Copy = {
  tagline:
    "Build, personalize, and orchestrate every page, audience journey, and experiment across your digital properties.",
  description:
    "Run your websites, microsites, and customer portals from one place. Author pages and reusable content, then publish them across multiple sites and brands with a clear review and approval flow.\n\nTailor what each visitor sees with rule-based personalization, segments, and A/B testing, so the right message reaches the right audience. Guide people through multi-step journeys and self-service portals, and keep everything in sync with your marketing, commerce, and customer data systems.",
};

const moduleCopy: Record<number, Copy> = {
  236: {
    tagline:
      "Author web pages and reusable content once, then publish across every site and brand you run.",
    description:
      "Create and edit web pages and reusable content components in a structured draft, review, and approval flow. Assemble experiences from shared building blocks so a change in one place updates everywhere it is used.\n\nPublish to many sites and brands from a single workspace, control when content goes live or comes down, and refresh delivery caches so visitors always see the current version.",
  },
  237: {
    tagline:
      "Show the right experience to the right audience and prove what works with built-in experimentation.",
    description:
      "Define visitor segments and target them with personalization rules that tailor pages, offers, and content in real time. Activate, pause, and retire rules as your audiences and goals change.\n\nRun A/B and multivariate tests to measure which variations perform best, then roll the winner out with confidence. Publish segments once and reuse them across personalization and testing.",
  },
  238: {
    tagline:
      "Guide visitors through multi-step journeys and self-service portals that respond to who they are.",
    description:
      "Design guided journeys and portal flows step by step, deciding what each visitor sees next based on their profile and behavior. Track who enters, completes, or drops off so you can refine each path.\n\nReact to live audience updates from your customer data so journeys and portal experiences stay relevant as visitor segments change.",
  },
};

const summary: string[] = [];

// Domain 77
{
  const [d] = await get("/domains?id=eq.77&select=id,catalog_tagline,catalog_description");
  const patch: Row = {};
  if (isEmpty(d.catalog_tagline)) patch.catalog_tagline = domainCopy.tagline;
  if (isEmpty(d.catalog_description)) patch.catalog_description = domainCopy.description;
  if (Object.keys(patch).length > 0) {
    await call("PATCH", "/domains?id=eq.77", patch);
    summary.push(`domain 77: wrote ${Object.keys(patch).join(", ")}`);
  } else {
    summary.push("domain 77: both fields already non-empty, skipped");
  }
}

// Modules
for (const id of [236, 237, 238]) {
  const [m] = await get(`/domain_modules?id=eq.${id}&select=id,catalog_tagline,catalog_description`);
  const c = moduleCopy[id];
  const patch: Row = {};
  if (isEmpty(m.catalog_tagline)) patch.catalog_tagline = c.tagline;
  if (isEmpty(m.catalog_description)) patch.catalog_description = c.description;
  if (Object.keys(patch).length > 0) {
    await call("PATCH", `/domain_modules?id=eq.${id}`, patch);
    summary.push(`module ${id}: wrote ${Object.keys(patch).join(", ")}`);
  } else {
    summary.push(`module ${id}: both fields already non-empty, skipped`);
  }
}

console.log("\n=== DXP b1a catalog UX summary ===");
for (const s of summary) console.log("  " + s);
console.log("=== done ===\n");
