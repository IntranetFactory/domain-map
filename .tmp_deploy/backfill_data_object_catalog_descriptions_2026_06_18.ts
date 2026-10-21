/**
 * Backfill data_objects.catalog_description with authored reader-facing summaries.
 * Generated 2026-06-18 from the 13-batch condensation of existing data_objects.description.
 *
 * EMPTY-GUARDED: PATCHes only rows whose catalog_description is currently empty (Rule #20
 * shape, idempotent re-run safe). record_status is NEVER touched (Rule #1). One PATCH per id
 * via the project idiom, run through a concurrency pool.
 *
 * Run from project root: bun run .tmp_deploy/backfill_data_object_catalog_descriptions_2026_06_18.ts
 */

const DATA: { id: number; catalog_description: string }[] = [
  {
    "id": 445,
    "catalog_description": "Experiments comparing a control against one or more variants, with the success metric and run duration tracked."
  },
  {
    "id": 1236,
    "catalog_description": "Account-based marketing campaigns aimed at specific target accounts across multiple channels."
  },
  {
    "id": 164,
    "catalog_description": "Per-worker running balances for a leave type: accrued, taken, scheduled, and available, reset each accrual cycle."
  },
  {
    "id": 163,
    "catalog_description": "Worker requests for time away (vacation, sick, parental, bereavement, jury duty), carrying eligibility, approval chain, and accrual deduction."
  },
  {
    "id": 686,
    "catalog_description": "Accessibility violations found by automated scans, with severity, the guideline broken, the affected page, and remediation steps."
  },
  {
    "id": 603,
    "catalog_description": "Customer requests to open a deposit or payment account, covering account type, initial funding, linked services, and identity verification."
  },
  {
    "id": 1234,
    "catalog_description": "Account or contact marketing engagement scores reflecting in-market propensity, derived from intent and activity signals."
  },
  {
    "id": 1233,
    "catalog_description": "Resolutions of anonymous web and signal traffic to a known account or contact."
  },
  {
    "id": 1237,
    "catalog_description": "Account progressions through orchestration stages, from early awareness to an opportunity."
  },
  {
    "id": 604,
    "catalog_description": "Records of newly opened deposit or payment accounts, with account number, type, customer, funding method, and activation date."
  },
  {
    "id": 1222,
    "catalog_description": "Fit and priority scores per account, derived from the ideal customer profile and segment model for planning."
  },
  {
    "id": 198,
    "catalog_description": "Time buckets within a fiscal year, with open, soft-close, closed, or locked status that drives period-end close."
  },
  {
    "id": 184,
    "catalog_description": "Team or manager commitments to act on engagement survey results, tracked through to closure."
  },
  {
    "id": 1018,
    "catalog_description": "Configurable rules that decide which captured activities count toward which opportunity or account for engagement and attribution reporting."
  },
  {
    "id": 323,
    "catalog_description": "Raw operational measurements (energy, fuel, waste, mileage) used to calculate emissions."
  },
  {
    "id": 1114,
    "catalog_description": "Targetable audience definitions (custom, lookalike, saved interest, or suppression lists) synced to one or more ad platforms."
  },
  {
    "id": 1115,
    "catalog_description": "Budget assignments and pacing for a campaign or ad set, including caps, reallocation decisions, and the resulting spend split over time."
  },
  {
    "id": 1239,
    "catalog_description": "Accounts or audiences targeted by an account-based ad campaign, with their channel and tier."
  },
  {
    "id": 1117,
    "catalog_description": "Conversion and signal events sent server-side to an ad platform and matched back to paid delivery for optimization and attribution."
  },
  {
    "id": 1120,
    "catalog_description": "Reusable creative building blocks (images, video, headlines, copy, logos, CTAs) stored for assembly into ads and variants."
  },
  {
    "id": 1122,
    "catalog_description": "Product catalog feeds used to drive dynamic product ads, mapping catalog fields to creative templates per platform."
  },
  {
    "id": 881,
    "catalog_description": "FCRA-mandated notices issued when a background check is used to decline a candidate, covering the pre-adverse and post-adverse two-step process and dispute window."
  },
  {
    "id": 1163,
    "catalog_description": "Records linking advocacy-share-driven traffic to a lead, opportunity, or pipeline value for social-selling attribution and program ROI."
  },
  {
    "id": 1156,
    "catalog_description": "Time-boxed advocacy pushes that group content around a launch, event, or theme and set participation targets for advocates."
  },
  {
    "id": 1151,
    "catalog_description": "Curated, approved content items made available to advocates to reshare, with suggested copy and a sharing window."
  },
  {
    "id": 1152,
    "catalog_description": "Topic channels that group advocacy content by theme so advocates can follow and filter the subjects relevant to them."
  },
  {
    "id": 1157,
    "catalog_description": "Personalized digests of shareable content sent to advocates to prompt participation, built from each advocate's opted-in topics."
  },
  {
    "id": 1158,
    "catalog_description": "Ranking boards of advocates by points, shares, reach, or earned media value over a period, used to recognize and motivate participation."
  },
  {
    "id": 1160,
    "catalog_description": "Append-only ledger entries recording points awarded to or redeemed by an advocate for a specific action."
  },
  {
    "id": 1150,
    "catalog_description": "Configured employee advocacy programs, holding the enrolled audience, content topics, sharing rules, branding, and goals."
  },
  {
    "id": 1159,
    "catalog_description": "Rewards in the advocacy catalog that advocates redeem with earned points, with cost and redemption lifecycle."
  },
  {
    "id": 1162,
    "catalog_description": "Per-share engagement measurements: clicks, impressions, reactions, comments, reach, and earned media value for an employee share."
  },
  {
    "id": 1153,
    "catalog_description": "Individual acts of an employee resharing advocacy content to a linked personal social account, with channel, timestamp, and any personalized copy."
  },
  {
    "id": 1155,
    "catalog_description": "Personal social network accounts that advocates have connected and authorized for one-click resharing."
  },
  {
    "id": 1154,
    "catalog_description": "Employees enrolled as advocates, with participation status, opted-in topics, gamification standing, and linked social accounts."
  },
  {
    "id": 1161,
    "catalog_description": "Influence scores for advocates, derived from network size, engagement rate, reach, and share performance over a window."
  },
  {
    "id": 491,
    "catalog_description": "Seed, fertilizer, chemical, and fuel stock across farm bins and sheds, reconciled against applications and purchases."
  },
  {
    "id": 485,
    "catalog_description": "Pre-engagement client estimates priced from rate cards, expected effort, and media or production costs, which convert to a job once approved."
  },
  {
    "id": 478,
    "catalog_description": "Central engagement records for agency clients, the unit of billable work, carrying the brief, deliverables, assigned team, and rolled-up financials."
  },
  {
    "id": 480,
    "catalog_description": "Recurring fee agreements with a client, covering the monthly amount, included scope, and live burn-down against logged time and costs."
  },
  {
    "id": 1258,
    "catalog_description": "Records of a staffing or search agency submitting a candidate against a requisition, with the dedup ownership window and fee terms on conversion to a hire."
  },
  {
    "id": 479,
    "catalog_description": "Time logged against an agency job, task, and deliverable, with rate-card application, billable coding, and discipline tagging."
  },
  {
    "id": 736,
    "catalog_description": "Contact-center agent presence, availability, and pause-code state transitions."
  },
  {
    "id": 1245,
    "catalog_description": "Deliverable units of work below an epic, sized to be completed within a program increment by one or more teams."
  },
  {
    "id": 1247,
    "catalog_description": "Long-lived teams-of-teams that plan and deliver a continuous flow of value on a common cadence."
  },
  {
    "id": 1250,
    "catalog_description": "Time-phased views of planned epics and features across upcoming program increments, used for release planning and stakeholder communication."
  },
  {
    "id": 231,
    "catalog_description": "Registered LLM agents and generative-AI workflows, with prompt templates, tool bindings, retrieval indexes, evaluation harness, and deployed endpoints."
  },
  {
    "id": 722,
    "catalog_description": "Noise-reduction rules defining which alert patterns to filter or suppress, such as known-noise signatures and maintenance exclusions."
  },
  {
    "id": 511,
    "catalog_description": "Per-product-line allergen maps with changeover validation, labeling controls, and supplier-attestation references."
  },
  {
    "id": 395,
    "catalog_description": "Veterinary patients (companion animals, livestock, equine), with species, breed, identifying marks, microchip, and ownership history."
  },
  {
    "id": 1105,
    "catalog_description": "Sale or purchase transactions for animals or mobs, with counterparty, head count, weights, price, and destination."
  },
  {
    "id": 1104,
    "catalog_description": "Vaccinations, treatments, and medicine administrations for an animal or mob, with product, batch, dose, and the withholding period that gates sale eligibility."
  },
  {
    "id": 1102,
    "catalog_description": "Weigh observations for an animal or mob, with weight, date, and source, used to compute average daily gain and growth curves."
  },
  {
    "id": 94,
    "catalog_description": "Detected deviations from learned normal behavior, such as KPI excursions, novel error patterns, or traffic shape changes."
  },
  {
    "id": 462,
    "catalog_description": "Runtime registrations of API consumers, covering API key provisioning, assigned scopes, quota allocation, and on/off toggle."
  },
  {
    "id": 458,
    "catalog_description": "Runtime instances of an API version, tracking which version runs where (production, staging, regional) and its rollout and canary state."
  },
  {
    "id": 461,
    "catalog_description": "Gateway infrastructure for APIs, with deployment targets and throughput configuration."
  },
  {
    "id": 459,
    "catalog_description": "Rules governing API access, transformation, rate limits, and authentication."
  },
  {
    "id": 457,
    "catalog_description": "API schemas (OpenAPI, AsyncAPI, GraphQL) that define the interface contract published for consumers."
  },
  {
    "id": 460,
    "catalog_description": "Aggregate API metrics per version and consumer: call counts, latency percentiles, and error rates."
  },
  {
    "id": 456,
    "catalog_description": "API version lineage (v1.0, v2.0, sunset dates), each with its own policies, deployments, and audience."
  },
  {
    "id": 899,
    "catalog_description": "OFCCP-mandated logs of every internet applicant against a requisition, capturing demographics, expressed interest, qualifications, and disposition for audit."
  },
  {
    "id": 268,
    "catalog_description": "Aggregated total cost of ownership per enterprise application: license fees, infrastructure, support, personnel, and cloud usage."
  },
  {
    "id": 900,
    "catalog_description": "Categorized reasons a job application was not selected, driving OFCCP applicant-flow reporting and internal hiring analytics."
  },
  {
    "id": 271,
    "catalog_description": "Named integration points between two applications (API, ETL, message queue, file-drop, manual), with payload type, data owner, frequency, and SLA."
  },
  {
    "id": 888,
    "catalog_description": "Candidate answers to screening questions on a specific job application, used to auto-disqualify on knockout rules."
  },
  {
    "id": 887,
    "catalog_description": "Custom screening questions attached to a job posting or template, including knockout and qualifying questions with their answer type and rules."
  },
  {
    "id": 884,
    "catalog_description": "Audit-trail records of an application moving between stages, with from-stage, to-stage, actor, timestamp, and reason for cycle-time analytics."
  },
  {
    "id": 883,
    "catalog_description": "Configured stages in the recruiting pipeline (sourced, applied, screened, onsite, offer, hired) that define a job application's lifecycle."
  },
  {
    "id": 272,
    "catalog_description": "Multi-dimensional time-series scores per application: criticality, revenue attribution, adoption, strategic alignment, and technical health."
  },
  {
    "id": 413,
    "catalog_description": "Reader satisfaction signals on knowledge articles: ratings, helpful or not-helpful votes, and comments."
  },
  {
    "id": 412,
    "catalog_description": "Audit trail of edits to a knowledge article, with prior version, author, timestamp, change summary, and revert capability."
  },
  {
    "id": 776,
    "catalog_description": "Stock-based compensation expense recognized per period per cohort of grants, with forfeiture and modification accounting under ASC 718."
  },
  {
    "id": 1095,
    "catalog_description": "Lease-accounting journal entries posted to the general ledger under ASC 842 or IFRS 16, covering recognition, amortization, interest, modification, and termination."
  },
  {
    "id": 915,
    "catalog_description": "Per-learner, per-attempt records of an assessment: start time, score, pass or fail, and time on task, retained as compliance evidence."
  },
  {
    "id": 914,
    "catalog_description": "Item-bank questions with their stem, answer choices, scoring, and metadata for randomization."
  },
  {
    "id": 54,
    "catalog_description": "Lease, maintenance, support, or warranty contracts governing an asset or pool of assets, indexed on the asset side."
  },
  {
    "id": 202,
    "catalog_description": "Per-asset, per-book depreciation timelines giving period-by-period expense and accumulated depreciation, driving the monthly depreciation entries."
  },
  {
    "id": 55,
    "catalog_description": "Cross-cutting lifecycle log for hardware, software, and SaaS assets: procurement, deployment, transfer, retirement, and disposal."
  },
  {
    "id": 729,
    "catalog_description": "Management-fee schedules and performance-fee waterfalls for general partners, required to calculate true limited-partner returns."
  },
  {
    "id": 42,
    "catalog_description": "Forecasts of voluntary and involuntary attrition over a planning horizon, broken down by org unit, tenure, performance band, and geography."
  },
  {
    "id": 113,
    "catalog_description": "Defined customer cohorts (high-value-active, churn-risk, holiday-shoppers) computed from events and attributes, activated for targeting and outreach."
  },
  {
    "id": 958,
    "catalog_description": "Dynamic learner segments defined by attributes like department, location, and role, used by auto-enrollment and notification rules."
  },
  {
    "id": 293,
    "catalog_description": "Scoped audit fieldwork initiatives, with scope statement, budget, team, timeline, and procedures, moving from planned to completed."
  },
  {
    "id": 294,
    "catalog_description": "Control deviations, process gaps, or non-compliance found during audit fieldwork, with condition, cause, impact, remediation owner, and target date."
  },
  {
    "id": 289,
    "catalog_description": "Identified gaps, risk exposures, or non-conformances from assessments, audits, or policy exceptions, with priority, due date, owner, and status."
  },
  {
    "id": 292,
    "catalog_description": "Multi-year audit strategies and annual calendars defining audit-universe coverage, risk-based scoping, and timing."
  },
  {
    "id": 297,
    "catalog_description": "Forward-looking corrective-action proposals from audit fieldwork, with risk rating, proposed owner, target date, and expected cost or benefit."
  },
  {
    "id": 298,
    "catalog_description": "Formal audit deliverables, with executive summary, scope, findings and recommendations ranked by severity, management response, and sign-off."
  },
  {
    "id": 959,
    "catalog_description": "Rule-engine entries that auto-enroll learners into courses or paths based on audience membership and lifecycle events."
  },
  {
    "id": 225,
    "catalog_description": "Reusable remote-execution scripts in a management tool's library, with version history, parameter schema, scheduled runs, and per-target outcomes."
  },
  {
    "id": 880,
    "catalog_description": "Human review decisions on a completed background check (clear, engaged, decisional, declined), with rationale and individualized assessment notes."
  },
  {
    "id": 878,
    "catalog_description": "Individual sub-check results inside a background check order (county criminal, SSN trace, employment verification, drug screen), each with its own status and source."
  },
  {
    "id": 882,
    "catalog_description": "Candidate-initiated disputes of a background check result under FCRA, with the disputed component, candidate statement, re-investigation result, and resolution."
  },
  {
    "id": 877,
    "catalog_description": "Configured bundles of check types that can be ordered as one unit, defining what a standard package looks like for a role tier."
  },
  {
    "id": 12,
    "catalog_description": "External verification results for a candidate (criminal, employment, education, credit, identity), with status and findings from a screening provider."
  },
  {
    "id": 199,
    "catalog_description": "Owned cash or operating accounts at a bank, with institution, account number, currency, and intended use, driving cash management and payment runs."
  },
  {
    "id": 606,
    "catalog_description": "Customer banking issues, disputes, and escalations (unauthorized transactions, fraud claims, account errors, complaints), with account, agent, SLA, and resolution."
  },
  {
    "id": 605,
    "catalog_description": "Know-your-customer and anti-money-laundering reviews assessing customer risk, ownership, source of funds, and sanctions screening, required at onboarding and annual recertification."
  },
  {
    "id": 609,
    "catalog_description": "Posted transactions on a bank account: date, type, amount, currency, counterparty, and reconciliation status against the bank statement."
  },
  {
    "id": 1203,
    "catalog_description": "Seller-facing competitive cards showing how to win against a named competitor, with common objections and the counters to them."
  },
  {
    "id": 151,
    "catalog_description": "Insurance providers, retirement recordkeepers, and benefit administrators that fulfill a benefit plan and receive enrollment feeds."
  },
  {
    "id": 148,
    "catalog_description": "People covered under an employee's benefit plan, such as a spouse, partner, or child, with relationship, birth date, and eligibility documents."
  },
  {
    "id": 147,
    "catalog_description": "Per-employee, per-plan elected coverage with effective dates, covered dependents, contributions, and beneficiaries. The basis for payroll deductions."
  },
  {
    "id": 150,
    "catalog_description": "Annual windows during which employees may elect or change benefit plans for the next plan year, driving enrollment communications and carrier updates."
  },
  {
    "id": 146,
    "catalog_description": "Employer-sponsored benefit offerings such as medical, dental, vision, life, disability, and retirement, with eligibility rules, contributions, and coverage tiers."
  },
  {
    "id": 281,
    "catalog_description": "Post-initiative metric captures recording realized ROI, goal achievement, and variance against plan, closing the loop on the expected business value."
  },
  {
    "id": 409,
    "catalog_description": "Controlled pre-release programs with a defined cohort, features, and date range for validating a product before general availability."
  },
  {
    "id": 692,
    "catalog_description": "Interactive dashboards combining multiple visualizations, bound to underlying data models for self-service analytics."
  },
  {
    "id": 693,
    "catalog_description": "Saved explorations and prepared queries authored for reuse in analytics and reporting."
  },
  {
    "id": 691,
    "catalog_description": "Published reports authored and served for business intelligence, including workbooks, dashboard-bound reports, and saved views."
  },
  {
    "id": 694,
    "catalog_description": "Scheduled delivery configurations that push a report or dashboard to recipients by email, chat, or webhook on a set cadence."
  },
  {
    "id": 823,
    "catalog_description": "Catalog descriptions of intellectual works across all formats, from books and periodicals to audio, video, maps, and datasets, encoded in library standards."
  },
  {
    "id": 1192,
    "catalog_description": "Running on-account balances for a boater that fuel, store, and service charges post to, settled periodically."
  },
  {
    "id": 1184,
    "catalog_description": "Marina customers with contact details, communication preferences, account balance, and the vessels and contracts they hold."
  },
  {
    "id": 1193,
    "catalog_description": "Boatyard service jobs on a vessel, such as repairs, winterization, detailing, or commissioning, with labor, parts, and status."
  },
  {
    "id": 699,
    "catalog_description": "Conversational AI bot configurations defining persona, instructions, system prompt, and disambiguation rules."
  },
  {
    "id": 689,
    "catalog_description": "Deviations from brand guidelines detected automatically, such as off-brand phrasing or unauthorized terms, with violation type and recommended fix."
  },
  {
    "id": 503,
    "catalog_description": "Reproductive events such as natural service, artificial insemination, or embryo transfer, with sire, technician, and date."
  },
  {
    "id": 1103,
    "catalog_description": "Breeding-cycle events such as joining, pregnancy test, and birth, with sire, dam, offspring, and birth weight, tracking reproductive performance."
  },
  {
    "id": 687,
    "catalog_description": "Broken links found by automated audits, with source and target URL, status code, first-detected date, and how many pages are affected."
  },
  {
    "id": 19,
    "catalog_description": "Pairings of a new hire with an existing employee for onboarding support, with scope, start and end dates, and meeting cadence."
  },
  {
    "id": 681,
    "catalog_description": "Binaries, container images, and packages produced by a pipeline run, with type, version, registry location, and signing status, ready for deployment."
  },
  {
    "id": 721,
    "catalog_description": "Property certifications such as LEED, BREEAM, or seismic ratings that support underwriting and tenant appeal."
  },
  {
    "id": 506,
    "catalog_description": "Outbound bulk milk shipments to a processor or co-op, with pickup time, volume, quality grade, and hauler."
  },
  {
    "id": 248,
    "catalog_description": "Hierarchical maps of an organization's business capabilities, with maturity and investment ratings and links to applications, processes, and owners."
  },
  {
    "id": 247,
    "catalog_description": "Design-time definitions of business processes as diagrams, with version history, lifecycle state, and ownership, distinct from runtime executions."
  },
  {
    "id": 584,
    "catalog_description": "Business rules inferred from event-log patterns, such as activity orderings, forbidden sequences, and decision thresholds, capturing hidden control logic."
  },
  {
    "id": 1057,
    "catalog_description": "Corporate journeys grouping purpose, dates, traveler, and booked segments into one unit that is approved, tracked, and reconciled to expenses."
  },
  {
    "id": 276,
    "catalog_description": "Scoring models for prioritizing portfolio items by value, strategic alignment, risk, and dependencies, producing a ranked backlog."
  },
  {
    "id": 520,
    "catalog_description": "Whole, half, or quarter-animal pre-orders, with deposit status, customer cut-sheet preferences, processor coordination, and pickup date."
  },
  {
    "id": 1263,
    "catalog_description": "Change Advisory Board meeting records covering agenda, attendees, changes reviewed, decisions, and minutes."
  },
  {
    "id": 801,
    "catalog_description": "Two-dimensional drawings derived from CAD models, with their own revision, approval, and title-block metadata and a separate release cycle."
  },
  {
    "id": 800,
    "catalog_description": "Metadata records for CAD parts and assemblies, tracking owner, check-in and check-out state, revision, and the file they reference."
  },
  {
    "id": 122,
    "catalog_description": "Recorded sales calls with audio or video, transcript, participants, and topic and sentiment metadata, attached to deals for review."
  },
  {
    "id": 1016,
    "catalog_description": "Timestamped annotations left on a recorded call during review, tied to the moment in the conversation they refer to."
  },
  {
    "id": 365,
    "catalog_description": "Common-area-maintenance expense pools allocated to tenants by pro-rata share, with gross-up, audit caps, and exclusion of capital items."
  },
  {
    "id": 892,
    "catalog_description": "Reusable assessment definitions such as coding challenges, work samples, and skills tests, with time limit and scoring rubric, assigned to candidates."
  },
  {
    "id": 10,
    "catalog_description": "Skills, cognitive, technical, or personality test results attached to an application, often sourced from an external assessment provider."
  },
  {
    "id": 870,
    "catalog_description": "Per-candidate opt-in records for privacy and data retention, with consent type, jurisdiction, and granted and withdrawal timestamps."
  },
  {
    "id": 1000,
    "catalog_description": "Files attached to a candidate such as resumes, cover letters, portfolios, and signed disclosures, with document type, storage location, and visibility."
  },
  {
    "id": 1040,
    "catalog_description": "Threaded email correspondence with a candidate as a first-class record, capturing sent and received messages, the template used, and delivery status."
  },
  {
    "id": 866,
    "catalog_description": "Single recruiter-to-candidate touchpoints across channels such as email, call, or SMS, with direction, timestamp, status, and content reference."
  },
  {
    "id": 1001,
    "catalog_description": "Internal-only recruiter or hiring-team notes on a candidate, with author, body, visibility scope, and optional mentions, never sent to the candidate."
  },
  {
    "id": 867,
    "catalog_description": "Multi-touch automated outreach sequences targeting talent-pool segments, with cadence, step templates, audience filter, and lifecycle state."
  },
  {
    "id": 6,
    "catalog_description": "Employee-submitted candidate suggestions linked to a requisition, tracking the referring employee, candidate, status, and any payable bonus."
  },
  {
    "id": 1003,
    "catalog_description": "Links between candidates and tags, recording who assigned each tag and when, with optional context."
  },
  {
    "id": 1002,
    "catalog_description": "Free-form labels applied to candidates to support segmentation, search, and pool inclusion, with name, optional category, and color."
  },
  {
    "id": 3,
    "catalog_description": "People known to the recruiting organization, with or without an active application, carrying contact details, resume, tags, consent, and source."
  },
  {
    "id": 770,
    "catalog_description": "Authoritative shareholder ledgers for an issuing company, listing securities, classes, holders, and transaction history."
  },
  {
    "id": 1226,
    "catalog_description": "Sales-capacity models setting coverage, ramp, and productivity assumptions sized against the revenue target."
  },
  {
    "id": 87,
    "catalog_description": "Periodic resource utilization snapshots such as CPU, memory, disk, and throughput, used for capacity planning, trend analysis, and cost allocation."
  },
  {
    "id": 1024,
    "catalog_description": "Investor-facing notice documents for a capital call, in standard reporting format with publication timestamps, stored apart from the call record."
  },
  {
    "id": 761,
    "catalog_description": "Per-investor line items against a capital call, with allocated amount, due date, funded amount, and funded date."
  },
  {
    "id": 367,
    "catalog_description": "Notices requesting investor funding against commitments, carrying call amount, allocation, due date, and funding receipt tracking."
  },
  {
    "id": 351,
    "catalog_description": "Building improvement, renovation, or expansion projects, with budget, timeline, and completion status."
  },
  {
    "id": 530,
    "catalog_description": "Collections of physical or digital documents submitted together for automated processing, with source, capture date, document count, and status."
  },
  {
    "id": 1017,
    "catalog_description": "Automatically captured emails, meetings, and calls attributed to an opportunity and account, removing manual logging and keeping the record complete."
  },
  {
    "id": 745,
    "catalog_description": "Real-time card pre-authorization events from the card network, with the policy decision, distinct from settled card transactions."
  },
  {
    "id": 213,
    "catalog_description": "Authorization and settlement records from a corporate card feed, with merchant, category, amount, and posting date, matched to expense lines."
  },
  {
    "id": 619,
    "catalog_description": "Coordinated care documents for a patient condition, with goals, interventions, target dates, responsible providers, and escalation triggers."
  },
  {
    "id": 179,
    "catalog_description": "Worker-declared career interests, including target roles, mobility preferences, and timeline, used to drive internal-mobility matching."
  },
  {
    "id": 863,
    "catalog_description": "Projected routes from a worker's current role toward an aspiration, with the skills required, distinct from employee-authored aspirations."
  },
  {
    "id": 152,
    "catalog_description": "Outbound integrations that send enrollment and remittance data to a benefit carrier, typically as weekly batches whose failures cause coverage discrepancies."
  },
  {
    "id": 383,
    "catalog_description": "Session-scoped carts holding products before checkout, with item quantities, pricing, and promotions. Abandoned carts feed marketing nurture."
  },
  {
    "id": 193,
    "catalog_description": "Taxonomy of HR request types such as pay, benefits, leave, and policy, driving routing, SLAs, knowledge lookup, and trend analytics."
  },
  {
    "id": 1137,
    "catalog_description": "Case files for flexible, non-sequential knowledge work: containers of ad-hoc and planned activities, milestones, and gates decided at runtime."
  },
  {
    "id": 200,
    "catalog_description": "Postings to a bank account such as receipts, payments, transfers, and fees, used to reconcile against journal entries and bank statements."
  },
  {
    "id": 735,
    "catalog_description": "Call and screen recordings from contact-center sessions, distinct from sales call recordings."
  },
  {
    "id": 509,
    "catalog_description": "Monitoring readings at critical control points in food safety, where a deviation triggers a corrective-action workflow."
  },
  {
    "id": 932,
    "catalog_description": "Templates used to issue completion certificates to learners, carrying layout and dynamic fields."
  },
  {
    "id": 931,
    "catalog_description": "Catalog of certification types, with issuing authority, validity period, recertification policy, and prerequisite courses."
  },
  {
    "id": 1280,
    "catalog_description": "Renewal cycles of an existing certification, distinct from its initial issuance."
  },
  {
    "id": 936,
    "catalog_description": "Per-learner ledger of earned continuing-education credits, serving as evidence for professional licensure reporting."
  },
  {
    "id": 1264,
    "catalog_description": "Detected conflicts between overlapping changes or a change scheduled in a blackout window, recording the colliding changes and the resolution."
  },
  {
    "id": 439,
    "catalog_description": "Change-data-capture stream metadata, including source table, captured columns, capture mode, and watermark positions."
  },
  {
    "id": 571,
    "catalog_description": "Files pinned or shared at the channel level rather than on an individual message, with who shared them, access permissions, and expiry."
  },
  {
    "id": 568,
    "catalog_description": "Membership records linking a user or external guest to a channel, with join date, role, notification settings, and access level."
  },
  {
    "id": 1223,
    "catalog_description": "Strategic plans defining which sales routes, such as direct, partner, or digital, carry which market segments."
  },
  {
    "id": 564,
    "catalog_description": "Persistent conversation spaces that are private, public, or direct, with name, topic, members, retention policy, and guest federation."
  },
  {
    "id": 567,
    "catalog_description": "Synchronous audio or video meetings spawned from a channel or direct message, with participants, duration, and recording and transcription references."
  },
  {
    "id": 570,
    "catalog_description": "Files or links embedded in a chat message, with attachment type, size, upload time, and virus-scan status."
  },
  {
    "id": 565,
    "catalog_description": "Individual messages posted to a channel or thread, with author, timestamp, content, attachments, edit history, and reactions."
  },
  {
    "id": 566,
    "catalog_description": "Nested conversation branches within a channel message, with the parent message, replies, participants, and read state."
  },
  {
    "id": 386,
    "catalog_description": "Transactional checkout sessions capturing customer identity, payment method, shipping address, and conversion into a final order."
  },
  {
    "id": 1081,
    "catalog_description": "Hazardous substances on hand, with quantity, location, and links to their safety data sheet and exposure limits."
  },
  {
    "id": 80,
    "catalog_description": "Captured configuration states at a point in time, used for drift detection, approved-state validation, and audit evidence."
  },
  {
    "id": 78,
    "catalog_description": "Configuration-item types in a hierarchy, defining schema, inherited attributes, and class-level monitoring and discovery policies."
  },
  {
    "id": 680,
    "catalog_description": "Single executions of a pipeline, with triggering commit, timestamps, duration, overall and per-stage status, and runner, used for delivery metrics."
  },
  {
    "id": 679,
    "catalog_description": "Pipeline definitions for build, test, scan, and deploy, with source repository, trigger conditions, stage configuration, and secrets binding."
  },
  {
    "id": 77,
    "catalog_description": "Edges in the configuration-item graph such as depends-on, runs-on, and hosted-by, the topology behind service mapping and impact analysis."
  },
  {
    "id": 627,
    "catalog_description": "Allocations of claims to adjusters, with assigned date, caseload status, and reason, driving adjuster workload analytics."
  },
  {
    "id": 629,
    "catalog_description": "Disbursements to a claimant, provider, or vendor, with amount, payment date, reference, and allocation to coverages."
  },
  {
    "id": 628,
    "catalog_description": "Settlement agreements for a resolved claim, with approved amount, conditions, releases, payee, and closure terms."
  },
  {
    "id": 1050,
    "catalog_description": "Versioned, governed collections of approved contract clauses, often organized by jurisdiction or contract type, that authors draw from."
  },
  {
    "id": 401,
    "catalog_description": "Professional-services engagement records with client, service line, scope, fee model, period, and status, distinct from the contract artifact."
  },
  {
    "id": 739,
    "catalog_description": "Invoices billed to clients for a legal matter, built from time entries, disbursements, and retainer drawdowns."
  },
  {
    "id": 618,
    "catalog_description": "Documented patient-provider visits with date, type, chief complaint, vitals, diagnosis and procedure codes, and attending clinician."
  },
  {
    "id": 613,
    "catalog_description": "Requests from clinical staff to repair, configure, train on, or investigate medical devices, routed to the clinical-engineering team."
  },
  {
    "id": 622,
    "catalog_description": "Provider documentation of patient encounters, including progress notes, nurse notes, and discharge summaries."
  },
  {
    "id": 621,
    "catalog_description": "Provider orders for tests, medications, therapies, or procedures, with order type, priority, target facility, and results."
  },
  {
    "id": 337,
    "catalog_description": "Managed cloud databases, warehouses, datasets, or clusters that hold structured data, tracked for security posture."
  },
  {
    "id": 336,
    "catalog_description": "Cloud object-storage buckets or containers holding unstructured data, tracked for security posture."
  },
  {
    "id": 449,
    "catalog_description": "Groupings of worker nodes in a cluster, with instance size, scaling config, labels, taints, and zone distribution."
  },
  {
    "id": 1270,
    "catalog_description": "Assignable units in the cmi5 standard, launched against a learning record store as the modern successor to SCORM."
  },
  {
    "id": 1015,
    "catalog_description": "Manager evaluations of a call or rep against a talk-track rubric, scoring how well the playbook was followed."
  },
  {
    "id": 1014,
    "catalog_description": "One-on-one coaching reviews, usually tied to a recorded call, with notes and follow-up actions for the rep."
  },
  {
    "id": 677,
    "catalog_description": "Git commits on a source repository, with author, timestamp, message, parent commits, and diff summary."
  },
  {
    "id": 645,
    "catalog_description": "Cited non-compliance with permits, building code, or regulations, with the subject, severity, fines, and remediation status."
  },
  {
    "id": 381,
    "catalog_description": "Customer purchase orders created at checkout, tracked through fulfillment and completion."
  },
  {
    "id": 384,
    "catalog_description": "Sellable products with name, description, SKU, pricing, and inventory references."
  },
  {
    "id": 389,
    "catalog_description": "Physical or digital shipments tied to a fulfillment, with carrier, tracking, and delivery status. Includes returns."
  },
  {
    "id": 385,
    "catalog_description": "Brand or channel storefronts (web store, mobile app, marketplace listing) with their catalog mapping."
  },
  {
    "id": 363,
    "catalog_description": "Commercial real-estate leases for office, retail, or industrial space, with base rent, escalations, improvements, and renewal options."
  },
  {
    "id": 354,
    "catalog_description": "How a transaction's commission is divided across brokerages and then internal agents, used by accounting and tax reporting."
  },
  {
    "id": 159,
    "catalog_description": "Imported market salary data for a job-level and geography combination, sourced from external compensation surveys."
  },
  {
    "id": 153,
    "catalog_description": "Total-rewards package definitions per role, level, and location, covering base, bonus target, equity, and allowances."
  },
  {
    "id": 157,
    "catalog_description": "Personalized total-rewards statements showing a worker the value of their base, bonus, equity, benefits, and perks."
  },
  {
    "id": 857,
    "catalog_description": "Role-anchored bundles of required skills and target proficiency levels, used for gap analysis and internal matching."
  },
  {
    "id": 1202,
    "catalog_description": "Tracked pieces of competitor or market intelligence, with their source, relevance, and disposition."
  },
  {
    "id": 1204,
    "catalog_description": "Profiles of tracked competitors covering positioning, pricing, strengths, and weaknesses."
  },
  {
    "id": 173,
    "catalog_description": "Mandatory training assignments tied to a regulation, role, location, or hire event, with due dates and escalation policy."
  },
  {
    "id": 939,
    "catalog_description": "Regulator-facing audit records of who completed which training, when, with version and evidence references."
  },
  {
    "id": 283,
    "catalog_description": "Safeguards or actions designed to reduce risk, with control type, scope, owner, and test frequency."
  },
  {
    "id": 288,
    "catalog_description": "Artifacts proving an obligation was met, such as audit reports, assessment results, attestations, or log exports."
  },
  {
    "id": 287,
    "catalog_description": "Requirements imposed by a regulation or internal policy that must be fulfilled and tracked."
  },
  {
    "id": 285,
    "catalog_description": "Formal governance directives such as acceptable-use, data-protection, or anti-corruption policies, with version, scope, and owner."
  },
  {
    "id": 1268,
    "catalog_description": "Reference table of statutes a tenant is subject to, with jurisdiction, citation, and retention period; each tenant activates its applicable subset."
  },
  {
    "id": 282,
    "catalog_description": "Identified threats to organizational objectives, with likelihood, impact, inherent and residual severity, and owner."
  },
  {
    "id": 938,
    "catalog_description": "Campaigns that bundle compliance training assignments by audience and due date, such as an annual code-of-conduct cycle."
  },
  {
    "id": 76,
    "catalog_description": "Canonical records of IT things under management: servers, containers, applications, services, network devices, databases, and cloud resources."
  },
  {
    "id": 393,
    "catalog_description": "Conflict-of-interest checks for a proposed new client, with matches across existing matters and parties and the resolution."
  },
  {
    "id": 1042,
    "catalog_description": "Source intranet platforms under governance, with platform type, base URL, authentication, crawl schedule, and status."
  },
  {
    "id": 1235,
    "catalog_description": "Lawful-basis and opt-in or opt-out state governing whether a contact's data may be processed and activated."
  },
  {
    "id": 257,
    "catalog_description": "Unified contact-center customer identities reconciling phone numbers, emails, and customer IDs across channels."
  },
  {
    "id": 455,
    "catalog_description": "Image repositories scoped to a cluster, with registry policies, pull secrets, and image scanning."
  },
  {
    "id": 450,
    "catalog_description": "Container workload definitions such as deployments and jobs, with replica counts, restart policy, and scheduling rules."
  },
  {
    "id": 1142,
    "catalog_description": "Per-worker records that a mandatory broadcast or piece of content was read and acknowledged, used as read-receipt proof."
  },
  {
    "id": 684,
    "catalog_description": "Inventory and quality assessments of web content, with page counts, health scores, staleness, and orphaned pages."
  },
  {
    "id": 1216,
    "catalog_description": "Curated groupings of enablement content organized by stage, persona, or play."
  },
  {
    "id": 442,
    "catalog_description": "Reusable composable blocks such as heroes, calls to action, text, images, and forms used to build pages."
  },
  {
    "id": 429,
    "catalog_description": "Binary files paired with metadata, the core records of an enterprise content management library."
  },
  {
    "id": 1218,
    "catalog_description": "Append-only events capturing when content is opened, shared, or tied to a deal, with the buyer's contact identity."
  },
  {
    "id": 132,
    "catalog_description": "Individual structured content records conforming to a content type, served through a delivery API to any channel."
  },
  {
    "id": 136,
    "catalog_description": "Isolated working copies of content such as dev, staging, or production, used to test content changes safely before promoting."
  },
  {
    "id": 690,
    "catalog_description": "Editorial calendar and governance rules for retiring or refreshing content, with review dates, owners, and sunset dates."
  },
  {
    "id": 135,
    "catalog_description": "Locales configured within a content environment, including fallback chain and default flag, driving field-level localization."
  },
  {
    "id": 133,
    "catalog_description": "Scheduled batches of content changes published together to coordinate go-lives across many entries."
  },
  {
    "id": 1240,
    "catalog_description": "Multichannel content-syndication programs that deliver gated content to target accounts."
  },
  {
    "id": 131,
    "catalog_description": "Schema definitions for a class of content entries, specifying fields, references, validation, and locale settings."
  },
  {
    "id": 191,
    "catalog_description": "Supplier invoices for contingent labor, computed from approved timesheets and rate cards, then routed for matching and payment."
  },
  {
    "id": 190,
    "catalog_description": "Timesheets from contingent workers against a work order, with approved hours, expenses, and project codes."
  },
  {
    "id": 186,
    "catalog_description": "Non-employee resources such as contractors, agency staff, consultants, and interns, with supplier, role, rate, and end date."
  },
  {
    "id": 935,
    "catalog_description": "Continuing education credit definitions, with credit hours, accrediting body, and eligible courses."
  },
  {
    "id": 1048,
    "catalog_description": "Formal changes to the terms of an executed contract, each tracked with its own approval and signature trail."
  },
  {
    "id": 68,
    "catalog_description": "Reusable clause library with preferred and fallback language for terms like indemnification, IP, termination, and payment."
  },
  {
    "id": 1053,
    "catalog_description": "External parties to a contract, held separately because a counterparty may not be a CRM account or supplier and may sign many contracts."
  },
  {
    "id": 423,
    "catalog_description": "Draft contracts handed off from an approved quote, the precursor to a signed contract."
  },
  {
    "id": 1054,
    "catalog_description": "Date-driven checkpoints in a contract, such as a delivery or review date, distinct from a deliverable obligation."
  },
  {
    "id": 1056,
    "catalog_description": "Structured threads of negotiation rounds and counterparty exchanges on a contract."
  },
  {
    "id": 67,
    "catalog_description": "Specific commitments extracted from a contract, such as performance, payment, delivery, or reporting, each with an owner and due date."
  },
  {
    "id": 1049,
    "catalog_description": "Records of a single renewal of an existing contract, capturing the renewed term, pricing, and outcome."
  },
  {
    "id": 1052,
    "catalog_description": "Structured assessments of the legal or commercial risk in a contract or clause, produced during review."
  },
  {
    "id": 69,
    "catalog_description": "Pre-approved contract templates such as NDAs, MSAs, and SOWs, assembled from the clause library to author new contracts."
  },
  {
    "id": 1086,
    "catalog_description": "Contractor and third-party safety prequalification records, with criteria, status, and ties to site access and permits."
  },
  {
    "id": 284,
    "catalog_description": "Test results verifying a control's operating effectiveness, with tester, scope, result, evidence, and remediation status."
  },
  {
    "id": 296,
    "catalog_description": "Control tests recording what was tested, how, sample size, exceptions found, and evidence references."
  },
  {
    "id": 399,
    "catalog_description": "Controlled-substance receipt, dispensing, and disposal records required by the DEA, with drug, schedule, quantity, and reconciliation."
  },
  {
    "id": 1006,
    "catalog_description": "Commitments and follow-ups extracted from a conversation, tracked from open to done to confirm post-call execution."
  },
  {
    "id": 701,
    "catalog_description": "Branching dialog graphs that orchestrate a conversational journey."
  },
  {
    "id": 124,
    "catalog_description": "AI-extracted insights from calls, emails, and meetings, including competitor mentions, sentiment shifts, commitments, and risk signals."
  },
  {
    "id": 1005,
    "catalog_description": "Topic mentions extracted from a recorded conversation, such as competitor references, pricing, and objections, each tagged to a transcript span."
  },
  {
    "id": 259,
    "catalog_description": "Turn-by-turn records of bot or AI-assistant conversations, with utterances, intents, confidence scores, and escalation events."
  },
  {
    "id": 744,
    "catalog_description": "Corporate card issuance and control records, governing limits and spending controls."
  },
  {
    "id": 212,
    "catalog_description": "Issued corporate cards, with issuer, last four, cardholder, status, and spending controls, feeding the card transaction stream."
  },
  {
    "id": 1076,
    "catalog_description": "Corrective or preventive actions arising from an incident, inspection, or audit, with owner, due date, and effectiveness verification."
  },
  {
    "id": 196,
    "catalog_description": "Organizational units for cost allocation, with code, manager, hierarchy, and currency, driving variance and departmental reporting."
  },
  {
    "id": 390,
    "catalog_description": "Promotion codes and campaign offers such as discounts, BOGO, or free shipping, applied to a cart or order."
  },
  {
    "id": 913,
    "catalog_description": "Quiz or exam definitions tied to a course or lesson, with passing score and attempt policy."
  },
  {
    "id": 919,
    "catalog_description": "Scoped catalog views surfacing a subset of courses to a specific audience, branch, or domain."
  },
  {
    "id": 917,
    "catalog_description": "Hierarchical taxonomy for browsing and reporting on the course catalog."
  },
  {
    "id": 912,
    "catalog_description": "Terminal completion records per learner per course version, marking the course as finished."
  },
  {
    "id": 920,
    "catalog_description": "Forum-style discussion threads attached to a course or lesson, supporting collaborative learning."
  },
  {
    "id": 169,
    "catalog_description": "Per-learner per-course records tracking assigned and due dates, attempts, status, and score."
  },
  {
    "id": 907,
    "catalog_description": "Units within a course that group related lessons, supporting completion tracking below course level."
  },
  {
    "id": 923,
    "catalog_description": "Scheduled instances of a course, with date range, location, capacity, language, and delivery mode."
  },
  {
    "id": 922,
    "catalog_description": "Numeric ratings per learner per course, feeding aggregate analytics."
  },
  {
    "id": 930,
    "catalog_description": "Handouts, supplementary materials, and pre-reads attached to a course offering or session."
  },
  {
    "id": 921,
    "catalog_description": "Learner-authored qualitative reviews of a course written after completion."
  },
  {
    "id": 924,
    "catalog_description": "Individual sessions within a multi-day offering, with per-session attendance and instructor assignment."
  },
  {
    "id": 918,
    "catalog_description": "Free-form tags alongside categories that support faceted search of courses."
  },
  {
    "id": 906,
    "catalog_description": "Versioned snapshots of a course's content, required to record which version each learner completed for compliance."
  },
  {
    "id": 167,
    "catalog_description": "Learning units such as e-learning modules, videos, live sessions, or blended programs, with format, duration, and prerequisites."
  },
  {
    "id": 504,
    "catalog_description": "Cow health incidents such as mastitis or lameness, with treatment, withdrawal period, and recovery status."
  },
  {
    "id": 483,
    "catalog_description": "Initiating documents for a creative job, setting the client objective, audience, key message, deliverables, deadlines, and budget."
  },
  {
    "id": 484,
    "catalog_description": "Assets under production within an agency job, such as images, videos, layouts, or copy, with version history and proofing and approval state."
  },
  {
    "id": 1119,
    "catalog_description": "Named variations of a creative made for testing, combining specific headline, body, image, and call-to-action choices with their own performance trail."
  },
  {
    "id": 933,
    "catalog_description": "Definitions of digital badges and micro-credentials, covering criteria, image, issuer, and expiration policy."
  },
  {
    "id": 1279,
    "catalog_description": "Third-party verification handshakes confirming that an issued badge or credential is genuine."
  },
  {
    "id": 508,
    "catalog_description": "Critical control points in a food-safety plan, each with its hazard, critical limit, monitoring frequency, and responsible party."
  },
  {
    "id": 495,
    "catalog_description": "Food-traceability events along the supply chain, such as growing, receiving, transformation, and shipping, with their key data references."
  },
  {
    "id": 98,
    "catalog_description": "People at customer or prospect organizations, carrying title, contact details, decision-maker flag, preferred channel, and opt-in state."
  },
  {
    "id": 99,
    "catalog_description": "Prospects captured before qualification, tracking source, score, status, assigned rep, and the contact and account they would convert into."
  },
  {
    "id": 100,
    "catalog_description": "Active sales deals, tracking stage, amount, close date, probability, products, competitor, and decision criteria."
  },
  {
    "id": 487,
    "catalog_description": "Per-field seasonal planting plans covering crop, variety, target yield, and application schedule, including multi-year rotation history."
  },
  {
    "id": 1249,
    "catalog_description": "Dependencies between work owned by different teams that must be coordinated and resolved to keep the program on track."
  },
  {
    "id": 514,
    "catalog_description": "Per-member, per-season farm-share subscriptions, covering share type, customization preferences, payment plan, and pickup location."
  },
  {
    "id": 515,
    "catalog_description": "Weekly packed farm shares for a specific member, listing contents, swaps applied, packing reference, and delivery or pickup status."
  },
  {
    "id": 105,
    "catalog_description": "Customer satisfaction, NPS, and effort survey responses tied to a case, interaction, or relationship-level survey."
  },
  {
    "id": 954,
    "catalog_description": "Grouped learning paths and courses targeting a role, function, or compliance scope."
  },
  {
    "id": 114,
    "catalog_description": "Derived attributes attached to a resolved customer profile, such as lifetime value, RFM score, propensity to buy, churn likelihood, and lifecycle stage."
  },
  {
    "id": 103,
    "catalog_description": "Customer-facing support tickets, carrying severity, channel, queue, SLA clock, and references to the customer, contact, and satisfaction survey."
  },
  {
    "id": 104,
    "catalog_description": "Records of what support a customer can use, covering service tier, monthly hours, supported channels, named contacts, and SLA response targets."
  },
  {
    "id": 111,
    "catalog_description": "Unified stream of every customer interaction across web, mobile, email, in-product, sales, and support channels."
  },
  {
    "id": 407,
    "catalog_description": "Qualitative or quantitative feedback from customers on product experience, gaps, or opportunities."
  },
  {
    "id": 315,
    "catalog_description": "Single resolved customer identities consolidated across all source systems using match, merge, and survivorship rules."
  },
  {
    "id": 107,
    "catalog_description": "Seller-issued invoices billed to customers, with line items, tax, payment terms, due date, and status from draft to paid or written off."
  },
  {
    "id": 115,
    "catalog_description": "Observed multi-channel journeys showing how a customer moved through touchpoints over time."
  },
  {
    "id": 821,
    "catalog_description": "Physical service locations belonging to a customer, where one customer can have many sites across properties or chains."
  },
  {
    "id": 106,
    "catalog_description": "Customers' recurring revenue contracts, covering plan, term, MRR or ARR, billing cadence, seat count, and lifecycle from trial to churned."
  },
  {
    "id": 97,
    "catalog_description": "Canonical records of customers, whether business accounts or end consumers, carrying identity, segmentation, lifecycle stage, and account hierarchy."
  },
  {
    "id": 499,
    "catalog_description": "Individual cow records, covering ear tag, breed, birth date, sire and dam, parity, lactation status, and pen location."
  },
  {
    "id": 378,
    "catalog_description": "Video-telematics incident records of AI-detected driving events such as collisions, near-misses, and distracted driving, with clips, driver, and severity."
  },
  {
    "id": 307,
    "catalog_description": "Governance rules controlling who can access a data asset, covering audience, permission level, conditions, approval chain, and audit trail."
  },
  {
    "id": 300,
    "catalog_description": "Cataloged data-bearing assets such as tables, datasets, APIs, databases, and files, with metadata, owner, storage location, and source system."
  },
  {
    "id": 306,
    "catalog_description": "Attestations that a data asset meets quality and compliance thresholds for production use, with certifier, date, and valid-until."
  },
  {
    "id": 303,
    "catalog_description": "Sensitivity tags applied to data assets, such as PII, PCI, PHI, confidential, or internal."
  },
  {
    "id": 952,
    "catalog_description": "Right-to-erasure requests under GDPR Article 17, covering scope, anonymization policy, regulator deadline, and fulfillment status."
  },
  {
    "id": 304,
    "catalog_description": "Logical subject-area groupings such as Customer, Order, or Inventory that organize multiple data assets with ownership and documentation."
  },
  {
    "id": 332,
    "catalog_description": "Raw events of sensitive data being moved or accessed outside authorized boundaries, before any data-loss policy is triggered."
  },
  {
    "id": 301,
    "catalog_description": "Flow edges linking a source data asset to a target, with column-level mapping, transformation logic, frequency, and SLA."
  },
  {
    "id": 227,
    "catalog_description": "Data pipeline definitions and their run history, covering ingestion and transformation jobs, scheduling, dependencies, and run-level observability."
  },
  {
    "id": 232,
    "catalog_description": "Published, governed data products with an explicit contract: schema, SLA, owner, access policy, intended consumers, and quality expectations."
  },
  {
    "id": 1055,
    "catalog_description": "Data processing addenda attached to contracts that govern how personal data is handled, each with its own approval and renewal cycle."
  },
  {
    "id": 342,
    "catalog_description": "Per-asset risk scores combining sensitivity, access breadth, and exposure, used to prioritize the remediation queue."
  },
  {
    "id": 305,
    "catalog_description": "Assignments of a steward to a data asset or glossary term, with responsibility type and escalation chain."
  },
  {
    "id": 901,
    "catalog_description": "Privacy rights requests from candidates exercising access, rectification, erasure, restriction, portability, or objection, with intake, due date, and fulfillment."
  },
  {
    "id": 308,
    "catalog_description": "Aggregated consumption signals per data asset, such as accessing team, query count, last access, and bytes scanned."
  },
  {
    "id": 338,
    "catalog_description": "Cloud analytics databases or clusters specialized for analytics, with an access model distinct from transactional databases."
  },
  {
    "id": 547,
    "catalog_description": "Cabinets within data center racks, covering layout, power distribution, cable management, access control, and temperature zones."
  },
  {
    "id": 555,
    "catalog_description": "Physical cable connections between ports, covering length, type, installation date, test state, and failure history."
  },
  {
    "id": 553,
    "catalog_description": "Forward-looking projections of data center power, cooling, space, and bandwidth capacity, with utilization forecast, headroom, and planned augmentations."
  },
  {
    "id": 1025,
    "catalog_description": "Requests to install, decommission, or relocate data center equipment, carrying the action, target rack, scheduling, and approval before physical work."
  },
  {
    "id": 551,
    "catalog_description": "Data center cooling units such as CRAC, CRAH, or in-row coolers, with capacity, zone served, temperature setpoints, and power draw."
  },
  {
    "id": 552,
    "catalog_description": "Time-series temperature, humidity, airflow, and pressure readings from cabinet, aisle, and zone sensors for hot-spot detection."
  },
  {
    "id": 554,
    "catalog_description": "Network or power ports on a device, covering interface name, speed and type, neighbor endpoint, assignment, and usage status."
  },
  {
    "id": 549,
    "catalog_description": "Electrical circuits from the site feed to a power outlet, covering capacity, voltage, phase, breaker state, and redundancy."
  },
  {
    "id": 548,
    "catalog_description": "Rack or cabinet power distribution units, covering input phases, output outlets, per-outlet metering, management mode, and firmware version."
  },
  {
    "id": 546,
    "catalog_description": "Physical rack frames in a data center, covering height in rack units, location, power budget, cooling zone, and asset tag."
  },
  {
    "id": 550,
    "catalog_description": "Uninterruptible power supply units, covering input and output capacity, battery health, last test date, load level, and bypass state."
  },
  {
    "id": 1121,
    "catalog_description": "Dynamic creative optimization rule sets governing how variants are generated from assets and feeds and how delivery is weighted toward top performers."
  },
  {
    "id": 1008,
    "catalog_description": "Per-opportunity machine-derived risk grades with the contributing factors, recomputed as new activity and signals arrive."
  },
  {
    "id": 1009,
    "catalog_description": "Named risk patterns raised against an opportunity, such as no decision-maker or no scheduled next step, tracked from raised to cleared."
  },
  {
    "id": 1139,
    "catalog_description": "Recorded runtime evaluations of a decision table against a set of inputs, capturing matched rules, resulting outputs, and the invoking process."
  },
  {
    "id": 1138,
    "catalog_description": "Versioned decision tables with input and output clauses, rules, and a hit policy, invoked by running processes to evaluate business rules."
  },
  {
    "id": 141,
    "catalog_description": "Configurable definitions of pay deductions such as retirement, medical premiums, garnishments, and union dues, with priority, ceiling, and ledger mapping."
  },
  {
    "id": 1255,
    "catalog_description": "Detected constraints or slow stages in a value stream surfaced from measured flow and prioritized for remediation."
  },
  {
    "id": 518,
    "catalog_description": "Optimized multi-stop delivery routes per delivery day, covering vehicle, driver, stops, and time windows."
  },
  {
    "id": 1251,
    "catalog_description": "Modeled end-to-end paths that delivery work flows through, from idea to production, used as the unit of flow measurement."
  },
  {
    "id": 278,
    "catalog_description": "Business cases submitted for new initiatives or features, covering requester, justification, estimated cost, timeline, and approval workflow."
  },
  {
    "id": 280,
    "catalog_description": "Sequencing and blocking relationships between initiatives and roadmap items, covering critical path, lag time, and external dependencies."
  },
  {
    "id": 590,
    "catalog_description": "Self-service desk reservations for hybrid and hot-desking workplaces, covering the desk, date and time, and work mode."
  },
  {
    "id": 560,
    "catalog_description": "Records of which mobile app packages are pushed to which enrolled devices, with install status, timestamp, and removal flag."
  },
  {
    "id": 614,
    "catalog_description": "Accuracy verification records for clinical equipment such as scales and infusion pumps, tracking calibration date, technician, and tolerance acceptance."
  },
  {
    "id": 558,
    "catalog_description": "Baseline policies defining required device state, such as OS version floor, encryption, app blocklist, root detection, and password rules."
  },
  {
    "id": 563,
    "catalog_description": "Periodic compliance scan results per enrolled device, listing policies evaluated, pass or fail per policy, findings, and remediation actions."
  },
  {
    "id": 557,
    "catalog_description": "Device settings templates covering WiFi, VPN, certificates, security baselines, and disk encryption, version-controlled and assigned to device cohorts."
  },
  {
    "id": 562,
    "catalog_description": "Outcome logs for each policy, profile, or app deployment, covering trigger, timestamp, success flag, error code, and device state change."
  },
  {
    "id": 615,
    "catalog_description": "Adverse-event reports for medical devices, such as patient injury or unexpected behavior, with root cause and links to recalls when patterns emerge."
  },
  {
    "id": 611,
    "catalog_description": "Preventive and corrective maintenance records per medical device, covering schedule completion, technician notes, and parts replaced."
  },
  {
    "id": 612,
    "catalog_description": "Regulatory recall notices and facility responses for medical devices, covering recall scope, risk class, affected serials, and patient-safety impact."
  },
  {
    "id": 137,
    "catalog_description": "Images, videos, audio, documents, and design files with metadata, rights, taxonomy, and delivery URLs."
  },
  {
    "id": 443,
    "catalog_description": "Named digital experiences or journeys, such as a post-purchase flow, mapped to segments and A/B variants."
  },
  {
    "id": 588,
    "catalog_description": "Detected degradations affecting app usage, such as slow boot, crashes, login failures, network drops, or VPN issues, with severity and affected users."
  },
  {
    "id": 253,
    "catalog_description": "Logical entity, dimension, and hierarchy models decoupled from physical tables, defining conformed dimensions, hierarchies, and slowly-changing behavior."
  },
  {
    "id": 356,
    "catalog_description": "State-mandated and brokerage-policy disclosure forms attached to transactions, such as agency, property condition, lead paint, and HOA documents."
  },
  {
    "id": 421,
    "catalog_description": "Workflow records gating discount authority, capturing the approver and the accept or reject decision."
  },
  {
    "id": 82,
    "catalog_description": "Candidate devices emitted by a scan, awaiting normalization and reconciliation into a configuration item before joining the CMDB."
  },
  {
    "id": 580,
    "catalog_description": "Process models mined from an event log via process discovery, carrying fitted parameters and quality metrics such as fitness and precision."
  },
  {
    "id": 81,
    "catalog_description": "Records of a discovery job run, covering scope, credentials used, start and end times, candidates emitted, and errors encountered."
  },
  {
    "id": 83,
    "catalog_description": "Connector, probe, and credential definitions for discovery integrations such as hypervisors, cloud accounts, clusters, and directory services."
  },
  {
    "id": 262,
    "catalog_description": "Assignments of a work order to a specific technician at a specific time, capturing dispatch decisions, route output, and dispatcher overrides."
  },
  {
    "id": 737,
    "catalog_description": "Post-call wrap-up categories that classify the business reason for a contact, used for routing logic and analytics."
  },
  {
    "id": 90,
    "catalog_description": "End-to-end request traces across microservices, with parent-child spans, service identification, and latency attribution for diagnosing issues."
  },
  {
    "id": 1023,
    "catalog_description": "Investor-facing notice documents for a fund distribution, in standard reporting format, with publication timestamps."
  },
  {
    "id": 334,
    "catalog_description": "Approved, time-limited exceptions to a data-loss policy, tracking requestor, approver, business justification, and expiration."
  },
  {
    "id": 330,
    "catalog_description": "Data-loss policy violation events, capturing user, timestamp, classification, destination, action taken, and remediation status."
  },
  {
    "id": 331,
    "catalog_description": "Data-loss prevention rule sets defining conditions and actions such as block, quarantine, redact, mask, watermark, or alert."
  },
  {
    "id": 333,
    "catalog_description": "Blocked or flagged artifacts such as emails, files, or messages held pending admin review or a user override request."
  },
  {
    "id": 335,
    "catalog_description": "Audit trail of user interactions with the data-loss system, covering blocks, quarantine reviews, exception requests, and policy violations."
  },
  {
    "id": 1191,
    "catalog_description": "Invoices issued to boaters for dockage, storage, utilities, fuel, or service, with payment status."
  },
  {
    "id": 535,
    "catalog_description": "Outputs of document-type classification, capturing the classified type, confidence, model version, and timestamp."
  },
  {
    "id": 432,
    "catalog_description": "Records-class labels applied to documents under a content taxonomy, governing retention and handling."
  },
  {
    "id": 431,
    "catalog_description": "Folders, libraries, and nested collections that organize documents into a hierarchy."
  },
  {
    "id": 430,
    "catalog_description": "Version history for each document, tracking publication and revision lineage over time."
  },
  {
    "id": 1256,
    "catalog_description": "Delivery-performance benchmarks for a value stream: deployment frequency, lead time, change failure rate, and time to restore."
  },
  {
    "id": 1284,
    "catalog_description": "Records confirming that data protection officers completed required training, evidencing GDPR compliance."
  },
  {
    "id": 312,
    "catalog_description": "Standard dimensions used to measure data quality, such as completeness, validity, timeliness, and accuracy."
  },
  {
    "id": 313,
    "catalog_description": "Aggregated quality scores per data asset and time period, rolling up dimension scores with trend and direction."
  },
  {
    "id": 314,
    "catalog_description": "Agreed data quality thresholds, such as maximum null rate, duplicate rate, and incident response time."
  },
  {
    "id": 376,
    "catalog_description": "Risky driving events detected by telemetry, such as harsh braking, speeding, or distraction, with severity and location."
  },
  {
    "id": 734,
    "catalog_description": "Per-driver scorecards summarizing safety and efficiency risk from behaviors like speeding, harsh braking, and idling."
  },
  {
    "id": 1041,
    "catalog_description": "Pre-employment drug tests and occupational health screenings, tracking the order, provider, result, and any adverse-finding review. Holds sensitive medical data subject to legal restrictions."
  },
  {
    "id": 1196,
    "catalog_description": "Requests to launch a dry-stacked vessel for use and return it to its rack, scheduled against forklift capacity."
  },
  {
    "id": 1178,
    "catalog_description": "Rack positions in a dry-stack storage building, with bay, level, and maximum vessel length and weight."
  },
  {
    "id": 110,
    "catalog_description": "Payment failures, retries, and past-due warnings that drive the involuntary-churn and collections workflow."
  },
  {
    "id": 1065,
    "catalog_description": "Alerts that a traveler may face an emerging risk at their destination, tracked from raised through resolved during assistance."
  },
  {
    "id": 476,
    "catalog_description": "Preventive or corrective maintenance tasks on industrial assets, covering trigger, labor, parts, downtime, and assigned crew through completion."
  },
  {
    "id": 140,
    "catalog_description": "Definitions of pay types such as regular, overtime, bonus, and severance, with tax treatment and accounting rules. Foundation of the payroll calculation engine."
  },
  {
    "id": 636,
    "catalog_description": "Litigation data requests with matter reference, scope, requested record types, production timeline, and chain of custody."
  },
  {
    "id": 134,
    "catalog_description": "Definitions of editorial review and publishing workflows: named states, transitions, and which role owns each step."
  },
  {
    "id": 889,
    "catalog_description": "Voluntary self-identification submitted by applicants for equal-employment reporting, stored separately from candidate records per regulation."
  },
  {
    "id": 1085,
    "catalog_description": "Management-system audits against safety and environmental standards, routing nonconformities and findings into corrective actions."
  },
  {
    "id": 1084,
    "catalog_description": "Safety inspections and observations conducted against a checklist, with findings routed into corrective actions."
  },
  {
    "id": 1075,
    "catalog_description": "Occupational risk assessments that score the likelihood and consequence of identified hazards and assign controls."
  },
  {
    "id": 1087,
    "catalog_description": "Records of safety and environmental training, competency, or certification completed by workers, mapped to the roles and regulations that require it."
  },
  {
    "id": 377,
    "catalog_description": "Hours-of-service logs from electronic logging devices, recording driving, on-duty, off-duty, and sleeper-berth status changes for roadside inspection."
  },
  {
    "id": 1034,
    "catalog_description": "People to contact in an emergency for a worker, with priority order and relationship. Holds personal data on third parties."
  },
  {
    "id": 322,
    "catalog_description": "Lookup coefficients that convert an activity, such as natural gas or electricity, into emissions. Versioned by effective date."
  },
  {
    "id": 321,
    "catalog_description": "Recorded greenhouse gas emissions from a facility, activity, or supply-chain tier, in carbon-dioxide equivalents with timestamp and source."
  },
  {
    "id": 1038,
    "catalog_description": "Spouses, children, and other dependents of a worker, used by benefits administration for eligibility and beneficiary designation."
  },
  {
    "id": 779,
    "catalog_description": "Per-employee portal accounts in the equity-administration system, giving each employee visibility into their equity grants."
  },
  {
    "id": 317,
    "catalog_description": "Single resolved employee identity reconciled across HR, payroll, identity, and time-and-attendance sources."
  },
  {
    "id": 31,
    "catalog_description": "Canonical records of people currently or formerly employed, carrying identity, employment metadata, and links to position, manager, and org unit."
  },
  {
    "id": 35,
    "catalog_description": "Contractual terms of employment: contract type, start and end dates, jurisdiction, working hours, notice period, and references to the signed document."
  },
  {
    "id": 36,
    "catalog_description": "Lifecycle events for an employee, such as hire, promotion, transfer, leave, comp change, and termination. The audit history of an employment."
  },
  {
    "id": 1217,
    "catalog_description": "Seller trainings tied to content or a launch, such as certifications, pitch practice, and onboarding modules."
  },
  {
    "id": 589,
    "catalog_description": "Behavioral deviations on a device flagged by analytics, such as unexpected network egress or impossible-travel patterns, scored and triaged."
  },
  {
    "id": 585,
    "catalog_description": "Quality-of-experience scores for a user, device, and app combination, covering latency, availability, error rate, and responsiveness."
  },
  {
    "id": 183,
    "catalog_description": "Calculated driver scores, such as growth, recognition, and leadership, at a team, department, or segment level."
  },
  {
    "id": 394,
    "catalog_description": "Formal engagement letters or proposals between a services firm and a client, covering scope, fees, retention, and e-signature evidence."
  },
  {
    "id": 1019,
    "catalog_description": "Computed rollups of activity intensity per account or contact, summarizing how engaged a buying group is over a period."
  },
  {
    "id": 45,
    "catalog_description": "Employee engagement, pulse, and sentiment survey responses, used to score engagement and trigger interventions."
  },
  {
    "id": 799,
    "catalog_description": "Parent-child line items in an engineering bill of materials, each linking one child part under a parent assembly with quantity and effectivity."
  },
  {
    "id": 798,
    "catalog_description": "Engineering change orders capturing a proposed change, impact analysis, approval routing, effective date, and the affected parts, BOMs, and drawings."
  },
  {
    "id": 796,
    "catalog_description": "Distinct parts, assemblies, and components the organization recognizes, anchoring revisions, BOMs, and CAD files."
  },
  {
    "id": 807,
    "catalog_description": "System, software, and hardware requirements with parent-child decomposition, verification method, allocated subsystem, and links to test cases."
  },
  {
    "id": 797,
    "catalog_description": "Released revisions of an engineering part, each a frozen snapshot of attributes, BOM, and CAD references minted only by a change order."
  },
  {
    "id": 556,
    "catalog_description": "Devices under mobile-device management, with enrollment identity, status, ownership type, assigned profile, and last sync."
  },
  {
    "id": 561,
    "catalog_description": "Zero-touch provisioning credentials for device onboarding: token, QR code, validity window, assignment batch, and redemption count."
  },
  {
    "id": 267,
    "catalog_description": "Business applications in the enterprise portfolio, with owner, criticality, lifecycle state, hosting model, and strategic value."
  },
  {
    "id": 251,
    "catalog_description": "E-signature transactions wrapping one or more signature requests against a document, tracked from created through completed, declined, or voided."
  },
  {
    "id": 512,
    "catalog_description": "Environmental monitoring samples for pathogen testing, with zone, site, sampling date, and lab result, aggregated into trend analytics."
  },
  {
    "id": 1083,
    "catalog_description": "Environmental permits for air, water, or waste, with their conditions, limits, monitoring obligations, and renewal schedule."
  },
  {
    "id": 477,
    "catalog_description": "Preventive-maintenance templates per asset or asset class, defining the trigger basis, task list, frequency, and due-date rules that generate work orders."
  },
  {
    "id": 158,
    "catalog_description": "Equity awards such as restricted stock units, options, and performance units, with grant terms, vesting schedule, and forfeiture rules."
  },
  {
    "id": 92,
    "catalog_description": "Aggregated exception records grouped by fingerprint, with first and last seen, occurrence count, affected releases, owners, and status."
  },
  {
    "id": 963,
    "catalog_description": "Policies that escalate overdue training through manager, skip-level, HR partner, or compliance officer."
  },
  {
    "id": 326,
    "catalog_description": "Prepared sustainability disclosures per reporting framework for a fiscal year, combining narrative, metrics, and assurance status."
  },
  {
    "id": 329,
    "catalog_description": "Action programs to cut emissions or improve social and governance outcomes, such as renewable projects or diversity hiring, tracking budget and impact."
  },
  {
    "id": 325,
    "catalog_description": "Derived sustainability metrics, such as total emissions, intensity ratios, and water, waste, and governance indicators, refreshed each reporting cycle."
  },
  {
    "id": 324,
    "catalog_description": "Sustainability commitment goals, such as net-zero or reduction targets, with target year, baseline, scope coverage, and progress against actuals."
  },
  {
    "id": 1027,
    "catalog_description": "Reusable quality scorecard definitions with sections, weighted items, scoring scale, and auto-fail criteria. Versioned so historical scores stay interpretable."
  },
  {
    "id": 93,
    "catalog_description": "Clustered groups of events and alerts identified as a single underlying incident, with a candidate root cause for noise reduction."
  },
  {
    "id": 579,
    "catalog_description": "Raw timestamped sequences of business-process events extracted from systems, the primary input for process discovery and conformance checking."
  },
  {
    "id": 1129,
    "catalog_description": "Heightened-monitoring assessments of departing employees, scoring exit-related data-theft risk and driving watchlist placement."
  },
  {
    "id": 777,
    "catalog_description": "Hypothetical or committed exit scenarios for a company, with total deal value, structure, and terms that drive proceeds calculations."
  },
  {
    "id": 778,
    "catalog_description": "Per-shareholder proceeds calculations under an exit scenario, respecting liquidation preferences, participation rights, and conversion economics."
  },
  {
    "id": 211,
    "catalog_description": "Individual lines on an expense report: date, merchant, category, amount, tax, billable flag, and receipt. The atomic expense unit."
  },
  {
    "id": 214,
    "catalog_description": "Configurable expense rules, such as per-diem caps, category limits, receipt requirements, and mileage rates, applied to flag violations."
  },
  {
    "id": 210,
    "catalog_description": "Employee-submitted bundles of expense lines for a trip, project, or period, with submission status, approval chain, and reimbursement routing."
  },
  {
    "id": 738,
    "catalog_description": "Court filings made on behalf of a law-firm client, with venue, judge, docket, and key dates."
  },
  {
    "id": 569,
    "catalog_description": "Invitations granting external users or other workspaces federated access, with invitee, status, expiry, and scope."
  },
  {
    "id": 532,
    "catalog_description": "Single structured values extracted from a document by a model, with field name, value, confidence, and model version. The unit for field-level validation."
  },
  {
    "id": 533,
    "catalog_description": "Extracted fields grouped into a single business entity, such as an invoice or form, with record type, aggregate confidence, and status."
  },
  {
    "id": 328,
    "catalog_description": "Emissions inventories at facility, plant, or building level, derived from metered utility data by scope and source."
  },
  {
    "id": 349,
    "catalog_description": "Preventive or corrective maintenance tasks on buildings and workplace assets, such as HVAC, lighting, plumbing, and grounds."
  },
  {
    "id": 486,
    "catalog_description": "Field and paddock boundaries with soil type, productivity zones, and crop history. The spatial unit of farm operations."
  },
  {
    "id": 522,
    "catalog_description": "Branded farm e-commerce storefront configurations, including catalog scope, member pricing tiers, and gift-card setup."
  },
  {
    "id": 516,
    "catalog_description": "On-site farmers-market transactions and reconciliation summaries, with line items and tender mix across cash, card, and benefits payments."
  },
  {
    "id": 879,
    "catalog_description": "Legally required disclosure forms shown to a candidate before a consumer report is requested, with text version, signature, and timestamp."
  },
  {
    "id": 902,
    "catalog_description": "Candidate acknowledgments of receiving the summary of consumer rights at consent time, captured separately so the copy and timestamp persist for audit."
  },
  {
    "id": 948,
    "catalog_description": "Tamper-evident, retention-locked audit-trail rows for regulated training, meeting electronic-records requirements."
  },
  {
    "id": 406,
    "catalog_description": "Customer requests for new capabilities, feeding the product prioritization workflow."
  },
  {
    "id": 229,
    "catalog_description": "Versioned feature-store entries with feature definitions, serving configuration, freshness targets, and lineage to source tables."
  },
  {
    "id": 505,
    "catalog_description": "Per-group total mixed ration formulations, listing ingredients, inclusion percentages, and mixing logs for feed-cost analysis."
  },
  {
    "id": 180,
    "catalog_description": "Continuous feedback such as kudos, one-on-one notes, requested feedback, and peer comments, independent of formal review cycles."
  },
  {
    "id": 489,
    "catalog_description": "Per-pass chemical, fertilizer, or micronutrient application events, with product, rate, applicator, and restricted-use justification."
  },
  {
    "id": 261,
    "catalog_description": "Scheduled or completed on-site visits by a field technician, capturing arrival, work performed, parts used, customer signature, and outcome."
  },
  {
    "id": 38,
    "catalog_description": "Approved annual or quarterly budgets by org unit, cost center, account, and period, driving downstream spend authorization."
  },
  {
    "id": 39,
    "catalog_description": "Rolling forecasts that refresh the expected revenue, cost, and headcount view given current actuals, distinct from the static budget."
  },
  {
    "id": 37,
    "catalog_description": "Umbrella records for financial planning artifacts: annual budget, rolling forecast, and long-range plan, with period, version, and approval state."
  },
  {
    "id": 40,
    "catalog_description": "What-if financial models layered on a base plan, such as revenue upside, downside, cost-cutting, and acquisition scenarios."
  },
  {
    "id": 937,
    "catalog_description": "Continuing-education ledger rows per registered representative, retained as regulator evidence."
  },
  {
    "id": 862,
    "catalog_description": "Computed match scores between a person and a role or opportunity, with score, model version, and drivers."
  },
  {
    "id": 201,
    "catalog_description": "Capitalized property, plant, and equipment records, with acquisition date, cost basis, useful life, depreciation method, and location."
  },
  {
    "id": 373,
    "catalog_description": "Time-bound assignments of a vehicle to a driver, route, or job, with start and end time, purpose, and expected mileage."
  },
  {
    "id": 371,
    "catalog_description": "People authorized to operate fleet vehicles, with license class and expiration, medical card status, certifications, and employment type."
  },
  {
    "id": 370,
    "catalog_description": "Fleet vehicle master records, with identification, make, model, registration, fuel type, in-service date, and lifecycle status."
  },
  {
    "id": 346,
    "catalog_description": "Floor layouts showing desk and room locations, capacity, and zone assignments."
  },
  {
    "id": 1254,
    "catalog_description": "Computed flow measurements for a value stream over a period, covering velocity, time, load, efficiency, and distribution."
  },
  {
    "id": 1253,
    "catalog_description": "Configured definitions of flow metrics with their thresholds and targets, against which measured flow is evaluated."
  },
  {
    "id": 299,
    "catalog_description": "Remediation actions from audit findings, tracking owner, target date, evidence, and closure date."
  },
  {
    "id": 510,
    "catalog_description": "Food safety deviations, complaints, and non-conformance events that trigger investigation and corrective or preventive action."
  },
  {
    "id": 1013,
    "catalog_description": "Historical comparisons of submitted forecasts against actual results, used to measure and improve forecast accuracy."
  },
  {
    "id": 1012,
    "catalog_description": "Manager overrides applied to submitted forecasts, capturing the changed number and the reason for the adjustment."
  },
  {
    "id": 1011,
    "catalog_description": "Forecast submissions for a period, moving from draft to submitted to locked as the forecast cadence closes."
  },
  {
    "id": 1140,
    "catalog_description": "Targeted announcements sent to frontline audiences, with optional mandatory-read, scheduled delivery, and acknowledgment tracking."
  },
  {
    "id": 1145,
    "catalog_description": "Reusable templates of ordered task items (opening, closing, audit, compliance) run against a location and shift by frontline workers."
  },
  {
    "id": 1148,
    "catalog_description": "Per-worker records that a frontline learning module was completed, with score or pass status where assessed."
  },
  {
    "id": 1147,
    "catalog_description": "Bite-size training units delivered to frontline workers on mobile devices, tracked per worker and role."
  },
  {
    "id": 1141,
    "catalog_description": "Delivery channels through which broadcasts and conversations reach deskless workers, such as location feeds, team channels, kiosks, and SMS fallback."
  },
  {
    "id": 1143,
    "catalog_description": "Peer or manager recognitions of frontline workers, shown in the frontline feed and visible to the team."
  },
  {
    "id": 1149,
    "catalog_description": "Per-worker submissions completing a frontline task or checklist item, carrying the photo, form, or attestation evidence required."
  },
  {
    "id": 1144,
    "catalog_description": "Units of work pushed to frontline workers or locations, completed on a mobile or shared device with photo or form evidence."
  },
  {
    "id": 1200,
    "catalog_description": "Reconciliation records for fuel tanks: opening volume, deliveries, pump totals, closing reading, and variance, kept for storage-tank compliance."
  },
  {
    "id": 1198,
    "catalog_description": "Fuel-dock transactions: product, gallons, pump, price, and the boater or vessel charged."
  },
  {
    "id": 1199,
    "catalog_description": "Bulk fuel storage tanks at the marina, with product, capacity, and current volume, reconciled against deliveries and sales."
  },
  {
    "id": 372,
    "catalog_description": "Fuel-card and charging-network transactions for vehicles, capturing driver, fuel type, quantity, cost, location, and time, used for tax reporting and exception detection."
  },
  {
    "id": 388,
    "catalog_description": "Fulfillment instructions created from order lines, assigned to a warehouse or location and tracked through to shipment."
  },
  {
    "id": 757,
    "catalog_description": "Accounting close cycles for a fund (monthly, quarterly, annual) that drive statement generation and audit packaging."
  },
  {
    "id": 368,
    "catalog_description": "Waterfall payouts from a real-estate fund to limited and general partners, calculated on income, sale, or refinancing events."
  },
  {
    "id": 781,
    "catalog_description": "End-to-end fund-vehicle setup records, covering entity formation filings, tax-ID application, banking onboarding, and partnership agreement."
  },
  {
    "id": 756,
    "catalog_description": "General-partner accounting entries against a fund vehicle: contributions, expenses, fee accruals, and gain or loss recognitions."
  },
  {
    "id": 768,
    "catalog_description": "Fund-level performance reporting periods, with vintage-adjusted return metrics and benchmark comparisons."
  },
  {
    "id": 767,
    "catalog_description": "Per-position return calculations on a fund's holding in a specific portfolio company, over a defined time window."
  },
  {
    "id": 755,
    "catalog_description": "Private-capital fund vehicles in a partnership structure, with vintage, strategy, target size, and current assets under management."
  },
  {
    "id": 144,
    "catalog_description": "Court-ordered or agency-issued instructions to withhold from an employee's wages, carrying priority, ceiling, remit-to details, and lifecycle status."
  },
  {
    "id": 950,
    "catalog_description": "Consent records for learner training data under GDPR, capturing purpose, lawful basis, and grant and withdrawal timestamps."
  },
  {
    "id": 195,
    "catalog_description": "Accounts in the chart of accounts, with code, name, type, normal balance, and statutory mapping."
  },
  {
    "id": 733,
    "catalog_description": "Records of vehicles entering or exiting a defined geofence boundary."
  },
  {
    "id": 302,
    "catalog_description": "Business-language definitions of concepts, with steward, related terms, synonyms, and certification status."
  },
  {
    "id": 74,
    "catalog_description": "Confirmations that ordered goods or services were received as expected, recording receipt date, quantity, and condition, used in invoice matching before payment."
  },
  {
    "id": 731,
    "catalog_description": "Continuous vehicle location stream of timestamp, latitude, longitude, speed, and heading, powering maps and geofence checks."
  },
  {
    "id": 1107,
    "catalog_description": "Grazing paddocks or fields, with area, location, pasture type, carrying capacity, and rest state, that grazing plans rotate livestock across."
  },
  {
    "id": 1109,
    "catalog_description": "Rotational-grazing plans over a set of paddocks, covering rotation order, rest periods, stocking rate, and carrying-capacity targets for a season."
  },
  {
    "id": 1230,
    "catalog_description": "Committed go-to-market plans for a period, the parent artifact that locks and pushes work downstream."
  },
  {
    "id": 1228,
    "catalog_description": "What-if models of a go-to-market plan under alternative segment, territory, capacity, or channel assumptions."
  },
  {
    "id": 1281,
    "catalog_description": "Witnessed electronic signatures binding learner, course, content version, and timestamp for regulated life-sciences training."
  },
  {
    "id": 507,
    "catalog_description": "Per-product food-safety plans documenting hazard analysis, critical control points, limits, monitoring, and corrective actions."
  },
  {
    "id": 941,
    "catalog_description": "Statutory acknowledgments that harassment training was completed, carrying a signed timestamp and IP address."
  },
  {
    "id": 56,
    "catalog_description": "Physical IT assets such as laptops, servers, network gear, and peripherals, with serial number, asset tag, current user or location, and lifecycle state."
  },
  {
    "id": 697,
    "catalog_description": "Decommissioning records for retired hardware, covering e-waste tracking, chain of custody, and data-wipe compliance."
  },
  {
    "id": 695,
    "catalog_description": "Catalog of hardware device types, SKUs, and specifications, used to match assets to refreshable units."
  },
  {
    "id": 696,
    "catalog_description": "Manufacturer support contracts for hardware assets, with coverage terms and expiration tracking."
  },
  {
    "id": 521,
    "catalog_description": "Field-level harvest projections translated into available-share and SKU planning, driving reserve lists and dynamic pricing."
  },
  {
    "id": 490,
    "catalog_description": "Per-field and per-zone yield records from combine telemetry, scale tickets, and grain-handling reconciliation."
  },
  {
    "id": 1195,
    "catalog_description": "Scheduled lifts of a vessel out of and back into the water using a travel lift or crane, with time spent on the hard."
  },
  {
    "id": 1074,
    "catalog_description": "Identified workplace hazards, their source and affected tasks, and the controls applied to reduce their risk."
  },
  {
    "id": 32,
    "catalog_description": "Approved org slots with role definition, cost center, reporting line, location, and FTE allocation. Each can be open, filled, or eliminated."
  },
  {
    "id": 24,
    "catalog_description": "Period-by-period headcount targets broken down by org unit, location, function, level, and type, with openings, additions, and reductions."
  },
  {
    "id": 451,
    "catalog_description": "Helm deployment records, tracking chart name and version, value overrides, namespace, and installed status."
  },
  {
    "id": 1227,
    "catalog_description": "Hiring plans that close a capacity gap, defining roles, timing, and ramp, handed to recruiting and finance."
  },
  {
    "id": 905,
    "catalog_description": "Assignments of specific users to recruiter, hiring manager, coordinator, interviewer, and reviewer roles on a single requisition."
  },
  {
    "id": 671,
    "catalog_description": "Bindings between a visitor and an internal employee host, covering access scope, duration, and supervision responsibility."
  },
  {
    "id": 192,
    "catalog_description": "Employee inquiries and service requests routed to HR operations, such as pay questions, benefits changes, leave requests, and complaints."
  },
  {
    "id": 1136,
    "catalog_description": "Assignable, claimable units of human work generated by running processes, with candidate users, due date, priority, and form, completed to advance the process."
  },
  {
    "id": 340,
    "catalog_description": "Infrastructure-level access-control artifacts such as bucket policies, role grants, and database permissions."
  },
  {
    "id": 1220,
    "catalog_description": "Definitions of the best-fit account, covering firmographics, technographics, and qualifying criteria used to target engagement."
  },
  {
    "id": 112,
    "catalog_description": "Identity-resolution edges linking email, device, cookie, login, and phone, turning anonymous interactions into resolved customers."
  },
  {
    "id": 732,
    "catalog_description": "Records of engine-running, vehicle-stationary state changes, distinct from trip aggregation."
  },
  {
    "id": 531,
    "catalog_description": "Models trained to extract structured fields from documents such as invoices, contracts, and forms, with training lineage, metrics, and version."
  },
  {
    "id": 536,
    "catalog_description": "Reusable extraction definitions per document type, covering field structure, validation rules, and target-system mapping."
  },
  {
    "id": 534,
    "catalog_description": "Validation outcomes for extracted fields, carrying the rule applied, pass/fail/review status, exception details, and resolution state."
  },
  {
    "id": 705,
    "catalog_description": "Access review and certification campaigns with per-user attestation outcomes."
  },
  {
    "id": 704,
    "catalog_description": "User-initiated access requests and their approval workflow within an identity-governance platform."
  },
  {
    "id": 706,
    "catalog_description": "Business-role and entitlement templates provisioned into downstream systems."
  },
  {
    "id": 708,
    "catalog_description": "Per-target outcomes of an orchestrated provisioning action, such as success, failure, or retry."
  },
  {
    "id": 707,
    "catalog_description": "Segregation-of-duties policy violations and their exception-approval records."
  },
  {
    "id": 964,
    "catalog_description": "Governance view of a user's access to an application: the entitlement grant, who requested and approved it, when it was last certified, and when revoked."
  },
  {
    "id": 633,
    "catalog_description": "In-house legal matters such as disputes, transactions, advisory, IP, and regulatory responses, with client department, parties, counsel, budget, and status."
  },
  {
    "id": 724,
    "catalog_description": "Proactive forecasts of likely service-impacting incidents within a coming time window."
  },
  {
    "id": 475,
    "catalog_description": "Physical plant, equipment, and infrastructure tracked for maintenance and lifecycle, with asset tag, location, manufacturer, criticality, and current state."
  },
  {
    "id": 1079,
    "catalog_description": "Industrial-hygiene sampling and exposure-monitoring results for chemical, noise, or other agents, measured against occupational exposure limits."
  },
  {
    "id": 130,
    "catalog_description": "Creator and influencer profiles, with audience metrics, content history, contracts, payments, and campaign attribution."
  },
  {
    "id": 482,
    "catalog_description": "Purchase orders from an agency to a specific media outlet, committing budget at negotiated rates, reconciled against the outlet's invoice."
  },
  {
    "id": 1126,
    "catalog_description": "Prioritized alerts raised when correlated indicators cross a risk threshold for a user, triaged and escalated into a case when warranted."
  },
  {
    "id": 1127,
    "catalog_description": "Investigation cases on suspected insider threats, covering the lifecycle from triage to disposition, the activity timeline, evidence, and HR or legal handoff."
  },
  {
    "id": 819,
    "catalog_description": "Customer-owned equipment that the service organization installs and maintains, with identity, placement, and lifecycle state, covered by work orders and contracts."
  },
  {
    "id": 926,
    "catalog_description": "Assignments of an instructor to a session or offering, with role such as primary, assistant, or observer."
  },
  {
    "id": 925,
    "catalog_description": "Instructor records covering internal trainers, contracted experts, and external vendor instructors, kept separate from employees."
  },
  {
    "id": 623,
    "catalog_description": "Insurance claim records from first notice of loss through adjudication and settlement, with claim type, dates, claimant, adjuster, status, and liability."
  },
  {
    "id": 624,
    "catalog_description": "Underwritten insurance policies defining coverage terms, limits, deductibles, exclusions, and effective dates, against which claims are filed."
  },
  {
    "id": 471,
    "catalog_description": "Connector definitions for third-party applications, each with its authentication type."
  },
  {
    "id": 474,
    "catalog_description": "Transformation rules mapping a source field to a target field, with mapping logic and transformation type."
  },
  {
    "id": 440,
    "catalog_description": "Higher-level orchestrations that compose multiple pipelines and connectors into an integration flow."
  },
  {
    "id": 469,
    "catalog_description": "Named, versioned templates for recurring event-driven integration flows."
  },
  {
    "id": 470,
    "catalog_description": "Execution logs per integration run, with timestamp, status, input and output references, error log, and latency."
  },
  {
    "id": 473,
    "catalog_description": "Event sources that start an integration, such as schedules, webhooks, database changes, or queues, with polling or push configuration."
  },
  {
    "id": 1205,
    "catalog_description": "Configured sources feeding competitive intelligence, such as news, review sites, web monitors, and field reports."
  },
  {
    "id": 700,
    "catalog_description": "Intent specifications with training phrases, entities, and resolution rules that drive intent detection at runtime."
  },
  {
    "id": 260,
    "catalog_description": "Language-understanding outputs, recording the detected intent, confidence, originating utterance, and downstream action taken."
  },
  {
    "id": 1232,
    "catalog_description": "Captured buying-intent signals for an account or contact, with topic, source, and strength."
  },
  {
    "id": 1026,
    "catalog_description": "Supervisor quality reviews of a recorded interaction, scored against a form with section and item scores, comments, agent acknowledgment, and coaching flag."
  },
  {
    "id": 203,
    "catalog_description": "Transactions between two legal entities of the same group, such as intercompany invoices, transfers, and allocations, driving consolidation eliminations."
  },
  {
    "id": 838,
    "catalog_description": "Patron requests to borrow material from another library, with routing across sharing partners, shipping status, and fulfillment workflow."
  },
  {
    "id": 859,
    "catalog_description": "Internal opportunity postings covering full-time roles, gigs, projects, stretch assignments, and mentorships."
  },
  {
    "id": 890,
    "catalog_description": "Reusable interview templates per role and stage, bundling questions, target competencies, recommended scorecard, and expected duration."
  },
  {
    "id": 891,
    "catalog_description": "Interviewers assigned to a specific interview, with each person's role on the panel and weight on the consolidated scorecard."
  },
  {
    "id": 893,
    "catalog_description": "Reusable interview questions tied to competencies, with question type, suggested follow-ups, and scoring rubric."
  },
  {
    "id": 9,
    "catalog_description": "Structured interviewer feedback against a rubric: per-competency ratings, written notes, and a hire or no-hire recommendation."
  },
  {
    "id": 894,
    "catalog_description": "Bookable time windows an interviewer has marked available, with allowed interview types, driving self-serve scheduling."
  },
  {
    "id": 8,
    "catalog_description": "Scheduled assessment events between a candidate and one or more interviewers, with time, location, panel, and outcome."
  },
  {
    "id": 1047,
    "catalog_description": "Recertification records where an owner confirms content is current or flags it stale for remediation or archival."
  },
  {
    "id": 1045,
    "catalog_description": "Derived per-item scores for freshness, quality, accessibility, and ownership coverage of intranet content."
  },
  {
    "id": 1043,
    "catalog_description": "Discovered or registered pieces of intranet content (pages, hubs, libraries, forms) with source, type, owner, and governance status."
  },
  {
    "id": 1046,
    "catalog_description": "Assignments of an accountable owner and backup to a content record, with the review cadence the owner must keep."
  },
  {
    "id": 1044,
    "catalog_description": "Governed content-type definitions (policy, news post, hub, library, form, FAQ) carrying default review cadence, criticality, and retention rule."
  },
  {
    "id": 790,
    "catalog_description": "Scheduled or ad-hoc inventory count sessions, with location, item scope, assigned counter, status, and per-line variances."
  },
  {
    "id": 791,
    "catalog_description": "Lot or batch identifiers for inventory, with item, supplier, manufacture and expiry dates, and originating receipt."
  },
  {
    "id": 794,
    "catalog_description": "Bills of kit for sellable bundles: the parent item plus component items with quantities and an assembly-required flag."
  },
  {
    "id": 793,
    "catalog_description": "Per-item, per-location replenishment policies: reorder point and quantity, safety stock, lead time, and preferred supplier."
  },
  {
    "id": 792,
    "catalog_description": "Individually tracked units identified by a unique serial number, with item, current location, status, and warranty start."
  },
  {
    "id": 787,
    "catalog_description": "Per-item, per-location quantity records (on hand, reserved, in transit, available), maintained automatically from stock movements."
  },
  {
    "id": 785,
    "catalog_description": "Inventory items with SKU, unit of measure, lot or serial control, ABC class, default cost method, and physical dimensions."
  },
  {
    "id": 786,
    "catalog_description": "Fine-grained stock locations: warehouse, store, bin, zone, or hub used to track where inventory sits."
  },
  {
    "id": 788,
    "catalog_description": "Append-only ledger of inventory transactions (receipts, issues, transfers, adjustments). Posted movements are immutable and drive stock balances."
  },
  {
    "id": 789,
    "catalog_description": "Inter-location transfers of stock, with source, destination, requester, expected arrival, and status from requested to reconciled."
  },
  {
    "id": 425,
    "catalog_description": "Stock locations (warehouse, store, third-party, hub) with on-hand, reserved, and available-for-allocation balances."
  },
  {
    "id": 1128,
    "catalog_description": "Preserved evidence artifacts attached to an insider-risk case, with chain-of-custody metadata for HR and Legal review."
  },
  {
    "id": 727,
    "catalog_description": "Investment funds with name, vintage, size, type, general partner, and fee schedule, organizing capital calls and distributions."
  },
  {
    "id": 751,
    "catalog_description": "Internal investment committee memos per deal, capturing thesis, financials, risks, and the IC vote. Locked at the final vote."
  },
  {
    "id": 366,
    "catalog_description": "Real-estate assets held for investment return, with acquisition basis, debt structure, current valuation, and net operating income history."
  },
  {
    "id": 753,
    "catalog_description": "People in the firm's external network: founders, executives, co-investors, advisors, and limited-partner contacts."
  },
  {
    "id": 204,
    "catalog_description": "Three-way-match outcomes linking invoice, purchase order, and goods receipt, with line-level match status that drives posting or exception handling."
  },
  {
    "id": 4,
    "catalog_description": "Candidate submissions against a specific requisition, with pipeline stage, status, source, and full evaluation history."
  },
  {
    "id": 11,
    "catalog_description": "Formal employment offers extended to candidates, with compensation, start date, terms, approval chain, and status."
  },
  {
    "id": 886,
    "catalog_description": "Syndications of a job posting to external boards, with board name, post and expiry times, cost, and applicant attribution."
  },
  {
    "id": 2,
    "catalog_description": "Published, candidate-facing versions of a requisition on a career site or job board, one requisition possibly having many postings."
  },
  {
    "id": 33,
    "catalog_description": "Canonical role definitions in the job catalog: title, family, level, responsibilities, required skills, pay range, and FLSA class. Many positions share one profile."
  },
  {
    "id": 1,
    "catalog_description": "Approved requests to hire for a specific role, carrying headcount, level, location, hiring manager, recruiter, and status."
  },
  {
    "id": 194,
    "catalog_description": "Individual postings to the general ledger: a header plus balanced debit and credit lines tagged with account, cost center, and dimensions."
  },
  {
    "id": 447,
    "catalog_description": "Sequential steps in an experience or customer journey flow, ordered from one node to the next."
  },
  {
    "id": 496,
    "catalog_description": "Key data elements defined by FSMA-204, each attached to a critical tracking event for food-traceability reporting."
  },
  {
    "id": 743,
    "catalog_description": "Typed instances stored in the knowledge-graph platform, with their attributes and relationships."
  },
  {
    "id": 742,
    "catalog_description": "Ontology definitions specific to the knowledge-graph platform: classes, properties, and their structure."
  },
  {
    "id": 51,
    "catalog_description": "Knowledge-base articles backing self-service portals and agent-assist tools, moving through draft, review, published, and retired."
  },
  {
    "id": 410,
    "catalog_description": "Authored, versioned knowledge content units that move through draft, published, and archived."
  },
  {
    "id": 411,
    "catalog_description": "Hierarchical organization of knowledge articles into topics, sections, tags, and search facets."
  },
  {
    "id": 415,
    "catalog_description": "Curated groupings of articles (product docs, process guides, FAQs, onboarding playbooks) with audience tags and expiration."
  },
  {
    "id": 255,
    "catalog_description": "Typed instances of ontology classes (graph nodes or RDF individuals) with assertions, relationships, embeddings, and provenance, queried by AI agents and apps."
  },
  {
    "id": 414,
    "catalog_description": "Logged search events used for analytics, surfacing gaps such as queries that returned no results."
  },
  {
    "id": 448,
    "catalog_description": "Kubernetes clusters with name, version, control-plane config, network settings, and feature gates."
  },
  {
    "id": 29,
    "catalog_description": "External labor-market benchmarks used to validate workforce-plan assumptions: availability, prevailing salary, time-to-hire, and supply by role, geography, and level."
  },
  {
    "id": 500,
    "catalog_description": "Per-cow lactation cycles, with calving and dry-off dates, peak milk yield, 305-day projection, and days in milk."
  },
  {
    "id": 226,
    "catalog_description": "Registered tables and views in the platform catalog over open table formats, with ownership, tags, classification, and a pointer to the physical layout. The unit lineage, governance, BI, and ML all sit on."
  },
  {
    "id": 1211,
    "catalog_description": "Cross-functional tasks within a launch plan, each assigned to a function and tied to a milestone."
  },
  {
    "id": 1209,
    "catalog_description": "Dated checkpoints inside a launch plan, such as kickoff, content-complete, sales-ready, and general availability."
  },
  {
    "id": 1207,
    "catalog_description": "Working go-to-market plans for a launch, covering scope, milestones, readiness gate, and owners."
  },
  {
    "id": 220,
    "catalog_description": "User-built applications on the low-code platform, with name, owner, deployment, permissions, and status."
  },
  {
    "id": 221,
    "catalog_description": "Custom domain objects defined within a low-code app, including schema, fields, references, validation rules, and security model."
  },
  {
    "id": 716,
    "catalog_description": "Configured external connections (CRM, database, REST API) bound to a low-code app, with schema introspection."
  },
  {
    "id": 715,
    "catalog_description": "UI screens authored as versioned artifacts within a low-code app, such as pages, screens, or canvases."
  },
  {
    "id": 222,
    "catalog_description": "Business process definitions inside a low-code app: states, transitions, role-based steps, integrations, and escalations."
  },
  {
    "id": 118,
    "catalog_description": "Scores per lead or contact combining explicit signals (form fills, demo requests) and implicit fit signals, driving qualified-lead routing."
  },
  {
    "id": 934,
    "catalog_description": "Badges earned by learners, each with earn date, evidence link, and verification token."
  },
  {
    "id": 171,
    "catalog_description": "Credentials issued to a worker (internal, vendor, or regulatory), with issue date, expiry, issuing body, and renewal rules. Drives recertification campaigns."
  },
  {
    "id": 960,
    "catalog_description": "Log of notifications sent to learners: reminders, nudges, completions, and escalations."
  },
  {
    "id": 909,
    "catalog_description": "Reusable content assets (video, PDF, image, audio) referenced by lessons and modules."
  },
  {
    "id": 955,
    "catalog_description": "Assignments of a learning path to a learner, tracking overall path progress and completion percentage."
  },
  {
    "id": 953,
    "catalog_description": "Ordered steps inside a learning path, each pointing to a course, sub-path, or external resource with sequencing rules."
  },
  {
    "id": 168,
    "catalog_description": "Curated sequences of courses targeting a role, skill, or certification, driving ordered enrollment and progress tracking."
  },
  {
    "id": 956,
    "catalog_description": "Personalized learning plans composed of multiple paths or courses, often manager-curated or recommended against skill gaps."
  },
  {
    "id": 1278,
    "catalog_description": "Per-learner content suggestions generated from skill gaps and the learner's role profile."
  },
  {
    "id": 170,
    "catalog_description": "Granular completion events for a course or activity (actor, verb, object, result, timestamp) feeding skill profiles and certifications."
  },
  {
    "id": 1096,
    "catalog_description": "Lessee lease contracts as the accounting subledger record: parties, leased asset, dates, term, options, and payment terms."
  },
  {
    "id": 1091,
    "catalog_description": "Classification decisions for a lease (finance versus operating, single lessee model) with supporting test results, re-tested on modification."
  },
  {
    "id": 1097,
    "catalog_description": "Tracked obligation deadlines on a lease: option-exercise windows, renewal and notice dates, rent reviews, and termination deadlines, with alerting."
  },
  {
    "id": 1094,
    "catalog_description": "Prepared lease-accounting disclosures for a reporting period: discount rate, remaining term, maturity analysis, and lease cost, frozen once filed."
  },
  {
    "id": 1098,
    "catalog_description": "Source documents attached to a lease: the executed contract, amendments, abstracts, and correspondence evidencing the terms."
  },
  {
    "id": 1090,
    "catalog_description": "Lease liabilities measured at the present value of unpaid payments, unwound with interest and remeasured on modification or reassessment."
  },
  {
    "id": 1093,
    "catalog_description": "Changes to a lease and their accounting consequences: scope or consideration changes, remeasurements, rate updates, and impairments, with before-and-after balances."
  },
  {
    "id": 1092,
    "catalog_description": "Period-by-period schedules of lease cash flows, liability amortization, and right-of-use asset amortization driving recognition and disclosure."
  },
  {
    "id": 638,
    "catalog_description": "Documented legal opinions and consultations, with matter reference, advice narrative, scope, confidence, review date, and privilege classification."
  },
  {
    "id": 640,
    "catalog_description": "Court-centric tracking for litigated matters: court, case number, judge, calendar dates, opposing counsel, and key documents."
  },
  {
    "id": 66,
    "catalog_description": "Contracts with counterparties or suppliers, covering type, value, key dates, governing law, and lifecycle from draft to terminated."
  },
  {
    "id": 197,
    "catalog_description": "Statutory companies, with legal name, registration, jurisdiction, currency, and fiscal calendar. Books are kept per entity and consolidated upward."
  },
  {
    "id": 635,
    "catalog_description": "Litigation preservation notices, with matter reference, affected record types, custodian scope, and issued and lifting dates, enforced across data systems."
  },
  {
    "id": 634,
    "catalog_description": "Business-unit requests for legal advice or service, with description, priority, required-by date, and triage outcome. The front door to legal services."
  },
  {
    "id": 391,
    "catalog_description": "Law-firm matters (cases, transactions, advisory engagements) with client, opposing parties, key dates, responsible attorneys, billing rates, and status."
  },
  {
    "id": 908,
    "catalog_description": "Individual lessons inside a course module: a video, document, SCORM block, or live activity."
  },
  {
    "id": 833,
    "catalog_description": "Orders for library materials from a book vendor, with line items, fund allocations, EDI exchange status, and receiving workflow."
  },
  {
    "id": 825,
    "catalog_description": "Controlled-vocabulary records for names, subjects, organizations, or titles used as headings, supporting consistent retrieval and disambiguation."
  },
  {
    "id": 830,
    "catalog_description": "Rules defining loan period, renewal limits, fine accrual, and hold behavior for each combination of item type and patron category."
  },
  {
    "id": 836,
    "catalog_description": "License agreements for electronic resources (databases, ebooks, ejournals), with authorized users, concurrent-user limits, and renewal terms."
  },
  {
    "id": 829,
    "catalog_description": "Charges against a patron account for overdue, lost, or damaged items, with assessment, payment, and waiver workflow."
  },
  {
    "id": 826,
    "catalog_description": "Summaries of which copies of a title exist at a given location, including serial coverage statements and shelf-location information."
  },
  {
    "id": 828,
    "catalog_description": "Patron requests to reserve a title or specific item for later pickup, with queue position, pickup location, and trap status."
  },
  {
    "id": 824,
    "catalog_description": "Physical or digital copies of a work held by the library, each with its own barcode, location, status, and circulation history."
  },
  {
    "id": 827,
    "catalog_description": "Circulation transactions recording the loan of an item to a patron, with due date, renewal history, and return status."
  },
  {
    "id": 832,
    "catalog_description": "Classifications of patrons (student, faculty, staff, public, juvenile) that drive circulation policy and access entitlement."
  },
  {
    "id": 831,
    "catalog_description": "Registered library members with borrowing privileges, contact information, patron category, and account history."
  },
  {
    "id": 837,
    "catalog_description": "Patron-owned saved queries or reading lists, optionally configured to alert when new matching items are added to the catalog."
  },
  {
    "id": 835,
    "catalog_description": "Active subscriptions to periodicals or continuing resources, with issue prediction, check-in records, claim history, and renewal schedule."
  },
  {
    "id": 839,
    "catalog_description": "Partner libraries or consortium members for resource sharing, with agreement terms, default lending policies, and contact endpoints."
  },
  {
    "id": 834,
    "catalog_description": "Book or serials vendor relationships managed by the library, with account credentials, EDI settings, claiming defaults, and contacts."
  },
  {
    "id": 60,
    "catalog_description": "License audit and true-up records comparing entitled to installed counts, with the resulting gap, true-up cost, and supporting evidence."
  },
  {
    "id": 642,
    "catalog_description": "Active issued licenses or permits, with holder, type, issue and expiration dates, conditions, jurisdiction, and current status."
  },
  {
    "id": 644,
    "catalog_description": "Renewal applications for existing licenses, tracking submission, updated requirements, fees, condition changes, and outcome."
  },
  {
    "id": 149,
    "catalog_description": "Qualifying life events such as marriage, birth, adoption, or coverage loss that open a mid-year benefits enrollment window."
  },
  {
    "id": 728,
    "catalog_description": "Limited partners in a fund, with their commitment, contributions to date, and governance rights for compliance tracking."
  },
  {
    "id": 1099,
    "catalog_description": "Individual head of livestock, with identity, breed, sex, birth or acquisition date, status, parentage, and the mob it belongs to."
  },
  {
    "id": 1106,
    "catalog_description": "Identifiers attached to an animal, such as RFID ear tags or scheme device numbers, and the traceability registration they carry."
  },
  {
    "id": 1100,
    "catalog_description": "Managed groups of animals handled collectively for movements, treatments, and pasture allocation."
  },
  {
    "id": 602,
    "catalog_description": "Borrower requests to originate a loan, with amount, purpose, loan type, term, collateral, and lifecycle from draft to funded."
  },
  {
    "id": 608,
    "catalog_description": "Releases of approved loan funds, with date, amount, tranching, destination account, and conditions satisfied."
  },
  {
    "id": 795,
    "catalog_description": "Physical or organizational locations referenced across the system, used to place and group other records."
  },
  {
    "id": 89,
    "catalog_description": "Application log stream entries, structured and unstructured, indexed for search and correlated with metrics and traces for root-cause analysis."
  },
  {
    "id": 626,
    "catalog_description": "First-notice-of-loss events giving rise to a claim, with occurrence date, location, cause, loss type, and description."
  },
  {
    "id": 263,
    "catalog_description": "Customers enrolled in the loyalty program, with tier, accrued points balance, enrollment date, and opt-in status."
  },
  {
    "id": 265,
    "catalog_description": "Tier definitions in the loyalty program, with qualifying thresholds, benefits, and retention rules that members are assigned to."
  },
  {
    "id": 264,
    "catalog_description": "Point-earning and point-spending events for loyalty members: purchases, bonuses, redemptions, expiries, and adjustments."
  },
  {
    "id": 759,
    "catalog_description": "Active capital commitments from a limited partner to a fund, tracking committed, called, and distributed amounts plus current value."
  },
  {
    "id": 1022,
    "catalog_description": "Know-your-customer and anti-money-laundering results for a limited partner, including sanction screening, captured at subscription and re-screened periodically."
  },
  {
    "id": 754,
    "catalog_description": "Prospective limited partners being fundraised, tracking the relationship before any capital commitment is closed."
  },
  {
    "id": 769,
    "catalog_description": "Quarterly performance reports for limited partners per fund, with position marks, fund metrics, and general-partner commentary."
  },
  {
    "id": 758,
    "catalog_description": "Subscription documents collected during limited-partner onboarding: the legal commitment, KYC and AML results, and accreditation attestation."
  },
  {
    "id": 1271,
    "catalog_description": "External Learning Record Store endpoints that xAPI learning statements are routed to."
  },
  {
    "id": 493,
    "catalog_description": "Per-job equipment telemetry logged from machinery, covering operating parameters, application rates, GPS track, and alarms."
  },
  {
    "id": 703,
    "catalog_description": "Defect and non-conformance records captured from inspections or driver reports before a work order is raised."
  },
  {
    "id": 962,
    "catalog_description": "Reminders sent to a manager when one of their direct reports has overdue or upcoming training."
  },
  {
    "id": 802,
    "catalog_description": "Manufacturing bills of materials restructured for assembly order, with phantom-part rollups, kitting, and process-specific decompositions."
  },
  {
    "id": 803,
    "catalog_description": "Routings defining the ordered sequence of operations to produce a part, with work center, setup time, run time, and resource allocations."
  },
  {
    "id": 1177,
    "catalog_description": "Mooring balls in a mooring field, with position, tackle, weight rating, and the assigned vessel."
  },
  {
    "id": 1176,
    "catalog_description": "Wet berths at a dock, with number, length, beam and draft limits, utilities, and service status."
  },
  {
    "id": 1219,
    "catalog_description": "Defined slices of the market by industry, size, geography, or motion that a plan targets."
  },
  {
    "id": 1007,
    "catalog_description": "Competitive, pricing, and churn-risk signals aggregated across many conversations, summarizing what the market is saying overall."
  },
  {
    "id": 1070,
    "catalog_description": "Top-down assignments of budget from a marketing budget to a plan line, campaign, or channel, routed through approval and reconciled against spend."
  },
  {
    "id": 1069,
    "catalog_description": "Pools of marketing funds for a period, unit, or region that are approved and then allocated top-down across plans, campaigns, and channels."
  },
  {
    "id": 1068,
    "catalog_description": "Shared campaign and content calendars laying marketing activity out across time, teams, and channels for visibility and coordination."
  },
  {
    "id": 116,
    "catalog_description": "Marketing campaign definitions across email, multi-channel, and account-based plays, with target audience, schedule, content variants, and KPIs."
  },
  {
    "id": 117,
    "catalog_description": "Email templates and sent instances at marketing scale, with open, click, bounce, and unsubscribe metrics and deliverability state."
  },
  {
    "id": 120,
    "catalog_description": "Lead-capture form definitions, with fields, mapping to leads and contacts, conditional logic, and post-submit routing."
  },
  {
    "id": 1072,
    "catalog_description": "Plan-level performance and marketing-ROI measures such as results, pipeline contribution, and return, computed against the plans and budgets that funded the activity."
  },
  {
    "id": 1067,
    "catalog_description": "Lines within a marketing plan, each a planned activity or program with objective, owner, time window, and allocated budget."
  },
  {
    "id": 1066,
    "catalog_description": "Annual or quarterly marketing plans, the top-level container organizing objectives, plan lines, and budget, approved before execution."
  },
  {
    "id": 1071,
    "catalog_description": "Committed or actual marketing expenditures attributed to a budget allocation and plan line, reconciled to compute remaining budget and variance."
  },
  {
    "id": 865,
    "catalog_description": "Audit records of a matching or scoring batch, capturing model version, inputs, outputs such as fit scores and recommendations, and timestamp."
  },
  {
    "id": 318,
    "catalog_description": "Decision logic identifying candidate duplicate records within or across sources, with field weights and threshold scores."
  },
  {
    "id": 166,
    "catalog_description": "Recorded meal and rest-break events evidencing compliance with labor-law break requirements, with waiver attestation where applicable."
  },
  {
    "id": 481,
    "catalog_description": "Per-campaign media-buying plans broken down by outlet, channel, daypart, audience, flight dates, and budget allocation."
  },
  {
    "id": 610,
    "catalog_description": "Medical equipment in clinical use such as infusion pumps, ventilators, and imaging systems, as a specialized regulated asset class."
  },
  {
    "id": 864,
    "catalog_description": "Matched mentor and mentee relationships, with goals, meeting cadence, and status."
  },
  {
    "id": 319,
    "catalog_description": "Survivorship rules defining which source system's value wins per field when two records merge."
  },
  {
    "id": 155,
    "catalog_description": "Periodic compensation review cycles, with budget pool, eligibility, calibration step, approval chain, and effective date."
  },
  {
    "id": 156,
    "catalog_description": "Per-employee proposed merit increases, bonuses, and equity refreshes for a cycle, with calibration adjustments and final approval."
  },
  {
    "id": 1212,
    "catalog_description": "Positioning and messaging frameworks for a product or segment, with pillars, proof points, and approved copy."
  },
  {
    "id": 1190,
    "catalog_description": "Periodic reads of a utility meter, manual or wireless, that become a billable utility line."
  },
  {
    "id": 662,
    "catalog_description": "Operator-collected or automated consumption readings, with read date, consumption value, unit, read method, and anomaly flags."
  },
  {
    "id": 711,
    "catalog_description": "Row-level and metric-level access policies at the semantic-definition tier, governing which business unit sees which metric."
  },
  {
    "id": 252,
    "catalog_description": "Canonical, certified definitions of a business metric: numerator, denominator, filters, dimensions, time grain, ownership, and lineage to sources."
  },
  {
    "id": 709,
    "catalog_description": "Cached or pre-aggregated metric rollups served from columnar storage by the semantic layer."
  },
  {
    "id": 88,
    "catalog_description": "Time-series metric streams from instrumented applications: counters, gauges, histograms, and summaries tied to release versions."
  },
  {
    "id": 502,
    "catalog_description": "Bulk-tank or per-cow milk-quality results, covering cell count, bacterial count, butterfat, protein, and antibiotic-residue screening."
  },
  {
    "id": 501,
    "catalog_description": "Per-cow milking events from parlor or robotic systems, with milk yield, conductivity, and duration."
  },
  {
    "id": 723,
    "catalog_description": "Training metadata for machine-learning models, covering feature set, training window, version, accuracy, and retraining schedule."
  },
  {
    "id": 228,
    "catalog_description": "Registered machine-learning models with versions, training-data lineage, evaluation metrics, deployment endpoints, and approval state."
  },
  {
    "id": 1101,
    "catalog_description": "Recorded movements of a mob between paddocks, properties, or external destinations, with date, head count, origin, destination, and reason."
  },
  {
    "id": 559,
    "catalog_description": "App distribution units for mobile deployment, with app identifier, version, manifest, store link, and silent-install flag."
  },
  {
    "id": 861,
    "catalog_description": "AI-generated next-move suggestions for an employee, with rationale and freshness."
  },
  {
    "id": 1124,
    "catalog_description": "Observed insider activity events captured from endpoint, email, file, cloud, identity, or removable-media telemetry, evaluated by detection rules."
  },
  {
    "id": 85,
    "catalog_description": "Filtered, human-relevant events that crossed a threshold or matched a pattern, enriched with priority and routing, ready to be paged or ticketed."
  },
  {
    "id": 84,
    "catalog_description": "Raw events from monitored systems: state changes, threshold crossings, status updates, and log signals consumed for correlation."
  },
  {
    "id": 86,
    "catalog_description": "Monitoring policies defining what to monitor, at what frequency and thresholds, for which configuration items, often auto-bound by class."
  },
  {
    "id": 237,
    "catalog_description": "End-customer organizations of a managed service provider, with site hierarchy, contacts, contract portfolio, and asset estate."
  },
  {
    "id": 234,
    "catalog_description": "Service contracts between a managed service provider and an end-customer, covering block-hour, retainer, per-device, or managed-service models, consumption, renewal, and SLA terms."
  },
  {
    "id": 236,
    "catalog_description": "Invoices issued by a managed service provider to its end-customer, combining recurring subscription lines, out-of-contract billable work, and tax."
  },
  {
    "id": 233,
    "catalog_description": "Billable service tickets against a managed service provider's contract, with time-tracked work, billable category, SLA timer, and dispatch state."
  },
  {
    "id": 235,
    "catalog_description": "Technician time entries per ticket, contract, or customer, with category tagging, billable classification, approval, and feeds to payroll and billing."
  },
  {
    "id": 650,
    "catalog_description": "Third-party store quality assessments covering customer experience, compliance, and staff courtesy, distinct from internal store audits."
  },
  {
    "id": 1036,
    "catalog_description": "Government-issued identity numbers for a worker, such as social security or national insurance numbers, held with restricted access and validity dates."
  },
  {
    "id": 1051,
    "catalog_description": "Negotiation rules and fallback positions guiding how clauses may be redlined and which concessions are pre-approved."
  },
  {
    "id": 545,
    "catalog_description": "Historical baseline performance profiles per path, flow, or link, covering median and p95 latency, loss, and jitter, used for anomaly detection."
  },
  {
    "id": 538,
    "catalog_description": "Captured packet and session flows, with source and destination addresses, ports, protocols, bytes transferred, and duration."
  },
  {
    "id": 542,
    "catalog_description": "Physical or virtual network interfaces on monitored devices, serving as the collection point for traffic flow capture."
  },
  {
    "id": 657,
    "catalog_description": "Telco network inventory of ports, circuits, IP address blocks, fiber routes, and access-node ports, with allocated or free status."
  },
  {
    "id": 539,
    "catalog_description": "Path traces from source to destination, with the ordered hop sequence, per-hop latency, cumulative loss, and round-trip time."
  },
  {
    "id": 541,
    "catalog_description": "Threshold breaches or anomalies on network performance metrics, with severity, affected path or flow, and baseline correlation."
  },
  {
    "id": 540,
    "catalog_description": "Time-series of latency, jitter, packet loss, and throughput sampled across flows, links, and application paths for network SLO reporting."
  },
  {
    "id": 544,
    "catalog_description": "Periodic captures of network connectivity: device adjacency, link status, and interface roles, used for visualization and root-cause correlation."
  },
  {
    "id": 178,
    "catalog_description": "Placements of a worker on a performance-by-potential nine-box grid per cycle, feeding succession planning and high-potential identification."
  },
  {
    "id": 714,
    "catalog_description": "Record-triggered workflows, scheduled jobs, or external API calls defined in a no-code platform."
  },
  {
    "id": 241,
    "catalog_description": "User-defined containers for a no-code deployment: a self-contained namespace for tables, views, automations, and access."
  },
  {
    "id": 712,
    "catalog_description": "Public or authenticated intake forms authored in a no-code database."
  },
  {
    "id": 242,
    "catalog_description": "User-defined schema inside a no-code base: tables, fields with types, linked-record relationships, formulas, and views."
  },
  {
    "id": 713,
    "catalog_description": "Switchable presentation layers such as grid, gallery, kanban, calendar, or timeline over a no-code base."
  },
  {
    "id": 961,
    "catalog_description": "Reusable email, in-app, and chat templates with merge fields, used by automation rules and manager reminders."
  },
  {
    "id": 119,
    "catalog_description": "Multi-touch outbound nurture flows, with branching paths, wait conditions, exit criteria, and content trees."
  },
  {
    "id": 1273,
    "catalog_description": "Scored learner results against observation checklists, with observer signoff."
  },
  {
    "id": 1272,
    "catalog_description": "On-the-job competency checklists that an observer scores against for field-skill assessment."
  },
  {
    "id": 348,
    "catalog_description": "Real-time or snapshot occupancy state for a space: desk booked, room reserved, or actual check-in via badge or mobile."
  },
  {
    "id": 1080,
    "catalog_description": "Medical surveillance and exposure records such as respirator fit tests, audiometric tests, or fitness-for-duty evaluations, retained per occupational-health rules."
  },
  {
    "id": 904,
    "catalog_description": "Immutable, append-only audit logs of every applicant-flow event for federal contractors, carrying the actor, timestamp, and compliance-relevant fields."
  },
  {
    "id": 896,
    "catalog_description": "Approval steps in the offer-approval chain, triggered when an offer exceeds band, includes non-standard equity, or matches other escalation rules."
  },
  {
    "id": 897,
    "catalog_description": "Generated PDF letters of the offer terms, versioned alongside the structured offer and linked to the e-signature envelope."
  },
  {
    "id": 1004,
    "catalog_description": "Reusable offer-letter templates with merge tokens for candidate, role, and pay terms, versioned by jurisdiction and language to render offer letters."
  },
  {
    "id": 895,
    "catalog_description": "Versioned snapshots of a job offer during negotiation, each holding the structured terms and the author of the change, from initial through accepted."
  },
  {
    "id": 967,
    "catalog_description": "Periodic status updates on an objective or key result during the active cycle, the cadence of record for OKR programs."
  },
  {
    "id": 966,
    "catalog_description": "Measurable results attached to an objective, the unit of scoring that tracks progress toward the goal."
  },
  {
    "id": 245,
    "catalog_description": "Goals with measurable key results, owner accountability, and weighted progress rollup, organized in a hierarchy and reviewed on a quarterly or annual cadence."
  },
  {
    "id": 20,
    "catalog_description": "Groups of new hires onboarding together, such as a campus class or training batch, enabling shared activities and cohort-level reporting."
  },
  {
    "id": 22,
    "catalog_description": "Paperwork collected from a new hire during onboarding, such as tax and eligibility forms, with signature state and e-signature envelope references."
  },
  {
    "id": 16,
    "catalog_description": "Live onboarding journeys for a specific new hire, carrying assigned tasks, current stage, completion state, and milestone timestamps."
  },
  {
    "id": 15,
    "catalog_description": "Reusable templates defining the stages, tasks, timing, and assignees for onboarding a class of new hire, versioned and selected by role, location, or type."
  },
  {
    "id": 17,
    "catalog_description": "Phases within an onboarding plan or journey, such as pre-boarding or 30/60/90 day, defining task grouping, duration, and gate conditions."
  },
  {
    "id": 18,
    "catalog_description": "Discrete to-do items within an onboarding journey, each with an assignee, due date, type, and completion state, some triggering handoffs to other systems."
  },
  {
    "id": 254,
    "catalog_description": "Formal models of concepts, properties, relationships, and rules that define the schema tier of a knowledge graph, including namespaces and constraint shapes."
  },
  {
    "id": 809,
    "catalog_description": "Operating-cadence meeting records (quarterly, monthly, weekly) with agenda, participants, commentary, and action items, locked as an audit trail once closed."
  },
  {
    "id": 453,
    "catalog_description": "Deployments of cluster operators and controllers, such as certificate management, monitoring, and GitOps lifecycle controllers."
  },
  {
    "id": 860,
    "catalog_description": "Employee expressions of interest in an internal opportunity, tracking status from submitted through accepted, rejected, or withdrawn."
  },
  {
    "id": 773,
    "catalog_description": "Equity pools reserved for employee grants, tracking pool size, available headroom, reservation workflows, and board-approved expansions."
  },
  {
    "id": 1238,
    "catalog_description": "Reusable multichannel plays defining the triggers, audience, channel sequence, and exit criteria for an automated campaign."
  },
  {
    "id": 424,
    "catalog_description": "Inventory allocation decisions per order line across warehouses, stores, and fulfillment partners, tracking allocated, partial, or backorder state."
  },
  {
    "id": 382,
    "catalog_description": "Individual product lines within an order, with quantity, price, discount, and tax breakdown."
  },
  {
    "id": 28,
    "catalog_description": "Proposed organization structure changes such as new or eliminated positions and reporting-line shifts, capturing current versus proposed state and the migration path."
  },
  {
    "id": 34,
    "catalog_description": "Nodes in the organizational hierarchy such as divisions, departments, and teams, with manager, cost center alignment, geographic scope, and parent-child links."
  },
  {
    "id": 1077,
    "catalog_description": "OSHA Form 300 logs of work-related injuries and illnesses, maintained per establishment per year, with the annual 300A summary."
  },
  {
    "id": 1078,
    "catalog_description": "OSHA Form 301 injury and illness incident reports, filed per recordable incident."
  },
  {
    "id": 665,
    "catalog_description": "Unplanned losses of service affecting customer connections, with detection time, cause, estimated restoration, and affected customer count."
  },
  {
    "id": 1260,
    "catalog_description": "Ordered steps within an outreach sequence, each defining the channel, day offset, message template, and whether the step is automated or needs a recruiter action."
  },
  {
    "id": 1259,
    "catalog_description": "Named multi-step sourcing cadences that automate candidate outreach across channels, holding the sequence name, owner, channel mix, and active status."
  },
  {
    "id": 637,
    "catalog_description": "Engagements with external law firms, covering firm, attorney, matter, scope, billing arrangement, budget, and status to track spend and coordination."
  },
  {
    "id": 467,
    "catalog_description": "Backing services attached to an app, such as databases, queues, caches, and logging, with type, plan, provisioning status, and cost."
  },
  {
    "id": 463,
    "catalog_description": "Core application records on the platform, with name, region, runtime, git repository, environment variables, and domain bindings."
  },
  {
    "id": 468,
    "catalog_description": "Build artifacts captured during continuous integration, with buildpack output, slug size, build time, version, and environment changes."
  },
  {
    "id": 464,
    "catalog_description": "Release records that activate a build, with app reference, version, status, timestamp, and the person who deployed it."
  },
  {
    "id": 465,
    "catalog_description": "Deployment environments such as dev, staging, and production, with environment-specific config overrides, resource limits, and addon bindings."
  },
  {
    "id": 466,
    "catalog_description": "Running compute units (process containers) for an app, with type, size, uptime, memory and CPU metrics, and status."
  },
  {
    "id": 1108,
    "catalog_description": "Assignments of a herd to a paddock for a grazing period, with start and end dates, stocking rate, and expected versus actual rest."
  },
  {
    "id": 224,
    "catalog_description": "Scheduled or ad-hoc deployments of OS and software patches to a set of endpoints, with per-endpoint approval, execution status, and rollback state."
  },
  {
    "id": 617,
    "catalog_description": "Scheduled visits between patient and provider, with location, time, visit type, reason, and status from scheduled through completed or no-show."
  },
  {
    "id": 620,
    "catalog_description": "Provider-initiated requests for specialist consultation or external service, with clinical indication, urgency, insurance authorization, and status."
  },
  {
    "id": 138,
    "catalog_description": "Payroll cycle executions scoped to a pay group, country, and period, driving gross-to-net calculation and producing pay slips, journal entries, and tax filings."
  },
  {
    "id": 139,
    "catalog_description": "Per-employee per-cycle gross-to-net pay statements, showing earnings, deductions, contributions, withholdings, net pay, and year-to-date totals."
  },
  {
    "id": 205,
    "catalog_description": "Scheduled batches of supplier payments grouped by bank account, currency, and method, driving the accounts-payable payment cycle."
  },
  {
    "id": 387,
    "catalog_description": "Payment attempts and authorizations on an order (charge, decline, refund, capture) tracked through a multi-state lifecycle."
  },
  {
    "id": 145,
    "catalog_description": "General-ledger postings produced by a pay run, broken down into debit and credit lines by cost center, department, and pay code."
  },
  {
    "id": 760,
    "catalog_description": "Partner capital account statements per investor per close period, showing contributions, distributions, gains, fees, and ending balance, locked once distributed."
  },
  {
    "id": 1285,
    "catalog_description": "Security-awareness training records for staff who handle card data, kept for PCI DSS compliance."
  },
  {
    "id": 43,
    "catalog_description": "Calculated workforce metrics such as time-to-fill, attrition, retention, and cost-per-hire, derived from HR, recruiting, learning, and payroll event streams."
  },
  {
    "id": 175,
    "catalog_description": "Individual performance goals with owner, period, metric, weight, and status, aligned to organizational objectives and reviewed within performance cycles."
  },
  {
    "id": 174,
    "catalog_description": "Per-cycle per-worker review records holding self and manager assessments, ratings, narrative, and calibration outcome."
  },
  {
    "id": 641,
    "catalog_description": "Citizen or business submissions requesting a license or permit, with applicant, permit type, fees due, supporting documents, and review status."
  },
  {
    "id": 643,
    "catalog_description": "Field inspections tied to a permit, with type, scheduled date, inspector, location, outcome, and required corrections or follow-up."
  },
  {
    "id": 1213,
    "catalog_description": "Buyer or user personas describing role, goals, pains, and buying triggers, referenced by messaging and content."
  },
  {
    "id": 444,
    "catalog_description": "Context-aware branching rules that show a tailored variant to a given audience segment within an experience."
  },
  {
    "id": 396,
    "catalog_description": "Owner and client records for a veterinary practice, with contact details, payment method on file, communication preferences, and account balance history."
  },
  {
    "id": 1283,
    "catalog_description": "Per-recipient outcomes of a phishing simulation, recording whether each person clicked, reported, or ignored the test message."
  },
  {
    "id": 1282,
    "catalog_description": "Configured simulated-phishing campaigns used for security-awareness training and PCI DSS compliance."
  },
  {
    "id": 1248,
    "catalog_description": "Business or technical goals a team commits to for a program increment, scored on planned versus actual business value at the review."
  },
  {
    "id": 519,
    "catalog_description": "Pickup sites such as host locations, depots, or on-farm points, with operating hours and self-serve member capacity."
  },
  {
    "id": 812,
    "catalog_description": "Definitions of product attributes available to products, with data type, validation rules, attribute group, locale awareness, and channel overrides."
  },
  {
    "id": 814,
    "catalog_description": "Hierarchical taxonomy nodes used to classify products, supporting multiple parallel category trees through a parent self-reference."
  },
  {
    "id": 816,
    "catalog_description": "Image, video, 3D model, and document assets tied to products, with rights metadata, renditions, and delivery URLs."
  },
  {
    "id": 811,
    "catalog_description": "Merchandising master records for sellable products, hubs of attributes, descriptions, variants, categories, translations, and assets consumed across channels."
  },
  {
    "id": 817,
    "catalog_description": "Definitions of outbound publishing channels such as marketplaces and merchant feeds, holding destination mappings, credentials, and per-channel overrides."
  },
  {
    "id": 818,
    "catalog_description": "Publish runs that send a product or batch to a syndication channel, with queue position, status, validation results, and rejection reasons."
  },
  {
    "id": 815,
    "catalog_description": "Locale-keyed translations of a product attribute or description, driving multi-language publishing through machine, human, or hybrid pipelines."
  },
  {
    "id": 813,
    "catalog_description": "Specific size, color, or pack-size variants of a parent product, each with its own SKU and publish state, inheriting attribute defaults from the parent."
  },
  {
    "id": 434,
    "catalog_description": "Execution instances of a data pipeline, with runtime status, lineage snapshot, and error state."
  },
  {
    "id": 101,
    "catalog_description": "Sales-process stage definitions with exit criteria, default probability, and allowed transitions, the configuration behind the opportunity pipeline."
  },
  {
    "id": 1231,
    "catalog_description": "Append-only records of plan approvals, locks, and the downstream push events they trigger."
  },
  {
    "id": 1229,
    "catalog_description": "Saved snapshots of a plan at a point in time, kept for comparison and audit."
  },
  {
    "id": 651,
    "catalog_description": "Shelf-layout and product-placement compliance checks against corporate planogram standards, with deviations, remediation, and photo evidence."
  },
  {
    "id": 488,
    "catalog_description": "Per-pass planting events, recording seed variety, rate, depth, date, and weather conditions."
  },
  {
    "id": 454,
    "catalog_description": "Continuous-delivery pipelines wired into the cluster, covering GitOps, fleet orchestration, and in-cluster build and deploy."
  },
  {
    "id": 804,
    "catalog_description": "Resolved product configurations, each a validated combination of option selections that is sellable or buildable, with its own price, lead time, and bill of materials."
  },
  {
    "id": 187,
    "catalog_description": "Preventive maintenance work orders covering scope, schedule, assignee, and execution status for planned upkeep."
  },
  {
    "id": 286,
    "catalog_description": "Records that a user read and acknowledged a policy, with timestamp, policy version, medium, and completion evidence."
  },
  {
    "id": 625,
    "catalog_description": "Individual coverage lines within an insurance policy, with line of business, limit, deductible, coinsurance, and effective period that govern claim eligibility."
  },
  {
    "id": 765,
    "catalog_description": "ESG and diversity metric submissions per portfolio company per period, supporting regulatory and investor ESG reporting."
  },
  {
    "id": 764,
    "catalog_description": "KPI submission cycles per portfolio company per period, capturing recurring revenue, headcount, runway, cash, margin, and churn."
  },
  {
    "id": 766,
    "catalog_description": "Fair-value marks per portfolio company per close cycle, the investor-side valuation of each holding."
  },
  {
    "id": 763,
    "catalog_description": "Investee companies held by one or more funds, with headline financials, board composition, ownership percentage, exit status, and sector tagging."
  },
  {
    "id": 1244,
    "catalog_description": "Large bodies of work in the portfolio backlog that are funded, analyzed, and delivered through a funnel before decomposing into features."
  },
  {
    "id": 1201,
    "catalog_description": "Ship-store retail sales of non-fuel goods, paid at the register or posted to a customer house account."
  },
  {
    "id": 25,
    "catalog_description": "Projected need for specific roles derived from the capacity model: which positions, when, where, and at what level, feeding the requisition pipeline."
  },
  {
    "id": 898,
    "catalog_description": "FCRA-mandated notices sent to a candidate before a final adverse-action decision, including the report and rights summary and opening a dispute waiting period."
  },
  {
    "id": 749,
    "catalog_description": "Pre-employment records covering the window between offer acceptance and start date, tracking paperwork, background checks, and pre-boarding tasks."
  },
  {
    "id": 46,
    "catalog_description": "Outputs of machine-learning and statistical models such as flight-risk and mobility scores, with model identifier, training window, and per-employee scores."
  },
  {
    "id": 96,
    "catalog_description": "Proactive forecasts emitted before symptoms surface, such as predicted capacity exhaustion, component failure, or an upcoming service-level breach."
  },
  {
    "id": 957,
    "catalog_description": "Gating rules that control learning-path progression, requiring completions, scores, certifications, or competencies before the next step."
  },
  {
    "id": 380,
    "catalog_description": "Per-vehicle-class preventive maintenance schedule templates, defining trigger basis, task list, and due-date generation rules."
  },
  {
    "id": 419,
    "catalog_description": "Pricing rules for the quoting engine, covering tiered and volume discounts, seat and duration pricing, bundle discounts, and segment overrides."
  },
  {
    "id": 1132,
    "catalog_description": "Activity executions within a process instance such as a service task or gateway, each with its own lifecycle and dispatched job."
  },
  {
    "id": 583,
    "catalog_description": "Resource-constrained or time-trapped steps found in a process, with severity, estimated throughput impact, and recommended mitigation."
  },
  {
    "id": 581,
    "catalog_description": "Results of conformance checking that compare an event log against a reference process model, flagging deviations with severity, type, and root cause."
  },
  {
    "id": 1130,
    "catalog_description": "Deployed, executable process models with a unique key and version, from which process instances are started."
  },
  {
    "id": 1134,
    "catalog_description": "Append-only records of individual state changes in the process engine, the immutable execution history used for replay, recovery, and mining."
  },
  {
    "id": 1135,
    "catalog_description": "Blocked process executions such as exhausted retries or unhandled errors that halt an activity until an operator resolves them, with failure detail."
  },
  {
    "id": 1131,
    "catalog_description": "Running or completed executions of a process definition, holding token position, variables, and correlation key as the durable unit the engine advances."
  },
  {
    "id": 250,
    "catalog_description": "Executions of a process simulation scenario against a process model, with input variables, outputs such as throughput and bottlenecks, and run metadata."
  },
  {
    "id": 1133,
    "catalog_description": "Typed key-value data tied to a running process instance, carrying the business payload that steps read and write as work advances."
  },
  {
    "id": 582,
    "catalog_description": "Distinct execution patterns found in a process event log, grouping cases that follow significantly different paths, with their frequency and cycle time."
  },
  {
    "id": 598,
    "catalog_description": "As-built records of manufactured items, with serial number, lot or batch, the order that produced them, and quality status, forming the traceability backbone."
  },
  {
    "id": 422,
    "catalog_description": "Reusable package definitions that group products together with selection rules and bundled-discount pricing."
  },
  {
    "id": 805,
    "catalog_description": "Declarations stating whether a controlled substance is present in a part, at what concentration, and whether a regulatory exemption applies."
  },
  {
    "id": 418,
    "catalog_description": "Captured user selections when configuring a quote line, mapping chosen options on a base product to a specific variant."
  },
  {
    "id": 403,
    "catalog_description": "Capabilities, stories, or epics on a product roadmap, the atomic unit for prioritization and mapping customers to releases."
  },
  {
    "id": 1208,
    "catalog_description": "Launch records for a product or feature, tracking tier, key dates, status, and the post-launch retrospective."
  },
  {
    "id": 402,
    "catalog_description": "Software product lines in development and go-to-market, bundling features and releases across their lifecycle."
  },
  {
    "id": 408,
    "catalog_description": "Product key performance indicators tracked over time, such as adoption, retention, usage, and churn risk."
  },
  {
    "id": 404,
    "catalog_description": "Versioned software releases that bundle a set of features and define the delivery date and scope."
  },
  {
    "id": 405,
    "catalog_description": "Timeline views of planned features grouped by release, product, or theme."
  },
  {
    "id": 599,
    "catalog_description": "Shop-floor equipment or line stoppages, with start time, duration, reason code, throughput impact, and resolution, feeding equipment effectiveness metrics."
  },
  {
    "id": 595,
    "catalog_description": "Units of work released to the factory floor, specifying product, quantity, schedule window, build instructions, and material requirements."
  },
  {
    "id": 600,
    "catalog_description": "Inspection results for a produced unit or batch, recording checklist completion, pass or fail, defect classification, and inspector."
  },
  {
    "id": 597,
    "catalog_description": "Published build plans for a line, cell, or workcenter, with time-based slots, assigned orders, sequencing, and changeover windows."
  },
  {
    "id": 311,
    "catalog_description": "Summary statistics computed on a data asset during a scan, such as cardinality, null percentage, distinct count, and value distributions."
  },
  {
    "id": 1246,
    "catalog_description": "Fixed timeboxes during which a release train delivers incremental value, planned in a big-room event and closed with an inspect-and-adapt review."
  },
  {
    "id": 218,
    "catalog_description": "Allocations of a worker to a project, with role, bill rate, cost rate, planned hours, and period, driving utilization and availability reporting."
  },
  {
    "id": 219,
    "catalog_description": "Discrete billing triggers within a project, with amount, trigger condition, and status, driving revenue recognition and invoicing on fixed-fee work."
  },
  {
    "id": 726,
    "catalog_description": "Forward-looking plans committing resources to projects, with skill, planned utilization, and effective period, distinct from executed assignments."
  },
  {
    "id": 217,
    "catalog_description": "Decomposed units of work within a project, with scope, dependencies, estimated hours, and status, used for time tracking and earned-value calculation."
  },
  {
    "id": 1288,
    "catalog_description": "Markup comments placed on a region of a proof during review, with the reviewer, location, and resolution state."
  },
  {
    "id": 1287,
    "catalog_description": "Review-and-approval cycles on a creative asset or document, where reviewers mark up the proof and decide to approve or request changes."
  },
  {
    "id": 345,
    "catalog_description": "Buyer-side lease contracts for real estate, covering terms, dates, financials, and renewals, with lease accounting under ASC 842 and IFRS 16."
  },
  {
    "id": 347,
    "catalog_description": "Allocable units within a property such as desks, meeting rooms, parking spaces, or lockers."
  },
  {
    "id": 358,
    "catalog_description": "People or households occupying a rental unit under a lease, with contact details, lease history, payment history, and screening results."
  },
  {
    "id": 369,
    "catalog_description": "Periodic valuations of a property or portfolio by cap rate, discounted cash flow, or comparison, with valuation date, method, and assumptions."
  },
  {
    "id": 678,
    "catalog_description": "Proposed code changes targeting a branch in a source repository, with author, branches, status, reviewers, approvals, and continuous-integration results."
  },
  {
    "id": 185,
    "catalog_description": "Survey items rotated through pulse-survey cadences, with driver mapping, anti-fatigue rotation, and benchmarking."
  },
  {
    "id": 1197,
    "catalog_description": "Records of sewage pump-outs for a vessel, kept for Clean Vessel Act grant reporting and state mandates."
  },
  {
    "id": 73,
    "catalog_description": "Orders issued to a supplier authorizing delivery, with line items, agreed prices, delivery terms, payment terms, and ship-to and bill-to details."
  },
  {
    "id": 72,
    "catalog_description": "Internal requests to buy something, capturing what is needed, the requester, justification, budget reference, and approval state."
  },
  {
    "id": 310,
    "catalog_description": "Work items raised when a data quality rule is breached, with root-cause detail, remediation status, linked data assets, and SLA."
  },
  {
    "id": 309,
    "catalog_description": "Rules defining acceptable data state, such as cardinality bounds, regex patterns, referential integrity, and statistical thresholds."
  },
  {
    "id": 710,
    "catalog_description": "Audit trail of executed queries, linking metric reads back to source tables, transformations, and the requesting identity."
  },
  {
    "id": 1269,
    "catalog_description": "Reusable pools of assessment questions independent of any single test, drawn from for randomized quizzes and recertification exams."
  },
  {
    "id": 258,
    "catalog_description": "Real-time and historical metrics per contact queue, such as wait time, abandonment rate, service level, and average handle time."
  },
  {
    "id": 916,
    "catalog_description": "Item-level learner responses to quiz questions, captured for per-question review and psychometric analysis."
  },
  {
    "id": 1225,
    "catalog_description": "Revenue targets allocated to a territory, rep, or team for a plan period."
  },
  {
    "id": 420,
    "catalog_description": "Line- and quote-level discounts, recording the source, amount, and approval status."
  },
  {
    "id": 417,
    "catalog_description": "Individual lines on a quote for a configured product, with unit price, quantity, line total, bundle nesting, and discounts."
  },
  {
    "id": 189,
    "catalog_description": "Pre-agreed bill rates by role, geography, and supplier tier, driving consistent work-order pricing and accounts-payable matching."
  },
  {
    "id": 1210,
    "catalog_description": "Templates of cross-functional readiness items a launch must clear before going live."
  },
  {
    "id": 352,
    "catalog_description": "Properties offered for sale or rent, with pricing, photos, descriptions, agent representation, and status from active to sold."
  },
  {
    "id": 344,
    "catalog_description": "Buildings, facilities, or managed spaces, owned or leased, tracked across their lifecycle from acquisition to sale or expiry."
  },
  {
    "id": 353,
    "catalog_description": "Real estate deals from accepted offer through close, with parties, terms, contingencies, escrow timeline, and document compliance."
  },
  {
    "id": 587,
    "catalog_description": "Aggregated session telemetry for an end-user device over a window, covering page loads, app launches, network quality, and connectivity transitions."
  },
  {
    "id": 497,
    "catalog_description": "Records of a product recall execution, with affected lots, notification log, hold-and-segregate status, and regulatory filing."
  },
  {
    "id": 942,
    "catalog_description": "Recurrence configurations that drive periodic compliance-refresh assignment cycles for regulations like FINRA, HIPAA, and OSHA."
  },
  {
    "id": 433,
    "catalog_description": "Legal hold and disposition rules per document class, with regulatory retention periods and scheduled destruction dates."
  },
  {
    "id": 869,
    "catalog_description": "Free-text recruiter notes attached to a candidate, application, or talent pool, time-stamped and authored by a user."
  },
  {
    "id": 873,
    "catalog_description": "Saved recruiter searches over the candidate database, with the filter expression, last-run time, and alert preferences."
  },
  {
    "id": 868,
    "catalog_description": "Links between candidates and recruiting events, recording registration, check-in, attendance, and conversion outcome."
  },
  {
    "id": 13,
    "catalog_description": "Third-party recruiters and staffing firms supplying candidates, with contract terms, contacts, performance, and submitted candidates."
  },
  {
    "id": 14,
    "catalog_description": "Career fairs, campus events, hackathons, and meetups used as sourcing channels, tracking attendees, captured leads, and event return."
  },
  {
    "id": 5,
    "catalog_description": "Channels a candidate came from, such as job board, referral, agency, campaign, or inbound, used for source-of-hire and channel analytics."
  },
  {
    "id": 1189,
    "catalog_description": "Scheduled charges generated from a contract, such as dockage, storage, or service fees billed on a periodic cadence."
  },
  {
    "id": 717,
    "catalog_description": "Catalog entries for loyalty rewards, with point values, redemption eligibility rules, and partner-offer linkage."
  },
  {
    "id": 718,
    "catalog_description": "Fulfillments of a loyalty reward redemption, covering point deduction, reward shipment, and partner settlement."
  },
  {
    "id": 876,
    "catalog_description": "Time-bounded promotions offering bonus referral rewards, scoping an override to the standard referral payout rules."
  },
  {
    "id": 875,
    "catalog_description": "Individual referral payouts triggered when a referred candidate is hired and meets tenure conditions, moving from pending to approved to paid."
  },
  {
    "id": 874,
    "catalog_description": "Bounty rules defining the payout amount and conditions for a successful referral, such as a fixed sum paid after the new hire's start."
  },
  {
    "id": 806,
    "catalog_description": "Reference catalog of substances controlled by product regulations, with CAS number, regulation pointers, threshold concentrations, and exemptions."
  },
  {
    "id": 943,
    "catalog_description": "Export artifacts prepared for regulator submissions, such as OSHA 300 logs, FINRA filings, and state rollups."
  },
  {
    "id": 646,
    "catalog_description": "Government-assessed fees for permits, licenses, inspections, and citations, with fee type, amount, due date, payer, and payment status."
  },
  {
    "id": 639,
    "catalog_description": "Notifications received from a regulator, with jurisdiction, inquiry type, subject, deadline, assigned counsel, and response status."
  },
  {
    "id": 752,
    "catalog_description": "Graph edges capturing relationships between people, organizations, and the firm, such as introductions, co-investor ties, and advisor links."
  },
  {
    "id": 290,
    "catalog_description": "Action plans to close an issue or failed control test, with responsible party, target date, steps, evidence requirements, and status."
  },
  {
    "id": 1286,
    "catalog_description": "Configured nudge cadences that drive automated reminders to learners and managers."
  },
  {
    "id": 238,
    "catalog_description": "Remote-control sessions, with technician, target endpoint, attended or unattended type, timestamps, transferred files, and recording link."
  },
  {
    "id": 360,
    "catalog_description": "Tenant payments of rent or other lease charges, with amount, allocation across charges, late fees, and reconciliation status."
  },
  {
    "id": 359,
    "catalog_description": "Prospective-tenant applications with personal and financial details, employer info, references, and screening results, preceding lease signing."
  },
  {
    "id": 362,
    "catalog_description": "Residential lease agreements between landlord and tenant for a rental unit, covering term, rent schedule, security deposit, and addenda."
  },
  {
    "id": 357,
    "catalog_description": "Lettable units within a residential property, such as apartments or condos, with amenities, size, current rent, and lease status."
  },
  {
    "id": 578,
    "catalog_description": "Many-to-many links between product requirements and the test cases that verify them, supporting coverage metrics and impact analysis."
  },
  {
    "id": 885,
    "catalog_description": "Approval steps that gate opening a job requisition, each recording the approver, decision, timestamp, and rationale."
  },
  {
    "id": 277,
    "catalog_description": "Assignments of a person, team, or asset to an initiative or roadmap item for a period, with utilization and cost rate."
  },
  {
    "id": 725,
    "catalog_description": "Inventories of skills and competencies across the resource base, with proficiency levels, used to forecast utilization."
  },
  {
    "id": 648,
    "catalog_description": "Retail store labor schedules covering shift assignments, associate availability, and coverage, with retail-specific staffing logic."
  },
  {
    "id": 427,
    "catalog_description": "Return merchandise authorizations created for a customer return, with refund status, return location, and tracking."
  },
  {
    "id": 1010,
    "catalog_description": "Period revenue forecast snapshots by segment and roll-up, recording the committed, best-case, and pipeline calls for a forecast period."
  },
  {
    "id": 109,
    "catalog_description": "Deferred-revenue schedules under ASC 606 and IFRS 15, with performance obligations, allocations, recognition timeline, and recognized versus deferred amounts."
  },
  {
    "id": 1257,
    "catalog_description": "Pre-hire right-to-work verification events, such as the I-9 or E-Verify check, recording method, status, verifier, and outcome under employment-eligibility law."
  },
  {
    "id": 291,
    "catalog_description": "Periodic or event-driven exercises to identify, analyze, and evaluate risks, with type, scope, date, register version, and findings."
  },
  {
    "id": 1125,
    "catalog_description": "Configured behavioral indicators or detection rules that add weight to user risk scores and fire alerts, such as large downloads before resignation."
  },
  {
    "id": 223,
    "catalog_description": "Installed monitoring-and-management agents on endpoints and servers, with version, last check-in, health, configuration state, and telemetry status."
  },
  {
    "id": 275,
    "catalog_description": "Planned product or capability deliveries slated for a future release cycle, with dependencies and contingency planning."
  },
  {
    "id": 591,
    "catalog_description": "Reservations of meeting rooms, event spaces, or collaborative areas by an employee or team, with time slot, capacity, and requested amenities."
  },
  {
    "id": 95,
    "catalog_description": "Root cause analysis records, suggested or human-confirmed, linking candidate causes to the correlated event cluster and resulting incident."
  },
  {
    "id": 1089,
    "catalog_description": "Right-of-use assets recognized for a lease, with initial measurement, accumulated amortization, impairment, and carrying value under ASC 842 or IFRS 16."
  },
  {
    "id": 526,
    "catalog_description": "Discrete UI-level actions within a bot, such as click, type, extract, wait, or branch, sequenced to form the bot logic."
  },
  {
    "id": 527,
    "catalog_description": "Per-execution traces of individual bot activities, with sequence, status, optional screenshot, captured data, timestamp, and error details."
  },
  {
    "id": 528,
    "catalog_description": "Stored secrets used by bots, with credential type, target system, encrypted value, and rotation policy."
  },
  {
    "id": 523,
    "catalog_description": "Automation bot definitions that drive UI-level interactions, with process logic, trigger conditions, error handling, and version history."
  },
  {
    "id": 529,
    "catalog_description": "Versioned, distributable bot packages, with release notes, checksum, target environment, and deployment details."
  },
  {
    "id": 524,
    "catalog_description": "Single runs of a bot, with start and end time, status, execution log, input variables, and output results."
  },
  {
    "id": 525,
    "catalog_description": "Recurring bot execution configurations, with cron frequency, timezone, enabled state, next run time, and log retention policy."
  },
  {
    "id": 339,
    "catalog_description": "Tenants, workspaces, or domains of a SaaS platform, tracked as the places where company data resides for security-posture analysis."
  },
  {
    "id": 543,
    "catalog_description": "Availability and response-time readings for SaaS apps, monitored from multiple locations and networks to capture the experience real users get."
  },
  {
    "id": 61,
    "catalog_description": "SaaS applications in the company portfolio, with vendor, category, criticality, owner, and whether each is sanctioned or shadow IT."
  },
  {
    "id": 62,
    "catalog_description": "Contractual subscriptions for SaaS apps: plan tier, seat count, recurring cost, billing cadence, renewal date, and owner."
  },
  {
    "id": 64,
    "catalog_description": "Per-user activity for each SaaS app: logins, time in app, feature usage, and last-active date, used to right-size licenses."
  },
  {
    "id": 1073,
    "catalog_description": "Workplace injuries, illnesses, near-misses, and unsafe conditions, with investigation, root-cause analysis, and recordability determination."
  },
  {
    "id": 154,
    "catalog_description": "Pay ranges by grade and geographic zone, with minimum, midpoint, maximum, and benchmark source, guiding offers and pay-equity analysis."
  },
  {
    "id": 102,
    "catalog_description": "Logged touchpoints between sales and a contact or opportunity: calls, emails, meetings, demos, and content views."
  },
  {
    "id": 121,
    "catalog_description": "Multi-step outreach sequences defining touchpoints, timing, and branching rules, used to enroll and engage prospects systematically."
  },
  {
    "id": 123,
    "catalog_description": "Individual one-to-one sales emails sent to prospects, with open, reply, and click tracking and thread context."
  },
  {
    "id": 1215,
    "catalog_description": "Sales-facing content assets such as decks, one-pagers, and demo scripts, managed through draft, publish, and retire states."
  },
  {
    "id": 416,
    "catalog_description": "Versioned, numbered quote documents with dates, validity, currency, terms, pricing, and status from draft to accepted or lost."
  },
  {
    "id": 630,
    "catalog_description": "Recoveries of salvageable property or proceeds from damaged or totaled assets after a claim settles, with vendor and recovery amount."
  },
  {
    "id": 513,
    "catalog_description": "Cleaning and sanitation completion records per shift, line, or piece of equipment, with verification results."
  },
  {
    "id": 279,
    "catalog_description": "What-if strategic scenarios such as mergers, market disruption, or expansion, used to compare possible futures."
  },
  {
    "id": 438,
    "catalog_description": "Canonical schemas for data flowing through pipelines, defining field contracts, versions, and evolution rules."
  },
  {
    "id": 910,
    "catalog_description": "Imported e-learning content packages in standard formats, carrying the content manifest and runtime tracking state."
  },
  {
    "id": 1082,
    "catalog_description": "Safety data sheets for hazardous substances, with hazard classification, exposure limits, and handling guidance for hazard communication."
  },
  {
    "id": 780,
    "catalog_description": "Shareholder-initiated sales of existing equity: tender offers, employee liquidity programs, or direct transfers, with board approval."
  },
  {
    "id": 771,
    "catalog_description": "Classes of security in the cap table such as common, preferred series, SAFEs, and warrants, with their rights and preferences."
  },
  {
    "id": 446,
    "catalog_description": "Audience clusters defined within a digital experience platform for on-site personalization."
  },
  {
    "id": 230,
    "catalog_description": "Reusable metric and dimension definitions in the semantic layer, governed for consistent use across BI tools and AI agents."
  },
  {
    "id": 341,
    "catalog_description": "Detected data-security incidents such as over-privilege, exposed sensitive data, or unauthorized access, triggering remediation."
  },
  {
    "id": 52,
    "catalog_description": "Definitions of what can be requested: the request form, fulfillment workflow, approvals, service level, and charge-back rules."
  },
  {
    "id": 50,
    "catalog_description": "Planned modifications to a service or configuration item, with change type, risk score, approval state, schedule, and back-out plan."
  },
  {
    "id": 663,
    "catalog_description": "Meter-to-grid or meter-to-pipe hookup assets, with location, conductor or pipe size, install date, and maintenance history."
  },
  {
    "id": 741,
    "catalog_description": "Service contracts that carry service-level commitments such as response times, parts coverage, and call-out fees."
  },
  {
    "id": 1194,
    "catalog_description": "Quoted estimates for boatyard work, covering scope, labor hours, parts, and price, approved by the boater before work begins."
  },
  {
    "id": 47,
    "catalog_description": "Unplanned service interruptions or quality reductions, with severity, priority, category, assignee, and affected components."
  },
  {
    "id": 91,
    "catalog_description": "Service-level objective definitions and their breach state, with targets, remaining error budget, burn rate, and last breach."
  },
  {
    "id": 79,
    "catalog_description": "Mappings of named business services to the configuration items that underlie them, linking technical topology to business impact."
  },
  {
    "id": 452,
    "catalog_description": "Service mesh installations, with traffic policy, mutual-TLS enforcement, and distributed-tracing configuration."
  },
  {
    "id": 1265,
    "catalog_description": "Back-end service definitions covering commitments, supported configurations, and fulfillment, separate from their user-facing catalog items."
  },
  {
    "id": 1261,
    "catalog_description": "Customer-facing outage records, with the affected service, public status, start and end times, and the customer message."
  },
  {
    "id": 820,
    "catalog_description": "Recurring preventive-maintenance plans for installed equipment, defining cadence, due date, grace window, and overdue escalation."
  },
  {
    "id": 49,
    "catalog_description": "Root-cause records for recurring or related incidents, with known-error workarounds and links to the fix that will resolve them."
  },
  {
    "id": 216,
    "catalog_description": "Client-facing engagements with scope, contract, dates, billing type, revenue-recognition method, and assigned project manager."
  },
  {
    "id": 656,
    "catalog_description": "Orchestration state and task list for activating, changing, or closing a service, showing how a service order is executed."
  },
  {
    "id": 1262,
    "catalog_description": "Release records that bundle one or more changes into a single shippable unit, with the release window, status, and rollback plan."
  },
  {
    "id": 48,
    "catalog_description": "Planned, catalog-driven requests for access, hardware, software, or information, distinct from reactive incidents."
  },
  {
    "id": 53,
    "catalog_description": "Service-level agreements setting response, resolution, and availability targets by priority, category, or customer tier."
  },
  {
    "id": 659,
    "catalog_description": "Subscriber-reported service degradation or outage tickets, with service, severity, timestamps, root cause, and resolution."
  },
  {
    "id": 740,
    "catalog_description": "Customer-facing service jobs fulfilled by field visits, distinct from preventive-maintenance work orders."
  },
  {
    "id": 927,
    "catalog_description": "Per-session attendance roster rows for each learner, serving as evidence of completed required workplace training."
  },
  {
    "id": 1276,
    "catalog_description": "Cancellation or no-show records for an instructor-led session, used to drive waitlist promotion."
  },
  {
    "id": 239,
    "catalog_description": "Video and audit-log artifacts captured from a remote session, with storage location, retention, redaction state, and compliance use."
  },
  {
    "id": 1275,
    "catalog_description": "Pre-session enrollment snapshots for an instructor-led session, used as the basis for attendance proof."
  },
  {
    "id": 343,
    "catalog_description": "Data stores, files, or SaaS instances found in use but missing from the official inventory: unmanaged or rogue copies."
  },
  {
    "id": 65,
    "catalog_description": "SaaS apps found in use but not officially sanctioned, discovered through expense data, sign-on logs, browser, or network signals."
  },
  {
    "id": 772,
    "catalog_description": "Per-shareholder records of holdings across all security classes for an issuer."
  },
  {
    "id": 1146,
    "catalog_description": "Worker requests to swap, give up, or pick up a shift, started on the worker's device and routed for manager approval."
  },
  {
    "id": 601,
    "catalog_description": "Operator-raised shop-floor issues such as defects, safety concerns, equipment anomalies, or material shortages, for the problem-solving team."
  },
  {
    "id": 70,
    "catalog_description": "E-signature envelopes with signing audit trail, IP addresses, provider references, and the signed document, one contract may have many."
  },
  {
    "id": 436,
    "catalog_description": "Connection metadata for downstream data targets: authentication, batch or stream mode, upsert keys, and schema enforcement rules."
  },
  {
    "id": 632,
    "catalog_description": "Special Investigation Unit fraud cases on insurance claims, with indicators triggered, investigator, status, and any law-enforcement referral."
  },
  {
    "id": 855,
    "catalog_description": "Proficiency-rating events against a skill, recording the rater, method (self, manager, peer, or test), score, and date."
  },
  {
    "id": 856,
    "catalog_description": "Peer or manager validations of a claimed skill on a profile: a quick social signal, distinct from a formal assessment."
  },
  {
    "id": 858,
    "catalog_description": "Audit records of automated skill-inference batches, capturing model version, input signals, outputs, and timestamp."
  },
  {
    "id": 172,
    "catalog_description": "Per-worker collections of skills with self-assessed and validated proficiency, derived from courses, certifications, and performance signals."
  },
  {
    "id": 1277,
    "catalog_description": "Learning-path steps, each binding a skill to a target proficiency threshold to reach."
  },
  {
    "id": 852,
    "catalog_description": "Versioned ontologies of skill nodes, with synonyms and parent-child relationships."
  },
  {
    "id": 854,
    "catalog_description": "Individual skill nodes within a taxonomy version, referenced by every profile entry, competency model, and inference run."
  },
  {
    "id": 26,
    "catalog_description": "Comparisons of current skills inventory against future demand by role, level, and location, guiding build, buy, or borrow decisions."
  },
  {
    "id": 1181,
    "catalog_description": "Placements of a specific vessel in a specific slip, mooring, or rack for a period, linking inventory to a reservation or contract."
  },
  {
    "id": 1188,
    "catalog_description": "Seasonal or annual agreements licensing a slip, mooring, or rack to a boater, with term, rate, included utilities, and renewal terms."
  },
  {
    "id": 1182,
    "catalog_description": "Requests to dock or store a vessel for a transient or seasonal period, with dates, vessel, requested space, rate, and check-in status."
  },
  {
    "id": 1180,
    "catalog_description": "Configured size classes for slips and racks, defined by length and beam bands, used for fit rules and rate lookup."
  },
  {
    "id": 1183,
    "catalog_description": "Boaters' places in line for a slip type or period that is currently full, with offer and expiry tracking."
  },
  {
    "id": 987,
    "catalog_description": "System-raised alerts on the SaaS portfolio: shadow-IT signups, projected license overages, opening renewals, or vendor-risk changes."
  },
  {
    "id": 991,
    "catalog_description": "Per-app utilization and cost-per-seat benchmarks against an industry peer set, snapshotted each measurement period with an outlier flag."
  },
  {
    "id": 986,
    "catalog_description": "Published listings of sanctioned SaaS apps that employees can browse and request, with description, owner, request route, and approval flow."
  },
  {
    "id": 985,
    "catalog_description": "Configured connections between the SaaS management platform and an app's APIs for sign-on, provisioning, finance, and usage data."
  },
  {
    "id": 988,
    "catalog_description": "Portfolio-rationalization stages of a SaaS app such as evaluate, pilot, sanctioned, sunset, and retired."
  },
  {
    "id": 984,
    "catalog_description": "Typed owner assignments linking a user to a SaaS app as its business, IT, finance, or security owner."
  },
  {
    "id": 999,
    "catalog_description": "Employee requests for access to a SaaS app via the published catalog, routed for manager and IT approval before provisioning."
  },
  {
    "id": 997,
    "catalog_description": "Declarative automation workflows with a trigger and steps such as provisioning, notifying, offboarding, or requesting approval."
  },
  {
    "id": 63,
    "catalog_description": "User-to-app license seat assignments, showing who holds a seat at which tier, its cost, utilization, and last activity, to drive reclamation."
  },
  {
    "id": 989,
    "catalog_description": "System-generated proposals to right-size or consolidate SaaS spend, with estimated savings, rationale, type, and status."
  },
  {
    "id": 990,
    "catalog_description": "Executed reclamation actions against a license seat (revoke, downgrade, or reassign), with the savings realized."
  },
  {
    "id": 993,
    "catalog_description": "Per-renewal-cycle envelopes covering timeline, owner, vendor proposals received, fallback notes, and decisions taken."
  },
  {
    "id": 992,
    "catalog_description": "Tasks within a SaaS renewal cycle, such as the renewal-window notice, owner assignment, and the renew-or-cancel decision."
  },
  {
    "id": 995,
    "catalog_description": "Chargeback splits of a SaaS subscription across cost centers, business units, or projects, with the allocation method and effective window."
  },
  {
    "id": 994,
    "catalog_description": "Quote, counter-quote, and discount records tied to a renewal, documenting how the final commercial terms were reached."
  },
  {
    "id": 996,
    "catalog_description": "SaaS vendor risk scorecards covering attestation status, data-processing review, subprocessors, breach history, and posture score."
  },
  {
    "id": 998,
    "catalog_description": "Execution logs for each automation workflow run, with trigger source, input, step-by-step status, output, duration, and any error."
  },
  {
    "id": 126,
    "catalog_description": "Brand-owned connected accounts on specific social networks, with credentials, permissions, and channel-specific metadata."
  },
  {
    "id": 1110,
    "catalog_description": "Connected advertiser accounts on social ad platforms, under which campaigns are run and billed."
  },
  {
    "id": 1111,
    "catalog_description": "Paid social campaigns defining an advertising objective, schedule, and overall budget, parenting one or more ad sets."
  },
  {
    "id": 1118,
    "catalog_description": "Versioned ad creatives pairing visuals and copy (image, video, carousel), with approval state and platform-specific renditions."
  },
  {
    "id": 1116,
    "catalog_description": "Time-series delivery and outcome metrics per ad, ad set, or campaign, such as impressions, clicks, spend, conversions, and return on ad spend."
  },
  {
    "id": 1112,
    "catalog_description": "Targeting and budget units within a campaign, binding an audience, placements, bid strategy, schedule, and budget to a set of ads."
  },
  {
    "id": 1113,
    "catalog_description": "Individual deliverable ads within an ad set, pairing a creative with destination and tracking and carrying their own delivery state."
  },
  {
    "id": 129,
    "catalog_description": "Saved monitoring queries defined by keywords, hashtags, competitors, geographies, and sentiment filters that drive social listening."
  },
  {
    "id": 128,
    "catalog_description": "Brand or keyword mentions detected across networks, news, blogs, forums, and review sites, typically from non-followers off-channel."
  },
  {
    "id": 127,
    "catalog_description": "Inbound conversations in the unified inbox: comments, direct messages, mention-replies, and reviews on brand-owned accounts."
  },
  {
    "id": 125,
    "catalog_description": "Authored social posts (draft, scheduled, or published) with per-channel variants, media, copy, lifecycle state, and approval history."
  },
  {
    "id": 682,
    "catalog_description": "Release events deploying a build to a target environment, with deployer, timestamps, status, rollback flag, and change-ticket reference."
  },
  {
    "id": 59,
    "catalog_description": "Discovered installs of a software title on a specific device or for a specific user, the operational fact distinct from the licensing right."
  },
  {
    "id": 58,
    "catalog_description": "License entitlements granting the right to use a software title, with vendor, purchased count, license model, term, and renewal date."
  },
  {
    "id": 57,
    "catalog_description": "Canonical software products in the catalog, with vendor, edition, family, and version range, separate from installations and licenses."
  },
  {
    "id": 435,
    "catalog_description": "Connections to upstream systems, holding authentication method, sync schedule, capture state, and connector type."
  },
  {
    "id": 320,
    "catalog_description": "Raw records pulled from source systems before match and merge, preserving origin and source identifier for lineage."
  },
  {
    "id": 676,
    "catalog_description": "Git repositories hosted on the platform, with name, default branch, visibility, language, owner, and last activity."
  },
  {
    "id": 426,
    "catalog_description": "Routing decisions choosing which warehouse fulfills which order line, with rationale and a confidence score."
  },
  {
    "id": 71,
    "catalog_description": "Competitive bidding processes (RFI, RFQ, RFP, or reverse auction), tracking scope, suppliers, scorecards, responses, and the awarded supplier."
  },
  {
    "id": 593,
    "catalog_description": "Reports on actual office occupancy and usage, covering peak patterns, underutilized zones, and utilization rates to guide space optimization."
  },
  {
    "id": 698,
    "catalog_description": "Stockroom counts and procurement of replacement hardware components not yet deployed as assets."
  },
  {
    "id": 747,
    "catalog_description": "Rules authorizing spend before a purchase, such as card limits, vendor restrictions, and approval matrices."
  },
  {
    "id": 240,
    "catalog_description": "Approval requests raised before a purchase, for a virtual card, raised limit, vendor bill, or reimbursement budget, from draft to spent."
  },
  {
    "id": 783,
    "catalog_description": "Investor commitments to a special purpose vehicle, typically a small investor base with a single capital call at close."
  },
  {
    "id": 782,
    "catalog_description": "Single-deal investment vehicles with a limited investor base, the common structure for smaller deals."
  },
  {
    "id": 364,
    "catalog_description": "Visual plans of building floors and suites showing current occupants, lease expirations, vacant space, and combinability options."
  },
  {
    "id": 188,
    "catalog_description": "Staffing agency and managed-service relationships, with preference tier, performance scorecard, service agreement, and recruiter roster."
  },
  {
    "id": 616,
    "catalog_description": "Sterilization records for reusable surgical instruments, capturing cycle parameters, batch, and quality certification before a procedure."
  },
  {
    "id": 1179,
    "catalog_description": "Land or trailer storage spaces for vessels kept ashore, with location, size, and the assigned vessel."
  },
  {
    "id": 652,
    "catalog_description": "Daily and per-shift store operational checklists for opening, closing, safety, cleanliness, and loss prevention, with sign-off records."
  },
  {
    "id": 649,
    "catalog_description": "In-store compliance and operational audits covering health and safety, merchandising, inventory accuracy, and point of sale."
  },
  {
    "id": 428,
    "catalog_description": "Orders fulfilled by in-store pickup, tracking the assigned store, hold window, and pickup status."
  },
  {
    "id": 647,
    "catalog_description": "Tasks assigned to retail associates, such as shelf stocking, planogram execution, cleaning, reconciliation, and safety checks."
  },
  {
    "id": 1167,
    "catalog_description": "Mappings between a rental listing and an external booking channel, with sync status for rates and availability."
  },
  {
    "id": 1169,
    "catalog_description": "Messages in the unified guest inbox tied to a reservation, inbound or outbound across any channel."
  },
  {
    "id": 1166,
    "catalog_description": "Guest profiles with contact details, identity and verification status, and stay history across reservations."
  },
  {
    "id": 1170,
    "catalog_description": "Cleaning and turnover tasks scheduled against a listing, usually triggered by checkout and assigned to a cleaner or team."
  },
  {
    "id": 1164,
    "catalog_description": "Rental units as marketed to booking channels, with address, amenities, capacity, house rules, photos, and availability."
  },
  {
    "id": 1175,
    "catalog_description": "Records of occupancy and lodging tax collected on a reservation, with filing and remittance to the taxing jurisdiction."
  },
  {
    "id": 1171,
    "catalog_description": "Periodic owner statements showing booking revenue, commissions, pass-through expenses, and the net payout to a property owner."
  },
  {
    "id": 1174,
    "catalog_description": "Local short-term-rental permits for a listing, with permit number, jurisdiction, issue and expiry dates, and status."
  },
  {
    "id": 1172,
    "catalog_description": "Owners whose properties a manager operates, with contact details, management agreement, commission terms, and payout details."
  },
  {
    "id": 1168,
    "catalog_description": "Pricing configurations for a listing, covering base and seasonal rates, dynamic pricing rules, fees, and stay-length limits."
  },
  {
    "id": 1165,
    "catalog_description": "Guest stays booked against a listing, with dates, booking channel, party size, pricing, and payment and check-in status."
  },
  {
    "id": 1173,
    "catalog_description": "Reviews left after a stay, by a guest about a listing or a host about a guest, synced across channels."
  },
  {
    "id": 274,
    "catalog_description": "Multi-quarter programs aligned to corporate strategy, bundling related projects with an executive sponsor and benefits plan."
  },
  {
    "id": 273,
    "catalog_description": "Containers grouping strategic initiatives by business unit, product line, or cost center, with aggregate KPIs and investment rules."
  },
  {
    "id": 810,
    "catalog_description": "Decisions captured during operating reviews and strategy off-sites, such as priority changes, reallocation, and initiative go or no-go."
  },
  {
    "id": 808,
    "catalog_description": "Strategy-map visualizations linking strategic pillars to objectives, initiatives, and measures across financial, customer, process, and learning views."
  },
  {
    "id": 951,
    "catalog_description": "Subject access request tickets under GDPR Article 15, tracking requester, scope, fulfillment status, and regulator deadline."
  },
  {
    "id": 720,
    "catalog_description": "Sublease grants, consents, commencements, and terminations, each with its own financial lifecycle apart from the head lease."
  },
  {
    "id": 631,
    "catalog_description": "Insurer efforts to recover paid losses from a liable third party, with claim reference, demand amount, status, and recovery amount."
  },
  {
    "id": 1021,
    "catalog_description": "Executed legal subscription packages for an investor commitment: the signed agreement, side documents, and version history."
  },
  {
    "id": 176,
    "catalog_description": "Bench plans for critical positions, listing identified successors, readiness ratings, development plans, and risk of loss."
  },
  {
    "id": 498,
    "catalog_description": "Supplier-issued certifications such as food safety, organic, kosher, halal, allergen statements, and insurance coverage, with expiry tracking."
  },
  {
    "id": 327,
    "catalog_description": "Supplier ESG performance profiles, with questionnaire responses, audit results, certifications, and Scope 3 estimates, refreshed annually."
  },
  {
    "id": 316,
    "catalog_description": "Single resolved supplier identities consolidated across all source systems through match, merge, and survivorship."
  },
  {
    "id": 75,
    "catalog_description": "Supplier-issued invoices for delivered goods or services, matched against purchase order and receipt before approval for payment."
  },
  {
    "id": 207,
    "catalog_description": "Onboarding workflows for new suppliers, covering invitation, registration, document collection, and approval chain."
  },
  {
    "id": 208,
    "catalog_description": "Risk and compliance profiles for active suppliers, including sanctions screening, financial health, ESG scoring, and certifications."
  },
  {
    "id": 730,
    "catalog_description": "Risk-scoring records per supplier across operational, financial, and cyber dimensions."
  },
  {
    "id": 209,
    "catalog_description": "Weighted performance ratings of suppliers over a period, scoring on-time delivery, quality, responsiveness, and savings delivered."
  },
  {
    "id": 206,
    "catalog_description": "Vendor master records, holding legal name, tax id, addresses, payment terms, contacts, currency, status, and risk profile."
  },
  {
    "id": 256,
    "catalog_description": "Contact-center interactions (call, chat, video, callback), capturing duration, channel, agent, customer, and resolution status."
  },
  {
    "id": 181,
    "catalog_description": "Survey program definitions for engagement, pulse, lifecycle, and 360 feedback, with audience, question set, frequency, and anonymity floor."
  },
  {
    "id": 182,
    "catalog_description": "Individual employee responses to a survey, aggregated under anonymity thresholds and never exposed individually to managers."
  },
  {
    "id": 586,
    "catalog_description": "Proactive end-to-end tests run against an app from a geographic location, capturing status, latency, SSL validity, and response payload."
  },
  {
    "id": 177,
    "catalog_description": "Calibration sessions where managers normalize performance ratings across groups to reduce bias and meet distribution constraints."
  },
  {
    "id": 871,
    "catalog_description": "Links between candidates and talent pools, carrying added date, source, status in the pool, match score, and last engagement."
  },
  {
    "id": 7,
    "catalog_description": "Curated pools of candidates kept warm for future roles, such as past finalists, alumni, and hard-to-fill skill clusters."
  },
  {
    "id": 872,
    "catalog_description": "Rule-based pool definitions over candidates that automatically populate membership from a saved filter."
  },
  {
    "id": 1221,
    "catalog_description": "Named, approved lists of accounts to pursue in the plan period, handed off to CRM and the ABM platform."
  },
  {
    "id": 142,
    "catalog_description": "Taxing jurisdictions (federal, state, provincial, or local) with their rate tables, deposit schedules, and reporting forms."
  },
  {
    "id": 143,
    "catalog_description": "Periodic statutory submissions to a tax authority, covering payment and reporting, where failure carries penalties."
  },
  {
    "id": 400,
    "catalog_description": "Tax returns managed by a preparer, with tax year, return type, client, status, filing method, and refund or balance due."
  },
  {
    "id": 688,
    "catalog_description": "SEO issues found by crawling, such as robots blocks, missing canonicals, duplicate content, slow pages, and structured-data errors."
  },
  {
    "id": 270,
    "catalog_description": "Evaluations of how well an application's tech stack aligns with enterprise standards and vendor roadmaps, with score, gaps, and remediation."
  },
  {
    "id": 269,
    "catalog_description": "Vendor platforms and tech stacks, with version, end-of-life date, upgrade status, and org-wide instance count."
  },
  {
    "id": 658,
    "catalog_description": "Subscriber bills combining rated usage, subscriptions, and tax lines, with billing-period summary and payment status."
  },
  {
    "id": 653,
    "catalog_description": "Commercial service offerings with technical specifications, rate plans, and SLA terms, serving as the telecom service catalog master."
  },
  {
    "id": 654,
    "catalog_description": "Service provisioning orders to activate, modify, suspend, or deactivate a service, with customer, requested date, status, and fulfillment workflow."
  },
  {
    "id": 655,
    "catalog_description": "Active service instances per subscriber, such as a mobile line, fiber connection, or leased circuit."
  },
  {
    "id": 719,
    "catalog_description": "Commercial-tenant financial health records covering payment history and default risk, used to underwrite leasing decisions."
  },
  {
    "id": 361,
    "catalog_description": "Tenant-submitted maintenance issues tracked from intake through vendor dispatch to resolution, with photos, urgency, and message thread."
  },
  {
    "id": 1224,
    "catalog_description": "Carved sales territories defining the accounts and geography assigned to a rep or team."
  },
  {
    "id": 572,
    "catalog_description": "Reusable test definitions with preconditions, steps, expected results, tags, and traceability to requirements and suites."
  },
  {
    "id": 576,
    "catalog_description": "Defects discovered during testing, with reproduction steps, environment, severity, priority, assigned developer, and status."
  },
  {
    "id": 577,
    "catalog_description": "Configured environments where tests run (OS, browser, device, tenant version, database state), enabling matrix testing."
  },
  {
    "id": 574,
    "catalog_description": "Master planning documents scoping test coverage, timeline, resources, environments, and entry and exit criteria for a release."
  },
  {
    "id": 575,
    "catalog_description": "Single executions of a test case or suite against an environment, with outcome, duration, tester, and failure logs."
  },
  {
    "id": 573,
    "catalog_description": "Groupings of test cases by feature, release, or type, enabling batch execution and organized reporting."
  },
  {
    "id": 162,
    "catalog_description": "Clock-in, clock-out, and break events from a device, app, or manual entry; approved entries feed payroll."
  },
  {
    "id": 165,
    "catalog_description": "Accrual and entitlement rules for a leave type by country, role, and tenure, with caps, carry-over, and conversion rules."
  },
  {
    "id": 1252,
    "catalog_description": "Configured integrations to external delivery tools from which work items and events are mirrored into the value-stream model."
  },
  {
    "id": 355,
    "catalog_description": "Scheduled property showings with lock-box codes, access windows, agent attendance, and follow-up tracking."
  },
  {
    "id": 494,
    "catalog_description": "Lot and batch identifiers under food traceability rules, linking upstream sources to downstream consignees."
  },
  {
    "id": 537,
    "catalog_description": "Labeled document samples used to train or fine-tune extraction models, with document type, sample count, and labeling progress."
  },
  {
    "id": 940,
    "catalog_description": "Inspection-ready training evidence packages, bundling the signed roster, certificate hash, content version, and signature record for regulators."
  },
  {
    "id": 1274,
    "catalog_description": "Reservations of a physical or virtual room and its resources for an instructor-led session."
  },
  {
    "id": 437,
    "catalog_description": "Data transformation jobs holding mappings, functions, validation rules, and masking policies, sometimes delegating to external compute."
  },
  {
    "id": 215,
    "catalog_description": "Imported travel itineraries (air, hotel, ground) with pre-trip approval and post-trip expense reconciliation."
  },
  {
    "id": 1063,
    "catalog_description": "Rules governing what travelers may book, covering fare classes, advance-purchase windows, preferred suppliers, spend caps, and out-of-policy handling."
  },
  {
    "id": 1062,
    "catalog_description": "Per-traveler records holding seat and meal preferences, loyalty memberships, travel documents, and emergency contacts."
  },
  {
    "id": 1064,
    "catalog_description": "Pre-trip authorization requests and their decisions, routed for out-of-policy, over-budget, or high-risk trips, with justification."
  },
  {
    "id": 1059,
    "catalog_description": "Single reservations (flight, hotel, rail, or car) with confirmation, fare or rate, ancillaries, and ticketing status."
  },
  {
    "id": 1058,
    "catalog_description": "Ordered sets of travel segments for a trip, assembled from reservations and kept in sync as segments change or are disrupted."
  },
  {
    "id": 1060,
    "catalog_description": "Returned sets of bookable options for a shopping request, aggregated from multiple content sources and ranked against travel policy."
  },
  {
    "id": 392,
    "catalog_description": "Client trust-account ledgers with per-client and per-matter balances, three-way reconciliation evidence, and retention rules."
  },
  {
    "id": 1061,
    "catalog_description": "Residual value from unused or partly used tickets that can be reapplied to a future booking, tracked through available, reapplied, and expired states."
  },
  {
    "id": 108,
    "catalog_description": "Metered usage inputs (events, consumption units, overage credits) that feed usage-based pricing and billing aggregation."
  },
  {
    "id": 1123,
    "catalog_description": "Computed insider-risk scores per individual, derived from weighted behavioral indicators and updated continuously as new activity arrives."
  },
  {
    "id": 748,
    "catalog_description": "Platform users referenced as assignees, authors, approvers, and creators across records."
  },
  {
    "id": 664,
    "catalog_description": "Utility-owned network infrastructure such as substations, transformers, poles, lines, and pipelines, with type, location, capacity, age, and operational status."
  },
  {
    "id": 667,
    "catalog_description": "Customer utility invoices aggregating meter reads, regulatory adjustments, and payment terms into a billable statement."
  },
  {
    "id": 660,
    "catalog_description": "Customer-premise accounts in a utility service territory, covering contract, billing profile, meter assignment, and connection status across residential, commercial, and industrial scopes."
  },
  {
    "id": 350,
    "catalog_description": "Electricity, water, gas, and waste consumption recorded per period for billing and emissions reporting."
  },
  {
    "id": 661,
    "catalog_description": "Physical meter devices at customer premises (electric, gas, water), with device type, manufacturer, install date, accuracy class, and commissioning state."
  },
  {
    "id": 666,
    "catalog_description": "Work requests to connect, disconnect, move, or modify service at a premise, with requested date, work type, and fulfillment status."
  },
  {
    "id": 775,
    "catalog_description": "IRS 409A fair-market-value reports for an issuer, covering methodology, per-class fair value, and valuation date, superseded by later reports."
  },
  {
    "id": 1214,
    "catalog_description": "Structured value propositions mapping a capability to a persona outcome and competitive differentiation."
  },
  {
    "id": 683,
    "catalog_description": "Delivery performance metrics per repository or product, such as lead time, deployment frequency, mean time to recover, and change failure rate, computed over a window."
  },
  {
    "id": 249,
    "catalog_description": "End-to-end flows from customer demand to realized value, with lead time, process time, value-add ratio, and waste categorization."
  },
  {
    "id": 492,
    "catalog_description": "Site-specific application maps authored from yield zones and soil tests, then dispatched to field machinery."
  },
  {
    "id": 41,
    "catalog_description": "Actual-versus-plan reconciliations by account and period, capturing planned amount, actual amount, variance, and root-cause commentary."
  },
  {
    "id": 750,
    "catalog_description": "Investment opportunities moving through the deal pipeline, from sourcing and diligence to term sheet and closed or declined."
  },
  {
    "id": 374,
    "catalog_description": "Driver vehicle inspection reports, pre-trip or post-trip, listing defects, photos, and the driver signature, with defects routing to maintenance."
  },
  {
    "id": 702,
    "catalog_description": "Parts stocked in garages and service bays for immediate vehicle repair use."
  },
  {
    "id": 375,
    "catalog_description": "GPS-segmented trip records with start and end times, route trace, distance, duration, idle time, jurisdictions, and driver."
  },
  {
    "id": 379,
    "catalog_description": "Maintenance and repair work orders for fleet vehicles, with task lines for labor and parts, assigned mechanic and shop, and a status lifecycle."
  },
  {
    "id": 746,
    "catalog_description": "Pre-payment approvals for vendor-direct payments, distinct from employee-initiated spend requests."
  },
  {
    "id": 1186,
    "catalog_description": "Certificates of insurance on file for a vessel, with insurer, policy number, liability limits, and expiry, as required by slip and storage contracts."
  },
  {
    "id": 1187,
    "catalog_description": "Verified vessel registration records, with registration number, jurisdiction, and expiry."
  },
  {
    "id": 1185,
    "catalog_description": "Boats on file at the marina, with name, type, dimensions, hull identification, and owning boater."
  },
  {
    "id": 774,
    "catalog_description": "Vesting cadences for equity grants, covering cliff, vesting frequency, total months, and acceleration logic."
  },
  {
    "id": 398,
    "catalog_description": "Structured lab results for animal patients, with tests, values, reference ranges, ordering vet, and reporting lab."
  },
  {
    "id": 397,
    "catalog_description": "Vaccination records for animal patients, with vaccine type, lot, administered date, expiry, and next-due date for reminders."
  },
  {
    "id": 1266,
    "catalog_description": "Chatbot and virtual-agent conversation transcripts, capturing the turn-by-turn exchange, resolved intent, any escalation to a human, and the ticket produced."
  },
  {
    "id": 929,
    "catalog_description": "Links to external video meetings for a virtual session, carrying the join URL and recording reference."
  },
  {
    "id": 675,
    "catalog_description": "Timestamped audit trail of visitor state transitions such as registration, check-in, badging, and check-out, for compliance."
  },
  {
    "id": 670,
    "catalog_description": "Physical or digital badges issued at check-in, encoding visitor identity, host assignment, access scope, and expiration."
  },
  {
    "id": 669,
    "catalog_description": "Visitor arrival events at facility entry, with credential verification and a badge-issuance trigger."
  },
  {
    "id": 672,
    "catalog_description": "Real-time rosters of visitors on-site, correlated with spaces and emergency zones for evacuation and accountability."
  },
  {
    "id": 673,
    "catalog_description": "Signed or electronically acknowledged non-disclosure agreements captured per visit as a legal-hold artifact."
  },
  {
    "id": 668,
    "catalog_description": "Pre-visit registrations stating arrival intent, expected access duration, host assignment, and pre-screening, initiating the visitor lifecycle."
  },
  {
    "id": 674,
    "catalog_description": "Screening results checking visitors against external watchlists such as sanctions, banned-visitor, and threat databases, held for compliance."
  },
  {
    "id": 903,
    "catalog_description": "Voluntary candidate disclosures of protected-class membership per EEOC and OFCCP requirements, recording the offer or decline-to-answer decision and audit metadata."
  },
  {
    "id": 1028,
    "catalog_description": "Specific weaknesses detected on specific assets, deduplicated across scans and tracked from open to closed, with severity, computed risk, and ownership."
  },
  {
    "id": 1033,
    "catalog_description": "Scoped, point-in-time assessments or remediation campaigns over an asset population, grouping vulnerabilities into a posture snapshot with scope, window, and summary."
  },
  {
    "id": 1030,
    "catalog_description": "Reference catalog of known vulnerabilities (identifiers, advisories, affected products, base severity, references) that scan findings are matched against and enriched from."
  },
  {
    "id": 1032,
    "catalog_description": "Governed, time-boxed risk acceptances, deferrals, or false-positive designations for vulnerabilities not remediated now, with justification, scope, and an expiry that drives re-review."
  },
  {
    "id": 1031,
    "catalog_description": "Remediation work that resolves vulnerabilities, with owning team, due date, SLA, patch or configuration guidance, and verification status."
  },
  {
    "id": 1029,
    "catalog_description": "Scan jobs run against an asset population using a policy or template, progressing through queued, running, and completed, and emitting findings."
  },
  {
    "id": 928,
    "catalog_description": "Capacity overflow queue for a course offering, with priority order and a notify-on-seat-open policy."
  },
  {
    "id": 1267,
    "catalog_description": "Walk-up or onsite check-in records, capturing the visitor, reason, queue position, estimated service time, and outcome."
  },
  {
    "id": 762,
    "catalog_description": "Per-distribution waterfall computations, covering hurdle test, catchup, general-partner carry, and limited-partner returns under the fund's distribution agreement."
  },
  {
    "id": 685,
    "catalog_description": "Per-page tracking records across web properties, with URL, status, last-modified, owner, publish date, review cadence, and lifecycle stage."
  },
  {
    "id": 1242,
    "catalog_description": "Personalized web experiences or landing pages served to named accounts."
  },
  {
    "id": 441,
    "catalog_description": "URL-routable pages composed from content components for a served digital channel."
  },
  {
    "id": 1241,
    "catalog_description": "Rules mapping a resolved account or segment to a personalized web experience or variant."
  },
  {
    "id": 1243,
    "catalog_description": "Person- or account-level de-anonymizations of web visitors, PII-bearing and consent-gated."
  },
  {
    "id": 472,
    "catalog_description": "Event subscriptions defining the source system, event type, target recipe, retry policy, and filter logic."
  },
  {
    "id": 21,
    "catalog_description": "Email, video, push, or SMS messages sent to a new hire during onboarding, with channel, template, scheduled send time, delivery state, and engagement metrics."
  },
  {
    "id": 517,
    "catalog_description": "B2B orders from chef, restaurant, co-op, or food-hub buyers, with per-line pricing tiers, packing-list reference, and net-30 invoicing."
  },
  {
    "id": 1206,
    "catalog_description": "Structured interviews with won or lost buyers capturing decision drivers, interviewee identity, and quotes."
  },
  {
    "id": 607,
    "catalog_description": "Banking fund-transfer instructions, with originating and destination accounts, amount, currency, beneficiary, purpose code, compliance flags, and execution status."
  },
  {
    "id": 971,
    "catalog_description": "Ordered or parallel sets of approval steps that gate a work item or project transition."
  },
  {
    "id": 970,
    "catalog_description": "Single approval gates on a work item or project, performed by a designated approver, with states pending, approved, rejected, or expired."
  },
  {
    "id": 246,
    "catalog_description": "Trigger-action rules defined per board or project, with triggers like status change or assignment driving multi-step conditional actions."
  },
  {
    "id": 974,
    "catalog_description": "Per-work-item values for a custom field, one value per item and field."
  },
  {
    "id": 973,
    "catalog_description": "User-defined fields attached to a project or workspace, typed as text, number, date, select, and more, applying to all items in scope."
  },
  {
    "id": 1289,
    "catalog_description": "Saved, shareable cross-project dashboards composed of widgets that summarize work progress, workload, and goal status."
  },
  {
    "id": 968,
    "catalog_description": "Typed dependencies between two work items, linking predecessor and successor with finish-to-start, start-to-start, finish-to-finish, or start-to-finish type."
  },
  {
    "id": 1035,
    "catalog_description": "Right-to-work evidence for a worker such as a visa or work permit, effective-dated with a tracked expiry, jurisdiction-conditional and access-restricted."
  },
  {
    "id": 983,
    "catalog_description": "Submitted instances of an intake form, carrying field values, submitter, and timestamp, and converting to a work item via routing rules."
  },
  {
    "id": 982,
    "catalog_description": "Structured intake form definitions, with field schema, validation, target project, and routing rules."
  },
  {
    "id": 1293,
    "catalog_description": "Contribution links between a work item or project and an objective, so goal progress can roll up from the work that drives it."
  },
  {
    "id": 596,
    "catalog_description": "Operator-facing step sequences for building or assembling a product variant, with resource requirements, quality checkpoints, safety notes, and attached media."
  },
  {
    "id": 981,
    "catalog_description": "Files or external links attached to a work item."
  },
  {
    "id": 980,
    "catalog_description": "Threaded comments on a work item, which may include personal or sensitive content."
  },
  {
    "id": 979,
    "catalog_description": "Assignments linking work items to tags, where existence asserts the tag is applied."
  },
  {
    "id": 243,
    "catalog_description": "Atomic tasks, items, or cards in a work-management tool, with owner, due date, status, priority, dependencies, subtasks, attachments, and comments."
  },
  {
    "id": 969,
    "catalog_description": "Zero-duration gates within a project marking a meaningful transition, distinguished from regular items by passed or missed semantics."
  },
  {
    "id": 295,
    "catalog_description": "Audit fieldwork documentation, recording test procedures executed, evidence gathered, conclusions, and sign-off, keyed to audit programs and control tests."
  },
  {
    "id": 1292,
    "catalog_description": "Team-level groupings of related projects for cross-project status roll-up."
  },
  {
    "id": 976,
    "catalog_description": "Reusable project blueprints with seeded sections, items, custom fields, and automations."
  },
  {
    "id": 244,
    "catalog_description": "Containers of work items (project, board, sheet, or space), with timeline, status, owner, members, dashboards, and embedded views."
  },
  {
    "id": 160,
    "catalog_description": "Published shift schedules for a department, location, and week, derived from labor-demand forecasts and worker-availability constraints."
  },
  {
    "id": 975,
    "catalog_description": "Containers within a project that group work items for board and list views."
  },
  {
    "id": 161,
    "catalog_description": "Scheduled work blocks assigned to a worker, with start, end, position, location, break plan, and premium pay flags."
  },
  {
    "id": 1295,
    "catalog_description": "Logged status-change events on a work item or project, capturing the prior status, new status, who changed it, and when."
  },
  {
    "id": 1294,
    "catalog_description": "Configurable status values in a project or team status taxonomy, with category (not started, in progress, done) and display order."
  },
  {
    "id": 978,
    "catalog_description": "Free-form labels attached to work items for cross-cutting categorization such as priority, theme, or status."
  },
  {
    "id": 977,
    "catalog_description": "Reusable work-item blueprints with seeded assignee role, due-date offset, subtasks, and custom field defaults."
  },
  {
    "id": 1291,
    "catalog_description": "Non-billable time logged against a work item for effort tracking and capacity reporting."
  },
  {
    "id": 972,
    "catalog_description": "Per-user, per-period sums of allocated effort across work items, compared against a capacity ceiling."
  },
  {
    "id": 1290,
    "catalog_description": "Saved, named, shareable board, list, timeline, or calendar views of work items, with persisted filters, grouping, and sort."
  },
  {
    "id": 1037,
    "catalog_description": "Home, work, and mailing addresses for a worker, effective-dated and typed by purpose, supporting multi-jurisdiction formats."
  },
  {
    "id": 1039,
    "catalog_description": "Self-service requests by an employee or manager to change worker data, routed through approval before committing to the worker record."
  },
  {
    "id": 30,
    "catalog_description": "Fully-loaded workforce cost forecasts per period by org unit, role, location, and level, built from headcount, compensation bands, and loading factors."
  },
  {
    "id": 23,
    "catalog_description": "Multi-year strategic workforce plans covering target headcount, skills, location, and cost, with planning horizon, base assumptions, and approval state."
  },
  {
    "id": 27,
    "catalog_description": "What-if models layered on a base workforce plan, each with a type, perturbation parameters, and the modeled outcome on headcount, skills, and cost."
  },
  {
    "id": 44,
    "catalog_description": "Named workforce cohort definitions used for analysis and intervention, such as high-potential, flight-risk, top-performer, and early-career."
  },
  {
    "id": 594,
    "catalog_description": "Employee survey feedback on office experience, covering comfort, amenities, and satisfaction, informing workplace strategy."
  },
  {
    "id": 592,
    "catalog_description": "Employee requests for workspace changes such as desk relocation, accommodation needs, or floor reassignment, routed to facilities."
  },
  {
    "id": 911,
    "catalog_description": "Experience-API event log entries capturing actor-verb-object learning activity inside or outside the learning system."
  }
];
;

async function sem(method: string, path: string, payload?: any): Promise<any> {
  const p = Bun.spawn(["semantius","call","crud","postgrestRequest"], { stdin:"pipe", stdout:"pipe", stderr:"pipe" });
  p.stdin.write(JSON.stringify(payload === undefined ? { method, path } : { method, path, body: payload }));
  p.stdin.end();
  const [out, err] = await Promise.all([ new Response(p.stdout).text(), new Response(p.stderr).text() ]);
  const code = await p.exited;
  if (code !== 0) throw new Error(`${method} ${path}: ${(err||out).trim().slice(0,200)}`);
  return out.trim() ? JSON.parse(out) : null;
}

async function emptyIds(ids: number[]): Promise<Set<number>> {
  const empty = new Set<number>();
  for (let i=0;i<ids.length;i+=100){
    const chunk = ids.slice(i,i+100);
    const rows = await sem("GET", `/data_objects?id=in.(${chunk.join(",")})&select=id,catalog_description`);
    for (const r of rows) if (!r.catalog_description || !String(r.catalog_description).trim()) empty.add(r.id);
  }
  return empty;
}

async function pool<T>(items: T[], n: number, fn: (t:T)=>Promise<void>): Promise<string[]> {
  let idx=0, done=0; const errors:string[]=[];
  const worker = async () => { while(idx<items.length){ const i=idx++; try{ await fn(items[i]); }catch(e){ errors.push(String(e)); } if(++done%150===0) console.log(`  ${done}/${items.length}`); } };
  await Promise.all(Array.from({length:n},()=>worker()));
  return errors;
}

async function main(){
  console.log(`Backfill data_objects.catalog_description - ${DATA.length} authored values`);
  if (DATA.some(d=>d.catalog_description.includes("—"))) throw new Error("em-dash in payload, aborting");
  const empty = await emptyIds(DATA.map(d=>d.id));
  const todo = DATA.filter(d=>empty.has(d.id) && d.catalog_description.trim());
  console.log(`currently empty: ${empty.size} | will write: ${todo.length} | skip (already filled): ${DATA.length-todo.length}`);
  const errors = await pool(todo, 16, async (d)=>{ await sem("PATCH", `/data_objects?id=eq.${d.id}`, { catalog_description: d.catalog_description }); });
  console.log(`
Done. patched=${todo.length-errors.length} errors=${errors.length}`);
  if (errors.length){ for (const e of errors.slice(0,10)) console.log("  ERR "+e); process.exit(1); }
}
main().catch(e=>{ console.error(e); process.exit(1); });
