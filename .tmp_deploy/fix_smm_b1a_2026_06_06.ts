// SMM b1a execution 2026-06-06: B7 (users edges), B6 (intra-domain rels), B11 (aliases).
// Idempotent. Chunked array-body POST via stdin. No Python. record_status + notes omitted.

type Row = Record<string, unknown>;

async function call(payload: Row): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  proc.stdin.end();
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(`semantius exited ${code}: ${err}\n${out}`);
  }
  const txt = out.trim();
  return txt ? JSON.parse(txt) : null;
}

function uniformize(rows: Row[]): Row[] {
  const keys = new Set<string>();
  for (const r of rows) for (const k of Object.keys(r)) keys.add(k);
  return rows.map((r) => {
    const o: Row = {};
    for (const k of keys) o[k] = Object.prototype.hasOwnProperty.call(r, k) ? r[k] : null;
    return o;
  });
}

async function insert(path: string, rows: Row[]): Promise<any[]> {
  if (rows.length === 0) return [];
  const CHUNK = 50;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = uniformize(rows.slice(i, i + CHUNK));
    const res = await call({ method: "POST", path, body: slice });
    if (Array.isArray(res)) out.push(...res);
  }
  return out;
}

async function get(path: string): Promise<any[]> {
  const res = await call({ method: "GET", path });
  return Array.isArray(res) ? res : [];
}

// ---- master ids ----
const social_posts = 125,
  social_accounts = 126,
  social_messages = 127,
  social_mentions = 128,
  social_listening_topics = 129,
  influencers = 130,
  users = 748;

// ---------- B6: intra-domain relationships (4) ----------
const b6: Row[] = [
  {
    data_object_id: social_accounts,
    related_data_object_id: social_posts,
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: "publishes",
    inverse_verb: "is_published_by",
    is_required: false,
    owner_side: "source",
  },
  {
    data_object_id: influencers,
    related_data_object_id: social_posts,
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: "authors",
    inverse_verb: "is_authored_by",
    is_required: false,
    owner_side: "source",
  },
  {
    data_object_id: social_listening_topics,
    related_data_object_id: social_mentions,
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: "matches",
    inverse_verb: "is_matched_by",
    is_required: false,
    owner_side: "source",
  },
  {
    data_object_id: social_accounts,
    related_data_object_id: social_messages,
    relationship_type: "one_to_many",
    relationship_kind: "reference",
    relationship_verb: "receives",
    inverse_verb: "is_received_by",
    is_required: false,
    owner_side: "source",
  },
];

// ---------- B7: users edges (8) Rule #10 ----------
const mkUserEdge = (target: number, verb: string, inverse: string): Row => ({
  data_object_id: users,
  related_data_object_id: target,
  relationship_type: "one_to_many",
  relationship_kind: "reference",
  relationship_verb: verb,
  inverse_verb: inverse,
  is_required: false,
  owner_side: "source",
});

const b7: Row[] = [
  mkUserEdge(social_posts, "authors", "is_authored_by"),
  mkUserEdge(social_posts, "schedules", "is_scheduled_by"),
  mkUserEdge(social_posts, "approves", "is_approved_by"),
  mkUserEdge(social_messages, "responds_to", "is_responded_by"),
  mkUserEdge(social_accounts, "owns", "is_owned_by"),
  mkUserEdge(influencers, "manages_relationship_with", "relationship_managed_by"),
  mkUserEdge(social_listening_topics, "owns", "is_owned_by"),
  mkUserEdge(social_mentions, "is_assigned", "assigned_to"),
];

// ---------- B11: aliases (15) ----------
const mkAlias = (doid: number, name: string): Row => ({
  data_object_id: doid,
  alias_name: name,
  alias_type: "synonym",
  is_preferred: false,
});

const b11: Row[] = [
  mkAlias(social_messages, "Conversations"),
  mkAlias(social_messages, "Inbox Threads"),
  mkAlias(social_messages, "Cases"),
  mkAlias(social_mentions, "Brand Mentions"),
  mkAlias(social_mentions, "Buzz Items"),
  mkAlias(social_posts, "Updates"),
  mkAlias(social_posts, "Drafts"),
  mkAlias(social_posts, "Scheduled Posts"),
  mkAlias(social_accounts, "Profiles"),
  mkAlias(social_accounts, "Connected Channels"),
  mkAlias(social_listening_topics, "Queries"),
  mkAlias(social_listening_topics, "Smart Folders"),
  mkAlias(social_listening_topics, "Themes"),
  mkAlias(influencers, "Creators"),
  mkAlias(influencers, "Talent"),
];

// ---------- idempotency pre-reads ----------
const relExisting = await get(
  "/data_object_relationships?or=(data_object_id.in.(125,126,127,128,129,130,748),related_data_object_id.in.(125,126,127,128,129,130))&select=data_object_id,related_data_object_id,relationship_verb",
);
const relKey = (r: Row) => `${r.data_object_id}|${r.related_data_object_id}|${r.relationship_verb}`;
const relSeen = new Set(relExisting.map(relKey));

const aliasExisting = await get(
  "/data_object_aliases?data_object_id=in.(125,126,127,128,129,130)&select=data_object_id,alias_name",
);
const aliasKey = (r: Row) => `${r.data_object_id}|${r.alias_name}`;
const aliasSeen = new Set(aliasExisting.map(aliasKey));

const relRows = [...b6, ...b7].filter((r) => !relSeen.has(relKey(r)));
const aliasRows = b11.filter((r) => !aliasSeen.has(aliasKey(r)));

console.log(
  `pre-read: ${relExisting.length} existing rels, ${aliasExisting.length} existing aliases on SMM masters`,
);
console.log(
  `to insert: ${relRows.length} relationships (of ${b6.length + b7.length}), ${aliasRows.length} aliases (of ${b11.length})`,
);

const insertedRels = await insert("/data_object_relationships", relRows);
const insertedAliases = await insert("/data_object_aliases", aliasRows);

console.log(`\ninserted relationships: ${insertedRels.length}`);
for (const r of insertedRels)
  console.log(`  rel id ${r.id}: ${r.data_object_id} ${r.relationship_verb} ${r.related_data_object_id}`);
console.log(`\ninserted aliases: ${insertedAliases.length}`);
for (const r of insertedAliases) console.log(`  alias id ${r.id}: ${r.data_object_id} -> "${r.alias_name}"`);

// ---------- verify counts ----------
const relAfter = await get(
  "/data_object_relationships?or=(data_object_id.in.(125,126,127,128,129,130,748),related_data_object_id.in.(125,126,127,128,129,130))&select=id",
);
const aliasAfter = await get("/data_object_aliases?data_object_id=in.(125,126,127,128,129,130)&select=id");
console.log(
  `\nVERIFY: ${relAfter.length} relationships touching SMM masters/users; ${aliasAfter.length} aliases on SMM masters`,
);
