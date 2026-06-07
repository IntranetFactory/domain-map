# FUND-ADMIN audit history

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

## 2026-05-31, Audit

### Summary

- Current footprint: 10 master entities across 4 modules (`FUND-ADMIN-FUND-LEDGER` id 12, `FUND-ADMIN-LP-COMMITMENTS` id 13, `FUND-ADMIN-CAPITAL-CALLS` id 14, `FUND-ADMIN-DISTRIBUTIONS` id 15); 8 capabilities (7 domain-prefixed + `APPROVAL-WORKFLOW`); 5 solutions (4 primary + 1 secondary); 2 regulations linked (AIFMD id 41, FATCA id 50); 5 trigger_events; 3 outbound + 4 inbound cross-domain handoffs; 0 intra-domain handoffs; 0 roles, 0 role_modules, 0 role_permissions, 0 module-scoped permissions; 0 system skills, 0 skill_tools.
- Structural verdict by band: A1/A2/A3 pass, A4 partial (catalog UX empty); M1/M2/M4/M5/M6 pass, M7 partial (RE-INVEST legacy multi-master rows on `capital_calls` id 597 and `fund_distributions` id 598 unresolved); B1/B2/B3/B5/B6/B7/B10b/B11 pass, B4 partial (waterfall_calculations / capital_calls / fund_distributions / fund_close_periods still default-false on at least one pattern flag), B9/B9b fail (0 intra-domain handoffs), B12 partial (7 of 10 masters still lack lifecycle states), C1 pass, D1 deferred, E1-E5 all fail (zero roles), F1 vacuously pass, F2/F3/F5 fail (0 system skills), H quality 0/7 approved with H process health 6/7 agent_curated (1040 still discovery_substring only, 1046 untagged).
- Domain Semantius score: uncomputable, F2 / F3 fail on all 4 modules.
- Bucket 1 (in-scope, agent fixable): 11 items.
- Bucket 2 (surface-for-user, judgment): 6 items (unchanged from 2026-05-30).
- Bucket 3 (Phase 0 pending, speculative): 6 items (unchanged from 2026-05-30).

### Bucket 1 — In-scope confirmed gaps

#### MISSING

| ID | Entity | Proposed module | Notes |
|---|---|---|---|
| B1-M1 | `regulations` rows for SEC Marketing Rule (Rule 206(4)-1), ILPA Reporting Standards, CRS, Cayman Mutual Funds Law | n/a (catalog-level) | Carried from 2026-05-30; the 2026-05-31 continuation linked AIFMD + FATCA only because the others did not yet exist as `regulations` rows. After insert, attach via `domain_regulations` with appropriate `applicability`. |
| B1-W1 | `subscription_documents` | FUND-ADMIN-LP-COMMITMENTS | Carried from 2026-05-30. Subscription docs are the legal artifact of `lp_subscriptions`; PDF blobs + version history. |
| B1-W2 | `lp_kyc_records` | FUND-ADMIN-LP-COMMITMENTS | Carried from 2026-05-30. KYC/AML output + sanction-screening trail; periodic re-screen. |
| B1-W3 | `distribution_notices` | FUND-ADMIN-DISTRIBUTIONS | Carried from 2026-05-30. LP-facing notice document; ILPA template format. |
| B1-W4 | `capital_call_notices` | FUND-ADMIN-CAPITAL-CALLS | Carried from 2026-05-30. LP-facing notice, separate from the `capital_calls` event row. |

#### MISSING (lifecycle states + trigger events)

| ID | Master | Missing states | Missing events |
|---|---|---|---|
| B1-L1 | `lp_subscriptions` (758) | drafted, submitted, kyc_passed, executed, withdrawn | `lp_subscription.submitted`, `lp_subscription.executed` |
| B1-L2 | `pcap_statements` (760) | drafted, reviewed, published | `pcap_statement.published` |
| B1-L3 | `capital_calls` (367) | drafted, issued, funded, closed | event for `.drafted` (`.issued` and `.funded` exist as ids 295 + 1186) |
| B1-L4 | `fund_close_periods` (757) | open, soft_closed, reviewed, locked | `fund_close_period.locked` |
| B1-L5 | `capital_call_responses` (761) | scheduled, paid, partial, defaulted | `capital_call_response.paid`, `capital_call_response.defaulted` |
| B1-L6 | `waterfall_calculations` (762) | drafted, reviewed, approved | `waterfall_calculation.approved` |
| B1-L7 | `fund_ledger_entries` (756) | config-shape exemption candidate per Rule #12 | Surface exemption to user during fix-loop (do not auto-write `notes`). |

#### BOUNDARY

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-B9b | B9b | Zero intra-domain `handoffs` rows across 4 modules. Candidate intra-domain pairs from the relationship graph: (FUND-LEDGER -> LP-COMMITMENTS) via `fund.final_close` (id 1185) opening LP onboarding; (LP-COMMITMENTS -> CAPITAL-CALLS) via `lp_commitment.committed` (event TBD) triggering first-call schedule; (CAPITAL-CALLS -> LP-COMMITMENTS) via `capital_call.funded` (id 1186) advancing `lp_commitments.called`; (DISTRIBUTIONS -> LP-COMMITMENTS) via `fund_distribution.executed` (id 1187) updating `lp_commitments.distributed`; (DISTRIBUTIONS -> FUND-LEDGER) via GL posting at distribution. | Draft 5 intra-domain handoff rows with `source_domain_id = target_domain_id = 160`, `integration_pattern = lifecycle_progression`, `friction_level = low`. Three rows need new trigger_events (loaded alongside B1-L1..L6). |

#### APQC TAGGING (still in flight)

| ID | Handoff | Finding | Fix |
|---|---|---|---|
| B1-H1a | 1040 (FUND-LEDGER -> INV-CRM, `fund.final_close` -> `lp_prospects`) | Only legacy `discovery_substring` tag (`process_id` 63, PCF 10737). 2026-05-30 proposal recommended PCF 10751 (`Perform capital planning and project approval`) but flagged confidence "medium" and deferred superseding to user. | User decides: supersede with PCF 10751 (Rule on `record_status` keeps both rows as `new`; downstream review approves the better one) or defer. |
| B1-H1e | 1044 (CAP-TABLE -> DISTRIBUTIONS, `exit_scenario.executed` -> `fund_distributions`) | Two `agent_curated` rows present (PCF 10952 `Develop exit strategy` id 712 + PCF 16805 `Develop merger/demerger/acquisition/exit strategy` id 713). 2026-05-30 proposal was PCF 10912 family ("Process and account for debt and investment") which would be a closer payments-side match. | User picks: keep current strategy-development tags, replace with a payments-side PCF (10911 / 10913), or attach both. |
| B1-H1g | 1046 (EM-FUND-PLATFORM -> FUND-LEDGER, `fund_formation.operational` -> `funds`) | No `handoff_processes` row at all. 2026-05-30 proposal was PCF 10737 with "low" confidence and recommended Phase 0 search for a fund-launch PCF row. | User picks: attach PCF 10737 (low confidence), run Phase 0 search for a closer PCF, or leave deferred for Discover Pass 3. |

#### CATALOG QUALITY HEADLINE

| ID | Finding | Fix |
|---|---|---|
| B1-H2 | `record_status='approved'` count on the 9 existing `handoff_processes` rows for FUND-ADMIN handoffs is 0. None of the agent_curated rows from the 2026-05-30 continuation or earlier passes have been reviewer-approved. | User reviews each row; per Rule #1, `approved` flips only with explicit per-row sign-off. |

### Bucket 2 — Surface-for-user (judgment calls)

All six items from the 2026-05-30 audit remain open. Restated self-contained for cross-audit queryability:

1. **A4 catalog UX content.** `catalog_tagline` and `catalog_description` empty. Per Rule #20, exact wording is user-authored; the agent will not draft and write without explicit per-row approval. Draft tagline option carried from prior audit: *"Run private-capital funds end-to-end: LP onboarding, capital calls, partner accounting, and waterfall distributions, on the same general ledger."*
2. **Split off `FUND-ADMIN-CLOSE-AND-AUDIT` as a 5th module.** `fund_ledger_entries`, `fund_close_periods`, and the audit-support capability today share FUND-ADMIN-FUND-LEDGER. Carta and Allvue both expose a separate "Close" surface. Decide: keep 4-module shape or split.
3. **Promote LP-PORTAL to its own module.** Currently a capability (498) under FUND-ADMIN-LP-COMMITMENTS. Juniper Square markets the LP portal as a standalone product. Decide: promote (recommended for portal-first buyers) or keep as capability.
4. **`waterfall_calculations` pattern flags.** Default-false on `has_single_approver` is almost certainly wrong; CFO/COO approval is universal. Confirm `has_single_approver=true` and (optionally) `has_submit_lock=true`. Same question applies more weakly to `capital_calls`, `fund_distributions`, `fund_close_periods`.
5. **`APPROVAL-WORKFLOW` cross-cutting capability realization.** Capital call approval, distribution waterfall approval, fund close approval each need workflow-gate permissions. Decide: each module materializes its own gate, or one cross-cutting abstraction.
6. **Pairwise reconciliation scope.** Cross-domain neighbors by weight: PORT-MONIT (~5), INV-CRM (3), CAP-TABLE (2), EM-FUND-PLATFORM (2). Audit procedure says deep dive at weight >=3. Decide: inline PORT-MONIT + INV-CRM passes now, or defer per-neighbor passes.

### Bucket 3 — Phase 0 pending (speculative)

All six candidates from 2026-05-30 remain open, unchanged:

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `gp_carry_allocations` | new FUND-ADMIN-CARRY module or DISTRIBUTIONS | Carta GP Books, Allvue GP Admin. Cross-pollinates with candidate MGMT-CO-ACCT domain queued in `_missing-domains.md`. |
| `lp_side_letters` | FUND-ADMIN-LP-COMMITMENTS | Universal in Juniper Square, Carta; bilateral amendments overriding standard subscription terms. |
| `nav_revaluations` | FUND-ADMIN-FUND-LEDGER | eFront, Allvue; FX revaluation at period-end across multi-currency LP commitments. |
| `recallable_distributions` | FUND-ADMIN-DISTRIBUTIONS | LPA-driven; distributions counted back against unfunded commitments. Affects DPI/RVPI calc. |
| `fund_expenses` | FUND-ADMIN-FUND-LEDGER | Universal; fund operating expenses (audit, legal, admin) charged against NAV; separate LP-allocation rules. |
| `lp_commitment_transfers` | FUND-ADMIN-LP-COMMITMENTS | Secondaries market; transfer of an LP commitment seller -> buyer; distinct lifecycle from `lp_subscriptions`. |

### Cross-bucket dependencies

- B1-M1 -> domain_regulations follow-on link rows once new regulations land.
- B1-B9b depends on B1-L1..L6 for the trigger events that anchor three of the five proposed intra-domain handoffs.
- Bucket 2 #2 (split CLOSE-AND-AUDIT) gates B1-L4 / B1-L7 module attribution.
- Bucket 2 #3 (LP-PORTAL promotion) gates pcap_statements lifecycle state module attribution within B1-L2.
- E-band fixes (roles, role_modules, role_permissions) gate F-band (system skills are typically authored after roles per the per-domain checklist).
- Buckets 2 and 3 are otherwise independent of each other.

### Per-bucket prompts

- **Bucket 1:** Approve which of B1-M1, B1-W1..W4, B1-L1..L7, B1-B9b, B1-H1a, B1-H1e, B1-H1g, B1-H2? Default recommendation: approve B1-L1..L6 + B1-W1..W4 together as one Phase B load; surface B1-L7 (config-shape exemption) for explicit decision; treat B1-H1a / B1-H1e / B1-H1g as a small focused APQC re-tagging round; B1-H2 is a per-row review pass once a reviewer is queued.
- **Bucket 2:** Your call on each of the six items; the catalog UX wording (B2-1) cannot be agent-drafted per Rule #20.
- **Bucket 3:** Phase 0 formal vendor research, eyeball-confirm, or skip-for-now? Default recommendation carried: eyeball `lp_side_letters` + `fund_expenses` + `nav_revaluations` (universal across the four flagship vendors), defer the other three until the Bucket 2 modularization is settled.

### Report-only follow-ups (owed by other domains)

- **RE-INVEST**: legacy `domain_data_objects` `master` rows on `capital_calls` (id 597) and `fund_distributions` (id 598) still present. RE-INVEST owes either modules that legitimately master them, or DELETE of the legacy rows. Confirmed live this audit.
- **INV-CRM**, **PORT-MONIT**, **CAP-TABLE**, **EM-FUND-PLATFORM**: B8 mirror relationships and B10b counter-side module-id checks per the 2026-05-30 audit. No change.

### Decisions

_(empty until user reviews)_

### Fixes applied

_(none in this pass; read-only validate audit)_

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

State-driven Validate pass over FUND-ADMIN (domain 160; modules 12 FUND-LEDGER, 13 LP-COMMITMENTS, 14 CAPITAL-CALLS, 15 DISTRIBUTIONS). Worked only the open state.yaml items. Executed all fully-specified additive/corrective work (entity_type classification, catalog UX, regulations, the 4 notice/KYC/doc masters, lifecycle states + trigger events, and the intra-domain handoff layer). Surfaced the destructive and judgment items. Deferred personas. Domain is now agent-finished on the additive bands; the remaining gate is the user's b2 decisions plus the Phase E/F role-and-skill layer that those decisions unblock.

### Executed (record_status='new' throughout; no approvals stamped)

| Item | Action | Rows |
|---|---|---|
| B1A-ENTITY-TYPE | PATCH data_objects.entity_type unclassified -> typed | 10 (9 operational_workflow; fund_ledger_entries 756 -> operational_record, which structurally resolves the B1B-L7 / B2-LEDGER-LIFECYCLE config-shape exemption per Rule 12, no notes write) |
| Catalog UX (Rule 20) | PATCH empty catalog_tagline + catalog_description | 5 (domain 160 + modules 12/13/14/15); buyer-voice, no vendor names, no em-dash |
| B1A-M1 | INSERT regulations + domain_regulations links to 160 | 4 regulations (SEC Marketing Rule 94, ILPA Reporting Standards 95, Common Reporting Standard 96, Cayman Mutual Funds Act 97) + 4 domain_regulations (FUND-ADMIN now links 6) |
| B1A-W1..W4 | INSERT new master data_objects + DMDO master + relationships | 4 data_objects (subscription_documents 1021, lp_kyc_records 1022, distribution_notices 1023, capital_call_notices 1024); 4 DMDO master rows (13/13/15/14); 11 data_object_relationships (5 cross-master one_to_many references + 6 per-actor user-edges) |
| B1A-L1..L6 + W1..W4 lifecycle | INSERT data_object_lifecycle_states (module-attributed, gate states requires_permission=true) | 39 states across lp_subscriptions, pcap_statements, capital_calls, fund_close_periods, capital_call_responses, waterfall_calculations + the 4 new masters |
| B1A-L1..L6 events | INSERT trigger_events | 8 (lp_subscription.submitted, pcap_statement.published, capital_call.drafted, fund_close_period.locked, capital_call_response.paid/.defaulted, waterfall_calculation.approved, lp_commitment.committed). The 9th, lp_subscription.executed on 758, could NOT be created: name collides with pre-existing row 955 on limited_partners 728 (surfaced below). |
| B1A-B9b | INSERT intra-domain handoffs (source=target=160, lifecycle_progression, low friction) | 5 wiring 12->13 (fund.final_close), 13->14 (lp_commitment.committed), 14->13 (capital_call.funded), 15->13 (fund_distribution.executed), 15->12 (GL posting) |

Loaders: .tmp_deploy/fund_admin_catalog_ux_2026_06_07.ts, .tmp_deploy/fund_admin_additive_2026_06_07.ts (both idempotent).

UI links: data_objects, data_object_lifecycle_states, trigger_events, handoffs, regulations, domains, domain_modules under https://tests.semantius.app/domain_map/<table>.

### Surfaced for user (not executed)

- B2-EVENT-955-REATTRIB (NEW, destructive): trigger_event 955 lp_subscription.executed is mis-attributed to limited_partners (728) with empty event_category/to_state, blocking the L1 .executed event on lp_subscriptions (758). Re-attribute / rename / leave.
- B1A-H2 (destructive): flip 9 agent_curated handoff_processes rows new -> approved, per-row sign-off.
- B1B-H1a / B1B-H1e (destructive): supersede/replace existing APQC tags on handoffs 1040 / 1044 (b2: B2-H1A-OVERRIDE, B2-H1E-OVERRIDE).
- B1B-PATTERN-FLAGS (destructive): principally waterfall_calculations.has_single_approver=true (b2: B2-PATTERN-FLAGS).
- b2 open: B2-CLOSE-MODULE, B2-LP-PORTAL, B2-PATTERN-FLAGS, B2-APPROVAL-WORKFLOW, B2-PAIRWISE-RECONCILIATION, B2-H1A-OVERRIDE, B2-H1E-OVERRIDE, B2-EVENT-955-REATTRIB.
- B1A-PHASE-P (personas/RACI): DEFERRED per the bulk-batch instruction. Candidate personas noted in state.yaml.

### Left

- B1B-E-BAND / B1B-F-BAND: blocked downstream (E gated by B2-APPROVAL-WORKFLOW + deferred personas; F gated by E). Lifecycle prerequisites are now satisfied.
- B1B-RE-INVEST-M7: blocked on the RE-INVEST audit (legacy domain_data_objects master rows 597/598).
- B1B-H1g: depends on B3-PCF-FUND-LAUNCH (no clean PCF match for handoff 1046).
- b3 backlog (6 candidate entities + the fund-launch PCF search): unchanged, non-blocking.
- Per-module skill-grain items: retired per the 2026-06-06 supersession header (kept above).
