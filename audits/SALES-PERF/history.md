# SALES-PERF audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- Current footprint: 0 entities, 0 modules, 8 capabilities, 12 solutions (9 primary, 3 secondary), 0 regulations, 0 trigger_events, 0 outbound handoffs, 3 inbound handoffs, 0 system skills, 0 roles, 0 `domain_data_objects` rows, 0 `domain_module_data_objects` rows.
- Domain metadata: A1 passes (crud_percentage 60, business_logic populated, min_org_size `20 s <500`, cost_band `$$$`, usa_market_size_usd_m 2500, source year 2024). A4 fails: both `catalog_tagline` and `catalog_description` are empty.
- Leadership-tier domain (listed in SKILL.md `B1` exception): masters are expected to be zero, but module count is not exempt under Rule #14. The whole M-band is failed and gates every B / E / F band.
- Vendor-surface basis: 9 pure-play ICM / SPM specialists (Varicent, Xactly Incent, Salesforce Spiff, CaptivateIQ, Performio, SAP Commissions, beqom Pay, QuotaPath, plus Anaplan Sales Planning for plan modeling); 3 adjacent platforms (Fullcast for territory and capacity ops, Pigment and Board for finance-grade SPM modeling).
- **Bucket 1 (in-scope, agent fixable):** 9 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items.
- Candidates queued to `audits/_missing-domains.md`: 1 (`SALES-ENABLEMENT`).

Structural pass: A1 passes, A2 passes (8 capabilities), A3 passes (12 solutions with coverage_level set, 9 primary), A4 FAILS (empty catalog UX fields). M-band FAILS catastrophically: zero modules. With no modules the entire B-band collapses (B1 exempt as leadership-tier, but B5/B6/B7/B8/B9/B11/B12 are all vacuous), C passes (owner=Sales Operations, contributor=Finance), E-band cannot apply (no modules, no 2-module floor), F-band cannot apply (no modules to anchor system skills against), H1 produces 3 inbound handoffs of which 1 already carries a discovery_substring tag.

### Vendor surface basis

The market is ICM (Incentive Compensation Management), one of the most pure-play markets in the catalog. Pure-play SPM / ICM specialists chosen over diversified suites: Varicent (Gartner Leader, deep plan modeling and dispute workflow), Xactly Incent (Gartner Leader, public benchmarks via Xactly Insights), Salesforce Spiff (low-code commissions, CRM-anchored), CaptivateIQ (modern API-first ICM, rich payee statements), Performio (mid-market, strong reporting), SAP Commissions (formerly CallidusCloud, enterprise ICM with CPQ tie-in), beqom Pay (broad sales-and-total-comp, regulated industries), QuotaPath (mid-market simplicity and CRM-native dashboards), Anaplan Sales Planning (territory / quota / capacity modeling, distinct from commission calculation). Adjacent vendor: Fullcast (CRM-native ops platform overlapping territory / capacity / quota refresh cycles), Pigment and Board (financial-modeling-shaped competitors at the planning end of the market). All vendors agree on the core entity surface: compensation plans, plan components, quotas, territories, payees / payee assignments, commission statements, transactions, disputes, draws, recoverable advances, SPIFs.

### Pass 1, Structural sweep

#### S1, Direct FKs to `domains` for SALES-PERF (id 102)

| Table | FK column | SALES-PERF rows | Expected non-zero? |
| --- | --- | --- | --- |
| `business_function_domains` | `domain_id` | 2 (owner Sales Operations, contributor Finance) | yes, pass |
| `capability_domains` | `domain_id` | 8 | yes, pass |
| `domain_data_objects` | `domain_id` | 0 | exempt (leadership-tier) |
| `domain_modules` | `domain_id` | 0 | yes, FAIL (Rule #14 M1) |
| `domain_module_host_domains` | `domain_id` | 0 | routinely zero, OK |
| `domain_regulations` | `domain_id` | 0 | optional, see Bucket 2 |
| `handoffs.source_domain_id` | source | 0 | yes for non-leaf, see B9 |
| `handoffs.target_domain_id` | target | 3 (from CRM and REV-INTEL) | yes for non-leadership; passes informationally |
| `skills` | `domain_id` | 0 | yes (Rule #17 F2), FAIL once modules exist; vacuous until then |
| `solution_domains` | `domain_id` | 12 | yes, pass |
| `domains.parent_domain_id` | self | NULL | routinely zero, OK |

#### S2, Per-module coverage

Vacuous (zero modules).

#### S3, Per-master indirect-table coverage

Vacuous (zero masters; B1 exemption).

#### A-band

- **A1, domains metadata.** Pass. All 7 business-meaningful columns populated and within enum bands.
- **A2, capabilities linked.** Pass. 8 capabilities: `TERRITORY-DESIGN`, `QUOTA-ALLOCATION`, `INCENTIVE-COMP-MGMT`, `COMMISSION-CALCULATION`, `COMP-PLAN-MODELING`, `PAYEE-STATEMENTS`, `SALES-CAPACITY-PLANNING`, `SPIF-MGMT`.
- **A3, solutions linked.** Pass. 12 solutions, all with coverage_level set, 9 primary plus 3 secondary.
- **A4, catalog UX fields.** FAIL. Both `catalog_tagline` and `catalog_description` are empty strings. See Bucket 1 `B1-A1`.
- **A5, vendor ownership refresh.** Skipped (opt-in, not requested).

#### M-band

- **M1, ≥1 `domain_modules` row.** FAIL. Zero rows. Leadership-tier domains still require ≥1 module per Rule #14 (the rule has no leadership-tier exemption; only B1 carries one). See Bucket 1 `B1-M1`.
- **M2, ≥3 capabilities implies ≥2 modules.** Implicitly FAIL (8 capabilities, 0 modules). Resolved by `B1-M1`.
- **M4, every capability has ≥1 realizing module.** FAIL by construction (no modules to realize anything). All 8 capabilities are orphans pending `B1-M1`.
- **M5, lifecycle states have `domain_module_id` when module-scoped.** Vacuous.
- **M6, every module realizes ≥1 capability.** Vacuous.
- **M7, single-master and within-domain coherence.** Vacuous.

#### B-band

- **B1, ≥1 master.** Vacuous (leadership-tier exemption per SKILL.md, REV-INTEL / SALES-PERF / GTM-PLAN / ACCT-PLAN / PRM / OP-RES / BCM / SECOPS / SOAR / THREAT-INTEL / TPRM / VULN-MGMT / PRIV-MGMT / FINOPS / INTRANET / COLLAB-GOV).
- **B2 through B7.** Vacuous (zero masters).
- **B8 outbound `data_object_relationships`.** Vacuous.
- **B9 outbound `trigger_events` and `handoffs`.** Vacuous (no masters, no events).
- **B9b intra-domain cross-module handoffs.** Vacuous (zero modules, no cross-module surface).
- **B10 inbound handoffs (report only).** 3 rows. Covered inbound list below; no fix from this domain's pass.
- **B10b per-module attribution on `handoffs`.** Inbound query returns 3 rows with `target_domain_module_id = NULL`. All three are NULL because SALES-PERF has zero modules to attribute to. The fix is upstream: load modules first (`B1-M1`), then re-run the B10b backfill against the new module set. See Bucket 1 `B1-S1`. Two of the three rows also have `source_domain_module_id` issues: handoff 208 (REV-INTEL source) has `source_domain_module_id=NULL` because REV-INTEL also has zero modules; that side is REV-INTEL's audit, report-only.
- **B11, aliases for non-self-explanatory masters.** Vacuous.
- **B12, lifecycle states.** Vacuous.

#### C-band

- **C1, ≥1 `business_function_domains` owner.** Pass. Owner = Sales Operations, contributor = Finance.
- **C2, capability-level RACI overrides.** No override rows found. Acceptable: the 8 capabilities cleanly inherit Sales Operations ownership (incentive comp, territory, quota, capacity, payee statements all sit with Sales Ops). See Bucket 2 `B2-C1` for whether `INCENTIVE-COMP-MGMT` should carry an override to Compensation Management since it overlaps the broader employee-comp surface mastered in COMP-MGMT.

#### D-band

- **D1, UI spot-check.** Deferred until after fix loads land.

#### E-band

Vacuous: no modules, no role-modules surface, no role authoring possible. Will become applicable once `B1-M1` resolves and at least 2 modules ship.

#### F-band

Vacuous: no modules and zero system skills. Will become applicable once `B1-M1` resolves; Rule #17 requires exactly one `skill_type='system'` skill per `domain_modules` row.

#### H-band, APQC coverage on inbound handoffs (since outbound is empty)

| handoff_id | source, target | trigger_event | payload | Existing tag | record_status |
|---|---|---|---|---|---|
| 202 | CRM → SALES-PERF | crm_opportunity.created | crm_opportunities | (none) | n/a |
| 203 | CRM → SALES-PERF | account.tier_changed | customers | process 54 "Perform planning and management accounting" (discovery_substring) | new |
| 208 | REV-INTEL → SALES-PERF | pipeline_health.degraded | crm_opportunities | (none) | n/a |

The single existing tag (handoff 203, discovery_substring) is too generic to be useful for SALES-PERF; the substring matcher picked an accounting process that does not describe what fires on `account.tier_changed`. SALES-PERF tagging proposals for the 3 inbound handoffs go in Bucket 1 `B1-H1` as `agent_curated`. Volume target on the audit's own work, 0.5N to 0.8N where N=3, suggests 2 to 3 new `agent_curated` rows. Per the asymmetry rule, the substantive H1 fix lives on the source domains (CRM, REV-INTEL) since they own the publishing side and the substantive PCF activity is the source-side publishing process, not the consumer-side reception. But SALES-PERF can author its own consumer-side process tag where the consumer activity has a clean PCF match (territory or quota realignment on `account.tier_changed`).

### Pass 2, Market audit (semantic)

The market surface for SALES-PERF (ICM / SPM) is unusually pure-play and tightly bounded. Across the 9 flagship vendors (Varicent, Xactly Incent, Salesforce Spiff, CaptivateIQ, Performio, SAP Commissions, beqom Pay, QuotaPath, Anaplan Sales Planning) and 3 adjacent platforms (Fullcast, Pigment, Board), the union entity surface is:

**Master records (planning side):**
- `compensation_plans` (master per period and per role)
- `plan_components` (rate tables, accelerators, kickers, draws)
- `quotas` (per-period, per-payee, per-product, hierarchically rolled up)
- `territories` (named, hierarchical, account-list-backed or rule-based)
- `territory_assignments` (payee × territory × effective_dates)
- `payees` (sales reps and managers, FK to HCM employees and CRM users)
- `payee_assignments` (payee × plan × effective_dates)
- `capacity_plans` (heads required vs. heads booked per role per segment per quarter)

**Master records (execution side):**
- `credited_transactions` (orders / bookings / renewals attributed to payees)
- `commission_calculations` (per-transaction commission lines, plan-and-component-keyed)
- `commission_statements` (period-aligned per-payee statements)
- `commission_disputes` (statement disputes and adjustments workflow)
- `commission_adjustments` (chargebacks, true-ups, recoveries on cancellations)
- `draws` (recoverable and non-recoverable advances)
- `spifs` (special performance incentive funds, time-boxed)
- `spif_enrollments` (payee × spif × period)
- `bonuses` (off-plan one-time bonuses)

**Junctions, transitions, audit:**
- `plan_approvals` (plan rollout sign-off)
- `quota_assignments` (quota × payee × period)
- `quota_change_requests` (mid-period quota adjustments)
- `statement_acknowledgements` (e-sign on monthly statement)
- `dispute_resolution_audit_trails`
- `plan_change_audit_trails`

**Compliance / regulation:**
- `commission_expense_accruals` (ASC 606-21 / IFRS 15 commission capitalization and amortization)
- `commission_expense_reversals` (clawback accounting)
- `clawback_provisions` (terms by plan)

**Configuration / templates:**
- `plan_templates`, `quota_templates`, `territory_templates`
- `rate_tables`, `accelerator_rules`, `cap_rules`
- `crediting_rules` (who gets credit on multi-payee deals, splits, overlay)
- `eligibility_rules` (which transactions feed which plans)

**Modularization hypothesis (proposed module set):**

| Module code | Scope | Capabilities |
|---|---|---|
| `SALES-PERF-PLAN-DESIGN` | plan modeling, plan components, rate tables, plan templates, plan approvals, plan change audit | `COMP-PLAN-MODELING`, `INCENTIVE-COMP-MGMT` |
| `SALES-PERF-TERRITORY` | territories, territory assignments, account-to-territory rules, territory templates | `TERRITORY-DESIGN` |
| `SALES-PERF-QUOTA` | quotas, quota assignments, quota change requests, quota templates | `QUOTA-ALLOCATION` |
| `SALES-PERF-CAPACITY` | capacity plans, segment-to-role mapping, heads needed vs. booked | `SALES-CAPACITY-PLANNING` |
| `SALES-PERF-COMMISSIONS` | credited transactions, commission calculations, statements, adjustments, draws, crediting rules, eligibility rules | `COMMISSION-CALCULATION`, `PAYEE-STATEMENTS` |
| `SALES-PERF-DISPUTES` | commission disputes, dispute resolution audit trails | `COMMISSION-CALCULATION` (shared) |
| `SALES-PERF-SPIF` | spifs, spif enrollments, bonuses | `SPIF-MGMT` |
| `SALES-PERF-COMP-EXPENSE` | commission_expense_accruals, commission_expense_reversals, clawback_provisions (ASC 606 carve-out for finance handoff) | (cross-cuts to ERP-FIN) |

8 modules cleanly maps onto the 8 capabilities. The market split is reasonably canonical: Varicent, Xactly, Spiff, CaptivateIQ, Performio, SAP Commissions all cluster execution into one product surface (Commissions + Disputes + Statements), then split Plan Design / Territory / Quota / Capacity as separate planning surfaces. Anaplan, Pigment, Board attack the planning half only.

**Findings categories:**

- **MISSING entities:** ALL 30+ surface entities listed above. Since SALES-PERF has zero masters and zero modules, every entity in the market surface is missing. This is the dominant finding type.
- **WRONG-OWNERSHIP:** N/A (no entities currently owned).
- **SCOPE-CREEP:** N/A (no entities currently owned; nothing to scope-creep).
- **MODULARIZATION ISSUE:** the existing capability set (8 capabilities) is sound, but no modules exist to realize them. The hypothesis above proposes one module per capability with a shared Commissions module. This is a structural recommendation, not a Bucket 1 fix; goes to Bucket 2 `B2-M1`.

### Pass 3, Neighbor discovery

Cross-edges with other domains, ranked by edge weight (handoff count + DMDO dependency count):

| Neighbor | Outbound handoffs | Inbound handoffs | DMDO deps | Edge weight | Notes |
|---|---|---|---|---|---|
| CRM | 0 | 2 (handoffs 202, 203) | n/a (no DMDO surface yet) | 2 | Inbound only; consumer side. |
| REV-INTEL | 0 | 1 (handoff 208) | n/a | 1 | Peer leadership-tier domain with zero modules; pairwise reconciliation blocked until both sides modularize. |
| COMP-MGMT | 0 | 0 | n/a | 0 | Conceptual overlap on incentive comp; no edges loaded. See Bucket 2 `B2-C1`. |
| ACCT-PLAN | 0 | 0 | n/a | 0 | Account-tier-aware quota / territory implies an edge; not loaded. |
| GTM-PLAN | 0 | 0 | n/a | 0 | Capacity planning implies an edge to GTM segmentation; not loaded. |
| EPM | 0 | 0 | n/a | 0 | Commission expense (ASC 606) implies an edge to finance close; not loaded. |

Default deep-dive threshold (edge weight ≥ 3) is not met for any neighbor. Per the prompt, lighter neighbors get a one-line summary instead of the full 5-section diff. The reconciliation surface is gated on `B1-M1` resolving: pairwise diff requires module FKs on both sides.

### Pass 4, Pairwise reconciliation per neighbor

Skipped on all 6 neighbors. CRM (weight 2) and REV-INTEL (weight 1) are below the deep-dive threshold and at any rate cannot resolve until SALES-PERF has modules. Recorded as a "re-run after `B1-M1` lands" follow-up in the Decisions section once approvals come in.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures (S1, M1, M4)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-M1 | M1 / M2 / M4 | Zero `domain_modules` rows on a domain with 8 capabilities. Blocks the entire B / E / F surface. The market hypothesis in Pass 2 proposes 8 modules (one per capability with a shared Commissions module). | Author 8 `domain_modules` rows with the codes proposed in Pass 2's modularization table. Each carries `module_kind='full'`. Bundle with the corresponding `domain_module_capabilities` rows so every capability has ≥1 realizing module. |
| B1-A1 | A4 | Empty `catalog_tagline` and `catalog_description`. Per Rule #20 the audit may draft both, surface to the user for review BEFORE writing. | Drafts authored below; user approves wording, then PATCH. |
| B1-S1 | B10b | 3 inbound handoffs have `target_domain_module_id=NULL` because SALES-PERF has zero modules. Cannot resolve until `B1-M1` lands. | Re-run B10b backfill against new modules once `B1-M1` is applied; expect to attribute handoff 202 (crm_opportunity.created on opportunities) to `SALES-PERF-QUOTA` (quota credit), 203 (account.tier_changed on customers) to `SALES-PERF-TERRITORY` (territory realignment), 208 (pipeline_health.degraded on opportunities) to `SALES-PERF-CAPACITY` (capacity rebalance). |

Drafts for `B1-A1` (per Rule #20 voice rule):
- `catalog_tagline` draft: "Plan, allocate, and pay your sales organization. Design territories and quotas, model commission plans, and run accurate commission statements every period."
- `catalog_description` draft (3 short paragraphs):
  - "Sales Performance Management runs the planning and pay side of your sales motion. Design territories and roll up quotas to match your go-to-market segments, then build commission plans with the rate tables, accelerators, draws, and SPIFs your sales leaders need to motivate the team."
  - "Each period, every credited transaction flows into the engine, calculates commissions per plan, and posts a payee statement your sellers can audit. Sellers raise disputes against statements, finance signs off on commission expense, and the next plan cycle starts with clean territory and quota data."
  - "Built for sales-ops and rev-ops teams who own quota strategy and commission accuracy, with finance partnering on commission expense (ASC 606 amortization) and HR partnering on payee eligibility."

#### MISSING (vendor-surface entities, all gated on `B1-M1`)

These are placeholder entries: every entity in Pass 2's market surface is missing because zero masters exist. Loading them requires `B1-M1` to land first. The audit lists the top 7 most-impactful candidates here so the user has a per-entity decision surface; the full set goes to Bucket 3 pending Phase 0 vetting.

| ID | Entity | Proposed module | Vendor evidence |
|---|---|---|---|
| B1-V1 | `compensation_plans` | SALES-PERF-PLAN-DESIGN | 9 of 9 ICM vendors |
| B1-V2 | `quotas` | SALES-PERF-QUOTA | 9 of 9 |
| B1-V3 | `territories` | SALES-PERF-TERRITORY | 9 of 9 |
| B1-V4 | `commission_calculations` | SALES-PERF-COMMISSIONS | 9 of 9 (the headline master) |
| B1-V5 | `commission_statements` | SALES-PERF-COMMISSIONS | 9 of 9 |
| B1-V6 | `commission_disputes` | SALES-PERF-DISPUTES | 8 of 9 (Anaplan is plan-side only) |
| B1-V7 | `payees` | SALES-PERF-COMMISSIONS (or shared SALES-PERF-PARTIES) | 9 of 9 |

#### APQC TAGGING

The 3 inbound handoffs to SALES-PERF. Per the asymmetry rule, the substantive tag is the source-side publishing process (CRM B9 outbound) and goes on each source domain's own H1. SALES-PERF can author its own consumer-side processes where the PCF activity is a SALES-PERF activity. Candidates below:

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 202 | CRM → SALES-PERF | crm_opportunity.created | crm_opportunities | Determine sales resource allocation (consumer-side activity: opportunity credit triggers quota tracking) | 713 | medium L4 |
| 203 | CRM → SALES-PERF | account.tier_changed | customers | Determine sales resource allocation (territory realignment on account tier change) | 713 | medium L4 |
| 208 | REV-INTEL → SALES-PERF | pipeline_health.degraded | crm_opportunities | Determine sales resource allocation (capacity rebalance signal) | 713 | medium L4 |

Existing handoff 203 carries a `discovery_substring` tag pointing at process 54 ("Perform planning and management accounting") at `record_status='new'`. The substring matcher pulled "account" out of the trigger event; the result is wrong (this is not finance accounting). Propose superseding it with the agent-curated row above, or rejecting the existing row outright. Going to Bucket 2 `B2-H1` since the supersede vs. coexist decision is judgment.

Deferred to Discover: zero. None of the three handoffs requires a custom process.

| ID | Action | Note |
|---|---|---|
| B1-H1 | INSERT 3 `handoff_processes` rows: (202, 713), (203, 713), (208, 713). Each carries `proposal_source='agent_curated'`, `record_status='new'`. | Coverage rises from 1 of 3 tagged to 4 of 3 (one supersede candidate). |

#### BOUNDARY findings per neighbor

Skipped (Pass 4 pairwise is blocked on `B1-M1`).

### Bucket 2, Surface-for-user (judgment calls)

1. **B2-M1, Modularization hypothesis.** Pass 2 proposes 8 modules for the 8 capabilities. The split is plausible but other plausible shapes exist: (a) collapse PLAN-DESIGN + TERRITORY + QUOTA + CAPACITY into a single SALES-PERF-PLANNING module (4 capabilities, mirrors Anaplan / Pigment) and keep COMMISSIONS + DISPUTES + SPIF + COMP-EXPENSE as execution, total 5 modules; (b) the proposed 8-module split, granular per capability; (c) a 3-module shape: SALES-PERF-PLANNING / SALES-PERF-EXECUTION / SALES-PERF-FINANCE-BRIDGE. Decide before loading masters. Independent of Bucket 3.

2. **B2-C1, Capability-level RACI override on INCENTIVE-COMP-MGMT.** The 8 capabilities all inherit Sales Operations ownership at the domain level. INCENTIVE-COMP-MGMT specifically overlaps the broader employee-comp surface mastered in COMP-MGMT (HR-owned). Should this capability carry a `business_function_capabilities` override naming Compensation Management (a Finance / Total-Rewards function) as a contributor? Options: (a) add the override row, (b) leave the domain-level RACI as-is (Sales Ops owns sales comp, period), (c) add a stronger override naming Finance as co-owner reflecting the ASC 606 close cycle. Independent of Bucket 3.

3. **B2-R1, Regulation coverage.** Zero `domain_regulations` rows. ASC 606-21 / IFRS 15 (Subtopic 340-40, Costs to Obtain a Contract) requires commission capitalization and amortization; SOX applies to commission expense reporting controls; Reg BI (broker-dealer) and FINRA suitability apply where commissioned sellers cross into regulated financial products. Add which regulations? Options: (a) ASC 606 only (cleanest), (b) ASC 606 + SOX (covers internal-controls audit surface), (c) ASC 606 + SOX + GDPR (PII on payee data, applicable in EU), (d) the full set including Reg BI / FINRA for the regulated-finance carve-out, (e) none until Phase 0 confirms the regulated-finance ICM specialists. Bucket 3 dependency: option (d) is informed by whether beqom Pay's regulated-finance specialization makes Reg BI / FINRA a meaningful market signal or a narrow niche.

4. **B2-H1, Existing `handoff_processes` row 203 → process 54.** The discovery_substring picked an accounting process for `account.tier_changed`, which is wrong. Options: (a) PATCH `record_status='rejected'` and let `B1-H1`'s agent_curated row supersede, (b) DELETE the discovery_substring row entirely (cleaner audit trail), (c) keep it (user disagrees with the audit's verdict on the substring match). Independent of Bucket 3.

5. **B2-P1, Pairwise reconciliation timing.** Pass 4 is blocked on `B1-M1` (module FKs). When SALES-PERF, CRM, and REV-INTEL all have modules, the pairwise diff against CRM (weight 2, currently below the threshold but with both inbound handoffs sharing a payload class) and REV-INTEL (weight 1 today, expected to grow as REV-INTEL itself modularizes) becomes meaningful. Options: (a) schedule both pairwise passes immediately after `B1-M1` lands, (b) defer until edge weight independently crosses 3, (c) only run CRM since REV-INTEL is itself unmodularized. Independent of Bucket 3.

### Bucket 3, Phase 0 pending (speculative)

| # | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| 1 | Commission expense accounting carve-out (entities `commission_expense_accruals`, `commission_expense_reversals`, `clawback_provisions`) as a dedicated SALES-PERF-COMP-EXPENSE module vs. as fields on `commission_calculations` | Most ICM vendors (Varicent, Xactly, Performio) ship ASC 606 capitalization modules separately. CaptivateIQ ships it inline. Salesforce Spiff is silent. The cardinality decision (separate module vs. enrich existing entity) affects M-band shape. | Phase 0 against Varicent ASC 606 docs + Xactly Subscribe (RevRec) + CaptivateIQ inline; confirm vendor consensus before splitting the module. |
| 2 | Sales credit and crediting-rule engine as a distinct module (master `crediting_rules`, `eligibility_rules`) vs. as configuration tables under SALES-PERF-COMMISSIONS | Varicent and SAP Commissions have a separate "rule designer" surface; Spiff and CaptivateIQ ship rules inline; QuotaPath and Performio simplify or skip the surface. | Phase 0 on Varicent rule designer + SAP CallidusCloud schema + Spiff inline. |
| 3 | Overlay seller compensation (regional VP, SE, CS) as `overlay_assignments` vs. as plan-component flags | Beqom, Varicent, Xactly all model overlay distinctly; Performio and Spiff fold it into base plan components. | Phase 0 on beqom whitepapers + Varicent overlay docs; small but meaningful workflow gate. |
| 4 | Capacity planning as a SALES-PERF module vs. as an Anaplan / Pigment competition zone hosted outside SALES-PERF | Anaplan and Pigment market capacity planning as a distinct workflow with its own buyer (RevOps Strategy vs. Sales Ops Comp); Fullcast positions it as part of "territory ops". The 4th capacity-planning Bucket 3 candidate is "should SALES-PERF-CAPACITY exist at all, or be re-routed to a new SALES-PLANNING-PLATFORM domain owned by a different buyer?" | Phase 0 on Anaplan Sales Planning + Pigment RevOps + Fullcast docs to test buyer separation. If a separate platform market exists, queue SALES-PLANNING-PLATFORM as a candidate domain. |

### Cross-bucket dependencies

- `B1-A1` (catalog UX drafts) is independent of all other items; can land first.
- `B1-M1` (modules) gates `B1-S1` (B10b re-backfill), `B1-V1` through `B1-V7` (master loads), `B2-M1` (modularization decision), all Pass 4 pairwise work, and the F-band's positive-existence checks (system skills can only attach once modules exist). It is the single most load-bearing decision in this audit.
- `B1-H1` (3 APQC tags) is independent of `B1-M1`. Can land without modules.
- `B2-M1` (modularization shape decision) informs `B1-V1` through `B1-V7` (which module each master lands in). The user's choice between the 8-module / 5-module / 3-module shape rewrites the proposed_module column.
- `B2-R1` option (d) is informed by Bucket 3 candidate #1 (whether the Phase 0 confirms beqom's regulated-finance ICM specialization). Options (a) through (c) are independent of Bucket 3.
- Bucket 3 candidate #4 (capacity-planning carve-out) is informed by `B2-M1` and vice versa: the modularization decision and the existence-of-a-separate-domain question feed each other.

### Per-bucket prompts

**After Bucket 1 (9 items: 3 STRUCTURAL, 7 MISSING-candidate placeholders gated on `B1-M1`, 1 APQC TAGGING; note that the 7 MISSING-candidate placeholders count as 1 logical item once `B1-M1` resolves shape — counted individually for surface clarity here):**

> Bucket 1 has 3 fix surfaces: `B1-A1` (catalog UX drafts, can apply now), `B1-M1` (8 modules per the proposed shape, blocking everything else), `B1-S1` (B10b re-backfill, runs after `B1-M1`), `B1-V1` through `B1-V7` (top 7 missing masters, must follow `B1-M1` and `B2-M1`), `B1-H1` (3 APQC tags, independent). Fix these now? Reply 'all', 'just A1 + H1' (the unblocked subset), 'just A1', 'just M1 with the 8-module shape', or 'skip'.

**After Bucket 2 (5 items):**

> Bucket 2 has 5 judgment calls: B2-M1 (which module shape, 8 / 5 / 3), B2-C1 (capability-level RACI override on INCENTIVE-COMP-MGMT), B2-R1 (which regulations to add), B2-H1 (what to do with the existing discovery_substring row 203), B2-P1 (when to schedule pairwise reconciliation). What is your call on each? I will wait for your decision per item before acting. For B2-R1 option (d) and Bucket 3 candidate #1, consider running them together.

**After Bucket 3 (4 items):**

> Bucket 3 has 4 candidates. Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed. Candidate #1 (commission expense carve-out module) affects whether `B1-M1` ships 7 or 8 modules; candidate #4 (capacity-planning carve-out) affects whether SALES-PERF-CAPACITY is a module here or a separate domain queued to the candidates file.

### Report-only follow-ups (owed by other domains)

- **CRM B9 owes inbound APQC tagging on the source side.** For handoffs 202 (`crm_opportunity.created`) and 203 (`account.tier_changed`), the substantive PCF activity on the publishing side is a CRM activity. Surfaces when CRM is next validated. The agent_curated tags proposed in `B1-H1` are the consumer-side reception activity; the source-side publishing activity is CRM's job.
- **REV-INTEL B9 owes inbound APQC tagging on the source side.** For handoff 208 (`pipeline_health.degraded`). REV-INTEL is also a leadership-tier domain with zero modules; its M1 will fail when audited, paralleling SALES-PERF here. The pairwise reconciliation against REV-INTEL is blocked on both sides until both modularize.
- **REV-INTEL B10b owes upstream module FK on handoff 208.** `source_domain_module_id=NULL`; will resolve when REV-INTEL ships modules.
- **CRM B9 candidate (the symmetric `data_object_relationships` row for handoff 202):** when SALES-PERF masters `quotas` and `quota_assignments`, CRM should carry a relationship `crm_opportunities credits quotas` (or the inverse). Surfaces when CRM is next validated. Today: cannot author because SALES-PERF has no master to point at.
- **COMP-MGMT M-band cross-check (informational):** if `B2-C1` resolves to (c) (Finance / Total-Rewards as co-owner of INCENTIVE-COMP-MGMT), the COMP-MGMT side will need a matching `business_function_capabilities` row on its own audit pass. Routine, not a blocker.

## 2026-05-31, Continuation: B1 technical fixes

Subagent pass to apply truly-technical Bucket 1 fixes only. Catalog UX (Rule #20), new modules, new master entities, and B10b backfill (gated on B1-M1) all remained deferred.

### Applied

- **B1-H1, INSERT 3 `handoff_processes` rows.** Pre-flighted handoff existence and process 713 ("Determine sales resource allocation"), then inserted:
  - id 409: `(handoff_id=202, process_id=713, proposal_source='agent_curated', record_status='new', role='implements')`
  - id 410: `(handoff_id=203, process_id=713, proposal_source='agent_curated', record_status='new', role='implements')`
  - id 411: `(handoff_id=208, process_id=713, proposal_source='agent_curated', record_status='new', role='implements')`
  - `notes` left empty per Rule #15. `record_status` and `role` taken from column defaults.
  - Coverage on inbound handoffs to SALES-PERF rises from 1/3 (handoff 203 carries the prior `discovery_substring` row 106 pointing at process 54) to 3/3 with `agent_curated` rows pointing at the correct PCF.
  - The supersede vs. coexist decision on row 106 remains a Bucket 2 item (`B2-H1`); left untouched.
  - Loader: `.tmp_deploy/fix_sales_perf_b1_technical_2026_05_31.ts`.

### Deferred (per brief)

- **B1-A1** (catalog_tagline / catalog_description drafts), Rule #20 keeps these in the user-approval path.
- **B1-M1** (8 new `domain_modules` rows), new modules are out of scope for technical-only B1 application.
- **B1-S1** (B10b `target_domain_module_id` backfill on handoffs 202 / 203 / 208), gated on B1-M1.
- **B1-V1 through B1-V7** (7 new master entities for the SALES-PERF surface), all new `data_objects` / DMDOs / lifecycle, deferred.

No JWT errors. No `notes` writes. No record_status overrides.

## 2026-05-31, Audit

### Summary

- Scope: structural Validate b1 audit (S/A/M/B [B5/B7/B9/B9b/B10b/B11/B12]/C/D/E [E1-E5]/F [F1-F5]/H1) against live state.
- Status delta since 2026-05-30: only catalog change is the 3 new `handoff_processes` rows applied in the 2026-05-31 Continuation (B1-H1) plus one prior `agent_curated` tag (208 to process 712 "Manage opportunity pipeline"). No new modules, masters, data_objects, trigger_events, regulations, or skills. The 2026-05-30 audit's whole-domain backlog is essentially intact.
- Current footprint: 0 modules, 0 masters, 8 capabilities (TERRITORY-DESIGN, QUOTA-ALLOCATION, INCENTIVE-COMP-MGMT, COMMISSION-CALCULATION, COMP-PLAN-MODELING, PAYEE-STATEMENTS, SALES-CAPACITY-PLANNING, SPIF-MGMT), 12 solutions (9 primary, 3 secondary), 2 business_function_domains rows (owner Sales Operations, contributor Finance), 0 regulations, 0 outbound handoffs, 3 inbound handoffs (202 from CRM, 203 from CRM, 208 from REV-INTEL), 0 system skills, 0 roles in scope (Sales Operations function_id 52 has 0 catalog roles today), 0 domain_aliases.
- Leadership-tier domain (listed in SKILL.md B1 exception); masters expected zero, but module count is NOT exempt under Rule #14. The M-band is the single load-bearing gate; B5/B6/B7/B8/B9/B9b/B11/B12 are vacuous-by-zero-masters; E1-E5 and F1-F5 are vacuous-by-zero-modules.
- Bucket 1 (in-scope, agent fixable): 3 items (B1-A1 catalog UX drafts, B1-M1 module set, B1-S1 B10b re-backfill gated on B1-M1). The 7 master placeholders (B1-V1..B1-V7) are deferred until B1-M1 lands and B2-M1 resolves shape.
- Bucket 2 (judgment): 5 items (B2-M1 module shape, B2-C1 INCENTIVE-COMP-MGMT RACI, B2-R1 regulations, B2-H1 discovery_substring row 106 disposition, B2-P1 pairwise timing).
- Bucket 3 (Phase 0 pending): 4 items (commission expense carve-out, crediting / eligibility rule designer, overlay seller comp, capacity-planning carve-out vs. new domain).
- Audit produced ZERO catalog writes. JWT errors: none.

### Pass 1, Structural sweep

#### S1, Direct FKs to domains for SALES-PERF (id 102)

| Table | FK column | SALES-PERF rows | Expected non-zero? |
| --- | --- | --- | --- |
| business_function_domains | domain_id | 2 | yes, pass |
| capability_domains | domain_id | 8 | yes, pass |
| domain_aliases | domain_id | 0 | optional |
| domain_data_objects | domain_id | 0 | exempt (leadership-tier B1) |
| domain_module_host_domains | domain_id | 0 | routinely zero, OK |
| domain_modules | domain_id | 0 | yes, FAIL (Rule #14 M1) |
| domain_regulations | domain_id | 0 | optional, see B2-R1 |
| domains.parent_domain_id | self | NULL | routinely zero, OK |
| handoffs.source_domain_id | source | 0 | yes for non-leaf; vacuous absent masters and modules |
| handoffs.target_domain_id | target | 3 (202 CRM, 203 CRM, 208 REV-INTEL) | yes, pass informationally |
| skills | domain_id | 0 | yes (Rule #17 F2), vacuous until modules exist |
| solution_domains | domain_id | 12 | yes, pass |

#### S2, Per-module coverage

Vacuous (zero modules).

#### S3, Per-master indirect-table coverage

Vacuous (B1 leadership-tier exemption; zero masters).

#### A-band

- A1, domains metadata: PASS. crud_percentage 60, business_logic populated, min_org_size `20 s <500`, cost_band `$$$`, usa_market_size_usd_m 2500, market_size_source_year 2024, certification_required false.
- A2, capabilities linked: PASS, 8 rows.
- A3, solutions linked: PASS, 12 rows with coverage_level set, 9 primary.
- A4, catalog UX fields: FAIL (`catalog_tagline` and `catalog_description` both empty). Routed to B1-A1; draft wording in 2026-05-30 audit awaits user approval per Rule #20.
- A5, vendor ownership refresh: skipped (opt-in, not requested).

#### M-band

- M1, ≥1 domain_modules row: FAIL. Routed to B1-M1.
- M2, ≥3 capabilities implies ≥2 modules: implicitly FAIL (8 capabilities, 0 modules); resolved by B1-M1.
- M4, every capability has ≥1 realizing module: FAIL by construction (all 8 capabilities orphaned).
- M5, lifecycle states have domain_module_id when module-scoped: vacuous.
- M6, every module realizes ≥1 capability: vacuous.
- M7, single-master and within-domain coherence: vacuous.
- M8, module-level catalog UX fields: vacuous (no modules to check); will become applicable once B1-M1 lands.

#### B-band (structural sub-checks per brief)

- B5, embedded_master integrity: vacuous (zero embedded_master rows on this domain).
- B7, users edges populated: vacuous (zero masters).
- B9, outbound trigger_events and handoffs: vacuous (zero masters, no events published).
- B9b, intra-domain cross-module handoffs: vacuous (zero modules, no cross-module surface).
- B10b, per-module attribution on handoffs:
  - Outbound: vacuous (zero outbound rows).
  - Inbound: 3 rows. target_domain_module_id NULL on all 3 (handoffs 202, 203, 208) because SALES-PERF has zero modules to attribute to. source_domain_module_id: handoff 202 has source_domain_module_id 48 (CRM module), handoff 203 has source_domain_module_id 46 (CRM module), handoff 208 has source_domain_module_id NULL (REV-INTEL also has zero modules; that side is REV-INTEL's audit, report-only). The target-side NULL is this domain's fix surface, gated on B1-M1.
- B11, aliases for non-self-explanatory masters: vacuous.
- B12, lifecycle_states and pattern flags: vacuous.

#### C-band

- C1, ≥1 business_function_domains owner row: PASS. Owner Sales Operations, contributor Finance.

#### D-band

- D1, UI spot-check: deferred until after fix loads land.

#### E-band (E1-E5)

Vacuous on every check: no modules implies no role_modules surface, no 2-module floor to test, no interaction_level rows, no role_permissions bundles to count, no Path A / Path B reconciliation. Will become applicable once B1-M1 lands and ≥2 modules ship.

#### F-band (F1-F5)

- F1, no legacy domain-level system skills remain once module-level skills exist: PASS by vacuity (0 legacy rows, 0 module-level rows).
- F2, exactly one skill_type='system' skill per domain_modules row: vacuous (zero modules).
- F3, every module-level system skill has ≥1 skill_tools row: vacuous.
- F4, tool operation_kind / data_object_id invariant: vacuous.
- F5, Semantius score computable per module: vacuous (no modules; score uncomputable by design, not a failure).

#### H-band

H1, APQC coverage on cross-domain handoffs (outbound + inbound):

| handoff_id | source → target | trigger_event | payload | Existing tags | record_status |
|---|---|---|---|---|---|
| 202 | CRM → SALES-PERF | crm_opportunity.created | crm_opportunities | process 713 "Determine sales resource allocation" (agent_curated) | new |
| 203 | CRM → SALES-PERF | account.tier_changed | customers | process 54 "Perform planning and management accounting" (discovery_substring); process 713 "Determine sales resource allocation" (agent_curated) | new / new |
| 208 | REV-INTEL → SALES-PERF | pipeline_health.degraded | crm_opportunities | process 712 "Manage opportunity pipeline" (agent_curated); process 713 "Determine sales resource allocation" (agent_curated) | new / new |

All 3 cross-domain handoffs now carry ≥1 agent_curated tag (B1-H1 from 2026-05-30 applied in the 2026-05-31 Continuation). H1 PASSES on coverage. Provenance: 4 agent_curated + 1 discovery_substring rows; 0 approved (catalog-quality headline is still zero approved, per the H-band two-numbers convention). The discovery_substring row 106 (handoff 203 → process 54) remains active and incorrect, still routed to B2-H1 (supersede vs. coexist vs. delete).

Per the asymmetry rule: the substantive H1 fix for the publishing process lives on the source domains (CRM, REV-INTEL) and is report-only here. Surfaces under report-only follow-ups.

### Pass 2, Market audit (semantic)

No structural delta in catalog state since 2026-05-30; the Pass 2 market surface (30+ entities across 8 proposed modules) and findings categories carry over verbatim. Reference: 2026-05-30 audit section. Bucket 1 placeholders (B1-V1..B1-V7) and Bucket 3 carve-outs (commission expense, crediting / eligibility, overlay, capacity-planning vs. separate domain) remain open.

### Pass 3, Neighbor discovery

Carries over from 2026-05-30; no new handoffs or DMDO rows changed the edge-weight table.

| Neighbor | Outbound | Inbound | Edge weight | Deep dive? |
|---|---|---|---|---|
| CRM | 0 | 2 (202, 203) | 2 | below threshold; both inbound; consumer side |
| REV-INTEL | 0 | 1 (208) | 1 | below threshold; peer leadership-tier with zero modules |
| COMP-MGMT, ACCT-PLAN, GTM-PLAN, EPM | 0 | 0 | 0 | conceptual edges only; no catalog edges yet |

### Pass 4, Pairwise reconciliation per neighbor

Skipped on all 6 neighbors. Both CRM (weight 2) and REV-INTEL (weight 1) are below the default deep-dive threshold (≥3); the reconciliation surface for either is gated on B1-M1 (SALES-PERF needs modules so target_domain_module_id can be set on the inbound rows). Carries over as a "re-run after B1-M1 lands" follow-up.

### Bucket 1, In-scope confirmed gaps

| ID | Band | Finding | Fix surface | Status |
|---|---|---|---|---|
| B1-A1 | A4 | Empty catalog_tagline / catalog_description. | Drafts in 2026-05-30 history; user approves wording then PATCH per Rule #20. | Pending user approval. |
| B1-M1 | M1 / M2 / M4 / M8 | Zero domain_modules rows on a leadership-tier domain with 8 capabilities. Blocks B5/B7/B9/B9b/B10b target-side/B11/B12 (vacuous-by-zero) and gates the entire E and F bands positive-existence checks; gates M8 module-level catalog UX. | Author N domain_modules rows per the modular shape decided in B2-M1 (8 / 5 / 3 options); load domain_module_capabilities so every capability has ≥1 realizing module. | Pending B2-M1 shape decision, then loader. |
| B1-S1 | B10b | 3 inbound handoffs (202, 203, 208) have target_domain_module_id NULL. | Re-run B10b derivation against new module set: handoff 202 to SALES-PERF-QUOTA, 203 to SALES-PERF-TERRITORY, 208 to SALES-PERF-CAPACITY (per 2026-05-30 placeholder; revisit if B2-M1 picks 5 / 3-module shape). | Gated on B1-M1. |

Bucket 1 finding-type counts:

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | 0 in scope (7 master candidates B1-V1..B1-V7 from 2026-05-30 deferred to post-M1 + B2-M1) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | 3 (B1-A1, B1-M1, B1-S1) |
| BOUNDARY (NULL FK or missing handoff) | 0 (B1-S1 counted under STRUCTURAL; target-side NULLs are the same rows) |
| APQC TAGGING | 0 (the three agent_curated rows already landed in the 2026-05-31 Continuation; H1 passes on coverage) |
| MODULARIZATION ISSUES | 0 (routes to Bucket 2 B2-M1) |

### Bucket 2, Surface-for-user (judgment calls)

Carries over from 2026-05-30 verbatim. No new judgment calls surfaced by this audit pass.

1. B2-M1, Modularization hypothesis: 8 / 5 / 3-module shape.
2. B2-C1, Capability-level RACI override on INCENTIVE-COMP-MGMT.
3. B2-R1, Regulation coverage (ASC 606-21 / SOX / GDPR / Reg BI / FINRA).
4. B2-H1, Existing discovery_substring row 106 (handoff 203 → process 54): supersede / delete / keep.
5. B2-P1, Pairwise reconciliation timing post-B1-M1.

### Bucket 3, Phase 0 pending (speculative)

Carries over from 2026-05-30 verbatim:

1. Commission expense accounting carve-out (separate module vs. fields on commission_calculations).
2. Crediting / eligibility rule designer as a distinct module vs. configuration tables under SALES-PERF-COMMISSIONS.
3. Overlay seller comp as overlay_assignments vs. plan-component flags.
4. Capacity planning as a SALES-PERF module vs. as a separate SALES-PLANNING-PLATFORM domain.

### Cross-bucket dependencies

- B1-A1 independent of all other items; can land first.
- B1-M1 gates B1-S1 (B10b re-backfill), all master placeholders (B1-V1..B1-V7), B2-M1, all Pass 4 pairwise work, and the F-band positive-existence checks.
- B2-M1 informs B1-V1..B1-V7 (which module each master lands in).
- B2-R1 option (d) is informed by Bucket 3 candidate #1 (regulated-finance ICM specialization).
- Bucket 3 candidate #4 (capacity-planning) and B2-M1 feed each other.

### Report-only follow-ups (owed by other domains)

- CRM B9 owes inbound APQC tagging on the source side for handoffs 202 (crm_opportunity.created) and 203 (account.tier_changed).
- REV-INTEL B9 owes inbound APQC tagging on the source side for handoff 208 (pipeline_health.degraded).
- REV-INTEL B10b owes upstream module FK on handoff 208 (source_domain_module_id NULL); resolves when REV-INTEL ships modules.
- CRM, when SALES-PERF masters quotas / quota_assignments / territories, owes the mirror data_object_relationships rows (B6 / B8 on CRM side).
- COMP-MGMT, conditional on B2-C1 resolving to a Finance / Total-Rewards co-owner shape, needs a matching business_function_capabilities row.

### Per-bucket prompts

- After Bucket 1 (3 items): Fix these now? B1-A1 (catalog UX, needs draft approval), B1-M1 (modules, needs B2-M1 shape first), B1-S1 (B10b re-backfill, gated on B1-M1). Reply 'A1 only', 'A1 plus M1 with the 8-module shape' (also implies B2-M1 answer 8), or 'skip'.
- After Bucket 2 (5 items): What is your call on B2-M1, B2-C1, B2-R1, B2-H1, B2-P1? For B2-R1 option (d) and Bucket 3 candidate #1, consider running them together.
- After Bucket 3 (4 items): Vet via Phase 0 research, or eyeball-mode? Candidate #1 affects whether B1-M1 ships 7 or 8 modules; candidate #4 affects whether SALES-PERF-CAPACITY is a module here or queues a new domain.

### JWT errors

None.

### Files written by this audit

- audits/SALES-PERF/history.md (this section appended).
- audits/SALES-PERF/state.yaml (rewritten in place, schema_version 2).

No catalog writes. No notes writes. No record_status overrides. No cd. No mcp__* tool use.
