#!/usr/bin/env bun
// Build per-cluster context briefs for Phase B3 (lifecycle states + pattern flags)
// across the top-20 implementation-relevant domains. Mirrors the build_cluster_briefs.ts
// pattern from Step 5. Writes one markdown file per cluster to .tmp_deploy/p_b3_<X>_brief.md.

export {};

const ROOT = "c:/dev/domain-map";

type Row = Record<string, unknown>;

async function pg(method: string, path: string, body?: unknown): Promise<any> {
  const payload: Row = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: new Response(JSON.stringify(payload)),
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) throw new Error(`${method} ${path}: ${stderr || stdout}`);
  return JSON.parse(stdout.trim() || "null");
}

const CLUSTERS: Record<string, string[]> = {
  A_core_people: ["HCM", "PAYROLL", "ONBOARDING"],
  B_people_programs: ["COMP-MGMT", "BEN-ADMIN", "LMS"],
  C_recruiting: ["ATS"],
  D_it: ["ITSM", "CMDB", "ITAM", "KMS"],
  E_customer: ["CRM", "CSM", "FSM"],
  F_commerce: ["OMS", "CPQ", "SUB-MGMT"],
  G_procurement_signing: ["S2P", "ESIGN"],
};

const ALL_CODES = Object.values(CLUSTERS).flat();

// 1. Pull domains
const domains: any[] = await pg(
  "GET",
  `/domains?domain_code=in.(${ALL_CODES.join(",")})&select=id,domain_code,domain_name,description`,
);
const domainByCode = new Map<string, any>(domains.map((d) => [d.domain_code, d]));

// 2. Pull master+required junctions with data_object detail
const domainIds = domains.map((d) => d.id).join(",");
const masters: any[] = await pg(
  "GET",
  `/domain_data_objects?role=eq.master&necessity=eq.required&domain_id=in.(${domainIds})` +
    `&select=domain_id,notes,data_objects(id,data_object_name,singular_label,plural_label,description,has_personal_content,has_submit_lock,has_single_approver,is_canonical_bare_word,naming_authority_rationale)`,
);

// 3. Pull existing aliases for those data_objects (for context)
const doIds = [...new Set(masters.map((m) => m.data_objects.id))].join(",");
const aliases: any[] = await pg(
  "GET",
  `/data_object_aliases?data_object_id=in.(${doIds})&select=data_object_id,alias_name,alias_type,notes`,
);
const aliasesByDo = new Map<number, any[]>();
for (const a of aliases) {
  if (!aliasesByDo.has(a.data_object_id)) aliasesByDo.set(a.data_object_id, []);
  aliasesByDo.get(a.data_object_id)!.push(a);
}

// 4. Pull relationships involving these data_objects (intra-domain context)
const rels: any[] = await pg(
  "GET",
  `/data_object_relationships?or=(data_object_id.in.(${doIds}),related_data_object_id.in.(${doIds}))` +
    `&select=data_object_id,related_data_object_id,relationship_verb,relationship_type,is_required`,
);
// resolve names manually
const allDataObjects: any[] = await pg(
  "GET",
  `/data_objects?select=id,data_object_name&limit=10000`,
);
const nameById = new Map<number, string>(allDataObjects.map((o: any) => [o.id, o.data_object_name]));

// 5. Bucket per cluster + render brief
const FS = require("node:fs");
FS.mkdirSync(`${ROOT}/.tmp_deploy`, { recursive: true });

for (const [clusterKey, codes] of Object.entries(CLUSTERS)) {
  const lines: string[] = [];
  lines.push(`# Phase B3 cluster brief — ${clusterKey}`);
  lines.push("");
  lines.push(
    `**Domains:** ${codes.join(", ")} — author lifecycle states + pattern flags for every master+required data_object listed below.`,
  );
  lines.push("");
  lines.push("## Task");
  lines.push("");
  lines.push(
    "For every entity in this brief, return: (a) lifecycle states (snake_case state_name; state_order; is_initial; is_terminal; requires_permission; permission_verb_override only when needed; one-line description), OR `(static-reference: no lifecycle)` if it's pure reference data (e.g. tax_authorities, recruitment_sources, salary_bands, pricing_rules); AND (b) pattern flags has_personal_content / has_submit_lock / has_single_approver (true/false with one-line justification).",
  );
  lines.push("");
  lines.push("## Output format (strict — the loader parses this)");
  lines.push("");
  lines.push("Use this exact shape per entity:");
  lines.push("");
  lines.push("````");
  lines.push("### <data_object_name>");
  lines.push("");
  lines.push("**Pattern flags:** has_personal_content=<true|false>; has_submit_lock=<true|false>; has_single_approver=<true|false>");
  lines.push("");
  lines.push("**Justification:** <one-line rationale covering any flag set to true; if all false write `no behavioral pattern applies`>");
  lines.push("");
  lines.push("**Lifecycle states:**");
  lines.push("");
  lines.push("| state_name | order | initial | terminal | requires_perm | verb_override | description |");
  lines.push("|---|---|---|---|---|---|---|");
  lines.push("| <snake_case> | <int> | <true|false> | <true|false> | <true|false> | <verb or _> | <one line> |");
  lines.push("````");
  lines.push("");
  lines.push("Or, for reference data:");
  lines.push("");
  lines.push("````");
  lines.push("### <data_object_name>");
  lines.push("");
  lines.push("**(static-reference: no lifecycle)**");
  lines.push("");
  lines.push("**Pattern flags:** has_personal_content=false; has_submit_lock=false; has_single_approver=false");
  lines.push("````");
  lines.push("");
  lines.push("## Decision guidance");
  lines.push("");
  lines.push("- **`has_personal_content=true`** when row content is per-user-scoped and visibility/edit is row-author-only by default (e.g. `interview_scorecards`, `csat_responses`, `merit_recommendations`, `pay_slips`).");
  lines.push("- **`has_submit_lock=true`** when the entity follows draft → submit-then-lock (e.g. `interview_scorecards` lock on submit, `tax_filings` lock once filed, `merit_recommendations` lock on submit).");
  lines.push("- **`has_single_approver=true`** when an explicit single approver gates a transition (e.g. `job_offers` need hiring-manager approval, `discount_approvals` need a deal-desk approver, `purchase_requisitions` need a budget approver).");
  lines.push("- **`requires_permission=true`** on a lifecycle state when reaching that state needs a workflow gate (`approved`, `submitted`, `hired`, `resolved`, `closed`). The state's verb derives the permission name (`approved → ats:approve_<entity>`, `hired → ats:hire_<entity>`); set `verb_override` only when the natural verb differs from the state name.");
  lines.push("- **State naming:** snake_case, past-tense or status-noun (`draft`, `submitted`, `approved`, `active`, `closed`, `cancelled`). Stay consistent across sibling entities in a domain.");
  lines.push("- **Static-reference test:** if the entity has no meaningful state transitions beyond `active/inactive` and exists primarily to be referenced as configuration (codes, rules, catalogs, banded data), mark it `static-reference`. Don't invent CRUD states.");
  lines.push("");
  lines.push("## Entities in scope");
  lines.push("");
  for (const code of codes) {
    const d = domainByCode.get(code);
    if (!d) continue;
    lines.push(`### Domain ${code} — ${d.domain_name} (id ${d.id})`);
    lines.push("");
    if (d.description) lines.push(`> ${d.description.replace(/\n/g, " ")}`);
    lines.push("");
    const ms = masters
      .filter((m) => m.domain_id === d.id)
      .sort((a, b) => a.data_objects.data_object_name.localeCompare(b.data_objects.data_object_name));
    for (const m of ms) {
      const o = m.data_objects;
      lines.push(`#### ${o.data_object_name}`);
      lines.push("");
      lines.push(`- **Plural label:** ${o.plural_label || "(unset)"} · **Singular:** ${o.singular_label || "(unset)"}`);
      lines.push(`- **Description:** ${(o.description || "").replace(/\n/g, " ") || "(none)"}`);
      if (m.notes) lines.push(`- **Master slice notes:** ${m.notes.replace(/\n/g, " ")}`);
      const aas = aliasesByDo.get(o.id);
      if (aas?.length) {
        lines.push(`- **Aliases:** ${aas.map((a: any) => `${a.alias_name} (${a.alias_type})`).join("; ")}`);
      }
      // intra-cluster relationships
      const inboundOutbound = rels.filter(
        (r) => r.data_object_id === o.id || r.related_data_object_id === o.id,
      );
      if (inboundOutbound.length) {
        const formatted = inboundOutbound
          .slice(0, 12)
          .map((r: any) => {
            const src = nameById.get(r.data_object_id) || "?";
            const tgt = nameById.get(r.related_data_object_id) || "?";
            return `${src} —${r.relationship_verb}→ ${tgt} (${r.relationship_type}${r.is_required ? ", req" : ""})`;
          })
          .join("; ");
        lines.push(`- **Relationships (≤12):** ${formatted}`);
      }
      lines.push("");
    }
  }

  const outPath = `${ROOT}/.tmp_deploy/p_b3_${clusterKey}_brief.md`;
  FS.writeFileSync(outPath, lines.join("\n"));
  console.log(`wrote ${outPath} (${lines.length} lines)`);
}
