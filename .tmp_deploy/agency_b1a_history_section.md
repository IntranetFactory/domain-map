
## 2026-06-05 — b1a execution

Executed the agent-solvable `b1a` items from `state.yaml` against the live `domain_map`
module (tenant adenin, domain 153). Loader: `.tmp_deploy/agency_mgmt_b1a_2026_06_05.ts`
(idempotent, every write preceded by a live read; `record_status` omitted on all inserts so
the DB default `new` applies; no `notes` column written anywhere).

### B1A-AS1-EVENT-MODULE-FK — DONE

PATCHed `trigger_events.domain_module_id` (NULL -> module) on 11 events, mapped by the
event's publishing master data_object (478/479/480/485 -> 210; 481/482 -> 211; 483/484 -> 212):

| event id | event_name | data_object | NULL -> module |
|---|---|---|---|
| 338 | estimate.approved | 485 agency_estimates | 210 |
| 339 | deliverable.approved | 484 creative_deliverables | 212 |
| 340 | agency_invoice.issued | 478 agency_jobs | 210 |
| 341 | media_costs.posted | 482 insertion_orders | 211 |
| 342 | vendor_invoice.received | 482 insertion_orders | 211 |
| 525 | agency_time_entry.submitted | 479 agency_time_entries | 210 |
| 526 | agency_retainer.threshold_reached | 480 agency_retainers | 210 |
| 527 | agency_retainer.depleted | 480 agency_retainers | 210 |
| 528 | media_plan.approved | 481 media_plans | 211 |
| 529 | media_plan.executed | 481 media_plans | 211 |
| 530 | creative_brief.approved | 483 creative_briefs | 212 |

Prior value on every row: `domain_module_id = NULL`. Verify: 0 of the 11 remain NULL.

### B1A-AS3-HANDOFF-CASCADE — DONE

PATCHed the AGENCY-MGMT-side module FK on 12 cross-domain handoffs (outbound -> set
`source_domain_module_id`; inbound -> set `target_domain_module_id`), mapped by payload
data_object, except handoff 343 whose payload is `legal_contracts` (66, not an AGENCY
master) and which maps to 210 per the state.yaml `agency_estimates/legal_contracts -> 210`
rule:

| handoff | dir | null field | NULL -> module |
|---|---|---|---|
| 341 | inbound (CRM->AGENCY) | target_domain_module_id | 210 |
| 342 | inbound (CLM->AGENCY) | target_domain_module_id | 210 |
| 343 | outbound (AGENCY->CLM) | source_domain_module_id | 210 |
| 344 | outbound (AGENCY->DAM) | source_domain_module_id | 212 |
| 345 | outbound (AGENCY->ERP-FIN) | source_domain_module_id | 210 |
| 346 | outbound (AGENCY->ERP-FIN) | source_domain_module_id | 211 |
| 347 | inbound (S2P->AGENCY) | target_domain_module_id | 211 |
| 348 | inbound (HCM->AGENCY) | target_domain_module_id | 210 |
| 513 | outbound (AGENCY->PSA) | source_domain_module_id | 210 |
| 514 | outbound (AGENCY->CRM) | source_domain_module_id | 210 |
| 515 | outbound (AGENCY->PSA) | source_domain_module_id | 212 |
| 516 | outbound (AGENCY->ERP-FIN) | source_domain_module_id | 211 |

Prior value on every patched field: NULL. The opposite-side FKs that were already set
(e.g. 343 target=127, 513 target=88, 514 target=46, 348 source=54) were left untouched.
Verify: outbound NULL source-module = 0; inbound NULL target-module = 0.

### B1A-H1-REPLACE-348 — DONE

Handoff 348 (HCM employee.terminated -> agency_time_entries) carried a mismatched
`discovery_override` tag. Snapshot of the deleted row:

- `handoff_processes.id=37`, handoff_id=348, process_id=41
  ("Manage employee onboarding, training, and development", L2, external_id 20599),
  proposal_source=`discovery_override`, record_status=`new`, role=`implements`.

DELETED row 37. INSERTED replacement `handoff_processes.id=936`: handoff 348 -> process
**239 "Manage separation"** (L3, external_id 10513, parent 44 = the HR retain/separate
cluster), proposal_source=`agent_curated`, record_status=`new`, role=`implements`.
Rationale: the handoff is an employee-separation cascade (terminate the departing
employee's open time entries), which "Manage separation" describes; "Manage onboarding..."
was the inverse lifecycle phase.

### B1A-H1-APQC-REMAINDER — DONE

INSERTED 5 `handoff_processes` rows (proposal_source=`agent_curated`, record_status=`new`,
role=`implements`) on the 5 previously-untagged cross-domain handoffs. Single-confident L3
PCF matches chosen after `/processes?...source_framework=eq.apqc_pcf_cross_industry` lookups:

| hp id | handoff | source -> target | trigger_event | payload | PCF process | id / ext_id / level |
|---|---|---|---|---|---|---|
| 937 | 341 | CRM -> AGENCY | crm_opportunity.won | agency_jobs | Manage leads/opportunities | 147 / 10182 / L3 |
| 938 | 346 | AGENCY -> ERP-FIN | media_costs.posted | insertion_orders | Process accounts payable (AP) | 315 / 10756 / L3 |
| 939 | 513 | AGENCY -> PSA | agency_time_entry.submitted | agency_time_entries | Report time | 312 / 10753 / L3 |
| 940 | 514 | AGENCY -> CRM | agency_retainer.depleted | agency_retainers | Manage customers and accounts | 148 / 10183 / L3 |
| 941 | 516 | AGENCY -> ERP-FIN | media_plan.executed | media_plans | Perform general accounting | 307 / 10748 / L3 |

After this pass all 12 cross-domain handoffs on AGENCY-MGMT carry >=1 `handoff_processes`
row (H1 coverage 12/12; 0 deferred). None are `record_status='approved'` (awaiting reviewer).

### B1A-AS2-REG-ASC606 — DONE

INSERTED `domain_regulations.id=273`: {domain_id 153, regulation_id 57 (ASC 606 Revenue
Recognition, code ASC-606), applicability `mandatory`}. Confirmed `mandatory` is a live
enum value (249 catalog rows use it; `default_value` for the column is `recommended`).
Prior state: 0 domain_regulations rows on AGENCY-MGMT.

### B1A-SYSTEM-SKILLS — SKIPPED (blocked) + catalog copy DRAFTED-FOR-USER

Not executed. Two reasons:

1. **Skill split is a B2-S2 user decision.** Reconciling skill 26 against Rule #17 requires
   choosing delete-skill-26-and-author-3-fresh vs rename-skill-26-and-author-2-siblings.
   B2-S2 explicitly flags this as user-owned because it changes `skill_id` continuity for
   downstream agent references. Skipped per the skip-on-user_decision rule. The dependent
   tool-floor work (B1B-AS5 / B1B-AS6) stays blocked behind the same decision. Item kept
   OPEN in state.yaml with `blocked_by: user_decision B2-S2`.
2. **Catalog buyer copy is overwrite-protected (Rule #20).** The 3 modules' empty
   `catalog_tagline` / `catalog_description` were NOT written. Drafts below are surfaced for
   marketing review; the columns stay empty until the user approves wording per-row.

Skill 26 is still `domain_module_id IS NULL` with its 9 skill_tools (322-330) intact;
nothing was changed on `skills` / `skill_tools` / `tools` / `domain_modules`.

**DRAFTED catalog copy (buyer voice; not written — for user/marketing approval):**

- **210 AGENCY-MGMT-JOB-TRAFFIC**
  - `catalog_tagline`: "Run every client job from estimate to invoice, with live retainer burn-down and per-job profitability."
  - `catalog_description`: "Manage your agency's book of business in one place. Open client jobs, track their traffic state and deliverables, and capture time against client rate cards. Build estimates and change orders before work starts, watch retainers draw down in real time, and apply your markup and cost-plus billing rules automatically. See profitability per job and per client the moment time and costs post, then issue invoices without re-keying a thing."

- **211 AGENCY-MGMT-MEDIA-BUY**
  - `catalog_tagline`: "Plan campaigns by outlet and channel, commit budget through insertion orders, and reconcile against publisher invoices."
  - `catalog_description`: "Build media plans broken out by outlet, channel, daypart, audience, and budget, then turn approved plans into insertion orders that commit spend at negotiated rates with commission and make-good terms. When publisher invoices arrive, reconcile them against the orders so posted media costs flow straight to finance. Keep every campaign's planned-versus-actual spend in view from first plan to final reconciliation."

- **212 AGENCY-MGMT-CREATIVE-OPS**
  - `catalog_tagline`: "Take creative from brief to approved deliverable with versioned, annotated proofing and clean asset hand-off."
  - `catalog_description`: "Originate creative briefs, get them approved by the client, and author deliverables with full version history. Route each version through annotated, multi-stakeholder review and approval so feedback lands in one place instead of scattered email threads. When a deliverable is signed off, register the final version to your asset library so the approved work is always the version that ships."

### Tables written this pass

| table | operation | rows |
|---|---|---|
| trigger_events | PATCH (domain_module_id) | 11 |
| handoffs | PATCH (source/target module FK) | 12 |
| handoff_processes | DELETE | 1 (id 37) |
| handoff_processes | INSERT | 6 (ids 936, 937, 938, 939, 940, 941) |
| domain_regulations | INSERT | 1 (id 273) |

No writes to: skills, skill_tools, tools, domain_modules, data_objects,
data_object_lifecycle_states, domain_data_objects, domain_module_data_objects,
any `notes` column.

`next_action_by` recomputed to **user**: the only remaining b1a item (B1A-SYSTEM-SKILLS) is
blocked on the B2-S2 user decision, and b2 carries the open judgment calls (B2-S2 skill
split, B2-S3 pattern flags, B2-S5 lifecycle exemption, B2-S6 time-entries overlap).
