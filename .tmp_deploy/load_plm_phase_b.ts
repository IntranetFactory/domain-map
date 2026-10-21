/**
 * PLM Phase B loader (2026-05-24)
 *
 * Ships the full Phase-B contract for the PLM domain (id 165) in one pass:
 *   1. data_objects: 12 PLM masters + 2 canonical bare-word claims (cad_models, cad_drawings)
 *   2. domain_module_data_objects: master rows (12) + cross-domain consumer/contributor rows
 *   3. trigger_events: 8 outbound state-change events on PLM masters (one per event)
 *   4. handoffs: 8 outbound cross-domain handoffs (source_domain_module_id set; target NULL
 *      with annotation since target domains are not yet modularized)
 *   5. data_object_relationships: intra-PLM edges + users edges (Rule #10) + outbound
 *      cross-domain payload→target edges (B8)
 *   6. data_object_aliases: industry / vendor synonyms per master
 *   7. data_object_lifecycle_states: 6 master state machines with domain_module_id +
 *      requires_permission + permission_verb_override per Rule #12 / M5;
 *      regulated_substances annotated as config-shape exempt
 *
 * Idempotent. Run from project root:
 *   bun run .tmp_deploy/load_plm_phase_b.ts
 */

import { $ } from "bun";
$.throws(false);

type Row = Record<string, unknown>;

async function call(body: Row): Promise<Row[]> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(body));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`semantius call failed (exit ${exitCode}): ${stderr}`);
  }
  const text = stdout.trim();
  return text ? JSON.parse(text) : [];
}

const get = (path: string) => call({ method: "GET", path });

async function insert(path: string, rows: Row[]): Promise<Row[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: Row[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const result = await call({ method: "POST", path, body: slice });
    out.push(...result);
  }
  return out;
}

async function patch(path: string, body: Row): Promise<Row[]> {
  return call({ method: "PATCH", path, body });
}

// ============================================================
// CONSTANTS
// ============================================================

const PLM_DOMAIN_ID = 165;
const USERS_DATA_OBJECT_ID = 748;
const SUPPLIERS_DATA_OBJECT_ID = 206;
const CUSTOMERS_DATA_OBJECT_ID = 97;

const TARGET_DOMAIN_IDS = {
  "MFG-OPS": 47,
  "ERP-FIN": 65,
  "S2P": 27,
  "FSM": 31,
  "SUP-LIFE": 28,
};

// ============================================================
// 1. DATA OBJECTS (12 masters)
// ============================================================

interface DoSpec {
  data_object_name: string;
  singular_label: string;
  plural_label: string;
  description: string;
  has_personal_content?: boolean;
  has_submit_lock?: boolean;
  has_single_approver?: boolean;
  is_canonical_bare_word?: boolean;
  naming_authority_rationale?: string;
  notes?: string;
}

const dataObjects: DoSpec[] = [
  // ===== PLM-ENG-CORE (4) =====
  {
    data_object_name: "engineering_parts",
    singular_label: "Engineering Part",
    plural_label: "Engineering Parts",
    description: "The engineering item master: every distinct part number, assembly, or purchased component the engineering organization recognizes. Anchors revisions, BOMs, CAD files, and the downstream item-master feed to ERP and MES.",
    notes: "Prefixed to avoid collision with the contested 'parts' bare-word (vehicle_parts_inventory, spare_parts_inventory already live under fleet/maintenance domains). Pattern flags: has_submit_lock=false because part records edit inline until released; has_single_approver=false because release authority sits with the change-order workflow on engineering_change_orders rather than on the part record itself.",
  },
  {
    data_object_name: "engineering_revisions",
    singular_label: "Engineering Revision",
    plural_label: "Engineering Revisions",
    description: "Revision records on an engineering part (rev A, B, C). Each released revision is a frozen snapshot of the part's attributes, BOM, and CAD references; engineering change orders are the only mechanism that mints a new released revision.",
    has_submit_lock: true,
    notes: "Prefixed to avoid collision with article_revisions (CMS). has_submit_lock=true because a released revision is immutable; further changes require a new ECO. has_single_approver=false: release approval flows through engineering_change_orders.",
  },
  {
    data_object_name: "engineering_change_orders",
    singular_label: "Engineering Change Order",
    plural_label: "Engineering Change Orders",
    description: "Engineering Change Order (ECO) master. Captures the proposed change, impact analysis (where-used traversal), CAB approval routing, effective date, and the set of affected parts / BOMs / drawings. Frozen on submission; only the CAB can override after that.",
    has_submit_lock: true,
    notes: "Combines ECR (request), ECO (order), ECN (notice) workflow. has_submit_lock=true: once submitted to CAB the change is read-only to working users. has_single_approver=false: most orgs use a CAB (board) rather than a single approver, but a permission_verb_override of 'approve_change_order' supports per-org single-approver bypass when the change is low-risk.",
  },
  {
    data_object_name: "engineering_bom_items",
    singular_label: "Engineering BOM Item",
    plural_label: "Engineering BOM Items",
    description: "Parent-child line items in the engineering BOM. Each row represents one child part under a parent assembly, with quantity, reference designator (for PCB / mechanical), effectivity (from-revision / from-date / from-serial), and find number. ECOs add, remove, or alter these lines.",
    notes: "Modeled as a separate master from engineering_parts because each BOM line is independently editable by an ECO and carries its own effectivity. Pattern flags all false: BOM-item edits flow through ECO approval, not through per-row workflow.",
  },
  // ===== PLM-CAD-PDM (2, both canonical bare-word) =====
  {
    data_object_name: "cad_models",
    singular_label: "CAD Model",
    plural_label: "CAD Models",
    description: "CAD file metadata records (parts and assemblies). The vault stores the source CAD file (SOLIDWORKS .sldprt/.sldasm, Creo .prt/.asm, NX .prt, CATIA .CATPart/.CATProduct, Inventor .ipt/.iam, Altium .SchDoc/.PcbDoc); this is the database record that tracks owner, check-in/out state, revision, viewable, and which engineering_revision it backs.",
    is_canonical_bare_word: true,
    naming_authority_rationale: "PLM is the catalog-wide canonical owner of CAD-related concepts. Every flagship PLM vendor (Teamcenter, Windchill, ENOVIA, Aras, Autodesk Vault, Propel) mints this name verbatim against the same vault concept. No other domain in the catalog has a competing claim on CAD modeling artifacts; ITSM/CMDB/ITAM track physical/virtual configuration items, not CAD source files.",
    notes: "has_submit_lock=false: PDM check-in/out is a file-vault mechanic distinct from workflow submission; we capture the workflow submission lock on engineering_revisions instead.",
  },
  {
    data_object_name: "cad_drawings",
    singular_label: "CAD Drawing",
    plural_label: "CAD Drawings",
    description: "2D drawing records derived from CAD models, with their own revision, approval, and title-block metadata. Drawings often have a release cycle distinct from the 3D model they reference, especially in regulated industries where the drawing IS the controlled artifact.",
    is_canonical_bare_word: true,
    naming_authority_rationale: "PLM is the catalog-wide canonical owner of CAD-related concepts. Drawings have a separate lifecycle from the 3D models they reference, so they warrant their own master. Same vendor unanimity as cad_models.",
    notes: "Pattern flags all false: drawing release follows the same ECO workflow as part release; no drawing-specific submission/approval state.",
  },
  // ===== PLM-MFG-PROCESS (3) =====
  {
    data_object_name: "manufacturing_boms",
    singular_label: "Manufacturing BOM",
    plural_label: "Manufacturing BOMs",
    description: "Manufacturing BOM (mBOM). The eBOM restructured for manufacturing assembly order, with phantom-part rollups, kitting, and process-specific decompositions. The mBOM feeds the MES / production planning system.",
    has_submit_lock: true,
    notes: "Distinct master from engineering_bom_items: mBOM structure may differ substantially from eBOM (assembly sequence rather than parts list). has_submit_lock=true on released mBOM revisions: production planning depends on stability. has_single_approver=false: manufacturing engineering owns release, but typically multi-person sign-off in regulated industries.",
  },
  {
    data_object_name: "manufacturing_routings",
    singular_label: "Manufacturing Routing",
    plural_label: "Manufacturing Routings",
    description: "Routing master: ordered sequence of operations required to produce a part, with work center, setup time, run time, and resource allocations. Drives MES work-instruction generation and ERP standard-cost calculations.",
    notes: "Pattern flags all false: routing edits flow through engineering_change_orders when they're release-impacting; minor work-instruction tweaks edit inline.",
  },
  {
    data_object_name: "plm_product_variants",
    singular_label: "Product Variant",
    plural_label: "Product Variants",
    description: "Resolved configurations of a configurable product: a specific combination of option-and-variant selections that the configurator engine has validated against the 150% BOM and configuration rules. Each variant is a sellable / buildable configuration with its own price, lead time, and resolved BOM.",
    notes: "Prefixed with 'plm_' to avoid collision with product_configurations (id 418, PROD-MGMT domain — software product config, different concept). Pattern flags all false: configurator outputs are computed artifacts; the editable state is on the configuration rules, not the resolved variant.",
  },
  // ===== PLM-COMPLIANCE (2) =====
  {
    data_object_name: "product_compliance_declarations",
    singular_label: "Product Compliance Declaration",
    plural_label: "Product Compliance Declarations",
    description: "Per part × substance × regulation declaration that asserts whether a controlled substance is present in the part, at what concentration, and whether it falls under a regulatory exemption. Aggregates from supplier declarations and propagates up the BOM via roll-up.",
    has_submit_lock: true,
    has_single_approver: true,
    notes: "has_submit_lock=true: supplier locks the declaration on submission; only regulatory affairs can edit. has_single_approver=true: typical org structure routes compliance approval through a single named regulatory-affairs owner rather than a board.",
  },
  {
    data_object_name: "regulated_substances",
    singular_label: "Regulated Substance",
    plural_label: "Regulated Substances",
    description: "Reference catalog of substances controlled by product-substance regulations (RoHS Restricted Substances list, REACH SVHC list, REACH Annex XVII, conflict minerals 3TG, PFAS lists by jurisdiction). Each substance row carries CAS number, regulation pointers, threshold concentrations, and exemption references.",
    notes: "Config-shaped master with no workflow per Rule #12 exemption. Authored centrally by regulatory affairs when a regulation changes (e.g., new SVHC additions twice a year); edited inline for typo / metadata fixes. No per-state permissions needed because the substance record itself does not transition; downstream workflows on product_compliance_declarations carry the workflow gates.",
  },
  // ===== PLM-REQUIREMENTS (1) =====
  {
    data_object_name: "engineering_requirements",
    singular_label: "Engineering Requirement",
    plural_label: "Engineering Requirements",
    description: "System, software, and hardware requirements with parent-child decomposition (system → subsystem → component requirements). Carries verification method (test / inspection / analysis / demonstration), allocated subsystem, and traceability links to test cases (via the existing requirements_to_test_traceability junction).",
    notes: "Standalone master in PLM-REQUIREMENTS; verified-by links to test cases owned by TEST-MGMT. Pattern flags all false: requirement edits flow through the requirements workflow, but no single submit-lock point.",
  },
];

// ============================================================
// MODULE → DATA-OBJECT MAPPING
// ============================================================

interface DmdoSpec {
  module_code: string;
  data_object_name: string;
  role: "master" | "embedded_master" | "contributor" | "consumer" | "derived";
  necessity: "required" | "optional";
  notes: string;
}

const dmdoSpecs: DmdoSpec[] = [
  // PLM-ENG-CORE masters
  { module_code: "PLM-ENG-CORE", data_object_name: "engineering_parts", role: "master", necessity: "required", notes: "Item master; canonical PLM ownership of the part-number concept." },
  { module_code: "PLM-ENG-CORE", data_object_name: "engineering_revisions", role: "master", necessity: "required", notes: "One row per released revision per part." },
  { module_code: "PLM-ENG-CORE", data_object_name: "engineering_change_orders", role: "master", necessity: "required", notes: "ECO master; the only mechanism that mints a new released engineering_revision." },
  { module_code: "PLM-ENG-CORE", data_object_name: "engineering_bom_items", role: "master", necessity: "required", notes: "Parent-child BOM lines with quantity and effectivity." },
  // PLM-CAD-PDM masters + consumers from PLM-ENG-CORE
  { module_code: "PLM-CAD-PDM", data_object_name: "cad_models", role: "master", necessity: "required", notes: "File-vault metadata for CAD parts and assemblies." },
  { module_code: "PLM-CAD-PDM", data_object_name: "cad_drawings", role: "master", necessity: "required", notes: "2D drawings derived from CAD models; separate release cycle." },
  { module_code: "PLM-CAD-PDM", data_object_name: "engineering_parts", role: "consumer", necessity: "required", notes: "Every CAD model backs an engineering_part; CAD vault reads part master for owner and lifecycle status." },
  { module_code: "PLM-CAD-PDM", data_object_name: "engineering_revisions", role: "consumer", necessity: "required", notes: "Each released CAD revision binds to one engineering_revision." },
  // PLM-MFG-PROCESS masters + consumers
  { module_code: "PLM-MFG-PROCESS", data_object_name: "manufacturing_boms", role: "master", necessity: "required", notes: "mBOM, restructured eBOM for assembly order." },
  { module_code: "PLM-MFG-PROCESS", data_object_name: "manufacturing_routings", role: "master", necessity: "required", notes: "Operation sequence per part." },
  { module_code: "PLM-MFG-PROCESS", data_object_name: "plm_product_variants", role: "master", necessity: "required", notes: "Resolved variants of configurable products." },
  { module_code: "PLM-MFG-PROCESS", data_object_name: "engineering_parts", role: "consumer", necessity: "required", notes: "mBOM resolves to engineering_parts; routings reference part numbers." },
  { module_code: "PLM-MFG-PROCESS", data_object_name: "engineering_bom_items", role: "consumer", necessity: "required", notes: "mBOM authoring starts from the eBOM structure." },
  // PLM-COMPLIANCE masters + contributor from suppliers + consumer of parts
  { module_code: "PLM-COMPLIANCE", data_object_name: "product_compliance_declarations", role: "master", necessity: "required", notes: "Per part × substance × regulation declaration." },
  { module_code: "PLM-COMPLIANCE", data_object_name: "regulated_substances", role: "master", necessity: "required", notes: "Reference catalog of controlled substances." },
  { module_code: "PLM-COMPLIANCE", data_object_name: "engineering_parts", role: "consumer", necessity: "required", notes: "Compliance declarations attach to engineering_parts; roll-up traverses engineering_bom_items." },
  { module_code: "PLM-COMPLIANCE", data_object_name: "suppliers", role: "contributor", necessity: "required", notes: "Suppliers contribute substance content via material declarations; the catalog suppliers row is the contributor side of the compliance flow." },
  // PLM-REQUIREMENTS master + consumer of parts
  { module_code: "PLM-REQUIREMENTS", data_object_name: "engineering_requirements", role: "master", necessity: "required", notes: "System/SW/HW requirements with parent-child decomposition." },
  { module_code: "PLM-REQUIREMENTS", data_object_name: "engineering_parts", role: "consumer", necessity: "optional", notes: "Requirements allocate to subsystem parts; allocation is optional (some requirements are system-level only)." },
];

// ============================================================
// TRIGGER EVENTS (8 outbound)
// ============================================================

interface TriggerEventSpec {
  event_name: string;
  publisher_data_object: string;
  description: string;
  event_category: "lifecycle" | "state_change" | "threshold" | "signal";
}

const triggerEventSpecs: TriggerEventSpec[] = [
  { event_name: "engineering_change_order.released", publisher_data_object: "engineering_change_orders", description: "An ECO has been CAB-approved and released; affected parts now carry new released revisions and the change effective date has passed.", event_category: "state_change" },
  { event_name: "engineering_part.released", publisher_data_object: "engineering_parts", description: "A new engineering part has been released to production (first released revision exists).", event_category: "lifecycle" },
  { event_name: "manufacturing_bom.released", publisher_data_object: "manufacturing_boms", description: "An mBOM revision has been released; production planning should plan against the new structure.", event_category: "state_change" },
  { event_name: "manufacturing_routing.released", publisher_data_object: "manufacturing_routings", description: "A routing revision has been released; MES should regenerate work instructions.", event_category: "state_change" },
  { event_name: "product_compliance_declaration.approved", publisher_data_object: "product_compliance_declarations", description: "Compliance declaration approved; affected parts gate sellable-in-market flags.", event_category: "state_change" },
  { event_name: "cad_drawing.released", publisher_data_object: "cad_drawings", description: "A 2D drawing has been released; downstream consumers (service, manufacturing, customer) can pull the current revision.", event_category: "state_change" },
  { event_name: "engineering_requirement.verified", publisher_data_object: "engineering_requirements", description: "A requirement has been verified (test passed, inspection complete, analysis closed); traceability matrix updated.", event_category: "state_change" },
  { event_name: "engineering_part.obsoleted", publisher_data_object: "engineering_parts", description: "A part has been marked obsolete; downstream systems should stop ordering and start sunsetting.", event_category: "lifecycle" },
];

// ============================================================
// HANDOFFS (8 outbound cross-domain)
// ============================================================

interface HandoffSpec {
  event_name: string;
  target_domain_code: keyof typeof TARGET_DOMAIN_IDS;
  payload_data_object: string;
  source_module_code: string;
  integration_pattern: "event_stream" | "api_call" | "batch_sync" | "manual_handoff" | "file_drop" | "lifecycle_progression";
  friction_level: "low" | "medium" | "high";
  description: string;
}

const handoffSpecs: HandoffSpec[] = [
  {
    event_name: "engineering_change_order.released",
    target_domain_code: "MFG-OPS",
    payload_data_object: "manufacturing_boms",
    source_module_code: "PLM-ENG-CORE",
    integration_pattern: "api_call",
    friction_level: "high",
    description: "ECO release triggers MES to re-evaluate in-flight production orders against the new mBOM and routing. High friction: cross-vendor stack (PLM and MES often from different vendors), mid-cycle ECOs are textbook period/cycle-close coupling — backdated changes cascade across open production orders, and the cutover semantics (use-up-existing-stock vs. immediate-rev-jump) require manual coordination.",
  },
  {
    event_name: "engineering_change_order.released",
    target_domain_code: "ERP-FIN",
    payload_data_object: "engineering_parts",
    source_module_code: "PLM-ENG-CORE",
    integration_pattern: "api_call",
    friction_level: "high",
    description: "ECO release updates item-master attributes and costed-BOM rev in ERP. High friction: rev-controlled item master updates can break open POs and inventory reservations; backdated cost changes arrive after period close and cascade into restatement / re-recognition cycles.",
  },
  {
    event_name: "engineering_change_order.released",
    target_domain_code: "S2P",
    payload_data_object: "engineering_parts",
    source_module_code: "PLM-ENG-CORE",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "ECO release notifies S2P of part-spec changes that affect open requisitions / purchase orders. Sourcing may need to re-RFQ if the supplier cannot meet the new spec; medium friction because the change rarely invalidates the existing PO but routinely requires a side conversation.",
  },
  {
    event_name: "engineering_part.released",
    target_domain_code: "ERP-FIN",
    payload_data_object: "engineering_parts",
    source_module_code: "PLM-ENG-CORE",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "First release of a new engineering part triggers item-master creation in ERP. Medium friction: the field-mapping (PLM has richer attribute model than ERP item-master) routinely requires per-customer mapping rules.",
  },
  {
    event_name: "manufacturing_bom.released",
    target_domain_code: "MFG-OPS",
    payload_data_object: "manufacturing_boms",
    source_module_code: "PLM-MFG-PROCESS",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Released mBOM revision feeds MES production planning. Medium friction: mBOM changes mid-build raise the same in-flight production-order question as ECO releases but are usually narrower in scope.",
  },
  {
    event_name: "manufacturing_routing.released",
    target_domain_code: "MFG-OPS",
    payload_data_object: "manufacturing_routings",
    source_module_code: "PLM-MFG-PROCESS",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Released routing revision feeds MES work-instruction generation. Medium friction: operator training time, fixture changes, and standard-cost recomputation in ERP all cascade.",
  },
  {
    event_name: "product_compliance_declaration.approved",
    target_domain_code: "ERP-FIN",
    payload_data_object: "engineering_parts",
    source_module_code: "PLM-COMPLIANCE",
    integration_pattern: "api_call",
    friction_level: "medium",
    description: "Compliance approval gates the sellable-in-market flag on the item master per market / jurisdiction. Medium friction: per-market compliance status requires market-specific attribute model in ERP, often a per-customer extension.",
  },
  {
    event_name: "cad_drawing.released",
    target_domain_code: "FSM",
    payload_data_object: "cad_drawings",
    source_module_code: "PLM-CAD-PDM",
    integration_pattern: "api_call",
    friction_level: "low",
    description: "Released drawings published to the FSM service-technician portal so techs always pull the current revision when servicing the installed base. Low friction: read-only consumption with rev-pinning at install time.",
  },
];

// ============================================================
// DATA OBJECT RELATIONSHIPS (intra-PLM + users edges + cross-domain outbound)
// ============================================================

interface RelSpec {
  source: string; // data_object_name
  target: string; // data_object_name (or 'users' / 'suppliers' / 'customers')
  verb: string;
  inverse_verb: string;
  cardinality: "one_to_one" | "one_to_many" | "many_to_many";
  kind: "composition" | "reference" | "association" | "inheritance";
  is_required: boolean;
  owner_side: "source" | "target";
  notes?: string;
}

// Convention: authored from the "one" side as source for one_to_many rows
// (matches existing catalog pattern: "users signs documents" rather than
// "documents signed_by users"). For many_to_many, the actor / driver side is source.
const relationships: RelSpec[] = [
  // Intra-PLM (parts is the recurring source / parent / referenced side)
  { source: "engineering_parts", target: "engineering_revisions", verb: "is_revised_by", inverse_verb: "revises", cardinality: "one_to_many", kind: "composition", is_required: true, owner_side: "source", notes: "A part has many revisions over time; the part owns its revisions." },
  { source: "engineering_change_orders", target: "engineering_revisions", verb: "mints", inverse_verb: "is_minted_by", cardinality: "one_to_many", kind: "reference", is_required: true, owner_side: "source", notes: "An ECO release is the only mechanism that creates a new released engineering_revision." },
  { source: "engineering_change_orders", target: "engineering_parts", verb: "affects", inverse_verb: "is_affected_by", cardinality: "many_to_many", kind: "association", is_required: true, owner_side: "source", notes: "An ECO can affect many parts; a part can be touched by many ECOs over time." },
  { source: "engineering_parts", target: "engineering_bom_items", verb: "is_parent_of", inverse_verb: "uses_parent", cardinality: "one_to_many", kind: "composition", is_required: true, owner_side: "source", notes: "A parent part has many BOM-item rows (each pointing to a child); the part owns these rows." },
  { source: "engineering_parts", target: "engineering_bom_items", verb: "appears_as_child_in", inverse_verb: "uses_child", cardinality: "one_to_many", kind: "reference", is_required: true, owner_side: "source", notes: "A child part appears as the child in many BOM-item rows across many parents; together with is_parent_of this forms the recursive BOM hierarchy." },
  { source: "engineering_parts", target: "cad_models", verb: "is_represented_by", inverse_verb: "represents", cardinality: "one_to_many", kind: "reference", is_required: true, owner_side: "source", notes: "A part may have multiple CAD-model files (assembly + child parts); each CAD model backs one part." },
  { source: "cad_models", target: "cad_drawings", verb: "is_documented_by", inverse_verb: "documents", cardinality: "one_to_many", kind: "reference", is_required: false, owner_side: "source", notes: "A CAD model may have many drawings (multiple views, exploded, detail); drawing-only releases exist in 2D-only industries." },
  { source: "engineering_parts", target: "manufacturing_boms", verb: "is_manufactured_via", inverse_verb: "manufactures", cardinality: "one_to_many", kind: "reference", is_required: true, owner_side: "source", notes: "A part can have multiple mBOM revisions over time; each mBOM targets one part as the manufactured top-level assembly." },
  { source: "engineering_parts", target: "manufacturing_routings", verb: "is_routed_by", inverse_verb: "routes", cardinality: "one_to_many", kind: "reference", is_required: true, owner_side: "source", notes: "A part can have multiple routing revisions; each routing targets one part." },
  { source: "engineering_parts", target: "plm_product_variants", verb: "is_configured_into", inverse_verb: "configures", cardinality: "one_to_many", kind: "reference", is_required: true, owner_side: "source", notes: "A configurable parent part resolves into many variants; each variant resolves to one parent." },
  { source: "engineering_parts", target: "product_compliance_declarations", verb: "has_declaration", inverse_verb: "declares_for", cardinality: "one_to_many", kind: "reference", is_required: true, owner_side: "source", notes: "Each part can have many declarations (one per substance × regulation)." },
  { source: "regulated_substances", target: "product_compliance_declarations", verb: "is_declared_in", inverse_verb: "declares_substance", cardinality: "one_to_many", kind: "reference", is_required: true, owner_side: "source", notes: "Each substance is declared in many product_compliance_declarations across the catalog." },
  { source: "engineering_requirements", target: "engineering_requirements", verb: "decomposes_to", inverse_verb: "decomposes_from", cardinality: "one_to_many", kind: "composition", is_required: false, owner_side: "source", notes: "Parent-child decomposition: system to subsystem to component requirements." },
  { source: "engineering_requirements", target: "engineering_parts", verb: "allocates_to", inverse_verb: "is_allocated_by", cardinality: "many_to_many", kind: "reference", is_required: false, owner_side: "source", notes: "Requirements allocate to subsystem parts; system-level requirements have no allocation." },

  // users edges (Rule #10) — users is the platform_builtin actor, source for all
  { source: "users", target: "engineering_change_orders", verb: "originates", inverse_verb: "is_originated_by", cardinality: "one_to_many", kind: "association", is_required: true, owner_side: "source", notes: "The originating engineer who raised the ECR/ECO." },
  { source: "users", target: "engineering_change_orders", verb: "approves", inverse_verb: "is_approved_by", cardinality: "many_to_many", kind: "association", is_required: true, owner_side: "source", notes: "CAB members approve; many-to-many because a CAB has multiple members and a user sits on many CABs over time." },
  { source: "users", target: "engineering_parts", verb: "owns", inverse_verb: "is_owned_by", cardinality: "one_to_many", kind: "association", is_required: true, owner_side: "source", notes: "Every part has a designated owner (typically the responsible engineer)." },
  { source: "users", target: "cad_models", verb: "checks_out", inverse_verb: "is_checked_out_by", cardinality: "one_to_many", kind: "association", is_required: false, owner_side: "source", notes: "CAD vault check-out lock; null when the model is not currently checked out." },
  { source: "users", target: "cad_drawings", verb: "releases", inverse_verb: "is_released_by", cardinality: "one_to_many", kind: "association", is_required: true, owner_side: "source", notes: "The drafter who released the drawing revision." },
  { source: "users", target: "engineering_requirements", verb: "authors", inverse_verb: "is_authored_by", cardinality: "one_to_many", kind: "association", is_required: true, owner_side: "source", notes: "Requirement author (typically systems engineering)." },
  { source: "users", target: "product_compliance_declarations", verb: "approves_compliance", inverse_verb: "is_approved_by_user", cardinality: "one_to_many", kind: "association", is_required: true, owner_side: "source", notes: "Regulatory-affairs single approver per declaration." },

  // Cross-domain outbound (B8) — outbound from PLM only
  { source: "engineering_parts", target: "suppliers", verb: "sourced_from", inverse_verb: "supplies", cardinality: "many_to_many", kind: "reference", is_required: false, owner_side: "source", notes: "Multi-source parts have many approved suppliers; purchased parts must have at least one. Outbound edge: PLM-mastered part references S2P-mastered supplier." },
  { source: "suppliers", target: "product_compliance_declarations", verb: "submits", inverse_verb: "received_from", cardinality: "one_to_many", kind: "reference", is_required: true, owner_side: "source", notes: "Each supplier submits many material declarations; each declaration cites the supplier that submitted the underlying material declaration." },
  { source: "cad_drawings", target: "customers", verb: "shared_with", inverse_verb: "receives_drawing", cardinality: "many_to_many", kind: "reference", is_required: false, owner_side: "source", notes: "Some industries (defense, aerospace, EMS-contracts) ship drawings to customers as part of the deliverable; in others drawings are internal-only." },
];

// ============================================================
// ALIASES
// ============================================================

interface AliasSpec {
  data_object_name: string;
  alias_name: string;
  notes?: string;
}

// Schema: alias_type enum is only synonym / industry_term / solution_term.
// The latter two require industry_id / solution_id FKs. Authoring everything as
// `synonym` and putting vendor / industry context in `notes` so the FK plumbing
// can be added later if the user wants finer attribution.
const aliases: AliasSpec[] = [
  { data_object_name: "engineering_parts", alias_name: "Item", notes: "SAP-side term for the same concept (SAP item master)." },
  { data_object_name: "engineering_parts", alias_name: "Part Master", notes: "Teamcenter / generic PLM-industry term." },
  { data_object_name: "engineering_parts", alias_name: "Component", notes: "Common in electronics design; the leaf-level purchased item." },
  { data_object_name: "engineering_revisions", alias_name: "Rev", notes: "Universal informal abbreviation." },
  { data_object_name: "engineering_revisions", alias_name: "Item Revision", notes: "SAP terminology for the same concept." },
  { data_object_name: "engineering_change_orders", alias_name: "ECO", notes: "Standard industry abbreviation." },
  { data_object_name: "engineering_change_orders", alias_name: "ECR", notes: "Engineering Change Request, the originating-stage record; many orgs collapse ECR/ECO into one record." },
  { data_object_name: "engineering_change_orders", alias_name: "ECN", notes: "Engineering Change Notice, the released-and-notified-downstream stage." },
  { data_object_name: "engineering_change_orders", alias_name: "Change Notice" },
  { data_object_name: "engineering_bom_items", alias_name: "BOM Line" },
  { data_object_name: "engineering_bom_items", alias_name: "Bill of Material Line", notes: "Spelled-out industry term." },
  { data_object_name: "cad_models", alias_name: "Part File", notes: "SOLIDWORKS .sldprt naming." },
  { data_object_name: "cad_models", alias_name: "Assembly File", notes: "Used loosely for the assembly-level CAD model." },
  { data_object_name: "cad_models", alias_name: "3D Model" },
  { data_object_name: "cad_drawings", alias_name: "Print", notes: "Shop-floor informal term for the 2D drawing." },
  { data_object_name: "cad_drawings", alias_name: "Engineering Drawing", notes: "Industry-standard formal term." },
  { data_object_name: "manufacturing_boms", alias_name: "mBOM", notes: "Standard PLM/MES abbreviation." },
  { data_object_name: "manufacturing_boms", alias_name: "Production BOM" },
  { data_object_name: "manufacturing_routings", alias_name: "Process Plan", notes: "Common industry term." },
  { data_object_name: "manufacturing_routings", alias_name: "Routing Sheet" },
  { data_object_name: "plm_product_variants", alias_name: "Configuration", notes: "Buyer-facing term for a resolved variant." },
  { data_object_name: "plm_product_variants", alias_name: "Variant", notes: "Short form." },
  { data_object_name: "product_compliance_declarations", alias_name: "Material Declaration", notes: "Supplier-side terminology for the same record." },
  { data_object_name: "product_compliance_declarations", alias_name: "Substance Declaration" },
  { data_object_name: "regulated_substances", alias_name: "SVHC", notes: "REACH-specific abbreviation: Substance of Very High Concern." },
  { data_object_name: "regulated_substances", alias_name: "Controlled Substance" },
  { data_object_name: "engineering_requirements", alias_name: "Requirement", notes: "Short form." },
  { data_object_name: "engineering_requirements", alias_name: "System Requirement", notes: "Aerospace / defense terminology for the top-tier requirement." },
];

// ============================================================
// LIFECYCLE STATES
// ============================================================

interface LifecycleSpec {
  data_object_name: string;
  module_code: string | null; // null = "always reachable when master is installed"
  state_name: string;
  state_order: number;
  is_initial: boolean;
  is_terminal: boolean;
  requires_permission: boolean;
  permission_verb_override?: string;
  description: string;
}

const lifecycleStates: LifecycleSpec[] = [
  // engineering_parts
  { data_object_name: "engineering_parts", module_code: "PLM-ENG-CORE", state_name: "draft", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, description: "Newly minted part; editable by owner." },
  { data_object_name: "engineering_parts", module_code: "PLM-ENG-CORE", state_name: "in_review", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "submit_part_review", description: "Part submitted for design review." },
  { data_object_name: "engineering_parts", module_code: "PLM-ENG-CORE", state_name: "released", state_order: 3, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "release_part", description: "Released to production; further changes require an ECO." },
  { data_object_name: "engineering_parts", module_code: "PLM-ENG-CORE", state_name: "obsolete", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "obsolete_part", description: "End-of-life; no new production, sunsetting in service inventory." },

  // engineering_revisions
  { data_object_name: "engineering_revisions", module_code: "PLM-ENG-CORE", state_name: "working", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, description: "Working revision; editable until release." },
  { data_object_name: "engineering_revisions", module_code: "PLM-ENG-CORE", state_name: "released", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "release_revision", description: "Released revision; immutable. Further changes require a new ECO." },
  { data_object_name: "engineering_revisions", module_code: "PLM-ENG-CORE", state_name: "superseded", state_order: 3, is_initial: false, is_terminal: true, requires_permission: false, description: "Replaced by a newer released revision; remains queryable for historical traceability." },

  // engineering_change_orders
  { data_object_name: "engineering_change_orders", module_code: "PLM-ENG-CORE", state_name: "open", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, description: "ECR captured; impact assessment not yet started." },
  { data_object_name: "engineering_change_orders", module_code: "PLM-ENG-CORE", state_name: "impact_assessment", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "submit_change_assessment", description: "Where-used analysis complete; cost and schedule impact captured." },
  { data_object_name: "engineering_change_orders", module_code: "PLM-ENG-CORE", state_name: "cab_review", state_order: 3, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "submit_to_cab", description: "Submitted to the Change Approval Board." },
  { data_object_name: "engineering_change_orders", module_code: "PLM-ENG-CORE", state_name: "approved", state_order: 4, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "approve_change_order", description: "CAB approved; awaiting effective date." },
  { data_object_name: "engineering_change_orders", module_code: "PLM-ENG-CORE", state_name: "released", state_order: 5, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "release_change_order", description: "Effective; downstream systems notified." },
  { data_object_name: "engineering_change_orders", module_code: "PLM-ENG-CORE", state_name: "closed", state_order: 6, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "close_change_order", description: "All affected parts updated and verified; ECO closed." },

  // manufacturing_boms
  { data_object_name: "manufacturing_boms", module_code: "PLM-MFG-PROCESS", state_name: "draft", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, description: "Manufacturing engineering authoring; editable." },
  { data_object_name: "manufacturing_boms", module_code: "PLM-MFG-PROCESS", state_name: "released", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "release_mbom", description: "Released; feeds MES and ERP." },
  { data_object_name: "manufacturing_boms", module_code: "PLM-MFG-PROCESS", state_name: "superseded", state_order: 3, is_initial: false, is_terminal: true, requires_permission: false, description: "Replaced by a newer released mBOM revision." },

  // product_compliance_declarations
  { data_object_name: "product_compliance_declarations", module_code: "PLM-COMPLIANCE", state_name: "requested", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, description: "Declaration request raised to supplier; awaiting response." },
  { data_object_name: "product_compliance_declarations", module_code: "PLM-COMPLIANCE", state_name: "received", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "log_supplier_declaration", description: "Supplier submitted declaration; pending regulatory review." },
  { data_object_name: "product_compliance_declarations", module_code: "PLM-COMPLIANCE", state_name: "approved", state_order: 3, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "approve_compliance_declaration", description: "Regulatory affairs approved; gates sellable-in-market flags." },
  { data_object_name: "product_compliance_declarations", module_code: "PLM-COMPLIANCE", state_name: "expired", state_order: 4, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "expire_compliance_declaration", description: "Declaration expired or regulation changed; sellable-in-market gates flip closed pending re-declaration." },

  // engineering_requirements
  { data_object_name: "engineering_requirements", module_code: "PLM-REQUIREMENTS", state_name: "draft", state_order: 1, is_initial: true, is_terminal: false, requires_permission: false, description: "Captured but not yet reviewed." },
  { data_object_name: "engineering_requirements", module_code: "PLM-REQUIREMENTS", state_name: "reviewed", state_order: 2, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "submit_requirement_review", description: "Peer-reviewed; quality acceptable for approval." },
  { data_object_name: "engineering_requirements", module_code: "PLM-REQUIREMENTS", state_name: "approved", state_order: 3, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "approve_requirement", description: "Stakeholder-approved; baselined; changes require change-control." },
  { data_object_name: "engineering_requirements", module_code: "PLM-REQUIREMENTS", state_name: "verified", state_order: 4, is_initial: false, is_terminal: false, requires_permission: true, permission_verb_override: "verify_requirement", description: "Verification method executed and passed; traceability complete." },
  { data_object_name: "engineering_requirements", module_code: "PLM-REQUIREMENTS", state_name: "obsolete", state_order: 5, is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "obsolete_requirement", description: "Requirement retired (descoped or superseded)." },
];

// ============================================================
// RUN
// ============================================================

async function main() {
  console.log("PLM Phase B loader (2026-05-24)");
  console.log("================================");

  // ---- Phase B.1: data_objects ----
  console.log("\n=== Phase B.1: data_objects ===");
  const existingDoRows = await get(
    `/data_objects?data_object_name=in.(${dataObjects.map(d => d.data_object_name).join(",")})&select=id,data_object_name`,
  );
  const existingDoNames = new Set(existingDoRows.map(r => String(r.data_object_name)));
  const newDoRows = dataObjects
    .filter(d => !existingDoNames.has(d.data_object_name))
    .map(d => ({
      data_object_name: d.data_object_name,
      singular_label: d.singular_label,
      plural_label: d.plural_label,
      description: d.description,
      kind: "domain_owned",
      has_personal_content: d.has_personal_content ?? false,
      has_submit_lock: d.has_submit_lock ?? false,
      has_single_approver: d.has_single_approver ?? false,
      is_canonical_bare_word: d.is_canonical_bare_word ?? false,
      naming_authority_rationale: d.naming_authority_rationale ?? "",
      notes: d.notes ?? "",
      record_status: "new",
    }));
  if (newDoRows.length > 0) {
    console.log(`  inserting ${newDoRows.length} new data_objects`);
    await insert("/data_objects", newDoRows);
  } else {
    console.log("  all data_objects already present");
  }
  const allDoRows = await get(
    `/data_objects?data_object_name=in.(${[...dataObjects.map(d => d.data_object_name), "users", "suppliers", "customers"].join(",")})&select=id,data_object_name`,
  );
  const doMap = new Map(allDoRows.map(r => [String(r.data_object_name), Number(r.id)]));
  for (const d of dataObjects) {
    if (!doMap.has(d.data_object_name)) throw new Error(`data_object ${d.data_object_name} missing after insert`);
  }

  // ---- Phase B.2: domain_module_data_objects ----
  console.log("\n=== Phase B.2: domain_module_data_objects ===");
  const plmModules = await get(
    `/domain_modules?domain_id=eq.${PLM_DOMAIN_ID}&select=id,domain_module_code`,
  );
  const modIdMap = new Map(plmModules.map(m => [String(m.domain_module_code), Number(m.id)]));
  const modIds = [...modIdMap.values()];
  const existingDmdo = await get(
    `/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=domain_module_id,data_object_id`,
  );
  const existingDmdoKeys = new Set(existingDmdo.map(r => `${r.domain_module_id}:${r.data_object_id}`));
  const newDmdo: Row[] = [];
  for (const spec of dmdoSpecs) {
    const mid = modIdMap.get(spec.module_code);
    const did = doMap.get(spec.data_object_name);
    if (!mid) throw new Error(`module ${spec.module_code} not found`);
    if (!did) throw new Error(`data_object ${spec.data_object_name} not found`);
    const key = `${mid}:${did}`;
    if (existingDmdoKeys.has(key)) continue;
    newDmdo.push({
      domain_module_id: mid,
      data_object_id: did,
      role: spec.role,
      necessity: spec.necessity,
      notes: spec.notes,
    });
  }
  if (newDmdo.length > 0) {
    console.log(`  inserting ${newDmdo.length} domain_module_data_objects rows`);
    await insert("/domain_module_data_objects", newDmdo);
  } else {
    console.log("  all DMDO rows already present");
  }

  // ---- Phase B.3: trigger_events ----
  console.log("\n=== Phase B.3: trigger_events ===");
  const existingEvents = await get(
    `/trigger_events?event_name=in.(${triggerEventSpecs.map(e => e.event_name).join(",")})&select=id,event_name`,
  );
  const existingEventNames = new Set(existingEvents.map(e => String(e.event_name)));
  const newEvents = triggerEventSpecs
    .filter(e => !existingEventNames.has(e.event_name))
    .map(e => ({
      event_name: e.event_name,
      data_object_id: doMap.get(e.publisher_data_object)!,
      description: e.description,
      event_category: e.event_category,
      record_status: "new",
    }));
  if (newEvents.length > 0) {
    console.log(`  inserting ${newEvents.length} trigger_events`);
    await insert("/trigger_events", newEvents);
  } else {
    console.log("  all trigger_events already present");
  }
  const allEvents = await get(
    `/trigger_events?event_name=in.(${triggerEventSpecs.map(e => e.event_name).join(",")})&select=id,event_name`,
  );
  const eventIdMap = new Map(allEvents.map(e => [String(e.event_name), Number(e.id)]));

  // ---- Phase B.4: handoffs ----
  console.log("\n=== Phase B.4: handoffs ===");
  const existingHandoffs = await get(
    `/handoffs?source_domain_id=eq.${PLM_DOMAIN_ID}&select=trigger_event_id,target_domain_id`,
  );
  const existingHandoffKeys = new Set(
    existingHandoffs.map(h => `${h.trigger_event_id}:${h.target_domain_id}`),
  );
  const newHandoffs: Row[] = [];
  for (const h of handoffSpecs) {
    const evId = eventIdMap.get(h.event_name)!;
    const targetDomainId = TARGET_DOMAIN_IDS[h.target_domain_code];
    const key = `${evId}:${targetDomainId}`;
    if (existingHandoffKeys.has(key)) continue;
    const srcModId = modIdMap.get(h.source_module_code);
    if (!srcModId) throw new Error(`source module ${h.source_module_code} not found`);
    newHandoffs.push({
      source_domain_id: PLM_DOMAIN_ID,
      target_domain_id: targetDomainId,
      source_domain_module_id: srcModId,
      target_domain_module_id: null, // target NULL until target domain is modularized (per B10b authoring rule)
      trigger_event_id: evId,
      data_object_id: doMap.get(h.payload_data_object)!,
      integration_pattern: h.integration_pattern,
      friction_level: h.friction_level,
      description: h.description,
      notes: `target NULL until ${h.target_domain_code} is modularized`,
      record_status: "new",
    });
  }
  if (newHandoffs.length > 0) {
    console.log(`  inserting ${newHandoffs.length} handoffs`);
    await insert("/handoffs", newHandoffs);
  } else {
    console.log("  all handoffs already present");
  }

  // ---- Phase B.5: data_object_relationships ----
  console.log("\n=== Phase B.5: data_object_relationships ===");
  // Pull all existing relationships across the data_object_ids we touch, key by source+target+verb
  const touchedIds = new Set<number>();
  for (const r of relationships) {
    touchedIds.add(doMap.get(r.source)!);
    touchedIds.add(doMap.get(r.target)!);
  }
  const existingRels = await get(
    `/data_object_relationships?data_object_id=in.(${[...touchedIds].join(",")})&select=data_object_id,related_data_object_id,relationship_verb`,
  );
  const existingRelKeys = new Set(
    existingRels.map(r => `${r.data_object_id}:${r.related_data_object_id}:${r.relationship_verb}`),
  );
  const newRels: Row[] = [];
  for (const r of relationships) {
    const sid = doMap.get(r.source)!;
    const tid = doMap.get(r.target)!;
    const key = `${sid}:${tid}:${r.verb}`;
    if (existingRelKeys.has(key)) continue;
    newRels.push({
      data_object_id: sid,
      related_data_object_id: tid,
      relationship_verb: r.verb,
      inverse_verb: r.inverse_verb,
      relationship_type: r.cardinality,
      relationship_kind: r.kind,
      is_required: r.is_required,
      owner_side: r.owner_side,
      notes: r.notes ?? "",
      record_status: "new",
    });
  }
  if (newRels.length > 0) {
    console.log(`  inserting ${newRels.length} data_object_relationships`);
    await insert("/data_object_relationships", newRels);
  } else {
    console.log("  all relationships already present");
  }

  // ---- Phase B.6: data_object_aliases ----
  console.log("\n=== Phase B.6: data_object_aliases ===");
  const aliasDoIds = [...new Set(aliases.map(a => doMap.get(a.data_object_name)!))];
  const existingAliases = await get(
    `/data_object_aliases?data_object_id=in.(${aliasDoIds.join(",")})&select=data_object_id,alias_name`,
  );
  const existingAliasKeys = new Set(
    existingAliases.map(a => `${a.data_object_id}:${a.alias_name}`),
  );
  const newAliases: Row[] = [];
  for (const a of aliases) {
    const did = doMap.get(a.data_object_name)!;
    const key = `${did}:${a.alias_name}`;
    if (existingAliasKeys.has(key)) continue;
    newAliases.push({
      data_object_id: did,
      alias_name: a.alias_name,
      alias_type: "synonym",
      notes: a.notes ?? "",
      record_status: "new",
    });
  }
  if (newAliases.length > 0) {
    console.log(`  inserting ${newAliases.length} data_object_aliases`);
    await insert("/data_object_aliases", newAliases);
  } else {
    console.log("  all aliases already present");
  }

  // ---- Phase B.7: data_object_lifecycle_states ----
  console.log("\n=== Phase B.7: data_object_lifecycle_states ===");
  const lcDoIds = [...new Set(lifecycleStates.map(l => doMap.get(l.data_object_name)!))];
  const existingLc = await get(
    `/data_object_lifecycle_states?data_object_id=in.(${lcDoIds.join(",")})&select=data_object_id,state_name`,
  );
  const existingLcKeys = new Set(
    existingLc.map(l => `${l.data_object_id}:${l.state_name}`),
  );
  const newLc: Row[] = [];
  for (const l of lifecycleStates) {
    const did = doMap.get(l.data_object_name)!;
    const key = `${did}:${l.state_name}`;
    if (existingLcKeys.has(key)) continue;
    const mid = l.module_code === null ? null : modIdMap.get(l.module_code);
    if (l.module_code !== null && !mid) throw new Error(`module ${l.module_code} not found for lifecycle state ${l.state_name}`);
    newLc.push({
      data_object_id: did,
      state_name: l.state_name,
      state_order: l.state_order,
      is_initial: l.is_initial,
      is_terminal: l.is_terminal,
      requires_permission: l.requires_permission,
      permission_verb_override: l.permission_verb_override ?? "",
      domain_module_id: mid,
      description: l.description,
    });
  }
  if (newLc.length > 0) {
    console.log(`  inserting ${newLc.length} data_object_lifecycle_states`);
    await insert("/data_object_lifecycle_states", newLc);
  } else {
    console.log("  all lifecycle states already present");
  }

  // ---- Post-load audit ----
  console.log("\n=== Post-load counts ===");
  const counts = {
    plm_masters: (await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&role=eq.master&select=data_object_id`)).length,
    plm_dmdo_total: (await get(`/domain_module_data_objects?domain_module_id=in.(${modIds.join(",")})&select=data_object_id`)).length,
    plm_outbound_handoffs: (await get(`/handoffs?source_domain_id=eq.${PLM_DOMAIN_ID}&select=id`)).length,
    plm_trigger_events: (await get(`/trigger_events?data_object_id=in.(${[...dataObjects.map(d => doMap.get(d.data_object_name)!)].join(",")})&select=id`)).length,
    plm_relationships: (await get(`/data_object_relationships?data_object_id=in.(${[...dataObjects.map(d => doMap.get(d.data_object_name)!)].join(",")})&select=data_object_id`)).length,
    plm_aliases: (await get(`/data_object_aliases?data_object_id=in.(${aliasDoIds.join(",")})&select=alias_name`)).length,
    plm_lifecycle_states: (await get(`/data_object_lifecycle_states?data_object_id=in.(${lcDoIds.join(",")})&select=state_name`)).length,
  };
  console.log(counts);
}

await main();
console.log("\nDone.");
