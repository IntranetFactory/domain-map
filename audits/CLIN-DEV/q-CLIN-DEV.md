# Clinical Device Management (CLIN-DEV): questions waiting for you

## What this domain is
Keep every medical device safe, maintained, and ready for patient care.

Run one trustworthy register of the medical equipment in clinical use, from infusion pumps and ventilators to monitors and imaging systems. Schedule and prove preventive maintenance, manage calibration, and validate sterilization so equipment stays accurate and safe at the bedside. When a recall or adverse event hits, isolate affected units fast, drive the response to closure, and produce the evidence accreditors and regulators expect. Clinical engineering teams cut downtime, stay inspection-ready, and protect patients without drowning in paperwork.

> Grounding: these recommendations are backed by a fresh vendor-surface study (6 flagship vendors, 2025-2026 product docs) saved at `.tmp_deploy/CLIN-DEV-phase0-2026-06-08.md`. One framing correction drives everything: CLIN-DEV is **Clinical Device Management** (hospital clinical engineering / healthcare technology management, the CMMS market for medical equipment), NOT clinical-trial development (EDC/CTMS/eTMF). Its live masters (medical_devices, sterilization_cycles, device_recalls, calibration, work orders) confirm the hospital-HTM scope. The flagship vendors studied are Nuvolo Connected Workplace for Healthcare, AIMS 3 (Phoenix Data Systems), EQ2 HEMS, ServiceNow Clinical Device Management, the sterile-processing specialists Censis CensiTrac and STERIS SPM, and the IoMT-security specialists Asimily and Cynerio.

---

q1: (answer this first) How should Clinical Device Management be split into modules (the sub-areas of the product)?

- a) Two modules following vendor product packaging: a CMMS core (medical devices, models, locations, work orders, preventive maintenance, calibration, electrical safety, recall and hazard-alert response, adverse-event/incident reporting, service contracts, parts, capital planning, compliance evidence) plus Sterile Processing (sterilization cycles, instrument trays, biological-indicator results, OR case carts).
- b) One module covering all seven current masters together.
- c) Two modules with a different cut: Inventory (devices, maintenance, calibration, sterilization, work orders) plus Safety and Vigilance (device recalls, device incident reports).

Recommended: a. Every flagship CMMS bundles recall and hazard-alert response INTO the core product alongside inventory and PM (AIMS ships "Hazard Alerts" inside the CMMS; EQ2 HEMS ships an "Alerts & Recall" module integrated with ECRI; Nuvolo and ServiceNow CDM both track recalls within device management), so "Safety and Vigilance" is not a separately-marketed surface and the prior Inventory + Safety-Vigilance cut (now option c) is REVERSED. The genuine product boundary the market draws is sterile processing: only Censis CensiTrac and STERIS SPM model it, sold to a different buyer (the Sterile Processing Department manager) with their own workflow (decontamination, tray assembly, sterilization load, biological-indicator verification, release, OR case-cart picking), while the CMMS flagships treat sterilizers merely as equipment under PM. Option (a) puts the module line exactly where the vendor market puts it. This choice drives every module, capability, lifecycle owner, and handoff attribution below it, so it unlocks the rest of the build.

a1:

---

q2: The domain's internal business-logic note contains a forbidden em-dash. How should it be fixed?

- a) Replace the em-dash with a comma (the note then reads "...for medical devices, mostly declarative rules over inventory.").
- b) Leave it for now and fold it into a catalog-wide em-dash sweep later.
- c) You supply the exact replacement wording.

Recommended: a. The wording predates the em-dash ban and a comma reads naturally. This overwrites a non-empty field, so it needs your sign-off.

a2:

---

q3: The domain's owning business function is currently set to Research and Development, which reads like a medical-device-manufacturer assumption rather than a hospital one. How should ownership be set?

- a) Repoint to IT Operations (where hospital Clinical Engineering / HTM usually reports).
- b) Repoint to Business Operations or Facilities and Real Estate.
- c) Add Governance, Risk and Compliance as an additional owner for the recall and adverse-event surface.
- d) Leave Research and Development and re-scope this catalog entry to medical-device manufacturers.

Recommended: a. The vendor surface settles this: every flagship sells to hospital clinical engineering / HTM teams, not to R&D. Nuvolo, AIMS, and EQ2 all describe their buyer as the HTM / biomed department, and ServiceNow positions Clinical Device Management as a specialized subset of IT Asset Management (the platform's ITAM lineage is why CE-under-IT is the most common hospital reporting line). Research and Development reads like a carryover from a medical-device-manufacturer mental model, which is a different market (see q8). Re-pointing the existing owner row is destructive, so it needs your call; pick (d) only if you intend this entry to cover manufacturers instead.

a3:

---

q4: Should device incident reports be treated as carrying personal data, because adverse-event reports include a patient identifier? (yes/no)

Recommended: yes. Adverse-event reports name the patient involved in a device-related event (this is what FDA MDR and EU MDR vigilance filings require), so privacy and retention rules apply. ServiceNow CDM and EQ2 both model adverse-event reporting against device and patient context. This overwrites a current flag, so it needs your confirmation.

a4:

---

q5: Should device incident reports be frozen once filed with a regulator, so a filed report cannot be quietly edited? (yes/no)

Recommended: yes. An adverse-event report submitted to a regulator (eMDR) must be an immutable record of what was filed; later changes are corrections, not edits. This matches the Part 11 electronic-records-integrity posture every flagship in this regulated market maintains. This overwrites a current flag, so it needs your confirmation.

a5:

---

q6: Should device calibration records be frozen once filed, to preserve audit-trail integrity (21 CFR Part 11)? (yes/no)

Recommended: yes. Calibration evidence is exactly what inspectors expect to be tamper-evident: AIMS and EQ2 both tie calibration to certified test equipment and DNV / TJC audit readiness, and FDA Part 11 (on the live regulation list) governs the electronic-records integrity of that evidence. This overwrites a current flag, so it needs your confirmation.

a6:

---

q7: Should a device recall require a single named recall coordinator to approve its issuance? (yes/no)

Recommended: yes. Issuing a recall or hazard-alert response is a high-stakes action that warrants one accountable approver. The flagship recall/hazard-alert modules (AIMS Hazard Alerts, EQ2 HEMS Alerts & Recall, ServiceNow CDM recall tracking) drive a managed find-impacted-devices-then-isolate-then-close workflow that a coordinator owns. This overwrites a current flag, so it needs your confirmation.

a7:

---

q8: The regulatory list mixes hospital-side rules with manufacturer-only ones (for example FDA 510(k) Premarket Notification and the Quality System Regulation 21 CFR 820), while the underlying objects all look hospital-side. How should the scope be handled?

- a) Treat this as hospital-side and remove the manufacturer-only regulations (510(k) and QSR 21 CFR 820).
- b) Keep all seven regulations and clarify the scope in the catalog description.
- c) Wait for a separate Medical Device QMS domain to be promoted, then re-scope.

Recommended: a, if this entry targets hospital clinical engineering. The vendor surface is unambiguous: 510(k) premarket clearance and QSR design-controls/CAPA are manufacturer obligations, served by a different market (Greenlight Guru, MasterControl, Veeva Vault QMS) that no hospital-HTM flagship touches. Nuvolo, AIMS, EQ2, and ServiceNow CDM are all built around the hospital-side regulatory surface instead: recall/hazard-alert response (FDA 21 CFR 806, EU MDR vigilance, ECRI), AEM compliance (CMS / The Joint Commission / DNV), and Part 11 records integrity. Removing the two manufacturer-only regulations is destructive, so it needs your sign-off; pick (b) only if you want this entry to also cover manufacturer post-market surveillance, and (c) if you would rather wait for the queued MED-DEVICE-QMS sibling domain to land first.

a8:

---

q9: Two work-order and calibration handoffs into ITSM carry an "incident" payload, but the related links point at "service request" instead. Which is correct?

- a) Re-target the two handoffs to service requests (treat clinical-engineering work as a service-desk request).
- b) Re-target the two relationship rows to service incidents (treat the work as an incident).
- c) Split them: the work-order handoff goes to service requests, the overdue-calibration handoff goes to service incidents (the time-critical one).

Recommended: a. In the flagship CMMS pattern, a clinical-engineering work order originates as a maintenance request that the HTM team picks up and schedules (AIMS EasyNet and Nuvolo both model hospital staff raising a work request, not paging an incident), so the service-request shape is the right match for routine work flowing into ITSM. Either fix overwrites existing rows, so it needs your call; pick (c) only if your facility treats an overdue calibration as a paged, time-critical incident.

a9:

---

q10: Which process tag should the device-recall handoff to GRC carry? Two candidates were proposed, so this is your pick.

- a) Manage product recalls and regulatory audits (the broader Level 2 process).
- b) Initiate recall (the more specific Level 3 process).
- c) Tag both.
- d) Defer to a later discovery pass.

Recommended: b. The handoff fires on a recall-issued event, which is precisely the "initiate recall" activity; the broader Level 2 process also covers monitoring and effectiveness, which other handoffs cover. Choose (a) if you prefer the broader bucket. This is a tag-only choice; it does not block the build.

a10:

---

q13: A work-order handoff into ITSM is tagged with a broad "perform asset maintenance" process, while its sibling calibration handoff uses the more specific "perform preventative asset maintenance". Should the work-order handoff be re-pointed to match the more specific one?

- a) Re-point the work-order handoff to "perform preventative asset maintenance" so both ITSM-bound handoffs use the same precise activity.
- b) Leave it on the broader "perform asset maintenance" (an opened work order is often corrective rather than preventative, so the coarser bucket may be intended).

Recommended: weigh the trigger. The calibration handoff fires when a calibration is due, which is genuinely preventative. The work-order handoff fires when a work order is opened, which is frequently corrective (a device broke), so the broader parent may be the correct, deliberate grain. Pick (a) only if your clinical-engineering work orders are predominantly scheduled preventive maintenance. This re-point overwrites an existing tag, so it needs your sign-off; it is a tag-only choice and does not block the build.

a13:

---

## Optional (will not hold up the build)

q11: The vendor study confirmed several deeper objects the current model collapses or omits, all bundled into the flagship CMMS core: a device model master (the recallable model versus the individual unit, modeled by AIMS, Nuvolo, EQ2, and ServiceNow CDM, and by the IoMT-security vendors Asimily/Cynerio for recall matching), a device location master (room/OR/department, for PM dispatch and recall isolation, modeled by all four CMMS flagships), and a device service-contract master (warranty and response-SLA, the dominant Clinical Engineering budget concern, modeled by all four). Recall-effectiveness tracking (units accounted for, time-to-isolation) is a thinner add, present in Nuvolo's analytics. Should I research and add the ones that hold up, into the CMMS core module? (yes/no)

Recommended: yes for device models, device locations, and device service contracts (now confirmed Core by 3+ flagships, not speculative); recall-effectiveness is a lower-priority add. All are additive and can happen after the modules exist.

a11:

---

q12: The vendor study surfaced two adjacent markets the current footprint blurs into CLIN-DEV that flagship vendors sell as separate products. Should they be stood up as their own sibling domains rather than CLIN-DEV modules? (yes/no)

- IoMT / medical-device security (device discovery, vulnerability prioritization tied to FDA recalls and ICS-CERT, network segmentation), sold by Asimily, Cynerio, Ordr, and Claroty Medigate, and recognized by Gartner as its own "Medical Device Security Solutions" market.
- Medical Device QMS (manufacturer design controls, CAPA, eMDR, per 21 CFR 820.30), sold by Greenlight Guru, MasterControl, and Veeva Vault QMS, the home for the manufacturer-only regulations in q8.

Recommended: yes, promote both as sibling domains (both are already queued in the audit backlog). They integrate WITH clinical device management but are distinct products with distinct buyers (the hospital security/CISO team for IoMT-SEC, the manufacturer quality team for MED-DEVICE-QMS), so neither belongs as a CLIN-DEV module. Additive; does not block the build.

a12:

---

<!-- agent map, ignore: q1=B2-S2 q2=B2-S1 q3=B2-S3 q4=B2-S4.incidentpii q5=B2-S4.incidentlock q6=B2-S4.caliblock q7=B2-S4.recallapprover q8=B2-S5 q9=B2-S6 q10=B2-S11b q13=B2-S6b q11=B3-DEVICE-MODELS+B3-DEVICE-LOCATIONS+B3-DEVICE-SERVICE-CONTRACTS+B3-RECALL-EFFECTIVENESS q12=B3-IOMT-SEC+B3-MED-DEVICE-QMS | domain_id=50 | phase0=.tmp_deploy/CLIN-DEV-phase0-2026-06-08.md | reversed: B2-S2 "Inventory+Safety-Vigilance"->"CMMS-core+Sterile-Processing" (recall bundled into CMMS by all flagships; sterile processing is the real product boundary) | b9d ran 2026-06-13: ORPHAN pid1556->ITSM(B2-B9D-OWN-1556), RE-TAG 353->1556 on h893 (q13/B2-S6b), UNOWNED pid199 = unbuilt-CLIN-DEV artifact (h895 device_incident_reports, self-resolves on build) -->
