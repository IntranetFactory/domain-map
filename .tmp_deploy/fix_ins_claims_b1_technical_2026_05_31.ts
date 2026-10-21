/**
 * Residual B1 technical fixes for INS-CLAIMS (Insurance Claims Management).
 *
 * Applies the truly-technical residual B1 items the prior audit pass left
 * unimplemented. Per the residual-pass classification:
 *
 *  - B1-A1  PATCH domains.business_logic to strip the em-dash.
 *  - B1-B6  INSERT 9 intra-domain data_object_relationships (audit pre-specified).
 *  - B1-B7  INSERT 9 users-edge data_object_relationships (Rule #10, audit pre-specified).
 *  - B1-B8  INSERT 2 outbound cross-domain `notifies customer_cases` mirrors
 *           (audit pre-specified, target module CSM-CASE-MGMT exists).
 *
 * Deferred (not handled here):
 *  - B1-A2 / B1-A3 / B1-A4 / B1-M1 / B1-B10 / B1-B10b / B1-B11 / B1-B12 / B1-F1 / B1-F7
 *  - APQC H1 handoff_processes (gated on Bucket 2 #5 strategy decision)
 *  - B1-B4 pattern flag flips (defer rule: "pattern flag flips")
 *
 * Idempotent: every relationship POST is guarded by a read on the exact
 *   (data_object_id, related_data_object_id, relationship_verb) tuple.
 */

const BASE_URL = "semantius";

async function semantiusJSON(method: string, path: string, body?: unknown): Promise<any> {
  const payload: any = { method, path };
  if (body !== undefined) payload.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(payload));
  await proc.stdin.end();
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`semantius ${method} ${path} exit ${code}\nstdout: ${stdout}\nstderr: ${stderr}`);
  }
  const text = stdout.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------- B1-A1: em-dash PATCH on domains.business_logic ----------

const NEW_BUSINESS_LOGIC =
  "Adjudication rules engine, fraud detection, and reserve calculations: the irreducible insurance kernel; FNOL and case workflow are declarative.";

async function fixA1(): Promise<void> {
  const current = await semantiusJSON(
    "GET",
    "/domains?id=eq.44&select=id,business_logic",
  );
  if (!Array.isArray(current) || current.length !== 1) {
    throw new Error("B1-A1: could not read domains row id=44");
  }
  const live: string = current[0].business_logic ?? "";
  if (!live.includes("—")) {
    console.log("B1-A1: business_logic already em-dash free, skipping PATCH");
    return;
  }
  if (NEW_BUSINESS_LOGIC.includes("—")) {
    throw new Error("B1-A1: replacement string still contains em-dash, abort");
  }
  await semantiusJSON("PATCH", "/domains?id=eq.44", { business_logic: NEW_BUSINESS_LOGIC });
  console.log("B1-A1: PATCH /domains?id=eq.44 business_logic em-dash stripped");
}

// ---------- B1-B6, B1-B7, B1-B8: relationships ----------

type RelDraft = {
  source: number;
  target: number;
  verb: string;
  inverse: string;
  type: "one_to_one" | "one_to_many" | "many_to_many";
  kind: "composition" | "reference" | "association" | "inheritance";
  is_required: boolean;
  owner_side: "source" | "target";
  label: string;
};

// data_object ids:
//   623 insurance_claims
//   624 insurance_policies
//   625 policy_coverages
//   626 loss_incidents
//   627 claim_adjuster_assignments
//   628 claim_settlements
//   629 claim_payments
//   630 salvage_recovery_records
//   631 subrogation_cases
//   632 siu_cases
//   748 users (platform_builtin)
//   103 customer_cases (CSM, mastered by CSM-CASE-MGMT id 112)

// B1-B6: 9 intra-domain edges. Pre-specified by audit Pass 1.B6.
const intraEdges: RelDraft[] = [
  {
    source: 624, target: 625, verb: "covered_by", inverse: "covers",
    type: "one_to_many", kind: "composition", is_required: true, owner_side: "source",
    label: "covered_by",
  },
  {
    source: 624, target: 626, verb: "subject_of", inverse: "occurs_on",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "target",
    label: "subject_of",
  },
  {
    source: 626, target: 623, verb: "reported_as", inverse: "reports",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "target",
    label: "reported_as",
  },
  {
    source: 623, target: 627, verb: "assigned_to", inverse: "assigns",
    type: "one_to_many", kind: "composition", is_required: false, owner_side: "source",
    label: "assigned_to",
  },
  {
    source: 623, target: 628, verb: "resolved_by", inverse: "resolves",
    type: "one_to_many", kind: "composition", is_required: false, owner_side: "source",
    label: "resolved_by",
  },
  {
    source: 628, target: 629, verb: "disbursed_via", inverse: "disburses",
    type: "one_to_many", kind: "composition", is_required: false, owner_side: "source",
    label: "disbursed_via",
  },
  {
    source: 623, target: 632, verb: "investigated_by", inverse: "investigates",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "investigated_by",
  },
  {
    source: 623, target: 631, verb: "pursues", inverse: "pursued_by",
    type: "one_to_many", kind: "composition", is_required: false, owner_side: "source",
    label: "pursues",
  },
  {
    source: 623, target: 630, verb: "recovers_via", inverse: "recovers_for",
    type: "one_to_many", kind: "composition", is_required: false, owner_side: "source",
    label: "recovers_via",
  },
];

// B1-B7: 9 user-edges (Rule #10). Audit Pass 1.B7 names the actor for each master.
// For insurance_claims (claim_owner / submitter) audit names both; pick the first.
const userEdges: RelDraft[] = [
  {
    source: 748, target: 623, verb: "owns_claims", inverse: "owned_by_user",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "owns_claims",
  },
  {
    source: 748, target: 624, verb: "services_policies", inverse: "serviced_by_user",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "services_policies",
  },
  {
    source: 748, target: 626, verb: "reports_loss_incidents", inverse: "reported_by_user",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "reports_loss_incidents",
  },
  {
    source: 748, target: 627, verb: "handles_adjuster_assignments", inverse: "assigned_to_user",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "handles_adjuster_assignments",
  },
  {
    source: 748, target: 628, verb: "approves_settlements", inverse: "approved_by_user",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "approves_settlements",
  },
  {
    source: 748, target: 629, verb: "issues_claim_payments", inverse: "issued_by_user",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "issues_claim_payments",
  },
  {
    source: 748, target: 630, verb: "manages_salvage_recoveries", inverse: "managed_by_user",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "manages_salvage_recoveries",
  },
  {
    source: 748, target: 631, verb: "manages_subrogation_cases", inverse: "managed_by_user",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "manages_subrogation_cases",
  },
  {
    source: 748, target: 632, verb: "investigates_siu_cases", inverse: "investigated_by_user",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "investigates_siu_cases",
  },
];

// B1-B8: 2 outbound cross-domain `notifies customer_cases` mirrors (audit pre-specified).
const crossEdges: RelDraft[] = [
  {
    source: 623, target: 103, verb: "notifies", inverse: "notified_by",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "notifies",
  },
  {
    source: 624, target: 103, verb: "notifies", inverse: "notified_by",
    type: "one_to_many", kind: "reference", is_required: false, owner_side: "source",
    label: "notifies",
  },
];

async function relationshipExists(d: RelDraft): Promise<boolean> {
  const path =
    `/data_object_relationships?data_object_id=eq.${d.source}` +
    `&related_data_object_id=eq.${d.target}` +
    `&relationship_verb=eq.${encodeURIComponent(d.verb)}` +
    `&select=id&limit=1`;
  const r = await semantiusJSON("GET", path);
  return Array.isArray(r) && r.length > 0;
}

async function insertRelationships(label: string, drafts: RelDraft[]): Promise<void> {
  const toInsert: any[] = [];
  for (const d of drafts) {
    if (await relationshipExists(d)) {
      console.log(`  skip [${label}] existing ${d.source} -${d.verb}-> ${d.target}`);
      continue;
    }
    // Sanity: forbid em-dash leaking via any string field
    const strings = [d.verb, d.inverse, d.label];
    for (const s of strings) {
      if (s.includes("—")) throw new Error(`em-dash in field for ${d.source}->${d.target}`);
    }
    toInsert.push({
      data_object_id: d.source,
      related_data_object_id: d.target,
      relationship_verb: d.verb,
      inverse_verb: d.inverse,
      relationship_type: d.type,
      relationship_kind: d.kind,
      is_required: d.is_required,
      owner_side: d.owner_side,
      data_object_relationship_label: d.label,
      // record_status omitted (Rule #1 -> defaults to 'new')
      // notes omitted (Rule #15 -> defaults to '')
    });
  }
  if (toInsert.length === 0) {
    console.log(`[${label}] nothing to insert`);
    return;
  }
  const inserted = await semantiusJSON(
    "POST",
    "/data_object_relationships",
    toInsert,
  );
  console.log(`[${label}] inserted ${Array.isArray(inserted) ? inserted.length : "?"} rows`);
}

// ---------- driver ----------

console.log("== INS-CLAIMS residual B1 technical fixes ==");

await fixA1();
console.log("-- B1-B6 intra-domain edges --");
await insertRelationships("B1-B6", intraEdges);
console.log("-- B1-B7 users edges --");
await insertRelationships("B1-B7", userEdges);
console.log("-- B1-B8 cross-domain notifies edges --");
await insertRelationships("B1-B8", crossEdges);

console.log("done.");
