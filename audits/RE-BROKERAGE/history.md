# RE-BROKERAGE audit history

Append-only. Each Validate b1 run gets its own dated section.

---

## 2026-05-29 — Validate b1 (structural + market) full pass

### Scope

Domain 143 (`RE-BROKERAGE`, "Real Estate Brokerage and Agent Operations"). Modules 151 RE-BROK-AGENT-OPS (full), 152 RE-BROK-BROKERAGE-OPS (full), 153 REAL-ESTATE-AGENT (starter, cross-cutting host).

### Pass 1 — Structural (per-domain completeness checklist)

**Bands passing on first read:** A1, A2, A3, M1, M2, M4, M5, M6, B1, B2, B3, B4, B5, B6, B7, B8 (vacuous), B12, C1, F1, F2, F3, F4, F5.

**Bands failing on first read, all fixed in this pass:**

| ID | Finding | Fix |
|---|---|---|
| G1 / M7 | Within-domain master/contributor incoherence on 3 data_objects: transactions and disclosures master in 151 + contributor in 152; commissions master in 152 + consumer in 151 | Converted all 3 sibling rows to `embedded_master` (autonomous-deployable-units pattern). DMDOs 778, 780, 781 patched. |
| G2 / B9b | 0 intra-domain cross-module handoffs between 151 and 152 | Loaded 3 new `handoffs` rows (1328 / 1329 / 1330) with `integration_pattern=lifecycle_progression`: AGENT-OPS → BROKERAGE-OPS on `real_estate_transaction.contingencies_cleared`; BROKERAGE-OPS → AGENT-OPS on `cleared_to_close`; BROKERAGE-OPS → AGENT-OPS on `commission_split.paid`. |
| G3 / B10b | 6 outbound handoffs (296, 297, 308, 311, 861, 862) had NULL `source_domain_module_id` | All 6 patched to module 151 via the deterministic backfill recipe (trigger_event.data_object_id resolves to a master in 151). |
| G4 / B11 | 0 aliases on all 5 masters | 12 aliases loaded (ids 929-940). Industry context (Real Estate, id 15) bound to every `industry_term` row. |
| G5 | 6 of 7 trigger_events had empty `event_category` | All 6 set to `lifecycle` per Rule #13. |
| G6 / H1 | 0/6 cross-domain handoffs had APQC mapping | 6 `handoff_processes` rows loaded with `proposal_source=agent_curated`, `record_status=new`. PCF mappings: 296 / 297 / 861 / 862 → PCF 10192 "Close the sale"; 308 → PCF 18115 "Validate and qualify leads/opportunities"; 311 → PCF 20114 "Submit regulatory reports". User to review. |
| G7 / E2+E5 | All 4 roles had Path A/B divergence; SALES-LISTING-AGENT and SALES-BUYER-AGENT violated 2-module floor | 6 `role_modules` rows added at `interaction_level=secondary` aligning each role's declared module set with its permission bundle. Same patch cures the 2-module floor for the IC roles. |
| G8 / Rule #15 | 7 of 7 `domain_data_objects.notes` populated with restated-schema prose; 3 outbound handoffs (296 / 297 / 308) also had notes (one with an em-dash, CLAUDE.md violation) | All 10 notes wiped to `""`. Tour-appointment "Showing schedule" content captured properly via the new alias row. |

### Pass 1 — Report-only follow-ups (owed by other domains)

- **B10 inbound from CRM.** RE-BROKERAGE is `contributor + required` on `crm_contacts` and `crm_leads`. CRM publishes `crm_contact.synced`, `crm_lead.scored_above_threshold`, `crm_lead.converted`, none targeting 143. Owed by CRM-LEAD-MGT.B9 / CRM-ACCT-MGT.B9. Surfaced for a future CRM audit.

### Pass 2 — Semantic market audit (P1)

Subagent ran a vendor-surface audit against the 6 flagship solutions (Lone Wolf Foundation, kvCORE, Follow Up Boss, BoomTown, Dotloop, SkySlope). Working file: `c:/tmp/RE-BROKERAGE-market-surface-2026-05-29.md`.

**Headline result:** 9 MISSING entities, 0 WRONG-OWNERSHIP, 0 SCOPE-CREEP, MODULARIZATION axis correct.

**Compliance-cluster gap dominates.** Five missing entities (`listing_agreements`, `buyer_representation_agreements`, `compliance_checklists`, `referral_agreements`, `escrow_accounts`/`escrow_deposits`) are all carried by the three back-office vendors (LWF, Dotloop, SkySlope) and absent from the catalog. Without `compliance_checklists`, RE-BROK-BROKERAGE-OPS is structurally a commission calculator without the differentiator the transaction-management category exists for.

**CRM-vendor cluster gap.** `open_houses`, `agent_pipelines`, `mls_syndication_logs` carried by kvCORE / FUB / BoomTown but absent. The RE-BROK-MLS-SYNDICATION capability has no backing entity.

**Highest urgency:** `buyer_representation_agreements`. Legally mandatory in most US states post-NAR-settlement (Aug 2024); without it the catalog cannot model post-settlement commission flows.

**Recommended next loads (priority order):**

1. `buyer_representation_agreements` (legal-mandate)
2. `listing_agreements` (paired contract)
3. `compliance_checklists` (the entire reason transaction-management vendors exist)
4. `escrow_accounts` + `escrow_deposits` (state-regulated, broker license risk)
5. `referral_agreements` (commission_splits dependency)
6. `open_houses` (lead-gen surface, distinct from `tour_appointments`)
7. `mls_syndication_logs` + `mls_feeds` (MLS-SYNDICATION capability backing)
8. `agent_pipelines` (productivity model, lower urgency, can be approximated)

### Pass 3 / Pass 4 — Neighbor discovery + pairwise reconciliation

Not yet run. Auto-discovered neighbors by edge weight:

| Neighbor | Weight | Edges |
|---|---|---|
| CRM (69) | high | 1 outbound + 3 owed-inbound + contributor on 2 masters |
| RE-CRE (145) | medium | 2 outbound (`transaction.closed`, `listing.sold`) |
| RE-PROP-MGMT (144) | low | 1 outbound (`transaction.closed`) |
| RE-INVEST (146) | low | 1 outbound (`listing.sold`) |
| GRC (15) | low | 1 outbound (`disclosure_documents`) |
| CLM (26) | low | via REAL-ESTATE-AGENT starter (CLM-REPOSITORY) |

CRM warrants the deep pairwise pass when scheduled.

### Open follow-ups (carried forward)

- Pass 2 MISSING list above (8 priority loads).
- Pass 4 pairwise reconciliation against CRM.
- CRM B9 owes inbound handoffs to RE-BROKERAGE on lead/contact events.
- O1 trigger-event coverage: 13 new lifecycle/state_change events loaded (ids 1443-1455). Several have no outbound subscribers yet (e.g. `listing.under_contract`, `tour.no_show`); they exist for downstream Phase D / handoff authoring.

---

## 2026-05-31, Audit

### Summary

Validate b1 structural re-audit of domain 143 (RE-BROKERAGE). All structural bands from the 2026-05-29 fix pass remain green. Two content-quality bands fail: A4 (`domains.catalog_tagline` / `catalog_description` empty) and M8 (same fields empty on every module). Three report-only B10 / B10b items remain owed by neighbor domains. The H1 APQC tags loaded 2026-05-29 still sit at `record_status='new'`, awaiting human approval (this is correct under Rule #1, not a defect). Phase 0 market gaps from the 2026-05-29 semantic pass are carried forward in Bucket 3.

- Current footprint: 5 masters (`real_estate_listings`, `real_estate_transactions`, `commission_splits`, `tour_appointments`, `disclosure_documents`); 6 capabilities; 6 solutions; 3 modules (151 RE-BROK-AGENT-OPS full, 152 RE-BROK-BROKERAGE-OPS full, 153 REAL-ESTATE-AGENT starter); 4 roles; 3 system skills (217, 218, 220); 9 outbound handoffs (6 cross-domain + 3 intra-domain); 21 trigger_events; 12 aliases; 28 lifecycle_states; 11 data_object_relationships including 7 to `users`.
- Bands passing: A1, A2, A3, M1, M2, M4, M5, M6, M7, B1, B2, B3, B4, B5, B6, B7, B8, B9, B9b, B11, B12, C1, E1, E2, E3, E4, E5, F1, F2, F3, F4, F5, H1 (coverage).
- Bands failing: A4 (catalog_tagline / catalog_description empty), M8 (same on all 3 modules), B10b report-only (target NULL on 5 outbound owed by other domains).
- Bucket 1 (in-scope, agent fixable): 0
- Bucket 2 (surface-for-user, judgment): 2
- Bucket 3 (Phase 0 pending, speculative): 1 (carried forward, 10 candidate entities)

### Per-band results

| Band | Status | Note |
|---|---|---|
| S1 | pass | All non-zero expected FKs to domains populated. |
| S2 | pass | Each of 151 / 152 / 153 has DMDOs + capability links. |
| S3 | pass | Per-master: states + events + aliases all populated. |
| A1 | pass | All 7 business-metadata fields populated; `crud_percentage=80`, market 1200 USD M (2024). |
| A2 | pass | 6 capabilities (lead capture, transaction mgmt, MLS syndication, commission splits, tour scheduling, agent CRM). |
| A3 | pass | 6 primary solutions (Lone Wolf Foundation, kvCORE, Follow Up Boss, BoomTown, Dotloop, SkySlope). |
| A4 | fail | `catalog_tagline` and `catalog_description` both empty on the domain. Drafts must be surfaced before write per Rule #20. |
| A5 | skip | Vendor ownership refresh not requested. |
| M1 | pass | 2 full + 1 starter module on this domain. |
| M2 | pass | 6 capabilities and 2 full modules satisfy the floor. |
| M4 | pass | Each of the 6 RE-BROK capabilities has at least one realizing module. |
| M5 | pass | Workflow-gate states either set `domain_module_id` to 151 / 152 or NULL where always-reachable. |
| M6 | pass | Every module realizes at least one capability (151: 5, 152: 3, 153: 8). |
| M7 | pass | All 5 masters have exactly one canonical master row; sibling rows resolved to `embedded_master` per 2026-05-29 fix. |
| M8 | fail | All 3 modules (151, 152, 153) have empty `catalog_tagline` and `catalog_description`. Drafts must be surfaced before write per Rule #20. |
| B1 | pass | 5 masters. |
| B2 | pass | Labels populated on all 5. |
| B3 | pass | All names prefixed; no bare-word arbitration needed. |
| B4 | pass | Pattern flags considered on all 5 (4 of 5 carry at least one true flag). |
| B5 | pass | Embedded masters resolve: `crm_contacts` and `crm_leads` master in CRM (69); `legal_contracts` master in CLM (66); `users` is platform_builtin; intra-domain embedded_masters resolve to siblings 151 / 152. |
| B6 | pass | 4 intra-domain relationship rows cover the main workflow chain. |
| B7 | pass | 7 `users` edges spanning all 5 masters. |
| B8 | pass | Outbound cross-domain relationship rows present where payload mapping is clean (no MISSING-RELATIONSHIP findings). |
| B9 | pass | 21 trigger_events on RE-BROKERAGE masters; every published state has at least one handoff or is a Phase D candidate carried forward. |
| B9b | pass | 3 intra-domain lifecycle_progression rows (1328 / 1329 / 1330) cover 151 to 152 (contingencies_cleared) and 152 to 151 (cleared_to_close, commission_split.paid). |
| B10 | report-only | RE-BROKERAGE contributor on `crm_contacts` and `crm_leads`; zero inbound handoffs from CRM. CRM B9 owes outbound on lead and contact state-change events. |
| B10b | report-only | 5 outbound handoffs (296, 297, 311, 861, 862) carry NULL `target_domain_module_id`. Target side is owed by RE-PROP-MGMT (144), RE-CRE (145), GRC (15), RE-INVEST (146). RE-BROKERAGE's own `source_domain_module_id` is set on all 6 outbound. |
| B11 | pass | 12 aliases across the 5 masters (synonyms + industry terms). |
| B12 | pass | All 5 masters carry lifecycle states (6 / 8 / 5 / 5 / 4); workflow-gate states carry `domain_module_id` and `permission_verb_override`. |
| C1 | pass | Sales owner, Marketing contributor, Accounting consumer. |
| C2 | n/a | No capability-level RACI divergence flagged. |
| E1 | pass | 4 roles touching the domain's modules (Listing Agent, Buyer Agent, Transaction Coordinator, Designated Broker). |
| E2 | pass | Every role has at least 2 `role_modules` rows. |
| E3 | pass | `interaction_level` set on every row (mix of primary and secondary). |
| E4 | pass | Every role has 3 permission bundle rows. |
| E5 | pass | Path A and Path B agree on every role's reachable domain set. |
| F1 | pass | Zero legacy domain-level system skills. |
| F2 | pass | 3 system skills (217, 218, 220), one per module. |
| F3 | pass | skill 217 has 21 `skill_tools`; 218 has 10; 220 has 20. |
| F4 | pass | `query` and `mutate` rows carry `data_object_id`; `side_effect` and `compute` rows have NULL. |
| F5 | pass | Per-module strict Semantius scores: 151 = 17 / 21 = 80.95 percent, 152 = 8 / 10 = 80 percent, 153 = 17 / 20 = 85 percent. Non-platform tools by name: `sign_document` (42), `syndicate_to_mls` (1167), `match_listing_to_buyer_preferences` (1168), `generate_text` (49), `notify_team` (914). |
| H1 | pass coverage; awaiting approval | 6 cross-domain handoffs, 7 `handoff_processes` rows (handoff 297 carries 2 tags). All `proposal_source='agent_curated'`, `record_status='new'`. Coverage 100 percent (above 0.5N to 0.8N expected for new tags); approval count 0 (still pending review). |

### Bucket 1, In-scope confirmed gaps

None. The two content-quality fails (A4 and M8) route to Bucket 2 because Rule #20 requires draft and surface before write. The agent cannot apply the fix directly without prior approval.

### Bucket 2, Surface-for-user (judgment calls)

1. **A4 + M8: catalog UX fields on RE-BROKERAGE and its 3 modules are empty.** Both `domains.catalog_tagline` and `domains.catalog_description` are empty on row 143. Same on `domain_modules` 151, 152, 153. Rule #20 requires draft and surface in buyer voice (workflow plus value, not analyst voice) and explicit user approval before write. Options: (a) agent drafts the 4 module slots and 1 domain slot in buyer voice for review, (b) author manually, (c) defer until catalog UX rollout. Independent of Bucket 3.
2. **H1 approval pass.** All 7 `handoff_processes` rows from the 2026-05-29 fix are `record_status='new'` and `proposal_source='agent_curated'`. Headline catalog quality (approved count) is 0 of 7. Options: (a) approve all 7 after spot-check, (b) approve subset, (c) defer review. Specific tags: 296, 297, 861, 862 -> PCF 10192 (Close the sale); 297 also -> PCF 11052 (Negotiate and document agreements); 308 -> PCF 18115 (Validate and qualify leads); 311 -> PCF 20114 (Submit regulatory reports). Independent of Bucket 3.

### Bucket 3, Phase 0 pending (speculative)

1. **Phase 0 market gaps from 2026-05-29 semantic pass remain unloaded.** The earlier pass identified 9 MISSING entities backed by the 6 flagship vendors. Carried forward: `buyer_representation_agreements` (legal mandate post NAR settlement Aug 2024), `listing_agreements`, `compliance_checklists`, `escrow_accounts`, `escrow_deposits`, `referral_agreements`, `open_houses`, `mls_syndication_logs`, `mls_feeds`, `agent_pipelines`. Vendor evidence: Lone Wolf Foundation, Dotloop, SkySlope cover the compliance and escrow cluster; kvCORE, Follow Up Boss, BoomTown cover the CRM-vendor cluster (`open_houses`, `agent_pipelines`, MLS feeds and logs). Options: (a) vetted route, run focused Phase 0 verification before drafting Phase B inserts, (b) eyeball route, name which candidates ring true, (c) defer.

### Report-only follow-ups (owed by other domains)

- CRM B9: owes outbound handoffs to RE-BROKERAGE on `crm_contact.synced`, `crm_lead.scored_above_threshold`, `crm_lead.converted` (RE-BROKERAGE consumes both as contributor + required).
- RE-PROP-MGMT B10b: owes `target_domain_module_id` PATCH on handoff 296 (target NULL; `real_estate_transaction.closed`).
- RE-CRE B10b: owes `target_domain_module_id` PATCH on handoffs 297 (`real_estate_transaction.closed`) and 861 (`listing.sold`).
- GRC B10b: owes `target_domain_module_id` PATCH on handoff 311 (`real_estate_transaction.closed` payload `disclosure_documents`).
- RE-INVEST B10b: owes `target_domain_module_id` PATCH on handoff 862 (`listing.sold`).
- Pairwise reconciliation against CRM still warranted (high-weight neighbor) when CRM is next audited.

### Decisions

None this run. Buckets surfaced; awaiting user input per the explicit-prompt discipline.

### Fixes applied

None this run. Read-only Validate b1 pass.

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

---

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate execute pass over RE-BROKERAGE (domain 143). Worked only the open
items in state.yaml; no fresh from-scratch audit. Live footprint reconfirmed: 2 modules
hosted on 143 (151 RE-BROK-AGENT-OPS full, 152 RE-BROK-BROKERAGE-OPS full). Module 153
REAL-ESTATE-AGENT is now a cross-cutting starter (`domain_id=null`) hosted on 143 via
`domain_module_host_domains` alongside CRM (69) and CLM (26); it is still one of this
domain's catalog surfaces. C1 (business_function_domains) was already satisfied (owner Sales
21, contributor Marketing 22, consumer Accounting 42, all `record_status='new'`); no C1 work
needed. Two additive/corrective item families executed; three families surfaced for the user;
b1b and b3 left as-is.

### Executed (additive/corrective, record_status untouched -> rows stay 'new')

- **B1A-ENTITY-TYPE (B13): 5 masters PATCHed `entity_type` unclassified -> `operational_workflow`.**
  real_estate_listings (352), real_estate_transactions (353), commission_splits (354),
  tour_appointments (355), disclosure_documents (356). Each already carries a lifecycle-state
  set (4 to 8 states, verified live), so operational_workflow is the deterministic
  classification; no audit-fail risk. This was a fill of the unclassified audit-failure
  default, not an overwrite of a real value.
- **B2-CATALOG-UX (A4 + M8): 4 rows backfilled with buyer-voice catalog_tagline + catalog_description.**
  Domain 143 (1 row), modules 151, 152, and 153 (3 rows). All eight columns were empty;
  written per Rule #20 revised (write empty fields straight in, never overwrite a non-empty
  value). Module 153 copy is domain-neutral because it is cross-cutting across three host
  domains. No vendor names, no em-dash, American English.

### Surfaced (returned to user; not applied)

- **B1A-SELF-CONTAIN (M9) -> reclassified to b2 (DESTRUCTIVE).** DMDO 777 (crm_contacts) and
  DMDO 776 (crm_leads) on module 151 are role=contributor / necessity=required against
  CRM-mastered entities. Fixing either by converting to embedded_master or relaxing necessity
  overwrites the role/necessity on an existing row, which is a destructive edit the agent does
  not apply unapproved. Surfaced as a per-row decision.
- **B2-H1-APPROVAL.** 7 `handoff_processes` tags (ids 187-192, 457) confirmed live, all
  `proposal_source='agent_curated'`, all `record_status='new'`, PCF mappings match the recorded
  assignments exactly. H1 coverage passes; approved count is 0/7 only because Rule #1 forbids
  the agent stamping `approved`. Surfaced for user sign-off.
- **B1A-PHASE-P (Personas / RACI) DEFERRED.** Not authored this pass (Phase-P discipline).
  Candidate operational personas: Listing Agent, Buyer Agent, Transaction Coordinator,
  Designated Broker. Bring to a dedicated Phase-P run.

### Left (untouched)

- **b1b (5 items): blocked on other domains.** B1B-CRM-INBOUND (CRM B9 owes inbound handoffs
  on contact/lead events); B1B-RE-PROP-MGMT-B10B (handoff 296 target NULL); B1B-RE-CRE-B10B
  (297, 861); B1B-GRC-B10B (311); B1B-RE-INVEST-B10B (862). All clear when the named neighbor
  domain finishes its B9 / B10b sweep.
- **b3: B3-PHASE0-MARKET-GAPS.** 10 candidate entities (compliance + MLS clusters) carried in
  the ideas backlog; non-blocking, never gates "finished".

### Fixes applied / files

- Loader: `.tmp_deploy/2026-06-07_re_brokerage_state_execute.ts` (idempotent, verify-live-then-write).
- DB writes verified post-run (entity_type and catalog UX both confirmed landed).

### Post-fix status

`next_action_by: user`. All agent-doable additive/corrective work is done. Remaining open items
are user decisions (b2 + destructive M9 + persona Phase-P) or blocked on neighbor audits (b1b).
