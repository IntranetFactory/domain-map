---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 30
---

# INV-CRM, Audit History

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
