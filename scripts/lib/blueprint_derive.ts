// scripts/lib/blueprint_derive.ts
//
// The derivation rules behind a semantic blueprint, separated from rendering. Everything a
// blueprint shows in sections 2-9 that is COMPUTED (write tiers, ON DELETE modes, lifecycle gate
// codes, permissions, business rules, baseline roles, the permission hierarchy, RACI realization,
// wired processes, functional ownership) is derived here; scripts/generate_blueprints.ts only
// formats it as markdown.
//
//   makeDeriveCtx(index, all)          → DeriveCtx        (the catalog the rules read)
//   deriveModuleModel(module, ctx)     → BlueprintModel   (one emitted unit)
//   deriveBlueprintModel(modules, ctx) → BlueprintModel   (multi-module scope, same body shape)
//
// Pure in-memory and importable with no side effects: no catalog fetch, no file IO, no console
// output. Callers (the generator, offline test fixtures, later invariant checks) build a DeriveCtx
// from an already-loaded CatalogIndex + AllRelationships.

import {
  loadModuleCatalog,
  type AllRelationships,
  type CatalogIndex,
  type DataObject,
  type Domain,
  type ModuleCatalog,
  type ModuleRow,
  type ScopeRow,
} from "./catalog";
import { eventMatchesState } from "./health/logic_b";
import { fkHolderSide } from "./health/logic_sam";

// ---------- context ----------

// The catalog the derivation rules read. Replaces the module globals generate_blueprints.ts used
// to close over (dataObjectsById, modulesById, usersId via `index`; the RACI / process / function
// maps via `all`), so every rule runs against an explicit, swappable catalog.
export type DeriveCtx = {
  index: CatalogIndex;
  all: AllRelationships;
};

export function makeDeriveCtx(index: CatalogIndex, all: AllRelationships): DeriveCtx {
  return { index, all };
}

// ---------- naming helpers ----------

export function moduleSlug(code: string): string {
  // ATS-CANDIDATE-CRM → ats-candidate-crm (used as permission prefix per §4.6)
  return code.toLowerCase().replace(/_/g, "-");
}

// A display label as a snake_case permission / rule token: lowercase, every run of characters
// other than a-z / 0-9 (spaces, hyphens, slashes, parentheses) collapsed to one `_`, no leading or
// trailing `_` (`Voluntary Self-Identifications` -> `voluntary_self_identifications`).
export function snakeToken(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function entitySingularToken(o: DataObject): string {
  return snakeToken(o.singular_label);
}

export function entityPluralToken(o: DataObject): string {
  return snakeToken(o.plural_label);
}

// ---------- types ----------

// `includedInAdmin` is the §8.1 `included in :admin?` cell, and the §9 hierarchy carries a
// `<slug>:admin` -> code row exactly for the gate / override rows where it is true. `highRisk` is set
// on `workflow-gate (lifecycle)` rows only (see GateModel).
export type Permission = { code: string; tier: string; description: string; includedInAdmin: boolean; highRisk?: boolean };
export type BusinessRule = { name: string; dataObject: string; sourceFlag: string; intent: string };

// B2 (plan-2-entity-type-tiers.md): the per-entity write tier, derived from `entity_type`.
// Read is uniformly `:read`; the write tier selects which existing module baseline governs
// mutations. No new permission is minted: `:manage` / `:admin` already exist per module.
// `endpointEntityTypes` matters only for junctions (admin when a linked endpoint is a catalog).
// `unclassified` (and null / unknown) map to `:manage`, flagged pending (m2). This is now
// defense-in-depth only: the emitter HARD-aborts any module carrying an unclassified entity_type
// (B13 gate in emitBlueprint), so a real 3.1 file never ships a pending tier from a missing class.
// The graceful default is kept so non-emit callers (e.g. audits) can derive a tier without crashing.
export type WriteTier = { read: string; write: string | null; pending: boolean };

// B4 (plan-2-entity-type-tiers.md): the resolved ON DELETE mode + Semantius FK format for a link
// with both entities in the emitted scope (§5.1 / §5.2), derived from (relationship_kind,
// is_required, relationship_type). A many_to_many link has no field on either entity, so its
// values describe the two legs of its junction table, always `parent` + `cascade`. A link to an
// entity outside the scope (§5.3) has neither value: its field is only proposed at deploy.
// `owner_side` names the PARENT endpoint (the lifecycle owner, the cascade root, the "one" side of
// a one_to_many); the FK column lives on the other endpoint, the child. It does not change the
// mode/format. The applied ON DELETE lands in the tenant DB at deploy.
export type DeleteMode = { mode: string; fkFormat: string };

// One lifecycle state's gate, as resolved by deriveGate. `gateModule` is the canonical realizing
// module (or the in-scope master's module on the NULL-realizer fallback); `code` carries the
// prefix actually minted, which differs from gateModule's slug only when `reprefixed`.
export type DerivedGate = { code: string; gateModule: ModuleRow; verbSegment: string; obj: DataObject; reprefixed: boolean };

// One minted `workflow-gate (lifecycle)` permission and every lifecycle state mapped to it. Several
// states can share one code (a permission_verb_override collision, made more common by re-prefixing,
// e.g. candidates.hired + job_applications.hired -> `<unit>:hire_candidate`); the permission is
// minted once and its description names every mapped state. `highRisk` is true when any mapped
// state is `is_high_risk` (the architect checker reads a gate as high-risk from any §7 row deriving
// it). `processIds` are the distinct `process_id`s of the mapped states; empty means the gate is
// wired to no process (`⚠ no process`), so no RACI Accountable row can hold it.
export type GateModel = {
  code: string;
  states: { dataObject: DataObject; state: any }[];
  highRisk: boolean;
  processIds: number[];
};

export type BaselineRole = { code: string; grant: string };
export type HierarchyEdge = { including: string; included: string };
export type RaciGrant = { actor: string; actorKind: string; raci: string; process: string; realization: string };
export type FunctionalOwnership = { responsibility: string; func: string; defaultRole: string; defaultTier: string };
export type WiredProcess = { name: string; key: string; code: string; pcfId: string; level: string; description: string };

// ---------- blueprint model ----------

// §2 / §3: one scope row plus its derived write tier. Kept in catalog (scopeRows) order; each
// section applies its own display sort.
export type EntityModel = ScopeRow & { writeTier: WriteTier };

// §5.1 / §5.2: one relationship row plus its resolved ON DELETE mode.
export type RelationshipModel = { edge: any; deleteMode: DeleteMode };

export type RelationshipsModel = {
  all: any[]; // every edge touching the scope (the §2 mermaid input)
  intra: RelationshipModel[]; // §5.1
  userRels: RelationshipModel[]; // §5.2
  outgoing: any[]; // §5.3a: this blueprint's entity points to the external entity
  incoming: any[]; // §5.3b: the external entity points to this blueprint's entity
};

// §6.2 / §6.3: one handoff row (trigger_events + data_objects joined) with its endpoints resolved.
// A null module means a domain-grain endpoint; a null domain means a dangling domain id.
// `sourceModule` / `targetModule` are the endpoints §6 shows: per architect Writing Convention 10,
// an endpoint that is the absent catalog owner of an entity this unit carries as `embedded_master`
// is shown as the installing unit (it realizes that entity standalone). `catalogSourceModule` /
// `catalogTargetModule` keep the endpoints the catalog row names.
export type HandoffModel = {
  row: any;
  sourceModule: ModuleRow | null;
  targetModule: ModuleRow | null;
  catalogSourceModule: ModuleRow | null;
  catalogTargetModule: ModuleRow | null;
  sourceDomain: Domain | null;
  targetDomain: Domain | null;
};

// §7: one state with the gate deriveGate resolves against the whole emitted scope. `gate` is
// computed for every state (requires_permission or not) because the realizing-module column
// reads `reprefixed` either way.
export type LifecycleStateModel = { state: any; gate: DerivedGate | null };

// §7: one entity's state machine. `scopeRow` is undefined only when a lifecycle row's entity is
// not in scope, which loadModuleCatalog never produces today.
export type LifecycleEntityModel = {
  dataObject: DataObject;
  scopeRow: ScopeRow | undefined;
  states: LifecycleStateModel[];
};

// §8 + §9.1..n: everything derived per module of the emitted scope.
export type ModuleAccessModel = {
  module: ModuleRow;
  slug: string;
  scopeRows: ScopeRow[]; // the scope rows this module contributes
  lifecycle: any[]; // moduleLifecycleScope: the states this module realizes standalone
  gates: GateModel[]; // the §8.1 workflow-gate (lifecycle) rows, with their states, risk and processes
  permissions: Permission[]; // §8.1
  businessRules: BusinessRule[]; // §8.2
  baselineRoles: BaselineRole[]; // §9 baseline roles
  hierarchy: HierarchyEdge[]; // §9 permission hierarchy
  wiredProcesses: WiredProcess[]; // §9 processes wired
  raci: RaciGrant[]; // §9 RACI realization
};

// Everything sections 2-9 (and the derived front-matter lists) render for one emitted unit.
export type BlueprintModel = {
  modules: ModuleRow[]; // the emitted scope (one module for every blueprint emitted today)
  moduleIdSet: Set<number>;
  catalog: ModuleCatalog; // the scoped catalog rows (aliases, co-masters, owners, parent domains, raw lifecycle)
  relatedModules: ModuleRow[]; // front matter `related_modules`, sorted by code
  personas: string[]; // front matter `persona`: deduplicated persona actors across every module's RACI, sorted
  entities: EntityModel[]; // §2 / §3
  relationships: RelationshipsModel; // §5
  handoffs: { outbound: HandoffModel[]; inbound: HandoffModel[] }; // §6.2 / §6.3
  lifecycle: LifecycleEntityModel[]; // §7, sorted by data_object_name
  perModule: ModuleAccessModel[]; // §8 / §9.1..n, in `modules` order
  functionalOwnership: FunctionalOwnership[]; // §9.(n+1)
};

// ---------- derivation rules ----------

// M1 (plan-1-consistency.md): the single canonical gate-code derivation, shared by the §7
// lifecycle renderer and §8 deriveWorkflowGatesAndRules so the two can never disagree on a
// gate's module prefix. Canonical fallback: a state with NULL domain_module_id is gated by
// the module that masters its data_object (in scope; or, for an entity this scope carries as
// `embedded_master`, the absent catalog master, which the re-prefix below then replaces with the
// installing unit). Returns null when no module resolves (the §7 caller renders a
// blank/annotation; §8 simply does not mint the gate).
export function deriveGate(
  ctx: DeriveCtx,
  state: any,
  scopeRows: ScopeRow[],
  reprefixModuleIdSet?: Set<number>,
): DerivedGate | null {
  const obj = ctx.index.dataObjectsById.get(state.data_object_id as number);
  if (!obj) return null;
  const realizingId = state.domain_module_id as number | null;
  let gateModule = realizingId !== null
    ? ctx.index.modulesById.get(realizingId)
    : scopeRows.find((r) => r.data_object_id === state.data_object_id && r.role === "master")?.modules[0];
  // NULL realizer on an entity carried as `embedded_master` (Writing Convention 10): the canonical
  // gate module is the entity's catalog master, which is out of the emitted scope (a scope that
  // installs the master holds the entity as `master`, strongest role wins). Resolve it so the
  // re-prefix below mints the gate under the installing unit, exactly as for a non-NULL realizer
  // that is out of scope. Without this the gate showed as `-` in §7 and was never minted.
  if (!gateModule && realizingId === null && reprefixModuleIdSet) {
    const here = scopeRows.find((r) => r.data_object_id === state.data_object_id);
    if (here && here.role === "embedded_master" && here.modules.length > 0) {
      const owner = (ctx.all.dmdoByDataObjectId.get(obj.id) ?? [])
        .find((r: any) => r.role === "master" && !reprefixModuleIdSet.has(r.domain_module_id as number));
      gateModule = (owner ? ctx.index.modulesById.get(owner.domain_module_id as number) : undefined) ?? here.modules[0];
    }
  }
  if (!gateModule) return null;
  const verbSegment = state.permission_verb_override
    ? (state.permission_verb_override as string)
    : `${state.state_name}_${entitySingularToken(obj)}`;
  // Plan 4 step D: re-prefix the gate to the installing unit when the canonical realizing module
  // is NOT in the emitted scope but this scope carries the entity as `embedded_master`. The entity
  // is present standalone, so its gate must be realized (and minted in §8) under the installing
  // module's slug instead of dangling at the absent realizer's prefix. `gateModule` is left
  // pointing at the canonical realizer so the §7 "realizing module" column can annotate the
  // re-prefix. When `reprefixModuleIdSet` is omitted this is a no-op (byte-identical to before).
  let prefixModule = gateModule;
  let reprefixed = false;
  if (reprefixModuleIdSet && !reprefixModuleIdSet.has(gateModule.id)) {
    const here = scopeRows.find((r) => r.data_object_id === state.data_object_id);
    if (here && here.role === "embedded_master" && here.modules.length > 0) {
      prefixModule = here.modules[0];
      reprefixed = true;
    }
  }
  return { code: `${moduleSlug(prefixModule.domain_module_code)}:${verbSegment}`, gateModule, verbSegment, obj, reprefixed };
}

export function deriveWriteTier(entityType: string | null | undefined, endpointEntityTypes: string[] = []): WriteTier {
  switch (entityType) {
    case "operational_workflow":
    case "operational_record":
      return { read: ":read", write: ":manage", pending: false };
    case "catalog":
      return { read: ":read", write: ":admin", pending: false };
    case "junction":
      return { read: ":read", write: endpointEntityTypes.includes("catalog") ? ":admin" : ":manage", pending: false };
    case "computed":
      return { read: ":read", write: null, pending: false };
    default: // unclassified, null, or any unknown value
      return { read: ":read", write: ":manage", pending: true };
  }
}

export function deriveDeleteMode(relationshipKind: string, isRequired: boolean, relationshipType?: string | null): DeleteMode {
  if (relationshipType === "many_to_many") return { mode: "cascade", fkFormat: "parent" };
  switch (relationshipKind) {
    case "composition":
      return { mode: "cascade", fkFormat: "parent" };
    case "reference":
    case "association":
      return isRequired ? { mode: "restrict", fkFormat: "reference" } : { mode: "clear", fkFormat: "reference" };
    case "inheritance":
      return { mode: "restrict", fkFormat: "reference" };
    default:
      return { mode: "restrict", fkFormat: "reference" }; // defensive: unknown kind
  }
}

// §5.3 direction: where the link's field sits and which way it points, not the from / to columns.
// A link is incoming when the field sits on the external entity. Every other link is outgoing,
// including a many_to_many link, whose new junction table points out to the external entity.
export function isIncomingLink(edge: any, scopeRolesById: Map<number, string>): boolean {
  const holder = fkHolderSide(edge);
  if (holder === null) return false;
  return !scopeRolesById.has(holder === "source" ? edge.data_object_id : edge.related_data_object_id);
}

// B2: entity_types of a data_object's relationship neighbors. Used to resolve a junction's
// write tier (a junction that links a catalog entity is admin-governed, else manage).
export function neighborEntityTypes(ctx: DeriveCtx, doId: number, rels: { all: any[] }): string[] {
  const types = new Set<string>();
  for (const r of rels.all) {
    const otherId = r.data_object_id === doId
      ? (r.related_data_object_id as number)
      : r.related_data_object_id === doId
        ? (r.data_object_id as number)
        : null;
    if (otherId === null) continue;
    const o = ctx.index.dataObjectsById.get(otherId);
    if (o?.entity_type) types.add(o.entity_type);
  }
  return [...types];
}

// The §3 write tier of one in-scope entity: junctions consult their neighbors' entity_types.
function entityWriteTier(ctx: DeriveCtx, r: ScopeRow, rels: { all: any[] }): WriteTier {
  const o = r.data_object;
  const ep = o.entity_type === "junction" ? neighborEntityTypes(ctx, r.data_object_id, rels) : [];
  return deriveWriteTier(o.entity_type, ep);
}

// Plan 4 step D: the lifecycle states a module realizes when emitted as a standalone unit.
// `master`-here or this-module-realized states (the pre-plan-4 set), PLUS states for entities
// carried as `embedded_master` whose canonical realizing module is out of the emitted scope (the
// installing unit realizes and mints those gates locally, re-prefixed by deriveGate). A NULL
// realizer on an embedded entity counts as out of scope: its canonical realizer is the entity's
// catalog master, which a scope holding the entity as `embedded_master` does not install. For a
// module whose embedded entities all have in-scope realizers this returns the same set as before.
export function moduleLifecycleScope(
  m: ModuleRow,
  moduleScopeRows: ScopeRow[],
  lifecycleRows: any[],
  moduleIdSet: Set<number>,
): any[] {
  return (lifecycleRows ?? []).filter((s: any) => {
    const here = moduleScopeRows.find((r) => r.data_object_id === s.data_object_id);
    const masterHere = here?.role === "master";
    const embeddedHere = here?.role === "embedded_master";
    const realizerOutOfScope = s.domain_module_id == null || !moduleIdSet.has(s.domain_module_id as number);
    return masterHere || s.domain_module_id === m.id || (embeddedHere && realizerOutOfScope);
  });
}

export function deriveWorkflowGatesAndRules(
  ctx: DeriveCtx,
  slug: string,
  moduleObjects: any[],
  lifecycleRows: any[],
  thisModuleId: number,
  emittedModuleIdSet: Set<number>,
): { permissions: Permission[]; businessRules: BusinessRule[]; gates: GateModel[] } {
  const permissions: Permission[] = [];
  const businessRules: BusinessRule[] = [];
  const baselineCodes = new Set([`${slug}:read`, `${slug}:manage`, `${slug}:admin`]);

  const moduleMasterIds = new Set(
    moduleObjects.filter((r) => r.role === "master").map((r) => r.data_object_id as number),
  );
  const moduleEmbeddedIds = new Set(
    moduleObjects.filter((r) => r.role === "embedded_master").map((r) => r.data_object_id as number),
  );
  // The gates this module mints, in lifecycle order, one entry per distinct code.
  const gateByCode = new Map<string, GateModel>();
  for (const ls of lifecycleRows) {
    if (!ls.requires_permission) continue;
    const realizingId = ls.domain_module_id as number | null;
    const ownsAsRealizer = realizingId === thisModuleId;
    const ownsAsMaster = realizingId === null && moduleMasterIds.has(ls.data_object_id as number);
    // Plan 4 step D: the installing unit realizes (and mints, re-prefixed) the gate for an entity
    // it carries as `embedded_master` whose canonical realizing module is out of the emitted
    // scope. Without this a starter (or any standalone-emitted module embedding such an entity)
    // shows the gate in §7 but mints nothing in §8.1, leaving the transition ungoverned. A NULL
    // realizer counts as out of scope here (its canonical realizer is the absent catalog master).
    const realizerOutOfScope = realizingId === null || !emittedModuleIdSet.has(realizingId);
    const ownsByEmbedding = realizerOutOfScope && moduleEmbeddedIds.has(ls.data_object_id as number);
    if (!ownsAsRealizer && !ownsAsMaster && !ownsByEmbedding) continue;
    // M1: same shared deriveGate as §7, passed the emitted scope so the re-prefix is identical.
    // On the realizer/master paths the realizer is in scope, so the re-prefix is a no-op and the
    // code stays `${slug}:...`; on the embedded path it re-prefixes to this installing module's
    // slug, which is also `${slug}`.
    const g = deriveGate(ctx, ls, moduleObjects, emittedModuleIdSet);
    if (!g || baselineCodes.has(g.code)) continue;
    // Override collision (modules.md §4): two transitions can collapse to one gate code. Mint the
    // permission once and record every mapped state on it; the deployer treats them as one.
    let gate = gateByCode.get(g.code);
    if (!gate) {
      gate = { code: g.code, states: [], highRisk: false, processIds: [] };
      gateByCode.set(g.code, gate);
    }
    gate.states.push({ dataObject: g.obj, state: ls });
    if (ls.is_high_risk) gate.highRisk = true;
    const pid = ls.process_id as number | null;
    if (pid != null && !gate.processIds.includes(pid)) gate.processIds.push(pid);
  }
  const gates = [...gateByCode.values()];

  // One permission set (gate-permission-model-plan.md section 5): every gate has its own
  // `workflow-gate (lifecycle)` row. The admin holds it through the hierarchy (`included in :admin?`
  // ✓) unless it is high risk, which only the RACI Accountable role holds.
  const anyHighRisk = gates.some((g) => g.highRisk);
  permissions.push({ code: `${slug}:read`, tier: "baseline-read", description: "Read access to every entity in the module", includedInAdmin: true });
  permissions.push({ code: `${slug}:manage`, tier: "baseline-manage", description: "Edit operational records", includedInAdmin: true });
  permissions.push({
    code: `${slug}:admin`,
    tier: "baseline-admin",
    description: anyHighRisk
      ? "Edit reference data and inherit every workflow gate below except the high-risk ones"
      : "Edit reference data and inherit every workflow gate below",
    includedInAdmin: false,
  });
  for (const gate of gates) {
    permissions.push({
      code: gate.code,
      tier: "workflow-gate (lifecycle)",
      description: gateDescription(gate),
      includedInAdmin: !gate.highRisk,
      highRisk: gate.highRisk,
    });
  }

  for (const r of moduleObjects) {
    // Plan 4: personal_content overrides + business rules follow the ENTITY, not the role. A unit
    // carrying an entity as `embedded_master` is its local master when deployed standalone, so it
    // mints the same row-scope governance, re-prefixed to this unit (`slug`),
    // exactly as the gate mint above does. (Single-module blueprints are the only kind emitted, so
    // an `embedded_master` row here always means the canonical master is out of scope.)
    if (r.role !== "master" && r.role !== "embedded_master") continue;
    const o = r.data_object as DataObject;
    if (!o) continue;
    // M6 (plan-2-entity-type-tiers.md): personal_content overrides are valid only on operational
    // entities. Suppress on catalog / junction / computed masters (corrective where a classified
    // master still carries a legacy flag; a no-op otherwise). `unclassified` keeps its overrides
    // until classified (m2 graceful degradation).
    if (o.entity_type === "catalog" || o.entity_type === "junction" || o.entity_type === "computed") continue;
    const entitySingular = entitySingularToken(o);
    const entityPlural = entityPluralToken(o);
    if (o.has_personal_content) {
      permissions.push({
        code: `${slug}:view_all_${entityPlural}`,
        tier: "override (personal_content)",
        description: `View all \`${o.data_object_name}\` rows beyond row-scope`,
        includedInAdmin: true,
      });
      permissions.push({
        code: `${slug}:manage_all_${entityPlural}`,
        tier: "override (personal_content)",
        description: `Manage all \`${o.data_object_name}\` rows beyond row-scope`,
        includedInAdmin: true,
      });
      businessRules.push({
        name: `${entitySingular}_edit_scope`,
        dataObject: o.data_object_name,
        sourceFlag: "has_personal_content",
        intent: `Row-scope by default; override via \`${slug}:view_all_${entityPlural}\` / \`${slug}:manage_all_${entityPlural}\``,
      });
    }
  }

  return { permissions, businessRules, gates };
}

// §8.1 description of a gate: every mapped state (a shared code names them all), and `⚠ no
// process` when no mapped state is wired to a process (no RACI Accountable row can hold it).
export function gateDescription(gate: GateModel): string {
  const parts = gate.states.map((s) => `\`${s.dataObject.data_object_name}\` into state \`${s.state.state_name}\``);
  const body = parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} or ${parts[parts.length - 1]}`;
  return `Transition ${body}${gate.processIds.length === 0 ? " (⚠ no process)" : ""}`;
}

// ============================================================
// §9 / §10 derivations (Plan 3, step B). All DERIVED + emitted, never stored:
// a persona's bundle = f(role_modules reach, process_raci gates, the tier policy);
// the hierarchy = f(tiers); the deployer provisions the tenant from the blueprint.
// ============================================================

// B1: three baseline roles per module. viewer/manager always; admin whenever the module mints
// `<slug>:admin` (every module does: it carries the reference-data tier and holds the workflow gates
// through the hierarchy), so the role that holds that permission always exists.
export function deriveBaselineRoles(slug: string, permissions: Permission[]): BaselineRole[] {
  const roles: BaselineRole[] = [
    { code: `${slug}_viewer`, grant: `${slug}:read` },
    { code: `${slug}_manager`, grant: `${slug}:manage` },
  ];
  if (permissions.some((p) => p.code === `${slug}:admin`)) roles.push({ code: `${slug}_admin`, grant: `${slug}:admin` });
  return roles;
}

// B2: hierarchy from the §8 permission set. admin includes manage includes read, and admin
// includes every workflow gate / personal_content override whose §8.1 `included in :admin?` is ✓
// (every one except a high-risk gate, which only the RACI Accountable role holds).
export function derivePermissionHierarchy(slug: string, permissions: Permission[]): HierarchyEdge[] {
  const edges: HierarchyEdge[] = [
    { including: `${slug}:admin`, included: `${slug}:manage` },
    { including: `${slug}:manage`, included: `${slug}:read` },
  ];
  for (const p of permissions) {
    if ((p.tier.startsWith("workflow-gate") || p.tier.startsWith("override")) && p.includedInAdmin) {
      edges.push({ including: `${slug}:admin`, included: p.code });
    }
  }
  return edges;
}

// B3: realize each process_raci row. The relevant processes are those wired to this module's
// lifecycle states via data_object_lifecycle_states.process_id (the process-to-permission edge).
// Branch on the RACI letter and the actor kind (persona vs agent skill). The gate-permission
// contract (gate-permission-model-plan.md section 5, architect template §9.1):
//   - Accountable (exactly one per process) holds the process's gates: the gates this module mints
//     in §8.1 (`gates`) whose states are wired to the process, each listed once. A gate realized
//     by an out-of-scope module is not minted here, so it is not granted here either. A process
//     with no gated state has no gate to hold, so its Accountable row gets the write tier alone.
//   - Responsible holds the gated entities' write tier, never a gate.
//   - Informed is notified through the trigger_events that fire on the process's wired transitions.
export function deriveRaciRealization(ctx: DeriveCtx, moduleLifecycle: any[], gates: GateModel[]): RaciGrant[] {
  const arel = ctx.all;
  const grants: RaciGrant[] = [];
  const processIds = new Set<number>();
  for (const ls of moduleLifecycle) if (ls.process_id != null) processIds.add(ls.process_id as number);
  for (const pid of processIds) {
    const proc = arel.processesById.get(pid);
    // RACI table references the process by its unique process_key (process_name is not unique).
    const procKey = proc?.process_key ?? `process#${pid}`;
    const gateCodes = gates.filter((g) => g.processIds.includes(pid)).map((g) => g.code);
    // The process's transitions: the states wired to it, gated or not. Informed hears about exactly
    // those transitions, so an event counts only when it fires on one of them (matched on to_state
    // or the name suffix, the same rule as the B9 health check).
    const wiredStates = moduleLifecycle.filter((ls: any) => ls.process_id === pid);
    const hasGatedState = wiredStates.some((ls: any) => ls.requires_permission);
    const eventNames = new Set<string>();
    for (const did of new Set(wiredStates.map((ls: any) => ls.data_object_id as number))) {
      for (const te of arel.triggerEventsByDataObjectId.get(did) ?? []) {
        if (te.event_name && wiredStates.some((ls: any) => eventMatchesState(te, ls))) eventNames.add(String(te.event_name));
      }
    }
    const events = [...eventNames].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    for (const row of arel.processRaciByProcessId.get(pid) ?? []) {
      const isPersona = row.actor_role_id != null;
      const actorKind = isPersona ? "persona" : "skill";
      const actor = isPersona
        ? (arel.domainRolesById.get(row.actor_role_id as number)?.role_code ?? `role#${row.actor_role_id}`)
        : `skill#${row.actor_skill_id}`;
      let realization = "";
      switch (row.raci) {
        case "responsible":
          realization = isPersona
            ? "the gated entities' write tier"
            : "require process_tools coverage of the process's mutating ops";
          break;
        case "accountable":
          // R/A are polymorphic (a skill can be Accountable); the Accountable row holds the gates.
          realization = gateCodes.length > 0
            ? `grant gates [${gateCodes.join(", ")}] + the gated entities' write tier`
            : hasGatedState ? "⚠ no gate wired" : "the gated entities' write tier";
          break;
        case "consulted":
          realization = row.consultation_blocking ? "blocking consultation state" : "advisory read grant";
          break;
        case "informed":
          realization = events.length > 0 ? `notify on trigger_events [${events.join(", ")}]` : "⚠ no event wired";
          break;
        default:
          realization = String(row.raci);
      }
      grants.push({ actor, actorKind, raci: String(row.raci), process: procKey, realization });
    }
  }
  return grants;
}

// B3 companion: the distinct processes that appear in the RACI realization table (those wired
// to this module's gated lifecycle states AND carrying >=1 process_raci row), surfaced with
// their APQC PCF code / level / description so the blueprint is self-contained. Iteration order
// mirrors deriveRaciRealization (first-seen in moduleLifecycle) so the reference table and the
// RACI table list processes in the same order.
export function deriveWiredProcesses(ctx: DeriveCtx, moduleLifecycle: any[]): WiredProcess[] {
  const arel = ctx.all;
  const out: WiredProcess[] = [];
  const seen = new Set<number>();
  for (const ls of moduleLifecycle) {
    const pid = ls.process_id as number | null;
    if (pid == null || seen.has(pid)) continue;
    seen.add(pid);
    if ((arel.processRaciByProcessId.get(pid) ?? []).length === 0) continue;
    const proc = arel.processesById.get(pid);
    const name = proc?.process_name ?? `process#${pid}`;
    out.push({
      name,
      key: proc?.process_key ? String(proc.process_key) : "",
      code: proc?.process_code ? String(proc.process_code) : "",
      pcfId: proc?.external_id ? String(proc.external_id) : "",
      level: proc?.hierarchy_level != null ? String(proc.hierarchy_level) : "",
      description: proc?.description ? String(proc.description) : "",
    });
  }
  return out;
}

// (B4 deriveDeployableClosure removed in the Plan 3 review, 2026-06-02: "deployable closure /
// required modules" was the wrong frame -- a module is self-contained, so it has no hard
// prerequisites; related modules live in the front-matter `related_modules`, and the
// self-containment invariant is an audit-band check, not an emitted section.)

// B5: market RACI (M11) + default grant (M13). From business_function_domains for the scope's
// domain(s): owner -> admin, contributor -> manage, consumer -> read.
export function deriveMarketRaci(ctx: DeriveCtx, parentDomains: Domain[]): FunctionalOwnership[] {
  const arel = ctx.all;
  const TIER: Record<string, { role: string; tier: string }> = {
    owner: { role: "admin", tier: ":admin" },
    contributor: { role: "manage", tier: ":manage" },
    consumer: { role: "read", tier: ":read" },
  };
  const out: FunctionalOwnership[] = [];
  const seen = new Set<string>();
  for (const d of parentDomains) {
    for (const bfd of arel.businessFunctionDomainsByDomainId.get(d.id) ?? []) {
      const fn = arel.businessFunctionsById.get(bfd.business_function_id as number);
      const func = fn?.business_function_name ?? `function#${bfd.business_function_id}`;
      const rt = String(bfd.responsibility_type);
      const key = `${rt}:${func}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t = TIER[rt] ?? { role: "?", tier: "?" };
      out.push({ responsibility: rt, func, defaultRole: t.role, defaultTier: t.tier });
    }
  }
  const ord: Record<string, number> = { owner: 0, contributor: 1, consumer: 2 };
  out.sort((a, b) => (ord[a.responsibility] ?? 9) - (ord[b.responsibility] ?? 9) || a.func.localeCompare(b.func));
  return out;
}

// ---------- model assembly ----------

// §8 + §9 for one module of the emitted scope. The §8 permission set is derived once and feeds
// both §8.1 and the §9 hierarchy, so the two can never be computed from different inputs.
function deriveModuleAccess(ctx: DeriveCtx, m: ModuleRow, cat: ModuleCatalog, moduleIdSet: Set<number>): ModuleAccessModel {
  const slug = moduleSlug(m.domain_module_code);
  const moduleScopeRows = cat.scopeRows.filter((r) => r.modules.includes(m));
  const moduleLifecycle = moduleLifecycleScope(m, moduleScopeRows, cat.lifecycleRows, moduleIdSet);
  const { permissions, businessRules, gates } = deriveWorkflowGatesAndRules(ctx, slug, moduleScopeRows, moduleLifecycle, m.id, moduleIdSet);
  return {
    module: m,
    slug,
    scopeRows: moduleScopeRows,
    lifecycle: moduleLifecycle,
    gates,
    permissions,
    businessRules,
    baselineRoles: deriveBaselineRoles(slug, permissions),
    hierarchy: derivePermissionHierarchy(slug, permissions),
    wiredProcesses: deriveWiredProcesses(ctx, moduleLifecycle),
    raci: deriveRaciRealization(ctx, moduleLifecycle, gates),
  };
}

// §7 grouping: one entry per entity with lifecycle rows, sorted by data_object_name, states in
// catalog order (data_object_id, state_order, state_name per buildRelationshipIndices). Entities
// missing from the index are dropped (the renderer skipped them).
function deriveLifecycleEntities(ctx: DeriveCtx, cat: ModuleCatalog, moduleIdSet: Set<number>): LifecycleEntityModel[] {
  const byObj = new Map<number, any[]>();
  for (const ls of cat.lifecycleRows) {
    const did = ls.data_object_id as number;
    if (!byObj.has(did)) byObj.set(did, []);
    byObj.get(did)!.push(ls);
  }
  const name = (id: number): string => ctx.index.dataObjectsById.get(id)?.data_object_name ?? "";
  const out: LifecycleEntityModel[] = [];
  for (const [did, allStates] of [...byObj.entries()].sort((a, b) => name(a[0]).localeCompare(name(b[0])))) {
    const obj = ctx.index.dataObjectsById.get(did);
    if (!obj) continue;
    const scopeRow = cat.scopeRows.find((r) => r.data_object_id === did);
    // §7 is per master (architect template): a master or embedded_master shows its whole state
    // machine. Any other entity's lifecycle lives in its owner's blueprint; it appears here only
    // with the states this scope's own modules realize, since those are the gates §8.1 mints.
    const ownsLifecycle = scopeRow?.role === "master" || scopeRow?.role === "embedded_master";
    const states = ownsLifecycle
      ? allStates
      : allStates.filter((s: any) => s.domain_module_id != null && moduleIdSet.has(s.domain_module_id as number));
    if (states.length === 0) continue;
    out.push({
      dataObject: obj,
      scopeRow,
      states: states.map((s) => ({ state: s, gate: deriveGate(ctx, s, cat.scopeRows, moduleIdSet) })),
    });
  }
  return out;
}

// §6.2 / §6.3 per architect Writing Convention 10. The unit "plays" its own modules plus the
// catalog owner module of every entity it carries as `embedded_master` (that owner is absent from
// the emitted scope; the unit realizes the entity standalone). Starting from loadModuleCatalog's
// attribution (shared with emit_domain_map.ts), the blueprint:
//   - hides intra-set handoffs: both endpoint modules are played, so source and target entities
//     live in this unit and the handoff is internal (this also covers a handoff between the unit
//     itself and a played owner, which the shared attribution keeps);
//   - adds a boundary-crossing handoff on an embedded payload whose played endpoint is not the
//     payload's own owner (the shared attribution only stands in for the payload's owner);
//   - shows the installing unit in place of a played owner endpoint (`sourceModule` on §6.2,
//     `targetModule` on §6.3), keeping the catalog endpoint on `catalog*Module`.
// Module-grain approximation: a played owner module stands for every entity it masters, not only
// the ones embedded here (the shared attribution makes the same approximation).
function deriveHandoffs(ctx: DeriveCtx, cat: ModuleCatalog, moduleIdSet: Set<number>): { outbound: HandoffModel[]; inbound: HandoffModel[] } {
  const standInFor = new Map<number, ModuleRow>(); // played owner module id -> the installing unit
  for (const r of cat.scopeRows) {
    if (r.role !== "embedded_master" || r.modules.length === 0) continue;
    for (const o of cat.owners.get(r.data_object_id)?.modules ?? []) {
      if (!moduleIdSet.has(o.id) && !standInFor.has(o.id)) standInFor.set(o.id, r.modules[0]);
    }
  }
  const played = (id: number | null): boolean => id !== null && (moduleIdSet.has(id) || standInFor.has(id));
  const internal = (h: any): boolean => played(h.source_domain_module_id ?? null) && played(h.target_domain_module_id ?? null);

  const outbound = cat.outboundHandoffs.filter((h) => !internal(h));
  const inbound = cat.inboundHandoffs.filter((h) => !internal(h));
  const attributed = new Set<any>([...cat.outboundHandoffs, ...cat.inboundHandoffs]);
  for (const h of ctx.all.handoffs) {
    if (attributed.has(h) || cat.scopeRolesById.get(h.data_object_id as number) !== "embedded_master") continue;
    const srcPlayed = played(h.source_domain_module_id ?? null);
    const tgtPlayed = played(h.target_domain_module_id ?? null);
    if (srcPlayed && !tgtPlayed) outbound.push(h);
    else if (tgtPlayed && !srcPlayed) inbound.push(h);
  }
  outbound.sort(handoffOrder);
  inbound.sort(handoffOrder);

  const resolve = (h: any): HandoffModel => {
    const src = ctx.index.modulesById.get(h.source_domain_module_id as number) ?? null;
    const tgt = ctx.index.modulesById.get(h.target_domain_module_id as number) ?? null;
    return {
      row: h,
      sourceModule: src ? standInFor.get(src.id) ?? src : null,
      targetModule: tgt ? standInFor.get(tgt.id) ?? tgt : null,
      catalogSourceModule: src,
      catalogTargetModule: tgt,
      sourceDomain: ctx.index.domainsById.get(h.source_domain_id as number) ?? null,
      targetDomain: ctx.index.domainsById.get(h.target_domain_id as number) ?? null,
    };
  };
  return { outbound: outbound.map(resolve), inbound: inbound.map(resolve) };
}

// The deterministic §6 row order, the same total order loadModuleCatalog imposes on its handoff
// lists (kept in step with it), re-applied here because deriveHandoffs merges in rows the shared
// attribution does not carry: domain / module endpoints, then the joined trigger event and
// transition, then payload, pattern, friction, description. Code-point compare, locale-independent.
function handoffOrder(a: any, b: any): number {
  const sc = (x: string, y: string): number => (x < y ? -1 : x > y ? 1 : 0);
  const ta = a.trigger_events || {};
  const tb = b.trigger_events || {};
  return (
    (a.target_domain_id ?? -1) - (b.target_domain_id ?? -1) ||
    (a.source_domain_id ?? -1) - (b.source_domain_id ?? -1) ||
    (a.source_domain_module_id ?? -1) - (b.source_domain_module_id ?? -1) ||
    (a.target_domain_module_id ?? -1) - (b.target_domain_module_id ?? -1) ||
    sc(String(ta.event_name ?? ""), String(tb.event_name ?? "")) ||
    sc(String(ta.from_state ?? ""), String(tb.from_state ?? "")) ||
    sc(String(ta.to_state ?? ""), String(tb.to_state ?? "")) ||
    sc(String(ta.event_category ?? ""), String(tb.event_category ?? "")) ||
    (a.data_object_id ?? -1) - (b.data_object_id ?? -1) ||
    sc(String(a.integration_pattern ?? ""), String(b.integration_pattern ?? "")) ||
    sc(String(a.friction_level ?? ""), String(b.friction_level ?? "")) ||
    sc(String(a.description ?? ""), String(b.description ?? ""))
  );
}

// The whole derived blueprint for a scope of one or more modules. Scope = union of the modules'
// data_objects, strongest role wins per data_object (loadModuleCatalog). Pure: no IO, no output,
// and every rule reads the catalog only through `ctx`.
export function deriveBlueprintModel(modules: ModuleRow[], ctx: DeriveCtx): BlueprintModel {
  if (modules.length === 0) throw new Error("deriveBlueprintModel requires at least one module");
  const cat = loadModuleCatalog(modules.map((m) => m.id), ctx.index, ctx.all);
  const moduleIdSet = new Set(modules.map((m) => m.id));
  const rels = cat.relationships;

  const relatedModules: ModuleRow[] = [...cat.relatedModuleIds]
    .map((id) => ctx.index.modulesById.get(id))
    .filter((m): m is ModuleRow => Boolean(m));
  relatedModules.sort((a, b) => a.domain_module_code.localeCompare(b.domain_module_code));

  const withDeleteMode = (rows: any[]): RelationshipModel[] =>
    rows.map((r) => ({ edge: r, deleteMode: deriveDeleteMode(r.relationship_kind, Boolean(r.is_required), r.relationship_type) }));

  const perModule = modules.map((m) => deriveModuleAccess(ctx, m, cat, moduleIdSet));

  // persona: the deduplicated persona actors realized in the §9 RACI tables (B3), aggregated
  // across every module in scope. Only `actorKind === "persona"` rows count; agent-skill actors
  // are excluded. Empty when no `process_raci` rows are wired to this scope's gated processes.
  const personaSet = new Set<string>();
  for (const pm of perModule) for (const g of pm.raci) if (g.actorKind === "persona") personaSet.add(g.actor);

  return {
    modules,
    moduleIdSet,
    catalog: cat,
    relatedModules,
    personas: [...personaSet].sort(),
    entities: cat.scopeRows.map((r) => ({ ...r, writeTier: entityWriteTier(ctx, r, rels) })),
    relationships: {
      all: rels.all,
      intra: withDeleteMode(rels.intra),
      userRels: withDeleteMode(rels.userRels),
      outgoing: rels.cross.filter((r) => !isIncomingLink(r, cat.scopeRolesById)),
      incoming: rels.cross.filter((r) => isIncomingLink(r, cat.scopeRolesById)),
    },
    handoffs: deriveHandoffs(ctx, cat, moduleIdSet),
    lifecycle: deriveLifecycleEntities(ctx, cat, moduleIdSet),
    perModule,
    functionalOwnership: deriveMarketRaci(ctx, cat.parentDomains),
  };
}

// One emitted unit (every blueprint the generator writes today is a single module).
export function deriveModuleModel(module: ModuleRow, ctx: DeriveCtx): BlueprintModel {
  return deriveBlueprintModel([module], ctx);
}
