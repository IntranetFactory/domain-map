# MA audit history

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

## 2026-05-31, Audit

### Summary
- Current footprint: 0 modules (M1 still hard-fails: zero `domain_modules` rows on `domain_id=70`, zero `domain_module_host_domains` rows). 5 masters in legacy `domain_data_objects` rollup (`marketing_campaigns` 116, `marketing_emails` 117, `lead_scores` 118, `nurture_journeys` 119, `marketing_forms` 120). 3 contributors (`customers` 97, `crm_contacts` 98, `customer_events` 111), 2 consumers (`audience_segments` 113, `customer_attributes` 114). 8 capabilities. 15 solutions (12 primary, 2 partial, 1 secondary). 7 regulations (GDPR, CCPA/CPRA, EU AI Act, EU DSA, COPPA, TCPA, CAN-SPAM). 10 trigger_events on MA-mastered data_objects. 8 outbound + 11 inbound = 19 cross-domain handoffs. 1 cross-domain relationship row (613 `content_entries feeds marketing_campaigns`). 1 legacy `domain_id`-anchored `system` skill (id 17 `ma-system`, `domain_module_id=null`) with 12 `skill_tools` rows. 0 module-level system skills. 0 lifecycle states across the 5 masters. 0 `data_object_aliases`. 0 `domain_aliases`. 0 roles linked to Demand Generation (business_function_id=54).
- Vendor-surface basis: prior 2026-05-30 audit enumerated HubSpot Marketing Hub, Marketo Engage, Salesforce Marketing Cloud Engagement, Salesforce Marketing Cloud Account Engagement (Pardot), Oracle Eloqua, Mailchimp, ActiveCampaign, Klaviyo, Iterable, Braze, plus the catalog's primary solutions (Bloomreach Engagement, SAP Emarsys, Microsoft Dynamics 365 Customer Insights). Compliance anchors: CAN-SPAM, TCPA, GDPR + CCPA / CPRA + COPPA + EU AI Act + EU DSA. Re-run on 2026-05-31 carried this basis forward (no subagent re-enumeration). The 6 Phase-0-pending candidate entities and 3 candidate-domain queue items from the prior audit remain pending.
- Bucket 1 (in-scope, agent fixable): 7 items (6 STRUCTURAL + 1 APQC TAGGING). state.yaml splits these into 1 b1a (B1A-H1-APQC-TAGGING, agent-solvable now) + 6 b1b (gated). The legacy-skill F1 retirement is tracked as a 7th b1b item (B1B-F1-LEGACY-SKILL), bringing b1b to 10.
- Bucket 2 (surface-for-user, judgment): 7 items (B2-M1, B2-A4, B2-B6, B2-B7-VERBS, B2-B11, B2-B4, B2-M2).
- Bucket 3 (Phase 0 pending, speculative): 12 items (6 entity candidates + 3 candidate-domain queue + 2 modularization + 1 regulation bundle).

### Structural pass bands (live)

**A band.** A1 passes (all 7 domain-metadata fields populated: `crud_percentage=75`, `business_logic` populated, `min_org_size='10 xs <50'`, `cost_band='$$$'`, `certification_required=false`, `usa_market_size_usd_m=8000`, `market_size_source_year=2025`). A2 passes (8 capabilities). A3 passes (15 solutions). **A4 fails**: `catalog_tagline` empty, `catalog_description` empty.

**M band.** **M1 hard-fails** (zero `domain_modules` rows). M2 through M8 are unevaluable until M1 is cured. The deployable layer is missing entirely.

**B band.** B1 passes at the legacy `domain_data_objects` rollup layer (5 masters). B2 passes (singular_label and plural_label populated on all 5 masters). B3 passes (none of the 5 masters carry bare-word names; `marketing_*`, `lead_*`, `nurture_*` prefixes are present; `customers` is owned by CRM, not MA). B4 partially passes: pattern flags default to false on all 5 masters, no positive re-evaluation recorded. **B5 passes** (zero `embedded_master` rows on this domain, vacuous). **B6 fails**: zero intra-domain `data_object_relationships` rows among MA masters. **B7 fails**: zero `users` edges to any MA master (Rule #10 requires user-typed actor edges; `marketing_emails` has author, `marketing_campaigns` has owner, `nurture_journeys` has owner, `marketing_forms` has owner, `lead_scores` has scorer). B8 unevaluable in the absence of cross-domain payload-target relationship rows from MA outbound (only row 613 exists from HCMS into MA). B9 passes on `event_category`: all 10 trigger_events on MA masters carry a populated `event_category` (the B1-S2 PATCH on the 2026-05-31 continuation closed the prior gap). **B9b unevaluable** (no modules, no cross-module surface). **B10b fails**: 8 outbound MA handoffs carry NULL `source_domain_module_id`; 11 inbound MA handoffs carry NULL `target_domain_module_id`. **B11 fails**: zero `data_object_aliases` on the 5 MA masters; vendor terminology candidates from the prior audit remain unresolved. **B12 fails**: zero `data_object_lifecycle_states` on the 5 masters; Rule #12 obligations unmet, no config-shape exemption claimed.

**C band.** **C1 passes** (1 `owner` row: Demand Generation, business_function_id=54). C2 vacuously passes (zero capability-level overrides; none of the 8 capabilities diverge from the domain-level RACI based on current data).

**D band.** D1 not run this audit (UI spot-check is a fix-loop concern).

**E band.** Unevaluable (E1 vacuously passes for the current zero-module shape; E2 through E5 all unevaluable until modules exist). Zero roles linked to Demand Generation; zero cross-functional roles touching the (nonexistent) MA modules.

**F band.** **F1 transitional pass**: legacy `domain_id`-anchored system skill 17 `ma-system` (`domain_module_id=null`) remains; per the F1 pass criterion this is acceptable transitional state only when no module-level system skill exists for the domain, and here none does. F1 will hard-fail the moment any Phase-M module-level skill is authored, so flag for replacement, not deletion (the 12 `skill_tools` rows on this row become the seed for the per-module split). **F2 fails by absence** (zero modules ⇒ zero per-module system skills). **F3 unevaluable** (no per-module skills). **F4** on the legacy `ma-system` skill: every linked tool's `operation_kind` / `data_object_id` pairing is valid (5 `query` rows with `data_object_id` set, 4 `mutate` rows with `data_object_id` set, 2 `compute` rows with `data_object_id` NULL, 1 `side_effect` row with `data_object_id` NULL). **F5 uncomputable** until F2 passes. F7 unevaluable (the legacy skill links `send_email` channel primitive at `requirement_level=required`; no `notes` justification exists, but the skill is a transitional row queued for replacement, so the F7 audit defers to the per-module skills that replace it).

**H band.** **H1 hard-fails**: 2 of 19 cross-domain handoffs carry `handoff_processes` rows (78 → process 133 L3 `Establish goals, objectives, and measures for products/services by channel/segment`, `discovery_substring`, `record_status='new'`; 232 → process 641 L4 `Acquire members to customer loyalty program`, `discovery_substring`, `record_status='new'`). Volume expectation: 0.5N to 0.8N for N=19 ⇒ 10 to 15 `agent_curated` rows. Zero `agent_curated`, zero `record_status='approved'`.

**S band.** S1: `domain_modules` zero (M1 expected non-zero, fail), `domain_module_host_domains` zero (acceptable), `business_function_domains` 1 (C1 ok), `capability_domains` 8 (A2 ok), `domain_data_objects` 10 (legacy rollup, B1 ok), `domain_regulations` 7 (ok), `solution_domains` 15 (A3 ok), `handoffs.source_domain_id` 8 (B9 partial), `handoffs.target_domain_id` 11 (ok), `skills` 1 legacy (F-band gap). S2 unevaluable (no modules). S3 per-master coverage table:

| data_object | states | events | aliases |
|---|---|---|---|
| marketing_campaigns (116) | 0 | 3 | 0 |
| marketing_emails (117) | 0 | 4 | 0 |
| lead_scores (118) | 0 | 1 | 0 |
| nurture_journeys (119) | 0 | 1 | 0 |
| marketing_forms (120) | 0 | 1 | 0 |

Every master fails B11 (zero aliases) and B12 (zero states). Trigger_events exist on every master, B9 substance check passes.

**Semantius score.** Uncomputable per F5 rollup until F2 passes (no module-level system skills exist). The legacy `ma-system` skill's `strict_score` over its 12 tools would be 10/12 = 0.83, `operational_score` 10/12 = 0.83 (2 `external` `compute` tools `classify_text`, `generate_text`), but the F-band reports per-module scores by design and this legacy skill does not anchor to a module.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-M1 | **M1 (hard fail), no modules** | Zero `domain_modules` rows. Zero `domain_module_host_domains` rows. Per Rule #14 the >=3-capability threshold (MA carries 8) requires >=2 `module_kind='full'` modules. The deployable contract is missing. Gated on architectural choices in Bucket 2. | Phase M load (>=2 modules + per-module system skills + per-module DMDO + per-master lifecycle states). Gated on B2-M1 (module split) + B2-M2 (execution path). |
| B1-A4 | **A4 (catalog UX fields empty)** | `domains.catalog_tagline` empty, `domains.catalog_description` empty. Per Rule #20 backfill is allowed but the draft must be surfaced to the user before write. | Draft buyer-voice tagline + 1-3 paragraph description, surface as B2-A4, write only on user approval. |
| B1-B6 | **B6 (intra-domain relationships)** | Zero `data_object_relationships` rows among the 5 MA masters. Expected edges from market practice: `marketing_campaigns has_many marketing_emails`, `nurture_journeys has_many marketing_emails` (as steps), `marketing_forms feeds lead_scores` (form submission contributes scoring), `nurture_journeys triggered_by lead_scores` (score-threshold enrollment), `marketing_campaigns has_many nurture_journeys`. | Draft 5 relationship rows with verb / inverse_verb / cardinality / is_required / owner_side, surface to user per Rule #1, load via the cluster-drafts loader. Gated on B2-B6 (verb wording). |
| B1-B7 | **B7 (users edges)** | Zero `users` (data_object id 748, `kind=platform_builtin`) edges to any of the 5 MA masters. Expected edges per Rule #10: users → marketing_campaigns (owner), users → marketing_emails (author), users → nurture_journeys (owner), users → marketing_forms (owner), users → lead_scores (scorer / model_owner). | Draft 5 user-edge rows (relationship_verb = `owns` / `authors` / `configures`), surface to user, load. |
| B1-B10b-out | **B10b outbound NULL source_domain_module_id** | All 8 outbound MA handoffs (60, 69, 74, 84, 507, 508, 509, 510) carry NULL `source_domain_module_id`. MA's owed work. Blocked on B1-M1 (no module target). | PATCH after Phase M load. Provisional routing in B1-S3 of 2026-05-30 audit holds. |
| B1-B10b-in | **B10b inbound NULL target_domain_module_id** | All 11 inbound MA handoffs (78, 85, 90, 91, 94, 232, 327, 328, 506, 808, 811) carry NULL `target_domain_module_id`. MA's owed work. Blocked on B1-M1. | PATCH after Phase M load. Provisional routing in B1-S4 of 2026-05-30 audit holds. |

#### APQC TAGGING

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-H1 | **H1 (APQC tagging) gap** | 2 of 19 cross-domain handoffs carry `handoff_processes` rows; both are `discovery_substring` at `record_status='new'`, zero `agent_curated`, zero `approved`. 17 untagged handoffs. Volume target: 10 to 15 `agent_curated` rows. Partial PCF resolutions confirmed live: process 22 (`Develop marketing strategy` L2), 23 (`Develop and manage marketing plans` L2), 147 (`Manage leads/opportunities` L3), 708 (`Identify/receive leads/opportunities` L4), 709 (`Validate and qualify leads/opportunities` L4), 1862 (`Collect and merge internal and third-party customer information` L5). Proposed tags by handoff_id: 60 `crm_lead.qualified` → 709; 84 `nurture.completed` → 147; 507 `crm_lead.scored_above_threshold` → 709; 509 `nurture_journey.completed` → 147; 69 `marketing_campaign.engagement_recorded` → 23; 74 `marketing_campaign.event_recorded` → 23; 508 `marketing_form.submitted` → 708; 510 `lead_score.recomputed` → 147; 85 `crm_contact.synced` → 1862; 90 `influencer_campaign.completed` → 23; 91 `social_post.published` → 23; 94 `content_entry.published` → 23; 232 `member.lapsed` → 23 (REPLACE existing 641 for L2 clustering); 327 `cart.abandoned` → 23; 328 `checkout.started` → 23; 506 `coupon.redeemed` → 23; 808 `digital_experience.activated` → 23; 811 `journey_step.abandoned` → 23; 78 `segment.activated` → REPLACE 133 to 23 for L2 clustering. Defer-candidates: none (every cross-domain handoff has a plausible PCF anchor in the 22 / 23 / 147 / 708 / 709 / 1862 set). | INSERT 17 + REPLACE 2 `handoff_processes` rows, all `proposal_source='agent_curated'`, all `record_status='new'`. Composed key `(handoff_id, process_id)` prevents duplicates. Independent of B1-M1; can load now. |

#### Bucket 1 count summary

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 (Bucket 3 holds the candidates) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (M1, A4, B6, B7, B10b out, B10b in) | 6 |
| BOUNDARY | 0 |
| APQC TAGGING | 1 (17 INSERT + 2 REPLACE inside B1-H1) |
| ALIAS GAP (B11) | 1 (B1B-B11-ALIASES, gated on B2-B11 wording per Rule #15) |
| LIFECYCLE STATES (B12) | 1 (B1B-B12-LIFECYCLE-STATES, gated on B1B-M1 for module anchoring) |
| PATTERN FLAGS (B4) | 1 (B1B-B4-PATTERN-FLAGS, gated on B2-B4 per-flag yes/no) |
| LEGACY SKILL RETIREMENT (F1) | 1 (B1B-F1-LEGACY-SKILL, gated on B1B-M1) |
| MODULARIZATION | 0 (routed to Bucket 2) |
| **Bucket 1 total (b1a + b1b)** | **11** (1 b1a + 10 b1b in state.yaml) |

#### Pairwise reconciliation (Pass 4) brief

Re-runs the 2026-05-30 neighbor discovery against current state. No new heavy neighbors emerged.

**CRM ↔ MA (weight 6).** Wired pairs unchanged (5: 60, 84, 85, 507, 509). MA-side FKs NULL on all 5 (gated on B1-M1). CRM side has 4 NULL `target_domain_module_id` on outbound MA→CRM (CRM's B10b, report-only). Section 3 candidate (CRM → MA `crm_contact.unsubscribed`) remains a Bucket 3 / Phase 0 candidate. Section 5: no direct MA-master to CRM-master relationship rows.

**CDP ↔ MA (weight 5).** Wired pairs unchanged (4: 69, 74, 508, 78). MA-side FKs NULL on all 4. CDP side: 78 has NULL `source_domain_module_id` (CDP's B10b), 69 / 74 / 508 NULL `target_domain_module_id` (CDP's B10b). Section 3 candidate: missing CDP → MA inbound on `customer_attributes.refreshed` (event 471, MA declares `customer_attributes` as `consumer + required`).

**B2C-COMM ↔ MA (weight 3).** Wired pairs unchanged (3 inbound: 327, 328, 506). Section 3 candidate: missing outbound MA → B2C-COMM on `marketing_email.clicked`.

**SMM ↔ MA (weight 3).** Wired pairs unchanged (2 inbound: 90, 91). Section 3 candidate: missing outbound MA → SMM on `marketing_campaign.launched`. Section 5: row 613 (`content_entries feeds marketing_campaigns`) anchored to HCMS source, not SMM; the SMM-to-MA handoffs reuse MA's `marketing_campaigns` payload (the B2-S4 ownership question remains open).

**Lighter neighbors:** DXP weight 2 (808, 811), SALES-ENG weight 1 (510), HCMS weight 2 (94), LOYALTY weight 1 (232). All healthy modulo the B10b backfill.

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-M1 | Module split for the MA Phase M load (carried over from 2026-05-30). Per Rule #14 a domain with 8 capabilities needs >=2 `module_kind='full'` rows. Natural split candidates: (a) 5 modules: `MA-CAMPAIGN-AUTHORING` (masters `marketing_campaigns` + `marketing_emails`), `MA-JOURNEY-ORCH` (masters `nurture_journeys`), `MA-LEAD-SCORING` (masters `lead_scores`), `MA-LANDING-PAGES` (masters `marketing_forms`), `MA-ATTRIBUTION` (no master); (b) 4 modules folding attribution into campaign authoring; (c) 3 modules folding attribution and landing pages into campaign authoring. Recommended: 4 (option b). | Architectural choice. | a / b / c / other. |
| B2-A4 | Catalog UX fields for `domains.catalog_tagline` and `domains.catalog_description`. Per Rule #20 backfill allowed but draft must be surfaced and approved. Buyer-voice draft proposal: tagline = "Orchestrate marketing emails, nurture journeys, and lead-scoring across email, SMS, push, and the web." Description = three paragraphs covering (1) campaign authoring and send, (2) journey orchestration and lead scoring, (3) compliance-aware consent and preference management. Full draft surfaced before write. | Marketing voice ages differently from analyst voice. | Approve / rewrite / defer until Phase M lands so module-grain (M8) drives domain-grain. |
| B2-B6 | Verb wording for the 5 intra-master relationship edges (B1-B6). Recommended verbs: `marketing_campaigns has_many marketing_emails`, `nurture_journeys has_many marketing_emails`, `marketing_forms feeds lead_scores`, `nurture_journeys triggered_by lead_scores`, `marketing_campaigns has_many nurture_journeys`. | Verb wording is editorial. | Approve / rewrite / drop specific edges. |
| B2-B11 | Alias authoring for the 5 MA masters (carried over from 2026-05-30 B2-S2). Rule #15 requires per-row approval of `alias` text. Vendor terminology candidates per master in the 2026-05-30 audit. | Rule #15. | Per-master alias list, or skip until Phase M lands. |
| B2-B4 | Pattern flag re-evaluation per Rule #12 (carried over from 2026-05-30 B2-S5). Proposed flips: `marketing_emails.has_submit_lock=true`, `marketing_campaigns.has_submit_lock=true`, `nurture_journeys.has_submit_lock=true`, `marketing_forms.has_personal_content=true`. | Workflow-shape judgment. | Per-flag yes/no. |
| B2-M2 | Pre-M deployability execution path (carried over from 2026-05-30 B2-S6). | Planning question. | (a) Phase M load now, (b) defer to Phase A re-validation wave, (c) load only `MA-CAMPAIGN-AUTHORING` partial first step. |

### Bucket 3, Phase 0 pending (speculative)

Carried over from 2026-05-30, no new candidates added (subagent recipe not spawned per orchestrator instruction).

#### Candidate MISSING entities (6)

| Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|
| `marketing_email_sends` | Marketo Email Send, SFMC Send Definition, HubSpot Email Send model the per-send instance. | `MA-CAMPAIGN-AUTHORING` |
| `audience_lists` | HubSpot List, Marketo Smart List, Mailchimp Audience, Klaviyo List. | `MA-CAMPAIGN-AUTHORING` |
| `subscriber_preferences` | Klaviyo Subscriber Profiles, HubSpot Subscription Preferences, Marketo Communication Limits. | `MA-CAMPAIGN-AUTHORING` |
| `ab_test_variants` | Marketo / Eloqua / HubSpot / Klaviyo model A/B test variants as first-class. | `MA-CAMPAIGN-AUTHORING` |
| `email_send_metrics` | Per-send aggregates. | `MA-ATTRIBUTION` |
| `journey_step_events` | Braze, Iterable, Customer.io, SFMC model per-step traversal. | `MA-JOURNEY-ORCH` |

#### Candidate-domain queue (3)

- SMS-MARKETING (Attentive, Postscript, Klaviyo SMS, Sinch, Community).
- TRANSACT-EMAIL (SendGrid, Postmark, Resend, Mailgun, AWS SES, SparkPost).
- REVERSE-ETL (Hightouch, Census, RudderStack, Polytomic, Grouparoo).

#### Modularization (2)

- `MA-COMPLIANCE` (or `MA-PRIVACY`) candidate.
- `MA-MOBILE-PUSH` split or fold into `MA-JOURNEY-ORCH`.

#### Compliance regulation candidates

CASL, PIPEDA, LGPD, Australia Spam Act, ePrivacy Directive.

### Cross-bucket dependencies

- B1-M1 gated on B2-M1 + B2-M2.
- B1-A4 gated on B2-A4.
- B1-B6 gated on B2-B6.
- B1-B7 independent of Bucket 2 (verbs are catalog-conventional; user may want to confirm the actor mapping).
- B1-B10b-out, B1-B10b-in gated on B1-M1.
- B1-H1 independent of M1; can load now.
- B3 entity candidates feed back into B2-M1 (eyeball approval may expand the split).
- Buckets 2 and 3 otherwise independent.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, list (e.g. `H1`), or `skip`.

**Bucket 2, what's your call on each?** Per-item decision required.

**Bucket 3, vet via Phase 0 research, or eyeball-mode?** If eyeball, name which candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed work |
|---|---|
| CRM | B10b: populate `target_domain_module_id` on outbound MA handoffs 60, 84, 507, 509. Confirm `source_domain_module_id=46` on 85. |
| CDP | B10b: populate `target_domain_module_id` on 69, 74, 508. Populate `source_domain_module_id` on 78. |
| B2C-COMM | B10b: populate `source_domain_module_id` on inbound 327, 328, 506. Add `contributor` / `consumer` DMDO on `marketing_campaigns` if cart / coupon events imply MA consumption. |
| SMM | B10b: populate `source_domain_module_id` on inbound 90, 91. Confirm `marketing_campaigns` payload. |
| HCMS | B10b: populate `source_domain_module_id` on inbound 94. |
| LOYALTY | B10b: populate `source_domain_module_id` on inbound 232. |
| DXP | B10b: populate `source_domain_module_id` on inbound 808, 811. |
| SALES-ENG | B10b: populate `target_domain_module_id` on outbound 510. |

### Decisions

(empty until reviewed)

## 2026-06-02 — Audit (modularization)

### Summary

Phase M (Rule #14) executed: MA went from 0 `domain_modules` to **4 `module_kind='full'` modules**. The 4-module split is option (b) from the carried-over B2-M1 / B2-S1 recommendation (fold `MA-ATTRIBUTION` into campaign authoring; fold `MA-MOBILE-PUSH` into journey orchestration; keep `MA-LANDING-FORMS` separate from campaign authoring). Every existing capability is now realized by exactly one module (M4), every existing master sits in exactly one module as `role='master'` (M7), and every existing data_object is assigned to the module(s) it belongs to with its prior role + necessity preserved. No new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships were created in this pass; reused existing entities only.

Loader: [.tmp_deploy/modularize_ma_2026-06-02.ts](../../.tmp_deploy/modularize_ma_2026-06-02.ts) (gitignored, idempotent; re-run inserts 0 rows). Module ids assigned: MA-CAMPAIGN-AUTHORING 197, MA-JOURNEY-ORCH 198, MA-LEAD-SCORING 199, MA-LANDING-FORMS 200.

### Module split

| Module (code → id) | Capabilities | Data objects (role / necessity) |
|---|---|---|
| MA-CAMPAIGN-AUTHORING (197) | MA-EMAIL-CAMPAIGN (262), MA-AB-OPTIMIZATION (267), MA-GEN-AI-CONTENT (269), MA-ATTRIB-MEASURE (268) | marketing_campaigns (116, master/req), marketing_emails (117, master/req), crm_contacts (98, contributor/req), customer_events (111, contributor/req), audience_segments (113, consumer/req), customer_attributes (114, consumer/req) |
| MA-JOURNEY-ORCH (198) | MA-JOURNEY-ORCH (263), MA-MOBILE-PUSH (266) | nurture_journeys (119, master/req), customers (97, contributor/req), customer_events (111, contributor/req), audience_segments (113, consumer/req), customer_attributes (114, consumer/req) |
| MA-LEAD-SCORING (199) | MA-LEAD-SCORING (264) | lead_scores (118, master/req), crm_contacts (98, contributor/req), customer_events (111, contributor/req), customer_attributes (114, consumer/req) |
| MA-LANDING-FORMS (200) | MA-LANDING-FORMS (265) | marketing_forms (120, master/req), crm_contacts (98, contributor/req), customers (97, contributor/req) |

All 8 capabilities placed (M4 satisfied). All 5 masters single-mastered (M7): 116/117→197, 119→198, 118→199, 120→200. Contributors/consumers fan out to the modules that read them; roles + necessity copied verbatim from the prior `domain_data_objects` rollup (every prior row was `required`). No module is empty (M6: each has ≥1 capability and ≥1 master).

### Counts created

| Entity | Inserted |
|---|---|
| `domain_modules` (module_kind=full) | 4 |
| `domain_module_capabilities` | 8 |
| `domain_module_data_objects` | 18 (5 master, 7 contributor, 6 consumer) |

All `notes` columns left empty on every DMC and DMDO row (Rule #15). All inserts omit `record_status` (Rule #1, DB default `new`). `catalog_tagline` / `catalog_description` left empty on all 4 modules (deferred → M8/A4 gap, recorded below). No vendor/product names in any module name or description (Rule #18).

### Verification

- Re-run of the loader inserted 0 rows (idempotent on `domain_module_code`, `(domain_module_id, capability_id)`, `(domain_module_id, data_object_id)`).
- `/domain_modules?domain_id=eq.70` returns 4 rows, all `module_kind=full`, all with empty `catalog_tagline`/`catalog_description`.
- `/domain_module_capabilities` for 197-200 returns 8 rows covering capability ids 262-269 with no duplicate placement.
- `/domain_module_data_objects` for 197-200 returns 18 rows, all `notes=''`; the 5 master rows (116,117,118,119,120) each appear in exactly one module.

### Deferred gaps (not filled in this scope-limited pass)

- **M8 / A4 — per-module + domain catalog UX copy.** All 4 new modules ship with empty `catalog_tagline` / `catalog_description`; `domains.MA` catalog copy also still empty (carried `B1B-A4-CATALOG-UX`). Backfill is buyer-voice editorial requiring user approval (Rule #20); surfaced as `b1a` (B1A-M8-MODULE-UX) plus the existing `b1b`/`b2` A4 items.
- **Rule #17 / F2 / F3 — per-module system skills.** Each of the 4 modules now requires exactly one `system` skill with ≥1 `skill_tools` row. None exist; the legacy domain-anchored `ma-system` skill (id 17, `domain_module_id=null`, 12 skill_tools) is the seed to redistribute and then retire (carried `B1B-F1-LEGACY-SKILL`). Recorded as `b1a` (B1A-M-SYSTEM-SKILLS) per Rule #17 → F2/F3.
- **B10b handoff FK backfill (now unblocked).** The 8 outbound (`source_domain_module_id`) and 11 inbound (`target_domain_module_id`) NULL FKs can now be PATCHed against the real module ids. Provisional routing from the 2026-05-30 audit maps onto the final split: MA-CAMPAIGN-AUTHORING=197, MA-JOURNEY-ORCH=198, MA-LEAD-SCORING=199, MA-LANDING-FORMS=200 (note: the old provisional `MA-LANDING-PAGES` is this split's `MA-LANDING-FORMS` 200; `MA-ATTRIBUTION` was folded into 197, so handoff 506 routes to 197). Outside this pass's scope (handoffs not in scope); the dependent b1b items are now unblocked at the FK-target level.
- **B12 lifecycle states (now unblocked for module anchoring).** The 5 masters still carry 0 `data_object_lifecycle_states`; workflow-gate states now have real `domain_module_id` targets. Outside this pass's scope.
- **Missing-master candidates (b3, unchanged).** `marketing_email_sends`, `audience_lists`, `subscriber_preferences`, `ab_test_variants` → MA-CAMPAIGN-AUTHORING (197); `email_send_metrics` → MA-CAMPAIGN-AUTHORING (197, since MA-ATTRIBUTION folded in); `journey_step_events` → MA-JOURNEY-ORCH (198). Not created (scope: reuse existing entities only).

### Decisions

- Adopted the 4-module split (option b) as the realized architecture. This resolves B2-M1 in favor of (b) and supersedes the provisional 5-module `MA-ATTRIBUTION` / `MA-LANDING-PAGES` naming: attribution is a capability inside MA-CAMPAIGN-AUTHORING (197), and the forms module is `MA-LANDING-FORMS` (200).

## 2026-06-06 - b1a execution

Executed the agent-solvable `b1a` actions against the live `domain_map` module (org `adenin`, confirmed via `getCurrentUser`: `ma@adenin.com`). Loader: `.tmp_deploy/ma_b1a_execution_2026_06_06.ts` (idempotent, live-read guarded). All writes omit `record_status` (DB default `new`, Rule #1) and leave every `notes` column empty (Rule #15).

### B1A-B10b-OUTBOUND - DONE

PATCHed `source_domain_module_id` on 8 outbound MA handoffs (all prior value NULL):

| handoff | prior | new module |
|---|---|---|
| 60 | NULL | 199 (MA-LEAD-SCORING) |
| 84 | NULL | 199 |
| 507 | NULL | 199 |
| 509 | NULL | 199 |
| 510 | NULL | 199 |
| 69 | NULL | 198 (MA-JOURNEY-ORCH) |
| 74 | NULL | 198 |
| 508 | NULL | 200 (MA-LANDING-FORMS) |

Post-check: `/handoffs?id=in.(60,69,74,84,507,508,509,510)&source_domain_module_id=is.null` returns 0 rows.

### B1A-B10b-INBOUND - DONE

PATCHed `target_domain_module_id` on 11 inbound MA handoffs (all prior value NULL):

| handoff | prior | new module |
|---|---|---|
| 85, 90, 91, 94, 506 | NULL | 197 (MA-CAMPAIGN-AUTHORING) |
| 78, 232, 327, 328, 808, 811 | NULL | 198 (MA-JOURNEY-ORCH) |

Post-check: `/handoffs?id=in.(78,85,90,91,94,232,327,328,506,808,811)&target_domain_module_id=is.null` returns 0 rows.

### B1A-H1-APQC-TAGGING - DONE (with one documented skip)

INSERTed 17 `handoff_processes` rows, all `proposal_source='agent_curated'`, `role='implements'`, `record_status` defaulted to `new`, `notes` empty. Composed key `(handoff_id, process_id)` (unique, DB-enforced) deduped against the 6 pre-existing rows found at run time.

Inserts (handoff -> process_id): 60->709, 84->147, 507->709, 509->147, 510->147, 69->23, 74->23, 508->708, 85->1862, 90->23, 91->23, 94->23, 327->23, 328->23, 506->23, 808->23, 811->23.

REPLACE (232): the finding's premise matched live. SNAPSHOT of deleted row before DELETE: `handoff_processes id=129, handoff_id=232, process_id=641 (Acquire members to customer loyalty program, L4), proposal_source=discovery_substring, record_status=new`. Deleted id 129, inserted `232 -> 23 (Develop and manage marketing plans, L2), agent_curated, new`.

REPLACE (78): **SKIPPED.** Finding premise (existing tag = process 133, `discovery_substring`) is stale. Live state at run time: handoff 78 already carries `handoff_processes id=81, process_id=132 (Design and manage customer loyalty program, L3), proposal_source=agent_curated, record_status=new`. There was no `discovery_substring->133` row to replace. Re-pointing 78 to process 23 on a falsified premise is a judgment call beyond the action text (prompt Rule #12), and H1 coverage for 78 is already satisfied by the existing agent_curated row, so no write was made. Flag for user: decide whether 78 should also carry a `->23` tag or have its existing `->132` tag retargeted.

Additional note: the finding also claimed only "2 of 19" handoffs carried tags pre-run; live showed 6 (69->136, 74->136, 78->132, 232->641, 508->136, 808->665). The 3 extra agent_curated `->136`/`->665` rows (promotional-activity processes) were left untouched; the new `->23`/`->708` tags coexist with them under the composed key (a handoff may carry multiple process tags).

Post-check: all 19 cross-domain MA handoffs now have >=1 `handoff_processes` row (H1 coverage = 19/19).

### B1A-M-SYSTEM-SKILLS - DONE

Authored 4 per-module `skill_type='system'` skills (`skill_name='<module_code_lower>_agent'`, `domain_id=70`, `domain_module_id` set, `record_status` defaulted `new`, workflow-shaped descriptions, no vendor names per Rule #18, no em-dashes):

| skill id | skill_name | module |
|---|---|---|
| 343 | ma_campaign_authoring_agent | 197 |
| 344 | ma_journey_orch_agent | 198 |
| 345 | ma_lead_scoring_agent | 199 |
| 346 | ma_landing_forms_agent | 200 |

Re-pointed the 12 legacy `skill_tools` rows (ids 216-227) from legacy skill 17 to the owning module's skill via PATCH on `skill_id` (preserves `requirement_level`, per B2-SYSTEM-SKILL-SPLIT mapping: query/mutate route to the master's module; compute/side_effect route per channel/primitive):

| skill_tools id | tool (id) | -> skill (module) |
|---|---|---|
| 216 | query_campaigns (223, do 116) | 343 (197) |
| 217 | query_marketing_emails (224, do 117) | 343 (197) |
| 221 | create_campaign (255, do 116) | 343 (197) |
| 222 | send_marketing_email (256, do 117) | 343 (197) |
| 225 | send_email (37, side_effect) | 343 (197) |
| 227 | generate_text (49, compute, optional) | 343 (197) |
| 220 | query_nurture_journeys (227, do 119) | 344 (198) |
| 224 | update_nurture_journey (258, do 119) | 344 (198) |
| 218 | query_lead_scores (225, do 118) | 345 (199) |
| 223 | score_lead (257, do 118) | 345 (199) |
| 226 | classify_text (53, compute) | 345 (199) |
| 219 | query_forms (226, do 120) | 346 (200) |

Resulting per-module skill_tools counts: 197=6, 198=2, 199=3, 200=1 (all F3 pass, >=1). F4 invariant verified on every row: query/mutate tools all carry `data_object_id`; side_effect/compute tools all carry NULL `data_object_id`.

DELETE legacy skill 17 (`ma-system`). SNAPSHOT before DELETE: `skills id=17, skill_name=ma-system, skill_type=system, domain_id=70, domain_module_id=null, record_status=new, description="System skill for Marketing Automation ... email distribution is the core action."` (the row carried an em-dash in its description; it is now removed). Verified 0 remaining skill_tools on skill 17 before deletion. Post-check: `/skills?id=eq.17` returns 0 rows; F1 now passes (legacy domain-anchored skill retired).

### B1A-M8-MODULE-UX - DONE

Per revised Rule #20 (prompt Rule #6): wrote buyer-voice `catalog_tagline` + `catalog_description` directly into the EMPTY fields (empty-guard applied per field; all 10 fields were empty pre-write). No vendor/product names (Rule #18), no em-dashes. `record_status` carries the review signal (all rows `new`). Drafts were NOT parked in history; the copy lives in the records.

- Module 197 (MA-CAMPAIGN-AUTHORING): tagline + description written.
- Module 198 (MA-JOURNEY-ORCH): tagline + description written.
- Module 199 (MA-LEAD-SCORING): tagline + description written.
- Module 200 (MA-LANDING-FORMS): tagline + description written.
- domains.MA (70): tagline + description written.

Post-check: all 4 modules and domain 70 report `catalog_tagline` set and `catalog_description` set.

### Not in this pass

- 78 APQC replace (skipped, see above) - flagged for user.
- All `b1b` items (B12 lifecycle, B6/B7 relationships, B11 aliases, B4 pattern flags) remain blocked on `user_decision` per their `blocked_by`; not executed.

### UI spot-check links

- https://adenin.semantius.ai/domain_map/handoffs
- https://adenin.semantius.ai/domain_map/handoff_processes
- https://adenin.semantius.ai/domain_map/skills
- https://adenin.semantius.ai/domain_map/domain_modules

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

## 2026-06-08 - Review (Rule #21 additive execution)

Trigger: "review MA domain". Continued from `state.yaml` (status was `feedback_needed`). Confirmed
tenant `adenin` (`getCurrentUser` -> `ma@adenin.com`). Loader: `.tmp_deploy/ma_review_2026_06_08.ts`
(idempotent; re-run inserts 0). All inserts omit `record_status` (DB default `new`, Rule #1); all
`notes` left empty (Rule #15); no vendor/product names outside `data_object_aliases.alias_name`
(Rule #18); no em-dashes.

### Reframing that drove this pass

The 2026-05-30 / 05-31 / 06-02 audits parked B12 / B6 / B7 / B11 / B4 as `b1b` "blocked on user
wording". That was the pre-Rule-#21 interpretation. Under **Rule #21 + the CLAUDE.md project rule**,
lifecycle states, relationships, aliases, classification, and pattern flags are *additive/corrective*
work the agent EXECUTES now at `record_status='new'` for in-record review, not a chat gate. So this
review executed them rather than re-asking. Genuinely user-owned items (a destructive tag retarget)
stay in the q-file.

### Live-state reconciliation (F-band already migrated)

The per-domain-skill migration ran catalog-wide since 06-06: MA's 4 per-module skills (343-346) are
gone, replaced by ONE domain-grain skill `ma-system` (id 414, `domain_module_id=null`), and tools now
live on `domain_module_tools` (12 rows: 197=6, 198=2, 199=3, 200=1). `skill_tools` table dropped.
=> **F1/F2/F3/F4 now pass.** F5 Semantius score computable: **strict 10/12 = 0.83, operational 0.83**
(gap = `generate_text` id 49 + `classify_text` id 53, both external AI compute; expected for a
marketing domain). The state.yaml `B2-SYSTEM-SKILL-SPLIT-REVIEW` item is now stale (the 343-346 skills
it referenced no longer exist) and is removed.

### Executed this pass

| Band | Action | Result |
|---|---|---|
| B13 | Classify `entity_type` on 5 masters | campaigns 116 / emails 117 / journeys 119 / forms 120 -> `operational_workflow`; lead_scores 118 -> `computed` (derived score; no lifecycle, B12-exempt). All were `unclassified`. |
| B4 | Pattern-flag re-eval (PATCH default-false) | `has_submit_lock=true` on 116/117/119; `has_personal_content=true` on 120 (forms collect PII); 118 stays false (derived). |
| B12 | Lifecycle states on the 4 operational_workflow masters | 13 rows. campaigns draft->active(gate `launch_campaign`)->completed; emails draft->scheduled(gate `send_marketing_email`)->sent; journeys draft->active(gate `activate_nurture_journey`)->paused->completed; forms draft->published(gate `publish_form`)->archived. Each: 1 initial, 1 terminal, monotonic order, gate states carry `domain_module_id` (M5). |
| B6 | Intra-domain `data_object_relationships` | 5 rows: campaigns includes emails; campaigns includes journeys; journeys sends emails; forms feeds lead_scores; lead_scores triggers journeys. |
| B7 | `users` (748) actor edges (Rule #10) | 5 rows: users owns campaigns / authors emails / owns journeys / owns forms / configures lead_scores. |
| B11 | `data_object_aliases` | 12 rows, all `alias_type='synonym'` (cross-vendor terms, not tied to one `solution_id`; the `solution_term` type requires a Solution context per DB check). |
| E1-E3 | Personas + reach | 2 `domain_roles` (bf 54 Demand Generation): `DEMAND-GEN-MARKETING-OPS` (id 61, reach 197/198/199/200 primary), `DEMAND-GEN-CAMPAIGN-MANAGER` (id 62, reach 197/198 primary + 200 secondary). Both >=2 modules (E2), interaction_level set (E3). |

### Editorial deviation from the prior q-file recommendation

marketing_emails lifecycle was authored `draft -> scheduled -> sent` (NOT the q-file's proposed
`...-> sent -> unsubscribed`). "Unsubscribed" is a subscriber-consent action, captured by
trigger_event 518 (`marketing_email.unsubscribed`), not a state of the email record. The user can ask
to add it back; the rows are at `record_status='new'` for in-record review.

### Band status after this pass

A1-A4 pass (catalog copy written 06-06, `new`). M1-M8 pass (4 modules, caps mapped, copy written).
B1-B14 pass (B12 satisfied; lead_scores computed-exempt; B14: no statute-prefixed masters, all 5 are
vendor-universal -> stay `master+required`). C1-C2 pass. E1-E6 pass (E4 vacuous: no `process_id`-wired
gates yet). F1-F5 pass, F7 soft note: `send_email` (37) on module 197 is workflow-justified (email
delivery IS the marketing channel); per Rule #15 the justification is recorded here, not in `notes`.
H1: 19/19 cross-domain handoffs tagged (06-06). B10b: 0 NULL module FKs on the MA side.

### Open (waiting on user)

1. **B2-H1-78-FOLLOWUP** (genuine b2 + destructive option): handoff 78 (CDP `segment.activated` -> MA)
   carries `handoff_processes` id 81 -> process 132 (loyalty-program, agent_curated), which looks
   mismatched for a segment-activation handoff. Keep / retarget to 23 (delete + reinsert, destructive)
   / add 23 as a second tag. Surfaced in q-MA.md.
2. All freshly-authored content sits at `record_status='new'` for in-record approval (Rule #1).
3. b3 optional ideas unchanged (6 candidate entities, MA-COMPLIANCE module, 3 candidate domains, extra
   regulations). Non-blocking; MA already meets the module floor.

### UI spot-checks
- https://adenin.semantius.ai/domain_map/data_object_lifecycle_states
- https://adenin.semantius.ai/domain_map/data_object_relationships
- https://adenin.semantius.ai/domain_map/data_object_aliases
- https://adenin.semantius.ai/domain_map/domain_roles

## 2026-06-13 - B9d handoff-payload realization (both directions)

Trigger: "audit MA / run B9d". Continued from `state.yaml` (sole open agent item was
`B1A-B9D-VERIFY`). Tenant confirmed `adenin` (`getCurrentUser` -> `ma@adenin.com`). Executed via the
committed resolver `scripts/analytics/b9d_resolver.ts MA --dry-run` then `--write`. No catalog/DB
writes: B9d's additive output is owner-side `b2` + `q-` edits to local audit files; the destructive
re-points are held for sign-off.

Resolver classified all 23 boundary tags (both directions) into 16 distinct (process, owner)
findings: **11 ORPHAN, 5 RE-TAG (ROLL-UP)**. No MIS-TAG (every payload's APQC category fits an
endpoint family). No RESOLVED-with-persona yet (MA has personas but no `process_id`-wired gates, so
nothing is realized).

### ORPHANs routed to owners (additive b2 + q written into each owner's files)

| process | owner | payload(s) / handoffs |
|---|---|---|
| 23 Develop and manage marketing plans | HCMS (unbuilt) | content_entries / 94 |
| 23 Develop and manage marketing plans | LOYALTY (unbuilt) | loyalty_members / 232 |
| 23 Develop and manage marketing plans | B2C-COMM (built) | carts, checkouts, coupons / 327, 328, 506 |
| 132 Design and manage customer loyalty program | CDP (unbuilt) | audience_segments / 78 |
| 136 Develop and manage promotional activities | CDP (unbuilt) | customer_events / 74 |
| 147 Manage leads/opportunities | **MA (built)** | lead_scores / 510 |
| 665 Execute promotional activities | **MA (built)** | marketing_campaigns / 90, 91 |
| 665 Execute promotional activities | DXP (unbuilt) | digital_experiences / 808 |
| 708 Identify/receive leads/opportunities | CRM (unbuilt) | crm_leads / 508 |
| 709 Validate and qualify leads/opportunities | CRM (unbuilt) | crm_leads / 60, 507 |
| 1862 Collect and merge ... customer information | CRM (unbuilt) | crm_contacts / 85 |

Owner-file edits applied (additive, `record_status` untouched): new b2+q in HCMS, LOYALTY, B2C-COMM,
DXP, and CRM (B2-B9D-OWN-709, -1862); CDP (-132, -136) and CRM (-708) items already existed. The two
**MA-owned** ORPHANs were written into MA's own files as `B2-B9D-OWN-147` (candidate R/A: Marketing
Operations Manager, the only MA persona reaching MA-LEAD-SCORING) and `B2-B9D-OWN-665` (candidate R/A:
Campaign Manager, owns campaign execution in MA-CAMPAIGN-AUTHORING). q7/q8 wording de-templated to
name those personas. On the user's answer, additive `process_raci` is authored at `record_status='new'`.

### RE-TAG (ROLL-UP) re-points HELD for sign-off (destructive)

5 MA-published handoff tags carry a coarse APQC process while a finer one for the same entity exists:
69 (3.3 row 1025 -> 3.3.4 / on crm_leads slice 3.5.1.3), 74 (3.3 row 1026 -> 3.3.4), 84 (3.5.1 row
1022 -> 3.5.1.3), 508 (3.3.4 row 951 -> 3.5.1.3), 509 (3.5.1 row 1024 -> 3.5.1.3). Each is a
destructive overwrite of an existing `handoff_processes.process_id` (Rule #1 / #21), so surfaced as
`B2-B9D-RETAG-MA-SOURCE` (q-MA.md q9), not applied. The two non-MA-source RE-TAG rows (DXP-source 808/
811) belong to DXP and are not MA's to edit.

### state.yaml hygiene

`B1A-B9D-VERIFY` EXECUTED and removed; b1a/b1b now empty. `next_action_by` -> `user`. All remaining
items are user decisions (b2: H1-78, the 2 B9d ownership picks, the RE-TAG sign-off, plus the standing
record_status batch) or parked b3 ideas. No agent-executable work remains on MA.