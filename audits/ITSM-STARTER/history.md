# ITSM-STARTER (starter kit) history

Single-domain starter kit candidate (`module_kind='starter'`, `domain_id=1` ITSM). Does not exist in
the catalog yet. This directory holds the design decisions before any load.

## 2026-06-16 - Proposal

### Origin
Surfaced from the "itsm starter vs it-ops-starter" comparison. IT-OPS-STARTER is the cross-domain
register spine (ITSM + HAM + SMP + ITAM + SAM, renewal/contract required, helpdesk optional). ITSM-STARTER
is its narrow-and-deep complement: a single-domain lite service desk that carries no assets but goes
deeper inside ITSM (adds the self-service and SLA layer IT-OPS-STARTER omits). A starter kit, not a new
domain (it is a lite packaging of the existing ITSM market) and not the heavy full `itsm-*` modules
(too much for a small team or a team that only wants ticketing).

### Phase 0
Vendor surface at `.tmp_deploy/ITSM-STARTER-phase0-2026-06-16.md`. Flagship entry-tier desks
(Freshservice Starter, ManageEngine ServiceDesk Plus Standard, Jira Service Management Free, Zendesk,
Spiceworks) draw the scope line at incident + request + (catalog / KB / SLA), holding problem, change,
release, and event for the paid upgrade. ManageEngine Standard edition and Freshservice Starter both
sell exactly that line as their entry product.

### Decisions already made (in conversation)
- **Create:** yes. The user asked to add the bundle.
- **Domain anchoring:** `domain_id = 1` (ITSM). Single-domain starter, so it anchors to its host domain
  like HIRING-STARTER (56), CSA-STARTER (158), TRAINING-RECORDS-STARTER (57). No
  `domain_module_host_domains` needed (that is for cross-cutting starters like IT-OPS-STARTER and
  REAL-ESTATE-AGENT, which are `domain_id` NULL).
- **Excluded set / the seam:** problem, change/release, event/alert, and agent-workspace are the full
  `itsm-*` modules you turn on when you outgrow the desk; assets stay out (that is IT-OPS-STARTER / HAM).
  Embedded shells demote to consumers when the full modules install (Rule #19 upgrade, same table, no
  migration). A tenant can deploy ITSM-STARTER and IT-OPS-STARTER together; the shared
  `service_incidents` / `service_requests` shells dedupe at deploy time.

### Proposed shape (final scope decided by the q-file)
Embedded shells, each `embedded_master` on an ITSM-owned master with the canonical owner in a full
`itsm-*` module (Rule #19 invariants 1 and 2), plus a `consumer` row on the `users` platform built-in.
Required core is the helpdesk (incidents + requests); the catalog / KB / SLA layer is optional per the
q1 answer.

| Shell | data_object id | From module | entity_type | necessity (recommended) | Covers |
|---|---|---|---|---|---|
| service_incidents | 47 | ITSM-INCIDENT-MGMT | operational_workflow | required | the core ticket |
| service_requests | 48 | ITSM-SERVICE-REQUEST | operational_workflow | required | catalog-driven requests |
| service_catalog_items | 52 | ITSM-SERVICE-REQUEST | catalog | optional | the request menu |
| knowledge_articles | 51 | ITSM-KNOWLEDGE | operational_workflow | optional | self-service / KB deflection |
| service_slas | 53 | ITSM-SLA-MGMT | catalog | optional | response/resolution clocks |
| users | 748 | platform built-in | (built-in) | consumer (required) | reporter / assignee / approver |

### Build plan (after the q-file approves; nothing written yet)
1. `domain_modules` row: `ITSM-STARTER` (or the q2 name), `module_kind='starter'`, `domain_id=1`, with
   buyer-voice `catalog_tagline` + `catalog_description` (Rule #20).
2. `domain_module_data_objects`: the embedded_master shells above with the q1 necessity + the `users`
   consumer row. Rule #19 starter pre-flight (`validateStarterDataObjectJunction()`) must pass.
3. The starter's own module-anchored `system` skill + `domain_module_tools` (Rule #19 invariant 6):
   query/create incidents, query/create service requests, query knowledge articles, notify_person.
4. Baseline permissions + the re-prefixed governance the embedded workflow entities carry (Rule #19
   invariant 4): `itsm-starter:read` / `:manage` / `:admin` plus the derived `resolved_incident`,
   `closed_incident`, `approved_service_request`, and knowledge-publish gates.
All at `record_status='new'`; no `record_status` flips (Rule #1). Blueprint emitted after load.

## 2026-06-16 - Built (a-file processed)

Final answers (a-ITSM-STARTER.md): q1 (B2-SCOPE) = a, the full entry desk (incidents + requests required;
catalog + KB + SLA optional); q2 (B2-NAME) = a, ITSM-STARTER. Both resolved; build executed (the a-file is
the approval, Rule #21).

Loader: `.tmp_deploy/build_itsm_starter_2026_06_16.ts` (idempotent; Rule #19 starter pre-flight passed). Result:
- `domain_modules` row **id 404**: ITSM-STARTER, module_kind='starter', domain_id=1 (ITSM), with buyer-voice
  catalog_tagline + catalog_description (Rule #20).
- `domain_module_data_objects`: 6 embedded shells - REQUIRED: service_incidents (47), service_requests (48);
  OPTIONAL: service_catalog_items (52), knowledge_articles (51), service_slas (53); CONSUMER: users (748).
- `skills`: 1 system skill **id 477** (`itsm_starter_system`, skill_type='system', domain_module_id=404,
  domain_id=1 anchor), Rule #19 invariant 6.
- `domain_module_tools`: 10 (all pre-existing, platform-covered): query_incidents + create_incident +
  update_incident_status + query_service_requests + create_service_request required; approve_service_request,
  query_knowledge_articles, create_knowledge_article, publish_knowledge_article, notify_person optional.
All at `record_status='new'`; no `record_status` flips (Rule #1). Semantius score 100% (10/10 platform).

Blueprint emitted and verified clean: `catalog/blueprints/itsm-starter-semantic-blueprint.md`. Required core
(incidents + requests) solid / optional (catalog, KB, SLA) dashed in the mermaid; inherited lifecycle states
cross-referenced to the canonical itsm-* masters; re-prefixed workflow gates derived (`itsm-starter:resolved_incident`,
`closed_incident`, `approved_service_request`, `publish_article`, `publish_catalog_item`, `retire_catalog_item`,
`submit_knowledge_article`); no unjustified placeholders. a-file + q-file retired (no open user decisions).

Open follow-up (non-blocking, state.yaml b3): optional `domain_module_capabilities` marketing surface.
