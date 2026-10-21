# LIVESTOCK-MGMT Phase 0 - Vendor Surface

Candidate: **LIVESTOCK-MGMT (Livestock Management)** - general beef / sheep / cattle / mixed-grazing herd and pasture management. Mention count 1 (surfaced by FMIS audit). Triage date 2026-06-14.

## Verdict: promote-as-domain

General livestock/grazing management is a distinct SMB-farm software market with >=3 independent flagship pure-plays. It does NOT fold into FMIS (crop / whole-farm field operations, telemetry, agronomy) nor DAIRY-MGMT (dairy vertical: parlor, lactation cycles, somatic-cell-count, milk-quality, Grade A regulation). The shared substrate with FMIS (paddocks, work tasks, whole-farm) is real but the animal-centric core (individual-animal records, mobs, mob movements, weight gains, breeding, treatments with withholding periods, and the EID/NLIS/USDA-840 traceability identifier layer) is its own system of record that the dedicated vendors are "about."

## Flagship vendors

| Vendor | URL | Specialist in | Flagship? | Why included |
| --- | --- | --- | --- | --- |
| AgriWebb | agriwebb.com | Beef + sheep grazing/livestock mgmt, mob mgmt, compliance, provenance | Yes (pure-play) | User-named; 2026 category leader; built for medium/large grazing ops |
| Herdwatch | herdwatch.com | Cattle + sheep + pasture records, breeding, medicine, compliance, 20k+ farmers | Yes (pure-play) | User-named; EU/UK/US compliance-ready, EID reader integration |
| MaiaGrazing (Atlas Ag) | maiagrazing.com / atlasag.com | Rotational-grazing planning, stocking rate vs carrying capacity, pasture analytics | Yes (pure-play, grazing) | User-named; the grazing-planning specialist that anchors the GRAZING module |
| CattleMax | cattlemax.com | Cattle record keeping since 1999, EID + USDA traceability, Datamars import | Yes (pure-play) | US herd-book leader; strongest USDA-840/EID surface |
| Performance Beef (Performance Livestock Analytics) | performancelivestockanalytics.com | Feedlot / stocker / backgrounder feeding, performance, health records | Yes (pure-play, feedlot) | User-named; feedlot-grain segment; owned by Zoetis |
| Datamars Livestock / Tru-Test (+ Gallagher) | livestock.datamars.com | EID readers, weigh-scale capture, NLIS/NAIT/SNIG transaction registration | Hardware+software | Traceability/weigh data layer; integrates into the above |

### M&A / rebrand notes (2026)
- **AgriWebb -> URUS Group LP** (definitive agreement; close expected Q3 2026, regulatory pending). Combined VAS + AgriWebb platforms ~25M animals. URUS is a bovine-genetics group extending data-driven cattle management into beef.
- **Performance Livestock Analytics / Performance Beef -> Zoetis** (acquired Apr 2020). Animal-health major; still a distinct livestock-software flagship.
- **MaiaGrazing -> Atlas Ag**: MaiaGrazing is now the "legacy" platform; **Atlas Grazing** is the next-gen successor built on it. Still actively marketed.
- **Herdwatch**: independent and itself acquisitive - acquired Kingswood Computing, two firms in a seven-figure deal, and **VetDrive** (vet practice mgmt, Jan 2026). 20,000+ farmers/ranchers.
- **Datamars/Tru-Test** and **Gallagher Animal Management**: established EID/weigh hardware+software vendors feeding the records platforms.

## Surface matrix

V1=AgriWebb V2=Herdwatch V3=MaiaGrazing V4=CattleMax V5=Performance Beef

| Entity | Category | V1 | V2 | V3 | V4 | V5 | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| livestock_animals | Master | x | x |   | x | x | Core | HERD |
| livestock_mobs | Master | x | x | x | x | x | Core | HERD |
| mob_movements | Junction | x | x | x |   |   | Core | HERD |
| animal_weight_records | Junction | x | x |   | x | x | Core | HERD |
| breeding_records | Junction | x | x |   | x |   | Core | HERD |
| animal_treatment_records | Audit/compliance | x | x |   | x | x | Core | HERD |
| livestock_identifiers (EID/NLIS/840 tags) | Audit/compliance | x | x |   | x |   | Core / Compliance | HERD |
| animal_sale_records | Junction | x | x |   | x | x | Core | HERD |
| grazing_paddocks | Master | x | x | x |   |   | Core | GRAZING |
| pasture_allocations | Junction | x |   | x |   |   | Common | GRAZING |
| grazing_plans | Master | x |   | x |   |   | Common | GRAZING |
| pasture_measurements (cover/forage) |  Junction|   |   | x |   |   | Specialist | GRAZING |
| feed_records | Junction | x | x | x |   | x | Core | (HERD feed; feedlot Specialist - defer) |
| rainfall_records | Junction |   |   | x |   |   | Specialist | (defer - FMIS-adjacent) |

### Entities NOT loaded (subtraction list)
- `pasture_measurements`, `rainfall_records`: Specialist (MaiaGrazing-only / FMIS-adjacent). Defer; b3 idea. Rainfall belongs more naturally to FMIS field-condition data.
- Feedlot-specific ration/closeout (`feedlot_rations`, `closeout_summaries`): Performance Beef specialist; defer as b3 (feedlot is a sub-segment, not the core grazing market).
- Vet practice records (Herdwatch/VetDrive): out of scope - that is a different domain (veterinary practice mgmt).

## Compliance / traceability entities (non-optional in regulated jurisdictions)

| Entity | Regulation | Proposed module |
| --- | --- | --- |
| livestock_identifiers (EID/RFID tags, 840 AIN, NLIS/NAIT device IDs) | US ADT (9 CFR Part 86, 840 EID mandatory since Nov 2024); AU NLIS; NZ NAIT; EU/UK ear-tag + cattle passport | HERD (master, jurisdiction-gated) |
| mob_movements / movement transactions | Interstate movement docs (US ADT), NLIS movement registration, BCMS cattle-passport movements (UK/EU) | HERD (movement records reference identifiers) |
| animal_treatment_records (withholding/withdrawal periods) | Veterinary medicine withholding period -> withholding-period handoff to FOOD-TRACE on sale/slaughter | HERD |

Note: these are jurisdiction-gated masters under Rule #16 (traceability identifiers + regulatory movement records = master + optional), not universal required masters.

## Modularization hypothesis

Two full modules (Rule #14: >=3 capabilities => >=2 modules with capabilities + data_objects):

- **LIVESTOCK-MGMT-HERD** - the animal-centric system of record: individual-animal records, mobs/groups, mob movements between paddocks/properties, weight records with average daily gain, breeding/calving records, treatment/medicine records with withholding periods, sale/purchase records, and the EID/NLIS/USDA-840 traceability identifier layer. This is the headline module the records-keeping flagships (Herdwatch, CattleMax, AgriWebb, Performance Beef) are about.
- **LIVESTOCK-MGMT-GRAZING** - the pasture/grazing-planning system of record: paddocks, pasture allocations, rotational grazing plans, rest periods, stocking rate vs carrying capacity. Anchored by MaiaGrazing/Atlas Ag and AgriWebb's forage features.

Capabilities (>=4): paddock and mob management; individual-animal records; mob movements; weight-gain tracking; pasture allocation / grazing planning; breeding records; treatment records; livestock traceability.

## Overlap analysis vs existing domains

- **FMIS** (Farm Management Information System): crop/whole-farm - field mapping, crop planning, planting/application records, harvest, equipment telemetry, yield analytics, ag-input inventory. Shares the whole-farm/paddock substrate and small-farm buyer, but its core is crop/field operations, not animal records. **Distinct.** Cross-domain edge: animals graze paddocks that FMIS may also map; rainfall/field-condition data lives in FMIS.
- **DAIRY-MGMT** (Dairy Herd Management): dairy vertical - parlor, lactation cycles, dry-off, milk-quality/somatic-cell-count, Grade A milk regulation. Shares "individual-animal + breeding" shape but its workflows (milking, milk quality) are "fundamentally different from beef/swine" per its own description. **Distinct sibling.**
- **FOOD-TRACE** (Food Traceability and Provenance): downstream lot/batch genealogy + FSMA-204 CTE/KDE. Livestock hands off here at slaughter/sale (animal -> carcass lot) and on treatment withholding periods. **Cross-domain outbound handoff target.**
- **FSQM**, **FARMER-DIRECT-SALES**: no material overlap.

## Point-solution-market test

**PASS.** >=3 INDEPENDENT vendors whose FLAGSHIP product is general livestock/grazing management: AgriWebb (beef/sheep), Herdwatch (cattle/sheep/pasture), CattleMax (cattle records), MaiaGrazing (grazing), Performance Beef (feedlot). These are separate companies/owners (URUS, independent, Atlas Ag, independent, Zoetis) - not a single suite's feature.

## Triage recommendation + domains-metadata estimates (promote)

VERDICT: **promote-as-domain**.

7 domains-metadata estimates:
- domain_code: `LIVESTOCK-MGMT`
- domain_name: `Livestock Management`
- crud_percentage: ~70 (records-heavy with planning/analytics)
- min_org_size: `10 xs <50` (smallholder/family farms/stations are the core buyer; AgriWebb skews larger but the market floor is small)
- cost_band: `$` (low monthly SaaS; MaiaGrazing ~$100-200/mo; Herdwatch low per-farm)
- maturity / market posture: established, consolidating (URUS, Zoetis, Atlas Ag rollups)
- adjacency: FMIS, DAIRY-MGMT (siblings), FOOD-TRACE (downstream handoff)

Open boundary to record as a b2: confirm LIVESTOCK-MGMT vs fold-into-FMIS given the single mention. Research resolves it as distinct (independent flagships), so the b2 is a low-priority documentation gate, not a blocker.
