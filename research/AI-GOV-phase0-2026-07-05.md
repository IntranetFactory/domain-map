# AI-GOV Phase 0 — Vendor Surface (AI Governance & Model Risk Management)

Research-only. NO inserts. Backs the AI Governance Legal agents (AI Use Case Triager, AI Impact Assessor, Vendor AI Reviewer, AI Reg Gap Checker).

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| Credo AI | credo.ai | Use-case registry, impact assessment, policy packs, reporting | Pure-play leader; canonical register-assess-govern-monitor-report loop |
| Holistic AI | holisticai.com | Inventory + risk scoring mapped to EU AI Act / NIST / ISO 42001, bias audits | Pure-play; strong regulatory-mapping + fairness testing surface |
| Saidot | saidot.ai | Knowledge-graph governance, policy/regulatory intelligence, third-party model library | Pure-play; strongest policy-library + reg-intelligence + vendor-model surface |
| Monitaur | monitaur.ai | Policy-to-proof: policies, controls, evidence mapping, model documentation | Pure-play; strongest control/evidence-mapping surface |
| IBM watsonx.governance | ibm.com/products/watsonx-governance | Use cases, factsheets/model inventory, governance graph, lifecycle risk | The 1 suite vendor; reveals what a large platform treats as mainline |

Adjacency note (NOT flagship, NOT conflated): **Fiddler, Arthur, Arize** are ML-observability / model-monitoring (drift, performance, live fairness metrics) = the adjacent MLOps market, sits under the existing **Data and AI Platform** technical domain, not AI-GOV. **Fairly AI** and **OneTrust AI Governance / TrustArc** are governance-adjacent (OneTrust already in catalog under Privacy/GRC; its AI module extends assessments). Governance tools here master the *registry / assessment / policy / evidence* surface, not the live telemetry.

## Surface matrix

Columns: CR=Credo AI, HO=Holistic AI, SA=Saidot, MO=Monitaur, IBM=watsonx.governance.

| Entity | Category | CR | HO | SA | MO | IBM | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | --- | --- |
| ai_use_cases | Master | x | x | x | x | x | Core | inventory_intake |
| ai_systems | Master | x | x | x | x | x | Core | inventory_intake |
| ai_models | Master | x | x | x | x | x | Core | inventory_intake |
| ai_system_registrations | Master | x | x | x |  | x | Core | inventory_intake |
| shadow_ai_findings | Master | x | x |  |  |  | Common | inventory_intake |
| ai_impact_assessments | Master | x | x | x | x | x | Core | impact_risk_assessment |
| model_risk_records | Master | x | x | x | x | x | Core | impact_risk_assessment |
| risk_scenarios | Master | x | x | x | x |  | Core | impact_risk_assessment |
| bias_test_records | Audit | x | x |  | x | x | Core | impact_risk_assessment |
| model_evaluations | Audit | x | x | x | x | x | Core | impact_risk_assessment |
| model_cards | Config/Doc | x |  | x | x | x | Core | impact_risk_assessment |
| risk_classifications | Junction | x | x | x |  | x | Core | impact_risk_assessment |
| ai_policies | Master | x | x | x | x | x | Core | policy_control_mapping |
| controls | Master | x | x | x | x | x | Core | policy_control_mapping |
| control_mappings | Junction | x | x | x | x | x | Core | policy_control_mapping |
| regulatory_frameworks | Config | x | x | x | x | x | Core | policy_control_mapping |
| framework_requirements | Config | x | x | x |  | x | Core | policy_control_mapping |
| control_evidences | Audit | x | x | x | x | x | Core | policy_control_mapping |
| policy_packs | Config/Template | x | x | x | x |  | Core | policy_control_mapping |
| ai_vendor_reviews | Master | x | x | x |  | x | Core | vendor_ai_review |
| third_party_models | Master |  | x | x |  | x | Core | vendor_ai_review |
| vendor_ai_questionnaires | Config/Template | x | x | x |  |  | Core | vendor_ai_review |
| ai_governance_tasks | Junction | x | x | x | x | x | Core | inventory_intake |
| assessment_transitions | Junction | x | x | x | x | x | Core | impact_risk_assessment |
| governance_approvals | Junction | x | x | x | x | x | Core | impact_risk_assessment |
| ai_risk_treatments | Junction | x | x | x | x |  | Core | impact_risk_assessment |
| ai_incidents | Master | x | x | x | x | x | Core | impact_risk_assessment |
| stakeholder_reviews | Engagement | x | x | x | x | x | Core | inventory_intake |
| governance_comments | Engagement | x | x | x | x | x | Core | inventory_intake |
| governance_reports | Audit/Doc | x | x | x | x | x | Core | policy_control_mapping |
| assessment_templates | Config/Template | x | x | x | x | x | Core | impact_risk_assessment |
| control_libraries | Config/Template | x | x | x | x |  | Core | policy_control_mapping |
| ai_agent_risks | Master | x | x | x |  |  | Common | impact_risk_assessment |
| governance_graph_edges | Junction | x |  | x |  | x | Common | inventory_intake |

## Compliance entities (non-optional, regulation-driven)

Required regardless of vendor presence; several vendors hide these internals. Proposed new compliance table row for the protocol: **AI systems (EU / high-risk)**.

| Entity | Regulation | Proposed module |
| --- | --- | --- |
| conformity_assessments | EU AI Act Art. 43 (high-risk conformity) | policy_control_mapping |
| technical_documentation_records | EU AI Act Art. 11 / Annex IV | impact_risk_assessment |
| declarations_of_conformity | EU AI Act Art. 47 | policy_control_mapping |
| transparency_disclosures | EU AI Act Art. 50 (GenAI / deepfake / chatbot disclosure) | vendor_ai_review |
| ai_event_logs | EU AI Act Art. 12 (automatic record-keeping, 6-mo retention) | impact_risk_assessment |
| fundamental_rights_impact_assessments | EU AI Act Art. 27 (FRIA, deployers of high-risk) | impact_risk_assessment |
| nist_rmf_control_evidences | NIST AI RMF (Govern/Map/Measure/Manage) | policy_control_mapping |
| iso42001_control_evidences | ISO/IEC 42001 AIMS clauses/Annex A | policy_control_mapping |
| serious_incident_reports | EU AI Act Art. 73 (serious-incident reporting) | impact_risk_assessment |

(NIST/ISO evidence can also be modeled as typed `control_evidences` rows rather than separate tables; kept explicit here so Phase A makes a deliberate merge/split call.)

## Modularization hypothesis (Rule #14)

Four modules, each with >=1 master, matching the four backing agents:

1. **inventory_intake** — masters `ai_use_cases`, `ai_systems`, `ai_models`, `ai_system_registrations`, plus intake tasks, shadow-AI discovery, stakeholder reviews, and the governance-graph edges tying assets to policies/risks. Scopes the "what AI do we run and who owns it" register that every other module hangs off. (Backs AI Use Case Triager.)
2. **impact_risk_assessment** — masters `ai_impact_assessments`, `model_risk_records`, `risk_scenarios`, `ai_incidents`; carries bias/fairness testing, evaluations, model cards, assessment lifecycle transitions, approvals, risk treatments, and the EU AI Act technical-doc / FRIA / event-log / incident compliance rows. The analytical heart. (Backs AI Impact Assessor.)
3. **policy_control_mapping** — masters `ai_policies` and `controls`; carries `control_mappings`, `regulatory_frameworks`, `framework_requirements`, `control_evidences`, policy packs, control libraries, conformity assessments, declarations, and NIST/ISO evidence. Scopes framework-to-control crosswalk and gap analysis. (Backs AI Reg Gap Checker.)
4. **vendor_ai_review** — masters `ai_vendor_reviews` and `third_party_models`; carries AI-specific vendor questionnaires and transparency disclosures for procured/embedded models. Distinct from generic TPRM because it turns on model-specific risk (training-data provenance, drift, hallucination, explainability). (Backs Vendor AI Reviewer.)

## Established vs emerging verdict

**emerging_market.** Real, funded, named vendors exist (Credo AI, Holistic AI, Saidot, Monitaur) with a convergent register-assess-govern-map-report surface, and there is a 2026 Gartner peer-insights presence. But coverage is *partial and uneven*: no single flagship yet delivers primary-grade coverage of the full surface. Credo/Holistic lead inventory + assessment; Saidot leads policy/reg-intelligence + third-party-model library; Monitaur leads controls/evidence; IBM leads factsheets + lifecycle but blurs into MLOps monitoring. The regulatory substrate (EU AI Act Aug-2026 high-risk obligations, ISO 42001, NIST AI RMF) is the forcing function still maturing the category. Per Rule #2 this reads as **emerging_market**, not established (no single primary-coverage flagship spans registry + assessment + policy + vendor review).

## GRC boundary read

**AI-GOV is a distinct emerging market, not merely a GRC (id 15) extension — but a close, deliberately-bounded sibling.** The existing catalog already has GRC (15), Audit Management (16), Third-Party Risk Management (19), Privacy Management (20), and the technical **Data and AI Platform** domain. AI-GOV overlaps all of them yet is not subsumed:

- vs **GRC (15)**: GRC masters enterprise risks, policies, controls, and framework compliance generically. AI-GOV's masters are AI-specific (`ai_use_cases`, `model_risk_records`, `bias_test_records`) and its lifecycle is model/system-centric (register -> classify risk tier -> impact-assess -> conformity). The pure-play vendor market (Credo/Holistic/Saidot/Monitaur) exists *because* generic GRC does not carry these. Distinct market.
- vs **TPRM (19)**: `ai_vendor_reviews` is a specialization, not a duplicate — AI-specific model risk (training-data provenance, hallucination, explainability) that generic vendor questionnaires miss. Overlap flagged for Phase A: keep AI-vendor review here, cross-reference TPRM rather than fork it.
- vs **Data and AI Platform (technical ML)**: `ml_models` / live drift/performance monitoring (Fiddler, Arthur, Arize) belong to the MLOps platform domain. AI-GOV *references* models but masters the governance record (assessments, policy mappings, evidence), not the runtime telemetry. Hard boundary: governance = registry/assessment/policy/evidence; MLOps = live model observability.

**Read:** load as a **new distinct domain** (AI Governance & Model Risk Management), not a GRC module, with explicit cross-references to GRC (control/framework master data), TPRM (vendor master data), Privacy (DPIA adjacency), and Data and AI Platform (model master data). Consider consuming shared `regulatory_frameworks` / `controls` / `vendors` master data rather than re-mastering, to avoid GRC duplication.
