# EDISCOVERY Phase 0 — Vendor Surface

Electronic Discovery / Litigation Discovery. EDRM lifecycle: identification, preservation/legal-hold, collection, processing, review (TAR/predictive coding), analysis, production, presentation. Backs the litigation agents (Subpoena Triage, Privilege Log Reviewer, Legal Hold, Chronology Builder).

NOTE ON CODE: catalog already has `DISCOVERY` (id 5, "Discovery and Service Mapping", IT infra) — UNRELATED. This candidate uses **EDISCOVERY**.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| Relativity (RelativityOne) | relativity.com | End-to-end EDRM, review/TAR at scale | Market leader; deepest public data model (RDOs, dtSearch, Analytics) |
| Everlaw | everlaw.com | Cloud review, analytics, storybuilding | Pure-play; strong review/analysis + production surface |
| DISCO | csdisco.com | Cloud e-discovery, Cecilia AI review | Pure-play; collection-to-production; API-documented |
| Logikcull | logikcull.com | Self-service DIY discovery, holds | Pure-play SMB; clean legal-hold + processing surface |
| Exterro | exterro.com | Legal GRC suite incl. FRCP-native e-discovery | Compliance/defensibility-focused; identification + preservation depth |

Reveal, Nuix, Casepoint corroborate but add no distinct entities beyond the union below.

## Surface matrix

Vendors: R=Relativity, E=Everlaw, D=DISCO, L=Logikcull, X=Exterro. EDRM stage in brackets.

| Entity | Category | R | E | D | L | X | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| matters | Master | x | x | x | x | x | Core | review_analysis (shared) |
| custodians | Master [id] | x | x | x | x | x | Core | legal_hold_preservation |
| data_sources | Master [id] | x | x | x | x | x | Core | collection_processing |
| legal_holds | Master [pres] | x | x | x | x | x | Core | legal_hold_preservation |
| hold_notices | Master [pres] | x | x | x | x | x | Core | legal_hold_preservation |
| collections | Master [coll] | x | x | x | x | x | Core | collection_processing |
| documents | Master [proc] | x | x | x | x | x | Core | review_analysis |
| document_families | Junction [proc] | x | x | x | x |  | Core | collection_processing |
| review_batches | Master [rev] | x | x | x | x | x | Core | review_analysis |
| document_review_sets | Master [rev] | x | x | x | x | x | Core | review_analysis |
| coding_decisions | Transition [rev] | x | x | x | x | x | Core | review_analysis |
| coding_layouts | Config [rev] | x | x | x |  | x | Core | review_analysis |
| search_queries | Config [rev] | x | x | x | x | x | Core | review_analysis |
| saved_searches | Config [rev] | x | x | x | x |  | Core | review_analysis |
| tags | Config [rev] | x | x | x | x | x | Core | review_analysis |
| privilege_log_entries | Compliance [rev] | x | x | x | x | x | Core | production_privilege |
| redactions | Transition [rev] | x | x | x | x | x | Core | production_privilege |
| production_sets | Master [prod] | x | x | x | x | x | Core | production_privilege |
| production_volumes | Junction [prod] | x | x | x | x |  | Core | production_privilege |
| processing_jobs | Transition [proc] | x | x | x | x | x | Core | collection_processing |
| deduplication_records | Transition [proc] | x | x | x | x | x | Core | collection_processing |
| chain_of_custody_records | Compliance [coll] | x | x | x | x | x | Core/Compliance | collection_processing |
| hold_acknowledgments | Transition [pres] | x | x | x | x | x | Core | legal_hold_preservation |
| hold_reminders | Engagement [pres] | x | x | x | x |  | Core | legal_hold_preservation |
| interview_questionnaires | Engagement [id] | x |  |  |  | x | Common | legal_hold_preservation |
| analytics_indexes | Config [analysis] | x | x | x |  | x | Core | review_analysis |
| concept_clusters | Master [analysis] | x | x | x |  |  | Common | review_analysis |
| predictive_models | Master [analysis/TAR] | x | x | x |  | x | Core | review_analysis |
| model_training_rounds | Transition [TAR] | x | x | x |  | x | Core | review_analysis |
| threading_relationships | Junction [analysis] | x | x | x |  |  | Common | review_analysis |
| document_annotations | Engagement [rev] | x | x | x | x |  | Core | review_analysis |
| assignment_queues | Config [rev] | x | x | x |  |  | Common | review_analysis |
| export_jobs | Transition [prod] | x | x | x | x | x | Core | production_privilege |
| load_file_templates | Config [prod] | x | x | x | x |  | Core | production_privilege |
| bates_numbering_schemes | Config [prod] | x | x | x | x |  | Core | production_privilege |
| exhibit_binders | Master [present] | x | x |  |  |  | Common | production_privilege |
| depositions | Master [present] |  | x |  |  |  | Specialist | production_privilege |
| processing_error_records | Audit [proc] | x | x | x | x |  | Core | collection_processing |
| audit_events | Audit | x | x | x | x | x | Core/Compliance | collection_processing |
| billing_usage_records | Audit | x | x | x | x |  | Core | collection_processing |

Point-solution / imaging entities (image renderings, near-native views, transcript sync) are UI/derived, excluded per Rule (not entities).

## Compliance entities (non-optional)

Driven by FRCP (Rules 26/34/37(e)), Sedona Conference defensibility, and evidentiary chain-of-custody — load regardless of vendor visibility.

| Entity | Regulation / basis | Proposed module |
| --- | --- | --- |
| chain_of_custody_records | FRE 901 authentication; evidentiary integrity | collection_processing |
| legal_hold_defensibility_logs | FRCP 37(e) spoliation defense; hold issuance/acknowledgment/release audit | legal_hold_preservation |
| proportionality_assessments | FRCP 26(b)(1) proportionality factors per request | legal_hold_preservation |
| privilege_log_entries | FRCP 26(b)(5) privilege assertion | production_privilege |
| production_certifications | FRCP 26(g) certification of production completeness | production_privilege |
| meet_and_confer_records | FRCP 26(f) conference; ESI protocol agreements | legal_hold_preservation |
| data_disposition_records | Hold-release + defensible deletion audit | legal_hold_preservation |
| audit_events | Immutable action log; defensibility evidence | collection_processing |

## Modularization hypothesis

Four modules, each master-anchored (Rule #14; domain has 4+ capabilities so ≥2 required):

1. **legal_hold_preservation** — identification + preservation/legal-hold stages. Masters: `legal_holds`, `hold_notices`, `custodians`. Carries acknowledgments, reminders, interview questionnaires, proportionality assessments, meet-and-confer, defensibility logs, disposition records. This is the litigation-hold "front end" and the piece nearest LSD.
2. **collection_processing** — collection + processing stages. Masters: `data_sources`, `collections`, `processing_jobs`. Carries dedup, document families, error records, chain-of-custody, audit_events, billing usage. Heavy ETL + evidentiary substrate.
3. **review_analysis** — review + analysis/TAR stages (the platform's center of gravity). Masters: `documents`, `review_batches`, `document_review_sets`, `predictive_models`. Carries coding decisions/layouts, searches, tags, annotations, analytics indexes, concept clusters, model training rounds, threading, assignment queues.
4. **production_privilege** — production + presentation stages. Masters: `production_sets`, `production_volumes`. Carries privilege log entries, redactions, Bates schemes, load-file templates, export jobs, production certifications, exhibit binders.

## Overlap with existing LSD-LEGAL-HOLD (module id 382, domain LSD id 25) — my read

**Correction to brief:** module id 25 is "Secondary Transactions" (cap table), unrelated. The real overlap is **module id 382 `LSD-LEGAL-HOLD` "Legal Hold and eDiscovery"** inside domain **LSD (id 25) "Legal Service Delivery"**. It is shallow: exactly 3 entities — `legal_holds` (id 635), `ediscovery_requests` (id 636), and shared `content_documents` (id 429) — with tagline "Issue holds, track acknowledgments, and run ediscovery from collection to production." `legal_holds` (635) already exists; **reuse it, do not recreate** (Rule #18 collision avoided).

**Verdict: DISTINCT market, not an LSD extension — but with a deliberate seam.** LSD is a legal-*operations* department domain (intake, matter management, outside counsel, regulatory response). Its legal-hold module is the corporate-legal *governance* view: issue a notice, track custodian acknowledgment, hand off. EDISCOVERY is the *EDRM production platform* market — a different buyer (litigation support / e-discovery vendors, not general counsel's office), a different economics (per-GB processing, hosted review, TAR), and a surface (40+ entities: processing pipelines, TAR model training, review batching, Bates/load-file production) that dwarfs LSD's 3-entity stub. Relativity/Everlaw/DISCO are not sold as legal-ops suites.

Recommended treatment: stand EDISCOVERY up as its own domain. Keep `legal_holds` as **shared master data** referenced by both LSD-LEGAL-HOLD (governance/notice issuance) and EDISCOVERY's `legal_hold_preservation` (operational preservation). LSD's `ediscovery_requests` (636) becomes the *handoff object* — the LSD-side request that spawns an EDISCOVERY matter. This mirrors the intake→fulfillment seam elsewhere in the catalog: LSD owns "we need discovery done," EDISCOVERY owns "here is the EDRM pipeline that does it." Absorbing all 40 entities into LSD would violate the one-master-per-capability spirit and bury a major market inside a department domain.
