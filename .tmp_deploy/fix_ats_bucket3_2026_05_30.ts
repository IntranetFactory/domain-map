// ATS Bucket 3 Phase B loader, 2026-05-30
// Applies the 5 LOAD + 2 MERGE outcomes from the Phase 0 vetting at
// c:/tmp/ATS-phase0-2026-05-30.md (recorded in audits/ATS.md continuation).
//
// Idempotent on inserts via natural keys. Safe to re-run.
//
// Phases:
//   1. INSERT 5 data_objects (candidate_documents, candidate_notes, candidate_tags,
//      candidate_tag_assignments, offer_letter_templates)
//   2. INSERT 5 domain_module_data_objects (one master row per new entity)
//   3. INSERT 10 data_object_relationships (5 entity-edges + 5 user-edges per Rule #10)
//   4. INSERT 5 data_object_lifecycle_states on offer_letter_templates
//   5. INSERT 3 data_object_aliases on application_dispositions (id 900) for the
//      application_archive_reasons MERGE
//
// All rows ship record_status='new' per Rule #1 (column omitted, DB default applies).
// No notes columns populated per Rule #15.
// No vendor names in descriptions per Rule #18.

const SEMANTIUS = "semantius";

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const args = ["call", "crud", "postgrestRequest"];
  const payload: Record<string, unknown> = { method, path };
  if (body !== undefined) payload.body = body;
  const p = Bun.spawn([SEMANTIUS, ...args], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  p.stdin.write(JSON.stringify(payload));
  await p.stdin.end();
  const stdout = await new Response(p.stdout).text();
  const stderr = await new Response(p.stderr).text();
  const code = await p.exited;
  if (code !== 0) {
    throw new Error(`semantius exit ${code}: ${stderr}\nstdout: ${stdout}`);
  }
  if (!stdout.trim()) return null;
  try { return JSON.parse(stdout); } catch { return stdout; }
}

async function get(path: string) { return call("GET", path); }
async function post(path: string, body: unknown) { return call("POST", path, body); }

type Row = Record<string, unknown>;

async function insertMissing(
  table: string,
  rows: Row[],
  naturalKey: string,
): Promise<Map<string, number>> {
  const keys = rows.map((r) => String(r[naturalKey]));
  const filter = `${naturalKey}=in.(${keys.map((k) => encodeURIComponent(k)).join(",")})`;
  const existing = (await get(`/${table}?${filter}&select=id,${naturalKey}`)) as Row[];
  const haveKeys = new Set(existing.map((e) => String(e[naturalKey])));
  const toInsert = rows.filter((r) => !haveKeys.has(String(r[naturalKey])));
  if (toInsert.length) {
    console.log(`  ${table}: inserting ${toInsert.length}/${rows.length} new rows`);
    await post(`/${table}`, toInsert);
  } else {
    console.log(`  ${table}: all ${rows.length} rows already present`);
  }
  const after = (await get(`/${table}?${filter}&select=id,${naturalKey}`)) as Row[];
  const map = new Map<string, number>();
  for (const r of after) map.set(String(r[naturalKey]), Number(r.id));
  return map;
}

// Insert composite-key rows by reading existing on a composite filter, then
// inserting only the ones not present. Used for junctions and edge tables.
async function insertCompositeMissing(
  table: string,
  rows: Row[],
  keyCols: string[],
  describe: (row: Row) => string,
): Promise<void> {
  // Pull every existing row that could match (limit to the columns we filter on)
  // by querying per-row presence; for these small loads it's the simplest correct
  // strategy and avoids accidental over-broad GET filters.
  let inserted = 0;
  for (const row of rows) {
    const filter = keyCols
      .map((c) => `${c}=eq.${encodeURIComponent(String(row[c]))}`)
      .join("&");
    const existing = (await get(`/${table}?${filter}&select=id`)) as Row[];
    if (existing.length === 0) {
      await post(`/${table}`, [row]);
      inserted++;
      console.log(`    + ${describe(row)}`);
    }
  }
  console.log(`  ${table}: inserted ${inserted}/${rows.length} new rows`);
}

async function main() {
  console.log("ATS Bucket 3 Phase B loader starting...");

  // Verify constants (fail loudly if drift since draft)
  const ATS_CANDIDATE_CRM = 1;
  const ATS_TALENT_POOLS = 2;
  const ATS_OFFERS = 6;
  const CANDIDATES_ID = 3;
  const USERS_ID = 748;
  const OFFER_LETTER_DOCUMENTS_ID = 897;
  const APPLICATION_DISPOSITIONS_ID = 900;

  // ────────────────────────────────────────────────────────────────
  // Phase 1: data_objects (5 new)
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 1] data_objects");
  const newDataObjects = [
    {
      data_object_name: "candidate_documents",
      singular_label: "Candidate Document",
      plural_label: "Candidate Documents",
      kind: "domain_owned",
      description:
        "File artifact attached to a candidate (resume, cover letter, portfolio, work sample, signed disclosure, reference letter, right-to-work proof). Carries document type, MIME type, storage URI, uploaded-by actor, uploaded-at timestamp, and visibility scope.",
      has_personal_content: true,
      has_submit_lock: false,
      has_single_approver: false,
    },
    {
      data_object_name: "candidate_notes",
      singular_label: "Candidate Note",
      plural_label: "Candidate Notes",
      kind: "domain_owned",
      description:
        "Free-form recruiter or hiring-team note on a candidate, internal-only, never sent to the candidate. Carries author, body, visibility scope (private to author, team, or hiring panel), timestamp, and optional at-mentions to other team members.",
      has_personal_content: true,
      has_submit_lock: false,
      has_single_approver: false,
    },
    {
      data_object_name: "candidate_tags",
      singular_label: "Candidate Tag",
      plural_label: "Candidate Tags",
      kind: "domain_owned",
      description:
        "Free-form label applied to a candidate to support segmentation, search, and pool inclusion rules. Distinct from talent pools (curated membership lists). Carries name, optional category, and color.",
      has_personal_content: false,
      has_submit_lock: false,
      has_single_approver: false,
    },
    {
      data_object_name: "candidate_tag_assignments",
      singular_label: "Candidate Tag Assignment",
      plural_label: "Candidate Tag Assignments",
      kind: "domain_owned",
      description:
        "Many-to-many junction between candidates and candidate_tags. Carries assigned_by, assigned_at, and optional context.",
      has_personal_content: false,
      has_submit_lock: false,
      has_single_approver: false,
    },
    {
      data_object_name: "offer_letter_templates",
      singular_label: "Offer Letter Template",
      plural_label: "Offer Letter Templates",
      kind: "domain_owned",
      description:
        "Reusable letter template with merge tokens (candidate name, role, base salary, start date, equity, bonus terms). Versioned. Renders offer_letter_documents at offer time. Carries template name, body, token schema, jurisdiction, language, active flag, and version.",
      has_personal_content: false,
      has_submit_lock: true,
      has_single_approver: true,
    },
  ];
  const doMap = await insertMissing("data_objects", newDataObjects, "data_object_name");
  const candidateDocumentsId = doMap.get("candidate_documents")!;
  const candidateNotesId = doMap.get("candidate_notes")!;
  const candidateTagsId = doMap.get("candidate_tags")!;
  const candidateTagAssignmentsId = doMap.get("candidate_tag_assignments")!;
  const offerLetterTemplatesId = doMap.get("offer_letter_templates")!;

  // ────────────────────────────────────────────────────────────────
  // Phase 2: domain_module_data_objects (5 master rows)
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 2] domain_module_data_objects");
  const dmdoRows: Row[] = [
    { domain_module_id: ATS_CANDIDATE_CRM, data_object_id: candidateDocumentsId, role: "master", necessity: "required" },
    { domain_module_id: ATS_CANDIDATE_CRM, data_object_id: candidateNotesId, role: "master", necessity: "required" },
    { domain_module_id: ATS_TALENT_POOLS, data_object_id: candidateTagsId, role: "master", necessity: "required" },
    { domain_module_id: ATS_TALENT_POOLS, data_object_id: candidateTagAssignmentsId, role: "master", necessity: "required" },
    { domain_module_id: ATS_OFFERS, data_object_id: offerLetterTemplatesId, role: "master", necessity: "required" },
  ];
  await insertCompositeMissing(
    "domain_module_data_objects",
    dmdoRows,
    ["domain_module_id", "data_object_id"],
    (r) => `module ${r.domain_module_id} → data_object ${r.data_object_id} (${r.role})`,
  );

  // ────────────────────────────────────────────────────────────────
  // Phase 3: data_object_relationships
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 3] data_object_relationships (entity edges + user edges per Rule #10)");
  const relRows: Row[] = [
    // Entity edges, stored on the parent side (candidates as source, etc.) per catalog convention.
    {
      data_object_id: CANDIDATES_ID,
      related_data_object_id: candidateDocumentsId,
      relationship_verb: "documented_via",
      inverse_verb: "for_candidate",
      relationship_type: "one_to_many",
      relationship_kind: "composition",
      owner_side: "source",
      is_required: false,
    },
    {
      data_object_id: CANDIDATES_ID,
      related_data_object_id: candidateNotesId,
      relationship_verb: "annotated_via",
      inverse_verb: "about_candidate",
      relationship_type: "one_to_many",
      relationship_kind: "composition",
      owner_side: "source",
      is_required: false,
    },
    {
      data_object_id: CANDIDATES_ID,
      related_data_object_id: candidateTagAssignmentsId,
      relationship_verb: "tagged_via",
      inverse_verb: "tags_candidate",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
    },
    {
      data_object_id: candidateTagsId,
      related_data_object_id: candidateTagAssignmentsId,
      relationship_verb: "applied_via",
      inverse_verb: "references_tag",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: true,
    },
    {
      data_object_id: offerLetterTemplatesId,
      related_data_object_id: OFFER_LETTER_DOCUMENTS_ID,
      relationship_verb: "rendered_as",
      inverse_verb: "renders_from",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
    },
    // User edges per Rule #10. Stored on users (748) as source.
    {
      data_object_id: USERS_ID,
      related_data_object_id: candidateDocumentsId,
      relationship_verb: "uploaded documents",
      inverse_verb: "is_uploaded_by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
    },
    {
      data_object_id: USERS_ID,
      related_data_object_id: candidateNotesId,
      relationship_verb: "authored notes",
      inverse_verb: "is_authored_by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
    },
    {
      data_object_id: USERS_ID,
      related_data_object_id: candidateTagAssignmentsId,
      relationship_verb: "assigned tags",
      inverse_verb: "is_assigned_by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
    },
    {
      data_object_id: USERS_ID,
      related_data_object_id: offerLetterTemplatesId,
      relationship_verb: "authored templates",
      inverse_verb: "is_authored_by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
    },
    {
      data_object_id: USERS_ID,
      related_data_object_id: offerLetterTemplatesId,
      relationship_verb: "approved templates",
      inverse_verb: "is_approved_by",
      relationship_type: "one_to_many",
      relationship_kind: "reference",
      owner_side: "source",
      is_required: false,
    },
  ];
  // Composite key for relationships: (data_object_id, related_data_object_id, relationship_verb)
  await insertCompositeMissing(
    "data_object_relationships",
    relRows,
    ["data_object_id", "related_data_object_id", "relationship_verb"],
    (r) => `${r.data_object_id} -[${r.relationship_verb}]-> ${r.related_data_object_id}`,
  );

  // ────────────────────────────────────────────────────────────────
  // Phase 4: lifecycle states (offer_letter_templates only)
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 4] data_object_lifecycle_states (offer_letter_templates)");
  const lifecycleRows: Row[] = [
    {
      data_object_id: offerLetterTemplatesId,
      state_name: "draft",
      state_order: 10,
      is_initial: true,
      is_terminal: false,
      requires_permission: false,
      permission_verb_override: "",
      domain_module_id: ATS_OFFERS,
      description: "Template is being authored; not visible for offer generation.",
    },
    {
      data_object_id: offerLetterTemplatesId,
      state_name: "in_review",
      state_order: 20,
      is_initial: false,
      is_terminal: false,
      requires_permission: true,
      permission_verb_override: "submit_offer_letter_template_for_review",
      domain_module_id: ATS_OFFERS,
      description: "Author has submitted the template for legal or HR-Comp review.",
    },
    {
      data_object_id: offerLetterTemplatesId,
      state_name: "approved",
      state_order: 30,
      is_initial: false,
      is_terminal: false,
      requires_permission: true,
      permission_verb_override: "approve_offer_letter_template",
      domain_module_id: ATS_OFFERS,
      description: "Single approver (legal or HR-Comp) has signed off; ready for activation.",
    },
    {
      data_object_id: offerLetterTemplatesId,
      state_name: "active",
      state_order: 40,
      is_initial: false,
      is_terminal: false,
      requires_permission: true,
      permission_verb_override: "activate_offer_letter_template",
      domain_module_id: ATS_OFFERS,
      description: "Template is live and available for new offers to render against.",
    },
    {
      data_object_id: offerLetterTemplatesId,
      state_name: "superseded",
      state_order: 50,
      is_initial: false,
      is_terminal: false,
      requires_permission: false,
      permission_verb_override: "",
      domain_module_id: ATS_OFFERS,
      description: "A newer version of this template has been activated; this row is retained for historical offers.",
    },
    {
      data_object_id: offerLetterTemplatesId,
      state_name: "retired",
      state_order: 60,
      is_initial: false,
      is_terminal: true,
      requires_permission: true,
      permission_verb_override: "retire_offer_letter_template",
      domain_module_id: ATS_OFFERS,
      description: "Template withdrawn from use; no new offers may render against it.",
    },
  ];
  await insertCompositeMissing(
    "data_object_lifecycle_states",
    lifecycleRows,
    ["data_object_id", "state_name"],
    (r) => `${r.data_object_id}.${r.state_name} (order ${r.state_order})`,
  );

  // ────────────────────────────────────────────────────────────────
  // Phase 5: aliases on application_dispositions (MERGE for archive_reasons)
  // ────────────────────────────────────────────────────────────────
  console.log("\n[Phase 5] data_object_aliases on application_dispositions (id 900)");
  const aliasRows: Row[] = [
    {
      data_object_id: APPLICATION_DISPOSITIONS_ID,
      alias_name: "Archive Reason",
      alias_type: "synonym",
    },
    {
      data_object_id: APPLICATION_DISPOSITIONS_ID,
      alias_name: "Rejection Reason",
      alias_type: "synonym",
    },
    {
      data_object_id: APPLICATION_DISPOSITIONS_ID,
      alias_name: "Disposition Reason",
      alias_type: "synonym",
    },
  ];
  await insertCompositeMissing(
    "data_object_aliases",
    aliasRows,
    ["data_object_id", "alias_name"],
    (r) => `900 ← '${r.alias_name}' (${r.alias_type})`,
  );

  console.log("\nDone.");
  console.log("UI spot-checks:");
  console.log("  https://tests.semantius.app/domain_map/data_objects");
  console.log("  https://tests.semantius.app/domain_map/domain_module_data_objects");
  console.log("  https://tests.semantius.app/domain_map/data_object_relationships");
  console.log("  https://tests.semantius.app/domain_map/data_object_lifecycle_states");
  console.log("  https://tests.semantius.app/domain_map/data_object_aliases");
}

main().catch((err) => {
  console.error("\nLoader failed:");
  console.error(err);
  process.exit(1);
});
