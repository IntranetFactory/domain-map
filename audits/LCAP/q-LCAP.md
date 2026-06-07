# Low-Code Application Platforms (LCAP): questions waiting for you

## What this domain is

Build, run, and govern business applications visually instead of hand-coding them. Authors model pages, business objects, workflows, and data-source connections in a visual designer, then the platform compiles and runs the result as a managed application. The domain covers the whole life of those apps, from visual composition through runtime execution, deployment, and lifecycle management, across the enterprise low-code market (OutSystems, Mendix, Power Platform, ServiceNow App Engine, Appian, and peers).

---

q1: (answer this first) The two live modules (Visual Composition and Runtime Lifecycle) and the domain itself have no catalog tagline or description yet. How should that buyer-facing copy be authored?

- a) You supply the wording for all three rows (both modules plus the domain).
- b) The agent drafts it for your review (one round, no auto-insert).
- c) Defer to a later catalog-wide copy pass.

Recommended: b. A draft-for-review round gets the three rows populated fastest without committing copy you have not seen. This is the catalog-completeness gate (it blocks A4 / M8 across the domain and both modules), so settle it first.

a1:

---

q2: Should a published app version be frozen once a published version exists, so further edits create a new version rather than mutating the live one? (yes/no)

Recommended: yes. Every flagship LCAP treats a published version as an immutable artifact.

a2:

---

q3: Should a business object be frozen once its schema is deployed with dependent pages, so schema changes are not silently reversible? (yes/no)

Recommended: yes. Once pages depend on a schema, silent edits risk breaking the running app.

a3:

---

q4: Should data-source connections be treated as personal content, because connection credentials and API keys are credential-shaped? (yes/no)

Recommended: yes. Connection metadata carries secrets and should be handled as protected content.

a4:

---

q5: Should a workflow be frozen once it is active, so changes to a live workflow go through a new version? (yes/no)

Recommended: yes. A live workflow drives running apps, so changes should be versioned for auditability.

a5:

---

q6: The live ownership says IT Infrastructure owns this domain, with Software Engineering and Business Operations contributing, but the canonical function list names IT Operations (not IT Infrastructure) and has no Business Operations entry. How should ownership be anchored?

- a) Re-anchor to the canonical list: owner IT Operations, contributor Software Engineering, drop Business Operations.
- b) Leave it as-is, treating the live data as authoritative over the documented list.
- c) Mixed: re-anchor and add Software Engineering as a second owner, since low-code platforms straddle IT and engineering.

Recommended: a. Aligning to the canonical function spine keeps cross-domain analysis consistent, unless you know IT Infrastructure and Business Operations were added to the live list deliberately.

a6:

---

q7: The em-dash rule forbids the U+2014 character, and the domain's business-logic text currently contains one. Should the suggested rewrite be applied: "Runtime, compiler, and visual modeller. The entire platform is code, the end-user app surface is whatever the customer builds, and the LCAP itself is platform."? (yes/no)

Recommended: yes. The rewrite removes the forbidden character and keeps the original meaning.

a7:

---

q8: Should the cross-cutting Operational Data Apps capability stay scoped to this domain only, or expand to cover the neighboring markets?

- a) Keep it LCAP-only.
- b) Expand to add NCDB (no-code databases).
- c) Expand to add both NCDB and APP-PAAS.

Recommended: b. Vendors marketing operational data apps span LCAP and the no-code database market; including APP-PAAS is more borderline, so add it only if you see that overlap as real.

a8:

---

## Optional (will not hold up the build)

q9: Flagship vendors model a deeper set of objects beyond the five masters loaded today (app versions, deployments, environments, app packages, per-app role definitions, workflow execution runs, audit logs, integration endpoints, AI prompts, AI-generated artifacts, and per-app compliance assertions). Should I research and add the ones that hold up across the vendor set? (yes/no)

Recommended: yes, but additive and best done after the catalog copy and pattern flags are settled. Several (versions, deployments, environments, packages) are first-class across the major LCAPs; the compliance set may even warrant its own module, which would be a separate decision.

a9:

---

<!-- agent map, ignore: q1=B2-MODULE-CATALOG-UX q2=B2-S2.apps q3=B2-S2.businessobjects q4=B2-S2.datasources q5=B2-S2.workflows q6=B2-S3 q7=B2-S5 q8=B2-S4 q9=B3-LCAP-VERSIONS+B3-LCAP-DEPLOYMENTS+B3-LCAP-ENVIRONMENTS+B3-LCAP-PACKAGES+B3-LCAP-ROLE-DEFS+B3-LCAP-EXECUTIONS+B3-LCAP-AUDIT-LOGS+B3-LCAP-ENDPOINTS+B3-LCAP-AI-PROMPTS+B3-LCAP-GEN-ARTIFACTS+B3-LCAP-COMPLIANCE | domain_id=37 -->
