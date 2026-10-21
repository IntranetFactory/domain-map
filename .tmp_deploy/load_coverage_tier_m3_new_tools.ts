#!/usr/bin/env bun
// load_coverage_tier_m3_new_tools.ts — Phase M3 of the coverage_tier migration.
//
// Adds 19 new rows to `tools`:
//   - 7 inbound primitives (operation_kind='inbound'; receive_webhook is 'platform',
//     the rest are 'external')
//   - 8 outbound regulatory/industry submissions (operation_kind='side_effect',
//     coverage_tier='external')
//   - 2 misc outbound (publish_webhook, transmit_edi_message — both side_effect, external)
//   - 2 abstraction tools (notify_person, notify_team — capture the 'substitutable
//     channel' pattern empirically present in 15 multi-channel notification skills;
//     coverage_tier='external' until Semantius ships an outbound dispatcher)
//
// Idempotent: skips any tool_name already present.
//
// Prereq: Phase M1+M2 must have already shipped (coverage_tier column + 'inbound'
//   enum value must exist). This loader hard-fails if either is missing.
//
// Run from project root (Rule #6):
//   bun run c:/dev/domain-map/.tmp_deploy/load_coverage_tier_m3_new_tools.ts

export {};

type Row = Record<string, unknown>;

async function postgrest(method: string, path: string, body?: unknown): Promise<any> {
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
  if (code !== 0) throw new Error(`postgrestRequest ${method} ${path} (exit ${code}): ${stderr || stdout}`);
  const text = stdout.trim();
  return text ? JSON.parse(text) : null;
}

// ============================================================
// Pre-flight
// ============================================================
console.log("PRE-FLIGHT");

const opKindRows = await postgrest("GET", "/fields?id=eq.tools.operation_kind&select=enum_values");
const opEnum = (opKindRows?.[0]?.enum_values as string[]) ?? [];
if (!opEnum.includes("inbound")) {
  throw new Error("M3 pre-flight failed: 'inbound' is not in tools.operation_kind enum. Run M1+M2 first.");
}

const covRows = await postgrest("GET", "/fields?id=eq.tools.coverage_tier&select=enum_values");
const covEnum = (covRows?.[0]?.enum_values as string[]) ?? [];
if (!["platform", "external", "integration"].every((v) => covEnum.includes(v))) {
  throw new Error("M3 pre-flight failed: tools.coverage_tier field missing or enum incomplete. Run M1+M2 first.");
}

console.log("  ✓ operation_kind has 'inbound'");
console.log("  ✓ coverage_tier exists with platform/external/integration");

// ============================================================
// New tool rows
// ============================================================
type ToolRow = {
  tool_name: string;
  operation_kind: "query" | "mutate" | "side_effect" | "compute" | "inbound";
  coverage_tier: "platform" | "external" | "integration";
  description: string;
  // data_object_id intentionally omitted (NULL for all new rows; inbound primitives
  // are catalog-generic per the design)
};

const NEW_TOOLS: ToolRow[] = [
  // -----------------------------------------------------------
  // INBOUND family
  // -----------------------------------------------------------
  {
    tool_name: "receive_webhook",
    operation_kind: "inbound",
    coverage_tier: "platform",
    description:
      "An external system POSTs a payload that lands as a record in a Semantius table. Native via the `webhook_receivers` built-in; each receiver is configured against one target table. Used when a vendor (Stripe, DocuSign, GitHub, Datadog, monitoring tools) needs to drive state into our system.",
  },
  {
    tool_name: "receive_email",
    operation_kind: "inbound",
    coverage_tier: "external",
    description:
      "Inbound email parsed into a structured record (ticket, lead, case, supplier invoice). Adapters: Microsoft 365 / Gmail inbound parse, AWS SES inbound, Mailgun routes, Postmark inbound. The #1 inbound channel for ITSM / CRM / HRSD / S2P workflows in real SaaS deployments.",
  },
  {
    tool_name: "receive_sms",
    operation_kind: "inbound",
    coverage_tier: "external",
    description:
      "Inbound SMS message converted to a record (two-way conversation, opt-in confirmation, automated reply). Adapters: Twilio inbound, Vonage Messages, MessageBird.",
  },
  {
    tool_name: "receive_voice_call",
    operation_kind: "inbound",
    coverage_tier: "external",
    description:
      "Inbound voice call (IVR menu, live agent, or voicemail) converted to a record and/or transcript. Adapters: Twilio Voice, Genesys Cloud, Amazon Connect, NICE CXone.",
  },
  {
    tool_name: "ingest_event_stream",
    operation_kind: "inbound",
    coverage_tier: "external",
    description:
      "Continuous consumption from an external event broker (telemetry, observability signals, change data capture). Adapters: Kafka Connect, AWS Kinesis, EventBridge, Confluent Cloud, Azure Event Hubs.",
  },
  {
    tool_name: "receive_edi_message",
    operation_kind: "inbound",
    coverage_tier: "external",
    description:
      "Inbound EDI message (X12 850 PO, 810 invoice, 856 ASN, 214 shipment status; EDIFACT equivalents) via VAN or AS2. Adapters: Cleo Integration Cloud, OpenText TIE, SPS Commerce, IBM Sterling.",
  },
  {
    tool_name: "receive_file_drop",
    operation_kind: "inbound",
    coverage_tier: "external",
    description:
      "SFTP-deposited file pickup (CSV, fixed-width, vendor-specific). Adapters: AWS Transfer Family, Files.com, GoAnywhere MFT, IBM Sterling File Gateway.",
  },

  // -----------------------------------------------------------
  // OUTBOUND regulatory / industry submissions (side_effect)
  // -----------------------------------------------------------
  {
    tool_name: "submit_regulatory_filing",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Submit a regulatory filing to a securities / financial regulator (SEC EDGAR, ESMA, FCA Connect, BaFin MVP-Portal, SEDAR+). Per-regulator delivery detail in `tool_solutions`.",
  },
  {
    tool_name: "submit_tax_filing",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Submit a tax filing to a tax authority (IRS e-File, HMRC MTD, DGFiP, ATO, BMF Elster). Pairs with payroll, AP, and ERP-finance workflows; per-jurisdiction delivery in `tool_solutions`.",
  },
  {
    tool_name: "submit_breach_notification",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Submit a privacy or security breach notification to a regulator within a statutory window (GDPR 72-hr to the supervisory DPA, HIPAA breach to HHS OCR, state AGs in the US, ICO in the UK). Failure to deliver inside the window is a separate compliance event.",
  },
  {
    tool_name: "submit_aml_report",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Submit an anti-money-laundering report (FinCEN SAR / CTR, FATF FIU equivalents, AUSTRAC SMR). Banking, payments, fintech, and crypto exchanges all have hard reporting obligations on threshold-triggered transaction patterns.",
  },
  {
    tool_name: "submit_adverse_event",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Submit a pharmaceutical or medical-device adverse-event report (FDA MedWatch, EMA EudraVigilance, PMDA, MHRA Yellow Card). Pharma / device R&D and post-market surveillance workflows depend on this.",
  },
  {
    tool_name: "submit_esg_disclosure",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Submit an ESG framework disclosure (CSRD/ESRS via filings, CDP climate/water/forests questionnaire, TCFD aligned report, EU Taxonomy alignment). Annual or semi-annual cadence; multiple frameworks per company.",
  },
  {
    tool_name: "submit_trade_report",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Submit a trade report to a trade repository or competent authority (EMIR, MiFID II RTS-22 transaction reporting, Dodd-Frank SDR, SFTR, ASIC OTC). Real-time or end-of-day; capital-markets ERP and trading systems depend on this.",
  },
  {
    tool_name: "submit_industry_statistics",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Submit industry-specific statistics to a regulator or industry body (FFIEC Call Report for US banks, HEDIS for US health plans, CMS quality measures, FERPA reporting for US education). Sector-specific cadence and payload shape.",
  },

  // -----------------------------------------------------------
  // OUTBOUND non-regulatory
  // -----------------------------------------------------------
  {
    tool_name: "publish_webhook",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Emit an event to external subscribers via outbound webhook (vendor 'send webhook on event' surface — Stripe, GitHub, Salesforce, ServiceNow all support this pattern). Distinct from `invoke_webhook` which calls a known endpoint with arbitrary payload. NOTE: flip coverage_tier to 'platform' if Semantius natively emits webhooks from `trigger_events`.",
  },
  {
    tool_name: "transmit_edi_message",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Outbound EDI message (X12 850 PO, 810 invoice, 856 ASN, EDIFACT equivalents) via VAN or AS2 gateway to a trading partner. Adapters: Cleo, OpenText, SPS Commerce, IBM Sterling.",
  },

  // -----------------------------------------------------------
  // ABSTRACTION tools — the only capability cluster empirically validated
  // in the catalog (15 multi-channel notification skills as of 2026-05-26).
  // Skills should default to linking these instead of channel-specific tools;
  // concrete channels stay in `tools` as primitives for tool_solutions linkage
  // and for skills that genuinely require a specific channel.
  // -----------------------------------------------------------
  {
    tool_name: "notify_person",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Single-recipient outbound message; channel is routed by recipient profile or deployment config. Backed by `send_email`, `send_sms`, `make_phone_call`, and future per-channel primitives. Default link for skills that need to notify a specific person and don't require a specific channel. Becomes `platform` only when Semantius ships an outbound dispatcher (recipient lookup + channel routing) on BOTH the `crud` MCP server AND the `semantius` CLI.",
  },
  {
    tool_name: "notify_team",
    operation_kind: "side_effect",
    coverage_tier: "external",
    description:
      "Broadcast to a team or shared inbox; typical real-world pattern is chat-channel-alert plus email-audit-trail on the same event. Backed by `post_chat_message`, `send_email`, `post_social_message`. Default link for skills that need to alert a team (incident broadcast, deploy notification, escalation). Becomes `platform` under the same MCP + CLI criterion as `notify_person`.",
  },
];

// ============================================================
// Idempotent insert
// ============================================================
console.log(`M3 — load ${NEW_TOOLS.length} new tool rows`);

// Read existing tool_names so we can skip duplicates
const existing = (await postgrest("GET", "/tools?select=tool_name")) as Row[];
const existingNames = new Set(existing.map((r) => String(r.tool_name)));

const toInsert = NEW_TOOLS.filter((t) => !existingNames.has(t.tool_name));
const skipped = NEW_TOOLS.filter((t) => existingNames.has(t.tool_name));

for (const s of skipped) {
  console.log(`  ♻ ${s.tool_name} (already present)`);
}

if (toInsert.length === 0) {
  console.log("  nothing to insert");
} else {
  console.log(`  ✨ inserting ${toInsert.length} new rows`);
  // Bulk POST — well below the Windows command-line limit at ~17 rows.
  // record_status defaults to 'new' per Rule #1; we deliberately omit the field.
  await postgrest("POST", "/tools", toInsert);
  for (const t of toInsert) {
    console.log(`    + ${t.tool_name} (${t.operation_kind}, ${t.coverage_tier})`);
  }
}

// ============================================================
// Verify
// ============================================================
console.log("\nVERIFY — new tools loaded");
const verify = (await postgrest(
  "GET",
  `/tools?tool_name=in.(${NEW_TOOLS.map((t) => t.tool_name).join(",")})&select=tool_name,operation_kind,coverage_tier&order=operation_kind.asc,tool_name.asc`
)) as Row[];
for (const r of verify) {
  console.log(`  ${r.operation_kind.toString().padEnd(12)}  ${r.coverage_tier.toString().padEnd(12)}  ${r.tool_name}`);
}

console.log("\nDONE — review at https://tests.semantius.app/domain_map/tools");
console.log("Next: M4 (description cleanup) and M5 (per-domain skill_tools backfill, separate sessions).");
