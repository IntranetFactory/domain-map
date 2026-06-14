# Computer-Aided Facility Management (CAFM): questions waiting for you

## What this domain is
Run a smaller building without the enterprise overhead: book desks, reserve rooms, log fix-it tickets, and sign in visitors from one place.

Give a lean facilities team the everyday tools to keep a workplace running without standing up a heavy enterprise platform. Employees book a desk or reserve a meeting room from a simple floor map, so people know where to sit and rooms stop double-booking. When something breaks, anyone can raise a maintenance ticket and watch it move from reported to scheduled to fixed, with the work tracked against the right space. Front-desk staff register visitors, print badges, and keep a clean record of who was on site and when. Space allocation stays light: see how desks and rooms are assigned, spot the floors that are crowded or empty, and right-size the layout from occupancy trends rather than guesswork. This is the mid-market and small-business tier of workplace management, focused on reservations and basic service workflow, and intentionally lighter on utility metering and lease accounting than a full enterprise workplace suite.

---

q1: (answer this first) CAFM today has zero modules and masters its own data, and it overlaps heavily with the enterprise IWMS domain (shared capabilities, shared vendors, overlapping scope). How should CAFM be handled?

- a) Keep CAFM and build it out as its own domain (1 or 2 modules of its own).
- b) Fold CAFM into IWMS as a small-business deployment tier, then queue the CAFM domain for retirement.
- c) Keep both, but rename the shared capabilities to domain-neutral names first, then load each domain's tier-specific data separately.

Recommended: a. SMB-focused CAFM specialists, FMX (k12 and mid-market facilities, no lease accounting at all), Officespace, and Tango Workplace, sell a credible smaller-buyer product distinct from the enterprise IWMS platforms (IBM TRIRIGA, Planon, MRI OnCore, Spacewell), while Archibus, Nuvolo, Eptura, and Accruent package both tiers; that vendor split tracks CAFM's 20 to 500 seats at the $$ band versus IWMS at $$$, which justifies keeping it distinct. This is the gate for the entire build: every module, owner, master, role, and skill below depends on it.

a1:

---

q2: Should the three shared capabilities (Space Optimization, Maintenance, Occupancy Analytics) be renamed from their real-estate-prefixed codes to domain-neutral codes, since they now span three or more domains?

- a) Rename them to domain-neutral codes (only meaningful if q1 is a or c).
- b) Leave them as-is (only consistent if q1 is b, since then they span just two domains).

Recommended: a. The convention is that a capability spanning three or more domains drops the domain prefix, and these span real estate, IWMS, and CAFM. Renaming an existing capability code overwrites a current value, so it needs your sign-off.

a2:

---

q3: Should CAFM stay marked as not requiring certification?

- a) Keep it false (the small-business CAFM market is not vendor-certified; OSHA, ADA, and EHS overlays are jurisdictional, not product certification).
- b) Flip it to true (only if you have evidence of a CAFM-specific product or implementer certification regime).

Recommended: a. The live value is already false and the SMB facilities market has no product certification regime; jurisdictional overlays are not the same thing.

a4:

---

q4: CAFM is recorded as serving organizations of 20 to under 500 seats, versus IWMS at 30 to under 2500. Is that small-business-versus-enterprise size split real and intentional?

- a) Keep the current values (the asymmetry is what justifies keeping CAFM distinct in q1).
- b) Adjust them if you had a different intent.

Recommended: a. Both live values were confirmed and the asymmetry is genuinely present; it is the main evidence for keeping CAFM separate.

a5:

---

q5: CAFM is recorded at the $$ cost band (roughly 25k to 100k) versus IWMS at $$$ (roughly 100k to 500k). Is that buyer-tier difference real?

- a) Keep the current values (the asymmetry reinforces keeping CAFM distinct in q1).
- b) Adjust them if you had a different intent.

Recommended: a. Both live values were confirmed and the buyer-tier gap is real, reinforcing the keep-distinct case.

a6:

---

q6: If CAFM stays distinct, where should lease accounting and utility tracking live? CAFM's own description excludes both.

- a) Route lease accounting to the queued lease-accounting candidate domain.
- b) Route utility tracking to a new energy-management candidate domain.
- c) Embed the utility-operations meter master into CAFM as an embedded, optional master.

Recommended: a and b together (keep both out of CAFM proper). CAFM's description deliberately excludes lease accounting and utility metering, so routing each to its own specialist domain keeps CAFM light; option c is only worth it if a quick vendor pass shows meter readings really belong inside the booking workflow.

a7:

---

## Optional (will not hold up the build)

q7: Should I research and add desk check-ins (occupancy verification at a booked desk via badge tap or QR scan, separate from the booking itself)? (yes/no)

Recommended: yes, pending a quick vendor check on whether flagships model it as its own record or just a status on the booking. It is near-universal in modern hot-desking products. Additive and non-blocking; it would be IWMS-canonical and embedded in CAFM only if CAFM stays distinct.

a8:

---

q8: Should I research and add a space-categories config table (office, meeting, collaboration, storage, common, restricted)? (yes/no)

Recommended: yes, pending a quick vendor-surface check. It is a simple config-shape master. Additive and non-blocking; it would be IWMS-canonical and embedded in CAFM only if CAFM stays distinct.

a9:

---

<!-- agent map, ignore: q1=B2-FOLD-VS-DISTINCT q2=B2-CAPABILITY-RENAME q3=B2-CERT-REQUIRED q4=B2-MIN-ORG-SIZE-CROSSCHECK q5=B2-COST-BAND-CROSSCHECK q6=B2-LEASE-UTIL-OWNERSHIP q7=B3-DESK-CHECKINS q8=B3-SPACE-CATEGORIES | domain_id=142 -->
