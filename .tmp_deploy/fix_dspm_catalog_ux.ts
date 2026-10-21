#!/usr/bin/env bun
// B1A-CATALOG-UX (DSPM modules 233/234/235) — M8 / A4, revised Rule #20.
//
// The 3 DSPM full modules carry empty catalog_tagline / catalog_description. Per the
// revised Rule #20, author buyer-voice copy (workflow + value, no vendor/product names,
// no em-dashes, American English) and write it straight into the EMPTY field. The row's
// record_status carries the review signal. Empty-guard per field: write only where the
// current value is empty; NEVER overwrite a non-empty value.

import { $ } from "bun";
$.throws(false);

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
const patch = (path: string, body: Row) => call({ method: "PATCH", path, body });

const copy: Record<number, { tagline: string; description: string }> = {
  233: {
    tagline: "See every cloud data store and know exactly how sensitive the data inside it is.",
    description:
      "Continuously find the object stores, managed databases, warehouses, and SaaS instances that hold your data, including the shadow stores no one put on the official inventory. Each store is scanned and its contents classified by sensitivity, so you always know where regulated and high-value data actually lives. Lineage tracing shows how that data flows across pipelines, and unmanaged or newly discovered findings are queued for an owner to review. The result is a trustworthy, always-current map of your data estate that feeds every access, risk, and incident decision downstream.",
  },
  234: {
    tagline: "Know who can reach your sensitive data and fix the access that should not exist.",
    description:
      "Map every identity and the permissions it actually has on each data store, then surface over-privilege and toxic combinations where sensitive data meets an over-permissive policy. Sensitivity, access breadth, and exposure are combined into a single risk score per asset, so your team works the highest-risk findings first instead of chasing noise. Policies that fail review are flagged and routed for correction, and risk scores recompute as the picture changes. You get a prioritized, defensible queue of access problems and a clear path to closing each one.",
  },
  235: {
    tagline: "Turn a sensitive-data exposure into a contained, resolved incident with a clear audit trail.",
    description:
      "Triage detected incidents such as over-privilege, toxic combinations, unauthorized access, and shadow-data exposure, then drive each one through investigation, containment, and resolution. Templated and custom enforcement applies the fix directly, whether that is an IAM correction, a bucket-policy update, or an entitlement review, and the right people are notified at each step. Every transition is recorded, so you can show how an exposure was caught, contained, and closed. The outcome is faster response, less standing risk, and the evidence to prove it.",
  },
};

const mods = await get("/domain_modules?id=in.(233,234,235)&select=id,catalog_tagline,catalog_description");

for (const m of mods) {
  const id = Number(m.id);
  const def = copy[id];
  if (!def) continue;
  const patchBody: Row = {};
  if (String(m.catalog_tagline ?? "").trim() === "") {
    patchBody.catalog_tagline = def.tagline;
  } else {
    console.log(`  module ${id}: catalog_tagline non-empty, leaving untouched`);
  }
  if (String(m.catalog_description ?? "").trim() === "") {
    patchBody.catalog_description = def.description;
  } else {
    console.log(`  module ${id}: catalog_description non-empty, leaving untouched`);
  }
  if (Object.keys(patchBody).length > 0) {
    await patch(`/domain_modules?id=eq.${id}`, patchBody);
    console.log(`  module ${id}: wrote ${Object.keys(patchBody).join(", ")}`);
  }
}

const verify = await get("/domain_modules?id=in.(233,234,235)&select=id,domain_module_code,catalog_tagline,catalog_description&order=id.asc");
console.log("\nVerification:");
for (const m of verify) {
  console.log(`  ${m.id} ${m.domain_module_code}: tagline_len=${String(m.catalog_tagline).length} desc_len=${String(m.catalog_description).length}`);
}
console.log("\nDone.");
