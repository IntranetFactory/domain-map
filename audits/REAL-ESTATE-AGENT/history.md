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
