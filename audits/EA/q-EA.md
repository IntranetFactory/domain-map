# Enterprise Architecture (EA): questions waiting for you

## What this domain is
Enterprise Architecture is the discipline and tooling for keeping one queryable model of how an organization's business, applications, data, and technology fit together, and for steering that landscape from where it is today toward a target state. EA tools hold the architecture repository and metamodel, the catalog of approved technology standards and reference architectures, the technology radar, architecture principles and decision records, and the roadmaps and transformation initiatives that move the estate forward. It sits above the application portfolio (APM) and the process layer (BPA), reading from both rather than replacing them.

EA is not in the catalog yet. These questions decide whether to build it and how to bound it. Nothing has been written to the catalog.

---

q1: (answer this first) Should Enterprise Architecture be created as its own domain, bounded as a cross-layer umbrella that consumes the application portfolio (APM) and the process layer (BPA) rather than re-mastering them?

- a) Promote it as a domain: create EA and have it own only the cross-layer artifacts (the architecture repository and metamodel, technology standards and reference architecture, and the roadmap/transformation layer), while reading applications from APM and processes from BPA.
- b) Fold the artifacts into APM and BPA instead: do not create EA; add the pieces as capabilities or modules of the existing domains.
- c) Keep it queued in the backlog and revisit later.

Recommended: a. LeanIX, Ardoq, Software AG Alfabet, MEGA HOPEX, and BiZZdesign Horizzon all sell a flagship EA product built around a surface no existing domain owns: the architecture repository and metamodel, ArchiMate model artifacts, the approved technology-standards catalog and reference architectures, the technology radar, architecture principles and decision records, and the baseline-to-target roadmap. APM owns only the application inventory (cost, value, fit) and BPA only process models, so EA is a distinct market rather than a re-bundling of the two. Creating it is additive; nothing is written to the catalog until you approve this.

a1:

---

q2: Should EA master only its own distinctive cross-layer artifacts and consume applications and processes from the other domains, or also re-master those layers itself?

- a) Bounded umbrella: EA masters its distinctive set (about 25 entities) across three modules (EA Repository and Metamodel; Technology Standards and Reference Architecture; Architecture Roadmap and Transformation), and consumes enterprise applications and technology platforms from APM and business processes from BPA.
- b) Broad EA: EA additionally re-masters applications, processes, and capabilities, keeping its own copies alongside APM's and BPA's.

Recommended: a. In LeanIX, Ardoq, Alfabet, HOPEX, and BiZZdesign the application and process objects appear in the EA repository as referenced fact-sheets, not as the repository's own system of record: the tools pull applications from the APM/CMDB layer and processes from process tooling. Mirroring that, EA owns its three-module cross-layer set and reads the rest from APM and BPA. Re-mastering those layers would duplicate APM's and BPA's records and collide with the single-master rule.

a2:

---

q3: APM's pending question q8 proposes an APM technology layer (splitting technology platforms into products, services, and platforms, plus a technology-risk surface of vulnerabilities, application risks, lifecycles, standards, controls, and obligations). EA also wants a technology-standards layer. Who should own the technology standards, the technology lifecycle/radar policy, and the reference architectures?

- a) EA owns the prescriptive half, APM owns the operational half: EA masters the approved-standards catalog, the lifecycle/radar phase policy, and the reference architectures; APM's q8 module keeps the per-instance inventory (product/service/platform instances, vulnerabilities, application risks, controls, obligations) and references EA's standard.
- b) APM owns it all per its q8: standards and lifecycle stay in APM; EA just references them.
- c) Defer this until EA reaches its build (Phase B).

Recommended: a. Software AG Alfabet and LeanIX define technology standards and the lifecycle/radar policy in the EA repository as a normative catalog of what is approved and recommended, while the per-application inventory, cost, and risk live in the APM/portfolio layer; Ardoq's Technology Portfolio likewise separates the lifecycle-policy lens from the component instances. So EA should master the standard, the phase policy, and the reference architectures once, and APM's tech-risk module should reference them and keep the operational inventory. Decide this together with APM q8 so the standard is defined in one place, not duplicated.

a3:

---

q4: Business capability mapping (capability heatmaps, value streams) is a core EA layer. Should EA own it, adding a Business Architecture module and taking canonical ownership of the business capability maps that APM currently masters (and BPA embeds)?

- a) EA owns capability mapping: add a fourth module (Business Architecture / Capability) holding business capabilities, capability assessments, and value streams, and move the canonical owner of business capability maps from APM to EA. This also settles BPA's open capability-map ownership question.
- b) Leave capability mapping out of EA: APM keeps the business capability maps (or BPA takes them, per BPA's own open decision), and EA just consumes them; EA ships with three modules.
- c) Make business capability mapping its own standalone domain, separate from EA.

Recommended: a. LeanIX, Ardoq, Alfabet, HOPEX, and BiZZdesign all master business capabilities, capability assessments, and value streams as first-class business-architecture objects, and the capability heatmap is a headline EA feature, so business architecture belongs in EA. Choosing this also resolves BPA's open capability-map ownership question, which already lists "EA owns" as an option, by moving the business capability maps' canonical master to EA with APM and BPA consuming it. There is genuine three-way tension here (APM masters it today and BPA's audit contests it), so if you would rather keep capability mapping standalone, choose c.

a4:

---

<!-- agent map, ignore: q1=B2-EA-PROMOTE q2=B2-EA-SCOPE-BOUNDARY q3=B2-EA-TECH-LAYER q4=B2-EA-CAPMAP | domain_id=null (unbuilt candidate) -->
