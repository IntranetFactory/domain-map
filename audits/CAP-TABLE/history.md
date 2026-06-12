# CAP-TABLE audit history

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
| FIN | 0 | 0 | 0 | 0 (implied via `asc718_expense_periods` feeding GL, currently no edge) | 1 | Lightweight |
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

- **FIN <-> CAP-TABLE (weight 1).** No handoffs, no DMDO, no cross-relationships. Implied edge: `asc718_expense_periods.closed → gl_journal_entries` for booking SBC expense to the general ledger; surfaced in B3-CAND-08 as a missing handoff candidate.
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
| B3-CAND-08 | Handoff: `asc718_expense_period.closed → FIN.gl_journal_entries` | Carta / Pulley both push monthly SBC expense to the general ledger; absent from current handoff set. | inserted as a handoff, not a new entity |
| B3-CAND-09 | Handoff / cross-rel: `signature_records → equity_grants` for grant acceptance, board consents, secondary transactions | Carta, Pulley, Shoobx, AngelList Stack all wire DocuSign / native e-sig for grant acceptance and board consent. Currently no ESIGN handoff or cross-relationship row references CAP-TABLE. | inserted as handoffs + cross-relationships, not a new entity |
| B3-CAND-10 | `phantom_shares` / `sar_grants` / `profits_interests` (alternative-equity instruments) | Ledgy (VSOP for DE), Carta (US phantom-equity), Shareworks (profits interests for LLC). Currently equity_grants conflates all instrument types; profits-interest LLC mechanics differ enough to warrant a separate entity. | optional new master in CAP-TABLE-GRANTS or `CAP-TABLE-ALT-EQUITY` |
| B3-CAND-11 | `beneficial_owners` / `kyc_records` | FinCEN beneficial-ownership reporting (Corporate Transparency Act 2024) requires cap-table issuers to maintain a beneficial-owner record distinct from `shareholder_records`. AML / KYC checks at secondary-transaction time map to a per-holder KYC record. | new master in CAP-TABLE-LEDGER or a new module `CAP-TABLE-COMPLIANCE` |
| B3-CAND-12 | `voting_records` / `proxy_records` | Carta, AngelList model annual / extraordinary shareholder votes (M&A consents, charter amendments, written consents in lieu of meeting). Currently no voting-record entity. | optional new master in `CAP-TABLE-BOARD-CONSENTS` (with B3-CAND-05) |

#### MODULARIZATION candidates

- **`CAP-TABLE-CONVERTIBLES` module candidate.** If B3-CAND-01 / 02 / 03 (SAFEs, convertible notes, warrants) get loaded, a 7th module for the convertibles slice makes more sense than overloading CAP-TABLE-LEDGER. 6 modules + 1 = 7, consistent with capability count.
- **`CAP-TABLE-TAX-REPORTING` module candidate.** B3-CAND-04 (tax forms) + handoff B3-CAND-08 (ASC 718 → FIN) belong together; could pair with CAP-TABLE-VALUATIONS as a sibling.
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
| FIN | Consider adding inbound from CAP-TABLE on `asc718_expense_period.closed` for SBC expense GL booking (B3-CAND-08). |

### Decisions

_(empty pending user review)_

### Candidate-domain queue updates

Helper invoked to queue 1 candidate domain:

- `EQUITY-COMP-PLATFORM` (Equity Compensation Platform). Vendor evidence: Shareworks (Morgan Stanley at Work), J.P. Morgan Workplace Solutions, Carta Equity Plans, Pulley Equity Plans, Shareworks subscription. Adjacency: CAP-TABLE, COMP-MGMT, HCM, ESPP. Capabilities: equity-grant proposal, acceptance, vesting, exercise, tax surface, ESPP enrollment.

Second optional candidate (lower confidence) is queued at user discretion: `PRIVATE-COMPANY-TRANSFER-AGENT`. Not queued automatically pending the user's call.

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical subset of the 12 B1 items via loader `c:/dev/domain-map/.tmp_deploy/fix_cap_table_b1_technical_2026_05_31.ts`.

### Applied (4 of 12 B1 items)

- **B1-S1 (B9 event_category backfill):** PATCHed `trigger_events.event_category='lifecycle'` on row 427 (`equity_grant.vested`) per the audit's mapping (vesting is a recurring time-driven checkpoint). Row 426 (`equity_grant.granted`) was already `state_change` in live (audit asserted empty); no PATCH needed there.
- **B1-S5 (lifecycle states realization module PATCH):** PATCHed `data_object_lifecycle_states.domain_module_id` from NULL to the realizing CAP-TABLE module on 14 rows. Mapping verified against `domain_module_data_objects` master-role lookups (B10b derivability): valuations_409a states 462-465 -> module 22 (VALUATIONS); cap_tables states 466-468 -> module 20 (LEDGER); exit_scenarios states 469-471 -> module 23 (EXIT-MODELING); secondary_transactions states 472-475 -> module 25 (SECONDARY).
- **B1-S9 partial (regulations attach):** INSERTed 1 `domain_regulations` row attaching the existing SOX regulation (id 5) to CAP-TABLE (162) with `applicability='conditional'`. `record_status` omitted (Rule #1 default `new`), `notes` and `condition_notes` omitted (Rule #15 + no audit-approved wording). Remaining 6 regulations from the audit (409A, ASC 718, SEC Rule 701, Reg D / Form D, Form 3921, Form 3922) deferred because the underlying `regulations` rows do not exist yet and creating new regulations entities is out of technical-only scope.
- **B1-H1 (APQC tagging):** INSERTed 2 `handoff_processes` rows for handoff 1044 (CAP-TABLE-EXIT-MODELING -> FUND-ADMIN, `exit_scenario.executed -> fund_distributions`): process 354 (L3 "Develop exit strategy") and process 491 (L4 "Develop merger/demerger/acquisition/exit strategy"). Both PCF ids verified resolvable in `/processes`. `proposal_source='agent_curated'`, `role='implements'`, `record_status` omitted (Rule #1), `notes` omitted (Rule #15). Handoff 1045 already carried a `handoff_processes` row (635) for process 354, so no insert was needed there.

### Deferred (8 of 12 B1 items)

- **B1-S2 (10 new intra-domain cross-module handoff rows):** Defer; new `handoffs` entities, plus 3 of 10 depend on B1-S3's new trigger_events. Out of technical-only scope (no rule licenses bulk new handoff inserts here).
- **B1-S3 (6 new trigger_events):** Defer; new entities, out of technical-only scope.
- **B1-S4 (equity_grants lifecycle realization PATCH or DUPLICATE):** Defer; gated on B2-S1 user choice between (a) PATCH to module 21, (b) DUPLICATE for both modules, (c) keep as-is.
- **B1-S6 (lifecycle states for 4 workflow-bearing masters):** Defer; new lifecycle state entities, and the 3 config-shape exemption candidates (security_classes, vesting_schedules, asc718_expense_periods) are gated on B2-S6 user call.
- **B1-S7 (Phase E roles + permissions + role_modules bundles):** Defer; full Phase E load (6 new roles, 36 role_modules rows, baseline + workflow-gate permissions) outside the technical-only scope, and sequenced after B1-S4 + B1-S5.
- **B1-S8 (Phase F system skills + skill_tools):** Defer; full Phase F load (6 new `skills` rows + ~30 `skill_tools` rows) outside the technical-only scope.
- **B1-S10 (2 inter-domain COMP handoffs):** Defer; new `handoffs` entities, plus 1 of 2 (COMP-INCENTIVES -> CAP-TABLE-GRANTS event source) gated on B2-S2.
- **B1-S11 (12 DDO notes='' revert):** Defer; gated on B2-S3 user confirmation that the 12 `domain_data_objects.notes` were auto-populated vs user-approved. The technical-fix rule licenses `notes=''` reverts when the audit pre-specifies row IDs and the user has authorized the revert; B2-S3 is the explicit user-decision gate, so this fires only after that call.

### Loader

`c:/dev/domain-map/.tmp_deploy/fix_cap_table_b1_technical_2026_05_31.ts` (run from project root via `bun run`).

### Spot-check links

- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/data_object_lifecycle_states
- https://tests.semantius.app/domain_map/domain_regulations
- https://tests.semantius.app/domain_map/handoff_processes

## 2026-05-31, Audit

### Summary

- **Current footprint:** unchanged shape, 6 full modules (`CAP-TABLE-LEDGER`, `CAP-TABLE-GRANTS`, `CAP-TABLE-VALUATIONS`, `CAP-TABLE-EXIT-MODELING`, `CAP-TABLE-EMPLOYEE-PORTAL`, `CAP-TABLE-SECONDARY`), 0 starter / hosted modules, 12 masters (`cap_tables`, `security_classes`, `shareholder_records`, `equity_grants`, `option_pools`, `vesting_schedules`, `valuations_409a`, `asc718_expense_periods`, `exit_scenarios`, `exit_waterfall_calculations`, `employee_equity_accounts`, `secondary_transactions`), 22 DMDO rows (10 `master + required`, 12 `embedded_master + required`, 0 `consumer`, 0 `contributor`), 9 capabilities (1 cross-cutting `APPROVAL-WORKFLOW`), 9 `domain_module_capabilities` realizations across 5 of 6 modules (CAP-TABLE-SECONDARY hosts CAPTABLE-SECONDARY-TRANSACTIONS; CAP-TABLE-EXIT-MODELING hosts CAPTABLE-EXIT-WATERFALL-MODELING; both `master`-bearing modules realize their named capability), 7 trigger_events on CAP-TABLE masters (5 properly categorized + 2 corrected since the prior audit), 2 outbound cross-domain handoffs (1044, 1045) both on `exit_scenario.executed`, 0 inbound / intra-domain handoff rows, 8 aliases on 5 masters, 21 lifecycle states across 5 masters (`equity_grants` still under module 79 COMP-INCENTIVES; the other 4 masters' states now point at the realizing CAP-TABLE module per the 2026-05-31 Continuation), 0 system skills, 0 `skill_tools`, 0 `permissions`, 0 `role_modules`, 1 `domain_regulations` (SOX, applicability `conditional`), 3 `handoff_processes` rows covering both handoffs (1044 = process 354 + 491, 1045 = process 354). 12 `domain_data_objects` rows on the domain rollup still carry populated `notes` text (Rule #15 question from B2-S3 not yet decided by user). 22 `domain_module_data_objects` rows carry empty `notes` (clean).
- **Vendor-surface basis:** unchanged from the 2026-05-30 audit, anchored on Carta, Pulley, AngelList Stack, Shareworks (Morgan Stanley at Work), J.P. Morgan Workplace Solutions, Ledgy, Vestd, Astrella, Eqvista, Cake Equity. Compliance set: IRS 409A, ASC 718 / IFRS 2, SEC Rule 701, SEC Reg D / Form D, IRS Form 3921 / 3922 / 1099, SOX (now attached), GDPR / CCPA, FinCEN Corporate Transparency Act, EMI / CSOP (UK), VSOP (DE), DTA / DBA.
- **Bucket 1 (in-scope, agent fixable):** 9 items (down from 12 last audit; B1-S1, B1-S5, B1-H1 resolved; B1-S9 partially resolved with 1 of 7 regulations attached, the remaining 6 regulation-row creates carry forward as a renamed item B1-S9b since the underlying `regulations` rows must be authored before they can attach).
- **Bucket 2 (surface-for-user, judgment):** 7 items (unchanged from last audit; none decided yet; B2-S3 Rule #15 question on the 12 `domain_data_objects.notes` rows is the time-sensitive one since it gates B1-S11).
- **Bucket 3 (Phase 0 pending, speculative):** 12 entity / handoff candidates + 5 modularization candidates + 5 regulation candidates + 2 domain candidates (`EQUITY-COMP-PLATFORM` queued in `_missing-domains.md` since the 2026-05-30 audit; `PRIVATE-COMPANY-TRANSFER-AGENT` still candidate). Carry forward unchanged.

### Validate b1 structural bands

| Band | Verdict | Notes |
|---|---|---|
| A1 (domain metadata) | pass | 7 business-meaningful columns populated; `crud_percentage=70`, `business_logic` populated, `min_org_size='10 xs <50'`, `cost_band='$'`, `usa_market_size_usd_m=800`, `market_size_source_year=2024`. |
| A2 / A3 (RBAC authoring) | **fail** | 0 `permissions` rows on CAP-TABLE modules; 0 `role_modules` bundles. B1-S7 carry forward. |
| M1 (≥1 full module per domain) | pass | 6 full modules. |
| M2 (≥2 full modules for ≥3-capability domain) | pass | 6 full / 9 capabilities. |
| M3-M6 (module shape coherence) | pass | Code patterns clean, master coverage balanced. |
| M7 (within-domain master + sibling consumer overlap) | pass | 0 consumer rows; the 12 `embedded_master` shells carry the deployability path. |
| B5 (relationship graph internal consistency) | pass | 22 `data_object_relationships` rows touching CAP-TABLE masters: 13 intra-domain edges (859-870 + 1553), 5 `users` (748) platform-builtin edges (887-891, plus 1546 `receives` and 1547 `approves` on `equity_grants`), 1 cross-domain `offer_versions proposes equity_grants` (1332 COMP-MGMT), 1 cross-domain `exit_scenarios drives fund_distributions` (875 FUND-ADMIN). Rule #10 platform-builtin edges present on all 5 workflow-bearing masters. |
| B7 (aliases on at least the renaming-prone masters) | pass | 8 aliases across `cap_tables`, `security_classes`, `valuations_409a`, `vesting_schedules`, `exit_scenarios`. Other 7 masters carry no aliases (acceptable, none are renaming-prone). |
| B9 (trigger_events `event_category` non-empty + within enum) | pass | All 7 events on CAP-TABLE masters carry a categorized `event_category` value within the Rule #13 enum. The 2026-05-30 B1-S1 finding (2 empty categories) is resolved. |
| B9b (intra-domain cross-module handoffs) | **fail** | 0 intra-domain handoff rows on a 6-module domain. B1-S2 carry forward. |
| B10b (cross-domain NULL FK reporting) | pass | Both outbound handoffs (1044, 1045) carry populated source + target `domain_module_id` FKs. |
| B11 (lifecycle states present on workflow-bearing masters) | **fail** | 7 of 12 masters carry no lifecycle states (`security_classes`, `shareholder_records`, `option_pools`, `vesting_schedules`, `asc718_expense_periods`, `exit_waterfall_calculations`, `employee_equity_accounts`). 4 are workflow-bearing per B1-S6, 3 are config-shape exemption candidates routed to B2-S6. |
| B12 (lifecycle states realized on a module per Rule #14) | **partial pass** | The 14 states authored on `cap_tables` / `valuations_409a` / `exit_scenarios` / `secondary_transactions` now carry the realizing CAP-TABLE `domain_module_id` (PATCH applied in 2026-05-31 Continuation, verified live). The 7 `equity_grants` states still realize on module 79 (COMP-INCENTIVES); B2-S1 architectural choice still open. |
| C1 / C2 (capability mapping) | pass | 9 `capability_domains` rows for CAP-TABLE; 9 `domain_module_capabilities` realizations across all 6 modules (CAPTABLE-SECONDARY-TRANSACTIONS on module 25; CAPTABLE-EXIT-WATERFALL-MODELING on module 23; CAPTABLE-EMPLOYEE-EQUITY-PORTAL on module 24; CAPTABLE-SHAREHOLDER-LEDGER on module 20; CAPTABLE-OPTION-POOL-MGMT + CAPTABLE-GRANT-WORKFLOWS + APPROVAL-WORKFLOW on module 21; CAPTABLE-409A-VALUATIONS + CAPTABLE-ASC718-EXPENSE on module 22). |
| D1 (data_object kinds) | pass | 12 of 12 CAP-TABLE masters are `kind='domain_owned'`; no platform-builtin masquerading. |
| E1 (system role bundles on full modules) | **fail** | 0 `role_modules` rows for any CAP-TABLE module. B1-S7 carry forward. |
| E2-E5 (role tier coherence, permission tier coherence, baseline grant coverage) | untriggered | Cannot evaluate, no roles authored. |
| F1 (system-skill placeholder) | n/a | F1 covers legacy-cleanup, not applicable on greenfield. |
| F2 (≥1 `skill_type='system'` per full module) | **fail** | 0 system skills on any CAP-TABLE module. B1-S8 carry forward. |
| F3 (≥1 `skill_tools` row per system skill) | **fail** | Consequence of F2. |
| F4 (tool `operation_kind` ↔ `data_object_id` invariants) | trivially pass | No rows to validate. |
| F5 (Semantius score) | **undefined / uncomputable** | No `skill_tools` rows on any CAP-TABLE module. The score is undefined; F2 is the diagnostic, not F5. |
| H1 (APQC tagging on cross-domain handoffs) | pass | Both outbound handoffs carry `handoff_processes` rows; 3 rows total (`agent_curated`, `record_status='new'`). 0 approved (process side-bar `agent_curated` count = 3; quality headline 0 approved). |

### Pattern-flag live re-check (B4)

Re-checking flags against the 2026-05-30 audit findings: `cap_tables.has_personal_content=false`, `option_pools.has_submit_lock=false`, `equity_grants.has_submit_lock=false`, `valuations_409a.has_personal_content=false`, `secondary_transactions.has_personal_content=false`, `asc718_expense_periods.has_submit_lock=false`. None of the 6 B2-S4 candidate flips have been applied. B2-S4 carries forward unchanged.

### Notes-pollution live re-check (B2-S3)

`domain_data_objects` rows on CAP-TABLE (id 1084-1095): all 12 still carry populated `notes` text matching the wording from the 2026-05-30 audit (no PATCH applied). `domain_module_data_objects` rows for modules 20-25: all 22 carry empty `notes` (clean). The B2-S3 question is therefore still scoped to the 12 DDO rows, not the 22 DMDO rows. B1-S11 stays gated on B2-S3.

### Handoff integration-pattern observation (report only)

Both cross-domain handoffs (1044, 1045) carry `integration_pattern='manual_handoff'` and `friction_level='high' / 'medium'`. The typical CAP-TABLE → fund-admin / portfolio-monitoring pattern in flagship vendors (Carta -> AngelList, Pulley -> LP reporting) is closer to `lifecycle_progression / low` for the executed-scenario push (data is committed in CAP-TABLE, pushed deterministically to the LP-side). `manual_handoff` reflects today's manual reconciliation reality; whether to soften the friction to `lifecycle_progression` is a workflow-architecture call for the FUND-ADMIN and PORT-MONIT audits, not CAP-TABLE's. Surfaced as a report-only follow-up.

### Bucket 1 carry-forward inventory

| ID | Description | Status |
|---|---|---|
| B1-S2 | Author 10 intra-domain cross-module handoff rows (3 of 10 depend on B1-S3 new events). | carry forward, unchanged |
| B1-S3 | Insert 6 missing `trigger_events` (cap_table.exit_initiated, exit_scenario.committed, secondary_transaction.approved, equity_grant.exercised, secondary_transaction.settled, option_pool.refreshed). | carry forward, unchanged |
| B1-S4 | Conditional on B2-S1: PATCH 7 `equity_grants` lifecycle states from module 79 (COMP-INCENTIVES) to module 21 (CAP-TABLE-GRANTS) or DUPLICATE rows. | carry forward, unchanged |
| B1-S6 | Author lifecycle states for 4 workflow-bearing masters (`option_pools`, `shareholder_records`, `exit_waterfall_calculations`, `employee_equity_accounts`); surface 3 config-shape exemption candidates (`security_classes`, `vesting_schedules`, `asc718_expense_periods`) in B2-S6. | carry forward, unchanged |
| B1-S7 | Phase E load, 6 roles + ~36 `role_modules` bundles + baseline + workflow-gate permissions, sequenced after B1-S4 + B1-S5. | carry forward, unchanged |
| B1-S8 | Phase F load, 6 system skills + ~30 `skill_tools` rows, can fire after B1-S5; closes F2 / F3. | carry forward, unchanged |
| B1-S9b | Author 6 `regulations` rows (IRS 409A, ASC 718, SEC Rule 701, SEC Reg D / Form D, IRS Form 3921, IRS Form 3922) then INSERT 6 `domain_regulations` rows attaching them to CAP-TABLE (162). The 7th (SOX) is already attached. | renamed from B1-S9, scope reduced to 6 of 7 |
| B1-S10 | Author 2 inter-domain handoffs to wire COMP-MGMT multi-master overlap, one gated on B2-S2. | carry forward, unchanged |
| B1-S11 | DELETE-equivalent PATCH (set `notes=''`) on 12 `domain_data_objects` rows (1084-1095) if B2-S3 confirms auto-populated. | carry forward, gated on B2-S3 |

### Bucket 2 carry-forward inventory

B2-S1 (equity_grants lifecycle realization choice), B2-S2 (COMP-INCENTIVES -> CAP-TABLE-GRANTS handoff event source), B2-S3 (Rule #15 notes-pollution PATCH or leave), B2-S4 (pattern-flag re-evaluation on 6 candidates), B2-S5 (permission-bundle drift after Phase E), B2-S6 (config-shape exemptions on 3 masters), B2-S7 (`domains.description` Rule #18 cleanliness, drop buyer sentence) all unchanged.

### Bucket 3 carry-forward inventory

12 entity / handoff candidates (B3-CAND-01 through B3-CAND-12) + 5 modularization candidates (`CAP-TABLE-CONVERTIBLES`, `CAP-TABLE-TAX-REPORTING`, `CAP-TABLE-ESPP`, `CAP-TABLE-COMPLIANCE`, `CAP-TABLE-BOARD-CONSENTS`) + 5 regulation candidates (GDPR / CCPA, EMI, CSOP, VSOP, FinCEN CTA, SEC Reg CF) + 2 domain candidates (`EQUITY-COMP-PLATFORM` queued, `PRIVATE-COMPANY-TRANSFER-AGENT` candidate) unchanged.

### Decisions

_(empty pending user review)_

### Report-only follow-ups (owed by other domains)

Same matrix as the 2026-05-30 audit (COMP-MGMT, FUND-ADMIN, PORT-MONIT, HCM, EM-FUND-PLATFORM, ESIGN, CLM, GRC, AUDIT, FIN). No new owed work surfaced this pass.

### Spot-check links

- https://tests.semantius.app/domain_map/handoffs
- https://tests.semantius.app/domain_map/permissions
- https://tests.semantius.app/domain_map/role_modules
- https://tests.semantius.app/domain_map/skills
- https://tests.semantius.app/domain_map/domain_regulations

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

State-driven Validate pass working only the open items in `state.yaml`. Confirmed against live
(domain 162; modules 20-25; 12 masters). The stale in-state snapshot was refreshed: APQC tags
(H1), the 14 lifecycle-realization PATCHes (B1-S5), business_function_domains (C1: Finance owner,
Legal + Investment Management contributor, HR consumer), and aliases were already complete from
prior passes and required no work. Loader:
`.tmp_deploy/fix_cap_table_state_driven_2026_06_07.ts` (idempotent; re-run inserts 0).

### Executed (all rows record_status='new'; notes never written; no em-dash; American English)

- **B1A-ENTITY-TYPE (Rule #12):** classified 11 unclassified masters. operational_workflow:
  cap_tables, option_pools, valuations_409a, asc718_expense_periods, exit_scenarios,
  employee_equity_accounts, secondary_transactions. catalog: security_classes, vesting_schedules.
  operational_record: shareholder_records. computed: exit_waterfall_calculations.
  (equity_grants was already operational_workflow.) This also RESOLVES B2-S6 structurally: the
  config-shape exemption is now a typed column, not a notes decision.
- **Catalog UX (Rule #20):** authored buyer-voice catalog_tagline + catalog_description on the
  empty domain row (162) and all 6 modules (7 rows x 2 fields = 14 field writes). Empty-guarded;
  no non-empty value overwritten.
- **B1A-S3:** inserted 6 trigger_events (cap_table.exit_initiated, exit_scenario.committed,
  secondary_transaction.approved, equity_grant.exercised, secondary_transaction.settled =
  state_change; option_pool.refreshed = lifecycle). data_object FKs verified live.
- **B1A-S6 (gated by entity_type per Rule #12):** authored lifecycle states for the 3 masters now
  classified operational_workflow that carried zero states: option_pools (5: proposed,
  board_approved*, active, exhausted, refreshed* @ module 21), employee_equity_accounts (4:
  provisioned, active, terminated*, offboarded @ module 24), asc718_expense_periods (2: open,
  closed* @ module 22). 11 states total (* = requires_permission gate). shareholder_records
  (operational_record) and exit_waterfall_calculations (computed) are exempt by classification, so
  B1A-S6's 4-master list is fully discharged (2 authored under B1A-S6 scope + asc718 +
  2 exempt-by-type).
- **B1B-S2:** inserted 10 intra-domain handoffs (source=target=162, integration_pattern=
  lifecycle_progression, friction_level=low). The 4 that depended on B1A-S3's new events were
  unblocked in the same run.
- **B1B-S9b:** authored 6 regulations (IRC-409A, ASC-718, SEC-RULE-701, SEC-REG-D, IRS-FORM-3921,
  IRS-FORM-3922; jurisdiction USA=3; statutory issuing bodies allowed under Rule #18) and attached
  all 6 to CAP-TABLE via domain_regulations (409A/ASC718/Rule701/3921 mandatory; Reg D/3922
  conditional). SOX (id 5) was already attached.

### Surfaced for user (not written)

- **B2-S1 + M7 integrity defect:** equity_grants (158) carries TWO role='master' DMDO rows
  (module 21 id 66 AND module 79 id 399). Single-master violation. The fix (demote one master,
  relocate the 7 lifecycle states) is the B2-S1 architectural decision and is DESTRUCTIVE; the M7
  auto-fix exception does not apply because B2-S1 is what picks the canonical master. Surfaced, not
  applied. Blocks B1B-S4.
- **B2-S2 / B2-S3 / B2-S4 / B2-S5 / B2-S7:** unchanged user decisions (handoff event source;
  notes-pollution confirm; 6 pattern-flag flips; permission-bundle drift policy; description
  Rule #18 rewrite). B2-S3 and B2-S7 entail destructive overwrites.
- **B2-S6:** resolved structurally via entity_type (asc718 -> operational_workflow with
  open->closed lifecycle). Surfaced for confirmation only; reversing would be destructive.
- **B1B-S11:** notes='' revert on 12 domain_data_objects rows is destructive, gated on B2-S3.
- **B1B-S10:** 2 COMP-MGMT <-> CAP-TABLE inter-domain handoffs; part (b) anchor event
  (equity_grant.exercised) now exists, but both remain gated on B2-S1/B2-S2.

### Personas deferred

- **B1A-PHASE-P:** persona / RACI layer (6 candidate roles) DEFERRED per audit policy; not
  agent-authored without user direction. B1B-S7 (Phase E roles + permissions) stays blocked behind
  it plus B1B-S4 + B2-S5.

### Left

- **B1B-S8:** RETIRED by the per-domain-skill supersession (no per-module system skills /
  skill_tools); reframed as a note in state.yaml.
- **b3:** 12 entity/handoff candidates + 5 modularization candidates + 6 regulation candidates +
  2 domain candidates carried forward unchanged (non-blocking backlog).

### Post-fix status

next_action_by: user (open b2 decisions + destructive approvals + deferred personas). All agent-
doable additive/corrective work is executed at record_status='new'.

### Spot-check links

- https://tests.semantius.app/domain_map/data_objects
- https://tests.semantius.app/domain_map/domain_modules?domain_id=eq.162
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/data_object_lifecycle_states
- https://tests.semantius.app/domain_map/handoffs?source_domain_id=eq.162
- https://tests.semantius.app/domain_map/domain_regulations?domain_id=eq.162
