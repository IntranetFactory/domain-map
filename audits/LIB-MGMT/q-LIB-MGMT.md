# Library Management (LIB-MGMT): questions waiting for you

## What this domain is
Run your library: catalog every title, lend every item, support every patron.

Catalog books, journals, e-resources, and special collections in MARC21 or BIBFRAME. Run daily circulation (check-out, check-in, holds, fines, and circulation policy), register patrons, manage patron categories, and issue cards. Order materials, manage serial subscriptions, and track e-resource licenses, then publish a discovery layer and OPAC for self-service search and run interlibrary loan workflows with resource-sharing partners.

---

q1: (answer this first) For library holdings (the record that links a title to the items a library owns), is it a config-shape master (no lifecycle) or a workflow master (with a lifecycle to author)?

- a) Config-shape: treat it like reference data with no lifecycle (the Koha-style view).
- b) Workflow with a simple 3-state lifecycle: new, then linked, then withdrawn (the Alma-style view).
- c) Workflow with a richer 5-state lifecycle (the fuller Alma-shaped machine).

Recommended: b. Most platforms that treat holdings as a real object give it the new, linked, withdrawn flow, which is enough to track when a holding is attached to a title and when it is retired. This choice sets the object's type and whether a lifecycle gets built, which unblocks the holdings lifecycle work below it.

a1:

---

q2: I have already classified the other masters (library circulation policies, patron categories, vendor accounts, and sharing partners as config-shape reference data, and saved searches as an operational record). Are those classifications correct? (yes/no)

Recommended: yes. These are author-once, edit-occasionally reference objects with no real workflow, so leaving them without a lifecycle is the standard shape.

a2:

---

q3: Who should own this domain functionally? I have already added Business Operations (technical services) and Customer Service (public services) as contributors. The current owner is Research and Development.

- a) Keep Research and Development as owner, with Business Operations and Customer Service as contributors (academic-library-first).
- b) Flip ownership to Business Operations and demote Research and Development to contributor (public-library-first).
- c) Flip ownership to Customer Service and demote Research and Development to contributor (public-library-first).
- d) Split into a dedicated library-services function.

Recommended: a. The contributors are already in place, so keeping the current owner avoids a destructive overwrite of the existing owner row. Flipping the owner is a destructive change, so it is surfaced here rather than applied.

a3:

---

q4: Library roles are currently prefixed RESEARCH-DEV- (because the owning function is Research and Development). How should they be named?

- a) Leave them as RESEARCH-DEV-.
- b) Rename them to match whatever you choose in q3.
- c) Drop the function prefix entirely.

Recommended: a, if you keep Research and Development as owner in q3. The prefix mechanically follows the owning function, so this answer should track your q3 choice. (The persona layer is empty right now, so this convention applies once personas are authored.)

a4:

---

q5: Should the discovery module stay a thin OPAC (local catalog search only), or expand into a full discovery layer (federated indexes across publishers, link resolver, relevance)?

- a) Keep it as one module scoped tightly to OPAC / local catalog search.
- b) Split into two modules: OPAC (local search) plus Discovery (federated indexes, link resolver, relevance).
- c) Defer until the related entity research is done.

Recommended: a. Splitting only pays off once the discovery-layer objects (federated indexes, link resolver, relevance) actually exist, so keeping one tightly scoped module is the right shape today. Academic libraries usually need both; small public libraries only need OPAC.

a5:

---

q6: Should this domain carry any compliance regulations of its own? It has none today. Candidates are FERPA (academic patron records tied to student status), state-level patron-privacy statutes, and GDPR / UK DPA for EU deployments.

- a) Add FERPA, state patron-privacy statutes, and GDPR.
- b) Leave it empty and let regulations attach through the consuming function (for example FERPA via the student-information domain).
- c) Add only the universally applicable subset.

Recommended: b. Several of these attach more naturally through the consuming function than directly to the library domain, so leaving it empty avoids double-tagging. Low stakes, does not block the build.

a6:

---

## Optional (will not hold up the build)

q7: Five extra entities show up across the flagship library platforms (branches / locations to scope holdings and circulation, digital lending for e-books and audiobooks, library programming and events, academic course reserves, and a patron-SSO identity surface). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the module shape is settled. Branches is the strongest no-regrets candidate (any multi-branch library needs it); the digital-lending, programming, and course-reserves candidates may instead become their own neighboring domains.

a7:

---

<!-- agent map, ignore: q1=B2-S2 q2=B2-S2.classify q3=B2-S3 q4=B2-S4 q5=B2-S5 q6=B2-S6 q7=B3-S1+B3-S2+B3-S3+B3-S4+B3-S5 | domain_id=168 -->
