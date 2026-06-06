# LIB-MGMT audit history

## 2026-05-30, Validate b1 (full 4-pass)

### Summary

- **Current footprint:** 6 full modules (`LIB-CATALOG` 155, `LIB-CIRCULATION` 156, `LIB-PATRON` 157, `LIB-ACQUISITIONS` 158, `LIB-DISCOVERY` 159, `LIB-ILL` 160); 17 masters (`bibliographic_records`, `library_items`, `library_authorities`, `library_holdings`, `library_loans`, `library_holds`, `library_fines`, `library_circulation_policies`, `library_patrons`, `library_patron_categories`, `library_acquisition_orders`, `library_vendor_accounts`, `library_serial_subscriptions`, `library_eresource_licenses`, `library_saved_searches`, `interlibrary_loan_requests`, `library_sharing_partners`); 8 capabilities (`LIB-CATALOGING`, `LIB-CIRCULATION`, `LIB-ACQUISITIONS`, `LIB-PATRON-MGMT`, `LIB-DISCOVERY`, `LIB-SERIALS`, `LIB-ERESOURCE`, `LIB-ILL`); 8 primary solutions; 9 trigger_events (all carrying `event_category`); 9 intra-domain handoffs (`source_domain_id = target_domain_id = 168`, all `integration_pattern=lifecycle_progression`, mostly `friction_level=low`); zero outbound cross-domain handoffs; zero inbound cross-domain handoffs; 24 aliases across 12 masters; 62 lifecycle states across 11 of 17 masters (6 masters carry no states); 6 system skills (one per module) + 73 `skill_tools` rows (all 73 at `coverage_tier=platform`, strict Semantius score 100%); 5 roles + 18 `role_modules` + 18 `role_permissions`; zero `domain_regulations` rows; 2 `business_function_domains` rows (R&D as owner, L&D as contributor); zero APQC `handoff_processes` rows (vacuous pass for H1 since cross-domain handoff count is zero).
- **Vendor-surface basis:** Ex Libris Alma (Clarivate), SirsiDynix BLUEcloud LSP, OCLC WorldShare Management Services, FOLIO (EBSCO), Koha (ByWater Solutions), Civica Spydus, Follett Destiny, Biblionix Apollo. The leader quadrant for academic and large-public ILS/LSP is well represented (Alma, WMS, FOLIO, Sierra/Symphony via SirsiDynix). The school market (Follett Destiny) and small-public market (Apollo, Koha via ByWater) are also covered. Notable absences: Innovative Interfaces Sierra and Polaris (now part of Clarivate), TIND, Auto-Graphics VERSO, Library Solution (TLC), Aurora-based ILS, OCLC CONTENTdm (digital collections), DSpace and Samvera (institutional repositories), Springshare LibGuides/LibCal/LibAnswers (the public-library / academic-library workflow extension layer), EBSCO Discovery Service and Primo VE (discovery layer, currently bundled into LIB-DISCOVERY but arguably a distinct sub-market), OverDrive Libby and Hoopla (digital lending, queued as candidate domain).
- **Bucket 1 (in-scope, agent fixable):** 10 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items.

**Neighbor discovery** (auto-derived from handoffs + cross-domain DMDO + cross-domain relationships, ranked by edge weight):

| Neighbor | Out | In | DMDO into LIB-MGMT | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| (none) | 0 | 0 | 0 | 0 | 0 | none |

LIB-MGMT publishes zero cross-domain handoffs and consumes zero cross-domain payloads. The only cross-domain relationship is the conventional `users` (id 748) edge (8 user-action verbs to LIB-MGMT masters plus 1 reverse `library_patrons linked_to_user users`). Pairwise reconciliation (pass 4) is therefore vacuous: there is no neighbor at edge weight >= 3 (and none at edge weight 1 or 2 either). This isolation is itself the dominant finding of the semantic pass (see Bucket 1 BOUNDARY block); it is not a normal shape for a domain that intersects ERP, IAM, HCM, and digital-content commerce.

Structural pass bands: **A1 / A2 / A3 / M1 / M2 / M4 / M5 / M6 / M7 / B1 / B2 / B3 / B4 / B5 (vacuous, no embedded_masters) / B6 / B7 / B9 / B9b / B10 (vacuous, no inbound) / B10b / B11 / C1 / D1 / E1 / E2 / E3 / E4 / E5 / F1 / F2 / F3 / F4 / F5 / F7 / H1 (vacuous on zero cross-domain handoffs)** pass cleanly. **A4 fails** (`catalog_tagline` and `catalog_description` both empty). **B12 partial-fail** (6 of 17 masters carry zero `data_object_lifecycle_states` rows: `library_holdings` 826, `library_circulation_policies` 830, `library_patron_categories` 832, `library_vendor_accounts` 834, `library_saved_searches` 837, `library_sharing_partners` 839. Five of these are plausible config-shape masters but the exemption needs explicit user approval per Rule #12 + Rule #15; `library_holdings` may have a real lifecycle that was simply not authored). **B8 fail** (zero outbound cross-domain `data_object_relationships`, which mirrors the zero cross-domain handoff finding). **C1 thin** (one owner row only; library staff functions are not represented). **E1 / E2 thin** (5 roles with `RESEARCH-DEV-` prefix; the function-scoped naming rule expects the prefix to be the role's `business_function_name` slug, and `Research and Development` is debatable as the library's parent function, see B2-S4).

Domain Semantius score across 6 system skills: **73 platform / 73 total = 100% strict**, **73 / 73 = 100% operational**. No tool is below `platform` coverage; the entire library workflow is implemented through standard `query` / `mutate` primitives plus the `notify_person` abstraction (id 913). This is consistent with libraries running on traditional ILS/LSP CRUD substrates without external AI dependencies.

Rule #15 sweep: `data_objects.notes`, `domain_module_data_objects.notes`, `data_object_relationships.notes`, `handoffs.notes`, `skill_tools.notes` all empty across the LIB-MGMT footprint. No remediation required.

### Vendor surface basis

The library-management market is bifurcated by buyer segment and only modestly bifurcated by feature surface. Large academic and consortial libraries buy LSPs (library services platforms): Alma, FOLIO, WMS, Sierra. Mid-tier and small public libraries buy ILSs: Spydus, Apollo, Koha (community + commercial), Polaris. School-library buyers run Destiny (Follett) and Alexandria. Across all of these, the durable workflow substrate is the same: a bibliographic catalog references items and authorities; items belong to holdings on branches; loans, holds, and fines run circulation against patrons categorized by patron-type; acquisitions ingest physical and electronic materials via vendor accounts and serial subscriptions; discovery surfaces the catalog publicly; interlibrary loan extends reach via sharing partners. The current 6-module split (`LIB-CATALOG`, `LIB-CIRCULATION`, `LIB-PATRON`, `LIB-ACQUISITIONS`, `LIB-DISCOVERY`, `LIB-ILL`) covers this substrate cleanly.

Headline gaps visible from a single read of the Alma / FOLIO / WMS data models: (a) no branch / location master to scope holdings, items, circulation rules, and staff users (a major absence given that most academic and many public buyers operate multi-branch); (b) no digital-lending surface (e-book, audiobook, streaming loans against DRM-limited concurrent-use licenses), which OverDrive, Hoopla, and the embedded equivalents inside Alma Digital and FOLIO ERM all model as a first-class flow distinct from physical circulation; (c) no course-reserves / reading-list surface (Leganto, Ares, Talis Aspire), distinct from a general saved search, that academic libraries need; (d) no room/equipment booking surface (LibCal), which most public libraries and many academic libraries operate; (e) no events/programming surface (LibCal, Communico); (f) no patron-authentication surface declaring the IAM/SSO dependency (SAML/CAS via Shibboleth, OAuth via campus IDP). Each of these is a Bucket 3 entity candidate; LIB-MGMT may also be missing entire neighbor domains (queued as candidates: ACADEMIC-COURSE-RESERVES, DIGITAL-LENDING, SPACE-BOOKING).

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **A4 (fail)** | Both `catalog_tagline` and `catalog_description` are empty strings on `domains.id=168`. Per Rule #20, these are the buyer-facing surfaces feeding the public catalog and the site generator; they are mandatory on every audited domain. | Draft both fields per Rule #20 (buyer voice: workflow + value, NOT analyst voice or vendor lists), surface to user for review BEFORE PATCH. Once non-empty, never overwrite without per-row approval. |
| B1-S2 | **B12 (partial fail), 6 masters with zero lifecycle states** | `library_holdings` (826), `library_circulation_policies` (830), `library_patron_categories` (832), `library_vendor_accounts` (834), `library_saved_searches` (837), and `library_sharing_partners` (839) carry zero `data_object_lifecycle_states` rows. Rule #12 requires either a workflow (and a state machine) or an explicit config-shape exemption recorded in the audit (per Rule #15, NOT in `data_objects.notes`). Plausible classification: `library_circulation_policies`, `library_patron_categories`, `library_vendor_accounts`, `library_sharing_partners`, `library_saved_searches` are config-shaped (author once, edit occasionally, record_status the only state). `library_holdings` is the ambiguous one: in MARC21 / BIBFRAME, a holdings record has a non-trivial state (linked to a bibliographic record, then merged or unlinked, then withdrawn when the last item is removed), arguably warranting at least 3 states (`new` -> `linked` -> `withdrawn`). | (a) For the 5 config-shape masters, record the exemption decision here in the audit (this audit file is the approved persistence surface per Rule #15) and proceed without lifecycle rows; (b) for `library_holdings` (826), draft a 3-state lifecycle (`new` -> `linked` -> `withdrawn`) and load. |
| B1-S3 | **B8 + market (fail), zero outbound cross-domain `data_object_relationships`** | The catalog records exactly zero `data_object_relationships` rows from LIB-MGMT masters to non-LIB-MGMT masters (the only cross-domain edges are the conventional `users` (748) edges, which Rule #10 covers separately). For a domain with 17 masters that touch ERP, IAM, HCM, and content-commerce, this is structurally implausible. Concretely missing edges with named counterparties already in the catalog: (1) `library_acquisition_orders` (833) -> `ap_invoices` or equivalent in AP-AUTO (29) when an acquisition order is invoiced (lifecycle state `invoiced` already exists, state_order 60); (2) `library_acquisition_orders` (833) -> ERP-FIN (65) budget / encumbrance object when ordered or received; (3) `library_serial_subscriptions` (835) -> AP-AUTO recurring invoice on renewal; (4) `library_eresource_licenses` (836) -> CLM (`contracts` master, wherever it sits) on activation / renewal / termination; (5) `library_patrons` (831) -> IAM/IGA (`identity` or `iam_users`) for SSO-backed registration in academic and large-public deployments; (6) `library_patrons` (831) -> HCM `employees` (54) when staff are also patrons (employee-faculty-as-patrons is a near-universal academic pattern); (7) `bibliographic_records` (823) -> KMS `knowledge_articles` (33) where library cataloging feeds enterprise knowledge bases (less common, but the digital-library / institutional-repository pattern); (8) `library_program_events` (missing master, see Bucket 3) -> MA / B2C-COMM event campaigns. | Author cross-domain `data_object_relationships` for the (1)-(6) edges where both counterparty masters exist today, plus the matching outbound `trigger_events` and `handoffs` rows per B9 / B10b shape. The (7) and (8) edges depend on Bucket 3 master loads. Author the 6 high-confidence rows in a single Phase-B extension load. |
| B1-S4 | **B8 + market (fail), zero cross-domain handoffs** | Mechanically follows from B1-S3: with zero cross-domain `data_object_relationships`, there are also zero cross-domain `handoffs`. For the 6 outbound edges in B1-S3, the corresponding handoffs are: (a) `library_acquisition_order.invoiced` LIB-ACQUISITIONS -> AP-AUTO; (b) `library_acquisition_order.submitted` (already a trigger_event, just no outbound handoff) -> ERP-FIN encumbrance; (c) `library_serial_subscription.renewed` -> AP-AUTO; (d) `library_eresource_license.activated` / `.renewed` / `.terminated` -> CLM; (e) `library_patron.activated` -> IAM/IGA; (f) `library_patron.activated` -> HCM lookup (or HCM `employee.hired` -> LIB-PATRON inbound, since the originating event is on the HCM side). | Author 6 outbound handoff rows with the new cross-domain `trigger_events`, both module FKs populated, and `record_status='new'`. The HCM inbound edge (f) is REPORT-ONLY since HCM's B9 owes the outbound (see Report-only follow-ups). |
| B1-S5 | **A4 voice + Rule #20** | When drafting `catalog_tagline` and `catalog_description` in B1-S1, do NOT enumerate vendors in either column (Rule #18) and use buyer voice (workflow + value) not analyst voice. Draft examples: tagline "Run your library: catalog every title, lend every item, support every patron." Description (long form): "Catalog books, journals, e-resources, and special collections in MARC21 or BIBFRAME. Run daily circulation: check-out, check-in, holds, fines, and circulation policy. Register patrons, manage patron categories, and issue cards. Order materials, manage serial subscriptions, and track e-resource licenses. Publish a discovery layer and OPAC for self-service search. Run interlibrary loan workflows with resource-sharing partners." | This row is the recommended copy; user reviews wording before PATCH. Fold into B1-S1's load. |
| B1-S6 | **B6 lifecycle-anchored trigger_events for `library_acquisition_orders`** | The `library_acquisition_orders` master has 9 lifecycle states (`draft`, `submitted`, `ordered`, `partial_received`, `received`, `invoiced`, `paid`, `closed`, `cancelled`) but only ONE `trigger_event` (`library_acquisition_order.received`). Per B9 ("every state with `requires_permission=true` ... has a matching `trigger_events.event_name`"), the missing high-signal events are: `library_acquisition_order.submitted` (state_order 20, `requires_permission=true`); `library_acquisition_order.invoiced` (state_order 60, not currently permission-gated); `library_acquisition_order.paid` (state_order 70); `library_acquisition_order.cancelled` (state_order 90, `requires_permission=true`). These are also the natural source events for the B1-S3 / B1-S4 cross-domain handoffs (`.invoiced` -> AP-AUTO; `.submitted` -> ERP-FIN encumbrance). | Author 4 new `trigger_events` rows. Combine with B1-S4 loads. |
| B1-S7 | **B6 lifecycle-anchored trigger_events for `library_eresource_licenses`** | Same shape as B1-S6. The master has 6 lifecycle states with 3 permission-gated transitions (`active`, `renewed`, `terminated`) but ZERO `trigger_events` rows. License-activation, license-renewal, and license-termination are the natural source events for CLM handoffs. | Author 3 `trigger_events` rows: `library_eresource_license.activated`, `.renewed`, `.terminated`. Combine with B1-S4 loads. |
| B1-S8 | **B6 lifecycle-anchored trigger_events for `library_patrons` and other workflow masters** | Same shape as B1-S6 / B1-S7. `library_patrons` (831) has 5 states with 3 permission-gated; only `library_patron.suspended` exists as a trigger_event. Missing: `.activated`, `.archived`. `library_loans` (827) has 6 states; zero trigger_events on this master beyond what the intra-domain handoffs already reference (no `.returned`, `.lost`, `.renewed`). `library_fines` (829) has 5 states; only `.assessed` exists. `library_serial_subscriptions` (835) has 4 states; zero trigger_events. `interlibrary_loan_requests` (838) has 9 states; only `.received` exists. | Author the missing `trigger_events` rows; ~12 events. Most are intra-domain signal-only; only a few drive cross-domain handoffs (covered by B1-S4 / B1-S6 / B1-S7). |
| B1-S9 | **C1 thin, only 1 owner business_function row** | The only owner is "Research and Development" (id 35); the only contributor is "Learning and Development". Library staff in academic, public, and school deployments map cleanly to Customer Service (public-services librarians, circulation clerks) and Operations (technical-services librarians, catalogers, acquisitions librarians) at least as much as to R&D. The R&D classification reflects the academic-library angle (where the library lives under the Provost / VP Research) but misses the operations / customer-service shape entirely. | Add `business_function_domains` rows: (a) Operations as contributor or owner (technical services); (b) Customer Service as contributor (public-services); (c) consider downgrading R&D from owner to contributor and elevating one of the above (depends on buyer segment). Surface to user for the per-row decision. |
| B1-S10 | **APQC TAGGING (H1 vacuous)** | LIB-MGMT publishes zero cross-domain handoffs (all 9 are intra-domain). H1 mandates APQC coverage for cross-domain handoffs only, so the headline H1 catalog-quality number is undefined here (vacuous pass). Once B1-S4 loads outbound cross-domain handoffs (LIB-ACQUISITIONS -> AP-AUTO / ERP-FIN, LIB-PATRON -> IAM / HCM, LIB-ACQUISITIONS -> CLM for e-resource licenses), each new cross-domain row needs an APQC tag. Provisional PCF candidates (subject to lookup against `processes` at load time): (i) `library_acquisition_order.invoiced` -> AP-AUTO maps to "Process accounts payable (AP)" (10750 L2) or a finer L3; (ii) `library_acquisition_order.submitted` -> ERP-FIN encumbrance maps to "Manage and process budget" (10737 L3); (iii) `library_eresource_license.activated` -> CLM maps to "Manage contracts" (10421 L3); (iv) `library_patron.activated` -> IAM maps to "Manage IT user identity and authorization" (20756 L3); (v) HCM -> LIB-PATRON staff-as-patron is REPORT-ONLY (HCM owes the outbound). | After B1-S4 lands the cross-domain handoffs, author `handoff_processes` rows in the same loader with `proposal_source='agent_curated'`, `record_status='new'`. The H1 catalog-quality number becomes meaningful only after that load. |

#### Bucket 1 counts by finding type

| Finding type | Count |
|---|---|
| MISSING (entity gap on existing modules) | 0 (entity gaps surfaced as Bucket 3 / market) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A4 catalog UX + B12 lifecycle exemptions + B6 trigger_events backfills + C1 functions) | 6 |
| BOUNDARY (B8 cross-domain relationships + cross-domain handoffs) | 3 |
| APQC TAGGING (post-B1-S4 load) | 1 |
| **Bucket 1 total** | **10** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **B12 config-shape exemption per-master** for the 5 plausibly config-shaped masters (`library_circulation_policies` 830, `library_patron_categories` 832, `library_vendor_accounts` 834, `library_saved_searches` 837, `library_sharing_partners` 839). The audit proposes recording the exemption decision here (Rule #15 disallows writing it to `data_objects.notes`). For `library_holdings` 826 the audit recommends authoring a real 3-state lifecycle, not exempting. | Per-master judgment: the user owns whether a master is config-shape vs workflow-bearing. The current `library_holdings` ambiguity in particular depends on whether the deployment treats holdings as a true workflow object (Alma does; Koha does not). | Per-row: (a) exempt (config-shape, no lifecycle); (b) author lifecycle states (work-in-flight masters need them per Rule #12). For `library_holdings`: (a) exempt; (b) draft `new -> linked -> withdrawn`; (c) draft richer 5-state machine if the deployment is Alma-shaped. |
| B2-S2 | **A4 catalog_tagline / catalog_description wording.** B1-S5 proposes copy. Per Rule #20 the user reviews the exact wording BEFORE PATCH; do not bulk-overwrite once a non-empty value exists. | Marketing copy is buyer-facing. Even with the wording proposed in B1-S5, the user owns the final approval. | (a) Approve B1-S5 wording verbatim; (b) rewrite; (c) defer to a marketing pass. |
| B2-S3 | **C1 / C2 functional ownership shape.** Should LIB-MGMT keep "Research and Development" as owner, or elevate "Operations" or "Customer Service" instead? Most public-library deployments answer "Operations" (technical services) or "Customer Service" (public services); most academic deployments answer "Research and Development" or a library-specific function. The catalog currently has only the R&D answer. | The right answer depends on the catalog's buyer-persona axis (B2-C buyer-segment filtering downstream of `business_function_domains`). User decides which function shape is canonical. | (a) Add Operations + Customer Service as contributors, keep R&D as owner (academic-library-first); (b) flip ownership to Operations, demote R&D to contributor (public-library-first); (c) split into a dedicated `Library Services` function under the canonical 20-function spine (substantial restructuring). |
| B2-S4 | **E1 / E2 role-naming convention.** All 5 LIB-MGMT roles are prefixed `RESEARCH-DEV-` (`RESEARCH-DEV-CATALOGER`, `RESEARCH-DEV-CIRCULATION-CLERK`, `RESEARCH-DEV-ACQUISITIONS-LIBRARIAN`, `RESEARCH-DEV-REFERENCE-LIBRARIAN`, `RESEARCH-DEV-LIBRARY-DIRECTOR`). The function-scoped naming rule expects the prefix to be the role's `business_function_name` slug. The prefix mechanically follows from R&D being the assigned function, but reads as forced. If B2-S3 changes the function, the role codes should rename (a) consistently (`OPS-CATALOGER`) or (b) drop the prefix entirely if the new function spans many domains, or (c) re-prefix to a library-specific function. | RBAC-design decision; depends on B2-S3's outcome and the catalog's prefix conventions. | (a) Leave as `RESEARCH-DEV-*`; (b) rename consistent with new function from B2-S3; (c) drop the function prefix (rare; reserved for cross-functional roles like Hiring Manager). |
| B2-S5 | **Discovery layer scope: keep `LIB-DISCOVERY` as a thin OPAC module, or expand to cover modern discovery layers (EBSCO Discovery Service, Primo VE, Summon)?** Modern discovery indexes hundreds of millions of articles across publishers and aggregators; it is structurally different from a pure OPAC over the local catalog. Today `LIB-DISCOVERY` masters only `library_saved_searches`, with bibliographic / item / holdings as consumers. A real discovery layer also masters search relevance rules, indexing schedules, link resolver targets (OpenURL, KBART), and federated search profiles. | Distinguishing OPAC (local catalog only) from discovery layer (catalog + remote indices) is a buyer-segment call: academic libraries usually need both; small public libraries only need OPAC. The current module conflates the two. | (a) Keep one module, document scope tightly; (b) split into `LIB-OPAC` (local catalog search) + `LIB-DISCOVERY` (federated, link resolver, relevance); (c) defer pending Bucket 3 entity work. |
| B2-S6 | **Should LIB-MGMT carry any `domain_regulations` rows?** US public libraries operate under the ALA Library Bill of Rights (not statutory) and selective state-level patron-privacy statutes (e.g. NY CPLR 4509). FERPA covers academic-library patron records when tied to enrolled-student status. GDPR / UK DPA covers EU library deployments. None of these are currently linked. | Whether to attach `domain_regulations` is a structural-coverage decision (some regulations apply via the consuming function, e.g. FERPA via HE-SIS) vs domain-direct. | (a) Add FERPA (academic), state patron-privacy statutes (public), GDPR (EU); (b) leave empty (regulations attach via the consuming function); (c) only the universally applicable subset. |

### Bucket 3, Phase 0 pending (speculative)

Market knowledge sweep (no formal Phase 0 subagent run for this audit; surfacing candidate entity gaps for vet-or-eyeball):

| ID | Candidate | Vendor knowledge basis | Recommended verification |
|---|---|---|---|
| B3-S1 | **MISSING `library_branches` master** (multi-branch / multi-location library systems) | Every public library system above ~3 branches, every academic library with subject libraries, and every consortial deployment masters a branches / locations object. Alma calls it `library`; Sierra / Symphony call it `branch`; FOLIO calls it `library` within an institution. The current footprint scopes holdings, items, circulation rules, staff to a single implicit location, which collapses on any real-world deployment beyond single-branch. | Phase 0 vendor docs: Alma libraries-and-locations model, FOLIO institution/campus/library/location hierarchy, OCLC WMS branch hierarchy. High-confidence Core entity; likely belongs in a new master or extends an existing one (`library_holdings.branch_id`, `library_items.home_branch_id`, `library_circulation_policies.branch_id`). |
| B3-S2 | **MISSING `library_digital_loans` / e-book + audiobook lending master** (DRM-limited concurrent-use lending) | OverDrive, Hoopla, Axis 360, cloudLibrary, Boundless, BorrowBox: e-book and audiobook loans are structurally distinct from physical loans (no physical item, DRM-enforced expiry, simultaneous-use license caps, no fines). Alma Digital and FOLIO ERM model digital loans as a separate flow. The current footprint has no surface for this even though digital lending is a substantial slice of every public library's 2026 circulation. | This may belong in LIB-MGMT as a sibling master to `library_loans` with its own lifecycle (`borrowed -> returned/expired`), OR may belong in a new `DIGITAL-LENDING` domain (queued separately). Phase 0 should pick. |
| B3-S3 | **MISSING `library_program_events` / library programming master** (story time, author talks, classes, workshops) | Public libraries run extensive programming (children's story time, ESL classes, computer literacy, summer reading programs); academic libraries run instruction sessions and faculty workshops. Vendors: Springshare LibCal, Communico Events, Demco Niche Academy. Programming has a distinct lifecycle (`scheduled -> registration_open -> registration_full -> held -> attended`) and ties to patron registration. | Phase 0 vendor docs: LibCal Events, Communico Engage. Likely belongs as a master in a new `LIB-PROGRAMS` module of LIB-MGMT, OR consolidated under a candidate `SPACE-BOOKING` domain that also covers room reservations. |
| B3-S4 | **MISSING `library_course_reserves` / course-reading-list master** (academic short-loan and licensed-readings surface) | Academic libraries operate course reading lists with two distinct objects: the reading list itself (per course per term, instructor-authored) and the reserve items (physical short-loans plus licensed-reading links). Vendors: Ex Libris Leganto, Atlas Systems Ares, Talis Aspire, Rialto. The current footprint has no master for either; `library_saved_searches` is far too generic. | Phase 0 vendor docs: Leganto reading lists, Ares reserves workflow. Likely belongs in a new `LIB-COURSE-RESERVES` module of LIB-MGMT, OR in a new `ACADEMIC-COURSE-RESERVES` domain (queued separately). Strong candidate for its own market given the leader-tier vendor list. |
| B3-S5 | **MISSING `library_patron_identities` / patron-SSO master surface** (SAML/CAS/OAuth integration with campus IDP or municipal SSO) | Every academic-library deployment integrates with the campus IDP via Shibboleth / SAML / CAS; many public libraries integrate with municipal SSO (e.g. a library card mapped to a citizen-identity). The catalog has no surface for the identity-binding lifecycle, the IDP profile, or the attribute-release contract; `library_patrons.linked_to_user` is a single edge that does not carry any of that. | Phase 0 vendor docs: OCLC EZproxy, Shibboleth IDP, OpenAthens. May belong as a contributor/embedded_master in `LIB-PATRON` consuming the canonical master in `IGA` (which currently lacks the patron-IDP shape). Cross-domain Phase-B extension; depends on `IGA` Phase-B for the canonical master. |

**Candidate missing domains queued separately** (via `append_missing_domain.ts`):

- **ACADEMIC-COURSE-RESERVES**, Academic Course Reserves. Distinct from LIB-MGMT by vendor evidence (Leganto, Ares, Talis Aspire, Rialto are pure-play): the surface is instructor-authored reading lists per course per term, license clearance against publisher rights, persistent linking to e-resources, fair-use checks. Belongs adjacent to LIB-MGMT and LMS.
- **DIGITAL-LENDING**, Digital Lending and E-Book Distribution. Vendor evidence (OverDrive Libby, Hoopla, Axis 360, cloudLibrary, Boundless, BorrowBox). DRM-protected concurrent-use lending model, structurally distinct from physical circulation, with its own contract / license substrate. Adjacency: LIB-MGMT, B2C-COMM, DRM.
- **SPACE-BOOKING**, Space and Room Booking. Vendor evidence (Springshare LibCal, Skedda, EMS Software, Robin, OfficeRnD, YArooms). Study room reservations, equipment reservations, recurring bookings; same surface used by libraries, coworking, and corporate flex-space. Cross-cuts LIB-MGMT, IWMS, REAL-EST, EMP-EXP.

**Bucket 3 prompt:** vet via formal Phase 0 vendor research (a focused subagent producing `c:/tmp/LIB-MGMT-phase0-2026-05-30.md` with vendor entity surfaces per row), or eyeball-mode (name which of B3-S1 / B3-S2 / B3-S3 / B3-S4 / B3-S5 ring true and they become Bucket 1 items immediately)? Strongest signal is B3-S1 (`library_branches`, every multi-branch deployment needs it); next is B3-S2 (digital lending, possibly its own domain via the queued candidate); B3-S4 (course reserves) is most arguable as its own domain.

### Cross-bucket dependencies

- **B1-S1 / B1-S5 (catalog UX wording)** depend on **B2-S2** (user-approves the exact wording). Do not write until approved.
- **B1-S2 (lifecycle exemptions)** depends on **B2-S1** (per-master config-shape decision). The decision shape is recorded here in the audit; no `data_objects.notes` writes per Rule #15.
- **B1-S3 / B1-S4 / B1-S6 / B1-S7 / B1-S8 / B1-S10 (cross-domain edges, trigger_events backfills, APQC tags)** are a single Phase-B extension load: relationships first, then trigger_events, then handoffs (with both module FKs populated), then handoff_processes. They are mutually independent of Bucket 2 and Bucket 3 except where B3-S2 (digital lending) might bring its own cross-domain edges if loaded.
- **B1-S9 / B2-S3 / B2-S4 (function spine + role naming)** are coupled: B2-S3 decides the function shape, B1-S9 loads the rows, B2-S4 renames the roles to match.
- **B2-S5 (Discovery scope)** is independent of every other item; affects only LIB-DISCOVERY module shape.
- **B2-S6 (regulations)** is independent and low priority.
- **B3-S3 (programming) and B3-S4 (course reserves)** may collapse into the queued candidate domains (SPACE-BOOKING and ACADEMIC-COURSE-RESERVES respectively); the decision is whether to extend LIB-MGMT or promote new domains.
- **B3-S5 (patron identity)** depends on `IGA` Phase-B work (no canonical patron-IDP master in the catalog today).

### Per-bucket prompts

**Bucket 1, fix these now?** Reply: `all`, list (e.g. `S1, S3, S6`), or `skip`.

- **S1 (A4 catalog tagline + description):** depends on B2-S2; load after approval.
- **S2 (B12 lifecycle states):** 5 config-shape exemptions recorded here + author `library_holdings` 3-state lifecycle. Depends on B2-S1.
- **S3 (cross-domain `data_object_relationships`):** 6 outbound edges; mechanical.
- **S4 (cross-domain `handoffs`):** 5 outbound + 1 inbound (REPORT-ONLY for HCM->LIB-PATRON). Mechanical.
- **S5 (catalog UX copy):** the recommended wording, folded into S1.
- **S6, S7, S8 (trigger_events backfills):** ~19 events total (`library_acquisition_order.*` x 4, `library_eresource_license.*` x 3, `library_patron.*` x 2, `library_loan.*` x 3, `library_fine.*` x 4, `library_serial_subscription.*` x 4, `interlibrary_loan_request.*` x 8 minus existing).
- **S9 (`business_function_domains` rows):** depends on B2-S3.
- **S10 (APQC `handoff_processes`):** load after S4.

**Bucket 2, what's your call on each?** Per-item decisions, no batch.

- **B2-S1 (lifecycle exemptions):** per-master config-shape vs workflow; `library_holdings` is the ambiguous one.
- **B2-S2 (catalog UX wording):** approve the B1-S5 draft, rewrite, or defer.
- **B2-S3 (function shape):** Operations / Customer Service / R&D balance.
- **B2-S4 (role naming):** rename consistent with B2-S3 or leave.
- **B2-S5 (Discovery scope):** keep / split / defer.
- **B2-S6 (regulations):** add FERPA / GDPR / state statutes or leave empty.

**Bucket 3, Phase 0 pending, vet or eyeball?** If eyeball, name which of B3-S1 / B3-S2 / B3-S3 / B3-S4 / B3-S5 ring true. Strongest no-regrets candidates: B3-S1 (`library_branches`) for any multi-branch deployment; B3-S5 (patron identity / SSO) for academic deployments. The queued candidate domains (ACADEMIC-COURSE-RESERVES, DIGITAL-LENDING, SPACE-BOOKING) carry the B3-S2 / B3-S3 / B3-S4 surface; the LIB-MGMT-vs-new-domain decision shapes whether those entities load on LIB-MGMT modules or on the new domain when promoted.

### Report-only follow-ups (owed by other domains)

LIB-MGMT publishes zero cross-domain edges today, so almost every report-only item below is a hypothetical follow-up that would materialize after B1-S4 loads the outbound cross-domain handoffs. Listed for visibility once those land.

| Owed by | What | Why |
|---|---|---|
| HCM (54) | B9 outbound `employee.hired` (or equivalent) -> LIB-PATRON when staff are added as patrons | LIB-MGMT cannot author HCM's outbound events. Once B1-S4 surfaces this dependency, HCM's b1 audit's B9 will pick it up. |
| AP-AUTO (29) | B10b inbound DMDO declaration on `library_acquisition_orders` / `library_serial_subscriptions` payloads if AP-AUTO chooses to model the library-vendor-invoicing slice | Optional pattern: AP-AUTO can accept library acquisitions as a generic invoice flow without needing a dedicated DMDO on the library master, since the canonical AP master is `ap_invoices`. Surface only if AP-AUTO wants the explicit edge. |
| ERP-FIN (65) | B10b inbound DMDO declaration on `library_acquisition_orders` for encumbrance budgeting | Same shape as AP-AUTO above. Surface if ERP-FIN wants the explicit edge. |
| IGA (id from lookup) | B10b inbound DMDO declaration on `library_patrons` for SSO-backed registration | Once B1-S4 surfaces patron-IDP, IGA owes the canonical identity edge. |
| CLM (wherever `contracts` is mastered) | B10b inbound DMDO declaration on `library_eresource_licenses` if CLM chooses to model library-license contracts | Pattern: e-resource licenses are contracts in CLM's canonical shape; CLM can choose to embed the library variant or accept it as a generic contract. |

## 2026-05-31, Continuation: B1 technical fixes

Scope of this pass: apply only "truly technical" B1 fixes (enum backfills the audit pre-specifies; B10b FK PATCHes derivable from existing modules; `domain_regulations` inserts to existing rows; DELETEs of audit-named stale rows with IDs; naming renames where FKs are unaffected; `data_object_relationships` user-edges that Rule #10 audit pre-specifies; `permission_verb_override` PATCHes the audit names state+verb for; `handoff_processes` INSERTs ONLY when the audit pre-specifies a `handoff_id` plus a resolvable PCF). Defer everything else (new entities/DMDOs/modules, "user picks" wording or options, `catalog_tagline` / `catalog_description` drafts per Rule #20, new `business_function_domains` contributors/consumers, items gated on B2-X).

### Classification of the 10 B1 items

| ID | Type | Disposition | Reason |
|---|---|---|---|
| B1-S1 | STRUCTURAL (A4 catalog UX) | DEFER | `catalog_tagline` / `catalog_description` drafts are Rule #20 surface-for-user; explicitly gated on B2-S2 wording approval. |
| B1-S2 | STRUCTURAL (B12 lifecycle) | DEFER | Per-master config-shape vs workflow decision is owned by the user (B2-S1); `library_holdings` lifecycle shape ("user picks" 3-state vs 5-state vs exempt) is a judgment call. |
| B1-S3 | BOUNDARY (cross-domain `data_object_relationships`) | DEFER | The 6 proposed edges are NOT Rule #10 user-edges (those are already complete, 8 rows). Cross-domain relationships and the matching counterparty masters live outside the truly-technical scope; require neighbor-domain validation and surface-for-user follow-ups. |
| B1-S4 | BOUNDARY (cross-domain `handoffs`) | DEFER | Mechanically depends on B1-S3 landing; handoffs themselves are not in the truly-technical INSERT list. |
| B1-S5 | STRUCTURAL (A4 voice) | DEFER | Folded into B1-S1; same Rule #20 surface-for-user gate. |
| B1-S6 | STRUCTURAL (B6 trigger_events backfill, `library_acquisition_orders`) | DEFER | `trigger_events` INSERTs are not in the truly-technical scope for this pass. Required `from_state` / `to_state` / `event_category` derivations + module FK selection are judgment-bearing enough that they belong with the broader Phase-B extension. |
| B1-S7 | STRUCTURAL (B6 trigger_events backfill, `library_eresource_licenses`) | DEFER | Same reason as B1-S6. |
| B1-S8 | STRUCTURAL (B6 trigger_events backfill, workflow masters) | DEFER | Same reason as B1-S6 / B1-S7; ~12 additional events. |
| B1-S9 | STRUCTURAL (C1 `business_function_domains`) | DEFER | New contributors / consumers on `business_function_domains` are explicitly excluded from this pass; depends on B2-S3 (function-shape decision). |
| B1-S10 | APQC TAGGING (`handoff_processes`) | DEFER | No cross-domain `handoff_id` exists today (B1-S4 has not landed); audit does not pre-specify a `handoff_id` + resolvable PCF tuple. Cannot insert until B1-S4 lands first. |

### Live-state verification (pre-classification)

- `trigger_events` on LIB-MGMT data_objects (823, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836, 837, 838, 839): 7 rows confirmed (`bibliographic_record.published`, `interlibrary_loan_request.received`, `library_acquisition_order.received`, `library_fine.assessed`, `library_hold.placed`, `library_hold.ready`, `library_patron.suspended`). Matches audit.
- `data_object_lifecycle_states` on LIB-MGMT masters: 62 rows across 11 of 17 masters. The 6 zero-state masters (826, 830, 832, 834, 837, 839) confirmed. Matches audit.
- `data_object_relationships` involving LIB-MGMT masters: 29 rows; 8 of those are Rule #10 user-edges (7 `users` -> LIB master action verbs at ids 1256-1262, plus 1 reverse `library_patrons linked_to_user users` at id 1264). Rule #10 user-edge surface is COMPLETE for LIB-MGMT.
- `handoffs` touching domain 168: 9 rows, all intra-domain (`source_domain_id = target_domain_id = 168`). Confirms zero cross-domain handoffs; B1-S10 cannot land without B1-S4 first.

### Fixes per type

| Type | Fixes applied | Notes |
|---|---|---|
| PATCH enum backfills | 0 | Audit does not pre-specify any enum backfill. |
| B10b FK PATCHes | 0 | B10b passes vacuous (no inbound cross-domain DMDO declarations). |
| INSERT `domain_regulations` | 0 | B2-S6 is a "user picks" decision (Rule #20 / "decide"). |
| DELETE stale rows | 0 | None audit-named. |
| PATCH naming renames | 0 | None audit-named. |
| INSERT user-edges Rule #10 | 0 | Already complete (8 rows live, matches audit count). |
| PATCH `permission_verb_override` | 0 | None audit-named. |
| INSERT `handoff_processes` (gated) | 0 | No `handoff_id` exists today; B1-S4 not landed. |

**Total fixes applied: 0.** All 10 B1 items defer for reasons listed above.

### Deferred items

10 of 10 B1 items deferred. Categories:

- Rule #20 surface-for-user (catalog UX wording): 2 (B1-S1, B1-S5)
- User picks / lifecycle judgment: 1 (B1-S2)
- Cross-domain `data_object_relationships` / `handoffs` extension load (not user-edges, not in this pass's scope): 2 (B1-S3, B1-S4)
- `trigger_events` backfill (not in truly-technical scope; from_state / to_state / event_category derivation belongs with broader Phase-B): 3 (B1-S6, B1-S7, B1-S8)
- New `business_function_domains` contributors/consumers (explicitly excluded): 1 (B1-S9)
- APQC `handoff_processes` gated on cross-domain handoff existence: 1 (B1-S10)

### JWT-audience errors

None encountered.

### Loader

No loader created. Zero technical fixes apply; no `.tmp_deploy/` script was needed.

## 2026-05-31, Audit

### Summary

- **Current footprint:** domain id 168, 6 full modules (`LIB-CATALOG` 155, `LIB-CIRCULATION` 156, `LIB-PATRON` 157, `LIB-ACQUISITIONS` 158, `LIB-DISCOVERY` 159, `LIB-ILL` 160), zero starter modules. 8 capabilities (`LIB-CATALOGING`, `LIB-CIRCULATION`, `LIB-ACQUISITIONS`, `LIB-PATRON-MGMT`, `LIB-DISCOVERY`, `LIB-SERIALS`, `LIB-ERESOURCE`, `LIB-ILL`). 17 masters in DMDO. 8 primary solutions (Alma, BLUEcloud, WMS, FOLIO, Koha, Spydus, Destiny, Apollo). 9 trigger_events (all with `event_category` set). 9 handoffs (all intra-domain on `source_domain_id = target_domain_id = 168`, `integration_pattern=lifecycle_progression`, friction mostly low; one `medium` on `library_patron.suspended -> LIB-CIRC`). Zero cross-domain handoffs (outbound + inbound). 31 `data_object_relationships` (22 intra-domain master-to-master, 8 `users` user-edges per Rule #10, 1 reverse `library_patrons linked_to_user users`). 24 `data_object_aliases` across 12 masters. 62 lifecycle states across 11 of 17 masters (`library_holdings` 826, `library_circulation_policies` 830, `library_patron_categories` 832, `library_vendor_accounts` 834, `library_saved_searches` 837, `library_sharing_partners` 839 carry zero). 6 system skills (one per module) + 73 `skill_tools` rows, all `coverage_tier=platform`. 18 permissions (3 per module: read/manage/admin). 5 roles + 18 `role_modules` + 18 `role_permissions`. 2 `business_function_domains` rows. Zero `domain_regulations`. Zero `handoff_processes`. Zero `embedded_master` DMDO rows.
- **Bucket 1 (in-scope, agent fixable):** 7 items.
- **Bucket 2 (surface-for-user, judgment):** 6 items.
- **Bucket 3 (Phase 0 pending, speculative):** 5 items (carried).

Structural pass bands: **A1 / A2 / A3 / M1 / M2 / M4 / M5 / M6 / M7 / B1 / B2 / B3 / B5 (vacuous) / B7 / B9b / B10 (vacuous) / B10b / B11 / C2 (no override needed) / D1 / E1 / E2 / E3 / E4 / E5 / F1 / F2 / F3 / F4 / F5 / F7 / H1 (vacuous on zero cross-domain handoffs)** pass cleanly. **A4 fails** (`domains.catalog_tagline` and `catalog_description` empty). **M8 fails** (all 6 `domain_modules` rows have empty `catalog_tagline` and `catalog_description`). **B4 partial-pass with audit ack** (pattern flags considered: `has_personal_content=true` on 6 patron-touching masters 827, 828, 829, 831, 837, 838; `has_submit_lock=true` on 833; all others false-by-default). **B6 + B9 partial-fail** (lifecycle states with `requires_permission=true` on 7 masters lack matching `trigger_events`: `library_item.available/.withdrawn`, `library_authority.established`, `library_loan.renewed/.returned/.lost`, `library_hold.trapped/.fulfilled/.cancelled` plus `.placed/.ready` already present, `library_fine.paid/.waived/.sent_to_collections`, `library_patron.activated/.archived`, `library_acquisition_order.submitted/.received already/.cancelled`, `library_serial_subscription.renewed/.cancelled`, `library_eresource_license.activated/.renewed/.terminated`, `interlibrary_loan_request.routed/.accepted/.shipped/.completed/.cancelled`). **B8 fail** (zero outbound cross-domain `data_object_relationships`). **B9 cross-domain fail** (zero cross-domain handoffs for a domain that touches ERP, AP, IAM, HCM, CLM). **C1 thin** (R&D as owner, L&D as contributor only; Operations and Customer Service not represented). **B12 partial-fail** (6 zero-state masters carried from prior audit).

Domain Semantius score across 6 system skills: **73 platform / 73 total = 100% strict**, **73 / 73 = 100% operational**. No tool below `platform` coverage.

Rule #15 sweep: `data_objects.notes`, `domain_module_data_objects.notes`, `data_object_relationships.notes`, `handoffs.notes`, `skill_tools.notes`, `solutions.notes`, `vendors.notes` all empty across the LIB-MGMT footprint. No remediation required. Rule #20 sweep: domain catalog UX columns empty (A4); all 6 module catalog UX columns empty (M8). Backfill is permitted with user-approved wording but never auto-loaded.

### Bucket 1, In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **A4 (fail)** | `domains.id=168` carries empty `catalog_tagline` and `catalog_description`. Per Rule #20 these are the mandatory buyer-facing surfaces feeding the catalog and the site generator. | Draft both fields in buyer voice (workflow + value), surface to user BEFORE PATCH. Never overwrite once non-empty. |
| B1-S2 | **M8 (fail)** | All 6 `domain_modules` rows (`LIB-CATALOG` 155, `LIB-CIRCULATION` 156, `LIB-PATRON` 157, `LIB-ACQUISITIONS` 158, `LIB-DISCOVERY` 159, `LIB-ILL` 160) carry empty `catalog_tagline` and `catalog_description`. Same Rule #20 surface as A4, at module grain. | Draft per-module buyer-voice copy, surface to user BEFORE PATCH. Independent of A4 wording. |
| B1-S3 | **B6 + B9, lifecycle-anchored trigger_events backfill** | Lifecycle states marked `requires_permission=true` on 7 masters lack matching `trigger_events`. Missing (with module + state_order): `library_item.available` (155, 40), `library_item.withdrawn` (155, 80), `library_authority.established` (155, 20), `library_loan.renewed` (156, 20), `library_loan.returned` (156, 40), `library_loan.lost` (156, 50), `library_hold.trapped` (156, 20), `library_hold.fulfilled` (156, 50), `library_hold.cancelled` (156, 70), `library_fine.paid` (156, 30), `library_fine.waived` (156, 40), `library_fine.sent_to_collections` (156, 50), `library_patron.activated` (157, 20), `library_patron.archived` (157, 50), `library_acquisition_order.submitted` (158, 20), `library_acquisition_order.received` already present, `library_acquisition_order.cancelled` (158, 90), `library_serial_subscription.renewed` (158, 20), `library_serial_subscription.cancelled` (158, 30), `library_eresource_license.activated` (158, 20), `library_eresource_license.renewed` (158, 30), `library_eresource_license.terminated` (158, 60), `interlibrary_loan_request.routed` (160, 20), `interlibrary_loan_request.accepted` (160, 30), `interlibrary_loan_request.shipped` (160, 40), `interlibrary_loan_request.completed` (160, 70), `interlibrary_loan_request.cancelled` (160, 90). Roughly 25 new trigger_events with `event_category='state_change'`. | Phase-B trigger_events insert. Mechanical: each row `(event_name='<entity>.<state>', data_object_id, event_category='state_change', description)`. Most are intra-domain signal-only; a few (`.submitted`, `.invoiced`, `.activated`, `.renewed`, `.terminated`) are the source events for the B1-S5 cross-domain handoffs. |
| B1-S4 | **B8 (fail), zero outbound cross-domain `data_object_relationships`** | The catalog records 22 intra-domain master-to-master rows + 8 `users` user-edges + 1 reverse `library_patrons linked_to_user users`, total 31 rows. Zero outbound cross-domain. For a 17-master domain that touches AP, ERP, IAM, HCM, CLM, this is structurally implausible. Concretely missing (counterparty masters that exist in the catalog today): (1) `library_acquisition_orders` (833) -> `ap_invoices` in AP-AUTO when invoiced; (2) `library_acquisition_orders` (833) -> ERP-FIN encumbrance object when ordered or received; (3) `library_serial_subscriptions` (835) -> AP-AUTO recurring invoice on renewal; (4) `library_eresource_licenses` (836) -> CLM `contracts` master on activation / renewal / termination; (5) `library_patrons` (831) -> IGA `iam_users` for SSO-backed registration; (6) `library_patrons` (831) -> HCM `hcm_employees` (54) when staff are also patrons. | Author cross-domain `data_object_relationships` for the 6 high-confidence outbound edges, each carrying `relationship_verb`, `inverse_verb`, `relationship_type`, `relationship_kind`, `is_required`, `owner_side`. Phase-B extension loader. |
| B1-S5 | **B9 (fail), zero outbound cross-domain `handoffs`** | Follows mechanically from B1-S4 + B1-S3. With 0 cross-domain `trigger_events` and 0 outbound cross-domain handoffs, the substrate cannot model: (a) `library_acquisition_order.invoiced` LIB-ACQUISITIONS -> AP-AUTO; (b) `library_acquisition_order.submitted` LIB-ACQUISITIONS -> ERP-FIN; (c) `library_serial_subscription.renewed` LIB-ACQUISITIONS -> AP-AUTO; (d) `library_eresource_license.activated / .renewed / .terminated` LIB-ACQUISITIONS -> CLM; (e) `library_patron.activated` LIB-PATRON -> IGA. The HCM-staff-to-patron edge is REPORT-ONLY (HCM owes the outbound `hcm_employee.hired`). | Author 6 outbound handoff rows after B1-S3 (events) + B1-S4 (relationships). `source_domain_module_id` + `target_domain_module_id` populated per the deterministic derivation (Rule B10b). |
| B1-S6 | **B12 partial-fail, `library_holdings` lifecycle** | Master 826 carries zero `data_object_lifecycle_states`. MARC21 / BIBFRAME holdings records carry a real workflow (linked -> withdrawn) in Alma; in Koha they are effectively config. The audit recommends authoring a minimal 3-state lifecycle: `new` (initial) -> `linked` (`requires_permission=true`, verb `link_library_holdings`) -> `withdrawn` (terminal, `requires_permission=true`, verb `withdraw_library_holdings`), all anchored to `domain_module_id=155` (LIB-CATALOG). | INSERT 3 lifecycle states on data_object 826. Surface drafted state rows to user before load. |
| B1-S7 | **APQC TAGGING, vacuous** | LIB-MGMT publishes zero cross-domain handoffs today; H1 is vacuous. Once B1-S5 lands the 6 outbound cross-domain handoffs, each needs a `handoff_processes` row with `proposal_source='agent_curated'`, `record_status='new'`. Provisional PCF candidates (subject to lookup at load time): (i) `.invoiced` -> AP-AUTO matches PCF "Process accounts payable (AP)" (~10750); (ii) `.submitted` -> ERP-FIN matches "Manage and process budget" (~10737); (iii) `.activated` -> CLM matches "Manage contracts" (~10421); (iv) `library_patron.activated` -> IGA matches "Manage IT user identity and authorization" (~20756); (v) `.renewed` (serial) -> AP-AUTO same as (i). | Author 5-6 `handoff_processes` rows in the same loader as B1-S5. Confirm PCF ids by `/processes?process_name=ilike.*<term>*&source_framework=eq.apqc_pcf_cross_industry` at load time. |

#### Bucket 1 counts by finding type

| Finding type | Count |
|---|---|
| MISSING (entity gap on existing modules) | 0 (entity gaps surfaced as Bucket 3 / market) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| STRUCTURAL (A4 catalog UX + M8 module catalog UX + B6/B9 trigger_events + B12 holdings lifecycle) | 4 |
| BOUNDARY (B8 cross-domain relationships + B9 cross-domain handoffs) | 2 |
| APQC TAGGING (post-B1-S5 load) | 1 |
| **Bucket 1 total** | **7** |

### Bucket 2, Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **A4 / M8 catalog UX wording.** Per Rule #20 user reviews wording BEFORE PATCH. Both the domain-grain (A4) draft and the 6 module-grain (M8) drafts need explicit per-row approval. | Marketing copy is buyer-facing. Even with a workflow-and-value draft, the user owns the final approval and per-row diff. | (a) Approve a generated draft verbatim; (b) rewrite per row; (c) defer to a marketing pass. |
| B2-S2 | **B12 config-shape exemption per-master** for the 5 plausibly config-shape masters (`library_circulation_policies` 830, `library_patron_categories` 832, `library_vendor_accounts` 834, `library_saved_searches` 837, `library_sharing_partners` 839). Per Rule #15 the exemption decision is recorded in the audit (this file), NOT in `data_objects.notes`. For `library_holdings` (826) B1-S6 proposes a 3-state lifecycle. | Per-master judgment: the user owns whether each master is config-shape vs workflow-bearing. | Per-row: (a) exempt (no lifecycle states); (b) draft lifecycle states. For 826: (a) exempt; (b) B1-S6 draft 3-state; (c) richer Alma-shaped 5-state machine. |
| B2-S3 | **C1 / C2 functional ownership shape.** Should LIB-MGMT keep "Research and Development" as sole owner with "Learning and Development" as contributor, or elevate "Operations" (technical services) or "Customer Service" (public services)? | Depends on the catalog's buyer-persona axis (academic-first vs public-first). User decides which function shape is canonical. | (a) Keep R&D owner, add Operations + Customer Service as contributors; (b) flip ownership to Operations, demote R&D to contributor; (c) split into a dedicated `Library Services` function (substantial restructuring). |
| B2-S4 | **E1 / E2 role-naming convention.** All 5 LIB-MGMT roles are prefixed `RESEARCH-DEV-` because `business_function_id=35`. If B2-S3 changes the function spine, the role codes should rename. | Depends on B2-S3 outcome and the catalog's prefix conventions. | (a) Leave as `RESEARCH-DEV-*`; (b) rename consistent with new function from B2-S3; (c) drop the function prefix entirely. |
| B2-S5 | **Discovery layer scope.** Keep `LIB-DISCOVERY` as a thin OPAC module, or expand to cover modern discovery layers (EBSCO Discovery Service, Primo VE, Summon)? Modern discovery indexes hundreds of millions of articles across publishers; structurally different from a pure OPAC over the local catalog. | OPAC-vs-discovery is a buyer-segment call: academic libraries usually need both; small public libraries only need OPAC. | (a) Keep one module, document scope tightly; (b) split into `LIB-OPAC` + `LIB-DISCOVERY`; (c) defer pending Bucket 3 entity work. |
| B2-S6 | **Should LIB-MGMT carry any `domain_regulations` rows?** Zero rows today. US public libraries operate under selective state-level patron-privacy statutes; FERPA covers academic-library patron records when tied to enrolled-student status; GDPR / UK DPA covers EU library deployments. | Whether to attach `domain_regulations` is a structural-coverage decision (some regulations attach via the consuming function) vs domain-direct. | (a) Add FERPA (academic), state patron-privacy statutes (public), GDPR (EU); (b) leave empty (regulations attach via the consuming function); (c) only the universally applicable subset. |

### Bucket 3, Phase 0 pending (speculative, carried from 2026-05-30)

Carried verbatim from prior audit; user has not yet vetted or eyeballed. Candidates: `library_branches` master (multi-branch / multi-location library systems), `library_digital_loans` (DRM-limited concurrent-use e-book / audiobook lending; queued candidate domain `DIGITAL-LENDING`), `library_program_events` (library programming; queued candidate domain `SPACE-BOOKING`), `library_course_reserves` (academic course reading lists; queued candidate domain `ACADEMIC-COURSE-RESERVES`), `library_patron_identities` (SAML/CAS/OAuth IDP profile surface).

### Cross-bucket dependencies

- **B1-S1 (A4) + B1-S2 (M8)** both depend on **B2-S1** (user approves the wording per row). Do not write until approved.
- **B1-S3 (trigger_events) -> B1-S4 (cross-domain relationships) -> B1-S5 (cross-domain handoffs) -> B1-S7 (APQC tags)** form a single Phase-B extension load: events first, then relationships, then handoffs (with both module FKs populated), then handoff_processes. Mutually independent of B2 except where B2-S5 (Discovery scope) could shift `domain_module_id` attribution.
- **B1-S6 (holdings lifecycle)** depends on **B2-S2** (config-shape vs workflow judgment on 826 specifically).
- **B2-S3 (function spine)** gates **B2-S4 (role naming)**.
- **B2-S5 (Discovery scope)** and **B2-S6 (regulations)** are independent of every other item.
- **Bucket 3** independent; vet-vs-eyeball decision opens its own Phase-B load.

### Report-only follow-ups (owed by other domains)

Materializes only once B1-S5 loads outbound cross-domain handoffs. Listed for forward visibility:

| Owed by | What | Why |
|---|---|---|
| HCM (54) | B9 outbound `hcm_employee.hired` -> LIB-PATRON when staff are added as patrons | LIB-MGMT cannot author HCM's outbound events. Captured here for HCM's next audit. |
| AP-AUTO (29) | B10b inbound DMDO on `library_acquisition_orders` / `library_serial_subscriptions` payloads if AP-AUTO chooses to model the library-vendor-invoicing slice | Optional: AP-AUTO can accept library acquisitions as a generic invoice flow without a dedicated DMDO. Surface only if AP-AUTO wants the explicit edge. |
| ERP-FIN (65) | B10b inbound DMDO on `library_acquisition_orders` for encumbrance budgeting | Same pattern as AP-AUTO. |
| IGA | B10b inbound DMDO on `library_patrons` for SSO-backed registration | Once B1-S5 surfaces patron-IDP, IGA owes the canonical identity edge. |
| CLM | B10b inbound DMDO on `library_eresource_licenses` | E-resource licenses are contracts in CLM's canonical shape. CLM can embed or accept. |

### JWT-audience errors

None encountered.

### Files written

- `audits/LIB-MGMT/history.md` (this section appended)
- `audits/LIB-MGMT/state.yaml` (rewritten in schema v2)

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELLED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
