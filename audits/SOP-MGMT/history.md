# SOP-MGMT — Process Documentation and SOP Management (audit history)

## 2026-06-15 — Scoping + Phase 0 (candidate, unbuilt)

SOP-MGMT is not in the live catalog. This pass scoped it as a domain candidate and ran Phase 0 vendor-surface research. No catalog rows were written.

**Classification.** SOP-MGMT passes the point-solution-market test: six pure-play flagships sell a product built around the SOP authoring + publish + acknowledge surface (SweetProcess, Trainual, Process Street, Scribe/ScribeHow, Whale, Dozuki). The defining surface, assign a published procedure to an audience and capture proof they read it, is absent from generic knowledge management. Buyer is the operations lead / SMB founder / franchise / frontline ops lead, not the knowledge manager or the enterprise architect.

**Backlog.** Registered in `audits/_missing-domains.md` (## Pending review, "SOP-MGMT — Process Documentation and SOP Management") via `append_missing_domain.ts`.

**Phase 0.** Report at `.tmp_deploy/SOP-MGMT-phase0-2026-06-15.md`. Six flagship vendors surveyed. Surface: 15 Core entities (13 headline operator-facing masters/substrate), 7 Common, 5 distinct Compliance. Naming collisions handled: `document_revisions` (not ECM's `document_versions`, id 430) and `procedure_steps` / `step_media_attachments` (the catalog name `work_instructions`, id 596, is taken by a manufacturing/MES entity). Modularization hypothesis: two core full modules (Procedure Authoring; Publish & Acknowledge) plus a conditional third (Controlled Document Control) gated on the EQMS-split decision.

**Boundary verdicts (Phase 0).** KMS (33, unbuilt stub): SOP-MGMT masters procedures/steps/checklists/acknowledgment and consumes generic `knowledge_articles`/search; stand up as its own domain, not a KMS module. ECM (91): consume `document_versions`; master a lighter `document_revisions`. GRC (15): GRC masters `policies`; SOP-MGMT masters `procedures` (the how-to that implements a policy) and references the policy. LMS (57) / ONBOARDING (99): lightweight read-and-confirm acknowledgment + comprehension quizzes bridge via `training_acknowledgment_links` rather than duplicating courses or new-hire journeys. BPA (136) / PROCESS-ORCHESTRATION (179): clean separation (formal models / runtime engine vs operator prose + checklists). FSQM (157): food-safety QMS vertical, no master overlap.

**EQMS coupling.** The controlled-document slice is coupled to the existing backlog candidate EQMS (`audits/_missing-domains.md`, capabilities include document control, CAPA, nonconformance, supplier quality, validation lifecycle). Phase 0 recommends keeping the controlled-document module in-scope of SOP-MGMT for now, with EQMS as the later migration seam; surfaced to the user as B2-SOP-EQMS-SPLIT.

**DAP note.** Scribe/Tango auto-capture straddles a Digital Adoption Platform (WalkMe/Whatfix/Pendo/Userpilot in-app overlay delivery). DAP relates to onboarding in two senses: it IS user/product onboarding (its core job), and it is a complementary in-app guidance layer over the "learn the tools" slice of employee ONBOARDING (id 99), not part of that domain. No DAP domain exists in the catalog. Surfaced as B2-SOP-DAP-SCOPE.

**Open decisions (q-SOP-MGMT.md).** Four `b2` calls: promote (gate), scope boundary (master-vs-consume + two core modules), controlled-document module in-scope vs defer to EQMS, and the DAP capture/in-app scope boundary.

Left `feedback_needed`; nothing written to the catalog.

## 2026-06-27 — a-file processed (2 of 4 gates resolved; still feedback_needed)

User answered `a-SOP-MGMT.md`. Two decisions, two clarifying questions.

**Resolved.**
- **B2-SOP-PROMOTE = promote-as-domain (a).** SOP-MGMT will be created as its own domain mastering the operator-facing procedure + assign/acknowledge surface. Gate cleared.
- **B2-SOP-EQMS-SPLIT = defer (b).** The regulated controlled-document slice (e-signature, change control, periodic-review attestations, Part-11/ISO audit trails) waits for a future EQMS domain. SOP-MGMT ships as **two core full modules** (Procedure Authoring; Publish & Acknowledge), no Controlled Document Control module. EQMS becomes the later migration seam.

**Still open (carried into refreshed q-file).**
- **B2-SOP-SCOPE.** User asked (a2): "isn't our solution for that question embedded master?" Answered: for the adjacent KMS/GRC/ECM records the correct role is `consumer + optional`, not `embedded_master`. SOP-MGMT masters its own distinct artifacts (procedures, process_documents, document_revisions) and only cross-links to knowledge_articles / policies / document_versions when those domains are co-installed; it carries no local copy of them. `embedded_master` is the fix only for a `consumer + required` dependency on an un-embedded foreign master (an M9 violation), which this is not. Reframed q1 for confirmation.
- **B2-SOP-DAP-SCOPE.** User asked (a4): "verify are WalkMe and Whatfix really SOP". Verified via web research (Userpilot / Tango / Whatfix / Glitter 2026 comparisons): WalkMe and Whatfix are enterprise Digital Adoption Platforms (in-app overlay delivery + adoption analytics), not SOP tools. Supports option (a): SOP-MGMT keeps the published-document surface (Scribe/Tango capture output); in-app delivery is a separate future DAP domain. Reframed q2 for confirmation.

No catalog rows written. The Phase A+B load is gated on B2-SOP-SCOPE (it fixes the master/consume footprint); held until the refreshed q-file is answered.

## 2026-06-27 — second a-file processed (3 of 4 gates resolved; one confirm left)

User answered the refreshed q-file. One decision, one clarifying question.

**Resolved.**
- **B2-SOP-DAP-SCOPE = document-surface-only (a).** SOP-MGMT keeps the published-document surface (Scribe/Tango capture output); in-app overlay delivery (WalkMe, Whatfix, Pendo, Userpilot) is a separate future DAP domain. (WalkMe/Whatfix verified as DAP, not SOP, in the prior pass.)

**Still open (carried into refreshed q-file).**
- **B2-SOP-SCOPE.** User asked (a1): "when I just use SOP would I not need knowledge articles or GRC policies to make SOP viable?" Answered: no, standalone SOP-MGMT is fully viable without KMS knowledge_articles or GRC policies, the full author -> publish -> assign -> acknowledge -> review loop runs on records it masters itself (as SweetProcess / Process Street / Trainual / Whale / Dozuki ship). KMS/GRC/ECM records are enrichment links only when co-installed, hence consumer + optional (not embedded_master, not consumer + required). The only outside record needed standalone is the platform built-in `users`. This confirms option (a); kept open for an explicit go.

No catalog rows written. Only B2-SOP-SCOPE remains; on a "yes" the full Phase A+B+C+S load runs.
