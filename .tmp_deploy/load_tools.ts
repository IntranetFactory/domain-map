#!/usr/bin/env bun
// Loads the P2.3 `tools` vocabulary into `domain_map.tools`.
//
// Idempotent by `tool_name` natural key. Surfaces a count summary and a sample row.
// Validation rules in the entity:
//   - data_object_only_when_query_or_mutate   (must be null when side_effect/compute)
//   - data_object_required_when_query_or_mutate (must be set when query/mutate)

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

// --- Build a name -> id map for the data_objects this load references --------
const referencedDataObjects = [
  "invoices",
  "customer_invoices",
  "customers",
  "contacts",
  "leads",
  "opportunities",
  "employees",
  "candidates",
  "job_requisitions",
  "incidents",
  "changes",
  "configuration_items",
  "knowledge_articles",
  "purchase_orders",
  "suppliers",
  "contracts",
  "saas_subscriptions",
  "customer_subscriptions",
  "journal_entries",
  "expense_reports",
  "projects",
  "work_items",
  "envelopes",
];

const dataObjectsFilter = referencedDataObjects.join(",");
const dataObjectRows = await get(
  `/data_objects?select=id,data_object_name&data_object_name=in.(${dataObjectsFilter})`,
);
const doId = new Map<string, number>();
for (const r of dataObjectRows) doId.set(String(r.data_object_name), Number(r.id));

const missingDOs = referencedDataObjects.filter(n => !doId.has(n));
if (missingDOs.length > 0) {
  throw new Error(`Missing referenced data_objects: ${missingDOs.join(", ")}`);
}
console.log(`Resolved ${doId.size} data_object FKs.`);

// --- Tool draft (42 rows) ----------------------------------------------------
type ToolDraft = {
  tool_name: string;
  operation_kind: "query" | "mutate" | "side_effect" | "compute";
  data_object?: string;
  description: string;
};

const drafts: ToolDraft[] = [
  // QUERY (23)
  { tool_name: "query_invoices", operation_kind: "query", data_object: "invoices", description: "Read AP-side supplier-issued invoices via Semantius CRUD." },
  { tool_name: "query_customer_invoices", operation_kind: "query", data_object: "customer_invoices", description: "Read AR-side seller-issued invoices via Semantius CRUD." },
  { tool_name: "query_customers", operation_kind: "query", data_object: "customers", description: "Read customer/account records via Semantius CRUD." },
  { tool_name: "query_contacts", operation_kind: "query", data_object: "contacts", description: "Read contact records via Semantius CRUD." },
  { tool_name: "query_leads", operation_kind: "query", data_object: "leads", description: "Read sales lead records via Semantius CRUD." },
  { tool_name: "query_opportunities", operation_kind: "query", data_object: "opportunities", description: "Read sales opportunity / pipeline records via Semantius CRUD." },
  { tool_name: "query_employees", operation_kind: "query", data_object: "employees", description: "Read employee records via Semantius CRUD." },
  { tool_name: "query_candidates", operation_kind: "query", data_object: "candidates", description: "Read ATS candidate records via Semantius CRUD." },
  { tool_name: "query_job_requisitions", operation_kind: "query", data_object: "job_requisitions", description: "Read open / closed job requisitions via Semantius CRUD." },
  { tool_name: "query_incidents", operation_kind: "query", data_object: "incidents", description: "Read ITSM incident tickets via Semantius CRUD." },
  { tool_name: "query_changes", operation_kind: "query", data_object: "changes", description: "Read ITSM change requests via Semantius CRUD." },
  { tool_name: "query_configuration_items", operation_kind: "query", data_object: "configuration_items", description: "Read CMDB configuration items via Semantius CRUD." },
  { tool_name: "query_knowledge_articles", operation_kind: "query", data_object: "knowledge_articles", description: "Read knowledge-base articles via Semantius CRUD." },
  { tool_name: "query_purchase_orders", operation_kind: "query", data_object: "purchase_orders", description: "Read procurement purchase orders via Semantius CRUD." },
  { tool_name: "query_suppliers", operation_kind: "query", data_object: "suppliers", description: "Read supplier master records via Semantius CRUD." },
  { tool_name: "query_contracts", operation_kind: "query", data_object: "contracts", description: "Read CLM contract records via Semantius CRUD." },
  { tool_name: "query_subscriptions", operation_kind: "query", data_object: "saas_subscriptions", description: "Read buyer-side SaaS subscription records (SMP) via Semantius CRUD." },
  { tool_name: "query_customer_subscriptions", operation_kind: "query", data_object: "customer_subscriptions", description: "Read seller-side customer subscription records (SUB-MGMT) via Semantius CRUD." },
  { tool_name: "query_journal_entries", operation_kind: "query", data_object: "journal_entries", description: "Read general-ledger journal entries via Semantius CRUD." },
  { tool_name: "query_expense_reports", operation_kind: "query", data_object: "expense_reports", description: "Read T&E expense reports via Semantius CRUD." },
  { tool_name: "query_projects", operation_kind: "query", data_object: "projects", description: "Read PPM / project records via Semantius CRUD." },
  { tool_name: "query_work_items", operation_kind: "query", data_object: "work_items", description: "Read work-management items (tickets, tasks, stories) via Semantius CRUD." },
  { tool_name: "query_envelopes", operation_kind: "query", data_object: "envelopes", description: "Read ESIGN envelope records via Semantius CRUD." },

  // MUTATE (7)
  { tool_name: "create_incident", operation_kind: "mutate", data_object: "incidents", description: "Open a new ITSM incident via Semantius CRUD." },
  { tool_name: "update_invoice_status", operation_kind: "mutate", data_object: "invoices", description: "Mutate AP invoice status (e.g. on-hold, approved, paid) via Semantius CRUD." },
  { tool_name: "update_opportunity_stage", operation_kind: "mutate", data_object: "opportunities", description: "Advance a sales opportunity through its pipeline stages via Semantius CRUD." },
  { tool_name: "create_candidate", operation_kind: "mutate", data_object: "candidates", description: "Create a new ATS candidate record via Semantius CRUD." },
  { tool_name: "update_employee_record", operation_kind: "mutate", data_object: "employees", description: "Mutate employee master fields (status, manager, location) via Semantius CRUD." },
  { tool_name: "create_purchase_order", operation_kind: "mutate", data_object: "purchase_orders", description: "Issue a new procurement purchase order via Semantius CRUD." },
  { tool_name: "create_change_request", operation_kind: "mutate", data_object: "changes", description: "Open a new ITSM change request via Semantius CRUD." },

  // SIDE_EFFECT (10)
  { tool_name: "send_email", operation_kind: "side_effect", description: "Send an email through an external mail provider (M365, Google Workspace, AWS SES). No business-data return." },
  { tool_name: "send_sms", operation_kind: "side_effect", description: "Send an SMS through an external messaging provider (Twilio, Vonage). No business-data return." },
  { tool_name: "make_phone_call", operation_kind: "side_effect", description: "Place an outbound phone call through a voice provider (Twilio Voice, Genesys). No business-data return." },
  { tool_name: "post_chat_message", operation_kind: "side_effect", description: "Post a message to a team-chat channel or DM (Slack, Microsoft Teams). No business-data return." },
  { tool_name: "create_calendar_event", operation_kind: "side_effect", description: "Create a calendar event in an external calendar (Microsoft 365, Google Calendar). No business-data return." },
  { tool_name: "sign_document", operation_kind: "side_effect", description: "Send a document for e-signature through an external provider (DocuSign, Adobe Sign). Envelope lifecycle returns via webhook." },
  { tool_name: "execute_payment", operation_kind: "side_effect", description: "Initiate a payment via an external processor (Stripe, Adyen). Settlement returns via webhook." },
  { tool_name: "store_blob", operation_kind: "side_effect", description: "Upload a binary object to external blob storage (AWS S3, Azure Blob, GCS)." },
  { tool_name: "run_shell_command", operation_kind: "side_effect", description: "Execute a shell command in a sandboxed runtime (local, GitHub Actions runner). No business-data return." },
  { tool_name: "invoke_webhook", operation_kind: "side_effect", description: "Generic HTTP POST to an external endpoint with an arbitrary payload." },

  // COMPUTE (12)
  { tool_name: "transcribe_audio", operation_kind: "compute", description: "Transcribe spoken audio to text (OpenAI Whisper, AssemblyAI, Deepgram)." },
  { tool_name: "generate_image", operation_kind: "compute", description: "Generate an image from a text prompt (OpenAI Images, Stable Diffusion)." },
  { tool_name: "generate_text", operation_kind: "compute", description: "LLM text completion / generation (OpenAI Platform, Anthropic API)." },
  { tool_name: "embed_text", operation_kind: "compute", description: "Compute vector embeddings for text (OpenAI Embeddings, Cohere)." },
  { tool_name: "extract_entities", operation_kind: "compute", description: "LLM-driven named-entity extraction from unstructured text." },
  { tool_name: "summarize_text", operation_kind: "compute", description: "LLM-driven abstractive summarization of long-form text." },
  { tool_name: "classify_text", operation_kind: "compute", description: "LLM-driven classification of text into a fixed label set." },
  { tool_name: "translate_text", operation_kind: "compute", description: "Translate text between languages (DeepL, Google Translate, LLM)." },
  { tool_name: "detect_sentiment", operation_kind: "compute", description: "Score sentiment / emotion of text (LLM or classical NLP)." },
  { tool_name: "search_web", operation_kind: "compute", description: "Query a web-search API for relevant pages (Brave Search, Google Search, Tavily)." },
  { tool_name: "web_scrape", operation_kind: "compute", description: "Render and extract content from a web page (Playwright, Browserless)." },
  { tool_name: "read_pdf", operation_kind: "compute", description: "Extract text and structure from a PDF document (LLM with vision, pdfplumber)." },
];

// --- Validate the draft against the entity validation rules locally ---------
for (const d of drafts) {
  const needsFK = d.operation_kind === "query" || d.operation_kind === "mutate";
  const hasFK = !!d.data_object;
  if (needsFK && !hasFK) throw new Error(`${d.tool_name}: ${d.operation_kind} requires data_object`);
  if (!needsFK && hasFK) throw new Error(`${d.tool_name}: ${d.operation_kind} forbids data_object`);
  if (hasFK && !doId.has(d.data_object!)) throw new Error(`${d.tool_name}: unknown data_object ${d.data_object}`);
}
console.log(`Validated ${drafts.length} drafts against validation rules.`);

// --- Build natural-key map and insert only the missing ones -----------------
const existing = await get(`/tools?select=id,tool_name&limit=10000`);
const existingNames = new Set(existing.map(r => String(r.tool_name)));
const toInsert = drafts.filter(d => !existingNames.has(d.tool_name)).map(d => ({
  tool_name: d.tool_name,
  description: d.description,
  operation_kind: d.operation_kind,
  data_object_id: d.data_object ? doId.get(d.data_object) : null,
}));

console.log(`tools: ${existing.length} existing, ${toInsert.length} to insert.`);
if (toInsert.length > 0) {
  await insert("/tools", toInsert);
  console.log(`  inserted.`);
}

// --- Verify -----------------------------------------------------------------
const after = await get(`/tools?select=tool_name,operation_kind,data_object_id&order=tool_name.asc`);
console.log(`\nFinal count: ${after.length} tools`);
const byKind = after.reduce((acc, r) => {
  const k = String(r.operation_kind);
  acc[k] = (acc[k] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
console.log(`By operation_kind:`, byKind);

const fkViolations = after.filter(r => {
  const needs = r.operation_kind === "query" || r.operation_kind === "mutate";
  return needs ? !r.data_object_id : !!r.data_object_id;
});
if (fkViolations.length > 0) {
  console.log(`\nFK violations:`, fkViolations);
} else {
  console.log(`FK invariants: OK (all query/mutate have data_object_id, all side_effect/compute don't).`);
}
