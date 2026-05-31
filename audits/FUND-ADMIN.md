---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 26
---

# FUND-ADMIN Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 10 master entities across 4 modules (`FUND-ADMIN-FUND-LEDGER`, `FUND-ADMIN-LP-COMMITMENTS`, `FUND-ADMIN-CAPITAL-CALLS`, `FUND-ADMIN-DISTRIBUTIONS`); 8 capabilities (7 domain-prefixed + 1 cross-cutting `APPROVAL-WORKFLOW`); 5 solutions (4 primary + 1 secondary); 0 regulations linked; 5 trigger_events; 3 outbound + 4 inbound cross-domain handoffs; 0 intra-domain handoffs; 0 roles + 0 role_modules + 0 role_permissions; 0 system skills + 0 skill_tools links.
- Vendor-surface basis: Allvue Systems, eFront (BlackRock), Juniper Square, Carta Fund Admin, Carta Cap Table (secondary). Cross-checked against SS&C GlobeOp, Citco, Apex Group, AlterDomus, IQ-EQ (third-party fund-administrator services) and Pregin Pro Reporting / Confluence Unity / Vermilion (regulatory-reporting specialists).
- Catalog UX fields: empty (`catalog_tagline=''`, `catalog_description=''`).
- Domain Semantius score: **uncomputable**, F2/F3 fail (zero system skills across all 4 modules).
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 6 items.

Structural pass: A1 + A2 + A3 + A4 partial fail; M1 + M2 + M4 + M6 pass; M5 + M7 partial fail; B1 + B2 + B3 + B6 + B11 pass; B4 (pattern flags) partial pass; B7 + B8 + B9 + B9b + B10b + B12 partial fail; C1 pass; D1 deferred; E1 through E6 all fail (zero roles loaded); F1 + F4 vacuously pass; F2 + F3 + F5 + F7 fail; H1 fails (1 of 7 cross-domain handoffs tagged, and the tag is `discovery_substring`, not `agent_curated`).

### Vendor surface basis

Flagship picks deliberately mix three sub-segments:

- **Pure-play software platforms**, Allvue (front-to-back private capital), eFront (BlackRock, GP/LP integrated suite), Juniper Square (LP-portal-led), Carta (cap-table-led extension into fund admin).
- **Third-party fund administrators (TPA) as software shape**, SS&C GlobeOp, Citco Fund Services, Apex Group, AlterDomus, IQ-EQ. TPAs run their own platforms but their software footprint covers what an in-house GP would build; their schemas are the canonical reference for "what a holistic fund-admin system masters".
- **Adjacent regulatory-reporting specialists**, Confluence Unity, Vermilion, DiligentRegtek, Pregin Pro Reporting. These vendors sit adjacent to fund admin proper and surface what is currently in scope vs. genuinely separate-market.

### Bucket 1: In-scope confirmed gaps

#### MISSING (compliance-mandated regulations and references)

| ID | Entity | Proposed module | Notes |
|---|---|---|---|
| B1-M1 | `regulations` rows for AIFMD, SEC Marketing Rule, ILPA Reporting Standards, FATCA, CRS, and the Cayman Mutual Funds Law | n/a (catalog-level) | `domain_regulations` for FUND-ADMIN is empty. AIFMD (EU Directive 2011/61/EU) governs depositary + reporting; SEC Marketing Rule (Rule 206(4)-1) governs LP-facing performance reporting; ILPA Reporting Standards (capital-call notice templates, distribution notices); FATCA + CRS govern LP tax-status collection during KYC. Existing in catalog or net new (verify against `/regulations` before insert). |
| B1-M2 | `domain_regulations` rows linking FUND-ADMIN to AIFMD, SEC-MKT-RULE, ILPA, FATCA, CRS | n/a (link) | After B1-M1 lands, attach the six rows with `applicability` set per regulation. AIFMD is mandatory for EU-domiciled funds; FATCA + CRS are mandatory for every fund accepting US/CRS-reportable LP capital. |

#### MISSING (workflow substrate the current footprint omits)

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-W1 | `subscription_documents` | FUND-ADMIN-LP-COMMITMENTS | Universal in Juniper Square, Allvue, Carta. Subscription docs are the legal artifact of `lp_subscriptions`; PDF blobs + version history; cannot be folded into `lp_subscriptions` because docs persist across amended subscriptions. |
| B1-W2 | `lp_kyc_records` | FUND-ADMIN-LP-COMMITMENTS | Universal. KYC/AML output + sanction-screening trail; required at subscription time and re-screened periodically. Distinct from `lp_subscriptions` (which is the legal commitment). |
| B1-W3 | `distribution_notices` | FUND-ADMIN-DISTRIBUTIONS | Universal. The LP-facing notice is a separately-stored artifact with publication timestamps; ILPA template format. |
| B1-W4 | `capital_call_notices` | FUND-ADMIN-CAPITAL-CALLS | Universal. Analogous to `distribution_notices`; the LP-facing notice document, separate from the `capital_calls` event row. |

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `domains.catalog_tagline` and `catalog_description` are empty strings on FUND-ADMIN. Per Rule #20 buyer-voice surface is required; absence blocks the catalog UX. | Draft `catalog_tagline` (single-sentence buyer-voice one-liner) + `catalog_description` (1-3 buyer-voice paragraphs covering workflow + value). Surface to user BEFORE writing per A4 fix discipline. |
| B1-S2 | B4 | Pattern flags considered, but the audit pass requires positive re-evaluation. `funds`, `fund_distributions`, `capital_calls`, `waterfall_calculations` all default-false on all three flags; `lp_subscriptions` has `has_personal_content=true` + `has_submit_lock=true`; `lp_commitments` has `has_personal_content=true`; `pcap_statements` has `has_submit_lock=true`. Re-evaluate: `capital_call_notices` and `distribution_notices` (once loaded per B1-W3/W4) need `has_submit_lock=true`; `waterfall_calculations` needs `has_single_approver=true` (CFO sign-off before notice publishes). | PATCH flags after re-confirmation; record the audit pass in the audit decisions, not in `notes` (Rule #15). |
| B1-S3 | B7 | Six masters with user-typed actors lack explicit `→ users` edges in `data_object_relationships`: `fund_ledger_entries` (poster), `fund_close_periods` (closer + approver), `lp_subscriptions` (onboarder + reviewer), `pcap_statements` (preparer + approver), `capital_call_responses` (booker), `waterfall_calculations` (calculator + approver). Existing user edges cover `funds`, `lp_commitments`, `capital_calls`, `fund_distributions` only. | Author 6 edges per Rule #10 into `data_object_relationships` with `related_data_object_id=748` and verb describing actor role. |
| B1-S4 | M5 | All 13 `data_object_lifecycle_states` rows for FUND-ADMIN masters have `domain_module_id=NULL`. Two states are `requires_permission=true` (`funds.final_close` → module 12, `fund_distributions.declared` → module 15). FUND-ADMIN is a 4-module domain; the workflow-gate permissions need module attribution to materialize with the right `<domain_module_code>:` prefix. | PATCH `domain_module_id` per the mastering module on every state row: `funds` states → 12, `lp_commitments` states → 13, `fund_distributions` states → 15. The non-gate states benefit from attribution too even when `requires_permission=false`. |
| B1-S5 | M7 | `capital_calls` (id 367) and `fund_distributions` (id 368) carry legacy `domain_data_objects.role='master'` rows on **both** FUND-ADMIN (domain 160) and RE-INVEST (domain 146). At the module level only FUND-ADMIN modules master them; RE-INVEST has zero modules loaded so the legacy domain-level row is pre-modular drift. | This is a RE-INVEST audit fix in scope (RE-INVEST owes either modules that master these entities, or the legacy rows need DELETE). Report-only on the FUND-ADMIN side; included in the report-only follow-ups section. |

#### MISSING (lifecycle states + trigger events)

| ID | Master | Missing states | Missing events |
|---|---|---|---|
| B1-L1 | `lp_subscriptions` (758) | drafted, submitted, kyc_passed, executed, withdrawn | `lp_subscription.submitted`, `lp_subscription.executed` |
| B1-L2 | `pcap_statements` (760) | drafted, reviewed, published | `pcap_statement.published` |
| B1-L3 | `capital_calls` (367) | drafted, issued, funded, closed | event for `.drafted` is missing; `.issued` and `.funded` exist |
| B1-L4 | `fund_close_periods` (757) | open, soft_closed, reviewed, locked | `fund_close_period.locked` |
| B1-L5 | `capital_call_responses` (761) | scheduled, paid, partial, defaulted | `capital_call_response.paid`, `capital_call_response.defaulted` |
| B1-L6 | `waterfall_calculations` (762) | drafted, reviewed, approved | `waterfall_calculation.approved` |
| B1-L7 | `fund_ledger_entries` (756) | exemption candidate (config-shape per Rule #12) | Surface exemption to user during fix-loop, not in `notes`. |

#### BOUNDARY

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-B9b | B9b | FUND-ADMIN has 4 modules and zero intra-domain `handoffs` rows. From the relationship graph, expected intra-domain handoff candidates exist on at least these pairs: (FUND-LEDGER → LP-COMMITMENTS) via `fund.final_close` (funds master → lp_subscriptions/lp_commitments writable); (LP-COMMITMENTS → CAPITAL-CALLS) via `lp_commitment.committed` triggering the first call schedule; (CAPITAL-CALLS → LP-COMMITMENTS) via `capital_call.funded` advancing `lp_commitments.called` state; (DISTRIBUTIONS → LP-COMMITMENTS) via `fund_distribution.executed` updating `lp_commitments.distributed`; (DISTRIBUTIONS → FUND-LEDGER) via the GL posting for the distribution. | Draft 5 intra-domain handoff rows with `source_domain_id = target_domain_id = 160`, `integration_pattern = lifecycle_progression`, `friction_level = low`. Each row needs the cross-module event already in `trigger_events` or a new one (Phase B9 + B9b co-load). |

#### APQC TAGGING

**Coverage (catalog quality):** 0 of 7 cross-domain handoffs have a `record_status='approved'` `handoff_processes` row.
**Provenance (process health):** 1 of 7 has any tag at all, and it is `discovery_substring` `proposal_source` (handoff 1040 → APQC `10737 Manage international funds/consolidation`, a generic level-2 match).

`agent_curated` proposals (B1-H1, one sub-table per handoff):

| Sub-id | Handoff | Direction | Trigger | Payload | Proposed APQC | PCF id | Confidence |
|---|---|---|---|---|---|---|---|
| B1-H1a | 1040 | FUND-ADMIN-FUND-LEDGER → INV-CRM | `fund.final_close` | `lp_prospects` | `10737 Manage international funds/consolidation` (existing tag superseded) AND/OR `10751 Perform capital planning and project approval` (closer fit for "fund close locks the commitment book") | 63 / 310 | medium, APQC PCF has no direct private-capital fund-formation row; `10751` covers the LP-prospect-to-investor crossover better than `10737`. Recommend authoring under PCF and deferring to Pass 3 review. |
| B1-H1b | 1041 | FUND-ADMIN-CAPITAL-CALLS → INV-CRM | `capital_call.issued` | `lp_commitments` | `10911 Process and oversee debt and investment transactions` | 1480 | high, capital calls are explicit "debt and investment transactions" against partner equity. |
| B1-H1c | 1042 | FUND-ADMIN-DISTRIBUTIONS → PORT-MONIT | `fund_distribution.executed` | `fund_performance_periods` | `10862 Process and distribute payments` | 1422 | high, direct PCF coverage of distribution payment processing. |
| B1-H1d | 1043 | PORT-MONIT → FUND-ADMIN-LP-COMMITMENTS | `portco_valuation.final` | `pcap_statements` | `10730 Perform general accounting and reporting` | 56 | medium, valuation-driven PCAP marks are quarterly accounting refreshes. |
| B1-H1e | 1044 | CAP-TABLE → FUND-ADMIN-DISTRIBUTIONS | `exit_scenario.executed` | `fund_distributions` | `10912 Process and account for debt and investment` *(verify external_id; may be 10911 + 10913)* | (verify) | medium, exit triggers distribution waterfall. |
| B1-H1f | 1038 | INV-CRM → FUND-ADMIN-CAPITAL-CALLS | `vc_deal.closed` | `capital_calls` | `10751 Perform capital planning and project approval` | 310 | medium, deal-close-to-call is the investment-decision-to-funding handoff. |
| B1-H1g | 1046 | EM-FUND-PLATFORM → FUND-ADMIN-FUND-LEDGER | `fund_formation.operational` | `funds` | `10737 Manage international funds/consolidation` | 63 | low, generic match; better candidate would be a Phase 0 search for a fund-launch PCF row. |

Deferred to Discover Pass 3 (none): every cross-domain handoff has an agent-curated proposal above; the user can approve, override, or defer per row. Volume against the 0.5N to 0.8N target (N=7 cross-domain handoffs): **7 proposals**, i.e. 1.0N, at the upper end, deliberately so because the H-band was empty.

### Bucket 2: Surface-for-user (judgment calls)

1. **Catalog UX content (A4).** `catalog_tagline` and `catalog_description` are empty. Per Rule #20 the agent drafts buyer-voice copy + surfaces for review before writing. Draft proposal: tagline = *"Run private-capital funds end-to-end: LP onboarding, capital calls, partner accounting, and waterfall distributions, on the same general ledger."* Description (1-3 paras) needs user direction on tone (operations-led vs. CFO-led) and which capabilities to emphasize.

2. **Modularization recommendation: split off a fifth module `FUND-ADMIN-CLOSE-AND-AUDIT`?** `fund_ledger_entries`, `fund_close_periods`, and the audit-support capability today all sit in `FUND-ADMIN-FUND-LEDGER`. Close + audit-pack assembly is a distinct quarterly/annual workflow with its own approval path and PCAP-tie-out responsibility. Carta and Allvue both expose a separate "Close" surface. Decide: keep current 4-module shape, or split.

3. **LP-portal as a separately deployable shape.** `FUND-ADMIN-LP-PORTAL` is a capability (498) but not its own module. Juniper Square's flagship is the LP portal as a standalone product; many GPs adopt the portal alone alongside a different accounting backend. Decide: promote to a 5th module (recommended for buyers shopping portal-first), or keep as a capability of LP-COMMITMENTS.

4. **`waterfall_calculations` pattern flags.** Waterfall sign-off is the highest-stakes single decision in fund admin. Default-false on `has_single_approver` is almost certainly wrong; CFO/COO approval is universal. Confirm `has_single_approver=true` and (optionally) `has_submit_lock=true`.

5. **Cross-cutting capability `APPROVAL-WORKFLOW`.** FUND-ADMIN-CAPITAL-CALLS realizes it. Two state machines need `requires_permission=true` workflow gates (capital call approval, distribution waterfall approval, fund close approval). Decide whether `APPROVAL-WORKFLOW` is the abstraction or whether each module materializes its own gate; cascades into Phase E role design.

6. **Pairwise reconciliation scope.** Cross-domain neighbors discovered: **PORT-MONIT (weight ~5: 2 handoffs + 3 derived-relationship payloads)**, **INV-CRM (weight 3: 3 handoffs)**, **CAP-TABLE (weight 2: 1 handoff + 1 relationship)**, **EM-FUND-PLATFORM (weight 2: 1 handoff + 1 relationship)**. Audit procedure says deep dive for weight >=3. Decide: run pairwise reconciliation now for FUND-ADMIN <-> PORT-MONIT and FUND-ADMIN <-> INV-CRM inline, or defer per-neighbor passes as separate Validate runs.

### Bucket 3: Phase 0 pending (speculative; vendor-research vetting needed)

Candidate entities surfaced from flagship vendors but not yet confirmed by full Phase 0 vendor research:

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `gp_carry_allocations` | new FUND-ADMIN-CARRY module or DISTRIBUTIONS | Carta GP Books, Allvue GP Admin; separates LP distribution from GP carry calculation. Cross-pollinates with MGMT-CO-ACCT candidate. |
| `lp_side_letters` | FUND-ADMIN-LP-COMMITMENTS | Universal in Juniper Square, Carta; bilateral amendments that override standard subscription terms (fee discounts, co-investment rights, MFN clauses). |
| `nav_revaluations` | FUND-ADMIN-FUND-LEDGER | eFront, Allvue; FX revaluation of fund NAV at period-end across multi-currency LP commitments. |
| `recallable_distributions` | FUND-ADMIN-DISTRIBUTIONS | LPA-driven; distributions that count back against unfunded commitments and can be re-called within a window. Separately tracked because it affects DPI/RVPI calc. |
| `fund_expenses` | FUND-ADMIN-FUND-LEDGER | Universal; fund operating expenses (audit, legal, admin) charged against fund NAV; tracked separately from `fund_ledger_entries` because of LP-allocation rules. |
| `lp_commitment_transfers` | FUND-ADMIN-LP-COMMITMENTS | Secondaries market; tracks transfer of an LP commitment from seller LP to buyer LP. Significant lifecycle distinct from `lp_subscriptions`. |

### Cross-bucket dependencies

- Bucket 1 B1-M2 (regulation links) depends on Bucket 1 B1-M1 (the regulations rows existing), sequence in the fix-loop.
- Bucket 1 B1-W1/W2/W3/W4 (notice + KYC + docs entities) interact with Bucket 2 #4 (waterfall pattern flags) only at the audit-narrative level, not load-order.
- Bucket 2 #2 (split out close-and-audit module) blocks Bucket 1 B1-L4 / B1-L7 (lifecycle on `fund_close_periods` and the `fund_ledger_entries` config-shape exemption); the module attribution depends on whether close stays in FUND-LEDGER or moves.
- Bucket 2 #3 (LP-PORTAL promotion) interacts with Bucket 1 B1-S4 (module attribution on lifecycle states): if LP-PORTAL becomes its own module, `pcap_statements.published` belongs there.
- Bucket 3 candidates are independent of Buckets 1 and 2 except B3 `gp_carry_allocations` which interacts with the candidate MGMT-CO-ACCT domain (queued in `_missing-domains.md`); user may want to fold this into that decision.

### Per-bucket prompts

**Bucket 1 prompt:** "Approve which of B1-M1..M2, B1-W1..W4, B1-S1..S5, B1-L1..L7, B1-B9b, B1-H1a..g? The standard default is approve-all except B1-S5 which is report-only on RE-INVEST."

**Bucket 2 prompt:** "Your call on each of the six judgment items: (1) catalog UX copy direction; (2) split off FUND-ADMIN-CLOSE-AND-AUDIT module? (3) promote LP-PORTAL to its own module? (4) confirm `waterfall_calculations.has_single_approver=true`; (5) `APPROVAL-WORKFLOW` realization shape; (6) inline pairwise reconciliation with PORT-MONIT and INV-CRM or defer?"

**Bucket 3 prompt:** "Phase 0 formal vendor research on six candidates, eyeball-confirm, or skip-for-now? Default recommendation: eyeball `lp_side_letters` + `fund_expenses` + `nav_revaluations` (all universal across the four flagship vendors), defer the remaining three until the Bucket 2 modularization is settled."

### Report-only follow-ups (owed by other domains)

| Owing domain | Owed item | Notes |
|---|---|---|
| RE-INVEST | M7, DELETE legacy `domain_data_objects` `master` rows on `capital_calls` (367) + `fund_distributions` (368), OR load RE-INVEST modules that legitimately master them. | M7 hard fail at the domain-data-objects level. Module-level masters are clean (FUND-ADMIN only) but the legacy domain rows still register as multi-master. RE-INVEST has zero `domain_modules` rows today. |
| INV-CRM | B8 outbound relationship rows mirroring the inbound handoffs into FUND-ADMIN. Handoff 1038 (`vc_deal.closed` → `capital_calls`) is missing the `vc_deals triggers capital_calls` relationship row on the INV-CRM side (already exists; cross-check). Handoff 1040 (`fund.final_close` → INV-CRM on `lp_prospects`) needs an `lp_prospects` consumer DMDO on INV-CRM's relevant module, plus a relationship row from `funds` to `lp_prospects`. | Routes to INV-CRM's Pass-3 / Pass-4. |
| PORT-MONIT | B8 outbound relationship rows for `portco_valuation.final → pcap_statements` (handoff 1043). The mirror relationship `portco_valuations updates pcap_statements` already exists (verified); confirm during PORT-MONIT pass. Three derived-relationship payloads (`fund_position_returns`, `fund_performance_periods`, `lp_quarterly_reports`) mastered by PORT-MONIT also need PORT-MONIT-side relationships back to `funds`. | Routes to PORT-MONIT's Pass-3 / Pass-4. |
| CAP-TABLE | B8 outbound relationship for `exit_scenario.executed → fund_distributions` (handoff 1044). Relationship `exit_scenarios drives fund_distributions` exists; verify the cross-domain owner direction during CAP-TABLE pass. | Routes to CAP-TABLE's Pass-3 / Pass-4. |
| EM-FUND-PLATFORM | B8 outbound relationship for `fund_formation.operational → funds` (handoff 1046). Relationship `fund_formations becomes funds` exists. EM-FUND-PLATFORM is a new domain; confirm it has its full A/M/B band coverage when next audited. | Routes to EM-FUND-PLATFORM's Pass-1 (it likely fails most bands). |
| ALL FUND-ADMIN cross-domain handoffs | B10b target_domain_module_id checks on the other side: handoffs 1040, 1041 inbound side on INV-CRM modules; 1042 inbound side on PORT-MONIT module 18; 1043 source side on PORT-MONIT module 17; 1044 source side on CAP-TABLE module 23; 1038 source side on INV-CRM module 9; 1046 source side on EM-FUND-PLATFORM module 26. All currently NULL or only one side set. | The owing-domain audit (each neighbor) closes this. Not a FUND-ADMIN blocker. |

### Candidate domains queued

Five candidate domains were surfaced and queued in `audits/_missing-domains.md` via the helper:

- **AIFMD-DEPOSITARY**, Fund Depositary Services. Evidence: BNY Mellon AIS, State Street AIS, Citco Depositary, IQ-EQ Depositary, Apex Group. Adjacency: FUND-ADMIN, BANK-OPS.
- **PRIV-CREDIT-LOAN-ADMIN**, Private Credit Loan Administration. Evidence: Allvue Loan Admin, SS&C Precision LM, Cloudmargin, Black Mountain BMS-WSO, Solvas. Adjacency: FUND-ADMIN, ERP-FIN.
- **MGMT-CO-ACCT**, Management Company GP Accounting. Evidence: Carta GP Books, Allvue GP Admin, AlterDomus, SS&C GlobeOp. Adjacency: FUND-ADMIN, ERP-FIN.
- **REG-FUND-RPT**, Private Capital Regulatory Reporting. Evidence: Confluence Unity, Vermilion Reporting Suite, DiligentRegtek, ComplySci, AlterDomus, Pregin Pro Reporting. Adjacency: FUND-ADMIN, GRC.
- **K1-TAX-DOCS**, K-1 Partnership Tax Document Generation. Evidence: K-1 Navigator, PwC K-1 Plus, Deloitte iPartner, RSM K-1 Workflow, EisnerAmper K-1. Adjacency: FUND-ADMIN, TAX-PROVISION.

A sixth candidate (`TRANSFER-AGENCY`) was already queued by a prior FUND-ADMIN surfacing pass; not re-queued in this audit because it sits in the mutual-fund market rather than the private-capital scope this audit covers (kept in the queue as pre-existing).

### Decisions

_(empty until user reviews; agent flips status to feedback_needed below)_

### Fixes applied

_(none in this pass; read-only audit only)_

## 2026-05-31, Continuation: B1 technical fixes (residual)

### Scope

Residual B1 items from the 2026-05-30 audit that were strictly technical (no user judgment required) and pre-specified enough to load: PATCH enum backfills, INSERT to existing rows, INSERT user-edges that the audit named row-by-row, INSERT `handoff_processes` for the proposals where both `handoff_id` and a resolvable PCF `process_id` were named.

Loader: [.tmp_deploy/fix_fund_admin_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_fund_admin_b1_technical_2026_05_31.ts). Idempotent.

### Fixes applied

| ID | Action | Rows | Detail |
|---|---|---|---|
| B1-S4 | PATCH `data_object_lifecycle_states.domain_module_id` | 13 | `funds` (5: ids 449-453) -> module 12 (FUND-LEDGER); `lp_commitments` (4: ids 454-457) -> module 13 (LP-COMMITMENTS); `fund_distributions` (4: ids 458-461) -> module 15 (DISTRIBUTIONS). The two `requires_permission=true` states (`funds.final_close` id 450, `fund_distributions.declared` id 459) now materialize against the right `<domain_module_code>:` prefix. |
| B1-M2 | INSERT `domain_regulations` | 2 | AIFMD (regulation_id 41) + FATCA (50) -> FUND-ADMIN (160), both `applicability='mandatory'`. SEC Marketing Rule, ILPA Reporting Standards, CRS, and the Cayman Mutual Funds Law are deferred because the underlying `regulations` rows do not yet exist (B1-M1 new-entity work). |
| B1-S3 | INSERT `data_object_relationships` user-edges (Rule #10) | 10 | `related_data_object_id=748` (`users`), `relationship_type=many_to_many`, `relationship_kind=reference`, `owner_side=source`, `is_required=false`. Per-actor edges: `fund_ledger_entries` (posted by); `fund_close_periods` (closed by, approved by); `lp_subscriptions` (onboarded by, reviewed by); `pcap_statements` (prepared by, approved by); `capital_call_responses` (booked by); `waterfall_calculations` (calculated by, approved by). |
| B1-H1 | INSERT `handoff_processes` (agent_curated, additive) | 4 | H1b: handoff 1041 -> process 1480 (PCF 10911, "Process and oversee debt and investment transactions"). H1c: handoff 1042 -> process 1422 (PCF 10862, "Process and distribute payments"). H1d: handoff 1043 -> process 56 (PCF 10730, "Perform general accounting and reporting"). H1f: handoff 1038 -> process 310 (PCF 10751, "Perform capital planning and project approval"). All `proposal_source='agent_curated'`, `record_status='new'` by default. Additive to any pre-existing tags on the same handoffs. |

### Deferred this pass

- **B1-M1** (new `regulations` rows for SEC-MKT-RULE, ILPA, CRS, Cayman): new-entity work, deferred.
- **B1-W1..W4** (`subscription_documents`, `lp_kyc_records`, `distribution_notices`, `capital_call_notices`): new data_objects, deferred.
- **B1-S1** (`catalog_tagline` / `catalog_description`): Rule #20 requires explicit user approval of the wording before write.
- **B1-S2** (pattern flag flips on `capital_call_notices`, `distribution_notices`, `waterfall_calculations`): the audit phrases these as "re-evaluate" / "needs", which is a user-judgment flip, not a pre-specified PATCH; also depends on B1-W3/W4 for the notice entities.
- **B1-S5** (`capital_calls` / `fund_distributions` legacy `master` rows on RE-INVEST domain 146, ids 597 + 598): the audit explicitly classifies this as report-only on the FUND-ADMIN side and owed by the RE-INVEST audit. Not deleted here.
- **B1-L1..L7** (new lifecycle states + trigger events on `lp_subscriptions`, `pcap_statements`, `capital_calls`, `fund_close_periods`, `capital_call_responses`, `waterfall_calculations`, `fund_ledger_entries`): new entities, deferred. The `fund_ledger_entries` config-shape exemption (L7) requires user surfacing, not auto-write.
- **B1-B9b** (5 proposed intra-domain handoffs): the audit names module pairs and trigger events but several events are "or a new one" (not pre-specified). Defer until the trigger_event_ids are resolved or new ones are loaded as part of B1-L1..L6.
- **B1-H1a** (handoff 1040): audit confidence "medium" with explicit "recommend... deferring to Pass 3 review"; superseding the existing `discovery_substring` tag is a user decision.
- **B1-H1e** (handoff 1044): audit annotates the PCF as "verify external_id; may be 10911 + 10913", so the PCF is not pre-resolved.
- **B1-H1g** (handoff 1046): audit confidence "low" with "better candidate would be a Phase 0 search"; not technical.
- **Bucket 2** (6 judgment items) and **Bucket 3** (6 Phase 0 candidates): out of scope for a technical pass.

### Verification

- `/data_object_lifecycle_states?data_object_id=in.(755,759,368)&select=data_object_id,state_name,domain_module_id`: all 13 rows now carry the expected `domain_module_id`.
- `/domain_regulations?domain_id=eq.160`: 2 rows (AIFMD id 270, FATCA id 271).
- `/data_object_relationships?related_data_object_id=eq.748&data_object_id=in.(756,757,758,760,761,762)`: 10 user-edges present (ids 1897-1906).
- `/handoff_processes?handoff_id=in.(1038,1041,1042,1043)`: the 4 new rows are present (ids 761-764) alongside any pre-existing tags.

UI link: https://tests.semantius.app/domain_map/data_object_lifecycle_states
