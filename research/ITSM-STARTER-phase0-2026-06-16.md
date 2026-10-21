# ITSM-STARTER (lite service desk) - Phase 0 vendor surface

Date: 2026-06-16. Scope: a single-domain starter that embeds a lightweight subset of ITSM's own
masters (a "lite service desk"), distinct from the cross-domain IT-OPS-STARTER (which spans ITSM + HAM
+ SMP + ITAM + SAM and leads with the renewal/contract spine). The market question Phase 0 answers:
where do entry-tier IT service desks draw the line between "in the starter" and "pay to upgrade"?

## Flagship vendors (entry-tier / starter service desks)

| Vendor | Entry tier surveyed | What the entry tier ships | What is held for the upgrade |
|---|---|---|---|
| Freshservice (Freshworks) | Starter plan | Incident management, service catalog/request, knowledge base, SLA management | Problem, change, release, project (Growth & Pro) |
| ManageEngine ServiceDesk Plus | Standard edition | Incident + request, self-service portal, knowledge base, SLA | Problem, change, asset, project (Professional / Enterprise) |
| Jira Service Management (Atlassian) | Free plan | Request management, incident management, KB (Confluence), SLAs, queues | Heavier change/problem depth, asset (Insight), advanced automation |
| Zendesk (employee/IT service) | Suite Team | Tickets (incident+request unified), Help Center (KB), SLAs, triggers | Native problem/change absent; not an ITIL desk |
| Spiceworks Cloud Help Desk | Free | Tickets only (+ basic inventory) | Everything else (it is the thin floor) |

ManageEngine ServiceDesk Plus Standard edition is the cleanest "the vendor itself sells the starter
line" signal: Standard *is* incident + request + self-service portal + KB + SLA, and you pay up to
Professional/Enterprise for problem, change, and asset. Freshservice Starter draws the same line.

## Surface matrix (entity x what the entry tier includes)

| Entity (ITSM master) | Freshservice Starter | ManageEngine Standard | JSM Free | Zendesk | Spiceworks | Verdict |
|---|---|---|---|---|---|---|
| `service_incidents` | core | core | core | core (ticket) | core | **Core - required** |
| `service_requests` | core | core | core | core (ticket) | thin | **Core - required** |
| `service_catalog_items` | yes | yes | yes | partial | no | **Common - optional** |
| `knowledge_articles` | yes | yes | yes (Confluence) | yes (Help Center) | no | **Common - optional** |
| `service_slas` | yes | yes | yes | yes | no | **Common - optional** |
| `service_problems` | upgrade | Pro edition | upgrade | absent | absent | **Excluded (upgrade)** |
| `service_changes` | upgrade | Pro/Ent edition | upgrade | absent | absent | **Excluded (upgrade)** |
| event / alert handling | upgrade/separate | separate | Ops product | absent | absent | **Excluded (upgrade)** |
| hardware/software assets | add-on | Pro edition | Insight (sep) | absent | basic inventory | **Out of scope (IT-OPS-STARTER / HAM)** |

## Per-decision verdict

1. **Required core = `service_incidents` + `service_requests`.** Every entry desk pairs both; they are
   the irreducible helpdesk. Spiceworks (tickets only) and Zendesk (unified ticket) confirm the floor
   is the ticket, not the surrounding tooling. Both ship `required` so the starter cannot deploy empty
   (the Rule #14 coherent-deployable smell that IT-OPS-STARTER's q-file fixed).
2. **Common-optional layer = `service_catalog_items`, `knowledge_articles`, `service_slas`.** Freshservice
   Starter, ManageEngine Standard, and JSM Free all bundle catalog + KB + SLA at the entry tier; the
   thinner desks (Spiceworks/Zendesk) drop one or two. Optional shells match the market: a tiny team
   turns them on when ready, a larger one has them day one.
3. **Excluded (the upgrade path) = `service_problems`, `service_changes`, event/alert, agent
   workspace/reporting.** Uniformly the paid tier across all five vendors. In our catalog these are the
   full `itsm-*` modules (ITSM-PROBLEM-MGMT, ITSM-CHANGE-MGMT, ITSM-EVENT-MGMT, ITSM-AGENT-WORKSPACE) a
   maturing org installs alongside; the starter's embedded shells demote to consumers when they land.
4. **Assets are out of scope entirely.** Hardware/software/SaaS registers are IT-OPS-STARTER's and HAM's
   job. This is the deliberate seam: ITSM-STARTER is the service desk; IT-OPS-STARTER is the register
   spine; they compose (a tenant can deploy both, sharing the `service_incidents`/`service_requests`
   shells which dedupe at deploy time).

## Modularization hypothesis

One `module_kind='starter'` row, `domain_id=1` (ITSM, single-domain so it anchors to its host like
HIRING-STARTER / CSA-STARTER / TRAINING-RECORDS-STARTER). Embedded shells: `service_incidents`,
`service_requests` (required); `service_catalog_items`, `knowledge_articles`, `service_slas` (optional);
`users` (consumer, platform built-in). No lifecycle authored (inherited from canonical masters, Rule #19
invariant 3). Re-prefixed workflow gates for the embedded workflow entities (`service_incidents`,
`service_requests`, `knowledge_articles` are operational_workflow) materialize as `itsm-starter:*` per
Rule #19 invariant 4. One module-anchored system skill deriving from the starter's own
`domain_module_tools` (Rule #19 invariant 6).
