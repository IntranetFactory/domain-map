// Deploy domain_map (master) semantic model to Semantius.
// Run: bun run c:/dev/domain-map/.tmp_deploy/deploy_domain_map.ts

const MODULE_SLUG = "domain_map";
const MODULE_NAME = "Domain Map";
const MODULE_DESC = "Domains, Capabilities & Solutions";
const READ_PERM = `${MODULE_SLUG}:read`;
const MANAGE_PERM = `${MODULE_SLUG}:manage`;
const VIEWER_ROLE = `${MODULE_SLUG}_viewer`;
const MANAGER_ROLE = `${MODULE_SLUG}_manager`;

async function call(tool: string, payload: unknown, opts: { single?: boolean } = {}): Promise<any> {
  const args = ["semantius"];
  if (opts.single) args.push("--single");
  args.push("call", "crud", tool);
  const proc = Bun.spawn(args, {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  }
  return stdout.trim() ? JSON.parse(stdout) : null;
}

async function readSingle(tool: string, filters: string): Promise<any | null> {
  const args = ["semantius", "--single", "call", "crud", tool];
  const proc = Bun.spawn(args, {
    stdin: new Response(JSON.stringify({ filters })),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code === 1) return null; // not found
  if (code !== 0) throw new Error(`${tool} (exit ${code}): ${stderr || stdout}`);
  return JSON.parse(stdout);
}

// ------ logo color (dark) ------
function darkLogoColor(): string {
  const families = [
    [350, 360, 0, 10],
    [20, 40],
    [100, 150],
    [205, 240],
  ];
  const fam = families[Math.floor(Math.random() * families.length)];
  let h: number;
  if (fam.length === 4) {
    h = Math.random() < 0.5
      ? fam[0] + Math.random() * (fam[1] - fam[0])
      : fam[2] + Math.random() * (fam[3] - fam[2]);
  } else {
    h = fam[0] + Math.random() * (fam[1] - fam[0]);
  }
  const s = 55 + Math.random() * 35;
  const l = 18 + Math.random() * 12;
  // HSL → RGB
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return "#" + [r, g, b].map(n => n.toString(16).padStart(2, "0")).join("");
}

// ------ Stage 4a: module + scaffold ------

console.log("=== Stage 4a: module + scaffold ===");
let mod = await readSingle("read_module", `module_slug=eq.${MODULE_SLUG}`);
if (!mod) {
  await call("create_module", {
    data: {
      module_name: MODULE_NAME,
      module_slug: MODULE_SLUG,
      description: MODULE_DESC,
      module_type: "master",
    },
  });
  mod = await readSingle("read_module", `module_slug=eq.${MODULE_SLUG}`);
  console.log(`  ✨ Created module ${MODULE_SLUG} (id=${mod.id})`);
} else {
  console.log(`  ♻ Module exists (id=${mod.id})`);
}
const MODULE_ID = mod.id;

if (!mod.logo_color) {
  const color = darkLogoColor();
  await call("update_module", { id: MODULE_ID, data: { logo_color: color } });
  console.log(`  🎨 Set logo_color=${color}`);
}

// Permissions
async function ensurePermission(name: string, description: string) {
  let p = await readSingle("read_permission", `permission_name=eq.${name}`);
  if (!p) {
    await call("create_permission", {
      data: { permission_name: name, description, module_id: MODULE_ID },
    });
    p = await readSingle("read_permission", `permission_name=eq.${name}`);
    console.log(`  ✨ Permission ${name} (id=${p.id})`);
  } else {
    if (p.module_id !== MODULE_ID || p.description !== description) {
      await call("update_permission", {
        id: p.id,
        data: { module_id: MODULE_ID, description },
      });
      console.log(`  ♻ Permission ${name} reconciled`);
    } else {
      console.log(`  ♻ Permission ${name} (id=${p.id})`);
    }
  }
  return p.id;
}

const readPermId = await ensurePermission(
  READ_PERM,
  "Read every record in the catalog. Typically: every user of the catalog.",
);
const managePermId = await ensurePermission(
  MANAGE_PERM,
  "Create and edit catalog records across every entity. Typically: catalog curators, research agents.",
);

// Hierarchy: manage → read
async function ensureHierarchy(incl: number, included: number, origin: string) {
  const existing = await readSingle(
    "read_permission_hierarchy",
    `including_permission_id=eq.${incl}&included_permission_id=eq.${included}`,
  );
  if (!existing) {
    await call("create_permission_hierarchy", {
      data: { including_permission_id: incl, included_permission_id: included, origin },
    });
    console.log(`  ✨ Hierarchy ${incl}→${included} (origin=${origin})`);
  } else {
    console.log(`  ♻ Hierarchy ${incl}→${included}`);
  }
}
await ensureHierarchy(managePermId, readPermId, "model_master");

// Roles
async function ensureRole(slug: string, roleName: string, description: string) {
  let r = await readSingle("read_role", `slug=eq.${slug}`);
  if (!r) {
    await call("create_role", {
      data: { slug, role_name: roleName, description, module_id: MODULE_ID, origin: "model_master" },
    });
    r = await readSingle("read_role", `slug=eq.${slug}`);
    console.log(`  ✨ Role ${slug} (id=${r.id})`);
  } else {
    console.log(`  ♻ Role ${slug} (id=${r.id})`);
  }
  return r.id;
}
const viewerRoleId = await ensureRole(
  VIEWER_ROLE,
  `${MODULE_NAME} Viewer`,
  `Default viewer role for ${MODULE_NAME}`,
);
const managerRoleId = await ensureRole(
  MANAGER_ROLE,
  `${MODULE_NAME} Manager`,
  `Default manager role for ${MODULE_NAME}`,
);

async function ensureRolePermission(role_id: number, permission_id: number) {
  const rp = await readSingle(
    "read_role_permission",
    `role_id=eq.${role_id}&permission_id=eq.${permission_id}`,
  );
  if (!rp) {
    await call("create_role_permission", { data: { role_id, permission_id } });
    console.log(`  ✨ role_permission role=${role_id} perm=${permission_id}`);
  }
}
await ensureRolePermission(viewerRoleId, readPermId);
await ensureRolePermission(managerRoleId, managePermId);

// Module references
await call("update_module", {
  id: MODULE_ID,
  data: {
    view_permission: READ_PERM,
    manage_permission_id: managePermId,
    default_viewer_role_id: viewerRoleId,
    default_manager_role_id: managerRoleId,
  },
});
console.log("  ✓ Module FKs updated");

// ------ Stage 4c: entities ------

type FieldSpec = {
  field_name: string;
  format: string;
  title: string;
  description?: string;
  reference_table?: string;
  reference_delete_mode?: string;
  relationship_label?: string;
  default_value?: string;
  enum_values?: string[];
  is_unique?: boolean;
  selfRef?: boolean; // create in second pass
  input_type_rule?: any;
};

type EntitySpec = {
  table_name: string;
  singular: string; // snake_case singular of table_name
  singular_label: string;
  plural_label: string;
  label_column: string;
  label_column_title: string; // title for the auto-created label field
  description: string;
  computed_fields?: any[];
  validation_rules?: any[];
  fields: FieldSpec[];
};

const RECORD_STATUS_ENUM = ["new", "pending", "approved", "rejected"];

function recordStatusField(): FieldSpec {
  return {
    field_name: "record_status",
    format: "enum",
    title: "Record Status",
    enum_values: RECORD_STATUS_ENUM,
    default_value: "new",
  };
}

function notesField(): FieldSpec {
  return { field_name: "notes", format: "multiline", title: "Notes" };
}

const ENTITIES: EntitySpec[] = [
  {
    table_name: "industries",
    singular: "industry",
    singular_label: "Industry",
    plural_label: "Industries",
    label_column: "industry_name",
    label_column_title: "Industry Name",
    description: "One record per industry the catalog cares about. Self-referential to support a hierarchy (Financial Services contains Banking; Banking contains Retail Banking and Investment Banking).",
    fields: [
      { field_name: "description", format: "multiline", title: "Description" },
      { field_name: "parent_industry_id", format: "reference", title: "Parent Industry", reference_table: "industries", reference_delete_mode: "clear", relationship_label: "parent of", selfRef: true },
      { field_name: "naics_code", format: "string", title: "NAICS Code", description: "NAICS 6-digit numeric code for cross-reference to standard industry classification" },
      recordStatusField(),
    ],
  },
  {
    table_name: "business_functions",
    singular: "business_function",
    singular_label: "Business Function",
    plural_label: "Business Functions",
    label_column: "business_function_name",
    label_column_title: "Function Name",
    description: "Reference catalog of typical functional roles in an organization (Sales, Marketing, HR, IT, Finance, ...). These are functional abstractions, not org-chart-specific departments. Self-referential to support a function hierarchy (Engineering contains Frontend, Backend, Platform).",
    fields: [
      { field_name: "description", format: "multiline", title: "Description" },
      { field_name: "parent_business_function_id", format: "reference", title: "Parent Function", reference_table: "business_functions", reference_delete_mode: "clear", relationship_label: "parent of", selfRef: true },
      recordStatusField(),
    ],
  },
  {
    table_name: "domains",
    singular: "domain",
    singular_label: "Domain",
    plural_label: "Domains",
    label_column: "domain_name",
    label_column_title: "Domain Name",
    description: "System-type domains (CRM, ITSM, HRIS, MDM, ATS, ERP, CMS, ...). Self-referential to support a sub-domain hierarchy (ITSM contains Incident Management, Problem Management, Change Management).",
    fields: [
      { field_name: "domain_code", format: "string", title: "Code", description: "Short acronym or abbreviation (CRM, ITSM, CMDB) for compact display" },
      { field_name: "description", format: "multiline", title: "Description" },
      { field_name: "parent_domain_id", format: "reference", title: "Parent Domain", reference_table: "domains", reference_delete_mode: "clear", relationship_label: "parent of", selfRef: true },
      recordStatusField(),
    ],
  },
  {
    table_name: "capabilities",
    singular: "capability",
    singular_label: "Capability",
    plural_label: "Capabilities",
    label_column: "capability_name",
    label_column_title: "Capability Name",
    description: "What an organization can do, expressed as nouns (Lead Management, Automated Invoice Matching, Workforce Scheduling, Predictive Maintenance). Capabilities are the strategic-architecture bridge between business functions (who needs them) and solutions (what software delivers them). Hierarchical to support standard capability maps (Customer Management contains Lead Management, Account Management, Opportunity Management). Capabilities are independent of which solution delivers them; a capability exists in the catalog whether the organization is mature in it or not, and the solution-capabilities junction records who can satisfy it.",
    fields: [
      { field_name: "capability_code", format: "string", title: "Code", description: "Short identifier (LEAD-MGMT, INV-MATCH, WF-SCHED) or hierarchical code from a reference framework (APQC PCF level-3 IDs)" },
      { field_name: "description", format: "multiline", title: "Description" },
      { field_name: "parent_capability_id", format: "reference", title: "Parent Capability", reference_table: "capabilities", reference_delete_mode: "clear", relationship_label: "parent of", selfRef: true },
      recordStatusField(),
    ],
  },
  {
    table_name: "data_objects",
    singular: "data_object",
    singular_label: "Data Object",
    plural_label: "Data Objects",
    label_column: "data_object_name",
    label_column_title: "Data Object Name",
    description: "The canonical data subjects an enterprise stores records about (Customer, Employee, Product, Asset, Order, Invoice, ...). One record per canonical concept; industry-specific or solution-specific naming variations live in the aliases entity.",
    fields: [
      { field_name: "description", format: "multiline", title: "Description" },
      recordStatusField(),
    ],
  },
  {
    table_name: "vendors",
    singular: "vendor",
    singular_label: "Vendor",
    plural_label: "Vendors",
    label_column: "vendor_name",
    label_column_title: "Vendor Name",
    description: "Companies that produce or supply solutions (Salesforce Inc, SAP SE, Microsoft, Oracle, ServiceNow Inc, ...). One record per legal vendor entity.",
    fields: [
      { field_name: "description", format: "multiline", title: "Description" },
      { field_name: "vendor_url", format: "url", title: "Website" },
      { field_name: "headquarters_country", format: "string", title: "HQ Country", description: "ISO 3166-1 country name or code" },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "solutions",
    singular: "solution",
    singular_label: "Solution",
    plural_label: "Solutions",
    label_column: "solution_name",
    label_column_title: "Solution Name",
    description: "Specific point solutions, platforms, internal builds, or manual processes (Salesforce, Workday, ServiceNow, SAP S/4HANA, an internal build, a spreadsheet-driven manual process). One record per distinct solution; vendor-supplied products link to their vendor.",
    fields: [
      { field_name: "description", format: "multiline", title: "Description" },
      { field_name: "solution_url", format: "url", title: "Solution URL", description: "Public homepage or product page" },
      { field_name: "vendor_id", format: "reference", title: "Vendor", description: "Null for open-source or internal builds", reference_table: "vendors", reference_delete_mode: "clear", relationship_label: "supplies" },
      { field_name: "solution_type", format: "enum", title: "Solution Type", description: "Delivery / sourcing shape of the solution", enum_values: ["saas", "on_prem", "hybrid", "open_source", "internal_build", "manual_process"] },
      { field_name: "is_active_in_market", format: "boolean", title: "Active in Market", description: "Is the solution still actively sold or maintained (false marks retired or sunset products)", default_value: "true" },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "jurisdictions",
    singular: "jurisdiction",
    singular_label: "Jurisdiction",
    plural_label: "Jurisdictions",
    label_column: "jurisdiction_name",
    label_column_title: "Jurisdiction Name",
    description: "Geographic and supranational scopes used to bound regulations and country-specific localizations. Self-referential to support hierarchy (the EU contains Germany; the USA contains California; Germany contains Bavaria). Holds countries (USA, Germany), supranational bodies (EU), states or provinces (California), and municipalities where regulation reaches that granularity.",
    fields: [
      { field_name: "jurisdiction_code", format: "string", title: "Code", description: "ISO 3166-1 alpha-2 country code, or an analogous short code for sub-national or supranational scopes" },
      { field_name: "jurisdiction_type", format: "enum", title: "Type", description: "Granularity of the jurisdiction", enum_values: ["country", "region", "state_or_province", "supranational", "municipal"], default_value: "country" },
      { field_name: "parent_jurisdiction_id", format: "reference", title: "Parent Jurisdiction", reference_table: "jurisdictions", reference_delete_mode: "clear", relationship_label: "parent of", selfRef: true },
      { field_name: "description", format: "multiline", title: "Description" },
      recordStatusField(),
    ],
  },
  {
    table_name: "regulations",
    singular: "regulation",
    singular_label: "Regulation",
    plural_label: "Regulations",
    label_column: "regulation_name",
    label_column_title: "Regulation Name",
    description: "Compliance frameworks, country localizations, and industry standards that constrain how domains are run. Examples: HIPAA (data privacy in US healthcare), GDPR (data privacy in the EU), SOX (financial reporting for US-listed companies), PCI-DSS (security for card-handling), IFRS (accounting standard), ISO 27001 (security, globally applicable), Payroll-DE (German payroll localization). Each regulation may be scoped to a jurisdiction (null means globally applicable); each regulation binds to the domains it constrains through the domain-regulations junction.",
    fields: [
      { field_name: "regulation_code", format: "string", title: "Code", description: "Short identifier (HIPAA, GDPR, SOX, ISO-27001, PCI-DSS-4)" },
      { field_name: "regulation_type", format: "enum", title: "Type", description: "Family of constraint the regulation belongs to", enum_values: ["data_privacy", "financial_reporting", "security", "country_localization", "accounting_standard", "industry_standard", "environmental", "labor_law", "other"], default_value: "other" },
      { field_name: "jurisdiction_id", format: "reference", title: "Jurisdiction", description: "Null marks a globally applicable regulation (e.g. ISO 27001); set for jurisdiction-scoped regulations (HIPAA in USA, GDPR in EU, Payroll-DE in Germany)", reference_table: "jurisdictions", reference_delete_mode: "clear", relationship_label: "scopes" },
      { field_name: "issuing_body", format: "string", title: "Issuing Body", description: "Authoring authority (US Department of Health and Human Services, European Commission, PCI Security Standards Council)" },
      { field_name: "effective_date", format: "date", title: "Effective Date", description: "Date the regulation took effect (historical dates valid for established regulations; future dates valid for upcoming ones)" },
      { field_name: "regulation_url", format: "url", title: "Reference URL", description: "Primary citation, typically the issuing body's canonical page" },
      { field_name: "description", format: "multiline", title: "Description" },
      recordStatusField(),
    ],
  },
  {
    table_name: "data_object_aliases",
    singular: "data_object_alias",
    singular_label: "Data Object Alias",
    plural_label: "Data Object Aliases",
    label_column: "alias_name",
    label_column_title: "Alias Name",
    description: "Names other than the canonical data-object name by which a data object is known. Three flavors discriminated by Alias Type: pure synonyms (vendor / supplier / counterparty), industry-specific terms (Customer becomes Patient in Healthcare), and solution-specific terms (Customer becomes Account in Salesforce).",
    validation_rules: [
      {
        code: "industry_id_matches_alias_type",
        message: "Industry context must be set when alias type is 'industry_term' and null otherwise.",
        description: "Enforces the discriminator pattern: industry_id is set iff alias_type is industry_term. Prevents synonyms or solution-terms from carrying a stray industry context.",
        jsonlogic: {
          if: [
            { "==": [{ var: "alias_type" }, "industry_term"] },
            { "!=": [{ var: "industry_id" }, null] },
            { "==": [{ var: "industry_id" }, null] },
          ],
        },
      },
      {
        code: "solution_id_matches_alias_type",
        message: "Solution context must be set when alias type is 'solution_term' and null otherwise.",
        description: "Enforces the discriminator pattern: solution_id is set iff alias_type is solution_term. Prevents synonyms or industry-terms from carrying a stray solution context.",
        jsonlogic: {
          if: [
            { "==": [{ var: "alias_type" }, "solution_term"] },
            { "!=": [{ var: "solution_id" }, null] },
            { "==": [{ var: "solution_id" }, null] },
          ],
        },
      },
    ],
    fields: [
      { field_name: "data_object_id", format: "reference", title: "Data Object", reference_table: "data_objects", reference_delete_mode: "clear", relationship_label: "is aliased as" },
      { field_name: "alias_type", format: "enum", title: "Alias Type", description: "Discriminator: which kind of alias this is", enum_values: ["synonym", "industry_term", "solution_term"], default_value: "synonym" },
      {
        field_name: "industry_id",
        format: "reference",
        title: "Industry Context",
        description: "Required when Alias Type is `industry_term`, null otherwise",
        reference_table: "industries",
        reference_delete_mode: "clear",
        relationship_label: "scopes alias",
        input_type_rule: { if: [{ "==": [{ var: "alias_type" }, "industry_term"] }, "required", "hidden"] },
      },
      {
        field_name: "solution_id",
        format: "reference",
        title: "Solution Context",
        description: "Required when Alias Type is `solution_term`, null otherwise",
        reference_table: "solutions",
        reference_delete_mode: "clear",
        relationship_label: "names it",
        input_type_rule: { if: [{ "==": [{ var: "alias_type" }, "solution_term"] }, "required", "hidden"] },
      },
      { field_name: "is_preferred", format: "boolean", title: "Preferred", description: "Is this the primary term used in its context (industry, solution, or generally)", default_value: "false" },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "data_object_relationships",
    singular: "data_object_relationship",
    singular_label: "Data Object Relationship",
    plural_label: "Data Object Relationships",
    label_column: "data_object_relationship_label",
    label_column_title: "Relationship",
    description: "The canonical entity-relationship graph between data objects, independent of any specific solution's implementation. Captures directed relationships like User owns Asset (1:N, composition), Customer places Order (1:N, reference), Employee works on Project (M:N, association), Customer is a Person (1:1, inheritance). Carries both cardinality (Cardinality) and structural kind (Kind) so the catalog distinguishes ownership from loose reference from peer association from subtype. Self-references are allowed (User directly manages User).",
    computed_fields: [
      {
        name: "data_object_relationship_label",
        description: "Composed from the source data object name, the relationship verb, and the target data object name. Recomputed on every write so renames in either parent flow through.",
        jsonlogic: {
          set_record: ["s", "data_objects", { var: "data_object_id" },
            { set_record: ["t", "data_objects", { var: "related_data_object_id" },
              { cat: [{ var: "s.data_object_name" }, " ", { var: "relationship_verb" }, " ", { var: "t.data_object_name" }] }
            ] }
          ],
        },
      },
    ],
    fields: [
      { field_name: "data_object_id", format: "reference", title: "From Data Object", description: "The source / subject side of the relationship", reference_table: "data_objects", reference_delete_mode: "clear", relationship_label: "is source of" },
      { field_name: "related_data_object_id", format: "reference", title: "To Data Object", description: "The target / object side of the relationship", reference_table: "data_objects", reference_delete_mode: "clear", relationship_label: "is target of" },
      { field_name: "relationship_type", format: "enum", title: "Cardinality", description: "Standard ER cardinality between the two data objects", enum_values: ["one_to_one", "one_to_many", "many_to_many"], default_value: "one_to_many" },
      { field_name: "relationship_kind", format: "enum", title: "Kind", description: "Structural role of the relationship, orthogonal to cardinality: `composition` (parent owns child, cascade), `reference` (loose link, no cascade), `association` (peer-to-peer M:N), `inheritance` (subtype / IS-A)", enum_values: ["composition", "reference", "association", "inheritance"], default_value: "reference" },
      { field_name: "relationship_verb", format: "string", title: "Verb", description: "Parent-voice verb describing the relationship (owns, manages, places, is assigned to)" },
      { field_name: "inverse_verb", format: "string", title: "Inverse Verb", description: "Reverse-direction phrasing for navigation (is owned by, reports to)" },
      { field_name: "is_required", format: "boolean", title: "Required", description: "Whether the relationship is mandatory in typical implementations (a Customer must have at least one Address vs. a Customer may have many Addresses)", default_value: "false" },
      recordStatusField(),
      notesField(),
    ],
  },
  // --- junctions ---
  {
    table_name: "industry_business_functions",
    singular: "industry_business_function",
    singular_label: "Industry Business Function",
    plural_label: "Industry Business Functions",
    label_column: "industry_business_function_label",
    label_column_title: "Mapping",
    description: "Junction table connecting industries to the business functions typically present in them. Records that Manufacturing has Production but typically not Trading; that Banking has Treasury but typically not Production.",
    computed_fields: [{
      name: "industry_business_function_label",
      description: "Composed from the parent industry name and the parent business function name. Recomputed on every write so renames in either parent flow through.",
      jsonlogic: {
        set_record: ["i", "industries", { var: "industry_id" },
          { set_record: ["bf", "business_functions", { var: "business_function_id" },
            { cat: [{ var: "i.industry_name" }, " / ", { var: "bf.business_function_name" }] }
          ] }
        ],
      },
    }],
    fields: [
      { field_name: "industry_id", format: "parent", title: "Industry", reference_table: "industries", reference_delete_mode: "cascade", relationship_label: "has" },
      { field_name: "business_function_id", format: "parent", title: "Business Function", reference_table: "business_functions", reference_delete_mode: "cascade", relationship_label: "appears in" },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "business_function_domains",
    singular: "business_function_domain",
    singular_label: "Business Function Domain",
    plural_label: "Business Function Domains",
    label_column: "business_function_domain_label",
    label_column_title: "Mapping",
    description: "Junction table connecting business functions to the domains they operate in, with a responsibility qualifier so the same domain can be shared across functions without ambiguity. Useful as a coarse-grained shortcut; the capability layer (business-function-capabilities + capability-domains) materializes the same mapping at finer granularity.",
    computed_fields: [{
      name: "business_function_domain_label",
      description: "Composed from the parent business function name and the parent domain name. Recomputed on every write so renames in either parent flow through.",
      jsonlogic: {
        set_record: ["bf", "business_functions", { var: "business_function_id" },
          { set_record: ["d", "domains", { var: "domain_id" },
            { cat: [{ var: "bf.business_function_name" }, " / ", { var: "d.domain_name" }] }
          ] }
        ],
      },
    }],
    fields: [
      { field_name: "business_function_id", format: "parent", title: "Business Function", reference_table: "business_functions", reference_delete_mode: "cascade", relationship_label: "operates" },
      { field_name: "domain_id", format: "parent", title: "Domain", reference_table: "domains", reference_delete_mode: "cascade", relationship_label: "operated by" },
      { field_name: "responsibility_type", format: "enum", title: "Responsibility", description: "The function's role with respect to the domain", enum_values: ["owner", "contributor", "consumer"] },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "business_function_capabilities",
    singular: "business_function_capability",
    singular_label: "Business Function Capability",
    plural_label: "Business Function Capabilities",
    label_column: "business_function_capability_label",
    label_column_title: "Mapping",
    description: "Junction table connecting business functions to the capabilities they require to perform their role, with a responsibility qualifier. Captures that Sales requires Lead Management (owner) and Customer Communication (contributor), that Finance requires Invoice Processing (owner) and Procurement Catalog (consumer).",
    computed_fields: [{
      name: "business_function_capability_label",
      description: "Composed from the parent business function name and the parent capability name. Recomputed on every write so renames in either parent flow through.",
      jsonlogic: {
        set_record: ["bf", "business_functions", { var: "business_function_id" },
          { set_record: ["c", "capabilities", { var: "capability_id" },
            { cat: [{ var: "bf.business_function_name" }, " / ", { var: "c.capability_name" }] }
          ] }
        ],
      },
    }],
    fields: [
      { field_name: "business_function_id", format: "parent", title: "Business Function", reference_table: "business_functions", reference_delete_mode: "cascade", relationship_label: "requires" },
      { field_name: "capability_id", format: "parent", title: "Capability", reference_table: "capabilities", reference_delete_mode: "cascade", relationship_label: "is required by" },
      { field_name: "responsibility_type", format: "enum", title: "Responsibility", description: "The function's role with respect to the capability", enum_values: ["owner", "contributor", "consumer"] },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "domain_data_objects",
    singular: "domain_data_object",
    singular_label: "Domain Data Object",
    plural_label: "Domain Data Objects",
    label_column: "domain_data_object_label",
    label_column_title: "Mapping",
    description: "Junction table connecting domains to the data objects they hold, with a mastery qualifier. Captures the observation that Customer lives in CRM (primary), Billing (secondary), and Support (secondary), the seed of the data-silo map.",
    computed_fields: [{
      name: "domain_data_object_label",
      description: "Composed from the parent domain name and the parent data object name. Recomputed on every write so renames in either parent flow through.",
      jsonlogic: {
        set_record: ["d", "domains", { var: "domain_id" },
          { set_record: ["o", "data_objects", { var: "data_object_id" },
            { cat: [{ var: "d.domain_name" }, " / ", { var: "o.data_object_name" }] }
          ] }
        ],
      },
    }],
    fields: [
      { field_name: "domain_id", format: "parent", title: "Domain", reference_table: "domains", reference_delete_mode: "cascade", relationship_label: "holds" },
      { field_name: "data_object_id", format: "parent", title: "Data Object", reference_table: "data_objects", reference_delete_mode: "cascade", relationship_label: "lives in" },
      { field_name: "mastery_role", format: "enum", title: "Mastery Role", description: "The domain's role with respect to this data object", enum_values: ["primary", "secondary", "derived"] },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "capability_domains",
    singular: "capability_domain",
    singular_label: "Capability Domain",
    plural_label: "Capability Domains",
    label_column: "capability_domain_label",
    label_column_title: "Mapping",
    description: "Junction table connecting capabilities to the domains they live in. A capability may span multiple domains (Customer 360 spans CRM and Data Platform; Workforce Scheduling spans HR Operations and Field Service). Captures the semantic home of a capability, independent of which solutions deliver it.",
    computed_fields: [{
      name: "capability_domain_label",
      description: "Composed from the parent capability name and the parent domain name. Recomputed on every write so renames in either parent flow through.",
      jsonlogic: {
        set_record: ["c", "capabilities", { var: "capability_id" },
          { set_record: ["d", "domains", { var: "domain_id" },
            { cat: [{ var: "c.capability_name" }, " / ", { var: "d.domain_name" }] }
          ] }
        ],
      },
    }],
    fields: [
      { field_name: "capability_id", format: "parent", title: "Capability", reference_table: "capabilities", reference_delete_mode: "cascade", relationship_label: "spans" },
      { field_name: "domain_id", format: "parent", title: "Domain", reference_table: "domains", reference_delete_mode: "cascade", relationship_label: "houses" },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "solution_domains",
    singular: "solution_domain",
    singular_label: "Solution Domain",
    plural_label: "Solution Domains",
    label_column: "solution_domain_label",
    label_column_title: "Mapping",
    description: "Junction table connecting solutions to the domains they cover, with a coverage-level qualifier. Captures that Salesforce primarily covers CRM and secondarily covers Service Management and Marketing.",
    computed_fields: [{
      name: "solution_domain_label",
      description: "Composed from the parent solution name and the parent domain name. Recomputed on every write so renames in either parent flow through.",
      jsonlogic: {
        set_record: ["s", "solutions", { var: "solution_id" },
          { set_record: ["d", "domains", { var: "domain_id" },
            { cat: [{ var: "s.solution_name" }, " / ", { var: "d.domain_name" }] }
          ] }
        ],
      },
    }],
    fields: [
      { field_name: "solution_id", format: "parent", title: "Solution", reference_table: "solutions", reference_delete_mode: "cascade", relationship_label: "covers" },
      { field_name: "domain_id", format: "parent", title: "Domain", reference_table: "domains", reference_delete_mode: "cascade", relationship_label: "covered by" },
      { field_name: "coverage_level", format: "enum", title: "Coverage Level", description: "The solution's depth of coverage for this domain", enum_values: ["primary", "secondary", "partial"] },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "solution_data_objects",
    singular: "solution_data_object",
    singular_label: "Solution Data Object",
    plural_label: "Solution Data Objects",
    label_column: "solution_data_object_label",
    label_column_title: "Mapping",
    description: "Junction table recording which solutions master which data objects, with an ownership-role qualifier. This is the data-silo map: when the same data object appears across many rows here, the rows themselves are the silo. A solution's specific term for the data object (e.g. Salesforce calls Customer \"Account\") lives in the aliases entity with Alias Type set to solution-term, not on this junction; naming and mastery stay independent concerns.",
    computed_fields: [{
      name: "solution_data_object_label",
      description: "Composed from the parent solution name and the parent data object name. Recomputed on every write so renames in either parent flow through.",
      jsonlogic: {
        set_record: ["s", "solutions", { var: "solution_id" },
          { set_record: ["o", "data_objects", { var: "data_object_id" },
            { cat: [{ var: "s.solution_name" }, " / ", { var: "o.data_object_name" }] }
          ] }
        ],
      },
    }],
    fields: [
      { field_name: "solution_id", format: "parent", title: "Solution", reference_table: "solutions", reference_delete_mode: "cascade", relationship_label: "masters" },
      { field_name: "data_object_id", format: "parent", title: "Data Object", reference_table: "data_objects", reference_delete_mode: "cascade", relationship_label: "mastered by" },
      { field_name: "ownership_role", format: "enum", title: "Ownership Role", description: "The solution's role with respect to this data object", enum_values: ["system_of_record", "system_of_reference", "system_of_engagement", "derived"] },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "solution_capabilities",
    singular: "solution_capability",
    singular_label: "Solution Capability",
    plural_label: "Solution Capabilities",
    label_column: "solution_capability_label",
    label_column_title: "Mapping",
    description: "Junction table recording which solutions deliver which capabilities, with a delivery-strength qualifier. Answers the operational consulting question: \"does Salesforce do Automated Invoice Matching?\" — without forking the catalog. Possible answers are native (out-of-the-box), partial (some sub-capabilities only), via_extension (requires a managed package, AppExchange app, or third-party plug-in), or not_supported (the solution explicitly cannot do this).",
    computed_fields: [{
      name: "solution_capability_label",
      description: "Composed from the parent solution name and the parent capability name. Recomputed on every write so renames in either parent flow through.",
      jsonlogic: {
        set_record: ["s", "solutions", { var: "solution_id" },
          { set_record: ["c", "capabilities", { var: "capability_id" },
            { cat: [{ var: "s.solution_name" }, " / ", { var: "c.capability_name" }] }
          ] }
        ],
      },
    }],
    fields: [
      { field_name: "solution_id", format: "parent", title: "Solution", reference_table: "solutions", reference_delete_mode: "cascade", relationship_label: "delivers" },
      { field_name: "capability_id", format: "parent", title: "Capability", reference_table: "capabilities", reference_delete_mode: "cascade", relationship_label: "is satisfied by" },
      { field_name: "delivery_strength", format: "enum", title: "Delivery Strength", description: "How well the solution delivers the capability", enum_values: ["native", "partial", "via_extension", "not_supported"], default_value: "native" },
      recordStatusField(),
      notesField(),
    ],
  },
  {
    table_name: "domain_regulations",
    singular: "domain_regulation",
    singular_label: "Domain Regulation",
    plural_label: "Domain Regulations",
    label_column: "domain_regulation_label",
    label_column_title: "Mapping",
    description: "Junction table binding regulations to the domains they apply to, with an applicability qualifier. Captures the reuse pattern: one HIPAA regulation row binds to many healthcare-touching domains (EHR, Claims Management, Patient Portal); one Payroll domain binds to many country-localization regulations (Payroll-DE, Payroll-FR, Payroll-US). Applicability separates strict requirements (HIPAA on EHR is mandatory) from softer guidance (HIPAA on a CRM is conditional on whether PHI flows through it).",
    computed_fields: [{
      name: "domain_regulation_label",
      description: "Composed from the parent domain name and the parent regulation name. Recomputed on every write so renames in either parent flow through.",
      jsonlogic: {
        set_record: ["d", "domains", { var: "domain_id" },
          { set_record: ["r", "regulations", { var: "regulation_id" },
            { cat: [{ var: "d.domain_name" }, " / ", { var: "r.regulation_name" }] }
          ] }
        ],
      },
    }],
    fields: [
      { field_name: "domain_id", format: "parent", title: "Domain", reference_table: "domains", reference_delete_mode: "cascade", relationship_label: "is subject to" },
      { field_name: "regulation_id", format: "parent", title: "Regulation", reference_table: "regulations", reference_delete_mode: "cascade", relationship_label: "applies to" },
      { field_name: "applicability", format: "enum", title: "Applicability", description: "Strength of the binding: mandatory (strict requirement), recommended (industry best practice), conditional (applies under specific circumstances such as handling PHI), optional (acknowledged but not adopted)", enum_values: ["mandatory", "recommended", "conditional", "optional"], default_value: "recommended" },
      { field_name: "condition_notes", format: "multiline", title: "Condition", description: "Free-form context naming the condition under which the regulation applies (e.g. \"when handling PHI\", \"for US-listed companies\", \"if processing card data\")" },
      recordStatusField(),
      notesField(),
    ],
  },
];

// ------ Stage 4c-4f loop ------

console.log("\n=== Stage 4c: entities ===");

// Pass 1: create entities (no self-ref fields, no input_type_rule update yet)
for (const e of ENTITIES) {
  const existing = await readSingle("read_entity", `table_name=eq.${e.table_name}`);
  if (existing) {
    console.log(`  ♻ ${e.table_name} exists`);
    continue;
  }
  const payload: any = {
    table_name: e.table_name,
    singular: e.singular,
    plural: e.table_name,
    singular_label: e.singular_label,
    plural_label: e.plural_label,
    label_column: e.label_column,
    description: e.description,
    module_id: MODULE_ID,
    view_permission: READ_PERM,
    edit_permission: MANAGE_PERM,
    audit_log: false,
  };
  if (e.computed_fields) {
    payload.computed_fields = e.computed_fields.map(c => ({ ...c, source_module: MODULE_SLUG }));
  }
  if (e.validation_rules) {
    payload.validation_rules = e.validation_rules.map(v => ({ ...v, source_module: MODULE_SLUG }));
  }
  await call("create_entity", { data: payload });
  console.log(`  ✨ ${e.table_name}`);
}

// Pass 2: label_column title fixup
console.log("\n=== Stage 4c: label_column title fixups ===");
for (const e of ENTITIES) {
  if (e.label_column_title === e.singular_label) continue;
  try {
    await call("update_field", {
      id: `${e.table_name}.${e.label_column}`,
      data: { title: e.label_column_title },
    });
    console.log(`  ✓ ${e.table_name}.${e.label_column} title → "${e.label_column_title}"`);
  } catch (err: any) {
    console.log(`  ! ${e.table_name}.${e.label_column}: ${err.message}`);
  }
}

// Pass 3: fields (non-self-ref)
console.log("\n=== Stage 4d: fields (non-self-ref) ===");
for (const e of ENTITIES) {
  for (const f of e.fields) {
    if (f.selfRef) continue;
    if (f.field_name === e.label_column) continue;
    const payload: any = {
      table_name: e.table_name,
      field_name: f.field_name,
      title: f.title,
      format: f.format,
      width: "default",
      input_type: "default",
    };
    if (f.description) payload.description = f.description;
    if (f.reference_table) payload.reference_table = f.reference_table;
    if (f.reference_delete_mode) payload.reference_delete_mode = f.reference_delete_mode;
    if (f.relationship_label) payload.relationship_label = f.relationship_label;
    if (f.default_value !== undefined) payload.default_value = f.default_value;
    if (f.enum_values) payload.enum_values = f.enum_values;
    if (f.is_unique) payload.is_unique = true;
    try {
      const existing = await readSingle(
        "read_field",
        `table_name=eq.${e.table_name}&field_name=eq.${f.field_name}`,
      );
      if (existing) {
        console.log(`  ♻ ${e.table_name}.${f.field_name}`);
        continue;
      }
      await call("create_field", { data: payload });
      console.log(`  ✨ ${e.table_name}.${f.field_name} (${f.format})`);
    } catch (err: any) {
      console.log(`  ! ${e.table_name}.${f.field_name}: ${err.message}`);
      throw err;
    }
  }
}

// Pass 4: self-reference fields
console.log("\n=== Stage 4d (second pass): self-reference fields ===");
for (const e of ENTITIES) {
  for (const f of e.fields) {
    if (!f.selfRef) continue;
    const existing = await readSingle(
      "read_field",
      `table_name=eq.${e.table_name}&field_name=eq.${f.field_name}`,
    );
    if (existing) { console.log(`  ♻ ${e.table_name}.${f.field_name}`); continue; }
    const payload: any = {
      table_name: e.table_name,
      field_name: f.field_name,
      title: f.title,
      format: f.format,
      width: "default",
      input_type: "default",
      reference_table: f.reference_table,
      reference_delete_mode: f.reference_delete_mode,
      relationship_label: f.relationship_label,
    };
    if (f.description) payload.description = f.description;
    await call("create_field", { data: payload });
    console.log(`  ✨ ${e.table_name}.${f.field_name} → ${f.reference_table} (self-ref)`);
  }
}

// Pass 5: input_type_rule on data_object_aliases.{industry_id,solution_id}
console.log("\n=== Stage 4f: input_type_rule ===");
for (const e of ENTITIES) {
  for (const f of e.fields) {
    if (!f.input_type_rule) continue;
    await call("update_field", {
      id: `${e.table_name}.${f.field_name}`,
      data: { input_type_rule: f.input_type_rule },
    });
    console.log(`  ✓ ${e.table_name}.${f.field_name} input_type_rule applied`);
  }
}

console.log("\n=== Done ===");
