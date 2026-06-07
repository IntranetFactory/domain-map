# Commercial Real Estate Operations (RE-CRE): questions waiting for you

## What this domain is
Run commercial real estate operations end to end: the leasing pipeline from letter of intent to executed lease, CAM (common-area-maintenance) reconciliations and rent escalations, stacking plans, building certifications, and market-comp views for office, retail, and industrial portfolios. It tracks tenant credit reviews and sublease transactions alongside the leases themselves, and hands signals off to investment, contract-lifecycle, accounts-payable, and audit teams. The three modules are already in place (Leasing, CAM Ops, Space and Market Intel); these questions cover the workflow-shape and scope-boundary calls that finish the build.

---

q1: (answer this first) Handoff 304 (RE-CRE to Field Service Management) carries the payload "tenant maintenance requests", but that entity is mastered by Residential Property Management, not RE-CRE. How should this boundary violation be resolved?

- a) Delete handoff 304 (and its process tag), since Residential Property Management already owns the residential maintenance handoff to Field Service Management.
- b) Author a CRE-scoped "cre tenant maintenance requests" entity on RE-CRE and re-point the handoff payload at it.
- c) Accept "tenant maintenance requests" as a contributor entity on a RE-CRE module and keep the handoff as is.
- d) Re-source the handoff so it fires from Residential Property Management instead of RE-CRE.

Recommended: a. RE-CRE does not master this entity in any of its three modules and Residential Property Management already owns the residential maintenance lifecycle, so the cleanest fix is to remove the mis-routed handoff. This is a destructive change (delete), so it needs your sign-off. It also unblocks the source-module wiring on the remaining handoffs, which is why it comes first.

a1:

---

q2: For the five cross-domain relationships from RE-CRE payloads, can you confirm the target master records exist (and supply their ids), or should the Investment relationships wait?

- a) Supply ids now for: investment property holdings (Investment), investment underwriting (Investment), payable invoices (Accounts Payable), real estate properties (Real Estate, id 344 exists), real estate transactions (Brokerage, id 353 exists).
- b) Defer the two Investment edges until the Investment domain is audited, and wire only the masters that already exist.

Recommended: b. The Investment domain has not been audited under the current schema, so its target masters may not exist yet or may carry different names; wire what is confirmed and defer the rest.

a2:

---

q3: The "investment properties" entity is attached to the Leasing module as a required contributor. Should that stay, or change?

- a) Keep it as a required contributor on Leasing (current state).
- b) Demote it to an embedded master that is optional (the infrastructure-master pattern).
- c) Rename the entity to "cre investment holdings" to disambiguate it from the Investment domain's master.

Recommended: b. The entity is the canonical Investment-domain concept, so treating it as an embedded, optional master matches how a shared infrastructure master should appear here. Confirming where the canonical master lives needs Investment-domain context.

a3:

---

q4: Should commercial leases be frozen once executed, so the terms cannot be quietly edited afterward? (yes/no)

Recommended: yes. Lease terms freeze on execution; locking the record preserves the signed agreement.

a4:

---

q5: Should commercial leases have a single named approver (one landlord-side signing approver per lease)? (yes/no)

Recommended: yes. A lease is signed off by one accountable landlord-side approver.

a5:

---

q6: Should tenant credit records be treated as containing personal data (principal SSN, financial statements, personal guarantees)? (yes/no)

Recommended: yes. They hold personal financial data and fall under privacy and retention rules.

a6:

---

q7: Should tenant credit records have a single named approver (the credit decision is one underwriter's call)? (yes/no)

Recommended: yes. A credit decision is a single underwriter approval.

a7:

---

q8: Should sublease transactions be frozen once executed? (yes/no)

Recommended: yes. Sublease terms freeze on execution, like the head lease.

a8:

---

q9: Should sublease transactions have a single named approver (landlord consent is one approval)? (yes/no)

Recommended: yes. Landlord consent to a sublease is a single approval.

a9:

---

q10: Should building certifications be frozen once earned (the certifying body's award freezes the record)? (yes/no)

Recommended: yes. The award from the certifying authority is a fixed artifact.

a10:

---

q11: Should CAM charges be frozen once reconciled (the reconciliation freezes after publication)? (yes/no)

Recommended: yes. A published reconciliation should not change after the fact.

a11:

---

q12: Which regulations should be tagged onto RE-CRE?

- a) All five: ASC 842, IFRS 16, ADA, Fair Housing Act, OSHA.
- b) The universal three only: ASC 842, IFRS 16, ADA.
- c) A subset you choose.

Recommended: b. ASC 842 (US lease accounting), IFRS 16 (international lease accounting), and ADA (building accessibility) are universal to commercial real estate; the Fair Housing Act and OSHA are situational (mixed-use residential, building safety) and depend on your portfolio.

a12:

---

q13: Two inbound handoffs carry duplicate process tags. May I delete the two redundant rows (keeping the parent-level / analyst-curated tag on each)?

Recommended: yes. On handoff 297 keep the L3 process tag and delete the deeper L5 duplicate; on handoff 856 keep the L4 analyst tag and delete the substring-matched duplicate. This is a destructive change (delete), so it needs your sign-off.

a13:

---

## Optional (will not hold up the build)

q14: Six additional CRE entities show up across the flagship vendors (rent rolls, tenant improvement allowances, percentage-rent calculations, lease abstracts, market comparables, letters of intent). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. Each is a first-class artifact in the major CRE platforms (Yardi, MRI, VTS, CoStar, Lucernex, Argus), though they still want a verification pass and a collision check against commercial leases first.

a14:

---

<!-- agent map, ignore: q1=B2-S3 q2=B2-S2 q3=B2-S4 q4=B2-S5.cl_submit_lock q5=B2-S5.cl_single_approver q6=B2-S5.tcr_personal_content q7=B2-S5.tcr_single_approver q8=B2-S5.sub_submit_lock q9=B2-S5.sub_single_approver q10=B2-S5.bc_submit_lock q11=B2-S5.cam_submit_lock q12=B2-S7 q13=B1B-H1 q14=B3-S1+B3-S2+B3-S3+B3-S4+B3-S5+B3-S6 | domain_id=145 -->
