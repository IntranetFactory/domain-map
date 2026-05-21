# Candidate domains

Domains that are under consideration but not yet loaded into the live `domain_map` module. Each entry should record:

- **Code** — proposed `domain_code` (uppercase, dash-separated)
- **Why a candidate** — the evidence that meets the point-solution-market test (rule #2)
- **Why not yet** — what's blocking promotion (market too young, overlap with existing domains, etc.)
- **Adjacent existing entities** — what's already in the catalog that would need to be re-linked when promoting

Promotion path: when a candidate gets approved, run a Phase A+B+C load and remove its entry from this file.

---

*No active candidates.*

---

## Promotion history

- **2026-05-21** — `METRICS-LAYER` (Metrics Layer / Headless BI) promoted. 6 primary vendors loaded (AtScale, Cube Cloud, dbt Semantic Layer, Lightdash, Honeydew, GoodData.CN) plus Looker as `secondary`. `SEMANTIC-MODELING` extended cross-cutting to METRICS-LAYER.
- **2026-05-21** — `KGP` (Knowledge Graph Platform) promoted. 7 primary vendors loaded (Stardog, TopBraid EDG, Anzo, Metaphacts, GraphDB, AllegroGraph, Neo4j Knowledge Graph) plus Palantir Foundry as `secondary`. `SEMANTIC-MODELING` and `OPERATIONAL-DATA-APPS` extended cross-cutting to KGP. `ontologies` and `knowledge_graph_entities` co-mastered by KGP + DATA-AI-PLAT.
