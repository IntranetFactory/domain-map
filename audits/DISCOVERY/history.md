# DISCOVERY audit history

## 2026-05-30: Validate b1 (full 4-pass)

### Summary

- Current footprint: domain `DISCOVERY` (id 5) carries **3 master `data_objects`** (`discovery_scans` 81, `discovered_devices` 82, `discovery_sources` 83) via legacy `domain_data_objects` only. **Zero `domain_modules` rows.** Zero `domain_module_data_objects` rows. Zero `domain_module_capabilities`. Zero `capability_domains`. Zero `domain_regulations`. Zero `data_object_lifecycle_states`. Zero `data_object_aliases`. Zero `data_object_relationships` touching the 3 masters. One `business_function_domains` row (IT Infrastructure as owner). 4 `solution_domains` rows (BMC Helix Discovery primary, Device42 primary, ServiceNow ITOM secondary, Lansweeper secondary). 12 outbound cross-domain handoffs, 2 inbound. 5 trigger events on the masters. 1 `skills` row (`discovery-system`, kebab + `system` suffix, `domain_module_id=NULL`) with 3 `skill_tools` rows, all `platform`-tier `query_*` tools.
- Vendor surface basis (agent enumeration, no subagent dispatched per b1 scope): ServiceNow Discovery + Service Mapping, BMC Helix Discovery (ADDM lineage), Device42, Lansweeper, Tanium Asset, plus security-asset specialists Axonius and JupiterOne (CAASM) and runZero (passive network scan). Pure-play discovery + service-mapping leg: BMC ADDM, Device42, ServiceNow Discovery. Inventory leg: Lansweeper, Tanium. CAASM-adjacent leg: Axonius / JupiterOne / runZero (these triangulate against the missing-domain proposal in Bucket 3 / candidate queue).
- **Bucket 1 (in-scope, agent fixable):** 22 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 items.

Headline gap: DISCOVERY is **not modularized** (Rule #14 M1 hard fail). Everything downstream (DMDO footprint, lifecycle states, system skills, permissions, roles, blueprints) is structurally undefined. The audit captures the surface that needs to materialize but does NOT propose a per-row Phase B fix list, because the right shape is a single Phase A+M+B re-load against the modularization hypothesis Bucket 2 #1 selects.

Domain Semantius score: uncomputable (no `domain_modules` rows, so per-module rollup undefined; legacy single-skill `discovery-system` has 100% platform coverage on its 3 query tools but is not anchored to a module).

### Vendor surface basis

ServiceNow Discovery (anchored to CMDB, agentless + agent-based, classifier patterns), BMC Helix Discovery (formerly ADDM, agentless network + cloud-API + Kubernetes), Device42 (auto-discovery + dependency mapping), Lansweeper (lightweight inventory + cloud scan), Tanium Asset (endpoint-resident asset visibility). Plus CAASM-tier triangulation: Axonius (aggregator across existing sources), JupiterOne (graph-shaped asset model), runZero (unauthenticated network discovery). No FCRA / HIPAA / GDPR / SOX gate on this market itself, but discovered data flows into systems that are GDPR-scoped (CMDB) and SOX-scoped (financial-control endpoints): discovered data inherits downstream applicability, the domain itself does not gate it.

### Bucket 1: In-scope confirmed gaps

#### STRUCTURAL: Phase A / M foundational gaps

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A1 | `domains.business_logic` contains a U+2014 character between `agents` and `code-dominant collection plane.` violating the project-wide no-em-dash rule. The current value is roughly `"Scanning, fingerprinting, and credentialed inspection across networks, cloud APIs, and agents [U+2014] code-dominant collection plane."` | PATCH `business_logic` to `"Scanning, fingerprinting, and credentialed inspection across networks, cloud APIs, and agents (code-dominant collection plane)."` |
| B1-S2 | A2 | Zero rows in `capability_domains` for DISCOVERY. Domain has no defined capabilities. | Author 5-7 capabilities (`network-asset-discovery`, `agentless-credentialed-scan`, `cloud-api-discovery`, `service-dependency-mapping`, `reconciliation-and-normalization`, `discovery-source-management`, `passive-network-discovery`) and link via `capability_domains`. |
| B1-S3 | A3 | Solution coverage thin: 4 rows total, 2 primary + 2 secondary. Missing: Tanium Asset (primary inventory leg), Microsoft Defender for Cloud Inventory, Qualys Asset Inventory, optionally runZero (passive network specialist). | INSERT `solutions` + `solution_domains` for 2-4 additional flagship vendors. |
| B1-S4 | A4 | `catalog_tagline` and `catalog_description` both empty. Rule #20 backfill is allowed with user surface; values draft only, not auto-write. | Draft both fields in buyer voice, surface to user for review BEFORE writing. **Do not overwrite when non-empty** without explicit per-row approval. |
| B1-S5 | M1 / Rule #14 | Zero `domain_modules` rows on DISCOVERY. Hard fail. Every downstream concern (DMDO, lifecycle states, system skills, role bundling) is structurally undefined until modules exist. | Author the module set per the Bucket 2 #1 modularization hypothesis the user selects. Recommended seed: `DISCOVERY-NETWORK-SCAN`, `DISCOVERY-CLOUD-INVENTORY`, `DISCOVERY-SERVICE-MAPPING`, `DISCOVERY-RECONCILIATION`. Capability count (post B1-S2) will be ≥3, so M2 forces ≥2 full modules. |
| B1-S6 | M4 / Rule #14 | Once capabilities are loaded (B1-S2), each requires ≥1 realizing module via `domain_module_capabilities`. | Author `domain_module_capabilities` rows after B1-S5 finalizes the module set. |
| B1-S7 | M6 | Every module realizes ≥1 capability (reverse of M4). | Same loader pass as B1-S6. |
| B1-S8 | B1 | `domain_data_objects` masters 3 entities but DMDO is empty. Migration from legacy rollup to module-anchored DMDO is required for any modularized domain (rollup is derived from DMDO post-Rule-#14). | Re-anchor `discovery_scans` (81), `discovered_devices` (82), `discovery_sources` (83) as `role=master, necessity=required` in `domain_module_data_objects` against the realizing modules from B1-S5. Then the legacy `domain_data_objects` rows should be **deleted** (DMDO becomes the source of truth). |
| B1-S9 | B6 | Zero `data_object_relationships` touching `discovery_scans`, `discovered_devices`, `discovery_sources`. The internal graph (scan emits candidates, candidate normalizes to CI, source drives scan) is unmodeled. | Author intra-domain edges: `discovery_sources → discovery_scans` (drives, one_to_many, composition), `discovery_scans → discovered_devices` (emits, one_to_many, composition), `discovered_devices → configuration_items` (promotes_to, one_to_one, reference, owner_side=source, is_required=false), `discovered_devices → hardware_assets` (links_to, many_to_many, reference). |
| B1-S10 | B7 / Rule #10 | Three masters have user-typed actors but no `→ users` edges in `data_object_relationships`: `discovery_scans` (initiated_by / scan_operator), `discovered_devices` (reviewer / approver during reconciliation), `discovery_sources` (credential_owner / connector_owner). | Author 3 edges per Rule #10, against the seeded `users` row (`data_objects.kind='platform_builtin'`). |
| B1-S11 | B11 | Zero `data_object_aliases` on the 3 masters. Vendor terms differ widely: ServiceNow uses `CI Candidate` for `discovered_devices`, BMC ADDM uses `Topology Snapshot` for `discovery_scans`, Tanium uses `Asset Record` for `discovered_devices`, CAASM vendors use `Asset Record` broadly. | Author ≥1 alias per non-self-explanatory master (B2 borderline aliases: `discovery_scans → topology_snapshot`, `discovered_devices → ci_candidate`, `discovered_devices → asset_record`, `discovery_sources → discovery_connector`). |
| B1-S12 | B12 / Rule #12 | Zero `data_object_lifecycle_states` on the 3 masters. `discovery_scans` (queued → running → completed / failed) and `discovered_devices` (raw → normalized → reconciled / excluded) clearly carry state machines and are NOT config-shape. `discovery_sources` (configured → connected / disconnected) also has explicit state. | Author lifecycle-states per master, with `requires_permission=true` on terminal-and-key states. Permission prefix uses the realizing module's `domain_module_code`, set post B1-S5. |
| B1-S13 | F1 (naming) | The single `skills` row uses kebab `discovery-system` with the legacy `system` suffix; convention per Phase-S is snake `<module_code_lower>_agent`. Also `domain_module_id=NULL` (Rule #17 requires module anchoring). | After B1-S5 ships modules, replace the single legacy skill with one `skill_type='system'` row per module, named `<module_code_lower>_agent`. The 3 existing `skill_tools` rows (409/410/411) target the right tools but need re-anchoring to the per-module skills. |
| B1-S14 | F2 / Rule #17 | One `system` skill exists but `domain_module_id` is NULL, so no module-anchored Semantius-score rollup is computable. | Same fix as B1-S13 (re-emit per-module system skills). |

#### BOUNDARY

| ID | Finding | Fix |
|---|---|---|
| B1-B1 | Stale `handoff_processes` rows: handoff 48 (`ci.discovered → CMDB`) tagged with PCF process 9 (`Manage Financial Resources`), handoff 49 (`relationship.discovered → CMDB`) tagged with PCF process 12 (`Manage External Relationships`). Both are clearly `discovery_substring` false positives matching `manage` only. | DELETE the two `handoff_processes` rows (48→9, 49→12) before authoring the correct APQC tags in B1-H1. Handoff 33 → 1258 (`Confirm hardware/software operational status`) is a reasonable match, keep. |
| B1-B2 | Legacy `domain_data_objects` row claims DISCOVERY masters `service_maps` (79), but the live DMDO master is in CMDB-SERVICE-MAPPING. The legacy rollup is wrong. | DELETE the legacy `domain_data_objects` row (data_object_id=79, domain_id=5, role=master). Add as `consumer` if DISCOVERY references service-map output (likely no, service mapping is mastered by CMDB). |

#### B9 trigger-event coverage

The 5 trigger events on masters fan out into the existing handoff set; review per event:

| ID | Trigger event | Current subscribers | Proposed coverage |
|---|---|---|---|
| B1-T1 | `discovery_scan.completed` (630) | CMDB (621), HAM (622), SAM (623) | Add ITAM rollup once DISCOVERY→ITAM scoping is decided; possibly add UEM (endpoint inventory consumer). |
| B1-T2 | `discovery_scan.failed` (631) | ITSM service_incidents (624) | Acceptable; failures auto-create incidents. |
| B1-T3 | `network_device.discovered` (77) | DISCOVERY is target via RMM (147) | Inbound; acceptable. May want a sibling outbound for the canonical DISCOVERY-published event (`device.discovered` 44 already publishes to HAM). |
| B1-T4 | `discovery_source.connected` (632) | CMDB (625) | Acceptable. |
| B1-T5 | `discovery_source.disconnected` (633) | ITSM (626) | Acceptable. |

#### APQC TAGGING

**B1-H1.** Cross-domain handoff PCF activity tagging. 14 cross-domain handoffs (12 outbound + 2 inbound). 3 currently tagged: 1 reasonable (handoff 33 → 1258), 2 false-positives via `discovery_substring` (handoffs 48 + 49, fixed in B1-B1). Proposed `agent_curated` rows:

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 32 | DISCOVERY → HAM | `device.discovered` | hardware_assets | Maintain IT asset records | 1312 (20918) | confident L4 |
| 33 | DISCOVERY → SAM | `software.discovered` | software_installations | Confirm hardware/software operational status | 1258 (20849) | keep existing (high) |
| 47 | DISCOVERY → SMP | `sso_login.unsanctioned_app` | shadow_it_apps | Manage infrastructure resource administration | 294 (20914) | medium L3 (no exact shadow-IT PCF) |
| 48 | DISCOVERY → CMDB | `ci.discovered` | configuration_items | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 49 | DISCOVERY → CMDB | `relationship.discovered` | ci_relationships | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 50 | DISCOVERY → ITOM | `device.requires_monitoring` | monitoring_policies | Manage IT service support resources | 1297 (20901) | medium L4 |
| 621 | DISCOVERY → CMDB | `discovery_scan.completed` | discovery_scans | Determine ongoing IT infrastructure capabilities | 1288 (20891) | confident L4 |
| 622 | DISCOVERY → HAM | `discovery_scan.completed` | discovery_scans | Maintain IT asset records | 1312 (20918) | confident L4 |
| 623 | DISCOVERY → SAM | `discovery_scan.completed` | discovery_scans | Maintain IT asset records | 1312 (20918) | confident L4 |
| 624 | DISCOVERY → ITSM | `discovery_scan.failed` | service_incidents | Operate and monitor online systems | 1301 (20906) | medium L4 |
| 625 | DISCOVERY → CMDB | `discovery_source.connected` | discovery_sources | Install/configure/upgrade infrastructure components | 1311 (20917) | confident L4 |
| 626 | DISCOVERY → ITSM | `discovery_source.disconnected` | service_incidents | Operate and monitor online systems | 1301 (20906) | medium L4 |
| 147 | RMM → DISCOVERY | `network_device.discovered` | discovered_devices | Manage infrastructure configuration | 1309 (20915) | confident L4 |
| 1199 | CMDB → DISCOVERY | `ci_class.published` | ci_classes | Manage infrastructure configuration | 1309 (20915) | medium L4 |

**Deferred-to-Discover (no clean PCF match):** 0. All 14 handoffs map to existing cross-industry PCF activities at L3 or L4. APQC TAGGING counts as ONE Bucket 1 item per constraint #10.

Catalog quality headline: 0 of 14 handoffs carry `record_status='approved'` tags (existing 3 are `record_status='new'` discovery_substring matches; 2 of them are wrong, 1 is acceptable). Process health side-bar: 0 `agent_curated` rows on DISCOVERY today. Proposed: 13 new `agent_curated` rows (proposal covers all 14, but handoff 33 keeps the existing discovery_substring row at process 1258 since that one is correct; one row updated rather than re-authored).

### Bucket 2: Surface-for-user (judgment calls)

1. **Modularization hypothesis.** DISCOVERY currently has zero modules; the right shape is a design call, not an inference. Options:
   - **(a) Single-module: `DISCOVERY-ENGINE`.** One module covers scans + sources + discovered candidates + service-map emission. Simplest, but Rule #14 M2 forces ≥2 modules once ≥3 capabilities ship (B1-S2 will load ~5-7), so this option is only viable if capability count stays ≤2.
   - **(b) Two modules: `DISCOVERY-NETWORK-SCAN` + `DISCOVERY-CLOUD-INVENTORY`.** Splits by scan substrate (network probes vs cloud APIs). Matches BMC ADDM / runZero (network) vs Device42 / ServiceNow Cloud Discovery (cloud) vendor split.
   - **(c) Three modules: `DISCOVERY-NETWORK-SCAN` + `DISCOVERY-CLOUD-INVENTORY` + `DISCOVERY-SERVICE-MAPPING`.** Pulls service-mapping into a dedicated module (matches ServiceNow Service Mapping as a distinct premium SKU). This option triangulates against the existing `service_maps` master in CMDB-SERVICE-MAPPING (Bucket 2 #3).
   - **(d) Four modules: above + `DISCOVERY-RECONCILIATION`.** Reconciliation rules / normalization patterns get their own module. Matches CAASM vendor pattern (Axonius "Discovery Rules"). Heaviest; may be over-engineered if reconciliation is light.
   Recommendation: **(c)** as default. Independent: this drives B1-S5 / S6 / S7 / S8 / S12 / S13 fix shape.

2. **`monitoring_policies` ownership.** Legacy `domain_data_objects` has BOTH ITOM and RMM mastering `monitoring_policies` (86) at the legacy-rollup level. DMDO is empty for this data_object today. M7 catalog-wide single-master rule means only one domain can canonically master it once the DMDO layer fills in. Decide: ITOM or RMM (the other demotes to consumer or embedded_master). **This is an ITOM/RMM concern, not a DISCOVERY concern** (DISCOVERY contributes to it, doesn't own it), but surfacing here because the legacy rollup is read by analyses DISCOVERY participates in. Independent of Bucket 1.

3. **`service_maps` ownership (DISCOVERY vs CMDB).** Legacy `domain_data_objects` has DISCOVERY mastering `service_maps` (79) as `contributor + required`. The live DMDO has CMDB-SERVICE-MAPPING mastering it. Decide: (a) service mapping is a DISCOVERY capability, master moves to DISCOVERY-SERVICE-MAPPING (Bucket 2 #1 option c), CMDB demotes to embedded_master / consumer; or (b) service mapping is a CMDB capability that DISCOVERY feeds, current DMDO is right, the legacy DISCOVERY-master row is purely stale and should be deleted (B1-B2). The vendor split is genuinely contested: ServiceNow Service Mapping is a Discovery-line SKU, BMC ADDM frames it as part of ADDM (discovery), but ServiceNow CMDB markets the result as a CMDB asset. **Recommendation: (b).** Let CMDB-SERVICE-MAPPING continue to canonically master, DISCOVERY publishes the upstream `discovery_scan.completed` events (already in place); but the user should confirm.

4. **`shadow_it_apps` ownership and the SMP boundary.** Handoff 47 publishes `sso_login.unsanctioned_app → SMP` with payload `shadow_it_apps`. The payload data_object suggests SMP (SaaS Management Platform) is the master, and DISCOVERY publishes a sourcing event into it. But the event_name `sso_login.unsanctioned_app` is SMP's native event (IdP-fed), not DISCOVERY's. This handoff probably belongs OUTBOUND from SMP, not DISCOVERY. Decide: (a) keep as is (DISCOVERY does detect shadow IT via network/DNS scanning and feeds SMP); (b) re-source the handoff to SMP with a different trigger event (`sso_login.unsanctioned_app` is SSO-detection-driven, not discovery-scan-driven); (c) re-trigger the DISCOVERY side with a discovery-specific event (`shadow_app.discovered_via_network_scan`).

### Bucket 3: Phase 0 pending (speculative; vendor-research vetting needed)

Universal-or-near-universal vendor entities surfaced from agent enumeration of the discovery + CAASM market. Phase 0 vetting (formal vendor-research protocol with subagent + market-surface JSON artifact) would confirm or filter:

| Candidate | Proposed module | Vendor evidence |
|---|---|---|
| `discovery_patterns` | DISCOVERY-NETWORK-SCAN | ServiceNow Discovery (Patterns), BMC ADDM (Patterns), Device42 (Auto-Discovery Rules). Configuration-shaped entity defining how a scan classifies a device. Universal in agentless discovery products. |
| `discovery_credentials` | DISCOVERY-NETWORK-SCAN (or DISCOVERY-RECONCILIATION if (d) chosen) | Universal: credential profiles (SNMP, SSH, WinRM, AWS access keys, K8s tokens) drive scans. Distinct from `discovery_sources`; one source uses one or more credentials. Sensitive entity (Vault / KMS-backed in every flagship). |
| `discovery_schedules` | per realizing module | ServiceNow Discovery Schedules, BMC ADDM Schedules, Lansweeper Scanning Schedules. Cron-shaped recurrence per scan. |
| `reconciliation_rules` | DISCOVERY-RECONCILIATION (option d only) | ServiceNow IRE Rules, BMC ADDM Normalization, Device42 Reconciliation. The logic that maps a `discovered_device` into a `configuration_item`. Heavy in CMDB-anchored vendors. |
| `discovery_exclusions` | per realizing module | Universal: scope exclusions (subnet ranges, IP exclusions, OU exclusions). Operational hygiene entity. |
| `network_segments` | DISCOVERY-NETWORK-SCAN | Subnets / CIDR ranges + IPAM-adjacent. Possibly belongs in a future IPAM domain (not currently catalogued); flag during Phase 0. |
| `cloud_accounts` | DISCOVERY-CLOUD-INVENTORY | Cloud subscription / account boundary entity. Almost certainly belongs in a cross-cutting `cloud_resources` master in CSPM / CNAPP territory; DISCOVERY would `consumer` / `embedded_master` rather than `master`. |
| `asset_tags` | DISCOVERY-RECONCILIATION (or cross-cutting) | Universal labeling axis (`environment=prod`, `owner=team-x`). Could be a cross-cutting concern shared with ITAM. |

### Cross-bucket dependencies

- **Bucket 1 ↔ Bucket 2 #1 (modularization):** All Bucket 1 STRUCTURAL fixes (B1-S5 / S6 / S7 / S8 / S9 / S10 / S12 / S13 / S14) depend on the module-set decision in Bucket 2 #1. Approving Bucket 1 wholesale requires approving Bucket 2 #1 first. If user defers Bucket 2 #1, Bucket 1 STRUCTURAL items defer with it; only the catalog-level fixes (S1 em-dash PATCH, S2 capability list, S3 solution backfill, S4 catalog UX, B1-B1 PCF false-positive deletes, B1-B2 stale-rollup delete, APQC TAGGING) ship independently.
- **Bucket 2 #3 (`service_maps` ownership) ↔ Bucket 1 B1-B2:** the recommended-default delete in B1-B2 assumes Bucket 2 #3 resolves to (b). If user chooses (a), B1-B2 inverts (insert DMDO master row instead of delete legacy row).
- **Bucket 2 #4 (`shadow_it_apps` source attribution) ↔ B1-H1 row for handoff 47:** the PCF tag is "good enough" regardless of the source-domain decision, but if the user chooses (b) the handoff itself moves out of DISCOVERY's outbound set and the H1 row vacates.
- **Bucket 3 is independent of Buckets 1 and 2:** the speculative entity list is informational; Phase 0 vetting would feed a second-pass Phase B load after Bucket 2 #1 selects modules.

### Per-bucket prompts

- **Bucket 1:** Fix these now? Reply `all`, `just <ids>`, or `skip`. Note that 9 of the 14 STRUCTURAL items (S5/S6/S7/S8/S9/S10/S12/S13/S14) depend on Bucket 2 #1 first; if you approve Bucket 1 wholesale, please also resolve Bucket 2 #1.
- **Bucket 2:** What's your call on each of #1 (modularization shape: a / b / c / d), #2 (`monitoring_policies` ITOM vs RMM owner), #3 (`service_maps` DISCOVERY vs CMDB owner), and #4 (`shadow_it_apps` handoff routing)? Item #2 may be deferred to ITOM and RMM audits; the other three are DISCOVERY-blocking.
- **Bucket 3:** Vet via Phase 0 vendor-research subagent, or eyeball-mode? If eyeball, name which candidates ring true and they become Bucket 1 items in the follow-up load. Phase 0 is recommended for `discovery_patterns`, `discovery_credentials`, `reconciliation_rules` (they vary heavily by vendor).

### Report-only follow-ups (owed by other domains)

- **ITOM + RMM owe (M7 catalog-wide single-master):** `monitoring_policies` (86) has two `role=master` rows in legacy `domain_data_objects` (one for ITOM, one for RMM). DMDO is empty for this data_object today, so the conflict is currently legacy-rollup only, but M7 will hard-fail once those domains modularize. The decision (which of ITOM or RMM canonically masters) lives in the next ITOM and RMM Validate runs, not in DISCOVERY. DISCOVERY only contributes to `monitoring_policies` via legacy rollup.
- **SMP audit owes (Bucket 2 #4 alternative):** if handoff 47 (`sso_login.unsanctioned_app → SMP`) should be re-sourced from SMP rather than DISCOVERY (because SSO-driven detection is SMP's native channel), the fix is a SMP-side change. Surface during the next SMP audit.
- **CMDB audit owes:** the inbound handoff 1199 (`ci_class.published → DISCOVERY`, payload `ci_classes`) is a CMDB-published event. CMDB's audit can re-check whether the subscriber list (DISCOVERY only) is complete or whether HAM / SAM / ITAM should also subscribe to schema-class updates.

### Candidate domain queued

- **CAASM (Cyber Asset Attack Surface Management).** Surfaced during this audit. Flagship vendors: Axonius, JupiterOne, runZero, Sevco Security, Lansweeper Cloud. Adjacent to DISCOVERY, CMDB, ITAM, SECOPS, VULN-MGMT. Candidate capabilities: cross-source asset aggregation, security control coverage gap detection, unmanaged-device discovery, security tool coverage analysis. Queued via `append_missing_domain.ts` to `audits/_missing-domains.md` for triage.

## 2026-05-31, Continuation: B1 technical fixes

Applied only the truly-technical, no-judgment Bucket 1 fixes; everything gated on Bucket 2 #1 (modularization) or otherwise requiring user judgment is deferred and remains open. Loader: `.tmp_deploy/fix_discovery_b1_technical_2026_05_31.ts` (run from project root with `bun run`).

### Fixes applied (5 items)

- **B1-S1**: PATCHed `domains.business_logic` on DISCOVERY (id 5), replacing the U+2014 em-dash with parenthesized phrasing per project CLAUDE.md.
- **B1-B1**: DELETEd 2 stale `handoff_processes` rows (ids 51, 53) tagging handoffs 48 and 49 with PCF processes 9 ("Manage Financial Resources") and 12 ("Manage External Relationships"). Both were `discovery_substring` false-positives on the verb "manage".
- **B1-B2**: DELETEd legacy `domain_data_objects` row (id 145) for DISCOVERY x `service_maps` (data_object 79). Live role was `contributor` (audit notes had said `master`); either way the row is stale because CMDB-SERVICE-MAPPING canonically masters `service_maps` in the live DMDO layer.
- **B1-S10**: INSERTed 3 `data_object_relationships` rows per Rule #10, pointing each DISCOVERY master at the platform_builtin `users` row (id 748): `discovery_scans -[initiated by]-> users`, `discovered_devices -[reviewed by]-> users`, `discovery_sources -[owned by]-> users`. All `relationship_type=many_to_many`, `relationship_kind=reference`, `owner_side=source`, `is_required=false` (catalog convention for actor edges).
- **B1-H1**: INSERTed 9 new `agent_curated` `handoff_processes` rows for DISCOVERY-related handoffs that had no prior agent-curated tag:
  - 32 -> 1312 (Maintain IT asset records)
  - 47 -> 294 (Manage infrastructure resource administration)
  - 48 -> 1309 (Manage infrastructure configuration)
  - 49 -> 1309 (Manage infrastructure configuration)
  - 147 -> 1309 (Manage infrastructure configuration)
  - 622 -> 1312 (Maintain IT asset records)
  - 623 -> 1312 (Maintain IT asset records)
  - 624 -> 1301 (Operate and monitor online systems)
  - 626 -> 1301 (Operate and monitor online systems)

  5 audit-proposed rows were intentionally NOT touched:
  - handoff 33: existing `discovery_substring` row at the correct PCF 1258 (audit said keep); re-stamping `proposal_source` to `agent_curated` is not in the technical PATCH allow-list for this pass.
  - handoff 50: prior `agent_curated` row at PCF 1301; audit proposed 1297. Per Rule #1, prior curated decisions not silently overwritten.
  - handoff 621: prior `agent_curated` at PCF 1309; audit proposed 1288. Skipped same reason.
  - handoff 625: prior `agent_curated` at PCF 1309; audit proposed 1311. Skipped same reason.
  - handoff 1199: prior `agent_curated` at PCF 1309; audit also proposes 1309. No-op.

### Deferred (17 Bucket-1 items)

- **B1-S2** (5-7 capabilities + `capability_domains` links): new entities; deferred.
- **B1-S3** (2-4 additional `solutions` + `solution_domains`): new entities; deferred.
- **B1-S4** (catalog_tagline / catalog_description): Rule #20 surface-to-user; never auto-write.
- **B1-S5** (4 `domain_modules`): new entities; gated on Bucket 2 #1 modularization hypothesis.
- **B1-S6 / B1-S7** (`domain_module_capabilities`): gated on B1-S5.
- **B1-S8** (DMDO re-anchoring of the 3 masters): gated on B1-S5.
- **B1-S9** (intra-domain `data_object_relationships`): not Rule #10 user-edges; outside this pass's technical scope (proposed edges include `discovered_devices -> configuration_items` and `-> hardware_assets` which involve judgment about cross-domain shape).
- **B1-S11** (`data_object_aliases`): audit flags as "B2 borderline" with vendor-terminology context; outside the "exact tuples" pre-specification requirement, and Rule #18 risks vendor names landing in the alias notes.
- **B1-S12** (`data_object_lifecycle_states` for the 3 masters): gated on B1-S5 (workflow-gate permission prefix needs realizing-module `domain_module_code`).
- **B1-S13 / B1-S14** (system-skill rename + per-module anchoring): gated on B1-S5.
- **B1-T1..T5** (trigger-event coverage review): all 5 frame as options ("Add ITAM rollup once DISCOVERY->ITAM scoping is decided", "Acceptable", "May want a sibling outbound"); judgment, not technical.

No JWT errors encountered. The 4-pass audit's headline gap (DISCOVERY not modularized, M1 hard fail) remains unresolved; resolving it requires the Bucket 2 #1 user decision.

## 2026-05-31, Audit

### Summary

Structural Validate b1 audit. DISCOVERY (id 5) still has zero `domain_modules`, zero `capability_domains`, zero DMDO, zero lifecycle states, and zero aliases. The technical Bucket 1 fixes from the prior 2026-05-31 continuation are confirmed loaded: `business_logic` em-dash removed, stale `handoff_processes` rows 51/53 deleted, legacy `domain_data_objects` row for `service_maps` removed, 3 Rule #10 `users` edges in place on the 3 masters, 9 `agent_curated` APQC tags inserted (13 of 14 handoffs now tagged with `agent_curated`; handoff 33 still carries the prior `discovery_substring` tag at the correct PCF 1258).

Headline gap unchanged: DISCOVERY is not modularized (M1 hard fail), so M2 / M4 / M6 / M8 / B1 (DMDO migration) / B12 (lifecycle prefix) / E1-E5 / F2-F5 all cascade off the same blocker. Carry-forward Bucket 1 items consolidate behind Bucket 2 #1 (modularization shape).

- Current footprint: 3 masters + 5 contributors via legacy `domain_data_objects`; 0 modules; 0 capabilities; 4 solutions; 14 cross-domain handoffs; 1 legacy domain-anchored `system` skill with 3 `query_*` tools.
- Bucket 1 (in-scope, agent fixable, blocked or net-new): 14 carry-forward items.
- Bucket 2 (judgment): 4 carry-forward items.
- Bucket 3 (Phase 0 pending): 8 carry-forward items.
- `next_action_by`: user (Bucket 2 #1 modularization decision gates the largest cluster of Bucket 1 items).

### Structural band results

| Band | Result | Notes |
|---|---|---|
| A1 | pass | `crud_percentage=40`, `business_logic` non-empty and em-dash-free, `min_org_size`, `cost_band`, `usa_market_size_usd_m`, `market_size_source_year` all populated. |
| A2 | fail | 0 `capability_domains` rows. Routes to B1A-CAPS. |
| A3 | warn | 4 solutions (2 primary + 2 secondary). Meets pass threshold but vendor coverage thin vs market. Routes to B1A-SOLS. |
| A4 | fail | `catalog_tagline` and `catalog_description` both empty. Rule #20 surface-to-user. Routes to B2-CATALOG-UX. |
| M1 | hard fail | 0 `domain_modules` rows on domain 5; 0 rows in `domain_module_host_domains`. Cascades to M2 / M4 / M6 / M8 / B1 migration / B12 prefix / E1-E5 / F2-F5. Gated on B2-MOD-SHAPE. |
| M2 | cascade | Vacuously pending until A2 + M1 cured. |
| M4 / M6 / M8 | cascade | Same. |
| M7 | n/a | No DMDO master rows on DISCOVERY today (live DMDO is empty for domain 5), so the catalog-wide single-master check has nothing to evaluate here. Legacy `domain_data_objects` `monitoring_policies` (86) ITOM-vs-RMM dual-master conflict surfaces during their audits, not DISCOVERY's. |
| B5 | pass | No `embedded_master` rows on DISCOVERY in DMDO. |
| B7 | pass | 3 `users` edges loaded per Rule #10 (verified live: 81/82/83 → 748). |
| B9 | partial pass | 5 trigger events on the 3 masters; every event has ≥1 handoff. Event categories on events 630/631/632/633 are empty strings (should be `lifecycle` or `state_change`). Routes to B1A-EVENT-CATEGORY. |
| B9b | n/a | Domain has <2 modules; B9b vacuously skipped per pre-check. |
| B10b | fail | All 14 handoffs touching DISCOVERY have `source_domain_module_id=null` on the DISCOVERY side; opposite-side nulls are other-domain B10b concerns. Cannot cure until M1 cured. Routes to B1B-HANDOFF-ATTRIB (blocked on M1). |
| B11 | fail | 0 `data_object_aliases` on 81/82/83. Routes to B1A-ALIASES (Rule #18 risk; user wording sign-off advisable). |
| B12 | fail | 0 `data_object_lifecycle_states` on 81/82/83. Workflow-gate prefix needs realizing module's `domain_module_code`. Gated on M1. Routes to B1B-LIFECYCLE-STATES. |
| C1 | pass | 1 `business_function_domains` owner row (IT Infrastructure, function id 58). |
| C2 | n/a | No capabilities loaded yet; revisit after A2 cures. |
| D | deferred | UI spot-check pending fixes. |
| E1-E5 | cascade | No DISCOVERY-anchored roles exist in the catalog; the 5 IT Infrastructure roles (10050-10054) all point at APM and CMDB modules. Authoring DISCOVERY-scoped roles is gated on M1. Routes to B1B-ROLES. |
| F1 | fail | Legacy domain-level `system` skill `discovery-system` (id 49) at `domain_id=5`, `domain_module_id=null`. Retire after F2 cured. Gated on M1. Routes to B1B-SKILL-LEGACY. |
| F2-F5 | cascade | Per-module system skills require modules. Existing 3 `skill_tools` (409/410/411) are sound primitives that re-anchor at F2 cure time. Routes to B1B-SYSTEM-SKILLS. |
| H1 | pass | 14/14 cross-domain handoffs now tagged. 13 are `agent_curated`/`new`, 1 (handoff 33 → PCF 1258) is `discovery_substring`/`new`. 0 `approved`. Coverage headline: 100% (any source), 0% (approved). |

### Carry-forward Bucket 1, Bucket 2, Bucket 3

The decision shapes are unchanged from the 2026-05-30 audit, modulo the technical fixes already applied. Recorded in `state.yaml` for the next pass. The Bucket 2 #1 modularization decision is the gating user action.

### APQC tagging side-bar

13 `agent_curated` rows + 1 retained `discovery_substring` row. 0 `record_status='approved'`. The provenance pass is complete; the catalog quality measure (approved count) remains the user's review pass.

### Decisions

None this pass (no user input requested between prior continuation and this validate pass).

### Fixes applied

None this pass; all technical-only fixes already shipped in the 2026-05-31 continuation. This pass is structural validate only.

### `domains.notes` pointer

Not updated (no Rule #15 wording supplied by user).

### JWT errors

None.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
