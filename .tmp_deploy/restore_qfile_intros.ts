#!/usr/bin/env bun
// Restore each q-file's "## What this domain is" block to the EXACT committed (git HEAD)
// text, leaving the rest of the (grounded) q-file untouched. Verbatim from git, no reinvention.

const CODES = ["AIOPS", "DCIM", "CCAAS", "VULN-MGMT"];
const RE = /## What this domain is[\s\S]*?\n---\n/;

async function sh(args: string[]): Promise<string> {
  const p = Bun.spawn(args, { stdout: "pipe", stderr: "pipe" });
  const out = await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  if ((await p.exited) !== 0) throw new Error(err);
  return out;
}

for (const code of CODES) {
  const rel = `audits/${code}/q-${code}.md`;
  const abs = `c:/dev/domain-map/${rel}`;
  const committed = await sh(["git", "-C", "c:/dev/domain-map", "show", `HEAD:${rel}`]);
  const cm = committed.match(RE);
  if (!cm) { console.log(`!! ${code}: no 'What this domain is' block in committed file, skipped`); continue; }
  const cur = await Bun.file(abs).text();
  if (!RE.test(cur)) { console.log(`!! ${code}: no block in working file, skipped`); continue; }
  const next = cur.replace(RE, cm[0]);
  if (next === cur) { console.log(`== ${code}: already matches committed`); continue; }
  await Bun.write(abs, next);
  const wc = cm[0].replace(/## What this domain is|---/g, "").split(/\s+/).filter(Boolean).length;
  console.log(`restored ${code} intro from git HEAD (${wc} words)`);
}
