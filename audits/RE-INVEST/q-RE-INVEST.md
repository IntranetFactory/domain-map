# Real Estate Investment Management (RE-INVEST): questions waiting for you

## What this domain is
Run fund accounting, investor reporting, and portfolio valuation for real estate funds and REITs in one place.

Manage capital calls, distribution waterfalls, and LP statements alongside property-level NOI, cap-rate models, and acquisition underwriting. Roll up portfolio valuations across funds and assets, with audit-ready accounting that connects to your operating property managers and your corporate GL.

---

q1: (answer this first) Who should own the limited-partners master: RE-INVEST or the shared fund-administration domain?

- a) Keep it on RE-INVEST Investor Reporting as a real-estate-specific master (current state), because RE funds have their own LP onboarding, accreditation, and ERISA quirks.
- b) Move ownership to the fund-administration LP-commitments module and have RE-INVEST consume it, so one domain owns LP personal data, K-1 issuance, and consent.

Recommended: a. The current modularization already defaults to RE-INVEST mastery, and the real-estate-specific LP flow justifies it. This is the broadest ownership call: it decides which domain holds LP personal data and statements, so it shapes the rest of the build.

a1:

---

q2: Who should own the asset-management-fees master: RE-INVEST or the shared fund-administration domain?

- a) Keep it on RE-INVEST Fund Accounting as a real-estate-specific fee schedule (current state).
- b) Move ownership to the fund-administration domain, since fee accounting is a generic general-partner mechanic, and have RE-INVEST consume it.

Recommended: a. The current modularization defaults to RE-INVEST, which keeps real-estate acquisition and AUM-based fee quirks local. Pick (b) only if you want all fee accounting centralized.

a2:

---

q3: Should the investment-funds master require a single named approver (for fund formation sign-off)? (yes/no)

Recommended: yes. Fund formation is a deliberate, accountable step that warrants one approver. Setting this flag is a per-record approval, so it needs your sign-off.

a3:

---

q4: Should the limited-partners master be marked as holding personal data (LP names, tax IDs, accreditation status)? (yes/no)

Recommended: yes. LP records carry personal data and should fall under retention and privacy handling. Setting this flag is a per-record approval, so it needs your sign-off.

a4:

---

q5: How should lifecycle states be handled for the two config-shape masters (property valuations and asset-management fees)?

- a) Exempt both from full lifecycle authoring (no state machine), since they are refresh-cadence and ledger-shaped.
- b) Author a minimal three-state machine on property valuations (refresh_scheduled to calculated to published) and exempt asset-management fees.
- c) Author minimal state machines on both.

Recommended: a. Both behave as configuration or ledger entries rather than workflow objects, so a lifecycle adds little. Choose (b) if you want a visible valuation refresh status.

a5:

---

q6: How should the empty catalog tagline and description for the RE-INVEST domain be filled?

- a) Approve the proposed wording verbatim (tagline and description shown under "What this domain is" above).
- b) Rewrite the wording (provide exact text).
- c) Hold; leave both empty.

Recommended: a. The drafted copy is buyer-voice, accurate, and ready. Rule #20 forbids auto-writing this, so it needs your explicit approval.

a6:

---

q7: The rent-payment-received handoff carries two competing process tags. Which should survive as the approved one?

- a) Keep "Receive/Deposit customer payments" and reject the other. Closer match to a received rent payment.
- b) Keep "Generate customer billing data" and reject the other. Reads as upstream billing activity.
- c) Approve both as a legitimate dual classification.

Recommended: a. A received rent payment maps most precisely to receiving and depositing a customer payment.

a7:

---

q8: The property-updated handoff carries a strategic tag and an operational tag. Which should survive as the approved one?

- a) Keep "Confirm alignment of property requirements with business strategy" (operational) and reject the strategic tag.
- b) Keep "Develop property strategy and long term vision" (strategic) and reject the operational tag.
- c) Approve both as a legitimate dual classification.

Recommended: a. A property-updated event is operational, so the operational process is the better match.

a8:

---

q11: Core Financial Management forwards asset management fee to Real Estate Investment Management to post AR activity to the general ledger, but Real Estate Investment Management does not yet have anyone assigned to post AR activity to the general ledger, so this step has no owner. How should it be handled?
- a) Record it now as work Real Estate Investment Management owns, and assign a named owner once Real Estate Investment Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Real Estate Investment Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a11:

---

q12: Cloud Financial Operations forwards property valuation to Real Estate Investment Management to process and record fixed-asset adjustments, enhancements, revaluations, and transfers, but Real Estate Investment Management does not yet have anyone assigned to process and record fixed-asset adjustments, enhancements, revaluations, and transfers, so this step has no owner. How should it be handled?
- a) Record it now as work Real Estate Investment Management owns, and assign a named owner once Real Estate Investment Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Real Estate Investment Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

## Optional (will not hold up the build)

q9: Flagship real-estate-fund platforms model several entities RE-INVEST does not yet have (an acquisition pipeline of deals, rent rolls, NOI calculations, debt facilities, and tax lots for 1031 exchanges). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Each has first-class vendor support, though they still want a verification pass first.

a9:

---

q10: RE-INVEST currently has no regulation linkages. Should I research and add the ones that apply (SEC Custody Rule, AIFMD, GAAP ASC 946, IFRS 9 and IFRS 13, FATCA and FBAR, state Blue Sky laws)? (yes/no)

Recommended: yes, but additive and non-blocking. A quick verification pass should confirm which apply before linking.

a10:

---

<!-- agent map, ignore: q1=B2-LIMITED-PARTNERS-OWNER q2=B2-FEES-OWNER q3=B2-PATTERN-FLAGS.fundsapprover q4=B2-PATTERN-FLAGS.lppii q5=B2-LIFECYCLE-EXEMPT q6=B2-CATALOG-UX q7=B2-H1-301-DOUBLE q8=B2-H1-857-DOUBLE q9=B3-RE-ACQ-PIPELINE+B3-RENT-ROLLS+B3-NOI-CALCULATIONS+B3-DEBT-FACILITIES+B3-TAX-LOTS q10=B3-REGULATIONS q11=B2-B9D-OWN-1359 q12=B2-B9D-OWN-1390 | domain_id=146 -->
