# INV-CRM audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 5 masters + 1 embedded_master across 3 full modules (`INV-CRM-DEAL-PIPELINE`, `INV-CRM-RELATIONSHIP-GRAPH`, `INV-CRM-LP-CRM`); 7 capabilities; 6 solutions (4 primary, 2 secondary); 0 regulations linked; 1 trigger event; 2 outbound + 2 inbound handoffs; 0 roles, 0 role_modules, 0 role_permissions, 0 permissions; 0 system skills, 0 skill_tools.
- Vendor-surface basis: Affinity, DealCloud (Intapp), 4Degrees, Attio for VC, Allvue Platform, Juniper Square (the last two more LP-CRM / fund-admin-adjacent). Pure-play relationship-intelligence and deal-pipeline specialists for the VC / PE / family-office buyer.
- **Bucket 1 (in-scope, agent fixable):** 17 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 7 items.

Structural pass: A, M (mostly), B (partial), C pass. **E and F bands fail completely** (zero roles, zero permissions, zero system skills across all 3 modules). B9 catastrophic gap (only 1 trigger event across 5 masters). B12 partial (only `vc_deals` has lifecycle states). B9b unaddressed (zero intra-domain handoff rows across a 3-module domain). H1 essentially uncovered (only 1 of 4 cross-domain handoffs has any APQC tag, and it is `discovery_substring` at `record_status='new'`).

Domain Semantius score: **uncomputable** (no system skills, F2 fail). The score line cannot resolve until F2-F3 are filled.

### Vendor surface basis

- **Affinity** (affinity.co), the canonical relationship-intelligence specialist; auto-network inference from email and calendar metadata is the category-defining capability. Masters: contacts, organizations, opportunities, lists, notes, emails, meetings, custom fields, relationship_strength_scores, introduction_paths.
- **DealCloud** (Intapp), the enterprise PE / IB platform; deepest deal-pipeline + LP-CRM coverage. Masters: deals, contacts, firms, funds, investments, mandates, documents, activities, IC memos, tasks, pipeline configurations.
- **4Degrees**, an Affinity-style relationship-intelligence challenger; intro-routing emphasis. Masters: contacts, deals, organizations, intros, emails, notes.
- **Attio for VC**, modern data-model-shaped CRM with VC-template. Masters: companies, people, deals, lists, notes, threads.
- **Allvue Platform** and **Juniper Square**, weighted secondary because their center of mass is on fund-admin / LP reporting; included for LP-CRM scope coverage on the `INV-CRM-LP-CRM` module.

No compliance specialist exists for this market in the FCRA sense, but personal-contact-data exposure is significant (GDPR, CCPA, CAN-SPAM for outreach), and SEC Investment Advisers Act recordkeeping (Rule 204-2) applies for registered advisers using the CRM as a books-and-records system.

### Bucket 1, In-scope confirmed gaps

#### MISSING (compliance and regulatory entities)

| ID | Entity | Proposed module | Regulation / driver | Notes |
|---|---|---|---|---|
| B1-M1 | `data_subject_requests` | INV-CRM-RELATIONSHIP-GRAPH | GDPR Articles 15-22 | INV-CRM holds personal data (founders, executives, LPs). Erasure / access / rectification logs are missing. Both Affinity and Attio model this. |

#### MISSING (universal-or-near-universal vendor entities)

| ID | Entity | Proposed module | Vendor evidence | Notes |
|---|---|---|---|---|
| B1-M2 | `meeting_records` (or `interaction_logs`) | INV-CRM-RELATIONSHIP-GRAPH | All 4 specialists | Calendar-derived meeting log. `relationship_records` is the synthesized strength score, the underlying meeting / interaction is a separate primitive. |
| B1-M3 | `introduction_requests` | INV-CRM-RELATIONSHIP-GRAPH | Affinity Paths, 4Degrees Intros, DealCloud Intros | Capability `INVCRM-INTRODUCTION-ROUTING` exists at the catalog level but has zero entity backing it. |
| B1-M4 | `deal_team_assignments` | INV-CRM-DEAL-PIPELINE | DealCloud, Affinity Lists, Attio | Per-deal role-scoped staffing (deal lead, sponsor, associate, observer). Cannot be expressed via global RBAC; mirrors the ATS hiring-team pattern. |
| B1-M5 | `pipeline_stages` (config master) | INV-CRM-DEAL-PIPELINE | Affinity Lists, DealCloud Pipelines, 4Degrees | Per-firm or per-fund stage configurations. Currently the stage taxonomy lives only as the `vc_deals` lifecycle state machine, which is a hard-coded contract; vendors expose this as user-configurable. |
| B1-M6 | `co_investor_firms` | INV-CRM-DEAL-PIPELINE | DealCloud Firms, Affinity Organizations | Tracks competing and co-investing VC / PE firms encountered during diligence. Used for syndication and conflict checks. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 / Rule #20 | Both `catalog_tagline` and `catalog_description` are empty strings. Catalog UX fields unpopulated. | Draft buyer-shaped tagline + 1-3 paragraph description (workflow + value voice), surface to user for review per Rule #20 before writing (these are write-once fields). Moved to Bucket 2 (#1) for wording approval; this row is the structural pointer. |
| B1-S2 | B7 / Rule #10 | Two masters with user-typed actors lack `→ users` edges: `investor_contacts` (753, relationship_owner / source_introducer) and `lp_prospects` (754, lp_relations_lead). | Author 2 edges per Rule #10. |
| B1-S3 | B9 trigger events | Only 1 trigger event (`vc_deal.closed`) exists across 5 masters; 4 lifecycle states on `vc_deals` (`ic_review`, `term_sheet`, `closed`, `declined`) carry workflow-gate semantics but only `closed` is published. `investment_memos` has `has_submit_lock + has_single_approver` (a clear approval workflow) with zero events. `lp_prospects` has an evident commit / close workflow with zero events. | Author at minimum: `vc_deal.ic_review_requested` (370 equivalent), `vc_deal.term_sheet_issued`, `vc_deal.declined`, `investment_memo.submitted`, `investment_memo.approved`, `lp_prospect.committed`, `lp_prospect.declined`. Source: lifecycle states + `has_submit_lock` flag. |
| B1-S4 | B12 lifecycle states | `investment_memos` and `lp_prospects` have zero `data_object_lifecycle_states` rows despite clear workflows. `relationship_records` and `investor_contacts` are plausibly config-shape and may take the exemption. | Author state machines (draft / in_review / approved / published for memos; researching / contacted / in_meeting / soft_circled / committed / declined for lp_prospects). Surface the config-shape exemption decision for `relationship_records` and `investor_contacts` to user (Rule #15 forbids the note-based justification). |
| B1-S5 | M5 | `vc_deals` lifecycle states 445 / 446 / 447 (`ic_review`, `term_sheet`, `closed`) have `requires_permission=true` and `domain_module_id=null`. The states are deal-pipeline-specific and should anchor to module 9 (`INV-CRM-DEAL-PIPELINE`) so the permission-materialization prefix resolves correctly. | PATCH 3 rows to set `domain_module_id=9`. |
| B1-S6 | E1 / E2 / E4 | Zero roles, zero `role_modules`, zero `role_permissions` across all 3 modules. A 3-module domain with 7 capabilities needs the role layer. | Author at minimum 4 roles: `INV-DEAL-PARTNER` (deal-lead persona, multi-module), `INV-ASSOCIATE` (diligence-support persona, multi-module), `INV-IR-LEAD` (LP-CRM lead, multi-module), `INV-PLATFORM-ADMIN` (cross-module admin). Each gets `role_modules` rows on at least 2 modules per Rule #14's 2-module floor for multi-module domains. Bundle into focused loader. |
| B1-S7 | F2 / F3 / F4 / F5, Rule #17 | Zero `skill_type='system'` skills across all 3 modules. Without these, Semantius score is uncomputable, and the agent tooling layer has no entry point for any INV-CRM module. | Author 3 system skills (`inv_crm_deal_pipeline_agent`, `inv_crm_relationship_graph_agent`, `inv_crm_lp_crm_agent`) each with the per-Rule-#17 minimum (query + mutate + workflow-gate tools). Bundle into Phase-S loader. |
| B1-S8 | A2 / regulations | Zero `domain_regulations` rows despite GDPR / CCPA exposure on personal-contact data and SEC Investment Advisers Act recordkeeping (Rule 204-2) for registered-adviser users. | Add `domain_regulations` rows for GDPR, CCPA, SEC Investment Advisers Act, CAN-SPAM Act (the last only one currently in `regulations` catalog: id 59). The other three need to be inserted into `regulations` first. |
| B1-S9 | B11 | Three masters lack aliases despite cross-vendor synonym overlap: `relationship_records` (synonyms: "relationship strength", "network signals"), `investor_contacts` (synonyms: "people", "contacts", "founders"), `lp_prospects` (synonyms: "LPs", "limited partners", "fund investors"). | Author 6-8 alias rows; bundle into the cluster-drafts pattern. |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | B9b: domain has 3 modules but zero intra-domain `handoffs` rows. Expected pairs include `INV-CRM-RELATIONSHIP-GRAPH → INV-CRM-DEAL-PIPELINE` (warm intro feeds new sourced deal), `INV-CRM-DEAL-PIPELINE → INV-CRM-RELATIONSHIP-GRAPH` (deal closure decays / updates relationship strength), `INV-CRM-RELATIONSHIP-GRAPH → INV-CRM-LP-CRM` (relationship signal informs LP outreach), `INV-CRM-DEAL-PIPELINE → INV-CRM-LP-CRM` (closed deal enriches portfolio awareness on LP side). | Draft 4 intra-domain `handoffs` rows once B1-S3 trigger events are loaded, `integration_pattern='lifecycle_progression'`, `friction_level='low'`. Per Rule's intra-domain authoring rule, no notes annotation. |

#### APQC TAGGING (H1)

**B1-H1.** The domain publishes 2 cross-domain handoffs and receives 2. Existing tagging: only handoff 1040 has a single `discovery_substring` row at `record_status='new'` (process 63, "Manage international funds/consolidation", arguably a weak match for an `lp_prospect` ← `fund.final_close` signal). Target per H-band volume expectation: 2-3 NEW `agent_curated` proposals + the existing 1 from substring matcher. Proposed `agent_curated` rows on outbound handoffs (this domain's responsibility, single B1 item with sub-table per the count convention):

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | external_id | hier | confidence |
|---|---|---|---|---|---|---|---|---|
| 1038 | INV-CRM → FUND-ADMIN | `vc_deal.closed` | `capital_calls` | Manage debt and investment | 321 | 10761 | L3 | confident |
| 1039 | INV-CRM → PORT-MONIT | `vc_deal.closed` | `portfolio_companies` | Manage portfolio | 409 | 16401 | L3 | confident |

Inbound handoffs 1040 and 1041 are owed by the source domain's H1 (FUND-ADMIN) per the asymmetry rule, not this audit; see Report-only follow-ups. Existing `discovery_substring` row on handoff 1040 (process 63) is left as-is; review-time decides whether to approve or replace.

### Bucket 2, Surface-for-user (judgment calls)

1. **A4 catalog UX wording (Rule #20).** Draft tagline and description need user approval before write. Proposed tagline: *"Relationship-intelligence CRM and deal pipeline for venture, private equity, and family office investors."* Proposed description: 2 paragraphs covering (a) the relationship graph and warm-introduction routing, (b) deal pipeline and IC memo collaboration; explicitly leaves out vendor names per Rule #18. Approve verbatim, rewrite, or skip.

2. **B12 config-shape exemption.** Should `relationship_records` and `investor_contacts` take the lifecycle-states exemption (workflow-less config-shape masters)? `relationship_records` is plausibly an auto-derived strength score (no lifecycle); `investor_contacts` is a directory record. Options: (a) confirm both as config-shape, no states needed; (b) author minimal directory states (`active`, `archived`, `merged`) on `investor_contacts`. Independent of Bucket 3.

3. **Regulation list scope (driver for B1-S8).** Four regulations proposed (GDPR, CCPA, SEC Investment Advisers Act, CAN-SPAM). Confirm scope: (a) all four are in scope, (b) drop CAN-SPAM as out of scope (focus is on relationship management, not outbound marketing campaigns), (c) drop GDPR / CCPA if firm-level privacy compliance is considered out of scope of the CRM itself. Independent of Bucket 3.

4. **Role naming convention.** Proposed roles `INV-DEAL-PARTNER`, `INV-ASSOCIATE`, `INV-IR-LEAD`, `INV-PLATFORM-ADMIN`. Confirm or rename: (a) `INV-PARTNER` vs `INV-DEAL-PARTNER` (partner is the standard VC title), (b) consider adding `INV-PRINCIPAL` between Partner and Associate, (c) consider `INV-IR-PARTNER` (head of IR title varies). The role layer is currently empty so naming is wide-open.

5. **Modularization stability.** The 3-module split is coherent against the vendor surface, but two design questions remain: (a) should the `INVCRM-IDENTITY-RESOLUTION` capability (linked to `INV-CRM-RELATIONSHIP-GRAPH`) get its own module `INV-CRM-IDENTITY-RECON`, or remain folded? (b) should portfolio-awareness on the LP-CRM side split off as `INV-CRM-PORTFOLIO-AWARENESS` (since it embeds `portfolio_companies` from PORT-MONIT)? Defer unless Bucket 3 grows the LP-CRM scope materially.

6. **Pairwise reconciliation scope.** INV-CRM has 2 neighbors at edge weight ≥ 2: **FUND-ADMIN** (2 inbound + 1 outbound = 3) and **PORT-MONIT** (1 outbound). Pass 4 was run inline for FUND-ADMIN (weight 3) and surfaced as light summary for PORT-MONIT (weight 1). Decide whether to schedule full FUND-ADMIN audit and PORT-MONIT audit as separate Validate runs.

### Bucket 3, Phase 0 pending (speculative)

Candidates surfaced by the vendor surface but needing Phase 0 vetting before load:

| ID | Candidate | Proposed module | Vendor evidence basis |
|---|---|---|---|
| B3-1 | `email_threads` (master) | INV-CRM-RELATIONSHIP-GRAPH | Universal inbox-sync; Affinity / Attio / 4Degrees all expose thread-level records; the relationship score derives from these, so the primitive may be load-bearing for explainability. Could also be config-shape if "we only store derived signals" is the design. |
| B3-2 | `notes` (free-text per-entity master) | INV-CRM-DEAL-PIPELINE or RELATIONSHIP-GRAPH | Universal across all 4 vendors; recruiter-style free-text. Naming collision risk with the `notes` _column_; would need to be `crm_notes` or `relationship_notes`. |
| B3-3 | `signal_alerts` | INV-CRM-RELATIONSHIP-GRAPH | Affinity Signals, 4Degrees triggers; vendor-specific shape (Affinity calls these "alerts", others "signals"). |
| B3-4 | `mandates` | INV-CRM-LP-CRM or new MANDATES module | DealCloud-specific (LP allocation mandates, sector mandates). Less universal across other 3 specialists. |
| B3-5 | `documents` (deal-attached) | INV-CRM-DEAL-PIPELINE | Universal but heavily overlapped with DLP / DMS; whether INV-CRM masters or just consumes is a scoping call. |
| B3-6 | `activity_logs` (audit trail per record) | INV-CRM-DEAL-PIPELINE | Universal across all 4 vendors. May fold into platform-level activity logging. |
| B3-7 | `funds` (consumer / embedded_master) | INV-CRM-LP-CRM | FUND-ADMIN canonically masters `funds`; should INV-CRM-LP-CRM hold a `consumer` or `embedded_master` row so deal-team-side LP-CRM can scope by fund without requiring the full FUND-ADMIN install? |

### Cross-bucket dependencies

- **Bucket 1 STRUCTURAL items have an ordering dependency among themselves.** B1-S3 (trigger events) must land before B1-B1 (intra-domain handoffs, which need `trigger_event_id`), B1-S7 (system skills, since workflow-gate tools reference the events), and APQC tagging item B1-H1 (which depends on the events as the source of `handoff` resolution; the existing two outbound handoffs in scope of B1-H1 already exist, so this one is sequenceable now). Recommended load order: S1 / S2 / S5 / S8 / S9 first, then S3, then S4, then B1, then S6, then S7. B1-H1 can land in parallel with S1 / S2 / S5 / S8 / S9 since its handoff rows already exist.
- **Bucket 2 #2 (config-shape exemption) affects Bucket 1 B1-S4.** If the user accepts the config-shape exemption for `relationship_records` and `investor_contacts`, B1-S4 shrinks to author states only on `investment_memos` and `lp_prospects`.
- **Bucket 2 #3 (regulation scope) gates Bucket 1 B1-S8.** The list of regulations loaded depends entirely on the user's scoping call.
- **Bucket 2 #4 (role naming) gates Bucket 1 B1-S6.** No role loader runs until the user confirms naming.
- **Bucket 3 #7 (`funds`) might inform Bucket 2 #5 (modularization).** If the user wants `funds` modeled as `embedded_master` in INV-CRM-LP-CRM, the LP-CRM module's scope edges closer to a portfolio-awareness slice, weakening the case for splitting it.
- Bucket 3 #1 (`email_threads`) and Bucket 3 #2 (`notes`) are independent of all other items.

### Per-bucket prompts

- **After Bucket 1:** *"Fix these now? Reply 'all', 'just S1, S2, S5, S8, S9, H1' (the no-prerequisite subset), or 'skip'. Note that S3 (trigger events) must land before B1, S6, S7 can run, so a partial 'all' will sequence in two waves."*
- **After Bucket 2:** *"Per item: (1) approve wording or supply your own; (2) confirm or decline config-shape exemption for relationship_records / investor_contacts; (3) which of GDPR / CCPA / SEC IAA / CAN-SPAM are in scope; (4) role naming approval; (5) modularization stability call (defer recommended); (6) which neighbor audits to schedule."*
- **After Bucket 3:** *"Vet via Phase 0 research, or eyeball-mode? If eyeball, name which of B3-1 through B3-7 to treat as confirmed."*

### Report-only follow-ups (owed by other domains)

- **FUND-ADMIN B8 + H1 owed:** outbound handoff 1041 (`capital_call.issued → INV-CRM-LP-CRM`, payload `lp_commitments`) and 1040 (`fund.final_close → INV-CRM-LP-CRM`, payload `lp_prospects`) are FUND-ADMIN outbound from its perspective. FUND-ADMIN's B8 owes `data_object_relationships` rows on source side (`capital_calls → lp_commitments`, `funds → lp_prospects`). FUND-ADMIN's H1 owes APQC tags on both. Surfaces when FUND-ADMIN is next validated.
- **FUND-ADMIN B9b candidate (cross-module within FUND-ADMIN):** handoffs 1040 and 1041 originate in different FUND-ADMIN modules (12 and 14); this is also a hint about FUND-ADMIN's internal coverage. Not this domain's concern.
- **PORT-MONIT B8 owed:** outbound handoff 1039 (`vc_deal.closed → PORT-MONIT-PORTCO-DATA`, payload `portfolio_companies`) is INV-CRM outbound; B8 mirror on this side exists (rel id 873). The reverse direction (portfolio_company → INV-CRM signals via exits, write-downs, governance events) is not currently modeled; the `portfolio_company.exit` / `portfolio_company.written_down` / `portfolio_company.follow_on_required` signals are PORT-MONIT's outbound coverage. Surfaces when PORT-MONIT is next validated.
- **No CAP-TABLE-LEDGER edges currently exist.** Likely an unmodeled relationship: cap-table changes (new round, exit, secondary) are signals that should flow into INV-CRM relationship records, and INV-CRM deal-close should feed into cap-table issuance. Surfaces when CAP-TABLE-LEDGER is audited; report-only here.

### Pass 3, Neighbor discovery

Outbound handoff sources: INV-CRM-DEAL-PIPELINE → FUND-ADMIN-CAPITAL-CALLS (1 row, payload `capital_calls`), INV-CRM-DEAL-PIPELINE → PORT-MONIT-PORTCO-DATA (1 row, payload `portfolio_companies`).

Inbound handoff sources: FUND-ADMIN-FUND-LEDGER → INV-CRM-LP-CRM (1 row, payload `lp_prospects`), FUND-ADMIN-CAPITAL-CALLS → INV-CRM-LP-CRM (1 row, payload `lp_commitments`).

DMDO cross-references on this domain: `portfolio_companies` (763) embedded from PORT-MONIT (id 161, module 16). No other cross-domain DMDOs.

Edge-weight table:

| Neighbor domain | Outbound rows | Inbound rows | DMDO refs | Total weight |
|---|---|---|---|---|
| FUND-ADMIN | 1 | 2 | 0 | 3 |
| PORT-MONIT | 1 | 0 | 1 | 2 |
| CAP-TABLE-LEDGER | 0 | 0 | 0 | 0 (semantic adjacency only) |

### Pass 4, Pairwise reconciliation per neighbor

**INV-CRM ↔ FUND-ADMIN (weight 3):**

1. *Existing handoffs, fully wired:* 1038, 1040, 1041 (3 rows, all with both module FKs set).
2. *Existing handoffs with NULL module FK:* none.
3. *Missing handoffs the catalog implies should exist:* `vc_deal.term_sheet_issued → FUND-ADMIN` (terms-sheet signing implies fund-side allocation memo) is plausible but speculative; depends on whether FUND-ADMIN models pre-close allocation. Defer to FUND-ADMIN audit. `lp_prospect.committed → FUND-ADMIN-LP-COMMITMENTS` (when an LP commits, an `lp_commitments` row gets created in FUND-ADMIN) is a likely outbound gap on this domain's side once B1-S3 lands `lp_prospect.committed`; add to Bucket 1 B1-S3's event list (this is the cue for adding a 4th intra-pair handoff: `INV-CRM → FUND-ADMIN` on `lp_prospect.committed`, payload `lp_commitments`).
4. *Boundary integrity gaps:* none flagged.
5. *Cross-domain `data_object_relationships` mirror check:* `vc_deals → capital_calls` (rel 874) mirrors handoff 1038 OK. No mirrors yet for handoffs 1040, 1041 because those are inbound; their mirrors are FUND-ADMIN's B8 obligation (`capital_calls → lp_commitments`, `funds → lp_prospects`).

**INV-CRM ↔ PORT-MONIT (weight 2):**

One-line summary: outbound handoff 1039 wired, mirror rel 873 (`vc_deals becomes portfolio_companies`) in place. Inbound side is open (no `portfolio_company.exit` / `.written_down` / `.follow_on_required` signals modeled from PORT-MONIT). Report-only follow-up entered above; no in-scope fix from this audit.

### Candidates queued via `append_missing_domain.ts`

- **DEAL-FLOW-SIGNAL** (Deal Flow Signal Aggregation), vendor evidence Harmonic / Specter / Tracxn / BoxGroup Signal / Crunchbase Pro / PitchBook signals tier; adjacency INV-CRM, PROD-MGMT; capabilities company signal monitoring, growth-stage detection, founder change tracking, hiring-velocity alerts, fundraising news ingestion. Surfaced by INV-CRM audit 2026-05-30. Queue updated via the helper.

## 2026-05-31, Continuation: B1 technical fixes

Loader: [.tmp_deploy/fix_inv_crm_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_inv_crm_b1_technical_2026_05_31.ts). Run from project root, idempotent (every write preceded by a pre-flight read against the natural / composed key).

### Applied (4 of 17 Bucket 1 items)

| ID | Action | Rows |
|---|---|---|
| B1-S5 | PATCH `data_object_lifecycle_states.domain_module_id = 9` on rows 445 (ic_review), 446 (term_sheet), 447 (closed). Pre-flight verified `state_name` and `data_object_id=750`. | 3 PATCH |
| B1-S2 | INSERT `data_object_relationships` user-edges per Rule #10: investor_contacts (753) gets `owns relationship with` (relationship_owner) and `introduced` (source_introducer); lp_prospects (754) gets `leads relations with` (lp_relations_lead). Source `data_object_id=748` (users), `owner_side=target`, `relationship_type=one_to_many`, `relationship_kind=reference`, `is_required=false`. `notes` and `record_status` omitted (defaults). | 3 INSERT |
| B1-S8 (partial) | INSERT `domain_regulations` link for CAN-SPAM Act (regulation_id=59, already in catalog) to INV-CRM (domain_id=159); `applicability='conditional'`. GDPR / CCPA / SEC Investment Advisers Act deferred (not in `/regulations` and Bucket 2 #3 scope question is open). | 1 INSERT |
| B1-H1 | INSERT `handoff_processes` for the two outbound INV-CRM handoffs the audit pre-specified with resolvable PCF: (1038, 321) "Manage debt and investment" PCF 10761, (1039, 409) "Manage portfolio" PCF 16401. `role='implements'`, `proposal_source='agent_curated'`. Pre-flight verified both handoffs and both processes exist. | 2 INSERT |

### Deferred (13 of 17 Bucket 1 items)

- **B1-M1..M6** (6 items): new data_object inserts (`data_subject_requests`, `meeting_records`, `introduction_requests`, `deal_team_assignments`, `pipeline_stages`, `co_investor_firms`). Per the scoping rule for this continuation, new entities / DMDOs / modules are out of scope.
- **B1-S1**: catalog_tagline / catalog_description authoring requires user approval before write (Rule #20). Surfaced in Bucket 2 #1 with proposed wording, not yet approved.
- **B1-S3**: new trigger events. Audit lists 7 candidate events by name but does not provide an exact tuple with `event_category` (Rule #13 enum). Not a deterministic patch list.
- **B1-S4**: lifecycle states for `investment_memos` and `lp_prospects`, plus config-shape exemption decisions for `relationship_records` and `investor_contacts`. The exemption decision is explicitly "surface to user" per Bucket 2 #2; the state machines are new authoring not pre-specified as tuple lists.
- **B1-S6**: roles. Gated on Bucket 2 #4 naming approval; "Bundle into focused loader" is a full Phase-E surface.
- **B1-S7**: system skills + tools + skill_tools across all 3 modules. Full Phase-S load, not in this continuation's scope.
- **B1-S8 (remainder)**: GDPR / CCPA / SEC Investment Advisers Act `domain_regulations`. The regulation rows do not yet exist in `/regulations`, and Bucket 2 #3 scope confirmation is open.
- **B1-S9**: `data_object_aliases` for 3 masters. Audit lists vendor-language synonyms ("relationship strength", "LPs", "limited partners") but does not pre-specify exact `alias_name` tuples / kinds. Bulk alias inserts without exact tuples are out of scope.
- **B1-B1**: 4 intra-domain handoffs. Sequenced after B1-S3 trigger events per the audit's own cross-bucket dependency table; cannot land until those events exist.

### Errors

None. All writes verified live afterwards via the loader's own pre-flight reads; no JWT-audience or schema errors.

## 2026-05-31, Audit

### Summary

- Current footprint: 5 masters + 2 embedded_master rows (`investor_contacts` shell in module 11, `portfolio_companies` shell embedded from PORT-MONIT) across 3 full modules (`INV-CRM-DEAL-PIPELINE` id 9, `INV-CRM-RELATIONSHIP-GRAPH` id 10, `INV-CRM-LP-CRM` id 11); 7 capabilities (all mapped to at least one module); 6 solutions (4 primary: Affinity, DealCloud, 4Degrees, Attio for VC; 2 secondary: Allvue Platform, Juniper Square); 1 regulation linked (CAN-SPAM Act, conditional); 1 trigger event published (`vc_deal.closed`); 4 cross-domain handoffs (2 outbound to FUND-ADMIN-CAPITAL-CALLS and PORT-MONIT-PORTCO-DATA, 2 inbound from FUND-ADMIN); 0 intra-domain handoffs; 6 lifecycle states on `vc_deals` (3 anchored to module 9 with `requires_permission=true`); 0 lifecycle states on the other 4 masters; 3 aliases (2 on `vc_deals`, 1 on `investment_memos`); 13 data-object relationship rows including 3 user-typed edges from prior continuation (rel 1772, 1773, 1774); 2 `business_function_domains` (Investment Management owner, Executive consumer); 5 `handoff_processes` rows (all 4 handoffs now tagged: 1038 → processes 321 and 310, 1039 → 409, 1040 → 63 substring, 1041 → 1480; 4 of 5 `agent_curated`, 1 `discovery_substring`); zero roles, zero role_modules, zero role_permissions, zero permissions on modules 9/10/11; zero `skill_type='system'` skills; zero `skill_tools`.
- Vendor surface stable since 2026-05-30 (Affinity, DealCloud, 4Degrees, Attio for VC, plus secondary Allvue / Juniper Square for LP-CRM scope).
- **Bucket 1 (in-scope, agent fixable):** 13 items still pending (4 of the original 17 closed by the 2026-05-31 continuation: S2, S5, S8 partial CAN-SPAM, H1).
- **Bucket 2 (surface-for-user, judgment):** 6 items still pending (same shape as prior audit; none resolved).
- **Bucket 3 (Phase 0 pending, speculative):** 7 items still pending (same shape as prior audit; none vetted yet).

Structural pass verdict: A passes (A1 metadata complete, A2 ≥3 capabilities, A3 ≥3 solutions with primary, A4 fails — empty catalog_tagline / catalog_description, A5 not run). M mostly passes (M1 ≥1 module per host, M2 ≥2 modules for 7-capability domain, M4 every capability has a realizing module, M5 the 3 workflow-gate lifecycle states are anchored to module 9, M6 every module realizes ≥1 capability, M7 single-master integrity holds — no catalog-wide collisions, the `investor_contacts` master-in-10 + embedded_master-in-11 pattern is the autonomous-deployable-units pass case, M8 fails — every module's `catalog_tagline` and `catalog_description` empty). B partial (B5 ≥1 master, B7 user-edges now satisfied for masters 753 and 754 from the continuation plus rel 880 on master 752, B9 still catastrophic — only `vc_deal.closed` published despite 4 workflow-bearing lifecycle states on 750 and clear approval workflow on 751, B9b zero intra-domain handoffs across a 3-module domain, B10b lifecycle states absent on 4 of 5 masters, B11 aliases absent on 3 masters, B12 partial). C partial (C1 has 2 `business_function_domains` rows including owner). E and F bands continue to fail completely (E1 zero roles, E2 zero role_modules, E3 zero permissions on modules 9/10/11, E4 zero role_permissions, E5 cross-domain RACI uncomputable; F2 zero `skill_type='system'` skills across all 3 modules, F3 zero `skill_tools`, F4 vacuous, F5 Semantius score uncomputable).

H1 (APQC tagging) is now satisfied on all 4 handoffs (1038, 1039, 1040, 1041 all have `handoff_processes` rows). The B1-H1 audit obligation is closed. The two existing `agent_curated` rows from the 2026-05-31 continuation (1038 → 321, 1039 → 409) plus the previously-noted substring row on 1040 plus a new `agent_curated` row on 1041 (process 1480 "Process and oversee debt and investment transactions" L4) plus an extra `agent_curated` row on 1038 (process 310 "Perform capital planning and project approval" L3) bring tagging coverage to 100% of the domain's cross-domain handoff surface. `record_status` on all five rows is still `new` (no reviewer signoff yet).

Domain Semantius score: **uncomputable** (F2 still fails). The score line cannot resolve until F2 / F3 are filled.

### Vendor surface basis

Re-stated from 2026-05-30 unchanged: Affinity, DealCloud, 4Degrees, Attio for VC, with secondary weight for Allvue Platform and Juniper Square on the LP-CRM module. No compliance specialist exists in the FCRA sense; personal-contact exposure drives GDPR / CCPA / SEC Investment Advisers Act (Rule 204-2) / CAN-SPAM applicability. Bucket 2 #3 still gates which of those four become catalog regulations.

### Bucket 1, In-scope confirmed gaps (carried forward)

All carried items are unchanged in finding text from the 2026-05-30 audit unless noted. IDs preserved for traceability.

#### MISSING (compliance and regulatory entities)

| ID | Entity | Proposed module | Driver |
|---|---|---|---|
| B1-M1 | `data_subject_requests` | INV-CRM-RELATIONSHIP-GRAPH | GDPR Articles 15-22; INV-CRM holds personal data on founders, executives, LPs. Both Affinity and Attio model this. |

#### MISSING (universal-or-near-universal vendor entities)

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-M2 | `meeting_records` | INV-CRM-RELATIONSHIP-GRAPH | All 4 specialists. |
| B1-M3 | `introduction_requests` | INV-CRM-RELATIONSHIP-GRAPH | Affinity Paths, 4Degrees Intros, DealCloud Intros; capability INVCRM-INTRODUCTION-ROUTING has zero entity backing. |
| B1-M4 | `deal_team_assignments` | INV-CRM-DEAL-PIPELINE | DealCloud, Affinity Lists, Attio; mirrors ATS hiring-team pattern. |
| B1-M5 | `pipeline_stages` | INV-CRM-DEAL-PIPELINE | Affinity Lists, DealCloud Pipelines, 4Degrees; current stage taxonomy is hard-coded in `vc_deals` lifecycle, vendors expose this as user-configurable. |
| B1-M6 | `co_investor_firms` | INV-CRM-DEAL-PIPELINE | DealCloud Firms, Affinity Organizations; syndication and conflict checks. |

#### STRUCTURAL band failures (carried)

| ID | Band | Finding (unchanged) | Fix |
|---|---|---|---|
| B1-S1 | A4 / M8 / Rule #20 | Both `domains.catalog_tagline` and `domains.catalog_description` are empty strings; every `domain_modules` row in the domain (9, 10, 11) also has empty `catalog_tagline` and `catalog_description`. M8 expands the prior A4-only framing. | Draft buyer-shaped tagline + 1-3 paragraph description per row, surface to user for Rule #20 approval before writing. Total surface: 1 domain + 3 module rows = 4 tagline writes + 4 description writes. |
| B1-S3 | B9 trigger events | Only 1 event (`vc_deal.closed`) published across 5 masters. 3 workflow-gate `vc_deals` states (`ic_review`, `term_sheet`, `closed`) have `requires_permission=true` but only `closed` is published; `declined` and the non-permission-gate `sourced` / `in_diligence` transitions also lack events. `investment_memos` has `has_submit_lock + has_single_approver` (submit / approve workflow) with zero events. `lp_prospects` has an evident commit / close workflow with zero events. | Author at minimum: `vc_deal.ic_review_requested`, `vc_deal.term_sheet_issued`, `vc_deal.declined`, `investment_memo.submitted`, `investment_memo.approved`, `lp_prospect.committed`, `lp_prospect.declined`. Source: lifecycle states + `has_submit_lock` flag. `event_category` per Rule #13 enum (`lifecycle` / `state_change` / `threshold` / `signal`); the 7 candidates are all `state_change` shape. |
| B1-S4 | B12 lifecycle states | `investment_memos` (751) and `lp_prospects` (754) have zero `data_object_lifecycle_states` rows despite clear workflows (submit / approve on memos, commit / close on LP outreach). `relationship_records` (752) and `investor_contacts` (753) are plausibly config-shape and may take the exemption. | Author state machines: `draft` / `in_review` / `approved` / `published` for memos; `researching` / `contacted` / `in_meeting` / `soft_circled` / `committed` / `declined` for `lp_prospects`. Surface the config-shape exemption decision for `relationship_records` and `investor_contacts` to user (Rule #15 forbids the note-based justification). Sequenced after B1-S3. |
| B1-S6 | E1 / E2 / E4 | Zero roles, zero `role_modules`, zero `role_permissions` across all 3 modules. A 3-module, 7-capability domain needs the role layer. | Author at minimum 4 roles: `INV-DEAL-PARTNER`, `INV-ASSOCIATE`, `INV-IR-LEAD`, `INV-PLATFORM-ADMIN`. Each gets `role_modules` rows on ≥2 modules per Rule #14's 2-module floor. Gated on Bucket 2 #4 naming approval. |
| B1-S7 | F2 / F3 / F4 / F5, Rule #17 | Zero `skill_type='system'` skills across all 3 modules; Semantius score uncomputable; no agent entry-point. | Author 3 system skills (`inv_crm_deal_pipeline_agent`, `inv_crm_relationship_graph_agent`, `inv_crm_lp_crm_agent`) each with the per-Rule-#17 minimum (query / mutate / workflow-gate tools + `skill_tools` links). Phase-S loader. |
| B1-S8 (remainder) | A2 / regulations | The CAN-SPAM link landed in the 2026-05-31 continuation. GDPR, CCPA, SEC Investment Advisers Act still missing from `regulations` and not yet linked. | Insert into `regulations` first (GDPR, CCPA, SEC IAA), then add `domain_regulations` rows. Gated on Bucket 2 #3. |
| B1-S9 | B11 aliases | Three masters lack aliases: `relationship_records` (synonyms: "relationship strength", "network signals"), `investor_contacts` (synonyms: "people", "contacts", "founders"), `lp_prospects` (synonyms: "LPs", "limited partners", "fund investors"). | Author 6-8 alias rows; exact tuple authoring required (alias_name, alias_type=`synonym`, optional industry_id / solution_id). |

#### BOUNDARY (carried)

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | B9b: 3 modules, zero intra-domain handoffs. Expected pairs (4): RELATIONSHIP-GRAPH → DEAL-PIPELINE (warm intro → sourced deal), DEAL-PIPELINE → RELATIONSHIP-GRAPH (deal closure decays relationship strength), RELATIONSHIP-GRAPH → LP-CRM (relationship signal informs LP outreach), DEAL-PIPELINE → LP-CRM (closed deal enriches portfolio awareness on LP side). | Draft 4 intra-domain `handoffs` rows once B1-S3 trigger events are loaded. `integration_pattern='lifecycle_progression'`, `friction_level='low'`. Sequenced after B1-S3. |

### Bucket 2, Surface-for-user (carried; no resolutions since prior audit)

1. **A4 + M8 catalog UX wording (Rule #20).** Tagline and description need user approval before any write. Now expanded to cover the domain row plus 3 module rows (M8 was missed in the 2026-05-30 audit when only A4 was on the table). Proposed domain-grain tagline from prior audit retained for review. Per-module tagline drafts to be surfaced under Bucket 1 #1 once user signals approval to draft.
2. **B12 config-shape exemption.** Decide for `relationship_records` and `investor_contacts`. Independent of Bucket 3.
3. **Regulation list scope.** GDPR / CCPA / SEC IAA / CAN-SPAM scoping for B1-S8 (remainder). CAN-SPAM already linked. Independent of Bucket 3.
4. **Role naming convention.** Confirm or rename the 4-role proposal. Gates B1-S6.
5. **Modularization stability.** IDENTITY-RECON split and PORTFOLIO-AWARENESS split questions. Defer unless Bucket 3 #7 changes LP-CRM scope.
6. **Pairwise reconciliation scope.** Schedule FUND-ADMIN (weight 3) and PORT-MONIT (weight 2) audits as separate Validate runs.

### Bucket 3, Phase 0 pending (carried; no vetting since prior audit)

Same 7 candidates as 2026-05-30 (B3-1 `email_threads`, B3-2 `notes` rename, B3-3 `signal_alerts`, B3-4 `mandates`, B3-5 deal-attached `documents`, B3-6 `activity_logs`, B3-7 `funds` consumer / embedded_master). No new candidates this run.

### Resolved since prior audit

Carry these into `history.md` only; they are not in `state.yaml`.

- **B1-S2** (Rule #10 user edges on 753 and 754): closed by the 2026-05-31 continuation. Verified live: rel 1772 `users owns relationship with investor_contacts`, rel 1773 `users introduced investor_contacts`, rel 1774 `users leads relations with lp_prospects`. Rel 880 (`users owns relationship_records`) was already in place pre-continuation, so the master 752 user-edge requirement was already met. B7 / Rule #10 passes for all 3 masters with user-typed actors.
- **B1-S5** (M5 — anchor 3 workflow-gate lifecycle states to module 9): closed by the 2026-05-31 continuation. Verified: states 445 (`ic_review`), 446 (`term_sheet`), 447 (`closed`) now have `domain_module_id=9`. M5 passes.
- **B1-S8 (CAN-SPAM partial)**: 1 `domain_regulations` link inserted for CAN-SPAM (regulation_id 59, applicability `conditional`). Remainder (GDPR / CCPA / SEC IAA) still pending; tracked as B1-S8 carry-forward above.
- **B1-H1** (APQC tagging on outbound handoffs): closed and exceeded. Original goal was 2 `agent_curated` rows on outbound handoffs 1038, 1039. Live state shows 5 `handoff_processes` rows in total: handoff 1038 has two rows (process 321 "Manage debt and investment" L3 PCF 10761; process 310 "Perform capital planning and project approval" L3 PCF 10751), handoff 1039 has one row (process 409 "Manage portfolio" L3 PCF 16401), handoff 1040 retains the original `discovery_substring` row to process 63, handoff 1041 (originally noted as FUND-ADMIN's H1 obligation) now also has an `agent_curated` row to process 1480 "Process and oversee debt and investment transactions" L4. The catalog quality headline (`record_status='approved'` count) is still 0 across the 5 rows; the process health side-bar (`agent_curated` count) is now 4 of 5. Approval signoff is a Bucket 2 follow-up the next time the user reviews.

### Decisions

None this run. The user has not yet acted on the prior audit's per-bucket prompts. State carried into the new `state.yaml` reflects pending status across all 3 buckets.

### Fixes applied this run

None. This run is a re-audit pass, not a fix-load pass. The 2026-05-31 continuation (the prior dated section) is where the 4 closed items shipped.

### `domains.notes` pointer (if updated)

Not updated this run; no user-approved wording on file.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate run (SKILL.md Rule #21), not a from-scratch re-audit. Worked the open items in `state.yaml`, classified each into EXECUTE / SURFACE / LEAVE, and shipped every mechanical additive/corrective fix in one idempotent loader: [.tmp_deploy/2026-06-07_inv_crm_state_driven_execute.ts](../../.tmp_deploy/2026-06-07_inv_crm_state_driven_execute.ts). All writes land `record_status='new'`; re-run confirms full idempotency (0 rows on second pass). Domain id 159; modules 9 (DEAL-PIPELINE), 10 (RELATIONSHIP-GRAPH), 11 (LP-CRM), all full. Owning function: Investment Management (function 85, already the C1 owner; Executive is the consumer). No JWT / schema errors.

### Executed (counts)

| Item | Action | Rows |
|---|---|---|
| B1A-ENTITY-TYPE | PATCH `data_objects.entity_type` (was all 5 `unclassified`): 750 vc_deals -> operational_workflow, 751 investment_memos -> operational_workflow, 752 relationship_records -> computed, 753 investor_contacts -> operational_record, 754 lp_prospects -> operational_workflow | 5 PATCH |
| B1B-S1 / B2-CATALOG-UX-WORDING | Author empty `catalog_tagline` + `catalog_description` on domain 159 and modules 9 / 10 / 11 (buyer-voice, no vendor names, no em-dash, American English). Per the run instructions the stale surface-before-write gate was overridden; only empty fields written, never overwrites. | 4 rows (8 fields) PATCH |
| B1A-S9 | INSERT `data_object_aliases` (alias_type=synonym): 752 (relationship strength, network signals); 753 (people, contacts, founders); 754 (LPs, limited partners, fund investors). | 8 INSERT |
| B1A-S3 | INSERT 7 `trigger_events` (event_category=state_change): vc_deal.ic_review_requested / .term_sheet_issued / .declined (750, mod 9); investment_memo.submitted / .approved (751, mod 9); lp_prospect.committed / .declined (754, mod 11). vc_deals now has 4 events; the catalog total across the 5 masters is 8. | 7 INSERT |
| B1A-S4 (partial) | INSERT `data_object_lifecycle_states` on the two unambiguous workflow masters: investment_memos (751, mod 9) draft / in_review[gate submit_memo] / approved[gate approve_memo] / published[terminal]; lp_prospects (754, mod 11) researching / contacted / in_meeting / soft_circled / committed[gate record_commitment, terminal] / declined[gate record_decline, terminal]. M4 shape verified (one initial, terminal present, unique monotonic state_order). | 10 INSERT |

Total: 34 row-level writes across 6 tables, all idempotent.

### Surfaced (returned to user, not written)

- **B2-CONFIG-SHAPE** (reframed): entity_type classification already grants the Rule #12 structural exemption for relationship_records (computed) and investor_contacts (operational_record), so this is no longer a B12 failure. Remaining call is purely whether to add OPTIONAL directory states (active / archived / merged) on either. Tracked as B1A-S4-CONFIG-SHAPE in state.yaml.
- **B2-REGULATION-SCOPE** (B1B-S8): which of GDPR / CCPA / SEC Investment Advisers Act to add to /regulations and link (CAN-SPAM already linked). Base regulation rows must be authored before any domain_regulations link. No write without scoping.
- **B2-ROLE-NAMING**: confirm the 4-persona naming (Deal Partner / Investment Associate / IR Lead / Platform Admin) before any persona loader runs.
- **B2-MODULARIZATION-STABILITY**: IDENTITY-RECON and PORTFOLIO-AWARENESS split decisions (b2, judgment).
- **B2-PAIRWISE-AUDIT-SCHEDULE**: schedule FUND-ADMIN (weight 3) and PORT-MONIT (weight 2) Validate runs.
- **B1A-PHASE-P (personas / RACI): DEFERRED** per the run instructions, not authored. Candidate personas: Deal Partner (deal lead, modules 9+10), Investment Associate (diligence support, 9+10), IR Lead (LP fundraising, 11), Platform Admin (cross-module), function-anchored to Investment Management (85).

### Left (untouched)

- **B1A-M1..M6** (6 items): net-new master data_objects (data_subject_requests, meeting_records, introduction_requests, deal_team_assignments, pipeline_stages, co_investor_firms) with DMDO + lifecycle + relationships + trigger_events. Research-grade entity authoring, not a mechanical backfill; carried in b1a. entity_type targets noted on each for when they are authored.
- **B1A-S6** (role layer): gated on B2-ROLE-NAMING and largely subsumed by the B1A-PHASE-P persona model (post-Plan-3).
- **B1A-S7** (per-module system skills + skill_tools): RETIRED / superseded 2026-06-06 (per-domain-skill-restoration); reframed as a note. Do not author per-module skills; per-module tool re-authoring lives in audits/_modularization-backlog.md.
- **B1B-B1** (intra-domain handoffs): trigger-event dependency now satisfied (B1A-S3 landed), but the 5 handoffs are still source-count-only, not a fully-specified mechanical tuple list; carried in b1b.
- **B1B-S8** (GDPR / CCPA / SEC-IAA regulations): blocked on B2-REGULATION-SCOPE + base-row authoring.
- **b3 backlog** (7 candidates): unchanged.

### APQC / H1 status

No action: all 4 cross-domain handoffs (1038, 1039, 1040, 1041) already carry `handoff_processes` rows (4 agent_curated + 1 discovery_substring). The one weak tag (handoff 1040, process 63, discovery_substring) is INBOUND from FUND-ADMIN and is that domain's H1 obligation; replacing it would be destructive. Left as-is.

### Fixes-applied UI links

- https://tests.semantius.app/domain_map/data_objects?id=in.(750,751,752,753,754)
- https://tests.semantius.app/domain_map/domains?id=eq.159
- https://tests.semantius.app/domain_map/domain_modules?id=in.(9,10,11)
- https://tests.semantius.app/domain_map/data_object_aliases?data_object_id=in.(752,753,754)
- https://tests.semantius.app/domain_map/trigger_events?data_object_id=in.(750,751,754)
- https://tests.semantius.app/domain_map/data_object_lifecycle_states?data_object_id=in.(751,754)
