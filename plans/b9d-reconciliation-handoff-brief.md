# B9d cross-domain reconciliation: the split-brain fix

A stable, self-contained specification. It defines the split-brain problem, analyzes why it
persists across eight prior attempts, and gives the exact, verifiable fix: a committed executable
resolver, the file-mutation contracts it writes through, a one-time migration of the inverted
records prior outbound-only runs already left behind, and machine-checkable acceptance. It carries
no narrative beyond what is load-bearing: problem, cause, fix, acceptance.

This is the rewrite that closes the gaps found in the fourth review (2026-06-10). The model in
the prior version was correct; it failed because the *execution layer* was underspecified at the
exact seams that broke attempts 1 through 8. Every change here targets one of those seams.

---

## 0. Implementation status (read first, do not pretend this is done)

As of 2026-06-10 the fix is **not implemented**, and several artifacts are in a half-built state
that an implementer must reconcile rather than start clean:

- **No committed resolver exists.** `scripts/analytics/validate_cross_domain.ts` is read-only,
  one-directional, and *defers* (it routes each defect to "the owning domain's audit"). The only
  B9d runs that ever happened used ephemeral `.tmp_deploy/b9d_resolver_*.ts` scripts that were
  deleted, and they processed the **outbound** direction only.
- **The ATS run recorded the split brain in its own log.** `audits/ATS/history.md` (2026-06-09
  B9d entry) literally states "Inbound payloads not classified (report-only by the B9d asymmetry
  rule)." ATS's `state.yaml` therefore carries only its outbound-owed items
  (`B1B-B9D-OWED-BENADMIN`, `-ONBOARDING`, `-HRSD`) and none of the three inbound sender-owned
  orphans (COMP-MGMT, SWP, PSA).
- **Inverted records already exist and will be silently preserved by a naive idempotency check.**
  `audits/PSA/state.yaml` item `B1B-B9D-ORPHANS` bundles **nine** owner domains' processes as work
  "owed BY the target domain" (process `905`/5.4.1.6 listed as owed by ATS; `980`/7.1.2.1 owed by
  SWP; and seven more). This is the same split brain from PSA's side, in the inverted direction,
  and it is live. `audits/ATS/state.yaml` `B1B-B9D-OWED-HRSD` is the same shape (`background_checks`
  recorded as owed to HRSD when it is an ATS sender mis-tag).
- **SKILL.md is half-aligned.** The B9d band and pairwise Phase 2 were rewritten to bidirectional
  write-now, but the contradicting `report-only` framing still survives (the B10 band title, the
  audit classify-step), and a third committed rule (`q-` files contain "no `b1b`") directly
  contradicts the old "write a `b1b` into the q-file" instruction.
- **`B1A-B9D-VERIFY` is sitting as unexecuted prose.** `audits/SWP/state.yaml` carries it with an
  action that is the verbatim bidirectional procedure, unexecuted since 2026-06-07, because there
  is no committed script to execute it. That is the §2b failure, live and reproducible.

Attempt nine is not "write the resolver." It is "write the committed resolver, migrate the
inverted records the prior eight attempts left behind, remove the surviving contradictions, and
wire the resolver so it always runs." All four, or it is attempt eight again.

---

## 1. The problem (the split brain)

### Model this operates on

- A **handoff** is a cross-domain edge (`handoffs`, `source_domain_id` != `target_domain_id`). Its
  **payload** is the carried `data_object`, and the payload is tagged with an APQC process via
  `handoff_processes.process_id`.
- A process is **realized** when its `id` appears as `data_object_lifecycle_states.process_id` on a
  **gated** state (`requires_permission = true`) AND it carries `process_raci` with at least one
  `responsible` and at least one `accountable`. A realized process has a persona; an unrealized one
  emits empty `personas[]`. Empty `personas[]` is the symptom this whole band exists to remove.
- Every cross-domain payload is **owned** by exactly one endpoint: the domain that masters the
  carried entity and in whose APQC subtree the process falls. The owner can be the **sender** or the
  **receiver** of the handoff.

### The defect

The reconciliation processes only the **outbound** half of a boundary and marks inbound payloads
"report-only." So when domain A is audited, A defers its inbound payloads to B; when B is audited, B
defers its inbound payloads to A. A payload owned by the **receiver** is deferred by the sender and
never picked up by the receiver. Symmetrically for sender-owned payloads reached only as someone
else's inbound edge. The steady-state result, repeated across the catalog:

- the process stays unrealized (no gate, no RACI, empty `personas[]`), and
- no question is written into any owner's `state.yaml` or `q-` file.

The work is invisible to both domain owners. Each side believes the other will handle it. That is
the split brain.

### Worked instance (verification target, live state confirmed 2026-06-10)

On the ATS boundary, six distinct cross-domain processes carry unrealized work. The **dir** column
is the critical detail the prior version omitted: four of the six are **inbound** to ATS, which is
exactly why ATS's outbound-only run never surfaced them. They appear in the live `handoffs` table
but in **no** ATS audit file. The first three columns of every row were re-verified live.

| process | code | owner | carried entity | handoff id | dir (vs ATS) | owner side | owner built? | surfaced by ATS run? |
|---|---|---|---|---|---|---|---|---|
| administer benefit enrollment | `7.5.2.2` (1052) | BEN-ADMIN | `benefit_enrollments` | 120/395/1075 | outbound | receiver | no (0 reach) | yes (as owed-out) |
| manage employee onboarding | `7.3.1` (224) | ONBOARDING | `onboarding_journeys` | 2 | outbound | receiver | no (0 reach) | yes (as owed-out) |
| develop salary/compensation structure | `7.5.1.1` (1042) | COMP-MGMT | `salary_bands` | 425 | inbound | sender | no (0 reach) | **no** |
| perform competitive analysis | `7.5.1.3` (1044) | COMP-MGMT | `compensation_benchmarks` | 1139 | inbound | sender | no (0 reach) | **no** |
| perform strategic workforce planning | `7.1.2.1` (980) | SWP | `position_demand_forecasts` | 455 | inbound | sender | no (0 reach) | **no** |
| identify, select, and assign resources | `5.4.1.6` (905) | PSA | `project_resource_allocations` | 1023 | inbound | sender | **yes** | **no** |

All six target processes are confirmed unrealized live (zero gated `process_id`, zero
`process_raci`). PSA is the only built owner; its reachable persona pool is exactly Resource
Manager (`role_id` 28) and Delivery Manager (`role_id` 27).

Three failures follow directly from the defect and must all be gone after the fix:

1. The four inbound sender-owned processes (COMP-MGMT x2, SWP, PSA) are invisible from ATS: an
   auditor reading ATS's files sees only the two receiver-owned rows plus the mis-tag. The plan
   must not present these four as "visible in ATS"; they are catalog-derived, and their absence
   from ATS is the bug being demonstrated.
2. The receiver-owned `7.5.2.2` and `7.3.1` are deferred to "the owner's own audit" and exist in
   **no** owner file. That is the split brain in two rows.
3. `background_checks` (an ATS-mastered recruiting entity) carried under `7.4` "manage employee
   relations" is a sender **mis-tag**, but ATS recorded it as work "owed to HRSD." Owner-routing
   trusted the tag instead of the carried entity, and the wrong record is still in
   `audits/ATS/state.yaml`.

---

## 2. Why it persists

### 2a. Policy contradictions (why agents take no consistent action)

1. **Contradiction on the write target.** The procedure must say exactly one thing about where the
   obligation is written. SKILL.md still says two opposite things: the B9d band says "write the
   obligation into the owner's files in this pass, never defer," while the B10 band (still titled
   "Inbound handoffs - REPORT ONLY") and the audit classify-step (still saying "the symmetric side
   is owned by another domain ... Do not author fixes for these") say the opposite. An agent that
   reads one and is measured against the other stalls or half-acts. Across eight attempts the blunt
   "do not author" rule won.

2. **A second, narrower contradiction on the q-file.** SKILL.md's q-file content rule says the
   `q-` file contains "only items that need the user: every `b2` decision and every pending
   destructive approval ... Nothing else (no `b1a`, no `b1b`)." The prior B9d procedure said to
   write a **`b1b`** item AND surface it in the q-file. A `b1b`-backed q is illegal under the
   content rule, so an agent either skips the q (and the owner never sees it) or writes it (and
   violates the rule). This is resolved in §3.4 by modeling the owner obligation as a **`b2`
   decision**, which is q-file-legal by construction.

3. **"Latent" used as a license to skip the write.** When an owner has no persona layer yet, its
   responsible/accountable persona cannot be *named*. That fact was widened into "so write nothing
   now." The latency of the persona *name* was conflated with latency of the *obligation*. The
   obligation (this process is unrealized and owned here) is fully known the moment it is found and
   must be recorded immediately; only the concrete R/A is deferred. "Latent" must never mean
   "skipped."

### 2b. Mechanism cause (why the prose never executes)

There is no committed, executable resolver. The procedure lives as prose, and prose that says
"classify each payload" gets classified and dropped: agents emit a verdict table and stop. The
only committed resolver is read-only, processes one direction, and routes every defect back to the
owning domain (it defers by design). Every actual B9d run used an ephemeral `.tmp_deploy/` script
that no future audit can re-run. Without one committed script that walks both directions, dedupes
by process, guards the roll-up, decides the owner from the carried entity, migrates the legacy
inverted records, and writes the files through a precise contract, there is no forcing function and
the prose is optional.

### 2c. The execution defects that survived four reviews (new, and load-bearing)

These are the concrete reasons attempts will keep failing even with a correct model, and each has a
matching fix in §3:

1. **The committed artifact was never the deliverable.** Sequencing said "build and prove the
   resolver"; implementers read that as a future step and reached for `.tmp_deploy`. Fix: §4 makes
   the committed, run resolver THE deliverable the review checks, at a named path.
2. **Idempotency keyed on a field that exists in no file.** "Key by process_code" has no home:
   `state.yaml` ids are free-text, q's are numbered, and the legacy PSA item bundles nine processes
   in one row. A naive "process already mentioned, no-op" preserves the inverted record. Fix: §3.5
   defines the deterministic id and the `(owner_domain, process_id)` item-grain key, and §3.5c
   defines the legacy migration that splits bundled rows.
3. **The file-mutation mechanism was never specified.** The q-files have a strict grammar
   (numbered blocks split by `---`, a hard `## Optional (will not hold up the build)` divider, and
   an agent-map footer mapping every `qN` to an item code plus `domain_id`). "Write a q and preserve
   the others" with no algorithm corrupts the footer or mis-places the q. Fix: §3.5a and §3.5b are
   exact edit contracts.
4. **Script-versus-prose seam was unowned.** "A deterministic script writes a plain-prose,
   sibling-grounded q" is impossible if read as free authoring. Fix: §3.7 makes the B9d q a
   *deterministic template filled from plain-language DB fields* (`data_objects` labels,
   `processes.process_name`, `domain_roles.role_name`), so the script produces a valid, lingo-free,
   option-bearing q by construction, with no separate LLM authoring step to skip.
5. **Two owner q's were answer-negated.** COMP-MGMT's open `q5` already recommends classifying
   `salary_bands` and `compensation_benchmarks` as stateless config; a realization q demands a
   gated state on those exact entities and is therefore self-contradictory. Fix: §3.2 adds a
   REFERENCE-READ outcome that detects config-shape carried entities before emitting a realization q.
6. **The forcing function was committed but never wired to run.** Even a perfect resolver does
   nothing if no audit invokes it. Fix: §3.6 adds B9d to the in-scope band list with a
   transcript-incomplete gate mirroring B10b, and repoints the band's catalog-wide twin away from
   the deferring validator.

---

## 3. The fix

### 3.1 One model: write-to-owner-now, both directions, unconditional

Adopt a single rule and state it identically in the band, the pairwise pass, and the resolver:

> Reconciliation run on any domain D processes **every** boundary D touches (every `handoffs` row
> where D is source or target), in **both** directions. For each **distinct unrealized process** on
> those boundaries it determines the owner from the carried entity, and writes a durable obligation
> into the **owner's** audit files **in this pass**, whichever side the owner is. Nothing is deferred,
> nothing is "report-only" for ownership, nothing is left to be re-derived later.

"Report-only" survives for exactly one thing and no other: a *structural* row edit that belongs to
the side that authored it (re-pointing or deleting a `handoff_processes` tag is the source's edit).
Ownership, realization, persona, and the question always follow the owner, on either side.

### 3.2 Classification, first match wins

Read hierarchy from the dotted `process_code` (so `7.2.3` is the parent of `7.2.3.2`); category is
the first segment. Realized = a process whose `process_id` is the gated
`data_object_lifecycle_states.process_id` AND that carries `process_raci` with at least one R and at
least one A.

1. **RESOLVED.** The exact tagged code is realized. No action.
2. **ROLL-UP, entity-family guarded.** The tagged code is not realized, but a strict ancestor or
   descendant **is** realized **and that realized relative's gated entity is in the same entity
   family as the payload** (same entity, or an entity mastered by the same domain). Only then is the
   work the same work at a different grain. Fix: re-point `handoff_processes.process_id` to the
   realized code (`record_status='new'`). The entity-family condition is mandatory: it is what
   rejects `7.3` (payload `onboarding_journeys`) rolling up to `7.3.3.2` (gated entity = career
   plans, mastered by LMS). Where it fails, the payload is ORPHAN, MIS-TAG, or REFERENCE-READ,
   never ROLL-UP.
3. **MIS-TAG.** The code is unrealized and its category contradicts the carried entity's owner (a
   recruiting entity `background_checks` under HR-relations `7.4`), or its category is in neither
   endpoint's realized families. The **sender** owns it (it authored the tag): surface on the
   sender's q to re-point or delete the `handoff_processes` row (delete needs sign-off). Checked
   **before** ORPHAN: order is load-bearing, because ORPHAN would otherwise swallow every mis-tag.
4. **REFERENCE-READ (new).** The code is unrealized AND its carried entity is config/reference
   data, not workflow: `data_objects.entity_type IN ('catalog','reference')`, OR the owner domain
   carries an open or answered `b2` that classifies the carried entity as stateless config (detect
   by scanning the owner's `state.yaml`/`q-` file for a config-shape decision on that
   `data_object_id`). A reference read is **not** realizable as a gated process: you cannot put a
   gate on a stateless entity. Do **not** emit a realization q. Instead emit a one-line conditional
   note in the owner's `state.yaml` ("payload <entity> is a reference read of <owner>'s config; it
   becomes a realizable process only if <owner> later authors a workflow on it"), and record it as
   resolved-by-classification in the resolver log. This is what stops the two COMP-MGMT processes
   (`salary_bands` 1042, `compensation_benchmarks` 1044) from generating questions COMP-MGMT's own
   `q5` has already answered "no workflow."
5. **ORPHAN.** The code is unrealized, its carried entity is workflow-bearing, and its category
   fits an endpoint: real missing work, a process with no persona. Resolve by owner per 3.3 and 3.4.

### 3.3 Owner determination by the carried entity, not the tag (unbuilt-safe)

The owner is the domain that **masters the carried entity** (its `master` or `embedded_master`
`domain_module_data_objects` row). This is the **primary and authoritative** signal.

- The realized-sibling cross-check (does the carried entity's master domain also realize the
  nearest sibling/parent under the process subtree?) is **corroborating only, and is skipped when
  the owner is unbuilt**. An unbuilt owner realizes nothing yet, so it has no realized sibling; the
  absence of one must NOT downgrade a correctly-tagged ORPHAN to a MIS-TAG. MIS-TAG requires a
  positive category contradiction (the carried entity's master domain is in a different APQC family
  than the tag), never mere absence of a realized sibling.
- If the carried entity's master domain and the process category positively disagree, the tag is
  wrong: classify MIS-TAG (3.2.3), do not route by the code.

Never route on the code's category alone. The carried entity is the authoritative owner signal,
including when a pre-existing audit record points the other way (the live `B1B-B9D-ORPHANS` /
`B1B-B9D-OWED-*` items are in the inverted creditor direction and must be distrusted in favor of
carried-entity mastery, per the migration in §3.5c).

### 3.4 Latency rule and the owner obligation as a `b2` (replaces "latent = skip" and "write a `b1b` q")

**Built is defined by REACH, not by role existence.** An owner is **built** iff at least one
`domain_roles` row reaches one of the owner's `domain_modules` via `role_modules`. A domain that has
`domain_roles` rows with zero `role_modules` reach is **unbuilt**. SWP is the canonical example: it
has four `domain_roles` (Workforce Planner, Workforce Planning Lead, FP&A Workforce Partner,
Workforce Leadership Sponsor) but **zero** reach, so it is unbuilt. The resolver MUST compute this
live; never infer built-ness from `COUNT(domain_roles) > 0`.

For every ORPHAN, the durable obligation is a **`b2` decision** written into the owner's
`state.yaml`, surfaced as a question in the owner's `q-` file. Modeling it as a `b2` (not a `b1b`)
makes it q-file-legal under SKILL.md's content rule and forces it to carry options plus a
Recommended line, exactly what the wording rules require. Item id is deterministic:
`B2-B9D-OWN-<process_id>` (see §3.5).

- **Owner is built** (has reach): the q names a concrete candidate R and A drawn from the owner's
  reachable persona pool, by mirroring the owner's nearest already-realized sibling process. PSA
  mirrors its realized resourcing siblings: R = Resource Manager, A = Delivery Manager. The resolver
  MUST assert the chosen R `role_id` actually appears in `role_modules` for the module where the
  process would be gated; if not, downgrade to the unbuilt wording.
- **Owner is unbuilt** (zero reach): the q is **still written**, as a `b2` with options. It states
  the work and the two domains in plain terms, names the candidate persona *shape* (the job that
  should own it), and is **reach-aware**: if `domain_roles` exist but do not reach the relevant
  modules, say "this domain has roles but none yet reach the <area> modules, so no one can be named
  as owner until that reach is authored," and link the owner's persona-build item (`B1A-PHASE-P`).
  Never say "has not defined its roles yet" when `domain_roles` rows exist. The `b2` carries a
  `blocked_by: {type: user_decision, ...}` plus a `blocked_by: {type: domain_audit, blocking_domain:
  <owner>, milestone: B1A-PHASE-P}` so it stays open until reach lands; postpone keeps it open per
  the state.yaml hygiene carve-out (a).

A process that later gains a gate plus RACI classifies RESOLVED on the next run; the resolver then
removes the `B2-B9D-OWN-<id>` item and its q (§3.5b/§3.5a removal path) and notes it in `history.md`.
The obligation is never lost between now and then, because it is on the owner's files from the
moment it is found.

### 3.5 The executable resolver (the forcing function)

A committed script at **`scripts/analytics/b9d_resolver.ts`** (TypeScript, run with `bun`, from the
project root so `semantius` reads `.env` from cwd; never Python, never `.tmp_deploy/`). It SUPERSEDES
the B9d role of `validate_cross_domain.ts`; update every SKILL.md pointer (§3.6) to the new path.
Single source of the behavior; the band and pairwise prose point at it.

**Invocation:** `bun run scripts/analytics/b9d_resolver.ts <DOMAIN_CODE>` reconciles one domain's
full boundary set in both directions. `--migrate-legacy` (see §3.5c) additionally sweeps every
already-audited domain for inverted legacy items. `--dry-run` prints the plan of file edits without
writing.

**Inputs (read-only):** `handoffs`, `handoff_processes`, `data_object_lifecycle_states`,
`process_raci`, `processes` (for `process_code` hierarchy + plain `process_name`),
`domain_module_data_objects` (carried-entity mastery), `data_objects` (`entity_type` +
`singular_label`/`data_object_name` for plain wording), `domain_roles` and `role_modules` (persona
reach and the candidate R/A, including the plain `role_name`).

**Algorithm:**
1. For the target domain D, collect every boundary handoff (D as source or target) and its payload
   tags, both directions.
2. Compute the realized set (gated `process_id` with R and A) and each realizer's domain.
3. **Dedupe by `process_id`**, not by edge: one finding per distinct unrealized process, with the
   contributing handoffs as supporting evidence.
4. Classify each distinct process per 3.2, in order, with the entity-family roll-up guard and the
   REFERENCE-READ check before ORPHAN.
5. For each ORPHAN, determine the owner per 3.3 (carried-entity mastery primary) and the persona per
   3.4 (built vs unbuilt by reach).
6. **Reconcile against pre-existing B9d records first (idempotency + migration), then write.** Per
   §3.5c, before writing a new item the resolver checks the owner's `state.yaml` for the canonical
   `B2-B9D-OWN-<process_id>` item and for any legacy B9d item naming this `process_id` in either
   direction; it migrates legacy rows rather than duplicating, and no-ops only when the canonical
   item is already present on the correct owner.
7. **Write through the contracts in §3.5a (q-file) and §3.5b (state.yaml).** Owner-side writes land
   on the OWNER whichever side it is. Source-side ROLL-UP and MIS-TAG proposals are written into the
   **sender's** q as pending destructive approvals (Rule #21).

**What the resolver writes vs what a loader writes.** The resolver writes **audit files only**. It
never writes catalog rows and never touches `record_status` (Rule #1). The catalog writes
(authoring the realization gate + RACI on the owner once a `b2` is answered, applying an approved
re-point, deleting a mis-tag) happen through a separate loader after the user answers, always at
`record_status='new'`; a `handoff_processes` deletion is destructive and needs sign-off. An existing
audit item whose **classification is wrong** (an inverted "owed to X" / "owed by X" record that the
carried entity proves backwards) is overwritten only with user sign-off, because it is a destructive
edit of a non-empty item (§3.5c).

#### 3.5a q-file edit contract (exact)

The resolver edits `audits/<OWNER>/q-<OWNER>.md` by **parse, mutate, render** (full round-trip),
never by regex splice:

1. **Parse** the file into: `(header, [blocking q-blocks], optional_marker?, [optional q-blocks],
   footer_comment)`. A q-block is the text from `q<N>:` up to the next `---`. The optional marker is
   the line `## Optional (will not hold up the build)`. The footer is the final
   `<!-- agent map, ignore: ... | domain_id=NN -->` comment.
2. A B9d realization q is **blocking** (it gates the owner's persona/RACI build). Insert its block
   as the **last blocking block**, immediately before the optional marker if present, otherwise
   immediately before the footer.
3. Assign `qN = (max existing q-number) + 1`. **Never renumber** existing blocks and **never touch**
   any existing `a<N>:` answer.
4. Append exactly one token ` qN=B2-B9D-OWN-<process_id>` to the footer comment, inserted just
   before ` | domain_id=`. Leave all existing tokens and the `domain_id` intact.
5. If `status` was not `feedback_needed`, set it (and `next_action_by: user`); a `q-` file must
   exist whenever the owner is `feedback_needed`.
6. **Idempotency:** if the footer already contains a `=B2-B9D-OWN-<process_id>` token, the q exists;
   no-op (do not duplicate, do not overwrite the existing answer). **Removal** (process now
   RESOLVED): delete that q-block, remove its footer token, renumber nothing (gaps are allowed), and
   if no blocking q's remain and nothing else is open, delete the `q-` file.
7. The rendered q-block MUST satisfy the §3.7 checklist by construction (options including a
   leave-as-is, a Recommended line, no banned words in the human text, plain DB-sourced names).

#### 3.5b state.yaml edit contract (exact)

The resolver edits `audits/<OWNER>/state.yaml`:

1. The durable item is a `b2` with `id: B2-B9D-OWN-<process_id>`, a plain-language `summary`, the
   `options` list, a `why`, the contributing `handoff` ids as evidence, the carried
   `data_object_id`, the chosen-or-pending R/A, and (for unbuilt owners) the `blocked_by`
   `B1A-PHASE-P` link.
2. **Idempotency:** key on `id` (= the deterministic `(owner, process_id)` string). If present,
   no-op. If the process is now realized, delete the item and write a one-line dated note in
   `history.md` (state.yaml hygiene: open items only).
3. Edits are YAML round-trip safe: load, mutate the `b2` list, dump; never string-splice. Preserve
   comments and unrelated items. A postponed/answered item is never silently deleted (carve-out (a)).

#### 3.5c Legacy reconciliation sweep (one-time, mandatory before first real run)

Run `--migrate-legacy` once. The prior outbound-only runs seeded inverted B9d records that the
idempotency check would otherwise preserve. For every already-audited domain's `state.yaml`:

1. **Find** every legacy B9d item: ids matching `B1B-B9D-*` / `B2-B9D-*` and any item whose
   `finding` enumerates handoff/process pairs in the "owed by <target>" or "owed to <domain>"
   shape (e.g. PSA `B1B-B9D-ORPHANS` bundling nine domains; ATS `B1B-B9D-OWED-HRSD`).
2. **Split** bundled items to one finding per `process_id`.
3. **Re-derive** each split's true owner from carried-entity mastery (§3.3), ignoring the legacy
   record's stated direction.
4. **Migrate:** if this domain is the true owner, replace the legacy item with the canonical
   `B2-B9D-OWN-<process_id>` (or RESOLVED-remove if now realized). If this domain is NOT the owner
   (the legacy item was a creditor/debtor note pointing elsewhere), remove the note here and ensure
   the canonical item lands on the true owner's files. **Every replacement or removal of a non-empty
   item is destructive: surface the full migration diff for one user sign-off before writing**
   (Rule #21). Print the diff under `--dry-run` first.
5. The `7.4`/`background_checks` ATS item (`B1B-B9D-OWED-HRSD`) is the named special case: the
   carried entity is ATS-mastered and `7.4` contradicts it, so it migrates to an **ATS sender
   MIS-TAG** q (re-point or delete the `handoff_processes` row on sign-off), not work owed to HRSD.

### 3.6 SKILL.md alignment (exact edits, by section and phrase, because line numbers drift)

The band already states the 3.1 model; the residual contradictions and the missing forcing
function are what remain. Make these edits and then grep to prove they took:

1. **B10 band retitle.** Change the heading "Inbound `handoffs` - REPORT ONLY (the fix lives on the
   source domain)" to "Inbound `handoffs` - ROW AUTHORSHIP ONLY (payload realization is B9d, never
   report-only)." In its body, scope every "report-only" / "owed by other domains" / "not a failure
   of this domain's audit" sentence strictly to **handoff-ROW authorship**, and add one line: "Payload
   realization on inbound edges is B9d's job and is never report-only; see the B9d band."
2. **Audit classify-step carve-out.** In the "classify each result" step, the "Report-only
   follow-up" bullet ("the symmetric side is owned by another domain (B8 inbound direction, all of
   B10)") gets an explicit exception: "EXCEPT B9d payload realization, which is ALWAYS authored into
   the owner's files in this pass regardless of which side owns it (run the B9d resolver)."
3. **q-file content rule reconcile.** Where SKILL.md says the q-file holds "every `b2` decision and
   every pending destructive approval ... Nothing else (no `b1a`, no `b1b`)," confirm the B9d owner
   obligation is a **`b2`** (per 3.4) so it is already legal; remove any surviving instruction that
   says to write a `b1b` into the q-file.
4. **Repoint the catalog-wide twin.** Where the B9d band says it is "the per-domain instance of the
   catalog-wide resolver" and points at "validate cross-domain (mode b2)," repoint to
   `scripts/analytics/b9d_resolver.ts`. Update the b2 / `validate_cross_domain.ts` section to state
   it is the structural substrate check and that **ownership routing now lives in the B9d resolver**,
   not in the deferring validator.
5. **Wire the forcing function.** Add `B9d` explicitly to the in-scope band list in the audit recipe
   (it is currently missing by name), and add a transcript gate mirroring B10b's: "If the B9d
   resolver's both-directions classification output is not in the audit transcript, the audit is
   INCOMPLETE." Add the same to pairwise Phase 2.
6. **Reproduce the 3.7 wording rules inline** in both the band and the pairwise step, so authored
   q's are bound by them rather than by a pointer to this plan.
7. **Grep proof.** After editing, `grep -ni 'report.only\|owed by\|re-derive\|derive.later'`
   SKILL.md and confirm every surviving hit is scoped to handoff-ROW authorship or to a structural
   tag edit, never to ownership/realization.

### 3.7 q-wording rules (deterministic template; bind every written q)

Each q is read by a non-technical domain owner. The B9d realization q is generated by **filling a
fixed template from plain-language database fields**, so the committed script produces a valid,
lingo-free, option-bearing q by construction. There is no separate free-authoring step that could be
skipped.

**Slot sources (all plain English from the DB):** `<entity>` = `data_objects.singular_label` (fall
back to a de-underscored `data_object_name`); `<work>` = a plain gloss of `processes.process_name`;
`<owner>` / `<sender>` / `<receiver>` = domain display names; `<roleR>` / `<roleA>` =
`domain_roles.role_name`; `<sibling>` = the plain `process_name` of the owner's nearest realized
sibling.

**Rules:**
1. Lead with the business problem in plain English: what work, handed between which two domains, and
   why "nobody owns it" matters (the work has no responsible person).
2. Offer options as plain-language role assignments, **always including a leave-as-is option**. Both
   the built and the unbuilt q carry options and a Recommended line. No exceptions.
3. Give a Recommended answer with reasoning grounded in "this mirrors how <owner> already runs
   `<sibling>`" (built) or "this keeps the work from being lost and costs nothing until roles exist"
   (unbuilt), and in "this clears the work off the no-owner list."
4. When the owner has no reach yet, say so in **reach terms** ("<owner> has roles but none yet reach
   the <area> modules"), never "<owner> has no roles," and name the work to be owned once reach
   exists. Do not omit the q.
5. **BANNED WORDS in the human text:** dotted APQC codes, `process_key`, role codes, `ORPHAN`,
   `ROLL-UP`, `MIS-TAG`, `realize`, `RACI`, `persona pool`, `b1b`, `b2`, `B9d`, `PHASE-P`,
   `gated state`. All codes and ids live **only** in the agent-map footer.

**Concrete owner (built) -- with footer, the full pattern:**

> q7: ATS hands staffing requests to Professional Services Automation, but PSA has no defined owner
> for the step that identifies, selects, and assigns people to a project, so that work currently has
> nobody responsible for it. Who should own it?
> - a) The Resource Manager runs it and the Delivery Manager approves, the same pairing PSA already
>   uses for managing delivery resources and building resource plans.
> - b) The Delivery Manager both runs and approves it.
> - c) Leave it unassigned for now.
>
> Recommended: a. PSA already assigns the Resource Manager / Delivery Manager pair to its existing
> resourcing steps, so (a) fills the one gap consistently and gives the work a named owner.
>
> a7:
>
> `<!-- agent map, ignore: ... q7=B2-B9D-OWN-905 | domain_id=68 -->`

**Unbuilt owner (persona pending) -- now option-bearing, reach-aware:**

> q3: ATS forwards new hires to Benefits Administration to enroll them in benefits, but Benefits
> Administration does not yet have anyone assigned to run benefit enrollment, so this step has no
> owner. How should it be handled?
> - a) Note it now as work Benefits Administration owns, and assign a named enrollment owner once
>   this domain's roles are set up to reach the enrollment area.
> - b) Leave it off the list for now.
>
> Recommended: a. It keeps the work from being lost and costs nothing until the roles exist; once
> Benefits Administration sets up who runs enrollment, this step gets a named owner.
>
> a3:

For an unbuilt owner that already has roles without reach (SWP), option (a)'s wording becomes:
"Note it now as work Strategic Workforce Planning owns; Strategic Workforce Planning has roles but
none yet reach its planning modules, so assign a named owner once that reach is set up." This stays
consistent with SWP's own open role-reach question and never claims SWP "has no roles."

---

## 4. Sequencing

1. **Build and commit the resolver as the deliverable.** Write `scripts/analytics/b9d_resolver.ts`
   per §3.5 with the §3.5a/§3.5b file contracts. Commit it (not `.tmp_deploy/`). A `--dry-run` on
   ATS must print the intended edits to the five owner files.
2. **Run the legacy migration once** (§3.5c, `--migrate-legacy`, dry-run then apply with one user
   sign-off). This splits PSA's nine-domain `B1B-B9D-ORPHANS`, re-homes each process to its true
   owner, and converts the `7.4`/`background_checks` ATS item to an ATS sender MIS-TAG q. After
   this, no inverted B9d record remains anywhere.
3. **Run the resolver on ATS** and verify it writes a `B2-B9D-OWN-<id>` q into each of the five owner
   files: PSA concrete (Resource Manager / Delivery Manager), BEN-ADMIN and ONBOARDING unbuilt, SWP
   unbuilt and reach-aware, COMP-MGMT's two payloads classified **REFERENCE-READ** (no realization q,
   a conditional note instead) unless the user reopens `salary_bands`/`compensation_benchmarks` as
   workflow. Confirm `7.3` did not roll up to `7.3.3.2`.
4. **Align SKILL.md** (§3.6) to the proven behavior, including the in-scope-list entry and the
   transcript gate, then run the grep proof.
5. **Roll out**, gated on the resolver and the SKILL.md wiring. The catalog-wide `B1A-B9D-VERIFY`
   item (e.g. on SWP) is cleared only by a full both-directions resolver run recorded in the
   transcript, never by an outbound-only pass or by unexecuted prose.

---

## 5. Acceptance criteria (machine-checkable; for the next review)

The plan is implemented when all of the following hold. Each is written so a reviewer can check it
against the repo and the live tenant without re-deriving.

1. **Committed resolver exists** at `scripts/analytics/b9d_resolver.ts` (NOT `.tmp_deploy/`). It is
   bidirectional, dedupes by `process_id`, applies the entity-family roll-up guard, has the
   REFERENCE-READ check before ORPHAN, determines the owner from the carried entity, computes built
   vs unbuilt by `role_modules` reach, and writes owner-side `b2` items + q's through the §3.5a/§3.5b
   contracts. It writes no catalog rows and never changes `record_status`. `grep -R 'b9d_resolver'
   scripts/` returns the file; `grep -R 'b9d' .tmp_deploy/` is not relied on by any committed doc.
2. **No surviving ownership contradiction in SKILL.md.** The B10 band is retitled to row-authorship
   only; the classify-step carries the B9d carve-out; the band points at
   `scripts/analytics/b9d_resolver.ts`, not the deferring validator; B9d is in the in-scope band
   list with a transcript-incomplete gate. The §3.6 grep returns only handoff-ROW-authorship or
   structural-tag-edit hits for "report-only"/"owed by"/"derive-later."
3. **All inverted legacy records are gone.** `grep -R 'owed by\|owed to' audits/*/state.yaml`
   returns no B9d creditor/debtor item; PSA's `B1B-B9D-ORPHANS` bundle is split and re-homed;
   `audits/ATS/state.yaml` no longer frames `background_checks`/`7.4` as owed to HRSD.
4. **The five owner files carry the right items.** Running the resolver on ATS produces, on the
   owner side: a concrete `B2-B9D-OWN-905` q in PSA (R = Resource Manager, A = Delivery Manager); an
   unbuilt, reach-aware `B2-B9D-OWN-1052` in BEN-ADMIN and `B2-B9D-OWN-224` in ONBOARDING; an unbuilt
   reach-aware `B2-B9D-OWN-980` in SWP that does not claim SWP "has no roles"; and for COMP-MGMT,
   either two REFERENCE-READ notes (no q) or, if the user reopened the entities as workflow, two
   `B2-B9D-OWN` q's. Count is **per distinct process** (six), not per file (five): COMP-MGMT gets two
   distinct entries.
5. **Correct classifications on the named traps.** `7.3` payloads do not roll up to `7.3.3.2`; the
   `7.4`/`background_checks` payload is an ATS sender MIS-TAG, not work owed to HRSD; `5.4.1.6` is
   owned by PSA (carried-entity mastery), not by ATS as the legacy PSA record claimed.
6. **Every written q passes the §3.7 checklist by construction.** Each B9d q has options including a
   leave-as-is, a Recommended line, plain DB-sourced names, and zero banned words in the human text;
   all codes/ids appear only in the agent-map footer; the footer token `qN=B2-B9D-OWN-<id>` is
   present and the file round-trips (existing q's and answers untouched). No q is a `b1b` in the
   q-file.
7. **Idempotency proven.** Running the resolver twice on the same domain produces zero new items and
   zero file diffs on the second run (the footer-token / item-id no-op holds). A process that gains a
   gate + RACI is removed from the owner's files on the next run.
8. **The forcing function is wired, not just committed.** A future per-domain audit on SWP (or any
   owner) that follows the SKILL.md recipe invokes the resolver over its full boundary set in both
   directions, so the ATS-owed `7.1.2.1` obligation is realized on SWP's own audit **without** an ATS
   re-audit. The transcript gate makes an audit without resolver output INCOMPLETE.
9. **Honest pilot metric.** The success measure for the ATS pilot is acceptance 3 + 4 + 7 (zero
   inverted records, the right per-process items written, idempotent), NOT a drop in empty
   `personas[]`. Empty `personas[]` can only fall for PSA in this pilot, because the other four
   owners are unbuilt (and two of those are REFERENCE-READ); `personas[]` falls for them only after
   each owner's `B1A-PHASE-P` lands and its `b2` is answered. State this so the metric is not claimed
   prematurely.
