# INTRANET audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- Current footprint: **headless `domains` row** (id 126). Zero `domain_modules`, zero `domain_module_data_objects`, zero `domain_data_objects`, zero `data_objects` mastered, zero `handoffs` (outbound or inbound), zero `skills`, zero `domain_regulations`, zero `domain_aliases`, zero `data_object_lifecycle_states`, zero `trigger_events`. 8 capabilities linked, 16 solutions linked, 4 business_function_domains rows.
- Vendor-surface basis: pure-play modern intranet platforms (Staffbase, Simpplr, Firstup, LumApps, Unily, Workvivo, Microsoft Viva Connections), internal-newsletter specialists (ContactMonkey, Workshop, Poppulo Harmony), and frontline-comms anchors (WorkJam, Beekeeper) per the existing 16 `solutions` rows on `solution_domains`.
- SKILL.md classifies INTRANET as leadership-tier (line 1573: "INTRANET, COLLAB-GOV - 16 domains"); leadership-tier domains are expected to have zero masters but Rule #14 still requires at least one `domain_modules` row (a landing module). Sibling COLLAB-GOV is in the same state (zero modules). Both fail M1 under the strict reading of Rule #14.
- The vendor evidence (Staffbase / Simpplr / Firstup / LumApps are dedicated software products bought as the system of record for internal communications) suggests INTRANET is in fact a real point-solution market that masters entities, not a derived-signals aggregator like REV-INTEL / SALES-PERF. The leadership-tier label looks like a misclassification carried in from an early load. The classification decision lives in Bucket 2 and gates everything else; until it is settled, M1 / B-band / E / F / H findings cannot land.
- **Bucket 1 (in-scope, agent fixable):** 1 items.
- **Bucket 2 (surface-for-user, judgment):** 7 items.
- **Bucket 3 (Phase 0 pending, speculative):** 8 items.
- Candidates queued to `audits/_missing-domains.md`: 4 (FRONTLINE-COMMS bumped to 2; EMP-ADVOCACY bumped to 4; EMP-LISTENING bumped to 3; new EMP-JOURNEY-ORCH).

### Pass 1 - Structural (per-domain completeness checklist)

| Band | Result | Evidence / next step |
|---|---|---|
| S1 (FK sweep to domains) | PARTIAL | `capability_domains` 8 rows (pass), `solution_domains` 16 rows (pass), `business_function_domains` 4 rows (pass), `domain_modules` 0 rows (FAIL M1), `domain_data_objects` 0 rows (leadership-tier exception OR Phase B gap, depends on classification), `domain_regulations` 0 rows (pass-by-allowance for now, see Bucket 2), `domain_aliases` 0 rows (pass-by-allowance), `handoffs.source_domain_id` 0 rows (FAIL B9 unless leadership-tier with no published events), `handoffs.target_domain_id` 0 rows (no inbound at all), `skills` 0 rows. |
| S2 (per-module DMDO + capability coverage) | N/A | no modules to sweep. |
| S3 (per-master indirect coverage) | N/A | no masters to sweep. |
| A1 (domains row metadata) | PASS | `crud_percentage=88`, `business_logic` non-empty, `min_org_size='20 s <500'`, `cost_band='$$$'`, `usa_market_size_usd_m=1500`, `market_size_source_year=2024`, `certification_required=false`. All Rule #8 fields populated. |
| A2 (capabilities) | PASS | 8 capabilities (INTRANET-PUBLISH, INTRANET-NEWS, INTRANET-ANALYTICS, INTRANET-MOBILE, INTRANET-SEARCH, INTRANET-JOURNEY, INTRANET-FRONTLINE, INTRANET-ADVOCACY). Above the 3-row floor; the 8-row count specifically triggers Rule #14's "domains with >=3 capabilities need >=2 full modules". |
| A3 (solutions with coverage_level) | PASS | 16 `primary` rows: Staffbase, Simpplr, Firstup, Unily, LumApps, Akumina, Igloo, Workgrid, Sociabble, Haiilo, Interact Intranet, Happeo, Poppulo Harmony, ContactMonkey, Workshop, Microsoft Viva Connections. Above the 3-row floor with the right mix of primary coverage. |
| A4 (catalog UX fields) | FAIL | `catalog_tagline=''`, `catalog_description=''`. Drafts proposed in Bucket 1 / Bucket 2; per Rule #20 these get user-approved before write. |
| A5 (vendor ownership refresh) | SKIPPED | opt-in only per the audit recipe. Sociabble acquired Bambu (Sprout Social spinout) years ago; Workvivo acquired by Zoom 2023; Workshop joined Firstup 2023. Surface to user if vendor-ownership pass is requested. |
| M1 (>=1 module per domain) | FAIL (or PASS by leadership-tier carve-out) | 0 `domain_modules` rows. Whether this is a real fail depends on the Bucket 2 classification question. SKILL.md text at the "domains row is a market entry" passage explicitly says even leadership-tier landing-module is required; sibling COLLAB-GOV is also at zero, suggesting the rule has effectively been waived for the published leadership-tier list. |
| M2 (>=2 modules when >=3 capabilities) | FAIL | depends on M1. |
| M4 (every capability has a realizing module) | FAIL | 8 orphan capabilities. |
| M5 / M6 / M7 | N/A | nothing to check until M1 is resolved. |
| B1 (>=1 master data_object) | PASS-by-leadership-tier-exception | leadership-tier exception applies if the Bucket 2 classification is upheld; otherwise FAIL. |
| B2-B12 | N/A | no masters to evaluate. |
| C1 (business_function_domains owner) | PASS | 1 `owner` row (Marketing Communications), 2 `contributor` rows (HR, Executive), 1 `consumer` row (IT Operations). |
| C2 (BF-capability overrides) | PASS-by-allowance | no overrides needed unless a capability legitimately diverges from Marketing Communications ownership; INTRANET-MOBILE / INTRANET-SEARCH / INTRANET-FRONTLINE could plausibly be IT-owned rather than Marketing-Comms-owned, surfaced as Bucket 2. |
| D1 (UI spot-check) | DEFERRED | nothing loaded yet; no spot-check needed until fixes land. |
| E1-E6 (roles) | N/A | E1 vacuously passes for a leadership-tier read-only domain (no modules to bundle); under the "real market" route, E-band becomes a Phase E load step after M-band lands. |
| F1-F7 (skill layer) | DEFERRED | F2 / F3 / F5 inapplicable until M1 is resolved. The leadership-layer rule at SKILL.md line 1569 explicitly waives system-skill creation for leadership-tier domains. |
| H1 (APQC tagging on cross-domain handoffs) | VACUOUSLY PASS | zero cross-domain handoffs to tag. No volume expectation applies. |

### Pass 2 - Market audit (semantic)

No subagent JSON was generated because the audit is dominated by the prior classification question; running a market-surface subagent before Bucket 2's classification is settled would author an "INTRANET masters X, Y, Z" surface based on the modern-intranet-platform vendor list, then the user might still rule leadership-tier and discard the work. The vendor surface and candidate masters are surfaced inline below (Bucket 3) so the user can either greenlight Phase 0 vendor research as the next step or reject the "real market" route entirely.

If the Bucket 2 classification flips INTRANET to "real point-solution market", the candidate masters in Bucket 3 become the Phase 0 vendor-research input set.

#### Vendor-surface basis (manual enumeration; replaces the subagent run for this audit)

Pure-play intranet specialists chosen over diversified DXP / WSC bundles. Six anchors selected from the 16 `solutions` rows already linked:

- **Staffbase** (`primary`) - Germany-based modern intranet for medium-to-large, employee-app + newsletter + journey orchestration in one suite. Acquired Bananatag / Dirico / tchop / Valo, consolidates the European employee-comms stack.
- **Simpplr** (`primary`) - AI-first modern intranet; auto-publishing, "EX layer over Microsoft 365 / Google Workspace" positioning. Heavy on personalization and analytics.
- **Firstup** (`primary`, formerly Dynamic Signal + SocialChorus) - frontline-and-deskless heavy; broadcast-grade messaging with delivery analytics. Acquired Workshop (internal newsletter) 2023, consolidating the newsletter axis.
- **LumApps** (`primary`) - employee experience platform; Google Workspace + Microsoft 365 dual anchor; journeys + advocacy + frontline modules.
- **Workvivo** (already in `solutions` as adjacent to Zoom; acquired by Zoom 2023) - social-feed-first modern intranet; consumer-grade UX, podcasts and video as first-class.
- **Microsoft Viva Connections** (`primary`) - the Microsoft 365 native intranet experience; SharePoint-anchored, mobile-first, integrates with Viva Engage (formerly Yammer).

Compliance / personal-content specialists: none specific to INTRANET (no FCRA / FDA / SOX / HIPAA carve-out for internal employee communications), but GDPR / CCPA / employee-privacy regulations apply when broadcasting personalized content (audience targeting, read-receipt tracking, advocacy social shares). Region-specific employee-comms regulations (German works-council co-determination under BetrVG, French CSE consultation duties, EU Whistleblower Directive interactions) potentially apply to publish workflows.

### Pass 3 - Neighbor discovery

Zero outbound and zero inbound handoffs in the catalog mean the catalog has no edges from which to auto-derive the neighbor set for INTRANET today. Manually-derived neighbor list (based on the modern intranet vendor surface):

| Neighbor (manually inferred) | Why | Edge weight signal |
|---|---|---|
| HCM | Employee directory, org chart, profile photos, manager hierarchy. Intranet platforms federate employee search and target audiences by HCM attributes (department, location, job-grade). | Heavy (every flagship vendor wires HCM as source of audience truth). |
| EMP-EXP | Engagement signal feedback, pulse-survey embedding, recognition-feed embedding. | Medium. |
| WSC (Workstream Collaboration) | Chat-channel embeds, news cross-post into Teams / Slack channels. | Medium. |
| KM (Knowledge Management) | Intranet pages cross-reference KM articles; KM repository is a federated-search source. | Medium-heavy. |
| HRSD | HR case requests embedded as intranet portlets / journey steps. | Light. |
| ONBOARDING | Journey-orchestration overlap; many intranet platforms ship onboarding-flavored journey templates. | Medium. |
| LMS | Compliance-training nudges embedded as journey steps, federated learning search. | Light. |
| DXP | Authoring overlap; some DXPs (Liferay, Sitecore) sell intranet templates. Often a build-vs-buy alternative to modern intranets. | Edge-of-market. |
| SMM | Employee-advocacy share-to-social bridge. | Light. |
| IDP | Document upload / extraction for newsletter contributions (rare). | Edge-of-market. |

Because no `handoffs` rows exist yet, Pass 4 pairwise reconciliation is vacuous in both directions: no NULL FKs to backfill, no missing handoffs the catalog implies (catalog implies nothing), no boundary integrity gaps, no `data_object_relationships` mirrors to check. Pass 4 becomes meaningful only after Phase B candidates from Bucket 3 land.

### Pass 4 - Pairwise reconciliation per neighbor

Vacuous - see Pass 3. Listed for completeness; no in-scope or report-only findings produced from this pass.

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures (deterministically fixable on INTRANET alone)

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | A4 | `catalog_tagline` and `catalog_description` are empty on the `domains` row. Rule #20 requires both, written in buyer voice (workflow + value), not analyst voice. | Draft both fields per Rule #20, surface to user for explicit per-row approval BEFORE writing. Proposed drafts: `catalog_tagline = "Reach every employee, from HQ to the shop floor, with one connected internal communications platform."`; `catalog_description = "Publish company news, target announcements by department or location, and reach desk-based and frontline workers across web and mobile. Track readership, manage editorial calendars, and run multi-step journeys for onboarding, change initiatives, and policy rollouts. Connect employee directories, surface knowledge across collaboration tools, and let teams amplify approved content on social channels."` These are agent drafts (Rule #20: draft, surface, approve, write); user has the final wording. |

No other STRUCTURAL band failures land in Bucket 1 because every other failure (M1, B-band, E, F) is gated by the Bucket 2 classification question. Once that lands, the corresponding fixes become structurally clear and move into Bucket 1 on the follow-up audit.

#### MISSING (entity gaps) - zero in Bucket 1

Every entity-shaped gap is conditional on Bucket 2's classification decision; routed to Bucket 3 below.

#### WRONG-OWNERSHIP - zero

#### SCOPE-CREEP - zero

#### BOUNDARY - zero in Bucket 1

The eight inbound handoff candidates the vendor surface implies (HCM publishing employee profile updates, EMP-EXP publishing recognition feed events, KM publishing article updates, ONBOARDING publishing journey-template signals, etc.) are not authored on INTRANET's side. Each goes into the "Report-only follow-ups" section at the bottom of this audit, owed by the source domain's next B9 pass.

#### APQC TAGGING - zero (vacuously, no handoffs to tag)

### Bucket 2 - Surface-for-user (judgment calls)

1. **Classification: leadership-tier vs real point-solution market.** SKILL.md line 1573 marks INTRANET as leadership-tier, expected to have zero masters and no system skill. The vendor surface (Staffbase, Simpplr, Firstup, LumApps, Unily, Workvivo) is a real software market, customers buy a dedicated product as their system of record for internal communications. The current `domains.description` text ("Modern intranet platforms, internal news and announcement broadcasting ...") reads as a market description, not an aggregation-tier signal. Options: **(a) confirm leadership-tier** (INTRANET stays headless, B / E / F / H pass by exception; M1 the lone open finding; add a single landing `domain_modules` row to satisfy Rule #14 minimum); **(b) flip to real point-solution market** (M1 + B + E + F + H all need to land; trigger Phase 0 vendor research from Bucket 3's candidate list; load typical modules `INTRANET-PUBLISH`, `INTRANET-NEWS`, `INTRANET-JOURNEY`, `INTRANET-FRONTLINE`, `INTRANET-SEARCH`, `INTRANET-ADVOCACY`); **(c) hybrid** (e.g., leadership-tier landing module plus a `module_kind='starter'` for the publish-and-news minimum surface). Independent of every other Bucket 2 item, but **gates Bucket 3 entirely**.

2. **Catalog UX text approval (Bucket 1 B1-S1 depends on this).** Approve, edit, or reject the proposed `catalog_tagline` and `catalog_description` drafts in Bucket 1 B1-S1. Rule #20 forbids the agent from writing without explicit per-row approval. Independent of Bucket 2 item 1 unless the user picks (a) "leadership-tier" - in which case the buyer voice should pivot from "modern intranet product" to "internal-comms governance layer".

3. **Business-function ownership of mobile / search / frontline capabilities.** The single `business_function_domains.responsibility_type='owner'` row points at Marketing Communications. Three of the eight capabilities (`INTRANET-MOBILE`, `INTRANET-SEARCH`, `INTRANET-FRONTLINE`) are often IT- or HR-led, not Marketing-Comms. Decide whether to add `business_function_capabilities` override rows for these three (per C2) and which function each is owned by. Independent of Bucket 2 item 1.

4. **Regulations scope.** `domain_regulations` is empty. Internal communications has no FCRA / HIPAA / SOX direct regulation, but personal-content broadcasting (audience targeting, read-receipts, advocacy social shares) intersects GDPR (Articles 13-14 information notices, Articles 21-22 profiling pushback), CCPA, the EU Whistleblower Directive (interactions with policy-broadcast workflows), and works-council co-determination regulations (German BetrVG, French CSE). Decide whether to attach any of GDPR / CCPA / EU-Whistleblower-Directive at `applicability='mandatory'` or `'recommended'`. Independent of Bucket 2 item 1.

5. **Modularization (only loadable on the Bucket 2 item 1 "real market" route).** If the user picks (b) or (c), decide the module split. Proposed shape mirrors the 8 capabilities one-for-one (8 modules feels heavy); a tighter 5-module split: `INTRANET-PUBLISH` (publishing + spaces + governance), `INTRANET-NEWS` (announcements + audiences + acknowledgements + newsletter), `INTRANET-JOURNEY` (journey definitions + steps + employee journeys), `INTRANET-FRONTLINE` (frontline shoutouts + push messaging + read receipts), `INTRANET-SEARCH` (federated indices + employee directory). `INTRANET-MOBILE` could fold into `INTRANET-PUBLISH` (mobile is a delivery axis on every module, not a separate module). `INTRANET-ANALYTICS` is genuinely cross-cutting (analytics on every other module); typically not a module of its own. `INTRANET-ADVOCACY` could split or fold under PUBLISH; if the EMP-ADVOCACY candidate gets promoted (already mention_count=4 on `_missing-domains.md`), INTRANET-ADVOCACY likely drops. Direct dependency on Bucket 2 item 1 and on the EMP-ADVOCACY promotion decision.

6. **Existing `INTRANET-ADVOCACY` capability vs EMP-ADVOCACY domain candidate.** The capability is wired to INTRANET in `capability_domains`. The EMP-ADVOCACY domain candidate (Hootsuite Amplify, Sprinklr Advocacy, Sociabble, GaggleAMP, EveryoneSocial) has mention_count=4 across SMM, EMP-EXP, INTRANET audits in `audits/_missing-domains.md`. If EMP-ADVOCACY gets promoted, INTRANET-ADVOCACY likely needs to demote (move under EMP-ADVOCACY) or stay as a partial-overlap module reference. Decide. Depends on Bucket 2 item 1 and on `_missing-domains.md` triage.

7. **`domain_aliases` empty.** Common synonyms for the intranet market: `internal communications`, `employee comms platform`, `digital workplace platform`, `employee app`, `social intranet`. Aliases feed both catalog search and the per-domain skill's runtime trigger phrases. Decide whether to load these (5 candidates) and which alias_type each is. Independent of Bucket 2 item 1.

### Bucket 3 - Phase 0 pending (speculative)

The 8 candidate masters below are speculative until vendor-research confirms them. Each is keyed against the Bucket 2 item 1 "real market" branch; if the user picks "leadership-tier", every Bucket 3 item is dropped wholesale.

| # | Candidate | Proposed module | Vendor evidence basis | Recommended verification |
|---|---|---|---|---|
| B3-1 | `intranet_spaces` | INTRANET-PUBLISH | Universal (Staffbase, Simpplr, Firstup, LumApps, Unily, Viva Connections all model "spaces" / "communities" / "sites" as containers for pages). | Pull `/spaces` (Staffbase API), `/communities` (Simpplr Studio), `/sites` (Viva). Confirm common attributes (owner, audience, membership). |
| B3-2 | `intranet_pages` OR `intranet_posts` | INTRANET-PUBLISH | Universal authoring entity. Most vendors split into static "pages" (long-lived policy / org content) and "posts" (timeline / activity-feed entries); pick one or both. | Vendor doc walk: Staffbase pages vs posts; Workvivo posts; LumApps pages. Decide single vs split. |
| B3-3 | `announcements` (or `news_articles`) + `announcement_targeting_rules` + `announcement_acknowledgements` | INTRANET-NEWS | Universal. Read-receipt and mandatory-acknowledge flows are the differentiating workflow vs plain publishing. Staffbase, Firstup, Workvivo, Viva all model this triplet. Lifecycle gates: `published`, `mandatory_acknowledge_required`, `acknowledged`, `archived`. | Vendor doc walk: Staffbase news, Firstup must-read campaigns, Viva mandatory news. |
| B3-4 | `internal_newsletters` + `newsletter_editions` + `newsletter_subscriptions` | INTRANET-NEWS | Specialist anchor (ContactMonkey, Workshop, Poppulo Harmony, Staffbase Email). Editorial-calendar + recipient-tracking entity set. | Vendor doc walk on the four specialists. |
| B3-5 | `employee_directory_entries` (embedded shell on HCM `employees`) | INTRANET-SEARCH | Universal. Federated employee search ranks across HCM directory plus advocacy + content. The intranet's directory entry shape often carries fields the HCM directory does not (intranet profile photo, status message, kudos count). | Confirm whether the intranet really masters a separate row or just enriches HCM `employees` via projection. If projection, this is `embedded_master` not a new master. |
| B3-6 | `journey_definitions` + `employee_journeys` + `journey_steps` | INTRANET-JOURNEY | Common (Staffbase Journeys, Firstup Journeys, LumApps Journeys, Simpplr Employee Journeys, plus pure-play Enboarder / ChangeEngine which are queued as the EMP-JOURNEY-ORCH candidate). Trigger-driven multi-channel workflows; lifecycle gates: `draft`, `active`, `paused`, `archived`; per-step: `pending`, `delivered`, `completed`, `skipped`. | Decide whether INTRANET-JOURNEY is the right home or whether EMP-JOURNEY-ORCH (queued in `_missing-domains.md`) absorbs it. Hard dependency on the EMP-JOURNEY-ORCH triage outcome. |
| B3-7 | `frontline_shoutouts` + `mobile_push_messages` + `read_receipts` | INTRANET-FRONTLINE | Specialist (WorkJam, Beekeeper, Crew, Yoobic, Firstup, Staffbase Frontline). Distinct shape from headquarter announcements because frontline workers consume on personal mobile devices outside the corporate identity boundary. Lifecycle gates: `queued`, `delivered`, `read`, `acknowledged`. | Hard dependency on the FRONTLINE-COMMS triage outcome (queued at mention_count=2). If FRONTLINE-COMMS promotes, this set moves there. |
| B3-8 | `advocacy_posts` + `advocacy_shares` + `advocacy_leaderboards` | INTRANET-ADVOCACY (only on hybrid route) | Specialist (Hootsuite Amplify, Sprinklr Advocacy, Sociabble, GaggleAMP, EveryoneSocial). | Hard dependency on the EMP-ADVOCACY triage outcome (mention_count=4). If EMP-ADVOCACY promotes, this triplet moves there and `INTRANET-ADVOCACY` capability + module demotes. |

### Cross-bucket dependencies

- **Bucket 2 item 1 gates every Bucket 3 item.** If leadership-tier, all 8 Bucket 3 items are dropped (no masters to author).
- **Bucket 2 item 1 also gates Bucket 2 item 5** (modularization shape is irrelevant on the leadership-tier route).
- **Bucket 2 item 6 depends on Bucket 2 item 1 + the EMP-ADVOCACY candidate triage** in `_missing-domains.md` (mention_count=4 is already past the typical promotion threshold; user may move that to `## Promoted` before settling INTRANET).
- **B3-6 depends on the EMP-JOURNEY-ORCH triage** (newly queued at mention_count=1). If promoted, INTRANET-JOURNEY likely fold or become a thin shell.
- **B3-7 depends on the FRONTLINE-COMMS triage** (bumped to mention_count=2). If promoted, INTRANET-FRONTLINE likely demotes.
- **B3-8 depends on the EMP-ADVOCACY triage** (mention_count=4).
- Bucket 1 B1-S1 (catalog UX text) depends on Bucket 2 item 2 (which is itself the approval of the B1-S1 draft text). They are the same decision viewed from two angles.

### Per-bucket prompts

- **After Bucket 1:** "Approve the proposed `catalog_tagline` + `catalog_description` text for INTRANET, or rewrite either / both. Reply with the exact wording per Rule #20. (Or wait until Bucket 2 item 1 is settled, since the buyer voice depends on the classification.)"
- **After Bucket 2:** "Pick one for item 1: (a) confirm leadership-tier (M1 fix is one landing module, no Phase B), (b) flip to real point-solution market (run Phase 0 vendor research from Bucket 3, then load Phase A / M / B / C / E / F / H), or (c) hybrid (leadership-tier landing module + a starter for the publish-and-news minimum). Then answer items 2-7 in order: catalog UX wording, three function-ownership overrides, regulation set to attach, modularization shape (only if (b) or (c)), EMP-ADVOCACY collision, alias set."
- **After Bucket 3:** "If you picked (b) or (c) on Bucket 2 item 1, choose the verification route: vetted Phase 0 vendor research subagent now, OR eyeball-mode (you call out which B3-1 through B3-8 candidates ring true and they become Bucket 1 items in the follow-up audit)."

### Report-only follow-ups (owed by other domains)

Because INTRANET currently masters nothing and authors no handoffs, every potential cross-domain edge is owed by the partner domain's next B9 / B8 pass. These rows are informational only on this audit:

- **HCM B9 candidate:** `employee.profile_updated` -> INTRANET (employee directory) and `org_unit.changed` -> INTRANET (audience-targeting rules). Only meaningful if Bucket 2 item 1 flips INTRANET to "real market" and B3-5 (`employee_directory_entries`) lands.
- **EMP-EXP B9 candidate:** `recognition.posted` -> INTRANET-NEWS feed; only meaningful on the same condition.
- **KM B9 candidate:** `knowledge_article.published` -> INTRANET-PUBLISH cross-link; same condition.
- **HRSD B9 candidate:** `policy.published` -> INTRANET-NEWS mandatory-acknowledgement flow; same condition. This is the GDPR / EU-Whistleblower-Directive intersection from Bucket 2 item 4.
- **ONBOARDING B9 candidate:** `onboarding_journey.started` -> INTRANET-JOURNEY orchestrator (if INTRANET-JOURNEY survives Bucket 2 item 5 / EMP-JOURNEY-ORCH collision).
- **LMS B9 candidate:** `compliance_training.assigned` -> INTRANET-NEWS / -JOURNEY nudge channel.
- **WSC B9 candidate:** `news.cross_posted` reverse direction; lower-priority.

Surface each of the above on the respective partner domain's next b1 audit; none are loadable from INTRANET's side (INTRANET is the consumer/target on each).

### Candidate domains queued during this audit

Routed to `audits/_missing-domains.md` via `scripts/analytics/append_missing_domain.ts`:

| Candidate code | Action | New mention_count |
|---|---|---|
| FRONTLINE-COMMS | Bumped (WFM was the first surfacer) | 2 |
| EMP-ADVOCACY | Bumped (3 prior surfacers) | 4 |
| EMP-LISTENING | Bumped (PA + EMP-EXP were prior) | 3 |
| EMP-JOURNEY-ORCH | New entry (Enboarder, ChangeEngine, Applauz, HelloTeam, Cooleaf, Pyn) | 1 |

EMP-ADVOCACY at mention_count=4 looks ripe for promotion or fold-into-INTRANET; the triage decision feeds back into Bucket 2 items 5 and 6.

## 2026-05-31, Audit

### Summary

- Re-run of Validate b1 (structural pass only) against live state, no subagent market-surface pass because every prior Bucket 3 item remains gated by the unresolved Bucket 2 classification question from 2026-05-30 (leadership-tier vs real point-solution market).
- Live state is **unchanged since 2026-05-30**: `domains.id=126` is still headless (zero `domain_modules`, zero `domain_module_data_objects`, zero `domain_data_objects`, zero `data_objects` mastered, zero outbound or inbound `handoffs`, zero `skills`, zero `domain_regulations`, zero `domain_aliases`, zero `data_object_lifecycle_states`, zero `trigger_events`).
- A1 / A2 / A3 / C1 all still PASS (8 capabilities, 16 primary solutions, 4 business_function_domains rows including Marketing Communications owner). A4 (catalog UX fields) still FAIL: `catalog_tagline=''`, `catalog_description=''`. Drafts from 2026-05-30 Bucket 1 still pending user approval per Rule #20.
- M1 / M2 / M4 still FAIL under strict Rule #14 reading. Resolution depends on Bucket 2 item 1 (the classification question).
- Bucket 1 (in-scope, agent fixable): 1 carried over (B1A-A4-UX).
- Bucket 2 (surface-for-user, judgment): 7 carried over (BUCKET-2 items 1, 2, 3, 4, 5, 6, 7 from 2026-05-30).
- Bucket 3 (Phase 0 pending, speculative): 8 carried over (B3-1 through B3-8 from 2026-05-30).
- Status: every open item is parked on the user's classification decision (Bucket 2 item 1). `next_action_by` resolves to `user` because b1a is empty of non-blocked items, b2 is non-empty.

### Structural pass (delta from 2026-05-30)

| Band | Result | Delta vs 2026-05-30 |
|---|---|---|
| S1 (FK sweep) | unchanged | Same row counts on every FK to `domains`. |
| A1 (domains row metadata) | PASS | unchanged. |
| A2 (capabilities) | PASS | 8 rows unchanged. |
| A3 (solutions) | PASS | 16 primary rows unchanged. |
| A4 (catalog UX) | FAIL | unchanged. Drafts from 2026-05-30 carried into B1A-A4-UX in state.yaml. |
| M1 | FAIL (or PASS by leadership-tier carve-out, gated by Bucket 2 item 1) | unchanged. |
| M2, M4 | FAIL (gated by M1) | unchanged. |
| M5, M6, M7, M8 | N/A | nothing to check until M1 resolves. |
| B1 | PASS-by-leadership-tier-exception OR FAIL (depends on Bucket 2 item 1) | unchanged. |
| B2 through B12 | N/A | no masters. |
| B9b | N/A | no modules. |
| B10b | N/A | no handoffs. |
| C1 | PASS | unchanged (Marketing Communications owner + HR / Executive contributor + IT Operations consumer). |
| C2 | PASS-by-allowance / depends on Bucket 2 item 3 | unchanged. |
| D1 | DEFERRED | unchanged, nothing loaded. |
| E1, E2, E3, E4, E5 | N/A | no modules, no roles. |
| F1, F2, F3, F4, F5 | N/A | no modules, no system skills. |
| H1 | VACUOUSLY PASS | unchanged, zero cross-domain handoffs. |

No new structural findings surfaced in this pass. All findings carry forward into state.yaml under the prior IDs (re-keyed for state.yaml v2 conventions).

### APQC tagging

Vacuous: zero cross-domain handoffs to tag. H-band still passes by exception. The expected `agent_curated` volume target (0.5N to 0.8N) is well-defined as zero for this audit.

### Bucket dependencies (carried forward)

- Bucket 2 item 1 (classification) gates all 8 Bucket 3 items and Bucket 2 item 5 (modularization shape).
- Bucket 1 (catalog UX text approval) depends on Bucket 2 item 2, which is the same decision as Bucket 1 viewed from the approval angle; effectively the user response to one resolves the other.
- Bucket 2 item 6 (INTRANET-ADVOCACY vs EMP-ADVOCACY) depends on Bucket 2 item 1 plus EMP-ADVOCACY triage in `_missing-domains.md` (now at mention_count=4).
- B3-6 (journeys) depends on EMP-JOURNEY-ORCH triage (mention_count=1).
- B3-7 (frontline) depends on FRONTLINE-COMMS triage (now at mention_count=3, bumped by RET-STORE since 2026-05-30).
- B3-8 (advocacy) depends on EMP-ADVOCACY triage (mention_count=4).

### Per-bucket prompts

- **After Bucket 1:** "Approve the proposed `catalog_tagline` + `catalog_description` text for INTRANET, or rewrite either or both. Reply with the exact wording per Rule #20. Or wait until Bucket 2 item 1 is settled, since the buyer voice depends on the classification."
- **After Bucket 2:** "Pick one for item 1: (a) confirm leadership-tier, M1 fix is one landing module, no Phase B; (b) flip to real point-solution market, run Phase 0 vendor research from Bucket 3 then load Phase A / M / B / C / E / F / H; (c) hybrid, leadership-tier landing module plus a starter for the publish-and-news minimum. Then answer items 2 through 7 in order."
- **After Bucket 3:** "If you picked (b) or (c) on Bucket 2 item 1, choose the verification route: vetted Phase 0 vendor research subagent now, or eyeball-mode (you call out which B3-1 through B3-8 candidates ring true and they become Bucket 1 items in the follow-up audit)."

### Report-only follow-ups

Unchanged from 2026-05-30: every cross-domain edge candidate (HCM, EMP-EXP, KM, HRSD, ONBOARDING, LMS, WSC) is owed by the partner domain's next B9 / B8 pass; none loadable from INTRANET's side until Bucket 2 item 1 resolves.

### Candidate domains queued during this audit

No new candidates surfaced in this run. Existing carried candidates (FRONTLINE-COMMS at 3, EMP-ADVOCACY at 4, EMP-LISTENING at 3, EMP-JOURNEY-ORCH at 1) remain pending human triage in `audits/_missing-domains.md`.

## 2026-06-07 - Audit (state-driven execute, bulk batch)

### Summary

State-driven Validate (Rule #21), working only the open items in state.yaml; no fresh from-scratch audit. Live state re-confirmed against domain id 126: still UNBUILT (0 `domain_modules`), 8 capabilities (ids 140-147), 4 `business_function_domains` rows (owner Marketing Communications id 56, contributor HR id 3, contributor Executive id 32, consumer IT Operations id 27), empty `domain_aliases` / `domain_regulations` / `handoffs`, and empty `catalog_tagline` / `catalog_description`. The governing fact is that INTRANET is UNBUILT and its classification route (leadership-tier vs real point-solution market vs hybrid) is an open user decision, so per the Rule #21 UNBUILT clause the agent does not scaffold the build; it executed only the two mechanically-additive items that do not depend on the route, surfaced the rest, and left the cascade.

### Executed (record_status='new', idempotent, verify-live-then-write)

- **Catalog UX (B1B-A4-UX), 1 PATCH:** `domains.id=126` `catalog_tagline` and `catalog_description` were empty (A4 FAIL). Wrote the buyer-voice copy drafted in the 2026-05-30 audit, overriding the prior stale surface-before-write gate per the run order. Voice is route-agnostic internal-communications buyer voice; no vendor names, no em-dash, American English. Neither field overwrote a non-empty value.
- **Aliases (B2-ALIASES / B11), 5 INSERT into `domain_aliases`:** `internal communications`, `employee comms platform`, `digital workplace platform`, `employee app`, `social intranet`. All `alias_type='synonym'`, `domain_id=126`; `record_status` omitted (defaults 'new'); no `notes` column written (Rule #15). Generic market synonyms only, no vendor/product names (Rule #18).

Loader: `.tmp_deploy/2026-06-07_intranet_state_execute.ts` (`bun run`, Rule #4b).

### Surfaced (user decisions; not written)

- **B2-CLASSIFICATION** (gates the whole build): route (a) leadership-tier landing module / (b) real point-solution market 5-8 modules / (c) hybrid landing + starter. The build items (B1A-RECLASS, B1A-BUILD, B1B-M1, B1B-M2-M4) and all 8 b3 candidates remain gated on this.
- **B2-CATALOG-UX-REVIEW** (reframed from the old approval gate): the catalog copy is now written at `record_status='new'`; review/keep, or supply a rewrite (a rewrite is a destructive overwrite, not applied without sign-off), or repivot the voice if route (a) is chosen.
- **B2-CAPABILITY-OWNERSHIP**: whether to load `business_function_capabilities` overrides for INTRANET-MOBILE / INTRANET-SEARCH / INTRANET-FRONTLINE (judgment call; C1 already passes at domain grain).
- **B2-REGULATIONS**: which of GDPR / CCPA / EU Whistleblower Directive / works-council frameworks to attach to the empty `domain_regulations`.
- **B2-MODULARIZATION** (gated on classification): 5-module vs 8-module vs custom split.
- **B2-ADVOCACY-COLLISION**: INTRANET-ADVOCACY capability vs the EMP-ADVOCACY domain candidate (mention_count=4).

### Left

- **The build / cascade (UNBUILT):** B1A-RECLASS, B1A-BUILD, B1B-M1, B1B-M2-M4 left for the build on the chosen route. Not scaffolded (Rule #21 UNBUILT clause).
- **b3 backlog:** all 8 speculative master candidates (intranet_spaces, intranet_pages/posts, announcements triplet, newsletter triplet, employee_directory_entries, journey triplet, frontline triplet, advocacy triplet) carried; each blocked on B2-CLASSIFICATION (and the relevant `_missing-domains.md` triage for the journey / frontline / advocacy triplets).
- No superseded skill-grain / skill_tools / _core items exist on this domain (no supersession header).

### UI links

- https://tests.semantius.app/domain_map/domains?id=eq.126
- https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.126

## 2026-06-13 - Audit (state-driven execute: B9d verify + Phase 0)

### Summary

State-driven Validate (Rule #21), working the open `next_action_by: agent` items. Live state re-confirmed against domain id 126: still UNBUILT (0 `domain_modules`, 0 outbound/inbound `handoffs`, 0 masters); catalog UX copy and 5 `domain_aliases` from 2026-06-07 intact at `record_status='new'`. The only agent-executable item was B1A-B9D-VERIFY; ran it and (per Rule #22) ran the Phase 0 vendor research that grounds the still-open B2-CLASSIFICATION market-shape gate. No catalog writes this pass. After it, no agent-executable work remains; the build is gated entirely on the user's classification route. `next_action_by` -> `user`.

### Executed

- **B1A-B9D-VERIFY (resolved, moved here from state.yaml):** ran `scripts/analytics/b9d_resolver.ts INTRANET --dry-run`. Output: `boundary tags: 0 | distinct (process,owner) findings: 0 | verdicts: {}`. INTRANET has zero handoff boundaries (zero outbound and zero inbound handoffs in the catalog), so there are no payloads to classify in either direction. B9d is now verified clean both ways; nothing to re-point, no MIS-TAG, no ORPHAN, no owner-side b2 to write. The item is closed.
- **Phase 0 vendor research (Rule #22 forcing step for B2-CLASSIFICATION):** the entire build is gated on a market-shape decision, so Phase 0 ran this pass before re-surfacing the question. Report at `.tmp_deploy/INTRANET-phase0-2026-06-13.md`. Verdict: **master-bearing but PARTIAL.** Genuinely owned spine no other domain masters: spaces/pages, news/announcements + targeting + mandatory-acknowledgement receipts (Simpplr Must Reads, Firstup must-read campaigns, Viva mandatory news), internal newsletters + editions + subscriptions (Poppulo Harmony, Workshop, ContactMonkey as newsletter systems of record), mobile push messages, read/open/click receipts. Overlays on dedicated adjacent markets: JOURNEY (Enboarder, ChangeEngine; only Firstup rich among intranet vendors), FRONTLINE (WorkJam, Beekeeper, Crew, YOOBIC), ADVOCACY (Hootsuite Amplify, Sprinklr, GaggleAMP, EveryoneSocial; only Haiilo/Sociabble master it among intranet players). SEARCH is an index over HCM/KM, not an owned master. Recommended route: **(c) hybrid** = ~3 entity-owning modules (PUBLISH, NEWS, NEWSLETTER) + ANALYTICS receipt store; demote journey/frontline/advocacy to overlays, FRONTLINE flagged as a possible standalone domain.

### Phase 0 effect on the open decisions (fresh evidence wins, Rule #22)

The fresh Phase 0 refines the prior B2-CLASSIFICATION recommendation (was route (b), 5-8 co-equal master modules) to route (c) hybrid. Updated B2-CLASSIFICATION and B2-MODULARIZATION in state.yaml with the named-vendor evidence inline, added the 3-module option to B2-MODULARIZATION, and regenerated q1 + q5 to recommend the hybrid / 3-module shape with the vendor evidence cited. No contradiction with the build-gating structure: the route is still the user's call.

### Left (unchanged, all user-gated or non-blocking)

- B1A-RECLASS, B1A-BUILD, B1B-M1, B1B-M2-M4: the build/cascade, gated on B2-CLASSIFICATION; UNBUILT, not scaffolded.
- b2: B2-CLASSIFICATION (now Phase-0-grounded), B2-CATALOG-UX-REVIEW, B2-CAPABILITY-OWNERSHIP, B2-REGULATIONS, B2-MODULARIZATION (now with 3-module option), B2-ADVOCACY-COLLISION.
- b3: 8 speculative master candidates, all gated on the route.

### UI links

- https://tests.semantius.app/domain_map/domains?id=eq.126
- https://tests.semantius.app/domain_map/domain_aliases?domain_id=eq.126
