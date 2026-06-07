# Identity Governance and Administration (IGA): questions waiting for you

## What this domain is
Govern who has access to what across your systems, and prove it. IGA runs the full life of an entitlement: people request access, approvers grant or deny it, automated connectors provision and deprovision accounts in target systems, periodic certification campaigns re-attest that access is still warranted, and separation-of-duties rules catch toxic permission combinations before they become a risk. It is the control layer that ties joiner, mover, and leaver events to the access people actually hold.

---

q1: (answer this first) Are the IGA modules meant to be installed and run on their own, or are they always deployed together as one set?

- a) Standalone: each module can run independently, so the 8 shared-master rows become embedded copies (PROMOTE consumer to embedded_master, accepting a runtime demotion when modules co-deploy).
- b) Always together: the modules always co-install, so the 8 shared-master rows are removed (DELETE them) and the 4 master rows stay authoritative for the whole domain.

Recommended: a. The audit favors PROMOTE: it preserves the story that a customer could deploy auto-provisioning against an external identity store without the access-request module. This is a destructive change (rewrite or delete existing rows), so it needs your sign-off, and it unblocks the 7 intra-domain handoffs that depend on the answer.

a1:

---

q2: The entitlement-catalog master carries a notes line restating its config-shape lifecycle ("draft, published, deprecated, retired, no per-record approval"). The audit believes a loader wrote this, not you. Should that notes line be cleared? (yes/no)

Recommended: yes. The wording duplicates what the structure already says and matches the auto-write pattern the project no longer allows; the config-shape exemption is recorded in the audit history instead. Clearing a non-empty value is destructive, so it needs your confirmation. Say no if you approved that wording at load time.

a2:

---

q3: 14 handoff rows carry boilerplate notes (mostly "target NULL until IGA is modularized" and one dated remediation note). IGA is now modularized and the columns are populated, so the notes are stale. Should they be cleared? (yes/no)

Recommended: yes. The notes restate nothing and match the rescinded auto-write pattern; git history keeps the same record. Clearing a non-empty value is destructive, so it needs your confirmation. Say no if any of these were wording you approved.

a3:

---

q4: 20 module-to-data-object rows (ids 789-808) carry notes that just restate the role, necessity, and target module already encoded in the row. Should they be cleared? (yes/no)

Recommended: yes. This restating pattern is explicitly disallowed, and the audit believes the cluster-drafts loader wrote it. Clearing a non-empty value is destructive, so it needs your confirmation. Say no if any were approved at load time.

a4:

---

q5: Should an access-certification campaign be frozen once it starts (locked on the scheduled-to-in-progress transition), so a running campaign cannot be quietly re-scoped? (yes/no)

Recommended: yes. A campaign in flight is audit evidence and should not change mid-run. This flips a current workflow flag, so it is your call.

a5:

---

q6: Should a granted user entitlement be frozen once it is granted, so any change goes through a new grant rather than editing the live one? (yes/no)

Recommended: yes. A live grant is the record of what access someone holds, so changes should be auditable as new grants. This flips a current workflow flag, so it is your call.

a6:

---

q7: Should a user-entitlement grant be treated as single-approver (one accountable approver per grant)? (yes/no)

Recommended: yes. Separation-of-duties-aware grants are typically single-approver in flagship IGA workflows. This flips a current workflow flag, so it is your call.

a7:

---

q8: Does your platform's permission hierarchy make a module's :admin permission automatically include that module's workflow gates, or do roles have to list those gates explicitly?

- a) :admin auto-includes the gates, so the explicit gate grants on the lower-tier roles are redundant and can be dropped.
- b) :admin does NOT auto-include them, so the admin role must list the 14 workflow gates explicitly.
- c) Leave as is: lower-tier roles enumerate their gates, the admin role relies on the hierarchy.

Recommended: c. Without confirming how the hierarchy is seeded, leaving the current split (explicit at the lower tier, implicit at admin) is the safe default; pick (a) or (b) only once you confirm the hierarchy behavior. Low stakes, does not block the build.

a8:

---

q9: Five high-confidence process tags cannot be applied because the cited APQC process codes (10568, 10708, 10470, 10473) are not in the catalog. How should this be handled?

- a) Pick an existing in-catalog process as a substitute for each affected handoff (the agent surfaces one or two candidates per handoff).
- b) Load the missing process rows catalog-wide (a change outside IGA's scope).
- c) Leave the tags pending until a catalog-wide process backfill happens.

Recommended: a. Substituting present-catalog processes lands the tags now and lifts the process-health number; (b) is broader than IGA and (c) leaves the gap open. Affects handoffs 461, 463, 462, 465, and 185.

a9:

---

q10: Four "employees" consumer rows (one on each of the access-certification, access-request, auto-provisioning, and separation-of-duties modules) are marked required but point at a master another domain (HCM) owns, which breaks module self-containment. How should each be fixed?

- a) Embed a local shell of the employee master in each module (convert to embedded_master).
- b) Relax each row to optional (presence-conditional), so the module no longer hard-requires the external master.

Recommended: a. Embedding keeps each module self-contained and standalone-deployable, consistent with the PROMOTE choice in q1; relax to optional only where the module can truly run without employee data. Either edit overwrites an existing row's role or necessity, so it needs your sign-off.

a10:

---

## Optional (will not hold up the build)

q11: Across the flagship IGA suites, five extra masters show up that the catalog does not model yet: separation-of-duties rulesets, per-line certification decisions, role-mining jobs, provisioning connectors, and break-glass accounts. Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the module shape is settled. Each has first-class vendor evidence (SailPoint, Saviynt, Omada, Pathlock, Microsoft Entra), though they still want a verification pass first.

a11:

---

q12: Privileged Access Management (PAM) is an adjacent market (CyberArk, Delinea, BeyondTrust, Saviynt PAM, Senhasegura) that overlaps IGA on privileged-account governance but masters its own concepts (sessions, credential vaults, just-in-time grants, session recordings, account rotations). Should PAM be its own domain, or be absorbed into IGA as a sixth privileged-oversight module?

- a) Separate PAM domain (recommended): it passes the point-solution test cleanly and has its own flagship vendors.
- b) Absorb it into IGA as a new privileged-oversight module.

Recommended: a. PAM is a distinct point-solution market; keeping it separate is cleaner, and the answer also decides where break-glass accounts and connectors from q11 belong. Additive and non-blocking.

a12:

---

<!-- agent map, ignore: q1=B2-M7-DECIDE q2=B2-S1-CARRY q3=B2-S2-CARRY q4=B2-S3-CARRY q5=B2-S4-CARRY.certlock q6=B2-S4-CARRY.entlock q7=B2-S4-CARRY.entapprover q8=B2-S5-CARRY q9=B2-PCF-SUBSTITUTE q10=B1A-SELF-CONTAIN q11=B3-RULESETS+B3-CERT-LINES+B3-ROLE-MINING+B3-CONNECTORS+B3-BREAK-GLASS q12=B3-PAM-DOMAIN | domain_id=35 -->
