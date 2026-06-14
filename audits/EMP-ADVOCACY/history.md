# EMP-ADVOCACY audit history

## 2026-06-14, New-domain build (promote-as-domain)

### Summary

EMP-ADVOCACY (Employee Advocacy Platform) arrived in the triage queue with 4 mentions (SMM,
EMP-EXP, INTRANET audits). Phase 0 vendor-surface research
(`.tmp_deploy/EMP-ADVOCACY-phase0-2026-06-14.md`) cleared the point-solution-market test and the
verdict was **promote-as-domain**. Built live end to end at `record_status='new'`. Domain id 181.

**Point-solution test (PASS).** Independent flagship-advocacy products: DSMN8 (UK, independent,
flagship IS employee advocacy), GaggleAMP (founder-owned, exclusively advocacy), EveryoneSocial
(standalone advocacy flagship, acquired by Seismic 2024 but still a standalone product), plus
Oktopost (independent B2B social, advocacy a first-class pillar) and Sociabble (now Poppulo).
Gartner Peer Insights runs a dedicated "Employee Advocacy Tools" market category. Three+
independent flagships plus a named analyst market = a real domain.

**Fold gate (distinct, not folded into SMM).** SMM (106) names "influencer/advocacy programs" in
one clause, but that is influencer-marketing scope (external creators) and SMM already carries an
SMM-INFLUENCER module (302) for exactly that. SMM models NONE of the advocacy entity surface
(advocate profiles, leaderboards, employee shares, share-to-revenue attribution). Distinct buyer
split (Marketing/MarComms own it; HR/employer-brand contributes). The boundary holds against
INTRANET / FRONTLINE-COMMS (internal-only audiences; advocacy broadcasts TO employees so they
reshare EXTERNALLY) and EMP-EXP (engagement listening, no external reach mechanics).

**M&A / rebrand notes (corrects two triage-queue errors).** Triage metadata said "Smarp
(Sociabble)" and "Bambu discontinued 2023"; research shows Smarp merged with COYO + Jubiwee and
rebranded to **Haiilo** (2022), NOT Sociabble; Sociabble was acquired by **Poppulo** (2024/2025);
Bambu rebranded to "Employee Advocacy by Sprout Social" (2022) and is a live suite module, not
confirmed discontinued. EveryoneSocial -> Seismic (2024); PostBeyond -> Influitive; Firstup =
SocialChorus + Dynamic Signal. GaggleAMP, DSMN8, Oktopost remain independent.

### What was built (all record_status='new')

- **Phase A.** domain 181 with all 7 metadata fields (crud 80, $$, 20 s <500, US TAM $380M 2025,
  cert false) + 2 catalog UX fields; 7 capabilities; 2 full modules
  (EMP-ADVOCACY-CONTENT-DISTRIBUTION 368, EMP-ADVOCACY-GAMIFICATION-ANALYTICS 369);
  7 domain_module_capabilities; 5 new vendors (EveryoneSocial, Seismic Software, GaggleAMP, DSMN8,
  Oktopost) + 6 reused (Hootsuite, Sprinklr, Sprout Social, Sociabble, Haiilo, Poppulo);
  7 new solutions + reused Sociabble; 8 solution_domains (6 primary, 2 secondary).
- **Phase B.** 14 data_objects, all entity_type-classified (7 operational_workflow, 1 catalog,
  3 operational_record, 3 computed); 20 domain_module_data_objects (14 master, 2 embedded_master
  on the gamification side for standalone deploy of shares + advocate_profiles, 4 consumer of
  employees/social_posts/users); 9 aliases; 28 lifecycle states across the 7 workflow masters
  (well-formed: one initial, >=1 terminal, gates on the right transitions); 4 trigger_events;
  22 data_object_relationships (intra-domain + 4 users edges per Rule #10 + 2 cross-domain
  outbound: advocate_profiles->employees, advocacy_content->social_posts); 4 handoffs.
- **Handoffs.** intra-domain CONTENT-DISTRIBUTION -> GAMIFICATION on advocacy_share.posted;
  outbound advocacy_share_metrics -> SMM-PUBLISHING (organic social attribution),
  advocacy_attribution_records -> REV-INTEL-ACTIVITY-CAPTURE (pipeline), advocacy_content ->
  SMM-INFLUENCER (content reuse seam). INTRANET has no modules of its own, so the internal-comms
  seam is carried at the relationship/description level only, not as a module-FK'd handoff.
- **Phase C.** Marketing (22) owner; Marketing Communications (56) + Human Resources (3) contributors.
- **Phase S.** one domain system skill emp-advocacy-system (468, domain_id 181, domain_module_id
  NULL); 14 new tools (5 query, 5 mutate, 2 compute, 1 side_effect post_to_social_network, 1 fetch
  fetch_social_share_engagement) + reused notify_person/notify_team; 16 domain_module_tools
  (11 required, 5 optional). External social posting/fetch is `external` coverage_tier because
  Semantius does not own LinkedIn/X/Facebook schemas.
- **Phase E.** 3 personas (MKT-ADVOCACY-PROGRAM-MANAGER, MKT-ADVOCACY-CONTENT-CURATOR
  function-scoped; EMP-ADVOCATE cross-functional); 6 role_modules (each persona reaches both
  modules, satisfying the 2-module floor); 3 gated lifecycle states wired to real PCF nodes
  (advocacy_campaigns.running + advocacy_content.published -> 665 "Execute promotional activities";
  advocacy_leaderboards.live -> 666 "Evaluate promotional performance metrics"); 4 process_raci
  (curator R / PM A on 665; PM R + A on 666).

### Verification (all green)

- A1 metadata complete; every touched row record_status='new' (no approved/pending); zero `notes`
  on every touched table (DMDO, relationships, aliases, lifecycle, handoffs, domain_module_tools,
  role_modules, solution_domains, solutions, vendors).
- M7 single-master: each data_object mastered in exactly one module; advocacy_shares +
  advocate_profiles carried embedded_master (not master) in the gamification module = correct
  autonomous-deployable shape.
- B12 lifecycle on all 7 workflow masters; B13 all 14 entity_types classified; B15 no stray
  pattern flag on catalog/computed/junction (advocacy_social_accounts.has_personal_content=true is
  valid: operational_record is in scope for that flag).
- F2 exactly one domain system skill; F3 16 domain_module_tools (>= the query+mutate+gate floor);
  F4 operation_kind<->data_object_id invariant holds on every tool; M8 module catalog UX populated.

### Open (surfaced to user; see q-EMP-ADVOCACY.md / state.yaml)

- B2-GATE: confirm distinct domain vs fold into SMM-INFLUENCER (built distinct; recommended keep).
- B2-PATTERN-FLAGS: confirm the three positive flag flips authored on advocacy_content +
  advocate_profiles + advocacy_social_accounts.
- B2-REGULATIONS: pick GDPR-only (recommended) vs +FINRA (conditional) vs none.
- B3-CUSTOMER-ADVOCACY: customer/partner advocacy (Influitive/PostBeyond) as a separate domain
  candidate, not part of this domain (non-blocking).
- B3-SMM-DESCRIPTION-NARROW: drop "advocacy" from SMM's description clause now that EMP-ADVOCACY
  exists; this is a destructive overwrite of a non-empty value on another domain and needs sign-off.

No destructive step was taken. No record_status flipped. No git commit.
