# Domain skill template - improvement plan

Scope: improve `catalog/domain-skill-template/` (the source the generated `use-<domain>`
and `use-<bundle>` skills are emitted from by `scripts/emit_skill_spec.ts`).

**Explicitly out of scope (deferred to dedicated planning):** the `description:` frontmatter
and everything that drives skill triggering (`{{ALIASES_COMMA_LIST}}`, the entity-noun dump,
`{{CAPABILITY_NAMES_COMMA_LIST}}`). The user wants that planned separately so future re-emits
do not silently regress triggering. This plan touches the frontmatter ONLY where a change is
mechanically forced by another fix, and flags it if so.

---

## 0. Constraints every change must respect (the re-emission contract)

1. **One template, two spec shapes.** `emit_skill_spec.ts` renders the SAME `SKILL.md` template
   and copies the SAME `scripts/` + `references/` verbatim for BOTH:
   - `emitOne` (domain): spec has `domain`, `modules`, `data_objects`, `aliases`, `relationships`,
     `business_functions`, `system_skills`, `roles`.
   - `emitBundle` (industry starter, e.g. REAL-ESTATE-AGENT, HVAC-SVC-MGMT): spec has `bundle`,
     `composes`, `host_domains`, `system_skill` (singular). NO `modules`, NO `data_objects`,
     NO `domain`.
   Any change to SKILL.md prose or to a script MUST work, or degrade cleanly, under both shapes.

2. **Token substitution only.** SKILL.md is rendered by `renderSkillMd` via `replaceAll("{{KEY}}", v)`
   over a fixed key set: `DOMAIN_CODE_LOWER, DOMAIN_CODE, DOMAIN_NAME, ALIASES_COMMA_LIST,
   ENTITY_NOUNS_COMMA_LIST, CAPABILITY_NAMES_COMMA_LIST, ADJACENT_DOMAIN_SKILLS, MODULE_SLUG`.
   A new `{{...}}` placeholder in the template only renders if the key is added to `renderSkillMd`
   (an emitter change). Prefer reusing existing keys; call out any new key explicitly.

3. **The template folder is copied wholesale into every skill.** `assembleInstalledSkill` does
   `cpSync(TEMPLATE_DIR, dest)`. Do NOT add planning/scratch files to `domain-skill-template/`;
   they would ship inside every generated skill. (This plan lives in `c:/tmp/`, not the template.)

4. **Scripts resolve their own paths**, not cwd: they use `import.meta.dir` to find `spec.json`.
   cwd must stay the project root only because the spawned `semantius` reads `.env` from cwd.
   Any path instruction in SKILL.md must keep cwd = project root while pointing `bun run` at the
   skill's own `scripts/`.

5. **Learning layer must survive upgrades.** SKILL.md promises the installer preserves
   `state.yaml` + `lessons.md` across upgrades. Any new "write state.yaml" step must MERGE with an
   existing curated `state.yaml`, never clobber it. (Note: the repo's `assembleInstalledSkill` does
   a `rmSync(dest)` first, so the in-repo `catalog/skills/<X>/` copy does NOT model preservation;
   that is a test-fidelity gap, see section 5.)

---

## Decision A - resolve the domain/bundle template split (BLOCKER, do first)

**Problem.** Bundle skills are dead on arrival at bootstrap. `phase1-environment.ts` does
`spec.modules.map(...)` and `phase2a-structural.ts` reads `spec.modules` / `spec.data_objects`.
A bundle spec has none of these, so bootstrap throws `Cannot read properties of undefined` and is
swallowed into the generic "unexpected error" handler. Verified against
`catalog/skill-specs/REAL-ESTATE-AGENT/spec.json` (bundle shape) +
`catalog/skills/use-real-estate-agent/scripts/phase1-environment.ts` (domain-shaped, verbatim).
Separately, the rendered bundle SKILL.md inherits domain-centric prose (`state.yaml` keyed by
`ATS-*` module codes, "split a master", "renamed suppliers to vendors") that does not describe a
bundle, which masters nothing and composes entities owned by host domains.

**Options.**
- **A1 - Branch the scripts on spec shape (recommended).** At the top of phase1/phase2a, detect
  `spec.bundle` vs `spec.domain`. For a bundle: derive the module list from `bundle.host_domains`
  (or from `composes[].owning_domain`), and build the entity corpus from `composes[]` instead of
  `data_objects[]`. One code path, two adapters. Lowest surface-area, keeps a single template.
- **A2 - Second template (`bundle-skill-template/`) + emitter dispatch.** Cleaner prose separation,
  but doubles the maintenance surface and the emitter must choose template per task kind.
- **A3 - Normalize at emit time.** Have `buildBundleSpec` also emit a `modules`-compatible and
  `data_objects`-compatible projection so the domain-shaped scripts "just work." Hides the
  difference but bloats the bundle spec and couples the emitter to script internals.

**Recommendation: A1 for the scripts, plus a bundle-aware pass over the SKILL.md template.**
A1 is right specifically because `scripts/` + `references/` are byte-identical copies in every
generated skill; a second template (A2) would fork these and guarantee drift with nothing enforcing
parity. **Effort caveat (from review): A1 is more than a thin shape-adapter.** A bundle has no single
deployed module with its own entity rows; it composes entities mastered by its HOST domains. So the
bundle path must resolve each host domain's deployed module(s) live before it can query
`/entities?module_id=eq...`. That is real Phase-1 logic, not a one-line branch. Budget accordingly.

For SKILL.md, the bundle breakage is broader than the two obvious examples: besides the `state.yaml`
"modules:" sample and "renamed suppliers to vendors", the "What's in spec.json" section (it lists
"Modules with their masters", "Per-master pattern flags", "Expected role personas") describes fields
a bundle spec does not have (`composes`, singular `system_skill`, no `modules`), and
`ALIASES_COMMA_LIST` degrades to the lowercased code (bundles pass `aliases: []`) so the trigger line
becomes just `real-estate-agent` (this last point is triggering, so defer to the description plan).
Either gate the domain-only prose behind neutral wording or add a `{{SKILL_KIND}}` substitution
(`domain` | `bundle`); adding the key is an emitter change in `renderSkillMd`, call it out for sign-off.

**Pin the bundle resolution algorithm (2nd-review gap).** A bundle spec has NO module slug/id and
no module on `composes[]` - only host-domain CODES (`CLM, CRM, RE-BROKERAGE`). phase2a queries
`/entities?module_id=eq.X`, so the adapter needs entities some other way. Two concrete options, pick
one in the plan (do not leave it as "resolve live"):
- **D-bundle-1 (recommended): query entities by name directly.** `composes[]` carries the entity
  `name`; do `/entities?name=in.(<composes names>)&select=...` and skip module_id entirely. Simplest,
  and a bundle composes a known finite name set.
- **D-bundle-2: resolve host modules.** For each host-domain code: `/domains?domain_code=eq.X` ->
  `/domain_modules?domain_id=eq.<id>` -> live `/modules`, then walk entities per module. More calls,
  and no rule says which of a domain's modules host the composed entities, so it over-scans.

**Risk.** If we skip Decision A, every bundle skill ships broken. With A1 + D-bundle-1, the residual
risk is small: `composes[]` has no per-entity aliases, so a renamed composed entity falls to Phase 2b
(acceptable, same as the domain path).

---

## Decision B - collapse the two discovery designs into one (BLOCKER)

**Problem.** Two parallel, contradictory designs ship together:
- Script-driven: `bootstrap.ts -> phase1-environment.ts -> phase2a-structural.ts -> ready.flag`,
  writing `discovered.json`.
- Agent-driven: `references/bootstrap.md` (4 manual checks writing `state.yaml`) +
  `references/discovery.md` (6 manual passes writing `state.yaml` + `discovered.json`).
SKILL.md step 4 wires them together awkwardly: it calls `discovery.md` "Phase 2b" even though
`discovery.md` is a FULL re-discovery that redoes phase2a's work, and `bootstrap.md` duplicates
phase1. No file is actually scoped to "Phase 2b: resolve ambiguities only."

**Decision: script-driven is canonical.** Rewrite the references to be the agent layer that sits
ON TOP of the scripts, not a parallel reimplementation:
- `references/discovery.md` -> becomes **"Phase 2b: ambiguity resolution"** ONLY. Input is the
  `ambiguities[]` array phase2a already emits (`custom_entity`, `missing_entity`, fuzzy candidates).
  It documents: how to surface each ambiguity to the user, the ASK-vs-ASSUME rules (keep this
  section, it is the valuable part), and how to record resolutions into `state.yaml`, then
  re-invoke `bootstrap.ts`. Remove the 6-pass full discovery and the hand-written `/fields`,
  `/entities` queries (phase2a owns structural discovery now).
- `references/bootstrap.md` -> either DELETE or slim to a **"reading bootstrap output / failure
  remedies"** troubleshooting note. phase1 already emits `fix` strings for each failure; the unique
  content worth keeping (the "deploy the blueprint first" remedy, the JWT-audience halt) should live
  in phase1's `fix` strings, not a parallel doc. Recommend delete + fold remedies into phase1.

**Risk.** Rewriting references is prose-only and re-emission-safe (references are copied verbatim,
no substitution). Main risk is leaving a dangling link: SKILL.md step 4 and the Quick reference list
both link `references/bootstrap.md`; update those links if the file is deleted. **Also (from review):**
discovery.md's "When to ASK vs ASSUME" table (the valuable judgment content) is currently keyed to
the 6-pass structure ("Pass 2c", "Pass 4"). When collapsing to Phase 2b, re-key those rules to
phase2a's ACTUAL `ambiguity.kind` values: `custom_entity`, `missing_entity`, and the new
`rename_candidate` from D1. Do NOT re-key to "fuzzy" - phase2a emits no fuzzy candidates today; D1
adds the correlate pass that produces `rename_candidate`, which is the real anchor. **Decision B must
not land before D1**, or the rewritten Phase 2b doc loses rename correlation entirely (the 2nd
review's top finding).

---

## Decision C - state.yaml ownership: machine state vs user-curated state (added after review)

**Problem (the single largest hidden cost in W1).** W1 says "make phase2a write a baseline
state.yaml." But every script today only WRITES JSON (`JSON.stringify`); `state.yaml` is YAML, and
there is no YAML serializer imported anywhere (new deps are discouraged). Worse, the documented
`state.yaml` is heavily commented (see SKILL.md sample), and constraint 5 requires bootstrap to MERGE
with an existing curated file without clobbering user edits or comments. A naive emit-YAML-on-every-
bootstrap strips comments and overwrites user resolutions.

**Decision (recommended): split machine-owned from human-owned.**
- `state.discovered.json` (machine-owned, JSON, rewritten freely by phase2a/bootstrap): module
  presence, deterministic renames, omitted entities, the structural baseline.
- `state.yaml` (human-owned, hand/Phase-2b-edited, never machine-clobbered): user resolutions to
  ambiguities, custom-entity classifications, deferred questions.
- The skill reads both; on conflict, the human file wins. This keeps the "JSON writers only" rule,
  removes the YAML-merge problem entirely, and preserves the learning-layer-survives-upgrades promise.

**Alternative:** import a real YAML lib and write a comment-preserving merge. Higher cost, more
fragile, and pulls a dependency into a bundle that ships into every skill. Not recommended.

**Impact on W1.** W1 becomes "phase2a writes `state.discovered.json` (always, clean path included);
Phase 2b appends user resolutions to `state.yaml`." SKILL.md step 5 + "What's in state.yaml" + the
file-layout table all need updating to name both files and their ownership.

---

## Decision D - preserve entity-adaptation behavior across Decisions B and C (BLOCKER, added after 2nd review)

**Why this exists.** The skill's entire reason to exist is to use the deployment's REAL entity names
at runtime (rename `job_applications`->`applications`, drop `cost_centers`, add `referral_bonuses`).
The 2nd review proved that, as the plan stood, only the "custom add" case works; renames, consumer
omissions, and field adaptation either work by accident or silently fail, because Decision B deletes
the logic that handled them (`discovery.md` Pass 2c rename correlation, Pass 3 field-trust) and
Decision C never wires a rename the runtime can read. This decision closes that.

### D1 - rename correlation must be re-specified (the crux)
- **Problem.** phase2a emits `custom_entity` (live `applications`, unmatched) and `missing_entity`
  (spec `job_applications`, no live match) as TWO independent items (phase2a ~lines 166 and 212).
  Nothing pairs them into "this is a rename." Old `discovery.md` Pass 2c did this via fuzzy `ilike`
  + ASK; Decision B deletes that and the new Phase 2b doc does not restate it. Authored `aliases`
  are human labels ("Job Application", "Source of Hire"), NOT alternate table names (verified in
  `use-ats/spec.json`), so phase2a resolves a rename ONLY when the live label happens to still match
  a spec label. A rename that also relabels (the realistic case) falls through to an uncorrelated
  pair.
- **Change.** Add a `rename_candidate` ambiguity KIND to phase2a: when a module has both an
  unmatched live entity and a `missing_entity`, correlate them (fuzzy `ilike` on label, and/or
  description similarity) and emit a single paired ambiguity. The Phase 2b doc then surfaces the
  pair together ("`applications` looks like your `job_applications` - same thing?") and on confirm
  writes a durable rename (see D2). This both restores Pass 2c AND gives Decision B's "re-key ASK
  rules to ambiguity.kind" a real `kind` to target (note: phase2a today emits NO fuzzy candidates,
  so Decision B was re-keying to a kind that does not exist - this fixes that mismatch too).
- **Files.** `scripts/phase2a-structural.ts` (add the fuzzy correlate pass + `rename_candidate`),
  the rewritten Phase 2b reference (surface + confirm), SKILL.md.
- **Risk.** Fuzzy correlation can mis-pair; keep it ASK-only (never auto-rename), exactly as the old
  Pass 2c rule required.

### D2 - the resolved rename must be written where the runtime reads it
- **Problem.** The only place a resolved rename is recorded today is
  `discovered.json[<live>].spec_name = <catalog>` (phase2a ~line 180), keyed by LIVE name. To answer
  "what is the live table for spec `recruitment_sources`?" the runtime would have to invert that by
  scanning `spec_name`. But SKILL.md step 5 tells the agent to read names "from `state.yaml`", which
  on the clean path is never written (W1). So a rename known during discovery is written nowhere the
  runtime is told to look.
- **Change.** Have phase2a emit an explicit `spec_to_live` (a.k.a. `entity_renames`) index into
  `state.discovered.json` (Decision C's machine file): `{ <spec_name>: <live_name> }` for every
  entity, identity-mapped when unchanged. Phase 2b adds user-confirmed renames to the human
  `state.yaml`, which WINS on conflict. SKILL.md step 5 reads the merged map and always resolves a
  spec name to its live name in one lookup, no inversion, no live re-query.
- **Files.** `scripts/phase2a-structural.ts`, SKILL.md step 5 + "What's in state.yaml" (specify read
  order + precedence: human `state.yaml` overrides machine `state.discovered.json`).
- **Risk.** Low; it is a dictionary.

### D3 - field-trust policy must survive, plus a lifecycle-field check
- **Problem.** The spec carries NO per-entity field list (only `lifecycle_states` names), so phase2a
  cannot diff fields; it records live fields verbatim. Field renames/omissions are structurally
  undetectable - which is acceptable ONLY if the "trust catalog field names; reconcile on the first
  runtime failure" policy survives. That policy lived in `discovery.md` Pass 3, which Decision B
  deletes. Separately, phase2a's lifecycle detection hardcodes `["status","state","lifecycle_state"]`
  (phase2a ~line 178); a deployment that named the column `stage`/`disposition` yields
  `lifecycle_field: null` even though the spec's non-empty `lifecycle_states` prove a lifecycle
  exists, and nothing flags the mismatch.
- **Change.** (a) Restate the field-trust policy in the surviving docs (SKILL.md or the slimmed
  references) so field adaptation remains lesson-driven. (b) Add a cheap phase2a ambiguity: "spec
  declares `lifecycle_states` for X but no recognized lifecycle column was found - which column is
  it?" so the lifecycle field adapts instead of silently going null.
- **Files.** `scripts/phase2a-structural.ts`, SKILL.md / references.
- **Risk.** Low.

### D4 - consumer omissions (symmetry)
Folded from W2: `expectedNames` for `missing_entity` (phase2a ~line 201) must union `consumers`, not
just masters + embedded_masters, or a dropped consumer table is never flagged and the skill will
query a table that does not exist. Currently latent (emitted specs have empty `consumers`) but the
emitter populates them from live data, so it will bite other domains. Promote this from a W2
sub-bullet to a tracked change.

---

## 3. Defect workstreams

Each: problem (with evidence), change, files touched, risk, re-emission safety.

### W1 - `state.yaml` is never produced on the clean path, yet read every invocation
- **Problem.** SKILL.md step 5 + "What's in state.yaml" + the file-layout table treat `state.yaml`
  as the primary per-invocation read. But only `discovered.json` + `ready.flag` are written by the
  scripts; `state.yaml` is written only by the agent during Phase 2b, which runs ONLY when phase2a
  reports ambiguities. A cleanly-mapping deployment gets `ready.flag` and NO `state.yaml`, so step 5
  reads a file that does not exist.
- **Change.** Per **Decision C**: have `phase2a` always write the structural baseline to a
  machine-owned `state.discovered.json` (deployment block, module presence, deterministic
  alias/label renames, omitted entities). Phase 2b appends user resolutions to the human-owned
  `state.yaml`. The skill reads both; clean path now always has the machine baseline.
- **Files.** `scripts/phase2a-structural.ts` (emit `state.discovered.json`), SKILL.md step 5 +
  "What's in state.yaml" + file-layout table (name both files + ownership).
- **Risk.** Resolved by Decision C (the JSON/YAML split removes the YAML-merge problem). Without
  Decision C this workstream carries the plan's biggest hidden cost.
- **Re-emission safety.** Baseline write is idempotent given same spec + same live schema; the
  human-owned `state.yaml` is never machine-clobbered.

### W2 - phase2a match corpus is masters-only -> some cross-domain embeds falsely flagged
- **Problem.** `aliasLookup` in phase2a is built only from `spec.data_objects`, and the emitter sets
  `data_objects = masterDetail` (masters only). Embedded-masters and consumers are NOT in
  `data_objects` (they live in `modules[].embedded_masters` / `modules[].consumers` as bare names).
  So a live entity whose name only appears in those module arrays fails to match and is flagged
  `custom_entity`.
- **Magnitude (corrected after review).** This is NOT a "flood." Most same-domain entities still
  resolve because their owning module masters them (so they appear in `data_objects`). For ATS the
  actual false-flag set is ~5 cross-domain HCM embeds (`hcm_positions, internal_opportunities,
  job_profiles, locations, org_units`), not ~60. The defect is real but small; treat it as
  correctness hygiene, not a blocker.
- **Change.** Build the match corpus from ALL spec entity names: union `data_objects[].name` (+ its
  aliases/labels) with every `modules[].masters/embedded_masters/consumers` name. Only names absent
  from that union are true `custom_entity` candidates. **Symmetric fix (gap from review):** also
  union `consumers` into the `expectedNames` set used for `missing_entity` detection
  (phase2a ~line 201 currently unions only `masters` + `embedded_masters`), or the two halves drift.
- **Files.** `scripts/phase2a-structural.ts`.
- **Risk.** Low. Consumers have no alias/label detail, so they match by exact name only; a renamed
  consumer still falls to Phase 2b (correct).
- **Re-emission safety.** Pure function of spec contents.

### W3 - `ready.flag` freshness is brittle (date equality) -> over-rediscovery + dead incremental path
- **Problem.** SKILL.md step 4 requires `ready.flag.valid_through_emitted == spec.emitted`. But
  `spec.emitted = todayIso()` bumps on EVERY emit, so any re-emit invalidates the flag and forces a
  full cold re-discovery, even when nothing changed. It also makes the "incremental reconciliation"
  mode documented in discovery.md unreachable (the equality gate always forces full bootstrap when
  the date moves).
- **Change.** Key freshness on `facts_major` (separate equality gate) + a content hash of the spec.
  **Critical correction from review:** do NOT hash the whole `spec.json`. The spec itself embeds
  `emitted: todayIso()` and `catalog_snapshot: "<org>-<today>"`, both of which move every emit, so a
  whole-file hash defeats the purpose and changes daily anyway. Hash a **date-stripped projection**:
  the spec with `emitted` and `catalog_snapshot` removed (`facts_major` also excluded since it is
  gated separately). JSON key order is already stable (objects built with fixed literal key order +
  `JSON.stringify(spec, null, 2)`), so no key-order normalization is needed beyond the field excludes.
  Freshness = `valid_through_major == facts_major` AND `spec_content_hash == hash(projection)`.
  Re-emit with identical catalog content -> same hash -> flag stays valid. Real change -> hash
  differs -> re-discover. This is what makes incremental reconciliation reachable.
- **Reuse the dormant field.** `bootstrap.ts` already computes `schema_hash = sha256(discovered.json)`
  and writes it to `ready.flag`, but SKILL.md's gate never checks it. Either repurpose `schema_hash`
  or add `spec_content_hash` alongside it; do not leave two unused hash fields.
- **Files.** `scripts/bootstrap.ts` (compute the date-stripped projection hash + store it), SKILL.md
  step 4 (gate on `facts_major` equality AND the content hash; drop the `emitted` equality).
- **Risk.** Low. Keep `emitted` in the flag for human readability, just stop gating on it. The one
  correctness pitfall (hashing the date fields) is now called out.
- **Re-emission safety.** This change is the re-emission-safety fix; it is the point.

### W4 - bootstrap invocation path in SKILL.md is wrong
- **Problem.** Step 4 says `bun run scripts/bootstrap.ts` "from the project root." From the project
  root that resolves to the repo's own `scripts/` (the emitter dir), not the skill. The script
  header itself uses `.claude/skills/use-<domain>/scripts/bootstrap.ts`.
- **Change.** Point `bun run` at the skill's own dir while keeping cwd = project root. Two viable
  phrasings:
  - (a) Reuse existing token: `bun run .claude/skills/use-{{DOMAIN_CODE_LOWER}}/scripts/bootstrap.ts`
    (works for domains and bundles; `{{DOMAIN_CODE_LOWER}}` already exists). Downside: hardcodes the
    Claude-Code `.claude/skills/` install location.
  - (b) Harness-neutral wording: "from the project root (do NOT cd into the skill folder), run
    `bun run` against this skill's `scripts/bootstrap.ts` using the path of the directory this
    SKILL.md lives in." No install-path assumption.
  - **Recommend (b)** as primary wording with (a) as a concrete example, since the skill claims
    cross-harness portability.
- **Files.** SKILL.md step 4 + the "force a fresh discovery" note.
- **Risk.** None. Prose only.
- **Re-emission safety.** Uses an existing token or none.

### W5 - phase1 "CLI not installed" message is unreachable
- **Problem.** phase1 detects a missing CLI by string-matching `command not found` in stderr, but
  `Bun.spawn(["semantius", ...])` on a missing binary throws ENOENT before any exit/stderr, and that
  throw is caught by the top-level handler as a generic "unexpected error." The tailored install
  guidance never shows.
- **Change.** Wrap the spawn (or the first `call`) in try/catch; map ENOENT / "Executable not found"
  to the install-instructions halt. Apply the same guard in phase2a and bootstrap's `runScript`.
- **Files.** `scripts/phase1-environment.ts`, `scripts/phase2a-structural.ts`, `scripts/bootstrap.ts`.
- **Risk.** Low.
- **Re-emission safety.** Verbatim-copied script; no substitution.

### W6 - `references/discovery.md` queries wrong `/fields` columns (and duplicates phase2a)
- **Problem.** discovery.md Pass 3 uses `/fields?entity_id=eq.<id>&select=name,data_type,is_required`.
  The live `fields` table is keyed by `table_name` with `field_name`/`format` (confirmed by
  phase2a `table_name=eq...&select=field_name,format,...` and by the emitter's
  `select=table_name,field_name,enum_values`). The documented query would 400.
- **Change.** Subsumed by Decision B: removing the hand-written full-discovery passes deletes the
  wrong query. If any corrected reference query is retained for agent ad-hoc use, fix the columns to
  `table_name` / `field_name` / `format`.
- **Files.** `references/discovery.md`.
- **Risk.** None (doc).

### W7 - `references/bootstrap.md` is stale/duplicative
- Subsumed by Decision B. Delete or slim; fold unique remedies into phase1 `fix` strings; update the
  two SKILL.md links that point at it.

### W8 - `discovered.json` documented schema drifts from producer
- **Problem.** discovery.md Pass 6 documents a per-entity `relationships_out` array; phase2a never
  emits it (it writes `fields`, `lifecycle_field`, `lifecycle_values`).
- **Change.** Pick one: (a) align the doc to the producer (drop `relationships_out`), or (b) have
  phase2a derive `relationships_out` from `reference_table` fields (cheap, useful for "what links to
  X"). Recommend (b) as a small enhancement since the data is already in hand from the fields pull;
  otherwise (a).
- **Files.** `scripts/phase2a-structural.ts` and/or the discovered.json doc (now in the slimmed
  discovery.md or SKILL.md "What's in discovered.json").
- **Risk.** Low.

### W9 - payload passing: stdin vs positional arg (cosmetic only - corrected after review)
- **Problem (downgraded).** phase1/phase2a pipe `JSON.stringify(payload)` to `proc.stdin`; the
  reference examples pass `'{}'` as a positional arg. Review confirmed the CLI supports BOTH forms
  (`use-semantius` cli-usage: "reads JSON from stdin" AND "inline JSON args"). There is no payload
  bug; the scripts are correct. This is purely a docs-consistency nit.
- **Change.** Optionally standardize the example style across references for readability. No script
  change required.
- **Risk.** None.

### W10 - `tenant` key in phase1 output is a "never say tenant" foot-gun
- **Problem.** SKILL.md forbids "tenant" in user-facing text, but phase1 emits `tenant: { org, email }`
  and the agent is told to surface the org from it; an agent echoing the key may say "your tenant."
- **Change.** Rename the JSON key to `platform` (or `deployment`). Keep "tenant" only in code
  comments.
- **Files.** `scripts/phase1-environment.ts` (+ any reader in bootstrap.ts/SKILL.md).
- **Risk.** None. (Note: SKILL.md already exempts script diagnostics/field names from the no-tenant
  rule, so this is defense-in-depth, not a rule breach.)

### W11 - getCurrentUser org-field-name mismatch (real latent bug, surfaced by review)
- **Problem.** phase1 reads the org from `ver.data?.semantius_org`. The emitter's `orgSlug()` reads
  `org_slug ?? tenant_slug ?? organization.slug ?? org ?? tenant ?? organization_name` and never
  tries `semantius_org`. The two disagree on the field name; at most one is right. If `semantius_org`
  is wrong, phase1 reports `org: "<unknown>"` to the user on every bootstrap (and the emitter's
  snapshot silently falls back to `"catalog"`). The `use-semantius` docs don't enumerate the field,
  so neither can be confirmed from source.
- **Change.** Verify the real field name against a live `getCurrentUser` response, then make phase1
  and the emitter read the same key (a shared `pickOrgSlug(data)` helper would prevent re-drift).
- **Files.** `scripts/phase1-environment.ts`, `scripts/emit_skill_spec.ts`.
- **Risk.** Low to fix; the bug is currently silent (degrades to `<unknown>`/`catalog`).

### W12 - phase2a N+1 live query per entity (perf, optional)
- **Problem.** phase2a issues one `/fields` GET per live entity, each spawning a fresh `semantius`
  process (~65 sequential spawns for ATS on every cold bootstrap). W2's corpus expansion matches more
  entities through the same loop, so this gets slower, not faster.
- **Change (optional).** Batch fields for all entities in a module with a single
  `/fields?table_name=in.(...)` call, or fetch fields per module rather than per entity. Defer if
  bootstrap latency is acceptable; note it so it is a conscious choice, not an oversight.
- **Risk.** None (read-only optimization).

---

## 4. Sequencing

1. **Decision A** (domain/bundle script branching, with D-bundle-1 pinned) - unblocks bundle skills;
   do first because W1/W2/W5/W11/W12 and Decision D all edit the same scripts and should be written
   once against the branched structure.
2. **Decision C** (state file ownership split) - settle JSON/YAML ownership BEFORE W1/D2, since their
   shape depends on it.
3. **Decision D** (entity-adaptation correctness: D1 rename correlation, D2 durable rename index, D3
   field-trust + lifecycle check, D4 consumer omissions) - the core Q2 fix; **must land with or
   before Decision B**, never after.
4. **Decision B** (collapse discovery designs) - prose/reference rewrite; re-key ASK rules to the
   real kinds incl. `rename_candidate` from D1.
5. **W3** (freshness on a date-stripped content hash) - core re-emission-safety fix; verify the hash
   excludes `emitted` + `catalog_snapshot`.
6. **W1, W2, W5, W10, W11** - script edits, batched (same files as Decision A/D). W12 optional. (W2's
   match-corpus expansion stays; its symmetric `missing_entity` half moved to D4.)
7. **W4** - SKILL.md path wording.
8. **W6, W7, W8** - reference/doc reconciliation (mostly subsumed by Decision B).
9. **W9** - cosmetic; do opportunistically.

## 5. Validation / acceptance

- **Emit + bootstrap a domain:** `bun run scripts/emit_skill_spec.ts --domain ATS`, then run the
  generated `use-ats` bootstrap from project root; assert `ready.flag` + `discovered.json` +
  `state.discovered.json` all exist. For W2, assert the `custom_entity` ambiguity set equals the
  EXPECTED cross-domain list (for ATS: `hcm_positions, internal_opportunities, job_profiles,
  locations, org_units`), not a "!= 60" check (which would pass even unfixed).
- **Emit + bootstrap a bundle:** same for `--bundle REAL-ESTATE-AGENT`; assert bootstrap does NOT
  throw on `spec.modules` (Decision A) and produces the artifacts.
- **The three canonical adaptation scenarios (Decision D, the Q2 acceptance gate).** Against a test
  deployment that (a) renamed `job_applications`->`applications` AND relabeled it, (b) dropped a
  master (`cost_centers`) and a consumer entity, (c) added a custom `referral_bonuses` table, assert:
  - the rename surfaces as ONE paired `rename_candidate`, and after confirmation
    `state` resolves spec `job_applications` -> live `applications` in a single lookup;
  - a runtime query for `job_applications` targets `applications`, and NO query is ever generated
    against `cost_centers` or the dropped consumer (both recorded as omitted);
  - `referral_bonuses` is surfaced as `custom_entity` and classified.
  This is the test that proves the skill adjusts to installed entities; if it passes, Q2 holds.
- **Lifecycle-field adaptation (D3):** deployment names the lifecycle column `stage`; assert phase2a
  flags "lifecycle expected but not found" rather than silently recording `lifecycle_field: null`.
- **Re-emission stability (W3):** emit twice with no catalog change; assert the date-stripped content
  hash is IDENTICAL across the two emits (prove it by confirming only `emitted`/`catalog_snapshot`
  differ between the two `spec.json` files) and a warm invocation does NOT re-discover. Then mutate
  one entity and assert it DOES.
- **Missing-CLI message (W5):** run phase1 with `semantius` off PATH; assert the install-instructions
  halt fires (not "unexpected error"). Note: the trigger is a thrown ENOENT, so the fix must catch the
  spawn throw, not match stderr.
- **Org field (W11):** capture a live `getCurrentUser` response and confirm phase1 + emitter read the
  same, correct key (no `<unknown>`/`catalog` fallback).
- **Learning-layer preservation:** because `assembleInstalledSkill` does `rmSync(dest)`, test
  state.yaml preservation against a COPIED skill dir, not by re-emitting in place; or add a note that
  the real installer (not this emitter) owns preservation.

## 6. Re-emission safety checklist (apply to every template edit)

- [ ] No new `{{TOKEN}}` in SKILL.md without a matching key added to `renderSkillMd` (and tested for
      both domain and bundle render paths).
- [ ] Renders cleanly for a bundle spec (no domain-only assumption in prose that becomes false/empty).
- [ ] No scratch/planning files added under `domain-skill-template/` (they ship in every skill).
- [ ] Scripts still resolve paths via `import.meta.dir`, not cwd.
- [ ] `state.yaml` writes MERGE, never clobber, an existing curated file.
- [ ] Freshness keyed on content hash + major, never on `emitted` date.
- [ ] Reference links in SKILL.md still resolve after any reference rename/delete.

## 7. Out of scope (this plan)

- The `description:` frontmatter and triggering surface (`ALIASES_COMMA_LIST`, entity-noun dump,
  capability list). Deferred to its own plan so future emits cannot silently regress triggering.
- Upstream catalog data quality (e.g. `min_org_size: "20 s <500"` looks like a mangled character in
  the source row); not a template concern.
