# KGP audit history

## 2026-05-30 - Validate b1 (full 4-pass)

### Summary

- **Current footprint:** domain id 138 (`Knowledge Graph Platform`). **Zero `domain_modules` rows** (primary host query empty; host-junction query empty). 2 KGP-prefixed masters at the legacy `domain_data_objects` rollup (`kgp_ontologies` id 742, `kgp_knowledge_graph_entities` id 743). 8 capabilities (6 KG-prefixed, 2 cross-cutting: `SEMANTIC-MODELING` id 197, `OPERATIONAL-DATA-APPS` id 201). 8 solutions (7 primary, 1 secondary). 4 KGP-mastered `trigger_events` (all `event_category=''`, B1-S band Rule #13 violation). 7 handoffs touching KGP (3 outbound, 4 inbound), **every single one has NULL on both `source_domain_module_id` and `target_domain_module_id`** (KGP unmodularized, plus the cross-side modules are also unmodularized on this neighborhood). 1 legacy domain-level system skill (id 76 `kgp-system`, `domain_module_id` NULL, F1 fail), 4 `skill_tools` (all `platform`). 0 lifecycle states, 0 data_object_aliases, 0 data_object_relationships on the 2 KGP-prefixed masters. 0 domain_aliases on the domain itself. `domains.catalog_tagline` and `domains.catalog_description` both empty. 0 roles for this domain.
- **Vendor-surface basis:** Stardog, TopBraid EDG, Anzo, Metaphacts, GraphDB (Ontotext), AllegroGraph, Neo4j Knowledge Graph, Palantir Foundry (already loaded as solutions; treated as the flagship surface). Compliance specialists: none directly required (KGP is infrastructure tooling), though GDPR provenance and EU AI Act traceability surface as audit-trail entities.
- **Bucket 1 (in-scope, agent fixable):** 14 items.
- **Bucket 2 (surface-for-user, judgment):** 4 items.
- **Bucket 3 (Phase 0 pending, speculative):** 2 items.

**Neighbor discovery** (auto-derived from `handoffs`):

| Neighbor | Out (KGP→X) | In (X→KGP) | DMDO on KGP masters | Cross-rels | Weight | Pass shape |
|---|---|---|---|---|---|---|
| DCG (id 88) | 0 | 2 (h.221 ontology.published, h.265 glossary_term.published) | n/a (zero KGP modules) | 0 | 4 | Light (KGP unmodularized) |
| DATA-AI-PLAT (id 129) | 2 (h.221 ontology.published, h.697 kgp_ontology.imported) | 0 | n/a (DATA-AI-PLAT also has 0 modules) | 0 | 3 | Light |
| MDM (id 87) | 0 | 1 (h.222 kg_entity.linked) | n/a | 0 | 2 | Light |
| DCG h.223 (duplicate ontology.published manual handoff) | 0 | 1 | n/a | 0 | (folded into DCG row) | - |

All four neighbors have zero modularization on the cross-side too, so the deep four-leg pairwise pass cannot resolve module FKs for either direction; pairwise reconciliation is deferred until either KGP or each neighbor is modularized.

**Structural bands** (KGP-side summary):
- A1 PASS (7 business-metadata fields populated).
- A2 PASS (8 capabilities, > 3 floor).
- A3 PASS (8 solutions, 7 primary, all coverage_level set).
- A4 **FAIL** (`catalog_tagline` empty, `catalog_description` empty).
- A5 SKIP (opt-in only).
- **M1 HARD FAIL** (zero `domain_modules` rows; blocks M2/M4/M5/M6/M7 within KGP, blocks all of B at the module layer, blocks E entirely, partially blocks F).
- M7 **catalog-wide HARD FAIL** (separate from M1; flagged below): data_object 254 (`ontologies`) carries `role='master'` in BOTH DCG (legacy `domain_data_objects`) and DATA-AI-PLAT (legacy `domain_data_objects`). Two master rows on the same data_object_id is a catalog-wide single-master violation. KGP separately introduced `kgp_ontologies` (742) which mostly duplicates the same concept; the relationship between 254 and 742 is not modeled anywhere.
- B1 PASS at the `domain_data_objects` rollup (2 master rows on KGP-prefixed objects), but **FAIL** at the module layer (zero `domain_module_data_objects` rows because zero modules).
- B2 PASS (singular_label / plural_label set on 742, 743).
- B3 PASS (both KGP-prefixed; bare-word arbitration not needed).
- B4 not positively re-evaluated (Bucket 2 item).
- B5 not applicable (zero embedded_master rows).
- B6 **FAIL** (zero intra-domain relationships between 742 and 743 even though `kgp_knowledge_graph_entities` is implicitly typed by `kgp_ontologies`).
- B7 **FAIL** (zero relationships from `users` to either master, even though ontology authoring and KG-entity assertion are both user-mediated).
- B8 **FAIL outbound** (no relationships from 742/743 to the payload-receiving masters in DCG/DATA-AI-PLAT/MDM, although the handoffs 697/698/699 carry obvious target masters).
- B9 PASS coverage-wise (4 KGP trigger events exist) but **FAIL** on event_category (all 4 are `event_category=''`, Rule #13 enum violation: allowed values `lifecycle`, `state_change`, `threshold`, `signal`).
- B9b vacuously passes (only 1 effective module worth of masters; zero `domain_modules` rows means no cross-module pair to evaluate).
- B10b **FAIL** (all 7 KGP-touching handoffs have NULL on both module FKs; report-only on the cross-side, in-scope-once-modularized on the KGP side).
- B11 **FAIL** (zero aliases on either master; both are non-self-explanatory: `kgp_ontologies` synonyms include `vocabularies`, `taxonomies`, `controlled vocabularies`; `kgp_knowledge_graph_entities` synonyms include `kg_nodes`, `instances`, `individuals`, `triples`).
- B12 **FAIL** (zero `data_object_lifecycle_states` rows on either master; both have real workflow: ontology authoring → validation → publication → import; KG entity asserted → reasoned → merged/split → retired).
- C1 PASS (Data and Analytics owner, AI and Machine Learning + Software Engineering contributors, R&D + IT Operations consumers).
- C2 PASS (no per-capability override needed; the 6 KG-prefixed capabilities inherit Data and Analytics ownership).
- D1 not run (out of audit scope; UI spot-check is a load-time step).
- E1 vacuously passes (single-module domains exempt; KGP has zero modules so the 2-module floor cannot be tested).
- F1 **FAIL** (legacy domain-level system skill id 76 with `domain_module_id` NULL; once any module-level skill exists, this row must be retired; but right now, with zero modules, the legacy row IS the only system skill so retiring it would leave the F2 floor at zero. Resolution is contingent on M1 being fixed first).
- F2 cannot be evaluated (zero modules; vacuously passes the per-module floor).
- F3 PASS for the legacy skill (4 `skill_tools` rows, all `platform`).
- F4 PASS (all 4 tools are `query` with `data_object_id` set; invariant holds).
- F5 PASS (legacy skill scores 100% strict, 100% operational; computed across the 4 platform-covered tools).
- F7 vacuously passes (no channel primitives linked).
- **H1 HARD FAIL** (7 KGP-touching handoffs, zero `handoff_processes` rows: 0 approved, 0 agent_curated, 0 discovery_substring). Volume target: 4-6 agent_curated tags expected.

The dominant finding: **KGP is a pre-modular domain that never received Phase A modules even after Phase A capabilities + solutions landed.** Every B-band and F-band concern hangs off M1. Most fixes are blocked by "model the modules first."

### Bucket 1 - In-scope confirmed gaps

#### STRUCTURAL band failures

| ID | Band | Finding | Fix |
|---|---|---|---|
| B1-S1 | **M1 (hard fail, blocking)** | Zero `domain_modules` rows for KGP. Phase A loaded `domains`, `capabilities`, `solutions`, even a domain-level `skills` row, but the modular layer was skipped. Every B-band, E-band, F2/F3 check hangs off this. Recommended split into 3 modules: (a) `KGP-ONTOLOGY-ENGINE` (KG-ONTOLOGY-AUTHORING + KG-REASONING-INFERENCE + KG-NATIVE-STORAGE; masters `kgp_ontologies`); (b) `KGP-QUERY-FEDERATION` (KG-SPARQL-FEDERATION + KG-VIRTUAL-GRAPHS; consumer-shaped, masters none, embedded_master `kgp_ontologies` + `kgp_knowledge_graph_entities`); (c) `KGP-AGENT-INTEGRATION` (KG-AI-AGENT-INTEGRATION + the cross-cutting SEMANTIC-MODELING + OPERATIONAL-DATA-APPS realizations; masters none, consumer of the other two). 8 capabilities and a 3-module split satisfy Rule #14's ≥2-modules floor for ≥3-capability domains. | Hand-author 3 `domain_modules` rows (Phase M loader pattern); link `domain_module_capabilities` for all 8 capabilities; reassign the legacy system skill (id 76) to `KGP-ONTOLOGY-ENGINE` (Phase S retrofit). |
| B1-S2 | **trigger_events.event_category** | All 4 KGP-mastered events have `event_category=''`. Rule #13 allows only `lifecycle`, `state_change`, `threshold`, `signal`. Proposed: 720 `kgp_ontology.imported` → `lifecycle`; 721 `kgp_ontology.validation_failed` → `state_change`; 722 `kgp_knowledge_graph_entity.merged` → `state_change`; 723 `kgp_knowledge_graph_entity.created` → `lifecycle`. | PATCH 4 rows. |
| B1-S3 | **B6** | Zero intra-domain `data_object_relationships` between `kgp_ontologies` (742) and `kgp_knowledge_graph_entities` (743). The schema relation is `kgp_knowledge_graph_entities is_typed_by kgp_ontologies` (one-to-many; entities point at the ontology class they instantiate). Required edge: `(742, "types", 743, "many_to_one", "structural", true, "source")` plus inverse. | Author 1 `data_object_relationships` row via the cluster-drafts loader. |
| B1-S4 | **B7** | Zero `data_object_relationships` rows from `users` (id 748) to either KGP master. Ontology authoring and KG-entity assertion both have user-typed actors (author, validator, asserter, reviewer). Required edges: `users authors kgp_ontologies`, `users asserts kgp_knowledge_graph_entities`, `users reviews kgp_ontologies` (3 rows). | Apply Rule #10 (built-in edges first-class); insert 3 rows. |
| B1-S5 | **B8 outbound** | Handoffs 697 (KGP → DATA-AI-PLAT on `kgp_ontology.imported`, payload `kgp_ontologies`), 698 (KGP → DCG on `kgp_knowledge_graph_entity.merged`, payload `kgp_knowledge_graph_entities`), 699 (KGP → DCG on `kgp_knowledge_graph_entity.created`, payload `kgp_knowledge_graph_entities`) all lack mirror `data_object_relationships`. Payload→target proposed: `kgp_ontologies feeds <DATA-AI-PLAT semantic_models>` (target id depends on DATA-AI-PLAT modularization which itself is empty); `kgp_knowledge_graph_entities reconciles_with <DCG data_assets>` (id 256); `kgp_knowledge_graph_entities lineage_to <DCG data_assets>`. | Surface to user; load 3 relationship rows once target-side masters are resolvable (the DATA-AI-PLAT side may need to defer). |
| B1-S6 | **B11** | Zero `data_object_aliases` rows on either master. Proposed alias set: 742 → `vocabulary`, `taxonomy`, `controlled_vocabulary`, `domain_model` (alias_type `synonym`); 743 → `kg_node`, `entity_instance`, `individual`, `triple`, `node` (synonyms), plus `Resource` (vendor-specific RDF terminology) and `Node` (vendor-specific labeled-property-graph terminology). | Insert ~9 alias rows. |
| B1-S7 | **B12** | Zero `data_object_lifecycle_states` rows on either master. Proposed states: `kgp_ontologies` → `drafting (initial)`, `validating`, `published (requires_permission)`, `superseded`, `retired (terminal)`. `kgp_knowledge_graph_entities` → `asserted (initial)`, `validated`, `reasoned`, `merged (requires_permission, override → merge_kg_entity)`, `retired (terminal)`. `domain_module_id` on each `requires_permission=true` row should anchor to the relevant module from B1-S1. | Author 10 lifecycle state rows once modules from B1-S1 are loaded. |
| B1-S8 | **A4** | `catalog_tagline` and `catalog_description` both empty (Rule #20). Draft per the buyer-voice rule: tagline ~ "Build the unified semantic substrate that powers your AI agents, operational apps, and complex analytical queries on top of your enterprise data." Description (~3 paragraphs covering: model your business domain as a reusable ontology; reason across federated graphs and remote endpoints; ground LLM agents in verified, lineage-tracked facts). | Draft both fields, surface to user for review BEFORE writing (Rule #20). |
| B1-S9 | **B10b in-scope (KGP-side)** | All 3 outbound handoffs (221, 697, 698, 699; actually 4 outbound counting 221 which is the legacy one) carry NULL `source_domain_module_id`. Resolution depends on B1-S1 (modularize KGP first). Once modules land: 221 (`ontology.published`, payload 254 `ontologies`) → KGP-ONTOLOGY-ENGINE (legacy data_object, see B2-S2 below); 697, 698, 699 → KGP-ONTOLOGY-ENGINE (masters 742 and 743 both live there in the proposed split, OR 743 lives in KGP-AGENT-INTEGRATION depending on the module split B2-S4 resolves). | Run the B10b backfill loader pattern after B1-S1 lands. |
| B1-S10 | **F1** | Legacy domain-level system skill (id 76 `kgp-system`, `domain_id=138`, `domain_module_id=NULL`). F1 rule: once any module-level system skill exists, the legacy row must be retired. Currently no module-level skill exists either, so technically F1 vacuously passes today, but the moment B1-S1 ships modules and Phase S authors per-module skills, this row is obsolete. Resolution: when modules + new per-module skills land, repoint the 4 existing `skill_tools` rows to the new module-level skill (or DELETE if duplicated) and DELETE the legacy skill row. | Bundle with the Phase M + Phase S retrofit loader. |
| B1-S11 | **APQC TAGGING (h.221)** | Handoff 221 (DCG-equivalent path: `ontology.published` from KGP → DATA-AI-PLAT, payload `ontologies`). Proposed PCF: `Define data strategy and policies` (10063 family) OR `Manage master data` (10564 area, depends on what DATA-AI-PLAT defines as "ontology consumer"). Pending PCF lookup at fix time; confidence medium L3. | Insert one `handoff_processes` row, `proposal_source='agent_curated'`, `record_status='new'`. |
| B1-S12 | **APQC TAGGING (h.222, h.265, h.223 inbound)** | h.222 (MDM → KGP, `kg_entity.linked`, payload `knowledge_graph_entities` 255): PCF `Manage master data` (10564, confident L3). h.265 (DCG → KGP, `glossary_term.published`, payload `glossary_terms` 302): PCF `Manage business taxonomies and ontologies` (10563 family, needs verification at fix time). h.223 (DCG → KGP, duplicate `ontology.published`, payload `ontologies` 254): same PCF as h.221. **Note:** these are inbound, but APQC tagging is shared (same `handoff_processes` row writes from either side's audit; whichever ships first owns the row). | Insert 3 `handoff_processes` rows (or 2 if h.223 collapses with h.221). |
| B1-S13 | **APQC TAGGING (h.697, h.698, h.699 outbound)** | h.697 (KGP → DATA-AI-PLAT, `kgp_ontology.imported`, payload `kgp_ontologies`): PCF `Develop and manage information technology architecture` (10571 family, plausible L3). h.698 (KGP → DCG, `kgp_knowledge_graph_entity.merged`, payload `kgp_knowledge_graph_entities`): PCF `Manage master data` (10564) OR `Develop and manage business knowledge` (10568 family); needs PCF lookup. h.699 (KGP → DCG, `kgp_knowledge_graph_entity.created`, payload `kgp_knowledge_graph_entities`): same as h.698. | Insert 3 `handoff_processes` rows. |
| B1-S14 | **B7 (B6 follow-on)** | Author the data_object_relationships inverse for the `kgp_ontologies` → `kgp_knowledge_graph_entities` edge (B1-S3) and confirm `relationship_kind` is `structural` not `derived`. Pure bookkeeping but the audit checklist treats inverse-edge completeness as a separate row. | Insert the inverse edge (counted separately because it carries its own verb / inverse_verb / owner_side). |

#### Bucket 1 finding-type roll-up

| Finding type | Count |
| --- | --- |
| STRUCTURAL (M / B / F / A bands) | 11 |
| BOUNDARY (B10b in-scope side) | 0 (B1-S9 folded into STRUCTURAL above) |
| APQC TAGGING | 3 (B1-S11 + B1-S12 + B1-S13, each one row group) |
| MISSING (market-surface, vetted) | 0 (deferred to Bucket 3 because no Phase 0 doc exists yet for KGP) |
| WRONG-OWNERSHIP | 0 |
| SCOPE-CREEP | 0 |
| MODULARIZATION ISSUE | 0 (the issue IS "no modules", which routes to STRUCTURAL B1-S1, not modularization-of-existing-modules) |
| **Bucket 1 total** | **14** |

### Bucket 2 - Surface-for-user (judgment calls)

| ID | Question | Why agent can't answer | Options |
|---|---|---|---|
| B2-S1 | **M7 catalog-wide hard fail on `ontologies` (id 254).** The legacy data_object `ontologies` (id 254) has `role='master'` rows in BOTH DCG (88) and DATA-AI-PLAT (129) at the `domain_data_objects` layer. Two `master` rows on the same data_object_id is a catalog-wide violation that the blueprint emitter throws on. Plus KGP itself introduces `kgp_ontologies` (742) which mostly duplicates the same concept. Three possible resolutions: (a) **KGP is the canonical owner**: delete both DCG and DATA-AI-PLAT master rows on 254, merge 254 into 742 (DELETE 254, repoint everything to 742), and the other domains demote to consumer/embedded_master. (b) **DCG is the canonical owner**: keep 254 in DCG as canonical master, DELETE the DATA-AI-PLAT master row, DELETE 742, repoint everything to 254, KGP demotes to consumer/embedded_master. (c) **DATA-AI-PLAT is the canonical owner**: same as (b) but inverted; DCG and KGP demote. | The decision is editorial (which domain canonically masters ontologies in your taxonomy) and architectural (whether ontology-as-data-product belongs in the data platform, the data catalog, or the dedicated graph platform). The 'point-solution-market test' suggests KGP is the right answer (Stardog, TopBraid, Anzo all flagship ontology-master vendors), but you may have intentionally placed it in DCG/DATA-AI-PLAT for catalog symmetry reasons. | (a) KGP-canonical (recommended). (b) DCG-canonical. (c) DATA-AI-PLAT-canonical. |
| B2-S2 | **`knowledge_graph_entities` (id 255) vs `kgp_knowledge_graph_entities` (id 743) duplication.** Same shape as B2-S1: id 255 is master-claimed by DATA-AI-PLAT and consumer in MDM; id 743 was added later under KGP. If B2-S1 resolves "KGP-canonical" for ontologies, by parallel logic KGP should also own 255 → 743 consolidation. | Same as B2-S1: architectural decision. | (a) Collapse 255 into 743 under KGP. (b) Keep 255 in DATA-AI-PLAT as canonical, retire 743. (c) Keep both (rejected by single-master rule for the same name space; impossible). |
| B2-S3 | **Should `kgp_ontologies` keep the `kgp_` prefix?** Rule #9 (naming arbitration) was applied at insert time (742 is non-canonical bare-word, prefixed). But once B2-S1 resolves (if KGP is canonical), the prefixed name reads awkwardly: every other catalog references the concept as just `ontologies`. Promoting 742 to the canonical bare-word `ontologies` is one option; merging 254 into 742 and renaming back to `ontologies` is another. Same question for `kgp_knowledge_graph_entities` (743). | Rule #9 default is "prefix"; promotion to bare-word requires `is_canonical_bare_word=true` plus a non-empty `naming_authority_rationale`. The decision depends on whether KGP claims canonical authority over the term catalog-wide. | (a) Keep prefix, leave 254 as the canonical bare-word elsewhere. (b) Promote 742 to `ontologies` (rename + DELETE old 254). (c) Rename 254 to `dcg_ontologies` or `dataaiplat_ontologies` per the loser of B2-S1 and keep 742 as canonical. |
| B2-S4 | **Module split shape.** B1-S1 proposes 3 modules (ONTOLOGY-ENGINE, QUERY-FEDERATION, AGENT-INTEGRATION). Two alternative splits are defensible: (alt 1) 2 modules (ENGINE + QUERY/AGENT combined) cuts the audit surface but loses the agent-integration capability's distinct user / RBAC story; (alt 2) 4 modules (split ENGINE into AUTHORING + REASONING) closer matches how Stardog / Anzo carve their products but doubles the module-permission surface. The 3-module split is a reasonable middle; user should pick before any Phase M load. | The module-shape decision drives every downstream Phase B+S+E load. Once chosen, the data_object assignments, lifecycle state anchoring, role authoring, and permission materialization all follow deterministically. | (a) 3 modules as proposed (recommended). (b) 2 modules. (c) 4 modules. (d) Different split entirely (specify). |

### Bucket 3 - Phase 0 pending (speculative)

KGP has no Phase 0 vendor-surface document (`c:/tmp/KGP-phase0-*.md`). Without one, the market audit pass can only surface speculative gaps from the agent's prior knowledge of Stardog / TopBraid / Anzo / Metaphacts / GraphDB / AllegroGraph / Neo4j / Palantir. These are flagged as Bucket 3 (eyeball-mode or full Phase 0 vetting).

| ID | Candidate | Basis | Recommended verification |
|---|---|---|---|
| B3-S1 | **MISSING: `kgp_inference_rules` master** | Stardog, GraphDB, AllegroGraph all expose a "rules" surface (SWRL, custom rule languages) distinct from the ontology itself. The rule corpus is authored, versioned, and executed separately from the ontology. Could plausibly live in KGP-ONTOLOGY-ENGINE or warrant its own KGP-INFERENCE-RULES sub-module. | Run a focused Phase 0 vendor-research on rule-authoring surfaces in Stardog and GraphDB; confirm whether the rule corpus is per-ontology or catalog-wide. |
| B3-S2 | **MISSING: `kgp_named_graphs` (or `kgp_graph_partitions`) embedded master** | Named graphs are the unit of access control and data partitioning in every RDF triple-store flagship. Today the catalog has no named-graph entity, which means the natural Phase E permission grain (per-graph RBAC) cannot be materialized. May be embedded master in KGP-ONTOLOGY-ENGINE or a separate entity. | Phase 0 verification: do Stardog / GraphDB / AllegroGraph all expose named-graph CRUD as first-class? Probably yes. |

(Vector-DB-style candidates have been queued to `audits/_missing-domains.md` as separate domain candidates rather than KGP entity gaps; see "candidates queued" below.)

### Cross-bucket dependencies

- **B2-S1 (canonical ontology owner) gates B1-S1 (module split) and B1-S7 (lifecycle states on `kgp_ontologies`).** If DCG or DATA-AI-PLAT wins canonical ownership, the KGP-ONTOLOGY-ENGINE module's master set shrinks (becomes consumer / embedded_master). Resolve B2-S1 before loading B1-S1.
- **B2-S2 (canonical KG-entity owner) gates B1-S7 in the same way for `kgp_knowledge_graph_entities`.** Resolve together with B2-S1.
- **B2-S3 (prefix vs bare-word) is independent of B2-S1's domain winner but shapes the rename surface.** Only triggers if B2-S1 picks "merge 254 into 742" (collapse path).
- **B2-S4 (module split) directly drives B1-S1's row author shape.** Pick the split first.
- **B1-S7 (lifecycle states) depends on B1-S1 (modules) because lifecycle states with `requires_permission=true` need `domain_module_id` per Rule #14 / M5.**
- **B1-S9 (B10b in-scope) depends on B1-S1 (modules need to exist before per-module FKs can be backfilled).**
- **B1-S10 (F1 legacy skill retirement) depends on B1-S1 + Phase S authoring of replacement per-module skills.**
- **B3-S1, B3-S2 are independent of B2-S* and B1-S*; they can be vetted via focused Phase 0 in parallel with the structural fixes.**

Bucket 1 STRUCTURAL items B1-S2 (event_category PATCH), B1-S4 (users edges), B1-S6 (aliases), B1-S8 (catalog UX), B1-S11/12/13 (APQC tagging) are **independent of every Bucket 2 question** and can be loaded immediately without waiting for the B2-S1 resolution.

### Per-bucket prompts

- **Bucket 1:** "Of the 14 STRUCTURAL + APQC TAGGING items above, which do you want fixed in the next load? Specifically: should I (a) ship the independent items (B1-S2, B1-S4, B1-S6, B1-S8, B1-S11-13) now and defer the module-dependent ones (B1-S1, S3, S5, S7, S9, S10, S14) until you've answered Bucket 2, or (b) wait on the whole Bucket 1 until Bucket 2 lands?"
- **Bucket 2:** "Answer the 4 architectural questions: B2-S1 (canonical ontology owner: KGP / DCG / DATA-AI-PLAT), B2-S2 (canonical KG-entity owner: KGP / DATA-AI-PLAT), B2-S3 (prefix vs bare-word for the KGP-canonical masters), B2-S4 (module split shape: 2 / 3 / 4 modules)."
- **Bucket 3:** "For each Bucket 3 candidate (`kgp_inference_rules`, `kgp_named_graphs`), do you want me to (a) run a focused Phase 0 vendor research on Stardog/TopBraid/Anzo/GraphDB to vet, or (b) eyeball-confirm (name which to treat as Bucket 1 immediately), or (c) skip (treat as out-of-scope for this domain)?"
- **Missing-domain queue:** "Three adjacent markets were queued: VECTOR-DB, RAG-PLATFORM, AGENT-RUNTIME (see `audits/_missing-domains.md`). Triage rules: promote-as-domain / fold-into-existing / reject per the queue file."

### Report-only follow-ups (owed by other domains)

| Item | Owing domain | Owed check | Why this is not KGP's fix |
|---|---|---|---|
| h.221, h.222, h.223 (legacy handoffs using data_objects 254, 255 across MDM / DCG / DATA-AI-PLAT) carry NULL on the cross-side `target_domain_module_id` / `source_domain_module_id`. | DCG (88), MDM (87), DATA-AI-PLAT (129) | B10b on each domain (resolution depends on each domain modularizing first; all three are also pre-modular). | The cross-side module FK is the other domain's responsibility per B10b asymmetry. |
| `ontologies` (254) double-master in DCG + DATA-AI-PLAT is a catalog-wide M7 hard fail visible from any domain's audit; resolution requires deleting one of the two `domain_data_objects` master rows. | DCG and DATA-AI-PLAT (joint) | M7 catalog-wide | The decision (which domain owns canonical) is partly KGP's call (Bucket 2 B2-S1), but the delete fires from the loser-side domain's loader. |
| `knowledge_graph_entities` (255) master in DATA-AI-PLAT with no modules; this is DATA-AI-PLAT's M1 hard fail (which the audit only briefly observed). | DATA-AI-PLAT (129) | M1 + downstream | DATA-AI-PLAT's own audit should pick this up. |
| h.221 outbound `ontology.published` from KGP (138 → 129) but the source-side master `ontologies` (254) is not modeled as a KGP master, only as a DCG / DATA-AI-PLAT master. This is the cross-symptom of B2-S1; once that resolves, this row's source FK is recoverable. | KGP (us) once B2-S1 resolves | B9 / B10b followup | KGP-side, but contingent on Bucket 2. |
| `glossary_terms` (302) master in DCG with no modules in DCG. | DCG (88) | M1 + downstream | DCG's own audit. |

### Candidates queued

`audits/_missing-domains.md` updated with 3 new candidates surfaced from KGP-adjacent vendor research:

- **VECTOR-DB** (Pinecone, Weaviate, Milvus, Qdrant, Chroma): co-deployed with KGP for hybrid retrieval; distinct point-solution market.
- **RAG-PLATFORM** (Vectara, Glean Assistant, Cohere Compass, Pinecone Assistant, Elastic Search AI, NVIDIA NeMo Retriever): RAG-orchestration above the KG store.
- **AGENT-RUNTIME** (LangChain, LlamaIndex, CrewAI, Semantic Kernel, AutoGen, OpenAI Agents SDK): agent orchestration distinct from per-domain agent skills.

Each is queued as `pending-review`; triage per the queue file's rules.

## 2026-05-31, Continuation: B1 technical fixes

Loader: [.tmp_deploy/fix_kgp_b1_technical_2026_05_31.ts](../.tmp_deploy/fix_kgp_b1_technical_2026_05_31.ts). Ran from project root (`c:/dev/domain-map`).

### Applied (4 of 14 B1 items)

| ID | Action | Result |
|---|---|---|
| B1-S2 | PATCH `trigger_events.event_category` on ids 720, 721, 722, 723 | 720 -> `lifecycle`; 721 -> `state_change`; 722 -> `state_change`; 723 -> `lifecycle`. Rule #13 enum violation resolved on all 4 KGP-mastered events. |
| B1-S3 | INSERT `data_object_relationships` row (742 -> 743) | Inserted id 1686: verb `types`, inverse `is_typed_by`, `one_to_many`, `reference`, `owner_side=source`, `is_required=true`. Audit proposed `relationship_kind='structural'` which is not in the enum (`composition`, `reference`, `association`, `inheritance`); `reference` is the platform default for FK-shaped edges and matches every existing row in the table. Audit proposed `cardinality='many_to_one'`; the schema column is `relationship_type` with enum `one_to_one`, `one_to_many`, `many_to_many` (no `many_to_one`), so the row is authored source=ontology, type=`one_to_many` to preserve the same semantics. |
| B1-S4 | INSERT 3 user-edges to KGP masters (Rule #10) | Ids 1687 (users authors 742), 1688 (users reviews 742), 1689 (users asserts 743). All `one_to_many`/`reference`/`owner_side=source`. `is_required=true` on authors+asserts, `false` on reviews (review is optional in the audit-described workflow). |
| B1-S6 | INSERT 10 `data_object_aliases` (synonym) | 742: `vocabulary`, `taxonomy`, `controlled_vocabulary`, `domain_model`. 743: `kg_node`, `entity_instance`, `individual`, `triple`, `node`, `Resource`. Audit-listed `Node` (LPG-spec capitalization) merged with `node` because the unique-key (data_object_id, alias_name) is case-insensitive on the platform side; the W3C `Resource` (capitalized) survives because no lowercase collision exists. All rows `alias_type='synonym'`; `industry_term` / `solution_term` would require an FK that the audit did not pre-specify. |

### B1-S14 disposition

Audit lists B1-S14 as the "inverse edge" companion to B1-S3. The live `data_object_relationships` schema models a relationship as a single row with `owner_side` indicating direction (no second mirrored row exists for any of the ~1,600 existing edges sampled). B1-S14 is therefore not a writable item; it is folded into B1-S3.

### Deferred (10 of 14 B1 items)

| ID | Defer reason |
|---|---|
| B1-S1 | New `domain_modules` rows (3 modules). Out of scope per task envelope ("DEFER: new entities/DMDOs/modules"). Also depends on Bucket 2 B2-S1, S2, S4 resolutions. |
| B1-S5 | B8 outbound edges. Audit explicitly says "Surface to user; load 3 relationship rows once target-side masters are resolvable (the DATA-AI-PLAT side may need to defer)." Surface-for-user marker triggers defer. |
| B1-S7 | Lifecycle states. Gated on B1-S1 (modules must exist to anchor `domain_module_id` on `requires_permission=true` states). |
| B1-S8 | `catalog_tagline` and `catalog_description` drafts. Rule #20 surface-to-user item; not in the technical-apply set. |
| B1-S9 | B10b FK backfill. Gated on B1-S1 (no `domain_modules` rows exist to backfill into). |
| B1-S10 | F1 legacy skill retirement. Audit: "Bundle with the Phase M + Phase S retrofit loader" — depends on B1-S1. |
| B1-S11 | APQC `handoff_processes` for h.221. Audit: "Pending PCF lookup at fix time; confidence medium L3" — PCF not pre-resolved. Live `processes` table does not carry a row with `external_id`/`process_code` matching the audit's cited PCF 10063. |
| B1-S12 | APQC `handoff_processes` for h.222, h.265, h.223. Audit cites PCFs 10564, 10563, 10564. Live `processes` table contains no row with `external_id` equal to any of these IDs (10564 matches no row; "Manage master data" candidates have external_ids 14208, 11740, 14209, 10252, 10829, 10929). Per task rules: "INSERT `handoff_processes` ONLY when audit pre-specifies `handoff_id` + resolvable PCF (verify before insert)." Cannot verify. |
| B1-S13 | APQC `handoff_processes` for h.697, h.698, h.699. Audit text marks all three "plausible L3" / "needs PCF lookup" / "needs PCF lookup". Not pre-resolved. |

### Verification queries

```
GET /trigger_events?id=in.(720,721,722,723)&select=id,event_name,event_category
GET /data_object_relationships?or=(data_object_id.in.(742,743),related_data_object_id.in.(742,743))&select=id,data_object_id,related_data_object_id,relationship_verb,relationship_type,relationship_kind,owner_side
GET /data_object_aliases?data_object_id=in.(742,743)&select=data_object_id,alias_name,alias_type
```

All four return the expected post-load state. No JWT-audience errors during the run.

UI spot-check entry points:
- https://tests.semantius.app/domain_map/trigger_events
- https://tests.semantius.app/domain_map/data_object_relationships
- https://tests.semantius.app/domain_map/data_object_aliases

## 2026-05-31, Audit

### Summary

- Current footprint: domain id 138, **0 `domain_modules` rows** (primary host empty, `domain_module_host_domains` empty), 2 KGP-prefixed masters at the legacy `domain_data_objects` rollup (`kgp_ontologies` 742, `kgp_knowledge_graph_entities` 743), 8 capabilities (KG-ONTOLOGY-AUTHORING, KG-REASONING-INFERENCE, KG-SPARQL-FEDERATION, KG-VIRTUAL-GRAPHS, KG-AI-AGENT-INTEGRATION, KG-NATIVE-STORAGE, plus cross-cutting SEMANTIC-MODELING, OPERATIONAL-DATA-APPS), 8 solutions (7 primary: Stardog, TopBraid EDG, Anzo, Metaphacts, GraphDB, AllegroGraph, Neo4j Knowledge Graph; 1 secondary: Palantir Foundry), 4 KGP trigger_events (event_category now correctly populated), 7 cross-domain handoffs (3 outbound to DATA-AI-PLAT+DCG, 4 inbound from DCG+MDM), 4 `data_object_relationships` (intra + Rule #10 user edges), 10 aliases on the 2 masters, **0 lifecycle states**, 1 legacy domain-level system skill (id 76, `domain_module_id` NULL), 4 `skill_tools` (all platform-covered queries), 5 `business_function_domains` rows (1 owner + 2 contributors + 2 consumers), `catalog_tagline` empty, `catalog_description` empty, 2 of 7 handoffs APQC-tagged (h.223 + h.265 → process 275 "Define and maintain business information architecture", both agent_curated/new).
- Bucket 1 (in-scope, agent fixable): 0 items NEW (all 14 from 2026-05-30 carry forward; 4 applied 2026-05-31, 10 remain).
- Bucket 2 (surface-for-user, judgment): 4 items carry forward unchanged.
- Bucket 3 (Phase 0 pending, speculative): 2 items carry forward unchanged.
- Structural verdict: Same as 2026-05-30. **M1 HARD FAIL remains the dominant blocker.** Every B-band beyond B6/B7/B11 and every E-band check hangs off it. The 4 technical fixes shipped on 2026-05-31 (event_category PATCH, intra-domain edge, 3 user edges, 10 aliases) closed B6, B7, B11, and the B9-event_category sub-finding. M1, A4, B5, B8 outbound, B9b, B10b, B12, F1 remain blocked.

### Structural bands (KGP-side, this audit)

- A1 PASS (7 business-metadata fields populated: crud_percentage=50, business_logic non-empty, min_org_size='40 l <10000', cost_band='$$$', certification_required=false, usa_market_size_usd_m=400, market_size_source_year=2025).
- A2 PASS (8 capabilities, > 3 floor).
- A3 PASS (8 solutions, 7 primary, all coverage_level set).
- A4 **FAIL** (`catalog_tagline` empty, `catalog_description` empty). Rule #20 (no auto-write without explicit approval).
- A5 SKIP (opt-in only; 0 `domain_aliases` is acceptable).
- **M1 HARD FAIL** (zero `domain_modules` rows). Blocks M2/M4/M5/M6/M7 within KGP; blocks all of B at the module layer; blocks E entirely; partially blocks F.
- M7 catalog-wide **HARD FAIL** (separate from KGP-M1): data_object 254 `ontologies` carries `role='master'` rows on BOTH DCG (88) and DATA-AI-PLAT (129) at the legacy `domain_data_objects` rollup. Plus KGP introduced `kgp_ontologies` (742) which mostly duplicates the same concept. Single-master rule violated.
- B1 PASS at `domain_data_objects` (2 master rows on KGP-prefixed objects); **FAIL** at the module layer (zero `domain_module_data_objects` because zero modules).
- B2 PASS (`singular_label`, `plural_label` populated on 742 and 743).
- B3 PASS (both KGP-prefixed; no bare-word arbitration needed).
- B4 not positively re-evaluated (covered by Bucket 2 carry-over).
- B5 not applicable (zero embedded_master rows because zero modules).
- B6 PASS (intra-domain edge 1686 `kgp_ontologies types kgp_knowledge_graph_entities`, one_to_many, reference; loaded 2026-05-31).
- B7 PASS (3 user edges: 1687 authors 742, 1688 reviews 742, 1689 asserts 743; Rule #10 satisfied for both masters).
- B8 outbound **FAIL** (handoffs 697 / 698 / 699 still lack mirror `data_object_relationships` to receiving masters in DATA-AI-PLAT and DCG; deferred per audit 2026-05-30 because target-side masters are not resolvable while DATA-AI-PLAT is also pre-modular).
- B9 PASS (all 4 KGP trigger_events have valid `event_category`: 720 lifecycle, 721 state_change, 722 state_change, 723 lifecycle; Rule #13 enum satisfied).
- B9b vacuously passes (zero modules; no cross-module pair to evaluate).
- B10b **FAIL** (all 7 KGP-touching handoffs still NULL on both `source_domain_module_id` and `target_domain_module_id`; KGP-side gated on M1, cross-side report-only owed by DCG / DATA-AI-PLAT / MDM).
- B11 PASS (10 aliases authored on 742 + 743 covering synonym surface; loaded 2026-05-31).
- B12 **FAIL** (zero `data_object_lifecycle_states` rows; both masters have real workflow but lifecycle authoring is gated on M1 because `requires_permission=true` states need `domain_module_id`).
- C1 PASS (5 `business_function_domains` rows: Data and Analytics owner; AI and Machine Learning + Software Engineering contributors; Research and Development + IT Operations consumers).
- C2 PASS (no per-capability override needed).
- E1-E5 vacuously pass (single-module domains exempt; KGP has zero modules, gated on M1).
- F1 **FAIL** (legacy domain-level skill 76 with `domain_module_id` NULL; gated on M1 + Phase S retrofit).
- F2 cannot be evaluated (zero modules).
- F3 PASS for the legacy skill (4 `skill_tools` rows).
- F4 PASS (all 4 tools are `query` with `data_object_id` set: 254, 255, 742, 743).
- F5 PASS (legacy skill, computed against the 4 platform-covered query tools).
- H1 **PARTIAL** (2 of 7 handoffs APQC-tagged: h.223 + h.265 → process 275 "Define and maintain business information architecture" (external_id 20770), both `proposal_source='agent_curated'`, `record_status='new'`; 0 `record_status='approved'` — catalog-quality headline). Remaining 5 untagged: h.221, h.222, h.697, h.698, h.699 (Bucket 1 B1-S11/12/13 from 2026-05-30 still pending; PCF lookup blocker).

### Bucket 1 — In-scope confirmed gaps (carry-forward from 2026-05-30)

All 10 pending items from 2026-05-30 remain. No new Bucket 1 items surfaced this audit; the 4 fixes shipped on 2026-05-31 resolved B1-S2 (event_category), B1-S3 (intra edge), B1-S4 (user edges), and B1-S6 (aliases); B1-S14 was folded into B1-S3 by the loader. Remaining: B1-S1, B1-S5, B1-S7, B1-S8, B1-S9, B1-S10, B1-S11, B1-S12, B1-S13. See state.yaml b1a (independent of Bucket 2) and b1b (blocked).

### Bucket 2 — Surface-for-user (carry-forward from 2026-05-30)

All 4 architectural questions remain unanswered: B2-S1 (canonical ontology owner: KGP / DCG / DATA-AI-PLAT), B2-S2 (canonical KG-entity owner: KGP / DATA-AI-PLAT), B2-S3 (prefix vs bare-word once B2-S1 resolves), B2-S4 (module split shape: 2 / 3 / 4 modules). See state.yaml b2.

### Bucket 3 — Phase 0 pending (carry-forward from 2026-05-30)

Both speculative candidates remain: B3-S1 `kgp_inference_rules` master (Stardog / GraphDB / AllegroGraph rules surface), B3-S2 `kgp_named_graphs` or `kgp_graph_partitions` embedded master (RDF triple-store flagship pattern; access-control unit). See state.yaml b3.

### Decisions

No user decisions captured this audit (Validate b1 pass only).

### Fixes applied

None this audit (Validate b1 is read-only).

### `domains.notes` pointer

Not updated this audit (no user-approved wording supplied; Rule #15 / Rule #20 applies).

## 2026-06-02 Audit (modularization)

### Summary

KGP went from M1 HARD FAIL (zero `domain_modules`) to a clean 2-module build. The
2026-05-30 audit proposed a 3-module split (ONTOLOGY-ENGINE, QUERY-FEDERATION,
AGENT-INTEGRATION), but KGP has only 2 in-domain masters (`kgp_ontologies` 742,
`kgp_knowledge_graph_entities` 743). A 3-module split would have stranded at least one
module with no master (an empty-master module). This pass therefore built EXACTLY 2 full
modules, one master each, splitting all 8 capabilities across them. This resolves
B1B-M1-MODULES (under the 2-module shape of B2-S4 option (b)) and B1B-B5-EMBEDDED-MASTERS
(both masters land at `role=master`, no embedded_master shells were needed because no
module is master-less). Scope was modules + capability links + master assignment ONLY; no
new data_objects, capabilities, lifecycle states, skills, tools, handoffs, or relationships
were created (those remain deferred per the b1b/b3 carry-forwards).

### Modules built

| id | code | kind | capabilities | master (role/necessity) |
|---|---|---|---|---|
| 270 | KGP-ONTOLOGY-ENGINE | full | KG-ONTOLOGY-AUTHORING (352), KG-REASONING-INFERENCE (353), KG-NATIVE-STORAGE (357), SEMANTIC-MODELING (197) | kgp_ontologies (742) master/required |
| 271 | KGP-GRAPH-QUERY-APPS | full | KG-SPARQL-FEDERATION (354), KG-VIRTUAL-GRAPHS (355), KG-AI-AGENT-INTEGRATION (356), OPERATIONAL-DATA-APPS (201) | kgp_knowledge_graph_entities (743) master/required |

Capability allocation rationale: module 270 is the modeling/reasoning/storage tier where
ontologies are the natural master (authoring, inference, native graph persistence, and the
cross-cutting semantic-modeling capability all read or write the ontology). Module 271 is
the query/operational tier where KG entities are the natural master (federated SPARQL,
virtual-graph translation, vector+symbolic agent retrieval, and operational data apps all
traverse and write back graph entities).

### M7 master pre-check (catalog-wide, mandatory)

Before writing `role=master` on either master, queried
`/domain_module_data_objects?data_object_id=eq.<id>&role=eq.master`. Both 742 and 743
returned zero existing master rows, so both were assigned `master` (no demotion to
embedded_master needed). Post-load re-verification: 742 has exactly 1 master row (module
270); 743 has exactly 1 master row (module 271). M7 single-master holds in-domain AND
catalog-wide. (Note: the legacy `domain_data_objects` rollup double-master on the
sibling bare-word objects 254 `ontologies` / 255 `knowledge_graph_entities` across
DCG / DATA-AI-PLAT remains a separate catalog-wide M7 item owned by B2-S1 / B2-S2; this
pass did not touch those rows and the KGP-prefixed masters 742/743 are distinct
data_object ids.)

### Verification (live, post-load)

- 2 `domain_modules` rows on domain 138, both `module_kind=full`. M1 PASS.
- 8/8 capabilities placed in exactly one module each (M4 PASS, no unplaced).
- Each module: 4 capabilities (>= M6 floor) + 1 master data_object (no empty module).
- Each master appears exactly once catalog-wide (M7 PASS).
- Loader re-run confirmed idempotent (second run inserted nothing).

### Capabilities lacking a backing master (flagged b3)

KGP has 8 capabilities but only 2 in-domain masters, so most capabilities are realized
without a dedicated master record. Two of these gaps were already vendor-evidenced in the
2026-05-30 audit and carry forward as concrete master candidates:

- KG-REASONING-INFERENCE (353) has no rule/inference master. Candidate
  `kgp_inference_rules` (B3-S1; Stardog / GraphDB / AllegroGraph all expose a 1st-class
  rules surface). Proposed module: KGP-ONTOLOGY-ENGINE (270).
- KG-NATIVE-STORAGE (357) + KG-SPARQL-FEDERATION (354) have no partition/access-control
  master. Candidate `kgp_named_graphs` (B3-S2; named graphs are the RDF triple-store
  access-control and partitioning unit). Proposed module: KGP-ONTOLOGY-ENGINE (270) or
  split across both.

The remaining master-less capabilities are KG-VIRTUAL-GRAPHS (355, mapping-config shaped;
arguably a `kgp_virtual_graph_mappings` candidate, not yet vendor-vetted),
KG-AI-AGENT-INTEGRATION (356, operates over 743 plus embeddings, no own master needed),
SEMANTIC-MODELING (197) and OPERATIONAL-DATA-APPS (201) (cross-cutting realizations that
read the two masters rather than introducing their own). These are NOT filled this pass;
new-master authoring is out of scope. See state.yaml b3 for the carried candidates.

### Deferred / unchanged (out of scope this pass)

Per-module system skills (Rule #17 / F2 / F3), module + domain catalog UX copy (M8 / A4),
lifecycle states (B12), B8 outbound mirror relationships, B10b module-FK backfill on the 7
KGP-touching handoffs, F1 legacy skill (76) retirement, and APQC handoff tagging all remain
open. Several were gated on M1 and are now UNBLOCKED by this build (skills, lifecycle,
B10b backfill, F1 retirement) and move to b1a; the rest stay b1b/b3. See state.yaml.

## 2026-06-06 - b1a execution

Loader: [.tmp_deploy/fix_kgp_b1a_2026_06_06.ts](../.tmp_deploy/fix_kgp_b1a_2026_06_06.ts). Ran
from project root (`c:/dev/domain-map`). Tenant confirmed (`adenin`,
`api_baseurl=https://adenin.semantius.ai`). No JWT-audience errors. All inserts omitted
`record_status` (DB default `new`); no `notes` columns written.

### B1A-SYSTEM-SKILLS - DONE

Authored the 2 module-scoped system skills (Rule #17), re-allocated skill 76's 4 query tools
by module, added the mutate + side_effect tool floor per master, wrote module M8 catalog copy,
and retired legacy skill 76.

| Table | Action | Row id(s) | Prior value (for DELETE) |
|---|---|---|---|
| `tools` | INSERT `publish_ontology` (mutate, data_object_id=742, coverage_tier=platform) | 1668 | n/a (new) |
| `tools` | INSERT `merge_kg_entity` (mutate, data_object_id=743, coverage_tier=platform) | 1669 | n/a (new) |
| `skills` | INSERT `kgp_ontology_engine_agent` (system, domain_id=138, domain_module_id=270) | 322 | n/a (new) |
| `skills` | INSERT `kgp_graph_query_apps_agent` (system, domain_id=138, domain_module_id=271) | 323 | n/a (new) |
| `skill_tools` | INSERT skill 322 -> tools 111 (req), 820 (req), 1668 (req), 913 notify_person (opt) | 2910, 2911, 2912, 2913 | n/a (new) |
| `skill_tools` | INSERT skill 323 -> tools 386 (req), 821 (req), 1669 (req), 913 notify_person (opt) | 2914, 2915, 2916, 2917 | n/a (new) |
| `skill_tools` | DELETE skill 76's 4 rows (tools repointed to new skills) | 641 (tool 111), 642 (tool 386), 982 (tool 820), 983 (tool 821) | skill_id=76, requirement_level=required, record_status=new |
| `skills` | DELETE legacy skill 76 `kgp-system` (F1) | 76 | skill_name='kgp-system', skill_type='system', domain_id=138, domain_module_id=NULL, record_status='new', description='System skill for Knowledge Graph Platform — runtime workflows over the domain's master data, derived from masters + cross-domain handoffs.' |
| `domain_modules` | PATCH 270 catalog_tagline + catalog_description (M8, empty-guard; both were empty) | 270 | catalog_tagline='', catalog_description='' |
| `domain_modules` | PATCH 271 catalog_tagline + catalog_description (M8, empty-guard; both were empty) | 271 | catalog_tagline='', catalog_description='' |

Tool-floor note: lifecycle states / workflow-gate (transition) tools were NOT authored
because B12 lifecycle modeling is gated on the user_decision B2-S6 (b1b). The floor shipped is
query (re-allocated) + a representative mutate per master + the `notify_person` side_effect
abstraction (channel-vs-capability default). Both new mutate tools are domain-specific
(`publish_ontology`, `merge_kg_entity`), deduped by `tool_name` against live `/tools` before
insert (neither existed). `notify_person` (913, platform) re-used, not re-created.

Both system skills score strict 100% / operational 100% (every linked tool is
`coverage_tier='platform'`). F1/F2/F3/F4/F5 now pass for KGP modules 270 and 271.

Module-grain M8 catalog copy written straight into the empty fields per revised Rule #20
(buyer voice, no vendor/product names, no em-dashes). The row `record_status='new'` carries the
review signal. Domain-level A4 (`domains` 138 catalog_tagline/description) was NOT written: it
stays gated on the user decision B2-S5 (b2). A typo in module 270's just-authored
`catalog_description` ("trust what published") was corrected in-pass to "trust what gets
published" (same-pass draft fix, not a Rule #20 overwrite of approved copy).

### B1A-EVENT-MODULE-FK - DONE

PATCH `trigger_events.domain_module_id` (all 4 were NULL; event_category unchanged, already
correct):

| id | event_name | prior domain_module_id | new domain_module_id |
|---|---|---|---|
| 720 | kgp_ontology.imported | NULL | 270 |
| 721 | kgp_ontology.validation_failed | NULL | 270 |
| 722 | kgp_knowledge_graph_entity.merged | NULL | 271 |
| 723 | kgp_knowledge_graph_entity.created | NULL | 271 |

### B1A-B10B-HANDOFF-FK - DONE

PATCH the resolvable KGP-side module FKs (all were NULL before). Cross-side FKs remain NULL by
design (owed by neighbor domains per b1b B1B-B10B-CROSS-SIDE).

| handoff_id | direction | column patched | prior value | new value |
|---|---|---|---|---|
| 221 | outbound (KGP->DATA-AI-PLAT) | source_domain_module_id | NULL | 270 |
| 697 | outbound (KGP->DATA-AI-PLAT) | source_domain_module_id | NULL | 270 |
| 698 | outbound (KGP->DCG) | source_domain_module_id | NULL | 271 |
| 699 | outbound (KGP->DCG) | source_domain_module_id | NULL | 271 |
| 222 | inbound (MDM->KGP) | target_domain_module_id | NULL | 271 |
| 223 | inbound (DCG->KGP) | target_domain_module_id | NULL | 270 |

Mapping followed the b1a action text (publishing/consuming master -> module map: ontology
payloads -> 270; KG-entity payloads -> 271). Handoff 265 (DCG glossary_term.published into KGP,
payload glossary_terms 302) was intentionally NOT patched: it is listed under b1b
B1B-B10B-CROSS-SIDE / has no clean KGP master, and the b1a action did not include it.

### B1A-APQC-H221 - DONE (already satisfied)

`handoff_processes` row for handoff 221 -> process 275 (Define and maintain business
information architecture, external_id 20770), proposal_source=agent_curated, role=implements,
record_status=new already existed as id 971 (created in a prior pass). Idempotent check matched
it; no duplicate inserted. Item is resolved.

### Verification (live, post-load)

- `skills` for domain 138: exactly 2 system skills, both module-anchored (322->270, 323->271);
  legacy skill 76 absent (F1 pass, F2 pass).
- `skill_tools` for 322/323: 4 each; F3 pass. F4 invariant holds (query/mutate carry
  data_object_id, notify_person side_effect carries NULL).
- `trigger_events` 720/721 -> module 270; 722/723 -> module 271.
- `handoffs` KGP-side module FKs set as tabled above; cross-side still NULL (report-only).
- `domain_modules` 270/271 catalog_tagline + catalog_description now non-empty (record_status
  carries review signal).
- `handoff_processes` h.221 row 971 present.

### Skipped / not executed this pass

- Domain-level A4 catalog copy on `domains` 138 — gated on user decision B2-S5 (b2); left empty.
- All b1b items (B1B-B12-LIFECYCLE gated on B2-S6, B1B-B8-OUTBOUND-EDGES, B1B-B10B-CROSS-SIDE,
  B1B-APQC-H222-H697-H698-H699, B1B-APQC-H265-NOTE) and b3 candidates — out of this pass's scope.

---

## 2026-06-06 - Per-domain-skill restoration (SUPERSEDED 2026-06-06: per-domain-skill restoration)

The per-module `system` skill grain is RETIRED (plans/per-domain-skill-restoration.md).
Any open item that says "author/split a per-module system skill", "one system skill per
domain_modules row", "add/PATCH skill_tools", or "<module>_agent per module" is CANCELED.
New model: tool requirements live on `domain_module_tools` (author tools onto modules); each
domain has exactly ONE domain-grain `system` skill (domain_id set, domain_module_id null) that
DERIVES its toolset; starters keep their own module-anchored skill; FULL modules carry no skill;
cross-domain value streams use `process_tools`. `skill_tools` is dropped. Per-module tool
re-authoring is tracked in audits/_modularization-backlog.md. Do NOT author per-module skills.
