# 102 changed tools (v1 -> v2)

Fill in the last column: `ok`, or the tier you want.

| # | tool | v1 | v2 | confidence | reason | your tier |
|---|---|---|---|---|---|---|
| 1 | amend_legal_contract | semantius_workflow | **business_logic** | low | Creates the amendment and rewrites the contract's effective terms in one step | |
| 2 | assign_learning_path | semantius_crud | **business_logic** | low | "To an employee or cohort": the cohort case is a batch | |
| 3 | close_service_project | semantius_workflow | **business_logic** | low | Gate needs "revenue fully recognized": a check across child rows, same as `complete_background_check` | |
| 4 | create_purchase_order | semantius_crud | **business_logic** | low | Header total over lines plus budget encumbrance; the opposite call from `create_dockage_invoice` | |
| 5 | create_slip_reservation | semantius_crud | **business_logic** | low | Same no-double-booking constraint on a slip | |
| 6 | renew_legal_contract | semantius_workflow | **business_logic** | low | Creates the successor and transitions the predecessor: two writes that must succeed together | |
| 7 | score_interaction_evaluation | semantius_crud | **business_logic** | low | No description; a QA scorecard score is a weighted sum over answer rows. Write the description first | |
| 8 | submit_iga_access_request | semantius_workflow | **business_logic** | low | SoD pre-check compares the request against all of the user's entitlements and SoD rules | |
| 9 | update_unused_ticket_credit | semantius_crud | **business_logic** | low | Reapplying residual value moves a balance between records (the airline exchange itself is external) | |
| 10 | approve_advocacy_reward_redemption | semantius_workflow | **business_logic** | medium | "Approve and fulfill" debits the points balance, which must not go negative | |
| 11 | assign_compliance_training | semantius_crud | **business_logic** | medium | Assigning to a cohort means one assignment row per learner | |
| 12 | award_advocacy_points | semantius_workflow | **business_logic** | medium | Award/debit points is a ledger with a running balance | |
| 13 | convert_lead | semantius_workflow | **business_logic** | medium | Creates account, contact and opportunity and closes the lead in one call; a partial run leaves duplicates | |
| 14 | create_activity_booking | semantius_crud | **business_logic** | medium | Booking "against one or more departures" must hold capacity across departures | |
| 15 | create_goods_receipt | semantius_crud | **business_logic** | medium | Updates received quantities on PO lines and stock; feeds the three-way match | |
| 16 | create_onboarding_journey | semantius_crud | **business_logic** | medium | "Instantiating a plan template" generates stages and tasks | |
| 17 | create_rent_payment | semantius_crud | **business_logic** | medium | Charges and payments against a tenant ledger balance | |
| 18 | create_str_reservation | semantius_crud | **business_logic** | medium | No overlapping stays per listing (cross-row exclusion) plus a nightly-rate sum | |
| 19 | grade_assessment_attempt | semantius_workflow | **business_logic** | medium | Auto-grading sums item scores across response rows (free-text items need agent_native) | |
| 20 | initiate_recall | semantius_workflow | **business_logic** | medium | Walks lot genealogy to find affected lots and records them: traversal plus many writes | |
| 21 | launch_compliance_training_campaign | semantius_workflow | **business_logic** | medium | Launch creates one assignment per targeted learner: a batch run | |
| 22 | replace_equipment | semantius_crud | **business_logic** | medium | Forwards warranty and contract coverage to the replacement: a cascade like `terminate_site` | |
| 23 | schedule_content_release | semantius_workflow | **business_logic** | medium | Publishes all grouped entries together at a future time: atomic multi-record publish plus a timer; time-triggered via the agent's cron, but the publish is an atomic multi-record run | |
| 24 | confirm_wholesale_order | semantius_workflow | **business_logic** | high | "Reserves inventory and posts AR": stock and receivable balances across records | |
| 25 | create_order | semantius_crud | **business_logic** | high | Order from checkout: copies lines, totals, discounts, tax, decrements inventory | |
| 26 | promote_environment | semantius_workflow | **business_logic** | high | Copies schema and content from one environment to another: a bulk multi-record run | |
| 27 | record_fuel_sale | semantius_crud | **business_logic** | high | "Draw it down against tank inventory": same shape as `complete_milking` | |
| 28 | record_pos_transaction | semantius_crud | **business_logic** | high | "Post it to a register or boater account": same shape as `post_recurring_charge` | |
| 29 | evaluate_decision_table | business_logic | **vendor_platform** | low | DMN/FEEL evaluation with hit policies is a rules engine that writes one result row; not a multi-record write | |
| 30 | resolve_process_incident | semantius_workflow | **vendor_platform** | low | "Resume the affected instance" is engine runtime | |
| 31 | deploy_process_definition | semantius_crud | **vendor_platform** | medium | "Deploy to the engine": without a process engine nothing runs; the record is incidental | |
| 32 | launch_vulnerability_scan | semantius_workflow | **vendor_platform** | medium | Launching a scan needs a scanner engine (and the row has no description) | |
| 33 | refresh_app_benchmark | semantius_crud | **vendor_platform** | medium | Benchmark prices are proprietary SaaS-spend datasets; the refresh is the fetch, not the store | |
| 34 | release_dlp_quarantine_item | semantius_workflow | **vendor_platform** | medium | The quarantined item lives in the DLP or mail gateway; release/destroy is that engine's action | |
| 35 | resolve_identity | business_logic | **vendor_platform** | medium | Probabilistic identity stitching over event streams is the CDP's proprietary core; the merge is only the last step | |
| 36 | run_process_simulation_run | business_logic | **vendor_platform** | medium | Discrete-event process simulation is an engine, not a multi-record consistency problem | |
| 37 | signal_process_instance | semantius_workflow | **vendor_platform** | medium | Message correlation to waiting instances is engine runtime | |
| 38 | start_process_instance | semantius_workflow | **vendor_platform** | medium | Instantiating and executing a BPMN process (tokens, timers, gateways) is the engine runtime | |
| 39 | transfer_support_session | semantius_workflow | **vendor_platform** | medium | Transferring a live voice/chat session is the CCaaS routing engine (ACD), not a record transition | |
| 40 | update_predictive_model | semantius_crud | **vendor_platform** | medium | "Refresh a predictive model's outputs" is a model run, not an edit | |
| 41 | file_regulator_filing_export | semantius_crud | **external** | low | "File" is a regulator submission, which the catalog treats as external everywhere else | |
| 42 | create_trip_booking | semantius_crud | **external** | medium | "Hold or ticket a fare" is a GDS/NDC booking; `fetch_air_inventory` is already external | |
| 43 | deploy_mobile_app | semantius_crud | **external** | medium | Purpose is the device push (APNs MDM / Android Enterprise); recording the assignment is `assign_mobile_app` | |
| 44 | grant_entitlement | semantius_workflow | **external** | medium | "Writes to the target application via SCIM/API": per-app provisioning connectors; split into transition + side effect | |
| 45 | ingest_xapi_statement | semantius_crud | **external** | medium | xAPI sources expect a conformant LRS endpoint, which a one-table webhook receiver is not | |
| 46 | revoke_entitlement | semantius_workflow | **external** | medium | "Removes access in the target application via SCIM/API"; same as grant | |
| 47 | send_str_guest_message | semantius_crud | **external** | medium | "Record and send": the send goes through OTA messaging APIs that need partner or channel-manager access | |
| 48 | submit_court_filing | semantius_workflow | **external** | medium | "Via ECF": court e-filing is certified or contracted access | |
| 49 | verify_identity | semantius_workflow | **external** | medium | "Run an identity verification" calls a contracted IDV/KYC provider; the gate is incidental | |
| 50 | sync_str_channel | semantius_crud | **external** | high | Pushing rates and availability to OTAs is a channel-manager integration; its twin `sync_channel_availability` is external | |
| 51 | transmit_carrier_feed | semantius_workflow | **external** | high | Sending an 834 eligibility feed to carriers is EDI/SFTP; the catalog already puts EDI and file transfer in external | |
| 52 | activate_audience_segment | semantius_workflow | **agent_first** | low | Pushes a segment to ad and marketing tools, like `push_ad_platform_campaign`; materializing it is also a many-record run | |
| 53 | block_shadow_app | semantius_workflow | **agent_first** | low | Blocking "at the network and SSO layer" is an IdP/SWG policy write | |
| 54 | remediate_iam_access_policy | semantius_workflow | **agent_first** | medium | Applies a correction in cloud IAM; the hyperscalers publish MCP servers | |
| 55 | plan_delivery_route | business_logic | **agent_first** | high | A vehicle-routing solve, same shape as `optimize_route`, which is already agent_first; no ledger or invariant involved | |
| 56 | escalate_overdue | semantius_workflow | **agent_common** | high | user decision: time-triggered work runs on the agent's cron; the transition itself is one record | |
| 57 | expire_certification | semantius_workflow | **agent_common** | high | user decision: time-triggered work runs on the agent's cron; the transition itself is one record | |
| 58 | notify_person | semantius_crud | **agent_common** | high | user decision: any-channel notification belongs to the agent's Workspace / Microsoft 365 connectors | |
| 59 | schedule_content_entry | semantius_workflow | **agent_common** | high | user decision: time-triggered publish runs on the agent's cron; one entry | |
| 60 | schedule_iga_access_certification | semantius_workflow | **agent_common** | high | user decision: the campaign start is time-triggered by the agent's cron (generating the review items has no tool yet) | |
| 61 | create_disclosure_document | semantius_crud | **agent_native** | medium | The description is "generate from a state-specific template"; generation is the work | |
| 62 | validate_scorm_package | semantius_crud | **agent_native** | medium | Unzipping and checking `imsmanifest.xml` is a code-sandbox job; storing the result is trivial | |
| 63 | ingest_external_completion | semantius_crud | **semantius_platform** | medium | Receiver lands it; the stated two-table landing (assignments + evidence) needs a business_logic follow-up | |
| 64 | receive_cdp_segment_update | semantius_crud | **semantius_platform** | medium | Landing is a receiver; re-evaluating journeys afterwards is separate logic | |
| 65 | receive_crawler_completion | semantius_crud | **semantius_platform** | high | Same as above | |
| 66 | receive_scanner_callback | semantius_crud | **semantius_platform** | high | Single-table landing via a receiver (JSONata reshapes the scanner payload) | |
| 67 | receive_webhook | semantius_crud | **semantius_platform** | high | `webhook_receivers` built-in with auth and JSONata transform, one target table | |
| 68 | send_email | semantius_crud | **semantius_platform** | high | `crud sendEmail` shipped on CLI and MCP; not CRUD | |
| 69 | update_corrective_actions | semantius_crud | **semantius_workflow** | low | "Create or update ... including lifecycle transitions": split into crud + workflow | |
| 70 | update_ehs_audits | semantius_crud | **semantius_workflow** | low | Same combined edit+lifecycle tool | |
| 71 | update_ehs_inspections | semantius_crud | **semantius_workflow** | low | Same | |
| 72 | update_ehs_risk_assessments | semantius_crud | **semantius_workflow** | low | Same | |
| 73 | update_environmental_permits | semantius_crud | **semantius_workflow** | low | Same | |
| 74 | update_hazards | semantius_crud | **semantius_workflow** | low | Same | |
| 75 | update_industrial_hygiene_samples | semantius_crud | **semantius_workflow** | low | Same | |
| 76 | update_safety_incidents | semantius_crud | **semantius_workflow** | low | Same | |
| 77 | approve_project_time_rollup | business_logic | **semantius_workflow** | medium | A period lock is exactly the "posting period must be open" case: each time entry validates against its period record | |
| 78 | evaluate_scenario_plan | business_logic | **semantius_workflow** | medium | "Freeze" is a locked state on the plan; children enforce it by reading the parent by id (`set_record`); no copy needed | |
| 79 | mutate_veterinary_lab_result_review | semantius_crud | **semantius_workflow** | medium | "Advance its review state" | |
| 80 | update_application_stage | semantius_crud | **semantius_workflow** | medium | Candidate pipeline stage advance | |
| 81 | update_audit_report | semantius_crud | **semantius_workflow** | medium | Draft / reviewed / issued is a gated lifecycle | |
| 82 | update_dlp_incident_status | semantius_crud | **semantius_workflow** | medium | Triage, investigation, remediation, closure | |
| 83 | update_incident_status | semantius_crud | **semantius_workflow** | medium | Stage advance (new/in_progress/resolved/closed) | |
| 84 | update_onboarding_journey | semantius_crud | **semantius_workflow** | medium | "Advance through its lifecycle states" | |
| 85 | update_opportunity_stage | semantius_crud | **semantius_workflow** | medium | Pipeline stage advance | |
| 86 | update_order_status | semantius_crud | **semantius_workflow** | medium | Lifecycle advance through refunded | |
| 87 | update_problem_status | semantius_crud | **semantius_workflow** | medium | Stage advance (known_error, resolved, closed) | |
| 88 | flag_conflict | semantius_crud | **semantius_workflow** | high | Description says "Workflow gate" | |
| 89 | flag_for_review | semantius_crud | **semantius_workflow** | high | Description says "Lifecycle-gate workflow tool" | |
| 90 | update_change_status | semantius_crud | **semantius_workflow** | high | Advances through CAB states including approve | |
| 91 | update_ict_provider_register | semantius_crud | **semantius_workflow** | high | Description says "(workflow gate)" | |
| 92 | update_real_estate_listing | semantius_crud | **semantius_workflow** | high | "Workflow gate at status transitions" | |
| 93 | update_real_estate_transaction | semantius_crud | **semantius_workflow** | high | "Workflow gate at contingency clearance" | |
| 94 | update_referral_status | semantius_crud | **semantius_workflow** | high | Description says "Workflow gate" | |
| 95 | update_trip_approval | semantius_crud | **semantius_workflow** | high | Approve or reject a pre-trip authorization | |
| 96 | award_learner_badge | semantius_workflow | **semantius_crud** | low | Creates a badge award row | |
| 97 | compute_project_revenue_recognition | business_logic | **semantius_crud** | low | A compute tool that writes nothing; POC = aggregate of cost to date / estimate x value, an analytics read (the posting twin stays business_logic) | |
| 98 | elect_benefit_enrollment | semantius_workflow | **semantius_crud** | low | "Record an employee's plan election" is a create | |
| 99 | prepare_lease_disclosure | business_logic | **semantius_crud** | low | Maturity tables are sums over existing lease schedules (analytics) stored in one record; the schedules are the business_logic part | |
| 100 | propose_data_classification | semantius_workflow | **semantius_crud** | low | Proposing creates a draft row | |
| 101 | raise_quality_incident | semantius_workflow | **semantius_crud** | low | "Open a new incident" is a create | |
| 102 | schedule_interview | semantius_workflow | **semantius_crud** | low | "Create / schedule an interview" is a record create, not a transition | |
