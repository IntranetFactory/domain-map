#!/usr/bin/env bun
// B1A-CATALOG-UX for DATA-AI-PLAT (domain 129).
// Writes buyer-voice catalog_tagline + catalog_description into the EMPTY fields of
// modules 223, 224, 225, 226 (Rule #20). Empty-guard per field: only writes where the
// current value is empty; never overwrites a non-empty value. record_status carries the
// review signal (Rule #1) and is left untouched.

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}
const get = (path: string) => call({ method: "GET", path });

const copy: Record<number, { tagline: string; description: string }> = {
  223: {
    tagline:
      "Land all your data in one open, governed lakehouse and build the pipelines that keep it fresh.",
    description:
      "Bring batch and streaming data together in a single analytics store you actually control, with reliable transactions, schema changes that do not break downstream work, and the ability to look back at how a table looked at any point in time. Build the ingestion and transformation pipelines that fill it, schedule them, see their dependencies at a glance, and get clear run-level visibility when something slows down or fails.\n\nWork side by side in collaborative notebooks that run directly against your lakehouse, mixing languages and sharing compute, so analysts and engineers can explore, prototype, and ship on the same data without copying it around. The result is one trustworthy foundation that your reporting, governance, and machine learning all sit on.",
  },
  224: {
    tagline:
      "Turn raw tables into governed business concepts, trusted metrics, and shareable data products.",
    description:
      "Map your physical tables to the business concepts and reusable measures everyone agrees on, so a metric means the same thing in every report, dashboard, and AI answer. Give your teams a single place to find any data asset, trace where it came from, read its plain-language definition, and request the right level of access, all under fine-grained controls.\n\nPackage the data others depend on into governed data products with explicit contracts for schema, quality, and ownership, so consumers know exactly what they are getting and producers know who relies on them. Build lightweight operational apps on top of the same governed layer that can write changes back to your systems of record, closing the loop between insight and action.",
  },
  225: {
    tagline:
      "Take models from first experiment to monitored production without losing track of anything.",
    description:
      "Engineer and reuse the features your models depend on, train them at scale, and keep every experiment and result recorded so you can compare runs and reproduce the one that worked. Register your best models, promote them through clear stages, and deploy them to serving endpoints when they are ready.\n\nKeep an eye on models after they go live with drift monitoring and continuous evaluation, so you find out early when accuracy slips or the data shifts underneath them. The whole lifecycle stays connected, from raw features to a live, watched model, so teams can ship confidently and act fast when something changes.",
  },
  226: {
    tagline:
      "Build, ground, and govern AI agents and assistants on top of your own trusted data.",
    description:
      "Host and route the foundation models your assistants run on, generate embeddings, and stand up vector search so agents can retrieve the right context and answer from your real data instead of guessing. Orchestrate tool use and multi-step agent workflows, version and test your prompts, and check quality with evaluation harnesses before anything reaches users.\n\nKeep cost, safety, and auditability under control with gateway-level guardrails, so you can scale generative features across the business while staying in command of what your agents do and what they spend. This gives you a dependable path from a working prototype to governed, production AI assistants grounded in your own knowledge.",
  },
};

const mods = await get(
  "/domain_modules?id=in.(223,224,225,226)&select=id,domain_module_code,catalog_tagline,catalog_description",
);

for (const m of mods) {
  const id = Number(m.id);
  const spec = copy[id];
  if (!spec) continue;
  const body: Row = {};
  if (String(m.catalog_tagline ?? "").trim() === "") body.catalog_tagline = spec.tagline;
  else console.log(`SKIP tagline on ${m.domain_module_code} (non-empty, overwrite-protected)`);
  if (String(m.catalog_description ?? "").trim() === "") body.catalog_description = spec.description;
  else console.log(`SKIP description on ${m.domain_module_code} (non-empty, overwrite-protected)`);
  if (Object.keys(body).length === 0) {
    console.log(`${m.domain_module_code}: nothing to write`);
    continue;
  }
  await call({ method: "PATCH", path: `/domain_modules?id=eq.${id}`, body });
  console.log(`PATCHed ${m.domain_module_code}: wrote ${Object.keys(body).join(", ")}`);
}

const verify = await get(
  "/domain_modules?id=in.(223,224,225,226)&select=id,domain_module_code,catalog_tagline,catalog_description&order=id.asc",
);
console.log("\nVERIFY (lengths):");
for (const v of verify) {
  console.log(
    `${v.domain_module_code}: tagline=${String(v.catalog_tagline ?? "").length} chars, description=${String(v.catalog_description ?? "").length} chars`,
  );
}
