# IT-OPS-STARTER (starter kit) history

Cross-domain starter kit candidate (`module_kind='starter'`, `domain_id` NULL). Does not exist in
the catalog yet. This directory holds the design decisions before any load.

## 2026-06-16 — Proposal

### Origin
Surfaced from the "ERP for IT, 50-250 users" question. A starter kit, not a new domain (the integrated
IT suite is a packaging of existing markets, not a distinct market) and not the heavy full modules
(too much for a small IT team). Originally logged as SMP `B3-IT-SUITE-STARTER`; promoted here.

### Decisions already made (in conversation)
- **Name:** `IT-OPS-STARTER` (collision-checked; fits the existing `-STARTER` suffix convention alongside
  HIRING-STARTER, CSA-STARTER, TRAINING-RECORDS-STARTER).
- **Domain anchoring:** `domain_id = NULL`, hosts declared via `domain_module_host_domains`. This is the
  cross-domain-bundle pattern, same as REAL-ESTATE-AGENT (null; hosts CRM + RE-BROKERAGE + CLM) and
  HVAC-SVC-MGMT (null; hosts FSM + CRM + CPQ + SUB-MGMT + HAM + FIN). Hosts: ITSM, HAM, SMP, ITAM, SAM.
- **Helpdesk handling:** embed a thin `service_incidents` / `service_requests` shell but mark it
  `necessity = optional`. Rationale: the helpdesk is the one system a 50-250 org usually already runs,
  so it is not the gap (the registers are). Optional embed covers all three cases: greenfield turns it on;
  an org running Semantius ITSM gets the shell auto-demoted to the canonical incidents (Rule #19 upgrade,
  same table, no migration); an org on an external helpdesk (Freshservice/Zendesk) leaves it off. A separate
  helpdesk-only starter was rejected (it would compete with the incumbent these orgs already run).

### Proposed shape (decided by the q-file)
Embedded shells, each `embedded_master` on a domain-owned master with a canonical owner elsewhere (Rule #19
invariants 1 and 2), plus a `consumer` row on the `users` platform built-in:

| Shell | From | necessity | Replaces the spreadsheet for |
|---|---|---|---|
| service_incidents | ITSM | optional | the helpdesk (already-present in most orgs) |
| service_requests | ITSM | optional | service requests |
| hardware_assets | HAM | required | device register |
| saas_applications | SMP | required | SaaS app inventory |
| saas_subscriptions | SMP | required | SaaS + renewal tracker |
| asset_contracts | ITAM | required | contract / renewal register |
| software_licenses | SAM | optional | on-prem license list (SaaS-mostly orgs skip) |
| users | platform built-in | consumer (required) | people that assets / tickets attach to |

Budget is out of scope (FIN + spreadsheets at this size; ITFM/TBM is enterprise-only). Renewal cost and
annual spend ride as fields on the contract and subscription shells (showback-lite), pending q4.

### Build plan (after the q-file approves; nothing written yet)
1. `domain_modules` row: `IT-OPS-STARTER`, `module_kind='starter'`, `domain_id=NULL`.
2. `domain_module_host_domains`: ITSM, HAM, SMP, ITAM, SAM (drop SAM if q3 = leave-out).
3. `domain_module_data_objects`: the embedded_master rows above with the agreed necessity + the `users` consumer row.
4. The starter's own module-anchored `system` skill + `domain_module_tools` (Rule #19 invariant 6): query/create
   tickets, query assets, query subscriptions and renewals, query contracts, notify.
5. Baseline permissions + the re-prefixed governance the embedded entities carry (Rule #19 invariant 4).
All at `record_status='new'`; no `record_status` flips (Rule #1).

## 2026-06-16 — Answers processed (a-file)

User answered the proposal q-file. Outcomes:

- **q1 (B2-CREATE) = yes** → RESOLVED. The IT-OPS-STARTER starter kit is approved to build.
- **q3 (B2-SAM-LICENSES) = optional** → RESOLVED. `software_licenses` is an optional embed; SAM stays a host domain.
- **q2 (B2-EMBED-LIST) = "shouldn't all be optional"** → a question, kept OPEN and reframed. Agent answer: not all
  optional, because a starter whose every embed is optional can deploy empty (Rule #14 coherent-deployable smell);
  the kit needs a minimal required core, with everything else optional. Reframed as a "pick the required core"
  question; recommended core is the renewal/contract spine (saas_subscriptions + asset_contracts) with hardware,
  SaaS-app inventory, helpdesk, and licenses all optional (device/SaaS-app inventory varies by org; renewals and
  contracts are the universal Excel pain).
- **q4 (B2-COST-FIELDS) = "ok, but how... blueprint hint?"** → yes-plus-question, kept OPEN. Agent answer: correct,
  the domain-map catalog does not model fields (field contracts are validated by the deployer against the canonical
  entity's metadata, never duplicated in the catalog), so renewal-cost/annual-spend cannot be a catalog row. Handle
  as (1) a blueprint hint on IT-OPS-STARTER and on the asset_contracts / saas_subscriptions masters, plus (2) a
  field-level follow-up on the canonical ITAM asset_contracts and SMP saas_subscriptions entities. Reframed as a
  confirm-the-approach question.

Build NOT executed (no catalog writes): the embed list is still open, so the DMDO shape is undecided. a-file retired;
fresh q-file regenerated with the two remaining questions.

## 2026-06-16 — Built (second a-file processed)

Final answers: q1 (B2-EMBED-LIST) = ok -> option (a), the renewal/contract spine as required core; q2 (B2-COST-FIELDS)
= yes (blueprint hint + field follow-up). Both resolved; build executed (the a-file is the approval, Rule #21).

Loader: `.tmp_deploy/build_it_ops_starter_2026_06_16.ts` (idempotent; Rule #19 starter pre-flight passed). Result:
- `domain_modules` row **id 403**: IT-OPS-STARTER, module_kind='starter', domain_id NULL, with buyer-voice
  catalog_tagline + catalog_description (Rule #20).
- `domain_module_host_domains`: 5 (ITSM, HAM, SMP, ITAM, SAM).
- `domain_module_data_objects`: 8 embedded shells — REQUIRED: asset_contracts (54), saas_subscriptions (62);
  OPTIONAL: service_incidents (47), service_requests (48), hardware_assets (56), saas_applications (61),
  software_licenses (58); CONSUMER: users (748).
- `skills`: 1 system skill **id 474** (`it_ops_starter_system`, skill_type='system', domain_module_id=403,
  domain_id=3 anchor), Rule #19 invariant 6.
- `domain_module_tools`: 9 (all pre-existing, platform-covered): query_saas_subscriptions + query_asset_contracts
  required; query_hardware_assets, query_saas_applications, query_incidents, query_service_requests,
  query_software_licenses, create_service_request, notify_person optional.
All at `record_status='new'`; no `record_status` flips (Rule #1).

Side fix (SAM B13 gap surfaced by this build): `software_licenses` (id 58) was `entity_type='unclassified'`, which
hard-failed the emitter. Classified to `operational_workflow` (it carries a purchase->active->renew->retire lifecycle;
SAM B1B-S5 documents it). PATCH on entity_type only; record_status untouched.

Blueprint emitted and verified clean: `catalog/blueprints/it-ops-starter-semantic-blueprint.md`. Required spine solid /
optional dashed in the mermaid; inherited lifecycle states cross-referenced to canonical masters; re-prefixed workflow
gates derived (`it-ops-starter:*`); no unjustified placeholders. a-file + q-file retired (no open user decisions).

Open follow-ups (non-blocking, state.yaml b3): the showback-lite cost FIELDS on asset_contracts / saas_subscriptions
(field-level, outside domain_map) and optional starter capabilities.

## 2026-06-16 - Promoted to bundle-domain (domain-kind taxonomy)

The "no-home cross-domain starter" design above (domain_id NULL) is SUPERSEDED. Per the domain-kind taxonomy
(plans/domain-kind-taxonomy-plan.md), IT-OPS-STARTER was promoted to its own domain_kind='bundle' domain so every
module has a required primary home; the null-domain / no-home pattern is retired and domain_modules.domain_id is now
a required field.

Changes (all record_status='new'; Rule #1, nothing approved):
- New domains row id 190: domain_code IT-OPS-STARTER, domain_kind='bundle', min_org_size '20 s <500', cost_band '$$',
  certification_required false, industry_id NULL (horizontal). Market-research fields (usa_market_size_usd_m,
  market_size_source_year, crud_percentage, business_logic) left at default: a bundle has no TAM (Rule #2 carve-out,
  read as N/A, not zero). catalog_tagline / catalog_description copied from the module.
- catalog_release backfilled 2026-06-16 (so emit_domain_map's release gate lists it in the catalog).
- Module 403 domain_id NULL -> 190 (wired to the bundle-domain).
- System skill 474 (it_ops_starter_system) domain_id 3 (ITAM host) -> 190 (the bundle-domain); domain_module_id 403
  kept (module-anchored, Rule #19 #6). Destructive FK overwrite, done on explicit user sign-off; old values snapshotted
  in .tmp_deploy/domain_kind_promote_snapshot.json.

Bundle-shape audit (Rule #19 starter shape; market floors A1 / A2 / A3 / B1 / C1 / F2 exempt per Rule #2): masters
nothing; the embedded shells have canonical owners elsewhere; exactly one module-anchored system skill (474);
domain_module_tools non-empty. All hold, consistent with the REAL-ESTATE-AGENT and HVAC-SVC-MGMT bundle audits.
Status stays passed / done. The b3 follow-ups above are unchanged.
