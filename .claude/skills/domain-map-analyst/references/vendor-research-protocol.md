# Phase 0 — Vendor surface research protocol

Phase 0 produces the domain's expected entity set **before** any Phase A/B drafting. It exists because Phase B subagents asked "what does THIS domain master?" reliably ship the headline noun (incidents, candidates, applications) and miss the workflow substrate (states, transitions, approvals, compliance, engagement). Phase 0 closes that gap by enumerating the vendor surface first; Phase A/B then work against the enumeration as a subtraction list.

## When to run

- New domain load (always)
- Extending an already-loaded domain's module set (always)
- Refactoring an existing domain's modularization (always)
- After a market audit (see [domain-audit-procedure.md](domain-audit-procedure.md)) returns MISSING or MODULARIZATION findings the user wants to act on

## Skippable for

- Hot-fix patches on already-loaded domains (renaming one entity, adding one relationship, fixing a single edge)
- The "is X a domain?" classification question (no load = no Phase 0)
- Adding a single capability or a single solution row to an existing domain

## Procedure

### 1. Identify flagship vendors

3-5 leaders is the right count. Aim for diversity along these axes so the union surface is wide:

- **Pure-play specialists** model the market most cleanly. Prefer them over diversified suites where possible.
- **Suite vendors** (Salesforce, Microsoft, ServiceNow, Workday, SAP) reveal what large platforms consider mainline; include 1 at most.
- **Compliance-focused specialists** are mandatory for regulated markets — Checkr for FCRA-aware BG checks, OneTrust for GDPR, NAVEX for ethics & compliance reporting, etc.
- **Regional / industry-vertical leaders** sometimes carry compliance entities the global generalists omit (Personio for EU HR, Cerner for US healthcare, etc.).

Sources, in priority order:
1. User-named vendors (always include these — they signal scope intent)
2. Gartner Magic Quadrant leaders for the market category
3. Forrester Wave leaders
4. G2 leader quadrants
5. Public market-share data
6. Awareness from public M&A news (a vendor that just got acquired by a leader is significant signal)

### 2. Enumerate each vendor's surface

For each flagship vendor, list the entities their flagship product masters. Source from:

- Vendor documentation sites (`docs.<vendor>.com`)
- Public API references (`developer.<vendor>.com`, `api.<vendor>.com/docs`)
- Schema / data model documentation
- Customer-facing onboarding pages, trial signup walkthroughs
- Help center articles describing what the product tracks

Group entities by lifecycle role:

| Category | What it carries |
|---|---|
| **Master records** | The primary nouns the product is "about" (candidates, incidents, customers, contracts) |
| **Junctions / transitions** | Lifecycle progressions, history rows, stage-transition audit trails |
| **Audit / compliance** | Disclosures, consents, audit logs, segregation-of-duties records, regulator filings |
| **Engagement / outreach** | Notes, emails, calls, activity logs, communications |
| **Configuration / templates** | Reusable templates, packages, kits, libraries, rule sets |

Aim for ~10-20 entities per vendor. Less suggests shallow research; more suggests including UI widgets that aren't entities.

### 3. Build the union surface matrix

Rows = entities, columns = vendors. Mark cells where each vendor has the entity. Classify:

| Classification | Rule | Default action |
|---|---|---|
| **Core** | ≥3 vendors have it | Load by default |
| **Common** | 2 vendors have it | Load unless there's a reason not to |
| **Specialist** | 1 vendor has it | Load only if specifically in scope |
| **Compliance** | Required by regulation in this market | Load regardless of vendor presence (some vendors hide compliance internals from public docs) |

### 4. Add compliance entities for regulated markets

These are non-optional regardless of how many vendors model them explicitly. The market drives the entities, not the vendor surface.

| Market segment | Required compliance entities |
|---|---|
| US ATS (>100 employees) | `eeo_responses`, `ofccp_disposition_records` |
| Background checks (US) | `fcra_disclosures`, `adverse_action_notices`, `background_check_disputes` |
| Healthcare data (US) | `hipaa_access_logs`, `business_associate_agreements` |
| EU data subjects | `gdpr_consent_records`, `subject_access_requests`, `data_deletion_requests` |
| Financial close (US public co.) | `sox_audit_trails`, `sod_violations`, `accounting_period_closes` |
| Pharmaceutical / medical device | `fda_part11_audit_trails`, `electronic_signature_records` |
| Banking | `kyc_records`, `aml_alerts`, `suspicious_activity_reports` |
| Insurance | `claim_audit_trails`, `regulatory_filings` |
| Payments (PCI) | `card_data_access_logs`, `pci_scope_attestations` |

This table grows as new regulated markets are loaded. When you encounter a market not listed here, surface the compliance entities you identified so the table can be extended.

### 5. Propose modularization

For each entity in the union surface, name the module it belongs in. Validate against the rules:

- Rule #14: every module has ≥1 master; domains with ≥3 capabilities have ≥2 modules
- Rule #18: no vendor names in entity names or descriptions
- Single-vendor presence doesn't justify a dedicated module unless the entity is structurally heavyweight (lifecycle states + relationships + handoffs all attached)

The modularization is a **hypothesis** — module names and scopes may change during Phase A as you discover what the natural decomposition is. If two entities both fit two candidate modules equally well, that's a signal those modules should merge.

### 6. Surface to user

Output: a markdown report containing the vendor surface matrix + modularization hypothesis + compliance entity list. User approves before Phase A loads any rows.

The report saves to `c:/tmp/<DOMAIN>-phase0-<YYYY-MM-DD>.md` so it's available as input for the subsequent Phase A/B drafting passes (subagents can read it back).

## Subagent prompt template

Use a `general-purpose` subagent (not `Explore` — Explore lacks `Write` and the agent needs to persist the report). Cluster size ≤1 domain per subagent (Phase 0 is per-domain).

```
You are running Phase 0 (vendor surface research) for the [DOMAIN_CODE] domain in the
Semantius domain map catalog. The catalog needs this enumeration BEFORE any Phase A/B
drafting so the subsequent drafting passes work against a complete vendor surface, not
just the headline noun.

Task:

1. Identify 3-5 flagship vendors in the [DOMAIN_NAME] market. Prefer pure-play specialists
   over diversified suites. If the market is regulated (FCRA / HIPAA / GDPR / SOX / FDA / PCI),
   include at least one compliance-focused specialist. User-named vendors (if any): [LIST].

2. For each vendor, list the entities their flagship product masters. Source from public
   documentation, API references, schema docs, trial signup walkthroughs. Use
   snake_case_plural entity names following Semantius conventions. Group by category:
     - Master records
     - Junctions / transitions
     - Audit / compliance
     - Engagement / outreach
     - Configuration / templates
   Aim for ~10-20 entities per vendor.

3. Build a union surface matrix: rows = entities, columns = vendors. Mark presence per
   vendor. Classify each entity as Core (>=3 vendors), Common (2), Specialist (1), or
   Compliance (required by regulation).

4. Add compliance entities required by regulation in this market (see the compliance table
   in references/vendor-research-protocol.md). Compliance entities load regardless of
   vendor presence because vendors often hide compliance internals from public docs.

5. Propose modularization: for each entity, name the module from the current set
   (or propose a new module if needed). Apply Rule #14:
   - Every module has >=1 master
   - Domains with >=3 capabilities have >=2 modules

6. Output: save the report to c:/tmp/[DOMAIN_CODE]-phase0-[YYYY-MM-DD].md with this shape:

   # [DOMAIN_CODE] Phase 0 — Vendor Surface

   ## Flagship vendors
   | Vendor | URL | Specialist in | Why included |
   | --- | --- | --- | --- |

   ## Surface matrix
   | Entity | Category | V1 | V2 | V3 | V4 | V5 | Classification | Proposed module |
   | --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |

   ## Compliance entities (non-optional)
   | Entity | Regulation | Proposed module |

   ## Modularization hypothesis
   2-4 sentences naming each proposed module and what it scopes.

Constraints:
- snake_case_plural entity names
- NO vendor names in entity names or descriptions (Rule #18) — the surface matrix names
  vendors per column, but entity names stay neutral
- Do NOT call any mcp__claude_ai_deno__*, mcp__claude_ai_tests-ops__*, or other mcp__*
  Semantius tool. Use only Bash for semantius CLI calls (rule #0)
- Verify against live catalog state with semantius CLI where useful:
  semantius call crud postgrestRequest '{"method":"GET","path":"/<table>?..."}'
- Cap response at 1500 words
- Do NOT propose any inserts; this is research only

The catalog rules live in c:/dev/domain-map/.claude/skills/domain-map-analyst/SKILL.md.
The Phase 0 detail lives in references/vendor-research-protocol.md (this file).
```

## Output flows into Phase A

The Phase 0 markdown report is the input for Phase A. Specifically:

- The **flagship vendors** list seeds `vendors` + `solutions` + `solution_domains` rows in Phase A.
- The **modularization hypothesis** seeds `domain_modules` + `domain_module_capabilities` rows.
- The **surface matrix** is the master list Phase B works against in step 3 ("Draft, don't load"): every Core/Common entity gets a `data_objects` row + `domain_module_data_objects` row in the proposed module; Specialist entities get a one-line decision (load or skip); Compliance entities load regardless.
- Any entity in the matrix that **doesn't** make it into the load needs a one-line justification ("not yet in scope", "covered by sibling domain X", "explicit user decision after review").

This subtraction-list pattern is what closes the headline-noun-only failure mode.

## Worked example

TBD — fill from the first real Phase 0 run. Future Phase 0 invocations can pattern-match against a known-good prior run.
