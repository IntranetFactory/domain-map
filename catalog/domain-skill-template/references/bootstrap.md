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

## Check 4: at least one of the domain's modules is deployed

**How to check:** enumerate the domain's modules by the `catalog_module_code` domain axis (provenance, core v0.1.2), reading the module codes from `spec.modules[].code`. This survives a renamed `module_slug`; the slug query is a fallback only for pre-provenance modules whose `catalog_module_code` is still `''` (empty, never NULL).

```bash
# primary: the domain axis
semantius call crud postgrestRequest '{"method":"GET","path":"/modules?catalog_module_code=in.(<spec.modules[].code>)&select=id,module_slug,module_name,catalog_module_code"}'
# fallback for pre-provenance modules (catalog_module_code == '')
semantius call crud postgrestRequest '{"method":"GET","path":"/modules?module_slug=in.(<slugs>)&select=id,module_slug,module_name,catalog_module_code"}'
```

The present `module_id`s form the **domain slice** that scopes ladder step 2 (see [discovery.md](discovery.md)).

- If at least one module is present, record the present `module_id`s in `state.yaml` under `deployment` and proceed. A spec module that is absent is a deployment choice, not a failure.
- If **no** module is present, halt with the error template below, substituting the configured domain at runtime:

> The `<spec.domain.name>` domain is not deployed in your platform. Deploy the domain blueprint first:
>
> 1. Pull the blueprint: `https://semantius.app/catalog/<spec.domain.code lowercase>/blueprint`
> 2. Run the semantic-model-deployer skill against the blueprint
> 3. Verify with: `semantius call crud postgrestRequest '{"method":"GET","path":"/modules?module_slug=eq.<slug>"}'`
>
> Re-run this skill once the module is live.

- Multiple rows are **expected** (a domain has several modules); each present module joins the domain slice. `catalog_module_code` is non-unique by design (clone-and-customize), so two modules sharing a code is not an error.

---

## After all four checks pass

Record the deployment metadata in `state.yaml`:

```yaml
deployment:
  module_ids: [<present module_ids from check 4>]   # the domain slice
  org: <from check 3 getCurrentUser response>
  bootstrap_passed_at: <ISO timestamp>
```

Then continue to the discovery procedure ([discovery.md](discovery.md)).
