# CLIN-DEV Phase 0: Vendor Surface (2026-06-08)

> SCOPE CORRECTION (load-bearing). The remediation brief framed CLIN-DEV as
> "Clinical Development" (drug/trial development: EDC, CTMS, eTMF, RTSM/IRT, with
> Medidata Rave, Veeva Vault Clinical, Oracle Clinical One, IQVIA, Calyx, Suvoda).
> The live domain `CLIN-DEV` (domain_id=50, name "Clinical Device Management") models
> something else entirely: hospital **clinical engineering / healthcare technology
> management (HTM)**, the CMMS market for medical equipment. Its seven live masters
> are medical_devices, device_maintenance_logs, device_recalls,
> clinical_engineering_work_orders, device_calibration_records, device_incident_reports,
> sterilization_cycles. None of the clinical-trial entities (studies, subjects, sites,
> case report forms, protocols, eTMF documents) exist here. Phase 0 therefore studies
> the **actual** market (hospital HTM/CMMS + medical-device safety/recall), not
> clinical development. FDA Part 11 / electronic-signature compliance still applies:
> medical-device management IS a regulated GxP-adjacent market (recall response, AEM
> documentation, calibration audit trails). The clinical-development market the brief
> described is a distinct, unbuilt domain candidate (see Modularization note).

## Flagship vendors

| Vendor | URL | Specialist in | Why included |
| --- | --- | --- | --- |
| Nuvolo Connected Workplace for Healthcare | nuvolo.com | ServiceNow-native healthcare CMMS / HTM + OT security | Market-leading modern HTM CMMS; bundles medical-device management, OT/IoMT security, and FM on one platform |
| AIMS 3 (Phoenix Data Systems) | goaims.com | Pure-play healthcare CMMS (HTM / biomed) | Long-standing pure-play; cleanest model of equipment + model + work-order + PM + recall (hazard alerts) + TJC compliance |
| EQ2 HEMS | eq2llc.com | Pure-play hospital equipment management (HTM / biomed) | Models calibration + electrical safety + recalls (ECRI integration) + AEM/DNV/TJC compliance + capital lifecycle |
| ServiceNow Clinical Device Management | servicenow.com (HCLS) | Suite vendor (incumbent, ITAM-derived CDM) | Mainline-suite view of medical-device inventory, planned maintenance, recall tracking, device risk scoring, adverse-event reporting |
| Asimily / Cynerio (+ Ordr, Claroty Medigate) | asimily.com / cynerio.com | IoMT device security (compliance/risk specialist) | Compliance/security specialist: device discovery, risk-based vulnerability prioritization tied to FDA recalls, ICS-CERT advisories; the "regulated-market specialist" axis |
| Censis CensiTrac / STERIS SPM | censis.com / steris.com | Sterile processing (SPD) instrument tracking | Defines the sterile-processing product boundary: trays, loads, biological indicators, OR case-cart prioritization, AAMI-conforming records |

## Surface matrix

Vendors: N=Nuvolo, A=AIMS, E=EQ2 HEMS, S=ServiceNow CDM, Sec=Asimily/Cynerio, SPD=Censis/STERIS.

| Entity | Category | N | A | E | S | Sec | SPD | Classification | Proposed module |
| --- | --- | :-: | :-: | :-: | :-: | :-: | :-: | --- | --- |
| medical_devices | Master | x | x | x | x | x | . | Core | CLIN-DEV-CMMS |
| device_models | Master | x | x | x | x | x | . | Core | CLIN-DEV-CMMS |
| device_locations | Master | x | x | x | x | x | . | Core | CLIN-DEV-CMMS |
| clinical_engineering_work_orders | Master/workflow | x | x | x | x | . | . | Core | CLIN-DEV-CMMS |
| device_maintenance_logs | Record | x | x | x | x | . | . | Core | CLIN-DEV-CMMS |
| preventive_maintenance_schedules | Config/workflow | x | x | x | x | . | . | Core | CLIN-DEV-CMMS |
| device_calibration_records | Master/workflow | . | x | x | x | . | . | Common | CLIN-DEV-CMMS |
| electrical_safety_tests | Record | . | x | x | . | . | . | Common | CLIN-DEV-CMMS |
| device_recalls (hazard alerts) | Master/workflow | x | x | x | x | x | . | Core | CLIN-DEV-CMMS |
| device_incident_reports (adverse events) | Master/workflow | . | . | x | x | . | . | Common | CLIN-DEV-CMMS |
| device_service_contracts | Master | x | x | x | x | . | . | Core | CLIN-DEV-CMMS |
| device_parts_inventory | Master | x | x | x | . | . | . | Common | CLIN-DEV-CMMS |
| device_risk_assessments | Computed/record | x | . | . | x | x | . | Common | CLIN-DEV-CMMS |
| capital_replacement_plans | Record | . | x | x | . | . | . | Common | CLIN-DEV-CMMS |
| device_vulnerabilities (IoMT) | Master/record | x | . | . | . | x | . | Common (security) | sibling IOMT-SEC domain |
| network_segmentation_policies | Config | x | . | . | . | x | . | Specialist (security) | sibling IOMT-SEC domain |
| sterilization_cycles (loads) | Master/workflow | . | . | x* | . | . | x | Common | CLIN-DEV-STERILE-PROC |
| instrument_trays | Master | . | . | . | . | . | x | Specialist (SPD) | CLIN-DEV-STERILE-PROC |
| biological_indicator_results | Record/workflow | . | . | . | . | . | x | Specialist (SPD) | CLIN-DEV-STERILE-PROC |
| or_case_carts | Master | . | . | . | . | . | x | Specialist (SPD) | CLIN-DEV-STERILE-PROC |

\* EQ2 HEMS handles sterilizers as equipment under PM/test tracking; it does not model SPD tray/load workflow the way Censis/STERIS do.

## Compliance entities (non-optional for this regulated market)

| Entity | Regulation | Proposed module |
| --- | --- | --- |
| fda_part11_audit_trails | FDA 21 CFR Part 11 (electronic records integrity on calibration / recall / incident evidence) | CLIN-DEV-CMMS |
| electronic_signature_records | FDA 21 CFR Part 11 (signed PM completion, recall closure, incident filing) | CLIN-DEV-CMMS |
| device_recalls | FDA 21 CFR 806 (corrections & removals) / EU MDR vigilance / ECRI hazard alerts | CLIN-DEV-CMMS |
| device_incident_reports | FDA MDR (eMDR) / EU MDR vigilance | CLIN-DEV-CMMS |
| aem_program_records (Alternative Equipment Maintenance) | CMS / The Joint Commission / DNV | CLIN-DEV-CMMS |

Note: 510(k) Premarket Notification and QSR 21 CFR 820 (manufacturer design controls / CAPA) on the live regulation list are **manufacturer-side**, not hospital-HTM. They are a manufacturer-QMS market (Greenlight Guru, MasterControl, Veeva Vault QMS) and a queued MED-DEVICE-QMS sibling candidate, not part of the hospital clinical-engineering surface.

## Workflow substrate

- **PM auto-generation:** receive equipment -> inventory/commission -> auto-generate planned-maintenance work orders on a schedule (manufacturer / risk-based / metered hours). Universal across N, A, E, S.
- **Recall / hazard-alert loop:** alert ingested (ECRI/FDA/manufacturer) -> match impacted devices by model -> isolate -> remediate -> close with effectiveness evidence. Bundled inside the CMMS by every flagship (AIMS Hazard Alerts, EQ2 HEMS Alerts & Recall, Nuvolo, ServiceNow CDM).
- **Calibration / electrical safety:** scheduled -> performed against a calibrated tester -> pass/fail -> filed (Part 11 audit trail). AIMS + EQ2 model tester calibration as a first-class concern (DNV test-device certification).
- **Adverse-event / incident:** device incident -> internal report -> regulator filing (eMDR) -> investigation -> resolution; immutable once filed.
- **Sterile processing (separate product surface):** decontamination -> assembly (tray build) -> sterilization load -> biological-indicator verification -> release -> OR case-cart picking. Censis/STERIS only.

## Marketed product surfaces (grounds the module-split call)

| Marketed surface | What it bundles | Vendors that sell it as one product |
| --- | --- | --- |
| Healthcare CMMS / HTM | inventory + models + work orders + PM + calibration + electrical safety + recalls/hazard alerts + incident/adverse-event + service contracts + parts + capital + compliance (AEM/TJC/DNV) | Nuvolo, AIMS, EQ2 HEMS, ServiceNow CDM |
| Sterile Processing (SPD) tracking | instrument trays + sterilization loads + biological indicators + OR case carts | Censis CensiTrac, STERIS SPM |
| IoMT / medical-device security | device discovery + vulnerabilities + risk scoring + network segmentation | Asimily, Cynerio, Ordr, Claroty Medigate (Gartner "Medical Device Security Solutions" market) |

Recall and safety-vigilance are **not** a separately-marketed surface: every CMMS flagship bundles recall/hazard-alert and AEM compliance into the core product alongside inventory and PM. This is the key evidence for the module-split reversal below.

## Modularization hypothesis

Two full modules, both following how flagship vendors actually package the product:

1. **CLIN-DEV-CMMS** (the core, master: medical_devices + device_recalls + work orders + calibration + incidents): inventory, models, locations, PM/work orders, calibration, electrical safety, recall/hazard-alert response, adverse-event/incident reporting, service contracts, parts, capital planning, and the Part 11 / AEM compliance evidence. Nuvolo / AIMS / EQ2 / ServiceNow CDM all ship this as one bundled product, including recall management.

2. **CLIN-DEV-STERILE-PROC** (master: sterilization_cycles): the sterile-processing workflow surface (trays, loads, biological indicators, OR case carts). A genuinely distinct marketed product (Censis, STERIS) with a different buyer (SPD manager) and a different workflow (decon -> assembly -> sterilize -> BI verify -> release). This is the real product boundary, replacing the prior "Safety & Vigilance" split.

Promote-to-sibling (NOT CLIN-DEV modules): **IOMT-SEC** (medical-device security, a Gartner-recognized distinct market, Asimily/Cynerio/Ordr) and **MED-DEVICE-QMS** (manufacturer design-control / CAPA / eMDR, Greenlight Guru/MasterControl/Veeva). Both already queued in the audit backlog.
