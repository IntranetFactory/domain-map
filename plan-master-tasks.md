# Master task list — synchronises plan-process-skill-discovery.md + plan-tools-catalog.md

> **Operational status for the two-plan effort.** Plan files are the design intent (stable); this file is the volatile state.
>
> The plan files own *what we're building* and *why*. This file owns *what's done* and *what's next*. Don't duplicate status into the plan files — they're pure design docs.

## How to use this file

- Tick checkboxes here as work completes
- Update only this file for status; the plan files are stable design docs
- The wave structure shows cross-plan staging. The asymmetric dependency (P2.5B depends on P1.7) is the only hard cross-plan blocker — everything else parallelises

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked

---

## Wave 0 — SKILL.md prep (do before Wave 1)

> The `domain-map-analyst` SKILL.md is the contract a fresh session opens. Today it doesn't know about `processes`, `trigger_events`, Phase D, the trigger-event ownership rule, the custom-process naming convention, the APQC PCF framework, or the future `solution_kind` column. Without these updates, the Wave-1 agent will reproduce avoidable friction. All edits here are to [`.claude/skills/domain-map-analyst/SKILL.md`](.claude/skills/domain-map-analyst/SKILL.md) and its [`references/`](.claude/skills/domain-map-analyst/references/) folder.

### S0.1 — Add new entities to "Module at a glance"
- [ ] Add `processes` row to the Core concepts table (hierarchical, source_framework discriminator, APQC PCF backbone)
- [ ] Add `trigger_events` row to the Core concepts table (controlled vocabulary tied to data_objects, used by `cross_domain_handoffs`)
- [ ] Update the entity count in the section header (currently "21 entities" → 23)

### S0.2 — Add Phase D to the workflow
- [ ] Extend the workflow intro: "Phase A (market shape) + Phase B (data-object footprint) + Phase C (organisational-function coverage) + **Phase D (process-skill discovery)** are all default."
- [ ] Add Phase D as workflow step subsection: covers the discovery procedure that derives ranked process-skill candidates from handoff clusters + APQC PCF mapping. Point at [`plan-process-skill-discovery.md`](../../../plan-process-skill-discovery.md) for the full procedure.
- [ ] Update the anti-pattern list: add "Stopping after Phase A+B+C and not running Phase D" (where applicable — Phase D requires Phase B to be reasonably complete for a domain cluster).

### S0.3 — Codify trigger-event ownership rule + custom-process naming
- [ ] Add to data-object research section: **"One event, many subscribers"** named pattern. When a single trigger fires from one domain to multiple targets, all subscriber handoff rows reference the SAME `trigger_events.id`. Event semantics live in one place; integration metadata lives on the per-edge handoff row.
- [ ] Add to classification heuristics: **Custom process naming convention** — `CUSTOM-<CLUSTER>-<SHORT-NAME>` for any `processes` row with `source_framework='custom'`.

### S0.4 — Add APQC PCF reference subsection
- [ ] New subsection under "Function spine" (or sibling-level): "Process framework — APQC PCF"
- [ ] Document the `source_framework` enum values (`apqc_pcf_cross_industry`, industry placeholders, `custom`)
- [ ] Document the `external_id` field (carries the PCF ID for any `apqc_pcf_*` row)
- [ ] Point at the repo-level `LICENSE-APQC-PCF.md` for attribution handling
- [ ] Note: the cross-industry PCF v8 is loaded; industry-specific PCFs (Banking, Pharma, Telecom) are placeholder enum values for future loads

### S0.5 — Flag forthcoming `solution_kind` column
- [ ] Add to the `solutions` entity description in `references/module-shape.md`: a note that **after Plan 2 P2.2 deploys, `solutions` will gain a `solution_kind` enum** (`semantius_native` / `external_connector` / `action` / `compute_service` / `standard_solution`)
- [ ] When the column is added, this section transitions from "forthcoming" to documenting the live column
- [ ] Cross-reference [`plan-tools-catalog.md`](../../../plan-tools-catalog.md) for the full semantics

---

## Wave 1 — Foundations (Plan 1 only; no cross-plan dependencies)

### P1.1 — Entity design (processes, trigger_events)
- [ ] Add `processes` entity to `domain_map` module with the schema from [`plan-process-skill-discovery.md` § processes entity](plan-process-skill-discovery.md#processes-entity--concrete-schema)
- [ ] Add `trigger_events` entity to `domain_map` module
- [ ] Verify in UI: `https://tests.semantius.app/domain_map/processes` and `/trigger_events` render
- [ ] Update [`module-shape.md`](.claude/skills/domain-map-analyst/references/module-shape.md) with the two new entities

### P1.2 — APQC PCF reference load
- [ ] Drop `K016808_APQC Process Classification Framework (PCF) - Cross-Industry - Excel Version 8.0.xlsx` into `references/` (absolute path passed to the parser)
- [ ] Create [`LICENSE-APQC-PCF.md`](LICENSE-APQC-PCF.md) at the repo root with the full APQC attribution text
- [ ] Write Excel parser (TS loader). Flatten the 5-level hierarchy. Set `source_framework='apqc_pcf_cross_industry'`, `external_id=<PCF ID>`, `hierarchy_level=<1-5>`, `parent_process_id=<resolved at level N-1>`
- [ ] Run parser. Confirm count is ~250-300; spot-check a level-3 row and a level-5 leaf
- [ ] Bulk-stamp `record_status='approved'` once review confirms the parse is clean
- [ ] Audit query: `SELECT hierarchy_level, COUNT(*) FROM processes GROUP BY hierarchy_level ORDER BY hierarchy_level`

### P1.3 — Trigger-events vocabulary
- [ ] Inventory the `trigger_event` strings on the 11 existing `cross_domain_handoffs` rows
- [ ] Draft ~80 events covering the existing 11 plus forward-looking events (`employee.*`, `offer.*`, `requisition.*`, `incident.*`, `change.*`, `license.*`, `lead.*`, `opportunity.*`, `contract.*`, `invoice.*`, etc.)
- [ ] Each draft row: `event_name`, `data_object_id` (FK), `from_state` (text), `to_state` (text), `description`, `event_category`
- [ ] Surface draft for review before bulk insert

### P1.4 — Migrate existing handoffs to FK
- [ ] Add `trigger_event_id` column (FK to `trigger_events`) on `cross_domain_handoffs`
- [ ] Map each of the 11 existing handoffs to its `trigger_events.id`
- [ ] Drop the old string `trigger_event` column once all rows are migrated
- [ ] Verify: `SELECT COUNT(*) FROM cross_domain_handoffs WHERE trigger_event_id IS NULL` returns 0

---

## Wave 2 — Substrate completion + tools-catalog parallel start

> Wave 2 items run in parallel once Wave 1 is done. **P1.5* and P2.* are mutually independent** — only P2.5B (Wave 4) depends on P1.7 (Wave 3).

### P1.5a–e — Phase-B handoff backfill (per cluster)
- [ ] **P1.5a** HR cluster (HCM, ATS, Onboarding, Payroll, BEN-ADMIN, COMP-MGMT, TALENT-MGMT, LMS, PA, SWP, WFM)
- [ ] **P1.5b** Finance cluster (ERP-FIN, EPM, AP-AUTO, EXPENSE, SUB-MGMT, FINOPS)
- [ ] **P1.5c** Procurement cluster (S2P, SUP-LIFE, CLM, VMS, ESIGN)
- [ ] **P1.5d** Sales cluster (CRM, CPQ, SALES-ENG, SALES-PERF, REV-INTEL, GTM-PLAN, ACCT-PLAN, PRM)
- [ ] **P1.5e** Customer cluster (CSM, CCAAS, CONV-AI, FSM, LOYALTY, SUB-MGMT inbound)
- *(each cluster pass also creates missing `trigger_events` rows for events not yet in the vocabulary)*

### S1.5 — Capture handoff-load patterns in SKILL.md (after each cluster)
- [ ] After each `P1.5*` cluster: review any **new high-friction shapes** that emerged. SKILL.md documents 5 canonical shapes today; expect 2-3 more from across-cluster discovery (e.g. payroll-bank reconciliation, supplier-onboarding, claims-to-payout). Add to the existing list.
- [ ] After each cluster: append any **new trigger-event categories** that emerged to the `event_category` enum (currently `lifecycle` / `state_change` / `threshold` / `signal`)
- [ ] After each cluster: append any **cluster-specific quirks** to anti-patterns (e.g. "in HR cluster, `employee.created` fans to 4+ subscribers — never collapse")

### P2.1 — Tools catalog model design
- [ ] Use `semantic-model-analyst` skill to produce `tool-catalog-semantic-model.md`
- [ ] Confirm entities: `tools` (JSON-RPC function signatures, with `operation_kind` + optional `data_object_id`) + `skills` (first-class entity per q1)
- [ ] Confirm junctions: `tool_solutions` (N:M to `domain_map.solutions`, with `delivery_strength` + `delivery_method` + optional `endpoint_url`); `skill_tools` (with `requirement_level` + notes)
- [ ] Include in the spec: add `solution_kind` enum column to `domain_map.solutions` (`semantius_native` / `external_connector` / `action` / `compute_service` / `standard_solution`)
- [ ] All other open questions resolved in [`plan-tools-catalog.md` § Closed questions](plan-tools-catalog.md#closed-questions) — no design decisions outstanding

### P2.2 — Deploy tools catalog model
- [ ] Use `semantic-model-deployer` against `tool-catalog-semantic-model.md`
- [ ] Apply the `solution_kind` enum addition to `domain_map.solutions`; backfill all existing rows to `solution_kind='standard_solution'`
- [ ] Verify in UI: `https://tests.semantius.app/tool_catalog/tools`, `/skills`, `/tool_solutions`, `/skill_tools` render
- [ ] Generate `references/module-shape.md` for the new module
- [ ] **Bootstrap `tool-catalog-analyst` skill** at `.claude/skills/tool-catalog-analyst/SKILL.md` covering: the module's two entities (`tools` + `skills`) and two junctions (`tool_solutions` + `skill_tools`); the `operation_kind` enum; the `solution_kind` semantics on the sibling `domain_map.solutions`; the "100% Semantius" query and its diagnostic companion; cross-module FK patterns. Mirror the structure of `domain-map-analyst` (Hard rules, Module at a glance, Workflow). Reference [`plan-tools-catalog.md`](plan-tools-catalog.md) for the design rationale.

### S2.2 — Update `domain-map-analyst` SKILL.md for the `solution_kind` addition
- [ ] Transition the `solution_kind` note from "forthcoming" (S0.5) to documenting the live column
- [ ] Add per-value semantics + when-to-set guidance
- [ ] Add cross-module reference: tool requirements live in `tool_catalog`, queryable via cross-module joins (see the new `tool-catalog-analyst` SKILL.md)
- [ ] Add an anti-pattern: "don't load tool-shaped capability rows in `domain_map.capabilities` — that's `tool_catalog.tools` territory; the catalog stays business-shaped"

### P2.3 — `tools` vocabulary
- [ ] Draft ~40 `tools` (JSON-RPC functions) with `operation_kind` set: `send_email`, `query_invoices`, `create_calendar_event`, `post_chat_message`, `make_phone_call`, `send_sms`, `run_shell_command`, `transcribe_audio`, `search_web`, `read_pdf`, `execute_payment`, `sign_document`, `generate_image`, `store_blob`, `extract_entities`, `web_scrape`, etc.
- [ ] Set `data_object_id` FK for `query`/`mutate` operations (e.g. `query_invoices` → `invoices` data_object)
- [ ] Include three Semantius pseudo-tools (`semantius_crud`, `semantius_cube`, `semantius_jsonlogic`) so they participate in the matrix uniformly
- [ ] Surface draft for review before bulk insert
- [ ] Load idempotently
- [ ] Stamp `record_status='approved'` once review confirms vocab is clean

### P2.4 — `tool_solutions` matrix + `solution_kind` promotions
- [ ] List the ~30 solutions that source tools: Microsoft 365 (`action`), Google Workspace (`action`), Slack (`action`), Twilio (`action`), DocuSign (`action`), Stripe (`action`), OpenAI Platform (`compute_service`), Anthropic API (`compute_service`), Playwright (`compute_service`), SAP S/4HANA (`external_connector`), Oracle NetSuite (`external_connector`), Workday HCM (`external_connector`), Salesforce CRM (`external_connector`), Semantius itself (`semantius_native`), etc.
- [ ] Add a Semantius solution row to `domain_map.solutions` if not present (vendor: Semantius); promote to `solution_kind='semantius_native'`
- [ ] PATCH existing `domain_map.solutions` rows to their right `solution_kind` (most stay `standard_solution`; the ~30-50 in the list above get promoted to `external_connector` / `action` / `compute_service`); add new solutions for tool sources not yet in the catalog (AWS SES, Playwright, etc.)
- [ ] For each tool, insert `tool_solutions` rows linking to every solution that delivers it, with `delivery_strength` + `delivery_method` + optional `endpoint_url`
- [ ] Surface draft for review before bulk insert

### P2.5A — System-skill `skill_tools` (independent of Plan 1)
- [ ] For each domain in `domain_map` (~100 domains), draft `skill_tools` rows for the hypothetical system skill
- [ ] Derive each row from: domain's `data_objects` masters + outbound handoffs + typical workflow patterns
- [ ] Insert rows with `requirement_level` (`required` / `optional` / `fallback`) and a one-line workflow-context note
- [ ] **Order suggestion:** 100%-Semantius hypothesis candidates first (GRC, AUDIT, APM, CMDB, SPM, DCG, DQ, MDM, PA, SWP, EPM, ESG) — fastest confirm/refute of the killer hypothesis
- [ ] Then obvious-non-Semantius (ITSM, HCM, ATS, MA, SMM, CCAAS, ESIGN, PAYROLL, S2P, B2C-COMM, LMS)
- [ ] Then the remaining mid-confidence domains

### P2.6-preview — "100% Semantius" query (system skills only)
- [ ] Author the saved cube query per [`plan-tools-catalog.md` § "100% Semantius" identification](plan-tools-catalog.md#100-semantius-identification): skills whose every required tool has a `semantius_native` solution delivery
- [ ] Verify ≥5 system skills certified as 100% Semantius
- [ ] Also save the diagnostic query (which tools force a skill out of 100% Semantius)
- [ ] Save both queries to a `references/` folder for reuse

### S2.5A — Codify tool-requirement derivation patterns in `tool-catalog-analyst` SKILL.md
- [ ] After P2.5A populates ~10+ domains' `skill_tools` rows, document the recurring derivation patterns: "system skills mastering external data_objects → external_connector tools"; "domains with email/calendar handoffs → action tools"; "domains with AI-flavored capabilities → compute_service tools"
- [ ] Capture the order heuristic (100%-Semantius hypothesis candidates first) and any surprises that emerged

---

## Wave 3 — Process discovery payoff (Plan 1)

### P1.6 — Discovery cube query
- [ ] Author the saved cube view per the [Discovery procedure](plan-process-skill-discovery.md#discovery-procedure-the-payoff) (trigger-event-prefix bucketing + APQC PCF name-match + aggregate metrics)
- [ ] Validate output structure: ranked list with `process_name`, `apqc_pcf_id`, `handoff_count`, `domain_count`, `function_count`, `friction_score`
- [ ] Add the saved query to `.claude/skills/domain-map-analyst/references/` for reuse

### S1.6 — Capture discovery query as SKILL.md reference
- [ ] Reference the saved query from `domain-map-analyst` SKILL.md's Phase D section (S0.2)
- [ ] Add a "How to interpret discovery output" subsection with one or two illustrated examples

### P1.7 — First discovery run + candidate selection
- [ ] Run the discovery query against the loaded substrate
- [ ] Verify ≥10 candidates, ≥3 with the top-3 success-criteria shape (≥3 domains, ≥3 functions, ≥4 handoffs, ≥1 high-friction handoff)
- [ ] Surface the ranked list with proposed top 2-3 to materialise as process skills
- [ ] Document the chosen top 2-3 in a follow-up plan file (e.g. `plan-process-skill-<name>.md`, one per chosen process)

### S1.7 — Capture discovery patterns in SKILL.md
- [ ] After the first run, document patterns that emerged: which clustering signals dominated; which APQC mappings were clean vs needed manual review; which buckets needed `custom` process rows; any cluster that surprised
- [ ] Refine the clustering-signal section if any signal proved unreliable in practice

---

## Wave 4 — Process-skill tool requirements + final roadmap

### P2.5B — Process-skill tool requirements (depends on P1.7)
- [ ] [!] **Blocked until P1.7 surfaces candidate list**
- [ ] For each top-N process candidate, enumerate the workflows the process skill would own
- [ ] For each workflow, identify required tools (query/mutate/side_effect/compute) — create new `tools` rows if needed
- [ ] Insert `skill_tools` rows for each process skill
- [ ] Surface the per-process tool-requirement maps for review

### P2.6-full — "100% Semantius" re-run with process skills
- [ ] Re-run the saved query after P2.5B is populated
- [ ] Produce the final certified list (system skills + process skills)

### P2.7 — Tool gap roadmap
- [ ] Query: which `tools` have the most dependent `skill_tools` rows? (highest-leverage tools to integrate)
- [ ] Query: which `tools` have many dependent skills but **few candidate solutions delivering them**? (gaps)
- [ ] Surface top 5 gaps for next-step tool-integration decision

### S2.7 — Final knowledge capture in both SKILL.md files
- [ ] In `tool-catalog-analyst` SKILL.md: document the tool-gap heuristics (which tool kinds are usually under-represented; which solutions tend to be missing)
- [ ] In `domain-map-analyst` SKILL.md: cross-link from any domain-shaped query that benefits from joining to `tool_catalog` (e.g. "show me domains whose system skill is 100% Semantius certified")
- [ ] Update `module-shape.md` and references on both sides with anything that emerged late in the load

---

## Cross-cutting (any phase)

> Wave 0 (S0.*) + the post-phase **S** items above are the **scheduled** SKILL.md maintenance points. These below are the **opportunistic** maintenance: things you do *while* you're in the file for another reason.

- [ ] Update [`SKILL.md`](.claude/skills/domain-map-analyst/SKILL.md) anti-patterns when an unexpected mistake surfaces (don't wait for a scheduled S-item)
- [ ] Update [`module-shape.md`](.claude/skills/domain-map-analyst/references/module-shape.md) immediately when fields/enums change
- [ ] Same opportunistic update rule applies to `tool-catalog-analyst` SKILL.md once it exists (P2.2 bootstraps it; S2.2/S2.5A/S2.7 are the scheduled updates)

---

## Dependency notes

- **Wave 0 (S0.*) blocks Wave 1.** Without the SKILL.md updates, the agent doing Wave 1 work doesn't know the `processes`/`trigger_events` entities or the new conventions. Run S0.1–S0.5 first.
- **P2.* (Wave 2) runs in parallel with P1.5* (Wave 2).** P2.1–P2.4 don't depend on any handoff data. P2.5A derives system-skill tool requirements from existing `domain_map` data (`data_objects` + `cross_domain_handoffs`), so it only needs Wave 1 done.
- **P2.5B is the only hard cross-plan dependency.** It requires P1.7 (process candidates surfaced) before workflows can be enumerated per process skill.
- **P2.6 ("100% Semantius") is re-runnable.** A first preview after P2.5A produces the certified list for system skills; the full version comes after P2.5B.
- **S-items** (SKILL.md maintenance) are interspersed: S1.5 (after each P1.5 cluster), S2.2 (after tool_catalog deploys), S1.6 / S1.7 (after discovery), S2.5A (after system-skill tool requirements), S2.7 (final). They're each small but cumulative — skipping them strands hard-won patterns.
- **Recommended start order:** Wave 0 (~0.5 session for SKILL.md prep) → Wave 1 (~3 sessions) → Wave 2 in parallel (P1.5* + P2.1-2.5A + interspersed S-items, ~8-9 sessions total) → Wave 3 (~2 sessions) → Wave 4 (~2-3 sessions). **Total: ~16-21 sessions across both plans.**

---

## Source documents

- [`plan-process-skill-discovery.md`](plan-process-skill-discovery.md) — Plan 1 design intent (entities, schema, sequence, success criteria)
- [`plan-tools-catalog.md`](plan-tools-catalog.md) — Plan 2 design intent (tool_catalog module, schema, sequence, success criteria)
