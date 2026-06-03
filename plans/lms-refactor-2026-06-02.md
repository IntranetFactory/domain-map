# LMS modularization refactor plan (2026-06-02)

Source: the 2026-06-02 LMS Validate audit (semantic market-surface pass). The structural bands are
strong (100% Semantius score, rich relationships/aliases/lifecycle, 8 system skills 1:1 with
modules). The findings below are the three MODULARIZATION / SCOPE-CREEP items the market audit
surfaced. They are **plans, not executed work**: each needs a user decision before any write.

Resolve IDs once: domain `LMS` = 57. Modules: COURSE-DELIVERY 32, COMPLIANCE-TRAINING 33, PATHS 34,
ILT-DELIVERY 178, CREDENTIALS 179, CT-GDPR 180, AUTOMATION 181, TRAINING-RECORDS-STARTER 182.
`users` built-in = data_object 748. PRIV-MGMT = domain 20. ATS = domain 56.

Recommended execution order once approved: **B (trivial) then C (after the install-gating decision)
then A (cross-domain, separate initiative)**. Classify `entity_type` (B13) on the surviving masters
*before* C so the survivors carry a typed classification; the masters C deletes do not need it.

---

## Refactor B (do first, trivial) — collapse the CEU pair

**Finding.** `continuing_education_credits` (935) and `ceu_records` (936) both live in
LMS-CREDENTIALS (179) and both model earned continuing-education units against a learner. The market
audit calls them a redundant pair; no flagship vendor splits "credits" from "records".

**Current state.**
- 935 `continuing_education_credits`: master + required, **no lifecycle states**, one tool
  (`query_continuing_education_credits` 1355), no aliases. Referenced by `courses` (167)
  `yields_credits_via` (M:M) and by 935 `earned_in` 936 (1:M).
- 936 `ceu_records`: master + required, lifecycle `recorded -> validated -> filed -> voided`, four
  tools (1356-1359), alias "CE credit ledger entry". Referenced by `users` `earns_credit`.

**Verify before executing.** The 935 -> 936 `earned_in` edge hints at a possible definition/ledger
split rather than a pure duplicate. Confirm 935 is not a distinct credit-bank/total entity. If it is
a genuine rollup, classify it `entity_type=computed` and keep both instead. The market audit's
confidence here is "HIGH" but the relationship is the one signal against it.

**Target.** Single master. Survivor = `ceu_records` (936) (it carries the lifecycle and the
record/validate/file workflow tools). Drop 935.

**Impact.**
- Masters: -1 (935).
- Relationships: rewire `courses` (167) `yields_credits_via` from 935 to 936; drop the 935 -> 936 edge.
- Skills/tools: drop tool 1355 from `lms_credentials_agent` (239). Net F-band unaffected (936 tools remain).
- Aliases: none on 935 to migrate.
- Lifecycle: none on 935.
- Starter 182: does not embed 935 or 936; unaffected.
- Deployer: no demotion implications.

**Blast radius: LOW.** Single-master delete + one relationship rewire + one tool drop. Re-emit the
LMS-CREDENTIALS blueprint.

---

## Refactor C (do second, after the install-gating decision) — collapse per-regulation evidence shells

**Finding.** Six per-regulation masters in LMS-COMPLIANCE-TRAINING (33) duplicate one shape. Flagship
LMS / NAVEX / KnowBe4 model compliance evidence as ONE table keyed by regulation type, not six
tables.

**Current state.** Six shells, each with `recorded/drafted -> validated -> archived` lifecycle, a
query + record tool pair, aliases, and a `compliance_assignments (173) produces X` relationship plus
a `users evidenced_by_record_for X` edge:

| id | master | necessity |
| --- | --- | --- |
| 944 | hipaa_training_records | optional |
| 945 | osha_training_records | optional |
| 946 | sox_training_evidence | optional |
| 947 | ferpa_training_records | optional |
| 948 | fda_part11_audit_trails | **required** |
| 949 | bsa_aml_training_records | **required** |

The generic evidence master `training_evidence_records` (940) already exists (lifecycle
`drafted -> finalized -> submitted -> archived`; tools 1370-1372; edges `compliance_audit_records
consolidates 940`, `940 supplies regulator_filing_exports`).

**Target.** Drop the six shells. Add a `regulation_type` dimension on `training_evidence_records`
(940) (a field/enum, owned by the deployer at the field-metadata layer, not by domain-map). All
`compliance_assignments produces X` edges collapse to `compliance_assignments produces
training_evidence_records`. Per-statute synonyms become `regulation_type` enum values (or aliases on
940).

**Keep separate (NOT part of C).** `harassment_training_acknowledgements` (941) is a signed
acknowledgement with its own ack workflow, not generic evidence. `fda_part11_audit_trails` (948) is
borderline: "Part 11 audit trail" is an integrity-log shape, arguably distinct from a training
evidence record. Decide per-entity whether 948 folds into 940 or stays as an audit-log master
(`entity_type=operational_record`).

**Impact.**
- Masters: -6 (or -5 if 948 stays).
- Lifecycle: ~18 state rows removed (6 x 3).
- Skills/tools: ~12 tools dropped from `lms_compliance_training_agent` (153); the starter agent
  `training_records_starter_agent` (242) loses its per-reg query tools (it currently links
  `query_hipaa/osha/sox/ferpa/fda/bsa`). Generic 940 tools cover the survivor.
- Relationships: six `173 produces X` edges collapse to one `173 produces 940`; six
  `users evidenced_by_record_for X` edges collapse to one on 940.
- Aliases: migrate the regulation synonyms (e.g. "164.530(b) workforce training record",
  "OSHA 1910 training record", "AML training record") onto 940 or fold into `regulation_type`.
- Starter 182: currently embeds 944/945/946/947/948/949 as `embedded_master`. These collapse to
  embedding 940 (which it already embeds). Net: the starter's embed set shrinks.
- Deployer demotion: unchanged shape (940 already has a canonical master in module 33).

**Interaction with B14 (necessity).** This refactor SUPERSEDES the standalone B14 fix. The audit
flagged `fda_part11_audit_trails` (948) and `bsa_aml_training_records` (949) as `master + required`
that should be `optional` (sector-bound: life-sciences / banking). If C is adopted those masters are
deleted, so do NOT flip their necessity first. If C is declined, flip 948 + 949 to `necessity=optional`
as the cheap correctness fix.

**The trade-off to decide (this is the gating decision for C).** Six per-regulation masters give you
three things one typed table loses:
1. **Install-axis gating.** Today HIPAA/OSHA/SOX/FERPA evidence is `optional` at install (Rule #16):
   a tenant outside that jurisdiction does not install the table. Collapsed into 940, the regulation
   becomes a row attribute, always structurally present; "which regulations are active" moves to
   tenant config / a `regulation_type` value set, not an install decision.
2. **Per-statute lifecycle divergence.** Today each shell could carry a different state machine.
   Collapsed, they share 940's lifecycle. (In practice all six are identical today, so little is lost.)
3. **Per-statute permissions.** Workflow gates are currently per-shell; collapsed, they are one set
   on 940.

The counter-argument (and the market position): flagship vendors model this as one evidence table
because the regulation is data, not schema; the per-shell split is over-modularization that inflates
the master count, the tool count, and the starter embed set without buying real workflow divergence.

**Recommendation.** Collapse, with `regulation_type` as a row attribute plus a tenant "active
regulations" config to recover the install-gating behavior. Keep 941 (acknowledgement) and decide 948
(audit-log) separately. **Blast radius: HIGH** (6 masters, ~12 tools, ~18 lifecycle rows, starter
embeds, B14). Re-emit COMPLIANCE-TRAINING + TRAINING-RECORDS-STARTER blueprints.

---

## Refactor A (do last, cross-domain, separate initiative) — dissolve LMS-CT-GDPR

**Finding.** The market audit flags the entire LMS-CT-GDPR module (180) as SCOPE-CREEP: subject
access, erasure, and consent are mastered by a privacy/DSAR domain (OneTrust-class), not by any LMS
vendor. An LMS exposes training evidence TO a privacy tool; it does not master the DSAR workflow.

**Current state.**
- Module 180 masters `gdpr_consent_records` (950, opt), `subject_access_requests` (951, req),
  `data_deletion_requests` (952, req); embeds `employees` (31); consumes `users` (748).
- System skill `lms_privacy_agent` (240): 11 tools (consent grant/withdraw, SAR receive/fulfill/close,
  deletion receive/fulfill/decline, notify_person).
- Lifecycle on all three; capability `LMS-PRIVACY-COMPLIANCE` (640) realized by 180, owned by GRC.
- Handoffs: intra-LMS 1298/1299 (`gdpr_consent_record.withdrawn` -> COMPLIANCE-TRAINING / COURSE-DELIVERY
  to purge), 1300 (`data_deletion_request.fulfilled` -> COURSE-DELIVERY), plus 1313/1314 (-> HCM).
- Relationships: `subject_access_requests discloses gdpr_consent_records`,
  `data_deletion_requests voids gdpr_consent_records`.

**Catalog complication (why this is cross-domain, not LMS-local).** DSAR/consent is currently
**fragmented across three domains** and PRIV-MGMT does not yet master it:
- ATS (domain 56, module ATS-CANDIDATE-CRM) masters `data_subject_requests` (901) + `candidate_consents` (870).
- LMS masters `subject_access_requests` (951) + `data_deletion_requests` (952) + `gdpr_consent_records` (950).
- PRIV-MGMT (domain 20) **exists but masters no DSAR/consent entity at the module grain.**
- `records_retention_policies` (433) already exists elsewhere (the prior audit's MISSING
  `data_retention_policies` was partly a duplicate).

So the real refactor is "consolidate DSAR + consent under PRIV-MGMT as the canonical owner; ATS and
LMS both demote to consumer/embedded_master." `subject_access_requests` (951) and
`data_deletion_requests` (952) collapse into the canonical `data_subject_requests` (901) via a
`request_type` enum. That single-master move requires re-mastering 901 from ATS to PRIV-MGMT.

**Target.** PRIV-MGMT becomes the canonical DSAR/consent master. LMS dissolves module 180 and becomes
a consumer/derived: it receives erasure/SAR fulfilment events from PRIV-MGMT (cross-domain
PRIV-MGMT -> LMS handoff to purge or export training records) and exposes training evidence. LMS may
keep thin `embedded_master` shells if it must stay standalone-deployable, demoting to consumer when
PRIV-MGMT installs.

**Impact.**
- Masters: LMS loses 3 (950/951/952). 951+952 consolidate into 901 (`request_type` enum). 901
  re-masters from ATS to PRIV-MGMT; ATS demotes to consumer/embedded_master. `gdpr_consent_records`
  (950) re-masters to PRIV-MGMT (or consolidates with `candidate_consents` 870 into a generic consent
  master).
- Lifecycle: 951/952 lifecycle merges into 901's; 950's moves to PRIV-MGMT.
- Skills/tools: `lms_privacy_agent` (240) is deleted; its 11 tools move to PRIV-MGMT's system skill
  or are dropped. LMS drops from 8 to 7 system skills (F2 still satisfied). PRIV-MGMT gains a system
  skill (it may be unbuilt today; check).
- Handoffs: intra-LMS 1298/1299/1300 become cross-domain PRIV-MGMT -> LMS (purge training records on
  erasure). 1313/1314 (-> HCM) re-source from PRIV-MGMT.
- Capability 640 re-homes to PRIV-MGMT or is dropped (GRC owns it functionally).
- Starter 182: does not embed privacy masters; unaffected.
- Deployer demotion: LMS embedded shells (if kept) demote to consumer when PRIV-MGMT installs.

**Prerequisite.** PRIV-MGMT must be built out as the canonical DSAR/consent master first (it is
currently overlay/unbuilt for this). This is a PRIV-MGMT domain build plus an ATS reconciliation, so
it is larger than an LMS audit fix.

**Recommendation.** Treat as a **cross-domain consolidation initiative**, not an LMS-local fix.
Sequence: (1) build/confirm PRIV-MGMT as canonical DSAR + consent; (2) reconcile ATS 901/870 to defer
to PRIV-MGMT; (3) dissolve LMS module 180, convert LMS to consumer + cross-domain handoffs. Until
then, LMS-CT-GDPR is acceptable interim scope-creep; do not delete it in isolation (that would strand
the training-data erasure workflow with no owner). **Blast radius: HIGH + cross-domain (LMS + ATS +
PRIV-MGMT).**

---

## WRONG-OWNERSHIP (minor, fold into B/C work, not a standalone refactor)

`course_resources` (930, in ILT-DELIVERY 178) overlaps `learning_content_assets` (909, in
COURSE-DELIVERY 32). The reusable-resource master belongs in COURSE-DELIVERY; ILT keeps only
session-bound logistics resources. MEDIUM confidence. Move 930 to module 32 (or merge into 909) when
COURSE-DELIVERY is next touched. Not worth a standalone pass.

## Vindications (keep, do not refactor)

- `audiences` (958) is a genuine LMS assignment-profile master (Cornerstone/Docebo/SFL Assignment
  Profiles), distinct from marketing `audience_segments`. Keep.
- `notification_templates` / `manager_nudges` / `escalation_rules` are legitimate LMS-automation
  masters. A cross-cutting notification domain owns transport; the learning-specific nudge/escalation
  policy is LMS-owned. Keep.
- `certification_definitions` vs `learner_certifications` and `credential_badges` vs `learner_badges`
  are correct definition/instance pairs. Keep both.
