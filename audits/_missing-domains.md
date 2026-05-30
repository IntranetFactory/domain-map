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

### PMM — Product Marketing Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (PROD-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (PROD-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PROD-MGMT audit 2026-05-30
- **Vendor evidence:** Klue, Crayon, Highspot, Showpad, Seismic, Aha! Roadmaps Create, Pendo Adopt, Reprise
- **Adjacency:** PROD-MGMT, CRM, GTM-PLAN, REV-INTEL
- **Candidate capabilities:** launch planning, GTM coordination, messaging and positioning, sales enablement content, competitive intelligence, win/loss interviews, persona management
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### FEATURE-FLAGGING — Feature Flagging and Experimentation

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (PROD-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (DXP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PROD-MGMT audit 2026-05-30
  - 2026-05-30 DXP audit 2026-05-30
- **Vendor evidence:** LaunchDarkly, Statsig, Optimizely Web Experimentation, Flagsmith, Split.io, Eppo, GrowthBook, Amplitude Experiment, ConfigCat
- **Adjacency:** PROD-MGMT, DXP, VSDP, SPM
- **Candidate capabilities:** feature flag management, experimentation orchestration, A/B test cohort assignment, kill-switch operations, gradual rollout
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TALENT-INTEL-PLATFORM — Talent Intelligence Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (PA audit 2026-05-30)
- **Most recent:** 2026-05-30 (PA audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PA audit 2026-05-30
- **Vendor evidence:** Eightfold AI, Phenom, Beamery, SeekOut
- **Adjacency:** PA, ATS, TALENT-MGMT, SWP, SKILLS-MGMT
- **Candidate capabilities:** talent rediscovery, internal-mobility matching, skills-graph inference, career-pathway recommendation
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EMP-LISTENING — Employee Listening Platform

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (PA audit 2026-05-30)
- **Most recent:** 2026-05-30 (EMP-EXP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 PA audit 2026-05-30
  - 2026-05-30 EMP-EXP audit 2026-05-30
- **Vendor evidence:** Culture Amp, Lattice Engagement, Glint, Peakon, Qualtrics EmployeeXM
- **Adjacency:** PA, EMP-EXP, HCM, TALENT-MGMT
- **Candidate capabilities:** pulse-survey design, engagement-driver modeling, manager-action planning, employee-NPS
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### WMS — Warehouse Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (INV-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (INV-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 INV-MGMT audit 2026-05-30
- **Vendor evidence:** Manhattan WMS, Blue Yonder WMS, Korber One Warehouse, Softeon WMS, HighJump, Logiwa
- **Adjacency:** INV-MGMT, OMS, SCP, ERP-FIN
- **Candidate capabilities:** picking, packing, slotting, wave planning, RF / scanner workflows, location-grain stock movement, bin management
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
- **Adjacency:** INV-MGMT, SUPPLY-CHAIN, MFG, ERP-FIN
- **Candidate capabilities:** demand forecasting, S&OP, MRP-light, inventory optimization, supply planning
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TRAVEL-MGMT — Corporate Travel Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (SPEND-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (EXPENSE audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SPEND-MGMT audit 2026-05-30
  - 2026-05-30 EXPENSE audit 2026-05-30
- **Vendor evidence:** Navan, Egencia, SAP Concur Travel, TripActions, Spotnana, AmTrav, BCD Travel, CWT
- **Adjacency:** SPEND-MGMT, EXPENSE, HCM
- **Candidate capabilities:** travel booking, itinerary management, traveler safety / duty-of-care, hotel and air sourcing, policy-aware shopping, trip approvals, traveler profile management
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
- **Adjacency:** SPEND-MGMT, ERP-FIN, AP-AUTO
- **Candidate capabilities:** card BIN sponsorship, KYB underwriting, card-program ledger, dispute and chargeback handling, statement generation, interchange revenue tracking
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
- **Adjacency:** SUB-MGMT, ERP-FIN, B2C-COMM, CPQ
- **Candidate capabilities:** real-time tax determination, nexus tracking, tax exemption certificates, jurisdictional filing, VAT/GST registration, marketplace facilitator compliance
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
- **Adjacency:** SUB-MGMT, B2C-COMM, ERP-FIN, AP-AUTO
- **Candidate capabilities:** card vaulting and tokenization, payment method routing, 3DS authentication orchestration, dispute and chargeback management, alternative payment methods, smart routing
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
- **Adjacency:** CPQ, ERP-FIN, PIM, REV-INTEL
- **Candidate capabilities:** AI price optimization, price waterfall analysis, deal scoring, segmentation pricing, list-price management, margin analytics
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
- **Adjacency:** SUB-MGMT, ERP-FIN, CPQ, AUDIT
- **Candidate capabilities:** performance obligation modeling, transaction price allocation, contract modification accounting, standalone selling price (SSP) estimation, deferred revenue waterfall, RevRec audit trails
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
- **Adjacency:** CPQ, OMS, PIM, ERP-FIN, SUB-MGMT
- **Candidate capabilities:** buyer self-serve catalog, customer-specific pricing storefronts, punchout catalogs, self-serve quote-to-order, account hierarchies in storefront
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MLOPS — ML Operations

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DATA-AI-PLAT audit 2026-05-30)
- **Most recent:** 2026-05-30 (DATA-AI-PLAT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DATA-AI-PLAT audit 2026-05-30
- **Vendor evidence:** Weights and Biases, MLflow, Comet ML, Domino Data Lab, Neptune.ai, ClearML, Iguazio, DataRobot MLOps
- **Adjacency:** DATA-AI-PLAT, AIOPS, DCG, OBS
- **Candidate capabilities:** experiment tracking, model registry, model deployment pipelines, model monitoring, drift detection, model lineage
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### AI-GOV — AI Governance

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DATA-AI-PLAT audit 2026-05-30)
- **Most recent:** 2026-05-30 (DATA-AI-PLAT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DATA-AI-PLAT audit 2026-05-30
- **Vendor evidence:** Credo AI, Holistic AI, Fairly AI, Monitaur, Saidot, IBM watsonx.governance, ServiceNow AI Control Tower
- **Adjacency:** DATA-AI-PLAT, GRC, DCG, AUDIT
- **Candidate capabilities:** AI inventory, model risk classification, bias evaluation, EU AI Act conformity, model cards, policy enforcement, AI incident tracking
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CSPM — Cloud Security Posture Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DSPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (DSPM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DSPM audit 2026-05-30
- **Vendor evidence:** Wiz, Palo Alto Prisma Cloud, Orca Security, Lacework, Check Point CloudGuard, Microsoft Defender for Cloud
- **Adjacency:** DSPM, CNAPP, CIEM, SECOPS, GRC
- **Candidate capabilities:** cloud misconfiguration detection, CIS benchmarks, multi-cloud control plane audit, compliance framework mapping, infrastructure drift detection
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
- **Adjacency:** MDM, DCG, ERP-FIN, DATA-AI-PLAT
- **Candidate capabilities:** code list management, hierarchy management, cross-reference mapping, jurisdictional code sets, controlled vocabularies, currency codes, country codes, GL accounts as reference data
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
- **Adjacency:** AGENCY-MGMT, ADV-AD-TECH, ERP-FIN
- **Candidate capabilities:** media plan authoring, insertion order issuance, broadcast and digital placement, commission and markup billing, reconciliation against vendor invoices, post-buy reporting
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
- **Adjacency:** FSM, CRM, ERP-FIN
- **Candidate capabilities:** vertical home-services workflows, residential dispatch, consumer-grade invoicing, membership programs, on-site payment capture, lead generation tie-ins
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### CREATIVE-PROOFING — Creative Proofing and Review

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (AGENCY-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (AGENCY-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 AGENCY-MGMT audit 2026-05-30
- **Vendor evidence:** Ziflow, Filestage, Approval Studio, GoVisually, ProofHub, Aproove
- **Adjacency:** AGENCY-MGMT, DAM, MRM
- **Candidate capabilities:** annotated review of creative deliverables, multi-round client approval workflow, version comparison, brand compliance check, approval routing
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### MRM — Marketing Resource Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (AGENCY-MGMT audit 2026-05-30)
- **Most recent:** 2026-05-30 (AGENCY-MGMT audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 AGENCY-MGMT audit 2026-05-30
- **Vendor evidence:** Aprimo Marketing Productivity, Workfront for Marketing, Hive9, Allocadia, Plannuh
- **Adjacency:** AGENCY-MGMT, PMM, ADV-AD-TECH
- **Candidate capabilities:** marketing campaign planning, marketing budget allocation, marketing project orchestration, brand asset workflow, marketing performance measurement
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### REVERSE-ETL — Reverse-ETL / Warehouse-Activation

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (CDP audit 2026-05-30)
- **Most recent:** 2026-05-30 (MA audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 CDP audit 2026-05-30
  - 2026-05-30 MA audit 2026-05-30
- **Vendor evidence:** Hightouch, Census, RudderStack Reverse-ETL, Polytomic, Grouparoo
- **Adjacency:** CDP, B2C-COMM, MA
- **Candidate capabilities:** warehouse-native activation, reverse-ETL sync, zero-copy CDP
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TMS — Translation Management System

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (HCMS audit 2026-05-30)
- **Most recent:** 2026-05-30 (HCMS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 HCMS audit 2026-05-30
- **Vendor evidence:** Smartling, Lokalise, Phrase, Crowdin, memoQ, Transifex
- **Adjacency:** HCMS, DXP, WEB-CONTOPS, B2C-COMM, LMS
- **Candidate capabilities:** translation memory, glossary management, machine translation orchestration, translator workbench, vendor and freelancer marketplace, in-context translation
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EDR — Endpoint Detection and Response

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (RMM audit 2026-05-30)
- **Most recent:** 2026-05-30 (RMM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 RMM audit 2026-05-30
- **Vendor evidence:** CrowdStrike Falcon, SentinelOne Singularity, Microsoft Defender for Endpoint, Sophos Intercept X, Bitdefender GravityZone
- **Adjacency:** RMM, UEM, ITAM, DLP, REMOTE-ACCESS
- **Candidate capabilities:** behavior-based threat detection, endpoint isolation, EDR telemetry collection, automated response playbooks, threat hunting
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
- **Adjacency:** RMM, MSP-PSA, SUB-MGMT, ERP-FIN
- **Candidate capabilities:** per-endpoint usage metering, multi-tenant customer billing, contract-anchored quoting, automated invoicing
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DATA-OBSERVABILITY — Data Observability

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DCG audit 2026-05-30)
- **Most recent:** 2026-05-30 (DCG audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DCG audit 2026-05-30
- **Vendor evidence:** Monte Carlo, Acceldata, Bigeye, Anomalo, Soda, Sifflet, Metaplane, Datafold
- **Adjacency:** DCG, DQ, DI, OBS
- **Candidate capabilities:** automated freshness monitoring, schema drift detection, volume anomaly detection, distribution drift detection, lineage-based impact analysis, incident triage and root-cause analysis
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### DATA-CONTRACTS — Data Contracts Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DCG audit 2026-05-30)
- **Most recent:** 2026-05-30 (DCG audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DCG audit 2026-05-30
- **Vendor evidence:** Gable.ai, Datacontract.com, PayPal data-contract-cli, Confluent Schema Registry, Buf Schema Registry
- **Adjacency:** DCG, DI, DQ, DATA-AI-PLAT
- **Candidate capabilities:** contract authoring, schema versioning, contract enforcement at producer, breaking-change detection, consumer-impact notification
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EHS-MGMT — Environmental, Health and Safety Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (REAL-EST audit 2026-05-30)
- **Most recent:** 2026-05-30 (REAL-EST audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 REAL-EST audit 2026-05-30
- **Vendor evidence:** Cority, Intelex, Sphera, Enablon, VelocityEHS, Gensuite, ETQ Reliance
- **Adjacency:** REAL-EST, ESG, IWMS, GRC, FSQM
- **Candidate capabilities:** incident management, hazard analysis, regulatory permit tracking, health surveillance, OSHA/EU-OSHA reporting, contractor safety, audit and inspections
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### LEASE-ACCT — Lease Accounting and Administration

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (REAL-EST audit 2026-05-30)
- **Most recent:** 2026-05-30 (REAL-EST audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 REAL-EST audit 2026-05-30
- **Vendor evidence:** LeaseQuery, Visual Lease, CoStar Real Estate Manager, Lucernex, Nakisa Lease Administration
- **Adjacency:** REAL-EST, FINOPS, ACCT-PLAN, RECRD-MGMT
- **Candidate capabilities:** ASC 842 compliance, IFRS 16 compliance, lease classification, ROU asset calculation, lease modification accounting, disclosure reporting
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### LIVESTOCK-MGMT — Livestock Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (FMIS audit 2026-05-30)
- **Most recent:** 2026-05-30 (FMIS audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 FMIS audit 2026-05-30
- **Vendor evidence:** AgriWebb, Herdwatch, Cattle Manager, BeefCentral, Performance Beef, MaiaGrazing
- **Adjacency:** FMIS, FOOD-TRACE, FSQM
- **Candidate capabilities:** paddock and mob management, individual-animal records, mob movements, weight gains, pasture allocation, breeding records, treatment records, livestock-traceability identifiers
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
- **Adjacency:** ERP-FIN, EPM, AUDIT
- **Candidate capabilities:** balance sheet reconciliation, journal entry workflow, close task management, intercompany matching, flux analysis, certifications and attestations
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### TRM — Treasury and Risk Management

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (EPM audit 2026-05-30)
- **Most recent:** 2026-05-30 (EPM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 EPM audit 2026-05-30
- **Vendor evidence:** Kyriba, GTreasury, FIS Quantum, ION Treasury, Coupa Treasury
- **Adjacency:** ERP-FIN, EPM, SPEND-MGMT, AP-AUTO
- **Candidate capabilities:** cash positioning and forecasting, in-house banking, bank account management, payment factory, FX hedging, debt and investment management, intercompany netting
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
- **Adjacency:** ERP-FIN, EPM, AUDIT
- **Candidate capabilities:** ASC 740 income tax provision, deferred tax calculation, effective tax rate analysis, return to provision reconciliation, multi-jurisdictional tax disclosures, transfer pricing documentation
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
- **Adjacency:** ERP-FIN, EPM, AUDIT, ESG
- **Candidate capabilities:** multi-entity consolidation, intercompany elimination, currency translation, minority interest accounting, regulatory consolidated reporting, IFRS and GAAP reporting, segment reporting
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### EMP-ADVOCACY — Employee Advocacy Platform

- **Mention count:** 3
- **First surfaced:** 2026-05-30 (SMM audit 2026-05-30)
- **Most recent:** 2026-05-30 (EMP-EXP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SMM audit 2026-05-30
  - 2026-05-30 EMP-EXP audit 2026-05-30
- **Vendor evidence:** Hootsuite Amplify, Sprinklr Advocacy, Smarp (Sociabble), Bambu, EveryoneSocial, GaggleAMP, Oktopost
- **Adjacency:** SMM, EMP-EXP, HCM, INTRANET
- **Candidate capabilities:** curated content broadcast to employees, employee social share tracking, gamification and leaderboards, employee influencer scoring, internal newsletter generation, social-share attribution to revenue
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### SOCIAL-ADS — Paid Social Advertising

- **Mention count:** 2
- **First surfaced:** 2026-05-30 (SMM audit 2026-05-30)
- **Most recent:** 2026-05-30 (SMM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 SMM audit 2026-05-30
- **Vendor evidence:** Smartly.io, Sprinklr Ads, AdEspresso (Hootsuite), Strike Social, Stackla (Nosto), Madgicx
- **Adjacency:** SMM, ADV-AD-TECH, MA, REV-INTEL
- **Candidate capabilities:** cross-channel paid social campaign orchestration, dynamic creative optimization, ad-set auto-budget reallocation, social-ad creative versioning, social attribution and incrementality testing
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### IRM — Insider Risk Management

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (DLP audit 2026-05-30)
- **Most recent:** 2026-05-30 (DLP audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 DLP audit 2026-05-30
- **Vendor evidence:** Code42 Incydr, Microsoft Insider Risk Management, DTEX InTERCEPT, Proofpoint Insider Threat Management, Securonix UEBA, Cyberhaven, Forcepoint Risk-Adaptive Protection
- **Adjacency:** DLP, SECOPS, IGA, HCM, DSPM
- **Candidate capabilities:** user behavior risk scoring, insider-threat investigation, file lineage tracking, indicator-of-compromise correlation, employee exit risk, anomalous data movement, departing-user monitoring, evidence collection for HR/Legal
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_

### FRONTLINE-COMMS — Frontline / Deskless Worker Communication Platform

- **Mention count:** 1
- **First surfaced:** 2026-05-30 (WFM audit 2026-05-30)
- **Most recent:** 2026-05-30 (WFM audit 2026-05-30)
- **Surfaced by:**
  - 2026-05-30 WFM audit 2026-05-30
- **Vendor evidence:** WorkJam, Beekeeper, Crew, Yoobic, Microsoft Teams Frontline, Workvivo
- **Adjacency:** WFM, INTRANET, EMP-EXP, RET-STORE
- **Candidate capabilities:** broadcast messaging to deskless workforce, task and checklist push, shift swap conversations, frontline learning, frontline recognition
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
- **Adjacency:** EPM, ERP-FIN, FINOPS
- **Candidate capabilities:** activity-based costing, profitability allocation, cost driver modeling, customer and product profitability analysis, transfer pricing allocation, multi-step allocations
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
- **Adjacency:** EPM, ERP-FIN, AUDIT, ESG
- **Candidate capabilities:** narrative report authoring, XBRL tagging, statutory filing preparation, ESEF iXBRL submission, board-pack assembly, controlled narrative versioning
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
- **Point-solution-market test:** _(pending human triage)_
- **Status:** pending-review
- **Decision:** _(empty until reviewed)_


---

## Promoted

_(none yet)_

---

## Folded

_(none yet)_

---

## Rejected

_(none yet)_
