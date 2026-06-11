# Plan: reveal processes, personas, and RACI per business function (band B9e)

Status: DRAFT rev.10 (reorient after the rev.9 review). rev.10 keeps rev.9's load-bearing insight (the
deliverable is the per-function reveal in `business-functions.json`, produced by a committed emitter
change that runs first), and fixes the four reveal defects the rev.9 review found: the plan contradicted
its own goal by aggregating the persona out of the RACI; `personas[]` and the process list were computed
over different persona sets; the D2 seam default made consumer functions look realized and destroyed the
"empty cell = backlog" signal; and the flat output carried no market (domain) axis. The single structural
change that removes three of those at once is making the cross-functional seam **owner-anchored**.

**Implementation status (2026-06-11): Phase 1 is built and verified against live data.** The §2 emitter
change is implemented in [emit_domain_map.ts](../scripts/emit_domain_map.ts); a live run emits the
per-market triple, the set-consistency cross-check PASSES, and the seven consumer/contributor functions
with no own personas (Finance, Executive, IT Operations, Manufacturing Operations, Payroll, Sales,
Software Engineering) read empty. Running it surfaced one defect paper review missed: the market
attribution must be GATE-DOMINANT (§2.2), not gate-or-handoff, or a process gated in one domain bleeds
into a neighbor across a handoff seam (HCM org/offboarding processes were showing under Recruiting's ATS
view via a cross-functional persona). Not yet done: regenerate the committed `catalog/` artifacts, the §8
doc edits, and Phase 2.

## Why rev.10 exists (what the rev.9 review found)

rev.9 stopped the gross b9d failure: its Phase 1 changes the emitter, so an end-to-end run produces new
visible output, and the underlying RACI data is rich (verified against the committed
[catalog/personas.json](../catalog/personas.json) and [catalog/processes.json](../catalog/processes.json):
all four owner functions and both cross-functional personas carry real `process_raci` rows). But a review
against the goal and the live artifacts found rev.9 still would not deliver what the user asked for. Five
findings drove this rewrite, each verified:

1. **The plan contradicted itself: the goal needs the triple, the design threw the persona away.** §0
   defines success as "which personas act on which processes in which RACI capacity, so a reader can say
   **who** is R/A/C/I." rev.9 §2.1 then emitted `processes: { key, name, raci }[]` and pushed per-persona
   detail back to `personas.json`. Aggregating to `(process, raci)` deletes the persona axis the goal
   requires, and the DoD's own claim ("the two-hop join is no longer needed") fails for the **who**
   question: you would still have to join to `personas.json` to find the actor.
2. **`personas[]` and the process list were computed over different sets, so the reveal was internally
   inconsistent.** rev.9 kept `personas: string[]` as the **literal** own set (the emitter drops
   cross-functional personas at [emit_domain_map.ts:765](../scripts/emit_domain_map.ts#L765),
   `if (fid == null) continue`) while computing the processes over the **effective** set. Concrete on the
   live data: Recruiting's process list would carry `draw_up_make_offer` as `accountable`, but the only
   accountable actor for that process is `HIRING-MANAGER`
   ([processes.json](../catalog/processes.json)), a cross-functional persona that is **not** in
   Recruiting's `personas[]`. The view would show a RACI letter that traces to nobody it lists.
3. **The D2 seam default made consumer functions look realized and killed the backlog signal.** rev.9's
   seam rule attached a cross-functional persona to **every** function that merely declares a domain the
   persona touches, in any responsibility. `PEOPLE-MANAGER` touches HCM, so it would attach to all six
   HCM-declaring functions (Executive, Finance, GRC, Human Resources, IT Operations, Payroll);
   `HIRING-MANAGER` touches ATS and HCM, attaching to eight. So `Finance --consumer--> ATS` would render
   **populated** (via `HIRING-MANAGER`), even though rev.9 itself treats that edge as the anti-fiasco
   arbitration question. The Phase-1 reveal (loose: co-declares the domain) and the Phase-2 resolver
   (strict: an actual I/C row warranted by an inbound handoff) then told opposite stories about the same
   edge, and the "empty cell = the work" premise broke.
4. **No market (domain) axis, though the goal says "per market."** rev.9's flat process list could not
   answer "who is R/A/C/I for **market D**" for a multi-domain function (Legal touches ATS, HCM, and LMS;
   Human Resources with roll-up spans four domains). The market disappeared into one undifferentiated list.
5. **Residual over-build in Phase 2.** By rev.9's own analysis the first `b9e_resolver.ts` run writes zero
   rows and emits about six questions. A committed script whose first job is to write nothing is smaller
   than rev.8's seven-bucket machine but still apparatus slightly ahead of its data. rev.10 keeps a
   committed resolver (it matches the B9d pattern and stays idempotent and reproducible) but aligns its
   realized test with Phase 1 so the two phases agree, and gates it behind the Phase-1 reveal.

What the review did **not** find: the data is not thin (finding 1 of the rev.8 review is gone), and the
b9d substrate is clean (the legacy migration ran with sign-off on 2026-06-10, the inverted records are
removed, `b9d_resolver.ts` is committed and has fired). rev.10 carries no migration step.

## 0. The real goal and the test for "succeeds"

Goal: for every business function, `business-functions.json` shows **which personas act on which
processes in which RACI capacity, grouped by the market (domain) the function owns, contributes to, or
consumes**, so a reader can say **who** is R/A/C/I for each of that function's markets without a second
lookup. The next review succeeds when:

- Each released function carries a `raci[]` of **self-describing rows**: every row names its `domain`, the
  function's `responsibility` on that domain, the `persona` (the actor), how that actor relates to the
  function (`persona_via`: `own` / `descendant` / `seam`), the `process`, and the RACI letter. No row
  references an actor the view does not name. The two-hop join to `personas.json` is no longer needed to
  answer **who is R/A/C/I**, including for cross-functional and descendant actors.
- The owner functions are non-empty on the first run (they are already realized), so the result is visible
  immediately, and a multi-domain function's rows are separable **by market**.
- A consumer or contributor function with no own, no descendant, and no owner-anchored seam actor reads as
  **honestly empty** (`raci: []`). Empty is the Phase-2 backlog signal, and a cross-functional persona can
  no longer fill it by accident (finding 3 is closed by the owner-anchored seam rule in §3).
- The classification and write model in Phase 2 are sized to the 6 consumer edges that actually need work,
  and Phase 2's realized test agrees with Phase 1's reveal: an edge that reads empty in the reveal is an
  open question in the resolver, never both empty and realized.

## 1. Two phases, in this order

**Phase 1 (the reveal): change the emitter so each function carries the per-market RACI triple.**
Deterministic, one committed file, no catalog writes, no resolver. It exposes what is already realized
(the new result rev.8 never produced) and makes every Phase-2 gap legible as an empty cell. Ship it first
and review it on its own.

**Phase 2 (fill the gaps): a small committed resolver for the unrealized edges.** Only after Phase 1 shows
where the holes are. On today's data this is 6 consumer edges; each resolves to a single uniform terminal
(arbitration), so Phase 2's first run authors zero fabricated rows and surfaces a handful of plain-language
questions, and its realized test is the same owner-anchored test the reveal uses.

Phase 1 is the load-bearing change for the user's goal. Phase 2 only stops the revealed view from leaving
the consumer edges silently empty.

## 2. Phase 1: the emitter change (committed, exact)

Edit [scripts/emit_domain_map.ts](../scripts/emit_domain_map.ts). The RACI map already exists
(`raciProcessesByPersona`, [emit_domain_map.ts:603-627](../scripts/emit_domain_map.ts#L603-L627), keyed by
`role_id`); the function emit path simply never reads it.

### 2.1 The output shape (replaces the bare `personas: string[]`-only view)

Extend `BusinessFunctionOut` ([lines 174-183](../scripts/emit_domain_map.ts#L174-L183)). Keep the existing
fields (`name`, `description`, `parent`, `record_status`, `domain_count`, `persona_count`, `domains[]`),
keep `personas: string[]` as the **literal org-membership** list (who belongs to the function, unchanged
semantics, useful on its own), and **add** the authoritative actor list:

```
type FunctionRaciRef = {
  domain: string;          // the market this row is attributed to (a domain the function declares)
  responsibility: string;  // the function's responsibility on that domain: owner | contributor | consumer
  persona: string;         // role_code of the actor
  persona_via: string;     // own | descendant | seam (how the actor relates to this function)
  process_key: string;
  process_name: string;
  raci: string;            // responsible | accountable | consulted | informed
};
// added to BusinessFunctionOut:
raci: FunctionRaciRef[];   // sorted by domain, then responsibility rank, then process_key, then raci, then persona
```

Each row is self-contained: it names the actor and tags how that actor attaches, so a non-member actor
(`persona_via` = `descendant` or `seam`) is fully explained in place. `personas[]` (members) and the
`persona` values in `raci[]` (actors) are deliberately different things, each internally complete; the
rev.9 inconsistency is gone because the actor is carried **inside** the row, not implied by a separate
list.

### 2.2 The effective actor set per function (the union, with a tag on each source)

In the `functionsOut` builder ([lines 769-804](../scripts/emit_domain_map.ts#L769-L804)), build the
effective actor set as the union of three sources, **keyed by `role_id`** so the RACI map is reachable
(rev.9 keyed `personaCodesByFunction` by `role_code`, [lines 762-768](../scripts/emit_domain_map.ts#L762-L768),
which cannot reach `raciProcessesByPersona`):

- **own** (`persona_via: "own"`): personas with `business_function_id == fn.id`.
- **descendant** (`persona_via: "descendant"`): personas of every function in `fn`'s subtree under
  `parent_business_function_id` (D1, §3). Build the subtree once from `all.businessFunctions`.
- **seam** (`persona_via: "seam"`): a cross-functional persona (NULL `business_function_id`) with a
  `process_raci` row on a process **gated in** a domain that `fn` or its subtree **owns** (gate-dominant
  attribution, see the helper below). **Owner-anchored, not declare-anchored** (this is the rev.10 fix for
  finding 3): the seam
  persona attaches only to the function that owns the domain it operates in, never to the domains'
  consumers or contributors. On the live data this attaches `HIRING-MANAGER` to Recruiting (owns ATS) and
  Human Resources (owns HCM), and `PEOPLE-MANAGER` to Human Resources (owns HCM) and Learning and
  Development (owns LMS), and to nothing else. Finance, Executive, GRC, IT Operations, Payroll get no seam
  actor and stay honestly empty.

Precompute two helpers from data the emitter already has:

- `attribDomainsByProcess: Map<processId, Set<domainId>>`: the market attribution of a process,
  **gate-dominant**. Invert `gateProcsByModule` rolled up through `modulesByDomain` as the primary
  attribution; fall back to `handoffProcsByDomain` ONLY for a process gated nowhere (handoff-only
  processes such as `monitor_evaluate_learning`). A process gated in domain X is therefore NOT bled into
  domain Y just because it is handed off across the X-Y seam. This was verified necessary by running
  Phase 1: the gate-or-handoff version pulled HCM-gated org and offboarding processes into Recruiting's
  ATS view through a cross-functional persona, the same gate-wins-over-handoff rule the per-domain
  `processes[]` already applies to `via` ([emit_domain_map.ts:444-457](../scripts/emit_domain_map.ts#L444-L457)).
- `ownerFunctionDomains: Map<functionId, Set<domainId>>`: the domains a function declares with
  `responsibility_type == 'owner'`, rolled up through the subtree (reuse `domainRespByFunction`,
  [lines 752-761](../scripts/emit_domain_map.ts#L752-L761)). Used only to decide seam attachment. If a
  released domain has no owner function in the gated set, a seam persona touching it anchors nowhere; log
  that as a data gap rather than dropping it silently.

### 2.3 Build the rows

For each function `fn`, for each effective actor `e` (carrying its `persona_via`), for each `(process_id,
letter)` in `raciProcessesByPersona.get(e.role_id)`:

1. `markets = attribDomainsByProcess.get(process_id) ∩ declaredDomains(fn-subtree)`. For own and
   descendant actors, `declaredDomains` is every domain the subtree declares (owner / contributor /
   consumer). For seam actors, restrict to the **owned** domain(s) that anchored the attachment.
2. For each `D` in `markets`, emit one `FunctionRaciRef` with `domain = D.code`, `responsibility =
   resp(fn-subtree, D)`, `persona = e.role_code`, `persona_via`, the process key and name, and the RACI
   letter.
3. If `markets` is empty for an **own or descendant** actor (the actor has RACI on a process attributed to
   no domain the function declares), emit a single row with `domain: "(undeclared)"` and log it: this is a
   real anomaly, a persona doing work in a market the function does not declare, i.e. a missing
   `business_function_domains` edge worth surfacing, never a silent drop.

Dedup rows by `(domain, persona, process_key, raci)`. Sort as in §2.1. `personas[]` stays the literal own
members. A function with no own, no descendant, and no seam actor gets `raci: []`.

### 2.4 Cross-check and log

Mirror the existing persona cross-check ([lines 580-596](../scripts/emit_domain_map.ts#L580-L596)). Log,
per released function: the number of `raci[]` rows, the breakdown by RACI letter, the distinct markets
covered, and the count of functions still at `raci: []` (the Phase-2 backlog). Additionally assert and log
the **set-consistency invariant** that closes finding 2: every `persona` that appears in any `raci[]` row
is either in that function's `personas[]` (so `persona_via == "own"`) or carries `persona_via` in
`{descendant, seam}`. A row whose persona is neither a member nor tagged is a bug; fail the cross-check.

No schema change, no catalog write. The change is to one emitter and its output artifact.

## 3. Phase 1 decisions (one real decision; the seam is now fixed, not optional)

The rev.9 D2 ("attach cross-functional personas to every declaring function") is **removed** and replaced
by the fixed owner-anchored seam rule in §2.2, because the loose form caused finding 3. That leaves one
genuine decision:

- **D1 (descendant roll-up).** Should `Human Resources` show, under its markets, the RACI of its
  sub-functions (Recruiting on ATS, Learning and Development on LMS, HR Service Delivery on HRSD, Payroll
  on HCM)? **Recommended: yes.** The owner of a parent function wants to see all work under it, and because
  every row is market-grouped and `persona_via`-tagged, the rolled-up rows stay legible (an HR reader sees
  `domain: ATS, persona_via: descendant` and knows it comes from Recruiting). If the owner prefers strict
  literal, gate the descendant source behind a flag and emit only `own` + `seam`; the field shape does not
  change. Default: roll-up on.

D1 changes which rows appear, not whether the field exists or whether it is self-consistent.

## 4. Phase 2: the minimal realization resolver

A committed script at **`scripts/analytics/b9e_resolver.ts`** (TypeScript, run with `bun` from the project
root; never `.tmp_deploy/`). It is the deliverable, not a spec. It does only what the revealed empty cells
require, and its realized test is the **same owner-anchored test** the reveal uses (§2.2), so the two
phases never disagree about an edge.

**Inputs (read-only):** `business_function_domains`, `process_raci` (read `actor_skill_id` so skill-R is
visible), `handoffs` + `handoff_processes`, `data_object_lifecycle_states` (the gated predicate),
`data_objects.entity_type` (REFERENCE-READ), `domain_roles` + `role_modules` (reach), and the
`domain_module_data_objects` mastery used to resolve the owner.

**Per edge `(F, D, resp)`, in order:**

1. **REALIZED already** (the reveal shows a non-empty `raci[]` for this market on this function): no
   action. Owner uses B9d's R/A-only helpers; consumer uses a four-letter check that reads C and I and both
   actor FKs (B9d's index is R/A-only, so this is the one genuinely new read, kept small).
2. **REFERENCE-READ**: the consumed entity is `entity_type='catalog'`. Record, never fabricate a row.
3. **Realizable now (built owner)**: the owner function (F or a descendant) is built (has reach) and the
   realizing persona and the delivering inbound handoff both already exist. Author the single unambiguous
   `process_raci` row directly as additive (Rule #21), idempotency-keyed (§6), with a one-line owner-visible
   note. This is the only direct-write path.
4. **Everything else is one question.** No connecting handoff, unbuilt owner, ambiguous persona, or an
   over-declared edge all resolve to a single plain-language arbitration/deferral question on the owner
   function, rendered by reusing `b9d_resolver.ts`'s `renderOrphanQ` + the `BANNED`/`lintHuman` gate
   ([b9d_resolver.ts:264-272, 406-457](../scripts/analytics/b9d_resolver.ts#L264-L457)) so it is lingo-free
   by construction. On today's data all 6 consumer edges land here (no inbound handoff to a domain the
   consuming function owns; the consuming functions own no released domain), so the first run authors zero
   rows and emits at most a handful of questions, which is the honest, proportionate result, and it matches
   the reveal showing those same six functions empty.

There is no 7-bucket MECE classifier, no X1/X2/X3, no CONFIRMED/DIVERGENT split, and no
override-with-date in rev.10. §11 says exactly when to add them back.

## 5. The realized test (per `responsibility_type`)

Gated = `data_object_lifecycle_states.requires_permission=true AND process_id=<pid>` (B9d's exact
predicate; verified). On the consumed gated D-process(es):

| `resp` | REALIZED when | actor scope |
|--------|---------------|-------------|
| **owner** | >=1 **A** AND >=1 **R** | **A** must be a persona of **F** at the process's grain; **R** may be anyone (descendant, an owner-anchored seam persona, or a skill actor) |
| **contributor** | >=1 **R**, OR >=1 **C** with `consultation_blocking=true` | persona of **F**/descendant, or an owner-anchored seam persona on the edge's handoff chain |
| **consumer** | an actual `process_raci` **I** (or non-blocking **C**) row on a persona of F/descendant or an owner-anchored seam persona, on a process with a producing R+A, warranted by an inbound `handoffs` row (D -> a domain a function in F's subtree owns) carrying the payload; OR a REFERENCE-READ | the I/C actor is a persona of F/descendant or an owner-anchored seam persona; the handoff is the **precondition** that warrants the row, never a substitute for it |

A consumer edge is REALIZED only on an **actual `process_raci` I/C row**, never on a structural edge alone,
and the seam actor must be **owner-anchored** to the domain the function's subtree owns, the same rule the
reveal uses (so a consumer function that owns no released domain can never read realized in either phase).
No inbound handoff means over-declared, which is arbitration (the anti-fiasco case), never a fabricated
I-row. The catalog stores no `trigger_event`->persona/function FK and no `webhook_receiver` entity
(verified), so "informed" is proven by the row's existence, not by notification wiring.

## 6. Write model (idempotency, the `record_status`-less constraint)

`process_raci` has **no `record_status` and no stable id**; the row's only identity is its column tuple
(verified, [module-shape.md:571-577](../.claude/skills/domain-map-analyst/references/module-shape.md#L571-L577)).
Two consequences:

1. **Idempotency.** Before any `process_raci` INSERT, SELECT on the composite natural key
   **`(process_id, actor_role_id` or `actor_skill_id, raci)`** (exactly one actor FK non-null per the
   `exactly_one_actor` constraint) and no-op if present. **`consultation_blocking` is NOT in the key**: it
   is an attribute of a consulted fact, not an identity axis (the platform's own `process_raci_label` omits
   it), so keying on it would let two contradictory C rows (blocking and advisory) both insert instead of
   no-oping. The same SELECT-then-INSERT guards `role_modules` reach writes on `(role_id,
   domain_module_id)`. A second run produces zero new rows. There is no DB unique constraint on
   `process_raci`, so this is enforced caller-side, in the resolver, by code (not a comment).
2. **Review handle.** Since the row cannot carry `record_status='new'`, each directly-authored row gets a
   one-line note on the owner function's audit item ("Realized: <role> is Informed of <work>; no action
   unless you correct it"), authored in the same pass. That is the reviewable-in-the-records substitute for
   a table with no status to quarantine.

Direct authoring is limited to §4 step 3 (the unambiguous, built-owner case). Every other case is a
question. Destructive steps (dropping or re-pointing an edge) always need sign-off (Rule #1).

## 7. Schema facts (carried from rev.9, re-verified)

- `process_raci` has no `record_status` and no stable id.
- `business_function_domains.responsibility_type` enum is `owner` / `contributor` / `consumer` (field is
  `responsibility_type`).
- Gated = `requires_permission=true AND process_id` set.
- No `trigger_event`->persona/function FK; no `webhook_receiver` in `domain_map`.
- B9d's `isRealized`/`hasRA`/`raPair` are R/A-only and blind to C/I and skill actors, so the consumer
  four-letter check is genuinely new (kept minimal in §4 step 1).
- Released domains today: ATS, HCM, HRSD, LMS, each with exactly one owner function (Recruiting, Human
  Resources, HR Service Delivery, Learning and Development), so every owner-anchored seam persona has a
  home (verified against [catalog/business-functions.json](../catalog/business-functions.json) and
  [catalog/personas.json](../catalog/personas.json)).
- Cross-functional personas (NULL `business_function_id`) in the released set: `HIRING-MANAGER`,
  `PEOPLE-MANAGER`, both with real `process_raci` rows, so the seam source is live, not dead code.

## 8. Skill / doc edits

- **`scripts/emit_domain_map.ts`** is the primary Phase-1 deliverable (§2). Its top comment must describe
  the new per-function `raci[]` triple, the `persona_via` tag, the owner-anchored seam rule, the D1
  behavior in force, and the set-consistency invariant the cross-check asserts.
- **`SKILL.md`**: add band B9e by B9d, with the off-domain-write / never-report-only carve-out and the
  transcript gate, using B9d's exact phrasing pattern (named heading, the INCOMPLETE-gate sentence, a grep
  proof), not a one-line mention. State that the per-function reveal is produced by the emitter, carries
  the persona-process-RACI triple per market, and that B9e's job is to fill its empty cells with the same
  owner-anchored realized test.
- **`references/roles.md`**: §5/§7, contributor/consumer realized as `process_raci` C/I on the consumed
  D-process, authored per the §6 write model; correct the §5 line ([roles.md:82](../.claude/skills/domain-map-analyst/references/roles.md#L82))
  that still says I realizes via `trigger_event`/`webhook_receiver` (those do not exist in `domain_map`).
- **`references/skill-changelog.md`**: B9e as the per-function reveal (the triple, per market) plus a
  minimal owner-anchored gap-filler; record the rev.9 goal-vs-design contradiction, the split-set
  inconsistency, and the loose-seam false-positive as the load-bearing lessons.
- **`scripts/analytics/b9e_resolver.ts`** is the Phase-2 deliverable, committed at that path.

## 9. Execution order

1. **Phase 1, build and run the emitter change** (§2), with D1 at its default and the owner-anchored seam.
   Commit `emit_domain_map.ts`. Run it; confirm the four owner functions (Human Resources, Recruiting,
   Learning and Development, HR Service Delivery) carry non-empty `raci[]` with named personas, RACI
   letters, and a `domain` per row; confirm Finance, Executive, GRC, IT Operations, Payroll read `raci:
   []`; confirm the set-consistency cross-check PASSES and the log prints per-function row counts, the
   RACI-letter breakdown, and the empty-function backlog.
2. **Review Phase 1 on its own.** This is the first new result. Spot-check Recruiting: `draw_up_make_offer`
   shows `HIRING-MANAGER` accountable tagged `seam`, `RECRUITING-RECRUITER` responsible tagged `own`,
   `RECRUITING-MANAGER` consulted tagged `own`, all under `domain: ATS, responsibility: owner`, with no
   actor referenced that the row does not name. Flip D1 if the owner wants strict literal.
3. **Phase 2, build and commit `b9e_resolver.ts`** (§4-§6), dry-run only first. Validate on ATS: `Finance
   --consumer--> ATS` must land in §4 step 4 (one arbitration question), never a fabricated I-row, and must
   match the Phase-1 reveal showing Finance empty. Assert the question passes the `lintHuman` ban gate.
4. **Pilot Phase 2 on 2-3 released domains**: `--write`, then re-run and confirm **zero new
   `process_raci`/`role_modules` rows** (idempotency proven) and that each authored row appears in the
   per-function reveal after re-emitting.
5. **Roll out**, then confirm §10.

## 10. Definition of done (tied to the reveal)

- **Phase 1, the triple exists per market.** `business-functions.json` carries a `raci[]` on every released
  function whose rows each name `domain`, `responsibility`, `persona`, `persona_via`, `process`, and the
  RACI letter; the four owner functions are non-empty on the first run; a multi-domain function's rows
  separate by market. The two-hop join is no longer needed to answer **who** is R/A/C/I for a given market.
- **Set-consistency holds (closes finding 2).** Every persona in any `raci[]` row is either a member
  (`persona_via == "own"`, present in `personas[]`) or carries `persona_via` in `{descendant, seam}`. The
  emitter's cross-check asserts this and PASSES; no row references an unnamed or untagged actor.
- **The seam is owner-anchored (closes finding 3).** Cross-functional personas appear only under functions
  whose subtree owns the domain they operate in. Consumer and contributor functions that own no released
  domain read `raci: []`, so the empty cell is a true Phase-2 signal, not masked by a borrowed actor.
- **Realizations are visible per function.** Every row Phase 2 authors, including on descendant and
  owner-anchored seam personas, appears under the declaring function and its market after re-emit.
- **Phase 2 is proportionate, honest, and agrees with Phase 1.** Every released edge resolves to REALIZED,
  REFERENCE-READ, a single direct-authored unambiguous row, or one plain-language question, using the same
  owner-anchored realized test as the reveal; no edge is empty in the reveal yet realized in the resolver.
  No bucket or cross-check exists with zero rows to run against. The committed resolver exists at
  `scripts/analytics/b9e_resolver.ts` (not `.tmp_deploy/`).
- **Idempotency proven.** A second Phase-2 pass authors zero new `process_raci`/`role_modules` rows (the §6
  key, without `consultation_blocking`, holds).
- **Anti-fiasco holds.** `Finance --consumer--> ATS` resolves to one arbitration question, never a
  fabricated row, and reads empty in the reveal.
- **No report-only.** Every released edge lands in a grounded terminal; questions are authored to the owner
  function, never deferred as a to-do.

## 11. What rev.10 deferred, and when to add it back

Deliberately not built now, because there is no data for it: the 7-bucket MECE classifier, the X1/X2/X3
canonical-derivation cross-checks, the CONFIRMED/DIVERGENT split, and the override-with-date terminal.
These all operate on **already-realized** consumer rows, and consumer realization is 0/6 today, so they
would be dead code. Add them back the first time a consumer edge gains a **built realizer** (a function in
the consuming function's subtree owns a released domain and authors a real I-row): at that point there is a
realized row to cross-check, and the divergence machinery earns its place. Building it before then is
exactly the rev.8 mistake. The same discipline applies to the `persona_via` set: if a future released
domain has no owner function, do not loosen the seam back to declare-anchored to make its seam personas
appear; surface the missing owner as the data gap it is (§2.2).
