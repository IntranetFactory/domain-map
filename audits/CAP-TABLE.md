---
status: feedback_needed
last_transition: 2026-05-30
last_transition_by: agent
open_questions: 31
---

# CAP-TABLE, Audit History

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 6 full modules (`CAP-TABLE-LEDGER`, `CAP-TABLE-GRANTS`, `CAP-TABLE-VALUATIONS`, `CAP-TABLE-EXIT-MODELING`, `CAP-TABLE-EMPLOYEE-PORTAL`, `CAP-TABLE-SECONDARY`). 0 starter / hosted modules. 12 masters at the domain rollup (`cap_tables`, `security_classes`, `shareholder_records`, `equity_grants`, `option_pools`, `vesting_schedules`, `valuations_409a`, `asc718_expense_periods`, `exit_scenarios`, `exit_waterfall_calculations`, `employee_equity_accounts`, `secondary_transactions`). 22 DMDO rows across the 6 modules (10 `master`, 8 `embedded_master`, 0 `consumer`, 0 `contributor`, 0 `derived`). 9 capabilities (1 cross-cutting: `APPROVAL-WORKFLOW`). 6 solutions (5 primary `Carta Cap Table`, `Pulley`, `Ledgy`, `Shoobx` (Fidelity), `Eqvista`; 1 secondary `AngelList Stack`). 7 trigger_events on CAP-TABLE masters. 2 outbound cross-domain handoffs (`CAP-TABLE-EXIT-MODELING → FUND-ADMIN` 1044; `CAP-TABLE-EXIT-MODELING → PORT-MONIT` 1045). 0 inbound cross-domain handoffs. 0 intra-domain handoffs. 8 aliases. 21 lifecycle states across 5 masters (`equity_grants`, `cap_tables`, `valuations_409a`, `exit_scenarios`, `secondary_transactions`); 7 masters carry no lifecycle states. 0 system skills, 0 `skill_tools` rows on any CAP-TABLE module. 0 roles authored, 0 module permissions authored. 0 regulations attached to the domain.
- **Vendor-surface basis (Pass 2 flagship enumeration):** Carta Cap Table (market leader; SAFE / convertible notes / warrants / 3921 / 3922 / Form D / Rule 701 first-class), Pulley (modern challenger; transparent waterfall + scenario modeling), AngelList Stack (incorporation + Stack-as-Service for fund-backed startups; SAFE + ROFR), Shareworks by Morgan Stanley at Work (mid-market + enterprise; ESPP + RSU + PSU strong), Ledgy (EU-focused; ESOP + 309 / VSOP / phantom plans), Vestd (UK-focused; EMI / CSOP UK tax-advantaged schemes), Capdesk (acquired by Ledgy 2022; UK), J.P. Morgan Workplace Solutions formerly Global Shares (enterprise; cross-border ESPP), Astrella (Computershare; pre-IPO), Eqvista (SMB / DIY 409A bundles), Cake Equity (Asia-Pacific + UK; founder-friendly), Capshare (Solium, now Shareworks). Compliance-specialist coverage anchored on IRS 409A (FMV determination), ASC 718 / IFRS 2 (stock-based compensation expense), SEC Rule 701 (private-company exemption for equity comp), SEC Reg D / Form D (private placement filings), SEC Reg CF (crowdfunding), IRS Form 3921 (ISO exercise reporting), IRS Form 3922 (ESPP purchase reporting), IRS Form 1099-B / 1099-NEC (NQSO cash exercise), SOX (significant-grant attestation for public-co subsidiaries), GDPR / CCPA (employee personal data in `shareholder_records` / `employee_equity_accounts`), AML / KYC (FinCEN beneficial-ownership reporting for transfers above SEC thresholds). UK / EU specifics include EMI (UK), CSOP (UK), VSOP (DE), DTA / DBA double-tax-treaty handling. None of the flagship-required regulations are presently linked to the domain.
- **Bucket 1 (in-scope, agent fixable):** 12 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 12 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| COMP-MGMT | 0 | 0 | 2 (COMP-INCENTIVES `master + required` on `equity_grants`; COMP-STATEMENTS `contributor + optional` on `equity_grants`) | 1 (offer_versions proposes equity_grants via row 1332) | 5 | Pairwise (full) |
| FUND-ADMIN | 1 | 0 | 0 | 1 (`exit_scenarios drives fund_distributions` row 875) | 3 | Pairwise (full) |
| PORT-MONIT | 1 | 0 | 0 | 0 (payload `portfolio_companies` is PORT-MONIT-owned but no relationship row exists yet) | 2 | Pairwise (full) |
| HCM | 0 | 0 | 0 | 1 (users 748 administers / signs off / models / executes / holds across 5 CAP-TABLE masters) | 1 | Pairwise (full) |
| EM-FUND-PLATFORM | 0 | 0 | 1 (EM-FUND-CAPTABLE-LITE `embedded_master + optional` on `cap_tables`) | 0 | 2 | Pairwise (full) |
| ERP-FIN | 0 | 0 | 0 | 0 (implied via `asc718_expense_periods` feeding GL, currently no edge) | 1 | Lightweight |
| ESIGN | 0 | 0 | 0 | 0 (implied via grant acceptance, currently no edge) | 1 | Lightweight |
| CLM | 0 | 0 | 0 | 0 (implied via investor-rights agreements / stock-purchase agreements; not modeled) | 1 | Lightweight |
| GRC | 0 | 0 | 0 | 0 (implied via SOX significant-grant attestation; not modeled) | 1 | Lightweight |
| AUDIT | 0 | 0 | 0 | 0 (implied via grant-issuance audit trail; not modeled) | 1 | Lightweight |

**Structural pass bands** (positive checks unless noted):

- **S1-S3** structural: pass (12 masters, 22 DMDO rows, every `embedded_master` row points at a data_object with a canonical `master` row somewhere; Rule #11 holds).
- **A1-A3** authorization: **A2 / A3 hard-fail**, 0 roles attached to any CAP-TABLE module, 0 permissions authored on any CAP-TABLE module. A1 (domain row populated) passes.
- **M1** (each domain has at least 1 full module): pass, 6 full modules. **M2** (>=3-capability domain has >=2 full modules): pass, 6 modules / 9 capabilities. **M3-M6**: pass (module shapes coherent, code patterns clean). **M7** (within-domain master + sibling consumer overlap): pass, 0 consumer rows on sibling modules; the 8 `embedded_master` shells are the deployability path, no consumer drift.
- **B1-B3** masters + necessity: pass on the master rows themselves. **B4** pattern flags: only 4 of 12 masters carry any positive pattern-flag (`shareholder_records.has_personal_content=true`; `equity_grants.has_personal_content=true` + `has_single_approver=true`; `valuations_409a.has_submit_lock=true` + `has_single_approver=true`; `employee_equity_accounts.has_personal_content=true`; `secondary_transactions.has_submit_lock=true` + `has_single_approver=true`). Several positive-evaluation candidates not flagged (see B2-S4). **B5-B8** relationship + alias coverage: relationship graph is internally consistent (15 intra-domain edges + 5 platform-builtin edges via `users` 748); aliases present on 5 of 12 masters. **B9** trigger_events: **partial fail**, 2 events with empty `event_category` (426 `equity_grant.granted`, 427 `equity_grant.vested`); 5 events properly classified. **B9b** intra-domain cross-module handoffs: **hard fail**, 0 intra-domain handoff rows on a 6-module domain. Expected pattern (LEDGER → GRANTS on `option_pool.created`; GRANTS → LEDGER on `equity_grant.exercised`; VALUATIONS → GRANTS on `valuation_409a.final` to refresh strike floor; GRANTS → VALUATIONS on grant-issuance triggering re-valuation; VALUATIONS → LEDGER on `valuation_409a.final` updating cap-table FMV; EXIT-MODELING → LEDGER on `exit_scenario.executed`; SECONDARY → LEDGER on `secondary_transaction.settled`; SECONDARY → GRANTS on transfers of vested-but-unexercised grants; GRANTS → EMPLOYEE-PORTAL on `equity_grant.approved` to expose the grant; EMPLOYEE-PORTAL → GRANTS on grant-acceptance / exercise actions). **B10b** report-only (cross-domain NULL FKs): CAP-TABLE's side is clean (both source FK and target FK populated on the 2 outbound rows), no report-only items.
- **C1-C2** capability mapping: pass, every capability has a `domain_module_capabilities` realization on at least one full module.
- **D1** data-object kinds: pass, all CAP-TABLE masters are `kind='domain_owned'`, no platform-builtin masquerading.
- **E1-E6**: **E1 hard-fail** no system role bundles on CAP-TABLE modules (queries `role_modules?domain_module_id=in.(20..25)` return zero). **E2-E6** untriggered (no roles to drift on, no permission tiers to bundle).
- **F1-F5** Semantius tools / skills: **F2 hard-fail** 0 system skills on any of the 6 CAP-TABLE modules. **F3 hard-fail** 0 `skill_tools` rows (consequence of F2). **F4** trivially passes (no rows to validate). **F5 Semantius score: uncomputable**, the operational score has nothing to grade; the strict score on CAP-TABLE proper is currently undefined.
- **F7** channel-primitive justification: untriggered (no skill_tools rows).
- **H1** APQC tagging: **hard fail**, 0 of 2 cross-domain handoffs carry any `handoff_processes` row. Volume target per SKILL H1: 0.5N to 0.8N for N=2 outbound = 1-2 agent_curated tags. Zero approved, zero `agent_curated`.

CAP-TABLE Semantius score (strict, CAP-TABLE proper): **undefined / 0 of 0** since no `skill_tools` rows exist. F2-F5 take the audit out of "score" territory and into "module surface absent" territory; the score is not the diagnostic of interest here, F2 is.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **B9, partial fail, empty `event_category` on 2 trigger_events** | 2 trigger_events carry `event_category=''` (Rule #13 enum must be one of `lifecycle / state_change / threshold / signal`): 426 `equity_grant.granted`, 427 `equity_grant.vested`. The 5 newer events (1189-1191, 1238-1239) are properly classified. | PATCH: 426 `equity_grant.granted` → `state_change` (transitions equity_grants.proposed/approved → granted); 427 `equity_grant.vested` → `lifecycle` (recurring vesting checkpoint as time passes; matches the precedent for `contract_obligation.due → lifecycle` in CLM B1-S2). |
| B1-S2 | **B9b, hard fail, missing intra-domain cross-module handoffs** | A 6-module domain has 0 intra-domain handoff rows loaded. From the master-relationship graph and the lifecycle state machines, 10 intra-domain handoffs are implied. Six are anchored by existing trigger_events: `equity_grant.approved` (1238) GRANTS → EMPLOYEE-PORTAL (expose the grant); `equity_grant.granted` (426) GRANTS → EMPLOYEE-PORTAL (open acceptance workflow); `equity_grant.vested` (427) GRANTS → EMPLOYEE-PORTAL (refresh vested-shares balance); `valuation_409a.final` (1189) VALUATIONS → GRANTS (refresh strike floor on draft grants) and VALUATIONS → LEDGER (cap-table FMV refresh); `exit_scenario.executed` (1190) EXIT-MODELING → LEDGER (apply scenario as actual). Four additional handoffs need new trigger_events: `equity_grant.exercised` GRANTS → LEDGER (issuance of shares into ledger), `secondary_transaction.settled` SECONDARY → LEDGER (transfer shares between holders) and SECONDARY → GRANTS (cancel exercised-but-unsettled grant lines), and `option_pool.refreshed` LEDGER → GRANTS (or GRANTS → LEDGER for pool-reserve adjustments). | Insert 10 `handoffs` rows with `source_domain_id=target_domain_id=162`, `integration_pattern='lifecycle_progression'`, `friction_level='low'`, source / target module FKs populated. Closes B9b. Three of the ten depend on new trigger_events from B1-S3. |
| B1-S3 | **B9, missing trigger_events for workflow-gate states + intra-domain handoffs** | 6 lifecycle states carry `requires_permission=true` but no matching `trigger_events` row exists: `equity_grant.approved` (state 113, module 79) IS covered by event 1238; `equity_grant.granted` (114, 79) IS covered by event 426; `equity_grant.forfeited` (117, 79) IS covered by event 1239; `cap_table.exit` (468, module=null) NOT covered; `valuation_409a.final` (464, null) IS covered by event 1189; `exit_scenario.committed` (470, null) NOT covered; `secondary_transaction.approved` (473, null) NOT covered. Additionally B1-S2 needs new events: `equity_grant.exercised`, `secondary_transaction.settled`, `option_pool.refreshed`. | Insert 6 `trigger_events` rows, each `event_category='state_change'` or `lifecycle` (`option_pool.refreshed → lifecycle`; others `state_change`): `cap_table.exit_initiated`, `exit_scenario.committed`, `secondary_transaction.approved`, `equity_grant.exercised`, `secondary_transaction.settled`, `option_pool.refreshed`. Each `data_object_id` points at the publishing master. |
| B1-S4 | **Lifecycle state realization mismatch, equity_grants** | 7 `equity_grants` lifecycle states (`proposed`, `approved`, `granted`, `vesting`, `exercised`, `forfeited`, `expired`) all have `domain_module_id=79` (COMP-INCENTIVES, owned by COMP-MGMT domain 60), not `domain_module_id=21` (CAP-TABLE-GRANTS). Per Rule #14 the workflow-gate permissions for these states materialize against the realizing module's `domain_module_code`; right now CAP-TABLE-GRANTS materializes zero workflow-gate permissions for equity_grants even though it `role='master'` on the entity. This is the multi-master overlap surface: both modules `master + required` on equity_grants but only one (COMP-INCENTIVES) realizes the lifecycle. Architectural intent question lives in B2-S1; deterministic fix once B2-S1 chooses CAP-TABLE-as-canonical-realizer is PATCH 7 rows to `domain_module_id=21`. Alternative is to DUPLICATE the 7 rows so both modules realize the same states (per-module permission materialization). | Conditional on B2-S1: (a) PATCH 7 lifecycle states from `domain_module_id=79` to `domain_module_id=21`; (b) INSERT 7 new lifecycle state rows for `domain_module_id=21` keeping the original 7 rows on module 79 (each module materializes its own workflow-gate permissions); (c) keep as-is and accept that CAP-TABLE-GRANTS has no workflow-gate surface for `equity_grants`. |
| B1-S5 | **Lifecycle states with `domain_module_id=null` on CAP-TABLE-owned masters** | 14 lifecycle states on 4 masters (`cap_tables` 466-468, `valuations_409a` 462-465, `exit_scenarios` 469-471, `secondary_transactions` 472-475) carry `domain_module_id=null`. NULL means "always reachable when the master is installed" which is correct for state machines that travel inside a single module; however these masters do have a clear realizing module each (cap_tables → CAP-TABLE-LEDGER 20; valuations_409a → CAP-TABLE-VALUATIONS 22; exit_scenarios → CAP-TABLE-EXIT-MODELING 23; secondary_transactions → CAP-TABLE-SECONDARY 25). Per Rule #14 the workflow-gate permissions for `valuation_409a.final`, `exit_scenario.committed`, and `secondary_transaction.approved` should attach to those modules' permission tiers. Leaving NULL is technically valid but means none of the workflow-gate states realize a per-module permission, which is exactly the F2 / E1 hollow-out at a different layer. | PATCH 14 lifecycle state rows: 466-468 → `domain_module_id=20`; 462-465 → `domain_module_id=22`; 469-471 → `domain_module_id=23`; 472-475 → `domain_module_id=25`. |
| B1-S6 | **B-band, missing lifecycle states on 7 workflow-bearing masters** | 7 of 12 masters have zero lifecycle state rows: `security_classes` (771), `shareholder_records` (772), `option_pools` (773), `vesting_schedules` (774), `asc718_expense_periods` (776), `exit_waterfall_calculations` (778), `employee_equity_accounts` (779). Per Rule #12, every `master + required` data_object MUST have lifecycle states unless it qualifies for the config-shape exemption. Candidates for genuine config-shape: `security_classes` (author-once, occasional edits when a new series is created), `vesting_schedules` (template-shaped, applied to grants), `asc718_expense_periods` (period-shaped, opened and closed by a calendar trigger). Candidates that DO need lifecycle: `option_pools` (proposed → board_approved → active → exhausted / refreshed), `shareholder_records` (registered → certificated → transferred / lapsed), `exit_waterfall_calculations` (computed → committed; tied to `exit_scenario` state), `employee_equity_accounts` (provisioned → active → terminated / offboarded). | Author lifecycle states for the 4 workflow-bearing masters (option_pools, shareholder_records, exit_waterfall_calculations, employee_equity_accounts). Surface the 3 config-shape exemption candidates to the user in B2-S6, do NOT auto-populate any notes column to record the exemption (Rule #15). |
| B1-S7 | **A2 / A3 / E1 hard fail, no role bundles on any CAP-TABLE module** | 0 rows in `role_modules` for any of the 6 CAP-TABLE modules. Expected role set from the per-module checklist: `CAP-TABLE-ADMIN` (full admin across all 6 modules), `CFO-OPERATOR` (admin on LEDGER / VALUATIONS / SECONDARY; manage on GRANTS; read on EXIT-MODELING and EMPLOYEE-PORTAL), `EQUITY-ADMIN` (admin on GRANTS / EMPLOYEE-PORTAL; manage on LEDGER / VALUATIONS; read on SECONDARY / EXIT-MODELING), `VALUATION-ANALYST` (admin on VALUATIONS; read on LEDGER / GRANTS), `BOARD-DIRECTOR` (read across LEDGER / VALUATIONS / EXIT-MODELING; approve gates on GRANTS / SECONDARY), `EMPLOYEE-EQUITY-VIEWER` (read on EMPLOYEE-PORTAL only). | Phase E load: insert 6 roles + `role_modules` bundles (6 roles x 6 modules at varying `interaction_level`). Also inserts the per-module permission tiers (baseline-read / baseline-manage / baseline-admin) + workflow-gate permissions from the lifecycle states (after B1-S4, B1-S5 settle the realization module). |
| B1-S8 | **F2 / F3 hard fail, no system skills on any CAP-TABLE module** | 0 `skills` rows with `skill_type='system'` for any of the 6 CAP-TABLE modules. Per Rule #17 every full module needs exactly 1 system skill with >=1 `skill_tools` row. Expected tool floor per module: LEDGER: `query_cap_tables`, `query_shareholder_records`, `query_security_classes`, `create_cap_table`, `update_shareholder_record`, `transfer_shares`; GRANTS: `query_equity_grants`, `query_option_pools`, `query_vesting_schedules`, `create_equity_grant`, `approve_equity_grant`, `forfeit_equity_grant`, `extend_option_pool`; VALUATIONS: `query_valuations_409a`, `compute_valuation_409a` (compute), `query_asc718_expense_periods`, `compute_asc718_expense` (compute), `finalize_valuation_409a`; EXIT-MODELING: `query_exit_scenarios`, `compute_exit_waterfall` (compute), `commit_exit_scenario`; EMPLOYEE-PORTAL: `query_employee_equity_accounts`, `accept_equity_grant`, `exercise_equity_grant`, `view_vesting_schedule`; SECONDARY: `query_secondary_transactions`, `create_secondary_transaction`, `approve_secondary_transaction`, `settle_secondary_transaction`. | Phase F load: insert 6 system skills + ~30 `skill_tools` rows. The compute tools (`compute_valuation_409a`, `compute_asc718_expense`, `compute_exit_waterfall`) require `data_object_id=NULL` per F4. |
| B1-S9 | **Missing regulations on a heavily-regulated domain** | 0 rows in `domain_regulations`. Flagship-vendor coverage anchors 7 statutory frameworks the catalog needs to model: IRS 409A (FMV determination, certification_required-adjacent), ASC 718 / IFRS 2 (stock-based comp accounting), SEC Rule 701 (private-company exemption for equity comp), SEC Reg D / Form D (private placement filings), IRS Form 3921 (ISO exercise reporting), IRS Form 3922 (ESPP purchase reporting), SOX (significant-grant attestation, applies once the cap-table is held by a SOX-reporting company). Plus per-jurisdiction frameworks: EMI / CSOP (UK), VSOP (DE), DTA / DBA (cross-border tax treaties). | INSERT 7 `domain_regulations` rows for the US-anchored set; surface EMI / CSOP / VSOP as candidates in B3 for the user to decide whether to load. Each `applicability` populated per the regulation's reach (mandatory / conditional). Some of the 7 are likely already loaded in the global `regulations` table from prior audits, INSERT first reads `/regulations?regulation_name=ilike.*409A*` etc. before authoring missing ones. |
| B1-H1 | **APQC TAGGING, hard fail** | 0 of 2 cross-domain handoffs carry `handoff_processes` rows. Both are CAP-TABLE-EXIT-MODELING outbound on event 1190 `exit_scenario.executed`. Volume target 1-2 agent_curated tags. Audit proposes both as confident PCF matches. | (see APQC tagging table below) |

#### APQC TAGGING (matches the SKILL anti-pattern: a 6-module domain with prior structural work but zero APQC tagging)

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 1044 | CAP-TABLE-EXIT-MODELING → FUND-ADMIN | `exit_scenario.executed` | `fund_distributions` | Develop merger/demerger/acquisition/exit strategy (16805 L4) parent Develop exit strategy (10952 L3) | 491 (L4) or 354 (L3) | confident L3 (lean to parent 354) |
| 1045 | CAP-TABLE-EXIT-MODELING → PORT-MONIT | `exit_scenario.executed` | `portfolio_companies` | Develop exit strategy (10952 L3) | 354 | confident L3 |

Both handoffs implement "Develop exit strategy" (10952) at L3. Recommend tagging both with process 354; the FUND-ADMIN side may warrant an additional L4 row at 491 (Develop merger/demerger/acquisition/exit strategy) since the distribution mechanic is exit-event specific. Total: 2 `agent_curated` rows at `record_status='new'`.

#### Boundary findings per neighbor (Pass 4 pairwise reconciliation)

For each neighbor with edge weight >= 3 the 5-section pairwise diff produced the following per-neighbor findings.

**COMP-MGMT <-> CAP-TABLE (weight 5, multi-master overlap on `equity_grants`).** Wired handoffs: 0 (no cross-domain handoff rows between COMP-MGMT 60 and CAP-TABLE 162). DMDO overlap: 2 rows on COMP-MGMT side (COMP-INCENTIVES module 79 `master + required` on equity_grants; COMP-STATEMENTS module 85 `contributor + optional` on equity_grants) coexisting with CAP-TABLE-GRANTS module 21 `master + required` on equity_grants. **Section 1**: 0 wired pairs. **Section 2**: N/A (no handoffs to NULL-check). **Section 3**: a likely missing handoff is COMP-INCENTIVES → CAP-TABLE-GRANTS on `compensation_band.assigned_to_role` (or whatever event drives a grant proposal from the compensation policy slice), and the reverse CAP-TABLE-GRANTS → COMP-STATEMENTS on `equity_grant.exercised` for ASC 718 / W-2 income surface. Currently the inter-domain wiring is implicit only via the multi-master DMDO arrangement, which is not enough for the deployer or the architect agent to reason about who reads from whom. **Section 4**: the relationship `offer_versions proposes equity_grants` (row 1332) is the COMP-side declaration but no corresponding event-driven handoff wires the proposal flow. **Section 5**: only 1 cross-relationship (row 1332). Recommendation: add 2 inter-domain handoffs as agent fixes (B1-S10 below); promote one of them to a Bucket 2 architectural question because B2-S1 also asks who realizes lifecycle states.

**FUND-ADMIN <-> CAP-TABLE (weight 3).** Wired pairs: 1 (CAP-TABLE→FUND-ADMIN 1044 `exit_scenario.executed → fund_distributions`). **Section 1**: 1 wired pair, both module FKs populated (source=23 EXIT-MODELING; target=15 inside FUND-ADMIN). **Section 2**: clean. **Section 3**: likely missing inbound FUND-ADMIN → CAP-TABLE on `capital_call.executed → cap_tables` for inserting issuance into the cap table when an LP funds a portco round, deferred to FUND-ADMIN audit. **Section 4**: clean. **Section 5**: 1 cross-rel (row 875 `exit_scenarios drives fund_distributions`). Healthy boundary on the existing edge.

**PORT-MONIT <-> CAP-TABLE (weight 2).** Wired pairs: 1 (CAP-TABLE→PORT-MONIT 1045 `exit_scenario.executed → portfolio_companies`). **Section 1**: 1 wired pair, both module FKs populated (source=23; target=16). **Section 2**: clean. **Section 3**: missing inbound PORT-MONIT → CAP-TABLE on `portco_round.closed → cap_tables` to seed cap-table from PORT-MONIT's deal-stage signal, defer to PORT-MONIT audit. **Section 4**: clean. **Section 5**: no `exit_scenarios → portfolio_companies` cross-relationship row (the existing row 875 points at `fund_distributions` not `portfolio_companies`). Recommend adding a `data_object_relationships` row, deferred to PORT-MONIT audit since PORT-MONIT canonically masters `portfolio_companies`.

**HCM <-> CAP-TABLE (weight 1).** No handoff rows, no DMDO overlap. The 5 `users` (748) `data_object_relationships` rows (887-891) declare the platform-builtin edges (Rule #10) for the 5 workflow-bearing masters; per Rule #10 those are required and present. **Section 1**: 0 wired pairs. **Section 2**: N/A. **Section 3**: HCM → CAP-TABLE on `employee.hired → employee_equity_accounts` (provision a portal account on hire) and HCM → CAP-TABLE on `employee.terminated → equity_grants` (trigger forfeiture for unvested) are the obvious flagship-vendor flows; both are HCM's authoring decision, surfaced in the report-only section. **Section 4**: clean. **Section 5**: 5 platform-builtin edges already in place (rows 887-891).

**EM-FUND-PLATFORM <-> CAP-TABLE (weight 2).** Wired pairs: 0. DMDO overlap: 1 row (EM-FUND-CAPTABLE-LITE module 29 `embedded_master + optional` on cap_tables). This is the starter / lite cross-cutting deployable per Rule #19. **Section 1**: 0 wired pairs. **Section 2**: N/A. **Section 3**: no obvious missing handoff (the lite module embeds cap_tables for read-only EM use; it does not publish events back). **Section 4**: clean per Rule #11 (canonical master exists in CAP-TABLE-LEDGER). **Section 5**: no cross-relationship row, but none needed since the embedded shell defers to the master via the demotion path.

**Lighter neighbors (1 weight, one-line summaries):**

- **ERP-FIN <-> CAP-TABLE (weight 1).** No handoffs, no DMDO, no cross-relationships. Implied edge: `asc718_expense_periods.closed → gl_journal_entries` for booking SBC expense to the general ledger; surfaced in B3-CAND-08 as a missing handoff candidate.
- **ESIGN <-> CAP-TABLE (weight 1).** No handoffs, no DMDO. Implied edge: `signature_records` (CLM-owned) used for grant acceptance, board-consent capture, and secondary-transaction execution; surfaced in B3-CAND-09 as a missing cross-domain edge.
- **CLM <-> CAP-TABLE (weight 1).** No handoffs, no DMDO. Implied edges: investor-rights agreements, stock-purchase agreements, subscription agreements are all `legal_contracts`-shaped and should flow CLM → CAP-TABLE; deferred to B3.
- **GRC <-> CAP-TABLE (weight 1).** No handoffs, no DMDO. Implied edge for SOX significant-grant attestation, deferred to B3.
- **AUDIT <-> CAP-TABLE (weight 1).** No handoffs, no DMDO. Implied edge for grant-issuance audit trail / 409A audit-evidence packaging, deferred to B3.

**In-scope mechanical handoff derived from pairwise (Bucket 1):**

- **B1-S10:** Author 2 inter-domain handoffs to wire the COMP-MGMT multi-master overlap explicitly: (a) COMP-INCENTIVES (79) → CAP-TABLE-GRANTS (21) on a proposal event (likely the existing `offer.accepted` event in HCM / COMP, audit at fix time which event publishes the grant proposal); (b) CAP-TABLE-GRANTS (21) → COMP-STATEMENTS (85) on `equity_grant.exercised` for SBC W-2 / 1099 income surface. The choice of source event for (a) is part of B2-S2 (which slice owns the grant proposal). Mark this row gated on B2-S2 if the event source is unresolved.

#### Bucket 1 count summary

| Finding type | Count |
|---|---|
| STRUCTURAL (B9 + B9b + B-band lifecycle + lifecycle realization) | 6 (S1-S6) |
| A / E / F band hard fails (no roles + no skills + no permissions) | 2 (S7, S8) |
| REGULATIONS missing | 1 (S9) |
| BOUNDARY (intra-domain inter-module handoff for multi-master overlap) | 1 (S10) |
| APQC TAGGING | 1 (H1, 2 row inserts) |
| MISSING (entity gap) | 0 in Bucket 1 (all routed to Bucket 3 as Phase-0-speculative) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| **Bucket 1 total (distinct B1-S*/B1-H* items)** | **12** |

#### Final Bucket 1 inventory

| ID | Description |
|---|---|
| B1-S1 | PATCH 2 trigger_events to set `event_category` (426 `state_change`, 427 `lifecycle`) |
| B1-S2 | Author 10 intra-domain cross-module handoff rows (3 of 10 depend on B1-S3 new events) |
| B1-S3 | Insert 6 missing `trigger_events` (cap_table.exit_initiated, exit_scenario.committed, secondary_transaction.approved, equity_grant.exercised, secondary_transaction.settled, option_pool.refreshed) |
| B1-S4 | Conditional on B2-S1: PATCH 7 equity_grants lifecycle states from module 79 to module 21 (or DUPLICATE; choose per B2-S1) |
| B1-S5 | PATCH 14 lifecycle states from `domain_module_id=null` to the realizing CAP-TABLE module (LEDGER / VALUATIONS / EXIT-MODELING / SECONDARY) |
| B1-S6 | Author lifecycle states for 4 workflow-bearing masters (option_pools, shareholder_records, exit_waterfall_calculations, employee_equity_accounts). Surface 3 config-shape exemption candidates in B2-S6 |
| B1-S7 | Phase E load: 6 roles + 36 `role_modules` bundles + baseline + workflow-gate permissions |
| B1-S8 | Phase F load: 6 system skills + ~30 `skill_tools` rows |
| B1-S9 | INSERT 7 `domain_regulations` for IRS 409A, ASC 718, SEC Rule 701, SEC Reg D / Form D, IRS Form 3921, IRS Form 3922, SOX |
| B1-S10 | Author 2 inter-domain handoffs to wire COMP-MGMT multi-master overlap (one depends on B2-S2) |
| B1-H1 | APQC TAGGING, INSERT 2 `agent_curated` rows for handoffs 1044 (FUND-ADMIN, process 354 or 491) and 1045 (PORT-MONIT, process 354) |
| B1-S11 | DELETE 12 polluted `domain_data_objects.notes` if B2-S3 confirms they were auto-populated (Rule #15) |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Multi-master lifecycle realization for `equity_grants`.** The entity is `role='master' + required` on both CAP-TABLE-GRANTS (module 21) and COMP-INCENTIVES (module 79). Currently the 7 lifecycle states + workflow-gate permissions realize only on module 79 (COMP-INCENTIVES). Three architectural options: (a) PATCH the 7 lifecycle state rows to `domain_module_id=21` so CAP-TABLE owns the workflow (COMP becomes the contributor on compensation-policy slice only); (b) DUPLICATE the lifecycle states so both modules realize the same states with module-prefixed permissions (`comp-incentives:approve_equity_grant` AND `cap-table-grants:approve_equity_grant`), most flexible but doubles the permission surface; (c) keep as-is (COMP owns lifecycle), accept that CAP-TABLE-GRANTS has no workflow-gate permissions for its master and treat it as a "view + reconcile" surface only. Market evidence: Carta and Pulley both treat the cap-table side as the source of truth for grant lifecycle (proposed → approved → granted → vested → exercised) and surface the comp policy as an annotation; Shareworks (Morgan Stanley) integrates with HCM compensation but cap-table lifecycle is owned by the cap-table module. Option (a) matches flagship vendor practice. | Architectural intent + multi-master ownership decision; user's call. | (a) PATCH to module 21 (CAP-TABLE owns lifecycle); (b) DUPLICATE rows for both modules to realize; (c) keep as-is. |
| B2-S2 | **Inter-domain handoff event source for COMP-INCENTIVES → CAP-TABLE-GRANTS grant proposal.** B1-S10's first handoff needs an event that publishes the grant proposal from the compensation-policy slice into CAP-TABLE-GRANTS. Candidate events: (a) the existing `offer.accepted` event (if loaded under HCM offer-management); (b) a new event `compensation_policy.equity_award_assigned` under COMP-INCENTIVES; (c) the existing `equity_grant.granted` (426) as a self-loop from COMP into CAP-TABLE (redundant, the event is already published once). | Event source choice depends on COMP-MGMT's own modularization and which event the user considers canonical for the proposal trigger; the audit can't decide. | (a) reuse `offer.accepted`; (b) author new `compensation_policy.equity_award_assigned`; (c) treat the multi-master DMDO as sufficient (no handoff). |
| B2-S3 | **Rule #15 notes-pollution on every `domain_data_objects` row.** All 12 CAP-TABLE master DDO rows carry populated `notes` (e.g. `cap_tables` "Issuer-side authoritative shareholder ledger.", `equity_grants` "Cap-table-side record of truth for grants: integrates with vesting schedules, ASC 718 expense, and exit waterfalls. ..."). Rule #15 forbids auto-populated notes on `notes` columns; the prior license for slice / pattern annotation in `domain_data_objects.notes` is rescinded. Were these notes user-approved at load time, or were they auto-populated by the loader? | Cannot tell from audit alone; load-time approval status unknown. | (a) Confirm user-approved at load time; leave in place. (b) Confirm auto-populated; PATCH all 12 rows to `notes=''` and log a Rule #15 incident entry in `references/skill-changelog.md`. |
| B2-S4 | **B4 pattern-flag positive re-evaluation.** Current flags read: `shareholder_records.has_personal_content=true`; `equity_grants.has_personal_content=true` + `has_single_approver=true`; `valuations_409a.has_submit_lock=true` + `has_single_approver=true`; `employee_equity_accounts.has_personal_content=true`; `secondary_transactions.has_submit_lock=true` + `has_single_approver=true`. Candidates not currently flagged: (a) `cap_tables.has_personal_content` true (the ledger embeds shareholder names + holdings, GDPR / CCPA in scope); (b) `option_pools.has_submit_lock` true (board-approval gate; once active the pool size is locked unless explicitly refreshed); (c) `equity_grants.has_submit_lock` true (once granted, the strike / share-count / vesting schedule are locked, amendments require new grant + cancellation); (d) `valuations_409a` could carry `has_personal_content=false` explicitly (current null may be a default; the row contains FMV not personal data, low-risk); (e) `secondary_transactions.has_personal_content` true (transfers between named holders, GDPR scope); (f) `asc718_expense_periods.has_submit_lock` true (closed-period accounting standard). | Pattern flags are workflow-shape judgments the user owns; the audit re-evaluates and proposes, the user decides. | Per-flag yes/no from user; capture in Decisions. |
| B2-S5 | **Permission-bundle drift to expect once B1-S7 lands.** The 6 proposed roles + 36 bundle rows assume that `permission_hierarchy` expands `:manage` and `:admin` into the workflow-gate permissions derived from lifecycle states. Same question as CLM B2-S5: is the implicit-grant pattern intentional, or should specific workflow gates (e.g. `cap-table-grants:approve_equity_grant`, `cap-table-valuations:finalize_valuation_409a`, `cap-table-secondary:approve_secondary_transaction`) be enumerated on each role's `role_permissions`? | Hierarchy seeding state isn't introspected here; the audit can't tell whether `permission_hierarchy` already expands the gates catalog-wide. | (a) Confirm hierarchy expands gates, leave bundles tier-only. (b) Add explicit gate grants for sensitive verbs (approve, finalize, terminate, void). (c) Defer until Phase E runs, audit again post-load. |
| B2-S6 | **B-band config-shape exemptions on 3 masters.** B1-S6 surfaces `security_classes`, `vesting_schedules`, `asc718_expense_periods` as config-shape exemption candidates (no lifecycle states authored, plausibly correct). Per Rule #12 + Rule #15 the exemption must be surfaced for user decision and CANNOT be auto-recorded in `notes`. | Config-shape vs workflow-shape is the user's call; the audit recommends but does not commit. | Per-master yes / no: (a) exempt (do nothing further); (b) author lifecycle states for the master. |
| B2-S7 | **Domain `description` Rule #18 cleanliness review.** Current `domains.description` reads: "Shareholder ledger, option-pool management, 409A valuations, RSU/option grant workflows, exit waterfall modeling, and ASC 718 stock-based compensation accounting. Primary buyer is the portfolio-company CFO, not the VC firm." Reads clean (no vendor names; statutory references for 409A and ASC 718 are allowed per Rule #18). Buyer note is structurally OK but somewhat lifted-from-marketing in tone; user may want to drop "Primary buyer is the portfolio-company CFO, not the VC firm." since `min_org_size` and `cost_band` carry that signal structurally. | Editorial / Rule #18 boundary judgment. | (a) Leave as-is. (b) PATCH description to drop the buyer sentence (replace with the seven-word version: "Shareholder ledger, option-pool management, 409A valuations, RSU/option grant workflows, exit waterfall modeling, and ASC 718 stock-based compensation accounting."). |

### Bucket 3, Phase 0 pending (speculative)

Market-audit Pass 2 ran the semantic enumeration against Carta, Pulley, Ledgy, AngelList Stack, Shareworks, J.P. Morgan Workplace Solutions, Astrella, Eqvista, Vestd, Cake Equity. Compliance anchor surface (per B1-S9): IRS 409A + ASC 718 + SEC Rule 701 + SEC Reg D + IRS Form 3921 + IRS Form 3922 + SOX + GDPR / CCPA + AML / KYC + EMI (UK) + CSOP (UK) + VSOP (DE). The subagent recipe was not spawned per orchestrator instruction; the candidates below come from analyst flagship-vendor knowledge. Each is a candidate market gap for Phase 0 verification, not a vetted finding.

#### MISSING entity candidates surfaced by flagship-vendor knowledge

| ID | Candidate entity | Vendor knowledge basis | Proposed module |
|---|---|---|---|
| B3-CAND-01 | `safe_notes` | Carta, AngelList Stack, Pulley all model SAFEs (Simple Agreement for Future Equity) as first-class instruments distinct from equity_grants and security_classes (Y Combinator post-money SAFE is the dominant pre-priced-round instrument in the US ecosystem). Currently no SAFE entity, the conversion mechanics live nowhere. | new master in CAP-TABLE-LEDGER or new module `CAP-TABLE-CONVERTIBLES` |
| B3-CAND-02 | `convertible_notes` | Carta, Pulley, Ledgy model convertible notes as a distinct instrument (debt that converts on a qualified financing). Different conversion math from SAFEs, different cap / discount mechanics, different accrued-interest tracking. | new master, same module as B3-CAND-01 |
| B3-CAND-03 | `warrants` | Carta, AngelList model warrants as a separate instrument (often issued to vendors, banks, lenders, and early commercial partners). Currently security_classes might be stretched to cover, but vesting / exercise economics differ. | new master in CAP-TABLE-LEDGER or `CAP-TABLE-CONVERTIBLES` |
| B3-CAND-04 | `tax_form_records` (3921 / 3922 / 1099) | Carta, Shareworks both generate 3921 (ISO exercise) and 3922 (ESPP purchase) annually, plus 1099-B / 1099-NEC for NQSO cash exercises. Currently no tax-form record entity, the annual-filing surface is opaque. | new master in `CAP-TABLE-VALUATIONS` or a new module `CAP-TABLE-TAX-REPORTING` |
| B3-CAND-05 | `board_consents` | Carta, Pulley, Shoobx all model board consents (written / meeting) as first-class records for grant issuance, repricing, and pool refreshes. The CAP-TABLE state machine has `approved` states but no record of which board action approved them. | new master in CAP-TABLE-LEDGER or a new module `CAP-TABLE-BOARD-CONSENTS` |
| B3-CAND-06 | `share_certificates` / `stock_certificates` | Carta, Pulley, Ledgy issue digital share certificates with QR codes and DLT-anchored proofs (Astrella and Shoobx are particularly heavy here). Currently no certificate entity, `shareholder_records` is the closest but conflates legal-record-of-ownership with the certificate itself. | new master in CAP-TABLE-LEDGER |
| B3-CAND-07 | `espp_records` / `espp_offerings` | Shareworks, J.P. Morgan Workplace Solutions, Carta all run ESPP (Employee Stock Purchase Plans) with per-offering enrollment, payroll withholding, purchase events, and qualifying / disqualifying holding-period tracking. Currently no ESPP entity, the program-level shape is opaque. | new master in CAP-TABLE-EMPLOYEE-PORTAL or a new module `CAP-TABLE-ESPP` |
| B3-CAND-08 | Handoff: `asc718_expense_period.closed → ERP-FIN.gl_journal_entries` | Carta / Pulley both push monthly SBC expense to the general ledger; absent from current handoff set. | inserted as a handoff, not a new entity |
| B3-CAND-09 | Handoff / cross-rel: `signature_records → equity_grants` for grant acceptance, board consents, secondary transactions | Carta, Pulley, Shoobx, AngelList Stack all wire DocuSign / native e-sig for grant acceptance and board consent. Currently no ESIGN handoff or cross-relationship row references CAP-TABLE. | inserted as handoffs + cross-relationships, not a new entity |
| B3-CAND-10 | `phantom_shares` / `sar_grants` / `profits_interests` (alternative-equity instruments) | Ledgy (VSOP for DE), Carta (US phantom-equity), Shareworks (profits interests for LLC). Currently equity_grants conflates all instrument types; profits-interest LLC mechanics differ enough to warrant a separate entity. | optional new master in CAP-TABLE-GRANTS or `CAP-TABLE-ALT-EQUITY` |
| B3-CAND-11 | `beneficial_owners` / `kyc_records` | FinCEN beneficial-ownership reporting (Corporate Transparency Act 2024) requires cap-table issuers to maintain a beneficial-owner record distinct from `shareholder_records`. AML / KYC checks at secondary-transaction time map to a per-holder KYC record. | new master in CAP-TABLE-LEDGER or a new module `CAP-TABLE-COMPLIANCE` |
| B3-CAND-12 | `voting_records` / `proxy_records` | Carta, AngelList model annual / extraordinary shareholder votes (M&A consents, charter amendments, written consents in lieu of meeting). Currently no voting-record entity. | optional new master in `CAP-TABLE-BOARD-CONSENTS` (with B3-CAND-05) |

#### MODULARIZATION candidates

- **`CAP-TABLE-CONVERTIBLES` module candidate.** If B3-CAND-01 / 02 / 03 (SAFEs, convertible notes, warrants) get loaded, a 7th module for the convertibles slice makes more sense than overloading CAP-TABLE-LEDGER. 6 modules + 1 = 7, consistent with capability count.
- **`CAP-TABLE-TAX-REPORTING` module candidate.** B3-CAND-04 (tax forms) + handoff B3-CAND-08 (ASC 718 → ERP-FIN) belong together; could pair with CAP-TABLE-VALUATIONS as a sibling.
- **`CAP-TABLE-ESPP` module candidate.** B3-CAND-07 (ESPP records). If ESPP is in scope, it's a sufficiently distinct workflow (offering periods + payroll withholding) to warrant its own module rather than living in CAP-TABLE-EMPLOYEE-PORTAL.
- **`CAP-TABLE-COMPLIANCE` module candidate.** B3-CAND-11 (beneficial owners + KYC) is a distinct compliance workflow likely shared with KYC/AML domains (B2C / B2B onboarding). Likely a cross-cutting module hosted on both CAP-TABLE and KYC-AML if that domain exists.
- **`CAP-TABLE-BOARD-CONSENTS` module candidate.** B3-CAND-05 + B3-CAND-12 (board consents + voting records). Could also live as `BOARD-MGMT` cross-cutting module hosted by CAP-TABLE + GRC + AUDIT + IPO-MGMT.

#### Compliance regulation candidates beyond B1-S9

- **GDPR / CCPA** applicability (mandatory for any cap-table with EU / California shareholders or employees).
- **EMI / CSOP** (UK tax-advantaged schemes; Ledgy, Vestd, Capdesk all model these natively).
- **VSOP** (DE Virtuelle Stock Option Plan, Ledgy core market).
- **FinCEN Corporate Transparency Act** (US beneficial-ownership reporting, 2024-effective).
- **SEC Reg CF** (crowdfunding exemption, for cap-tables with Reg CF investors).

#### Candidate-domain queue surfaced by this audit

The audit surfaces one strong domain-tier candidate worth queueing in `audits/_missing-domains.md`:

- **EQUITY-COMP-PLATFORM**, covers the multi-master overlap between CAP-TABLE and COMP-MGMT specifically for the equity-comp slice (grant proposal + acceptance + vesting + exercise + tax surface). The point-solution-market test passes: Shareworks (Morgan Stanley at Work), J.P. Morgan Workplace Solutions, Carta Equity Plans, Pulley Equity Plans, Shareworks subscription are all distinct equity-comp platforms competing as a category. The candidate is queued via the helper below.

A second candidate worth queueing speculatively:

- **PRIVATE-COMPANY-TRANSFER-AGENT**, the third-party share transfer agent role (Computershare, Equiniti, AST, Continental Stock Transfer, Carta Transfer Agent, Pulley Transfer Agent). Private-company transfer agent is a distinct fee-for-service category from cap-table software; the entity surface is `share_transfers` + `ssn_w9_records` + `1099_distributions` + `lost-certificate_affidavits`. Borderline market (often bundled into cap-table software), surface as a Phase 0 candidate.

**Bucket 3 verification path:** vet via formal Phase 0 vendor research (produces `c:/tmp/CAP-TABLE-phase0-<date>.md` per-entity vendor coverage) or eyeball-mode (user names which of the 12 entity candidates + 5 modularization candidates + 5 regulation candidates + 2 domain candidates to treat as confirmed).

### Cross-bucket dependencies

- **B1-S4 is gated on B2-S1**: the lifecycle realization choice (PATCH vs DUPLICATE vs keep-as-is) for `equity_grants` must come from the user before the fix loads.
- **B1-S10 is gated on B2-S2**: the COMP-INCENTIVES → CAP-TABLE-GRANTS handoff source event depends on the user's call (reuse `offer.accepted`, author new event, or treat the multi-master DMDO as sufficient).
- **B1-S2 partially depends on B1-S3**: 3 of the 10 new intra-domain handoffs use trigger_events that B1-S3 has to insert first (`equity_grant.exercised`, `secondary_transaction.settled`, `option_pool.refreshed`).
- **B1-S6 partially depends on B2-S6**: 3 of the 4 missing-lifecycle masters could be config-shape exempt; the user's call on those 3 determines whether B1-S6 authors 4 or 1 lifecycle state machine.
- **B1-S7 is sequenced after B1-S4 + B1-S5**: workflow-gate permissions materialize from lifecycle states' realizing module; settle the realization modules first.
- **B1-S11 is gated on B2-S3**: Rule #15 PATCH only if the user confirms the 12 notes were auto-populated.
- **B3 candidates may inform B2-S4**: if SAFEs / convertible notes / phantom shares get loaded, the `has_personal_content` and `has_submit_lock` re-evaluation will need extending.
- Buckets 2 and 3 are otherwise independent; you can resolve them in any order.

### Per-bucket prompts

**Bucket 1, fix these now?** Reply with: `all`, or list (e.g. `S1, S3, S5, S9, H1`), or `skip`.

- **S1 (event_category PATCH on 2 events)** is trivial; one PATCH each.
- **S2 (10 new intra-domain handoffs)** depends on S3 (3 new events first).
- **S3 (6 missing trigger_events)** is structural; no other dependencies.
- **S4 (equity_grants lifecycle realization PATCH or DUPLICATE)** is gated on B2-S1.
- **S5 (14 lifecycle states PATCH from null to realizing module)** is mechanical, deterministic; can fire independently.
- **S6 (lifecycle author for 4 masters + 3 exemption decisions)** is gated on B2-S6 for the exemption calls; the 4 workflow-bearing ones can be authored independently.
- **S7 (Phase E load, 6 roles + 36 bundles + permission tiers)** is sequenced after S4 + S5.
- **S8 (Phase F load, 6 system skills + ~30 skill_tools)** can fire after S5; closes F2 / F3.
- **S9 (7 regulations INSERT)** is structural, no dependencies.
- **S10 (2 inter-domain COMP handoffs)** one is gated on B2-S2, the other can fire.
- **H1 (2 APQC tags)** load now or in follow-up batch?
- **S11 (12 DDO notes PATCH to empty)** gated on B2-S3.

**Bucket 2, what's your call on each?** Wait for per-item decisions before acting.

- **B2-S1 (equity_grants lifecycle realization):** (a) PATCH to module 21, (b) DUPLICATE for both modules, (c) keep as-is.
- **B2-S2 (COMP → CAP-TABLE handoff event source):** (a) reuse `offer.accepted`, (b) author new event, (c) no handoff.
- **B2-S3 (Rule #15 notes-pollution on 12 DDO rows):** confirm auto-populated (PATCH to empty), or confirm user-approved at load time.
- **B2-S4 (pattern-flag re-evaluation):** per-flag yes / no on 6 candidate flags.
- **B2-S5 (permission-bundle drift):** which option (a / b / c)?
- **B2-S6 (config-shape exemptions on 3 masters):** per-master exempt / author lifecycle.
- **B2-S7 (description Rule #18 review):** leave as-is, or drop the buyer sentence.

**Bucket 3, Phase 0 pending, vet via formal Phase 0 vendor research or eyeball-mode?** If eyeball-mode, name which of the 12 entity candidates + 5 modularization candidates + 5 regulation candidates + 2 domain candidates to treat as confirmed.

### Report-only follow-ups (owed by other domains)

These items are surfaced in this audit but the fix belongs to another domain's b1 audit. CAP-TABLE itself has no outstanding NULL-FK report-only items: both outbound handoffs (1044, 1045) carry populated `source_domain_module_id` and `target_domain_module_id` on both sides.

| Owing domain | Owed work |
|---|---|
| COMP-MGMT | Resolve B2-S1 in the COMP-MGMT audit, decide whether COMP-INCENTIVES retains lifecycle realization for equity_grants or transfers to CAP-TABLE-GRANTS. If transferred, COMP-INCENTIVES drops its `master + required` on equity_grants in favor of `contributor + required` (compensation-policy slice only). Also add the inter-domain handoff per B1-S10 if option (a) or (b) of B2-S2 is chosen. |
| FUND-ADMIN | Consider adding inbound to CAP-TABLE on `capital_call.executed → cap_tables` for inserting issuance into the cap table when an LP funds a portco round. |
| PORT-MONIT | Consider adding inbound to CAP-TABLE on `portco_round.closed → cap_tables` (seeds cap-table from deal-stage signal). Also consider adding the `exit_scenarios → portfolio_companies` cross-relationship row that currently does not exist (row 875 covers fund_distributions only). |
| HCM | Consider adding outbound `employee.hired → CAP-TABLE.employee_equity_accounts` (provision portal on hire) and `employee.terminated → CAP-TABLE.equity_grants` (trigger forfeiture for unvested) per the flagship-vendor pattern. |
| EM-FUND-PLATFORM | Confirm `EM-FUND-CAPTABLE-LITE` embedded shell on cap_tables is intentional, or whether it should consume the full CAP-TABLE-LEDGER (Rule #19 lite-path question). |
| ESIGN | Consider adding outbound handoffs to CAP-TABLE on `envelope.completed` for grant-acceptance and board-consent signing flows. |
| CLM | Consider adding outbound handoffs to CAP-TABLE on investor-rights agreements, stock-purchase agreements, subscription agreements (legal_contracts → CAP-TABLE entities). |
| GRC | Consider adding inbound handoff from CAP-TABLE on `equity_grant.granted` for SOX significant-grant attestation tracking. |
| AUDIT | Consider adding inbound handoff from CAP-TABLE on 409A finalization for audit-evidence packaging. |
| ERP-FIN | Consider adding inbound from CAP-TABLE on `asc718_expense_period.closed` for SBC expense GL booking (B3-CAND-08). |

### Decisions

_(empty pending user review)_

### Candidate-domain queue updates

Helper invoked to queue 1 candidate domain:

- `EQUITY-COMP-PLATFORM` (Equity Compensation Platform). Vendor evidence: Shareworks (Morgan Stanley at Work), J.P. Morgan Workplace Solutions, Carta Equity Plans, Pulley Equity Plans, Shareworks subscription. Adjacency: CAP-TABLE, COMP-MGMT, HCM, ESPP. Capabilities: equity-grant proposal, acceptance, vesting, exercise, tax surface, ESPP enrollment.

Second optional candidate (lower confidence) is queued at user discretion: `PRIVATE-COMPANY-TRANSFER-AGENT`. Not queued automatically pending the user's call.
