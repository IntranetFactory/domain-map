# CCaaS (Contact Center as a Service, id 98) full-build draft

**Domain one-liner:** Cloud platform that brings voice and every digital channel into unified queues, routes each interaction to the best-fit agent, captures and scores it, and keeps the operation staffed and on target. The platform IS the engine (ACD, IVR runtime, recording, analytics).

## What already exists (reused, not re-proposed)
- 6 masters: `support_sessions` (workflow), `contact_records` (record), `queue_statistics` (computed), `ccaas_call_recordings` (workflow), `agent_states` (workflow), `disposition_codes` (catalog).
- 1 capability: `SLA-MGMT` (cross-cutting). Kept as-is; not re-listed in the new CCAAS-prefixed set.
- 8 trigger_events, 6 outbound handoffs (CSM, CRM, WFM), 5 inbound handoffs (CONV-AI, KMS, WSC), the `ccaas-system` skill, and owner = Contact Center Operations.
- Vendors already in catalog (reused by name): Genesys, NICE, Five9, Talkdesk, 8x8, Twilio, Cisco, AWS, Zoom, Microsoft.

## Deltas in this draft

### Capabilities (7 new, plus the kept SLA-MGMT = 8 total realized)
`CCAAS-OMNI-ROUTE` (Omnichannel Routing and Queueing), `CCAAS-IVR-SELF` (IVR and Self-Service Flows), `CCAAS-AGENT-DESK` (Agent Desktop and Interaction Handling), `CCAAS-REC-CAPTURE` (Interaction Recording and Capture), `CCAAS-QM-COACH` (Quality Management and Coaching), `CCAAS-RT-ANALYTICS` (Real-Time and Historical Analytics), `CCAAS-WEM-ADHERE` (Workforce Engagement and Adherence). All noun-phrases, domain-prefixed, none cross-cutting.

### Module split (3 full modules)
- **CCAAS-ROUTING (Routing and Queues):** the always-on engine. Masters `queue_statistics`, `disposition_codes`; contributor `contact_records`; consumes CRM `customers`, KMS `knowledge_base_articles`. Realizes OMNI-ROUTE + IVR-SELF.
- **CCAAS-DESKTOP (Agent Desktop and Interactions):** the live work surface. Masters `support_sessions`, `contact_records`, `agent_states`; consumes `disposition_codes`, `customers`, WFM `agent_schedules`. Realizes AGENT-DESK + WEM-ADHERE.
- **CCAAS-QUALITY (Quality and Analytics):** after-the-fact review. Masters `ccaas_call_recordings`, plus new `interaction_evaluations` and `evaluation_forms`; consumes `contact_records`, `support_sessions`, `queue_statistics`. Realizes REC-CAPTURE + QM-COACH + RT-ANALYTICS.

Every existing master is assigned; every capability is realized by >=1 module.

### Vendors / solutions
No new vendors (all exist). 9 new flagship solution rows, all reusing existing vendor_name: Genesys Cloud CX, NICE CXone, Five9 Intelligent CX Platform, Amazon Connect, Talkdesk CX Cloud (primary); Webex Contact Center, Twilio Flex, 8x8 Contact Center (secondary); Zoom Contact Center (partial).

### New data objects (2)
`interaction_evaluations` (operational_workflow; submit-lock + single-approver) and `evaluation_forms` (catalog). No re-master of CRM `customers` or WFM schedules: those stay consumer links.

### Lifecycle states (4 sets)
Added for the 3 workflow masters that had none: `support_sessions` (queued -> ... -> completed/abandoned, escalation gated), `ccaas_call_recordings` (recording -> ... -> purged, purge gated), `agent_states` (logged_out -> ... -> logged_out_end). Plus the new `interaction_evaluations` (draft -> ... -> calibrated, completed/calibrate gated).

### Tools (13) + module_tools (16) + personas (5)
Query + representative mutate per master. **Voice is intrinsic:** `make_phone_call` (side_effect) and `transcribe_audio` (compute) are justified as workflow-specific to routing/recording, not generic notifications. Personas: Agent, Supervisor, Quality Analyst, Operations Manager, Flow Administrator (all under Contact Center Operations, each touching >=2 modules).

## Top decisions for the human
1. **MODULE-SPLIT (gating):** recommend the 3-way split above over 2-way or 4-way.
2. **WFM-OWNERSHIP:** recommend keeping WFM scheduling/forecasting in the WFM domain; CCaaS masters only `agent_states` and consumes schedules for adherence (matches existing WFM handoffs).
3. **EVAL-FORMS-MASTER:** recommend mastering `evaluation_forms` as an optional versioned catalog (flagship vendors model it).
4. **DISPOSITION-OWNER-MODULE:** recommend Routing owns the `disposition_codes` catalog; Desktop consumes it at wrap-up.
