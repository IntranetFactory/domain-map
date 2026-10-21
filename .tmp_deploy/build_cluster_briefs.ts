#!/usr/bin/env bun
// build_cluster_briefs.ts — Step 5 prep.
//
// Generates per-cluster context briefs that sub-agents consume to author
// relationship + alias drafts. Each brief contains:
//
//   - The cluster's domains with description + business_logic
//   - Each domain's data_objects (master / embedded_master / consumer / etc.)
//   - Relevant cross_domain_handoffs (both inbound and outbound for the cluster)
//   - The expected output template (so the sub-agent's draft is loader-parseable)
//   - The schema reference (data_object_relationships + data_object_aliases)
//
// Output: .tmp_deploy/cluster_<letter>_brief.md for each cluster.

export {};

import { writeFileSync, readFileSync } from "node:fs";

type Row = Record<string, any>;

const allObjs: Row[] = JSON.parse(readFileSync("c:/tmp/all_objs.json", "utf8"));
const allDdo: Row[] = JSON.parse(readFileSync("c:/tmp/all_ddo.json", "utf8"));
const allDomains: Row[] = JSON.parse(readFileSync("c:/tmp/all_domains.json", "utf8"));
const allHandoffs: Row[] = JSON.parse(readFileSync("c:/tmp/all_handoffs.json", "utf8"));
const allEvents: Row[] = JSON.parse(readFileSync("c:/tmp/all_events.json", "utf8"));

const domainByCode = new Map<string, Row>(allDomains.map((d) => [d.domain_code, d]));
const domainById = new Map<number, Row>(allDomains.map((d) => [d.id, d]));
const objById = new Map<number, Row>(allObjs.map((o) => [o.id, o]));
const eventById = new Map<number, Row>(allEvents.map((e) => [e.id, e]));

const usersRow = allObjs.find((o) => o.data_object_name === "users");
if (!usersRow) throw new Error("users platform_builtin row not found");

const clusters = {
  A: { name: "People",                  codes: ["HCM", "ONBOARDING", "LMS", "BEN-ADMIN", "EMP-EXP", "HRSD"] },
  B: { name: "IT Service & Assets",     codes: ["ITSM", "APM", "CMDB", "HAM", "ITAM", "WSC"] },
  C: { name: "Compliance / Audit / Legal", codes: ["AUDIT", "LSD", "TEST-MGMT", "VIS-MGMT"] },
  D: { name: "Vendor / Contract / Customer", codes: ["CSM", "CLM", "VMS", "SUP-LIFE"] },
  E: { name: "Content / Asset Management", codes: ["ECM", "HCMS", "EAM", "DAM"] },
  F: { name: "Specialized / Industry",  codes: ["CLIN-DEV", "PS-LIC", "RET-STORE", "EXPENSE", "WORK-MGMT"] },
};

function objsForDomain(domainCode: string): Array<{ obj: Row; role: string }> {
  const dom = domainByCode.get(domainCode);
  if (!dom) return [];
  return allDdo
    .filter((d) => d.domain_id === dom.id)
    .map((d) => ({ obj: objById.get(d.data_object_id)!, role: d.role }))
    .filter((x) => x.obj)
    .sort((a, b) => {
      const order = { master: 0, embedded_master: 1, contributor: 2, consumer: 3, derived: 4 } as Record<string, number>;
      return (order[a.role] ?? 99) - (order[b.role] ?? 99) || a.obj.data_object_name.localeCompare(b.obj.data_object_name);
    });
}

function handoffsForCluster(codes: string[]): Row[] {
  const ids = new Set(codes.map((c) => domainByCode.get(c)?.id).filter((x): x is number => x !== undefined));
  return allHandoffs
    .filter((h) => ids.has(h.source_domain_id) || ids.has(h.target_domain_id))
    .sort((a, b) => (a.source_domain_id - b.source_domain_id) || (a.target_domain_id - b.target_domain_id));
}

const OUTPUT_TEMPLATE = `## Domain: <DOMAIN_CODE> — <Domain Name>

### 1. Mermaid graph (intra-domain only — visualize the entity-cluster shape)

\`\`\`mermaid
graph LR
  %% use snake_case data_object_name for every node; use --|verb|--> for edges
  job_postings -->|publishes| job_applications
\`\`\`

### 2. Intra-domain relationships

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_postings | publishes | job_applications | one_to_many | composition | true | source | is published from | each application belongs to one posting |

### 3. Users edges (platform_builtin)

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_applications | assigned_to | users | many_to_one | reference | false | target | hiring manager for | recruiter ownership |

### 4. Cross-domain edges (clean payload→target only)

| from | verb | to | cardinality | kind | required | owner_side | inverse_verb | notes |
|---|---|---|---|---|---|---|---|---|
| job_offers | becomes | employees | one_to_one | reference | false | target | onboarded from | only when offer accepted |

### 5. Aliases (≥1 per non-self-explanatory master)

| data_object | alias_name | alias_type | is_preferred | notes |
|---|---|---|---|---|
| job_applications | application | synonym | false | common short form |
| job_applications | candidate submission | industry_term | false | HR vendor terminology |
`;

const SCHEMA_REFERENCE = `### data_object_relationships schema

| Column | Type / values | Notes |
|---|---|---|
| data_object_id | reference→data_objects | The **source / subject** side. Use the data_object_name (the loader will resolve to id). |
| related_data_object_id | reference→data_objects | The **target / object** side. |
| relationship_verb | text | Parent-voice verb. Conventions: \`owns\`, \`manages\`, \`schedules\`, \`places\`, \`is_assigned_to\`, \`extends\`, \`groups\`, \`contains\`, \`triggers\`, \`approves\`, \`fulfills\`, \`closes\`, \`spawns\`, \`becomes\`. Use snake_case. |
| inverse_verb | text | Reverse phrasing for navigation: \`is owned by\`, \`reports to\`, \`is scheduled by\`. Natural prose, no snake_case required. |
| relationship_type | enum | \`one_to_one\` / \`one_to_many\` / \`many_to_many\` |
| relationship_kind | enum | \`composition\` (parent owns child, cascade), \`reference\` (loose link, no cascade), \`association\` (peer-to-peer M:N), \`inheritance\` (subtype / IS-A) |
| owner_side | enum | \`source\` = the row identified by data_object_id cascades into the related object on delete; \`target\` = the related object owns the lifecycle. Drives delete-mode derivation downstream. |
| is_required | boolean | true if mandatory in typical implementations (every Order has a Customer); false if optional. |
| notes | text | Free-form. |

### data_object_aliases schema

| Column | Type / values | Notes |
|---|---|---|
| data_object_id | reference→data_objects | The aliased entity (by data_object_name). |
| alias_name | text | The alternative term. |
| alias_type | enum | \`synonym\` (general alt term), \`industry_term\` (specific to an industry — set industry_id), \`solution_term\` (specific to a vendor product — set solution_id). For Step 5 only \`synonym\` and \`industry_term\` are expected; \`industry_term\` rows without an industry_id will be skipped by the loader. |
| is_preferred | boolean | True if this alias is more common than the canonical name in its context. Usually false. |

### Guardrails

1. **Use data_object_name (snake_case) everywhere in tables**, not labels. Loader resolves names → ids.
2. **Only reference data_objects that exist** in your cluster's domain list OR \`users\` (the only platform_builtin) OR data_objects that belong to other domains shown in the **cross-cluster reference list** below. Do not invent new entity names.
3. **Intra-domain edges**: every edge's both ends are data_objects belonging to a single domain in this cluster (could be the same domain). Aim for completeness — every master/embedded_master should have at least one edge unless it is a true root entity.
4. **Users edges**: cover assignee / owner / created_by / approver style relationships. Every entity that has any user-shaped role gets a users edge. Use distinct verbs (\`is_owned_by\`, \`is_assigned_to\`, \`is_created_by\`, \`is_approved_by\`).
5. **Cross-domain edges**: ONLY include where there is a clean, deterministic payload→target mapping (e.g. \`candidates → becomes → employees\` when a hire happens, \`job_offers → spawns → onboarding_journeys\`). Do NOT speculate. The cross_domain_handoffs in your brief are an existing source of truth; convert each row to a relationship edge where the payload (data_object_id) is the **from** side and the target_domain has a master data_object that is the natural recipient.
6. **Aliases**: focus on non-self-explanatory masters. A master named \`hcm_employees\` doesn't need an alias for "employee" because the singular is obvious. But \`itsm_incidents\` could alias to "ticket"; \`crm_opportunities\` to "deal"; \`cmdb_configuration_items\` to "CI". 1-3 aliases per master that benefits, none for those that don't.
7. **Avoid duplicate edges**: do not author both A→B and B→A; pick the natural source side (the side that *owns the action* in the verb). E.g. for "publishes" the publisher is source; for "is_assigned_to" the assignee-holder is source.
8. **Use \`composition\` sparingly**: only when delete-cascade is the obvious correct behavior (an order_line cannot exist without its order). Most edges are \`reference\`.
9. **\`owner_side='source'\`** is the right answer when the source row's lifecycle drives the related row (composition pattern). **\`owner_side='target'\`** is correct for "reference upward" relationships (a job_application references a job_posting; the posting is the lifecycle owner).
10. **Output is markdown only.** Do NOT call semantius or PostgREST. Write the draft to the path your prompt specifies.
`;

for (const [letter, { name, codes }] of Object.entries(clusters)) {
  const lines: string[] = [];
  lines.push(`# Cluster ${letter} brief — ${name}`);
  lines.push("");
  lines.push(`**Domains in scope (${codes.length}):** ${codes.join(", ")}`);
  lines.push("");
  lines.push(`**Your job:** for EACH of the ${codes.length} domains, author one markdown section following the OUTPUT TEMPLATE below. Write the full set to \`.tmp_deploy/cluster_${letter}_draft.md\`. Do NOT call semantius or any database tool — drafts only. The draft will be reviewed by the user before any load happens.`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Domain details");
  lines.push("");

  for (const code of codes) {
    const dom = domainByCode.get(code);
    if (!dom) {
      lines.push(`### ${code} — **NOT FOUND**`);
      continue;
    }
    lines.push(`### ${code} — ${dom.domain_name}`);
    lines.push("");
    lines.push(`**Description:** ${dom.description}`);
    lines.push("");
    if (dom.business_logic) {
      lines.push(`**Business logic:** ${dom.business_logic}`);
      lines.push("");
    }
    const objs = objsForDomain(code);
    if (objs.length === 0) {
      lines.push("_(no data_objects loaded for this domain)_");
      lines.push("");
      continue;
    }
    lines.push(`**Data objects (${objs.length}):**`);
    lines.push("");
    lines.push("| role | data_object_name | singular | plural |");
    lines.push("|---|---|---|---|");
    for (const { obj, role } of objs) {
      lines.push(`| ${role} | \`${obj.data_object_name}\` | ${obj.singular_label ?? ""} | ${obj.plural_label ?? ""} |`);
    }
    lines.push("");
  }

  // cross-domain handoffs touching this cluster
  const handoffs = handoffsForCluster(codes);
  lines.push("---");
  lines.push("");
  lines.push(`## Cross-domain handoffs touching this cluster (${handoffs.length})`);
  lines.push("");
  lines.push("Convert each row to a cross-domain relationship edge (section 4 of each domain's draft) where there is a clean payload→target mapping. The payload's data_object is the **from** side; pick a natural recipient in the target_domain as the **to** side.");
  lines.push("");
  if (handoffs.length === 0) {
    lines.push("_(none — skip section 4 in every domain)_");
  } else {
    lines.push("| source_domain | payload (data_object) | trigger_event | target_domain | integration_pattern | friction | description |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const h of handoffs) {
      const src = domainById.get(h.source_domain_id);
      const tgt = domainById.get(h.target_domain_id);
      const obj = objById.get(h.data_object_id);
      const ev = h.trigger_event_id ? eventById.get(h.trigger_event_id) : undefined;
      const desc = String(h.description ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 180);
      lines.push(`| ${src?.domain_code ?? "?"} | \`${obj?.data_object_name ?? "?"}\` | \`${ev?.event_name ?? "?"}\` | ${tgt?.domain_code ?? "?"} | ${h.integration_pattern ?? ""} | ${h.friction_level ?? ""} | ${desc} |`);
    }
  }
  lines.push("");

  // cross-cluster reference: list every data_object in OTHER clusters that any handoff in this brief targets
  const referencedDomainIds = new Set<number>();
  for (const h of handoffs) {
    if (!codes.map((c) => domainByCode.get(c)?.id).includes(h.source_domain_id)) referencedDomainIds.add(h.source_domain_id);
    if (!codes.map((c) => domainByCode.get(c)?.id).includes(h.target_domain_id)) referencedDomainIds.add(h.target_domain_id);
  }
  if (referencedDomainIds.size > 0) {
    lines.push("---");
    lines.push("");
    lines.push("## Cross-cluster reference (data_objects in OTHER clusters that handoffs reach into)");
    lines.push("");
    lines.push("Use these names when authoring section 4 (cross-domain edges) of any domain in this cluster.");
    lines.push("");
    for (const did of [...referencedDomainIds].sort()) {
      const d = domainById.get(did);
      if (!d) continue;
      const objs = allDdo
        .filter((x) => x.domain_id === did && (x.role === "master" || x.role === "embedded_master"))
        .map((x) => objById.get(x.data_object_id))
        .filter((o): o is Row => !!o);
      if (objs.length === 0) continue;
      lines.push(`- **${d.domain_code}** (${d.domain_name}): ${objs.map((o) => `\`${o.data_object_name}\``).join(", ")}`);
    }
    lines.push("");
  }

  // platform built-in reminder
  lines.push("---");
  lines.push("");
  lines.push("## Platform built-in");
  lines.push("");
  lines.push(`Reference \`users\` (data_object_id=${usersRow.id}, kind=platform_builtin) for any assignee / owner / approver / creator relationship. Always section 3.`);
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push("## OUTPUT TEMPLATE — repeat once per domain (replace the example rows)");
  lines.push("");
  lines.push(OUTPUT_TEMPLATE);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Schema reference");
  lines.push("");
  lines.push(SCHEMA_REFERENCE);

  const out = lines.join("\n");
  writeFileSync(`c:/dev/domain-map/.tmp_deploy/cluster_${letter}_brief.md`, out, "utf8");
  console.log(`wrote cluster_${letter}_brief.md  (${codes.length} domains, ${handoffs.length} handoffs)`);
}
