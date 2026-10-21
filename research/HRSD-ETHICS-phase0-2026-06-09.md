# HRSD vs ETHICS-INTAKE: Phase 0 Vendor-Surface Research

**Question:** Should whistleblower / ethics / employee-relations specialty case handling be modeled as (a) a `case_subtype` + anonymization flag + special routing on the existing HRSD `hr_cases` master, or (b) a standalone `ETHICS-INTAKE` domain with its own masters?

**Date:** 2026-06-09 | **Status:** read-only research artifact

---

## 1. Flagship pure-play vendors

| Vendor | What they sell |
|---|---|
| **NAVEX (EthicsPoint / NAVEX One)** | Market leader (13,000+ orgs). Whistleblowing hotline + incident/case management with automated routing, multilingual intake, analytics; tiered Essentials/Professional. |
| **OneTrust Ethics (Convercent)** | Acquired Convercent Apr 2021; Ethics Cloud = Helpline & Case Manager, Disclosures/Conflict-of-Interest, Policy/Learning. (Convercent helpline + case mgmt is now transitioning to EQS.) |
| **AllVoices** | AI-native employee-relations + anonymous reporting; whistleblower hotline, workplace-investigations workflow, multichannel (web/phone/Slack), Title IX / SB553 support. |
| **People Intouch (SpeakUp)** | Amsterdam pure-play (750+ orgs incl. Nestle, Daimler); fully anonymous two-way reporting, investigation workflow, full case lifecycle; no IP/metadata stored. |
| **EQS Integrity Line** | Secure anonymous hotline + central case management with staged workflows, secure anonymous mailbox, dashboards; EU-Directive/GDPR aligned. |
| **Whispli** | Anonymous two-way communication across web/app/hotline/email intake; structured investigation workflows; ISO 37002 aligned. |
| **Vault Platform** | Mobile speak-up + Open Reporting (incl. "GoTogether" safety-in-numbers) feeding a Resolution Hub investigator case-management workbench. |

**Point-solution-market test: PASS, emphatically.** Seven-plus independent vendors compete here with *flagship* products, several pure-plays (SpeakUp, EQS, Whispli, Vault) for which this *is* the whole company. This is a mature, separately-procured market with its own Gartner "Whistleblowing Software" category, not a feature bolted onto HRIS suites.

## 2. Recurring first-class entities

Across all vendors the same shapes recur: **anonymous reports/disclosures**; **intake cases** (distinct from the raw report); **investigations** (plans, tasks, deadlines); **case parties** (reporter / subject / witness, frequently anonymized); **intake channels** (web form, phone hotline, mobile app, email, Slack); **evidence/attachments**; **regulatory disclosures**; and **anonymous follow-up communications** (the secure two-way "mailbox" that lets a case manager converse with an unidentified reporter).

## 3. Vendor-by-entity surface matrix

Legend: **Core** = headline differentiator · **Common** = standard · **Specialist** = present in some · **Compliance** = driven by regulation · **absent**

| Entity | NAVEX | OneTrust | AllVoices | SpeakUp | EQS | Whispli | Vault |
|---|---|---|---|---|---|---|---|
| Anonymous report / disclosure | Core | Core | Core | Core | Core | Core | Core |
| Intake case (vs report) | Core | Core | Core | Common | Core | Common | Core |
| Investigation entity | Common | Common | Core | Common | Common | Core | Core |
| Case parties (anonymized) | Common | Common | Common | Core | Core | Common | Common |
| Intake channel (hotline/web/app) | Core | Core | Core | Common | Core | Core | Core |
| Evidence / attachments | Common | Common | Common | Common | Common | Common | Common |
| Anonymous follow-up comms | Core | Common | Common | Core | Core | Core | Common |
| Regulatory disclosure | Compliance | Compliance | Compliance | Compliance | Compliance | Compliance | Specialist |

Every vendor treats anonymous report, intake channel, and anonymous follow-up as **Core/Common**. None of these exist on a generic `hr_cases` table.

## 4. Regulatory anchors and the entities they force

- **EU Whistleblower Protection Directive 2019/1937** (orgs 50+ staff): mandated secure reporting **channels**, optional **anonymous** reports, 7-day acknowledgement + 3-month feedback (forces a **follow-up-comms** clock), strict confidentiality of reporter identity, documented **retention** per GDPR. -> drives `intake_channels`, `anonymized_reporters`, timeline/SLA fields, audit retention.
- **SOX s.301**: audit committee (not management, not HR) must own procedures for **confidential, anonymous** employee submissions on accounting/audit matters; ~7-yr tamper-proof retention; records not editable by the subject of a complaint. -> forces separation from HR/management and an immutable case record.
- **SOX s.806 / Dodd-Frank**: anti-retaliation + SEC bounty/external-reporting path. -> drives `regulatory_disclosures` and reporter-protection tracking.
- **GDPR**: anonymity must be genuine (no IP/metadata), minimization, lawful retention. -> constrains the **reporter** model and storage.
- **Sector rules** (Sapin II, LkSG, DORA/NIS2, FCA, Title IX/SB553): reinforce dedicated channels + audit trails.

These create concrete entity requirements (`anonymized_reporters`, `intake_channels`, `regulatory_disclosures`, retention/immutability) that have **no home** on `hr_cases`.

## 5. Boundary verdict

**(a) Point-solution-market test:** PASS. A dense field of independent, separately-procured flagship products, with multiple pure-plays. That alone is strong evidence of a distinct domain, not a subtype.

**(b) Workflow materiality:** The shape is materially different from generic HR case handling. Generic `hr_cases` assumes a *known* employee, HR ownership, and an HR-visible record. Ethics intake inverts all three: the reporter may be **permanently anonymous** (two-way mailbox, no identity, no IP), the case must be **walled off from HR and line management** (SOX 301 routes to the audit committee; the subject can be a senior HR leader), it carries **chain-of-custody / immutable evidence**, statutory **acknowledgement and feedback clocks**, and an outbound **regulatory-disclosure** path. A `case_subtype` flag cannot express anonymized parties, a separate confidential routing/permission boundary, or regulatory-disclosure entities; it would smuggle a second data model and a hostile access-control regime into the HR case table.

## 6. Recommendation

**Model a distinct `ETHICS-INTAKE` domain (option b).** The strongest single reason: the **confidentiality/access boundary is the opposite of HRSD's**, ethics intake must be invisible to HR and management because they are frequently the *subjects* (SOX 301 mandates audit-committee, not HR, ownership), whereas `hr_cases` is HR-owned by definition. That alone makes a shared master with a discriminator flag a compliance liability, not a convenience. Layered on top: a proven independent point-solution market, statutorily-required entities absent from `hr_cases` (`anonymized_reporters`, `intake_channels`, `regulatory_disclosures`, immutable evidence), and a genuinely different anonymity-first workflow. Keep generic grievances/ER on `hr_cases`; give whistleblower/ethics its own domain with its own masters, related to HRSD but not subordinate to it.
