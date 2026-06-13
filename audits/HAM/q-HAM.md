# Hardware Asset Management (HAM): questions waiting for you

## What this domain is
Track every piece of company hardware from purchase to disposal. Keep the asset register, the model catalog, and the spare-parts stockroom in sync; manage warranties and renewals; and run the end-of-life flow (retire, sanitize, certify, dispose) with the chain-of-custody and compliance evidence that retired devices demand. The domain is split into two modules today: an Asset Registry (assets and models) and a Warranty and Parts area (warranties, disposal records, spare parts).

---

q1: (answer this first) The five hardware masters were never given a positive workflow-flag review (they all sit at default false). Which flag flips should I make?

- a) Accept all four recommended flips: lock the disposal record once a certificate is issued, require a single disposition-officer sign-off on disposal, treat the asset record as personal data, and lock a warranty once its contract is signed.
- b) Decide each flip individually (tell me yes or no per flag).
- c) Reject all flips and keep every master at false.

Recommended: a. Each flip matches a real workflow constraint a hardware-asset platform enforces, and this decision also shapes which lifecycle transitions need a permission, so it unblocks the held state-machine work. This is the lever the rest of the build hangs from.

a1:

---

q2: How should the inbound handoff carrying discovery scan records into this domain be handled? Hardware Asset Management does not model scan records as something it consumes.

- a) Add the scan record as an optional consumed dependency on the Asset Registry module, so the consumption is captured.
- b) Delete the handoff as mis-routed: the per-asset "device discovered" event is the real downstream consumer, not the scan record itself.
- c) Keep it as-is and defer.

Recommended: b. The per-asset discovered event already carries the downstream signal, so the scan record handoff looks mis-routed. Deleting a handoff is destructive, so it needs your sign-off.

a2:

---

q3: How should the inbound handoff from the device-enrollment domain (firing when an enrolled device is retired) be handled? The canonical direction is usually the reverse: this domain owns the asset lifecycle and enrollment follows.

- a) Keep the handoff as-is (accept that enrollment retirement can drive asset retirement).
- b) Delete it as mis-routed.
- c) Flip the direction so this domain notifies the enrollment domain when a hardware asset retires.

Recommended: c, pending the wider IT-ops cluster reconciliation. The asset lifecycle should lead. Delete or flip is destructive, so it needs your call.

a3:

---

q4: There are two user-to-asset relationship edges with overlapping meaning: "assigned hardware" (the current end-user holder) and "custodian of assets" (the IT staffer managing it). How should they be modeled?

- a) Keep both as distinct edges and rewrite them to verb-shape (assigned-to and custodian-of).
- b) Collapse them into one "owns hardware asset" edge and drop the other.
- c) Keep both and add a third edge for the disposal approver.

Recommended: a. Assignee and custodian are genuinely different actors, so keeping both (in verb-shape) is the cleanest. Your answer here sets the verb-rewrite shape, and rewriting those existing edges is destructive, so the rewrite itself still needs your sign-off.

a4:

---

q5: Should the disposal area model an optional dependency on the upstream asset-lifecycle-events record, so the inbound handoff that triggers the disposal flow resolves cleanly?

- a) Add it as an optional consumed dependency on the Warranty and Parts module.
- b) Treat the disposal trigger as internal and leave the inbound handoff as a side channel.

Recommended: a. Capturing the dependency lets the handoff attribute to the right module and mirrors how other inbound consumptions are modeled.

a5:

---

q6: Which disposal compliance frameworks should be linked to this domain? Nothing is linked today.

- a) Conservative: RoHS, WEEE, and NIST 800-88 media sanitization only.
- b) Comprehensive: all six (RoHS, WEEE, NIST 800-88, GDPR right-to-erasure, HIPAA, and recycler certifications).
- c) Defer until the separate IT-asset-disposition market candidate is triaged.

Recommended: c. The disposition-market triage may pull these frameworks onto a future disposal domain instead, so deferring avoids linking them twice. Low stakes, does not block the build.

a6:

---

q7: Two outbound handoffs (spare-parts low-stock and warranty-expiring, both going to the source-to-pay domain) currently share one process tag. How should they be tagged?

- a) Keep both on the shared requisition process.
- b) Switch low-stock to inventory management and warranty-expiring to warranty-claim processing, so each reflects its distinct payload (each switch overwrites an existing tag).
- c) Keep the shared tag and stack the more specific tags alongside it.

Recommended: c. Stacking is additive and keeps both readings, where option b would overwrite existing tags and lose the umbrella. Low stakes, does not block the build.

a7:

---

q8: Two near-duplicate discovery trigger events point at the asset master with identical text. Should I merge them: keep "device discovered" as canonical, re-point the inbound handoffs at it, correct its event category, and delete the duplicate? (yes/no)

Recommended: yes. They are clear duplicates and the surviving event's category is wrong for a discovery event. Deleting the duplicate and overwriting the category is destructive, so it needs your sign-off.

a8:

---

q9: One outbound handoff to the remote-management domain is wired to an event whose underlying record belongs to that other domain, not to a hardware asset. Should I author a proper hardware-asset-retired event and re-point the handoff at it? (yes/no)

Recommended: yes. The handoff means "when a hardware asset retires," so it should fire on a hardware-owned event. Re-pointing the handoff is a destructive re-attribution, so it needs your sign-off.

a9:

---

q10: One inbound handoff carries a stale note ("target NULL until HAM is modularized") that no longer applies, since the domain is now modularized. Should I clear that note and log the correction? (yes/no)

Recommended: yes. The condition the note described is satisfied and the note should not have been written. Clearing an existing note value is destructive, so it needs your sign-off.

a10:

---

q11: One inbound handoff still carries a stale placeholder process tag pointing at a top-level root, which a clean targeted tag already supersedes. Should I delete the placeholder tag? (yes/no)

Recommended: yes. The clean tag already covers it, so the placeholder is redundant. Deleting it is destructive, so it needs your sign-off.

a11:

---

q14: MSP Professional Services Automation forwards hardware asset to Hardware Asset Management to maintain IT asset records, but Hardware Asset Management does not yet have anyone assigned to maintain IT asset records, so this step has no owner. How should it be handled?
- a) Record it now as work Hardware Asset Management owns, and assign a named owner once Hardware Asset Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Hardware Asset Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: Core Financial Management forwards hardware disposal record to Hardware Asset Management to reconcile fixed-asset ledger, but Hardware Asset Management does not yet have anyone assigned to reconcile fixed-asset ledger, so this step has no owner. How should it be handled?
- a) Record it now as work Hardware Asset Management owns, and assign a named owner once Hardware Asset Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Hardware Asset Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a15:

---

## Optional (will not hold up the build)

q12: Flagship hardware-asset platforms all model extra masters this domain does not have yet (asset categories, time-bounded assignments, movement and chain-of-custody logs, stockrooms, depreciation schedules, consumables, physical inventory audits, refresh plans, and data-sanitization certificates). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the open decisions land. Several are common across the vendor set, though they still want a verification pass first.

a12:

---

q13: IT Asset Disposition is a real point-solution market downstream of this domain (secure sanitization, chain of custody, e-waste recycling, certificates of destruction, resale, disposal reporting). Should I research it as a candidate domain of its own? (yes/no)

Recommended: yes in principle, but it is queued as a non-blocking idea and cross-informs the compliance-framework question above.

a13:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 q4=B2-S4+B1B-S11 q5=B2-S5 q6=B2-S6 q7=B2-S7 q8=B1A-S6 q9=B1A-S9 q10=B1A-S12 q11=B1A-H1-RESIDUAL q12=B3-S1+B3-S2+B3-S3+B3-S4+B3-S5+B3-S6+B3-S7+B3-S8+B3-S9+B3-S10 q13=B3-S11 q14=B2-B9D-OWN-1312 q15=B2-B9D-OWN-1393 | domain_id=51 -->
