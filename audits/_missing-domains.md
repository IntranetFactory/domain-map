# Candidate domains surfaced by audits but not yet in the catalog

Append-only queue. Each entry is a domain candidate a market-audit subagent
surfaced from flagship-vendor research that doesn't map to any existing
`domains.domain_code`. The audit run does NOT load the domain — it queues
the candidate here for human review and triage.

## How entries get added

Subagents (and humans) MUST use the helper, never hand-edit. The helper
de-dupes by `proposed_code`, bumps the mention counter, and appends the
surfacing run to the per-candidate history:

```bash
bun run scripts/analytics/append_missing_domain.ts \
  --code TALENT-INTEL-PLATFORM \
  --name "Talent Intelligence Platform" \
  --surfaced-by "ATS audit 2026-05-30" \
  --evidence "Eightfold AI, Phenom, Beamery" \
  --adjacency "ATS, TALENT-MGMT, SWP" \
  --capabilities "talent rediscovery, internal-mobility matching, skills-graph inference"
```

Re-running with the same `--code` bumps `mention_count`, appends the run to
`Surfaced by`, and updates `Most recently surfaced`. The rest of the entry
stays untouched (vendor evidence and adjacency only widen by hand at review
time, not by subsequent surfacers).

## How to read this file

The `mention_count` is the cross-domain impact signal. A candidate flagged
by 6+ audits has wide blast radius (multiple existing domains feel its
absence). Triage those first. A candidate flagged once might be noise
specific to one audit's perspective.

## Triage rules

When reviewing a candidate, apply the point-solution-market test
(SKILL.md rule #2). Decision options on each entry:

- **promote-as-domain** — passes the test; load via Phase A. Move the
  entry to the `## Promoted` section at the bottom of this file with the
  approved `domain_code` and the date.
- **fold-into-existing:<CODE>** — overlaps an existing domain enough that
  it's a capability/sub-domain there, not a new market. Record the target
  domain code; move to the `## Folded` section.
- **reject** — fails the test (sub-feature of a single vendor's platform,
  too narrow, marketing-tier rebrand of an existing market). Move to
  `## Rejected` with one-line rationale.

Entries in `## Pending review` are the live queue; the three sections at
the bottom are the resolved history.

---

## Pending review

### FEATURE-FLAGGING — Feature Flagging and Experimentation

- **Mention count:** 3
- **First surfaced:** 2026-05-30 (PROD-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (VSDP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PROD-MGMT audit 2026-05-30
  - 2026-05-30 DXP audit 2026-05-30
  - 2026-05-30 VSDP audit 2026-05-30
- **Vendor evidence:** LaunchDarkly, Statsig, Optimizely Web Experimentation, Flagsmith, Split.io, Eppo, GrowthBook, Amplitude Experiment, ConfigCat
- **Adjacency:** PROD-MGMT, DXP, VSDP, SPM
- **Candidate capabilities:** feature flag management, experimentation orchestration, A/B test cohort assignment, kill-switch operations, gradual rollout
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### WMS — Warehouse Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (INV-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (OMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 INV-MGMT audit 2026-05-30
  - 2026-05-30 OMS audit 2026-05-30
- **Vendor evidence:** Manhattan WMS, Blue Yonder WMS, Korber One Warehouse, Softeon WMS, HighJump, Logiwa
- **Adjacency:** INV-MGMT, OMS, SCP, FIN
- **Candidate capabilities:** picking, packing, slotting, wave planning, RF / scanner workflows, location-grain stock movement, bin management
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SCP — Supply Chain Planning

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (INV-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (INV-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 INV-MGMT audit 2026-05-30
- **Vendor evidence:** o9, Kinaxis, Anaplan SCP, Blue Yonder Demand, Logility, ToolsGroup
- **Adjacency:** INV-MGMT, SUPPLY-CHAIN, MFG, FIN
- **Candidate capabilities:** demand forecasting, S&OP, MRP-light, inventory optimization, supply planning
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CORP-CARD-PROGRAM — Corporate Card Program Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (SPEND-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (EXPENSE audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SPEND-MGMT audit 2026-05-30
  - 2026-05-30 EXPENSE audit 2026-05-30
- **Vendor evidence:** Marqeta, Stripe Issuing, Highnote, Lithic, Adyen Issuing
- **Adjacency:** SPEND-MGMT, FIN, AP-AUTO
- **Candidate capabilities:** card BIN sponsorship, KYB underwriting, card-program ledger, dispute and chargeback handling, statement generation, interchange revenue tracking
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### USAGE-METERING — Usage Metering and Rating Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SUB-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (SUB-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SUB-MGMT audit 2026-05-30
- **Vendor evidence:** Metronome, Orb, Lago, Amberflo, m3ter
- **Adjacency:** SUB-MGMT, FINOPS, APIM, CPQ
- **Candidate capabilities:** event ingestion at scale, real-time aggregation, rating engines, usage-based pricing models, hybrid (recurring + usage) billing primitives
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SALES-TAX — Sales Tax and Indirect Tax Compliance

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SUB-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (SUB-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SUB-MGMT audit 2026-05-30
- **Vendor evidence:** Avalara, Vertex, Sovos, TaxJar, Anrok, Stripe Tax
- **Adjacency:** SUB-MGMT, FIN, B2C-COMM, CPQ
- **Candidate capabilities:** real-time tax determination, nexus tracking, tax exemption certificates, jurisdictional filing, VAT/GST registration, marketplace facilitator compliance
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PAYMENT-PROCESSING — Payment Processing and Orchestration

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SUB-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (SUB-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SUB-MGMT audit 2026-05-30
- **Vendor evidence:** Stripe Payments, Adyen, Braintree, Worldpay, Spreedly, Primer
- **Adjacency:** SUB-MGMT, B2C-COMM, FIN, AP-AUTO
- **Candidate capabilities:** card vaulting and tokenization, payment method routing, 3DS authentication orchestration, dispute and chargeback management, alternative payment methods, smart routing
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PRICING-OPTIM — Pricing Optimization

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CPQ audit 2026-05-30)
- **Most recent:** 2026-05-30 (CPQ audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CPQ audit 2026-05-30
- **Vendor evidence:** Pricefx, PROS Pricing, Vendavo Pricing, Zilliant, Competera
- **Adjacency:** CPQ, FIN, PIM, REV-INTEL
- **Candidate capabilities:** AI price optimization, price waterfall analysis, deal scoring, segmentation pricing, list-price management, margin analytics
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### REV-REC — Revenue Recognition and Accounting (ASC 606/IFRS 15)

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SUB-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (SUB-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SUB-MGMT audit 2026-05-30
- **Vendor evidence:** Maxio SaaSOptics, Sage Intacct ARC, Leeyo (Zuora RevPro), RightRev, Trullion
- **Adjacency:** SUB-MGMT, FIN, CPQ, AUDIT
- **Candidate capabilities:** performance obligation modeling, transaction price allocation, contract modification accounting, standalone selling price (SSP) estimation, deferred revenue waterfall, RevRec audit trails
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### B2B-COMMERCE — B2B Commerce

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CPQ audit 2026-05-30)
- **Most recent:** 2026-05-30 (CPQ audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CPQ audit 2026-05-30
- **Vendor evidence:** Salesforce B2B Commerce Cloud, Adobe Commerce, BigCommerce B2B, OroCommerce, SAP Commerce Cloud
- **Adjacency:** CPQ, OMS, PIM, FIN, SUB-MGMT
- **Candidate capabilities:** buyer self-serve catalog, customer-specific pricing storefronts, punchout catalogs, self-serve quote-to-order, account hierarchies in storefront
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MLOPS — ML Operations

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (DATA-AI-PLAT audit 2026-05-30)
- **Most recent:** 2026-05-30 (AIOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DATA-AI-PLAT audit 2026-05-30
  - 2026-05-30 AIOPS audit 2026-05-30
- **Vendor evidence:** Weights and Biases, MLflow, Comet ML, Domino Data Lab, Neptune.ai, ClearML, Iguazio, DataRobot MLOps
- **Adjacency:** DATA-AI-PLAT, AIOPS, DCG, OBS
- **Candidate capabilities:** experiment tracking, model registry, model deployment pipelines, model monitoring, drift detection, model lineage
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### AI-GOV — AI Governance

- **Mention count:** 3
- **First surfaced:** 2026-05-30 (DATA-AI-PLAT audit 2026-05-30)
- **Most recent:** 2026-06-18 (SmartSuite products review 2026-06-18)
- **Surfaced by:**
  - 2026-05-30 DATA-AI-PLAT audit 2026-05-30
  - 2026-05-30 AIOPS audit 2026-05-30
  - 2026-06-18 SmartSuite products review 2026-06-18
- **Vendor evidence:** Credo AI, Holistic AI, Fairly AI, Monitaur, Saidot, IBM watsonx.governance, ServiceNow AI Control Tower
- **Adjacency:** DATA-AI-PLAT, GRC, DCG, AUDIT
- **Candidate capabilities:** AI inventory, model risk classification, bias evaluation, EU AI Act conformity, model cards, policy enforcement, AI incident tracking
- **Estimated Semantius score:** ~90% strict (est.): governance-register shape: AI inventory, model risk classification, model cards, policy and incident tracking are internal CRUD + approval gates; external drag = optional bias-eval compute + review notifications. Near-100% once native email lands.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### FEATURE-STORE — Feature Store

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DATA-AI-PLAT audit 2026-05-30)
- **Most recent:** 2026-05-30 (DATA-AI-PLAT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DATA-AI-PLAT audit 2026-05-30
- **Vendor evidence:** Tecton, Feast, Hopsworks, Featureform, Databricks Feature Store, Vertex AI Feature Store, SageMaker Feature Store
- **Adjacency:** DATA-AI-PLAT, MLOPS, METRICS-LAYER
- **Candidate capabilities:** online feature serving, offline training feature stores, feature pipelines, point-in-time correctness, feature monitoring
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### LLM-OPS — LLM Operations

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DATA-AI-PLAT audit 2026-05-30)
- **Most recent:** 2026-05-30 (DATA-AI-PLAT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DATA-AI-PLAT audit 2026-05-30
- **Vendor evidence:** LangSmith, Langfuse, Arize Phoenix, Helicone, Humanloop, PromptLayer, Weights and Biases Prompts, TruEra
- **Adjacency:** DATA-AI-PLAT, MLOPS, AI-GOV, OBS
- **Candidate capabilities:** prompt versioning, LLM tracing and evaluation, prompt regression testing, token cost monitoring, RAG retrieval evaluation
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CSPM — Cloud Security Posture Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (DSPM audit 2026-05-30)
- **Most recent:** 2026-06-17 (Qualys coverage review 2026-06-17)
- **Surfaced by:**
  - 2026-05-30 DSPM audit 2026-05-30
  - 2026-06-17 Qualys coverage review 2026-06-17
- **Vendor evidence:** Wiz, Palo Alto Prisma Cloud, Orca Security, Lacework, Check Point CloudGuard, Microsoft Defender for Cloud
- **Adjacency:** DSPM, CNAPP, CIEM, SECOPS, GRC
- **Candidate capabilities:** cloud misconfiguration detection, CIS benchmarks, multi-cloud control plane audit, compliance framework mapping, infrastructure drift detection
- **Estimated Semantius score:** ~45% strict (est.): cloud-config fetch and CIS-benchmark compute dominate; findings and remediation tracking are the CRUD slice
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CIEM — Cloud Infrastructure Entitlement Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DSPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (DSPM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DSPM audit 2026-05-30
- **Vendor evidence:** Sonrai Security, Saviynt CIEM, Ermetic (Tenable), Microsoft Entra Permissions Management, Britive, Authomize (Delinea)
- **Adjacency:** DSPM, IGA, CSPM, CNAPP, SECOPS
- **Candidate capabilities:** cloud permission rightsizing, identity blast-radius analysis, least-privilege enforcement for cloud IAM, dormant identity cleanup, just-in-time access for cloud roles
- **Estimated Semantius score:** ~55% strict (auto-est.): reads cloud IAM (external) + blast-radius analysis.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DDR — Data Detection and Response

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DSPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (DSPM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DSPM audit 2026-05-30
- **Vendor evidence:** Cyera DDR, Dig Security (Palo Alto Prisma), Sentra DDR, Symmetry Systems DataGuard, Varonis DatAlert
- **Adjacency:** DSPM, DLP, SECOPS, SIEM
- **Candidate capabilities:** real-time data-access anomaly detection, data exfil alerting, sensitive-data activity monitoring, automated containment of compromised data stores
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### AI-SPM — AI Security Posture Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DSPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (DSPM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DSPM audit 2026-05-30
- **Vendor evidence:** Wiz AI-SPM, Prisma AIRS (Palo Alto), Lasso Security, Protect AI, HiddenLayer, CalypsoAI
- **Adjacency:** DSPM, CSPM, AI-GOVERNANCE, SECOPS
- **Candidate capabilities:** LLM model inventory, training-data sensitivity discovery, prompt-injection detection, AI supply-chain risk, model-access audit
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### RDM — Reference Data Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (MDM audit 2026-05-30)
- **Most recent:** 2026-05-30 (MDM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 MDM audit 2026-05-30
- **Vendor evidence:** Semarchy xDM, TIBCO EBX, Stibo Reference Data, Collibra Reference Data, Informatica Reference Data Management
- **Adjacency:** MDM, DCG, FIN, DATA-AI-PLAT
- **Candidate capabilities:** code list management, hierarchy management, cross-reference mapping, jurisdictional code sets, controlled vocabularies, currency codes, country codes, GL accounts as reference data
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MEDIA-BUY-PLATFORM — Media Buying and Ad Operations Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (AGENCY-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (AGENCY-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 AGENCY-MGMT audit 2026-05-30
- **Vendor evidence:** Mediaocean Spectra/Prisma, Smartly.io, Basis Technologies, AdSwerve, Centro Basis
- **Adjacency:** AGENCY-MGMT, ADV-AD-TECH, FIN
- **Candidate capabilities:** media plan authoring, insertion order issuance, broadcast and digital placement, commission and markup billing, reconciliation against vendor invoices, post-buy reporting
- **Estimated Semantius score:** ~76% strict (auto-est.): mostly internal CRUD; external drag = non-email channel, payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TRADES-SVC — Trades and Home-Services Field Operations

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FSM audit 2026-05-30)
- **Most recent:** 2026-05-30 (FSM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FSM audit 2026-05-30
- **Vendor evidence:** ServiceTitan, Housecall Pro, Workiz, Jobber, FieldEdge, BigChange
- **Adjacency:** FSM, CRM, FIN
- **Candidate capabilities:** vertical home-services workflows, residential dispatch, consumer-grade invoicing, membership programs, on-site payment capture, lead generation tie-ins
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CREATIVE-PROOFING — Creative Proofing and Review

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (AGENCY-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (DAM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 AGENCY-MGMT audit 2026-05-30
  - 2026-05-30 DAM audit 2026-05-30
- **Vendor evidence:** Ziflow, Filestage, Approval Studio, GoVisually, ProofHub, Aproove
- **Adjacency:** AGENCY-MGMT, DAM, MRM
- **Candidate capabilities:** annotated review of creative deliverables, multi-round client approval workflow, version comparison, brand compliance check, approval routing
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = text generation.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### RECEIPT-CAPTURE-OCR — Receipt Capture and OCR

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (EXPENSE audit 2026-05-30)
- **Most recent:** 2026-05-30 (EXPENSE audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EXPENSE audit 2026-05-30
- **Vendor evidence:** Veryfi, Taggun, Rossum, Klippa, AWS Textract, Google Document AI
- **Adjacency:** EXPENSE, AP-AUTO, RPA-OCR
- **Candidate capabilities:** image OCR, receipt-line item extraction, merchant matching, currency detection, duplicate detection
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SMS-MARKETING — SMS Marketing Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (MA audit 2026-05-30)
- **Most recent:** 2026-05-30 (MA audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 MA audit 2026-05-30
- **Vendor evidence:** Attentive, Postscript, Klaviyo SMS, Sinch, Community
- **Adjacency:** MA, CDP, B2C-COMM
- **Candidate capabilities:** SMS subscriber acquisition, conversational SMS, MMS campaigns, two-way SMS, shortcode and toll-free messaging, TCPA consent management
- **Estimated Semantius score:** ~84% strict (auto-est.): mostly internal CRUD; external drag = non-email channel.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TRANSACT-EMAIL — Transactional Email Infrastructure

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (MA audit 2026-05-30)
- **Most recent:** 2026-05-30 (MA audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 MA audit 2026-05-30
- **Vendor evidence:** SendGrid, Postmark, Resend, Mailgun, AWS SES, Sparkpost
- **Adjacency:** MA, B2C-COMM, SUB-MGMT, CSM
- **Candidate capabilities:** transactional email send API, SMTP relay, deliverability monitoring, dedicated IP warmup, bounce and complaint handling, webhook event streaming
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TMS — Translation Management System

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (HCMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (FLEET-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 HCMS audit 2026-05-30
  - 2026-05-30 FLEET-MGMT audit 2026-05-30
- **Vendor evidence:** Smartling, Lokalise, Phrase, Crowdin, memoQ, Transifex
- **Adjacency:** HCMS, DXP, WEB-CONTOPS, B2C-COMM, LMS
- **Candidate capabilities:** translation memory, glossary management, machine translation orchestration, translator workbench, vendor and freelancer marketplace, in-context translation
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### BMS — Building Management System

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (IWMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (IWMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 IWMS audit 2026-05-30
- **Vendor evidence:** Honeywell Forge Building Operations, Siemens Desigo CC, Schneider EcoStruxure Building Operation, Johnson Controls OpenBlue, Spacewell IoT
- **Adjacency:** IWMS, REAL-EST, ESG, EAM
- **Candidate capabilities:** HVAC scheduling, BACnet/Modbus device integration, occupancy sensor integration, energy meter ingestion, fault detection and diagnostics, building automation control
- **Estimated Semantius score:** ~30% strict (auto-est.): external action is the product (device/IoT telemetry, external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DIGITAL-PERSONALIZATION — Digital Personalization

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (HCMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (DXP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 HCMS audit 2026-05-30
  - 2026-05-30 DXP audit 2026-05-30
- **Vendor evidence:** Ninetailed, Uniform, Optimizely Personalization, Dynamic Yield, Adobe Target, Mutiny
- **Adjacency:** HCMS, DXP, MA, B2C-COMM, CDP
- **Candidate capabilities:** audience and segment evaluation, content variant authoring, experimentation overlay, rule-based and AI personalization, edge-personalization
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EDR — Endpoint Detection and Response

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (RMM audit 2026-05-30)
- **Most recent:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RMM audit 2026-05-30
  - 2026-05-30 SECOPS audit 2026-05-30
- **Vendor evidence:** CrowdStrike Falcon, SentinelOne Singularity, Microsoft Defender for Endpoint, Sophos Intercept X, Bitdefender GravityZone
- **Adjacency:** RMM, UEM, ITAM, DLP, REMOTE-ACCESS
- **Candidate capabilities:** behavior-based threat detection, endpoint isolation, EDR telemetry collection, automated response playbooks, threat hunting
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### VULN-MGT — Vulnerability Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RMM audit 2026-05-30)
- **Most recent:** 2026-05-30 (RMM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RMM audit 2026-05-30
- **Vendor evidence:** Tenable Nessus, Qualys VMDR, Rapid7 InsightVM, CrowdStrike Falcon Spotlight, Microsoft Defender Vulnerability Management
- **Adjacency:** RMM, UEM, ITSM, GRC, SAM
- **Candidate capabilities:** vulnerability scanning, CVE prioritization, remediation tracking, compensating controls, exploit-prediction scoring
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MSP-BILLING — MSP Billing and Customer Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RMM audit 2026-05-30)
- **Most recent:** 2026-05-30 (RMM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RMM audit 2026-05-30
- **Vendor evidence:** ConnectWise Manage Billing, Kaseya BMS, Autotask PSA Billing, SuperOps Billing, HaloPSA
- **Adjacency:** RMM, MSP-PSA, SUB-MGMT, FIN
- **Candidate capabilities:** per-endpoint usage metering, multi-tenant customer billing, contract-anchored quoting, automated invoicing
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DATA-OBSERVABILITY — Data Observability

- **Mention count:** 4
- **First surfaced:** 2026-05-30 (DCG audit 2026-05-30)
- **Most recent:** 2026-05-30 (DQ audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DCG audit 2026-05-30
  - 2026-05-30 METRICS-LAYER audit 2026-05-30
  - 2026-05-30 DI audit 2026-05-30
  - 2026-05-30 DQ audit 2026-05-30
- **Vendor evidence:** Monte Carlo, Acceldata, Bigeye, Anomalo, Soda, Sifflet, Metaplane, Datafold
- **Adjacency:** DCG, DQ, DI, OBS
- **Candidate capabilities:** automated freshness monitoring, schema drift detection, volume anomaly detection, distribution drift detection, lineage-based impact analysis, incident triage and root-cause analysis
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DATA-CONTRACTS — Data Contracts Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (DCG audit 2026-05-30)
- **Most recent:** 2026-05-30 (DI audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DCG audit 2026-05-30
  - 2026-05-30 DI audit 2026-05-30
- **Vendor evidence:** Gable.ai, Datacontract.com, PayPal data-contract-cli, Confluent Schema Registry, Buf Schema Registry
- **Adjacency:** DCG, DI, DQ, DATA-AI-PLAT
- **Candidate capabilities:** contract authoring, schema versioning, contract enforcement at producer, breaking-change detection, consumer-impact notification
- **Estimated Semantius score:** ~88% strict (auto-est.): schema/contract CRUD; 'detection' is not ML.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MARKETPLACE-OPS — Marketplace Operations and Channel Listing Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (PIM audit 2026-05-30)
- **Most recent:** 2026-05-30 (PIM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PIM audit 2026-05-30
- **Vendor evidence:** ChannelEngine, Rithum (ChannelAdvisor), Mirakl Connect, Productsup, Feedonomics
- **Adjacency:** PIM, B2C-COMM, OMS, B2B-COMMERCE
- **Candidate capabilities:** marketplace seller account orchestration, per-marketplace listing optimization, inventory and order sync across marketplaces, rejected listing remediation queues, fee and commission reconciliation, marketplace performance analytics
- **Estimated Semantius score:** ~66% strict (auto-est.): external marketplace API sync/listing per channel.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MENTORSHIP — Mentorship Program Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (TALENT-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (TLNT-INTEL audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TALENT-MGMT audit 2026-05-30
  - 2026-05-30 TLNT-INTEL audit 2026-05-30
- **Vendor evidence:** MentorcliQ, Together, PushFar, Chronus, Qooper
- **Adjacency:** TALENT-MGMT, HCM, LMS, EMP-EXP, TLNT-INTEL
- **Candidate capabilities:** mentor-mentee matching, mentorship program orchestration, session tracking, mentorship outcome measurement, group mentoring
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PEER-RECOGNITION — Peer Recognition and Rewards Platform

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (TALENT-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (EMP-EXP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TALENT-MGMT audit 2026-05-30
  - 2026-05-30 EMP-EXP audit 2026-05-30
- **Vendor evidence:** Bonusly, Kudos, Nectar, Workhuman, Achievers, Awardco
- **Adjacency:** TALENT-MGMT, EMP-EXP, HCM, COMP-MGMT
- **Candidate capabilities:** peer-to-peer recognition, points-based rewards, reward catalog, social recognition feeds, milestone celebrations, recognition analytics
- **Estimated Semantius score:** ~76% strict (auto-est.): mostly internal CRUD; external drag = external data fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EQUITY-COMP-PLATFORM — Equity Compensation Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CAP-TABLE audit 2026-05-30)
- **Most recent:** 2026-05-30 (CAP-TABLE audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CAP-TABLE audit 2026-05-30
- **Vendor evidence:** Shareworks (Morgan Stanley at Work), J.P. Morgan Workplace Solutions, Carta Equity Plans, Pulley Equity Plans
- **Adjacency:** CAP-TABLE, COMP-MGMT, HCM
- **Candidate capabilities:** equity grant proposal, grant acceptance, vesting administration, exercise workflow, tax-surface reporting, ESPP enrollment
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### BMS-BAS — Building Management and Automation Systems

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (REAL-EST audit 2026-05-30)
- **Most recent:** 2026-05-30 (REAL-EST audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 REAL-EST audit 2026-05-30
- **Vendor evidence:** Siemens Desigo CC, Johnson Controls Metasys, Honeywell Niagara, Schneider EcoStruxure, ABB Ability Building Ecosystem
- **Adjacency:** REAL-EST, IWMS, ESG, OT
- **Candidate capabilities:** HVAC control, lighting automation, energy submetering, BACnet/Modbus integration, fault detection and diagnostics, occupancy-driven setpoint adjustment
- **Estimated Semantius score:** ~37% strict (auto-est.): external action is the product (device/IoT telemetry, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PRECISION-AG-AGRONOMY — Precision Agriculture Agronomy

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FMIS audit 2026-05-30)
- **Most recent:** 2026-05-30 (FMIS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FMIS audit 2026-05-30
- **Vendor evidence:** Climate FieldView Nitrogen Advisor, Granular Agronomy, AgWorld agronomy notes, Taranis, Sentera, FarmLogs
- **Adjacency:** FMIS, FOOD-TRACE, TELEMATICS
- **Candidate capabilities:** soil test results, soil zones, weather observations, agronomic recommendations, NDVI imagery, scouting reports, planting-window advisors, spray-window advisors, variety selection
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (external data fetch); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PAM — Privileged Access Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (IGA audit 2026-05-30)
- **Most recent:** 2026-05-30 (IGA audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 IGA audit 2026-05-30
- **Vendor evidence:** CyberArk Identity, Delinea, BeyondTrust, Saviynt PAM, Senhasegura
- **Adjacency:** IGA, ITSM, SECOPS, GRC
- **Candidate capabilities:** privileged session management, credential vaulting, just-in-time elevation, session recording, account rotation, break-glass governance
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PORTAL-FRAMEWORK — Enterprise Portal Framework

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DXP audit 2026-05-30)
- **Most recent:** 2026-05-30 (DXP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DXP audit 2026-05-30
- **Vendor evidence:** Liferay DXP, Salesforce Experience Cloud, Backbase Engagement Platform, OutSystems, Microsoft Power Pages, IBM HCL Digital Experience
- **Adjacency:** DXP, CRM, CSM, B2C-COMM, IDP
- **Candidate capabilities:** authenticated portal pages, portal user provisioning, role-based portal access, portal widgets and gadgets, partner / customer / employee portals, single sign-on integration
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CCM — Continuous Close Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (EPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (EPM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EPM audit 2026-05-30
- **Vendor evidence:** BlackLine, FloQast, Trintech Cadency, Numeric, Numeral
- **Adjacency:** FIN, EPM, AUDIT
- **Candidate capabilities:** balance sheet reconciliation, journal entry workflow, close task management, intercompany matching, flux analysis, certifications and attestations
- **Estimated Semantius score:** ~90% strict (auto-est.): close CRUD; 'intercompany matching' is data matching, not ML.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TRM — Treasury and Risk Management

- **Mention count:** 3
- **First surfaced:** 2026-05-30 (EPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (AP-AUTO audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EPM audit 2026-05-30
  - 2026-05-30 AP-AUTO audit 2026-05-30
- **Vendor evidence:** Kyriba, GTreasury, FIS Quantum, ION Treasury, Coupa Treasury
- **Adjacency:** FIN, EPM, SPEND-MGMT, AP-AUTO
- **Candidate capabilities:** cash positioning and forecasting, in-house banking, bank account management, payment factory, FX hedging, debt and investment management, intercompany netting
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TAX-PROVISION — Corporate Tax Provision and Compliance

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (EPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (EPM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EPM audit 2026-05-30
- **Vendor evidence:** Thomson Reuters ONESOURCE Tax Provision, Vertex Tax Provision, Wolters Kluwer CCH Tagetik, Longview Tax, Bloomberg Tax Provision
- **Adjacency:** FIN, EPM, AUDIT
- **Candidate capabilities:** ASC 740 income tax provision, deferred tax calculation, effective tax rate analysis, return to provision reconciliation, multi-jurisdictional tax disclosures, transfer pricing documentation
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### FIN-CONSOL — Financial Consolidation and Close

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (EPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (EPM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EPM audit 2026-05-30
- **Vendor evidence:** OneStream Financial Close, Oracle FCCS, SAP Group Reporting, Wolters Kluwer CCH Tagetik Consolidation, BlackLine Smart Close
- **Adjacency:** FIN, EPM, AUDIT, ESG
- **Candidate capabilities:** multi-entity consolidation, intercompany elimination, currency translation, minority interest accounting, regulatory consolidated reporting, IFRS and GAAP reporting, segment reporting
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### INFLUENCER-MGMT — Influencer Marketing Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (SMM audit 2026-05-30)
- **Most recent:** 2026-05-30 (SMM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SMM audit 2026-05-30
- **Vendor evidence:** CreatorIQ, Aspire, Grin, Klear (Meltwater), Upfluence, Mavrck, Traackr
- **Adjacency:** SMM, MA, CRM, AGENCY-MGMT
- **Candidate capabilities:** influencer discovery, creator outreach, campaign brief management, deliverables tracking, payment workflow, FTC disclosure compliance, content rights and licensing
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SOCIAL-LISTENING — Social Listening and Brand Intelligence

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (SMM audit 2026-05-30)
- **Most recent:** 2026-05-30 (SMM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SMM audit 2026-05-30
- **Vendor evidence:** Brandwatch, Talkwalker, Meltwater, NetBase Quid, Sprinklr Insights, Synthesio (Ipsos), Awario
- **Adjacency:** SMM, CDP, REV-INTEL, GRC
- **Candidate capabilities:** boolean query authoring across social, news and forums, sentiment classification at scale, share-of-voice tracking, crisis early-warning, image and video brand-logo detection, audience demographics inference
- **Estimated Semantius score:** ~36% strict (auto-est.): external action is the product (external data fetch, ML/AI compute, non-email channel); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### INTENT-DATA — B2B Buyer Intent Data Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SALES-ENG audit 2026-05-30)
- **Most recent:** 2026-05-30 (SALES-ENG audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SALES-ENG audit 2026-05-30
- **Vendor evidence:** Bombora, 6sense, G2 Buyer Intent, ZoomInfo Intent, Demandbase, Cognism
- **Adjacency:** SALES-ENG, MA, CDP, ACCT-PLAN, ABM
- **Candidate capabilities:** intent topic taxonomy, account-level intent scoring, surge signal detection, third-party intent aggregation, first-party intent capture, intent-to-account matching
- **Estimated Semantius score:** ~32% strict (auto-est.): third-party intent aggregation + scoring is the product.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MEETING-SCHEDULER — Meeting Scheduling Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SALES-ENG audit 2026-05-30)
- **Most recent:** 2026-05-30 (SALES-ENG audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SALES-ENG audit 2026-05-30
- **Vendor evidence:** Chili Piper, Calendly, Outreach Meetings, Salesloft Calendar, HubSpot Meetings, Cal.com
- **Adjacency:** SALES-ENG, CRM, MA, CSM
- **Candidate capabilities:** availability window publishing, round-robin routing, lead-to-rep matching, meeting confirmation and reminders, scheduling-link distribution, calendar federation
- **Estimated Semantius score:** ~80% strict (auto-est.): calendar federation (external) + light routing.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CASB — Cloud Access Security Broker

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DLP audit 2026-05-30)
- **Most recent:** 2026-05-30 (DLP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DLP audit 2026-05-30
- **Vendor evidence:** Netskope CASB, Zscaler ZIA, Microsoft Defender for Cloud Apps, Palo Alto Networks Prisma Access, Skyhigh Security, Lookout CASB, Forcepoint CASB
- **Adjacency:** DLP, DSPM, SECOPS, IGA, NETSEC
- **Candidate capabilities:** sanctioned and unsanctioned SaaS discovery, OAuth/API governance for SaaS, inline cloud traffic inspection, SaaS-level DLP, malware scanning for cloud uploads, shadow IT discovery, SaaS user activity monitoring
- **Estimated Semantius score:** ~42% strict (auto-est.): external action is the product (external infra/runtime); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SSE-SASE — Security Service Edge / Secure Access Service Edge

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DLP audit 2026-05-30)
- **Most recent:** 2026-05-30 (DLP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DLP audit 2026-05-30
- **Vendor evidence:** Zscaler SSE, Netskope SSE, Palo Alto Prisma Access, Cisco Umbrella, Cloudflare One, Microsoft Entra Internet Access, Forcepoint ONE
- **Adjacency:** DLP, CASB, SECOPS, ZTNA, NETSEC
- **Candidate capabilities:** secure web gateway, ZTNA enforcement, inline TLS inspection, edge DLP, FWaaS, SD-WAN integration, unified policy across web/SaaS/private apps
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CRQ — Cyber Risk Quantification

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (GRC audit 2026-05-30)
- **Most recent:** 2026-05-30 (GRC audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 GRC audit 2026-05-30
- **Vendor evidence:** Bitsight, SecurityScorecard, RiskLens, ThreatConnect, Kovrr, X-Analytics, Safe Security
- **Adjacency:** GRC, SECOPS, TPRM, OP-RES
- **Candidate capabilities:** quantitative risk scoring, FAIR-based loss modeling, vendor risk scoring, dollarized cyber risk, control-effectiveness scoring, exposure analytics
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CCWFM — Contact Center Workforce Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (WFM audit 2026-05-30)
- **Most recent:** 2026-05-30 (WFM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 WFM audit 2026-05-30
- **Vendor evidence:** Verint Workforce Management, NICE IEX WFM, Calabrio ONE, Genesys Cloud Workforce Management, Aspect Workforce Management, Playvox WFM
- **Adjacency:** WFM, CCAAS, PA
- **Candidate capabilities:** contact-center demand forecasting (Erlang-C), intraday adherence, agent shrinkage modeling, multi-channel scheduling, real-time adherence, WEM (workforce engagement management)
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EDISCOVERY — eDiscovery Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (LEGAL-PRACT-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (LEGAL-PRACT-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 LEGAL-PRACT-MGMT audit 2026-05-30
- **Vendor evidence:** Relativity, Everlaw, Logikcull, DISCO, Reveal, Nuix, Casepoint
- **Adjacency:** LEGAL-PRACT-MGMT, LSD, GRC, ECM
- **Candidate capabilities:** ESI collection, processing, review, predictive coding, production, hosted review, native review, redaction
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ETHICS-HOTLINE — Ethics, Compliance Hotline and Case Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (GRC audit 2026-05-30)
- **Most recent:** 2026-05-30 (GRC audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 GRC audit 2026-05-30
- **Vendor evidence:** NAVEX EthicsPoint, OneTrust Ethics, Convercent (OneTrust), Whispli, Speakfully, EQS Integrity Line, Syntrio, Lighthouse Services
- **Adjacency:** GRC, HRSD, AUDIT, LSD
- **Candidate capabilities:** anonymous reporting intake, case triage and investigation, retaliation protection workflow, regulatory hotline compliance (EU Whistleblower Directive, SOX 806), case-outcome analytics, hotline-to-investigation handoff
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### LEGAL-HOLD — Legal Hold and Preservation Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (LEGAL-PRACT-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (LEGAL-PRACT-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 LEGAL-PRACT-MGMT audit 2026-05-30
- **Vendor evidence:** Exterro Legal Hold, Onna, Zapproved, Logikcull Hold, Mitratech HoldsPro
- **Adjacency:** LEGAL-PRACT-MGMT, LSD, EDISCOVERY, ECM, HCM
- **Candidate capabilities:** custodian identification, hold notice issuance, custodian acknowledgement, in-place preservation, hold release, audit trail
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### POLICY-MGMT — Policy and Procedure Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (GRC audit 2026-05-30)
- **Most recent:** 2026-05-30 (GRC audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 GRC audit 2026-05-30
- **Vendor evidence:** NAVEX PolicyTech, OneTrust Policy Management, ConvergePoint Policy Management, MetricStream Policy Management, PowerDMS, Mitratech PolicyHub, MyComplianceOffice
- **Adjacency:** GRC, HRSD, LSD, LMS
- **Candidate capabilities:** policy authoring with version control, policy lifecycle workflow (draft, review, approve, publish, retire), policy mapping to regulations and controls, policy attestation campaigns, policy exception management, policy template libraries
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### LEGAL-RES — Legal Research Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (LEGAL-PRACT-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (LEGAL-PRACT-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 LEGAL-PRACT-MGMT audit 2026-05-30
- **Vendor evidence:** Westlaw, LexisNexis, Bloomberg Law, Fastcase, Casetext, Vincent AI, Harvey
- **Adjacency:** LEGAL-PRACT-MGMT, LSD, KMS
- **Candidate capabilities:** case law search, statute lookup, citator analysis, secondary-source mining, AI-assisted brief generation, jurisdictional filtering
- **Estimated Semantius score:** ~72% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute, text generation.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### REG-CHANGE-MGMT — Regulatory Change Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (GRC audit 2026-05-30)
- **Most recent:** 2026-05-30 (GRC audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 GRC audit 2026-05-30
- **Vendor evidence:** Thomson Reuters Regulatory Intelligence, Wolters Kluwer OneSumX, RegEd, Compliance.ai, Ascent RegTech, ComplyAdvantage, Reuters Compliance Learning
- **Adjacency:** GRC, LSD, AUDIT, BANK-OPS
- **Candidate capabilities:** regulatory feed ingestion, regulation-to-obligation mapping, change-alert subscription management, jurisdictional impact analysis, regulator-source curation, obligation library maintenance
- **Estimated Semantius score:** ~76% strict (auto-est.): mostly internal CRUD; external drag = external data fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### IP-MGMT — Intellectual Property Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (LEGAL-PRACT-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (LEGAL-PRACT-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 LEGAL-PRACT-MGMT audit 2026-05-30
- **Vendor evidence:** Anaqua, CPA Global Memotech, IPfolio, Clarivate Derwent, Patsnap, FoundationIP
- **Adjacency:** LEGAL-PRACT-MGMT, LSD, CLM, AUDIT
- **Candidate capabilities:** patent docketing, trademark portfolio management, IP renewals and annuities, prior-art search, IP licensing, infringement watch, IP valuation
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### UGC-MGMT — User-Generated Content Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SMM audit 2026-05-30)
- **Most recent:** 2026-05-30 (SMM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SMM audit 2026-05-30
- **Vendor evidence:** Stackla (Nosto), Yotpo Visual UGC, TINT, Bazaarvoice, Pixlee TurnTo, Curalate (Bazaarvoice)
- **Adjacency:** SMM, B2C-COMM, MA, CDP
- **Candidate capabilities:** UGC rights management, hashtag and mention collection, UGC moderation queue, UGC galleries for storefront and email embedding, creator outreach for re-use rights, attribution tracking
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### INTERNAL-COMMS — Internal Communications Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (EMP-EXP audit 2026-05-30)
- **Most recent:** 2026-05-30 (EMP-EXP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EMP-EXP audit 2026-05-30
- **Vendor evidence:** Firstup, Haiilo, Staffbase, Workshop, Poppulo, Microsoft Viva Engage, Workvivo
- **Adjacency:** EMP-EXP, INTRANET, HCM, COLLAB-GOV
- **Candidate capabilities:** targeted multi-channel employee messaging, comms campaign orchestration, leader-comms cadence, comms analytics, attestation tracking, frontline reach
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PCM — Profitability and Cost Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (EPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (EPM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EPM audit 2026-05-30
- **Vendor evidence:** Oracle PCMCS, SAP Profitability and Performance Management, OneStream PCM, Anaplan Profitability, IBM Cognos Cost Allocation
- **Adjacency:** EPM, FIN, FINOPS
- **Candidate capabilities:** activity-based costing, profitability allocation, cost driver modeling, customer and product profitability analysis, transfer pricing allocation, multi-step allocations
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DISCLOSURE-MGMT — Disclosure Management and Narrative Reporting

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (EPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (EPM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EPM audit 2026-05-30
- **Vendor evidence:** Workiva, CCH Tagetik Disclosure, Certent CDM, IRIS CARBON, Toppan Merrill DisclosureNet
- **Adjacency:** EPM, FIN, AUDIT, ESG
- **Candidate capabilities:** narrative report authoring, XBRL tagging, statutory filing preparation, ESEF iXBRL submission, board-pack assembly, controlled narrative versioning
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = text generation.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ITAD — IT Asset Disposition

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (HAM audit 2026-05-30)
- **Most recent:** 2026-05-30 (HAM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 HAM audit 2026-05-30
- **Vendor evidence:** Iron Mountain ITAD, Sims Lifecycle Services, Wisetek, ERI Direct, TES (an SK ecoplant company)
- **Adjacency:** HAM, ITAM, GRC, ESG
- **Candidate capabilities:** secure data sanitization, chain of custody, e-waste recycling logistics, certificate of destruction generation, fair-market resale, regulatory disposal reporting (RoHS, WEEE, R2v3, e-Stewards)
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EQMS — Enterprise Quality Management System

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (FSQM audit 2026-05-30)
- **Most recent:** 2026-05-30 (MFG-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FSQM audit 2026-05-30
  - 2026-05-30 MFG-OPS audit 2026-05-30
- **Vendor evidence:** MasterControl, ETQ Reliance, Sparta Systems TrackWise, Veeva QualityOne, AssurX, Honeywell QMS
- **Adjacency:** FSQM, MFG-OPS, FDA-VAL, GRC, AUDIT
- **Candidate capabilities:** document control, nonconformance and CAPA management, change control, training records, supplier quality management, complaint handling, audit management, validation lifecycle
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### VIDEO-TELEMATICS — Video Telematics and AI Dashcam

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (TELEMATICS audit 2026-05-30)
- **Most recent:** 2026-05-30 (TELEMATICS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TELEMATICS audit 2026-05-30
- **Vendor evidence:** Lytx DriveCam, Samsara AI Dash Cam, Motive AI Dashcam, Nauto, Netradyne Driveri
- **Adjacency:** TELEMATICS, FLEET-MGMT, INS-CLAIMS
- **Candidate capabilities:** in-cab AI risk detection, driver-facing distraction monitoring, collision-replay extraction, exoneration video retrieval, coaching clip routing
- **Estimated Semantius score:** ~30% strict (auto-est.): external action is the product (device/IoT telemetry, ML/AI compute, non-email channel); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ELD-COMPLIANCE — ELD and Hours-of-Service Compliance Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (TELEMATICS audit 2026-05-30)
- **Most recent:** 2026-05-30 (TELEMATICS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TELEMATICS audit 2026-05-30
- **Vendor evidence:** Omnitracs One, Motive Compliance, Geotab Drive, KeepTruckin, EROAD
- **Adjacency:** TELEMATICS, FLEET-MGMT, GRC, HCM
- **Candidate capabilities:** FMCSA-registered ELD certification, HOS log capture, DVIR workflow, IFTA jurisdiction allocation, RODS audit packet, driver-coaching for HOS violations
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ACADEMIC-COURSE-RESERVES — Academic Course Reserves

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (LIB-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (LIB-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 LIB-MGMT audit 2026-05-30
- **Vendor evidence:** Ex Libris Leganto, Atlas Systems Ares, Talis Aspire, Rialto, Bookshelf
- **Adjacency:** LIB-MGMT, LMS, HCMS
- **Candidate capabilities:** course reading list authoring, license cleared materials sourcing, fair-use checks, instructor reading list management, persistent linking to e-resources
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DIGITAL-LENDING — Digital Lending and E-Book Distribution

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (LIB-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (LIB-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 LIB-MGMT audit 2026-05-30
- **Vendor evidence:** OverDrive Libby, Hoopla, Axis 360, cloudLibrary, Boundless, BorrowBox
- **Adjacency:** LIB-MGMT, B2C-COMM, DRM
- **Candidate capabilities:** DRM-protected e-book and audiobook lending, simultaneous-use license enforcement, digital hold queues, patron authentication via library card, copyright limited concurrent lending
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SPACE-BOOKING — Space and Room Booking

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (LIB-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (LIB-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 LIB-MGMT audit 2026-05-30
- **Vendor evidence:** Springshare LibCal, Skedda, EMS Software, Robin, OfficeRnD, YArooms
- **Adjacency:** LIB-MGMT, IWMS, REAL-EST, EMP-EXP
- **Candidate capabilities:** study room reservations, meeting room booking, equipment reservations, recurring bookings, waitlists, occupancy capacity rules, conflict resolution
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### AG-TELEMATICS — Agricultural Machinery Telematics

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (TELEMATICS audit 2026-05-30)
- **Most recent:** 2026-05-30 (TELEMATICS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TELEMATICS audit 2026-05-30
- **Vendor evidence:** John Deere Operations Center, Trimble Ag, AGCO Fuse, Topcon Ag, CNH Industrial AFS Connect
- **Adjacency:** TELEMATICS, FMIS, FLEET-MGMT
- **Candidate capabilities:** ag-machinery telemetry, variable-rate prescription distribution, precision-agriculture data ingestion, isobus / can-bus farm-equipment data
- **Estimated Semantius score:** ~37% strict (auto-est.): external action is the product (device/IoT telemetry, external data fetch); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TAIL-SPEND-MGMT — Tail Spend Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (S2P audit 2026-05-30)
- **Most recent:** 2026-05-30 (S2P audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 S2P audit 2026-05-30
- **Vendor evidence:** Fairmarkit, Globality, ORO Labs, Una, Vroozi
- **Adjacency:** S2P, SPEND-MGMT, SUP-LIFE
- **Candidate capabilities:** tail spend automation, low-touch sourcing, supplier discovery for one-off purchases, AI-driven category routing, expense aggregation
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TRANSFER-AGENCY — Mutual Fund Transfer Agency

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Most recent:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FUND-ADMIN audit 2026-05-30
- **Vendor evidence:** SS&C Transfer Agency, FIS Investran TA, BNY Mellon TA, State Street TA
- **Adjacency:** FUND-ADMIN, BANK-OPS
- **Candidate capabilities:** shareholder recordkeeping, fund share issuance/redemption, dividend distributions, 1099/tax reporting
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EA — Enterprise Architecture

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (BPA audit 2026-05-30)
- **Most recent:** 2026-05-30 (BPA audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 BPA audit 2026-05-30
- **Vendor evidence:** LeanIX (SAP), Ardoq, Software AG Alfabet, MEGA HOPEX, BiZZdesign Horizzon, Avolution ABACUS, Sparx Enterprise Architect, Orbus iServer
- **Adjacency:** APM, BPA, BUSINESS-CAPABILITY-MAP, SPM, ITSM, CMDB
- **Candidate capabilities:** EA repository and metamodel, ArchiMate/TOGAF modeling, application landscape modeling and rationalization, business architecture / business capability modeling, capability heatmaps, technology standards governance, technology radar, architecture roadmapping and transformation planning, IT cost transparency
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** PASS. Dedicated software market (Gartner "Enterprise Architecture Tools" Magic Quadrant) with 7+ independent pure-play vendors whose flagship product IS an EA suite (LeanIX, Ardoq, Software AG Alfabet, MEGA HOPEX, BiZZdesign, Avolution ABACUS, Sparx EA). Clears the three-independent-vendor bar decisively.
- **Status:** pending-review (scoped 2026-06-15; Phase 0 at `.tmp_deploy/EA-phase0-2026-06-15.md`; promote q-file with 4 b2 calls at `audits/EA/q-EA.md` awaiting answers)
- **Decision:** _(recommended: promote-as-domain as the cross-layer umbrella, bounded so it consumes APM and BPA rather than re-mastering them. Final call plus the APM/BPA boundary await user sign-off; this is a market-shape b2.)_
- **Scoping note (2026-06-15):** Consolidated from two duplicate codes (`ENT-ARCH` + `EA`), both surfaced by the same 2026-05-30 BPA audit; mention_count held at 1 (one surfacing event, not two). **Classification:** EA is a genuine domain by the point-solution-market test, but it is an *umbrella* discipline that overlaps three things already in or near the catalog: APM (id 10, application layer), BPA (id 136, process layer), and the business-capability-mapping concept (referenced as BUSINESS-CAPABILITY-MAP). This is the umbrella-vs-sub-domain case (cf. ITAM over HAM/SAM/FinOps): EA and its sub-disciplines coexist via `parent_domain_id`. **Bounding to avoid re-absorbing existing markets:** EA should *master* only the cross-layer artifacts no neighbor owns (the architecture repository / metamodel, ArchiMate model artifacts, technology standards and reference models, technology-radar entries, architecture roadmaps / transformation initiatives, and, if not folded into business-capability-mapping, business capability models) and *consume* the application layer from APM and the process layer from BPA. **Cross-decision dependency:** APM q8 proposes an APM tech-layer module (products/services/platforms split plus a tech-risk surface). If EA is promoted to own the technology-standards layer, part of APM q8's scope belongs to EA instead, so decide EA's scope and APM q8 together, not separately.

### DEC-MGMT — Decision Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (BPA audit 2026-05-30)
- **Most recent:** 2026-05-30 (BPA audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 BPA audit 2026-05-30
- **Vendor evidence:** FICO Decision Modeler, Camunda DMN, Trisotech DMN Modeler, Sparkling Logic, IBM Operational Decision Manager
- **Adjacency:** BPA, IBPMS, GRC
- **Candidate capabilities:** DMN decision modeling, business rule authoring, decision table management, rule execution
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ER-INVESTIGATIONS — Employee Relations Case Investigations

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (HRSD audit 2026-05-30)
- **Most recent:** 2026-05-30 (HRSD audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 HRSD audit 2026-05-30
- **Vendor evidence:** HR Acuity, NAVEX EthicsPoint, AllVoices, Convercent (OneTrust), Speakfully, Vault Platform
- **Adjacency:** HRSD, GRC, LEGAL-PRACT-MGMT
- **Candidate capabilities:** intake of complaints (harassment, discrimination, retaliation), investigator workflow, anonymity and confidentiality controls, statutory whistleblower reporting, investigation interviews, evidence chain of custody, case outcome tracking
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### LABOR-MARKET-INTEL — Labor Market Intelligence

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SKILLS-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (SKILLS-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SKILLS-MGMT audit 2026-05-30
- **Vendor evidence:** Lightcast, SkyHive, Burning Glass Technologies, Emsi, Revelio Labs
- **Adjacency:** SKILLS-MGMT, SWP, TLNT-INTEL, COMP-MGMT
- **Candidate capabilities:** external skill demand inference, salary benchmarking from job postings, occupational taxonomy ingestion, talent-supply heatmap, regional skill availability scoring
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### AIFMD-DEPOSITARY — Fund Depositary Services

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Most recent:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FUND-ADMIN audit 2026-05-30
- **Vendor evidence:** BNY Mellon AIS, State Street AIS, Citco Depositary, IQ-EQ Depositary, Apex Group
- **Adjacency:** FUND-ADMIN, BANK-OPS
- **Candidate capabilities:** AIFMD-Article-21 oversight, asset safekeeping, cash-flow monitoring, ownership verification, AIFM monitoring
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PRIV-CREDIT-LOAN-ADMIN — Private Credit Loan Administration

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Most recent:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FUND-ADMIN audit 2026-05-30
- **Vendor evidence:** Allvue Loan Admin, SS&C Precision LM, Cloudmargin, Black Mountain BMS-WSO, Solvas
- **Adjacency:** FUND-ADMIN, FIN
- **Candidate capabilities:** loan-level cash management, agent notices, covenant tracking, syndicated-loan position keeping, secondary trade settlement
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MGMT-CO-ACCT — Management Company GP Accounting

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Most recent:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FUND-ADMIN audit 2026-05-30
- **Vendor evidence:** Carta GP Books, Allvue GP Admin, AlterDomus, SS&C GlobeOp
- **Adjacency:** FUND-ADMIN, FIN
- **Candidate capabilities:** GP entity books, management-fee tracking, carry allocation between partners, employee profit-sharing, GP cap-table
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### REG-FUND-RPT — Private Capital Regulatory Reporting

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Most recent:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FUND-ADMIN audit 2026-05-30
- **Vendor evidence:** Confluence Unity, Vermilion Reporting Suite, DiligentRegtek, ComplySci, AlterDomus, Pregin Pro Reporting
- **Adjacency:** FUND-ADMIN, GRC
- **Candidate capabilities:** Form PF preparation, AIFMD Annex IV, CRS/FATCA, ILPA reporting templates, regulator-specific filings
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### K1-TAX-DOCS — K-1 Partnership Tax Document Generation

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Most recent:** 2026-05-30 (FUND-ADMIN audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FUND-ADMIN audit 2026-05-30
- **Vendor evidence:** K-1 Navigator, PwC K-1 Plus, Deloitte iPartner, RSM K-1 Workflow, EisnerAmper K-1
- **Adjacency:** FUND-ADMIN, TAX-PROVISION
- **Candidate capabilities:** Schedule K-1 generation, K-3 international supplement, state K-1 schedules, LP tax-package portal delivery
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### RETURNS-MGMT — Returns Management and Reverse Logistics Orchestration

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (OMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (OMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 OMS audit 2026-05-30
- **Vendor evidence:** Loop Returns, Happy Returns, Narvar Return and Exchange, AfterShip Returns, ReturnGO, Returnly
- **Adjacency:** OMS, B2C-COMM, CSM, FIN
- **Candidate capabilities:** self-serve return portal, return reason capture, exchange-first incentives, return label generation, in-store and 3PL drop-off network, refund and exchange orchestration, instant credit, return fraud scoring
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CARRIER-MGMT — Multi-Carrier Shipping and Rate-Shop API

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (OMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (OMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 OMS audit 2026-05-30
- **Vendor evidence:** ShipStation, ShipEngine, EasyPost, Shippo, Sendcloud, Stamps.com, ProShip, Logistyx, ShipperHQ
- **Adjacency:** OMS, B2C-COMM, INV-MGMT, FIN
- **Candidate capabilities:** multi-carrier rate-shop, label printing, manifesting, tracking number normalization, address validation, customs documentation, parcel insurance, branded tracking pages, carrier contract abstraction
- **Estimated Semantius score:** ~64% strict (auto-est.): external multi-carrier rate/label/tracking APIs dominate.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### POST-PURCHASE — Post-Purchase Experience and Branded Order Tracking

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (OMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (OMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 OMS audit 2026-05-30
- **Vendor evidence:** AfterShip, Narvar Track, Route, parcelLab, Wonderment, Malomo, Shop App tracking
- **Adjacency:** OMS, B2C-COMM, CSM, CRM, MA
- **Candidate capabilities:** branded tracking pages, predictive delivery ETA, shipment exception alerts, customer notification orchestration, delivery experience surveys, package protection, post-purchase upsell, replacement-order triggers
- **Estimated Semantius score:** ~70% strict (auto-est.): carrier-tracking fetch + ETA prediction.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MAM — Mobile Application Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (UEM audit 2026-05-30)
- **Most recent:** 2026-05-30 (UEM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 UEM audit 2026-05-30
- **Vendor evidence:** Microsoft Intune App Protection, Hexnode MAM, Lookout MAM, Sophos Mobile, Ivanti Neurons for MDM
- **Adjacency:** UEM, MTD, DLP, IGA
- **Candidate capabilities:** app wrapping, app config policies, app-level data containers, conditional launch, selective wipe of corporate app data
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MTD — Mobile Threat Defense

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (UEM audit 2026-05-30)
- **Most recent:** 2026-05-30 (UEM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 UEM audit 2026-05-30
- **Vendor evidence:** Lookout, Zimperium, Pradeo, Check Point Harmony Mobile, Jamf Threat Defense (Wandera), SentinelOne Mobile
- **Adjacency:** UEM, EDR, SECOPS, DLP
- **Candidate capabilities:** on-device app vetting, network attack detection, OS exploit detection, phishing URL filtering, side-loaded-app detection, jailbreak/root detection
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DEX — Digital Employee Experience Monitoring

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (UEM audit 2026-05-30)
- **Most recent:** 2026-05-30 (UEM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 UEM audit 2026-05-30
- **Vendor evidence:** Nexthink, 1E Tachyon, Lakeside SysTrack, Riverbed Aternity, ControlUp Edge DX
- **Adjacency:** UEM, ITSM, OBS, EMP-EXP
- **Candidate capabilities:** endpoint telemetry collection, application performance score, user sentiment polls, proactive remediation playbooks, IT experience analytics
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PATCH-MGMT — Patch and Vulnerability Remediation Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (UEM audit 2026-05-30)
- **Most recent:** 2026-06-17 (Qualys coverage review 2026-06-17)
- **Surfaced by:**
  - 2026-05-30 UEM audit 2026-05-30
  - 2026-06-17 Qualys coverage review 2026-06-17
- **Vendor evidence:** Automox, Action1, NinjaOne Patching, Tanium Patch, BigFix, Ivanti Patch, Syxsense
- **Adjacency:** UEM, RMM, ITSM, VULN-MGT
- **Candidate capabilities:** OS patch catalog management, third-party app patching, patch ring rollouts, patch deviation reporting, mandated reboot orchestration
- **Estimated Semantius score:** ~50% strict (est.): patch-deploy side-effect and vuln-to-patch correlation compute; catalog, scheduling, and compliance-status are CRUD
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### BROWSER-MGMT — Enterprise Browser Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (UEM audit 2026-05-30)
- **Most recent:** 2026-05-30 (UEM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 UEM audit 2026-05-30
- **Vendor evidence:** Island Browser, Talon Cyber Security (Palo Alto), LayerX, Surf Security, Microsoft Edge for Business, Google Chrome Browser Cloud Management
- **Adjacency:** UEM, ZTNA, DLP, SECOPS
- **Candidate capabilities:** browser policy enforcement, last-mile DLP, isolation of unmanaged SaaS, extension allowlisting, browser-level conditional access
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CLOUD-ASSET-INVENTORY — Cloud Asset Inventory

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CMDB audit 2026-05-30)
- **Most recent:** 2026-05-30 (CMDB audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CMDB audit 2026-05-30
- **Vendor evidence:** JupiterOne, Steampipe, Faros AI, Wiz inventory, Orca inventory, AWS Config, Azure Resource Graph
- **Adjacency:** CMDB, CSPM, DSPM, FINOPS, ITAM
- **Candidate capabilities:** cloud-native CI inventory, identity-graph linking, multi-cloud resource normalization, real-time change feed
- **Estimated Semantius score:** ~76% strict (auto-est.): mostly internal CRUD; external drag = external data fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CONFIG-COMPLIANCE — Configuration Compliance

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CMDB audit 2026-05-30)
- **Most recent:** 2026-05-30 (CMDB audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CMDB audit 2026-05-30
- **Vendor evidence:** Tanium, Qualys CSAM, Red Hat Insights Compliance
- **Adjacency:** CMDB, GRC, CSPM, SECOPS
- **Candidate capabilities:** continuous configuration scoring, baseline-to-control mapping, compliance reporting against frameworks
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CMDB-FEDERATION — CMDB Federation and Data Fabric

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CMDB audit 2026-05-30)
- **Most recent:** 2026-05-30 (CMDB audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CMDB audit 2026-05-30
- **Vendor evidence:** ServiceNow CMDB IRE federations, BMC TrueSight Reconciliation, Cloudaware
- **Adjacency:** CMDB, MDM, ITAM
- **Candidate capabilities:** multi-CMDB reconciliation, identification rule arbitration, cross-tenant CI federation
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EV-CHARGING-MGMT — EV Charging Infrastructure Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FLEET-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (FLEET-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FLEET-MGMT audit 2026-05-30
- **Vendor evidence:** ChargePoint Fleet, Geotab EV Suite, Samsara EV Charging, Driivz, Sparkion, AMPECO
- **Adjacency:** FLEET-MGMT, TELEMATICS, ENERGY-MGMT
- **Candidate capabilities:** charger inventory, charge-session telemetry, depot energy planning, charging-cost allocation, V2G readiness
- **Estimated Semantius score:** ~37% strict (auto-est.): external action is the product (device/IoT telemetry, external data fetch); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### FREIGHT-AUDIT — Freight Audit and Payment

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FLEET-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (FLEET-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FLEET-MGMT audit 2026-05-30
- **Vendor evidence:** Cass Information Systems, U.S. Bank Freight Payment, A3 Freight Payment, Trax Technologies, Transporeon
- **Adjacency:** FLEET-MGMT, TMS, S2P, FIN
- **Candidate capabilities:** invoice receipt and matching, carrier rate validation, payment processing, GL coding by lane, dispute management
- **Estimated Semantius score:** ~68% strict (auto-est.): mostly internal CRUD; external drag = external data fetch, payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### STREAMING-PLATFORM — Streaming Data Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DI audit 2026-05-30)
- **Most recent:** 2026-05-30 (DI audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DI audit 2026-05-30
- **Vendor evidence:** Confluent Cloud, Redpanda, Amazon MSK, Aiven for Kafka, StreamNative, Upstash Kafka
- **Adjacency:** DI, DATA-AI-PLAT, IPAAS, OBS
- **Candidate capabilities:** managed Kafka brokers, topic and partition management, schema registry integration, stream processing runtimes, exactly-once semantics, multi-region replication
- **Estimated Semantius score:** ~40% strict (auto-est.): mostly internal CRUD; external drag = external infra/runtime.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ELM — Enterprise Legal Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (LSD audit 2026-05-30)
- **Most recent:** 2026-05-30 (LSD audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 LSD audit 2026-05-30
- **Vendor evidence:** Onit, SimpleLegal, Brightflag, Mitratech TeamConnect, BusyLamp, LawVu, Wolters Kluwer Passport
- **Adjacency:** LSD, LEGAL-PRACT-MGMT, CLM, SPEND-MGMT
- **Candidate capabilities:** matter intake routing, outside counsel guidelines, e-billing invoice review, LEDES invoice processing, matter budgeting, spend analytics, accruals, vendor scorecards, alternative-fee-arrangement tracking
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### STR-MGMT — Short-Term Rental Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RE-PROP-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (RE-PROP-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RE-PROP-MGMT audit 2026-05-30
- **Vendor evidence:** Guesty, Hostaway, Lodgify, Hospitable, Hostfully, OwnerRez
- **Adjacency:** RE-PROP-MGMT, HOSP-PMS, RE-INVEST
- **Candidate capabilities:** channel-manager syndication, dynamic pricing, guest messaging, cleaning-team scheduling, occupancy-tax remittance, OTA payout reconciliation
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PROVENANCE-PLATFORM — Multi-Industry Provenance and Blockchain Traceability Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FOOD-TRACE audit 2026-05-30)
- **Most recent:** 2026-05-30 (FOOD-TRACE audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FOOD-TRACE audit 2026-05-30
- **Vendor evidence:** Provenance Ltd, IBM Food Trust, Wholechain, Everledger, Circularise, TextileGenesis, ConsenSys Treum
- **Adjacency:** FOOD-TRACE, PLM, SUP-LIFE, ESG-PLAT
- **Candidate capabilities:** blockchain anchoring, cross-organization chain-of-custody, immutable provenance attestation, NFC and QR consumer storytelling, regulatory token bridging, sustainability claim verification
- **Estimated Semantius score:** ~48% strict (auto-est.): blockchain anchoring infra.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### FOOD-LCA — Food Lifecycle Carbon and Sustainability Accounting

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FOOD-TRACE audit 2026-05-30)
- **Most recent:** 2026-05-30 (FOOD-TRACE audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FOOD-TRACE audit 2026-05-30
- **Vendor evidence:** HowGood, CarbonCloud, Persefoni Food, Trace One Sustainability, Foodsteps, Vaayu Food
- **Adjacency:** FOOD-TRACE, ESG-PLAT, FSQM, FMIS
- **Candidate capabilities:** ingredient-level carbon footprint, farm-gate emissions modeling, Scope 3 supplier-data ingest, on-pack carbon label generation, regenerative-agriculture incentive tracking
- **Estimated Semantius score:** ~76% strict (auto-est.): mostly internal CRUD; external drag = external data fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PROMO-ENGINE — Promotion and Coupon Engine

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (LOYALTY audit 2026-05-30)
- **Most recent:** 2026-05-30 (LOYALTY audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 LOYALTY audit 2026-05-30
- **Vendor evidence:** Talon.One, Voucherify, Cheetah Digital Promotions, SessionM Promotions
- **Adjacency:** LOYALTY, B2C-COMM, MA, CDP
- **Candidate capabilities:** promo rule authoring, coupon code generation, cart-level discount evaluation, campaign budget control, fraud detection on coupon use
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### REFERRAL-MKT — Referral Marketing

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (LOYALTY audit 2026-05-30)
- **Most recent:** 2026-05-30 (LOYALTY audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 LOYALTY audit 2026-05-30
- **Vendor evidence:** Friendbuy, ReferralCandy, Yotpo Referrals, Mention Me, Talkable, Extole
- **Adjacency:** LOYALTY, MA, B2C-COMM, CDP
- **Candidate capabilities:** referral program design, advocate tracking, friend-invitee attribution, reward issuance, fraud protection on self-referrals
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PROD-CARBON-FOOTPRINT — Product Carbon Footprint Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (ESG audit 2026-05-30)
- **Most recent:** 2026-05-30 (ESG audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 ESG audit 2026-05-30
- **Vendor evidence:** Watershed, Sphera Product Sustainability, CarbonChain, Sweep, Makersite, Persefoni
- **Adjacency:** ESG, PLM, SCM, PROC
- **Candidate capabilities:** product-level LCA, supplier-data ingestion, product-footprint disclosures, customer-facing footprint queries, PEF/ISO 14067 calculation
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SUSTAIN-PROC — Sustainable Procurement Intelligence

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (ESG audit 2026-05-30)
- **Most recent:** 2026-05-30 (ESG audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 ESG audit 2026-05-30
- **Vendor evidence:** EcoVadis, IntegrityNext, Sphera Supply Chain, Achilles, Sedex
- **Adjacency:** ESG, PROC, SUP-LIFE, TPRM
- **Candidate capabilities:** supplier sustainability scoring, scope-3 supplier surveys, modern-slavery diligence, supplier sustainability ratings, supplier-risk assessments
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CLIMATE-RISK — Climate Risk Analytics

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (ESG audit 2026-05-30)
- **Most recent:** 2026-05-30 (ESG audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 ESG audit 2026-05-30
- **Vendor evidence:** Jupiter Intelligence, Cervest, Climate X, Risilience, S&P Climanomics
- **Adjacency:** ESG, GRC, BCM, INS-PROP
- **Candidate capabilities:** physical climate hazard modeling, transition risk scenario analysis, asset-level climate exposure, financial impact quantification, TCFD scenario disclosure
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### FORM-BUILDER — Form Builder and Online Forms

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (NCDB audit 2026-05-30)
- **Most recent:** 2026-05-30 (NCDB audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 NCDB audit 2026-05-30
- **Vendor evidence:** Typeform, Jotform, Google Forms, Microsoft Forms, Tally, Formstack, Wufoo, Cognito Forms
- **Adjacency:** NCDB, WORK-MGMT, B2C-COMM, DXP
- **Candidate capabilities:** form authoring, conditional logic, payment collection, file uploads, response routing, embedded forms, anti-spam
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SPREADSHEET-PLATFORM — Online Spreadsheet Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (NCDB audit 2026-05-30)
- **Most recent:** 2026-05-30 (NCDB audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 NCDB audit 2026-05-30
- **Vendor evidence:** Google Sheets, Microsoft Excel Online, Quip, Equals, Rows, Causal
- **Adjacency:** NCDB, BI, EPM, FP-A
- **Candidate capabilities:** cell-grid editing, real-time co-editing, formula engine, charting, pivot tables, named ranges, sheet-to-sheet refs
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CRE-VALUATION — Commercial Real Estate Valuation and Financial Modeling

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RE-CRE audit 2026-05-30)
- **Most recent:** 2026-05-30 (RE-CRE audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RE-CRE audit 2026-05-30
- **Vendor evidence:** Argus Enterprise, Dyna Connections, ARGUS Taliance, REIWise, Valcre
- **Adjacency:** RE-CRE, RE-INVEST, REAL-EST
- **Candidate capabilities:** discounted cash flow modeling, IRR/NPV analysis, lease cash-flow modeling, comparable-sales valuation, capitalization rate analysis, multi-scenario valuation, appraisal report generation
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TENANT-EXPERIENCE — Tenant Experience Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RE-CRE audit 2026-05-30)
- **Most recent:** 2026-05-30 (RE-CRE audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RE-CRE audit 2026-05-30
- **Vendor evidence:** HqO, Equiem, Rise Buildings, Lane, Bisly, Comfy, VTS Activate
- **Adjacency:** RE-CRE, REAL-EST, IWMS, EMP-EXP
- **Candidate capabilities:** tenant mobile app, building amenity booking, tenant communications, building event programming, work-order intake, badge and access integration, indoor wayfinding
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### LOG-MGMT — Log Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (OBS audit 2026-05-30)
- **Most recent:** 2026-05-30 (OBS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 OBS audit 2026-05-30
- **Vendor evidence:** Splunk Cloud Platform, Elastic Observability, Sumo Logic, Graylog, Logz.io, Loggly
- **Adjacency:** OBS, SIEM-rel, APM, DEM
- **Candidate capabilities:** log ingestion, log indexing, log search, log retention policies, log archiving, log redaction
- **Estimated Semantius score:** ~66% strict (auto-est.): log ingestion at scale (external fetch).
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### RUM — Real User Monitoring

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (OBS audit 2026-05-30)
- **Most recent:** 2026-05-30 (OBS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 OBS audit 2026-05-30
- **Vendor evidence:** Datadog RUM, Dynatrace Real User Monitoring, New Relic Browser, Splunk RUM, Akamai mPulse, SpeedCurve
- **Adjacency:** OBS, DEM, APM, WEB-CONTOPS
- **Candidate capabilities:** session replay capture, page-load performance, frontend error tracking, web vitals tracking, frustration index
- **Estimated Semantius score:** ~55% strict (auto-est.): frontend telemetry + session-replay ingestion.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PROP-TAX-MGMT — Property Tax Management and Appeals

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RE-INVEST audit 2026-05-30)
- **Most recent:** 2026-05-30 (RE-INVEST audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RE-INVEST audit 2026-05-30
- **Vendor evidence:** Ryan, Avalara Property Tax, Crowdreason, PTMS, Rethink Solutions, Tax Compliance Inc
- **Adjacency:** RE-INVEST, REAL-EST, RE-CRE, FIN
- **Candidate capabilities:** tax assessment intake, appeal case management, jurisdictional filing, tax bill payment workflow, tax obligation forecasting, parcel-level tracking
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CONSTR-DEV-ACCT — Construction Draw Management and Development Accounting

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RE-INVEST audit 2026-05-30)
- **Most recent:** 2026-05-30 (RE-INVEST audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RE-INVEST audit 2026-05-30
- **Vendor evidence:** Northspyre, Procore Financials, Yardi Construction, Rabbet, Built Technologies
- **Adjacency:** RE-INVEST, REAL-EST, RE-CRE, CONSTR-MGMT, FIN
- **Candidate capabilities:** construction budget tracking, draw request workflow, lien waiver collection, change order accounting, lender disbursement reconciliation, development pro-forma management
- **Estimated Semantius score:** ~90% strict (auto-est.): mostly internal CRUD; external drag = e-signature.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### INS-POLICY-ADMIN — Insurance Policy Administration

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (INS-CLAIMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (INS-CLAIMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 INS-CLAIMS audit 2026-05-30
- **Vendor evidence:** Guidewire PolicyCenter, Duck Creek Policy, Sapiens IDIT Policy, Insurity, EIS Group
- **Adjacency:** INS-CLAIMS, FIN, CSM
- **Candidate capabilities:** policy issuance, endorsement processing, policy renewal, premium calculation, policy lifecycle workflow, agent/broker channel, party and producer management
- **Estimated Semantius score:** ~84% strict (auto-est.): policy CRUD + premium; 'broker channel' is not infra.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### INT-DEV-PLAT — Internal Developer Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (APP-PAAS audit 2026-05-30)
- **Most recent:** 2026-05-30 (APP-PAAS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 APP-PAAS audit 2026-05-30
- **Vendor evidence:** Backstage, Port, OpsLevel, Cortex, Humanitec
- **Adjacency:** APP-PAAS, KUBE-PLAT, VSDP, ITSM
- **Candidate capabilities:** service catalog, software template scaffolding, golden paths, developer portal, scorecards
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### INS-UNDERWRITING — Insurance Underwriting

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (INS-CLAIMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (INS-CLAIMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 INS-CLAIMS audit 2026-05-30
- **Vendor evidence:** Guidewire Underwriting Management, Duck Creek Rating, Sapiens UnderwritingPro, Earnix, Akur8, Cytora, hyperexponential
- **Adjacency:** INS-CLAIMS, INS-POLICY-ADMIN
- **Candidate capabilities:** risk appetite rules, rating engines, quote and bind workflow, referral routing, exposure analysis, predictive risk scoring, broker submission triage
- **Estimated Semantius score:** ~72% strict (auto-est.): underwriting CRUD + risk scoring.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EDGE-RUNTIME — Edge Runtime and Functions

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (APP-PAAS audit 2026-05-30)
- **Most recent:** 2026-05-30 (APP-PAAS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 APP-PAAS audit 2026-05-30
- **Vendor evidence:** Cloudflare Workers, Fastly Compute, AWS Lambda@Edge, Deno Deploy, Vercel Edge Functions
- **Adjacency:** APP-PAAS, KUBE-PLAT, OBS
- **Candidate capabilities:** edge function deployment, geo-replicated execution, KV store at edge, request middleware, cold-start-free runtime
- **Estimated Semantius score:** ~40% strict (auto-est.): mostly internal CRUD; external drag = external infra/runtime.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### INS-BILLING — Insurance Billing and Premium Accounting

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (INS-CLAIMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (INS-CLAIMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 INS-CLAIMS audit 2026-05-30
- **Vendor evidence:** Guidewire BillingCenter, Duck Creek Billing, Sapiens BillingPro, Majesco Billing, Insurity Billing
- **Adjacency:** INS-POLICY-ADMIN, INS-CLAIMS, FIN
- **Candidate capabilities:** premium invoicing, installment plans, lockbox processing, agency commission accounting, NSF and reinstatement handling, premium-trust accounting, cash application
- **Estimated Semantius score:** ~82% strict (auto-est.): premium billing CRUD.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### REINSURANCE-MGMT — Reinsurance and Ceded Risk Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (INS-CLAIMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (INS-CLAIMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 INS-CLAIMS audit 2026-05-30
- **Vendor evidence:** Guidewire ReinsuranceManager, Sapiens ReinsurancePro, SAP Reinsurance Management, Verisk SequelDirect, Tigerlab
- **Adjacency:** INS-CLAIMS, INS-UNDERWRITING, FIN
- **Candidate capabilities:** treaty and facultative tracking, cession allocation, retrocession, reinsurance claims recovery, bordereau reporting, ceded premium accounting
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DEAL-FLOW-SIGNAL — Deal Flow Signal Aggregation

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (INV-CRM audit 2026-05-30)
- **Most recent:** 2026-05-30 (INV-CRM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 INV-CRM audit 2026-05-30
- **Vendor evidence:** Harmonic, Specter, Tracxn, BoxGroup Signal, Crunchbase Pro, PitchBook (signals tier)
- **Adjacency:** INV-CRM, PROD-MGMT
- **Candidate capabilities:** company signal monitoring, growth-stage detection, founder change tracking, hiring-velocity alerts, fundraising news ingestion
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EFSS — Enterprise File Sync and Share

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (ECM audit 2026-05-30)
- **Most recent:** 2026-05-30 (ECM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 ECM audit 2026-05-30
- **Vendor evidence:** Box, Dropbox Business, Citrix ShareFile, Egnyte, Microsoft OneDrive for Business
- **Adjacency:** ECM, WSC, DXP, DLP
- **Candidate capabilities:** secure file sharing, mobile file access, external collaboration, file sync, link-based sharing
- **Estimated Semantius score:** ~76% strict (auto-est.): mostly internal CRUD; external drag = external data fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ENTERPRISE-INFO-ARCHIVING — Enterprise Information Archiving

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (ECM audit 2026-05-30)
- **Most recent:** 2026-05-30 (ECM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 ECM audit 2026-05-30
- **Vendor evidence:** Smarsh, Proofpoint Archive, Mimecast Archive, Global Relay, Veritas Enterprise Vault, Iron Mountain InSight
- **Adjacency:** ECM, DLP, LSD, AUDIT, GRC
- **Candidate capabilities:** long-term email and message archival, supervisory review for financial services, eDiscovery export, immutable storage, communications compliance
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### VECTOR-DB — Vector Database / Similarity Search

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (KGP audit 2026-05-30)
- **Most recent:** 2026-05-30 (KGP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 KGP audit 2026-05-30
- **Vendor evidence:** Pinecone, Weaviate, Milvus, Qdrant, Chroma
- **Adjacency:** KGP, DATA-AI-PLAT, DCG, MDM
- **Candidate capabilities:** vector indexing, ANN similarity search, embedding ingestion, hybrid sparse-dense retrieval, namespace/tenancy isolation
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### RAG-PLATFORM — Retrieval-Augmented Generation Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (KGP audit 2026-05-30)
- **Most recent:** 2026-05-30 (KGP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 KGP audit 2026-05-30
- **Vendor evidence:** Vectara, Glean Assistant, Cohere Compass, Pinecone Assistant, Elastic Search AI, NVIDIA NeMo Retriever
- **Adjacency:** KGP, DATA-AI-PLAT, VECTOR-DB, DCG
- **Candidate capabilities:** document chunking, embedding pipelines, retrieval orchestration, answer grounding, citation generation, evaluation harnesses
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### AGENT-RUNTIME — AI Agent Runtime and Orchestration

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (KGP audit 2026-05-30)
- **Most recent:** 2026-05-30 (KGP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 KGP audit 2026-05-30
- **Vendor evidence:** LangChain, LlamaIndex, CrewAI, Microsoft Semantic Kernel, AutoGen, OpenAI Agents SDK
- **Adjacency:** KGP, DATA-AI-PLAT, RAG-PLATFORM
- **Candidate capabilities:** tool routing, plan-and-execute orchestration, memory management, multi-agent coordination, tracing and observability
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ENTERPRISE-SEARCH — Enterprise Search and Retrieval-Augmented Generation Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (KMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (KMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 KMS audit 2026-05-30
- **Vendor evidence:** Glean, Coveo, Algolia, Elastic Enterprise Search, Sinequa, Lucidworks Fusion, GoSearch, AlphaSense
- **Adjacency:** KMS, ECM, DATA-AI-PLAT, INTRANET, CSM, ITSM
- **Candidate capabilities:** federated indexing across SaaS, vector and hybrid search, personalized ranking, answer generation, citation extraction, search analytics, query understanding
- **Estimated Semantius score:** ~72% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute, text generation.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### AGENT-ASSIST — Agent Assist and Knowledge Surfacing

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (KMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (KMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 KMS audit 2026-05-30
- **Vendor evidence:** Cresta, ASAPP, Forethought, Espressive, Aisera, ServiceNow Now Assist, Salesforce Einstein Service Replies
- **Adjacency:** KMS, CSM, CCAAS, HRSD, ITSM
- **Candidate capabilities:** real-time agent suggestion, knowledge surfacing in case context, AI summarization of conversations, response drafting, next-best-action prompting
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (ML/AI compute, text generation); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TIRE-MGMT — Fleet Tire Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FLEET-MAINT audit 2026-05-30)
- **Most recent:** 2026-05-30 (FLEET-MAINT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FLEET-MAINT audit 2026-05-30
- **Vendor evidence:** Bridgestone Webfleet Tire Management, Goodyear Tirewise, IDSC Tire Operations, Hankook Tire Management, Continental ContiConnect
- **Adjacency:** FLEET-MAINT, FLEET-MGMT, TELEMATICS
- **Candidate capabilities:** tire-asset tracking, tread-depth monitoring, retread workflow, mounting/dismounting work-order, tire-cost-per-mile analytics
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### VEHICLE-RECALL-MGMT — Vehicle Recall Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FLEET-MAINT audit 2026-05-30)
- **Most recent:** 2026-05-30 (FLEET-MAINT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FLEET-MAINT audit 2026-05-30
- **Vendor evidence:** Recall Masters, AutoAp, MotorTrace, CDK Global Recall, Stoneeagle Recall
- **Adjacency:** FLEET-MAINT, FLEET-MGMT, RE-CRE
- **Candidate capabilities:** OEM-recall ingestion (NHTSA VIN match), per-vehicle campaign tracking, repair-completion attestation, owner notification, OEM reimbursement claims
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### IPAM-DDI — IP Address Management and DDI

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (DCIM audit 2026-05-30)
- **Most recent:** 2026-05-30 (NPMD audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DCIM audit 2026-05-30
  - 2026-05-30 NPMD audit 2026-05-30
- **Vendor evidence:** Infoblox, BlueCat, EfficientIP, ApplianSys, NetBox, Men&Mice
- **Adjacency:** DCIM, CMDB, NPMD, ITOM
- **Candidate capabilities:** IPv4 / IPv6 address pool management, subnet allocation, DHCP server management, DNS authoritative records, network discovery, IP audit and reconciliation
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CAASM — Cyber Asset Attack Surface Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (DISCOVERY audit 2026-05-30)
- **Most recent:** 2026-05-30 (THREAT-INTEL audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DISCOVERY audit 2026-05-30
  - 2026-05-30 THREAT-INTEL audit 2026-05-30
- **Vendor evidence:** Axonius, JupiterOne, runZero, Sevco Security, Lansweeper Cloud
- **Adjacency:** DISCOVERY, CMDB, ITAM, SECOPS, VULN-MGMT
- **Candidate capabilities:** cross-source asset aggregation, security control coverage gap detection, unmanaged-device discovery, security tool coverage analysis
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### KYC-AML-PLATFORM — KYC / AML Compliance Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 BANK-OPS audit 2026-05-30
- **Vendor evidence:** Fenergo, Alloy, Trulioo, Persona, ComplyAdvantage, Jumio
- **Adjacency:** BANK-OPS, GRC, TPRM, INS-CARRIER
- **Candidate capabilities:** identity verification, beneficial ownership, sanctions screening, PEP screening, ongoing monitoring
- **Estimated Semantius score:** ~62% strict (auto-est.): external sanctions/PEP list fetch + screening.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TRANSACTION-MONITORING — Transaction Monitoring / AML Surveillance

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 BANK-OPS audit 2026-05-30
- **Vendor evidence:** NICE Actimize, Featurespace, ComplyAdvantage, SAS AML, Oracle Financial Services
- **Adjacency:** BANK-OPS, GRC, FRAUD-DETECT
- **Candidate capabilities:** transaction surveillance, anomaly detection, alert triage, SAR/STR filing, scenario tuning
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PAYMENT-OPS — Payment Operations Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 BANK-OPS audit 2026-05-30
- **Vendor evidence:** Modern Treasury, Orum, Stripe Treasury, Treasury Prime, Sila, Volopa
- **Adjacency:** BANK-OPS, S2P, FIN, ECOM
- **Candidate capabilities:** payment orchestration, ledger reconciliation, multi-rail routing, payment scheduling, beneficiary management
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### OPEN-BANKING — Open Banking / Account Data Aggregation

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 BANK-OPS audit 2026-05-30
- **Vendor evidence:** Plaid, TrueLayer, Tink, Yapily, Finicity (Mastercard), MX
- **Adjacency:** BANK-OPS, PAYMENT-OPS, ECOM
- **Candidate capabilities:** account linking, PSD2/CMA9 access, balance retrieval, transaction enrichment, payment initiation
- **Estimated Semantius score:** ~50% strict (auto-est.): external bank-API account aggregation is the product.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### BAAS-PLATFORM — Banking-as-a-Service Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 BANK-OPS audit 2026-05-30
- **Vendor evidence:** Unit, Treasury Prime, Synctera, Solid, Bond, Marqeta (issuing)
- **Adjacency:** BANK-OPS, PAYMENT-OPS, FINTECH-INFRA
- **Candidate capabilities:** embedded banking, sponsor-bank orchestration, BIN sponsorship, virtual account issuance, embedded card programs
- **Estimated Semantius score:** ~54% strict (auto-est.): sponsor-bank / external orchestration heavy.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### BANK-FRAUD-DETECT — Banking Fraud Detection

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 BANK-OPS audit 2026-05-30
- **Vendor evidence:** Featurespace, NICE Actimize, FICO Falcon, BioCatch, ThreatMetrix (LexisNexis)
- **Adjacency:** BANK-OPS, PAYMENT-OPS, SECOPS, FRAUD-DETECT
- **Candidate capabilities:** behavioral biometrics, real-time scoring, device fingerprinting, account takeover detection, payment fraud screening
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (ML/AI compute, payment/settlement); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### LOAN-ORIGINATION — Loan Origination System

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 BANK-OPS audit 2026-05-30
- **Vendor evidence:** nCino (LOS module), Blend, Encompass (ICE Mortgage), Mortgage Cadence, Roostify, Baker Hill
- **Adjacency:** BANK-OPS, CRM, GRC
- **Candidate capabilities:** application intake, document collection, underwriting workflow, credit decisioning, closing/funding orchestration
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CORE-BANKING — Core Banking Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (BANK-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 BANK-OPS audit 2026-05-30
- **Vendor evidence:** Mambu, Thought Machine, 10x Banking, Temenos, FIS Core, Finastra, Jack Henry, Fiserv DNA
- **Adjacency:** BANK-OPS, FIN, PAYMENT-OPS
- **Candidate capabilities:** deposit ledger, loan ledger, product configuration, interest accrual, statement generation
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SALES-PLANNING-PLATFORM — Sales Planning Platform

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (SALES-PERF audit 2026-05-30)
- **Most recent:** 2026-05-30 (GTM-PLAN audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SALES-PERF audit 2026-05-30
  - 2026-05-30 GTM-PLAN audit 2026-05-30
- **Vendor evidence:** Anaplan Sales Planning, Pigment, Board, Fullcast
- **Adjacency:** SALES-PERF, GTM-PLAN, EPM, ACCT-PLAN
- **Candidate capabilities:** territory ops, quota refresh cycles, sales capacity modeling, segmentation-driven plan rollouts, rev-ops strategy modeling
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TEST-AUTOMATION-PLATFORM — Test Automation Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (TEST-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (TEST-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TEST-MGMT audit 2026-05-30
- **Vendor evidence:** Tricentis Tosca, mabl, BrowserStack Automate, Sauce Labs, Applitools, LambdaTest, Katalon
- **Adjacency:** TEST-MGMT, VSDP, APIM, PROD-MGMT
- **Candidate capabilities:** low-code test authoring, cross-browser execution grid, visual regression testing, AI-based test self-healing, mobile device cloud, parallel run orchestration
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### API-TESTING — API Testing Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (TEST-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (TEST-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TEST-MGMT audit 2026-05-30
- **Vendor evidence:** Postman, ReadyAPI (SmartBear), Insomnia, Bruno, Karate Labs, Apidog
- **Adjacency:** TEST-MGMT, APIM, VSDP
- **Candidate capabilities:** API contract testing, mock servers, environment-scoped requests, schema-validation assertions, performance smoke testing
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CONV-DESIGN — Conversation Design Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CONV-AI audit 2026-05-30)
- **Most recent:** 2026-05-30 (CONV-AI audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CONV-AI audit 2026-05-30
- **Vendor evidence:** Voiceflow, Botpress Studio, Botmock, Dialogflow CX Designer
- **Adjacency:** CONV-AI, DXP, UX-RES
- **Candidate capabilities:** dialog flow authoring, intent and entity modeling, prototype testing, voice and chat persona design, multilingual variant authoring, collaborative review and versioning
- **Estimated Semantius score:** ~64% strict (auto-est.): mostly internal CRUD; external drag = external data fetch, non-email channel.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CONV-INTEL — Conversation Intelligence

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (CONV-AI audit 2026-05-30)
- **Most recent:** 2026-05-30 (CCAAS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CONV-AI audit 2026-05-30
  - 2026-05-30 CCAAS audit 2026-05-30
- **Vendor evidence:** Gong, Chorus.ai (ZoomInfo), Salesloft Conversations, Observe.ai, CallMiner, ExecVision
- **Adjacency:** CONV-AI, CCAAS, REV-INTEL, CRM
- **Candidate capabilities:** call recording and transcription, topic and moment detection, coaching scorecards, deal-risk scoring, agent quality monitoring, post-call analytics
- **Estimated Semantius score:** ~28% strict (auto-est.): external action is the product (external infra/runtime, ML/AI compute, non-email channel); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### AI-AGENT-OPS — AI Agent Operations and Observability

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CONV-AI audit 2026-05-30)
- **Most recent:** 2026-05-30 (CONV-AI audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CONV-AI audit 2026-05-30
- **Vendor evidence:** LangSmith, Arize AI, Langfuse, Helicone, Galileo, Weights and Biases Weave
- **Adjacency:** CONV-AI, DATA-AI-PLAT, ITSM
- **Candidate capabilities:** prompt and trace observability, model evaluation, drift detection, agent run replay, tool-call inspection, hallucination metrics
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TELCO-RAFM — Telecommunications Revenue Assurance and Fraud Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (TELCO-BSS audit 2026-05-30)
- **Most recent:** 2026-05-30 (TELCO-BSS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TELCO-BSS audit 2026-05-30
- **Vendor evidence:** Subex HyperSense, Mobileum (WeDo), Araxxe, Neural Technologies
- **Adjacency:** TELCO-BSS, FIN, GRC
- **Candidate capabilities:** revenue leakage detection, fraud case management, usage reconciliation, CDR audit, interconnect billing assurance
- **Estimated Semantius score:** ~36% strict (auto-est.): external action is the product (external data fetch, ML/AI compute, payment/settlement); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TELCO-NMS — Telecommunications Network Management Systems

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (TELCO-BSS audit 2026-05-30)
- **Most recent:** 2026-05-30 (TELCO-BSS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TELCO-BSS audit 2026-05-30
- **Vendor evidence:** IBM Netcool, Cisco Crosswork, Nokia NSP, Ciena Manage Control Plan, VMware Telco Cloud
- **Adjacency:** TELCO-BSS, ITSM, AIOPS
- **Candidate capabilities:** fault management, performance management, network alarm correlation, topology discovery, service impact analysis
- **Estimated Semantius score:** ~50% strict (auto-est.): network fault/alarm telemetry + correlation.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CIS-UTIL — Customer Information System for Utilities

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 UTIL-OPS audit 2026-05-30
- **Vendor evidence:** Oracle Utilities Customer Care and Billing, SAP IS-U, Itineris UMAX, Gentrack Velocity, Hansen CC&B
- **Adjacency:** UTIL-OPS, CRM, FIN
- **Candidate capabilities:** service activation, rate schedules, billing determinants, customer move-in move-out, payment posting, credit and collections, customer self-service portal
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### UTIL-AMI-MDMS — Advanced Metering Infrastructure and Meter Data Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 UTIL-OPS audit 2026-05-30
- **Vendor evidence:** Itron OpenWay, Landis+Gyr Gridstream, Sensus FlexNet, Aclara, Honeywell Elster EnergyAxis, Siemens EnergyIP MDM
- **Adjacency:** UTIL-OPS, IOT, DATA-AI-PLAT
- **Candidate capabilities:** head-end system, meter data collection, interval data validation editing estimation, register reads, demand-response signaling, meter event ingestion
- **Estimated Semantius score:** ~37% strict (auto-est.): external action is the product (device/IoT telemetry, external data fetch); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### UTIL-OMS — Outage Management System

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 UTIL-OPS audit 2026-05-30
- **Vendor evidence:** Oracle Utilities Network Management System, GE Digital PowerOn Restore, Schneider Electric ADMS, Survalent SCADA OMS, OATI webSmartEnergy
- **Adjacency:** UTIL-OPS, FSM, CSM, GIS-UTIL
- **Candidate capabilities:** outage prediction, crew dispatch, restoration tracking, customer outage reporting, storm management, IVR outage capture, ETR estimation
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### UTIL-WAM — Utility Work and Asset Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 UTIL-OPS audit 2026-05-30
- **Vendor evidence:** Oracle Utilities Work and Asset Management, IBM Maximo for Utilities, Cityworks, ABB Ellipse, Hexagon EAM Utilities
- **Adjacency:** UTIL-OPS, FSM, ITSM, GIS-UTIL
- **Candidate capabilities:** asset register, planned maintenance scheduling, work order lifecycle, crew assignment, mobile field execution, asset health scoring, regulatory inspection cycles
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### UTIL-DERMS — Distributed Energy Resource Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 UTIL-OPS audit 2026-05-30
- **Vendor evidence:** Generac Concerto, AutoGrid Flex, Smarter Grid Solutions ANM Strata, Itron IntelliFLEX, Bidgely UtilityAI, Sunverge Solar Integration Platform
- **Adjacency:** UTIL-OPS, IOT, ESG
- **Candidate capabilities:** DER registration, real-time telemetry, dispatch optimization, virtual power plant orchestration, demand response events, settlement, grid services
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, payment/settlement); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### UTIL-GIS — Utility Geographic Information System

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (UTIL-OPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 UTIL-OPS audit 2026-05-30
- **Vendor evidence:** Esri ArcGIS Utility Network, Schneider Electric ArcFM, Hexagon G/Technology, Bentley OpenUtilities, GE Digital Smallworld
- **Adjacency:** UTIL-OPS, UTIL-OMS, UTIL-WAM
- **Candidate capabilities:** network topology modeling, connectivity tracing, as-built capture, land base management, design and estimating, joint use, facility data management
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PS-CONST-ENGAGE — Public-Sector Constituent Engagement (311)

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (PS-LIC audit 2026-05-30)
- **Most recent:** 2026-05-30 (PS-LIC audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PS-LIC audit 2026-05-30
- **Vendor evidence:** Granicus, GovQA, SeeClickFix (CivicPlus), Accela Civic Engage
- **Adjacency:** PS-LIC, CSM, CCAAS
- **Candidate capabilities:** 311 case intake, service-request routing, constituent identity verification, public-meeting agendas, FOIA request workflow
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PS-GRANTS-MGMT — Public-Sector Grants Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (PS-LIC audit 2026-05-30)
- **Most recent:** 2026-05-30 (PS-LIC audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PS-LIC audit 2026-05-30
- **Vendor evidence:** Submittable, Fluxx, eCivis (Euna), SmartSimple, GrantHub
- **Adjacency:** PS-LIC, FIN, GRC
- **Candidate capabilities:** grant solicitation, application intake, reviewer scoring, award disbursement, recipient compliance reporting, federal grant pass-through tracking
- **Estimated Semantius score:** ~92% strict (auto-est.): grant CRUD; 'reviewer scoring' is human, not ML.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### INTERNAL-DEV-PLAT — Internal Developer Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (VSDP audit 2026-05-30)
- **Most recent:** 2026-05-30 (VSDP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 VSDP audit 2026-05-30
- **Vendor evidence:** Backstage, Port, Cortex, OpsLevel, Humanitec, Roadie, Spotify Portal
- **Adjacency:** VSDP, KUBE-PLAT, APP-PAAS, ITSM, OBS
- **Candidate capabilities:** developer portal, service catalog, scorecards / tech health, self-service templates / golden paths, software cataloging
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### GITOPS-DELIVERY — GitOps Continuous Delivery

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (VSDP audit 2026-05-30)
- **Most recent:** 2026-05-30 (VSDP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 VSDP audit 2026-05-30
- **Vendor evidence:** Argo CD, Flux, Codefresh, Akuity, Weaveworks, Octopus Deploy, Harness CD
- **Adjacency:** VSDP, KUBE-PLAT, APP-PAAS
- **Candidate capabilities:** declarative deployment, drift detection and reconciliation, progressive delivery, release orchestration, environment promotion
- **Estimated Semantius score:** ~35% strict (auto-est.): external action is the product (external infra/runtime, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ARTIFACT-REGISTRY — Artifact Registry and Package Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (VSDP audit 2026-05-30)
- **Most recent:** 2026-05-30 (VSDP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 VSDP audit 2026-05-30
- **Vendor evidence:** JFrog Artifactory, Sonatype Nexus Repository, GitHub Packages, GitLab Package Registry, Azure Artifacts, AWS CodeArtifact, Cloudsmith
- **Adjacency:** VSDP, APPSEC-ORCH, SUPPLY-CHAIN-SEC, KUBE-PLAT
- **Candidate capabilities:** package hosting (docker, npm, maven, pypi, helm, nuget), package promotion, SBOM publication, signed artifact distribution, retention policy
- **Estimated Semantius score:** ~40% strict (auto-est.): mostly internal CRUD; external drag = external infra/runtime.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### APPSEC-ORCH — Application Security Orchestration (ASOC / ASPM)

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (VSDP audit 2026-05-30)
- **Most recent:** 2026-05-30 (VSDP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 VSDP audit 2026-05-30
- **Vendor evidence:** Snyk, Sonatype Lifecycle, Mend, GitHub Advanced Security, Checkmarx, Veracode, Cycode, ArmorCode, Apiiro, Endor Labs
- **Adjacency:** VSDP, DSPM, SECOPS, GRC
- **Candidate capabilities:** SAST orchestration, SCA / dependency scanning, secret scanning, license compliance, vulnerability triage and routing, application security posture rollup
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SUPPLY-CHAIN-SEC — Software Supply Chain Security

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (VSDP audit 2026-05-30)
- **Most recent:** 2026-05-30 (VSDP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 VSDP audit 2026-05-30
- **Vendor evidence:** Chainguard, Sigstore, Anchore, JFrog Xray, Aqua Security, Snyk Container, Phylum, Socket
- **Adjacency:** VSDP, APPSEC-ORCH, ARTIFACT-REGISTRY, DSPM
- **Candidate capabilities:** SBOM generation and validation, dependency provenance (SLSA), signed-artifact attestation, container image scanning, dependency-confusion detection
- **Estimated Semantius score:** ~35% strict (auto-est.): external action is the product (external infra/runtime, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SAAS-BACKUP — SaaS Application Backup

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (COLLAB-GOV audit 2026-05-30)
- **Most recent:** 2026-05-30 (COLLAB-GOV audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 COLLAB-GOV audit 2026-05-30
- **Vendor evidence:** Veeam Backup for Microsoft 365, AvePoint Cloud Backup, Druva for Microsoft 365, Spanning, Keepit, HYCU, Barracuda Cloud-to-Cloud Backup
- **Adjacency:** COLLAB-GOV, ECM, ITSM, BCM
- **Candidate capabilities:** tenant backup scheduling, point-in-time restore, granular item restore, ransomware recovery, retention policy management, cross-tenant restore
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TENANT-MIGRATION — Collaboration Tenant Migration

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (COLLAB-GOV audit 2026-05-30)
- **Most recent:** 2026-05-30 (COLLAB-GOV audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 COLLAB-GOV audit 2026-05-30
- **Vendor evidence:** ShareGate Migrate, AvePoint Fly, Quest On Demand Migration, BitTitan MigrationWiz, CloudM Migrate
- **Adjacency:** COLLAB-GOV, ECM, ITSM
- **Candidate capabilities:** pre-migration assessment, content mapping, incremental delta sync, post-migration validation, cross-tenant moves, mergers and acquisitions content reorg
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### M365-MGMT — Microsoft 365 Tenant Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (COLLAB-GOV audit 2026-05-30)
- **Most recent:** 2026-05-30 (COLLAB-GOV audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 COLLAB-GOV audit 2026-05-30
- **Vendor evidence:** CoreView, ENow Application Insights, Quest On Demand for Microsoft 365, ManageEngine M365 Manager Plus, AdminDroid
- **Adjacency:** COLLAB-GOV, SAM, ITSM, UEM, IGA
- **Candidate capabilities:** tenant health monitoring, license usage reporting, delegated administration, bulk tenant operations, M365 service health, cross-workload analytics
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MERCH-EXEC — Merchandising Execution and Shelf Compliance

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RET-STORE audit 2026-05-30)
- **Most recent:** 2026-05-30 (RET-STORE audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RET-STORE audit 2026-05-30
- **Vendor evidence:** GoSpotCheck (FORM), Repsly, YOOBIC, Wiser Retail, Trax Retail, ImageX
- **Adjacency:** RET-STORE, INV-MGMT, CPG-TRADE
- **Candidate capabilities:** shelf compliance audits, planogram execution scoring, retail execution surveys, image-recognition shelf scans, perfect store KPIs
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### STORE-COMMS — Store Communications and Knowledge Distribution

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RET-STORE audit 2026-05-30)
- **Most recent:** 2026-05-30 (RET-STORE audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RET-STORE audit 2026-05-30
- **Vendor evidence:** Zipline, Nudge, AxonifyConnect, Reflexis Q&A
- **Adjacency:** RET-STORE, INTRANET, LMS, KNOWLEDGE-MGMT
- **Candidate capabilities:** store-targeted messaging, acknowledgement tracking, district memos, multi-store campaigns, store-level knowledge bases
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### IOMT-SEC — Medical Device Cybersecurity (IoMT Security)

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CLIN-DEV audit 2026-05-30)
- **Most recent:** 2026-05-30 (CLIN-DEV audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CLIN-DEV audit 2026-05-30
- **Vendor evidence:** Claroty Medigate, Asimily, Cynerio, MedCrypt, Ordr
- **Adjacency:** CLIN-DEV, OT-SEC, CMDB, VULN-MGMT
- **Candidate capabilities:** passive device discovery, IoMT vulnerability management, medical-device microsegmentation, FDA cybersecurity premarket reviews, SBOM tracking for medical devices
- **Estimated Semantius score:** ~50% strict (auto-est.): mostly internal CRUD; external drag = device/IoT telemetry.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### IPA — Intelligent Process Automation

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RPA audit 2026-05-30)
- **Most recent:** 2026-05-30 (RPA audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RPA audit 2026-05-30
- **Vendor evidence:** UiPath AI Center, Automation Anywhere AARI, Microsoft Power Automate AI Builder, SS&C Blue Prism Decipher
- **Adjacency:** RPA, IDP, PROC-MIN, LCAP, BPA
- **Candidate capabilities:** AI-augmented automation, document AI in RPA, ML model embedding in bots, attended-bot copilots, decision automation in workflows
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TASK-MIN — Task Mining

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RPA audit 2026-05-30)
- **Most recent:** 2026-05-30 (RPA audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RPA audit 2026-05-30
- **Vendor evidence:** UiPath Task Mining, Microsoft Power Automate Process Advisor, Soroco Scout, Kryon Process Discovery, ABBYY Timeline Task Mining
- **Adjacency:** RPA, PROC-MIN, BPA
- **Candidate capabilities:** user-interaction recording, click-stream capture, task variant analysis, automation candidate identification, UI element fingerprinting
- **Estimated Semantius score:** ~70% strict (auto-est.): task-mining capture + analysis (twin of TASK-MINING).
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### HC-CMMS — Healthcare CMMS (Clinical Engineering Asset Maintenance)

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CLIN-DEV audit 2026-05-30)
- **Most recent:** 2026-05-30 (CLIN-DEV audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CLIN-DEV audit 2026-05-30
- **Vendor evidence:** Nuvolo Connected Workplace for Healthcare, AIMS, EQ2 HEMS, Phoenix Data Systems Mediq RAM, Connectiv, Hemingway
- **Adjacency:** CLIN-DEV, EAM, ITSM, FACILITY-MGMT
- **Candidate capabilities:** biomedical-equipment CMMS, PM scheduling for medical assets, work-order dispatch to biomeds, parts inventory for clinical engineering, vendor-service-contract tracking
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PROCESS-ORCH — Process Orchestration and Workflow Engine

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RPA audit 2026-05-30)
- **Most recent:** 2026-05-30 (RPA audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RPA audit 2026-05-30
- **Vendor evidence:** Camunda, Bizagi, Pega Platform, IBM Business Automation Workflow, Workato, Tray.ai, Appian, Microsoft Power Automate Cloud Flows
- **Adjacency:** RPA, BPA, LCAP, IPA
- **Candidate capabilities:** BPMN-based workflow modeling, human-in-the-loop tasks, long-running process state machines, service task orchestration, decision tables, business rules engine integration
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MED-DEVICE-QMS — Medical Device Quality Management System (Design Controls and Manufacturing Quality)

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CLIN-DEV audit 2026-05-30)
- **Most recent:** 2026-05-30 (CLIN-DEV audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CLIN-DEV audit 2026-05-30
- **Vendor evidence:** Greenlight Guru, MasterControl, Sparta Systems TrackWise, Veeva Vault QMS, Qualio
- **Adjacency:** CLIN-DEV, QMS, GRC, MFG-QUALITY
- **Candidate capabilities:** design history file management, design controls per 21 CFR 820.30, CAPA workflows for device manufacturers, complaint handling, eMDR submissions to FDA
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EVENT-BROKER-PAAS — Event Broker Platform as a Service

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (IPAAS audit 2026-05-30)
- **Most recent:** 2026-05-30 (APIM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 IPAAS audit 2026-05-30
  - 2026-05-30 APIM audit 2026-05-30
- **Vendor evidence:** Solace PubSub+, Confluent Cloud, AWS EventBridge, Ably, Pusher, Kafka-as-a-Service offerings
- **Adjacency:** IPAAS, OBS, APIM, APP-PAAS
- **Candidate capabilities:** managed event broker, topic and stream administration, pub-sub fan-out, event schema registry, replay and dead-letter handling
- **Estimated Semantius score:** ~40% strict (auto-est.): mostly internal CRUD; external drag = external infra/runtime.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SECRETS-MGMT — Secrets Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (RPA audit 2026-05-30)
- **Most recent:** 2026-05-30 (KUBE-PLAT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RPA audit 2026-05-30
  - 2026-05-30 KUBE-PLAT audit 2026-05-30
- **Vendor evidence:** HashiCorp Vault, CyberArk Conjur, AWS Secrets Manager, Doppler, 1Password Secrets Automation, Akeyless
- **Adjacency:** RPA, IGA, SECOPS, DEVOPS
- **Candidate capabilities:** secret vaulting, automatic credential rotation, machine identity issuance, dynamic credentials, secret leasing, audit logging of secret access
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CITIZEN-AUTO — Citizen Workflow Automation

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (IPAAS audit 2026-05-30)
- **Most recent:** 2026-05-30 (IPAAS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 IPAAS audit 2026-05-30
- **Vendor evidence:** Zapier, Make.com, IFTTT, Pipedream, n8n cloud, Pabbly Connect
- **Adjacency:** IPAAS, RPA, LCAP
- **Candidate capabilities:** no-code multi-step workflow, app trigger and action library, schedule and webhook triggers, light data transformation, end-user authored automations
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SERVICE-MESH — Service Mesh

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (KUBE-PLAT audit 2026-05-30)
- **Most recent:** 2026-05-30 (APIM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 KUBE-PLAT audit 2026-05-30
  - 2026-05-30 APIM audit 2026-05-30
- **Vendor evidence:** Istio, Linkerd, Consul Connect, Cilium Service Mesh, Solo.io Gloo Mesh
- **Adjacency:** KUBE-PLAT, OBS, APP-PAAS, SECOPS
- **Candidate capabilities:** service-to-service mTLS, traffic routing policy, circuit breaking, distributed tracing wiring, multi-cluster mesh federation
- **Estimated Semantius score:** ~40% strict (auto-est.): mostly internal CRUD; external drag = external infra/runtime.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### GITOPS-PLAT — GitOps Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (KUBE-PLAT audit 2026-05-30)
- **Most recent:** 2026-05-30 (KUBE-PLAT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 KUBE-PLAT audit 2026-05-30
- **Vendor evidence:** Argo CD, Flux, Weaveworks GitOps, Codefresh GitOps, Akuity
- **Adjacency:** KUBE-PLAT, VSDP, APP-PAAS
- **Candidate capabilities:** git-driven cluster reconciliation, app of apps deployment, drift detection, sync policy management, application set generation
- **Estimated Semantius score:** ~35% strict (auto-est.): external action is the product (external infra/runtime, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CONT-REG — Container Image Registry

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (KUBE-PLAT audit 2026-05-30)
- **Most recent:** 2026-05-30 (KUBE-PLAT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 KUBE-PLAT audit 2026-05-30
- **Vendor evidence:** Harbor, JFrog Artifactory, Docker Hub, GitHub Container Registry, Quay
- **Adjacency:** KUBE-PLAT, VULN-MGMT, VSDP
- **Candidate capabilities:** container image storage, image signing, vulnerability scanning, image promotion, replication
- **Estimated Semantius score:** ~42% strict (auto-est.): external action is the product (external infra/runtime); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### POLICY-AS-CODE — Policy as Code

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (KUBE-PLAT audit 2026-05-30)
- **Most recent:** 2026-05-30 (KUBE-PLAT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 KUBE-PLAT audit 2026-05-30
- **Vendor evidence:** Open Policy Agent (OPA), Kyverno, Styra DAS, HashiCorp Sentinel
- **Adjacency:** KUBE-PLAT, GRC, SECOPS, IAC
- **Candidate capabilities:** admission control policy, runtime policy enforcement, policy bundle distribution, decision logging, policy testing
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### IDP-INT-DEV-PLAT — Internal Developer Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (KUBE-PLAT audit 2026-05-30)
- **Most recent:** 2026-05-30 (KUBE-PLAT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 KUBE-PLAT audit 2026-05-30
- **Vendor evidence:** Backstage, Port, Cortex, OpsLevel, Humanitec
- **Adjacency:** KUBE-PLAT, APP-PAAS, VSDP, DEVPORTAL
- **Candidate capabilities:** service catalog, scaffolder templates, software templates, developer self-service portal, tech radar, software documentation surfacing
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EHR — Electronic Health Record

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (HC-PATIENT audit 2026-05-30)
- **Most recent:** 2026-05-30 (HC-PATIENT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 HC-PATIENT audit 2026-05-30
- **Vendor evidence:** Epic, Oracle Health (Cerner), MEDITECH, Athenahealth, eClinicalWorks
- **Adjacency:** HC-PATIENT, HC-RCM, CLIN-DEV
- **Candidate capabilities:** longitudinal patient record, clinical documentation, computerized provider order entry, e-prescribing, clinical decision support, interoperability via HL7/FHIR
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### HC-RCM — Healthcare Revenue Cycle Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (HC-PATIENT audit 2026-05-30)
- **Most recent:** 2026-05-30 (HC-PATIENT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 HC-PATIENT audit 2026-05-30
- **Vendor evidence:** Waystar, R1 RCM, Optum, Change Healthcare, Experian Health, FinThrive
- **Adjacency:** HC-PATIENT, EHR, FIN, HC-PAYER
- **Candidate capabilities:** patient eligibility verification, prior authorization, charge capture, claims submission, denial management, patient billing, payment posting
- **Estimated Semantius score:** ~88% strict (auto-est.): mostly internal CRUD; external drag = payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### HC-PAYER — Health Plan Payer Operations

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (HC-PATIENT audit 2026-05-30)
- **Most recent:** 2026-05-30 (HC-PATIENT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 HC-PATIENT audit 2026-05-30
- **Vendor evidence:** HealthEdge HealthRules Payer, TriZetto QNXT, Cognizant Facets, Edifecs
- **Adjacency:** HC-PATIENT, HC-RCM, INS-CLAIMS
- **Candidate capabilities:** member enrollment, benefit configuration, claims adjudication, provider network management, utilization management, prior authorization processing
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TELEHEALTH — Telehealth and Virtual Care

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (HC-PATIENT audit 2026-05-30)
- **Most recent:** 2026-05-30 (HC-PATIENT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 HC-PATIENT audit 2026-05-30
- **Vendor evidence:** Teladoc Health, Amwell, Doxy.me, Zoom for Healthcare, MDLIVE
- **Adjacency:** HC-PATIENT, EHR, CCAAS
- **Candidate capabilities:** virtual visit scheduling, video consultation, virtual waiting room, remote patient monitoring intake, e-prescribing integration, virtual visit billing
- **Estimated Semantius score:** ~76% strict (auto-est.): mostly internal CRUD; external drag = non-email channel, payment/settlement.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PACS — Physical Access Control Systems

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (VIS-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (VIS-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 VIS-MGMT audit 2026-05-30
- **Vendor evidence:** HID Global, Genetec, Lenel S2, Brivo, Honeywell Pro-Watch, Johnson Controls C-CURE 9000
- **Adjacency:** VIS-MGMT, IGA, REAL-EST, IWMS
- **Candidate capabilities:** card credential issuance, badge access policy authoring, door / reader controller management, badge-in / badge-out event ingest, access zone definition, anti-passback enforcement, mustering and emergency lockdown
- **Estimated Semantius score:** ~30% strict (auto-est.): mostly internal CRUD; external drag = device/IoT telemetry, external data fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### HC-PHARM-MGMT — Pharmacy Practice and Medication Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (HC-PATIENT audit 2026-05-30)
- **Most recent:** 2026-05-30 (HC-PATIENT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 HC-PATIENT audit 2026-05-30
- **Vendor evidence:** McKesson EnterpriseRx, Cardinal Health Cube Rx, Omnicell, BD Pyxis, Surescripts (network)
- **Adjacency:** HC-PATIENT, EHR, HC-RCM
- **Candidate capabilities:** prescription dispensing, medication reconciliation, drug utilization review, controlled-substance ledger, automated dispensing, pharmacy inventory, e-prescribing receive
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ITPA — IT Process Automation (Runbook Automation)

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (ITOM audit 2026-05-30)
- **Most recent:** 2026-05-30 (ITOM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 ITOM audit 2026-05-30
- **Vendor evidence:** Rundeck, Resolve Actions Pro, BMC TrueSight Orchestration, Ansible Automation Platform, HashiCorp Nomad workflows
- **Adjacency:** ITOM, ITSM, AIOPS, SECOPS, SOAR
- **Candidate capabilities:** runbook authoring, workflow orchestration, approval-gated automation, parametric execution, audit-trailed runs
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### WORKLOAD-AUTO — Workload Automation and Job Scheduling

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (ITOM audit 2026-05-30)
- **Most recent:** 2026-05-30 (ITOM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 ITOM audit 2026-05-30
- **Vendor evidence:** BMC Control-M, Broadcom AutoSys, Tidal, Stonebranch UAC, Redwood RunMyJobs, IBM Workload Scheduler
- **Adjacency:** ITOM, FIN, DATA-AI-PLAT, S2P
- **Candidate capabilities:** job definition, calendar scheduling, cross-system orchestration, SLA-based job monitoring, batch dependency management
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### NPM — Network Performance Monitoring

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (ITOM audit 2026-05-30)
- **Most recent:** 2026-05-30 (ITOM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 ITOM audit 2026-05-30
- **Vendor evidence:** SolarWinds NPM, Auvik, Kentik, ThousandEyes, LiveAction, Riverbed NetIM, Nagios XI
- **Adjacency:** ITOM, OBS, DCIM, AIOPS, SECOPS
- **Candidate capabilities:** flow telemetry collection, network device polling, path analytics, synthetic network testing, packet capture analysis
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (external data fetch); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TASK-MINING — Task Mining

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (PROC-MIN audit 2026-05-30)
- **Most recent:** 2026-05-30 (PROC-MIN audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PROC-MIN audit 2026-05-30
- **Vendor evidence:** UiPath Task Mining, Skan.ai, Microsoft Power Automate Process Mining (desktop activity), Celonis Task Mining, ABBYY Timeline (Desktop)
- **Adjacency:** PROC-MIN, RPA, EMP-EXP
- **Candidate capabilities:** desktop activity capture, task variant discovery, automation candidate scoring, time-and-motion analytics
- **Estimated Semantius score:** ~80% strict (auto-est.): mostly internal CRUD; external drag = ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ABM-PLATFORM — Account-Based Marketing Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (GTM-PLAN audit 2026-05-30)
- **Most recent:** 2026-05-30 (GTM-PLAN audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 GTM-PLAN audit 2026-05-30
- **Vendor evidence:** Demandbase, 6sense, RollWorks, Madison Logic, Terminus, Mutiny
- **Adjacency:** GTM-PLAN, MA, CRM, ACCT-PLAN, REV-INTEL
- **Candidate capabilities:** account-list construction, intent-data orchestration, account-based advertising, ICP enrichment, target-account engagement scoring, account-based personalization
- **Estimated Semantius score:** ~60% strict (auto-est.): mostly internal CRUD; external drag = external data fetch, ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CCAAS-WEM — Workforce Engagement Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CCAAS audit 2026-05-30)
- **Most recent:** 2026-05-30 (CCAAS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CCAAS audit 2026-05-30
- **Vendor evidence:** Verint, NICE WEM, Calabrio ONE, Genesys WEM, Aspect
- **Adjacency:** CCAAS, WFM, CSM
- **Candidate capabilities:** call recording, quality management, speech analytics, agent coaching, contact center workforce scheduling, agent gamification
- **Estimated Semantius score:** ~84% strict (auto-est.): mostly internal CRUD; external drag = non-email channel.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### NCCM — Network Configuration and Change Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (NPMD audit 2026-05-30)
- **Most recent:** 2026-05-30 (NPMD audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 NPMD audit 2026-05-30
- **Vendor evidence:** BackBox, NetBrain, SolarWinds NCM, Cisco DNA Center, Itential, Gluware
- **Adjacency:** NPMD, CMDB, ITOM, ITSM-CHANGE-MGMT
- **Candidate capabilities:** device config backup, golden-config baselining, compliance drift detection, change orchestration, rollback, vulnerability-aware patching
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SDWAN-ORCH — SD-WAN Orchestration and Observability

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (NPMD audit 2026-05-30)
- **Most recent:** 2026-05-30 (NPMD audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 NPMD audit 2026-05-30
- **Vendor evidence:** Cisco Catalyst SD-WAN (Viptela), VMware VeloCloud, Fortinet Secure SD-WAN, Versa, Aruba EdgeConnect, Cato Networks
- **Adjacency:** NPMD, ITOM, SECOPS, OBS
- **Candidate capabilities:** policy-based routing, transport SLA enforcement, application-aware path selection, tunnel health monitoring, edge appliance fleet management, zero-touch provisioning
- **Estimated Semantius score:** ~46% strict (auto-est.): device-fleet + tunnel telemetry.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### NETSEC-VIS — Network Detection and Response / Network Security Visibility

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (NPMD audit 2026-05-30)
- **Most recent:** 2026-05-30 (NPMD audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 NPMD audit 2026-05-30
- **Vendor evidence:** Darktrace, ExtraHop Reveal(x), Vectra AI, Corelight, Arista NDR (Awake), Cisco Secure Network Analytics (Stealthwatch)
- **Adjacency:** NPMD, SECOPS, SIEM, AIOPS
- **Candidate capabilities:** east-west traffic inspection, encrypted-traffic analytics, lateral-movement detection, behavioral baselines, MITRE ATT&CK mapping, packet capture forensics
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### API-SEC — API Security

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (APIM audit 2026-05-30)
- **Most recent:** 2026-05-30 (APIM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 APIM audit 2026-05-30
- **Vendor evidence:** Salt Security, Noname Security (Akamai), Traceable AI, Wallarm, 42Crunch
- **Adjacency:** APIM, SECOPS, VULN-MGMT
- **Candidate capabilities:** API discovery and inventory, runtime API attack detection, API schema and contract testing, sensitive-data exposure analysis on API traffic, business-logic abuse detection
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DEX-PLATFORM — Digital Employee Experience Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DEM audit 2026-05-30)
- **Most recent:** 2026-05-30 (DEM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DEM audit 2026-05-30
- **Vendor evidence:** Nexthink, 1E (TachyonOS), ControlUp Edge DX, Lakeside Software SysTrack, HappySignals, Riverbed Aternity
- **Adjacency:** DEM, UEM, EMP-EXP, ITSM
- **Candidate capabilities:** digital employee sentiment, employee-driven automation, persona-level experience scoring, IT self-service health, proactive sensor remediation, end-user productivity analytics
- **Estimated Semantius score:** ~60% strict (auto-est.): mostly internal CRUD; external drag = external data fetch, ML/AI compute.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### APM-MONITORING — Application Performance Monitoring

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DEM audit 2026-05-30)
- **Most recent:** 2026-05-30 (DEM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DEM audit 2026-05-30
- **Vendor evidence:** Datadog APM, Dynatrace, New Relic, AppDynamics (Splunk), Elastic APM, Honeycomb, Instana (IBM)
- **Adjacency:** DEM, OBS, AIOPS, ITSM
- **Candidate capabilities:** application transaction tracing, code-level diagnostics, service map auto-discovery, latency analytics, error tracking, business transaction monitoring
- **Estimated Semantius score:** ~55% strict (auto-est.): application transaction telemetry + auto-discovery.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SEC-RATINGS — Security Ratings and Cyber Risk Intelligence

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (TPRM audit 2026-05-30)
- **Most recent:** 2026-05-30 (TPRM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TPRM audit 2026-05-30
- **Vendor evidence:** BitSight, SecurityScorecard, RiskRecon (Mastercard), UpGuard, Black Kite
- **Adjacency:** TPRM, SUP-LIFE, GRC, SECOPS
- **Candidate capabilities:** external attack surface scoring, cyber rating per vendor domain, breach intelligence feeds, fourth-party discovery, security questionnaire augmentation
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### KYC-KYB — KYC and KYB Identity Verification

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (TPRM audit 2026-05-30)
- **Most recent:** 2026-05-30 (TPRM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 TPRM audit 2026-05-30
- **Vendor evidence:** Onfido, Persona, Trulioo, Middesk, Alloy, ComplyAdvantage
- **Adjacency:** TPRM, GRC, FIN-CRIME, IDV, S2P
- **Candidate capabilities:** individual identity verification, business identity verification, sanctions and PEP screening, beneficial-ownership lookup, ongoing screening, document verification
- **Estimated Semantius score:** ~62% strict (auto-est.): external sanctions/PEP/business-registry fetch + screening.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### APM-RELIABILITY — Asset Performance Management and Reliability

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (EAM audit 2026-05-30)
- **Most recent:** 2026-05-30 (EAM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EAM audit 2026-05-30
- **Vendor evidence:** AVEVA APM, GE Digital APM (SmartSignal), Aspen Mtell, Bentley AssetWise, Cognite Data Fusion
- **Adjacency:** EAM, MFG-OPS, GRC
- **Candidate capabilities:** predictive maintenance analytics, condition monitoring, failure mode and effects analysis, reliability centered maintenance, asset health scoring, anomaly detection
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### IIOT-PLATFORM — Industrial IoT Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (EAM audit 2026-05-30)
- **Most recent:** 2026-05-30 (EAM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EAM audit 2026-05-30
- **Vendor evidence:** PTC ThingWorx, Siemens MindSphere/Insights Hub, AWS IoT SiteWise, Cognite Data Fusion, GE Digital Predix
- **Adjacency:** EAM, MFG-OPS, APM-RELIABILITY
- **Candidate capabilities:** industrial telemetry ingestion, OT-IT data integration, edge gateway management, time-series data store, digital twin orchestration
- **Estimated Semantius score:** ~37% strict (auto-est.): external action is the product (device/IoT telemetry, external data fetch); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PTW-LOTO — Permit to Work and Lockout-Tagout Safety

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (EAM audit 2026-05-30)
- **Most recent:** 2026-05-30 (EAM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EAM audit 2026-05-30
- **Vendor evidence:** Intelex EHSQ, Sphera Operational Risk, Enablon, Cority PTW, Salus
- **Adjacency:** EAM, GRC, MFG-OPS
- **Candidate capabilities:** permit issuance and approval, hazardous energy isolation, lockout-tagout procedures, confined-space entry, hot work permits, safety briefings
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ENERGY-MGMT — Energy and Utility Cost Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (CAFM audit 2026-05-30)
- **Most recent:** 2026-05-30 (CAFM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CAFM audit 2026-05-30
- **Vendor evidence:** ENGIE Impact, Schneider Resource Advisor, Accruent Lucernex Utility, Eptura Sustainability, Watershed
- **Adjacency:** CAFM, REAL-EST, IWMS, EAM, EHS-MGMT, UTIL-OPS
- **Candidate capabilities:** utility-meter ingestion, energy-cost analytics, demand-response automation, sustainability and carbon reporting, scope-2 emissions ledger
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (external data fetch); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### KUBE-COST — Kubernetes Cost Allocation Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FINOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (FINOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FINOPS audit 2026-05-30
- **Vendor evidence:** Kubecost, CloudHealth Kubernetes Cost, Cloudability Kubernetes, Vantage Kubernetes
- **Adjacency:** FINOPS, APP-PAAS, ITAM
- **Candidate capabilities:** workload-level cost allocation, namespace-scoped cost, shared-cluster fair-share, idle-resource detection, in-cluster recommendations
- **Estimated Semantius score:** ~66% strict (auto-est.): cost accounting on k8s, not running infra.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CARBON-FOOTPRINT — Cloud Carbon Footprint Accounting

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FINOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (FINOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FINOPS audit 2026-05-30
- **Vendor evidence:** Watershed, Persefoni, AWS Customer Carbon Footprint Tool, Azure Emissions Impact Dashboard, Google Cloud Carbon Footprint
- **Adjacency:** FINOPS, ESG
- **Candidate capabilities:** Scope 2 / Scope 3 emissions, cloud-provider emissions ingestion, FOCUS-aligned carbon allocation, carbon vs cost overlay, GHG Protocol reporting
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CLOUD-COMMIT-OPTIM — Cloud Commitment Optimization

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FINOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (FINOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FINOPS audit 2026-05-30
- **Vendor evidence:** ProsperOps, ZestyCloud, Spot by NetApp, Archera
- **Adjacency:** FINOPS, ITAM, FIN
- **Candidate capabilities:** Reserved Instance management, Savings Plan optimization, algorithmic commitment ladder, commitment-savings attribution, autonomous commitment management
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### FINOPS-UNIT-ECON — Cloud Unit Economics Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FINOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (FINOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FINOPS audit 2026-05-30
- **Vendor evidence:** CloudZero, Vantage Unit Economics, Finout MegaBill
- **Adjacency:** FINOPS, BI, EPM
- **Candidate capabilities:** cost-per-customer, cost-per-feature, cost-per-transaction, unit-cost KPI definitions, COGS attribution
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EASM — External Attack Surface Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (VULN-MGMT audit 2026-05-30)
- **Most recent:** 2026-06-17 (Qualys coverage review 2026-06-17)
- **Surfaced by:**
  - 2026-05-30 VULN-MGMT audit 2026-05-30
  - 2026-06-17 Qualys coverage review 2026-06-17
- **Vendor evidence:** Censys, Palo Alto Cortex Xpanse, Microsoft Defender EASM, BitSight, SecurityScorecard External, Tenable Attack Surface Management
- **Adjacency:** VULN-MGMT, ASM, TPRM, SECOPS, THREAT-INTEL
- **Candidate capabilities:** internet-asset discovery, shadow IT and forgotten domain inventory, third-party exposure scoring, takeover-risk detection, certificate and DNS posture, leaked credential and breach monitoring
- **Estimated Semantius score:** ~30% strict (est.): external-discovery fetch and exposure-scoring compute dominate; only the asset-inventory store is CRUD
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SIEM — Security Information and Event Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (THREAT-INTEL audit 2026-05-30)
- **Most recent:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 THREAT-INTEL audit 2026-05-30
  - 2026-05-30 SECOPS audit 2026-05-30
- **Vendor evidence:** Splunk Enterprise Security, Microsoft Sentinel, IBM QRadar, Securonix, Exabeam, Sumo Logic, Elastic Security, Chronicle (Google SecOps)
- **Adjacency:** THREAT-INTEL, SECOPS, SOAR, XDR, DLP, VULN-MGMT
- **Candidate capabilities:** log aggregation, correlation rule authoring, security analytics, alert triage, UEBA-light, compliance reporting, threat hunting workbench
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (external data fetch); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PTAAS — Penetration Testing as a Service

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (VULN-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (VULN-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 VULN-MGMT audit 2026-05-30
- **Vendor evidence:** Synack, Cobalt.io, HackerOne, Bugcrowd, NetSPI, Pentera, Horizon3.ai NodeZero
- **Adjacency:** VULN-MGMT, SECOPS, GRC, AUDIT
- **Candidate capabilities:** pentest engagement orchestration, autonomous and continuous pentesting, vulnerability triage and validation, retest workflow, bug-bounty program management, exploit proof-of-concept handoff to remediation
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### XDR — Extended Detection and Response

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (THREAT-INTEL audit 2026-05-30)
- **Most recent:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 THREAT-INTEL audit 2026-05-30
  - 2026-05-30 SECOPS audit 2026-05-30
- **Vendor evidence:** Palo Alto Cortex XDR, CrowdStrike Falcon Insight XDR, Microsoft Defender XDR, SentinelOne Singularity XDR, Trellix XDR, Trend Micro Vision One
- **Adjacency:** THREAT-INTEL, SECOPS, SOAR, SIEM, EDR
- **Candidate capabilities:** cross-surface telemetry correlation, behavioral analytics, attack-chain reconstruction, automated response actions, threat-intel integration
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CTEM — Continuous Threat Exposure Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (VULN-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (VULN-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 VULN-MGMT audit 2026-05-30
- **Vendor evidence:** XM Cyber, Picus Security, Cymulate, AttackIQ, Pentera, SafeBreach, Mandiant Attack Surface Management
- **Adjacency:** VULN-MGMT, EASM, SECOPS, THREAT-INTEL, GRC
- **Candidate capabilities:** attack-path analysis, breach and attack simulation, control validation, prioritised remediation routing on real exploitability, scoping and assessment of exposure programs
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (external data fetch); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DRP — Digital Risk Protection

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (THREAT-INTEL audit 2026-05-30)
- **Most recent:** 2026-05-30 (THREAT-INTEL audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 THREAT-INTEL audit 2026-05-30
- **Vendor evidence:** ZeroFox, Digital Shadows (ReliaQuest), Recorded Future Brand Intelligence, Mandiant Digital Threat Monitoring, IntSights (Rapid7), CybelAngel
- **Adjacency:** THREAT-INTEL, SECOPS, BRAND-MGMT
- **Candidate capabilities:** external attack surface monitoring, brand impersonation detection, dark-web credential leak monitoring, takedown coordination, phishing-domain surveillance, executive protection monitoring
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### VULN-INTEL — Vulnerability Intelligence and Risk Prioritization

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (VULN-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (VULN-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 VULN-MGMT audit 2026-05-30
- **Vendor evidence:** Mandiant Vulnerability Intelligence, Recorded Future Vulnerability Intelligence, Flashpoint, Vulncheck, Tenable Vulnerability Intelligence, Rapid7 Threat Command, Qualys TruRisk
- **Adjacency:** VULN-MGMT, THREAT-INTEL, SECOPS, GRC
- **Candidate capabilities:** exploit-in-the-wild feeds, CISA KEV ingestion, EPSS scoring, threat-actor and campaign linkage to CVEs, custom risk scoring with environmental factors, advisory enrichment
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### BRAND-PORTAL — Brand Portal and Brand Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DAM audit 2026-05-30)
- **Most recent:** 2026-05-30 (DAM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DAM audit 2026-05-30
- **Vendor evidence:** Frontify, Bynder Brand Guidelines, Brandfolder Brand Guidelines, Lingo by Noun Project, Brandworkz, Templafy
- **Adjacency:** DAM, MRM, AGENCY-MGMT, HCMS
- **Candidate capabilities:** brand guideline portal, brand asset distribution to external partners, brand template gallery, logo and color usage policies, brand compliance enforcement, partner enablement
- **Estimated Semantius score:** ~76% strict (auto-est.): mostly internal CRUD; external drag = external data fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### UEBA — User and Entity Behavior Analytics

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SECOPS audit 2026-05-30
- **Vendor evidence:** Exabeam, Securonix, Splunk UBA, Microsoft Defender for Identity, IBM QRadar UBA, Gurucul, Varonis
- **Adjacency:** SECOPS, SIEM, XDR, IGA, DLP
- **Candidate capabilities:** behavioral baselining, peer-group analytics, risk scoring per user/entity, anomalous session detection, insider-threat detection
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MDR — Managed Detection and Response

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SECOPS audit 2026-05-30
- **Vendor evidence:** CrowdStrike Falcon Complete, Arctic Wolf, Red Canary, Expel, Sophos MDR, SentinelOne Vigilance, Rapid7 MDR, Secureworks Taegis Managed XDR
- **Adjacency:** SECOPS, EDR, XDR, SIEM, SOAR
- **Candidate capabilities:** 24x7 monitoring as a service, managed threat hunting, customer-tenant case management, escalation runbooks, MDR analyst notes, response approval workflows
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### NDR — Network Detection and Response

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SECOPS audit 2026-05-30
- **Vendor evidence:** Darktrace, ExtraHop Reveal(x), Vectra AI, Corelight, Cisco Secure Network Analytics (Stealthwatch), Arista NDR
- **Adjacency:** SECOPS, NPMD, XDR, SIEM
- **Candidate capabilities:** network metadata extraction, encrypted-traffic analytics, lateral-movement detection, east-west visibility, deception integration
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DFIR — Digital Forensics and Incident Response

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SECOPS audit 2026-05-30
- **Vendor evidence:** Magnet AXIOM, Cellebrite, OpenText EnCase, Cado Security, Velociraptor, FireEye/Mandiant (Trellix), KAPE
- **Adjacency:** SECOPS, IR, LEGAL-PRACT-MGMT, AUDIT
- **Candidate capabilities:** forensic image acquisition, chain-of-custody management, timeline reconstruction, malware artifact analysis, evidence vault, expert-witness reporting
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### IR-MGMT — Security Incident Response Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SECOPS audit 2026-05-30
- **Vendor evidence:** Resilient (IBM SOAR), ServiceNow Security Incident Response, Palo Alto XSOAR, Splunk SOAR, D3 Security, TheHive Project, Tines, Swimlane
- **Adjacency:** SECOPS, SOAR, ITSM, LEGAL-PRACT-MGMT, GRC, PRIV-MGMT
- **Candidate capabilities:** case management for security incidents, playbook execution, breach notification workflow, post-incident review, regulator notification tracking, IR retainer fulfillment
- **Estimated Semantius score:** ~50% strict (auto-est.): external action is the product (external data fetch); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### BAS — Breach and Attack Simulation

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SECOPS audit 2026-05-30
- **Vendor evidence:** AttackIQ, Cymulate, SafeBreach, Picus Security, XM Cyber, Mandiant Security Validation
- **Adjacency:** SECOPS, VULN-MGMT, CTEM, GRC
- **Candidate capabilities:** continuous control validation, attack-scenario library, MITRE ATT&CK coverage scoring, automated red-team campaigns, exposure-to-control mapping
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (external data fetch, ML/AI compute); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SOC-AAS — SOC as a Service

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Most recent:** 2026-05-30 (SECOPS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SECOPS audit 2026-05-30
- **Vendor evidence:** Arctic Wolf, eSentire, deepwatch, Trustwave, Critical Start, Pondurance, Alert Logic
- **Adjacency:** SECOPS, MDR, SIEM, XDR
- **Candidate capabilities:** outsourced SOC operations, tenant onboarding, shared analyst pool case routing, customer-portal incident visibility, SLA-bound triage commitments
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TCMA — Through-Channel Marketing Automation

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (PRM audit 2026-05-30)
- **Most recent:** 2026-05-30 (PRM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PRM audit 2026-05-30
- **Vendor evidence:** Zift Solutions, Sproutloud, Impartner TCMA, Mindmatrix, Structured Web
- **Adjacency:** PRM, MA, CRM
- **Candidate capabilities:** co-branded asset distribution, partner-led campaign syndication, partner email and social automation, lead distribution to partners, MDF claim workflows
- **Estimated Semantius score:** ~76% strict (auto-est.): mostly internal CRUD; external drag = external data fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ECOSYSTEM-LED-GROWTH — Ecosystem-Led Growth and Partner Co-Selling

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (PRM audit 2026-05-30)
- **Most recent:** 2026-05-30 (PRM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PRM audit 2026-05-30
- **Vendor evidence:** Crossbeam, Reveal, PartnerTap, Partnered
- **Adjacency:** PRM, CRM, SALES-PERF, REV-INTEL
- **Candidate capabilities:** partner account mapping, overlap analysis, co-sell signal sharing, partner-sourced pipeline attribution, ecosystem revenue analytics
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### AFFILIATE-MGMT — Affiliate Marketing Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (PRM audit 2026-05-30)
- **Most recent:** 2026-05-30 (PRM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PRM audit 2026-05-30
- **Vendor evidence:** Impact.com, PartnerStack, Everflow, Refersion, CJ Affiliate, Awin, Rakuten Advertising
- **Adjacency:** PRM, MA, LOYALTY, B2C-COMM
- **Candidate capabilities:** affiliate recruitment, tracking link generation, conversion attribution, commission and payout automation, fraud detection on affiliate traffic
- **Estimated Semantius score:** ~43% strict (auto-est.): external action is the product (ML/AI compute, payment/settlement); thin internal store.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### ETHICS-INTAKE — Ethics & Whistleblower Intake

- **Mention count:** 1
- **First surfaced:** 2026-06-09 (HRSD audit 2026-06-09)
- **Most recent:** 2026-06-09 (HRSD audit 2026-06-09)
- **Surfaced by:**
  - 2026-06-09 HRSD audit 2026-06-09
- **Vendor evidence:** NAVEX EthicsPoint, OneTrust Ethics (Convercent), AllVoices, People Intouch SpeakUp, EQS Integrity Line, Whispli, Vault Platform
- **Adjacency:** HRSD, GRC, LEGAL, AUDIT
- **Candidate capabilities:** anonymous report intake, multi-channel hotline, investigation case management, anonymized reporter follow-up, regulatory disclosure tracking
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DAP — Digital Adoption Platform

- **Mention count:** 1
- **First surfaced:** 2026-06-16 (DAP scoping 2026-06-16)
- **Most recent:** 2026-06-16 (DAP scoping 2026-06-16)
- **Surfaced by:**
  - 2026-06-16 DAP scoping 2026-06-16
- **Vendor evidence:** WalkMe, Whatfix, Pendo (Adopt), Userpilot, Appcues, Userlane, Chameleon, Gainsight PX
- **Adjacency:** ONBOARDING, LMS, KMS, SOP-MGMT (candidate), DXP, DEM, CSM, EMP-EXP, Product Analytics (gap)
- **Candidate capabilities:** in-app guided walkthroughs, tooltips and hotspots, onboarding checklists, in-app surveys (NPS/CES), resource center / help widget, in-app announcements, audience segmentation, adoption analytics
- **Estimated Semantius score:** ~96% strict (auto-est.): internal record/CRUD core; query/mutate + email/notify/webhook are platform-tier, no material external compute/fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PROD-ANALYTICS — Product Analytics

- **Mention count:** 1
- **First surfaced:** 2026-06-16 (PROD-ANALYTICS scoping 2026-06-16 (gap flagged by DAP scoping))
- **Most recent:** 2026-06-16 (PROD-ANALYTICS scoping 2026-06-16 (gap flagged by DAP scoping))
- **Surfaced by:**
  - 2026-06-16 PROD-ANALYTICS scoping 2026-06-16 (gap flagged by DAP scoping)
- **Vendor evidence:** Amplitude, Mixpanel, Heap, PostHog, June, Kubit, Pendo, Statsig
- **Adjacency:** BI, PROD-MGMT, CDP, DAP (candidate), DXP, DEM
- **Candidate capabilities:** product instrumentation, feature-usage events, funnel analysis, retention and cohort analysis, user path analysis, behavioral segmentation, experimentation/A-B testing, session replay
- **Estimated Semantius score:** ~76% strict (auto-est.): mostly internal CRUD; external drag = external data fetch.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DAST — Dynamic Application Security Testing (Web Application Scanning)

- **Mention count:** 1
- **First surfaced:** 2026-06-17 (Qualys coverage review 2026-06-17)
- **Most recent:** 2026-06-17 (Qualys coverage review 2026-06-17)
- **Surfaced by:**
  - 2026-06-17 Qualys coverage review 2026-06-17
- **Vendor evidence:** Qualys WAS, Invicti, Checkmarx DAST, Rapid7 InsightAppSec, Veracode DAST, PortSwigger Burp Suite Enterprise
- **Adjacency:** VULN-MGMT, APPSEC-ORCH, SECOPS
- **Candidate capabilities:** authenticated web crawling, OWASP Top 10 detection, API and REST scanning, dynamic vulnerability validation, scan scheduling, progressive scan tuning
- **Estimated Semantius score:** ~25% strict (est.): scan side-effect, response-analysis compute, and crawl fetch dominate; thin findings and scan-config store
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CXM — Customer Experience Management (Voice of Customer)

- **Mention count:** 1
- **First surfaced:** 2026-06-17 (Qualtrics coverage review 2026-06-17)
- **Most recent:** 2026-06-17 (Qualtrics coverage review 2026-06-17)
- **Surfaced by:**
  - 2026-06-17 Qualtrics coverage review 2026-06-17
- **Vendor evidence:** Qualtrics CustomerXM, Medallia, InMoment, Sprinklr Service, SurveyMonkey/Momentive (GetFeedback), Forsta (Press Ganey), Verint, NICE Satmetrix
- **Adjacency:** CRM, CDP, CSM, LOYALTY, EMP-EXP
- **Candidate capabilities:** voice-of-customer surveys, NPS/CSAT/CES tracking, closed-loop feedback, journey analytics, verbatim text analytics, omnichannel feedback collection, role-based CX dashboards
- **Estimated Semantius score:** ~70-80% strict (est.): survey/CX-metric CRUD + response intake (receive_webhook) + send_email/notify_person are platform-tier; external drag = detect_sentiment, classify_text, generate_text, send_sms. operational ~= strict (no integration-tier tools).
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MARKET-RESEARCH — Market Research and Insights Platform

- **Mention count:** 1
- **First surfaced:** 2026-06-17 (Qualtrics coverage review 2026-06-17)
- **Most recent:** 2026-06-17 (Qualtrics coverage review 2026-06-17)
- **Surfaced by:**
  - 2026-06-17 Qualtrics coverage review 2026-06-17
- **Vendor evidence:** Qualtrics Strategy and Research (CoreXM), SurveyMonkey/Momentive, Forsta (FocusVision/Confirmit), Alchemer, Dynata, Suzy, Quantilope, Remesh
- **Adjacency:** PROD-MGMT, CXM, MA, CDP
- **Candidate capabilities:** survey design and scripting, panel and sample management, conjoint and maxdiff, ad and brand tracking studies, statistical analysis, verbatim coding, study and report generation
- **Estimated Semantius score:** ~60-72% strict (est.): study/panel/instrument CRUD + send_email platform; external drag = statistical compute (conjoint/maxdiff/regression), classify_text, generate_text, external panel fetch, send_sms. Lowest of the XM markets (adds external panel data + stats compute).
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PRODUCT-XM — Product Experience Management

- **Mention count:** 1
- **First surfaced:** 2026-06-17 (Qualtrics coverage review 2026-06-17)
- **Most recent:** 2026-06-17 (Qualtrics coverage review 2026-06-17)
- **Surfaced by:**
  - 2026-06-17 Qualtrics coverage review 2026-06-17
- **Vendor evidence:** Qualtrics ProductXM, Sprig, Maze, UserTesting, Pendo Feedback, Productboard, Dovetail
- **Adjacency:** PROD-MGMT, CXM, MARKET-RESEARCH, DAP
- **Candidate capabilities:** in-product feedback and surveys, concept and feature testing, product-feedback aggregation, prioritization signals, usability research
- **Estimated Semantius score:** ~72-82% strict (est.): feedback/concept-test CRUD + send_email + receive_webhook + notify_person platform; external drag = detect_sentiment, classify_text, generate_text. Fold risk into PROD-MGMT customer-feedback-aggregation capability, flag at triage.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CUSTOMER-SUCCESS — Customer Success Management

- **Mention count:** 1
- **First surfaced:** 2026-06-18 (SmartSuite products review 2026-06-18)
- **Most recent:** 2026-06-18 (SmartSuite products review 2026-06-18)
- **Surfaced by:**
  - 2026-06-18 SmartSuite products review 2026-06-18
- **Vendor evidence:** Gainsight, ChurnZero, Totango, Catalyst, Planhat, Vitally
- **Adjacency:** CSM, CRM, SUB-MGMT, REV-INTEL, WORK-MGMT
- **Candidate capabilities:** customer health scoring, success plans, QBR management, churn-risk detection, renewal management, playbook execution, product-usage analysis
- **Estimated Semantius score:** ~75% strict (est.): success plans / playbooks / renewals are internal CRUD, but external drag = product-usage telemetry fetch, health-score compute, customer email + QBR doc-gen.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SIS — Student Information System

- **Mention count:** 1
- **First surfaced:** 2026-06-18 (SmartSuite products review 2026-06-18)
- **Most recent:** 2026-06-18 (SmartSuite products review 2026-06-18)
- **Surfaced by:**
  - 2026-06-18 SmartSuite products review 2026-06-18
- **Vendor evidence:** Ellucian Banner/Colleague, Workday Student, Anthology, Jenzabar, Oracle Student Cloud
- **Adjacency:** LMS, HCM, FIN, LIB-MGMT, WORK-MGMT
- **Candidate capabilities:** student records, admissions, enrollment and registration, curriculum and scheduling, grades and transcripts, financial aid, advising and case management, accreditation tracking
- **Estimated Semantius score:** ~85% strict (est.): records + enrollment lifecycle are platform CRUD; external drag = student notifications/email + tuition/financial-aid payment.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### RESEARCH-ADMIN — Research Administration and Grants Management

- **Mention count:** 1
- **First surfaced:** 2026-06-18 (SmartSuite products review 2026-06-18)
- **Most recent:** 2026-06-18 (SmartSuite products review 2026-06-18)
- **Surfaced by:**
  - 2026-06-18 SmartSuite products review 2026-06-18
- **Vendor evidence:** Cayuse, Kuali Research, Huron Click, Streamlyne, InfoEd Global
- **Adjacency:** SIS, FIN, GRC, AUDIT, WORK-MGMT
- **Candidate capabilities:** grant proposal preparation, budget development, pre-award submission, award setup, post-award spend tracking, effort certification, subaward management, research compliance
- **Estimated Semantius score:** ~90% strict (est.): proposal/award/compliance records + approval workflows are internal CRUD; external drag = email/notify + document generation. Distinct from PS-GRANTS-MGMT (grant-making/disbursing side); this is the grantee/research-org side.
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### PHYS-SEC-OPS — Physical Security Operations and Incident Management

- **Mention count:** 1
- **First surfaced:** 2026-06-18 (SmartSuite products review 2026-06-18)
- **Most recent:** 2026-06-18 (SmartSuite products review 2026-06-18)
- **Surfaced by:**
  - 2026-06-18 SmartSuite products review 2026-06-18
- **Vendor evidence:** Resolver, Ontic, Everbridge, AlertEnterprise, Trackforce Valiant
- **Adjacency:** OP-RES, VIS-MGMT, PACS, GRC, EHS
- **Candidate capabilities:** security incident reporting, investigations and case management, guard tour management, threat assessment, post orders, watchlists and BOLO, mass-notification tie-in
- **Estimated Semantius score:** ~88% strict (est.): incident/investigation/case records + workflow are platform CRUD; external drag = mass-notification channels and optional sensor/access feeds. May fold into OP-RES at triage. Distinct from PACS (access-control device telemetry).
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SPEND-ANALYTICS — Spend Analytics

- **Mention count:** 1
- **First surfaced:** 2026-06-19 (Ariba coverage review 2026-06-19)
- **Most recent:** 2026-06-19 (Ariba coverage review 2026-06-19)
- **Surfaced by:**
  - 2026-06-19 Ariba coverage review 2026-06-19
- **Vendor evidence:** Sievo, SpendHQ, Simfoni, SAP Ariba Spend Analysis
- **Adjacency:** S2P, SPEND-MGMT, SRM, FIN, AP-AUTO
- **Candidate capabilities:** spend classification, supplier normalization, spend cube snapshots, savings opportunity and initiative tracking, addressable and tail-spend segmentation, diverse-spend and scope-3 reporting
- **Estimated Semantius score:** ~85% strict (est.): classification, normalization, and savings-funnel records are internal CRUD over consumed PO, invoice, and GL data; external drag is supplier-enrichment fetch (D&B) plus optional ML auto-classification. Phase 0 (2026-06-19) concluded it QUALIFIES as a derive-heavy domain; report in .tmp_deploy/SPEND-ANALYTICS-phase0-2026-06-19.md
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_


---

## Promoted

> Note: "promote-as-domain" here means research is complete and the candidate passes the point-solution-market test. It is a RECOMMENDATION. No Phase A load has been performed. Per Rule #21, new domains are market-shape decisions and are never auto-loaded; loading awaits explicit user approval.

### TRAVEL-MGMT: Corporate Travel Management

- **Mention count:** 2
- **Surfaced by:** SPEND-MGMT audit 2026-05-30, EXPENSE audit 2026-05-30
- **Vendor evidence:** Navan (formerly TripActions; IPO Nasdaq NAVN Oct 2025), SAP Concur Travel (SAP since 2014), Spotnana (pure-play travel infrastructure), American Express Global Business Travel (NYSE GBTG; absorbed Egencia 2021, completed CWT acquisition Sep 2025), BCD Travel. Egencia and CWT are no longer independent (both inside Amex GBT).
- **Adjacency:** SPEND-MGMT, EXPENSE, HCM
- **Candidate capabilities:** travel booking, itinerary management, traveler safety / duty-of-care, hotel and air sourcing, policy-aware shopping, trip approvals, traveler profile management
- **Point-solution-market test:** PASSES. At least four independent vendors field a flagship corporate-travel product, including pure-play infrastructure vendor Spotnana with zero expense functionality (Navan, SAP Concur, Spotnana, Amex GBT).
- **Decision:** promote-as-domain (2026-06-14). Proposed domain_code TRAVEL-MGMT. NOT yet loaded; Phase A awaits explicit user approval.
- **Rationale:** Corporate travel has a core entity surface (trips, itineraries, bookings, fare/hotel inventory, traveler profiles, travel policies, duty-of-care alerts) that exists in no current catalog domain and is not reducible to EXPENSE (consumes the resulting charges only) or SPEND-MGMT (card authorization). T&E bundling at Navan / SAP Concur is go-to-market packaging, not market identity, exactly as the catalog already separates EXPENSE from SPEND-MGMT. Duty-of-care, GDPR traveler data, and IATA NDC form a market-defining compliance surface with no home elsewhere.
- **Proposed domains metadata:** full Phase 0 estimates in the report. Caveat: usa_market_size_usd_m (~3500) is an unsourced order-of-magnitude placeholder and needs a dedicated market-sizing pass before any value is loaded.
- **Non-blocking follow-ups (b3, not executed):** standalone duty-of-care / travel-risk capability node (spans travel plus broader employee safety, e.g. International SOS); embedded-travel / travel-API capability pattern (Spotnana model); reconcile EXPENSE's existing "travel-booking integration" phrasing against the new domain at the spend seam.
- **Phase 0 report:** .tmp_deploy/TRAVEL-MGMT-phase0-2026-06-14.md
- **Build status:** BUILT and loaded at record_status='new' on 2026-06-14 as domain id 172 (4 full modules). Audit artifacts at audits/TRAVEL-MGMT/ (state.yaml, history.md, q-TRAVEL-MGMT.md). Open q-file forks: duty-of-care module split, PCI-DSS, TAM sourcing, custom travel APQC processes for RACI.

### MRM: Marketing Resource Management

- **Mention count:** 2
- **Surfaced by:** AGENCY-MGMT audit 2026-05-30, DAM audit 2026-05-30
- **Vendor evidence:** Uptempo (BrandMaker + Allocadia + Hive9, rebranded 2022), Aprimo (now positions as agentic DAM / content lifecycle), Planful for Marketing (formerly Plannuh, acquired by Planful 2022), Adobe Workfront (positioned as Work Management), Sitecore Content Hub MRM module, Wedia / Infor MRM. Correction to the original candidate note: Allocadia and Plannuh did NOT merge; Uptempo = BrandMaker + Allocadia + Hive9, while Plannuh went to Planful separately.
- **Adjacency:** AGENCY-MGMT, WORK-MGMT, DAM, MA (the PMM and ADV-AD-TECH adjacencies are not in the catalog)
- **Candidate capabilities:** marketing campaign planning, marketing budget allocation, marketing project orchestration, brand asset workflow, marketing performance measurement
- **Point-solution-market test:** BORDERLINE-PASS on a narrow reading. Only Uptempo is unambiguously an independent vendor whose flagship is MRM today; Planful for Marketing is now an FP&A module, Aprimo has repositioned toward DAM, and Workfront / Sitecore Content Hub / Infor MRM are suite modules.
- **Decision:** promote-as-domain (2026-06-14), scoped narrowly to the marketing planning + budget kernel. Fallback if the kernel proves too thin: fold-into-existing:WORK-MGMT. Proposed domain_code MRM. NOT yet loaded; Phase A awaits explicit user approval.
- **Rationale:** A defensible kernel (marketing plan + budget allocation + spend-to-plan reconciliation) is owned by no current domain: WORK-MGMT covers only the marketing-work half, DAM only the asset half, MA the execution half. At least one independent flagship (Uptempo) sells exactly the budget-orchestration kernel. Gartner-observed convergence is pulling the work and asset halves into WORK-MGMT and DAM-led suites, so MRM should be promoted scoped tightly to the planning/budget core, referencing DAM for assets and MA for execution rather than re-implementing generic work management.
- **Proposed domains metadata:** see the Phase 0 report for the seven-field estimate.
- **Non-blocking follow-ups (b3, not executed):** (1) PMM (Product Marketing Management) is a separate uncatalogued candidate that warrants its own Phase 0. (2) Data-hygiene flag: ADV-AD-TECH is listed as an adjacency but is absent from the catalog. (3) On load, encode MRM to DAM (asset) and MRM to MA (execution) cross-references to mark the convergence boundary.
- **Phase 0 report:** .tmp_deploy/MRM-phase0-2026-06-14.md
- **Build status:** BUILT and loaded at record_status='new' on 2026-06-14 as domain id 173 (modules MRM-PLANNING, MRM-BUDGET). Audit artifacts at audits/MRM/. GATE decision still open in q-MRM.md: keep narrow-kernel MRM vs fold into WORK-MGMT.

### EHS: Environmental, Health and Safety Management

- **Mention count:** 2 (queued as candidate code EHS-MGMT; built with the shorter domain_code EHS to match the ESG / GRC short-code convention)
- **Surfaced by:** REAL-EST audit 2026-05-30, FSQM audit 2026-05-30
- **Vendor evidence:** Cority (Thoma Bravo), Intelex (Fortive), Sphera (Blackstone), Enablon (Wolters Kluwer), VelocityEHS, Benchmark Gensuite. ETQ Reliance (Hexagon) is QMS-flagship with EHS secondary, counted as adjacent evidence.
- **Adjacency:** REAL-EST, ESG, IWMS, GRC, FSQM
- **Candidate capabilities:** incident management, hazard analysis, regulatory permit tracking, health surveillance, OSHA/EU-OSHA reporting, contractor safety, audit and inspections
- **Point-solution-market test:** PASSES decisively (Cority, VelocityEHS, Benchmark Gensuite independent flagships; Enablon / Sphera / Intelex sponsor-owned flagships; Verdantix benchmarks 22 vendors).
- **Decision:** promote-as-domain (2026-06-14). Built with domain_code EHS.
- **Build status:** BUILT and loaded at record_status='new' on 2026-06-14 as domain id 174. 11 capabilities, 4 full modules (SAFETY-INCIDENT, INDUSTRIAL-HYGIENE, ENV-COMPLIANCE, AUDIT-INSPECTION), 15 masters, 5 regulations (OSHA, ISO 45001, ISO 14001, REACH, EPA-EPCRA), system skill ehs-system, 4 personas with RACI wired to real PCF nodes. Audit artifacts at audits/EHS/. Open b2 forks (module split, owner function, EHS to ESG edge) in q-EHS.md.
- **Rationale:** EHS is a long-standing, separately benchmarked enterprise market upstream of ESG (supplies incident / environmental data to disclosure), not a subset of it; distinct buyer and regulated-entity set; does not fold into ESG / GRC / FSQM.
- **Phase 0 report:** .tmp_deploy/EHS-MGMT-phase0-2026-06-14.md

### LEASE-ACCT: Lease Accounting and Administration

- **Mention count:** 2
- **Surfaced by:** REAL-EST audit 2026-05-30, RE-CRE audit 2026-05-30
- **Vendor evidence:** FinQuery (product still sold as LeaseQuery; company rebranded from LeaseQuery 2024-02), Trullion, Occupier (three independent pure-plays). Suite players CoStar Real Estate Manager, Nakisa / SAP, Accruent Lucernex, IBM TRIRIGA are modules. M&A: Visual Lease to CoStar (2024-11); EZLease + LeaseAccelerator to insightsoftware (2024-07).
- **Adjacency:** REAL-EST, RE-CRE, FINOPS, ACCT-PLAN, RECRD-MGMT
- **Candidate capabilities:** ASC 842 compliance, IFRS 16 compliance, lease classification, ROU asset calculation, lease modification accounting, disclosure reporting
- **Point-solution-market test:** PASSES (FinQuery, Trullion, Occupier are independent pure-plays whose flagship IS lease accounting).
- **Decision:** promote-as-domain (2026-06-14).
- **Build status:** BUILT and loaded at record_status='new' on 2026-06-14 as domain id 175 (modules LEASE-ACCT-ACCOUNTING, LEASE-ACCT-ADMINISTRATION). 7 capabilities, 10 masters, regulations ASC-842 / IFRS-16 / SOX, system skill lease-acct-system, 3 personas with RACI on real PCF finance nodes (9.3.x). Audit artifacts at audits/LEASE-ACCT/. Open q-file forks: lease-administration mastering vs thinning to consume REAL-EST / RE-CRE; whether to add consumer DMDO links to REAL-EST / RE-CRE leases.
- **Rationale:** The ASC 842 / IFRS 16 accounting kernel (ROU assets, lease liabilities, classification, disclosures) is owned by no existing domain: REAL-EST holds leases as workplace records, RE-CRE is landlord-side commercial leases, FINOPS is cloud spend, ACCT-PLAN is a name collision (sales account planning). Distinct compliance-driven market.
- **Phase 0 report:** .tmp_deploy/LEASE-ACCT-phase0-2026-06-14.md

### LIVESTOCK-MGMT: Livestock Management

- **Mention count:** 1
- **Surfaced by:** FMIS audit 2026-05-30
- **Vendor evidence:** AgriWebb (URUS Group, close Q3 2026), Herdwatch (independent; acquired VetDrive Jan 2026), MaiaGrazing (Atlas Ag, succeeded by Atlas Grazing), CattleMax, Performance Beef / Performance Livestock Analytics (Zoetis 2020). Datamars / Tru-Test + Gallagher supply the EID / weigh data layer.
- **Adjacency:** FMIS, FOOD-TRACE, FSQM, DAIRY-MGMT
- **Candidate capabilities:** paddock and mob management, individual-animal records, mob movements, weight gains, pasture allocation, breeding records, treatment records, livestock-traceability identifiers
- **Point-solution-market test:** PASSES. General livestock / grazing management (beef, sheep, cattle, mixed grazing) is a distinct SMB-farm software market, not a fold into FMIS (crop / whole-farm) or DAIRY-MGMT (dairy vertical).
- **Decision:** promote-as-domain (2026-06-14).
- **Build status:** BUILT and loaded at record_status='new' on 2026-06-14 as domain id 176 (modules LIVESTOCK-MGMT-HERD, LIVESTOCK-MGMT-GRAZING). 8 capabilities, 11 masters, system skill livestock-mgmt-system, 3 personas. process_raci deferred (no cross-industry PCF node fits a farm / livestock gated process). Audit artifacts at audits/LIVESTOCK-MGMT/. Open q-file forks: distinct-domain vs fold-into-FMIS (gate); whether FOOD-TRACE vs FSQM owns the treatment / withholding gate.
- **Phase 0 report:** .tmp_deploy/LIVESTOCK-MGMT-phase0-2026-06-14.md

### SOCIAL-ADS: Paid Social Advertising

- **Mention count:** 2
- **Surfaced by:** SMM audit 2026-05-30
- **Vendor evidence:** Smartly.io (absorbed Ad-Lib.io), Madgicx, Strike Social, Adsmurai (independent pure-plays); Skai (formerly Kenshoo) as enterprise omnichannel reference. AdEspresso is a Hootsuite SMM-suite paid module (not independent).
- **Adjacency:** SMM, MA, REV-INTEL (ADV-AD-TECH was listed as an adjacency but does NOT exist in the catalog)
- **Candidate capabilities:** cross-channel paid social campaign orchestration, dynamic creative optimization, ad-set auto-budget reallocation, social-ad creative versioning, social attribution and incrementality testing
- **Point-solution-market test:** PASSES. Four independent flagship pure-plays (Smartly.io, Madgicx, Strike Social, Adsmurai). SMM is organic publishing, MA is lifecycle, and no ad-tech domain exists, so paid social had no home.
- **Decision:** promote-as-domain (2026-06-14).
- **Build status:** BUILT and loaded at record_status='new' on 2026-06-14 as domain id 177 (modules SOCIAL-ADS-CAMPAIGN-ORCHESTRATION, SOCIAL-ADS-CREATIVE-OPTIMIZATION). 6 capabilities, 13 masters, system skill social-ads-system, 3 personas with RACI. Audit artifacts at audits/SOCIAL-ADS/. Open q-file gate: keep distinct vs fold into SMM.
- **Phase 0 report:** .tmp_deploy/SOCIAL-ADS-phase0-2026-06-14.md

### INSIDER-RISK: Insider Risk Management (queued as IRM)

- **Mention count:** 2
- **Surfaced by:** DLP audit 2026-05-30, OBS audit 2026-05-30
- **Vendor evidence:** DTEX InTERCEPT (pure-play), Teramind, Proofpoint ITM (built on ObserveIT, acq. 2019), Mimecast Incydr (formerly Code42 Incydr; Mimecast acquired Code42 2024), Microsoft Purview Insider Risk, Cyberhaven, Forcepoint (insider / gov unit spun out as Everfox 2023).
- **Adjacency:** DLP, SECOPS, IGA, HCM, DSPM
- **Candidate capabilities:** user behavior risk scoring, insider-threat investigation, file lineage tracking, indicator-of-compromise correlation, employee exit risk, anomalous data movement, departing-user monitoring, evidence collection for HR/Legal
- **Point-solution-market test:** PASSES. Three-plus independent flagships (DTEX, Teramind, Proofpoint ITM); Gartner publishes a dedicated Market Guide for Insider Risk Management Solutions (Mar 2025).
- **Decision:** promote-as-domain (2026-06-14). CODE CHANGED: built as domain_code INSIDER-RISK, not IRM. "IRM" is overloaded (GRC id 15 already carries the Integrated Risk Management meaning), so the insider-risk market uses INSIDER-RISK to avoid the collision.
- **Build status:** BUILT and loaded at record_status='new' on 2026-06-14 as domain id 178 (modules INSIDER-RISK-MONITORING-DETECTION, INSIDER-RISK-INVESTIGATION-CASE-MGMT). 7 capabilities, 7 masters (consumes DLP / DSPM / HCM signals), system skill insider-risk-system, 3 personas with RACI. Audit artifacts at audits/INSIDER-RISK/. Open q-file forks: distinct vs fold into DLP / DSPM; PCF anchor choice. Known gap: 3 of 4 outbound handoffs have NULL target_domain_module_id because SECOPS / HCM / IGA are not modularized at the consuming grain (backfill later).
- **Phase 0 report:** .tmp_deploy/IRM-phase0-2026-06-14.md

### PROCESS-ORCHESTRATION: Process Orchestration / Durable Execution (queued as IBPMS)

- **Mention count:** 2
- **Surfaced by:** BPA audit 2026-05-30
- **Vendor evidence:** Camunda (Camunda 8 / Zeebe), Temporal Technologies (durable execution, ~$5B Series D Feb 2026), Orkes (Netflix-origin Conductor), Flowable (BPMN / DMN / CMMN). BOAT-suite runtimes Pega / Appian / Bizagi already in catalog under LCAP (edged secondary here). AWS Step Functions as hyperscaler entrant.
- **Adjacency:** BPA, RPA, LCAP, PROC-MIN
- **Candidate capabilities:** BPMN process execution engine, case management, decision modeling (DMN), human task orchestration, process automation runtime
- **Point-solution-market test:** PASSES, but only after splitting the candidate. The iBPMS SUITE name folds (its low-code leaders Pega / Appian are already mapped to LCAP, and LCAP-WORKFLOW-AUTO is annotated "Where LCAP overlaps with BPM/iBPMS"). The distinct, unowned kernel is the durable execution RUNTIME, with three-plus independent pure-play flagships that are NOT low-code suites: Camunda, Temporal, Orkes, Flowable.
- **Decision:** promote-as-domain (2026-06-14). CODE CHANGED: built as domain_code PROCESS-ORCHESTRATION, not IBPMS (an IBPMS code would duplicate LCAP). Note: catalog BPA = "Business Process Architecture" (modeling / governance), not Automation, and LCAP masters design-time workflows only, so the execution runtime had no home.
- **Build status:** BUILT and loaded at record_status='new' on 2026-06-14 as domain id 179 (modules PROCESS-ORCHESTRATION-EXECUTION, PROCESS-ORCHESTRATION-CASE-DECISION). 6 capabilities, 10 masters (process_instances state machine, human_tasks, runtime DMN, case_records, process_events), system skill process-orchestration-system, 3 personas with RACI. Audit artifacts at audits/PROCESS-ORCHESTRATION/. Open q-file forks: distinct vs fold into LCAP / BPA; module split.
- **Phase 0 report:** .tmp_deploy/IBPMS-phase0-2026-06-14.md

### FRONTLINE-COMMS: Frontline / Deskless Worker Communication Platform

- **Mention count:** 3
- **Surfaced by:** WFM audit 2026-05-30, INTRANET audit 2026-05-30, RET-STORE audit 2026-05-30
- **Vendor evidence:** WorkJam, Beekeeper (LumApps merger Jul 2025), YOOBIC, Speakap, Flip, Blink (independent pure-plays). Workvivo (Zoom 2023) and Microsoft Teams Frontline are suite modules. Candidate-note correction: Crew was acquired by Square / Block 2019 (not Cornerstone).
- **Adjacency:** WFM, INTRANET, EMP-EXP, RET-STORE
- **Candidate capabilities:** broadcast messaging to deskless workforce, task and checklist push, shift swap conversations, frontline learning, frontline recognition
- **Point-solution-market test:** PASSES. Five independent pure-play flagships (WorkJam, YOOBIC, Speakap, Flip, Blink). The unified frontline digital-workplace wedge (mobile-first comms + task / checklist + shift-swap + microlearning + recognition for workers with no corporate email, bought by store / plant ops) is owned by no existing domain.
- **Decision:** promote-as-domain (2026-06-14).
- **Build status:** BUILT and loaded at record_status='new' on 2026-06-14 as domain id 180 (modules FRONTLINE-COMMS-BROADCAST-ENGAGEMENT, FRONTLINE-COMMS-TASK-EXECUTION). 5 capabilities, 10 masters, system skill frontline-comms-system, 3 personas with RACI. Audit artifacts at audits/FRONTLINE-COMMS/. Strong signal: WorkJam (solution 256) was already in the catalog mis-shelved on WFM + RET-STORE. Open q-file forks: distinct vs fold into INTRANET (gate); re-shelving WorkJam to FRONTLINE-COMMS primary (additive done, destructive downgrade surfaced).
- **Rationale:** INTRANET is the office-comms publishing platform (buyer Internal Comms / HR), WFM owns the shift record + swap approval, RET-STORE owns retail-only task, EMP-EXP owns survey listening. None fuses the five deskless capabilities for the non-desk worker. Distinct buyer (store / plant ops) and a mobile-first, no-corporate-email substrate.
- **Phase 0 report:** .tmp_deploy/FRONTLINE-COMMS-phase0-2026-06-14.md

### EMP-ADVOCACY: Employee Advocacy Platform

- **Mention count:** 4
- **Surfaced by:** SMM audit 2026-05-30, EMP-EXP audit 2026-05-30, INTRANET audit 2026-05-30
- **Vendor evidence:** DSMN8, GaggleAMP, EveryoneSocial (Seismic 2024), Oktopost, plus Haiilo (absorbed Smarp; COYO + Smarp + Jubiwee merger 2022), Sociabble (Poppulo 2024/25). Suite modules: Hootsuite Amplify, Sprinklr Advocacy, Bambu (Sprout Social). Candidate-note corrections: Smarp is now Haiilo (not Sociabble); EveryoneSocial acquired by Seismic.
- **Adjacency:** SMM, EMP-EXP, HCM, INTRANET
- **Candidate capabilities:** curated content broadcast to employees, employee social share tracking, gamification and leaderboards, employee influencer scoring, internal newsletter generation, social-share attribution to revenue
- **Point-solution-market test:** PASSES. Independent flagships whose flagship IS employee advocacy: DSMN8, GaggleAMP, EveryoneSocial (plus Oktopost, Sociabble). Dedicated Gartner Peer Insights "Employee Advocacy Tools" category.
- **Decision:** promote-as-domain (2026-06-14).
- **Build status:** BUILT and loaded at record_status='new' on 2026-06-14 as domain id 181 (modules EMP-ADVOCACY-CONTENT-DISTRIBUTION, EMP-ADVOCACY-GAMIFICATION-ANALYTICS). 7 capabilities, 14 masters, system skill emp-advocacy-system, 3 personas with RACI. Audit artifacts at audits/EMP-ADVOCACY/. Open q-file forks: distinct vs fold into SMM (gate); pattern-flag flips; regulation set.
- **Rationale:** SMM names "influencer / advocacy programs" in one clause, but that is influencer scope (SMM already has the SMM-INFLUENCER module 302 for external creators) and SMM models none of the advocacy entity surface. INTRANET / EMP-EXP / HCM are internal-audience or HRIS, not external-reach. Distinct buyer (Marketing / MarComms with an HR contributor seam): employees resharing curated brand content to their personal social networks.
- **Phase 0 report:** .tmp_deploy/EMP-ADVOCACY-phase0-2026-06-14.md

### SCRM: Supply Chain Risk Management

- **Mention count:** 1
- **Surfaced by:** SUP-LIFE audit 2026-05-30 (queued); triaged during the SRM restructure audit 2026-06-19
- **Vendor evidence:** Resilinc (multi-tier part-site mapping, disruption response), Interos (continuous AI risk intelligence, fast multi-tier discovery across financial/operational/cyber), Everstream Analytics (predictive monitoring, sub-tier visibility, external risk intelligence), Prewave (AI monitoring of news/social/public sources for operational, compliance, sustainability risk), Sphera SCRM (absorbed riskmethods + SupplyShift; N-tier mapping, continuous global-disruption monitoring), Sayari (corporate-ownership + N-tier supply-chain due diligence). 2026 trend is integration/partnership (Black Kite + Sayari) rather than absorption into SRM or TPRM suites.
- **Adjacency:** SRM (28), TPRM (19), GRC (15), S2P (27)
- **Candidate capabilities:** N-tier / sub-tier supplier mapping, continuous external-disruption monitoring (weather, geopolitics, financial, cyber, forced-labor/ESG), disruption alerting, supplier risk intelligence scoring, geopolitical risk scoring
- **Point-solution-market test:** PASSES. A recognized standalone market with a pure-play vendor set (Resilinc, Interos, Everstream Analytics, Prewave, Sphera SCRM, Sayari) whose defining capability, N-tier mapping plus continuous monitoring of EXTERNAL disruption signals across suppliers the buyer has no direct relationship with, is owned by neither SRM (operational risk on the buyer's own supplier master, gating qualification) nor TPRM (engagement/contract-gated diligence on direct third parties). Sphera draws the SCRM-vs-TPRM line explicitly.
- **Decision:** promote-as-domain (2026-06-19). Proposed domain_code SCRM. Resolves SRM b2 item B2-S4 (user chose option a). NOT yet loaded; the build needs its own dedicated Phase 0 (the existing .tmp_deploy/SRM-phase0-2026-06-19.md covered the SRM/TPRM seam, not the SCRM pure-play surface) followed by Phase A-S, and awaits explicit user approval.
- **Rationale:** SCRM is the supply-chain-disruption-intelligence overlay (N-tier/sub-tier mapping plus continuous monitoring of external disruption signals across indirect suppliers). It is a different market from both SRM (operational supplier risk attached to the buyer's own supplier master) and TPRM (deep, tier-cadence diligence on direct third parties). A fold into either understates a distinct pure-play market; the next-best fold (into TPRM) would dilute it.
- **Phase 0 report:** .tmp_deploy/SCRM-phase0-2026-06-19.md (done 2026-06-19; flagship pure-plays Resilinc, Interos, Everstream, Prewave, Sphera SCRM, Sayari; 3-module hypothesis NETWORK-MAPPING / RISK-INTELLIGENCE / DISRUPTION-RESPONSE).
- **Build status:** NOT built; audit STARTED. Audit dir created at audits/SCRM/ (state.yaml, history.md, q-SCRM.md). `status: feedback_needed` on 4 market-shape b2 decisions (node identity [gate], module split, forced-labor scope, owner function). Phase A-S build runs once a-SCRM.md answers the shape.

### PMM: Product Marketing Management

- **Mention count:** 2
- **Surfaced by:** PROD-MGMT audit 2026-05-30, GTM-PLAN audit 2026-05-30; triaged 2026-06-19
- **Vendor evidence:** Klue, Crayon (competitive-intelligence pure-plays); Highspot, Seismic, Showpad (sales-enablement pure-plays); Aha!, Pendo, Reprise (adjacent).
- **Adjacency:** PROD-MGMT, CRM, GTM-PLAN, REV-INTEL
- **Candidate capabilities:** launch planning, GTM coordination, messaging and positioning, sales enablement content, competitive intelligence, win/loss interviews, persona management
- **Point-solution-market test:** N/A — superseded. PMM was already loaded as a live domain after this candidate was queued.
- **Decision:** promote-as-domain — ALREADY LOADED (2026-06-19 dedup cleanup). The queue entry (surfaced 2026-05-30) predates the load.
- **Rationale:** PMM exists as domain id 184 (`established_market`), fully built with 4 full modules (PMM-COMPETITIVE-INTEL, PMM-LAUNCH-MGMT, PMM-MESSAGING, PMM-SALES-ENABLEMENT) and 7 capabilities. GTM-PLAN's own description confirms the carve-out ("Launch orchestration moved to Product Marketing Management"). No further triage action; entry resolved as a dedup against live state.
- **Build status:** BUILT (pre-existing) as domain id 184.

### HOA-MGMT: Homeowner Association Management

- **Mention count:** 1
- **Surfaced by:** RE-PROP-MGMT audit 2026-05-30; triaged 2026-06-19
- **Vendor evidence:** Vantaca (JMI Equity-backed; ~6.5M doors), CINC Systems (~50k communities, ~6M doors), PayHOA (self-managed boards), FRONTSTEPS, Condo Control / Enumerate (TOPS) — all pure-play community-association-management (CAM) platforms positioned explicitly against "generic property management software." AppFolio and Buildium offer HOA/association as an EDITION of a landlord-tenant suite (suite-encroaching-on-vertical), not their flagship.
- **Adjacency:** RE-PROP-MGMT (144), FIN (65), LSD (25)
- **Candidate capabilities:** owner-roster management, board governance, architectural review, dues/assessment collection, reserve studies, violation tracking, community communications
- **Point-solution-market test:** PASSES (high confidence). At least five independent vendors whose flagship IS community-association management (Vantaca, CINC Systems, PayHOA, FRONTSTEPS, Condo Control/Enumerate).
- **Decision:** promote-as-domain (2026-06-19). Proposed domain_code HOA-MGMT, standalone (sibling to RE-PROP-MGMT, NOT a child — each masters entities the other lacks).
- **Rationale:** RE-PROP-MGMT is the landlord-to-tenant view (leases, rent, screening, vacancy, per-property GL). HOA-MGMT is the owners-self-governance view: an association of owners governs a community via board, elections, CC&Rs/covenants, an architectural-review committee, assessments and violation fines on member-owners (not rent from tenants), and statutory reserve studies for capital planning. A distinct governance/fiduciary entity spine (`associations`, `board_members`, `board_elections`, `governing_documents`, `architectural_review_requests`, `covenant_violations`/`violation_fines`, `assessments`, `reserve_studies`, `meeting_minutes`) exists in no current catalog domain. RE-PROP-MGMT names "condo/HOA management" as a buyer but models none of this surface.
- **Suggested metadata:** domain_kind=established_market; standalone domain. Full seven-field Phase-0 estimates due in the build's Phase 0 report.
- **Phase 0 report:** .tmp_deploy/HOA-MGMT-phase0-2026-06-19.md (done 2026-06-19; 5 pure-play CAM vendors Vantaca/CINC/PayHOA/FRONTSTEPS/Condo Control; 46 entities [35 Core / 8 Common / 13 statute-driven compliance]; 3-module hypothesis GOVERNANCE / ASSESSMENTS / COMMUNITY-OPERATIONS).
- **Build status:** NOT built; audit STARTED 2026-06-19 (selected as the first PROMOTE to build). Audit dir created at audits/HOA-MGMT/ (state.yaml, history.md, q-HOA-MGMT.md). `status: feedback_needed` on 4 market-shape b2 decisions (module split [gate], common-area maintenance master-vs-consume, community-contractor master-vs-consume, owner function). Phase A-S build runs once a-HOA-MGMT.md answers the shape.

### SOP-MGMT: Process Documentation and SOP Management

- **Mention count:** 1
- **Surfaced by:** SOP-MGMT scoping 2026-06-15; triaged 2026-06-19
- **Vendor evidence:** SweetProcess, Process Street, Whale (usewhale.io) — pure-play SOP/process-documentation platforms; Trainual (training-leaning); Scribe/ScribeHow (step-capture tool feeding the library); Dozuki (manufacturing connected-worker work instructions).
- **Adjacency:** KMS (33), ECM (91), LMS (57), BPA (136), GRC (15), ONBOARDING (99); sibling to the not-yet-loaded POLICY-MGMT and EQMS candidates.
- **Candidate capabilities:** SOP authoring, work-instruction steps, document versioning, publish-and-assign, read-acknowledgment tracking, comprehension quizzes, periodic review cycles, controlled-document control
- **Point-solution-market test:** PASSES (high confidence). At least three independent flagships whose product IS SOP/process documentation (SweetProcess, Process Street, Whale), plus Dozuki (manufacturing variant) and Scribe (capture tool).
- **Decision:** promote-as-domain (2026-06-19). Proposed domain_code SOP-MGMT.
- **Rationale:** Distinct masters (`sops`, `work_instructions`, `procedure_steps`, `read_acknowledgments`, `sop_review_cycles`, `comprehension_quizzes`, `sop_role_assignments`) that adjacent domains do not own: KMS lacks the assign-acknowledge-review-cycle obligation (a knowledge article carries no attestation duty; an SOP does); LMS's unit is a course/curriculum, not a procedure; BPA is architect-altitude BPMN modeling, not operational SOP text. Real adjacency with the not-yet-cataloged POLICY-MGMT (rule-attestation vs procedure-execution) and EQMS (regulated quality); vendor sets are disjoint, so promote SOP-MGMT and POLICY-MGMT as distinct siblings rather than merging.
- **Suggested metadata:** domain_kind=established_market.
- **Phase 0 report:** .tmp_deploy/SOP-MGMT-phase0-2026-06-15.md (pre-existing, from the 2026-06-15 scoping).
- **Build status:** NOT built (no live domain row). ALREADY SCOPED 2026-06-15 — audit dir exists at audits/SOP-MGMT/ (state.yaml, history.md, q-SOP-MGMT.md), `status: feedback_needed`. Open b2 includes the controlled-document slice vs EQMS split (B2-SOP-EQMS-SPLIT). 2026-06-19 triage confirms promote-as-domain. Phase A-S build runs once a-SOP-MGMT.md answers the shape.

### WORKPLACE-EXP: Workplace Experience and Workspace Booking

- **Mention count:** 1
- **Surfaced by:** VIS-MGMT audit 2026-05-30; triaged 2026-06-19
- **Vendor evidence:** Robin, Kadence, Tactic (independent pure-play workplace-experience / desk-booking platforms; Skedda/Gable in-class). Condeco is no longer independent (acquired into Eptura); Envoy now positions as IWMS; Eptura and OfficeSpace are IWMS/facilities suites.
- **Adjacency:** IWMS (23), CAFM (142, child of REAL-EST), REAL-EST (141), VIS-MGMT (24), EMP-EXP (62), HCM (54)
- **Candidate capabilities:** desk booking, room reservation, hybrid attendance scheduling, neighborhood/floor planning, visitor flow integration, occupancy analytics, hot-desking
- **Point-solution-market test:** PASSES (medium confidence). Independent pure-plays Robin/Kadence/Tactic; Gartner publishes a Workplace Experience Applications market separate from IWMS. Promotion is justified by buyer identity (HR/employee, RTO/hybrid, employee-app-first) plus attendance-coordination entities rather than net-new booking objects.
- **Decision:** promote-as-domain (2026-06-19), as a THIRD sub-domain of REAL-EST (parent_domain_id=141) alongside IWMS and CAFM. Conservative fallback if minimizing domain count: fold-into-existing:IWMS.
- **Rationale:** Core booking entities (`desk_bookings`, `room_reservations`, `floor_plans`, occupancy) are ALREADY mastered by IWMS, so WORKPLACE-EXP must SHARE (consume/embedded_master) them, NOT re-master. Its genuinely net-new masters are employee-coordination objects IWMS/CAFM do not own: `office_attendance_days`, `in_office_schedules`, `team_coworking_signals`, `attendance_policies`, `wayfinding_routes`. Boundary = direction of the data: IWMS/CAFM master the building (leases, maintenance, portfolio); WORKPLACE-EXP masters the employee's day (attendance intent, team coordination, RTO compliance, wayfinding).
- **Suggested metadata:** domain_kind=established_market; parent_domain_id=REAL-EST (141). Scope tightly to hybrid-work coordination; cede leases/maintenance/portfolio to IWMS.
- **Build status:** NOT built; recommendation only. Build awaits explicit user approval (own Phase 0 + q-file).

---

## Folded

### REVERSE-ETL: Reverse-ETL / Warehouse-Activation

- **Mention count:** 4
- **Surfaced by:** CDP, MA, METRICS-LAYER, DI audits (2026-05-30)
- **Vendor evidence:** Hightouch, Census, RudderStack Reverse-ETL, Polytomic, Grouparoo
- **Point-solution-market test:** FAILS as a standalone market in 2026. Census was acquired by Fivetran (rebranded "Fivetran Activations", signed May 2025); Hightouch repositioned as a Composable CDP; Polytomic markets a unified ETL + reverse-ETL + CDC platform; Grouparoo is defunct (absorbed by Airbyte); RudderStack is a CDP with reverse-ETL as a feature. No independent vendor's flagship is standalone reverse ETL, and the category never had a dedicated Gartner MQ. It dissolved into Composable CDP and broader data movement.
- **Decision:** fold-into-existing:CDP (2026-06-07)
- **Rationale:** The activation half of the Composable CDP market is already first-class in CDP via capability CDP-ACTIVATION ("Push audiences and traits... via reverse-ETL"), capability CDP-COMPOSABLE-WH (warehouse-native, zero-copy ingestion and activation), and the CDP-SEGMENTATION-ACTIVATION module. Hightouch already links to CDP at coverage_level=primary. The inbound ELT/ETL/replication side stays in DI (id 89). Promoting a separate domain would overlap CDP's activation module and contend for Hightouch's home.
- **Non-blocking follow-ups (b3, not executed):** (1) add Census/Fivetran Activations, Polytomic, and RudderStack as `solutions` linked to CDP (none are in the catalog yet; only Hightouch is). (2) Optionally broaden DI's inbound-only description to acknowledge the reverse-ETL "last mile" of data movement (Fivetran Activations, Polytomic); this edits a non-empty `domains.description` and needs explicit sign-off.

### PPM: Project and Portfolio Management

- **Mention count:** 0 (direct research request 2026-06-14; never surfaced by an audit, was not in the pending queue)
- **Surfaced by:** Direct user research request 2026-06-14
- **Vendor evidence:** Broadcom Clarity (formerly CA PPM / Niku), Planview (acquired Sciforma Feb 2025), ServiceNow SPM, Planisware (Euronext Paris listing 2024), Microsoft Project / Planner
- **Adjacency:** SPM, APM, PORT-MONIT, WORK-MGMT, PROD-MGMT
- **Point-solution-market test:** PASSES the three-independent-vendors bar (Broadcom Clarity, Planview, Planisware are dedicated portfolio-management products), but passing only confirms PPM is a real market, not one distinct from SPM. Gartner retired the standalone PPM Magic Quadrant and renamed it Strategic Portfolio Management; the identical flagship set is judged in the single SPM quadrant.
- **Decision:** fold-into-existing:SPM (2026-06-14)
- **Rationale:** PPM and SPM are the same enterprise market under two names. The live catalog already carries SPM ("Top-down planning of investments, demand, resources, and agile delivery across portfolios", crud 85, l <10000, $$$$, USA TAM 2500 / 2025), whose entity surface (demand, project, resource, outcome records plus capacity / scenario / roadmap engines) is exactly what a PPM domain would claim. A separate PPM domain would duplicate SPM, not extend coverage. PORT-MONIT (private-capital portfolio monitoring) and APM (application portfolio management) are name collisions, not the same market.
- **Non-blocking follow-ups (b3, not executed):** (1) Add "PPM" and "Project and Portfolio Management" as aliases of SPM so future intake auto-resolves. (2) Verify SPM's solution coverage includes Planview, Broadcom Clarity, ServiceNow SPM, Planisware, and Microsoft.
- **Phase 0 report:** .tmp_deploy/PPM-phase0-2026-06-14.md

### CMP: Content Marketing Platform

- **Mention count:** 2
- **Surfaced by:** WEB-CONTOPS audit 2026-05-30, PRIV-MGMT audit 2026-05-30
- **Vendor evidence:** Optimizely Content Marketing Platform, Welcome (formerly NewsCred), Skyword, Contently, ContentCal (Adobe, discontinued 2023), GatherContent (Bynder).
- **Adjacency:** WEB-CONTOPS, MA, HCMS, DXP, MRM
- **Point-solution-market test:** FAILS the three-independent-pure-play bar. Only Skyword and Contently survive as independents, and both are services-plus-platform hybrids, not pure SaaS. The CMP Magic Quadrant persists but is dominated by DXP / CMS / suite vendors (Optimizely, Sitecore, Sprinklr), not editorial-ops pure-plays.
- **Decision:** fold-into-existing:WEB-CONTOPS (2026-06-14)
- **Rationale:** The editorial-content-ops kernel (editorial workflow, content briefs, production calendar, editorial task management) is already owned by WEB-CONTOPS. Decisively, the two flagship CMP vendors already in the catalog (Optimizely CMP id 483, GatherContent id 479) both map solution_domains.coverage_level=primary to WEB-CONTOPS today. The production-calendar slice overlaps the just-built MRM; multi-channel publishing overlaps MA / DXP. Promoting CMP would duplicate WEB-CONTOPS and split its solution set.
- **Ambiguity flagged (separate candidate):** "CMP" in the PRIV-MGMT surfacing most likely meant Consent Management Platform (OneTrust, Didomi, Usercentrics, Sourcepoint, TrustArc, Cookiebot), a distinct privacy market. NOT researched or built here; should be re-triaged on its own near a privacy / consent / GRC cluster.
- **Non-blocking follow-ups (b3):** optionally add Skyword / Contently / DivvyHQ as solutions under WEB-CONTOPS (flag the two as services + platform hybrids).
- **Phase 0 report:** .tmp_deploy/CMP-phase0-2026-06-14.md

### EMP-LISTENING: Employee Listening Platform

- **Mention count:** 3
- **Surfaced by:** PA audit 2026-05-30, EMP-EXP audit 2026-05-30, INTRANET audit 2026-05-30
- **Vendor evidence:** Culture Amp, Lattice, Glint (Microsoft Viva Glint), Peakon (Workday Peakon), Qualtrics EmployeeXM (Silver Lake take-private 2023), plus Perceptyx, Medallia EX, WorkTango.
- **Adjacency:** EMP-EXP (home), PA (consumer), HCM (source), TALENT-MGMT (sibling)
- **Point-solution-market test:** PASSES as a standalone market (Culture Amp, Qualtrics EmployeeXM, Perceptyx, Medallia EX, WorkTango are independent flagships), but the test confirms the market is real, not that it is NEW. The kernel is already claimed by EMP-EXP, so the passing test is a fold signal.
- **Decision:** fold-into-existing:EMP-EXP (2026-06-14)
- **Rationale:** EMP-EXP (id 62, "Employee Experience and Engagement") already carries all five listening capabilities (engagement surveys, pulse surveys, 360 feedback, lifecycle listening, survey action planning) and the exact flagship vendors cited as EMP-LISTENING evidence. The candidate's capabilities (pulse-survey design, engagement-driver modeling, manager-action planning, eNPS) map 1:1 onto EMP-EXP. Gartner ("Voice of the Employee Solutions") and Forrester ("Employee Listening Solutions Landscape") scope listening as a component of employee experience, same buyer. PA consumes listening output as an analytics input but does not run surveys; INTRANET's own description disclaims engagement listening to EMP-EXP.
- **Non-blocking follow-ups (b3):** optionally add Perceptyx, Medallia EX, WorkTango, Quantum Workplace as EMP-EXP solution rows; optionally surface eNPS / engagement-driver analytics as finer EMP-EXP sub-capabilities; optionally add "employee listening / Voice of the Employee" as a synonym in EMP-EXP's description (a non-empty-field overwrite, needs sign-off).
- **Phase 0 report:** .tmp_deploy/EMP-LISTENING-phase0-2026-06-14.md

### EMP-JOURNEY-ORCH: Employee Journey Orchestration

- **Mention count:** 1
- **Surfaced by:** INTRANET audit 2026-05-30; triaged 2026-06-19
- **Vendor evidence:** Enboarder, Pyn, ChangeEngine, Tydy (pure-play employee-journey-orchestration platforms that listen to HRIS events and fan out multi-channel nudges). The originally-listed Applauz, Cooleaf, HelloTeam are recognition/engagement tools (mis-bundled) and belong to EMP-EXP.
- **Adjacency:** INTRANET (126), EMP-EXP (62), HCM (54), ONBOARDING (99), HRSD (22)
- **Candidate capabilities:** personalized employee journey design, milestone-triggered nudges, manager-action playbooks, journey analytics, cross-system event listening, multi-channel delivery
- **Point-solution-market test:** PASSES the three-independent-vendors bar (Enboarder, Pyn, ChangeEngine, Tydy) — so it is a real vendor class, not a rebrand — but FAILS the distinct-entities half against this catalog: INTRANET, ONBOARDING, AND HRSD each already explicitly claim "journey orchestration," and the candidate's nouns (journeys, milestones, nudges, event triggers) duplicate those scopes.
- **Decision:** fold-into-existing:INTRANET (2026-06-19). Onboarding-specific vendors (Enboarder) map to ONBOARDING; recognition vendors map to EMP-EXP.
- **Rationale:** It is a cross-cutting orchestration capability layered over the HRIS, not a separate market mastering uncataloged data. Buyer (Internal Comms / HR) matches INTRANET exactly. Recommend strengthening INTRANET's stated entity coverage (journey_templates, event_listeners, nudges) rather than promoting a fourth overlapping domain. Revisit as an emerging_market PROMOTE only if the "journey orchestration" claim is later removed from INTRANET/ONBOARDING/HRSD.
- **Non-blocking follow-ups (b3, not executed):** add Enboarder/Pyn/ChangeEngine as `solutions` (INTRANET primary; Enboarder secondary on ONBOARDING); consider INTRANET entity enrichment for journey_templates / event_listeners / nudges.
- **Phase 0 report:** none (triaged from Phase-0-lite vendor-surface research 2026-06-19).

---

## Rejected

### TALENT-INTEL-PLATFORM: Talent Intelligence Platform

- **Mention count:** 2
- **Surfaced by:** PA audit 2026-05-30, SKILLS-MGMT audit 2026-05-30
- **Vendor evidence:** Eightfold AI, Phenom, Beamery, SeekOut, Gloat, Fuel50
- **Adjacency:** PA, ATS, TALENT-MGMT, SWP, SKILLS-MGMT, TLNT-INTEL
- **Point-solution-market test:** PASSES the three-independent-vendors bar (Eightfold AI, SeekOut, Beamery, Phenom, Gloat all carry a talent intelligence platform as flagship), but the market is already in the catalog.
- **Decision:** reject (duplicate of TLNT-INTEL) (2026-06-14)
- **Rationale:** Near-verbatim restatement of the existing live domain TLNT-INTEL ("Talent Intelligence", crud 50, m <2500, $$$$$), which already owns the AI matching / recommendation layer, the talent marketplace, and the model-inference audit trail while deferring person and skill mastership upstream. All four candidate capabilities (talent rediscovery, internal-mobility matching, skills-graph inference, career-pathway recommendation) fall inside TLNT-INTEL's existing scope. A new domain would duplicate TLNT-INTEL and split the same vendor set across two codes. The action is enrichment of TLNT-INTEL, not a new domain.
- **Non-blocking follow-ups (b3, not executed):** enrich TLNT-INTEL with rediscovery-candidate and internal-mobility-opportunity entities if missing; add responsible-AI compliance entities (NYC LL144 / state AEDT bias-audit artifact, EU AI Act oversight log, GDPR Art. 22 explanation); capture the 2026 autonomous talent-agent surface; confirm the SKILLS-MGMT vs TLNT-INTEL ownership boundary for skills-graph inference.
- **Phase 0 report:** .tmp_deploy/TALENT-INTEL-PLATFORM-phase0-2026-06-14.md
