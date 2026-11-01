// scripts/lib/__tests__/fixtures/build.ts
//
// Offline fixture builder for the blueprint derivation tests. Assembles a CatalogIndex +
// AllRelationships from tiny literal arrays through the same builders the live loader and the
// catalog cache use (buildCatalogIndex / buildRelationshipIndices), so a test exercises the real
// index shape (sort order, grouping maps, usersId) with no catalog fetch and no cache file.
//
// The row factories fill every column the live selects return with a neutral default; a test
// passes only the columns it cares about. Raw relationship rows stay `any`-shaped, as in catalog.ts.

import {
  buildCatalogIndex,
  buildRelationshipIndices,
  deriveHostDomains,
  type AllRelationships,
  type CatalogIndex,
  type DataObject,
  type Domain,
  type IndustryRow,
  type ModuleRow,
  type RawRelationships,
} from "../../catalog";
import { makeDeriveCtx, type DeriveCtx } from "../../blueprint_derive";

export type FixtureInput = {
  domains?: Domain[];
  dataObjects?: DataObject[];
  industries?: IndustryRow[];
  modules?: ModuleRow[];
} & Partial<RawRelationships>;

export type Fixture = { index: CatalogIndex; all: AllRelationships; ctx: DeriveCtx };

export function buildFixture(input: FixtureInput): Fixture {
  const index = buildCatalogIndex({
    domains: input.domains ?? [],
    dataObjects: input.dataObjects ?? [],
    industries: input.industries ?? [],
    modules: input.modules ?? [],
  });
  // buildRelationshipIndices sorts several raw arrays in place; copy so a test's literals stay as
  // written. hostDomains is derived exactly as loadAllRelationships derives it unless given.
  const dmdo = [...(input.dmdo ?? [])];
  const raw: RawRelationships = {
    dmdo,
    ddo: [...(input.ddo ?? [])],
    aliases: [...(input.aliases ?? [])],
    relationships: [...(input.relationships ?? [])],
    lifecycle: [...(input.lifecycle ?? [])],
    handoffs: [...(input.handoffs ?? [])],
    hostDomains: [...(input.hostDomains ?? deriveHostDomains(dmdo, input.modules ?? []))],
    domainRoles: [...(input.domainRoles ?? [])],
    roleModules: [...(input.roleModules ?? [])],
    processRaci: [...(input.processRaci ?? [])],
    businessFunctions: [...(input.businessFunctions ?? [])],
    businessFunctionDomains: [...(input.businessFunctionDomains ?? [])],
    processes: [...(input.processes ?? [])],
    handoffProcesses: [...(input.handoffProcesses ?? [])],
    processTools: [...(input.processTools ?? [])],
    triggerEvents: [...(input.triggerEvents ?? [])],
  };
  const all = buildRelationshipIndices(raw);
  return { index, all, ctx: makeDeriveCtx(index, all) };
}

// ---------- index row factories ----------

export function domain(p: Partial<Domain> & Pick<Domain, "id" | "domain_code">): Domain {
  return {
    domain_name: p.domain_code,
    description: "",
    domain_kind: "established_market",
    catalog_release: null,
    catalog_tagline: "",
    catalog_description: "",
    crud_percentage: 0,
    business_logic: "",
    min_org_size: "",
    cost_band: "",
    certification_required: false,
    usa_market_size_usd_m: 0,
    market_size_source_year: 0,
    icon_name: "",
    ...p,
  };
}

export function module(p: Partial<ModuleRow> & Pick<ModuleRow, "id" | "domain_module_code">): ModuleRow {
  return {
    domain_module_name: p.domain_module_code,
    domain_id: null,
    description: "",
    catalog_tagline: "",
    catalog_description: "",
    module_kind: "full",
    specification_requirements: "",
    ...p,
  };
}

// Labels are required: the singular label feeds the gate verb (`<state>_<singular>`) and the
// plural label feeds the personal_content override codes.
export function dataObject(
  p: Partial<DataObject> & Pick<DataObject, "id" | "data_object_name" | "singular_label" | "plural_label">,
): DataObject {
  return {
    description: "",
    catalog_description: "",
    kind: "domain_owned",
    is_canonical_bare_word: false,
    has_personal_content: false,
    entity_type: "operational_record",
    ...p,
  };
}

// The platform `users` built-in; buildCatalogIndex resolves index.usersId from it.
export function usersObject(id: number): DataObject {
  return dataObject({
    id,
    data_object_name: "users",
    singular_label: "User",
    plural_label: "Users",
    kind: "platform_builtin",
    is_canonical_bare_word: true,
  });
}

// ---------- raw relationship row factories ----------

export function dmdoRow(domain_module_id: number, data_object_id: number, role: string, p: Record<string, unknown> = {}): any {
  return { domain_module_id, data_object_id, role, necessity: "required", notes: "", ...p };
}

export function relationshipRow(
  p: { id: number; data_object_id: number; related_data_object_id: number } & Record<string, unknown>,
): any {
  return {
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: "",
    inverse_verb: "",
    is_required: false,
    owner_side: "source",
    notes: "",
    ...p,
  };
}

export function lifecycleState(
  p: { id: number; data_object_id: number; state_name: string; state_order: number } & Record<string, unknown>,
): any {
  return {
    description: "",
    is_initial: false,
    is_terminal: false,
    requires_permission: false,
    is_high_risk: false,
    permission_verb_override: "",
    domain_module_id: null,
    process_id: null,
    ...p,
  };
}

// A process_raci row for a persona actor (domain_roles id) on a process.
export function raciRow(id: number, process_id: number, actor_role_id: number, raci: string, p: Record<string, unknown> = {}): any {
  return { id, process_id, actor_role_id, actor_skill_id: null, raci, consultation_blocking: false, ...p };
}

export function processRow(id: number, process_key: string, p: Record<string, unknown> = {}): any {
  return {
    id,
    process_key,
    process_name: process_key,
    process_code: "",
    description: "",
    external_id: "",
    hierarchy_level: null,
    source_framework: "",
    ...p,
  };
}

export function triggerEvent(
  p: { id: number; event_name: string; data_object_id: number } & Record<string, unknown>,
): any {
  return { domain_module_id: null, event_category: "lifecycle", from_state: "", to_state: "", ...p };
}

// A handoffs row as the live select returns it: the trigger event and payload entity are embedded
// (`trigger_events(...)`, `data_objects(...)`) so pass their joined columns in `event` / `payload`.
export function handoffRow(
  p: {
    id: number;
    source_domain_id: number;
    target_domain_id: number;
    source_domain_module_id: number | null;
    target_domain_module_id: number | null;
    data_object_id: number;
    payload: string;
    event: { event_name: string } & Record<string, unknown>;
  } & Record<string, unknown>,
): any {
  const { payload, event, ...rest } = p;
  return {
    trigger_event_id: null,
    integration_pattern: "event_stream",
    friction_level: "low",
    description: "",
    notes: "",
    data_objects: { data_object_name: payload },
    trigger_events: { description: "", from_state: "", to_state: "", event_category: "lifecycle", ...event },
    ...rest,
  };
}
