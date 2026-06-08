# Bootstrap checks

Run these in order on every invocation where `state.yaml` is missing or stale. Each check halts with a specific, actionable error message on failure. Do not continue past a failed check; do not auto-install or auto-configure.

The four checks are cheap (single CLI call each), so they run sequentially on every cold start. They do NOT run on warm starts where `state.yaml` is current.

---

## Check 1: `use-semantius` skill is loaded

This skill delegates all CLI mechanics to `use-semantius`. Without it, the discovery procedure cannot run.

**How to check:** look for the `use-semantius` skill in the available-skills list in the system reminder. If absent, halt with:

> The `use-semantius` skill is required but not loaded in this session. Install it from the Semantius catalog and re-run this skill. Instructions: https://semantius.app/docs/skills/use-semantius

---

## Check 2: `semantius` CLI is installed and on PATH

**How to check:** run `semantius --version` via Bash. If the command is not found, or returns a non-zero exit code, halt with:

> The `semantius` CLI is not installed or not on PATH. Install instructions: https://semantius.app/docs/cli/install
>
> On Windows: `npm install -g @semantius/cli` then restart your shell.
> Verify with: `semantius --version`

---

## Check 3: CLI can authenticate against the platform

**How to check:** run `semantius call crud getCurrentUser '{}'` from the project root (NOT from any subfolder; the CLI reads `.env` from cwd).

- If the call returns a user object with `email` and `semantius_org`, the platform is reachable. Surface the org to the user so they can confirm they are connected to the right one.
- If the call returns a JWT-audience error (`required audience not found, received [...]`), halt and follow the [JWT-audience halt procedure in the parent SKILL.md](../SKILL.md#hard-rules-inherited-from-the-catalog). Surface the verbatim error.
- If the call returns any other authentication error (401, expired token, missing `.env`), halt with:

> The Semantius CLI could not authenticate against your Semantius platform. Configure your API key:
>
> 1. Place a `.env` file in your project root with `SEMANTIUS_API_KEY=<your-key>`
> 2. Generate an API key from the Semantius UI: Settings > API Keys > New Key
> 3. Verify with: `semantius call crud getCurrentUser '{}'`
>
> Full setup: https://semantius.app/docs/cli/configure

---

## Check 4: target domain module is deployed in this platform

**How to check:** query the platform's `modules` table for the module slug recorded in `spec.json`'s `domain.code`:

```bash
semantius call crud postgrestRequest '{"method":"GET","path":"/modules?module_slug=eq.<slug>&select=id,module_slug,module_name"}'
```

The slug is derived from the domain code, lowercased and underscored (e.g. `ATS` -> `ats`, `WORK-MGMT` -> `work_mgmt`). Read `spec.domain.code` from `spec.json` as the canonical source.

- If the query returns one row, record `module_id` and `module_slug` in `state.yaml` under `deployment` and proceed.
- If the query returns zero rows, halt with the error template below, substituting the configured domain at runtime:

> The `<spec.domain.name>` domain is not deployed in your platform. Deploy the domain blueprint first:
>
> 1. Pull the blueprint: `https://semantius.app/catalog/<spec.domain.code lowercase>/blueprint`
> 2. Run the semantic-model-deployer skill against the blueprint
> 3. Verify with: `semantius call crud postgrestRequest '{"method":"GET","path":"/modules?module_slug=eq.<slug>"}'`
>
> Re-run this skill once the module is live.

- If the query returns multiple rows (shouldn't happen — `module_slug` is unique), surface all rows and halt with a "catalog integrity issue" message; the user investigates.

---

## After all four checks pass

Record the deployment metadata in `state.yaml`:

```yaml
deployment:
  module_slug: <from check 4>
  module_id: <from check 4>
  org: <from check 3 getCurrentUser response>
  bootstrap_passed_at: <ISO timestamp>
```

Then continue to the discovery procedure ([discovery.md](discovery.md)).
