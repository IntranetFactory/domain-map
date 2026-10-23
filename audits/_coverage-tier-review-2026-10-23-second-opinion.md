# Coverage tier review: second opinion (2026-10-23)

Input: `audits/_coverage-tier-review-2026-10-23.csv` (2,065 rows, all currently `coverage_tier = semantius`). Judged against the nine-tier set: `semantius_crud`, `semantius_workflow`, `semantius_platform`, `business_logic`, `agent_native`, `agent_common`, `agent_first`, `vendor_platform`, `external`. Read-only: no catalog writes, the CSV is unchanged.

## Summary

**What I reviewed**
- **`reviewed` rows (200, not 196):** read all 200 one by one, including all 51 `business_logic` rows. Thin descriptions were checked against the live `tools` rows.
- **`verb` rows (796):** read every name and description. I found about 75 that looked suspicious and judged those closely.
- **`rule` rows (1,069 `query` tools):** keyword-scanned all names and descriptions (141 hits) and read a random sample of 45. All of them are plain reads.
- **Domain sanity check:** the proposed tiers, joined to the 119 tools that are not `semantius`, across 100 domains through `domain_module_tools`.

**Disagreements: 98 rows** (31 `reviewed`, 67 `verb`, 0 `rule`)

| from -> to | count |
|---|---|
| semantius_crud -> semantius_workflow | 25 |
| semantius_crud -> business_logic | 15 |
| semantius_workflow -> business_logic | 13 |
| semantius_crud -> semantius_platform | 7 |
| semantius_crud -> external | 6 |
| semantius_workflow -> vendor_platform | 6 |
| semantius_workflow -> external | 5 |
| semantius_workflow -> semantius_crud | 5 |
| business_logic -> vendor_platform | 3 |
| semantius_crud -> vendor_platform | 3 |
| semantius_workflow -> agent_first | 3 |
| business_logic -> semantius_workflow | 2 |
| business_logic -> semantius_crud | 2 |
| semantius_crud -> agent_native | 2 |
| business_logic -> agent_first | 1 |

Of these, 68 move a tool into or out of the Semantius tiers, so they change the scores. The other 30 are swaps between `semantius_crud` and `semantius_workflow` and don't change the scores.

**Main finding: the proposal is inconsistent with itself.** The rows it reviewed were judged by "does this write or keep several records consistent?". The verb rows never got that check. The same pattern lands in different tiers:
- `create_dockage_invoice` is `business_logic`, but `create_order`, `create_purchase_order` and `create_goods_receipt` are `semantius_crud`.
- `complete_milking` is `business_logic`, but `record_fuel_sale` ("draw it down against tank inventory") is crud.
- `post_recurring_charge` is `business_logic`, but `record_pos_transaction` ("post it to a register or boater account") and `create_rent_payment` are crud.
- `commit_resource_allocation` is `business_logic`, but the capacity-bound `create_activity_booking` and `create_str_reservation` are crud.
- `terminate_site` is `business_logic`, but `replace_equipment` ("forwards warranty and contract coverage") is crud.
- `complete_background_check` is `business_logic`, but `close_service_project` ("revenue fully recognized") is workflow.

The second pattern goes the other way. Tools whose descriptions name an outside action were kept in a Semantius tier because "the record is the tool":
- `grant_entitlement` / `revoke_entitlement` ("via SCIM/API")
- `sync_str_channel`
- `transmit_carrier_feed`
- `deploy_mobile_app`
- `submit_court_filing` ("via ECF")
- `create_trip_booking` ("ticket a fare")
- `start_process_instance`

The fix for these is to split each one into a Semantius state change plus a separate outside-call tool. Labeling the combined tool `semantius_*` overstates coverage.

**Platform services: yes, the `semantius_platform` tier is needed. Here is what I verified:**
- **`crud sendEmail`** exists on both the CLI and the `crud` MCP server (`.claude/skills/use-semantius/references/crud-tools.md` § sendEmail). It sends transactional mail: to/cc/bcc, text/html, sender defaults to the user, or a verified Semantius sending domain.
- **Webhook receivers** exist as a built-in table (`webhook_receivers`). The live fields show:
  - `auth_type` can be `none`, `hmac` (Standard Webhooks) or `header` (a static named header).
  - An optional `jsonata` field transforms the payload.
  - Each receiver targets one table, and receiver logs are kept.
  - So a third-party payload can be reshaped into one table without any adapter.
- None of this is CRUD, a state transition, or customer-built logic, so it doesn't fit any of the existing tiers.

**Tools that belong in `semantius_platform`** (7 rows, all in the CSV):
- `send_email` (high)
- `receive_webhook` (high)
- `receive_scanner_callback` (high)
- `receive_crawler_completion` (high)
- `receive_cdp_segment_update` (medium: re-evaluating journeys afterwards is a separate step)
- `ingest_external_completion` (medium: the receiver lands the payload, but the description says it lands in two tables, which needs a `business_logic` follow-up)
- `notify_person` (see the verdict below)

**Tools that do not belong there:**
- `ingest_xapi_statement` -> `external`. xAPI content expects a conformant LRS (statements resource, version header, voiding, batch arrays). A receiver that lands rows in one table is not an LRS.
- Among the 119 tools outside `semantius`, none qualify:
  - `invoke_webhook` and `publish_webhook`: Semantius documents no outbound HTTP or webhooks.
  - `store_blob`: no file store is documented.
  - `receive_email`, `receive_sms`: no inbound mail or SMS is documented.

**`notify_person` verdict: `semantius_platform`, medium confidence.** The tool's contract is "one recipient, any channel". Email is enough to meet it. Looking up the recipient's address is a plain read, and `sendEmail` is shipped on both surfaces. The catalog's own description says it waits for a "dispatcher (recipient lookup + channel routing)". That condition is stricter than the contract needs: channel routing is only required when a particular channel is required, and then the skill should link `send_sms` / `post_chat_message` directly.

Caveat: `send_email` is linked from MA, which needs bulk marketing sends (suppression lists, unsubscribe, volume). `sendEmail` is transactional. MA needs its own bulk-send tool, which would be `agent_first`.

**Gaps in the definitions:**
1. **The catalog will reject the new tiers today.** Validation rule 99009 (`semantius_coverage_when_query_or_mutate`) still requires `coverage_tier = 'semantius'` for every `query`/`mutate` tool, and the enum has none of the new values. Every `business_logic` move on a `mutate` tool will be refused until the rule and enum are rewritten.
2. **No tier covers time-triggered work.** Examples: scheduled publish, SLA clocks, `escalate_overdue`, `expire_certification`. Semantius documents no scheduler, so these only work if the agent runs on a schedule. Decide explicitly whether that counts as `semantius_workflow` (agent-triggered) or `business_logic`.
3. **Weaker receiver auth for some senders.** Senders with their own signature schemes (for example Stripe-Signature) can only be checked through `header` or `none`. That is weaker, but it still counts as `semantius_platform`.

**Verdict on the verb rule: usable as a first pass, not acceptable alone.**
- 37 of 796 verb rows (4.6%) are in the wrong tier family, and 30 more are crud/workflow swaps.
- The misses cluster tightly:
  - `create_*` that copies lines, totals or inventory
  - `record_*` / `create_*` that posts to an account or stock balance
  - `assign_*` / `launch_*` to a cohort
  - `create_*` from a template
  - workflow verbs whose description names SCIM, ECF, EDI, a scanner, an engine, "push" or "sync"
- **Add a keyword pass over descriptions.** Words to catch: inventory, balance, account, post, ledger, cohort, template, every/all, via, push, sync, engine, run, refresh. That pass would have caught almost every miss. Run it before trusting the verb rule.
- `update_*` -> crud is the second weak spot: 25 `update_*` tools are described as stage advances or "workflow gate".

**`query` rule: sound.** No `query` row does work beyond reading. The real problem is upstream. Many queries read engine output that no tool in the catalog produces: attrition forecasts, incident predictions, anomaly detections, intent detections, DORA and flow metrics, engagement scores, user risk scores, merit recommendations, property valuations, workforce cost projections. Those domains are missing their computing tools; see the last section.

## Disagreements

| tool_name | proposed_tier | my_tier | confidence | reason |
|---|---|---|---|---|
| plan_delivery_route | business_logic | agent_first | high | A vehicle-routing solve, same shape as `optimize_route`, which is already agent_first; no ledger or invariant involved |
| run_process_simulation_run | business_logic | vendor_platform | medium | Discrete-event process simulation is an engine, not a multi-record consistency problem |
| resolve_identity | business_logic | vendor_platform | medium | Probabilistic identity stitching over event streams is the CDP's proprietary core; the merge is only the last step |
| evaluate_decision_table | business_logic | vendor_platform | low | DMN/FEEL evaluation with hit policies is a rules engine that writes one result row; not a multi-record write |
| evaluate_scenario_plan | business_logic | semantius_workflow | medium | "Freeze" is a locked state on the plan; children enforce it by reading the parent by id (`set_record`); no copy needed |
| approve_project_time_rollup | business_logic | semantius_workflow | medium | A period lock is exactly the "posting period must be open" case: each time entry validates against its period record |
| compute_project_revenue_recognition | business_logic | semantius_crud | low | A compute tool that writes nothing; POC = aggregate of cost to date / estimate x value, an analytics read (the posting twin stays business_logic) |
| prepare_lease_disclosure | business_logic | semantius_crud | low | Maturity tables are sums over existing lease schedules (analytics) stored in one record; the schedules are the business_logic part |
| convert_lead | semantius_workflow | business_logic | medium | Creates account, contact and opportunity and closes the lead in one call; a partial run leaves duplicates |
| renew_legal_contract | semantius_workflow | business_logic | low | Creates the successor and transitions the predecessor: two writes that must succeed together |
| amend_legal_contract | semantius_workflow | business_logic | low | Creates the amendment and rewrites the contract's effective terms in one step |
| transfer_support_session | semantius_workflow | vendor_platform | medium | Transferring a live voice/chat session is the CCaaS routing engine (ACD), not a record transition |
| transmit_carrier_feed | semantius_workflow | external | high | Sending an 834 eligibility feed to carriers is EDI/SFTP; the catalog already puts EDI and file transfer in external |
| verify_identity | semantius_workflow | external | medium | "Run an identity verification" calls a contracted IDV/KYC provider; the gate is incidental |
| sync_str_channel | semantius_crud | external | high | Pushing rates and availability to OTAs is a channel-manager integration; its twin `sync_channel_availability` is external |
| send_str_guest_message | semantius_crud | external | medium | "Record and send": the send goes through OTA messaging APIs that need partner or channel-manager access |
| deploy_mobile_app | semantius_crud | external | medium | Purpose is the device push (APNs MDM / Android Enterprise); recording the assignment is `assign_mobile_app` |
| file_regulator_filing_export | semantius_crud | external | low | "File" is a regulator submission, which the catalog treats as external everywhere else |
| ingest_xapi_statement | semantius_crud | external | medium | xAPI sources expect a conformant LRS endpoint, which a one-table webhook receiver is not |
| deploy_process_definition | semantius_crud | vendor_platform | medium | "Deploy to the engine": without a process engine nothing runs; the record is incidental |
| refresh_app_benchmark | semantius_crud | vendor_platform | medium | Benchmark prices are proprietary SaaS-spend datasets; the refresh is the fetch, not the store |
| validate_scorm_package | semantius_crud | agent_native | medium | Unzipping and checking `imsmanifest.xml` is a code-sandbox job; storing the result is trivial |
| create_disclosure_document | semantius_crud | agent_native | medium | The description is "generate from a state-specific template"; generation is the work |
| score_interaction_evaluation | semantius_crud | business_logic | low | No description; a QA scorecard score is a weighted sum over answer rows. Write the description first |
| send_email | semantius_crud | semantius_platform | high | `crud sendEmail` shipped on CLI and MCP; not CRUD |
| receive_webhook | semantius_crud | semantius_platform | high | `webhook_receivers` built-in with auth and JSONata transform, one target table |
| receive_scanner_callback | semantius_crud | semantius_platform | high | Single-table landing via a receiver (JSONata reshapes the scanner payload) |
| receive_crawler_completion | semantius_crud | semantius_platform | high | Same as above |
| receive_cdp_segment_update | semantius_crud | semantius_platform | medium | Landing is a receiver; re-evaluating journeys afterwards is separate logic |
| ingest_external_completion | semantius_crud | semantius_platform | medium | Receiver lands it; the stated two-table landing (assignments + evidence) needs a business_logic follow-up |
| notify_person | semantius_crud | semantius_platform | medium | Any-channel contract is met by email (address lookup is a read, `sendEmail` shipped); see summary |
| grant_entitlement | semantius_workflow | external | medium | "Writes to the target application via SCIM/API": per-app provisioning connectors; split into transition + side effect |
| revoke_entitlement | semantius_workflow | external | medium | "Removes access in the target application via SCIM/API"; same as grant |
| submit_court_filing | semantius_workflow | external | medium | "Via ECF": court e-filing is certified or contracted access |
| remediate_iam_access_policy | semantius_workflow | agent_first | medium | Applies a correction in cloud IAM; the hyperscalers publish MCP servers |
| block_shadow_app | semantius_workflow | agent_first | low | Blocking "at the network and SSO layer" is an IdP/SWG policy write |
| activate_audience_segment | semantius_workflow | agent_first | low | Pushes a segment to ad and marketing tools, like `push_ad_platform_campaign`; materializing it is also a many-record run |
| release_dlp_quarantine_item | semantius_workflow | vendor_platform | medium | The quarantined item lives in the DLP or mail gateway; release/destroy is that engine's action |
| launch_vulnerability_scan | semantius_workflow | vendor_platform | medium | Launching a scan needs a scanner engine (and the row has no description) |
| start_process_instance | semantius_workflow | vendor_platform | medium | Instantiating and executing a BPMN process (tokens, timers, gateways) is the engine runtime |
| signal_process_instance | semantius_workflow | vendor_platform | medium | Message correlation to waiting instances is engine runtime |
| resolve_process_incident | semantius_workflow | vendor_platform | low | "Resume the affected instance" is engine runtime |
| confirm_wholesale_order | semantius_workflow | business_logic | high | "Reserves inventory and posts AR": stock and receivable balances across records |
| promote_environment | semantius_workflow | business_logic | high | Copies schema and content from one environment to another: a bulk multi-record run |
| schedule_content_release | semantius_workflow | business_logic | medium | Publishes all grouped entries together at a future time: atomic multi-record publish plus a timer |
| initiate_recall | semantius_workflow | business_logic | medium | Walks lot genealogy to find affected lots and records them: traversal plus many writes |
| launch_compliance_training_campaign | semantius_workflow | business_logic | medium | Launch creates one assignment per targeted learner: a batch run |
| grade_assessment_attempt | semantius_workflow | business_logic | medium | Auto-grading sums item scores across response rows (free-text items need agent_native) |
| award_advocacy_points | semantius_workflow | business_logic | medium | Award/debit points is a ledger with a running balance |
| approve_advocacy_reward_redemption | semantius_workflow | business_logic | medium | "Approve and fulfill" debits the points balance, which must not go negative |
| close_service_project | semantius_workflow | business_logic | low | Gate needs "revenue fully recognized": a check across child rows, same as `complete_background_check` |
| submit_iga_access_request | semantius_workflow | business_logic | low | SoD pre-check compares the request against all of the user's entitlements and SoD rules |
| schedule_interview | semantius_workflow | semantius_crud | low | "Create / schedule an interview" is a record create, not a transition |
| elect_benefit_enrollment | semantius_workflow | semantius_crud | low | "Record an employee's plan election" is a create |
| raise_quality_incident | semantius_workflow | semantius_crud | low | "Open a new incident" is a create |
| propose_data_classification | semantius_workflow | semantius_crud | low | Proposing creates a draft row |
| award_learner_badge | semantius_workflow | semantius_crud | low | Creates a badge award row |
| create_order | semantius_crud | business_logic | high | Order from checkout: copies lines, totals, discounts, tax, decrements inventory |
| record_fuel_sale | semantius_crud | business_logic | high | "Draw it down against tank inventory": same shape as `complete_milking` |
| record_pos_transaction | semantius_crud | business_logic | high | "Post it to a register or boater account": same shape as `post_recurring_charge` |
| create_goods_receipt | semantius_crud | business_logic | medium | Updates received quantities on PO lines and stock; feeds the three-way match |
| create_rent_payment | semantius_crud | business_logic | medium | Charges and payments against a tenant ledger balance |
| replace_equipment | semantius_crud | business_logic | medium | Forwards warranty and contract coverage to the replacement: a cascade like `terminate_site` |
| create_activity_booking | semantius_crud | business_logic | medium | Booking "against one or more departures" must hold capacity across departures |
| create_str_reservation | semantius_crud | business_logic | medium | No overlapping stays per listing (cross-row exclusion) plus a nightly-rate sum |
| create_onboarding_journey | semantius_crud | business_logic | medium | "Instantiating a plan template" generates stages and tasks |
| assign_compliance_training | semantius_crud | business_logic | medium | Assigning to a cohort means one assignment row per learner |
| create_slip_reservation | semantius_crud | business_logic | low | Same no-double-booking constraint on a slip |
| assign_learning_path | semantius_crud | business_logic | low | "To an employee or cohort": the cohort case is a batch |
| update_unused_ticket_credit | semantius_crud | business_logic | low | Reapplying residual value moves a balance between records (the airline exchange itself is external) |
| create_purchase_order | semantius_crud | business_logic | low | Header total over lines plus budget encumbrance; the opposite call from `create_dockage_invoice` |
| create_trip_booking | semantius_crud | external | medium | "Hold or ticket a fare" is a GDS/NDC booking; `fetch_air_inventory` is already external |
| update_predictive_model | semantius_crud | vendor_platform | medium | "Refresh a predictive model's outputs" is a model run, not an edit |
| flag_conflict | semantius_crud | semantius_workflow | high | Description says "Workflow gate" |
| flag_for_review | semantius_crud | semantius_workflow | high | Description says "Lifecycle-gate workflow tool" |
| update_referral_status | semantius_crud | semantius_workflow | high | Description says "Workflow gate" |
| update_ict_provider_register | semantius_crud | semantius_workflow | high | Description says "(workflow gate)" |
| update_real_estate_listing | semantius_crud | semantius_workflow | high | "Workflow gate at status transitions" |
| update_real_estate_transaction | semantius_crud | semantius_workflow | high | "Workflow gate at contingency clearance" |
| update_change_status | semantius_crud | semantius_workflow | high | Advances through CAB states including approve |
| update_trip_approval | semantius_crud | semantius_workflow | high | Approve or reject a pre-trip authorization |
| update_incident_status | semantius_crud | semantius_workflow | medium | Stage advance (new/in_progress/resolved/closed) |
| update_problem_status | semantius_crud | semantius_workflow | medium | Stage advance (known_error, resolved, closed) |
| update_opportunity_stage | semantius_crud | semantius_workflow | medium | Pipeline stage advance |
| update_order_status | semantius_crud | semantius_workflow | medium | Lifecycle advance through refunded |
| update_application_stage | semantius_crud | semantius_workflow | medium | Candidate pipeline stage advance |
| update_dlp_incident_status | semantius_crud | semantius_workflow | medium | Triage, investigation, remediation, closure |
| update_onboarding_journey | semantius_crud | semantius_workflow | medium | "Advance through its lifecycle states" |
| update_audit_report | semantius_crud | semantius_workflow | medium | Draft / reviewed / issued is a gated lifecycle |
| mutate_veterinary_lab_result_review | semantius_crud | semantius_workflow | medium | "Advance its review state" |
| update_corrective_actions | semantius_crud | semantius_workflow | low | "Create or update ... including lifecycle transitions": split into crud + workflow |
| update_ehs_audits | semantius_crud | semantius_workflow | low | Same combined edit+lifecycle tool |
| update_ehs_inspections | semantius_crud | semantius_workflow | low | Same |
| update_ehs_risk_assessments | semantius_crud | semantius_workflow | low | Same |
| update_environmental_permits | semantius_crud | semantius_workflow | low | Same |
| update_hazards | semantius_crud | semantius_workflow | low | Same |
| update_industrial_hygiene_samples | semantius_crud | semantius_workflow | low | Same |
| update_safety_incidents | semantius_crud | semantius_workflow | low | Same |

## Domains that look incomplete or mislabeled

These are the proposed tiers joined to the live `domain_module_tools` (primary modules only).

**Structural:** 339 CSV tools have no primary domain link, so they enter no domain score at all. They include the whole payroll set (`create_pay_run`, `generate_pay_slips`, `file_tax_return`, `query_payroll_journal_entries`), procurement (`create_purchase_order`, `create_goods_receipt`), GRC/audit, ESG, MDM (`merge_records`), e-signature (`send_envelope`) and people analytics. The domain sanity check cannot see them.

- **UEM** (16 crud / 9 workflow, nothing else but `notify_team`): every device action (enroll, deploy app, wipe, compliance evaluation, retire) is device-bound, yet all of them are labeled Semantius. This is the clearest mislabel in the catalog.
- **IGA** (13 / 18, nothing else): SCIM/connector provisioning is labeled workflow, and SoD detection and certification-campaign generation have no tool.
- **PROCESS-ORCHESTRATION**: the process engine runtime (start, signal, deploy, resume) is labeled crud/workflow; only the decision table was pulled out.
- **LCAP** (16 / 7, nothing else): the low-code runtime that executes apps and workflows is the product, and every tool is a record write.
- **SMP** (29 / 52, only `sign_document` outside): SaaS discovery from SSO/expense/browser feeds, usage-based optimization and benchmarks are the product. All are Semantius; discovery ingest is missing and `refresh_app_benchmark` is mislabeled.
- **CCAAS** (10 crud): ACD routing, IVR and live transfer have no engine tool; `transfer_support_session` and `set_agent_state` are mislabeled, and `receive_voice_call` (external) is not linked.
- **B2C-COMM** (21 crud / 1 workflow): `create_order` is mislabeled, and tax calculation, the promotion/pricing engine and inventory reservation have no tools at all (the catalog has no tax-calculation tool anywhere).
- **LOYALTY** (5 crud, reads only): points accrual, tier qualification, redemption and expiry are ledger business_logic with no tool.
- **EPM** (8 crud): no consolidation, allocation or driver-based forecast calculation; `update_forecast` only writes a number someone else computed.
- **GTM-PLAN** (10 crud): territory carving and quota/capacity modeling are the computation, and none exists.
- **AIOPS** (9 / 3): reads `query_anomaly_detections` and `query_incident_predictions`, but no correlation, anomaly or prediction engine produces them.
- **DATA-AI-PLAT** (9 crud): a data and AI platform with zero compute (no pipeline run, training, embedding or query engine); `query_semantic_metrics` should be `deliver_metric_query` (vendor_platform).
- **ABM-PLATFORM** (7 crud): intent data (external), engagement scoring (vendor_platform) and ad orchestration (agent_first) are missing; `query_account_engagement_scores` reads output of nothing.
- **MA** (9 crud): no journey execution over many contacts, no bulk marketing send (`sendEmail` is transactional) and no scoring model; `score_lead` only writes a score.
- **VSM** (12 crud): DORA, flow metrics and bottleneck detection are "computed" per the query descriptions, but no compute tool exists.
- **HCM** (18 crud): `query_absence_balances` reads balances nothing accrues (no accrual run), and payroll is unlinked (see Structural).
- **TALENT-MGMT** (9 crud): merit/comp planning against budgets is business_logic with no tool; `query_merit_recommendations` has no producer.
- **EXPENSE** (7 crud): receipt OCR (agent_native), policy audit, mileage/per diem and the reimbursement batch are missing.
- **SPEND-MGMT** (8 crud): card issuing and real-time authorization controls (external) and card reconciliation are missing.
- **CWM** (7 crud): timesheet-to-invoice consolidation and rate-card markup are missing.
- **RE-INVEST** (8 crud): valuation (DCF/IRR), distribution waterfalls and fund accounting are missing; `query_property_valuations` has no producer.
- **RE-PROP-MGMT** (16 / 1): tenant ledger, late-fee runs and owner disbursements are missing; `create_rent_payment` is mislabeled.
- **RE-CRE** (8 crud): CAM reconciliation and rent escalations are missing.
- **FMIS** (24 crud): machinery telemetry ingest (external) and variable-rate prescription generation (agronomic model, vendor_platform) are missing.
- **TELEMATICS** (8 crud): device telemetry ingest (external) and driver safety scoring (vendor_platform) are missing.
- **CMDB** (7 crud): discovery and identification/reconciliation are missing (`reconcile_asset_identity` exists only under ITAM).
- **ITOM** (9 / 3): discovery and event correlation are missing; `ingest_event_stream` is not linked.
- **DLP** (11 / 2): the content-inspection engine and endpoint/network enforcement are missing; `release_dlp_quarantine_item` is mislabeled.
- **ITSM / CSM**: SLA clocks (business-hour calendars, pause/resume, breach timers) have no tool, and Semantius documents no scheduler.
- **LMS** (98 / 50, 1 business_logic): cohort assignment, auto-enrollment rule runs and campaign launches are batch runs labeled crud/workflow; `ingest_xapi_statement` needs an LRS.
- **TRAVEL-MGMT** (17 crud): `create_trip_booking` is the GDS booking and is labeled crud.
- **STR-MGMT**: `sync_str_channel` and `send_str_guest_message` are channel-manager integrations labeled crud.
- **FIN**: the 8 business_logic tools are right, but consolidation, FX revaluation and accruals have no tools.
