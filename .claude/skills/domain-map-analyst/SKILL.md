---
name: domain-map-analyst
description: >-
  Research, classify, and load enterprise software-market knowledge into the live
  Semantius `domain_map` module (slug `domain_map`, id 1001) — domains, capabilities,
  vendors, point solutions, and the relationships between them. Trigger whenever the
  user wants to extend the domain map with new research, classify entries as domains
  versus sub-features, find point-solution competitors for a market, audit what's
  already loaded, or push market research into the live module. Specific trigger
  phrases include "extend the domain map", "research vendors for X", "what point
  solutions exist in X", "is X a domain?", "add capabilities to Y", "load this
  research into domain_map", "what's in our domain map", "find competitors for Z".
  Also trigger when the user names a vendor, platform, or market category (e.g.
  ServiceNow, Salesforce, IGA, FinOps, vulnerability management) and wants to
  position it in the catalog or compare its coverage. Use the `use-semantius` skill
  alongside this one for the Semantius CLI mechanics.
---

# domain-map-analyst

This skill is for extending the **Domain Map** — Semantius module slug `domain_map`, id `1001`, type `master`. The Domain Map is the organisation's master catalog of enterprise software markets: domains, capabilities, vendors, point solutions, regulations, industries, data objects, and the relationships between them. It is a *master module*, meaning shared reference data that other modules build on, so every row added becomes load-bearing for downstream analysis. Take additions seriously.

For platform mechanics (CLI auth, PostgREST encoding, filter syntax, sqlToRest, cube queries), defer to the `use-semantius` skill which is expected to load alongside this one.

---

## Hard rules (read before any write)

These rules exist because they have already been broken in this project. They are non-negotiable; explain them to the user if there's pushback, don't quietly bypass them.

### 1. `record_status` on newly-researched records is `"new"`. Never `"approved"`.

`approved` means *a human has looked at this record and decided it's correct*. AI-derived research has not been looked at — it's a draft, even when it looks polished. The canonical state for freshly-loaded research is `new` (or `pending` once it's been formally surfaced for review). The default value on every `record_status` column in this module is already `"new"`, so the cleanest pattern is to **omit the field entirely** when inserting and let the database default kick in.

Only ever stamp `approved` when the user explicitly says "I've reviewed these, mark them approved" or the equivalent. The same applies to `pending` — that's a human-workflow state, not a default.

**Why this matters:** AI-generated research contains real mistakes — vendor ownership after acquisitions, product renames, market boundaries, ESG-platform vs ESG-tooling overlap. The `record_status` column is the only signal a reviewer has that a row needs eyes on it. Pre-approving everything destroys that signal and silently embeds errors into a master module that other modules build on. This rule was added after every row in the initial ServiceNow load was incorrectly marked `approved`; the user pushed back hard.

### 2. Classify by the "point-solution market" test, not by a vendor's product taxonomy.

Something is a **domain** if and only if independent point-solution vendors compete in it as a recognised software category. APM is a domain (LeanIX, Ardoq, MEGA, Software AG Alfabet, Apptio all sell into it). "Demand Management" usually isn't — it's a feature of an SPM/PPM tool. Don't promote every named workflow inside a large platform to a domain row.

When unsure, ask yourself: *can I name three independent vendors whose flagship product is this?* If yes, it's a domain. If no, capture it as a capability under a parent domain, or fold the concept into the parent domain's description.

The same test applies to ServiceNow's own taxonomy: ServiceNow markets dozens of "workflows" — some are real domains (ITSM, CSM, HRSD), some are sub-features bundled into a larger workflow (DevOps Change inside ITSM, Demand Management inside SPM, Now Assist as cross-cutting AI). Don't import the marketing taxonomy verbatim; classify each entry against the test.

### 3. Junction qualifiers live on the edges, not the cores.

`solution_domains.coverage_level` (`primary` / `secondary` / `partial`), `solution_capabilities.delivery_strength` (`native` / `partial` / `via_extension` / `not_supported`), `domain_regulations.applicability`, `domain_data_objects.role` (`master` / `contributor` / `consumer` / `derived`), `business_function_capabilities.responsibility` — these go on the junction rows, never on the parent entity. A solution covers many domains with different strengths; collapsing that onto the solution table would mean either duplicating the solution row per domain or losing the qualifier altogether. Both are wrong.

### 4. Idempotent loads via natural keys.

Every loadable entity in this module has a stable natural key:

| Entity | Natural key |
|---|---|
| `domains` | `domain_code` |
| `vendors` | `vendor_name` |
| `solutions` | `solution_name` |
| `capabilities` | `capability_code` |
| `industries` | `industry_name` (or `industry_code` if present) |
| `regulations` | `regulation_name` (or `regulation_code` if present) |
| `data_objects` | `data_object_name` |

Always follow this pattern:

1. Read existing rows by the natural key
2. Insert only the missing ones
3. Re-read to build a complete `<natural_key> → id` map for downstream foreign-key resolution

This makes re-running a load safe. Numeric IDs are only valid post-insert; never hard-code them into a script.

### 5. Use stdin or chunked inserts on Windows.

`semantius call crud postgrestRequest '...'` with a large JSON body hits the Windows command-line length limit (~32KB). The PostgREST POST in a typical load can easily blow past that. Two fixes:

- **Pipe via stdin** to the CLI: `semantius call crud postgrestRequest` reads JSON from stdin when no inline argument is supplied. Use this from Bun's `Bun.spawn` with `stdin: "pipe"`.
- **Chunk inserts** into batches of ≤50 rows. Simpler when the script is in a hurry.

The reference loader at [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts) does both. Start from it.

### 6. NEVER change cwd before invoking `semantius`. Run everything from the project root.

The `semantius` CLI reads `SEMANTIUS_API_KEY` / `SEMANTIUS_ORG` from `.env` in the **current working directory**. The project root has the correct `.env`; subfolders like `.claude/skills/domain-map-analyst/` do not. If you `cd` away from the project root before invoking the CLI (or before `bun run`-ing a loader script that spawns it), the CLI silently falls back to a default config pointing at a different tenant. Reads and writes succeed against the wrong org.

The symptoms are:

- `PGRST205 Could not find the table 'public.<table>' in the schema cache` on the first request
- `JWT audience not found, received ["tenant://<id>"]` where the tenant id doesn't match the project's tenant
- Different audience IDs on consecutive calls (load-balanced across wrong tenants)
- `getCurrentUser` returns an unexpected `email` / `semantius_org` (e.g. `admin@test.com` instead of the project user)

**Rules:**

- Never `cd` into `.claude/skills/...` or `.tmp_deploy/` before running anything that calls `semantius`.
- Invoke loader scripts with an absolute path from the project root: `bun run "<absolute-path-to-loader>"`. Never `cd <skill-folder> && bun run ...`.
- If a `semantius` call returns the symptoms above, suspect cwd before suspecting auth rotation, transient routing, or a stale schema cache.
- When in doubt, sanity-check with `semantius call crud getCurrentUser '{}'` and confirm the `email` and `semantius_org` fields match the expected project tenant.

This rule was added after the Salesforce platform load: changing cwd into the skill folder routed every call to the `tests` org user (`admin@test.com`) instead of the project's tenant. The user pushed back hard. **The skill exists to make sure this doesn't happen again — do not rediscover this gotcha.**

### 7. Surface the UI link after any meaningful write.

After loading anything, link the user to the UI for spot-checking. The URL pattern uses the lowercase module slug `domain_map`, **not** the display name "Domain Map":

```
https://tests.semantius.app/domain_map/<table_name>
```

Example: `https://tests.semantius.app/domain_map/solutions`. Without this link reviewers have no clickable starting point.

---

## The module at a glance

21 entities. Read [references/module-shape.md](references/module-shape.md) for the per-entity field shapes, enums, and FK formats before doing any write that touches a field you haven't used recently.

### Core concepts (9 entities)

| Table | Holds | Hierarchical? |
|---|---|---|
| `industries` | Industries the catalog cares about (Banking, Healthcare, Manufacturing) | yes |
| `jurisdictions` | Geographic & supranational scopes for regulations (EU, USA, Germany) | yes |
| `business_functions` | Functional roles in an org (Sales, HR, Finance, IT) | yes |
| `domains` | System-type domains (CRM, ITSM, HRIS, MDM) | yes |
| `capabilities` | What an org *can do* (Lead Mgmt, Vulnerability Scanning) | yes |
| `data_objects` | Canonical data subjects (Customer, Order, Asset, Invoice) | no |
| `solutions` | Specific products/platforms (Salesforce, ServiceNow, SAP S/4HANA) | no |
| `vendors` | Legal vendor entities (Salesforce Inc, SAP SE) | no |
| `regulations` | Compliance frameworks (HIPAA, GDPR, SOX, PCI-DSS) | no |

### Junctions with qualifiers (11 entities)

| Table | Connects | Qualifier column |
|---|---|---|
| `industry_business_functions` | industries ↔ business_functions | presence |
| `business_function_domains` | business_functions ↔ domains | responsibility |
| `business_function_capabilities` | business_functions ↔ capabilities | responsibility (owner / contributor / consumer) |
| `capability_domains` | capabilities ↔ domains | semantic home |
| `domain_data_objects` | domains ↔ data_objects | role (master / contributor / consumer / derived) |
| `domain_regulations` | domains ↔ regulations | applicability |
| `solution_domains` | solutions ↔ domains | coverage_level (primary / secondary / partial) |
| `solution_capabilities` | solutions ↔ capabilities | delivery_strength (native / partial / via_extension / not_supported) |
| `solution_data_objects` | solutions ↔ data_objects | ownership role |
| `data_object_relationships` | data_objects ↔ data_objects | cardinality + kind |
| `cross_domain_handoffs` | domains → domains (via data_object) | trigger_event + integration_pattern + friction_level. Cross-domain only — source ≠ target enforced by validation rule. Signal 2 of platform-vs-silos analysis (Signal 1 is the multi-master count on `domain_data_objects.role`) |

### Aliases (1 entity)

| Table | Purpose |
|---|---|
| `data_object_aliases` | Synonym, industry term, or solution-specific name for a data object (e.g. Customer → Patient in Healthcare, Customer → Account in Salesforce) |

---

## Workflow for any research task

For any task that fits this skill — "research vendors for X", "is Y a domain?", "load this list of competitors", "find capabilities for Z" — work in this order. Don't skip steps; each one prevents a class of mistake.

1. **Read the existing catalog first.** Always query the live module before researching new entries. Duplicates and inconsistent naming hurt the catalog more than gaps do. Pull the relevant subset (domains in this area, vendors already present, solutions covering related markets) and skim before you research.

2. **Classify before naming.** When the user introduces a new concept, apply the point-solution-market test (rule #2) before deciding which table it belongs in. State your classification reasoning briefly so the user can correct it before you start writing.

3. **Draft, don't load.** For any non-trivial addition — more than ~3 rows — draft the proposed rows as a short table or list and surface them to the user before inserting. AI research goes wrong silently; a one-message preview almost always catches at least one mistake (wrong vendor parent, wrong domain attribution, duplicate-with-different-spelling).

4. **Use natural keys, never numeric IDs.** Inside the script: build `Map<naturalKey, id>` after each insert by re-reading the table. Don't try to predict IDs.

5. **Load via the script idiom.** Even for ~20 rows, prefer extending [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts) over one-off CLI calls. The script is idempotent (safe to re-run), chunked (no Windows command-line issues), and produces a row-count summary you can paste back to the user. `.tmp_deploy/` is gitignored, so iteration is free.

6. **Verify and share.** After loading, query counts on the affected tables, compare against expected, and link the user to the UI tables that changed.

---

## Data-object research and cross-domain-handoff discovery

This is the catalog's most analytically loaded workflow — the combination of `domain_data_objects` (Signal 1) and `cross_domain_handoffs` (Signal 2) is what drives the **platform-vs-silos** question: *which clusters of domains would benefit from running on an integrated platform versus staying as point-solution silos?* Every row you add or omit here shifts that answer. Follow these steps when a user asks "create the data objects for the X domain", "what does X master", "what handoffs does X have to Y", or anything in that shape.

### Naming rules for `data_objects`

- `data_object_name` is the **natural key** and must follow Semantius entity-naming conventions: snake_case, plural (`job_requisitions`, `recruitment_sources`, `background_checks`). Treat it as if you were naming the entity in a new Semantius module — because that's exactly what the catalog claims it represents.
- `display_label` is the **human-friendly** form (`Job Requisition`, `Recruitment Source`, `Background Check`). It can drift from `data_object_name` (e.g. industry-specific renames) — that's the column's job.
- Industry-specific or solution-specific variants (`Patient` for `customers` in Healthcare, `Account` for `customers` in Salesforce) live in `data_object_aliases`, never as new `data_objects` rows.

### Phase 1 — propose the domain's data objects

1. **Find the domain.** Pull `domains` by `domain_code`. Confirm it exists and check its description.
2. **List candidate data objects.** Apply the "what does THIS domain primarily master?" test. The candidate list is what an ATS-like / CRM-like / ITSM-like vendor would build their schema around — not what the domain *touches*.
3. **Exclude foreign masters.** If a candidate is mastered by another already-loaded domain (e.g. `positions` is HCM's master, not ATS's), drop it from the primary set. Flag it for later as a *secondary*-style link once both sides are loaded; don't invent it in the wrong domain.
4. **Exclude handoff targets that belong elsewhere.** Some objects look like they belong to the domain because the domain triggers their creation — but their master lives in another domain. Onboarding Task is the canonical example: ATS triggers it via `offer.accepted`, but Onboarding (or HRSD) masters it. These become `cross_domain_handoffs` rows in Phase 3, not `data_objects` under the source domain.
5. **Surface descriptions for review.** Always show name + display_label + description in a single table before loading. The description column is where AI research goes wrong silently; reviewers need to see it.
6. **Load idempotently.** Pattern: read by `data_object_name`, insert missing only, re-read for the id map, insert `domain_data_objects` with `role: master` for the linking domain. Reference: [.tmp_deploy/load_ats_data_objects.ts](.tmp_deploy/load_ats_data_objects.ts).

### Phase 2 — identify multi-master (Signal 1)

For each data object you just loaded, ask: **which other domains in the catalog also legitimately master a slice of this?** Multi-master is normal and is one of the two strongest indicators of integration value.

- The schema allows multiple `role='master'` rows per data_object; this is by design, not an integrity bug.
- Each domain that co-masters should explain *which slice* it owns in the junction's `notes` column. "Recruiting execution: stages, candidates, interviews, offers" vs "Headcount intent: position approval, budget alignment, plan-to-actual" makes the multi-master row useful instead of ambiguous.
- Canonical multi-master examples to learn from: `job_requisitions` (ATS + Workforce Planning), `customers` (CRM + MDM + Billing), `employees` (HRIS + IAM + Payroll), `assets` (ITAM + FinOps + CMDB).
- If a co-master domain isn't in the catalog yet (Workforce Planning was missing when ATS shipped), add the domain via Phase 1 first, then link.
- Beyond `master`, the same data_object often has `contributor` rows (writes some fields without being authoritative), `consumer` rows (read-only), and `derived` rows (analytics/projections). Add these as they become known — they don't drive Signal 1 but enrich the model.

### Phase 3 — discover cross-domain handoffs (Signal 2)

For each data object, identify the **event-driven flows between two distinct domains** that involve this object. Every such flow is a pipeline / API call / human handoff today; an integrated platform would absorb them. These are the rows in `cross_domain_handoffs`.

The discovery questions, in order:

1. **What state changes on the data object?** `offer.accepted`, `incident.resolved`, `requisition.approved`, `case.closed`, `task.completed`, `application.hired`. Use dotted-lowercase noun.verb naming. These are the candidate `trigger_event` values.
2. **For each state change, which other domain reacts?** The reactor is the `target_domain`. If the reactor is the same domain (`incident.created` → `change.requested` both in ITSM), it's intra-domain — out of scope, do not record. The `cross_domain_only` validation rule enforces this and will reject the insert with a 23514.
3. **What's the integration_pattern today?** `event_stream` (Kafka/EventBridge/etc.), `api_call` (direct webhook/REST), `batch_sync` (nightly ETL), `manual_handoff` (someone copies a value), `file_drop` (CSV exchange). When unknown, default to `api_call` and flag in notes.
4. **What's the friction_level today?** `high` if the handoff regularly breaks, requires custom maintenance, or has measurable error rate. `medium` for stable but bespoke integrations. `low` for native event streams within a shared platform. Friction is the cost an integrated platform would eliminate — it's the value-quantification column.
5. **Describe what actually happens.** The `description` column should name the payload, the downstream consequences, and known failure modes. "Offer accepted in ATS triggers a workflow in Onboarding that generates a task list per template; failure modes: late-bound position changes invalidate the template selection."

Fan-out is normal — one trigger event often hits multiple target domains. `offer.accepted` typically generates rows for ATS→Onboarding, ATS→HCM (employee record creation), ATS→Payroll (comp profile). Each fan-out arm is its own row.

### Phase 4 — score and surface

After loading any meaningful chunk of `cross_domain_handoffs`, the platform-candidacy view falls out:

- **Per data_object:** `count(role='master') + count(handoffs)` is the integration-burden score. High score = strong candidate for an integrated platform.
- **Per (domain_a, domain_b) pair:** `count(handoffs WHERE {source,target} = {a,b})` is the bilateral integration weight. High weight = these two domains are effectively one platform's problem already.

Both queries are one-line cube DSL once the data is in — surface them to the user along with the UI links after each load.

### Anti-patterns specific to this workflow

- ❌ Putting `Onboarding Task` (or any other handoff target) under the *trigger* domain's data_objects. It belongs to the *master* domain; the relationship is a `cross_domain_handoffs` row, not a `domain_data_objects` row.
- ❌ Recording intra-domain events in `cross_domain_handoffs`. The validation rule will reject them; if you bypass it by routing through different ids, you're polluting the integration-burden score with internal workflow.
- ❌ Filling `domain_data_objects.notes` with nothing on multi-master rows. The whole point of allowing multi-master is to surface *which slice* each domain owns; an empty `notes` hides that.
- ❌ Inventing a co-master domain in the catalog just to make a multi-master row work. Apply the point-solution-market test first; if Workforce Planning genuinely passes (it does), add the domain. If it doesn't, the data_object probably belongs to one master, not two.
- ❌ Naming `data_object_name` in human form (`Job Requisition`, `Background Check`). That's `display_label`'s job. The natural key is snake_case_plural.

---

## Classification heuristics

Beyond the point-solution-market test, these heuristics resolve the ambiguous cases that came up most often:

- **Umbrella vs sub-domain.** Both can be valid simultaneously. ITAM is an umbrella with its own market (Flexera One, Ivanti Neurons for ITAM). HAM, SAM, FinOps, EAM are sub-domains, each with their own point-solution markets. Model both levels via `parent_domain_id` — but only when both levels have independent vendor competition. AIOps as a sub-domain of ITOM is borderline; left top-level because the vendor list (BigPanda, Moogsoft, Dynatrace Davis) is distinct enough.

- **Vendor identity after acquisitions.** Use the *current legal owner* in `vendors.vendor_name`. Mention the predecessor in `description` or `notes`. Examples to remember: LeanIX → SAP SE, ServiceMax → PTC, MuleSoft → Salesforce Inc, Lightstep → ServiceNow Inc, Apptio → IBM, Plex → Rockwell Automation, CloudHealth → Broadcom, Reflexis → Zebra Technologies, Sapling → Kallidus, Blue Prism → SS&C, Signavio → SAP SE, Splunk → Cisco (the vendor is still Splunk; Cisco is the parent).

- **Product re-brands.** A renamed product gets a single solution row under its current name; the old name belongs in `description` or `notes`. Don't double-row: ServiceNow GRC and ServiceNow IRM are the same product, model once as IRM.

- **Same product, multiple domains.** A solution can legitimately cover many domains — one solution row, multiple `solution_domains` rows with the right `coverage_level`. ServiceNow IRM has `primary` on GRC and `secondary` on AUDIT, BCM, OP-RES, TPRM, PRIV-MGMT, ESG.

- **Platform vs product granularity.** The schema has no `parent_solution_id` column, so don't try to model an umbrella platform *plus* every sub-product. Pick one level. For ServiceNow we picked per-product (40-ish rows); for competitors we picked their flagship per domain. Don't mix levels arbitrarily — pick a rule per vendor.

- **Capabilities vs sub-domains.** When a concept fails the domain test, decide between modelling it as a sub-domain (rare) or as a capability (common). A capability is something an org *can do* expressed as a noun (Lead Management, Vulnerability Scanning, Automated Invoice Matching). It is independent of which solution delivers it.

---

## Anti-patterns

- ❌ Marking AI-researched rows as `approved` because they "look right". See rule #1.
- ❌ Adding a solution row for every sub-module of a vendor's platform when the vendor already has a flagship row. Inflates counts, fragments coverage, loses the comparison.
- ❌ Importing ServiceNow's marketing taxonomy verbatim as domains. Run each entry through the point-solution test first.
- ❌ Loading rows without first reading the existing catalog. Produces duplicates with inconsistent capitalisation that are painful to clean up.
- ❌ Putting qualifiers (coverage level, ownership, applicability) on the core entity instead of the junction. See rule #3.
- ❌ Writing one-off CLI calls for more than ~5 rows. Extend [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts) instead — it's why the script exists.
- ❌ Predicting numeric IDs inside a script. Always re-read after insert to build the id map.
- ❌ Trying to fit a large insert into a single command-line argument on Windows. Use stdin or chunk.
- ❌ `cd`ing into the skill folder, `.tmp_deploy/`, or any subdirectory before running `semantius` or a loader script. Silently routes to the wrong tenant. See rule #6.
- ❌ Writing project state, lessons learned, or "remember this for next time" notes to your memory system. Every persistent note about this project lives in committed files (SKILL.md, CLAUDE.md, references/). Memory is off-limits for this repo.

---

## Quick reference

UI base: `https://tests.semantius.app/domain_map/<table_name>`

Reference loader: [.tmp_deploy/load_research.ts](.tmp_deploy/load_research.ts)

Module-shape reference: [references/module-shape.md](references/module-shape.md)
