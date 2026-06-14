# Portfolio Monitoring (PORT-MONIT): questions waiting for you

## What this domain is
Track how your private-equity and venture-capital portfolio is performing, from the individual companies you hold all the way up to fund-level returns and the reports your limited partners receive. It pulls in portfolio-company KPIs and ESG data, runs fair-value valuations, computes fund performance (IRR, MOIC, TVPI, DPI), and produces the quarterly packets that go out to investors.

---

q1: (answer this first) Where should LP reporting live?

- a) Keep lp_quarterly_reports in PORT-MONIT (the LP-Reporting module stays part of this domain).
- b) Split LP-Reporting into a new LP-side domain (an LP analytics platform) and queue it for separate modeling.
- c) Move lp_quarterly_reports into Fund Administration (closer to the commitments and capital-account ledger).

Recommended: a. The GP-side suites Allvue and eFront bundle LP reporting inside the portfolio-monitoring domain, which is exactly the shape PORT-MONIT (a GP-side monitoring domain) already carries; only the LP-analytics products Chronograph and Cobalt LP run it as a separate LP-side platform, so option (b) is a real packaging but a destructive split, and option (c) is a re-master, both of which can wait. This choice reshapes the domain and one optional item below, so settle it first.

a1:

---

q2: Which compliance regulations should be loaded onto this domain?

- a) All five with applicability flags: ASC 820, SFDR, AIFMD Annex IV, Form PF, and ILPA Quarterly Reporting Standards.
- b) US-only first: ASC 820, Form PF, and ILPA.
- c) EU-only first: SFDR and AIFMD.
- d) Defer SFDR and AIFMD until an EU-only split is modeled.
- e) Skip regulations entirely.

Recommended: a. The domain's business logic already anchors ASC 820 and SFDR, and ASC 820, SFDR, AIFMD, and Form PF are each mandatory for the funds they cover. This answer also unlocks the three compliance entities (SFDR, AIFMD, Form PF) that are blocked on it.

a2:

---

q3: For the regulations you load in q2, should I use the applicability wording the audit drafted per regulation, or will you supply your own?

- a) Use the audit's wording: mandatory for US GAAP reporters (ASC 820), mandatory for EU AIFMs (SFDR and AIFMD), mandatory for US advisers above $150M AUM (Form PF), industry best practice (ILPA QRS).
- b) I will supply the exact applicability text per regulation.

Recommended: a. The drafted wording matches each regulation's real scope; pick (b) only if your firm's policy needs different phrasing.

a3:

---

q4: The two analyst-side verbs on the user edges ("observes" portfolio companies, "computes" valuations) read differently from peer domains. Change them?

- a) Keep all seven user-edge verbs as-is.
- b) Patch to the more standard verbs (for example monitors and produces) for symmetry with peer domains.
- c) Patch each row individually.

Recommended: a. The verbs read fine and are intentional analyst-flavor; changing them overwrites non-empty values, so it needs your sign-off if you want it.

a4:

---

q5: How should the funds master (owned by Fund Administration) be embedded in the Fund-Performance and LP-Reporting modules?

- a) Keep it as an embedded master, required (a smaller shop can run these modules without deploying Fund Administration).
- b) Downgrade both modules to consumer, required (assumes Fund Administration is always co-deployed).
- c) Downgrade only Fund-Performance to consumer and keep LP-Reporting embedded (LP-Reporting may ship lite standalone).
- d) Keep embedded but flip both modules' necessity to optional.

Recommended: a. The deployability-first shape lets these modules stand alone; downgrading a non-empty role or necessity is destructive, so it needs your call.

a5:

---

q6: The ESG/diversity-tracking capability is currently single-domain. Promote it to a shared, domain-neutral ESG metric-collection capability and link it to the ESG domain too? (yes/no)

Recommended: yes. The ESG domain already exists and vendors market the same collection shape across both, so a cross-cutting capability is the right model. Renaming the capability is destructive, so it needs your confirmation.

a6:

---

q7: Handoff 1039 (a closed deal becoming a portfolio company) is tagged with the broad "Manage portfolio" process. A more specific process exists ("Develop merger/demerger/acquisition/exit strategy"). How should it be tagged?

- a) Replace the broad tag with the more specific one.
- b) Keep the existing broad tag.
- c) Add the specific one as a second tag alongside the broad one.

Recommended: a. Convention leads with the single most-specific process, and a deal closing into a new holding maps best to the acquisition/exit-strategy process. Replacing the existing tag overwrites a value, so it needs your call.

a7:

---

q8: Handoff 1042 (a fund distribution feeding fund performance) carries two process tags: "Produce quarterly/annual filings" and "Process and distribute payments." Keep both or trim?

- a) Keep both tags.
- b) Demote the payments tag and keep the reporting one ("Produce quarterly/annual filings").
- c) Leave it for a later reviewer pass.

Recommended: b. The handoff is about feeding performance reporting, so the filings tag is the right lead and the payments tag is surplus. Removing a tag is destructive, so it needs your sign-off.

a8:

---

q9: Handoff 1043 (a final valuation feeding capital-account statements) carries two process tags: "Process and record fixed-asset adjustments" (specific) and "Perform general accounting and reporting" (broad). Keep both or trim?

- a) Keep both tags.
- b) Demote the broad accounting tag and keep the specific one.
- c) Leave it for a later reviewer pass.

Recommended: b. Convention leads with the single most-specific process, and the broad general-accounting tag adds little here. Removing a tag is destructive, so it needs your sign-off.

a9:

---

q13: Cap Table Management and Equity Administration forwards portfolio company to Portfolio Monitoring for Private Capital to develop exit strategy, but Portfolio Monitoring for Private Capital does not yet have anyone assigned to develop exit strategy, so this step has no owner. How should it be handled?
- a) Record it now as work Portfolio Monitoring for Private Capital owns, and assign a named owner once Portfolio Monitoring for Private Capital sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Portfolio Monitoring for Private Capital decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Investor Relationship and Deal Flow Management forwards portfolio company to Portfolio Monitoring for Private Capital to manage portfolio, but Portfolio Monitoring for Private Capital does not yet have anyone assigned to manage portfolio, so this step has no owner. How should it be handled?
- a) Record it now as work Portfolio Monitoring for Private Capital owns, and assign a named owner once Portfolio Monitoring for Private Capital sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Portfolio Monitoring for Private Capital decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

## Optional (will not hold up the build)

q10: Five extra entity candidates show up across the flagship PE/VC monitoring vendors (co-investment positions, peer benchmarks / portco peer groups, GP attribution analyses, valuation-committee meetings, portco management metrics). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the main decisions above. Each still wants a verification pass before loading.

a10:

---

q11: Should the LP-Reporting module reference the capital-call notice (mastered in Fund Administration), either as a consumer link or a runtime cross-reference? (yes/no)

Recommended: yes, pending q1. If LP-Reporting splits or moves, this reshapes against the new home; otherwise a consumer link is the lighter option.

a11:

---

q12: Multi-currency funds need normalized FX rates. Should currency/FX rates become a shared, catalog-wide master rather than living inside this domain? (yes/no)

Recommended: yes in principle, but it is a catalog-wide master-promotion conversation that touches Fund Administration, INV-CRM, ESG, and Cap-Table too, so it should be scheduled across those domains rather than fixed inside Portfolio Monitoring alone.

a12:

---

<!-- agent map, ignore: q1=B2-4 q2=B2-1 q3=B2-6 q4=B2-2 q5=B2-3 q6=B2-5 q7=B2-7 q8=B2-8.h1042 q9=B2-8.h1043 q10=B3-1+B3-2+B3-3+B3-4+B3-5 q11=B3-6 q12=B3-7 q13=B2-B9D-OWN-354 q14=B2-B9D-OWN-409 | domain_id=161 -->
