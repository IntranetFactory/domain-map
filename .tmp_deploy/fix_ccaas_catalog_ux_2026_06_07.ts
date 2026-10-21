#!/usr/bin/env bun
// CCAAS A4 Catalog UX backfill (2026-06-07). Writes buyer-voice copy into the two EMPTY catalog
// columns on the domains row only. Idempotent: refuses to overwrite a non-empty value (Rule #20).
// Does NOT touch description / business_logic (those are non-empty; rewrites are surfaced, not applied).
// Run from project root: bun run ".tmp_deploy/fix_ccaas_catalog_ux_2026_06_07.ts"

type Row = Record<string, unknown>;
async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe", stdout: "pipe", stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  const t = stdout.trim();
  return t ? JSON.parse(t) : [];
}

const tagline =
  "Run your contact center in the cloud: route every call, chat, and message to the right agent, " +
  "capture and score interactions, and keep teams staffed and on target.";

const description =
  "Bring every customer conversation onto one cloud platform. Calls, chats, emails, SMS, and social " +
  "messages land in unified queues and route to the agent best suited to handle them, with self-service " +
  "menus and AI assistance deflecting and speeding up the simple requests. Agents see the customer's " +
  "history across channels as soon as the interaction connects, and wrap up each contact with a clear " +
  "outcome code that feeds reporting and follow-up.\n\n" +
  "Behind the scenes you get the tooling to run the operation: live queue dashboards and service-level " +
  "alerts, agent presence and availability tracking, and full interaction recording for quality and " +
  "compliance. Supervisors review and score recorded interactions, coach agents on what to improve, and " +
  "watch real-time metrics so they can shift staffing before service levels slip.";

const [row] = await call({
  method: "GET",
  path: "/domains?id=eq.98&select=id,catalog_tagline,catalog_description",
});
if (!row) throw new Error("CCAAS domain (id 98) not found");

const patch: Row = {};
if (((row.catalog_tagline ?? "") as string) === "") patch.catalog_tagline = tagline;
else console.log(`catalog_tagline already set, leaving as-is: ${row.catalog_tagline}`);
if (((row.catalog_description ?? "") as string) === "") patch.catalog_description = description;
else console.log(`catalog_description already set, leaving as-is.`);

if (Object.keys(patch).length) {
  await call({ method: "PATCH", path: "/domains?id=eq.98", body: patch });
  console.log(`PATCHED domains id=98: ${Object.keys(patch).join(", ")}`);
} else {
  console.log("Nothing to write; both catalog fields already populated.");
}
console.log("UI: https://tests.semantius.app/domain_map/domains?id=eq.98");
