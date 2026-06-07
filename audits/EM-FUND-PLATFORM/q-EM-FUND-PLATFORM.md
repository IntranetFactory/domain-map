# Emerging-Manager Fund Platform (EM-FUND-PLATFORM): questions waiting for you

## What this domain is
Stand up a microfund or SPV in days, run capital calls, and manage your LP portal, all from a single bundle priced for solo general partners.

This is the all-in-one bundle that emerging managers use to launch and run a small fund or syndicate: form the legal entity, file the paperwork, open banking, raise from LPs, run the SPVs and their subscriptions, keep a lite cap table, and handle ongoing fund operations. It is sold as one product rather than separately purchasable pieces, and it sits below the full fund-administration suites as the on-ramp for first-time and small managers.

---

q1: (answer this first) Should the lite cap-table module be collapsed into the fund-formation module?

- a) Keep the current four modules (Fund Formation, SPVs, Lite Fund Ops, Lite Cap Table as its own module).
- b) Collapse Lite Cap Table into Fund Formation, dropping to three modules.

Recommended: b. Cap table is the only thing in that module, and every flagship vendor (Sydecar, AngelList, Vauban) ships the cap table as a tab inside fund formation rather than as its own product. This choice sets the module count, so it also decides where the templated-documents entity lands and what the starter decision below operates on.

a1:

---

q2: Should three of the four modules be converted to a "starter" kit shape (with Fund Formation kept as the full anchor), instead of all four staying full modules?

- a) Convert three to starter, keep Fund Formation as the full anchor.
- b) Keep all four as full modules, with a documented note that the bundle deploys atomically.

Recommended: a. The domain's own description says it is bundle-only and not separately purchasable, which is exactly what the starter shape models. This changes how permissions and the system-skill scope get built, so it gates the lifecycle, skill, and persona work waiting behind it.

a2:

---

q3: Should subscription documents on SPV subscriptions be locked once signed, so a signed subscription cannot be quietly edited? (yes/no)

Recommended: yes. Subscription docs locking on signature is universal in private-placement law, and the flag is currently off, which is almost certainly wrong.

a3:

---

q4: Should an SPV subscription require a single named approver (the GP signing off on accepting the subscription)? (yes/no)

Recommended: yes. The GP signs the SPV-subscription acceptance, which is a single-approver step.

a4:

---

q5: Should fund formations and SPVs each require a single named approver (the GP signing off on forming the entity and launching the SPV)? (yes/no)

Recommended: yes. Entity formation and SPV launch are GP sign-off decisions, so a single accountable approver fits both.

a5:

---

q6: How deep should the reconciliation with the neighboring Fund Administration and Cap Table domains go?

- a) One-line summary only (both neighbors are lightly connected).
- b) Deep-dive on Fund Administration.
- c) Deep-dive on Cap Table.
- d) Deep-dive on both.

Recommended: a. Both neighbors sit below the weight-3 deep-dive threshold (one outbound handoff to Fund Administration, no handoffs to Cap Table), so a summary is enough unless you want a closer look.

a6:

---

## Optional (will not hold up the build)

q7: Six extra entity candidates show up across the flagship emerging-manager vendors (rolling-fund periods, GP management fees, per-SPV carry distributions, an LP communication log, regulatory filings such as Form D and Form ADV, and templated fund-class economic terms). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and after the modules are settled. Several are visible in two or more flagship UIs; the regulatory-filings candidate likely folds into the planned entity-filings entity rather than standing alone.

a7:

---

<!-- agent map, ignore: q1=B2-2 q2=B2-3 q3=B2-4.submitlock q4=B2-4.singleapprover_spvsubs q5=B2-4.singleapprover_formation_spv q6=B2-5 q7=B3-1+B3-2+B3-3+B3-4+B3-5+B3-6 | domain_id=163 -->
