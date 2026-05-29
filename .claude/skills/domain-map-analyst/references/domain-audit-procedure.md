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

5. **Pull the domain's cross-domain handoffs and their APQC coverage** (for the APQC tagging pass in Step 3):
   - All cross-domain handoffs the domain publishes:
     `/handoffs?source_domain_id=eq.<id>&target_domain_id=neq.<id>&select=id,target_domain_id,trigger_event_id,data_object_id,trigger_event:trigger_events(event_name),payload:data_objects!handoffs_data_object_id_fkey(data_object_name)`
   - All cross-domain handoffs the domain receives:
     `/handoffs?target_domain_id=eq.<id>&source_domain_id=neq.<id>&select=id,source_domain_id,trigger_event_id,data_object_id,trigger_event:trigger_events(event_name),payload:data_objects!handoffs_data_object_id_fkey(data_object_name)`
   - Existing APQC tags on those handoffs (combine into one query if you have the handoff id set):
     `/handoff_processes?handoff_id=in.(<handoff_ids>)&select=handoff_id,process_id,proposal_source,record_status,process:processes(process_name,external_id,hierarchy_level)`

Cache as the **current footprint** + the **APQC coverage map** (handoff_id → list of tagged processes, or "untagged").

### Step 2 — Generate the market surface (subagent pass)

Spawn a `general-purpose` subagent (not `Explore` — Explore lacks `Write`, and the agent needs to persist JSON). Use the [prompt template below](#subagent-prompt-template).

The subagent produces `c:/tmp/<DOMAIN>-market-surface-<YYYY-MM-DD>.json` with the vendor surface matrix + the diff against the current footprint.

### Step 3 — Surface the gap report to the user, categorized into three buckets

**This is where most domain audits stall.** The audit produces findings; the user gets a wall of text; nothing happens because next steps aren't deterministic. The fix is to **always categorize findings into three buckets and explicitly prompt per bucket** — never dump the report and wait. The buckets correspond to the three different decision shapes the user is being asked to make.

#### The three buckets

| Bucket | What's in it | What the user does |
|---|---|---|
| **1. In-scope confirmed gaps** | Structurally-confirmed findings the agent can fix directly: MISSING entities the market audit verified, WRONG-OWNERSHIP rows with a clear target module, SCOPE-CREEP rows with no downstream blockers, structural band failures (S/A/M/B/C/E/F) with documented fixes, BOUNDARY findings with deterministic patches. | Approve all / approve some / decline. Agent applies fixes immediately on approval. |
| **2. Surface-for-user (judgment calls)** | Items needing user judgment, not vetted vendor research: Rule #15 notes wording, policy decisions (is this regulation correctly scoped?), architectural intent questions (is this `master + embedded_master` pattern the deployability intent or a redundancy bug?), reverts of legacy pollution. | Answer per item. Each answer may unblock a Bucket 1 fix or change a Bucket 2 row's resolution. |
| **3. Phase 0 pending** | Speculative findings the market-audit pass produced from vendor knowledge but which weren't anchored to a formal Phase 0 vendor-surface document. These are candidate gaps, not vetted gaps. | Choose: (a) **vetted route** — agent runs focused Phase 0 vendor research on this domain, produces a confirmed gap list, survivors become Bucket 1 items in a follow-up pass; (b) **eyeball route** — user names which candidates ring true; named candidates become Bucket 1 items immediately. |

#### Explicit-prompt discipline

After surfacing each bucket, the agent **must** explicitly prompt for action, not wait for the user to remember to ask:

- **After Bucket 1:** *"Fix these now? Reply 'all', 'just 1, 3, 5', or 'skip'."*
- **After Bucket 2:** *"What's your call on each of these? I'll wait for your decision per item before acting."* (For Rule #15 wording asks, the agent must NOT proceed without the user's exact text.)
- **After Bucket 3:** *"Vet via Phase 0 research, or eyeball-mode? If eyeball, name which candidates to treat as confirmed."*

The prompt is per-bucket because each bucket's decision shape is different. Bundling them into one "what do you want to do?" prompt invites the user to triage ad-hoc and silently skip whole categories.

#### Bucket dependencies (call them out explicitly)

Buckets 1, 2, and 3 are **usually independent** — the user can resolve them in any order. But sometimes a Bucket 3 finding informs a Bucket 2 question (e.g., vendor research might surface compliance entities that change the answer to "is this regulation correctly scoped?"). When this happens, the agent must **explicitly call out the dependency** at surface time:

> *"Bucket 2 item #3 (is FERPA correctly scoped to ATS?) might be informed by Bucket 3's vendor research — if you choose the vetted route, I'd suggest holding this Bucket 2 item until research lands. If you choose eyeball-mode or skip Bucket 3, this item is independent."*

If no dependencies exist, state that explicitly: *"Buckets 2 and 3 are independent of each other; you can resolve them in any order."*

#### Bucket-1 sub-categorization (for the count summary)

Within Bucket 1, the agent presents the count by underlying finding type so the user knows what kinds of fixes are queued:

| Finding type | Count |
| --- | --- |
| MISSING (entity gap) | k |
| WRONG-OWNERSHIP | l |
| SCOPE-CREEP | m |
| STRUCTURAL (S/A/M/B/C/E/F band failures) | s |
| BOUNDARY (NULL FK or missing handoff) | b |
| **APQC TAGGING** (per-handoff PCF activity classification) | a |
| MODULARIZATION ISSUES | n (always 0 in Bucket 1 — these route to Bucket 2 since they're refactor conversations, not direct fixes) |

#### APQC TAGGING as a routine pass (not optional)

While reviewing each cross-domain handoff for B-band findings, the agent **also** classifies the implementing APQC PCF activity and proposes a `handoff_processes` row. This is not informational; it's an active fix surface that produces real catalog rows.

**The procedure per handoff:**

1. Look at the trigger event name + payload data_object + source/target domain context. (You already have all of this open from the structural pass — no extra round trip.)
2. Lookup candidate PCF activities: `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry&select=id,process_name,external_id,hierarchy_level`. The trigger event's noun is usually a strong search term.
3. Pick the best match:
   - **Confident L2/L3 match** → propose `(handoff_id, process_id, proposal_source='human_curated', record_status='new')`.
   - **No clean PCF match** (modern digital concept like `data_asset.*`, `dlp_incident.*`, or an industry-specific workflow not in cross-industry PCF) → **defer to Discover Pass 3's custom-process authoring path**. Note in the audit which handoffs were deferred and why.
   - **Confident only at L4/L5** with an obvious L2/L3 parent → prefer the parent for clustering quality.

**Volume expectation.** For a domain with N cross-domain handoffs, expect to author roughly 0.5N to 0.8N `handoff_processes` rows. The deferred ~20% are the genuinely-no-PCF-match handoffs Discover Pass 3 will route to custom processes.

**Why this is in Bucket 1, not Bucket 3.** Bucket 3 is for findings that need vendor research to verify. APQC tagging doesn't — the analyst already has the handoff's source / target / trigger event / payload in front of them from the structural pass. The PCF lookup is a 1-query operation. The cognitive cost is in the structural pass; the APQC tagging cost is incremental.

**Anti-pattern:** completing the structural pass, surfacing the gap report, then "leaving APQC tagging for Discover later." This is what the prior design said and what the 2026-05-29 ITSM audit did. The analyst's mental model — built from reading 80+ handoffs in detail — does not survive the session. Two weeks later, Discover's substring matcher recovers ~60% of it lossily. The correct behavior is to tag while the model is fresh; ship the human-curated rows in the same audit pass that produced them.

### Step 4 — Append the audit section to the domain's history file

Audit history is git-tracked. One markdown file per domain at `c:/dev/domain-map/audits/<DOMAIN_CODE>.md`, append-only. Each Validate run appends a new dated section; prior sections are never edited (corrections come as a new audit, not as an overwrite). See [`audits/README.md`](../../../../audits/README.md) for the directory convention.

**Procedure:**

1. **Read the existing file** at `audits/<DOMAIN_CODE>.md` if it exists, to ensure the new section appends below prior history. If it doesn't exist, the new section starts a fresh file with a `# <DOMAIN_CODE> — Audit History` header.
2. **Append a new `## YYYY-MM-DD — Audit` section** at the bottom of the file. Structure mirrors the three buckets from Step 3.
3. **Drafts and subagent JSON stay in `c:/tmp/`** (gitignored, ephemeral). Only the final per-audit markdown section lands in `audits/`.
4. **Commit timing is the user's call** — the agent writes the file but does not commit unless the user asks. `git log audits/<DOMAIN_CODE>.md` becomes the audit timeline once commits happen.

**Section template (appended to the file):**

```markdown
## YYYY-MM-DD — Audit

### Summary
- Current footprint: N entities across M modules (full + starter)
- Market surface: X entities suggested by subagent
- Flagship vendors enumerated: V1, V2, V3, V4, V5
- Bucket 1 (in-scope, agent fixable): K items
- Bucket 2 (surface-for-user, judgment): L items
- Bucket 3 (Phase 0 pending, speculative): M items

### Vendor surface basis
Brief justification of why each vendor was included. Compliance specialists called out.

### Bucket 1 — In-scope confirmed gaps
Tables grouped by finding type (MISSING / WRONG-OWNERSHIP / SCOPE-CREEP / STRUCTURAL / BOUNDARY / **APQC TAGGING**), each row carrying:
- Entity / row identifier
- Current state vs. proposed state
- Fix surface (loader / surgical CLI / PATCH)
- Vendor evidence or band reference

For **APQC TAGGING** specifically, the table shape is:

| handoff_id | source → target | trigger_event | payload | Proposed PCF row | PCF id | confidence |
|---|---|---|---|---|---|---|
| 615 | OBS → ITSM | slo.breached | service_level_objectives | Manage IT operations performance | 20758 | confident L3 |
| ... | | | | | | |

Deferred-to-Discover items (no clean PCF match) get listed separately under the same finding type with the deferral reason. The combined count (tagged + deferred) is the row count for the APQC TAGGING line in the Step 3 summary table.

### Bucket 2 — Surface-for-user (judgment calls)
Numbered list. Each item carries:
- The question being asked
- Why the agent can't answer it alone
- Options the user might pick
- Whether the answer is independent or has a Bucket 3 dependency

### Bucket 3 — Phase 0 pending (speculative)
Numbered list. Each item carries:
- Candidate entity / finding
- Vendor knowledge basis (which flagship vendor was the source)
- Recommended verification path (which docs to read in a Phase 0 pass)

### Decisions
Per-bucket user choices, captured as the user makes them. Example:
> *"Bucket 1: approved 1, 3, 5; declined 2, 4. Bucket 2: FERPA removed, 4 legacy notes reverted, master+embedded_master confirmed as architectural intent (Rule #19 deployability). Bucket 3: eyeball — outreach_sequences and video_interview_recordings ring true; rest defer to formal Phase 0."*

### Fixes applied
Per-fix log: loader script path (or surgical CLI block), row counts, timestamps. References the commit hash if the loader was committed.

### `domains.notes` pointer (if updated)
The exact user-approved wording that was written to `domains.notes`, if the user opted to update the pointer. Example:
> *"Last validated 2026-05-28. M7 soft-fail on talent_pools, Phase 0 pending. See `audits/ATS.md`."*
```

**After appending, also offer to update `domains.notes`** with a short pointer back to the audit file. The agent prompts: *"Would you like me to update `<DOMAIN>.notes` with a one-line audit pointer? If so, please supply the exact wording (Rule #15)."* This step is optional; the file alone is sufficient persistence.

### Step 5 — User review (never auto-load)

Rule #1 applies: AI-derived findings are research, not approved truth. Always surface the bucketed gap report to the user **before** any fix loads. The user picks which findings to act on per bucket, per the explicit-prompt discipline above. The agent applies fixes only after per-bucket approval; never bulk-applies findings the user hasn't explicitly accepted.

### Step 6 — Schedule fix loads

For each accepted finding, the fix surface is:

- **MISSING**: Phase B insert. Extend an idempotent loader in `.tmp_deploy/` to add the `data_objects` row + DMDO row + lifecycle states + intra-domain relationships. Pattern from [scripts/loaders/fix_ats_modules.ts](../../../scripts/loaders/fix_ats_modules.ts).
- **WRONG-OWNERSHIP**: DELETE the wrong DMDO row + INSERT in the right module. Surgical SQL via `semantius call crud postgrestRequest` is fine if the count is small (≤5 rows); otherwise extend a loader.
- **SCOPE-CREEP**: DELETE the DMDO row + any handoffs that depended on the wrong scope. Cascade carefully — check `/handoffs?target_domain_module_id=eq.<id>&data_object_id=in.(<entityIds>)` before deleting.
- **APQC TAGGING**: INSERT into `handoff_processes` per the classification table the agent built in Step 3. Each row: `(handoff_id, process_id, proposal_source='human_curated', record_status='new', role='implements')`. Use a chunked POST or a small focused loader; the natural composed key `(handoff_id, process_id)` prevents duplicates if the same pair has been proposed before.
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
