# BOARD-MGMT Phase 0 — Vendor Surface

Domain: Board Management / Governance (board portal & governance software). Backs the Corporate Legal agents (Board Consent Drafter). Research only; no inserts.

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| Diligent Boards | diligent.com/products/boards | Enterprise/public-co board portal, minutes, voting, D&O questionnaires, skills/nomination | Category leader. Note: catalog holds only Diligent's GRC/audit face; the board product is unmodeled |
| Nasdaq Boardvantage | nasdaq.com/solutions/governance/boardvantage | Board books, approvals/signatures, surveys, D&O questionnaires, corporate secretary | Pure-play public-co board portal; DocuSign-native approvals/voting |
| OnBoard (Passageways) | onboardmeetings.com | Agenda/minutes builder, voting, approvals, D&O questionnaires, skills tracking | Pure-play; strong on decision-tracking and skills matrix |
| BoardEffect (Diligent) | boardeffect.com | Nonprofit/volunteer boards, workrooms, committees, annual governance cycle | Nonprofit-vertical leader; adds governance-calendar and committee substrate |
| Boardable | boardable.com | SMB/nonprofit board meetings, minutes, polls, agenda | Pure-play SMB; confirms Core vs Specialist split |

## Surface matrix

Vendors: D=Diligent Boards, B=Boardvantage, O=OnBoard, E=BoardEffect, A=Boardable.

| Entity | Category | D | B | O | E | A | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| board_meetings | Master | x | x | x | x | x | Core | meeting_management |
| board_committees | Master | x | x | x | x | x | Core | director_committee_records |
| board_books | Master | x | x | x | x | x | Core | meeting_management |
| meeting_agendas | Master | x | x | x | x | x | Core | meeting_management |
| agenda_items | Junction | x | x | x | x | x | Core | meeting_management |
| meeting_minutes | Master | x | x | x | x | x | Core | minutes_resolutions |
| board_resolutions | Master | x | x | x | x | x | Core | minutes_resolutions |
| written_consents | Master | x | x | x | x |  | Core | voting_consents |
| board_votes | Master | x | x | x | x | x | Core | voting_consents |
| vote_ballots | Junction | x | x | x | x | x | Core | voting_consents |
| approval_requests | Master | x | x | x | x |  | Core | voting_consents |
| director_profiles | Master | x | x | x | x | x | Core | director_committee_records |
| committee_memberships | Junction | x | x | x | x | x | Core | director_committee_records |
| board_documents | Master | x | x | x | x | x | Core | meeting_management |
| document_annotations | Engagement | x | x | x | x |  | Core | meeting_management |
| meeting_attendances | Junction | x | x | x | x | x | Core | meeting_management |
| meeting_rsvps | Junction | x | x | x | x | x | Core | meeting_management |
| action_items | Junction | x | x | x | x | x | Core | meeting_management |
| director_questionnaires | Audit | x | x | x | x |  | Core | governance_compliance |
| questionnaire_responses | Audit | x | x | x | x |  | Core | governance_compliance |
| board_surveys | Engagement | x | x | x | x | x | Core | governance_compliance |
| survey_responses | Junction | x | x | x | x | x | Core | governance_compliance |
| board_assessments | Audit | x | x | x | x |  | Core | governance_compliance |
| skills_matrices | Config | x |  | x |  |  | Common | director_committee_records |
| director_skills | Junction | x |  | x |  |  | Common | director_committee_records |
| secure_messages | Engagement | x | x | x | x |  | Core | meeting_management |
| meeting_notes | Engagement | x | x | x | x | x | Core | meeting_management |
| esignature_records | Audit | x | x | x | x |  | Core | voting_consents |
| governance_calendars | Config | x | x | x | x | x | Core | director_committee_records |
| governance_events | Junction | x | x | x | x | x | Core | director_committee_records |
| board_workrooms | Master |  |  |  | x |  | Specialist | director_committee_records |
| board_terms | Master | x |  | x | x |  | Common | director_committee_records |
| board_roles | Config | x | x | x | x | x | Core | director_committee_records |
| meeting_templates | Config | x | x | x | x | x | Core | configuration_templates |
| minutes_templates | Config | x | x | x | x |  | Core | configuration_templates |
| questionnaire_templates | Config | x | x | x | x |  | Core | configuration_templates |
| resolution_templates | Config | x | x | x |  |  | Common | configuration_templates |
| notification_rules | Config | x | x | x | x | x | Core | configuration_templates |
| access_audit_logs | Audit | x | x | x | x | x | Core | governance_compliance |
| corporate_entities | Master | x |  |  |  |  | Specialist | (ELM boundary — see note) |

## Compliance / governance entities (non-optional)

These load regardless of vendor presence: board-governance audit trails and consent/voting records are the evidentiary backbone of the domain (SOX 404 board-oversight evidence, corporate-law consent validity, litigation defensibility). Vendors often bury these internals.

| Entity | Regulation / driver | Proposed module |
| --- | --- | --- |
| written_consents | Corporate law (unanimous written consent in lieu of meeting; DGCL §141(f) / §228 analogs) | voting_consents |
| board_votes / vote_ballots | Corporate law — recorded board action validity | voting_consents |
| esignature_records | ESIGN / UETA — signature validity on consents, minutes, resolutions | voting_consents |
| meeting_minutes | Corporate recordkeeping — official record of board action | minutes_resolutions |
| board_resolutions | Corporate recordkeeping — formal adopted resolutions | minutes_resolutions |
| director_questionnaires / questionnaire_responses | D&O questionnaires; SEC independence & related-party disclosure (public co.) | governance_compliance |
| board_assessments | NYSE/Nasdaq listing — annual board & committee self-evaluation | governance_compliance |
| access_audit_logs | SOX / board-material confidentiality — who accessed what, when | governance_compliance |
| sox_board_audit_trails | SOX 404 — board & audit-committee oversight evidence | governance_compliance |
| conflict_of_interest_disclosures | Governance / IRS Form 990 (nonprofit) & related-party rules | governance_compliance |

(`sox_board_audit_trails` and `conflict_of_interest_disclosures` are compliance-driven additions not surfaced verbatim in public vendor docs.)

## Modularization hypothesis (Rule #14)

Five modules, each with ≥1 master; the domain clearly exceeds 3 capabilities so ≥2 modules is satisfied comfortably.

1. **meeting_management** — the meeting lifecycle substrate: `board_meetings`, `board_books`, `meeting_agendas`/`agenda_items`, `board_documents`, `document_annotations`, `meeting_attendances`/`meeting_rsvps`, `action_items`, `meeting_notes`, `secure_messages`. Master: `board_meetings`. This is the headline noun and the highest-volume surface.

2. **minutes_resolutions** — the official record of action: `meeting_minutes`, `board_resolutions`. Structurally heavyweight (approval states, sign-off, versioning) and the direct target of the Board Consent Drafter agent, so it earns its own module rather than folding into meetings. Masters: `meeting_minutes`, `board_resolutions`.

3. **voting_consents** — decisions taken by ballot or written consent: `board_votes`, `vote_ballots`, `written_consents`, `approval_requests`, `esignature_records`. Master: `board_votes`. Split from minutes because a consent/vote is a distinct legal instrument with its own lifecycle (open → collect → close → execute).

4. **director_committee_records** — the "who governs" master data: `director_profiles`, `board_committees`, `committee_memberships`, `board_terms`, `board_roles`, `skills_matrices`/`director_skills`, `governance_calendars`/`governance_events`, `board_workrooms`. Masters: `director_profiles`, `board_committees`. The governance calendar rides here because it is keyed to committee/term cadence.

5. **governance_compliance** — the audit/attestation face: `director_questionnaires`/`questionnaire_responses`, `board_surveys`/`survey_responses`, `board_assessments`, `access_audit_logs`, `sox_board_audit_trails`, `conflict_of_interest_disclosures`. Master: `director_questionnaires`.

Plus a thin **configuration_templates** module (`meeting_templates`, `minutes_templates`, `questionnaire_templates`, `resolution_templates`, `notification_rules`) if the template surface proves heavy in Phase A; otherwise templates fold into their consuming modules. Flag for Phase A resolution.

Merge signal to watch: if `voting_consents` and `minutes_resolutions` entities keep cross-referencing each other in Phase A drafting, they may collapse into one "board actions" module.

## ELM boundary note (Legal Entity Management overlap)

Board management and Legal Entity Management (ELM: subsidiary registers, statutory filings, ownership/cap structure, registered agents, officer appointments across the group) genuinely overlap because both touch directors, officers, and corporate governance. Diligent even ships an Entities product alongside Boards. Proposed line:

- **Board Management owns the meeting/decision cadence of a governing body**: what a board or committee *does* — meets, deliberates, votes, consents, records minutes, evaluates itself. `director_profiles` here is the *person as a board participant* (attendance, skills, questionnaire respondent), not the *statutory officer appointment of record*.
- **ELM owns the legal-entity register and its statutory attributes**: the entity graph (`corporate_entities`, subsidiaries, jurisdictions), share/ownership structure, registered agents, statutory filings, and the *authoritative* appointment records of directors/officers to each entity.

`corporate_entities` therefore stays a **Specialist / out-of-scope** row for BOARD-MGMT (it belongs to ELM); board management *references* an entity but does not master it. Where the two meet — a board resolution that appoints an officer, or a written consent that amends bylaws — the **instrument** (`board_resolutions`, `written_consents`) is mastered by BOARD-MGMT and the **resulting statutory state change** is mastered by ELM. Recommend BOARD-MGMT carry a soft FK to an entity concept but not model the entity register. If ELM does not yet exist as a domain, `corporate_entities` + officer appointments are a clean new-domain candidate rather than scope creep into BOARD-MGMT.
