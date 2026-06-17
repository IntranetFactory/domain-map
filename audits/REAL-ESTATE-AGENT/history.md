# REAL-ESTATE-AGENT (bundle) history

`domain_kind='bundle'` domain (domain id 188). A bundle masters NOTHING: it embeds/consumes entities
from other domains' markets and carries its own module-anchored system skill. Validated against the
Rule #19 starter shape only; exempt from the market-shape audit floors per Rule #2.

## 2026-06-16 — Audit

### Promotion
REAL-ESTATE-AGENT was promoted on 2026-06-16 to a first-class `domain_kind='bundle'` domain (domain id
188) from the cross-domain starter module REAL-ESTATE-AGENT (domain_module id 153). The bundle continues
to be anchored to that module: its embedded shells, host declarations, system skill, and tools all live
on domain_module 153, while domain 188 is the catalog-facing bundle-domain the module now points its
system skill at.

### Host markets
The bundle hosts three markets via `domain_module_host_domains` (domain_module_id 153):
- CRM (domain id 69)
- RE-BROKERAGE (domain id 143)
- CLM (domain id 26)

### Rule #19 invariant results

**A1 partial carve-out (bundle metadata) — PASS.** `GET /domains?id=eq.188` returns
`domain_kind='bundle'`, `min_org_size='10 xs <50'`, `cost_band='$'`, `certification_required=false`
(non-null), `catalog_tagline='A working surface for the real-estate agent.'`, and a non-empty
`catalog_description`. The TAM fields `usa_market_size_usd_m` and `market_size_source_year` are both 0,
which is expected for a bundle (a bundle has no standalone market size) and is not a failure per Rule #2.

**Invariant 1 (roles) — PASS.** `GET /domain_module_data_objects?domain_module_id=eq.153` returns 8 rows.
The 7 domain-owned objects are all `role='embedded_master'`, `necessity='required'`:
- legal_contracts (data_object_id 66, kind='domain_owned')
- crm_leads (99, domain_owned)
- crm_contacts (98, domain_owned)
- real_estate_listings (352, domain_owned)
- tour_appointments (355, domain_owned)
- real_estate_transactions (353, domain_owned)
- disclosure_documents (356, domain_owned)

The 8th row is `users` (data_object_id 748, kind='platform_builtin') with `role='consumer'`,
`necessity='required'`. Every row is either `embedded_master` on a `domain_owned` object or `consumer`
on a `platform_builtin` object. No `master`/`derived`/`contributor` rows, and no `consumer` on a
domain_owned object. The bundle masters nothing, as required.

**Invariant 2 (canonical master exists) — PASS.** For each `embedded_master` object, a `role='master'`
row was confirmed in another module catalog-wide:
- legal_contracts (66) -> mastered by domain_module 127
- crm_leads (99) -> mastered by domain_module 47
- crm_contacts (98) -> mastered by domain_module 46
- real_estate_listings (352) -> mastered by domain_module 151
- tour_appointments (355) -> mastered by domain_module 151
- real_estate_transactions (353) -> mastered by domain_module 151
- disclosure_documents (356) -> mastered by domain_module 151

No embedded_master points at an object that nothing masters. The `users` consumer is a platform_builtin,
which needs no canonical master row.

**Invariant 6 (system skill) — PASS.** `GET /skills?domain_module_id=eq.153&skill_type=eq.system` returns
exactly one row: id 220, `skill_name='real_estate_agent'`, `domain_id=188`. The single module-anchored
system skill is correctly repointed to the bundle-domain (188).

**domain_module_tools floor — PASS.** `GET /domain_module_tools?domain_module_id=eq.153` returns 24 rows
(21 required, 3 optional), well above the >=1 floor.

### Market floors exempted (Rule #2)
As a `domain_kind='bundle'`, REAL-ESTATE-AGENT is exempt from the standard market-shape audit floors:
A1 full market metadata (including TAM), A2 capabilities, B1 masters, C1 function-owner, A3 solutions,
and the F2 domain-grain skill. These were not checked. The bundle was validated against the Rule #19
starter shape only.

### Result
All six checked invariants pass. Audit status `passed`, `next_action_by: done`. No open items; no
catalog writes were made (read-only audit).

## 2026-06-17 — Re-audit (current skill rules) + F8 fix

Re-validated against the current SKILL.md after the skills schema migrated. The 2026-06-16 framing
above used the now-retired `skill_type='system'` and `skills.domain_module_id`, and wrongly listed F2
as bundle-exempt. Under current rules skills are domain-grain only: `skills.domain_module_id` is
dropped and the skill row is `skill_type='domain'`. Bundles are NOT exempt from F1/F2/F8 (only from the
A2/B1/C1/A3 market floors and the A1 TAM fields). All structural checks re-confirmed live and still pass.

### Live re-confirmation
- Skill 220 already migrated: `skill_type='domain'`, `domain_id=188`, `skill_name='real-estate-agent'`
  (matches the `<domain_code_lower>` convention). F1 (no orphan) and F2 (exactly one domain skill) pass.
- Rule #19 inv.1 (roles): 7 `embedded_master` on domain_owned objects + `users` consumer
  (platform_builtin); no master/derived/contributor; no consumer on a domain_owned object. PASS.
- Rule #19 inv.2 (canonical master exists): legal_contracts -> CLM-REPOSITORY (mod 127);
  crm_contacts -> CRM-ACCT-MGT (46); crm_leads -> CRM-LEAD-MGT (47);
  real_estate_listings / real_estate_transactions / tour_appointments / disclosure_documents ->
  RE-BROK-AGENT-OPS (151). Each has exactly one master row. PASS.
- Host markets via `domain_module_host_domains` (mod 153): CRM (69), RE-BROKERAGE (143), CLM (26). PASS.
- F3 (domain_module_tools floor): 24 rows (21 required, 3 optional). PASS.
- F4 (operation_kind <-> data_object_id): all 24 valid (query/mutate carry data_object_id; side_effect
  /compute are NULL). PASS.
- F5 (Semantius score): computable. strict = operational = 20/24 = 0.833. The 4 external-tier tools are
  genuinely external: sign_document (e-signature), generate_text (AI copy), syndicate_to_mls (MLS
  distribution), match_listing_to_buyer_preferences (ML matching). No action.
- F7 (channel abstraction): notifications go through `notify_person`; no raw channel primitives. PASS.
- A1 bundle carve-out: min_org_size='10 xs <50', cost_band='$', certification_required=false (non-null);
  TAM / crud_percentage / business_logic exempt for a bundle. PASS. M1 / M8 (module + catalog UX): PASS.

### F8 finding and fix (the only gap)
Skill 220 failed F8: `trigger_keywords` was empty (hard fail; the emitter errors on empty) and the
`description` was meta-shaped (soft fail; it named internal tool names and "embedded master / platform
CRUD / starter" instead of trigger-shaped user phrasing).
- Backfilled `trigger_keywords` (empty-field backfill = additive, no chat gate): "realtor, real estate
  broker, listing agent, buyers agent, MLS, open house, property tour, home sale, escrow, commission,
  real estate deal, property listing, real estate CRM, showing schedule, offer to closing".
- Rewrote `description` to trigger-shaped user-voice prose (a non-empty overwrite = destructive;
  applied only after explicit user approval this session).
- Both writes landed at `record_status='new'` (Rule #1; record_status untouched).

### Result
F8 now passes. Audit status `passed`, `next_action_by: done`. No open items. Two additive/approved
catalog writes on skill 220 (`trigger_keywords`, `description`), both at `record_status='new'` awaiting
the user's normal record review.
