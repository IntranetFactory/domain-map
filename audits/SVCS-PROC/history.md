# SVCS-PROC (Services Procurement) audit history

## 2026-06-19 - SVCS-PROC built

New emerging_market domain created and built in one pass. The user answered the new-domain gate
(q1-q6) directly: SOW becomes its own SVCS-PROC domain, CWM embeds the SOW masters as needed.

### Decisions resolved (q1-q6 of the new-domain gate)

- **q1 (B2-SVCS-PROC-GATE) = a.** Services Procurement / SOW is its OWN domain,
  `domain_kind='emerging_market'`, NOT a cross-cutting module hosted on CWM + S2P. The strict Rule #2
  point-solution test failed (one genuine pure-play that explicitly rejects being a VMS sub-feature,
  one near-pure-play, the rest bundlers), which rules out `established_market` but is the textbook
  `emerging_market` shape. The pure-play's anti-VMS stance was decisive: hosting SOW on CWM would bake
  in the contingent-workforce framing the pure-play exists to deny.
- **q2 (B2-SVCS-PROC-MODULES) = a.** Two full modules: SVCS-PROC-ENGAGEMENT (Services Sourcing and
  Engagement) and SVCS-PROC-SETTLEMENT (Milestone Delivery and Settlement). Three natural capabilities
  warrant the >=2 module split (Rule #14); the bundlers draw the same author/engage vs settle boundary.
- **q3 (B2-SVCS-PROC-OWNERSHIP) = a.** SVCS-PROC masters the SOW engagement cluster and CONSUMES the
  supplier (SRM), the contract (CLM), and rate cards (CWM); it does not re-master any of them.
- **q4 (B2-SVCS-PROC-EMBED) = a, with the user's refinement.** CWM embedded_masters the SOW cluster as
  needed (it does NOT master it). S2P consumes/relates (deferred to S2P's own build). CLM owns the
  contract; SRM owns the supplier. S2P does not own SOW execution; RFP/sourcing stays in S2P.
- **q5 (B2-SVCS-PROC-NAME) = a.** Services Procurement / SVCS-PROC (the buyer-side category label the
  market uses by name), not SOW Management / SOW-MGMT (the artifact framing). No collision with S2P or SRM.
- **q6 (B2-SVCS-PROC-METADATA) = a.** Accepted the proposed Rule #8 metadata. US TAM ~$600M (2025) is a
  TRIANGULATED placeholder, not a sourced figure, and is carried as an OPEN follow-up to replace with a
  Gartner / Spend Matters number before the domain is released. Other fields: crud_percentage 80,
  business_logic authored, min_org_size '30 m <2500', cost_band '$$', certification_required false.

### What was built (loader: .tmp_deploy/load_svcs_proc_2026_06_19.ts, idempotent)

- domains: SVCS-PROC (domain_id 192), `emerging_market`, full Rule #8 metadata + Rule #20 buyer-voice
  catalog_tagline + catalog_description.
- domain_modules (2, module_kind='full'): SVCS-PROC-ENGAGEMENT, SVCS-PROC-SETTLEMENT, each with
  buyer-voice catalog copy.
- 8 new master data_objects + master DMDO rows (4 required: statements_of_work, services_engagements,
  sow_milestones, milestone_invoices; 4 optional: services_proposals, sow_change_orders,
  service_deliverables, service_acceptances), each entity_type-classified (Rule #12), necessity per
  Rule #16. ENGAGEMENT: 4 masters; SETTLEMENT: 4 masters.
- M7: every new master pre-checked master-free catalog-wide before insert; post-build verified each has
  exactly one master row (SVCS-PROC) and the 3 consumed entities each still have exactly one master,
  none of which is a SVCS-PROC module. Zero unclassified masters.
- 3 consumer DMDO rows (role=consumer, never master): suppliers (206, SRM-SUPPLIER-LIFECYCLE),
  legal_contracts (66, CLM-REPOSITORY), rate_cards (189, CWM-WORKER-SOURCING).
- 4 capabilities + capability_domains + domain_module_capabilities.
- 1 domain skill (skill_type='domain', skill_name='svcs-proc', non-empty description + trigger_keywords)
  + 9 tools + 11 domain_module_tools (each module: >=1 query, >=1 mutate, >=1 workflow gate; notify
  abstractions linked).
- 4 domain_aliases: "services procurement", "SOW management", "statement of work", "SOW".

All rows at `record_status='new'` (Rule #1 untouched). No vendor names in catalog text (Rule #18).
No em-dashes; American English.

### CWM q-file reconciliation (recorded, NOT executed; CWM expansion is its own open q-file)

Per the user's "CWM embeds master as needed" decision, the CWM Phase-B expansion was reframed in
`audits/CWM/q-CWM.md` + `audits/CWM/state.yaml`: the proposed "Services Procurement / SOW" CWM module
is DROPPED as a master (SOW now lives in SVCS-PROC 192). CWM's expansion is now 2 new modules (Direct
Sourcing / Freelance Management + Worker Classification and Compliance), and CWM embedded_masters the
SVCS-PROC SOW masters if/when a SOW-adjacent surface is deployed. Entity 187 is reframed as a CWM
staffing requisition / work-order (rename target staffing_requisitions / staffing_work_orders), not a
SOW work-order; its rename stays inside CWM's VMS / Staff Augmentation surface. These are q-CWM.md
edits only; the CWM changes were not executed (CWM expansion remains its own open gate).

### Still open after the build (carried as b1b follow-ups, see state.yaml)

- Catalog-copy confirmation (Rule #20): the buyer-voice copy written for the domain and the 2 modules
  awaits user confirm/correct.
- US TAM is a triangulated placeholder to replace with a sourced figure before release (q6).
- Lifecycle states for the 5 operational_workflow masters (Rule #12 requires them), personas / RACI,
  and the cross-domain handoffs to/from S2P + CWM + CLM, including the CWM and S2P embed rows pending
  those domains' own builds.

## 2026-06-19 - a-SVCS-PROC.md processed

The user renamed q-SVCS-PROC.md to a-SVCS-PROC.md with answers to the four catalog-copy /
metadata questions. Processed under Rule #22.

### Answers and disposition

- **a1 (B1B-CATALOG-COPY-CONFIRM, domain) = "ok, but I think tag line should contain SOW".** The
  domain catalog_description is CONFIRMED (resolved). The catalog_tagline is corrected per the user's
  request: the live tagline already spelled out "statement of work" but not the acronym, so it was
  PATCHed to "Buy outsourced services under a statement of work (SOW), then track milestones to
  acceptance and payment." at record_status='new'. Per Rule #20 (write-and-mirror) the corrected
  wording is re-surfaced in a fresh q-SVCS-PROC.md for a final confirm, so the tagline confirmation
  stays OPEN and the domain stays feedback_needed.
- **a2 (B1B-CATALOG-COPY-CONFIRM, SVCS-PROC-ENGAGEMENT) = yes.** Module tagline + description
  CONFIRMED, resolved.
- **a3 (B1B-CATALOG-COPY-CONFIRM, SVCS-PROC-SETTLEMENT) = yes.** Module tagline + description
  CONFIRMED, resolved.
- **a4 (B1B-TAM-SOURCE) = a.** Keep the triangulated US TAM ~$600M (2025) placeholder for now;
  replace with a sourced Gartner / Spend Matters figure before the domain is released. Decided-to-defer:
  the item stays OPEN as a deferred b1b (not a q-file item now), to resurface on the release pass when
  the non-empty overwrite will need explicit user approval (Rule #1 / Rule #21).

### State changes

- catalog_release set to 2026-06-19 on the SVCS-PROC domain (192) in the same session.
- domains.catalog_tagline (192) PATCHed to the SOW-acronym wording (record_status untouched, stays 'new').
- B1B-CATALOG-COPY-CONFIRM narrowed to the domain catalog_tagline final-confirm only (modules + domain
  description resolved).
- B1B-TAM-SOURCE reframed from a pending user decision to a decided-but-deferred pre-release sourcing item.
- a-SVCS-PROC.md deleted; q-SVCS-PROC.md regenerated with the single open tagline-confirm question.
- status remains feedback_needed (next_action_by: user).
