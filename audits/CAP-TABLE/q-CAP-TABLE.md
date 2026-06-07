# Cap Table Management (CAP-TABLE): questions waiting for you

## What this domain is
Keep an accurate, issuer-side record of who owns what, and run every equity workflow on top of it.

This covers the shareholder ledger, option-pool management, 409A valuations, RSU and option grant workflows, exit waterfall modeling, and ASC 718 stock-based compensation accounting. The primary buyer is the portfolio-company CFO running the company's own cap table, not the VC firm.

---

q1: (answer this first) The grant record (equity_grants) is currently mastered by two modules at once (CAP-TABLE-GRANTS and the compensation module COMP-INCENTIVES), and only the compensation side actually runs the grant lifecycle. How should this be resolved?

- a) Move the 7 grant lifecycle states to CAP-TABLE-GRANTS so the cap-table side owns the workflow, and demote the compensation module to contributor (the demotion overwrites a live master row, so it needs your sign-off).
- b) Duplicate the lifecycle so both modules run the same states with module-prefixed permissions (still leaves the question of which row is the canonical master).
- c) Keep it as-is: the compensation side owns the lifecycle and CAP-TABLE-GRANTS stays view-and-reconcile only.

Recommended: a. Flagship vendors (Carta, Pulley, Shareworks) treat the cap-table side as the source of truth for the grant lifecycle. This decision shapes which module realizes the workflow-gate permissions and unblocks the role and permission build (Phase E), so it gates the rest of the work.

a1:

---

q2: Which event should publish a grant proposal from the compensation slice into CAP-TABLE-GRANTS for the cross-domain handoff?

- a) Reuse the existing offer.accepted event (if it is loaded under HCM offer-management).
- b) Author a new event compensation_policy.equity_award_assigned under the compensation module.
- c) Treat the dual-master link as sufficient and wire no handoff.

Recommended: a, if offer.accepted already exists. The event source depends on how the compensation domain is modularized and which event you consider canonical for the proposal trigger, so this is your call.

a2:

---

q3: All 12 cap-table domain_data_objects rows carry populated notes text, which Rule #15 forbids when auto-populated. Were these notes approved by you at load time, or auto-populated by the loader?

- a) Approved at load time: leave them in place.
- b) Auto-populated: clear all 12 notes to empty (destructive overwrite) and log a Rule #15 incident.

Recommended: b, unless you remember approving them. Only the original load author knows the approval status, and clearing them is the conservative fix; because it overwrites non-empty values it needs your sign-off.

a3:

---

q4: Should cap_tables be flagged as containing personal data (has_personal_content=true)? (yes/no)

Recommended: yes. The ledger embeds shareholder names and holdings, which puts it in GDPR / CCPA scope.

a4:

---

q5: Should option_pools be frozen once board-approved (has_submit_lock=true), so the pool size locks until an explicit refresh? (yes/no)

Recommended: yes. The board-approval gate is exactly the kind of lock this flag models.

a5:

---

q6: Should equity_grants be frozen once granted (has_submit_lock=true), so the strike, share count, and vesting schedule lock and amendments require a new grant plus cancellation? (yes/no)

Recommended: yes. Once a grant is issued its terms are fixed; changes go through a fresh grant.

a6:

---

q7: Should valuations_409a be explicitly flagged as not containing personal data (has_personal_content=false)? (yes/no)

Recommended: yes. The row holds fair-market-value figures, not personal data; setting it explicitly removes the ambiguity of a null default.

a7:

---

q8: Should secondary_transactions be flagged as containing personal data (has_personal_content=true)? (yes/no)

Recommended: yes. These are transfers between named holders, which puts them in GDPR scope.

a8:

---

q9: Should asc718_expense_periods be frozen once closed (has_submit_lock=true), matching the closed-period accounting standard? (yes/no)

Recommended: yes. A closed accounting period should not be re-opened by an edit.

a9:

---

q10: When the 6 roles and their bundles load (Phase E), should the role grants enumerate the workflow-gate permissions explicitly, or rely on the permission hierarchy to expand baseline tiers into those gates?

- a) Rely on the hierarchy to expand the gates catalog-wide; keep the bundles tier-only.
- b) Enumerate explicit gate grants for the sensitive verbs (approve_equity_grant, finalize_valuation_409a, approve_secondary_transaction, transfer_shares, board_approve_option_pool, close_asc718_period, void).
- c) Defer the call until Phase E runs, then audit again post-load.

Recommended: a, if the hierarchy already expands the gates. The hierarchy seeding state cannot be read from this audit alone, so the catalog-wide expansion policy is yours to set.

a10:

---

q11: This pass classified asc718_expense_periods as a workflow entity with an open-to-closed lifecycle, while security_classes and vesting_schedules were classified as config-shape (exempt from lifecycle). Do you accept this classification? (yes/no)

Recommended: yes. asc718_expense_periods carries a real closed-period lock, so it was typed as a workflow. Reclassifying it back to config-shape would require deleting its 2 new lifecycle states, which is destructive.

a11:

---

q12: The domain description ends with "Primary buyer is the portfolio-company CFO, not the VC firm." which reads a little like marketing copy, and min_org_size plus cost_band already carry that buyer signal. Keep the sentence or drop it?

- a) Leave the description as-is.
- b) Drop the buyer sentence (a destructive overwrite of the non-empty description), leaving: "Shareholder ledger, option-pool management, 409A valuations, RSU/option grant workflows, exit waterfall modeling, and ASC 718 stock-based compensation accounting."

Recommended: b. The structural fields already encode the buyer, and the rewrite is a clean Rule #18 trim; because it overwrites a non-empty value it needs your confirmation.

a12:

---

## Optional (will not hold up the build)

q13: Flagship vendors model several equity instruments and records the catalog does not have yet (SAFEs, convertible notes, warrants, tax-form records like 3921/3922, board consents, share certificates, ESPP records, phantom-share/SAR/profits-interest grants, beneficial-owner/KYC records, voting/proxy records), some of which would warrant new modules (convertibles, tax-reporting, ESPP, compliance, board-consents). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules settle. These come from analyst vendor knowledge and still want a verification pass first.

a13:

---

q14: Two cross-domain handoffs show up in the flagship set but are not wired: stock-based-comp expense pushed to the general ledger on asc718_expense_period.closed, and e-signature records flowing back for grant acceptance and board consents. Should I add them? (yes/no)

Recommended: yes, pending a quick check of the partner domains (ERP-FIN and ESIGN). Additive and non-blocking.

a14:

---

q15: Should I attach the additional jurisdiction and compliance regulations the vendor set implies (GDPR / CCPA, UK EMI, UK CSOP, German VSOP, FinCEN Corporate Transparency Act, SEC Reg CF)? (yes/no)

Recommended: yes for the ones that match your jurisdictions; the US-anchored statutes are already attached. Additive and non-blocking.

a15:

---

q16: Should I queue the two adjacent domain candidates this audit surfaced (EQUITY-COMP-PLATFORM for the equity-comp overlap with the compensation domain, and PRIVATE-COMPANY-TRANSFER-AGENT for the third-party transfer-agent role)? (yes/no)

Recommended: yes for EQUITY-COMP-PLATFORM (it passes the point-solution-market test and is already queued); PRIVATE-COMPANY-TRANSFER-AGENT is borderline and often bundled into cap-table software. Non-blocking.

a16:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 q4=B2-S4.captables_pii q5=B2-S4.optionpools_lock q6=B2-S4.equitygrants_lock q7=B2-S4.valuations_nopii q8=B2-S4.secondary_pii q9=B2-S4.asc718_lock q10=B2-S5 q11=B2-S6 q12=B2-S7 q13=B3-CAND-01,B3-CAND-02,B3-CAND-03,B3-CAND-04,B3-CAND-05,B3-CAND-06,B3-CAND-07,B3-CAND-10,B3-CAND-11,B3-CAND-12,B3-MOD-01,B3-MOD-02,B3-MOD-03,B3-MOD-04,B3-MOD-05 q14=B3-CAND-08,B3-CAND-09 q15=B3-REG-01,B3-REG-02,B3-REG-03,B3-REG-04,B3-REG-05,B3-REG-06 q16=B3-DOM-01,B3-DOM-02 | domain_id=162 -->
