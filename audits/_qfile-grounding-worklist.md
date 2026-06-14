# q-file grounding backfill worklist

Classification of every market-shape q-question the grounding lint flagged
(`bun run scripts/analytics/qfile_grounding_lint.ts --all`), tagged by the work
each needs. Produced 2026-06-14 by a read-only pass: per question, read the
q-file for full context and `audits/<CODE>/history.md` for the vendor surface.

This is a TRIAGE artifact, not an instruction to rewrite. Per SKILL.md Rule #22
no q-file recommendation is rewritten without verifying the grounding actually
supports the recommended option (fresh evidence wins if it contradicts).

## Tags

- **not-a-gap**: the flagged question is NOT a market-shape decision (event/handoff
  attribution, naming/canonical-bare-word, notes revert, pattern flags, RACI/role
  wording, regulation tagging, self-containment, buyer-voice copy). A build-convenience
  rationale is legitimate; no vendor grounding required. These are lint false positives:
  the gate over-flags because the MARKET_SHAPE keyword filter is broad.
- **copy**: genuine market-shape question; `history.md` already maps named-vendor
  grounding to THIS decision. Rewrite is locate + condense + verify.
- **synthesize**: genuine market-shape question; `history.md` names flagship vendors and
  their specialties but does NOT map them to this decision. Rewrite needs reasoning over
  the existing material; no fresh web research.
- **research**: genuine market-shape question; `history.md` has no usable vendor surface
  for this axis. Needs a fresh Phase 0 pass.

## Summary

| Tag | Count (approx) | Action |
|---|---|---|
| not-a-gap | ~155 | none; tighten the lint to drop these classes |
| copy | ~40 | locate grounding in history, condense into the Recommended line, verify |
| synthesize | ~30 | reason over the named vendor surface to map it to the decision |
| research | 9 | run a focused Phase 0 vendor-surface pass |

Coverage note: the lint flagged 250 questions (15 FAIL / 235 WARN) across 112 domains.
This worklist captures the classification from an 8-way parallel pass. Subagent
self-counts drifted by a few rows; treat the per-tag totals as approximate and the
per-row tables below as the working list. A canonical re-run (subagents writing
structured output) would reconcile the exact 250. The actionable set (copy + synthesize
+ research, below) is the part that matters and is listed in full.

## Status (2026-06-14)

- **not-a-gap (~155): handled by tightening the lint.** `qfile_grounding_lint.ts` now
  excludes the non-market-shape question classes (event/handoff attribution, naming,
  notes/copy, pattern flags, RACI/role, regulation tagging, lifecycle/entity_type,
  self-containment, process-tag, additive-entity research). Flagged total dropped from
  250 to ~102. The exclusion reads the question STEM only (option bodies and the
  Recommended line legitimately use these words while still being market-shape). Some
  not-a-gap still leak as WARN; that is acceptable for a gate that errs toward recall.
- **copy (40): DONE.** 38 questions grounded in place (q-file `Recommended:` reason now
  leads with named-vendor evidence from history; option letters unchanged; surgical
  one-line edits across 34 q-files). 2 turned out NOT-FOUND and were reclassified to the
  synthesize set: **DAM q1** and **DSPM q1** (history's vendor evidence argues for MORE
  modules than the recommended keep-fewer option, so they are real decisions, not copies).
- **synthesize (~32): pending a dedicated session.** Prompt + item list:
  [_qfile-grounding-synthesize-prompt.md](_qfile-grounding-synthesize-prompt.md) (the ~30
  original synthesize plus DAM q1 and DSPM q1).
- **research (9): pending a dedicated session.** Prompt + item list:
  [_qfile-grounding-research-prompt.md](_qfile-grounding-research-prompt.md).

---

## RESEARCH (9): needs a fresh Phase 0 pass

| domain | q | note |
|---|---|---|
| CAFM | q6 | Lease/utility ownership; recommendation itself asks for a vendor pass |
| COLLAB-GOV | q8 | Candidate masters; where-mastered tensions deferred to Phase 0 |
| ESIGN | q7 | RON (remote online notarization) promote-to-own-market; no RON vendor surface in history |
| FARMER-DIRECT-SALES | q8 | Compliance-module add; driven by regulatory anchors, no vendor surface |
| NCDB | q5 | Capability scope; no vendor surface for this axis |
| MSP-PSA | q15 | CONTRACTS-overload split; explicitly flagged as a Phase 0 question in history |
| PROD-MGMT | q7 | Where roadmap_items is mastered; no vendor surface on the SPM-mastering axis |
| PS-LIC | q7 | Additive entities plus a parcel/GIS new-domain axis with no grounding |
| UTIL-OPS | q7 | DERMS / utility-GIS as new domains; vendor basis does not speak to these axes |

---

## SYNTHESIZE (~30): vendors named in history, not yet mapped to the decision

| domain | q | history pointer | note |
|---|---|---|---|
| COLLAB-GOV | q4 | Vendor-surface basis; B2-5 default 4-module split | Governance vendors named, not mapped to the split |
| DATA-AI-PLAT | q6 | Pass-2 vendor list (MLflow, W&B, DataRobot, Domino, H2O.ai) | MLOps-domain/RAG split; MLOps vendors named, not mapped to boundary |
| EAM | q1 | Vendor-surface basis (Maximo/Hexagon/IFS); 2-vs-3 module note | Flagship CMMS vendors named, not tied to the module-count axis |
| ESIGN | q1 | Market-audit vendor list (DocuSign/Adobe Sign/PandaDoc) | One-vs-two module; point-solution single-product shape needs reasoning |
| EXPENSE | q1 | Vendor-surface basis (Concur, Brex, Ramp); CORP-CARD-PROGRAM candidate | Cards-ownership/promote; vendors not mapped to the split axis |
| FIN | q1 | Modularization candidates; MISSING table (S/4HANA, Oracle Fusion, NetSuite, Workday) | Module-count; vendors named for entities, not the AR/AP split |
| FLEET-MGMT | q3 | Vendor-surface basis (Samsara, Geotab, Motive, Fleetio); DVIR/PMI note | Inspection mastership boundary; vendors not mapped to the split |
| FSM | q4 | MISSING cluster table (Salesforce FS, ServiceTitan, ServiceMax); FSM-MOBILE-TECH note | Mobile-module split; vendors named for entities, not the split |
| HAM | q13 | ITAD candidate queued; ITAD vendors named (Iron Mountain, Sims, ServiceNow ITAD) | Promote ITAD to its own domain; vendors per-entity, not the promotion |
| HC-PATIENT | q1 | B3-M1 4-module entry; Vendor-surface basis (Epic, Cerner, Athenahealth, Innovaccer) | 2-vs-4 module split; vendors named generally, not the split |
| HC-PATIENT | q13 | B3-M2 HC-PATIENT-PORTAL starter; "All EHR portals, Salesforce Health Cloud" | Add a starter module; vendors named, not mapped |
| KGP | q2 | Vendor-surface basis (Stardog/GraphDB/Neo4j/Palantir); M7 duplication para | Where KG entities mastered; vendor surface not mapped to the dedup |
| MDM | q1 | Vendor-surface basis; B2-S2 split | Vendors named, split rationale is capability-count, not mapped |
| MDM | q5 | B2-S4 capability-scope; identity_graphs vs golden_records overlap | MDM-vs-CDP scope discussed structurally, no vendor mapping |
| MSP-PSA | q3 | Vendor-surface basis; first-class-entity pattern table | Flagships named; dispatch-schedule entity not explicitly mapped |
| NPMD | q3 | network_devices entity row; vendor surface | Flagships named; master-vs-CMDB axis not mapped to decision |
| OBS | q10 | Modularization hypothesis / carve-out; vendor surface | Carve-out candidates not mapped to pure-play vendors |
| OMS | q1 | B2-S4 module/capability count; modularization candidates | Split rationale capability-count + workflow masters, not vendor-mapped |
| OMS | q2 | inventory_locations mastery / broken-pointer note | Location mastery argued structurally, no vendor mapping |
| PORT-MONIT | q1 | Vendor-surface basis (GP/VC/LP-analytics cohorts; Cobalt LP) | LP-analytics cohort named, not mapped to LP-domain split |
| PROC-MIN | q2 | Vendor-surface basis (Celonis/Signavio/UiPath) | Named; not mapped to task-mining domain-vs-submodule |
| PS-LIC | q1 | B3-10 (no formal Phase 0); vendor reasoning list | Accela/OpenGov/Tyler/ServiceNow named, not mapped to 4-module split |
| REAL-EST | q12 | Vendor-surface basis (TRIRIGA/Eptura); B3-S7 row | Visitor-mgmt scope; vendor visitor-capability mapping still pending |
| SECOPS | q2 | Vendor surface (SIEM/EDR/XDR cohorts); B2-2 | Detection-vertical vendors named, not mapped to flat-vs-children |
| SECOPS | q3 | Bucket-3 table (Splunk SOAR, XSOAR, CrowdStrike) | Vendors master entities; boundary rests on catalog state |
| SKILLS-MGMT | q1 | Vendor-surface basis (Lightcast/TechWolf/SkyHive); B3-1 | Flagships per-entity, not mapped to third-module split |
| SPEND-MGMT | q1 | EXPENSE pairwise; spend/expense_policies sync | Boundary grounded in catalog state, vendors not mapped here |
| SUB-MGMT | q1 | Vendor-surface (Stripe/Zuora/Chargebee; Metronome/Orb/Lago) | Flagships named, not mapped to two-vs-split module decision |
| SUB-MGMT | q15 | Metering pure-play cohort (Metronome/Orb/Lago) | Named specialists speak to standalone axis, unmapped to spin-out |
| SUP-LIFE | q1 | Vendor-surface (HICX/Ariba SLP/Coupa SIM/Ivalua); entity-to-module table | Vendors mapped to entities, four-module-count not explicitly grounded |

---

## COPY (~40): grounding already mapped in history, condense + verify

| domain | q | history pointer | note |
|---|---|---|---|
| ACCT-PLAN | q1 | Vendor-surface basis (5 pure-play specialists) | Vendor surface mapped to master-bearing build decision |
| ACCT-PLAN | q2 | Modularization hypothesis (Altify/Revegy relationship; DemandFarm white-space) | Vendor cohorts mapped to 6-module split |
| AP-AUTO | q1 | Vendor-surface basis; option-b matches Tipalti/AvidXchange/Stampli | Vendors mapped to 3-module capture/match/pay split |
| APM | q8 | MISSING/MODULARIZATION table (LeanIX/ServiceNow/MEGA/Ardoq/Apptio); APM-TECH-RISK | Vendor set mapped to tech-split + new risk module |
| APP-PAAS | q1 | Per-decision verdicts (q1 CONFIRMED); RUNTIME-vs-DELIVERY surface | Vendors mapped to 2-module split |
| BEN-ADMIN | q13 | B3 entity table; BEN-SPENDING-ACCOUNTS note (Alegeus/WEX/HealthEquity) | Vendor cluster mapped to spending-accounts module candidate |
| BPA | q9 | EA candidates (LeanIX/Ardoq/Alfabet/BiZZdesign/MEGA) | Vendor cohort mapped to EA promotion |
| BPA | q10 | IBPMS candidates (Camunda/Pega/IBM/Appian/Bonita) | Vendors mapped to iBPMS promotion |
| CAFM | q1 | Vendor-surface basis (Archibus/Nuvolo/FMX) | SMB vendor surface supports keep-distinct |
| CAP-TABLE | q14 | B3-CAND table + MODULARIZATION candidates (Carta/Pulley/Shareworks) | Vendors mapped to convertibles/tax/ESPP/compliance modules |
| CCAAS | q8 | Candidate-domain CONV-INTEL (Gong/Chorus/ExecVision) | Vendors mapped to own-domain split |
| CDP | q5 | B2-S6 + REVERSE-ETL candidate (Hightouch/Census/RudderStack) | Vendors mapped to reverse-ETL split |
| CDP | q17 | _missing-domains REVERSE-ETL entry | Domain-tier restatement of q5; vendors mapped |
| CLIN-DEV | q1 | Per-decision verdicts (q1 REVERSED); surface (AIMS/EQ2/Nuvolo/Censis/STERIS) | Vendors mapped to CMMS-core + sterile-processing split |
| CSM | q1 | Vendor-surface basis; reversal row (Zendesk/Salesforce/Freshdesk/Intercom Knowledge) | Knowledge-master ownership; 4/5 flagships mapped |
| DAM | q1 | Modularization hypothesis (2/3/4-module split, per-module vendor evidence) | Module split with vendor evidence mapped per option |
| DQ | q1 | Vendor-surface basis (legacy vs observability cohort); module-split section | 3-way split mapped to legacy-DQ vs observability cohort |
| DSPM | q1 | MISSING-entity table + split hypothesis (Cyera/Securiti/BigID) | Keep-3 vs re-split with vendor evidence on the split axis |
| FINOPS | q3 | Bucket-3 cloud_cost_records "Universal (Cloudability, CloudHealth, Vantage)"; FOCUS | Cloud-cost mastery; vendors+FOCUS mapped to ownership |
| GRC | q1 | history modularization-by-vendor-packaging (IRM/Archer/MetricStream/OneTrust/Riskonnect) | Module split with vendor cohorts mapped to this decision |
| IDP | q1 | history "(b) Hyperscience and Rossum separate model studio from operator workspace" | Named vendors mapped to the 3-module option |
| INS-CLAIMS | q2 | Vendor-surface basis (Guidewire/Duck Creek/Sapiens); WRONG-OWNERSHIP para | Policy mastery; Policy Admin platform mapped to the call |
| INTRANET | q6 | B3-8 advocacy specialists; EMP-ADVOCACY promotion note | Advocacy specialists mapped to the promotion |
| IPAAS | q1 | Vendor-surface basis; module-mapping (Boomi/MuleSoft/Workato to RECIPE-DESIGN/RUNTIME) | Vendor cohorts mapped to the two-module shape |
| KUBE-PLAT | q1 | Vendor surface (OpenShift/Rancher/Tanzu); Modularization table | Vendor cohorts mapped to DISTRIBUTION-OPS/WORKLOAD-OPS |
| LSD | q1 | Vendor-surface basis; 5-module mapping | 5-module split mapped to named in-house legal vendors |
| OBS | q1 | B2-S1 split mapped to Datadog/Dynatrace/New Relic | 3-module split mapped to named flagship cohort |
| PA | q13 | Talent Intelligence separate-domain candidate; _missing-domains entry | Eightfold/Phenom/Beamery/SeekOut mapped to promote-as-domain |
| PAYROLL | q7 | MISSING candidates; PAYROLL-GLOBAL module note | CloudPay/Papaya/ADP GlobalView/Deel/Remote mapped to global-payroll module |
| PIM | q9 | MARKETPLACE-OPS missing-domain line | ChannelEngine/Rithum/Mirakl/Productsup/Feedonomics mapped to new-domain candidate |
| PLM | q6 | B3-1 modularization candidate (portfolio surface) | Teamcenter/Windchill/ENOVIA/Aras mapped to PLM-PORTFOLIO module |
| PSA | q11 | MODULARIZATION candidates (ENGAGEMENT-QUOTING / PROFITABILITY-ANALYTICS) | Certinia/Kantata/Deltek mapped to both proposed splits |
| REMOTE-ACCESS | q1 | Vendor-surface basis; Modularization hypothesis | TeamViewer/AnyDesk to single-master, BeyondTrust to split |
| RMM | q10 | Modularization candidates (RMM-COMPLIANCE, RMM-REPORTING) | Vendor evidence mapped to both proposed modules |
| RPA | q1 | B2-S1 (UiPath separates Assets; Automation Anywhere keeps in Control Room) | Vendor divergence mapped to credential-module split |
| TEST-MGMT | q1 | Market surface basis; B2-1 (Xray vs TestRail authoring/execution) | Authoring-tier vs execution-tier surface mapped to split |
| TPRM | q1 | Vendor-surface basis; Bucket2 #1 | Flagship pure-plays expose due-diligence vs ongoing-monitoring split |
| UEM | q1 | B1-S1; B1-M rows (Intune/Jamf/WS1/Kandji/Hexnode config entities) | Module split tied to config entities mapped across flagships |
| UTIL-OPS | q1 | Vendor-surface basis (Oracle CC&B/NMS/WAM/Opower; Schneider ADMS) | Vendor suite modules mapped to four-module umbrella vs promote |
| WEB-CONTOPS | q10 | Vendor-surface basis (GatherContent, Optimizely CMP); CMP promotion | CMP-promotion vendors mapped to the editorial split |

---

## NOT-A-GAP (~155): lint false positives, no vendor grounding required

These flagged questions are not market-shape decisions. They are correctly grounded
in catalog rules / structural reasoning; a build-convenience rationale is fine. They
are listed so the set is not silently dropped, and to motivate tightening the lint.

ACCT-PLAN q3 q7; ACCT-PRACT-MGMT q4 q7 q10; AP-AUTO q7 q9; B2C-COMM q4; BEN-ADMIN q2 q9;
CAFM q4; CAP-TABLE q2 q12 q13; CDP q2; CLIN-DEV q2; CPQ q8 q11 q12; DAIRY-MGMT q1 q2 q5 q6;
DAM q14; DATA-AI-PLAT q7; DCG q2 q4; DLP q1; EAM q2 q9 q10; EM-FUND-PLATFORM q2;
EMP-EXP q1 q2 q16; ESG q3 q10; ESIGN q6; EXPENSE q4; FARMER-DIRECT-SALES q1 q4 q9;
FLEET-MAINT q5 q6 q11; FLEET-MGMT q8; FOOD-TRACE q3 q4 q9; FSM q1 q5; FSQM q4; FUND-ADMIN q2;
GRC q6 q9 q11; HC-PATIENT q6; IDP q8; IGA q1; INS-CLAIMS q11; INV-MGMT q7 q10 q12; IPAAS q7;
ITAM q1 q3 q6 q8; ITOM q7; IWMS q7 q8; KGP q3 q4 q5 q8; KMS q8; KUBE-PLAT q2 q4 q6;
LCAP q1 q7; LEGAL-PRACT-MGMT q4; LIB-MGMT q2; LMS q3 q4; LOYALTY q1 q2; LSD q6 q7 q10 q11;
MA q2; MDM q3 q7 q8; METRICS-LAYER q1 q6 q7; MFG-OPS q3 q4; MSP-PSA q2 q4 q16; NCDB q6;
NPMD q4; OBS q8; OMS q5 q12 q14; ONBOARDING q1; OP-RES q5; PA q4 q10; PAYROLL q8 q12;
PRIV-MGMT q4; PROD-MGMT q8; PSA q1 q3 q4; RE-CRE q1; RE-INVEST q6; RE-PROP-MGMT q1 q6;
REAL-EST q7 q13; RET-STORE q2; RMM q2; RPA q6; S2P q4; SALES-ENG q7; SAM q8 q10; SWP q5 q7;
TELCO-BSS q2 q9; TELEMATICS q5; TLNT-INTEL q3; TPRM q3 q10; UEM q2 q5; UTIL-OPS q4;
VET-PRACT-MGMT q2 q7 q9; VIS-MGMT q2 q4 q7; VMS q1 q8 q9; WEB-CONTOPS q9; WFM q2;
WORK-MGMT q1 q5 q6; WSC q1 q2

---

## Follow-on: tighten the lint

~2/3 of flagged questions are not-a-gap. The lint's MARKET_SHAPE keyword filter is too
broad (e.g. it treats any question mentioning "master", "scope", or "domain" as
market-shape). Tightening it to exclude the recurring non-market-shape classes seen
above (event/handoff attribution, canonical-naming, notes-revert, pattern flags,
RACI/role authoring, regulation tagging, self-containment, buyer-voice copy) would cut
the false-positive rate roughly in half and make the gate trustworthy as a hard CI check.
