# RPA audit history

## 2026-05-30 — Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 0 `domain_modules` (full or starter), 0 capabilities, 5 solutions (3 primary + 1 secondary + 1 standard), 7 legacy `domain_data_objects` masters (`rpa_bots`, `rpa_executions`, `rpa_schedules`, `rpa_activities`, `rpa_activity_logs`, `rpa_bot_credentials`, `rpa_deployment_packages`), 10 `trigger_events` (all with `event_category=''`), 4 outbound cross-domain handoffs (2 to AUDIT, 2 to ITSM, every row carries NULL `source_domain_module_id`), 0 inbound handoffs, 0 lifecycle states, 0 aliases, 2 cross-domain `data_object_relationships` (AUDIT `audit_findings` reviews `rpa_executions` and `rpa_activity_logs`), 0 `business_function_capabilities` rows, 2 `business_function_domains` rows (owner = Business Operations, contributor = IT Operations), 1 legacy domain-level `skill_type='system'` skill (`rpa-system`, `domain_module_id=NULL`) with 7 `query_*` `skill_tools` rows (all platform-covered, no `mutate` / `compute` / `inbound`), 0 regulations.
- **Vendor-surface basis:** UiPath Business Automation Platform, Automation Anywhere 360, SS&C Blue Prism, ServiceNow RPA Hub, Microsoft Power Platform (Power Automate Desktop / Cloud Flows). UiPath, Automation Anywhere, and SS&C Blue Prism are the pure-play leaders. ServiceNow and Microsoft are suite-aligned (RPA bundled in a larger platform). No compliance specialist included: RPA is not a regulated market in its own right; bot-driven access to regulated systems inherits the consumed system's regime (HIPAA / SOX / PCI / GxP / GDPR) rather than constituting a separate one.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 4 items (entity gaps + adjacent-market candidates queued in `_missing-domains.md`).

**Domain Semantius score (strict)** across the single legacy system skill: 7/7 = 100% (every linked tool is `coverage_tier='platform'`). Operational score also 100%. Score is computable but the skill itself is a Rule #17 / F1 / F2 violation (domain-level instead of module-level), so the headline 100% is a misleading green light on a structurally hollow footprint.

**Neighbor discovery** (auto-derived from `handoffs` + cross-domain DMDO + cross-domain `data_object_relationships`, ranked by edge weight):

| Neighbor | Out | In | Cross-rels | DMDO | Weight | Pass shape |
|---|---|---|---|---|---|---|
| AUDIT (16) | 2 | 0 | 2 (`audit_findings` reviews `rpa_executions`, `rpa_activity_logs`) | 0 | 4 | Pairwise (full) |
| ITSM (1) | 2 | 0 | 0 | 0 | 2 | Lightweight |

Lighter neighbors (weight 1-2): ITSM only. Every other potential neighbor (HCM, IGA, IDP, BPA, PROC-MIN, LCAP, SOAR, SECOPS) has zero edges in either direction at audit time. That absence is itself a finding (see Bucket 1 STRUCTURAL B1-S5 and Bucket 3 B3-S2).

Structural pass bands roll up as: **M1 / M2 / M4 / M6 hard-fail** (zero modules and zero capabilities at A2 → cascades into every M / B-junction / E / F2-F4 check that depends on modules), **A2 hard-fail** (zero capabilities), **A4 hard-fail** (empty `catalog_tagline` + `catalog_description`), **A1 passes** (all seven Rule #8 fields populated correctly), **B1 passes** (7 masters), **B2 passes** (every master has both labels), **B3 passes** (every master is prefixed, no canonical-bare-word claim needed), **B4 hard-fail** (every flag false-by-default without positive re-evaluation), **B6 hard-fail** (zero intra-domain `data_object_relationships` among the 7 masters), **B7 hard-fail** (zero `users` edges on any master despite obvious actor relationships: bot owner, schedule creator, deployment-package approver), **B9 partial-fail** (10 events exist but all carry empty `event_category`, and `rpa_bot.deployed` / `rpa_bot.disabled` / `rpa_deployment_package.released` have no `handoffs` row), **B9b vacuously passes** (no modules ⇒ no cross-module pairs to test), **B10b hard-fail** (every outbound handoff carries NULL `source_domain_module_id`), **B11 hard-fail** (zero aliases despite obvious vendor synonyms: "digital worker", "software robot", "attended bot"), **B12 hard-fail** (zero lifecycle states despite obvious state machines on bots, executions, deployment packages, credentials), **C1 passes** (owner + contributor present), **C2 vacuously passes** (no capabilities ⇒ no overrides to author), **E1 vacuously passes** (no modules ⇒ 2-module floor blocks role authoring), **F1 hard-fail** (legacy domain-level system skill exists; under Rule #14 the target is per-module), **F2 / F3 / F4 hard-fail** (no modules ⇒ no per-module system skill to author against), **F7 vacuously passes** (no channel primitives linked), **H1 hard-fail** (0/4 cross-domain handoffs have `handoff_processes` rows; 0 `agent_curated`, 0 `discovery_substring`, 0 `approved`).

The headline of this audit: **RPA is a structurally hollow domain.** A1 + B1-B3 + C1 + the seven loaded masters + four cross-domain handoffs suggest a partial-Phase-B load happened, but the Phase-A modularization (capabilities + ≥1 `domain_modules` row + `domain_module_capabilities` + `domain_module_data_objects`) was never run. Most B / E / F failures cascade from the missing module layer; once Phase A is authored, the downstream cures become individual fixes. The audit recommends Phase A as the gate, then re-running.

### Bucket 1 — In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 + A2 (hard fail)** | Zero `domain_modules` rows AND zero `capability_domains` rows for RPA. Per Rule #14, every `domains` row MUST have ≥1 `module_kind='full'` `domain_modules` row; per A2, ≥3 capabilities (typical 5-8). The seven loaded masters cluster naturally into three module-shaped surfaces that match flagship-vendor packaging: (a) `RPA-BOT-AUTHORING` (`rpa_bots`, `rpa_activities`, `rpa_deployment_packages` — design-time / studio surface), (b) `RPA-ORCHESTRATION` (`rpa_executions`, `rpa_schedules`, `rpa_activity_logs` — runtime / orchestrator surface), (c) `RPA-BOT-IDENTITY` (`rpa_bot_credentials` — credential vault surface; arguable single-master starter or fold into orchestration). Proposed capabilities (5-7): `BOT-DESIGN`, `BOT-DEPLOYMENT`, `BOT-EXECUTION-ORCH`, `BOT-SCHEDULING`, `EXECUTION-AUDIT-TRAIL`, `BOT-CREDENTIAL-MGMT`, `RPA-CENTER-OF-EXCELLENCE`. With ≥3 capabilities the M2 floor demands ≥2 full modules; the (a) + (b) split satisfies it. | Author Phase A: 5-7 `capabilities` rows + `capability_domains` links + 2-3 `domain_modules` (full) + `domain_module_capabilities` + back-fill `domain_module_data_objects` migrating the 7 legacy `domain_data_objects` rows. Gate every other Bucket 1 fix on this one. |
| B1-S2 | **A4 (hard fail)** | `catalog_tagline` and `catalog_description` are both empty strings. Per Rule #20, draft both in buyer voice (workflow + value), surface to user for review BEFORE writing. | Draft a one-sentence tagline plus a 1-3 paragraph description (workflow + value, no vendor names per Rule #18, no analyst voice). Surface draft, wait for approval, then PATCH. |
| B1-S3 | **B9 invalid event_category** | All 10 `trigger_events` rows have `event_category=''` which violates Rule #13's allowed values (`lifecycle`, `state_change`, `threshold`, `signal`). Proposed mapping: `rpa_bot.deployed` → `lifecycle`; `rpa_bot.disabled` → `state_change`; `rpa_execution.completed` → `state_change`; `rpa_execution.failed` → `state_change`; `rpa_execution.long_running` → `threshold`; `rpa_schedule.activated` → `state_change`; `rpa_activity.added` → `lifecycle`; `rpa_activity_log.exception_captured` → `signal`; `rpa_bot_credentials.expiring` → `threshold`; `rpa_deployment_package.released` → `lifecycle`. | PATCH each row's `event_category`. |
| B1-S4 | **B9 missing event rows** | Three lifecycle / state events have a `trigger_events` row but no `handoffs` row anywhere, meaning the event is published nowhere. `rpa_bot.deployed` should fan-out to AUDIT (deployment-trail logging) and arguably IGA (bot identity provisioning); `rpa_bot.disabled` should fan-out to AUDIT and ITSM (incident on dependent downstream automations); `rpa_deployment_package.released` should fan-out to AUDIT (release-trail) and arguably CMDB or APM (CI registration of the deployed bot package). Without the handoff rows the event vocabulary is decorative. | Surface candidate handoff destinations to the user (likely targets AUDIT + ITSM at minimum; IGA / CMDB / APM optional pending Bucket 3 vetting). Author missing `handoffs` rows once approved. |
| B1-S5 | **B6 (hard fail)** | Zero intra-domain `data_object_relationships` rows among RPA's 7 masters. Every flagship vendor models at least: `rpa_bots → has many → rpa_schedules`, `rpa_bots → has many → rpa_executions`, `rpa_bots → composed of → rpa_activities`, `rpa_executions → has many → rpa_activity_logs`, `rpa_bots → packaged into → rpa_deployment_packages`, `rpa_bots → uses → rpa_bot_credentials` (M:N). Without these edges the architect render of the domain is a constellation of isolated masters. | Draft 6-8 relationship rows (verb + inverse + cardinality + necessity + owner_side); load via the standard relationship-loader pattern. |
| B1-S6 | **B7 (hard fail)** | Zero `data_object_relationships` rows between `users` (id 748) and any RPA master, despite obvious actor relationships: bot owner / author, schedule creator, deployment-package approver / promoter, execution operator, credential rotator, exception triage owner. Per Rule #10, built-in edges are first-class. | Draft 6-7 `users` ↔ master edges (`users authors rpa_bots`, `users schedules rpa_schedules`, `users approves rpa_deployment_packages`, `users rotates rpa_bot_credentials`, `users triages rpa_activity_logs`, `users supervises rpa_executions`, `users curates rpa_activities`); load alongside B1-S5. |
| B1-S7 | **B10b (hard fail)** | All 4 outbound `handoffs` rows have NULL `source_domain_module_id`. Two rows (to AUDIT) also carry NULL `target_domain_module_id` — those are AUDIT's B10b problem per the asymmetry rule. The other two (to ITSM) carry `target_domain_module_id=38` already populated. Both are blocked on B1-S1: there is no RPA module to attribute against yet. After Phase A lands the deterministic derivation per the B10b backfill recipe applies: `rpa_execution.completed` (event on `rpa_executions` → master in RPA-ORCHESTRATION) and `rpa_activity_log.exception_captured` (event on `rpa_activity_logs` → master in RPA-ORCHESTRATION) and `rpa_execution.failed` and `rpa_bot_credentials.expiring` (event on `rpa_bot_credentials` → master in RPA-BOT-IDENTITY or RPA-ORCHESTRATION). | Gated on B1-S1. Backfill `source_domain_module_id` after Phase A. |
| B1-S8 | **B11 (hard fail)** | Zero `data_object_aliases` rows for any of the 7 RPA masters. Common vendor / cross-vendor synonyms: `rpa_bots` → "digital worker" (Automation Anywhere), "software robot" (UiPath), "attended bot" / "unattended bot" (capacity-level), "process automation" (generic); `rpa_executions` → "bot run", "job run", "process instance"; `rpa_schedules` → "trigger", "job schedule", "queue trigger"; `rpa_activities` → "action", "step", "workflow component" (UiPath), "automation snippet"; `rpa_activity_logs` → "execution log", "audit trail" (caveat: collides with AUDIT's `audit_findings`), "trace"; `rpa_bot_credentials` → "asset" (UiPath uses this term broadly), "vault entry", "robot credential"; `rpa_deployment_packages` → "package" (UiPath), "process package", "Bot Insight package" (Automation Anywhere). | Draft alias rows (one entry per non-self-explanatory master); load via the standard alias-loader pattern. |
| B1-S9 | **B12 (hard fail)** | Zero `data_object_lifecycle_states` rows for any of the 7 masters despite obvious workflows: bots progress `draft → in_review → approved → deployed → active → disabled → retired`; executions progress `queued → running → completed | failed | cancelled | timed_out`; deployment packages progress `built → in_test → released → promoted → archived`; bot credentials progress `issued → active → rotating → expired → revoked`; schedules progress `inactive → active → paused → ended`. The `rpa_activities` and `rpa_activity_logs` masters are arguably config / append-only and exempt under Rule #12, but every other master has a state machine. | Draft lifecycle states + `requires_permission` flags + `permission_verb_override` per master; load via a focused loader. Gated on B1-S1 because `domain_module_id` must point at the realizing module per M5. |
| B1-S10 | **F1 (hard fail)** | Legacy domain-level `skill_type='system'` skill `rpa-system` (id 103) exists with `domain_module_id=NULL`. Per Rule #14 and the F1 check the target is module-level: once any module-anchored system skill exists for the domain, the legacy row is obsolete. Today the skill is the only one for the domain, so it sits in the acceptable transitional state, but as soon as the Phase-A modules land in B1-S1 the migration path applies. | Gated on B1-S1. After modules land, author per-module `system` skills (one per `domain_modules` row), migrate the 7 `query_*` `skill_tools` rows to the new module-level skills (split by which module masters each tool's `data_object_id`), then DELETE the legacy row. |
| B1-S11 | **F3 floor / Rule #17 ≥1 mutate per module** | The 7 `skill_tools` rows are all `operation_kind='query'`. Rule #17's practical floor calls for at least one `query`, one `mutate`, one workflow gate per module. Once Phase-A modules exist, author `mutate` / `side_effect` tools per master: `deploy_rpa_bot`, `disable_rpa_bot`, `schedule_rpa_bot`, `cancel_rpa_execution`, `rotate_rpa_bot_credential`, `promote_rpa_deployment_package`. Plus workflow-gate tools materialized from B1-S9 lifecycle states. | Gated on B1-S1 and B1-S9. Author the new tools + `skill_tools` rows alongside the per-module system skill migration in B1-S10. |
| B1-S12 | **B4 positive re-evaluation per Rule #12** | Every flag on every master is `false` by default; no audit-time positive re-evaluation recorded. Plausible candidates: `rpa_bot_credentials.has_personal_content=true` (bot credentials are PII-adjacent in unattended-RPA scenarios where the bot impersonates a named user; password / token contents are secret-shaped), `rpa_deployment_packages.has_submit_lock=true` (released packages should freeze so promotion chains have an immutable artifact), `rpa_bots.has_single_approver=true` (per-bot deploy approval — most vendors model a single technical owner who signs off). Surfaced as a Bucket 2 item below because it's a judgment call; this entry confirms the band was re-evaluated. | Per-flag yes/no from user (see B2-S3). |
| B1-S13 | **APQC TAGGING (H1 hard fail)** | 0 of 4 cross-domain handoffs have `handoff_processes` rows. Volume target per H1: 2-3 NEW `agent_curated` rows. Candidate tags from the PCF lookup: handoff 736 (`rpa_execution.failed` → ITSM, payload `service_incidents`) → process 1299 `Triage IT service delivery incidents` (external_id `20903`, L4) — confident match; the failed-bot-becomes-incident flow is exactly this PCF activity. Handoff 739 (`rpa_bot_credentials.expiring` → ITSM, payload `service_incidents`) → also process 1299 — confident match (credential-rotation becomes a service request / minor incident in ITSM). Handoff 737 (`rpa_execution.completed` → AUDIT, payload `rpa_executions`) → process 1184 `Conduct IT compliance control auditing of internal and external services` (external_id `20745`, L4) — moderate confidence; the bot-execution-audit-trail flow is closer to compliance audit than financial audit. Handoff 738 (`rpa_activity_log.exception_captured` → AUDIT, payload `rpa_activity_logs`) → same process 1184 — moderate confidence. | Author 4 `handoff_processes` rows: (736, 1299, `agent_curated`, `new`, `implements`); (739, 1299, `agent_curated`, `new`, `implements`); (737, 1184, `agent_curated`, `new`, `implements`); (738, 1184, `agent_curated`, `new`, `implements`). |

#### Bucket 1 finding-type summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A2/A4/M1/B4/B6/B7/B9/B10b/B11/B12/F1/F3) | 12 |
| BOUNDARY (NULL FK or missing handoff) | 0 (subsumed under B1-S7 and B1-S4) |
| APQC TAGGING | 1 (covers 4 handoff_processes rows) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (route to Bucket 2; the proposed Phase-A module split in B1-S1 is the answer rather than a refactor question) |
| **Bucket 1 total** | **13** |

### Bucket 2 — Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **Module shape for the Phase-A authoring in B1-S1.** Proposed split: (a) `RPA-BOT-AUTHORING` (`rpa_bots`, `rpa_activities`, `rpa_deployment_packages`), (b) `RPA-ORCHESTRATION` (`rpa_executions`, `rpa_schedules`, `rpa_activity_logs`), (c) `RPA-BOT-IDENTITY` (`rpa_bot_credentials` alone, OR fold credentials into orchestration as `embedded_master`). The first two are confident. The third is the editorial call. | Vendor practice diverges: UiPath separates "Assets" (credentials) from Orchestrator; Automation Anywhere keeps credentials inside Control Room (= orchestration). Both shapes are valid. Folding into orchestration keeps the module count at 2 (still satisfies M2's ≥2 floor with the projected ≥5 capabilities); splitting into a third dedicated module is closer to security-conscious deployments. | (a) Split credentials into a dedicated `RPA-BOT-IDENTITY` module. (b) Fold credentials into `RPA-ORCHESTRATION` as a fourth master. (c) Defer to a Phase 0 vendor-research pass before deciding (Bucket 3 dependency). |
| B2-S2 | **`rpa_activity_logs` aliasing collision with AUDIT's `audit_findings`.** B1-S8 proposes "audit trail" as an alias for `rpa_activity_logs`. AUDIT canonically masters audit findings / trails; "audit trail" pointing at an RPA-mastered log row would conflict with AUDIT's vocabulary. | Editorial / vocabulary decision. Could resolve by aliasing differently ("execution trail", "bot trace"), or by accepting that AUDIT consumes the RPA log (which is already what handoff 738 implies). | (a) Drop "audit trail" from the alias list; use "execution trail" / "bot trace" instead. (b) Keep "audit trail" with a `data_object_aliases.alias_type` qualifier that distinguishes it as an industry synonym, not a vendor-canonical term. (c) Surface to user as documentation; no alias loaded. |
| B2-S3 | **B4 pattern-flag positive re-evaluation per Rule #12.** Specific flags proposed in B1-S12: `rpa_bot_credentials.has_personal_content=true` (credential content is secret + PII-adjacent in user-impersonation scenarios); `rpa_deployment_packages.has_submit_lock=true` (released packages should freeze for promotion-chain integrity); `rpa_bots.has_single_approver=true` (per-bot deploy approval). | Pattern flags are workflow-shape judgments the user owns; per Rule #15 the rationale cannot live in `notes`. | Per-flag yes/no from user; decisions recorded in this audit. |
| B2-S4 | **Phase 0 vendor research vs. eyeball-mode for Bucket 3.** The market subagent was not spawned for this audit (per the mass-audit dispatch convention); Bucket 3 is the agent's own market-knowledge proposal. Recommend a formal Phase 0 pass before loading any of the four candidate gaps, OR eyeball-mode where the user names which candidates are real. | Bucket 3 items are speculative; without a Phase 0 vendor surface they're agent-knowledge guesses. | (a) Vetted route: spawn a Phase 0 subagent with the UiPath / Automation Anywhere / Blue Prism / Power Automate surface matrix and re-run. (b) Eyeball route: user picks which of the four to treat as confirmed. (c) Defer Bucket 3 entirely until after Phase A lands. |

### Bucket 3 — Phase 0 pending (speculative)

The market subagent was not invoked for this audit (mass-audit dispatch). The findings below are the agent's own market-knowledge enumerations against the flagship vendor surface; treat as candidates pending Phase 0 verification or eyeball-mode confirmation.

| ID | Candidate | Vendor knowledge basis | Verification path |
|---|---|---|---|
| B3-S1 | **MISSING entities (within RPA scope).** Six candidate masters absent from the 7-master footprint: `rpa_queues` (work queues / transaction queues — UiPath Queues, Automation Anywhere Work Queues, Blue Prism Work Queues), `rpa_queue_items` (individual transactions in a queue), `rpa_assets` (UiPath term for shared bot configuration including credentials but broader; if B2-S1 picks option (a) this overlaps with `RPA-BOT-IDENTITY`), `rpa_actions` (Automation Anywhere terminology for the leaf-level step, lower-granularity than `rpa_activities`), `rpa_machine_pools` / `rpa_runners` (the unattended-bot host registry — UiPath Machines, Automation Anywhere Bot Runners, Blue Prism Resources), `rpa_orchestration_tenants` / `rpa_folders` (multi-tenant / multi-folder organization within the orchestrator — UiPath Tenants + Folders). | UiPath / Automation Anywhere / Blue Prism public product docs and trial walkthroughs; verify which are first-class masters vs. config-level. |
| B3-S2 | **Adjacent-domain candidates surfaced by absence of expected edges.** Four sibling automation markets are absent from the catalog and were queued in `audits/_missing-domains.md` during this audit run: **IPA** (Intelligent Process Automation — AI-augmented RPA: UiPath AI Center, Automation Anywhere AARI, Power Automate AI Builder, Blue Prism Decipher), **TASK-MIN** (Task Mining — UiPath Task Mining, Power Automate Process Advisor, Soroco Scout, Kryon, ABBYY Timeline), **PROCESS-ORCH** (Process Orchestration / BPMN-engine — Camunda, Bizagi, Pega, IBM BAW, Workato, Tray.ai, Appian, Power Automate Cloud Flows), **SECRETS-MGMT** (Secrets Management — HashiCorp Vault, CyberArk Conjur, AWS Secrets Manager, Doppler, 1Password Secrets Automation, Akeyless). Each would carry handoffs into / out of RPA: TASK-MIN → RPA (automation-candidate handoff to bot authoring), PROC-MIN → RPA (similar), RPA → IPA (AI-skill invocation), RPA → IDP (document-extraction invocation, already an existing IDP domain), SECRETS-MGMT → RPA (credential issuance / rotation, replacing or wrapping the embedded `rpa_bot_credentials` master). | Triage in `_missing-domains.md`; the queue file is the authoritative tracking surface. Each candidate, if promoted, opens new handoff edges that this audit lists as missing today. |
| B3-S3 | **Missing regulations.** Zero `domain_regulations` rows for RPA, but bot-driven access to regulated systems implicates SOX (financial-data-touching bots require segregation of duties on bot identity), HIPAA (PHI-touching bots), PCI-DSS (card-data-touching bots), GxP / FDA 21 CFR Part 11 (pharma / clinical-data-touching bots — bot validation, electronic-records integrity), GDPR (bot-driven personal-data processing — Article 22 automated-decision-making implications). These are all consumer-system regimes inherited via the bot's data path rather than RPA-as-a-market regimes; the editorial call is whether to record the applicability on the RPA `domains` row anyway as a Phase-C signal for buyers. | Editorial; surface to user. The market doesn't have an RPA-specific regulator, but the buyer-side compliance posture is a real Phase-C buyer-persona signal. |
| B3-S4 | **MODULARIZATION verdict.** Once B1-S1 lands the 2-or-3-module split, the question is whether to also create a starter kit (`module_kind='starter'`, per Rule #19) covering the minimal attended-bot path for SMB-RPA scenarios where the orchestrator overhead isn't justified. `RPA-LITE` would embedded-master `rpa_bots` (from `RPA-BOT-AUTHORING`) and offer a `query_rpa_bots` + simple-trigger surface without the full orchestration / scheduling / credential-vault baggage. Aligns with the SMB-buyer story behind Power Automate Desktop's success. | Worth deferring until after the full modules land; the starter is a marketing-shape decision, not a structural gate. |

### Cross-bucket dependencies

- **B2-S1 (module shape) is dependent on B3-S1 + B3-S2.** Whether to break credentials into a dedicated module is partially informed by whether SECRETS-MGMT (B3-S2) gets promoted as a sibling domain (in which case `rpa_bot_credentials` becomes an `embedded_master` consuming an external master), and partially informed by whether `rpa_queues` / `rpa_machine_pools` (B3-S1) join the catalog (which would make orchestration a thicker module and argue for splitting credentials out for parity).
- **B2-S2 (alias collision) is independent** of Bucket 3.
- **B2-S3 (pattern flags) is independent** of Bucket 3 (workflow-shape judgments stand on their own).
- **B2-S4 is the gating call for all of Bucket 3** — vetted vs. eyeball decides whether the agent spawns the Phase 0 subagent or accepts the user's per-item picks.
- **B1-S1 (Phase A modules) gates B1-S7, B1-S9, B1-S10, B1-S11.** The B / E / F failures that depend on `domain_module_id` cannot be cured until the modules exist.
- **B1-S13 (APQC TAGGING) is independent** of B1-S1 — handoff_processes rows attach to `handoffs` rows that already exist; module attribution on the handoff side is orthogonal to the PCF tag.

### Per-bucket prompts

**Bucket 1 — fix these now?** Reply with: `all`, or list (e.g. `S1, S3, S13`), or `skip`.

- **S1 (Phase A modules + capabilities + `domain_module_data_objects` migration):** the headline blocker. Decide first; everything else flows from it.
- **S2 (catalog UX fields):** I'll draft for review per Rule #20 before any PATCH.
- **S3 (event_category PATCH on 10 events):** trivial; mechanical.
- **S4 (missing handoffs for 3 published events):** depends on naming the target domains for each event.
- **S5 (B6 intra-domain master-to-master relationships):** mechanical once verbs / cardinalities are approved.
- **S6 (B7 `users` edges):** mechanical once verbs are approved; uses Rule #10's first-class-edge contract.
- **S7 (B10b `source_domain_module_id` backfill):** gated on S1.
- **S8 (B11 aliases — 6 masters, ~20 alias rows):** depends on B2-S2 alias-collision resolution.
- **S9 (B12 lifecycle states + workflow gates):** gated on S1 + B2-S3 pattern flags.
- **S10 (F1 legacy skill migration + retirement):** gated on S1.
- **S11 (F3 floor — author mutate / workflow-gate tools per module):** gated on S1 + S9.
- **S12 (B4 pattern-flag positive re-evaluation):** recorded; B2-S3 gathers the actual decisions.
- **S13 (APQC TAGGING — 4 `agent_curated` `handoff_processes` rows):** independent of S1; load any time.

**Bucket 2 — what's your call on each?** I'll wait for per-item decisions before acting.

- **B2-S1 (module shape — 2 or 3 modules):** which option (a/b/c)?
- **B2-S2 (`rpa_activity_logs` alias collision):** which option (a/b/c)?
- **B2-S3 (pattern flags):** per-flag yes/no for the 3 proposed flags.
- **B2-S4 (Phase 0 vendor research vs. eyeball-mode for Bucket 3):** which option (a/b/c)?

**Bucket 3 — Phase 0 pending — vet via formal Phase 0 vendor research or eyeball-mode?** See B2-S4.

### Report-only follow-ups (owed by other domains)

| Owed by | What's owed | Why |
|---|---|---|
| AUDIT (16) | `target_domain_module_id` backfill on handoffs 737 and 738 (B10b on AUDIT's side) | The 2 outbound RPA → AUDIT handoffs have NULL `target_domain_module_id`. AUDIT owns the fix per the asymmetry rule. |
| AUDIT (16) | DMDO `consumer` (or `contributor`) row on `rpa_executions` (id 524) and `rpa_activity_logs` (id 527) at the AUDIT module that reads them | The 2 existing `data_object_relationships` rows (`audit_findings reviews rpa_executions`, `audit_findings reviews rpa_activity_logs`) imply an AUDIT module consumes both, but no DMDO captures the dependency. Surfaces during AUDIT's B-band audit. |
| ITSM (1) | DMDO `consumer` row on `rpa_executions` and `rpa_bot_credentials` at the ITSM-INCIDENT-MGMT module | The 2 outbound RPA → ITSM handoffs (`rpa_execution.failed` and `rpa_bot_credentials.expiring`) both carry payload `service_incidents` (ITSM-mastered), but a DMDO row on the ITSM side declaring consumption of the RPA source masters would close the pairwise loop. Routes to ITSM's audit. |
| IGA (35) | Inbound handoff from RPA on `rpa_bot.deployed` (proposed in B1-S4) — if accepted, IGA owes the consumer DMDO once authored | Bot-identity provisioning is an IGA-side concern when the bot impersonates a named user. Open question; depends on B1-S4 acceptance. |
| BPA (136) | Inbound handoff from RPA on `rpa_bot.deployed` or `rpa_deployment_package.released` — if BPA chooses to model bot deployments as process-architecture changes | Optional; depends on BPA's own scope decision. |
| PROC-MIN (40) | Outbound handoff from PROC-MIN → RPA on `process_variant.discovered` (automation-candidate identification) | The whole point of process mining → RPA is the handoff from the mining surface to bot authoring. PROC-MIN's B9 owes the outbound row; RPA's side is a DMDO `consumer` on whatever PROC-MIN masters as the variant / candidate. Surfaces during PROC-MIN's audit. |

### Candidate domains queued

Four candidate adjacent markets were queued in `audits/_missing-domains.md` during this audit:

- **IPA** — Intelligent Process Automation (UiPath AI Center, Automation Anywhere AARI, Power Automate AI Builder, Blue Prism Decipher).
- **TASK-MIN** — Task Mining (UiPath Task Mining, Power Automate Process Advisor, Soroco Scout, Kryon, ABBYY Timeline).
- **PROCESS-ORCH** — Process Orchestration and Workflow Engine (Camunda, Bizagi, Pega, IBM BAW, Workato, Tray.ai, Appian, Power Automate Cloud Flows).
- **SECRETS-MGMT** — Secrets Management (HashiCorp Vault, CyberArk Conjur, AWS Secrets Manager, Doppler, 1Password Secrets Automation, Akeyless).

## 2026-05-31, Continuation: B1 technical fixes

Applied the three technical Bucket 1 items that do not depend on Phase A modularization or user judgment. Loader: `c:/dev/domain-map/.tmp_deploy/fix_rpa_b1_technical_2026_05_31.ts`. All writes verified post-load.

### Applied (3 of 13 Bucket 1 items)

- **B1-S3** (`event_category` backfill). PATCHed all 10 `trigger_events` rows for RPA (ids 787-796) per the audit-proposed mapping: `lifecycle` (3 rows: `rpa_bot.deployed`, `rpa_activity.added`, `rpa_deployment_package.released`); `state_change` (4 rows: `rpa_bot.disabled`, `rpa_execution.completed`, `rpa_execution.failed`, `rpa_schedule.activated`); `threshold` (2 rows: `rpa_execution.long_running`, `rpa_bot_credentials.expiring`); `signal` (1 row: `rpa_activity_log.exception_captured`). All values inside the Rule #13 allowed set.

- **B1-S6** (B7 `users` first-class edges, Rule #10). Inserted 7 `data_object_relationships` rows from `users` (id 748) to each RPA master. Tuples: `authored bots` → `rpa_bots` (523), `scheduled runs` → `rpa_schedules` (525), `approved deployments` → `rpa_deployment_packages` (529), `rotated credentials` → `rpa_bot_credentials` (528), `triaged activity logs` → `rpa_activity_logs` (527), `supervised executions` → `rpa_executions` (524), `curated activities` → `rpa_activities` (526). All `one_to_many`, `reference`, `owner_side='source'`, `is_required=false`. Inverse verbs follow the `is_<verb>_by` snake pattern used by the existing user-edge corpus.

- **B1-S13** (APQC TAGGING / H1). Inserted 4 `handoff_processes` rows with `proposal_source='agent_curated'`, `role='implements'`, `record_status='new'` (default): handoff 736 + 739 → process 1299 (`Triage IT service delivery incidents`, APQC L4 ext_id 20903); handoff 737 + 738 → process 1184 (`Conduct IT compliance control auditing of internal and external services`, APQC L4 ext_id 20745).

### Deferred (10 of 13 Bucket 1 items)

- **B1-S1** (Phase A modules + capabilities + `domain_module_data_objects` migration). Deferred: introduces new modules / capabilities / DMDOs; module-shape arbitration (2 vs 3 modules) is open as B2-S1.
- **B1-S2** (`catalog_tagline` + `catalog_description`). Deferred per Rule #20: drafts must be surfaced to user before any PATCH.
- **B1-S4** (missing `handoffs` rows for 3 published events). Deferred: dispatcher pre-condition for `handoffs` insert requires audit-pre-specified `handoff_id` + resolvable PCF; this item proposes new handoff rows whose target domains are themselves an open question.
- **B1-S5** (B6 intra-domain `data_object_relationships`). Deferred: the audit calls for "draft 6-8 rows" but does not enumerate exact verb/cardinality tuples; this is a draft-and-review item, not a pre-specified insert.
- **B1-S7** (B10b `source_domain_module_id` backfill). Deferred: gated on B1-S1 (no RPA `domain_modules` rows exist to derive from).
- **B1-S8** (B11 aliases). Deferred: gated on B2-S2 (alias-collision with AUDIT's `audit_findings` is unresolved), and the alias set is not enumerated as exact pre-specified tuples per the dispatcher exclusion list.
- **B1-S9** (B12 lifecycle states + workflow gates). Deferred: gated on B1-S1 (`domain_module_id` must point at the realizing module per M5).
- **B1-S10** (F1 legacy `rpa-system` skill migration + retirement). Deferred: gated on B1-S1.
- **B1-S11** (F3 floor: per-module `mutate` / `side_effect` tools). Deferred: gated on B1-S1 + B1-S9.
- **B1-S12** (B4 pattern-flag positive re-evaluation). Deferred: per-flag yes/no is a judgment call (Bucket 2 B2-S3); Rule #15 forbids the legacy `notes` rationale carve-out anyway.

### Verification

- `trigger_events.event_category` for ids 787-796: 10/10 populated with audit-mapped values, zero remaining empty strings on RPA events.
- `data_object_relationships` from `users` (748) to RPA master ids 523-529: 7/7 rows present, all `owner_side='source'`.
- `handoff_processes` for handoffs 736-739: 4/4 rows present, all `proposal_source='agent_curated'`, `record_status='new'`, `role='implements'`.

No JWT-audience errors during the load. No `notes` columns written. `record_status` omitted on every insert (defaulted to `'new'`).

## 2026-05-31, Audit

### Summary

Fresh Validate b1 structural audit run against live state, post the 2026-05-31 Continuation that applied the three independent technical Bucket 1 items (B1-S3 event_category, B1-S6 users edges, B1-S13 APQC tags). All ten deferred items from the prior audit remain open and gated as before. No new structural pollution introduced; no new findings outside the pre-existing gap surface.

- **Current footprint:** 0 `domain_modules` (full or starter) on `domain_id=38`, 0 `domain_module_host_domains` rows, 0 `capability_domains`, 5 `solution_domains` (3 primary: UiPath Business Automation Platform, Automation Anywhere 360, SS&C Blue Prism; 1 secondary: Microsoft Power Platform; 1 standard: ServiceNow RPA Hub), 7 `domain_data_objects` masters (`rpa_bots` 523, `rpa_executions` 524, `rpa_schedules` 525, `rpa_activities` 526, `rpa_activity_logs` 527, `rpa_bot_credentials` 528, `rpa_deployment_packages` 529), 10 `trigger_events` (all event_category populated per the 2026-05-31 fix), 4 outbound cross-domain handoffs (737, 738 to AUDIT with both module FKs NULL; 736, 739 to ITSM with `source_domain_module_id=NULL` and `target_domain_module_id=38`), 0 inbound handoffs, 0 `data_object_lifecycle_states`, 0 `data_object_aliases`, 0 intra-domain `data_object_relationships` among the 7 masters, 9 cross-cutting `data_object_relationships` (2 AUDIT `audit_findings` → executions + activity_logs; 7 `users` (748) → each of the 7 masters per the 2026-05-31 fix), 2 `business_function_domains` (owner = Business Operations, contributor = IT Operations), 0 `business_function_capabilities`, 1 legacy domain-level `skill_type='system'` skill (`rpa-system` id 103, `domain_module_id=NULL`) with 7 `query_*` `skill_tools` rows all `coverage_tier='platform'`, 0 `domain_regulations`, 4 `handoff_processes` (all `agent_curated`, `record_status='new'`: handoffs 736 + 739 → process 1299, handoffs 737 + 738 → process 1184).
- **Vendor-surface basis (carried from 2026-05-30):** UiPath Business Automation Platform, Automation Anywhere 360, SS&C Blue Prism, ServiceNow RPA Hub, Microsoft Power Platform. UiPath / Automation Anywhere / SS&C Blue Prism are the pure-play leaders. No compliance specialist (RPA is not a regulated market in its own right; bot access to regulated systems inherits the consumed system's regime).
- **Bucket 1 (in-scope, agent fixable):** 10 items (all carried from 2026-05-30; 3 prior items B1-S3 / B1-S6 / B1-S13 resolved per the Continuation entry).
- **Bucket 2 (surface-for-user, judgment):** 4 items (carried unchanged).
- **Bucket 3 (Phase 0 pending, speculative):** 4 items (carried unchanged).

**Domain Semantius score (strict)** across the single legacy system skill: 7/7 = 100% (every linked tool is `coverage_tier='platform'`). Operational score also 100%. The headline 100% remains a misleading green light: the skill itself is a Rule #17 / F1 violation (domain-level instead of module-level), and the F2/F3/F4 gates cannot fire until B1-S1 lands per-module skills.

Structural pass bands roll up (changes from 2026-05-30 in **bold**):

- **A1 passes** (all seven Rule #8 fields populated correctly: crud_percentage=25, business_logic populated, min_org_size=30 m <2500, cost_band=$$$, certification_required=false, usa_market_size_usd_m=2500, market_size_source_year=2025).
- **A2 hard-fail** (zero capabilities).
- **A3 passes** (5 solutions linked, 3 primary, coverage_level set on every row).
- **A4 hard-fail** (empty `catalog_tagline` + `catalog_description` on the domains row).
- **M1, M2, M4, M6 hard-fail** (zero `domain_modules` rows ⇒ every M-band check fails; cascades into every B-junction / E / F2-F4 check).
- **M5 vacuously passes** (no lifecycle states authored ⇒ no rows to gate on).
- **M7 vacuously passes** (no DMDO rows on this domain ⇒ no within-domain master/consumer collisions; the catalog-wide single-master check returns no conflicts for ids 523-529).
- **M8 vacuously passes** (no `domain_modules` rows ⇒ no per-module UX fields to populate).
- **B1 passes** (7 `master` rows in `domain_data_objects`).
- **B2 passes** (every master has both singular_label and plural_label).
- **B3 passes** (every master is prefixed `rpa_*`; no canonical-bare-word claim needed).
- **B4 hard-fail** (every pattern flag false on every master; no positive re-evaluation recorded).
- **B5 passes** (every master has `kind='domain_owned'` consistent with the domain's authoring claim).
- **B6 hard-fail** (zero intra-domain `data_object_relationships` among the 7 masters; the 7 `users` edges from the 2026-05-31 Continuation cover B7 not B6).
- **B7 passes** (**changed since 2026-05-30**) — 7 `users`-edge `data_object_relationships` rows covering all 7 masters, all `owner_side='source'`, inverse verbs in `is_*_by` snake form.
- **B9 passes** (**changed since 2026-05-30**) — all 10 `trigger_events.event_category` values inside the Rule #13 allowed set per the 2026-05-31 fix.
- **B9b vacuously passes** (no modules ⇒ no cross-module pairs to test).
- **B10b hard-fail** (all 4 outbound handoffs carry NULL `source_domain_module_id`; handoffs 737 + 738 also carry NULL `target_domain_module_id` and that is AUDIT's B10b problem; handoffs 736 + 739 carry `target_domain_module_id=38` which is the ITSM-INCIDENT-MGMT module, correct on the ITSM side).
- **B11 hard-fail** (zero `data_object_aliases` for any of the 7 masters).
- **B12 hard-fail** (zero `data_object_lifecycle_states` for any of the 7 masters despite obvious state machines on bots, executions, deployment packages, credentials, schedules).
- **C1 passes** (owner = Business Operations + contributor = IT Operations).
- **C2 vacuously passes** (no capabilities ⇒ no `business_function_capabilities` overrides to author).
- **D vacuously passes** (substrate-level analytic; nothing per-domain to fail).
- **E1 vacuously passes** (no modules ⇒ the 2-module floor for `role_modules` blocks any role authoring before B1-S1 lands).
- **E2-E5 vacuously pass** (gated on E1).
- **F1 hard-fail** (legacy domain-level system skill `rpa-system` id 103 with `domain_module_id=NULL`; Rule #17 target is per-module).
- **F2, F3, F4 hard-fail** (no modules ⇒ no per-module `skill_type='system'` skill to author against ⇒ no `mutate` / workflow-gate tools to add; the 7 existing `query_*` tools are all `coverage_tier='platform'` and would migrate to the per-module skills once they exist).
- **F5 misleading-green** (strict + operational Semantius score = 100% across the legacy skill; the score is computable but a structurally hollow footprint masks the F1 violation).
- **H1 passes** (**changed since 2026-05-30**) — 4/4 cross-domain handoffs have `handoff_processes` rows per the 2026-05-31 fix, all `proposal_source='agent_curated'`, `record_status='new'`. Quality headline (`record_status='approved'`) is 0/4; process-health side-bar (`proposal_source='agent_curated'`) is 4/4.

The headline of this audit remains: **RPA is a structurally hollow domain** — A1 + B1-B3 + B5 + B7 + B9 + C1 + the seven loaded masters + four cross-domain handoffs + technical Continuation cures are loaded, but the Phase-A modularization (capabilities + ≥1 `domain_modules` row + `domain_module_capabilities` + `domain_module_data_objects`) was never run. Every remaining B / E / F failure either cascades from the missing module layer (B10b, B12, F1-F4) or is independently authorable (B4 flags, B6 intra-domain relationships, B11 aliases, A4 catalog UX). B1-S1 (Phase A modules) is the single gating fix that unblocks ~70% of the remaining surface.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix | Status |
|---|---|---|---|---|
| B1-S1 | M1 + A2 + M4 + M6 (hard fail) | Zero `domain_modules` AND zero `capability_domains` rows for RPA. The seven loaded masters cluster naturally into module-shaped surfaces matching flagship-vendor packaging: (a) `RPA-BOT-AUTHORING` (`rpa_bots`, `rpa_activities`, `rpa_deployment_packages`), (b) `RPA-ORCHESTRATION` (`rpa_executions`, `rpa_schedules`, `rpa_activity_logs`), (c) `RPA-BOT-IDENTITY` (`rpa_bot_credentials`; arguably fold into orchestration per B2-S1). Proposed capabilities (5-7): `BOT-DESIGN`, `BOT-DEPLOYMENT`, `BOT-EXECUTION-ORCH`, `BOT-SCHEDULING`, `EXECUTION-AUDIT-TRAIL`, `BOT-CREDENTIAL-MGMT`, `RPA-CENTER-OF-EXCELLENCE`. | Author Phase A: 5-7 `capabilities` + `capability_domains` + 2-3 `domain_modules` (full) + `domain_module_capabilities` + back-fill `domain_module_data_objects` migrating the 7 legacy `domain_data_objects` rows. Gate every other Bucket 1 fix on this one. | b1a (was b1a; module shape pending B2-S1 ⇒ also blocked) |
| B1-S2 | A4 (hard fail) | `domains.catalog_tagline` and `domains.catalog_description` both empty strings. | Per Rule #20: draft both in buyer voice (workflow + value), surface to user for review BEFORE writing. | b1a (drafting gated on user surface step per Rule #20) |
| B1-S4 | B9 missing handoff rows | Three lifecycle/state events have a `trigger_events` row but no `handoffs` row: `rpa_bot.deployed` (787), `rpa_bot.disabled` (788), `rpa_deployment_package.released` (796). Candidate destinations: AUDIT (deployment-trail / release-trail), ITSM (incident on dependent automations), IGA (bot identity provisioning), CMDB / APM (CI registration). | Surface candidate handoff destinations to user; author missing `handoffs` rows once approved. | b1a (depends on user naming targets) |
| B1-S5 | B6 (hard fail) | Zero intra-domain `data_object_relationships` among RPA's 7 masters. Expected edges: `rpa_bots → has many → rpa_schedules`, `rpa_bots → has many → rpa_executions`, `rpa_bots → composed of → rpa_activities`, `rpa_executions → has many → rpa_activity_logs`, `rpa_bots → packaged into → rpa_deployment_packages`, `rpa_bots → uses → rpa_bot_credentials` (M:N). | Draft 6-8 relationship rows (verb + inverse + cardinality + necessity + owner_side); load via standard relationship-loader pattern. | b1a (mechanical once verb/cardinality reviewed) |
| B1-S7 | B10b (hard fail) | All 4 outbound `handoffs` rows have NULL `source_domain_module_id`. After Phase A lands the deterministic derivation: `rpa_execution.completed` / `rpa_execution.failed` → RPA-ORCHESTRATION module; `rpa_activity_log.exception_captured` → RPA-ORCHESTRATION; `rpa_bot_credentials.expiring` → RPA-BOT-IDENTITY (or RPA-ORCHESTRATION per B2-S1). | Gated on B1-S1. Backfill `source_domain_module_id` after Phase A. | b1b (blocked on B1-S1) |
| B1-S8 | B11 (hard fail) | Zero `data_object_aliases` for any of the 7 RPA masters. Common vendor synonyms documented in prior audit; collision with AUDIT's `audit_findings` for `rpa_activity_logs` is the open Bucket 2 question. | Draft alias rows (one entry per non-self-explanatory master); load via the standard alias-loader pattern. | b1b (blocked on B2-S2 collision resolution) |
| B1-S9 | B12 (hard fail) | Zero `data_object_lifecycle_states` for any of the 7 masters. Expected state machines per audit-prior: bots `draft → in_review → approved → deployed → active → disabled → retired`; executions `queued → running → completed | failed | cancelled | timed_out`; deployment packages `built → in_test → released → promoted → archived`; bot credentials `issued → active → rotating → expired → revoked`; schedules `inactive → active → paused → ended`. `rpa_activities` and `rpa_activity_logs` likely Rule #12-exempt. | Draft lifecycle states + `requires_permission` flags + `permission_verb_override` per master; load via focused loader. Gated on B1-S1 (M5 requires `domain_module_id`). | b1b (blocked on B1-S1) |
| B1-S10 | F1 (hard fail) | Legacy domain-level `skill_type='system'` skill `rpa-system` (id 103) with `domain_module_id=NULL`. Under Rule #17 + F1 the target is module-level. | After modules land in B1-S1, author per-module `system` skills (one per `domain_modules` row), migrate the 7 `query_*` `skill_tools` rows split by which module masters each tool's `data_object_id`, then DELETE the legacy row. | b1b (blocked on B1-S1) |
| B1-S11 | F3 floor / Rule #17 (one mutate per module minimum) | The 7 `skill_tools` rows are all `operation_kind='query'`. Rule #17's practical floor is at least one `query`, one `mutate`, one workflow-gate per module. Candidate `mutate` / `side_effect` tools: `deploy_rpa_bot`, `disable_rpa_bot`, `schedule_rpa_bot`, `cancel_rpa_execution`, `rotate_rpa_bot_credential`, `promote_rpa_deployment_package`. Workflow-gate tools materialized from B1-S9 lifecycle states. | Gated on B1-S1 + B1-S9. Author the new tools + `skill_tools` rows alongside the per-module system-skill migration in B1-S10. | b1b (blocked on B1-S1 + B1-S9) |
| B1-S12 | B4 positive re-evaluation per Rule #12 | Every flag on every master is false-by-default; no positive re-evaluation recorded. Candidates: `rpa_bot_credentials.has_personal_content=true` (credential content is secret + PII-adjacent in impersonation scenarios), `rpa_deployment_packages.has_submit_lock=true` (released packages should freeze for promotion-chain integrity), `rpa_bots.has_single_approver=true` (per-bot deploy approval). | Per-flag yes/no from user (B2-S3 gathers the actual decisions). | b1b (blocked on B2-S3) |

#### Bucket 1 finding-type summary

| Finding type | Count |
|---|---|
| MISSING (entity gap) | 0 |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A2/A4/M1/B4/B6/B10b/B11/B12/F1/F3) | 10 |
| BOUNDARY (NULL FK or missing handoff) | 0 (subsumed under B1-S7 and B1-S4) |
| APQC TAGGING | 0 (H1 cured by 2026-05-31 Continuation) |
| MODULARIZATION ISSUES | 0 in Bucket 1 (route to Bucket 2; B2-S1 is the answer) |
| Bucket 1 total | 10 |

### Bucket 2 - Surface-for-user (judgment calls)

Carried unchanged from 2026-05-30. No new judgment calls surfaced by this audit.

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | Module shape for B1-S1: (a) split credentials into dedicated `RPA-BOT-IDENTITY`, (b) fold credentials into `RPA-ORCHESTRATION`, (c) defer to Bucket 3 vendor research. | Vendor practice diverges (UiPath separates Assets, Automation Anywhere keeps credentials in Control Room). Editorial choice. | a / b / c |
| B2-S2 | `rpa_activity_logs` alias "audit trail" collides with AUDIT's `audit_findings`. | Vocabulary collision; editorial. | (a) drop "audit trail"; use "execution trail" / "bot trace"; (b) keep with `alias_type` qualifier; (c) document only, no alias loaded |
| B2-S3 | B4 pattern-flag positive re-evaluation: `rpa_bot_credentials.has_personal_content`, `rpa_deployment_packages.has_submit_lock`, `rpa_bots.has_single_approver` — each yes/no? | Workflow-shape judgment user owns; Rule #15 forbids `notes`-based rationale carve-out. | Per-flag yes/no from user |
| B2-S4 | Phase 0 vendor research vs. eyeball-mode for Bucket 3 candidates. | Bucket 3 items are speculative; no Phase 0 surface authored for RPA. | (a) vetted Phase 0 pass; (b) eyeball-mode user picks; (c) defer entirely until after Phase A lands |

### Bucket 3 - Phase 0 pending (speculative)

Carried unchanged from 2026-05-30. No new candidate gaps surfaced by this audit.

| ID | Candidate | Vendor knowledge basis | Verification path |
|---|---|---|---|
| B3-S1 | MISSING entities within RPA scope: `rpa_queues`, `rpa_queue_items`, `rpa_assets`, `rpa_actions`, `rpa_machine_pools` / `rpa_runners`, `rpa_orchestration_tenants` / `rpa_folders`. | UiPath / Automation Anywhere / Blue Prism public product docs and trial walkthroughs. | Verify which are first-class masters vs. config-level. |
| B3-S2 | Adjacent-domain candidates: IPA (Intelligent Process Automation), TASK-MIN (Task Mining), PROCESS-ORCH (Process Orchestration / BPMN), SECRETS-MGMT (Secrets Management). All queued in `_missing-domains.md`. | UiPath AI Center / Automation Anywhere AARI / Camunda / HashiCorp Vault et al. | Each opens new handoff edges into / out of RPA. |
| B3-S3 | Missing regulations row(s) on RPA: SOX, HIPAA, PCI-DSS, GxP / 21 CFR Part 11, GDPR (all inherited via consumer-system data path). | Statutory inheritance via bot's data scope. | Editorial: does the buyer-side compliance posture warrant Phase-C-shaped recording on the RPA `domains` row? |
| B3-S4 | MODULARIZATION starter kit: `RPA-LITE` (`module_kind='starter'`) for SMB attended-bot scenarios. | Aligned with Power Automate Desktop's SMB story. | Deferred until full modules land; starter is marketing-shape decision, not structural gate. |

### Cross-bucket dependencies

- B2-S1 (module shape) is dependent on B3-S1 + B3-S2 (whether credentials become an embedded shell of a SECRETS-MGMT master, whether orchestration thickens with `rpa_queues` / `rpa_machine_pools`).
- B2-S2 (alias collision) is independent of Bucket 3.
- B2-S3 (pattern flags) is independent of Bucket 3.
- B2-S4 is the gating call for all of Bucket 3.
- B1-S1 (Phase A modules) gates B1-S7, B1-S9, B1-S10, B1-S11.
- B1-S8 (aliases) is gated on B2-S2.
- B1-S12 (pattern flags) is gated on B2-S3.

### Audit deltas vs 2026-05-30

- B1-S3 (event_category backfill on 10 events) — RESOLVED via 2026-05-31 Continuation.
- B1-S6 (B7 `users` edges, 7 rows) — RESOLVED via 2026-05-31 Continuation.
- B1-S13 (APQC TAGGING, 4 `handoff_processes` rows) — RESOLVED via 2026-05-31 Continuation.
- All other Bucket 1 items unchanged.
- All Bucket 2 + Bucket 3 items unchanged.

No new structural pollution, no new findings, no `notes` columns written, no `record_status` mutations, no JWT-audience errors during this audit.

### Per-bucket prompts

- **Bucket 1 (10 items):** Reply with `all`, list (e.g. `S1, S2, S4`), or `skip`. Note B1-S1 is the gating fix for 5 of the 10.
- **Bucket 2 (4 items):** Reply per-item: B2-S1 a/b/c, B2-S2 a/b/c, B2-S3 yes/no per flag, B2-S4 a/b/c.
- **Bucket 3 (4 items):** Vet via Phase 0 vendor research or eyeball-mode? If eyeball, name which candidates ring true (per B2-S4).

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
