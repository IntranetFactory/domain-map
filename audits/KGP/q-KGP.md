# Knowledge Graph Platform (KGP): questions waiting for you

## What this domain is
A dedicated platform for building and running an enterprise knowledge graph: model your business as a reusable ontology, store and query the resulting graph natively, reason over it, and federate across remote endpoints. It grounds AI agents, operational apps, and complex analytical queries in verified, lineage-tracked facts rather than raw tables. Flagship vendors include Stardog, TopBraid EDG, Anzo, GraphDB, AllegroGraph, and Neo4j Knowledge Graph.

---

q1: (answer this first) Which domain should be the canonical owner of the shared "ontologies" concept? Today an "ontologies" object is master-claimed in two other domains at once (a catalog-wide single-master violation), and KGP separately masters its own kgp_ontologies, so the same concept is duplicated.

- a) KGP owns it: delete the data-catalog and data-platform master rows, merge the legacy ontologies object into KGP's kgp_ontologies, and have the other domains consume or embed it.
- b) The data catalog (DCG) owns it: keep the legacy object there, delete the data-platform master row and KGP's kgp_ontologies, and KGP consumes or embeds it.
- c) The data platform (DATA-AI-PLAT) owns it: keep the legacy object there, delete the data-catalog master row and KGP's kgp_ontologies, and KGP consumes or embeds it.

Recommended: a. The point-solution-market test favors KGP (Stardog, TopBraid, Anzo are flagship ontology-master vendors). This choice drives the canonical owner of every shared concept below it and the module master sets, so it unlocks the rest of the build. Any of the three involves deleting a master row in the losing domain, so it needs your sign-off.

a1:

---

q2: Should the matching "knowledge_graph_entities" concept follow the same owner as q1? It is master-claimed in the data platform today, and KGP separately masters its own kgp_knowledge_graph_entities, so it is the same kind of duplication as q1.

- a) Collapse the data-platform object into KGP's kgp_knowledge_graph_entities (matches q1 option a).
- b) Keep the data platform as the canonical owner and retire KGP's kgp_knowledge_graph_entities.

Recommended: a. It is coupled to q1; if KGP wins ontology canonicality it should own this concept by the same logic. This involves retiring a duplicate master, so it needs your sign-off.

a2:

---

q3: If q1 picks the KGP-owns-it merge path, should KGP's masters be renamed from the prefixed names (kgp_ontologies, kgp_knowledge_graph_entities) to the bare words (ontologies, knowledge_graph_entities)?

- a) Keep the prefix (only valid if q1 picks option b or c, leaving the bare-word master in another domain).
- b) Promote to the bare words and delete the old legacy objects (only valid if q1 picks option a).
- c) Rename the legacy objects in the losing domain instead (e.g. dcg_ontologies) and keep KGP's prefixed masters as the canonical ones.

Recommended: b, conditional on q1 picking option a. The naming default is to keep the prefix, but claiming canonical authority over the term is exactly what justifies promoting to the bare word. This determines whether downstream references point at KGP's masters or the legacy objects.

a3:

---

q4: Both KGP masters (ontologies and knowledge-graph entities) appear to carry real workflows, not just config. Should both be modeled with full lifecycles (about ten lifecycle states plus two workflow-gate permissions), or should either be exempted?

- a) Model both with full lifecycles.
- b) Exempt one (specify which) and model the other.
- c) Other.

Recommended: a. The audit can describe both workflows (ontology drafting to validating to published to superseded to retired; entity asserted to validated to reasoned to merged to retired), but only you can confirm the workflow is structural rather than merely conventional.

a4:

---

q5: What should the domain-level marketing copy (tagline and description shown on the domain itself) be? These fields are still empty.

- a) Approve the existing draft tagline: "Build the unified semantic substrate that powers your AI agents, operational apps, and complex analytical queries on top of your enterprise data."
- b) Rewrite it (supply the exact text).
- c) Skip it and leave the domain-level fields empty.

Recommended: a. The draft is in buyer voice and matches the domain. This is editorial and does not block the build.

a5:

---

q6: The buyer copy for the two modules (KGP-ONTOLOGY-ENGINE and KGP-GRAPH-QUERY-APPS) has already been written into the catalog and is awaiting your review. Should this written module copy be approved as-is? (yes/no)

Recommended: yes, after a quick read in the catalog UI; request edits if any wording needs changing. Editing already-written copy is a per-row approval, so it is not auto-applied.

a6:

---

q7: Three cross-domain handoff process tags (mapping KGP handoffs to the "Define and maintain business information architecture" process) are agent-authored and still unapproved. Should the batch be approved as-is? (yes/no)

- a) Approve the batch at "Define and maintain business information architecture".
- b) Re-anchor to a different process (specify which).

Recommended: a. The process mapping is reasonable. Flipping these to approved is a sign-off step, so it is not applied automatically.

a7:

---

## Optional (will not hold up the build)

q8: Three capabilities currently have no backing master object, and flagship graph vendors expose each as a first-class surface: an inference-rules object (SWRL or custom rule languages, in Stardog, GraphDB, AllegroGraph), a named-graphs object (the access-control and partitioning unit in every RDF triple-store), and a virtual-graph-mappings object (R2RML/RML definitions that expose external sources as RDF). Should I research and add the ones that hold up? (yes/no)

Recommended: yes, but additive and can happen after the modules exist. The inference-rules and named-graphs candidates are well evidenced; the virtual-graph-mappings one still wants a verification pass.

a8:

---

<!-- agent map, ignore: q1=B2-S1 q2=B2-S2 q3=B2-S3 q4=B2-S6 q5=B2-S5.domaincopy q6=B2-S5.modulereview q7=B2-APQC-APPROVAL+B1B-APQC-H265-NOTE q8=B3-S1+B3-S2+B3-S3 | domain_id=138 -->
