# Deprecated schema

Catalog schema that should NOT be used for new work and is slated for removal. Recorded here so a
future contributor does not reach for it.

## `domain_module_host_domains`: REMOVED (table dropped; host set is now DERIVED)

Recorded 2026-06-16 (deprecation). Removed 2026-06-28.

**Decision (executed):** the table is gone. A module's host-domain set is now DERIVED, not stored:
for a STARTER, its host domains are the domains that canonically master the entities it embeds
(`embedded_master`), minus the starter's own primary domain. FULL modules host nowhere. The single
derivation lives in `deriveHostDomains(dmdo, modules)` in [scripts/lib/catalog.ts](../../../scripts/lib/catalog.ts);
every reader (emit_domain_map, generate_blueprints, build_catalog, emit_skill_spec, the coverage
rollups) consumes it. **Do not re-introduce the table, do not author host rows, do not read it.**

**Authoring consequence:** a cross-domain starter still homes on its own `domain_kind='bundle'`
domain via `domain_modules.domain_id`. It no longer declares its touched markets anywhere — they
fall out of its `embedded_master` rows automatically. Nothing to author beyond the embeds.

**Rendering consequence:** a starter does NOT appear in a host market's module grid. A starter that
embeds CLM's `legal_contracts` renders only on its own (bundle) domain page; CLM's cross-market
link to it is carried by `related_domains` (the master/touch relatedness rule), not by listing the
starter as a CLM module. This fixed the long-standing "why is REAL-ESTATE-AGENT a CLM module" bug.

**What it was:** a junction declaring "additional domains a module is hosted on" beyond
`domain_modules.domain_id` (the primary host). It was intended for a single module SHARED across
multiple domains' deployments.

**Why obsolete (evidence, verified live 2026-06-16):**

- The intended pattern (one shared cross-domain module) does not match how cross-domain reuse
  actually works, so it was never adopted. Knowledge is three per-domain modules, `ITSM-KNOWLEDGE`
  (mod 43), `HRSD-KNOWLEDGE` (77), `CSM-KNOWLEDGE` (114), that all share the SAME entity,
  `knowledge_articles` (id 51). They are NOT different shapes: the catalog deliberately unifies the
  entity (see the "audience filtering, not duplicated-per-audience" rule in SKILL.md). They differ
  by (a) ROLE on `knowledge_articles`: ITSM `master`, HRSD `embedded_master`, CSM `contributor`; and
  (b) domain-specific companions: HRSD adds `case_categories`, CSM adds `customer_cases`. A single
  `host_domains`-spanning module CANNOT express a different role, or different companions, per host
  domain (a module has ONE fixed `domain_module_data_objects` set), so separate per-domain modules
  are structurally required. THIS is the core reason `host_domains` is the wrong tool: it assumes an
  identical module replicated across domains, but real cross-domain reuse needs a per-domain role +
  per-domain neighbors. ("KNOWLEDGE-MGMT spans ITSM/CSM/HRSD/LSD" is a CAPABILITY via
  `capability_domains`, not a module.)
- Every live row is either derivable or noise:
  - The only meaningful users are the starter bundles (REAL-ESTATE-AGENT, HVAC-SVC-MGMT,
    IT-OPS-STARTER), where `host_domains` equals the owner-domains of the module's `embedded_master`
    entities. Rule #19 forces every domain-owned dependency of a starter to be `embedded_master`, so
    that set is fully derivable from `domain_module_data_objects`. Redundant.
  - The only other users are 4 PAYROLL full modules (`PAYROLL-RUN`, `PAYROLL-TAX-COMPLIANCE`,
    `PAYROLL-EARNINGS-DEDUCTIONS`, `PAYROLL-EMPLOYEE-PAY-STATEMENTS`) whose host row points at PAYROLL
    (domain 55), which is their OWN `domain_id`. Self-host noise, a data-quality slip.

**The tension it never resolved:** a module hosting on N domains sits against the "each module has one
home domain / clean domain-to-modules tree" model, and the catalog's per-domain duplication is the
de-facto rejection of the shared-module shape. Note: it does NOT break a module's atomic
installability (a shared unit is still one installable unit); the tension is single-ownership and
hierarchy clarity, not installability.

**Removal path (DONE 2026-06-28):**

1. ✅ Migrated every reader (emit_domain_map, generate_blueprints, build_catalog, emit_skill_spec,
   coverage_rollup, m11_rollup_probe, the skill_grain preflights) to derive the host set from the
   module's `embedded_master` owner-domains via `deriveHostDomains(dmdo, modules)`. emit_domain_map
   additionally stopped folding host modules into a domain's module grid (starters render on their
   own bundle domain only).
2. ✅ Deleted all rows (the 4 PAYROLL self-host rows + the starter rows + the orphan HVAC→FIN row).
3. ✅ Dropped the `domain_module_host_domains` entity.

For a bundle's "which markets it composes," rely on its `embedded_master` rows (that is exactly what
`deriveHostDomains` reads), never a stored table.
