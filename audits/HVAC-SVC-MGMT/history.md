# HVAC-SVC-MGMT (bundle) history

`domain_kind='bundle'` domain (domain id 189), anchored to the cross-domain starter module
HVAC-SVC-MGMT (domain_module id 171). A bundle masters NOTHING: it embeds/consumes entities from
other domains' markets and carries its own module-anchored system skill.

## 2026-06-16 — Audit

### Summary
First audit of HVAC-SVC-MGMT as a `domain_kind='bundle'`. Domain 189 was promoted on 2026-06-16
from the cross-domain starter module HVAC-SVC-MGMT (domain_module id 171). The bundle packages the
field-service essentials a small heating-and-cooling service business needs on day one: it embeds
the customer/contact record, installed equipment at each site, work orders and field visits,
service contracts, and the quote-to-invoice path, so a small team can book a call, schedule a
technician, complete the job, and bill it without stitching tools together.

Per Rule #2, bundles are EXEMPT from the market-shape audit floors (A1 full market metadata, A2
capabilities, B1 masters, C1 function-owner, A3 solutions, F2 domain-grain skill). This audit
validates the Rule #19 STARTER SHAPE only. All six invariants pass; the domain is agent-finished
with no open items.

### Host markets (informational)
Module 171 declares 6 host domains via `domain_module_host_domains`:
FSM (id 31), CRM (id 69), CPQ (id 73), SUB-MGMT (id 97), HAM (id 51), FIN (id 65). The bundle's
embedded shells are sourced from these markets (FSM work orders / field visits / dispatch / PM
schedules / installed equipment / customer sites; CRM customers / contacts; CPQ quotes; SUB-MGMT
service contracts; HAM spare-parts inventory; FIN customer invoices).

### Audit 1 — Bundle metadata (A1 partial carve-out): PASS
GET /domains?id=eq.189 returned: domain_kind='bundle'; min_org_size='10 xs <50' (non-empty);
cost_band='$' (non-empty); certification_required=false (non-null); catalog_tagline non-empty
("A ready-to-run home-services starter that takes an HVAC job from customer call to scheduled visit
and invoice."); catalog_description non-empty (the field-service-essentials package narrative).
usa_market_size_usd_m=0 and market_size_source_year=0, which is EXPECTED for a bundle (a bundle has
no market of its own) and is not a failure.

### Audit 2 — Rule #19 invariant 1 (roles): PASS
GET /domain_module_data_objects?domain_module_id=eq.171 returned 13 rows. 12 are `embedded_master`
on `kind='domain_owned'` data_objects: customers (97), crm_contacts (98), customer_sites (821),
installed_equipment (819), service_pm_schedules (820), service_work_orders (740), field_visits (261),
dispatch_records (262), service_contracts (741), sales_quotes (416), customer_invoices (107),
spare_parts_inventory (698) — all necessity='required'. The 13th is a `consumer` row on `users` (748),
`kind='platform_builtin'`, necessity='required'. No `master`/`derived`/`contributor` rows, and no
`consumer` on a domain_owned object. Invariant holds.

### Audit 3 — Rule #19 invariant 2 (canonical master exists): PASS
For each of the 12 `embedded_master` data_objects, a `role='master'` row exists in some module
catalog-wide (GET /domain_module_data_objects?data_object_id=in.(...)&role=eq.master):
customers (97) → module 46; crm_contacts (98) → module 46; customer_sites (821) → module 162;
installed_equipment (819) → module 162; service_pm_schedules (820) → module 162;
service_work_orders (740) → module 161; field_visits (261) → module 398; dispatch_records (262) →
module 161; service_contracts (741) → module 163; sales_quotes (416) → module 165;
customer_invoices (107) → module 168; spare_parts_inventory (698) → module 170. All 12 embedded
shells point at an object that is mastered elsewhere; none is an orphan embed. Invariant holds.

### Audit 4 — Rule #19 invariant 6 (system skill): PASS
GET /skills?domain_module_id=eq.171&skill_type=eq.system returned exactly ONE row: id 236,
skill_name 'hvac_svc_mgmt_agent', domain_id=189. The single module-anchored system skill is correctly
repointed to the bundle-domain (189). Invariant holds.

### Audit 5 — domain_module_tools floor: PASS
GET /domain_module_tools?domain_module_id=eq.171 returned 23 rows (all requirement_level='required'),
well above the >=1 floor. Invariant holds.

### Decisions / Fixes applied
None. This was a read-only validation pass against the live catalog (GET only); nothing was changed.
Market floors were exempted per Rule #2 (bundle). All six invariants passed, so the domain is recorded
`status: passed`, `next_action_by: done`, with no open b1a/b1b/b2/b3 items.
