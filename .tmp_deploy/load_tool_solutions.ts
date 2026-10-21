#!/usr/bin/env bun
// P2.4 — tool_solutions matrix + solution_kind promotions + new vendors/solutions.
//
// Three sections, idempotent throughout:
//   1. Ensure vendors (insert missing)
//   2. Ensure solutions (insert missing; explicit solution_kind set)
//   3. PATCH existing solutions' solution_kind (promotions)
//   4. Insert tool_solutions junction rows
//
// Run modes:
//   bun run load_tool_solutions.ts            -> DRY RUN (prints plan only)
//   bun run load_tool_solutions.ts --apply    -> Live write
//
// All inserts use record_status='new' (per rule #1).

import { $ } from "bun";

$.throws(false);

const APPLY = process.argv.includes("--apply");

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
  if (!APPLY) {
    console.log(`  [DRY RUN] would POST ${rows.length} rows to ${path}`);
    return [];
  }
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
  if (!APPLY) {
    console.log(`  [DRY RUN] would PATCH ${path} with ${JSON.stringify(body)}`);
    return [];
  }
  return call({ method: "PATCH", path, body });
}

// ============================================================================
// SECTION 1 — Vendors to ensure
// ============================================================================
const vendorsToEnsure = [
  { vendor_name: "OpenAI", description: "AI research and deployment company; provider of the OpenAI Platform (GPT, Whisper, DALL-E, Embeddings).", vendor_url: "https://openai.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Anthropic PBC", description: "AI safety company; provider of Claude family models via the Anthropic API.", vendor_url: "https://www.anthropic.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Adyen NV", description: "Global payments platform.", vendor_url: "https://www.adyen.com", headquarters_country: "Netherlands", notes: "" },
  { vendor_name: "Vonage", description: "Cloud communications APIs (voice, SMS, messaging) — acquired by Ericsson 2022.", vendor_url: "https://www.vonage.com", headquarters_country: "USA", notes: "Acquired by Ericsson 2022; brand retained" },
  { vendor_name: "Cohere", description: "Enterprise foundation-model and embeddings provider.", vendor_url: "https://cohere.com", headquarters_country: "Canada", notes: "" },
  { vendor_name: "AssemblyAI", description: "Speech-to-text and audio-intelligence APIs.", vendor_url: "https://www.assemblyai.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Deepgram", description: "Speech-to-text and voice-AI APIs.", vendor_url: "https://deepgram.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "Brave Software", description: "Privacy-focused browser and search API provider.", vendor_url: "https://brave.com", headquarters_country: "USA", notes: "" },
  { vendor_name: "DeepL", description: "Neural-machine-translation provider (DeepL Translator, DeepL API).", vendor_url: "https://www.deepl.com", headquarters_country: "Germany", notes: "" },
  { vendor_name: "Tavily", description: "AI-optimized web-search API for LLM/agent grounding.", vendor_url: "https://tavily.com", headquarters_country: "USA", notes: "" },
];

// ============================================================================
// SECTION 2 — Solutions to ensure (new) — with explicit solution_kind
// ============================================================================
type SolutionDraft = {
  solution_name: string;
  vendor_name: string;
  description: string;
  solution_url: string;
  solution_type: "saas" | "on_prem" | "hybrid" | "open_source" | "internal_build" | "manual_process";
  solution_kind: "external_connector" | "action" | "compute_service" | "standard_solution";
  is_active_in_market: boolean;
  notes: string;
};

const solutionsToEnsure: SolutionDraft[] = [
  // ---- action ----
  { solution_name: "Microsoft 365", vendor_name: "Microsoft", description: "Productivity suite — Exchange (email), Outlook (calendar), OneDrive (blob), Teams (chat). Tool-delivery surface for send_email, create_calendar_event, store_blob.", solution_url: "https://www.microsoft.com/microsoft-365", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "Suite-level row, distinct from individual product rows like Microsoft Teams" },
  { solution_name: "Google Workspace", vendor_name: "Google", description: "Productivity suite — Gmail, Google Calendar, Google Drive, Google Chat. Tool-delivery surface for send_email, create_calendar_event, store_blob.", solution_url: "https://workspace.google.com", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "Suite-level row, distinct from Google Chat individual product row" },
  { solution_name: "AWS SES", vendor_name: "Amazon Web Services", description: "Amazon Simple Email Service — transactional and marketing email API.", solution_url: "https://aws.amazon.com/ses/", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "" },
  { solution_name: "SendGrid", vendor_name: "Twilio", description: "Transactional and marketing email API; Twilio subsidiary since 2019.", solution_url: "https://sendgrid.com", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "Twilio-owned since 2019" },
  { solution_name: "Twilio Programmable Voice", vendor_name: "Twilio", description: "Programmable voice API — outbound dialing, inbound, IVR.", solution_url: "https://www.twilio.com/voice", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "" },
  { solution_name: "Twilio Programmable Messaging", vendor_name: "Twilio", description: "Programmable SMS / MMS / WhatsApp messaging API.", solution_url: "https://www.twilio.com/messaging", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "" },
  { solution_name: "Vonage Communications APIs", vendor_name: "Vonage", description: "Voice, SMS, and messaging APIs.", solution_url: "https://www.vonage.com/communications-apis/", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "" },
  { solution_name: "DocuSign eSignature", vendor_name: "DocuSign", description: "Core electronic-signature product — distinct from DocuSign CLM. Tool-delivery surface for sign_document.", solution_url: "https://www.docusign.com/products/electronic-signature", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "Distinct from DocuSign CLM (id 125) which is the contract-lifecycle market entry" },
  { solution_name: "Adobe Acrobat Sign", vendor_name: "Adobe", description: "Electronic-signature service integrated with Adobe Acrobat.", solution_url: "https://www.adobe.com/sign.html", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "" },
  { solution_name: "Stripe Payments", vendor_name: "Stripe", description: "Online payments platform — card, ACH, bank, wallets.", solution_url: "https://stripe.com/payments", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "" },
  { solution_name: "Adyen Payments Platform", vendor_name: "Adyen NV", description: "Unified payments platform for online, in-store, and in-app transactions.", solution_url: "https://www.adyen.com/platform", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "" },
  { solution_name: "AWS S3", vendor_name: "Amazon Web Services", description: "Object storage service — durable, highly available blob store.", solution_url: "https://aws.amazon.com/s3/", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "" },
  { solution_name: "Azure Blob Storage", vendor_name: "Microsoft", description: "Object storage service for unstructured data on Azure.", solution_url: "https://azure.microsoft.com/products/storage/blobs", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "" },
  { solution_name: "Google Cloud Storage", vendor_name: "Google", description: "Object storage service for unstructured data on Google Cloud.", solution_url: "https://cloud.google.com/storage", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "" },
  { solution_name: "GitHub Actions", vendor_name: "Microsoft", description: "Hosted CI/CD and shell-execution runner.", solution_url: "https://github.com/features/actions", solution_type: "saas", solution_kind: "action", is_active_in_market: true, notes: "GitHub is a Microsoft subsidiary since 2018" },

  // ---- compute_service ----
  { solution_name: "OpenAI Platform", vendor_name: "OpenAI", description: "API access to GPT, Whisper, DALL-E, Embeddings, Moderation, Vision.", solution_url: "https://platform.openai.com", solution_type: "saas", solution_kind: "compute_service", is_active_in_market: true, notes: "" },
  { solution_name: "Anthropic API", vendor_name: "Anthropic PBC", description: "API access to Claude family models for text generation, reasoning, and tool use.", solution_url: "https://www.anthropic.com/api", solution_type: "saas", solution_kind: "compute_service", is_active_in_market: true, notes: "" },
  { solution_name: "AWS Bedrock", vendor_name: "Amazon Web Services", description: "Managed foundation-model API — Anthropic, Meta, Mistral, Cohere, Amazon Titan.", solution_url: "https://aws.amazon.com/bedrock/", solution_type: "saas", solution_kind: "compute_service", is_active_in_market: true, notes: "Multi-provider FM aggregator" },
  { solution_name: "Cohere Platform", vendor_name: "Cohere", description: "Enterprise LLM and embeddings API (Command, Embed, Rerank).", solution_url: "https://cohere.com/products", solution_type: "saas", solution_kind: "compute_service", is_active_in_market: true, notes: "" },
  { solution_name: "AssemblyAI", vendor_name: "AssemblyAI", description: "Speech-to-text and audio-intelligence API.", solution_url: "https://www.assemblyai.com", solution_type: "saas", solution_kind: "compute_service", is_active_in_market: true, notes: "" },
  { solution_name: "Deepgram", vendor_name: "Deepgram", description: "Speech-to-text and voice-AI API.", solution_url: "https://deepgram.com", solution_type: "saas", solution_kind: "compute_service", is_active_in_market: true, notes: "" },
  { solution_name: "DeepL API", vendor_name: "DeepL", description: "Neural-machine-translation API across 30+ languages.", solution_url: "https://www.deepl.com/pro-api", solution_type: "saas", solution_kind: "compute_service", is_active_in_market: true, notes: "" },
  { solution_name: "Brave Search API", vendor_name: "Brave Software", description: "Independent web-search index, privacy-focused, LLM-grounding-ready.", solution_url: "https://brave.com/search/api/", solution_type: "saas", solution_kind: "compute_service", is_active_in_market: true, notes: "" },
  { solution_name: "Tavily Search API", vendor_name: "Tavily", description: "Web-search API optimized for LLM agents — returns context-summarized passages.", solution_url: "https://tavily.com", solution_type: "saas", solution_kind: "compute_service", is_active_in_market: true, notes: "" },
  { solution_name: "Playwright", vendor_name: "Microsoft", description: "Open-source browser-automation framework for headless web scraping and end-to-end testing.", solution_url: "https://playwright.dev", solution_type: "open_source", solution_kind: "compute_service", is_active_in_market: true, notes: "Microsoft-maintained open-source project" },
];

// ============================================================================
// SECTION 3 — Existing solutions to PROMOTE solution_kind
// ============================================================================
const promotions: { solution_id: number; solution_name: string; new_kind: "external_connector" | "action" | "compute_service" }[] = [
  // external_connector — systems of record for query/mutate tools
  { solution_id: 2,   solution_name: "ServiceNow IT Service Management", new_kind: "external_connector" },
  { solution_id: 4,   solution_name: "ServiceNow CMDB",                  new_kind: "external_connector" },
  { solution_id: 41,  solution_name: "Jira Service Management",          new_kind: "external_connector" },
  { solution_id: 295, solution_name: "Salesforce Sales Cloud",           new_kind: "external_connector" },
  { solution_id: 316, solution_name: "HubSpot Sales Hub",                new_kind: "external_connector" },
  { solution_id: 327, solution_name: "HubSpot Marketing Hub",            new_kind: "external_connector" },
  { solution_id: 271, solution_name: "SAP S/4HANA",                      new_kind: "external_connector" },
  { solution_id: 273, solution_name: "Oracle NetSuite",                  new_kind: "external_connector" },
  { solution_id: 188, solution_name: "Workday HCM",                      new_kind: "external_connector" },
  { solution_id: 210, solution_name: "SAP SuccessFactors",               new_kind: "external_connector" },
  { solution_id: 215, solution_name: "BambooHR",                         new_kind: "external_connector" },
  { solution_id: 213, solution_name: "ADP Workforce Now",                new_kind: "external_connector" },
  { solution_id: 233, solution_name: "SAP SuccessFactors Recruiting",    new_kind: "external_connector" },
  { solution_id: 226, solution_name: "Greenhouse Recruiting",            new_kind: "external_connector" },
  { solution_id: 227, solution_name: "Lever",                            new_kind: "external_connector" },
  { solution_id: 127, solution_name: "SAP Ariba",                        new_kind: "external_connector" },
  { solution_id: 126, solution_name: "Coupa Business Spend Management",  new_kind: "external_connector" },
  { solution_id: 286, solution_name: "SAP Concur",                       new_kind: "external_connector" },
  { solution_id: 125, solution_name: "DocuSign CLM",                     new_kind: "external_connector" },
  { solution_id: 123, solution_name: "Ironclad",                         new_kind: "external_connector" },
  // action — chat surfaces
  { solution_id: 360, solution_name: "Microsoft Teams",                  new_kind: "action" },
  { solution_id: 304, solution_name: "Slack",                            new_kind: "action" },
  { solution_id: 361, solution_name: "Google Chat",                      new_kind: "action" },
];

// ============================================================================
// SECTION 4 — tool_solutions matrix
// (solution refs are resolved by solution_name after sections 2+3 complete)
// ============================================================================
type ToolSolution = {
  tool_name: string;
  solution_name: string;
  delivery_strength: "native" | "partial" | "via_extension" | "not_supported";
  delivery_method: "mcp_server" | "rest_api" | "sdk" | "cli";
  endpoint_url: string;
  notes: string;
};

const toolSolutions: ToolSolution[] = [
  // ---- query/mutate tools → external_connector solutions ----
  // query_invoices (AP-side)
  { tool_name: "query_invoices", solution_name: "SAP S/4HANA",                     delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "SAP AP invoice register" },
  { tool_name: "query_invoices", solution_name: "Oracle NetSuite",                 delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "NetSuite vendor-bill records" },
  { tool_name: "query_invoices", solution_name: "SAP Ariba",                       delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "Ariba invoice automation" },
  { tool_name: "query_invoices", solution_name: "Coupa Business Spend Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "Coupa AP invoice store" },

  { tool_name: "update_invoice_status", solution_name: "SAP S/4HANA",                     delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "update_invoice_status", solution_name: "Oracle NetSuite",                 delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "update_invoice_status", solution_name: "Coupa Business Spend Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_customer_invoices (AR-side)
  { tool_name: "query_customer_invoices", solution_name: "SAP S/4HANA",     delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "SAP AR sub-ledger" },
  { tool_name: "query_customer_invoices", solution_name: "Oracle NetSuite", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "NetSuite customer invoices" },

  // query_customers / query_contacts / query_leads / query_opportunities → CRM
  { tool_name: "query_customers", solution_name: "Salesforce Sales Cloud", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "Salesforce Account object" },
  { tool_name: "query_customers", solution_name: "HubSpot Sales Hub",      delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "HubSpot Company object" },
  { tool_name: "query_customers", solution_name: "Oracle NetSuite",        delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "NetSuite customer master" },

  { tool_name: "query_contacts", solution_name: "Salesforce Sales Cloud", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_contacts", solution_name: "HubSpot Sales Hub",      delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_contacts", solution_name: "HubSpot Marketing Hub",  delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "query_leads", solution_name: "Salesforce Sales Cloud", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_leads", solution_name: "HubSpot Sales Hub",      delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_leads", solution_name: "HubSpot Marketing Hub",  delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "query_opportunities", solution_name: "Salesforce Sales Cloud", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_opportunities", solution_name: "HubSpot Sales Hub",      delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "update_opportunity_stage", solution_name: "Salesforce Sales Cloud", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "update_opportunity_stage", solution_name: "HubSpot Sales Hub",      delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_employees / update_employee_record → HCM
  { tool_name: "query_employees", solution_name: "Workday HCM",         delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_employees", solution_name: "SAP SuccessFactors",  delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_employees", solution_name: "BambooHR",            delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_employees", solution_name: "ADP Workforce Now",   delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "update_employee_record", solution_name: "Workday HCM",        delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "update_employee_record", solution_name: "SAP SuccessFactors", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "update_employee_record", solution_name: "BambooHR",           delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_candidates / query_job_requisitions / create_candidate → ATS
  { tool_name: "query_candidates", solution_name: "Greenhouse Recruiting",          delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_candidates", solution_name: "Lever",                          delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_candidates", solution_name: "SAP SuccessFactors Recruiting",  delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "query_job_requisitions", solution_name: "Greenhouse Recruiting",         delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_job_requisitions", solution_name: "Lever",                         delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_job_requisitions", solution_name: "SAP SuccessFactors Recruiting", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "create_candidate", solution_name: "Greenhouse Recruiting",         delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "create_candidate", solution_name: "Lever",                         delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "create_candidate", solution_name: "SAP SuccessFactors Recruiting", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_incidents / query_changes / query_knowledge_articles / create_incident / create_change_request → ITSM
  { tool_name: "query_incidents", solution_name: "ServiceNow IT Service Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_incidents", solution_name: "Jira Service Management",          delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "query_changes", solution_name: "ServiceNow IT Service Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_changes", solution_name: "Jira Service Management",          delivery_strength: "partial", delivery_method: "rest_api", endpoint_url: "", notes: "Jira's change support is lighter than ServiceNow's" },

  { tool_name: "query_knowledge_articles", solution_name: "ServiceNow IT Service Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "create_incident", solution_name: "ServiceNow IT Service Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "create_incident", solution_name: "Jira Service Management",          delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "create_change_request", solution_name: "ServiceNow IT Service Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_configuration_items → CMDB
  { tool_name: "query_configuration_items", solution_name: "ServiceNow CMDB", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_purchase_orders / create_purchase_order / query_suppliers → procurement
  { tool_name: "query_purchase_orders", solution_name: "SAP Ariba",                       delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_purchase_orders", solution_name: "Coupa Business Spend Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_purchase_orders", solution_name: "SAP S/4HANA",                     delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_purchase_orders", solution_name: "Oracle NetSuite",                 delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "create_purchase_order", solution_name: "SAP Ariba",                       delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "create_purchase_order", solution_name: "Coupa Business Spend Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "create_purchase_order", solution_name: "SAP S/4HANA",                     delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "query_suppliers", solution_name: "SAP Ariba",                       delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_suppliers", solution_name: "Coupa Business Spend Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_suppliers", solution_name: "SAP S/4HANA",                     delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_suppliers", solution_name: "Oracle NetSuite",                 delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_contracts / query_envelopes → CLM / eSign
  { tool_name: "query_contracts", solution_name: "DocuSign CLM", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_contracts", solution_name: "Ironclad",     delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "query_envelopes", solution_name: "DocuSign eSignature", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_envelopes", solution_name: "Adobe Acrobat Sign",  delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_subscriptions (SMP, buyer-side SaaS) — no canonical CRM-style connector loaded yet; skip until SMP-vendor solutions are added
  // query_customer_subscriptions (SUB-MGMT, seller-side) — link to SAP Subscription Billing
  { tool_name: "query_customer_subscriptions", solution_name: "SAP Subscription Billing", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_journal_entries → ERP-FIN
  { tool_name: "query_journal_entries", solution_name: "SAP S/4HANA",     delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "query_journal_entries", solution_name: "Oracle NetSuite", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_expense_reports → Concur
  { tool_name: "query_expense_reports", solution_name: "SAP Concur", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  // query_projects / query_work_items → leave for follow-up (PSA/PPM connectors are scattered)
  { tool_name: "query_work_items", solution_name: "Jira Service Management", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "Jira issues" },

  // ---- side_effect tools → action solutions ----
  { tool_name: "send_email", solution_name: "Microsoft 365",   delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://graph.microsoft.com/v1.0/", notes: "Microsoft Graph sendMail" },
  { tool_name: "send_email", solution_name: "Google Workspace", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://gmail.googleapis.com/", notes: "Gmail API users.messages.send" },
  { tool_name: "send_email", solution_name: "AWS SES",          delivery_strength: "native", delivery_method: "sdk",      endpoint_url: "", notes: "" },
  { tool_name: "send_email", solution_name: "SendGrid",         delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.sendgrid.com/v3/", notes: "" },

  { tool_name: "send_sms", solution_name: "Twilio Programmable Messaging", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.twilio.com/2010-04-01/", notes: "" },
  { tool_name: "send_sms", solution_name: "Vonage Communications APIs",    delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://rest.nexmo.com/", notes: "" },
  { tool_name: "send_sms", solution_name: "AWS SES",                       delivery_strength: "not_supported", delivery_method: "sdk", endpoint_url: "", notes: "SES is email-only; recorded for completeness" },

  { tool_name: "make_phone_call", solution_name: "Twilio Programmable Voice", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.twilio.com/2010-04-01/", notes: "" },
  { tool_name: "make_phone_call", solution_name: "Vonage Communications APIs", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "post_chat_message", solution_name: "Slack",           delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://slack.com/api/", notes: "chat.postMessage" },
  { tool_name: "post_chat_message", solution_name: "Microsoft Teams", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://graph.microsoft.com/v1.0/", notes: "Graph teams.channels.messages" },
  { tool_name: "post_chat_message", solution_name: "Google Chat",     delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://chat.googleapis.com/", notes: "" },

  { tool_name: "create_calendar_event", solution_name: "Microsoft 365",   delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://graph.microsoft.com/v1.0/", notes: "Outlook Calendar via Graph" },
  { tool_name: "create_calendar_event", solution_name: "Google Workspace", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://www.googleapis.com/calendar/v3/", notes: "Calendar v3 events.insert" },

  { tool_name: "sign_document", solution_name: "DocuSign eSignature", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://www.docusign.net/restapi/", notes: "" },
  { tool_name: "sign_document", solution_name: "Adobe Acrobat Sign",  delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.adobesign.com/", notes: "" },

  { tool_name: "execute_payment", solution_name: "Stripe Payments",          delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.stripe.com/v1/", notes: "" },
  { tool_name: "execute_payment", solution_name: "Adyen Payments Platform",  delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://checkout-test.adyen.com/", notes: "" },

  { tool_name: "store_blob", solution_name: "AWS S3",                delivery_strength: "native", delivery_method: "sdk", endpoint_url: "", notes: "" },
  { tool_name: "store_blob", solution_name: "Azure Blob Storage",    delivery_strength: "native", delivery_method: "sdk", endpoint_url: "", notes: "" },
  { tool_name: "store_blob", solution_name: "Google Cloud Storage",  delivery_strength: "native", delivery_method: "sdk", endpoint_url: "", notes: "" },

  { tool_name: "run_shell_command", solution_name: "GitHub Actions", delivery_strength: "native", delivery_method: "cli", endpoint_url: "", notes: "Hosted runner shell step" },

  { tool_name: "invoke_webhook", solution_name: "GitHub Actions", delivery_strength: "partial", delivery_method: "cli", endpoint_url: "", notes: "Generic HTTP via curl in a workflow step" },

  // ---- compute tools → compute_service solutions ----
  { tool_name: "transcribe_audio", solution_name: "OpenAI Platform", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.openai.com/v1/audio/transcriptions", notes: "Whisper" },
  { tool_name: "transcribe_audio", solution_name: "AssemblyAI",      delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.assemblyai.com/v2/", notes: "" },
  { tool_name: "transcribe_audio", solution_name: "Deepgram",        delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.deepgram.com/v1/listen", notes: "" },

  { tool_name: "generate_image", solution_name: "OpenAI Platform", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.openai.com/v1/images/generations", notes: "DALL-E / GPT Image" },

  { tool_name: "generate_text", solution_name: "OpenAI Platform",   delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.openai.com/v1/chat/completions", notes: "GPT" },
  { tool_name: "generate_text", solution_name: "Anthropic API",     delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.anthropic.com/v1/messages", notes: "Claude" },
  { tool_name: "generate_text", solution_name: "AWS Bedrock",       delivery_strength: "native", delivery_method: "sdk",      endpoint_url: "", notes: "Multi-provider FM" },
  { tool_name: "generate_text", solution_name: "Cohere Platform",   delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.cohere.com/v1/chat", notes: "Command R" },

  { tool_name: "embed_text", solution_name: "OpenAI Platform", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.openai.com/v1/embeddings", notes: "" },
  { tool_name: "embed_text", solution_name: "Cohere Platform", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.cohere.com/v1/embed", notes: "" },
  { tool_name: "embed_text", solution_name: "AWS Bedrock",     delivery_strength: "native", delivery_method: "sdk",      endpoint_url: "", notes: "Titan Embeddings, Cohere Embed" },

  { tool_name: "extract_entities",  solution_name: "OpenAI Platform", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "Structured-output / function-calling" },
  { tool_name: "extract_entities",  solution_name: "Anthropic API",   delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "Tool use / structured output" },

  { tool_name: "summarize_text",  solution_name: "OpenAI Platform", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "summarize_text",  solution_name: "Anthropic API",   delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "classify_text",  solution_name: "OpenAI Platform", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "classify_text",  solution_name: "Anthropic API",   delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "classify_text",  solution_name: "Cohere Platform", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.cohere.com/v1/classify", notes: "Cohere Classify endpoint" },

  { tool_name: "translate_text", solution_name: "DeepL API",        delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.deepl.com/v2/translate", notes: "" },
  { tool_name: "translate_text", solution_name: "OpenAI Platform",  delivery_strength: "partial", delivery_method: "rest_api", endpoint_url: "", notes: "Generic LLM translation" },

  { tool_name: "detect_sentiment", solution_name: "OpenAI Platform", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },
  { tool_name: "detect_sentiment", solution_name: "Anthropic API",   delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "" },

  { tool_name: "search_web", solution_name: "Brave Search API",  delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.search.brave.com/res/v1/", notes: "" },
  { tool_name: "search_web", solution_name: "Tavily Search API", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "https://api.tavily.com/", notes: "" },

  { tool_name: "web_scrape", solution_name: "Playwright", delivery_strength: "native", delivery_method: "sdk", endpoint_url: "", notes: "Headless browser automation" },

  { tool_name: "read_pdf", solution_name: "OpenAI Platform", delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "Vision-enabled GPT" },
  { tool_name: "read_pdf", solution_name: "Anthropic API",   delivery_strength: "native", delivery_method: "rest_api", endpoint_url: "", notes: "Vision-enabled Claude" },
];

// ============================================================================
// EXECUTION
// ============================================================================
console.log(`Mode: ${APPLY ? "APPLY (live writes)" : "DRY RUN (no writes)"}\n`);

// --- 1. vendors ---
const existingVendors = await get(`/vendors?select=id,vendor_name&limit=10000`);
const vendorIdByName = new Map<string, number>();
for (const v of existingVendors) vendorIdByName.set(String(v.vendor_name), Number(v.id));
const missingVendors = vendorsToEnsure.filter(v => !vendorIdByName.has(v.vendor_name));
console.log(`Section 1 — Vendors: ${vendorsToEnsure.length} required, ${vendorsToEnsure.length - missingVendors.length} present, ${missingVendors.length} to insert.`);
if (missingVendors.length > 0) {
  console.log(`  Inserting: ${missingVendors.map(v => v.vendor_name).join(", ")}`);
  const inserted = await insert("/vendors", missingVendors);
  for (const v of inserted) vendorIdByName.set(String(v.vendor_name), Number(v.id));
}
// Re-read after insert (DRY RUN already has all existing; for live the inserts gave us ids)
if (APPLY) {
  const after = await get(`/vendors?select=id,vendor_name&limit=10000`);
  vendorIdByName.clear();
  for (const v of after) vendorIdByName.set(String(v.vendor_name), Number(v.id));
}

// --- 2. solutions (new) ---
const existingSolutions = await get(`/solutions?select=id,solution_name,solution_kind&limit=10000`);
const solIdByName = new Map<string, number>();
const solKindByName = new Map<string, string>();
for (const s of existingSolutions) {
  solIdByName.set(String(s.solution_name), Number(s.id));
  solKindByName.set(String(s.solution_name), String(s.solution_kind));
}
const missingSolutions = solutionsToEnsure.filter(s => !solIdByName.has(s.solution_name));
console.log(`\nSection 2 — Solutions (new): ${solutionsToEnsure.length} required, ${solutionsToEnsure.length - missingSolutions.length} present, ${missingSolutions.length} to insert.`);
if (missingSolutions.length > 0) {
  // Validate vendor refs (DRY RUN: vendors we're about to insert won't have ids yet — skip those)
  const payload: Row[] = [];
  for (const s of missingSolutions) {
    const vid = vendorIdByName.get(s.vendor_name);
    if (!APPLY && vid === undefined) {
      console.log(`  [DRY RUN] ${s.solution_name} -> vendor ${s.vendor_name} (will resolve on apply)`);
      continue;
    }
    if (APPLY && vid === undefined) {
      throw new Error(`Vendor not found after upsert: ${s.vendor_name}`);
    }
    payload.push({
      solution_name: s.solution_name,
      vendor_id: vid,
      description: s.description,
      solution_url: s.solution_url,
      solution_type: s.solution_type,
      is_active_in_market: s.is_active_in_market,
      solution_kind: s.solution_kind,
      notes: s.notes,
    });
  }
  if (payload.length > 0) {
    console.log(`  Inserting ${payload.length} solutions: ${payload.map(p => p.solution_name).join(", ")}`);
    const inserted = await insert("/solutions", payload);
    for (const s of inserted) {
      solIdByName.set(String(s.solution_name), Number(s.id));
      solKindByName.set(String(s.solution_name), String(s.solution_kind));
    }
  }
}

// --- 3. promotions ---
const needsPromotion = promotions.filter(p => solKindByName.get(p.solution_name) !== p.new_kind);
console.log(`\nSection 3 — Promotions: ${promotions.length} planned, ${needsPromotion.length} need updating.`);
for (const p of needsPromotion) {
  const current = solKindByName.get(p.solution_name) ?? "(unknown)";
  console.log(`  ${p.solution_name} (id ${p.solution_id}): ${current} -> ${p.new_kind}`);
  await patch(`/solutions?id=eq.${p.solution_id}`, { solution_kind: p.new_kind });
  solKindByName.set(p.solution_name, p.new_kind);
}

// --- 4. tool_solutions ---
const toolsRows = await get(`/tools?select=id,tool_name&limit=10000`);
const toolIdByName = new Map<string, number>();
for (const t of toolsRows) toolIdByName.set(String(t.tool_name), Number(t.id));

const existingJunctions = await get(`/tool_solutions?select=tool_id,solution_id&limit=20000`);
const junctionKey = (tid: number, sid: number) => `${tid}:${sid}`;
const existingJunctionKeys = new Set(existingJunctions.map(j => junctionKey(Number(j.tool_id), Number(j.solution_id))));

const junctionPayload: Row[] = [];
const skippedNoTool: string[] = [];
const skippedNoSolution: string[] = [];
for (const ts of toolSolutions) {
  const tid = toolIdByName.get(ts.tool_name);
  if (tid === undefined) { skippedNoTool.push(ts.tool_name); continue; }
  const sid = solIdByName.get(ts.solution_name);
  if (sid === undefined) {
    if (!APPLY) {
      // DRY RUN: solution may exist post-section-2; just note and continue
      skippedNoSolution.push(`${ts.tool_name}->${ts.solution_name}`);
      continue;
    }
    throw new Error(`Solution not found after section 2: ${ts.solution_name}`);
  }
  if (existingJunctionKeys.has(junctionKey(tid, sid))) continue;
  junctionPayload.push({
    tool_id: tid,
    solution_id: sid,
    delivery_strength: ts.delivery_strength,
    delivery_method: ts.delivery_method,
    endpoint_url: ts.endpoint_url,
    notes: ts.notes,
  });
}

console.log(`\nSection 4 — tool_solutions junction: ${toolSolutions.length} planned, ${junctionPayload.length} new to insert, ${toolSolutions.length - junctionPayload.length - skippedNoTool.length - skippedNoSolution.length} already present.`);
if (skippedNoTool.length > 0) console.log(`  Skipped (no tool): ${skippedNoTool.join(", ")}`);
if (skippedNoSolution.length > 0 && !APPLY) console.log(`  Skipped in dry run (solution to be created): ${skippedNoSolution.length}`);
if (junctionPayload.length > 0) await insert("/tool_solutions", junctionPayload);

// --- Final verify ---
if (APPLY) {
  const finalJ = await get(`/tool_solutions?select=tool_id,solution_id&limit=20000`);
  console.log(`\nFinal: ${finalJ.length} tool_solutions rows.`);
}

console.log(`\nDone (${APPLY ? "live" : "dry run"}).`);
