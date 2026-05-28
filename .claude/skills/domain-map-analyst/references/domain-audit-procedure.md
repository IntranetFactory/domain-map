# Domain-level market audit procedure

A re-runnable audit that diffs a domain's current catalog state against a freshly-generated market surface. Catches **missing entities** (gaps), **wrong-ownership** (entity in the wrong module within the domain), **scope creep** (entity in the catalog that doesn't belong), and **modularization mistakes** (the module split itself doesn't cleanly cover the surface). Functions as the regression test for Phase 0 ([vendor-research-protocol.md](vendor-research-protocol.md)) — when a load violated Phase 0 or predates it, the next market audit catches the drift.

## Triggers

- "Audit domain X against market"
- "Run a market audit on Y"
- "Is domain Z fully loaded"
- "Find missing entities in W"
- "Verify the X domain"
- "Re-check Y modularization"
- "Do a market-vs-catalog check on X"

Also: invoke proactively after any load that involved a subagent (since subagents have produced silently-thin Phase B drafts repeatedly).

## When to skip

- Domain has zero modules (run Phase 0 first; you can't audit what doesn't exist)
- The user asked for the per-domain *structural* completeness checklist (A/M/B/C/D/E/F bands) — that's the per-domain audit in SKILL.md, not this market audit. The two are complementary: structural audit verifies internal consistency; market audit verifies external coverage.

## Procedure

### Step 1 — Pull current state (live, never from blueprints or deploy scripts)

For the target domain `<CODE>`:

1. Resolve to `<id>`:
   `semantius call crud postgrestRequest '{"method":"GET","path":"/domains?domain_code=eq.<CODE>&select=id,domain_code,domain_name,description"}'`

2. Pull modules (both primary host and cross-cutting host junctions):
   - `/domain_modules?domain_id=eq.<id>&select=id,domain_module_code,domain_module_name,module_kind`
   - `/domain_module_host_domains?domain_id=eq.<id>&select=domain_module:domain_modules(id,domain_module_code,domain_module_name,module_kind)`

3. Pull the full DMDO footprint across all those modules:
   `/domain_module_data_objects?domain_module_id=in.(<modIds>)&select=domain_module_id,role,necessity,data_objects(data_object_name,kind),domain_modules(domain_module_code)`

4. (Optional) Pull the legacy `domain_data_objects` rollup for cross-check:
   `/domain_data_objects?domain_id=eq.<id>&select=role,necessity,data_objects(data_object_name)`

Cache as the **current footprint**.

### Step 2 — Generate the market surface (subagent pass)

Spawn a `general-purpose` subagent (not `Explore` — Explore lacks `Write`, and the agent needs to persist JSON). Use the [prompt template below](#subagent-prompt-template).

The subagent produces `c:/tmp/<DOMAIN>-market-surface-<YYYY-MM-DD>.json` with the vendor surface matrix + the diff against the current footprint.

### Step 3 — Read the subagent output, surface to user

Load the JSON. Surface a concise summary table to the user with the counts:

| Category | Count |
| --- | --- |
| MISSING (gap) | k |
| WRONG-OWNERSHIP | l |
| SCOPE-CREEP | m |
| MODULARIZATION ISSUES | n |

Then offer to drill into any category the user wants to discuss.

### Step 4 — Write the gap report

After user review, save the full gap report (not the raw subagent JSON) to `c:/tmp/<DOMAIN>-audit-<YYYY-MM-DD>.md`. Structure:

```markdown
# <DOMAIN> Market Audit — <date>

## Summary
- Current footprint: N entities across M modules (full + starter)
- Market surface: X entities suggested by subagent
- Flagship vendors enumerated: V1, V2, V3, V4, V5
- MISSING: K entities
- WRONG-OWNERSHIP: L entities
- SCOPE-CREEP: M entities
- MODULARIZATION ISSUES: N

## Vendor surface basis
Brief justification of why each vendor was included. Compliance specialists called out.

## MISSING entities (gaps)
| Entity | Proposed module | Vendor evidence | Compliance? |
| --- | --- | --- | --- |

## WRONG-OWNERSHIP
| Entity | Current module | Proposed module | Reason |
| --- | --- | --- | --- |

## SCOPE-CREEP
| Entity | Current module | Surface presence | Recommendation |
| --- | --- | --- | --- |

## MODULARIZATION ISSUES
| Issue | Modules involved | Recommendation |
| --- | --- | --- |

## Recommendations
Numbered list of proposed actions. Each action references a fix surface:
- MISSING → Phase B insert via a loader
- WRONG-OWNERSHIP → DELETE wrong DMDO + INSERT in right module
- SCOPE-CREEP → DELETE the DMDO + dependent handoffs/relationships
- MODULARIZATION ISSUES → separate module refactor (rename / merge / split)
```

### Step 5 — User review (never auto-load)

Rule #1 applies: AI-derived findings are research, not approved truth. Always surface the gap report to the user **before** any fix loads. The user picks which findings to act on.

### Step 6 — Schedule fix loads

For each accepted finding, the fix surface is:

- **MISSING**: Phase B insert. Extend an idempotent loader in `.tmp_deploy/` to add the `data_objects` row + DMDO row + lifecycle states + intra-domain relationships. Pattern from [.tmp_deploy/fix_ats_modules.ts](../../../.tmp_deploy/fix_ats_modules.ts).
- **WRONG-OWNERSHIP**: DELETE the wrong DMDO row + INSERT in the right module. Surgical SQL via `semantius call crud postgrestRequest` is fine if the count is small (≤5 rows); otherwise extend a loader.
- **SCOPE-CREEP**: DELETE the DMDO row + any handoffs that depended on the wrong scope. Cascade carefully — check `/handoffs?target_domain_module_id=eq.<id>&data_object_id=in.(<entityIds>)` before deleting.
- **MODULARIZATION ISSUES**: separate refactor. Module rename / merge / split is a bigger change; surface to user as a design conversation. Don't fold it into the audit fix-loop.

### Step 7 — Re-run the audit

After the fix loads, re-run Step 2 (fresh subagent pass). The acceptance criterion is zero MISSING / WRONG-OWNERSHIP / SCOPE-CREEP findings (modulo user-accepted exceptions). MODULARIZATION findings may legitimately remain if the refactor is deferred.

## Subagent prompt template (Step 2)

```
You are auditing the [DOMAIN_CODE] domain in the Semantius domain map catalog against
current market practice. This audit is the regression test for Phase 0 (vendor surface
research). If Phase 0 was never run for this domain, or if a load violated it, the diff
will surface missing entities, wrong-ownership, and scope creep.

Current state (read these first; live PostgREST queries, NOT deploy scripts):

  semantius call crud postgrestRequest '{"method":"GET","path":"/domains?domain_code=eq.[DOMAIN_CODE]&select=id,domain_code,domain_name,description"}'

  semantius call crud postgrestRequest '{"method":"GET","path":"/domain_modules?domain_id=eq.<id>&select=id,domain_module_code,domain_module_name,module_kind"}'

  semantius call crud postgrestRequest '{"method":"GET","path":"/domain_module_host_domains?domain_id=eq.<id>&select=domain_module:domain_modules(id,domain_module_code,domain_module_name,module_kind)"}'

  semantius call crud postgrestRequest '{"method":"GET","path":"/domain_module_data_objects?domain_module_id=in.(<modIds>)&select=domain_module_id,role,necessity,data_objects(data_object_name,kind),domain_modules(domain_module_code)"}'

Task:

1. INDEPENDENTLY of the current footprint, name 3-5 flagship vendors in this market.
   Prefer pure-play specialists over diversified suites. Include at least one
   compliance-focused specialist if the market is regulated (FCRA / HIPAA / GDPR / SOX /
   FDA / PCI).

2. For each vendor, list the entities their flagship product masters. Source from public
   product documentation, API references, schema docs, trial signup walkthroughs. Use
   snake_case_plural names following Semantius conventions. Group by:
     - Master records
     - Junctions / transitions
     - Audit / compliance
     - Engagement / outreach
     - Configuration / templates

3. Build a union surface matrix: rows = entities, columns = vendors.

4. Add compliance entities required by regulation in this market (FCRA, HIPAA, GDPR, SOX,
   FDA Part 11, PCI, KYC/AML, etc.). These are non-optional regardless of vendor presence.

5. Propose modularization: for each entity in your surface, name the module from the
   current set it should live in. Apply Rule #14:
   - Every module has >=1 master
   - Domains with >=3 capabilities have >=2 modules

6. DIFF against the current footprint:

   - MISSING: in your surface, NOT in the current footprint anywhere.
   - WRONG-OWNERSHIP: in the current footprint, but in a different module than your
     modularization proposes. Distinguish from "modularization issue" — wrong-ownership
     means the entity exists but is mis-assigned; modularization issue means the module
     split itself is incoherent.
   - SCOPE-CREEP: in the current footprint, NOT in your surface. Could be a legitimate
     addition your enumeration missed; flag for user review, don't recommend DELETE
     unilaterally.

7. Modularization commentary: does the current module split coherently cover your surface?
   Recommend merges / splits / renames if not. Use the test: "if I had to onboard a
   first-time deployer to this domain, would the module names + scopes self-explain?"

Output: save the result as JSON to c:/tmp/[DOMAIN_CODE]-market-surface-[YYYY-MM-DD].json:

{
  "domain_code": "<CODE>",
  "vendors": [
    {"name":"<vendor>","url":"<docs URL>","specialist_in":"<scope>","included_because":"<reason>"}
  ],
  "surface_matrix": [
    {"entity":"<snake_case_plural>","category":"master|junction|compliance|engagement|config",
     "vendors_with":["v1","v2"],"classification":"core|common|specialist|compliance",
     "proposed_module":"<MODULE_CODE>","compliance_basis":"<regulation or null>"}
  ],
  "diff": {
    "missing": [{"entity":"...","proposed_module":"...","reason":"...","compliance":bool}],
    "wrong_ownership": [{"entity":"...","current_module":"...","proposed_module":"...","reason":"..."}],
    "scope_creep": [{"entity":"...","current_module":"...","reason":"...","recommendation":"delete|keep|user_decides"}]
  },
  "modularization": {
    "verdict": "coherent|incoherent|partial",
    "recommendations": [
      {"type":"merge|split|rename|leave","modules":["..."],"new_name":"...","reason":"..."}
    ]
  }
}

Then also save a human-readable summary as markdown at
c:/tmp/[DOMAIN_CODE]-market-surface-[YYYY-MM-DD].md alongside the JSON, with sections:
- Vendors
- Surface matrix table
- Diff summary counts
- Top 5 most-impactful missing entities

Constraints:
- snake_case_plural entity names
- NO vendor names in entity names or proposed entities (Rule #18) — the matrix names
  vendors per column, but entity names stay neutral
- Do NOT call any mcp__claude_ai_deno__*, mcp__claude_ai_tests-ops__*, or other mcp__*
  Semantius tool. Use only Bash for semantius CLI calls (rule #0)
- Verify against live catalog state with semantius CLI as needed
- Cap response at 2000 words; the full result goes in the JSON file, not in the chat reply
- Do NOT propose any inserts; this is audit only. The user reviews the gap report and
  decides what to load.

The catalog rules live in c:/dev/domain-map/.claude/skills/domain-map-analyst/SKILL.md.
The audit procedure detail lives in references/domain-audit-procedure.md (this file).
```

## Failure modes to watch for

- **Subagent uses MCP tools instead of CLI.** Rule #0 in SKILL.md is not enough — the subagent prompt repeats it explicitly. If the JSON output references rows that don't match the live catalog, that's the canary: subagent hit the wrong tenant via MCP.
- **Subagent re-defines vendors per audit.** Different runs may pick different vendors. That's not a bug — the union surface should be stable across runs even if the individual vendor list varies. If two consecutive audits produce wildly different MISSING lists with the same vendors, that's the canary.
- **Subagent under-counts SCOPE-CREEP.** Subagents are biased toward "everything in the catalog is probably right" — they MISS scope creep more often than they over-report it. Manually scan the current footprint for entities that look out-of-domain (entities mastered by foreign domains, embedded_master rows on entities with no workflow tie to this domain) and ask the subagent specifically about each.
- **Subagent ships modularization "verdict: coherent" by default.** If the verdict is "coherent" but the recommendations array has substantive merge/split entries, the verdict is the wrong field — the audit is incoherent, not coherent. Read the recommendations, not the verdict label.

## Worked example

TBD — fill from the first real audit run.
