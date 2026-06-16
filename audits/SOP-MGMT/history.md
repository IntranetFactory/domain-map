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
