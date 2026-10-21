// CLM b3 entity load (greenlit a9=yes). Phase B for 9 confirmed masters. Idempotent (natural-key checks).
// Everything lands at record_status='new' (DB default; omitted on insert). No notes (Rule #15). American English, no em-dash.

const MOD = { AUTHORING: 125, NEGOTIATION: 126, REPOSITORY: 127, OBLIGATION: 128, RENEWAL: 129 };
const LC = 66; // legal_contracts
const CLAUSES = 68; // contract_clauses

async function call(method: string, path: string, body?: unknown): Promise<any> {
  const arg = JSON.stringify({ method, path, ...(body ? { body } : {}) });
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest", arg], { stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(`semantius exit ${code}: ${err || out}`);
  return out.trim() ? JSON.parse(out) : null;
}

// users platform-builtin id (Rule #10 edges)
const usersRows = await call("GET", "/data_objects?data_object_name=eq.users&kind=eq.platform_builtin&select=id");
const USERS = usersRows?.[0]?.id;
if (!USERS) throw new Error("Cannot resolve platform_builtin users data_object.");
console.log(`users data_object id = ${USERS}`);

type Lc = [name: string, order: number, init: boolean, term: boolean, gate: boolean];
interface Ent {
  name: string; sing: string; plur: string; desc: string;
  etype: string; module: number; necessity: "required" | "optional";
  pc?: boolean; sl?: boolean; sa?: boolean;
  aliases: string[];
  lifecycle?: Lc[];
  relToContract?: { verb: string; inverse: string; type: string; kind: string; ownerSrcIsContract: boolean };
  extraRel?: { related: number; verb: string; inverse: string; type: string; kind: string; owner: "source" | "target" };
  userVerb?: string; // users -> entity verb (e.g. "approves")
}

const ENTITIES: Ent[] = [
  {
    name: "contract_amendments", sing: "Contract Amendment", plur: "Contract Amendments",
    desc: "A formal change to the terms of an executed contract, tracked as its own record with an approval and signature trail.",
    etype: "operational_workflow", module: MOD.REPOSITORY, necessity: "required", sl: true,
    aliases: ["amendment", "change order"],
    lifecycle: [["drafting", 10, true, false, false], ["in_review", 20, false, false, false], ["approved", 30, false, false, true], ["executed", 40, false, true, true]],
    relToContract: { verb: "is amended by", inverse: "amends", type: "one_to_many", kind: "composition", ownerSrcIsContract: true },
    userVerb: "approves",
  },
  {
    name: "contract_renewal_records", sing: "Contract Renewal Record", plur: "Contract Renewal Records",
    desc: "A record of a single renewal of an existing contract, capturing the renewed term, pricing, and outcome distinct from the original agreement.",
    etype: "operational_workflow", module: MOD.RENEWAL, necessity: "required", sl: true,
    aliases: ["renewal", "renewal record"],
    lifecycle: [["pending", 10, true, false, false], ["in_progress", 20, false, false, false], ["renewed", 30, false, true, true], ["lapsed", 40, false, true, false]],
    relToContract: { verb: "is renewed by", inverse: "renews", type: "one_to_many", kind: "composition", ownerSrcIsContract: true },
    userVerb: "owns",
  },
  {
    name: "clause_libraries", sing: "Clause Library", plur: "Clause Libraries",
    desc: "A versioned, governed collection of approved contract clauses, often organized by jurisdiction or contract type, that authors draw from.",
    etype: "catalog", module: MOD.AUTHORING, necessity: "optional",
    aliases: ["clause set", "clause bank"],
    extraRel: { related: CLAUSES, verb: "contains", inverse: "belongs to library", type: "one_to_many", kind: "composition", owner: "source" },
  },
  {
    name: "negotiation_playbooks", sing: "Negotiation Playbook", plur: "Negotiation Playbooks",
    desc: "A set of negotiation rules and fallback positions that guide how clauses may be redlined and what concessions are pre-approved.",
    etype: "catalog", module: MOD.NEGOTIATION, necessity: "optional",
    aliases: ["playbook", "negotiation guide"],
    extraRel: { related: CLAUSES, verb: "defines positions for", inverse: "has playbook positions in", type: "one_to_many", kind: "reference", owner: "source" },
  },
  {
    name: "contract_risk_assessments", sing: "Contract Risk Assessment", plur: "Contract Risk Assessments",
    desc: "A structured assessment of the legal or commercial risk in a contract or clause, produced during review and dispositioned by a reviewer.",
    etype: "operational_workflow", module: MOD.NEGOTIATION, necessity: "optional",
    aliases: ["risk score", "compliance score"],
    lifecycle: [["flagged", 10, true, false, false], ["under_review", 20, false, false, false], ["accepted", 30, false, true, true], ["mitigated", 40, false, true, false]],
    relToContract: { verb: "is assessed by", inverse: "assesses", type: "one_to_many", kind: "association", ownerSrcIsContract: true },
    userVerb: "reviews",
  },
  {
    name: "contract_counterparties", sing: "Contract Counterparty", plur: "Contract Counterparties",
    desc: "The external party to a contract, held as its own record because a counterparty is not always a CRM account or supplier and may sign many contracts.",
    etype: "operational_record", module: MOD.REPOSITORY, necessity: "optional", pc: true,
    aliases: ["counterparty", "contracting party"],
    extraRel: { related: LC, verb: "is party to", inverse: "has counterparty", type: "one_to_many", kind: "reference", owner: "source" },
  },
  {
    name: "contract_milestones", sing: "Contract Milestone", plur: "Contract Milestones",
    desc: "A date-driven checkpoint in a contract (for example a delivery date or review date), distinct from a deliverable obligation.",
    etype: "operational_workflow", module: MOD.OBLIGATION, necessity: "optional",
    aliases: ["milestone", "contract checkpoint"],
    lifecycle: [["pending", 10, true, false, false], ["reached", 20, false, true, true], ["missed", 30, false, true, false]],
    relToContract: { verb: "has milestone", inverse: "belongs to contract", type: "one_to_many", kind: "composition", ownerSrcIsContract: true },
    userVerb: "owns",
  },
  {
    name: "data_protection_addenda", sing: "Data Protection Addendum", plur: "Data Protection Addenda",
    desc: "A data processing addendum attached to a contract that governs how personal data is handled, with its own approval and renewal cycle.",
    etype: "operational_workflow", module: MOD.REPOSITORY, necessity: "optional", pc: true, sl: true,
    aliases: ["DPA", "data processing addendum"],
    lifecycle: [["drafting", 10, true, false, false], ["active", 20, false, false, true], ["expired", 30, false, true, false]],
    relToContract: { verb: "has data protection addendum", inverse: "supplements", type: "one_to_many", kind: "composition", ownerSrcIsContract: true },
    userVerb: "approves",
  },
  {
    name: "contract_negotiation_threads", sing: "Negotiation Thread", plur: "Negotiation Threads",
    desc: "A structured thread of negotiation rounds and counterparty exchanges on a contract, separate from the clauses and the contract itself.",
    etype: "operational_workflow", module: MOD.NEGOTIATION, necessity: "optional",
    aliases: ["negotiation round", "redline thread"],
    lifecycle: [["open", 10, true, false, false], ["in_discussion", 20, false, false, false], ["resolved", 30, false, true, true], ["withdrawn", 40, false, true, false]],
    relToContract: { verb: "is negotiated in", inverse: "negotiates", type: "one_to_many", kind: "composition", ownerSrcIsContract: true },
    userVerb: "participates in",
  },
];

// 1. Upsert data_objects by name -> id map
const idByName: Record<string, number> = {};
for (const e of ENTITIES) {
  const existing = await call("GET", `/data_objects?data_object_name=eq.${e.name}&select=id`);
  if (existing?.length) {
    idByName[e.name] = existing[0].id;
    console.log(`data_object ${e.name}: exists (id ${existing[0].id})`);
    continue;
  }
  await call("POST", "/data_objects", {
    data_object_name: e.name, singular_label: e.sing, plural_label: e.plur, description: e.desc,
    entity_type: e.etype, kind: "domain_owned",
    has_personal_content: !!e.pc, has_submit_lock: !!e.sl, has_single_approver: !!e.sa,
    is_canonical_bare_word: false,
  });
  const row = await call("GET", `/data_objects?data_object_name=eq.${e.name}&select=id`);
  idByName[e.name] = row[0].id;
  console.log(`data_object ${e.name}: INSERTED (id ${row[0].id})`);
}

// helper: insert-if-absent
async function ensure(table: string, filter: string, body: Record<string, unknown>, label: string) {
  const found = await call("GET", `/${table}?${filter}&select=id`);
  if (found?.length) { console.log(`  ${label}: exists`); return found[0].id; }
  await call("POST", `/${table}`, body);
  console.log(`  ${label}: INSERTED`);
}

// 2-5. DMDO master, aliases, relationships, lifecycle
for (const e of ENTITIES) {
  const id = idByName[e.name];
  console.log(`\n${e.name} (id ${id}):`);

  await ensure("domain_module_data_objects",
    `domain_module_id=eq.${e.module}&data_object_id=eq.${id}`,
    { domain_module_id: e.module, data_object_id: id, role: "master", necessity: e.necessity },
    `DMDO master on module ${e.module} (${e.necessity})`);

  for (const a of e.aliases) {
    await ensure("data_object_aliases",
      `data_object_id=eq.${id}&alias_name=eq.${encodeURIComponent(a)}`,
      { data_object_id: id, alias_name: a, alias_type: "synonym" },
      `alias "${a}"`);
  }

  if (e.relToContract) {
    const r = e.relToContract;
    const srcId = r.ownerSrcIsContract ? LC : id;
    const relId = r.ownerSrcIsContract ? id : LC;
    await ensure("data_object_relationships",
      `data_object_id=eq.${srcId}&related_data_object_id=eq.${relId}&relationship_verb=eq.${encodeURIComponent(r.verb)}`,
      { data_object_id: srcId, related_data_object_id: relId, relationship_verb: r.verb, inverse_verb: r.inverse,
        relationship_type: r.type, relationship_kind: r.kind, is_required: false, owner_side: "source" },
      `rel ${srcId} ${r.verb} ${relId}`);
  }

  if (e.extraRel) {
    const r = e.extraRel;
    const srcId = r.owner === "source" ? id : r.related;
    const relId = r.owner === "source" ? r.related : id;
    await ensure("data_object_relationships",
      `data_object_id=eq.${srcId}&related_data_object_id=eq.${relId}&relationship_verb=eq.${encodeURIComponent(r.verb)}`,
      { data_object_id: srcId, related_data_object_id: relId, relationship_verb: r.verb, inverse_verb: r.inverse,
        relationship_type: r.type, relationship_kind: r.kind, is_required: false, owner_side: "source" },
      `extra-rel ${srcId} ${r.verb} ${relId}`);
  }

  if (e.userVerb) {
    await ensure("data_object_relationships",
      `data_object_id=eq.${USERS}&related_data_object_id=eq.${id}&relationship_verb=eq.${encodeURIComponent(e.userVerb)}`,
      { data_object_id: USERS, related_data_object_id: id, relationship_verb: e.userVerb, inverse_verb: "is " + e.userVerb.replace(/s$/, "ed") + " by",
        relationship_type: "one_to_many", relationship_kind: "reference", is_required: false, owner_side: "source" },
      `users ${e.userVerb} ${e.name}`);
  }

  if (e.lifecycle) {
    for (const [sname, sorder, sinit, sterm, sgate] of e.lifecycle) {
      await ensure("data_object_lifecycle_states",
        `data_object_id=eq.${id}&state_name=eq.${sname}`,
        { data_object_id: id, state_name: sname, state_order: sorder, is_initial: sinit, is_terminal: sterm,
          requires_permission: sgate, domain_module_id: sgate ? e.module : null },
        `lifecycle ${sname}${sgate ? " (gate)" : ""}`);
    }
  }
}

// verify
console.log("\n=== VERIFY: new masters present with module + entity_type ===");
const names = ENTITIES.map((e) => e.name).map((n) => `"${n}"`).join(",");
const check = await call("GET", `/data_objects?data_object_name=in.(${names})&select=id,data_object_name,entity_type,record_status&order=id.asc`);
for (const c of check) console.log(`  ${c.data_object_name}: id=${c.id} entity_type=${c.entity_type} status=${c.record_status}`);
console.log(`\n${check.length}/9 masters present.`);
