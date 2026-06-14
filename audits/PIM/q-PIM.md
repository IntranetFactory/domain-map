# Product Information Management (PIM): questions waiting for you

## What this domain is
Manage one trusted record for every product (attributes, variants, categories, translations, and the digital assets that depict it), enrich it through a review-and-approval workflow, then syndicate it out to your sales channels and marketplaces. PIM is the merchandising source of truth: it onboards supplier data, holds product content and compliance signals, and pushes published products to commerce, inventory, and configure-price-quote downstream.

---

q1: (answer this first) Four sibling product objects (products, translations, digital assets) are both mastered in one PIM module and re-consumed in its sibling modules, which is not allowed. How should this be resolved?

- a) Delete the 4 duplicate consumer links, so the other modules read the canonical product, translation, and asset records by reference.
- b) Promote each of the 4 to its own embedded copy, so each module can be installed and run standalone without its sibling.
- c) Mixed: delete some and promote others (specify which).

Recommended: a. Delete is the default. A standalone Syndication module with no Product Content module has no products to syndicate, and a standalone Digital Assets module has no products to depict, so the standalone-deployable path is weak here. This is a destructive change (deleting rows or overwriting roles) and it gates the module-shape fix below it, so it needs your sign-off and unlocks the rest of the build.

a1:

---

q2: A dedicated Digital Asset Management (DAM) domain already exists in the catalog but has no modules, and it overlaps the PIM Digital Assets module that masters product assets today. How should the two relate?

- a) Keep the PIM Digital Assets module as the deployable DAM-lite path; DAM stays a placeholder for a future split.
- b) Move the digital-asset master into the DAM domain and retire the PIM Digital Assets module; PIM consumes assets from DAM.
- c) Both coexist (PIM ships DAM-lite for merchandising; DAM offers a richer brand-marketing deployment); clarify the split in the domain descriptions.

Recommended: a. Keeps the current shape and avoids restructuring around a domain that has no modules yet; DAM can absorb the assets later if it grows real modules.

a2:

---

q3: Should digital assets be treated as containing personal data when they include people or model releases (rights metadata)? (yes/no)

Recommended: yes. Assets that depict identifiable people carry rights and privacy obligations, so the personal-data flag should reflect that. This overwrites a current value, so it needs your confirmation.

a3:

---

q4: Should rights-cleared digital assets use a single named approver (one brand-rights owner closes the approval)? (yes/no)

Recommended: yes. A single accountable brand-rights owner is the typical pattern for clearing asset rights. This overwrites a current value, so it needs your confirmation.

a4:

---

q5: Which domain should own the product-regulation links (REACH, RoHS, Prop 65, GS1 GDSN, EU GPSR, FDA Cosmetic Labeling, EU Digital Product Passport)?

- a) PLM (the PLM Compliance module) owns them; PIM consumes them through the existing compliance-declaration handoff.
- b) PIM links the same regulation records itself; overlap with PLM is acceptable.
- c) Split: REACH, RoHS, and Prop 65 to PLM (engineering side); GS1 GDSN, EU GPSR, and EU DPP to PIM (merchandising channel side).

Recommended: c. The engineering-substance rules sit naturally with PLM while the channel and datapool rules (GDSN, GPSR, DPP) are merchandising-side truth PIM publishes, so a split matches where each regulation actually applies. Your answer also decides whether the regulation records get created at all.

a5:

---

q6: Should the Product Content module publish a "product discontinued" signal back to PLM, so engineering can clear active-merchandising flags on its parts? (yes/no)

Recommended: yes, if PLM acts on the signal in practice. The trigger already exists; only the handoff link is missing. Skip it if PLM does not need the signal.

a6:

---

q7: The product-compliance capability currently rolls up to Marketing. Should it move to a different business function?

- a) Map it to Quality / Compliance (it commonly rolls up there).
- b) Leave it under Marketing.
- c) Map it to Product Management (already a domain contributor).

Recommended: a. In many organizations the compliance capability is owned by Quality or Compliance rather than Marketing. Low stakes; does not block the build.

a7:

---

q10: Product Lifecycle Management forwards pim product to Product Information Management to design and manage product data, design, and bill of materials, but Product Information Management does not yet have anyone assigned to design and manage product data, design, and bill of materials, so this step has no owner. How should it be handled?
- a) Record it now as work Product Information Management owns, and assign a named owner once Product Information Management sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Product Information Management decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a10:

---

## Optional (will not hold up the build)

q8: Four extra objects show up across the flagship PIM vendors: per-channel publish records (the success/error audit row behind the rejected-listing remediation queue), attribute groups (attributes grouped per category subtree), supplier import batches, and a translation-memory store. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the module shape is settled. Each is common across the vendor set but still wants a verification pass first.

a8:

---

q9: A Marketplace Operations / Channel Listing domain (vendors like ChannelEngine, Rithum, Mirakl Connect, Productsup, Feedonomics) sits adjacent to PIM, commerce, and order management and is queued as a missing-domain candidate. Should I research and stand it up as a new domain? (yes/no)

Recommended: yes, as a separate domain, but it is a non-blocking idea and does not gate PIM finishing.

a9:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S4.personalcontent q4=B2-S4.singleapprover q5=B2-S6 q6=B2-S7 q7=B2-S9 q8=B3-PIM-PUBLISH-RECORDS+B3-PIM-ATTRIBUTE-GROUPS+B3-PIM-SUPPLIER-IMPORTS+B3-PIM-TRANSLATION-MEMORY q9=B3-CANDIDATE-DOMAIN-MARKETPLACE-OPS q10=B2-B9D-OWN-1845 | domain_id=167 -->
