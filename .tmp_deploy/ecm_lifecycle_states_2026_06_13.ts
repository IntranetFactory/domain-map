// B1B-L1 / L2 / L5: author lifecycle states for the 3 ECM operational_workflow masters.
//   429 content_documents (ECM-REPOSITORY 242): draft -> in_review* -> published* -> superseded; branch under_legal_hold; terminal archived
//   430 document_versions (ECM-REPOSITORY 242): draft -> published
//   433 records_retention_policies (ECM-RECORDS-GOV 243): draft -> under_review -> active* -> superseded -> retired
// (* = requires_permission gate; domain_module_id set on the gate's realizing module)
// Additive inserts; record_status omitted (DB default 'new', Rule #1).
// Idempotent: skips a (data_object_id, state_name) that already exists.

type State = {
  data_object_id: number;
  state_name: string;
  state_order: number;
  description: string;
  is_initial?: boolean;
  is_terminal?: boolean;
  requires_permission?: boolean;
  permission_verb_override?: string;
  domain_module_id?: number;
};

const STATES: State[] = [
  // 429 content_documents
  { data_object_id: 429, state_name: "draft", state_order: 10, description: "Document uploaded and being prepared; not yet submitted for review.", is_initial: true },
  { data_object_id: 429, state_name: "in_review", state_order: 20, description: "Document submitted into a review workflow awaiting approval.", requires_permission: true, permission_verb_override: "review_content_document", domain_module_id: 242 },
  { data_object_id: 429, state_name: "published", state_order: 30, description: "Document approved and published as the trusted current version.", requires_permission: true, permission_verb_override: "publish_content_document", domain_module_id: 242 },
  { data_object_id: 429, state_name: "under_legal_hold", state_order: 40, description: "Document frozen under a legal hold; disposition suspended until the hold clears.", domain_module_id: 243 },
  { data_object_id: 429, state_name: "superseded", state_order: 50, description: "Document replaced by a newer published version.", is_terminal: true },
  { data_object_id: 429, state_name: "archived", state_order: 60, description: "Document moved to archival storage at end of its active life.", is_terminal: true },

  // 430 document_versions
  { data_object_id: 430, state_name: "draft", state_order: 10, description: "Version checked out and being edited; not yet published.", is_initial: true },
  { data_object_id: 430, state_name: "published", state_order: 20, description: "Version checked in and published as part of the document history.", is_terminal: true },

  // 433 records_retention_policies
  { data_object_id: 433, state_name: "draft", state_order: 10, description: "Retention policy being authored by the records officer.", is_initial: true },
  { data_object_id: 433, state_name: "under_review", state_order: 20, description: "Retention policy circulated for review before activation." },
  { data_object_id: 433, state_name: "active", state_order: 30, description: "Retention policy in force and applied to in-scope records.", requires_permission: true, permission_verb_override: "activate_retention_policy", domain_module_id: 243 },
  { data_object_id: 433, state_name: "superseded", state_order: 40, description: "Retention policy replaced by a newer active policy.", is_terminal: true },
  { data_object_id: 433, state_name: "retired", state_order: 50, description: "Retention policy decommissioned and no longer applied.", is_terminal: true },
];

async function call(method: string, path: string, body?: unknown): Promise<string> {
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  // Pass JSON via stdin (canonical pattern; inline args mangle array bodies on Windows).
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  await proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (err.trim()) console.error(`stderr (${path}): ${err.trim()}`);
  return out;
}

// Pre-flight: existing states for these masters (idempotency).
const existing = JSON.parse(
  await call("GET", "/data_object_lifecycle_states?data_object_id=in.(429,430,433)&select=data_object_id,state_name")
) as Array<{ data_object_id: number; state_name: string }>;
const have = new Set(existing.map((r) => `${r.data_object_id}.${r.state_name}`));

const toInsert = STATES.filter((s) => !have.has(`${s.data_object_id}.${s.state_name}`)).map((s) => ({
  data_object_id: s.data_object_id,
  state_name: s.state_name,
  state_order: s.state_order,
  description: s.description,
  is_initial: s.is_initial ?? false,
  is_terminal: s.is_terminal ?? false,
  requires_permission: s.requires_permission ?? false,
  permission_verb_override: s.permission_verb_override ?? "",
  ...(s.domain_module_id !== undefined ? { domain_module_id: s.domain_module_id } : {}),
}));

if (toInsert.length === 0) {
  console.log("Nothing to insert -- all states already present.");
} else {
  // Insert one row at a time (the proven single-row stdin shape) for robustness.
  let ok = 0;
  for (const row of toInsert) {
    const res = await call("POST", "/data_object_lifecycle_states", [row]);
    if (res.includes('"id"')) {
      ok++;
    } else {
      console.error(`FAILED ${row.data_object_id}.${row.state_name}: ${res.trim().slice(0, 160)}`);
    }
  }
  console.log(`Inserted ${ok}/${toInsert.length} states.`);
}

const after = JSON.parse(
  await call("GET", "/data_object_lifecycle_states?data_object_id=in.(429,430,433)&select=data_object_id,state_name,state_order,is_initial,is_terminal,requires_permission,domain_module_id&order=data_object_id.asc,state_order.asc")
);
console.log("\nFinal states:");
for (const r of after as Array<Record<string, unknown>>) {
  console.log(`  ${r.data_object_id} ${String(r.state_name).padEnd(18)} order=${r.state_order} init=${r.is_initial} term=${r.is_terminal} gate=${r.requires_permission} mod=${r.domain_module_id ?? "-"}`);
}
