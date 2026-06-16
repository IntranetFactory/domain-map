# Process Documentation and SOP Management (SOP-MGMT): questions waiting for you

## What this domain is
Process Documentation and SOP Management is the software for writing standard operating procedures, work instructions, and operational playbooks, publishing them to the right people, and proving those people actually read and understood them. The center of gravity is the assign-and-acknowledge loop: assign a published procedure to a role or audience, track who has read it, run checklists against it, and bring it back for periodic review. The regulated edge adds controlled documents with electronic sign-off, change control, and audit trails.

SOP-MGMT is not in the catalog yet. These questions decide whether to build it and how to bound it against Knowledge Management, Enterprise Content Management, GRC policy, and a possible Digital Adoption Platform. Nothing has been written to the catalog.

---

q1: (answer this first) Should Process Documentation and SOP Management be created as its own domain, rather than folded into Knowledge Management or left queued?

- a) Promote it as a domain: create SOP-MGMT and have it master the operator-facing procedure and assign/acknowledge surface, while reading generic knowledge articles from KMS, policies from GRC, and document versions from ECM.
- b) Fold it into KMS: do not create SOP-MGMT; add SOPs and acknowledgment as a module or capability of Knowledge Management once KMS is built out.
- c) Keep it queued in the backlog and revisit later.

Recommended: a. Six pure-play flagships sell a product built around this surface, SweetProcess and Trainual (SMB/franchise SOP authoring with role-based assign-and-acknowledge), Process Street (checklist template plus run-instance execution), Scribe/ScribeHow (auto-captured step-by-step guides), Whale (SOP authoring with embedded comprehension quizzes), and Dozuki (controlled work instructions with sign-off). The defining surface, assign a published procedure to an audience and capture proof they read it, is absent from generic knowledge management, and KMS is currently an unbuilt stub serving a different buyer (knowledge manager versus frontline ops lead). Promotion is additive; nothing is written to the catalog until you approve this.

a1:

---

q2: Should SOP-MGMT master only its own procedure and acknowledge surface across two core modules and consume the adjacent records, or also re-master knowledge articles, policies, and the document repository itself?

- a) Bounded: SOP-MGMT masters procedures, process documents, procedure steps, document revisions, document assignments, and acknowledgment records across two full modules (Procedure Authoring; Publish and Acknowledge), and consumes knowledge articles from KMS, policies from GRC, and document versions from ECM.
- b) Broad: SOP-MGMT additionally re-masters knowledge articles, policies, and a document repository, keeping its own copies alongside KMS, GRC, and ECM.

Recommended: a. In SweetProcess, Trainual, Process Street, Scribe, Whale, and Dozuki the procedure, step, checklist, and acknowledgment objects are the system of record, while general reference content, the governing policy, and heavyweight document storage are referenced from adjacent systems rather than rebuilt. The bounded surface uses document_revisions (so it does not re-master ECM's document_versions) and procedure_steps (because the catalog name work_instructions is already a manufacturing entity). Re-mastering those layers would duplicate KMS, GRC, and ECM records and collide with the single-master rule.

a2:

---

q3: Regulated SOP buyers (manufacturing, medical device, pharma) need controlled documents with electronic sign-off, change control, periodic review, and audit trails. Should SOP-MGMT ship this as an optional third module now, or leave the controlled-document slice to a future Enterprise Quality Management (EQMS) domain?

- a) In-scope now: add an optional Controlled Document Control module mastering controlled documents, e-signature approvals, change control, periodic-review attestations, and Part-11/ISO audit trails. A future EQMS domain becomes the migration seam.
- b) Defer to EQMS: keep SOP-MGMT to the two core modules; the controlled-document slice waits for a dedicated EQMS domain.

Recommended: a. Dozuki carries the controlled-document surface among the flagships (e-signature, revision sign-off, change control for ISO and FDA 21 CFR Part 11). The full quality-system vendors, MasterControl, ETQ Reliance, Sparta Systems TrackWise, Veeva QualityOne, and AssurX, already sit as a pending EQMS candidate in the backlog. The continuity case for keeping it here: the same operator-facing procedure graduates into controlled status, so it is one product journey rather than two. There is a genuine trade-off, EQMS spans far beyond document control (CAPA, nonconformance, supplier quality, validation lifecycle), so if you would rather the controlled-document slice anchor a future EQMS domain instead, choose b.

a3:

---

q4: Scribe and Tango auto-capture step-by-step guides, and WalkMe and Whatfix deliver the same guidance as in-app overlays. Should SOP-MGMT own only the published document surface, or also the in-app delivery slice?

- a) Document surface only: SOP-MGMT masters the captured guide as a published procedure (the Scribe/Tango output); in-app overlay delivery (WalkMe, Whatfix, Pendo, Userpilot) becomes a separate Digital Adoption Platform domain, not yet in the catalog.
- b) Include in-app delivery: SOP-MGMT also masters in-app walkthrough flows and adoption analytics, absorbing the DAP surface.

Recommended: a. Scribe/ScribeHow and Tango are capture-first, and their output is a step-by-step guide that is a document, which belongs in SOP-MGMT. WalkMe, Whatfix, Pendo, and Userpilot are in-app delivery plus adoption analytics, a distinct market with a different buyer (product, customer success, or PLG team) and a different artifact (live overlays, not a readable SOP). Keeping SOP-MGMT to the document surface leaves DAP as its own future candidate rather than overloading this domain.

a4:

---

<!-- agent map, ignore: q1=B2-SOP-PROMOTE q2=B2-SOP-SCOPE q3=B2-SOP-EQMS-SPLIT q4=B2-SOP-DAP-SCOPE | domain_id=null (unbuilt candidate) -->
