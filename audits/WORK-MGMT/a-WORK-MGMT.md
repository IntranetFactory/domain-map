# Work Management (WORK-MGMT): questions waiting for you

## What this domain is
Run every team's projects, tasks, and goals in one place, from first request to finished work.

Bring structured work out of scattered spreadsheets and inboxes. Create projects, break them into assignable tasks with owners and due dates, map dependencies, and watch progress on boards, timelines, and dashboards that update as the work moves. Set team objectives and key results, then connect them to the tasks that move them so progress rolls up automatically. Standardize repeatable work with templates, and let automations handle status changes, reminders, and routing. Built for operations, marketing, and any team running cross-functional work that needs one shared view of who is doing what, by when.

---

q1: Four masters were given a default classification on a judgment call. Should I keep all four as classified, or do you want to override any?

- a) Keep all four as-is: work automations = catalog, work sections = catalog, work milestones = operational record, OKR key results = operational record.
- b) Override one or more (tell me which, and the new type, for example work automations to operational workflow or work milestones to operational workflow).

Recommended: a. The defaults are reasonable for each; each one is a single-column change if you later disagree.

a1: how do other vendors handle that

---

q2: The legacy rollup table for this domain still lists only the original 4 masters, while the current per-module table holds all 22. Any audit reading the old table silently sees 4 of 22. How should that be reconciled?

- a) Regenerate the legacy rollup from the current per-module table so both agree.
- b) Declare the legacy rollup vestigial and have all audits key off the per-module table instead.

Recommended: b. The per-module table is already the live source of truth, so retiring the stale rollup is cleaner than maintaining two copies. This is likely a catalog-wide call, not just a Work Management one.

a2:

---

q3: Two capabilities on the same module describe the same concept: a Work-Management-specific goals/OKR capability and the shared, cross-cutting goal-management capability. Should they be deduplicated? (yes/no)

Recommended: yes. Fold into the shared cross-cutting goal-management capability and drop the WM-specific duplicate's link, per the cross-cutting convention.

a3: yes

---

q4: A speculative outbound handoff (a work automation firing toward the PSA domain) has been carried unscoped since late May because the PSA domain has not been audited. How should it be handled?

- a) Queue the PSA audit so PSA can scope or delete it from its side.
- b) Keep deferring it as-is.
- c) Delete the handoff from the Work Management side as out-of-scope speculation.

Recommended: a. Queuing the PSA audit lets the owning side decide; option (c) deletes a row, so it needs your sign-off if you prefer it.

a4:

---

q5: Two outbound goal handoffs to the talent-management domain were tagged with an employee-performance process code, but the goals they carry are actually realized under an organizational-objectives process. Fixing the tag means editing existing records, so I need your call.

- a) Re-point the tag to the organizational-objectives process on both handoffs (keeps the process coverage, just corrects the category).
- b) Remove the process tag from both handoffs entirely.
- c) Leave them as-is.

Recommended: a. The goals are already correctly realized as organizational objectives elsewhere, so re-pointing fixes the mismatch without losing coverage.

a5:

---

q6: One outbound goal handoff to the product-management domain is tagged at a more specific sub-step than where the work is actually realized. Should I move the tag up to the matching parent step? (yes/no) This edits an existing record, so it needs your sign-off.

Recommended: yes. The parent step is where this goal work is realized, so the tag should sit there.

a6:

---

## Optional (will not hold up the build)

q7: A market-surface scan against the leading work-management vendors (Asana, monday.com, ClickUp, Wrike, Smartsheet) found 12 candidate entities not yet modeled, grouped by confidence. Should I research and load the ones that hold up? (yes/no)

- a) Tier 1 (backs a capability that has no master today): proofing sessions plus annotations, work dashboards.
- b) Tier 2 (confident market gaps): work views, non-billable time entries, work portfolios, work-to-goal links, work statuses, work status updates.
- c) Tier 3 (lower confidence, likely just attributes): form routing rules, work item assignees, creative assets, work subtasks, work recurrences, work docs.

Recommended: load Tier 1 and Tier 2, hold Tier 3. Additive only, can happen after the modules exist, and market-audit findings are never auto-loaded without your pick.

a7:

---

<!-- agent map, ignore: q1=B2-ENTITY-TYPE-AMBIGUOUS q2=B2-LEGACY-DDO-ROLLUP-DRIFT q3=B2-CAPABILITY-NEAR-DUP q4=B2-HANDOFF-787-KEEP-OR-DELETE q5=B2-B9D-MISTAG-OKR-PERF q6=B2-B9D-ROLLUP-OKR-PROD q7=B1A-PHASE0-MISSING | domain_id=135 -->
