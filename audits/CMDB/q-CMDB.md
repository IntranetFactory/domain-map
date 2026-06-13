# Configuration Management Database (CMDB): questions waiting for you

## What this domain is
Keep an authoritative record of every server, app, database, and the wiring between them, so changes and incidents can be reasoned about in minutes, not days.

CMDB holds your configuration items (the CIs) and the relationships between them, organized across three areas: the core CI register, service maps that project CIs up into business services, and baselines that catch unauthorized drift. Discovery feeds, change management, and incident triage all read from and write back to this record.

---

q1: (answer this first) The CI class taxonomy (`ci_classes`) is now treated as reference data with no workflow, so it is exempt from needing a lifecycle. Accept that exemption as-is, or author a minimal `defined / active / deprecated` lifecycle anyway for surface uniformity?

- a) Accept the exemption as-is (it is class taxonomy authored once and edited rarely).
- b) Author the minimal `defined / active / deprecated` lifecycle anyway.

Recommended: a. The class taxonomy is authored once and edited rarely, and being reference data already records the exemption. This decision unblocks authoring the lifecycle states for the other three masters (CI relationships, service maps, CI baselines), so it gates the rest of that work.

a1:

---

q2: Should a configuration item be locked against unscoped edits once it is registered, so the canonical record is protected after reconciliation rules have run? (yes/no)

Recommended: yes. The "registered" step is already a permissioned gate, so locking the record afterward matches that intent. This flips an existing flag (overwrites a current value), so it needs your sign-off.

a2:

---

q3: When the Discovery domain is broken into modules, who should own service maps?

- a) Keep CMDB as the owner (current).
- b) Move ownership to Discovery, with CMDB consuming the maps.
- c) Split it: CMDB owns the business-service projection, Discovery owns the raw topology.

Recommended: a for now. Discovery is not yet modularized, so there is no module to move ownership to; revisit once Discovery ships modules (this is the same call as the Discovery modularization item in the optional section). Moving the master is never applied automatically.

a3:

---

q4: The link from enterprise applications to configuration items exists twice, once as "mapped to" and once as "onboards into". How should that be handled?

- a) Keep both rows (they encode genuinely different edges).
- b) Collapse to the "mapped to" row only (mapping is the persistent edge; onboarding is a one-time transition already captured by a trigger event).
- c) Drop the "onboards into" row only.

Recommended: b. The mapping is the lasting relationship, and the onboarding moment is already captured as an event, so the second row is redundant. Collapsing or dropping a row is destructive, so it needs your sign-off.

a4:

---

q5: The three CMDB roles are named with a `CMDB-` infix (for example `IT-INFRA-CMDB-ADMIN`). How should they be named?

- a) Keep the current names (CMDB-specific personas, easier to find in the UI).
- b) Rename to drop the `CMDB-` infix (cleaner function scoping, for example `IT-INFRA-CONFIG-ADMIN`).
- c) Demote them to per-module permissions and delete the cross-module roles.

Recommended: b. Dropping the infix matches the required `<FUNCTION-CODE>-<ROLE-NAME>` format. Renaming or deleting existing role rows is destructive, so it needs your sign-off; please also confirm these are the current role grain before changing them.

a5:

---

q6: An unauthorized-change-detected event currently notifies only IT service management. Who else should it reach?

- a) Add both governance/risk/compliance (for SOX evidence) and security operations (as a possible compromise signal).
- b) Governance/risk/compliance only.
- c) Security operations only.
- d) Keep IT service management only.

Recommended: a, if security operations is set up to receive infrastructure-anomaly signals (not just sign-in anomalies). This decision unblocks adding those extra subscribers.

a6:

---

q7: How wide should the neighbor-by-neighbor reconciliation pass be right now?

- a) Run it inline for IT service management only (the one neighbor with a concrete gap).
- b) Run it for all three weighted neighbors (IT service management, Discovery, application portfolio), flagging the ones blocked on the neighbor's own modularization.
- c) Defer all of it to follow-up runs once those neighbors are modularized.

Recommended: a. IT service management is the only neighbor with a real gap today; Discovery and application portfolio gaps all trace back to those domains not being modularized yet.

a7:

---

q8: Three of the process tags on CMDB handoffs were auto-matched by keyword and are wrong (for example, an application-onboarding handoff tagged as security review). Approve deleting those three and replacing them with the correct process tags? (yes/no)

Recommended: yes. The replacements were re-verified against the live process catalog and are clearly more accurate. This deletes and overwrites existing rows, so it is destructive and needs your sign-off.

a8:

---

q9: Two configuration items on the core module are marked as required contributions but are actually owned by other domains (hardware assets, owned by asset management, and service changes, owned by IT service management), which breaks self-containment. Approve relaxing both to optional (or embedding a local shell)? (yes/no)

Recommended: yes, relax both to optional. Each is really a read of another domain's record, not something CMDB owns, so they should not be marked required here. This rewrites existing rows, so it is destructive and needs your sign-off.

a9:

---

q12: IT Service Management forwards ci baseline to Configuration Management Database to implement and enforce change control procedures, but Configuration Management Database does not yet have anyone assigned to implement and enforce change control procedures, so this step has no owner. How should it be handled?
- a) Record it now as work Configuration Management Database owns, and assign a named owner once Configuration Management Database sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Configuration Management Database decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a12:

---

q13: IT Service Management forwards ci baseline to Configuration Management Database to triage IT service delivery incidents, but Configuration Management Database does not yet have anyone assigned to triage IT service delivery incidents, so this step has no owner. How should it be handled?
- a) Record it now as work Configuration Management Database owns, and assign a named owner once Configuration Management Database sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Configuration Management Database decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a13:

---

q14: Discovery and Service Mapping forwards configuration item to Configuration Management Database to manage infrastructure configuration, but Configuration Management Database does not yet have anyone assigned to manage infrastructure configuration, so this step has no owner. How should it be handled?
- a) Record it now as work Configuration Management Database owns, and assign a named owner once Configuration Management Database sets up who does this work.
- b) Leave it off the list for now.

Recommended: a. Recording it now means that the moment Configuration Management Database decides who does this work, this step already has a named owner instead of being rediscovered later as a gap.

a14:

---

q15: CMDB spans three modules but currently has no personas or responsibility (RACI) layer, so there is nobody named as accountable for the CI lifecycle, data quality, service maps, or baselines. (This is the umbrella version of the three owner questions above.) Should I author the CMDB persona / RACI layer now?

- a) Author it now (proposed personas: a configuration manager across all three modules, a configuration data steward for attestation and data quality, a service-map owner, and a baseline analyst).
- b) Defer to the standing per-domain persona sweep.

Recommended: a, but please answer q5 (role naming) first, since it sets the naming convention these personas would use. Authoring personas is additive; it lands as new records you review in the UI.

a15:

---

## Optional (will not hold up the build)

q10: Several entities show up across the flagship CMDB and discovery vendors that are not yet modeled here (curated CI views, service health indicators, change blackout windows, software install records, CI health scores, CI decommission requests, CI certification evidence, and the FedRAMP CM-2 / CM-8 configuration-management controls). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the open decisions above are settled. Several are common across the vendor set, though each still wants a verification pass first.

a10:

---

q11: Three adjacent market areas could become their own domains (cloud asset inventory, configuration compliance, and CMDB federation / reconciliation fabric). Should I research whether any of these warrant a new domain versus folding back into CMDB as a capability? (yes/no)

Recommended: yes, as research only. Each overlaps CMDB or its neighbors, so the value is in deciding whether they are distinct domains; this does not block the CMDB build.

a11:

---

<!-- agent map, ignore: q1=B2-1 q2=B2-2 q3=B2-3 q4=B2-4 q5=B2-5 q6=B2-6 q7=B2-7 q8=B2-DESTRUCTIVE-H1 q9=B2-DESTRUCTIVE-M9 q10=B3-E1,B3-E2,B3-E3,B3-E4,B3-E5,B3-E6,B3-E7,B3-E8 q11=B3-D1,B3-D2,B3-D3 q12=B2-B9D-OWN-1190 q13=B2-B9D-OWN-1299 q14=B2-B9D-OWN-1309 q15=B1A-PHASE-P | domain_id=4 -->
