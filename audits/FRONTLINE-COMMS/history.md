# FRONTLINE-COMMS audit history

## 2026-06-14, Phase 0 + build (promote-as-domain)

### Summary

Triage candidate FRONTLINE-COMMS (Frontline / Deskless Worker Communication Platform), mention count 3 (WFM, INTRANET, RET-STORE audits). Ran Phase 0 vendor-surface research (report: `.tmp_deploy/FRONTLINE-COMMS-phase0-2026-06-14.md`), reached verdict **promote-as-domain**, and built Phases A / B / C / S / E live at `record_status='new'`. Domain id 180.

### Catalog overlap check (live, CLI)

- INTRANET (126) already claims the COMMS slice: capability 146 "Frontline and Deskless Worker Communications" (kiosk, SMS, supervisor cascade), 141 targeted news + mandatory-read ack, 143 mobile app; catalog copy says it reaches "desk-based and frontline workers". Buyer = Internal Comms / HR. No modules loaded. This is the office-comms publishing platform whose reach extends to the frontline, NOT the ops-led frontline platform.
- WFM (59) owns the shift record and swap mechanic (capability 31 shift scheduling includes swap; 312 scheduling/dispatch). FRONTLINE-COMMS owns the swap CONVERSATION and hands the approved swap to WFM-SCHEDULING (195).
- RET-STORE (48) owns retail-only task management (unbuilt: 0 modules). FRONTLINE-COMMS task push spans manufacturing / healthcare / hospitality and is the worker-facing surface; completed tasks hand off to store ops.
- EMP-EXP (62) is survey listening only (no recognition, no broadcast). No overlap with broadcast or recognition-as-feed.
- WorkJam (solution 256) was mis-shelved on WFM (59) + RET-STORE (48); its flagship IS frontline comms/ops. Staffbase / Simpplr / Firstup correctly stay on INTRANET (comms-led).

### Point-solution-market test: PASS

Five INDEPENDENT pure-plays whose flagship is frontline/deskless worker comms+ops: WorkJam (Canada, ~$167M raised), YOOBIC (UK), Speakap (Netherlands), Flip (Germany), Blink (UK). Suite absorptions (Beekeeper -> LumApps merger Jul 2025 ~$1B; Workvivo -> Zoom 2023; Crew -> Square/Block 2019; Workpop -> Cornerstone 2018) confirm the category is real enough that suites buy in; they do not collapse it. The unifying "frontline digital workplace" wedge (mobile-first comms + task/checklist execution + shift-swap conversations + microlearning + recognition, bought by store/plant ops for workers with no corporate email) is not folded whole into any single existing domain.

M&A corrections to candidate metadata: "Crew -> Cornerstone" was an integration partnership, not an acquisition (Crew was acquired by Square/Block 2019; Cornerstone's frontline play came from Workpop 2018). "Beekeeper -> Zoom" is wrong: Beekeeper merged with LumApps (2025).

### Build (live, record_status='new')

- Phase A: domain 180 (7 metadata fields + buyer-voice catalog UX); 5 capabilities (broadcast messaging, task/checklist execution, shift-swap conversations, microlearning, recognition) + capability_domains; 2 full modules FRONTLINE-COMMS-BROADCAST-ENGAGEMENT (366) + FRONTLINE-COMMS-TASK-EXECUTION (367) + 5 domain_module_capabilities; 5 vendors (WorkJam reused id 165; added Beekeeper AG, YOOBIC Ltd, Speakap B.V., Flip GmbH) + 5 solutions + 5 solution_domains (all primary on FRONTLINE-COMMS).
- Phase B: 10 masters (frontline_broadcasts, frontline_message_channels, content_acknowledgements, frontline_recognitions, frontline_tasks, frontline_checklists, shift_swap_requests, frontline_learning_modules, frontline_learning_completions, frontline_task_submissions); 13 DMDO (10 master + employees consumer on both modules + work_shifts consumer on task module); 9 aliases; 14 data_object_relationships (intra-domain + 7 users edges + employees/work_shifts consume edges); 14 lifecycle states on the 3 operational_workflow masters (broadcasts, tasks, shift_swap_requests); 6 trigger_events; 4 outbound handoffs (shift_swap.approved -> WFM-SCHEDULING; task.completed -> RET-STORE; broadcast.published -> INTRANET; recognition.given -> EMP-EXP); 1 handoff_processes tag (broadcast handoff -> APQC 7.8.3 Deliver employee communications).
- Phase C: business_function_domains — Human Resources (3) owner, Business Operations (34) consumer, Workforce Management (40) contributor, Manufacturing Operations (48) consumer.
- Phase S: 1 domain-grain system skill frontline-comms-system (skill_type=system, domain_id=180, domain_module_id=NULL); 16 new tools (query/mutate per master at coverage_tier=platform) + reused notify_person (913) / notify_team (914) / receive_webhook (896); 20 domain_module_tools (notify abstractions prominent per the comms-heavy default).
- Phase E: 3 personas (Frontline Communications Admin under HR; Frontline Manager and Frontline Worker cross-functional); 6 role_modules (2-module floor met on every persona); wired published-state lifecycle gate process_id=7.8.3; 3 process_raci on 7.8.3 (admin R, manager A, worker I).

### Notes audit (Rule #15)

Verified zero non-empty `notes` across every touched table (solutions, vendors, solution_domains, DMDO, relationships, aliases, lifecycle states, domain_module_tools, role_modules, handoffs, capability_domains, domain_module_capabilities, business_function_domains). All M&A / predecessor / merger facts live in `description` fields (vendors/solutions), never in `notes`.

### Open items

Surfaced to the user (q-FRONTLINE-COMMS.md): (1) confirm the promote-vs-fold call; (2) approve re-shelving WorkJam (256) onto FRONTLINE-COMMS as primary (additive solution_domains edge, keep its existing WFM/RET-STORE edges) and the comms-led intranet vendors staying on INTRANET. Non-blocking b3: research the deeper substrate (open_shifts as a distinct master, frontline_surveys, document_libraries) that flagship vendors also model.

### Cross-domain follow-ups (gap-report, not notes)

- RET-STORE (48) and INTRANET (126) are unbuilt (0 modules), so the task.completed -> RET-STORE and broadcast.published -> INTRANET handoffs carry NULL `target_domain_module_id` (legitimate per the B9 authoring rule: counterparty not yet modularized). Backfill when those domains are modularized.
- EMP-EXP (62) recognition.given inbound handoff: target_domain_module_id left NULL; EMP-EXP's modules are listening-only (no recognition module), so this is owed when EMP-EXP scopes a recognition surface (likely a separate RECOGNITION domain candidate).
