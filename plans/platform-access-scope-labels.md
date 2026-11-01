# Platform change: `access_scope` labels for the one-permission-per-gate model

**Status:** a spec for you to copy into `C:\dev\semantius` and `C:\dev\semantius-app` and execute there. Nothing here has been run.

**Why:** [gate-permission-model-plan.md](gate-permission-model-plan.md) gives every process gate its own permission at both `gated` and `raci`:
- at `gated`, admins hold every gate;
- at `raci`, the RACI roles hold them, plus admins except on high-risk gates.

The current labels describe `gated` as having no per-gate permissions.

**Scope: labels only.** The platform reads `modules.access_scope` nowhere ("stored and checked but read by nothing", `C:\dev\semantius\plans\2026-10-05-1131-module-access-scope.md`). The values and the CHECK constraint stay as they are, so no behavior changes. Following that plan's convention, `0.5.0-beta1` is edited in place with no new migration file, and an existing install keeps the old labels until it's reinstalled.

## New labels

| value | current label (`0150_dd_bootstrap.once.sql` L256) | new label |
|---|---|---|
| `custom` | Custom permission structure | unchanged |
| `basic` | Two permissions: view and edit | unchanged |
| `advanced` | Three permissions: view, edit and admin. | unchanged |
| `gated` | Three permissions: view, edit and admin and workflow_state gates | Three permissions: view, edit and admin, plus a permission per process gate held by admins |
| `raci` | Three permissions: view, edit and admin and enforced process gates. | Three permissions: view, edit and admin, plus a permission per process gate held by RACI roles (and admins, except high-risk gates) |

## `C:\dev\semantius`

1. **`apps/_core/migrations/0150_dd_bootstrap.once.sql` L256:** in the `access_scope` `enum_values` JSON, replace the `gated` and `raci` labels with the new ones. Nothing else in the row changes.
2. **Regenerate the migration bundles:**
   - Run `deno task bundle-sql`. It rewrites `packages/triggerdev/src/migrations-bundle.ts`, `packages/provisioning/src/migrations-bundle.ts` and `packages/neon-provisioner/src/migrations-bundle.ts` (currently L5097 in each).
   - Then `deno task bundle-sql --check` must exit 0.
3. **Regenerate the extension SQL:** run `deno task extension` and confirm that `extension/pg_semantius--0.5.0-beta1.sql` (currently L5973) carries the new labels. If that task doesn't rewrite the file, edit L5973 the same way as step 1.
4. **`schema.md` L375:** regenerate with `deno task docgen` against a database migrated with the new bootstrap, or replace the two labels in the row by hand.
5. **`extension/CHANGES.md`:** one bullet in the 0.5.0 section, for example: "The `modules.access_scope` labels for `gated` and `raci` now say that each process gate has its own permission: admins hold them at `gated`, and RACI roles hold them at `raci` (with admins, except high-risk gates)."
6. **Tests:** none checks the labels. `apps/test/tests/0700_test_get_schema.sql` L614-622 checks only `default` and `inputMode`. Run the suite as usual (`deno task test`).
7. **No change:** `apps/_core/migrations/0060_rbac_schema.once.sql` (values and CHECK unchanged) and `docs/error-contract.md` L587 (values unchanged).

## `C:\dev\semantius-app`

8. **`i18n/en-US.json` L613-614** (`module.admin.modules.enum.access_scope.gated` / `.raci`): the same two new labels. Follow `i18n/CLAUDE.md` and `i18n/TRANSLATION-GUIDE.md`.
   - `de-DE.json` has no entry for these keys today.
   - **Optional, only if you want it:** L612 `module.admin.modules.enum.access_scope.full` is left over from the retired value `full`, which the CHECK constraint no longer allows.

## Skill copies (done in the skills work, not here)

- **use-semantius** `references/data-modeling.md` L84 and `references/crud-tools.md` L331 mirror these labels. They're already out of date: their `gated` label says "process gates", while the platform says "workflow_state gates". The skills change (Phase 0 of the main plan) switches them to the new labels.
- **Further copies of use-semantius** need a re-sync from `C:\dev\semantius-agent\semantius-plugin\skills` afterward: `C:\dev\semantius-cli\skills`, `C:\dev\semantius-copilot\agents\semantius-admin\skills`, `C:\dev\semantius-copilot\dist-bundle\semantius-admin.agent.json`, and `C:\dev\domain-map\.agents\skills`.

## Verification

- `deno task bundle-sql --check` exits 0, and the test suite passes.
- After a reinstall, `get_schema('modules')` lists the new labels under `access_scope`, and the module admin form in semantius-app shows them.
