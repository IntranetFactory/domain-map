# EA — Enterprise Architecture (audit history)

## 2026-06-15 — Scoping + Phase 0 (candidate, unbuilt)

EA is not in the live catalog. This pass scoped it as a domain candidate and ran Phase 0 vendor-surface research. No catalog rows were written.

**Consolidation.** The two duplicate backlog stubs in `audits/_missing-domains.md` (`ENT-ARCH` + `EA`, both surfaced by the 2026-05-30 BPA audit) were merged into one `EA` entry; mention_count held at 1 (one surfacing event).

**Classification.** EA passes the point-solution-market test: a dedicated Gartner "Enterprise Architecture Tools" market with 7+ pure-plays (LeanIX/SAP, Ardoq, Software AG Alfabet, MEGA HOPEX, BiZZdesign Horizzon, Avolution ABACUS, Sparx EA, Orbus iServer). It is an umbrella overlapping APM (applications, id 10), BPA (processes, id 136), and business-capability-mapping.

**Phase 0.** Report at `.tmp_deploy/EA-phase0-2026-06-15.md` (working copy `c:/tmp/EA-phase0-2026-06-15.md`). Five flagship vendors surveyed against the ArchiMate 3.2 scaffold. Distinctive EA-MASTER set (25 entities): architecture repository + metamodel, ArchiMate model artifacts, architecture standards / reference architectures / technology radar / lifecycle phases, ARB governance + ADRs + principles, and the baseline-to-target roadmap (gaps, transition architectures, work packages, transformation initiatives). Applications, processes, and capabilities classified APM-OWNED / BPA-OWNED / CAP-MAP (consume, do not re-master). Modularization hypothesis: 3 full modules (EA Repository & Metamodel; Technology Standards & Reference Architecture; Architecture Roadmap & Transformation), plus a conditional 4th (Business Architecture / Capability) gated on the capability-map decision. EA is not a statutorily-regulated market: TOGAF and ArchiMate are standards-framework / config artifacts, not compliance regimes.

**Open decisions (q-EA.md).** Four `b2` calls: promote (gate), scope boundary (master-vs-consume + module count), technology-layer split vs APM q8, and capability-map ownership.

**Cross-domain blast radius.** Promotion cascades into BPA's already-open items (`B2-CAPMAP-OWNER`, which lists an "EA owns" option; `B2-EA-SOLUTION-SPLIT`; `B3-EA-PROMOTION`; `B3-ARCHIMATE-MODELS`) and APM's `B3-APM-MARKET-SURFACE` (the q8 tech-risk module). Left `feedback_needed`; nothing written to the catalog.
