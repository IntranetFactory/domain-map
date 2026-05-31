---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 19
---

# MA, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 modules (primary host = empty, `domain_module_host_domains` for `domain_id=70` = empty). 0 lifecycle states. 0 system skills. 0 `skill_tools` rows. 5 masters in `domain_data_objects` (`marketing_campaigns` 116, `marketing_emails` 117, `lead_scores` 118, `nurture_journeys` 119, `marketing_forms` 120). 2 contributors (`customers` 97, `crm_contacts` 98, `customer_events` 111) and 2 consumers (`audience_segments` 113, `customer_attributes` 114). 8 capabilities (`MA-EMAIL-CAMPAIGN`, `MA-JOURNEY-ORCH`, `MA-LEAD-SCORING`, `MA-LANDING-FORMS`, `MA-MOBILE-PUSH`, `MA-AB-OPTIMIZATION`, `MA-ATTRIB-MEASURE`, `MA-GEN-AI-CONTENT`). 15 solutions (12 primary, 2 partial, 1 secondary unaccounted in this query). 25 trigger_events touching MA-relevant data_objects (7 of them tagged to MA-specific masters; the rest co-belong to CDP / CSM / CRM context). 8 outbound + 11 inbound = 19 cross-domain handoffs. 7 regulations: GDPR, CCPA/CPRA, EU AI Act, EU DSA, COPPA, TCPA, CAN-SPAM. 4 aliases (all on `customers` and `crm_contacts`, which MA does not master).
- **Vendor-surface basis (Pass 2 flagship enumeration):** HubSpot Marketing Hub, Marketo Engage (Adobe), Salesforce Marketing Cloud Account Engagement (Pardot), Oracle Eloqua, Mailchimp (Intuit), ActiveCampaign, Klaviyo, Iterable, Braze, Customer.io, Keap (Infusionsoft), Drip, Constant Contact, Brevo (Sendinblue), Omnisend, plus the Bloomreach Engagement, SAP Emarsys, Microsoft Dynamics 365 Customer Insights, and Salesforce Marketing Cloud Engagement rows that are already loaded as `coverage_level='primary'` solutions. Compliance-specialist anchor: CAN-SPAM (US email), TCPA (US SMS / robocall), GDPR + EU AI Act + EU DSA (EU cross-border), COPPA (under-13). The catalog covers all of these in `domain_regulations`.
- **Bucket 1 (in-scope, agent fixable):** 7 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO touching MA masters | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| CRM | 4 | 1 | 1 (CRM-LEAD-MGT consumer on `lead_scores`) | 0 (no direct MA-master rel, but CRM owns `customers`, `crm_contacts`, `crm_leads`) | 6 | Pairwise (full) |
| CDP | 3 | 1 | 0 | 1 (`customer_events published_to customer_attributes` row 479) | 5 | Pairwise (full) |
| B2C-COMM | 0 | 3 | 0 | 0 | 3 | Pairwise (full) |
| SMM | 0 | 2 | 0 | 1 (`content_entries feeds marketing_campaigns` 613, source domain is HCMS not SMM, see B1-S6) | 3 | Pairwise (full) |
| DXP | 0 | 2 | 0 | 0 | 2 | Lightweight |
| SALES-ENG | 1 | 0 | 0 | 0 | 1 | Lightweight |
| HCMS | 0 | 1 | 0 | 1 (613) | 2 | Lightweight |
| LOYALTY | 0 | 1 | 0 | 0 | 1 | Lightweight |

**Structural pass bands:** A1 passes (the 7 domain-metadata fields are populated). A2 passes (8 capabilities mapped). A3 passes (15 solutions). C1, C2, D1, E-band cannot be evaluated, no modules to anchor them to. **M1 hard-fails** (zero `domain_modules` rows). **M2 through M7 are unevaluable** until M1 is cured. **B1 partially passes** at the `domain_data_objects` (legacy rollup) layer but the underlying `domain_module_data_objects` layer carries zero rows for the domain. **B9 fails on 7 of 25 trigger_events** with empty `event_category` (Rule #13 enum violation): 471 `customer_attributes.refreshed`, 515 `marketing_email.delivered`, 516 `marketing_email.opened`, 517 `marketing_email.clicked`, 518 `marketing_email.unsubscribed`, 519 `lead_score.recomputed`, 520 `nurture_journey.completed`, 521 `marketing_form.submitted`. (Recount: 8 with empty `event_category`.) **B9b unevaluable** (no modules, no cross-module surface). **B10b** every cross-domain handoff has NULL on the MA side, this is MA's owed work, not other-domain owed. **F1, F2, F3, F4, F5 all fail** by absence (no modules, no system skills). **F7 unevaluable**. **H1 hard-fails** (2 of 19 cross-domain handoffs carry `handoff_processes` rows, both `discovery_substring`, zero `agent_curated`, zero `record_status='approved'`). **Rule #12 violation on every master**, zero lifecycle states across `marketing_campaigns`, `marketing_emails`, `lead_scores`, `nurture_journeys`, `marketing_forms`. **Rule #15 status clean**, every `notes` column on the 10 data_objects examined is empty string. **Rule #18 status clean** on `domains.description` and `business_logic`.

MA Semantius score: **uncomputable**, F2 fails (zero `domain_modules`, zero `skills.skill_type='system'` rows). Per F5 rollup the audit headline is "F2 / F3 unsatisfied, score = uncomputable" until the M-band is cured.

This is a **structurally pre-M domain**, an A-band domain (metadata + capabilities + solutions + `domain_data_objects` rollup) loaded without ever passing through Phase M (modules) or Phase E (roles / permissions). The deployable contract is missing.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail), no modules** | Zero `domain_modules` rows on `domain_id=70`. Zero rows in `domain_module_host_domains`. Yet `domain_data_objects` already declares 5 MA-mastered entities and the catalog already carries 7 MA capabilities and 15 solutions. The deployable layer is missing entirely. Per Rule #14 a domain with 8 capabilities (>=3 threshold) requires >=2 `module_kind='full'` `domain_modules` rows. Per Rule #17 each module requires exactly one `system` skill with >=1 `skill_tools` row. Per Rule #12 each `master + required` data_object requires lifecycle states. None of these layers exist. The natural module split given the loaded capabilities and the 5 mastered entities: `MA-CAMPAIGN-AUTHORING` (masters `marketing_campaigns` + `marketing_emails`, covers `MA-EMAIL-CAMPAIGN`, `MA-GEN-AI-CONTENT`, `MA-AB-OPTIMIZATION`), `MA-JOURNEY-ORCH` (masters `nurture_journeys`, covers `MA-JOURNEY-ORCH`, `MA-MOBILE-PUSH`), `MA-LEAD-SCORING` (masters `lead_scores`, covers `MA-LEAD-SCORING`), `MA-LANDING-PAGES` (masters `marketing_forms`, covers `MA-LANDING-FORMS`), `MA-ATTRIBUTION` (no master, derived-signals shape, covers `MA-ATTRIB-MEASURE`). This is a 5-module split; the user may prefer to fold attribution into journey orchestration or to fold lead scoring into journey orchestration. Surface the split as B2-S1 before any module insert. | Phase M load. Insert >=2 `domain_modules` rows (with the rest depending on the B2-S1 split decision), then for each module a system skill + skill_tools, then lifecycle states for each `master + required` data_object, then per-module DMDO rows. This is not a single-loader fix; it is a Phase A continuation that brings MA up to the deployable contract. Track as a separate work item once the architectural choice is settled. |
| B1-S2 | **B9 (8 trigger_events missing event_category)** | 8 trigger_events on MA-mastered data_objects carry empty `event_category` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 471 `customer_attributes.refreshed`, 515 `marketing_email.delivered`, 516 `marketing_email.opened`, 517 `marketing_email.clicked`, 518 `marketing_email.unsubscribed`, 519 `lead_score.recomputed`, 520 `nurture_journey.completed`, 521 `marketing_form.submitted`. | PATCH: 471 → `signal` (refresh is a recurring data sync, no contract state change), 515 → `lifecycle` (delivered is a stable mid-lifecycle stage of the email send record), 516 → `signal`, 517 → `signal`, 518 → `lifecycle` (unsubscribe transitions consent state), 519 → `signal` (score recomputation is a derived recurring signal, not a state machine transition), 520 → `lifecycle`, 521 → `lifecycle`. |
| B1-S3 | **B10b report-only, outbound NULL source_domain_module_id** | All 8 outbound MA handoffs (60, 69, 74, 84, 507, 508, 509, 510) carry NULL `source_domain_module_id`. Per B10b asymmetry this is MA's owed work, not other-domain owed, because the source side of an outbound is the publishing domain's own audit responsibility. The fix is blocked on B1-S1 (no module rows to point at). | After Phase M load (B1-S1) PATCH each handoff to set `source_domain_module_id` to the realizing MA module (likely `MA-LEAD-SCORING` for 60 / 84 / 507 / 509, `MA-LANDING-PAGES` for 508, `MA-JOURNEY-ORCH` for 69 / 74, `MA-LEAD-SCORING` for 510). |
| B1-S4 | **B10b report-only, inbound NULL target_domain_module_id** | All 11 inbound MA handoffs (78, 85, 90, 91, 94, 232, 327, 328, 506, 808, 811) carry NULL `target_domain_module_id`. Per B10b this is MA's owed work, the consuming module on the MA side is MA's audit responsibility. The fix is blocked on B1-S1. | After Phase M load PATCH each handoff to set `target_domain_module_id` to the appropriate MA module. Provisional routing: 78 (CDP segment.activated) → `MA-JOURNEY-ORCH`; 85 (CRM crm_contact.synced) → `MA-CAMPAIGN-AUTHORING`; 90, 91 (SMM marketing_campaigns sync) → `MA-CAMPAIGN-AUTHORING`; 94 (HCMS content published) → `MA-CAMPAIGN-AUTHORING`; 232 (LOYALTY member.lapsed) → `MA-JOURNEY-ORCH`; 327, 328 (B2C-COMM cart/checkout) → `MA-JOURNEY-ORCH`; 506 (B2C-COMM coupon redeemed) → `MA-ATTRIBUTION`; 808, 811 (DXP journey events) → `MA-JOURNEY-ORCH`. |
| B1-S5 | **H1 (APQC tagging) gap** | Only 2 of 19 cross-domain handoffs carry `handoff_processes` rows (78 → process 133 L3, 232 → process 641 L4), both `discovery_substring`, zero `agent_curated`, zero `record_status='approved'`. Volume expectation per SKILL H1: 0.5N to 0.8N for N=19 → 10 to 15 agent_curated tags. APQC PCF candidates for the 17 untagged handoffs (proposals built from the structural pass; PCF id lookups deferred to fix time): outbound 60 (MA→CRM `crm_lead.qualified`) → "Manage sales force" / "Manage sales opportunities" (10379 family); 69 (MA→CDP engagement_recorded) → "Manage customer information" (10063 family); 74 (MA→CDP event_recorded) → "Manage customer information"; 84 (MA→CRM nurture.completed) → "Manage sales opportunities"; 507 (MA→CRM scored_above_threshold) → "Manage sales opportunities"; 508 (MA→CDP marketing_form.submitted) → "Manage customer information"; 509 (MA→CRM nurture_journey.completed) → "Manage sales opportunities"; 510 (MA→SALES-ENG lead_score.recomputed) → "Manage sales operations" (10393 family); inbound 85 (CRM crm_contact.synced) → "Manage customer information"; 90, 91 (SMM marketing_campaigns) → "Develop and manage marketing plans" (10103 family); 94 (HCMS content published) → "Manage marketing content" (10107 family); 327 (B2C-COMM cart.abandoned) → "Develop and manage marketing plans" (cart-recovery campaign trigger); 328 (B2C-COMM checkout.started) → similar; 506 (B2C-COMM coupon.redeemed) → "Measure and report marketing effectiveness"; 808, 811 (DXP journey events) → "Develop and manage marketing plans". 17 candidate `agent_curated` rows total, with a confidence rating to be set per row at fix time. The 2 existing `discovery_substring` rows (78, 232) look reasonable on the surface and warrant REPLACE / approve with `agent_curated` confirmation. | INSERT 17 `handoff_processes` rows + REPLACE 2, all `proposal_source='agent_curated'`, all `record_status='new'`. PCF id lookups via `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` at fix time. |

#### MA-side derived findings, in-scope fix path

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S6 | **Cross-relationship inconsistency** | Row 613 `content_entries feeds marketing_campaigns` links data_object 132 (`content_entries`, owned by HCMS) into 116 (`marketing_campaigns`, owned by MA). The inbound handoff 94 also carries `source_domain_id=93` (HCMS), but the inbound handoff is described as coming from SMM in older audit rollups; SMM-sourced inbound handoffs (90, 91) carry `source_domain_id=106` (SMM) and reuse the same payload `marketing_campaigns`, which is an MA master. This is consistent on the data, no SCOPE-CREEP. Surface only as an integrity check (Section 5 of Pass 4): cross-relationship 613 is correctly anchored to the HCMS source and MA target. | None; observation only. The audit's structural pass confirms the relationship row is consistent with the handoff rows. |
| B1-S7 | **B12 alias gap on MA-mastered entities** | 0 aliases exist on any of the 5 MA-mastered data_objects (`marketing_campaigns`, `marketing_emails`, `lead_scores`, `nurture_journeys`, `marketing_forms`). Vendor terminology surfaces are obvious: `marketing_campaigns` is "Campaign" in HubSpot / Marketo / Pardot but "Journey" in Salesforce Marketing Cloud Engagement and Braze, "Flow" in Klaviyo and Iterable. `nurture_journeys` is "Journey" in Marketo and SFMC, "Workflow" in HubSpot, "Flow" in Klaviyo / ActiveCampaign / Iterable / Braze, "Sequence" in Mailchimp, "Cadence" overlap risk with sales-engagement domain. `lead_scores` is "Lead Score" in Marketo / Pardot / HubSpot, "Predictive Lead Scoring" in HubSpot AI tier, "Engagement Score" in some SFMC variants. `marketing_forms` is "Form" in HubSpot, "Landing Page Form" in Marketo, "Form Handler" in Pardot. `marketing_emails` is "Email Send" in Marketo, "Email Studio" in SFMC. Aliases need user-approved wording, do not auto-load. | Surface as B2-S2 for user-approved wording; INSERT through `data_object_aliases` only after user approves the per-row alias_name. |

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (Bucket 3 holds the candidates) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M1, B9, B10b out, B10b in) | 4 (S1, S2, S3, S4) |
| BOUNDARY | 0 (S6 observation, not a gap) |
| **APQC TAGGING** (per-handoff PCF activity classification) | 1 (S5; the full 19-row work plan sits inside the single B1 item) |
| ALIAS GAP (B12-class) | 1 (S7) routed to B2-S2 for wording |
| MODULARIZATION | 0 |
| **Bucket 1 total (distinct B1-S*)** | **7** |

#### Pairwise reconciliation (Pass 4)

For each of the 4 heavy neighbors (edge weight >=3) the 5-section pairwise diff. Section 1 (existing handoffs fully wired) reports counts. Section 2 covers NULL FK candidates (deferred per asymmetry). Section 3 surfaces missing handoffs the catalog implies. Section 4 surfaces boundary integrity gaps. Section 5 covers cross-domain relationship mirror checks.

**CRM ↔ MA (weight 6).** Wired pairs: 5 (MA→CRM 60 crm_lead.qualified; MA→CRM 84 nurture.completed; MA→CRM 507 crm_lead.scored_above_threshold; MA→CRM 509 nurture_journey.completed; CRM→MA 85 crm_contact.synced). Section 2: all 5 have NULL on the MA-side FK (B1-S3 / B1-S4 cover MA's owed work). CRM side of handoff 85 has `source_domain_module_id=46` populated; the other 4 have NULL `target_domain_module_id` on the CRM side, that is CRM's owed work, report-only. Section 3: a likely missing handoff is CRM → MA on `crm_contact.unsubscribed` (consent withdrawal back to MA's suppression list). Surface as Bucket 3, the catalog doesn't model consent state on CRM contacts yet, this is a Phase 0 candidate. Section 4: clean. Section 5: zero `data_object_relationships` rows directly connect MA-mastered entities to CRM-mastered entities; the linkage runs via `customers` and `crm_contacts` (CRM masters) which appear as `contributor` on MA's `domain_data_objects` rollup. The audit notes this is a thin MA → CRM connection at the relationship layer (relative to the 5 handoffs), worth a Bucket 2 question whether explicit relationship rows are warranted.

**CDP ↔ MA (weight 5).** Wired pairs: 4 (MA→CDP 69, 74, 508; CDP→MA 78). Section 2: MA-side FKs NULL on all 4 (B1-S3 / B1-S4). CDP-side: 78 has NULL `source_domain_module_id` (CDP's B10b), 69 / 74 / 508 have NULL `target_domain_module_id` (CDP's B10b). Report-only to CDP. Section 3: missing inbound from CDP on `customer_attributes.refreshed` (event 471), trigger event exists but no handoff routes the refresh into MA's segmentation layer, surface as candidate inbound handoff (judgment call, B2-S3, since MA does declare `customer_attributes` as `consumer`). Section 4: clean. Section 5: row 479 `customer_events published_to customer_attributes` (data_objects 111 → 114), both currently flagged `contributor` / `consumer` in MA's rollup; the row is consistent.

**B2C-COMM ↔ MA (weight 3).** Wired pairs: 3 inbound (327 cart.abandoned, 328 checkout.started, 506 coupon.redeemed); 0 outbound. Section 2: B2C-COMM-side has NULL `source_domain_module_id` (B2C-COMM's B10b); MA-side has NULL `target_domain_module_id` (MA's B10b, see B1-S4). Section 3: a likely missing outbound is MA → B2C-COMM on `marketing_email.clicked` for personalization context, surface as Bucket 3, judgment call whether B2C-COMM consumes click signals directly or whether the consumption is mediated via CDP. Section 4: clean. Section 5: zero direct cross-relationships between B2C-COMM and MA, the connection runs via cart/checkout payloads on the handoffs only.

**SMM ↔ MA (weight 3).** Wired pairs: 2 inbound (90 influencer_campaign.completed, 91 social_post.published, both with payload `marketing_campaigns` which is MA-mastered). Section 2: SMM-side NULL on both, MA-side NULL on both. Section 3: likely missing outbound MA → SMM on `marketing_campaign.launched` for social-amplification coordination, surface as Bucket 3. Section 4: SMM uses `marketing_campaigns` (an MA master) as the handoff payload, this is consistent with SMM declaring `marketing_campaigns` as `contributor` on its own DMDO; no audit row confirms this, surface as routing question. Section 5: row 613 `content_entries feeds marketing_campaigns` has `source_data_object_id=132` (HCMS) and `target_data_object_id=116` (MA), the relationship is correct, but the handoffs 90 / 91 reuse the MA master payload from SMM, which is non-standard, the SMM side should logically own a distinct payload (e.g., `social_campaigns`). Surface as Bucket 2, B2-S4 (modularization question, do SMM and MA share `marketing_campaigns` or should the catalog split).

**Lighter neighbors (1-2 weight, one-line summaries):**

- **DXP ↔ MA (weight 2).** Inbound 808 (digital_experience.activated), 811 (journey_step.abandoned). Both have NULL on both FKs (DXP B10b + MA B1-S4). No direct cross-relationships. Healthy boundary modulo the FK backfill.
- **SALES-ENG ↔ MA (weight 1).** Outbound 510 (MA→SALES-ENG lead_score.recomputed) only. NULL on both FKs. No cross-relationships. Healthy modulo backfill.
- **HCMS ↔ MA (weight 2).** Inbound 94 (content_entry.published). NULL on both FKs. Cross-relationship 613 exists. Healthy modulo backfill.
- **LOYALTY ↔ MA (weight 1).** Inbound 232 (member.lapsed). NULL on both FKs. Existing APQC tag (process 641 L4, `discovery_substring`). No cross-relationships. Healthy modulo backfill + APQC REPLACE.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module split for the MA Phase M load.** Per Rule #14 a domain with 8 capabilities needs >=2 `module_kind='full'` `domain_modules`. The natural split from the loaded entities is 5 modules: `MA-CAMPAIGN-AUTHORING` (masters `marketing_campaigns` + `marketing_emails`), `MA-JOURNEY-ORCH` (masters `nurture_journeys`), `MA-LEAD-SCORING` (masters `lead_scores`), `MA-LANDING-PAGES` (masters `marketing_forms`), `MA-ATTRIBUTION` (derived-signals shape, no master, covers `MA-ATTRIB-MEASURE`). Alternatives: (a) fold `MA-LEAD-SCORING` into `MA-JOURNEY-ORCH` since scoring is the trigger surface for nurture, (b) fold `MA-LANDING-PAGES` into `MA-CAMPAIGN-AUTHORING` since forms are typically a sibling of campaign templates, (c) drop `MA-ATTRIBUTION` and let attribution live as a capability inside `MA-CAMPAIGN-AUTHORING` without its own module. Recommended: 4 modules, fold attribution into `MA-CAMPAIGN-AUTHORING`. | Module split is an architectural choice the user owns; the audit can recommend but not decide. | (a) 5-module split as proposed, (b) 4-module split with `MA-ATTRIBUTION` folded, (c) 3-module split with both `MA-ATTRIBUTION` folded and `MA-LANDING-PAGES` folded into `MA-CAMPAIGN-AUTHORING`, (d) other split (specify). |
| B2-S2 | **Alias authoring for the 5 MA masters.** Per Rule #15 alias text needs explicit user approval. Vendor terminology candidates per master are listed in B1-S7. The agent will not auto-load. | Rule #15. | Per-master alias_name list to load, or skip and re-visit after Phase M. |
| B2-S3 | **Inbound handoff from CDP on `customer_attributes.refreshed`.** Event 471 exists, MA declares `customer_attributes` as `consumer + required`, but no handoff routes the refresh into MA. Is this an authoring gap (a handoff should exist), or is the refresh mediated via the existing segment.activated handoff (78) and the standalone refresh event was loaded for a different purpose? | Architectural intent question, can't be inferred from data. | (a) add inbound CDP → MA handoff on event 471 with payload `customer_attributes`, (b) leave event 471 standalone for non-handoff consumers (analytics dashboards, ML feature jobs). |
| B2-S4 | **SMM vs MA ownership of `marketing_campaigns`.** Handoffs 90, 91 (SMM-sourced) carry payload `marketing_campaigns`, an MA master. Either (a) MA's `marketing_campaigns` is correctly the universal campaign master and SMM contributes campaign rows directly to it, (b) SMM should master its own `social_campaigns` and the handoff payload is mismatched. Market evidence: HubSpot, Marketo, SFMC, Braze, Iterable all model social campaigns as a campaign-type variant inside the same `campaigns` master; pure-play social vendors (Sprout Social, Hootsuite, Later) model their own social-post / social-campaign entities. The cross-relationship 613 (`content_entries feeds marketing_campaigns`) suggests scenario (a). | Architectural intent question, depends on whether SMM is loaded as suite-aligned or pure-play. | (a) keep `marketing_campaigns` as MA-mastered and SMM as `contributor`, (b) split into `marketing_campaigns` (MA) + `social_campaigns` (SMM), update handoffs 90 / 91 accordingly. |
| B2-S5 | **Pattern flag re-evaluation per Rule #12.** All 5 MA masters have `has_personal_content=false`, `has_submit_lock=false`, `has_single_approver=false`. Re-evaluation: (a) `marketing_emails.has_submit_lock=true` is likely (once an email send job is scheduled it locks for editing per HubSpot / Marketo / SFMC), (b) `marketing_campaigns.has_submit_lock=true` is likely for similar reasons, (c) `nurture_journeys.has_submit_lock=true` is likely (once activated the journey definition locks), (d) `marketing_forms.has_personal_content=true` since forms collect PII directly, (e) `lead_scores.has_personal_content=false` (scores are derived, not PII). | Pattern flags are workflow-shape judgments the user owns. | Per-flag yes/no from user; capture in Decisions. |
| B2-S6 | **Pre-M deployability strategy.** The fix surface for B1-S1 is non-trivial, it requires authoring 2 to 5 modules, 5 sets of lifecycle states, 2 to 5 system skills, 10 to 25 `skill_tools` rows, and the per-module DMDO rows that replace the current `domain_data_objects` rollup. Two execution paths: (a) treat MA as an unfinished Phase A load and complete it now in a single dedicated session (1 to 2 day effort), (b) accept the pre-M status and tag MA as "structurally pre-M" in the audit pipeline, deferring Phase M until a broader Phase 0 / Phase A re-validation pass. | This is a planning question, not a data question. | (a) schedule Phase M load now, (b) defer to a planned Phase A re-validation wave, (c) load only the most critical module (`MA-CAMPAIGN-AUTHORING`) as a partial first step. |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against HubSpot Marketing Hub, Marketo Engage, Salesforce Marketing Cloud Account Engagement (Pardot), Oracle Eloqua, Mailchimp, ActiveCampaign, Klaviyo, Iterable, Braze, Customer.io, Keap, Drip, Constant Contact, Brevo, Omnisend, plus the catalog's primary solutions (Bloomreach Engagement, SAP Emarsys, Microsoft Dynamics 365 Customer Insights, SFMC Engagement). Compliance anchors: CAN-SPAM (US email), TCPA (US SMS, robocall), GDPR + CCPA / CPRA + COPPA + EU AI Act + EU DSA. The catalog covers all of these regulations, no regulation gap.

The subagent recipe was not spawned per orchestrator instruction; the candidates below come from the analyst's flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### Candidate MISSING entities (6) surfaced by flagship-vendor knowledge

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `marketing_email_sends` | Marketo "Email Send", SFMC "Send Definition", HubSpot "Email Send" model the per-send instance (audience + time + variant) distinct from the email template. Current `marketing_emails` master conflates the template and the send. | `MA-CAMPAIGN-AUTHORING` (potential split or sibling master) |
| `audience_lists` | HubSpot "List", Marketo "Smart List", Mailchimp "Audience", Klaviyo "List" are first-class authored lists distinct from CDP-mastered `audience_segments`. The MA-side list is the campaign-targeting list, not the dynamic CDP segment. | `MA-CAMPAIGN-AUTHORING` (master, distinct from CDP's audience_segments) |
| `subscriber_preferences` | Klaviyo Subscriber Profiles, HubSpot Subscription Preferences, Marketo Communication Limits model per-subscriber consent / frequency preferences. Distinct from CDP's `customers`, MA owns the preference-center experience. | `MA-CAMPAIGN-AUTHORING` (master, or sibling of `marketing_forms`) |
| `ab_test_variants` | Marketo / Eloqua / HubSpot / Klaviyo all model A/B test variants as first-class records (variant_a, variant_b, winner, metric). Currently no master, the capability `MA-AB-OPTIMIZATION` has no underlying entity. | `MA-CAMPAIGN-AUTHORING` (master) |
| `email_send_metrics` | Per-send aggregates (delivered, opened, clicked, bounced, complained, unsubscribed) modeled in every flagship platform. Currently the only proxy is the 4 trigger_events 515 to 518, no master records the rollups. | `MA-ATTRIBUTION` (derived master) |
| `journey_step_events` | Braze, Iterable, Customer.io, SFMC model per-step traversal events distinct from generic `customer_events`. Per-step latency, abandon, branch-taken. Currently no master. | `MA-JOURNEY-ORCH` (derived master, links to DXP 811 `journey_step.abandoned`) |

#### Candidate-domain queue (3 candidates queued)

- **SMS-MARKETING** (Attentive, Postscript, Klaviyo SMS, Sinch, Community): standalone SMS-marketing market with TCPA-shaped compliance surface, distinct from MA's cross-channel orchestration. Adjacency: MA, CDP, B2C-COMM. Queued.
- **TRANSACT-EMAIL** (SendGrid, Postmark, Resend, Mailgun, AWS SES, SparkPost): transactional email infrastructure distinct from marketing email orchestration. Different buyer (engineering vs marketing ops), different SLAs, different deliverability model. Adjacency: MA, B2C-COMM, SUB-MGMT, CSM. Queued.
- **REVERSE-ETL** (Hightouch, Census, RudderStack, Polytomic, Grouparoo): already queued by the CDP audit; bumped this audit. MA is the primary downstream destination for reverse-ETL syncs, so the candidate's blast radius widens.

#### Modularization (2) candidates

- **`MA-COMPLIANCE` (or `MA-PRIVACY`) module candidate.** Consent management, preference center, double-opt-in records, unsubscribe lists, suppression. Currently spread across `marketing_forms` (forms collect consent) and the 7 regulations in `domain_regulations`. A dedicated module would master `subscriber_preferences` + a new `consent_records` entity.
- **`MA-MOBILE-PUSH` split or fold.** Currently a capability with no module; if Phase M lands the split as proposed in B2-S1, mobile push has no module home unless folded into `MA-JOURNEY-ORCH`. Brace / Iterable / Customer.io flagship vendors blur the line; SFMC MobileConnect / MobilePush keeps them as a sub-module. Folding into `MA-JOURNEY-ORCH` is the lighter option.

#### Compliance regulation candidates

The 7 currently-loaded regulations cover the major surfaces. Possible additions for future Phase 0 review: CASL (Canadian Anti-Spam Law), PIPEDA (Canadian privacy), Brazil LGPD (broader cross-border consent), Australia Spam Act, ePrivacy Directive (EU cookie / direct marketing).

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (which produces a Phase 0 markdown at `c:/tmp/MA-phase0-<date>.md` confirming per-entity vendor coverage) or eyeball-mode (user names which of the 6 entity candidates + 3 candidate-domain queue items + 2 modularization candidates + N regulation candidates to treat as confirmed).

### Cross-bucket dependencies

- **B1-S1 (M1 fix) is gated on B2-S1** (module split decision) **and B2-S6** (execution-path decision). All downstream B1 items (S3, S4) and the F-band, E-band, C-band recovery depend on this.
- **B1-S3, B1-S4 (B10b backfill) are gated on B1-S1**, the module rows must exist before the handoffs can be PATCHed.
- **B1-S5 (APQC tagging) is independent** of the M-band fix, can be applied immediately. The handoff_id is stable, the PCF row tagging does not depend on the source / target module FKs.
- **B1-S7 (aliases) is gated on B2-S2** (user-approved wording per Rule #15).
- **B2-S5 (pattern flags) is independent.**
- **B3 candidate entities (especially `audience_lists`, `subscriber_preferences`, `email_send_metrics`) feed back into B2-S1**: if the user approves these in eyeball mode, the module split in B2-S1 may need to expand to host them.
- **B3 candidate-domain queue items (SMS-MARKETING, TRANSACT-EMAIL, REVERSE-ETL) are independent** of the M-band fix; they get triaged at the queue level, not in MA's audit.
- Buckets 2 and 3 are otherwise independent of each other; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S2, S5`), or `skip`.

- **S1 (M1 hard fail, Phase M load)** is gated on B2-S1 + B2-S6; resolve those first.
- **S2 (event_category PATCH on 8 events)** is trivial; one PATCH each. Independent.
- **S3 / S4 (B10b backfill, 19 handoffs)** is gated on S1.
- **S5 (APQC tagging, 17 INSERTs + 2 REPLACE)** is independent; load now or in a follow-up batch?
- **S6 / S7** are derived findings, S7 routes to B2-S2 for wording.

**Bucket 2, what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module split):** (a / b / c / d), specify split.
- **B2-S2 (alias wording for 5 masters):** supply per-master alias_name list, or skip.
- **B2-S3 (CDP refresh handoff):** (a) add handoff on event 471, (b) leave standalone.
- **B2-S4 (SMM vs MA campaign ownership):** (a) MA-mastered shared, (b) split.
- **B2-S5 (pattern flag re-evaluation):** per-flag yes/no.
- **B2-S6 (Phase M execution path):** (a / b / c).

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** Will surface candidates when the subagent returns. If eyeball-mode, name which of the 6 entity candidates + 2 modularization candidates + regulation candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. Listed by owing domain for routing.

| Owing domain | Owed work |
|---|---|
| CRM | B10b: populate `target_domain_module_id` on outbound handoffs 60, 84, 507, 509 (all MA → CRM). Confirm `source_domain_module_id=46` is correct on 85. |
| CDP | B10b: populate `target_domain_module_id` on 69, 74, 508 (MA → CDP); populate `source_domain_module_id` on 78 (CDP → MA). |
| B2C-COMM | B10b: populate `source_domain_module_id` on inbound 327, 328, 506. Add `contributor` or `consumer` DMDO on `marketing_campaigns` if B2C-COMM emits cart / coupon events that MA consumes. |
| SMM | B10b: populate `source_domain_module_id` on inbound 90, 91. Confirm `marketing_campaigns` (MA-mastered) is correctly the payload, or split (see B2-S4). |
| HCMS | B10b: populate `source_domain_module_id` on inbound 94. Confirm `content_entries` → `marketing_campaigns` relationship row 613 is correctly anchored on the HCMS side. |
| LOYALTY | B10b: populate `source_domain_module_id` on inbound 232. Confirm `loyalty_members` payload is intentional vs an alias to `customers`. |
| DXP | B10b: populate `source_domain_module_id` on inbound 808, 811. |
| SALES-ENG | B10b: populate `target_domain_module_id` on outbound 510. |

### Decisions

(empty until reviewed)

## 2026-05-31, Continuation: B1 technical fixes

Loader: [.tmp_deploy/fix_ma_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_ma_b1_technical_2026_05_31.ts).

### Fixes applied

| B1 item | Type | Detail | Result |
|---|---|---|---|
| B1-S2 | PATCH `trigger_events.event_category` (Rule #13 enum backfill, audit fully specified) | 8 rows: 471 `customer_attributes.refreshed` -> `signal`; 515 `marketing_email.delivered` -> `lifecycle`; 516 `marketing_email.opened` -> `signal`; 517 `marketing_email.clicked` -> `signal`; 518 `marketing_email.unsubscribed` -> `lifecycle`; 519 `lead_score.recomputed` -> `signal`; 520 `nurture_journey.completed` -> `lifecycle`; 521 `marketing_form.submitted` -> `lifecycle`. | 8 patched, 0 already-correct, 0 mismatch. Post-write verification: 0 empty, 0 invalid-enum on the 8 ids. |

### Deferred B1 items

| B1 item | Reason |
|---|---|
| B1-S1 (M1 Phase M load) | Architectural choice: gated on B2-S1 (module split) and B2-S6 (execution path). Requires user-owned decisions. |
| B1-S3 (B10b outbound `source_domain_module_id` backfill, 8 handoffs) | Gated on B1-S1: no MA `domain_modules` rows exist yet, so no FK target to point at. |
| B1-S4 (B10b inbound `target_domain_module_id` backfill, 11 handoffs) | Gated on B1-S1: same reason. |
| B1-S5 (APQC `handoff_processes` tagging, 17 INSERT + 2 REPLACE) | Audit only names PCF family terms ("Manage sales opportunities", "Manage customer information", ...) and explicitly defers PCF id lookups "to fix time". No resolvable `process_id` per row pre-specified. Per the technical scope, INSERT `handoff_processes` is permitted only when audit pre-specified both `handoff_id` and resolvable PCF id; not met here. |
| B1-S6 (cross-relationship 613 integrity check) | Audit says "None; observation only." No fix to apply. |
| B1-S7 (alias gap on 5 MA masters) | Routed to B2-S2 for user-approved wording per Rule #15 + Rule #18 (vendor names forbidden outside commerce entities; aliases on `data_object_aliases.alias_name` are commerce-allowed, but per-row text still needs explicit approval). |

### UI spot-checks

- https://tests.semantius.app/domain_map/trigger_events (filter id in 471,515-521 to confirm `event_category` populated per Rule #13)
