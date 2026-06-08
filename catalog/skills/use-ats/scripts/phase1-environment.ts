/**
 * Phase 1 — environment bootstrap check.
 *
 * Runs at bootstrap (when ready.flag is missing). Verifies the technical
 * prerequisites the skill needs before Phase 2 (structural discovery) can run.
 *
 * Checks in order (halt on first failure):
 *   1. semantius CLI installed and on PATH
 *   2. CLI can authenticate against the tenant (getCurrentUser succeeds)
 *   3. At least one module listed in spec.json is deployed in this tenant
 *
 * Output: structured JSON on stdout (machine-parseable for the agent).
 * Exit code: 0 on success, non-zero on any check failure.
 *
 * Bun is required (this script is TypeScript on Bun). The agent verifies
 * Bun via `bun --version` before invoking this script.
 *
 * Run from the project root (semantius reads .env from cwd):
 *   bun run .claude/skills/use-<domain>/scripts/phase1-environment.ts
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";

type Spec = {
  facts_major: number;
  emitted: string;
  domain: { code: string; name: string };
  modules: Array<{ code: string; name: string }>;
};

type CmdResult = { ok: boolean; data: any; stderr: string; code: number };

async function call(server: string, tool: string, payload: any): Promise<CmdResult> {
  const proc = Bun.spawn(["semantius", "call", server, tool], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) return { ok: false, data: null, stderr: err.trim() || out.trim(), code };
  return { ok: true, data: out.trim() ? JSON.parse(out.trim()) : null, stderr: "", code };
}

function halt(reason: string, fix: string): never {
  console.log(JSON.stringify({ ok: false, phase: 1, reason, fix }, null, 2));
  process.exit(1);
}

function moduleSlug(code: string): string {
  return code.toLowerCase().replace(/-/g, "_");
}

async function main() {
  const skillDir = resolve(import.meta.dir, "..");
  const specPath = resolve(skillDir, "spec.json");

  let spec: Spec;
  try {
    spec = JSON.parse(readFileSync(specPath, "utf-8"));
  } catch (e: any) {
    halt(`Could not read spec.json at ${specPath}: ${e.message}`,
         "The skill bundle is incomplete. Reinstall via npx semantius-skill install use-<domain>.");
  }

  // Check 1: CLI installed.
  const ver = await call("crud", "getCurrentUser", {});
  if (!ver.ok) {
    // Either CLI not on PATH, or auth failed. Distinguish by stderr shape.
    const stderr = ver.stderr.toLowerCase();
    if (stderr.includes("command not found") || stderr.includes("not recognized")) {
      halt("semantius CLI is not installed or not on PATH.",
           "Install: npm install -g @semantius/cli. Restart your shell. Verify: semantius --version. Docs: https://semantius.app/docs/cli/install");
    }
    if (stderr.includes("audience") || stderr.includes("jwt")) {
      halt(`JWT-audience error from semantius CLI: ${ver.stderr}`,
           "Known server-side issue. Surface this verbatim to the user and wait for direction. Do not retry in a loop.");
    }
    halt(`semantius CLI could not authenticate: ${ver.stderr}`,
         "Configure .env in the project root: SEMANTIUS_API_KEY=<your-key>. Generate from Settings > API Keys. Docs: https://semantius.app/docs/cli/configure");
  }

  const tenantOrg = ver.data?.semantius_org ?? "<unknown>";
  const tenantEmail = ver.data?.email ?? "<unknown>";

  // Check 2: at least one module from spec is deployed.
  const slugs = spec.modules.map((m) => moduleSlug(m.code));
  const slugFilter = slugs.join(",");
  const modules = await call("crud", "postgrestRequest", {
    method: "GET",
    path: `/modules?module_slug=in.(${slugFilter})&select=id,module_slug,module_name`,
  });

  if (!modules.ok) {
    halt(`Could not query /modules: ${modules.stderr}`,
         "If this is a JWT error, surface verbatim. Otherwise check tenant connectivity.");
  }

  const present = (modules.data ?? []) as Array<{ id: number; module_slug: string; module_name: string }>;
  if (present.length === 0) {
    halt(`No modules from the ${spec.domain.name} (${spec.domain.code}) spec are deployed in tenant ${tenantOrg}.`,
         `Deploy at least one of the domain modules: ${spec.modules.map((m) => m.code).join(", ")}. Blueprint: https://semantius.app/catalog/${spec.domain.code.toLowerCase()}/blueprint`);
  }

  // Pass: report what's present.
  const presentSlugs = new Set(present.map((m) => m.module_slug));
  const moduleStatus = spec.modules.map((m) => ({
    code: m.code,
    name: m.name,
    slug: moduleSlug(m.code),
    present: presentSlugs.has(moduleSlug(m.code)),
    module_id: present.find((p) => p.module_slug === moduleSlug(m.code))?.id ?? null,
  }));

  console.log(JSON.stringify({
    ok: true,
    phase: 1,
    tenant: { org: tenantOrg, email: tenantEmail },
    domain: { code: spec.domain.code, name: spec.domain.name },
    modules: moduleStatus,
    summary: {
      total: spec.modules.length,
      present: present.length,
      absent: spec.modules.length - present.length,
    },
  }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.log(JSON.stringify({ ok: false, phase: 1, reason: `unexpected error: ${err.message}`, fix: "Surface the error to the user and stop." }, null, 2));
  process.exit(2);
});
