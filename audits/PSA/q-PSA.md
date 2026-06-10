# Professional Services Automation (PSA): questions waiting for you

## What this domain is
Run the full life of a client engagement, from the sold scope through delivery to the invoice. Plan and staff service projects, track the people and skills you have against the work you have sold, capture time and expenses, then turn delivered work into billing milestones, recognized revenue, and a clear read on project profitability and resource utilization.

---

q1: (answer this first) How should PSA relate to the revenue-recognition records that the Subscription Management domain owns, given PSA currently runs the recognition state machine and a write tool on a record it does not master?

- a) PSA stays a contributor: move the recognition lifecycle states to a Subscription Management module (or clear the module link) and change PSA's recognize-revenue tool to a compute step that proposes the record for Subscription Management to commit.
- b) PSA co-masters the project-revenue slice: add a second master row on the PSA financials module and record the slice split here, leaving subscription revenue with Subscription Management.
- c) Leave it as-is and accept that the recognition permission would materialize under the wrong domain prefix.

Recommended: a. The record is mastered by Subscription Management, so keeping PSA as a contributor and proposing the value (rather than directly writing it) is the cleanest boundary. This choice also settles how the related self-containment fix below is applied, so it unlocks the rest.

a1:

---

q2: Were the roughly 20 PSA-touching `notes` fields auto-populated at load time (so they can be reverted to empty and logged as a Rule #15 cleanup), or were they user-approved content that should stay?

- a) Auto-populated: revert all to empty and log the cleanup.
- b) User-approved: leave them intact.
- c) Per-row review.

Recommended: a. The notes carry dated mechanical tags like "Pattern flags considered (2026-05-26 audit)" that match the auto-population pattern, and Rule #15's default is to revert. Reverting non-empty values is destructive, so it needs your sign-off.

a2:

---

q3: Which workflow pattern flags should be turned on for the PSA operational masters (for example personal-content on project assignments, submit-lock on billing milestones, single-approver on service projects)?

- a) Set the recommended flags per master and leave the rest off.
- b) Leave all flags off for now.
- c) Per-flag review before any change.

Recommended: a. The flags encode workflow shape that you own; the audit can propose the obvious ones (assignment personal content, milestone submit-lock) but you make the final call.

a3:

---

q4: Two inbound handoffs land in PSA with no target module because no PSA module models their payload (a WORK-MGMT work-automation trigger and an AGENCY-MGMT approved creative brief). How should they be handled?

- a) Add consumer (optional) rows on the project-delivery module for both payloads and point the handoffs at it.
- b) Delete both handoffs as mis-modeled.
- c) Read each one separately and decide per row.

Recommended: a. A delivery team receiving an automation-driven status change, or kicking off an engagement from an approved brief, is a legitimate consumer relationship. Option (b) deletes data, so it needs your confirmation either way.

a4:

---

q5: Is a CRM renewal opportunity a distinct event from a normal closed-won opportunity, so it needs its own CRM-to-PSA handoff?

- a) Same shape as the existing closed-won handoff: no new handoff needed.
- b) Distinct: author a separate renewal-opportunity handoff into project delivery.

Recommended: a. Renewals close-won like any other opportunity, so the existing handoff already covers them unless your CRM models renewals as a separate event.

a5:

---

q6: Seven cross-domain dependency rows on PSA modules break module self-containment (consumers or contributors marked required against foreign-mastered entities like opportunities, employees, job profiles, legal contracts, and revenue-recognition records). Should I apply the recommended per-row fix (carry a local shell where the data is needed locally, otherwise relax "required" to "optional")? (yes/no)

Recommended: yes. Each fix follows the standard self-containment rule, but each one overwrites an existing row, so it needs your sign-off. The revenue-recognition row in this set follows whatever you decide in q1.

a6:

---

q7: Two weak auto-derived process tags (the generic "assign resources to project" mapping on handoffs 132 and 1129) are now redundant because both handoffs carry a stronger curated tag. Should I delete the two weak rows? (yes/no)

Recommended: yes. Both targets (contingent-staff procurement and the CRM renewal trigger) are not internal resource assignment, so the weak tag is wrong and now duplicated. Deleting rows is destructive, so it needs your confirmation.

a7:

---

q8: Some pre-existing content uses British spellings (the "Utilisation Tracking" capability, "utilisation" in the domain and master descriptions, and a "revenue.recognised" trigger event). Should I correct these to American English? (yes/no)

Recommended: yes, but low priority. Overwriting non-empty values is destructive, so it needs your sign-off; newly authored copy is already American English.

a8:

---

q9: One cross-domain process tag is on the wrong handoff. The handoff where a reached billing milestone updates the linked contract's obligations in Contract Lifecycle Management is currently tagged to a finance-forecasting process, which does not describe that work. The right fit is the "Manage contracts" process, which CLM already runs. Should I re-tag it? (yes/no)

Recommended: yes. The current tag ("prepare periodic financial forecasts") does not match "a milestone is reached and the contract obligation updates"; re-pointing it to "Manage contracts" makes the link resolve correctly. Replacing the existing tag is a destructive edit, so it needs your sign-off.

a9:

---

## Optional (will not hold up the build)

q10: Twelve extra PSA entities show up across the flagship vendors (engagement quotes, change requests, risks, status reports, deliverables, rate cards, project budgets, staged invoices, staffing requests, capacity plans, utilization records, and project-profitability records). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the open decisions above are settled. Several are common across the vendor set, though each still wants a verification pass first.

a10:

---

q11: Two optional module splits are possible once the new entities exist: a dedicated engagement-quoting module (estimates, rate cards, pursuit tracking) and a profitability-analytics module (project profit plus utilization), pulling those out of project delivery and financials. Should I plan for these splits? (yes/no)

Recommended: yes in principle, but only worth doing once the underlying entities from q10 are loaded; until then the current four modules are fine.

a11:

---

q12: PSA currently carries only the ASC 606 revenue regulation. Should I add the other regulations the vendor surface implies (DCAA for US government contractor billing, SOX significant-engagement attestation, and GDPR for consultant personal data)? (yes/no)

Recommended: yes where they apply to you. DCAA applies to US government contract work, SOX to public companies with material services contracts, GDPR to EU consultant data; pick the subset that fits. Low stakes, does not block the build.

a12:

---

<!-- agent map, ignore: q1=B2-S3 q2=B2-S1 q3=B2-S2 q4=B2-S4 q5=B2-S5 q6=B1A-SELF-CONTAIN q7=B1A-H1-REPLACE-DELETIONS q8=B1A-AMENG-OVERWRITE q9=B1A-B9D-MISTAG-1020 q10=B3-engagement_quotes+B3-project_change_requests+B3-project_risks+B3-project_status_reports+B3-project_deliverables+B3-billing_rate_cards+B3-project_budgets+B3-project_invoices+B3-staffing_requests+B3-capacity_plans+B3-utilization_reports+B3-project_profitability_records q11=B3-mod-engagement-quoting+B3-mod-profitability-analytics q12=B3-reg-dcaa+B3-reg-sox+B3-reg-gdpr | domain_id=68 -->
