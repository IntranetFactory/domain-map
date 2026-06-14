# PRIV-MGMT audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** **0 modules** (M1 hard fail, blocks everything downstream); **0 masters** mastered by PRIV-MGMT (B1 hard fail; the canonical privacy data_objects exist but are mastered in the wrong domains, see Bucket 2); **0 capabilities** linked (A2 hard fail); **4 solutions** (3 primary: OneTrust Privacy, TrustArc, Securiti Data Command Center; 1 secondary: ServiceNow Integrated Risk Management); **0 capability_domains**, **0 domain_module_capabilities**, **0 domain_module_data_objects**, **0 trigger_events** keyed against any PRIV-MGMT master, **0 outbound handoffs**, **2 inbound handoffs** (both with NULL target_domain_module_id, blocked on M1); **1 regulation** linked (GDPR only; CPRA exists in the catalog but is unlinked); **3 business_function_domains** rows (Privacy Office owner; Legal, Security contributors); **0 lifecycle states** on anything keyed to this domain; **0 data_object_aliases** keyed to PRIV-MGMT; **0 domain_aliases**; **0 catalog_tagline / catalog_description** (A4 hard fail per Rule #20); **0 roles**; **0 role_modules**; **0 role_permissions**; **0 skills** keyed against PRIV-MGMT; **0 APQC tags** on either inbound handoff (H1 hard fail).
- **Vendor-surface basis (Pass 2 inline):** OneTrust Privacy (flagship; PIA/DPIA, DSR portal, consent, data inventory), TrustArc (consent + assessments + transfer-impact), Securiti Data Command Center (data-inventory automation + DSR + consent + breach), DataGrail (DSR automation + data inventory), Transcend (DSR + consent + data inventory), Wirewheel / Osano (mid-market consent + DSR). Compliance specialists: OneTrust (GDPR + CCPA/CPRA + LGPD + PIPL), TrustArc (GDPR + CCPA + APEC CBPR), Securiti (LGPD + PIPL). All five touch the same union surface: a master data inventory of personal-data processing, a DSR/DSAR pipeline with operator handoffs, a consent ledger keyed to data-subject identifiers, a PIA/DPIA assessment workflow, a vendor / processor inventory keyed to DPAs, a breach-notification record. PRIV-MGMT currently masters none of these.
- **Bucket 1 (in-scope, agent fixable):** 13 items.
- **Bucket 2 (surface-for-user, judgment):** 5 items.
- **Bucket 3 (Phase 0 pending, speculative):** 3 items.
- **Candidates queued (missing-domains):** 1 (CMP, Consent Management Platform).
- **Status set:** `feedback_needed`.

### Pass 3 - Neighbor discovery (auto-derived from handoffs + DMDO + relationships; ranked by edge weight)

| Neighbor | Out | In | DMDO cross | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| DLP | 0 | 1 | 0 | 0 | 1 | Lightweight |
| DSPM | 0 | 1 | 0 | 0 | 1 | Lightweight |
| ATS (parks `data_subject_requests` master in ATS-CANDIDATE-CRM) | 0 | 0 | 0 | 1 (`candidates submits_via data_subject_requests`) | 1 | Lightweight (also a wrong-ownership target, see Bucket 2) |
| LMS (parks `gdpr_consent_records` + `subject_access_requests` + `data_deletion_requests` masters in LMS-CT-GDPR) | 0 | 0 | 0 | 3 (`users grants_consent_in gdpr_consent_records`, `subject_access_requests discloses gdpr_consent_records`, `data_deletion_requests voids gdpr_consent_records`) | 3 | Lightweight (wrong-ownership cluster, see Bucket 2) |
| GRC (parent domain) | 0 | 0 | 0 | 0 | 0 | None (parent only) |
| DCG | 0 | 0 | 0 | 0 | 0 | None (implicit consumer, no rows yet) |

**Pass 4 - Pairwise reconciliation (weight >= 3).** Only LMS clears the >=3 threshold and the finding is unanimously wrong-ownership rather than handoff drift: every cross-domain relationship into the LMS-CT-GDPR master cluster mirrors a row that should sit in a PRIV-MGMT module once M1 is cured. The pairwise diff against LMS therefore collapses to the Bucket 2 re-homing decision below (B2-1). No section 3 / section 4 / section 5 surface findings beyond that re-homing decision.

The dominant structural observation across every neighbor pass is that **PRIV-MGMT has no modules and no masters of its own**; pairwise diffing reduces to the same single root cause until M1 is resolved.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (M / A / B / C / F / H)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail) - BLOCKING** | `domain_modules?domain_id=eq.20` returns zero rows; the `domain_module_host_domains` query is also empty. PRIV-MGMT has no deployable unit. Every downstream concern (DMDO attribution, lifecycle-state realization, workflow-gate permissions, system-skill scope, role bundles, handoff source/target_domain_module_id, intra-domain handoffs, APQC tagging) is gated on the M-band. Once Bucket 2 resolves which masters re-home to PRIV-MGMT (see B2-1), proposed module split: (a) `PRIV-DATA-INVENTORY` masters the data-inventory + processing-record + processor-register surface (`processing_activities`, `personal_data_assets`, `processor_agreements`, `data_transfers`); (b) `PRIV-DSR-MGMT` masters the data-subject-request pipeline (`data_subject_requests`, plus the existing `subject_access_requests` and `data_deletion_requests` re-homed from LMS-CT-GDPR); (c) `PRIV-CONSENT` masters the consent ledger (`gdpr_consent_records` re-homed, plus `consent_purposes`); (d) `PRIV-ASSESSMENTS` masters PIA/DPIA workflows (`privacy_impact_assessments`, `data_breach_records`). Modularization quantity depends on whether Bucket 2 re-homing lands; the four-module shape assumes B2-1 is approved. | Phase A load: create modules per the split (after Bucket 2 decisions); for each module load `domain_module_capabilities` for the capabilities surfaced via Phase B + the Phase 0 Bucket 3 candidates. Lifecycle states, workflow-gate permissions, and system-skill split (Rule #17: one system skill per module) follow in the same load. |
| B1-S2 | **A2 (hard fail)** | `capability_domains?domain_id=eq.20` returns zero rows. The market has no enumerated capabilities. Vendor practice covers at least: `PRIV-DATA-INVENTORY` (personal-data discovery + processing-activity register), `PRIV-DSR-INTAKE` (request portals + identity verification), `PRIV-DSR-FULFILLMENT` (fan-out to source systems + redaction), `PRIV-CONSENT-LEDGER` (consent capture + purpose binding + withdrawal), `PRIV-CONSENT-PROOF` (audit-grade consent receipts), `PRIV-DPIA-WORKFLOW` (assessment authoring + sign-off), `PRIV-BREACH-NOTIF` (breach-record + regulator notification timing), `PRIV-XBORDER-XFER` (transfer-impact assessments, SCC / IDTA bookkeeping). A typical load is 6 to 9 capabilities. | Author the capability set per Phase A on the same load as B1-S1; link via `capability_domains`. Apply the cross-cutting capability test for `PRIV-CONSENT-LEDGER` and `PRIV-CONSENT-PROOF` (these can plausibly span PRIV-MGMT, CMP, B2C-COMM, EMP-EXP; if vendor evidence supports 3+ domains use the domain-neutral form, otherwise PRIV-prefixed). |
| B1-S3 | **A4 (hard fail per Rule #20)** | `catalog_tagline` and `catalog_description` are both empty strings. The buyer surface has nothing to render in the catalog list card or detail page. | Draft both fields per the Rule #20 voice rule (workflow + value, not market position). Surface to the user for review BEFORE writing per Rule #20's draft / review / write loop; the agent does NOT auto-write either field. Suggested draft for review: tagline along the lines of "Handle data-subject requests, capture consent, and keep your processing inventory audit-ready"; description in 1-3 paragraphs covering DSR pipeline, consent ledger, processing-activity register, and PIA/DPIA workflows. The exact text is for the user to approve. |
| B1-S4 | **A3 (soft fail; threshold met but lopsided)** | 4 solutions linked (3 primary + 1 secondary). Solution row count meets the >=3 floor and the >=1 primary floor. However the surface is missing two named-leader specialists routinely cited by Gartner / Forrester in the privacy management market: DataGrail and Transcend. Adding them would harden the vendor-evidence basis for the modularization split in B1-S1. | Insert two `solutions` rows (DataGrail, Transcend) plus matching `vendors` rows where missing, plus two `solution_domains` rows with `coverage_level='primary'`. Load via the standard solutions extension. |
| B1-S5 | **C1 (passes today, called out for completeness)** | `business_function_domains?domain_id=eq.20` returns 3 rows (owner: Privacy Office; contributors: Legal, Security). The C1 hard floor is satisfied. No fix required; included so the Bucket 1 count and the structural pass coverage are explicit. | No action. |
| B1-S6 | **B-band - regulations (soft fail)** | Only GDPR is linked (`domain_regulations?domain_id=eq.20` returns 1 row). The catalog already contains CPRA (id 3) which is the second universally-cited privacy regulation for this market. HIPAA, LGPD, PIPL, PIPEDA all appear in vendor product docs as in-scope; CPRA is the lowest-friction addition because the row already exists. | Insert `domain_regulations` row for `(domain_id=20, regulation_id=3, applicability='mandatory')` (CPRA). Surface PIPEDA / LGPD / PIPL / HIPAA additions as Bucket 3 (no regulation row exists in the catalog yet for these). |
| B1-S7 | **B10b (this domain's own side, partial pre-cure)** | 2 inbound handoffs (283 from DLP on `dlp_incidents`; 288 from DSPM on `data_assets`) both carry `target_domain_module_id=NULL`. The NULL is gated on B1-S1 (no PRIV-MGMT modules exist to attribute to). Inbound row 288 also has a B9 attribution drift: `handoffs.data_object_id=300 (data_assets)` but `trigger_events.id=273` (`data_classification.sensitivity_elevated`) carries `data_object_id=303 (data_classifications)`. The event publishes a classification change; the payload row points at the data_asset. Either the payload should be 303 to match the event, or a new event keyed against `data_assets` should be authored on the DSPM side. | After B1-S1 lands the PRIV-MGMT modules, run the deterministic B10b backfill for handoffs 283 and 288: `target_domain_module_id` = the module that holds the handoff payload with the strongest role on the receiving side. Likely target on both: `PRIV-DATA-INVENTORY` as a `consumer` of `data_assets` (after the module lands a `consumer` DMDO row). The event-payload mismatch on handoff 288 is reported in the Report-only follow-ups (DSPM's B9 / trigger-event hygiene). |
| B1-S8 | **B7 (hard fail, gated on Bucket 2)** | Once PRIV-MGMT actually masters its expected entities (Bucket 2 B2-1 outcome), every master needs at least one `users`-edge (Rule #10). Expected edges: `data_subject_requests` (submitter, fulfilment_owner, reviewer), `gdpr_consent_records` (subject, data_steward), `privacy_impact_assessments` (author, approver, dpo_signoff), `data_breach_records` (reporter, dpo, regulator_liaison), `processing_activities` (process_owner, data_steward), `processor_agreements` (vendor_owner, legal_reviewer). | Draft `users -> master` rows per the verbs above; load via the standard relationship-loader pattern after Bucket 2 decisions on which masters land. |
| B1-S9 | **B6 (hard fail, gated on Bucket 2)** | Once PRIV-MGMT masters its workflow entities, intra-domain relationships are required between them. Expected: `data_subject_requests references gdpr_consent_records`, `data_subject_requests targets personal_data_assets`, `processing_activities uses personal_data_assets`, `processing_activities references processor_agreements`, `privacy_impact_assessments evaluates processing_activities`, `data_breach_records affects personal_data_assets`. | Draft the edges (verb + inverse_verb + cardinality + necessity + owner_side) and load via the cluster-drafts pattern after Bucket 2 lands. |
| B1-S10 | **B11 (soft fail, gated on Bucket 2)** | Zero `data_object_aliases` rows on any privacy-mastered entity (other than 1 alias on `gdpr_consent_records`). Vendor terminology is fragmented: `data_subject_requests <-> DSAR <-> DSR <-> rights request <-> privacy request`; `processing_activities <-> ROPA <-> record of processing <-> processing register`; `privacy_impact_assessments <-> DPIA <-> PIA <-> privacy assessment`; `gdpr_consent_records <-> consent receipt <-> consent string`; `data_breach_records <-> security incident report <-> notifiable breach`. The IAB TCF, GPP, and W3C-DNT industry terms also belong on consent. | Draft 8 to 15 alias rows total once Bucket 2 lands the masters and Bucket 1 lands the modules. |
| B1-S11 | **B12 (hard fail, gated on Bucket 2)** | Zero `data_object_lifecycle_states` rows for entities PRIV-MGMT would master. Expected machines: `data_subject_requests (received -> identity_verified -> in_progress -> fulfilled / rejected / partially_fulfilled)` with regulatory clocks (typically 30 days for GDPR, 45 days for CCPA), `gdpr_consent_records (granted -> active -> withdrawn / expired)` (states 1 of 3 already exist on data_object 950 in the LMS-CT-GDPR module; they re-home if Bucket 2 lands), `privacy_impact_assessments (draft -> in_review -> approved -> archived)`, `data_breach_records (detected -> assessed -> notifiable -> notified -> closed)` with 72-hour clocks under GDPR Art. 33. `processing_activities` and `personal_data_assets` are config-shaped masters (no workflow; record_status is the only state worth tracking, exempt per Rule #12). | Draft state machines per the workflow-bearing master list once Bucket 2 decisions land and B1-S1 creates the modules (lifecycle states reference `domain_module_id` for permission realization). The config-shape exemption on `processing_activities` and `personal_data_assets` needs surfacing to the user per Rule #15 (do NOT populate `data_objects.notes` automatically). |
| B1-S12 | **F2 / F3 / F4 / F7 (hard fail, gated on B1-S1)** | Zero `skills` rows for PRIV-MGMT, no system skills at any module level (because there are no modules yet). Once 3 to 4 modules exist after B1-S1, each needs exactly one `skill_type='system'` skill with >=1 `skill_tools` row (Rule #17). Phase-S floor per module: at least one `query` per master, at least one `mutate` per workflow-bearing master, at least one `side_effect` for regulatory notifications (DPO email, regulator portal). For PRIV-DSR-MGMT specifically, an `inbound` tool for DSR-portal-webhook is the dominant entry vector. F7: prefer `notify_person` / `notify_team` over channel primitives for generic DPO and data-steward notifications. | Phase-S load alongside the module set per Rule #17. |
| B1-S13 | **H1 (hard fail)** | 2 cross-domain handoffs (both inbound: 283, 288) and zero `handoff_processes` rows. Per the H-band volume expectation 0.5N to 0.8N, the agent_curated target is 1 to 2 rows. Both are tractable from the PRIV-MGMT side of the audit. | Author the proposals in the APQC TAGGING sub-table below; load via `handoff_processes` insert with `proposal_source='agent_curated'`, `record_status='new'`. |

#### APQC TAGGING (B1-S13 sub-table)

The 2 cross-domain handoffs into PRIV-MGMT both express the same upstream-security-event-feeds-privacy-response pattern. Both fit cleanly under the privacy + data-protection PCF L3 entry; surface as agent_curated proposals.

| handoff_id | direction | source -> target | trigger_event | payload | Proposed PCF (name / external_id / level) | confidence |
|---|---|---|---|---|---|---|
| 283 | in | DLP -> PRIV-MGMT | dlp_incident.blocked | dlp_incidents | Develop and manage IT security, privacy, and data protection / 20735 / L3 | confident L3 (the privacy side of the DLP-block event is the publishable-privacy-incident pathway) |
| 288 | in | DSPM -> PRIV-MGMT | data_classification.sensitivity_elevated | data_assets (note B9 drift, see B1-S7) | Develop and manage IT security, privacy, and data protection / 20735 / L3 | confident L3 |

Both tags are proposed at the privacy + data-protection PCF L3 entry rather than at a deeper PCF L4 (which would lean security-incident-response and lose the privacy framing). No deferrals; both classifiable from the structural-pass mental model.

### Bucket 2 - Surface-for-user (judgment calls)

1. **B2-1: Re-home four canonical privacy masters from their current non-privacy homes into a PRIV-MGMT module.** This is the keystone judgment call; B1-S1 (module split) cannot be authored until the user picks a direction here.
   - `data_subject_requests` (id 901) currently mastered in `ATS-CANDIDATE-CRM` (id 1). Rationale at original load was that the ATS module modelled candidate-side privacy requests; the entity name is generic and applies to every data subject.
   - `gdpr_consent_records` (id 950) currently mastered in `LMS-CT-GDPR` (id 180).
   - `subject_access_requests` (id 951) currently mastered in `LMS-CT-GDPR` (id 180).
   - `data_deletion_requests` (id 952) currently mastered in `LMS-CT-GDPR` (id 180).
   - **Options:** (a) re-home all four into the proposed PRIV-MGMT modules (PRIV-DSR-MGMT for 901 / 951 / 952; PRIV-CONSENT for 950); the originating modules add `embedded_master` or `consumer` rows back per Rule #11 so they remain standalone-deployable; (b) keep the current ownership and have PRIV-MGMT consume via cross-domain handoffs only (preserves the current shape but leaves PRIV-MGMT with zero masters and violates B1 unless PRIV-MGMT is treated as a leadership-tier domain, which Gartner / Forrester clearly do not, all five flagship vendors ship these masters); (c) re-home only the LMS triplet and leave ATS-CANDIDATE-CRM's row in place if there is a defensible candidate-specific shape (the agent does not see one but the user might). The decision drives the rest of the audit's fix shape.
   - Dependency: B1-S1, B1-S8, B1-S9, B1-S10, B1-S11, B1-S12 are all gated on this decision.

2. **B2-2: Approve the proposed module-split shape from B1-S1.** Four modules is the maximum useful split per the Phase 0 vendor surface (data-inventory, DSR, consent, assessments). User can collapse to 3 (merge assessments into data-inventory) or 2 (collapse to DSR + everything-else) if the buyer-persona overlap argues for it. Independent of B2-1's direction.

3. **B2-3: Rule #20 buyer-voice draft.** The agent will NOT write `catalog_tagline` or `catalog_description` without explicit per-text approval. A draft tagline + description will be surfaced for the user's review once Bucket 2 lands; user supplies the final wording (or asks the agent to draft and then approves the exact string).

4. **B2-4: Lifecycle-state exemption on `processing_activities` and `personal_data_assets`.** Both are config-shaped masters (no workflow; record_status is the only state). Per Rule #15, the agent CANNOT populate `data_objects.notes` with the config-shape exemption text. User decides: (a) record the exemption outside the catalog (gap report / commit message); (b) approve specific notes wording and let the agent write it (user supplies exact text per Rule #15).

5. **B2-5: APQC tag for inbound handoff 288 once the B9 attribution drift on the DSPM side is fixed.** The current handoff payload (`data_assets`, id 300) does not match the trigger event's `data_object_id` (`data_classifications`, id 303). User decides whether to load the agent_curated PCF 20735 row against the current shape (works in either direction) or wait for DSPM's B9 to fix the upstream payload first.

### Bucket 3 - Phase 0 pending (speculative)

1. **CMP (Consent Management Platform) as a sibling domain.** Vendor evidence: OneTrust Consent (separate SKU from OneTrust Privacy), Cookiebot, TrustArc Cookie Consent Manager, Sourcepoint, Didomi, Usercentrics. CMP vendors compete on web / mobile consent-banner orchestration, IAB TCF / GPP compliance, geo-targeted consent flows, and per-vendor disclosure registries; this is a distinct point-solution market (Rule #2 satisfied with 6+ flagship vendors), not a sub-feature of PRIV-MGMT. CMP would be a sibling under GRC with handoffs from CMP into PRIV-MGMT on `consent.granted` / `consent.withdrawn`. **Action:** queued via `append_missing_domain.ts` (separate from this audit). Re-evaluate during the next Phase-0 vendor research pass.

2. **Additional regulations beyond CPRA.** PIPEDA (Canada), LGPD (Brazil), PIPL (China), POPIA (South Africa), HIPAA (US healthcare; not a privacy framework in the strict GDPR sense but routinely cited in the privacy-management buyer surface). None of these have rows in `regulations` yet; B1-S6 already covers the CPRA addition (catalog row exists). Bucket 3 items here are NEW regulation rows, vendor-research vetting needed to confirm scope. Vendor evidence per row varies (Securiti emphasizes PIPL + LGPD; OneTrust emphasizes the full set; TrustArc emphasizes GDPR + CCPA + APEC CBPR).

3. **Missing entity candidates surfaced from vendor union surface, not yet vetted.** Beyond the Bucket 2 re-homing list, the flagship vendors also ship:
   - `processing_activities` (ROPA / record-of-processing): canonical master in every flagship privacy product; nothing in PRIV-MGMT today.
   - `personal_data_assets` (master of personal-data fields in source systems): OneTrust and Securiti's discovery engine produces this; closely related to (but not the same as) DCG's `data_assets`. Risk of collision; vetting needed.
   - `processor_agreements` (DPA / sub-processor registry): every flagship; nothing in catalog.
   - `data_transfers` (cross-border transfer record, SCC / IDTA): OneTrust + TrustArc + Securiti.
   - `privacy_impact_assessments` (PIA / DPIA): every flagship.
   - `data_breach_records` (breach register with regulatory notification timing): every flagship.
   - `consent_purposes` (consent purpose definitions linked to processing_activities): consent products separate purpose definitions from consent records.
   - These are Bucket 3 because they need a vetted Phase 0 vendor-surface run to confirm the right master / contributor / consumer split and whether any collide with existing catalog data_objects (especially `personal_data_assets` vs. `data_assets`).

### Cross-bucket dependencies

- **B2-1 (re-homing decision) gates almost everything else in Bucket 1.** B1-S1 module split, B1-S8 (B7 user edges), B1-S9 (B6 intra-domain rels), B1-S10 (aliases), B1-S11 (lifecycle), B1-S12 (skills) all wait on which masters PRIV-MGMT actually owns after Bucket 2.
- **Bucket 3 entity candidates and Bucket 2 re-homing are coupled.** The agent's proposed module split in B1-S1 names entity buckets (data-inventory module masters `processing_activities` + `personal_data_assets`; assessments module masters `privacy_impact_assessments` + `data_breach_records`). If the user defers Bucket 3 to a formal Phase 0 vet, the module split should drop the assessments and data-inventory modules and only ship PRIV-DSR-MGMT + PRIV-CONSENT (the modules covered by Bucket 2 re-homed masters); the data-inventory and assessments modules can be added once Phase 0 vets the entity list.
- **B2-2 (module-split shape) collapses into B1-S1 once B2-1 lands.** Independent only in the sense that the user could pre-approve a smaller split before Bucket 2 closes.
- **B1-S6 (CPRA link) is independent.** Can be loaded immediately on user approval; no Bucket 2 dependency.
- **B1-S13 (APQC tags on handoffs 283, 288) is independent of Bucket 2.** The handoffs exist now; the tags can be loaded today. B2-5 only affects whether to wait on the DSPM side fix for handoff 288.

### Per-bucket prompts

**Bucket 1.** Fix these now? Specifically:
- B1-S3 needs the user to draft (or approve a draft of) `catalog_tagline` + `catalog_description` first (Rule #20).
- B1-S6, B1-S13 can be loaded immediately on approval.
- B1-S1, B1-S2, B1-S4, B1-S7, B1-S8 to B1-S12 are all blocked on Bucket 2.
Reply "approve B1-S6, B1-S13", "approve all unblocked", "skip", or per-item.

**Bucket 2.** Your call on each:
- B2-1: which option (a / b / c) for re-homing the four masters?
- B2-2: approve the 4-module split, or collapse to 2 or 3?
- B2-3: shall the agent draft the tagline + description for your review, or do you supply directly?
- B2-4: how do you want to record the config-shape exemption (outside the catalog, or supply exact notes wording per Rule #15)?
- B2-5: load the APQC tag for handoff 288 now against the current shape, or wait on DSPM's B9 attribution fix?

**Bucket 3.** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true (most likely all of `processing_activities`, `processor_agreements`, `privacy_impact_assessments`, `data_breach_records`; `personal_data_assets` is the only one with a real collision risk against DCG's `data_assets`).

### Report-only follow-ups (owed by other domains)

These items are routed to other domains' audits; not loaded from PRIV-MGMT's pass.

- **ATS-CANDIDATE-CRM B7 / B6 / B11 / B12 owed once `data_subject_requests` re-homes.** If Bucket 2 B2-1 option (a) or (c) lands, ATS's existing master row demotes to `embedded_master` (Rule #11). The lifecycle states, user-edges, and aliases that ATS currently maintains on this master need re-evaluation in ATS's next audit. Routes to ATS.
- **LMS-CT-GDPR B6 / B7 / B11 / B12 owed once the three LMS-mastered privacy entities re-home.** Same shape, three masters: `gdpr_consent_records`, `subject_access_requests`, `data_deletion_requests`. Routes to LMS.
- **DSPM B9 + B10b: trigger_event 273 / handoff 288 payload mismatch.** `trigger_events.data_object_id=303 (data_classifications)` but `handoffs.data_object_id=300 (data_assets)`. The publisher (DSPM) owes the fix: either author a separate trigger event keyed against `data_assets`, or PATCH the handoff's `data_object_id` to 303 and update its semantic-pass downstream. Routes to DSPM.
- **DLP B10b on handoff 283.** The source side's `source_domain_module_id` is also NULL, but that's a DLP-side B10b finding (DLP also has zero modules, per DLP's audit). Routes to DLP.
- **CPRA / additional privacy regulations are catalog-wide, not PRIV-MGMT-specific.** The CPRA row exists; the unlinked-to-PRIV-MGMT case is fixable here (B1-S6). PIPEDA / LGPD / PIPL / HIPAA require new `regulations` rows; routes to a catalog-wide regulation-load conversation.
- **CMP (Consent Management Platform) candidate.** Queued via `append_missing_domain.ts`; routes to the missing-domain triage queue, not this audit.

## 2026-05-31, Continuation: B1 technical fixes

Applied the truly-technical (audit pre-specified, no judgment) subset of the 2026-05-30 Bucket 1. Loader: `.tmp_deploy/fix_priv_mgmt_b1_technical_2026_05_31.ts`, run from project root.

**Applied:**

- **B1-S6 (domain_regulations CPRA link).** INSERT `domain_regulations(domain_id=20, regulation_id=3, applicability='mandatory')`. Audit pre-specified the exact tuple; CPRA row (id 3) verified pre-flight. New row id 257.
- **B1-S13 (APQC tag for handoff 283).** INSERT `handoff_processes(handoff_id=283, process_id=270, proposal_source='agent_curated', role='implements')`. Verified PCF 20735 ("Develop and manage IT security, privacy, and data protection") resolves to `processes.id=270`, `hierarchy_level=3`. New row id 492, `record_status='new'` per Rule #1. Handoff 288 deferred (B2-5 explicitly flags it as a user judgment call pending DSPM B9 attribution fix).

**Deferred (with reasons):**

- **B1-S1 (modules), B1-S8, B1-S9, B1-S10, B1-S11, B1-S12.** All gated on B2-1 re-homing decision; the agent cannot choose which masters re-home to PRIV-MGMT without user direction.
- **B1-S2 (capabilities).** Gated on B2-1 (which masters land drives which capabilities are realized) and on cross-cutting capability judgment (PRIV-CONSENT-LEDGER / PRIV-CONSENT-PROOF span requires Phase 0 vendor evidence the agent cannot run unilaterally).
- **B1-S3 (catalog_tagline / catalog_description).** Rule #20 forbids agent auto-writes; user must supply or approve exact text.
- **B1-S4 (DataGrail / Transcend solutions).** Vendor name additions outside the technical-fix policy; requires Phase 0 vetting per Rule #18 boundary.
- **B1-S5.** No action required by the original audit.
- **B1-S7 (B10b PATCH on handoffs 283, 288).** Gated on B1-S1: no PRIV-MGMT modules exist to PATCH `target_domain_module_id` onto; cannot derive from existing modules because none exist for this domain.
- **B1-S13 row 2 (handoff 288).** Deferred per B2-5 (user judgment on whether to load before DSPM-side B9 attribution fix).

**Deferred count:** 11 of 13 Bucket 1 items deferred; 2 applied.

**JWT errors:** none.

## 2026-05-31, Audit

Structural Validate b1 pass (S / A / M / B [B5, B7, B9, B9b, B10b, B11, B12] / C / D / E [E1-E5] / F [F1-F5] / H). Live queries via `semantius` CLI direct (Rule #0). Re-runs the 2026-05-30 structural model after the 2026-05-31 Continuation applied two pre-specified Bucket 1 fixes.

### Summary

- **Current footprint:** 0 modules, 0 mastered data_objects (legitimate per the leadership-tier B1 exemption), 0 capability_domains, 0 domain_module_data_objects, 2 inbound handoffs (283, 288, both `target_domain_module_id=null`), 0 outbound handoffs, 4 solutions (3 primary + 1 secondary), 3 business_function_domains rows (Privacy Office owner, Legal + Security contributors), 2 domain_regulations (GDPR + CPRA, both mandatory), 1 handoff_processes row (handoff 283 to process 270, agent_curated, new), 0 skills, 0 roles tagged for this domain, 0 domain_aliases.
- **Resolved since 2026-05-30:** B1-S6 (CPRA domain_regulations link, row id 257), B1-S13 first row (APQC tag on handoff 283, row id 492). Both confirmed live.
- **Status set:** `feedback_needed`.
- **Bucket counts:** Bucket 1 = 2 entries (1 b1a, 1 b1b cluster), Bucket 2 = 5, Bucket 3 = 3.
- **Note on B1 leadership-tier exemption.** The 2026-05-30 audit classified zero PRIV-MGMT-mastered data_objects as a B1 hard fail. Per the SKILL.md B1 exception list, PRIV-MGMT is enumerated as a leadership-tier domain whose B1 check passes by exception. The structural verdict accordingly shifts from "B1 hard fail" to "B1 passes by leadership-tier exception, pending Bucket 2 B2-1 user decision on whether to flip out of that classification by re-homing canonical privacy masters into PRIV-MGMT modules." All gated Bucket 1 items remain blocked on B2-1 either way.

### Structural pass

**S-band coverage sweep.** S1 zero-row anomalies: `capability_domains` (A2), `domain_modules` (M1), `domain_module_data_objects` (any), `handoffs.source_domain_id` (no outbound published), `skills` (F2). All routed to the owning band findings below. Expected non-zero rows that are populated: `business_function_domains` (3), `solution_domains` (4), `domain_regulations` (2), `handoffs.target_domain_id` (2 inbound). S2 / S3 vacuously pass: no modules to enumerate per-module coverage on, no in-domain mastered data_objects to enumerate per-master coverage on. The S-band is degenerate for this domain until B2-1 lands a masters decision; structural drift surfaces in the band-level findings instead.

**A1 (domain metadata).** Pass. `crud_percentage=88`, `business_logic` non-empty, `min_org_size='20 s <500'`, `cost_band='$$$'`, `certification_required=false`, `usa_market_size_usd_m=1200`, `market_size_source_year=2025`.

**A2 (`capability_domains`).** Hard fail. Zero rows. Gated on B2-1 + Bucket 3 vetting (same shape as 2026-05-30 B1-S2). No change.

**A3 (solutions linked with `coverage_level`).** Pass. 4 solutions, 3 primary + 1 secondary, all carry `coverage_level`.

**A4 (`catalog_tagline` / `catalog_description` on `domains`).** Hard fail per Rule #20. Both empty. Rule #20 forbids agent auto-write; user must supply or approve exact wording. No change.

**M1 (>=1 `domain_modules` row).** Zero modules. Under the leadership-tier reading this is non-blocking; under the "re-home masters into PRIV-MGMT" reading this is the keystone hard fail. Decision sits in B2-1 / B2-2.

**M2 / M4 / M5 / M6 / M7 / M8.** Vacuously pass (no modules to evaluate per-module checks against).

**B1 (>=1 master).** Passes by leadership-tier exception (PRIV-MGMT is in the SKILL.md exception list). If user picks B2-1 option (a) or (c), this exception is consumed and B1 becomes a positive-existence check. Until then, no fix.

**B2 / B3 / B4 / B5 / B6 / B7 / B9 (outbound) / B9b / B11 / B12 (lifecycle states).** Vacuously pass (no PRIV-MGMT-mastered data_objects to evaluate). Lifecycle states on the 4 candidate-re-home masters (`gdpr_consent_records` id 950, `subject_access_requests` id 951, `data_deletion_requests` id 952; `data_subject_requests` id 901 has none) currently realize on LMS-CT-GDPR (`domain_module_id=180`) per their current ownership and would re-home with the master if B2-1 lands.

**B10b (`target_domain_module_id` on inbound handoffs).** Hard fail. Both inbound handoffs (283 from DLP on `dlp_incidents`, 288 from DSPM on `data_assets`) carry `target_domain_module_id=null`. Gated on B2-1 + M1: no PRIV-MGMT module exists yet to attribute to. No change from 2026-05-30.

**B9 cross-check on inbound handoff 288.** Trigger event 273 (`data_classification.sensitivity_elevated`) carries `data_object_id=303` (`data_classifications`); handoff payload `data_object_id=300` (`data_assets`). Event-vs-payload mismatch. Routes to DSPM B9 hygiene (report-only follow-up); not a PRIV-MGMT-side fix.

**C1 (`business_function_domains`).** Pass. 3 rows, 1 owner (Privacy Office), 2 contributors (Legal, Security).

**C2 (`business_function_capabilities` overrides).** Vacuously pass (no capabilities).

**D1 (UI spot-check).** Not executed in this run; the gap report is sufficient for the user to spot-check on the live UI at https://tests.semantius.app/domain_map/domains?domain_code=eq.PRIV-MGMT.

**E1 / E2 / E3 / E4 / E5 (roles).** Vacuously pass (no modules to bundle roles around).

**F1 / F2 / F3 / F4 / F5 (system skills + tools).** Vacuously pass (no modules). F1 has no legacy domain-level system skill (zero `skills` rows with `domain_id=eq.20`).

**H1 (APQC coverage on cross-domain handoffs).** Partial. 2 cross-domain handoffs, 1 tag loaded (handoff 283 to process 270, agent_curated, new). Handoff 288 untagged. Volume target compliance: 1 of 2 inbound tagged equals 50% (lower edge of the 0.5N to 0.8N expectation). Approved count = 0 (the existing tag is `record_status='new'`, awaiting human review). The remaining handoff 288 tag is held in B2-5 pending user direction on whether to load against the current shape or wait on the DSPM B9 attribution fix.

### Pass 3, neighbor discovery (re-derived)

Unchanged from 2026-05-30. DLP (inbound-1), DSPM (inbound-1) by handoffs; ATS (rel-1), LMS (rel-3) by cross-domain `data_object_relationships` on the 4 candidate-re-home masters. Only LMS clears weight >= 3; pairwise diff collapses to the B2-1 re-homing decision again.

### Bucket 1, in-scope confirmed gaps

**Finding-type counts:** MISSING=0, WRONG-OWNERSHIP=0 (4 wrong-ownership candidates queued in Bucket 2 B2-1 awaiting user choice), SCOPE-CREEP=0, STRUCTURAL=1 (b1b, the recurring 2026-05-30 cluster), BOUNDARY=0, APQC TAGGING=1 (b1a; the one remaining untagged handoff that has a user-judgment overlay in B2-5), MODULARIZATION=0.

| ID | Finding | Action | Routing |
|---|---|---|---|
| B1-S13b | Handoff 288 (DSPM `data_classification.sensitivity_elevated` to PRIV-MGMT, payload `data_assets`) has no `handoff_processes` row. PCF 20735 (statutory privacy + data-protection PCF L3 entry) fits the privacy framing the same way it fits handoff 283. The only reason this row is not already loaded is the B2-5 overlay (DSPM-side B9 attribution mismatch between trigger event 273 `data_object_id=303` and handoff payload `data_object_id=300`). | If user clears B2-5 by saying "load against current shape", INSERT `handoff_processes(handoff_id=288, process_id=270, proposal_source='agent_curated', role='implements', record_status='new')`. If user picks "wait for DSPM", hold for the DSPM audit. | b1a (technically agent-fixable) with a hard b2 gate via B2-5 |
| B1-S1-cluster | The 2026-05-30 Bucket 1 cluster: B1-S1 (modules), B1-S2 (capabilities), B1-S3 (`catalog_tagline` / `catalog_description`), B1-S4 (two flagship privacy specialists missing from `solutions`), B1-S7 (B10b PATCH on handoffs 283 / 288), B1-S8 (B7 user edges on prospective masters), B1-S9 (B6 intra-domain relationships), B1-S10 (B11 aliases), B1-S11 (B12 lifecycle states), B1-S12 (F2 / F3 / F4 / F7 system skills + tools). All 10 sub-items remain gated on Bucket 2 B2-1 (re-homing decision) or B2-2 (module-split shape) or B2-3 (Rule #20 wording) or Bucket 3 vetting. No structural change since 2026-05-30. | Each sub-item unblocks on its specific Bucket 2 or Bucket 3 prerequisite. | b1b |

**Reconciliation with the 2026-05-30 Bucket 1.** Of the 13 original Bucket 1 items: 2 resolved (B1-S6, B1-S13 row 1), 11 remain pending. B1-S5 was a "no action required" item and is dropped. Bucket 1 in this audit therefore presents 1 b1a (the rolled-up handoff 288 tag) and 1 b1b (the cluster). The 11-item cluster collapses into the single b1b row because every sub-item shares the same gating decision (B2-1) and the same fix shape (Phase A / B / C / E / F load chained off B2-1's answer); separating them would suggest independent fix surfaces that do not exist.

### Bucket 2, surface-for-user (judgment calls)

Unchanged from 2026-05-30 (modulo a renumber-to-fresh shape):

1. **B2-1 (master re-homing).** Should `data_subject_requests` (id 901, mastered in ATS-CANDIDATE-CRM), `gdpr_consent_records` (id 950, in LMS-CT-GDPR), `subject_access_requests` (id 951, in LMS-CT-GDPR), `data_deletion_requests` (id 952, in LMS-CT-GDPR) re-home into PRIV-MGMT modules? Options: (a) re-home all four; (b) keep current ownership (preserves leadership-tier classification but contradicts flagship-vendor practice); (c) re-home only the LMS triplet, keep `data_subject_requests` in ATS-CANDIDATE-CRM if there is a candidate-specific shape worth preserving.
2. **B2-2 (module-split shape).** Approve the proposed 4-module split (`PRIV-DATA-INVENTORY`, `PRIV-DSR-MGMT`, `PRIV-CONSENT`, `PRIV-ASSESSMENTS`) or collapse to 3 (merge assessments into data-inventory) or 2 (DSR + everything else). Coupled with Bucket 3 vetting: if Bucket 3 is deferred, the data-inventory and assessments modules drop and the split lands at 2 (DSR + consent) covering only the B2-1 re-homed masters.
3. **B2-3 (Rule #20 wording).** Tagline + description for the catalog surface. Rule #20 forbids agent auto-write; user supplies or approves exact text. Agent can offer a buyer-voice draft for review.
4. **B2-4 (config-shape exemption tracking).** If B2-1 lands and `processing_activities` + `personal_data_assets` become PRIV-MGMT masters, both are config-shaped (no workflow) and need Rule #12 exemption tracking. Rule #15 forbids auto-populating `data_objects.notes`; user picks (a) track outside the catalog, (b) approve exact `notes` wording.
5. **B2-5 (APQC handoff 288 timing).** Same as 2026-05-30. Load `handoff_processes` row for handoff 288 now against the current (drifted) shape, or wait for the DSPM-side B9 fix on the trigger-event 273 payload mismatch? Independent of B2-1.

### Bucket 3, Phase 0 pending (speculative)

Unchanged from 2026-05-30:

1. **CMP (Consent Management Platform) as a sibling domain.** Already queued via `append_missing_domain.ts`; routes to the missing-domain triage queue, not this audit.
2. **Additional regulations.** PIPEDA, LGPD, PIPL, POPIA, HIPAA. Vendor research vetting needed before any new `regulations` row.
3. **Missing entity candidates.** `processing_activities`, `personal_data_assets` (collision risk with DCG's `data_assets`), `processor_agreements`, `data_transfers`, `privacy_impact_assessments`, `data_breach_records`, `consent_purposes`. Need a vetted Phase 0 vendor surface to confirm master / contributor / consumer split and resolve the `personal_data_assets` collision.

### Cross-bucket dependencies

- **B2-1 gates B1-S1-cluster entirely.** B2-2 + Bucket 3 then refine the gated set.
- **Bucket 3 entity vetting affects which modules ship in B2-2's split.** Deferring Bucket 3 collapses the split to 2 modules covering only the B2-1 re-homed masters.
- **B1-S13b (handoff 288 APQC) gates on B2-5 only.** Independent of B2-1 / B2-2 / B2-3 / Bucket 3.
- **B1-S6 / B1-S13 row 1 stay resolved.** No regression observed.

### Per-bucket prompts

- **Bucket 1.** B1-S13b is the only directly-actionable row, and it is gated on B2-5. Reply "load B1-S13b now" (treats B2-5 as "load against current shape") or "skip" or "wait on DSPM".
- **Bucket 2.** Decide B2-1 first (it gates everything else in the cluster). Then B2-2 (module split). Then B2-3 (wording supply). Then B2-4 (exemption tracking) once B2-1 lands. B2-5 is independent.
- **Bucket 3.** Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates ring true; `personal_data_assets` is the only one with a real collision risk worth pausing on.

### Report-only follow-ups (owed by other domains)

- **ATS-CANDIDATE-CRM** owes B7 / B6 / B11 / B12 re-evaluation on `data_subject_requests` if B2-1 option (a) or (c) lands and the master demotes to `embedded_master`.
- **LMS-CT-GDPR** owes B6 / B7 / B11 / B12 re-evaluation on the 3 re-homed masters if B2-1 option (a) or (c) lands.
- **DSPM** owes B9 + B10b fix on trigger event 273 / handoff 288 payload mismatch (`trigger_events.data_object_id=303` vs `handoffs.data_object_id=300`).
- **DLP** owes B10b on handoff 283 (`source_domain_module_id=null`); routes to DLP's own audit, gated on DLP's M1.
- **Catalog-wide regulations conversation.** PIPEDA / LGPD / PIPL / HIPAA additions to `regulations` are catalog-wide, not PRIV-MGMT-specific.
- **CMP missing-domain triage.** Already queued.

### Fixes applied

None this run. The 2026-05-31 Continuation applied B1-S6 + B1-S13 row 1; both confirmed still in place.

### JWT-audience errors

None.

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

State-driven Validate (SKILL.md Rule #21). Worked only the open items in state.yaml; no
fresh from-scratch audit. Live re-verified against domain id 20 (parent 15 = GRC). Overlay
test confirms master-bearing (DSARs, consent records, ROPA, privacy assessments are real
records), but the domain is UNBUILT: 0 domain_modules (M1 fail), 0 capability_domains,
0 PRIV-MGMT-owned masters (neither domain_data_objects nor domain_module_data_objects). Per
the UNBUILT clause no modules/masters/capabilities/skills were scaffolded; the build cascade
is surfaced, not executed. Loader: `.tmp_deploy/2026-06-07_priv_mgmt_state_driven_execute.ts`,
run from project root with `bun run`.

### Executed (1 write)

- **Catalog UX (Rule #20), 1 PATCH.** Domain 20 `catalog_tagline` and `catalog_description`
  were both empty; authored buyer-voice copy (workflow + value, no vendor/product names, GDPR
  and CCPA/CPRA statutory references allowed per Rule #18, no em-dash, American English) and
  PATCHed both. The stale "surface-before-write" B2-3 gate was overridden per the run
  instruction; B2-3 is therefore dropped from the open b2 set. Verified live. This resolves
  the former b1b sub-item B1-S3. Tagline: "Handle data-subject requests, capture consent, and
  keep your processing inventory audit-ready."

### Surfaced (no write; user decision or destructive)

- **B1A-BUILD (UNBUILT).** 0 modules, 0 capabilities, 0 owned masters. Build needs B2-1 +
  B2-2 (+ B3-3) decided first, then Phase A/B/C/E and the single domain-grain system skill +
  domain_module_tools. Not scaffolded.
- **B2-1 (re-home 4 masters).** data_subject_requests (901, ATS-CANDIDATE-CRM), gdpr_consent_records
  (950) / subject_access_requests (951) / data_deletion_requests (952) (LMS-CT-GDPR) into
  PRIV-MGMT modules: (a) all four, (b) keep current, (c) LMS triplet only. Keystone decision.
- **B2-2 (module split).** 4 / 3 / 2 / other module shape.
- **B2-4 (config-shape exemption).** Rule #12 lifecycle-state exemption tracking on
  processing_activities + personal_data_assets if they become masters; Rule #15 forbids
  auto-notes. Fires only if B2-1 + B3-3 land.
- **B2-5 + B1A-APQC-HANDOFF-288 (DESTRUCTIVE/JUDGMENT overlay).** Handoff 288 (DSPM ->
  PRIV-MGMT, payload data_assets) is untagged. PCF 20735 fits, but trigger_event 273 carries
  data_object_id=303 (data_classifications) while the handoff payload is data_object_id=300
  (data_assets), confirmed live. Loading the agent_curated handoff_processes(288, 270,
  role='implements') tag now binds it to the drifted shape; held until B2-5 picks (a) load now,
  (b) wait for DSPM B9 fix, (c) skip. Not written.

### Left (untouched)

- **B1A-RECLASS:** settled note (master-bearing); no action.
- **B1B-S1-CLUSTER:** blocked on B2-1 / B2-2 / B3-1 / B3-3. B1-S12's per-module-skill framing
  is RETIRED (2026-06-06 supersession above) and reframed in state to one domain-grain system
  skill + domain_module_tools.
- **B3-1 / B3-2 / B3-3:** backlog (DataGrail/Transcend solutions; PIPEDA/LGPD/PIPL/POPIA/HIPAA
  regulations; 7 master-entity candidates). All gated on Phase 0 vetting.
- **C1 already satisfied live:** business_function_domains owner Privacy Office (bf 72) +
  contributors Legal (bf 7) and Security (bf 28). No insert. entity_type PATCH N/A (0 masters).
  data_object_aliases (B1-S10) N/A (no owned masters to attach to). Handoff 283 APQC tag
  (row 492) confirmed still present.

### JWT-audience errors

None.

---

## 2026-06-08 - Review (state-driven re-verification, no drift)

State-driven Validate (SKILL.md Rule #21). Continued from state.yaml; re-verified every
recorded fact against live (domain id 20, parent 15 = GRC). No fresh from-scratch audit.

### Verified live (no writes)

- **A1 pass:** crud_percentage 88, min_org_size `20 s <500`, cost_band `$$$`,
  certification_required false, usa_market_size_usd_m 1200, market_size_source_year 2025.
- **A4 pass:** catalog_tagline + catalog_description both populated (the 2026-06-07 fix
  persists). Overwrite-protected per Rule #20; not touched.
- **A3 pass:** 4 solutions (OneTrust Privacy, TrustArc, Securiti = primary; ServiceNow IRM
  = secondary).
- **domain_regulations:** GDPR (1) + CPRA (3), both mandatory (B1-S6 fix persists).
- **C1 pass:** owner Privacy Office (bf 72), contributors Legal (bf 7) + Security (bf 28).
- **M1 FAIL (UNBUILT):** 0 domain_modules, 0 domain_module_host_domains.
- **A2 FAIL:** 0 capability_domains.
- **B1 (0 owned masters):** 0 in domain_data_objects; no domain_module_data_objects (no
  modules). Master-bearing per the overlay test, but unbuilt.
- **F2:** 0 skills.
- **Inbound handoffs unchanged on PRIV-MGMT's side:** 283 (DLP, payload dlp_incidents 330,
  target_domain_module_id NULL) and 288 (DSPM, payload data_assets 300, both module FKs
  NULL). Handoff 288 B9 drift persists: trigger_event 273 carries data_object_id 303
  (data_classifications) vs handoff payload 300 (data_assets). 0 outbound handoffs.
- **handoff_processes:** only 283 tagged (process 270, agent_curated, new). 288 untagged.
- **4 candidate masters still parked outside PRIV-MGMT:** data_subject_requests (901,
  ATS-CANDIDATE-CRM module 1, master+optional), gdpr_consent_records (950, LMS-CT-GDPR 180,
  master+optional), subject_access_requests (951, LMS-CT-GDPR 180, master+required),
  data_deletion_requests (952, LMS-CT-GDPR 180, master+required).

### Observed external change (not a PRIV-MGMT fix)

- DLP has been modularized since the prior audit: handoff 283 now carries
  source_domain_module_id=232. Does not change PRIV-MGMT's side (target_domain_module_id
  stays NULL until PRIV-MGMT has a module). Routes to DLP's own audit, not this one.

### Executed (0 writes)

None. The only agent-doable additive fix (A4 catalog UX) was applied 2026-06-07. Every
remaining open item is gated on a user decision (B2-1 re-home, B2-2 module split, B2-4
config-shape exemption, B2-5 handoff-288 timing) or on Phase 0 vetting (B3-1/B3-2/B3-3).
Re-homing masters between domains and the module split are user calls per Rule #21; the
build cannot be scaffolded without them. Domain remains `feedback_needed`.

### Status

`feedback_needed` (unchanged). q-PRIV-MGMT.md is current; no refresh needed. last_audit
bumped to 2026-06-08.

### JWT-audience errors

None.

---

## 2026-06-08 - Review (Phase 0 forcing step run; q-file regenerated)

State-driven Validate (Rule #21). The prior passes (2026-05-30 through 2026-06-08) surfaced
the keystone market-shape decisions (B2-1 re-home, B2-2 module split, B3-3 master candidates)
on a NARRATIVE vendor basis only - the inline "Pass 2 vendor surface" notes - never the formal
Phase 0 artifact Rule #22 requires. Under Rule #22's forcing step, an UNBUILT domain whose
entire build is gated on market-shape `b2` calls must have a CURRENT Phase 0 report produced
as part of the review, BEFORE the user is asked anything. That report did not exist
(`.tmp_deploy/` held only loader scripts and a PRM-domain Phase 0). This review ran it.

### Phase 0 executed (the missing forcing step)

- Report: `.tmp_deploy/PRIV-MGMT-phase0-2026-06-08.md`. Five pure-play flagships enumerated
  (OneTrust Privacy, TrustArc, Securiti Data Command Center, DataGrail, Transcend). Full
  vendor-by-entity surface matrix + compliance-entity list + 4-module hypothesis + per-decision
  verdicts D1-D5. CMP-only vendors (Cookiebot, Didomi, Usercentrics, Sourcepoint) held to the
  sibling CMP market, not PRIV-MGMT.

### Material new finding (changes a recommendation the prior passes carried)

- **DSR consolidation (Phase 0 D1).** 5/5 flagships model individual-rights handling as ONE
  request master with a `request_type` discriminator (access | deletion | correction |
  portability | opt-out), NOT separate masters per type: OneTrust Privacy Rights Automation,
  TrustArc Individual Rights Manager, Securiti single-pane DSR, DataGrail Request Manager,
  Transcend DSR Automation. The catalog currently carries `subject_access_requests` (951) and
  `data_deletion_requests` (952) as SEPARATE master rows in LMS-CT-GDPR (confirmed live this
  pass) - a triple-master split 5/5 vendors reject. B2-1 option (a) is rewritten from
  "re-home four parallel masters" to "re-home all four AND consolidate 901+951+952 into one
  `data_subject_requests` master + re-home 950 as `consent_records`". Collapsing 951/952 is a
  DELETE/restructure = pending destructive approval (Rule #21), surfaced and executed at build
  time, not now; B2-1 only sets direction.

### Other verdicts folded into state + q-file

- **D2:** 4 modules confirmed (each a distinct, separately licensed SKU across the flagships).
  Phase 0 D3 vetted the full entity surface as Core, so the prior "defer Bucket 3 -> collapse to
  2 modules" coupling is dissolved; option (c) is now a staging choice, not a coverage one.
- **D3:** processing_activities / personal_data_assets / processor_agreements / data_transfers /
  privacy_impact_assessments / data_breach_records / consent_purposes all Core/Common and
  module-assigned. `personal_data_assets` vs DCG `data_assets` (id 300) collision RESOLVED:
  distinct privacy master (special-category flags, lawful basis, retention, subject linkage the
  DCG catalog lacks) with an OPTIONAL reference FK to DCG, not a merge or embed. Surfaced as q7.
- **D4:** add PIPEDA (4/5), LGPD (5/5), PIPL (3/5), POPIA (2-3/5); hold HIPAA (2/5) as
  cross-domain healthcare, not core privacy. Catalog-wide regulation load (q6).
- **D5:** DataGrail + Transcend confirmed full privacy-management platforms -> qualify as
  flagship solutions rows (q5).

### Live re-verification (no drift since the earlier 2026-06-08 pass; 0 writes this run)

- Domain 20 (parent 15 = GRC): crud_percentage 88, catalog_tagline + catalog_description
  populated (2026-06-07 fix persists, overwrite-protected per Rule #20, untouched).
- 0 domain_modules (M1 fail / UNBUILT), 0 capability_domains (A2), 0 PRIV-MGMT-owned masters.
- Candidate masters parked as recorded: 901 (ATS-CANDIDATE-CRM module 1, master+optional),
  950 (LMS-CT-GDPR module 180, master+optional), 951 + 952 (LMS-CT-GDPR module 180,
  master+required - the two the D1 consolidation targets).
- Inbound handoffs 283 (DLP, source module 232, target_domain_module_id NULL) + 288 (DSPM,
  both module FKs NULL, B9 payload drift persists: trigger_event 273 data_object_id 303
  data_classifications vs handoff payload 300 data_assets). handoff_processes: 283 tagged
  (process 270, agent_curated, new); 288 untagged (held in B2-5).

### Executed (0 writes)

None. The only agent-doable additive fix (A4 catalog UX) was applied 2026-06-07. Every open
item is a user decision (B2-1 re-home + consolidate, B2-2 split + scope, B2-4 exemption
tracking, B2-5 handoff-288 timing) or an additive-but-non-blocking b3 (B3-1 solutions, B3-2
regulations, B3-3 collision confirmation), none of which the agent auto-executes per Rule #21.
The re-home + consolidation is also destructive and is a user call regardless. Domain stays
`feedback_needed`.

### q-file

Regenerated `q-PRIV-MGMT.md` from the Phase 0 evidence (Rule #22): "What this domain is" no
longer carries build commentary; q1 now states the consolidation finding with the five vendors
named inline; q2 notes the full surface is vetted and the collision is settled; q7 reframed to
the personal_data_assets collision confirmation. Footer mapping unchanged
(q1=B2-1 q2=B2-2 q3=B2-4 q4=B2-5 q5=B3-1 q6=B3-2 q7=B3-3, domain_id=20).

### JWT-audience errors

None.

---

## 2026-06-13 - Review (B9d verify run, both directions; B1A-B9D-VERIFY resolved)

State-driven Validate (Rule #21). Ran the committed bidirectional resolver
`scripts/analytics/b9d_resolver.ts PRIV-MGMT` (the per-domain instance of the B9d
band). Transcript-gate output recorded below. Live re-verified against domain id 20
(parent 15 = GRC): still UNBUILT (0 domain_modules, 0 capability_domains, 0
PRIV-MGMT-owned masters), 2 inbound handoffs (283 DLP/dlp_incidents tagged process
270; 288 DSPM/data_assets untagged, B9 payload drift persists), 1 handoff_processes
row (283 -> 270, agent_curated, new). No drift since 2026-06-08.

### B9d resolver output (both directions; transcript gate)

`boundary tags: 1 | findings: 1 | verdicts: {"ORPHAN":1}`

- Handoff 283 (DLP -> PRIV-MGMT, payload `dlp_incidents`, process 270 = PCF 8.3.5
  "Develop and manage IT security, privacy, and data protection"). Owner = **DLP**
  (the carried entity `dlp_incidents` id 330 is DLP-mastered), DLP currently unbuilt.
- Handoff 288 (DSPM -> PRIV-MGMT) carries no `handoff_processes` tag, so it produces
  no B9d finding. It is correctly held in B2-5 pending the DSPM-side B9 attribution fix.

### Why no owner-side write was applied (and B1A-B9D-VERIFY is nonetheless resolved)

The PRIV-MGMT boundary is a single tag. With no sibling in PRIV-MGMT's narrow scope,
the resolver classifies 283/process-270 as a plain ORPHAN owned by DLP and would
write `B2-B9D-OWN-270` into DLP's files. That write would be WRONG: DLP's OWN B9d
run earlier today (2026-06-13, recorded in audits/DLP/history.md) processed the same
`dlp_incidents` boundary with DLP's full-boundary context and classified process 270
as a **RE-TAG**, because a more specific unrealized tag (8.3.3.2 "Analyze IT security
threat impact", pid 1164) exists on the same entity. DLP's richer-context run
authored the correct owner item `B2-B9D-OWN-1164` (q-DLP.md q11) and surfaced the
8.3.5 -> 8.3.3.2 re-point as a destructive source-side sign-off. The B9d band is
designed so that auditing EITHER side reconciles the boundary; DLP already did the
authoritative job. Writing PRIV-MGMT's lower-context ORPHAN would create a duplicate
/ competing owner item for the coarse process 270 that DLP has already superseded.
Therefore: B9d ran in BOTH directions, the boundary is reconciled from the owner
side, and no owner-file write is owed from PRIV-MGMT's pass. `--write` deliberately
NOT run for PRIV-MGMT (it would author the incorrect B2-B9D-OWN-270 into DLP).

### State hygiene (Rule #22)

- **B1A-B9D-VERIFY resolved** -> deleted from state.yaml (B9d has now run both
  directions; nothing owed on the PRIV-MGMT side).
- **B1A-RECLASS** was a settled-classification tombstone ("PRIV-MGMT is
  master-bearing; the module-shape / promote-scope / re-homing decisions live in
  b2"), carrying no open agent action -> moved out of state.yaml per the
  no-disposition-tombstone rule. The classification it records is already encoded
  by B1A-BUILD + B2-1 + B2-2.

### Executed (0 catalog writes)

None. The only agent-doable additive catalog fix on this domain (A4 catalog UX) was
applied 2026-06-07 and persists. Every remaining open item is a user decision
(B2-1 re-home + consolidate, B2-2 split + scope, B2-4 config-shape exemption, B2-5
handoff-288 timing) or a non-blocking Phase-0-vetted b3 (B3-1/B3-2/B3-3). The build
(B1A-BUILD / B1B-S1-CLUSTER) cannot be scaffolded without B2-1 + B2-2, and the
re-home + DSR consolidation is also destructive (user call regardless, Rule #21).

### Status

`feedback_needed` / `next_action_by: user`. No agent-executable work remains;
everything left is gated on a user decision or a destructive sign-off. q-PRIV-MGMT.md
is current (q1=B2-1 q2=B2-2 q3=B2-4 q4=B2-5 q5=B3-1 q6=B3-2 q7=B3-3) and needs no
refresh: the B9d pass added no new user-facing question on PRIV-MGMT's side.
last_audit bumped to 2026-06-13.

### JWT-audience errors

None.
