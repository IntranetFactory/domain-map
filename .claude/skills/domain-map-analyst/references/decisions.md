# Catalog-shape decisions log

Append-only log of catalog-shape calls the user and I have explicitly made, so future audits and new market loads don't re-litigate them.

## When to read this file

- **Before proposing a module split, role split, or capability cut.** Check whether the question has already been settled. A proposal that contradicts a logged decision is a regression; surface the decision and either follow it or argue explicitly for revisiting.
- **When research surfaces a "this looks like its own market / module / capability" instinct.** Cross-check against logged precedents before drafting rows.
- **When the user pushes back with "didn't we decide X already."** That's the signal to consult this file first, not to re-derive from live state.

## When NOT to read this file

- Routine audits (every band check has its own query against live state; decisions here are interpretive, not authoritative facts).
- Loader execution (loaders read schema, not policy).
- Per-row research (data_object names, alias drafts, handoff payloads - read SKILL.md and live state).

This file is **not** loaded on every skill invocation. It is lazy, like `references/jwt-routing-incidents.md` and `references/note-pollution-incidents.md`. Consult it on the triggers above.

## Entry format

```
### YYYY-MM-DD - short title
**Context.** What triggered the decision (one or two sentences).
**Decision.** The call, stated as a rule future-me can apply.
**Reasoning.** Why this and not the alternatives.
**Scope.** Where the decision applies (domain, entity, catalog-wide).
**Status.** active / superseded by [later date] / pending user confirmation.
```

Entries are dated absolute (never "yesterday" / "last week"). Append new entries at the bottom of the relevant section. Never delete; supersede by writing a new entry that links the prior one.

---

## Active decisions

### 2026-05-26 - Module-split criterion for shared data_objects (OKR test case)

**Context.** Drafting the WORK-MGMT module split (`okr_objectives` is multi-mastered by 4 domains). Two readings of the catalog's "module" concept came into tension:

- *Reading 1 - deployable autonomy.* A module is something you can deploy standalone. By this test, OKR fails inside WORK-MGMT (Goals features link to tasks; not autonomous).
- *Reading 2 - marketed product surface.* A module is what reference vendors carve as a distinct surface. By this test, OKR passes for WORK-MGMT (Asana Goals, Monday Goals, ClickUp Goals, Workfront Goals are all separately-marketed features).

User pointed out the two readings are not in conflict: `embedded_master` resolves them.

**Decision.** Module decomposition is driven by **vendor-marketed-surface evidence** (Reading 2). Deployable-autonomy (Reading 1) is handled mechanically by the `embedded_master` pattern, not by merging modules. A module that depends on an upstream master ships an `embedded_master` row on that data_object for the standalone case; the runtime canonical-master-demotion handles the holistic case so no silos form.

Concretely for `okr_objectives`:
- **WORK-MGMT** - Asana/Monday/ClickUp/Workfront/Wrike all carve Goals as a marketed surface ⇒ `WORK-MGMT-GOALS-OKR` is its own module, masters okr_objectives, embedded_masters work_items for KR-to-task linking.
- **TALENT-MGMT** - Lattice/15Five/Culture Amp bundle Goals into the performance-review surface ⇒ folds into `TALENT-PERFORMANCE-MGMT` (existing).
- **SEM** - Workboard/Gtmhub/Betterworks ARE the OKR-first product; OKR is the vehicle for strategy, not a sub-feature ⇒ folds into strategy/execution modules (existing).
- **SPM** - TBD when SPM is modularized; check Planview/ServiceNow SPM/Clarity marketing.

**Reasoning.**

- Reading 1 was driving me toward larger, fewer modules because I treated standalone deployability as a packaging constraint. It isn't. `embedded_master` is the catalog mechanic that lets a small module reach into upstream masters when deployed alone, then defer when the canonical master is co-installed. The pattern is designed for exactly this.
- Once Reading 1 is solved mechanically, the remaining constraint on module granularity is workflow coherence + vendor evidence. WORK-MGMT vendors *do* carve Goals; TALENT-MGMT vendors *don't*. The catalog should mirror the actual market, not impose a uniform "OKR folds in" rule across all hosts.
- This implies the catalog should be **more willing to carve modules along vendor-marketed-surface lines** generally, not less. `embedded_master` removes the silo worry that pushed toward larger modules.

**Scope.** Catalog-wide. Applies to every shared data_object across host domains. The rule: check vendor marketing for each host individually, decide per host.

**Status.** active. Supersedes the earlier-this-session "OKR is not its own module" call that misapplied the TALENT-MGMT/SEM precedent across all hosts.

---

### 2026-05-26 - WORK-MGMT module split

**Context.** WORK-MGMT (id=135) has 9 capabilities, 4 masters, 0 modules. Rule #14 / M2 requires ≥2 modules.

**Decision.** Split into 2 modules:

| Module | Masters | Embedded_masters | Capabilities |
|---|---|---|---|
| `WORK-MGMT-TASK-EXEC` | work_items, work_projects, work_automations | - | WORK-TASK-MGMT, WORK-DEPS-SCHED, WORK-CAPACITY, WORK-WORKFLOW-AUTO, WORK-DASHBOARDS, APPROVAL-WORKFLOW, CREATIVE-REVIEW |
| `WORK-MGMT-GOALS-OKR` | okr_objectives | work_items (for KR-to-task linking when standalone) | WORK-GOALS-OKR, GOAL-MGMT |

**Install on-ramp.** `WORK-MGMT-TASK-EXEC` is the SEO entry point and the natural first install; `WORK-MGMT-GOALS-OKR` is the natural extension. (The prior `domain_starter_modules` editorial-ordering junction was retired 2026-05-26 per [SKILL.md Rule #19](../SKILL.md); the install order lives as prose on the relevant decision now, not as a catalog row.)

**Reasoning.** Follows the module-split criterion above. Asana/Monday/ClickUp/Workfront/Wrike all carve Goals as a separately-marketed surface ⇒ Reading 2 passes. The embedded_master on work_items handles the standalone-deployment case ⇒ Reading 1 passes via mechanics, not via merging.

CREATIVE-REVIEW stays under TASK-EXEC because WORK-MGMT masters no creative-specific data_objects; the capability rides on top of work_items. If Adobe Workfront's creative-ops surface becomes a recurring research target, revisit and consider a third `WORK-MGMT-CREATIVE-OPS` module.

**Status.** active. Implementation pending: Phase M load (modules + capability links + module-level data_object roles), then Phase B12 (lifecycle states for work_items/work_projects/work_automations anchored to TASK-EXEC; the existing okr_objectives lifecycle rows currently anchored to TALENT-PERFORMANCE-MGMT can stay there per the multi-master pattern, but WORK-MGMT-GOALS-OKR will need its own state rows for the team-execution OKR cadence).

