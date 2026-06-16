# Deprecated schema

Catalog schema that should NOT be used for new work and is slated for removal. Recorded here so a
future contributor does not reach for it.

## `domain_module_host_domains`: DEPRECATED, do not use, remove in future

Recorded 2026-06-16.

**Decision:** do not author new `domain_module_host_domains` rows; migrate the readers off it and
remove the table.

**What it is:** a junction declaring "additional domains a module is hosted on" beyond
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

**Removal path (separate cleanup, NOT done):**

1. Migrate the emitters that READ it (e.g. `emit_domain_map` host-accumulation) to derive the host set
   from the module's `embedded_master` owner-domains. It is currently the wired source, so it is NOT
   free to drop until readers are rewired.
2. Delete the 4 PAYROLL self-host rows.
3. Drop `domain_module_host_domains`.

Until removed: for a bundle's "which markets it composes," rely on its `embedded_master` rows, not on
this table.
