# Livestock Management (LIVESTOCK-MGMT): questions waiting for you

## What this domain is
Run your herd and your pastures from one place: animals, mobs, movements, weights, breeding, treatments, and grazing plans.

Track every animal and every mob from birth or purchase through to sale, with weights and average daily gains, breeding and calving records, and treatment and medicine logs that keep your withholding periods straight. Move mobs between paddocks and properties, allocate pasture, and plan rotations against your stocking rate and carrying capacity. Capture electronic ear-tag reads in the yard and keep your traceability records audit-ready for the identification scheme in your region. Built for the grazier, station, or family farm that wants real records without the weight of a full enterprise system.

---

q1: (answer this first) Should general livestock and grazing management stand as its own domain, or fold into the crop and whole-farm Farm Management Information System (FMIS)?

- a) Keep Livestock Management as its own domain (already built)
- b) Fold the herd and grazing modules into FMIS as additional modules

Recommended: a. Keep it distinct. Three or more independent flagship pure-plays sell general livestock and grazing management as their whole product, not as a crop-FMIS feature: AgriWebb (beef and sheep mob management, grazing, weights, treatments, traceability; being acquired by URUS Group, a bovine-genetics group, with close expected Q3 2026), Herdwatch (cattle, sheep, and pasture records, breeding, medicine, and compliance, used by 20,000+ farmers and itself acquisitive), MaiaGrazing (now Atlas Ag; rotational grazing, stocking rate versus carrying capacity), CattleMax (cattle records plus EID and USDA traceability since 1999), and Performance Beef from Performance Livestock Analytics (feedlot feeding and health records; owned by Zoetis). The crop-FMIS leaders center on field mapping, crop planning, planting and application records, harvest, equipment telemetry, and yield analytics; none of those livestock pure-plays master crop fields, and none of the crop-FMIS leaders master individual-animal records, mobs, breeding, treatment withholding periods, or EID/NLIS/840 traceability. The shared paddock and whole-farm substrate is real (hence the FMIS handoff edge and the deferred rainfall idea below), but the animal-centric system of record is its own market. Dairy Herd Management is a separate sibling whose milking, lactation, and milk-quality workflows are, by its own definition, fundamentally different from beef and sheep.

a1:

---

q2: The treatment and medicine withholding gate hands off to Food Traceability today (so an animal still inside a withholding window is blocked from the food chain). Should that gate instead route to Food Safety and Quality Management (FSQM)? (yes/no)

Recommended: no. Keep both outbound handoffs on Food Traceability. The sale-to-carcass-lot genealogy handoff is unambiguously Food Traceability (lot and batch genealogy plus FSMA-204 critical-tracking-event capture is its core). The treatment-to-withholding gate is the borderline call: a veterinary-medicine withholding period (USDA and Codex withdrawal times, AU NLIS and EU residue rules) is both a traceability key-data-element and a food-safety control. It was built on Food Traceability because the withholding clear date and the animal identity travel with the carcass lot, and FSQM (the broader HACCP and CCP safety system-of-record) can consume that lot payload downstream. Answer yes only if you want FSQM to own the safety-gate semantics directly rather than consuming them from the lot record. Low stakes; does not block the build.

a2:

---

## Optional (will not hold up the build)

q3: Should I research and add the deeper substrate entities Phase 0 deferred (pasture cover or forage measurements, rainfall records, and feedlot ration and close-out records)? (yes/no)

The deferred entities are each additive and fit the existing module shape, none a split: pasture_measurements (pasture cover and forage mass) is a MaiaGrazing-specific extension to the grazing module; rainfall_records is FMIS-adjacent field-condition data that likely belongs to FMIS and is consumed here; feedlot_rations and closeout_summaries are the Performance Beef feedlot sub-segment that would extend the herd module only if the feedlot vertical is in scope.

Recommended: yes, but additive and after the modules exist. The substrate is real but single-vendor or sub-segment, so it does not gate the build. Coordinate rainfall_records ownership with FMIS before loading it here.

a3:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B3-S1 | domain_id=176 | phase0=.tmp_deploy/LIVESTOCK-MGMT-phase0-2026-06-14.md | reversed: none -->
