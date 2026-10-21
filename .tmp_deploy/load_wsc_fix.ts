/**
 * WSC domain audit fix loader (2026-05-26).
 *
 * Closes the gap report produced by `/domain-map-analyst review the wsc domain`:
 *   A2 - 7 capabilities + capability_domains
 *   M1/M2/M4/M6 - 3 full domain_modules + domain_module_capabilities + domain_module_data_objects
 *                 (M3 starter-junction skipped: domain_starter_modules table absent)
 *   B4 - has_personal_content=true on 5 conversational masters
 *   B12 - lifecycle states on 3 workflow-bearing masters; config-shape notes on the other 5
 *   B10b - source_domain_module_id backfill on 9 outbound handoffs; target NULL annotated in notes
 *   F1 - retire legacy wsc-system skill + skill_tools
 *   F2/F3/F4/F7 - 3 per-module system skills + 6 new mutate tools + skill_tools
 *   Permissions - 11 catalog-derived rows for 3 modules
 *   E1-E6 - 3 cross-module roles + role_modules + role_permissions
 *
 * Idempotent: re-runnable. Uses natural keys to dedupe everything.
 * Run from project root: `bun run .tmp_deploy/load_wsc_fix.ts`
 */

type Json = unknown;

const DOMAIN_MAP_MODULE_ID = 1001;
const WSC_DOMAIN_ID = 75;
const END_USER_COMPUTING_BF_ID = 59;

const MASTERS: Record<string, number> = {
  chat_channels: 564,
  chat_messages: 565,
  chat_threads: 566,
  chat_huddles: 567,
  channel_members: 568,
  external_guest_invitations: 569,
  chat_message_attachments: 570,
  channel_file_shares: 571,
};

async function semantius(method: string, path: string, body?: Json): Promise<any> {
  const args: Record<string, Json> = { method, path };
  if (body !== undefined) args.body = body;
  const proc = Bun.spawn(["semantius", "call", "crud", "postgrestRequest"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write(JSON.stringify(args));
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`semantius ${method} ${path} failed (exit ${proc.exitCode}): ${err}\n${out}`);
  }
  if (out.trim().startsWith("Error:")) {
    throw new Error(`semantius ${method} ${path} returned error: ${out}`);
  }
  try {
    return JSON.parse(out);
  } catch {
    return out;
  }
}

async function get(path: string) { return semantius("GET", path); }
async function post(path: string, body: Json) { return semantius("POST", path, body); }
async function patch(path: string, body: Json) { return semantius("PATCH", path, body); }
async function del(path: string) { return semantius("DELETE", path); }

function log(stage: string, msg: string) {
  console.log(`[${stage}] ${msg}`);
}

async function insertMissing<T extends Record<string, any>>(
  table: string,
  rows: T[],
  naturalKey: keyof T,
  existingFilterPath?: string,
): Promise<Record<string, number>> {
  if (rows.length === 0) return {};
  const keyValues = rows.map((r) => String(r[naturalKey]));
  const filter = existingFilterPath ?? `${String(naturalKey)}=in.(${keyValues.map((v) => `"${v}"`).join(",")})`;
  const existing: any[] = await get(`/${table}?${filter}&select=id,${String(naturalKey)}`);
  const existingByKey: Record<string, number> = {};
  for (const e of existing) existingByKey[String(e[naturalKey as string])] = e.id;
  const missing = rows.filter((r) => existingByKey[String(r[naturalKey])] === undefined);
  if (missing.length > 0) {
    const inserted = await post(`/${table}?select=id,${String(naturalKey)}`, missing);
    for (const e of inserted as any[]) existingByKey[String(e[naturalKey as string])] = e.id;
    log(table, `inserted ${missing.length}, existing ${existing.length}`);
  } else {
    log(table, `all ${rows.length} already present`);
  }
  return existingByKey;
}

// ---------------------------------------------------------------------------
// A2. Capabilities + capability_domains
// ---------------------------------------------------------------------------

const CAPABILITIES = [
  { capability_code: "WSC-PERSISTENT-MESSAGING", capability_name: "Persistent Channel-Based Messaging", description: "Channel-based persistent messages with threading, mentions, reactions, and edit history. Distinct from ephemeral chat (CCAAS) and from knowledge artifacts (KMS)." },
  { capability_code: "WSC-VOICE-VIDEO-HUDDLES", capability_name: "Voice and Video Huddles", description: "Ad-hoc and scheduled voice/video drop-in meetings anchored to a channel or DM." },
  { capability_code: "WSC-EXTERNAL-COLLAB", capability_name: "External Guest Collaboration", description: "Inviting and managing external guests (partners, vendors, customers) into channels with scoped access controls." },
  { capability_code: "WSC-MESSAGE-SEARCH-RETENTION", capability_name: "Message Search and Retention", description: "Federated search across messages, files, and threads; configurable retention windows and legal-hold preservation." },
  { capability_code: "WSC-CHAT-TO-WORK-ESCALATION", capability_name: "Chat-to-Work Escalation", description: "Promoting a chat thread to a downstream work item (ITSM ticket, support session, MSP-PSA case) without losing context." },
  { capability_code: "WSC-IN-CHANNEL-FILE-SHARING", capability_name: "In-Channel File Sharing", description: "Posting files and link previews into channels, with optional handoff to ECM for governed storage." },
  { capability_code: "WSC-PRESENCE-STATUS", capability_name: "Presence and Status", description: "Real-time presence, custom status, do-not-disturb, and timezone-aware availability across channels." },
];

// ---------------------------------------------------------------------------
// M. Domain modules + capability mapping + master-DMDO assignments
// ---------------------------------------------------------------------------

const MODULES = [
  {
    domain_module_code: "WSC-CHANNELS-CONVERSATIONS",
    domain_module_name: "Channels and Conversations",
    description: "The core conversational surface of a workstream collaboration platform: persistent channels, messages, threads, channel membership, file attachments, and presence. Hosts the search/retention and chat-to-work-escalation features that live at the channel/message layer.",
    module_kind: "full" as const,
    domain_id: WSC_DOMAIN_ID,
    masters: ["chat_channels", "chat_messages", "chat_threads", "channel_members", "chat_message_attachments", "channel_file_shares"],
    capabilities: ["WSC-PERSISTENT-MESSAGING", "WSC-MESSAGE-SEARCH-RETENTION", "WSC-CHAT-TO-WORK-ESCALATION", "WSC-IN-CHANNEL-FILE-SHARING", "WSC-PRESENCE-STATUS"],
  },
  {
    domain_module_code: "WSC-HUDDLES-VOICE",
    domain_module_name: "Huddles and Voice Drop-Ins",
    description: "Voice and video huddles anchored to channels or DMs; ad-hoc and scheduled forms.",
    module_kind: "full" as const,
    domain_id: WSC_DOMAIN_ID,
    masters: ["chat_huddles"],
    capabilities: ["WSC-VOICE-VIDEO-HUDDLES"],
  },
  {
    domain_module_code: "WSC-EXTERNAL-COLLAB",
    domain_module_name: "External Collaboration",
    description: "External guest invitations, scoped access into channels for partners and vendors, and access-revocation workflow on guest offboarding.",
    module_kind: "full" as const,
    domain_id: WSC_DOMAIN_ID,
    masters: ["external_guest_invitations"],
    capabilities: ["WSC-EXTERNAL-COLLAB"],
  },
];

// ---------------------------------------------------------------------------
// B4 patches + B12 lifecycle states + config-shape notes
// ---------------------------------------------------------------------------

const PERSONAL_CONTENT_MASTERS = ["chat_messages", "chat_message_attachments", "external_guest_invitations", "chat_threads", "chat_huddles"];

const CONFIG_SHAPE_NOTES: Record<string, string> = {
  chat_messages: "Config-shaped conversational record. Edit/delete are direct mutations, not workflow gates; retention is a domain-wide policy, not a per-message state machine.",
  chat_threads: "Lightweight message grouping. Presence/absence of replies is the only meaningful state; no workflow gates.",
  channel_members: "Membership presence. Add/remove is direct; no per-row workflow.",
  chat_message_attachments: "Immutable artifact reference tied to a single message. No workflow beyond the parent message lifecycle.",
  channel_file_shares: "Reference link to ECM-mastered content. No local workflow; the underlying document's lifecycle is owned by ECM.",
};

type LifecycleState = {
  data_object_name: string;
  state_name: string;
  state_order: number;
  description: string;
  is_initial: boolean;
  is_terminal: boolean;
  requires_permission: boolean;
  permission_verb_override: string;
  domain_module_code: string;
};

const LIFECYCLE_STATES: LifecycleState[] = [
  // chat_channels
  { data_object_name: "chat_channels", state_name: "active", state_order: 10, description: "Channel is open for messaging.", is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_code: "WSC-CHANNELS-CONVERSATIONS" },
  { data_object_name: "chat_channels", state_name: "archived", state_order: 20, description: "Channel is read-only; no new messages accepted. Archive emits chat_channel.archived for ECM retention pickup.", is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "archive_channel", domain_module_code: "WSC-CHANNELS-CONVERSATIONS" },
  // external_guest_invitations
  { data_object_name: "external_guest_invitations", state_name: "invited", state_order: 10, description: "Invitation issued to an external email; pending guest acceptance.", is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_code: "WSC-EXTERNAL-COLLAB" },
  { data_object_name: "external_guest_invitations", state_name: "accepted", state_order: 20, description: "Guest accepted; access to scoped channels is provisioned.", is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_code: "WSC-EXTERNAL-COLLAB" },
  { data_object_name: "external_guest_invitations", state_name: "declined", state_order: 30, description: "Guest declined the invitation; terminal.", is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_code: "WSC-EXTERNAL-COLLAB" },
  { data_object_name: "external_guest_invitations", state_name: "revoked", state_order: 40, description: "Access revoked by the host or by an upstream IGA event. Terminal; emits external_guest.access_revoked.", is_initial: false, is_terminal: true, requires_permission: true, permission_verb_override: "revoke_guest_access", domain_module_code: "WSC-EXTERNAL-COLLAB" },
  // chat_huddles
  { data_object_name: "chat_huddles", state_name: "scheduled", state_order: 10, description: "Huddle scheduled in advance with a planned time window.", is_initial: true, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_code: "WSC-HUDDLES-VOICE" },
  { data_object_name: "chat_huddles", state_name: "live", state_order: 20, description: "Huddle is in progress; participants can join, leave, screen-share.", is_initial: false, is_terminal: false, requires_permission: false, permission_verb_override: "", domain_module_code: "WSC-HUDDLES-VOICE" },
  { data_object_name: "chat_huddles", state_name: "ended", state_order: 30, description: "Huddle concluded; recording/transcript (if any) is finalized.", is_initial: false, is_terminal: true, requires_permission: false, permission_verb_override: "", domain_module_code: "WSC-HUDDLES-VOICE" },
];

// ---------------------------------------------------------------------------
// B10b handoff module-FK backfill
// ---------------------------------------------------------------------------

// Map handoff id -> source-side module code (derived from trigger_events.data_object_id master)
const HANDOFF_SOURCE_MODULE: Record<number, string> = {
  831: "WSC-CHANNELS-CONVERSATIONS", // channel_member.added
  832: "WSC-CHANNELS-CONVERSATIONS", // chat_message.posted
  833: "WSC-CHANNELS-CONVERSATIONS", // chat_thread.escalated_to_ticket -> CCAAS
  834: "WSC-CHANNELS-CONVERSATIONS", // chat_thread.escalated_to_ticket -> ITSM
  835: "WSC-CHANNELS-CONVERSATIONS", // msp_ticket.from_chat (event on chat_messages)
  836: "WSC-EXTERNAL-COLLAB",        // external_guest.access_revoked
  828: "WSC-CHANNELS-CONVERSATIONS", // chat_attachment.shared
  829: "WSC-CHANNELS-CONVERSATIONS", // chat_channel.archived
  830: "WSC-EXTERNAL-COLLAB",        // external_guest.invited
};

// Notes annotation per row (target stays NULL on outbound; both NULL on inbound 790)
const HANDOFF_NOTES_APPEND: Record<number, string> = {
  831: "target NULL until IGA is modularized",
  832: "target NULL until DLP is modularized",
  833: "target NULL until CCAAS is modularized",
  834: "target NULL: ITSM is modularized but declares no consumer DMDO on chat_threads; pending ITSM Phase-B extension",
  835: "target NULL until MSP-PSA is modularized",
  836: "target NULL until IGA is modularized",
  828: "target NULL until ECM is modularized",
  829: "target NULL until ECM is modularized",
  830: "target NULL until IGA is modularized",
  790: "source NULL until WORK-MGMT is modularized; target NULL until WSC declares a consumer DMDO on work_automations",
};

// ---------------------------------------------------------------------------
// F2-F7. New mutate tools + per-module system skills + skill_tools
// ---------------------------------------------------------------------------

const NEW_TOOLS = [
  { tool_name: "archive_chat_channel", operation_kind: "mutate" as const, coverage_tier: "platform" as const, data_object_id: MASTERS.chat_channels, description: "Archive a chat channel. Sets state to archived; emits chat_channel.archived." },
  { tool_name: "create_chat_message", operation_kind: "mutate" as const, coverage_tier: "platform" as const, data_object_id: MASTERS.chat_messages, description: "Create a chat message in a channel or DM. Emits chat_message.posted." },
  { tool_name: "create_chat_huddle", operation_kind: "mutate" as const, coverage_tier: "platform" as const, data_object_id: MASTERS.chat_huddles, description: "Schedule or start a chat huddle anchored to a channel or DM." },
  { tool_name: "end_chat_huddle", operation_kind: "mutate" as const, coverage_tier: "platform" as const, data_object_id: MASTERS.chat_huddles, description: "End an in-progress chat huddle and finalize any recording/transcript." },
  { tool_name: "invite_external_guest", operation_kind: "mutate" as const, coverage_tier: "platform" as const, data_object_id: MASTERS.external_guest_invitations, description: "Issue an external guest invitation to scoped channels. Emits external_guest.invited." },
  { tool_name: "revoke_guest_access", operation_kind: "mutate" as const, coverage_tier: "platform" as const, data_object_id: MASTERS.external_guest_invitations, description: "Revoke an external guest's access to scoped channels. Emits external_guest.access_revoked." },
];

type SkillToolLink = { tool_name: string; requirement_level: "required" | "optional"; notes: string };

const NEW_SKILLS = [
  {
    skill_name: "wsc_channels_conversations_agent",
    skill_type: "system" as const,
    domain_module_code: "WSC-CHANNELS-CONVERSATIONS",
    description: "Agent surface for the WSC channels-and-conversations module: read/write messages, channels, threads, members, attachments, and in-channel file shares; archive channels via the workflow gate.",
    tools: [
      { tool_name: "query_chat_channels", requirement_level: "required" as const, notes: "" },
      { tool_name: "query_chat_messages", requirement_level: "required" as const, notes: "" },
      { tool_name: "query_chat_threads", requirement_level: "required" as const, notes: "" },
      { tool_name: "query_channel_members", requirement_level: "required" as const, notes: "" },
      { tool_name: "query_chat_message_attachments", requirement_level: "required" as const, notes: "" },
      { tool_name: "query_channel_file_shares", requirement_level: "required" as const, notes: "" },
      { tool_name: "create_chat_message", requirement_level: "required" as const, notes: "" },
      { tool_name: "archive_chat_channel", requirement_level: "required" as const, notes: "Workflow gate (B12: chat_channels.archived)." },
      { tool_name: "post_chat_message", requirement_level: "required" as const, notes: "Post IS the workflow: WSC is the chat platform itself, not a generic notifier. Channel primitive is intentional, not substitutable with notify_person." },
      { tool_name: "notify_person", requirement_level: "optional" as const, notes: "For out-of-channel notifications (e.g. mention digest to email when user is offline)." },
    ] satisfies SkillToolLink[],
  },
  {
    skill_name: "wsc_huddles_voice_agent",
    skill_type: "system" as const,
    domain_module_code: "WSC-HUDDLES-VOICE",
    description: "Agent surface for voice and video huddles: schedule, start, end huddles; query existing huddles for a channel or user.",
    tools: [
      { tool_name: "query_chat_huddles", requirement_level: "required" as const, notes: "" },
      { tool_name: "create_chat_huddle", requirement_level: "required" as const, notes: "" },
      { tool_name: "end_chat_huddle", requirement_level: "required" as const, notes: "" },
      { tool_name: "notify_person", requirement_level: "optional" as const, notes: "Invite participants who are not currently in the channel." },
    ] satisfies SkillToolLink[],
  },
  {
    skill_name: "wsc_external_collab_agent",
    skill_type: "system" as const,
    domain_module_code: "WSC-EXTERNAL-COLLAB",
    description: "Agent surface for external guest collaboration: invite guests, revoke access on offboarding (workflow gate), query outstanding invitations.",
    tools: [
      { tool_name: "query_external_guest_invitations", requirement_level: "required" as const, notes: "" },
      { tool_name: "invite_external_guest", requirement_level: "required" as const, notes: "" },
      { tool_name: "revoke_guest_access", requirement_level: "required" as const, notes: "Workflow gate (B12: external_guest_invitations.revoked)." },
      { tool_name: "notify_person", requirement_level: "required" as const, notes: "Guest-facing invitation email is required for the invite flow to complete." },
    ] satisfies SkillToolLink[],
  },
];

// ---------------------------------------------------------------------------
// Permissions (catalog-derived)
// ---------------------------------------------------------------------------

type PermissionRow = { permission_name: string; description: string; module_id: number; domain_module_code: string; tier: "baseline-read" | "baseline-manage" | "baseline-admin" | "workflow-gate" | "override" };

const PERMISSIONS: PermissionRow[] = [
  // WSC-CHANNELS-CONVERSATIONS
  { permission_name: "wsc-channels-conversations:read", description: "Read access to WSC Channels and Conversations (WSC-CHANNELS-CONVERSATIONS).", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-CHANNELS-CONVERSATIONS", tier: "baseline-read" },
  { permission_name: "wsc-channels-conversations:manage", description: "Manage own messages, threads, and channel membership in WSC Channels and Conversations.", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-CHANNELS-CONVERSATIONS", tier: "baseline-manage" },
  { permission_name: "wsc-channels-conversations:admin", description: "Full administrative access to WSC Channels and Conversations (WSC-CHANNELS-CONVERSATIONS).", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-CHANNELS-CONVERSATIONS", tier: "baseline-admin" },
  { permission_name: "wsc-channels-conversations:archive_channel", description: "Archive a chat channel (B12 workflow gate on chat_channels.archived).", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-CHANNELS-CONVERSATIONS", tier: "workflow-gate" },
  // WSC-HUDDLES-VOICE
  { permission_name: "wsc-huddles-voice:read", description: "Read access to WSC Huddles and Voice Drop-Ins (WSC-HUDDLES-VOICE).", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-HUDDLES-VOICE", tier: "baseline-read" },
  { permission_name: "wsc-huddles-voice:manage", description: "Schedule and run own huddles in WSC Huddles and Voice Drop-Ins.", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-HUDDLES-VOICE", tier: "baseline-manage" },
  { permission_name: "wsc-huddles-voice:admin", description: "Full administrative access to WSC Huddles and Voice Drop-Ins (WSC-HUDDLES-VOICE).", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-HUDDLES-VOICE", tier: "baseline-admin" },
  // WSC-EXTERNAL-COLLAB
  { permission_name: "wsc-external-collab:read", description: "Read access to WSC External Collaboration (WSC-EXTERNAL-COLLAB).", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-EXTERNAL-COLLAB", tier: "baseline-read" },
  { permission_name: "wsc-external-collab:manage", description: "Invite and manage external guests in WSC External Collaboration.", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-EXTERNAL-COLLAB", tier: "baseline-manage" },
  { permission_name: "wsc-external-collab:admin", description: "Full administrative access to WSC External Collaboration (WSC-EXTERNAL-COLLAB).", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-EXTERNAL-COLLAB", tier: "baseline-admin" },
  { permission_name: "wsc-external-collab:revoke_guest_access", description: "Revoke an external guest's access (B12 workflow gate on external_guest_invitations.revoked).", module_id: DOMAIN_MAP_MODULE_ID, domain_module_code: "WSC-EXTERNAL-COLLAB", tier: "workflow-gate" },
];

// ---------------------------------------------------------------------------
// E. Roles + role_modules + role_permissions
// ---------------------------------------------------------------------------

type RoleSpec = {
  role_code: string;
  role_name: string;
  slug: string;
  description: string;
  business_function_id: number | null;
  origin: string;
  modules: { domain_module_code: string; interaction_level: "primary" | "secondary"; notes: string }[];
  permissions: { permission_name: string; notes: string }[];
};

const ROLES: RoleSpec[] = [
  {
    role_code: "IT-COLLAB-PLATFORM-ADMIN",
    role_name: "Collaboration Platform Admin",
    slug: "it_collab_platform_admin",
    description: "End-User Computing operator responsible for the workstream collaboration platform: channel/workspace administration, retention policy, huddle settings, and external guest governance across all three WSC modules.",
    business_function_id: END_USER_COMPUTING_BF_ID,
    origin: "model",
    modules: [
      { domain_module_code: "WSC-CHANNELS-CONVERSATIONS", interaction_level: "primary", notes: "Channel lifecycle, retention, archival." },
      { domain_module_code: "WSC-HUDDLES-VOICE", interaction_level: "primary", notes: "Huddle policy and recording controls." },
      { domain_module_code: "WSC-EXTERNAL-COLLAB", interaction_level: "primary", notes: "Guest governance and access revocation." },
    ],
    permissions: [
      { permission_name: "wsc-channels-conversations:admin", notes: "Tier-level grant: archive_channel auto-included via permission_hierarchy." },
      { permission_name: "wsc-huddles-voice:admin", notes: "Tier-level grant." },
      { permission_name: "wsc-external-collab:admin", notes: "Tier-level grant: revoke_guest_access auto-included via permission_hierarchy." },
    ],
  },
  {
    role_code: "IT-EXTERNAL-COLLAB-STEWARD",
    role_name: "External Collaboration Steward",
    slug: "it_external_collab_steward",
    description: "Owns external guest lifecycle for the workstream collaboration platform: invitations, access scoping into channels, and revocation on offboarding. Distinct from the broader platform admin role: focused on the partner/vendor/customer surface, not on channel administration.",
    business_function_id: END_USER_COMPUTING_BF_ID,
    origin: "model",
    modules: [
      { domain_module_code: "WSC-EXTERNAL-COLLAB", interaction_level: "primary", notes: "Owns guest invitations and revocation workflow." },
      { domain_module_code: "WSC-CHANNELS-CONVERSATIONS", interaction_level: "secondary", notes: "Sets per-channel guest access scope; does not own channel lifecycle." },
    ],
    permissions: [
      { permission_name: "wsc-external-collab:admin", notes: "Tier-level grant." },
      { permission_name: "wsc-channels-conversations:manage", notes: "Manage guest-related channel scope; not :admin (channel admin lives with IT-COLLAB-PLATFORM-ADMIN)." },
    ],
  },
  {
    role_code: "EMPLOYEE-COLLAB-USER",
    role_name: "Collaboration User",
    slug: "employee_collab_user",
    description: "Cross-functional end-user persona for the workstream collaboration platform. Every employee with a license does this role: post messages, join channels, start/join huddles, attach files, manage own status. No admin tier and no external-guest workflow.",
    business_function_id: null,
    origin: "model",
    modules: [
      { domain_module_code: "WSC-CHANNELS-CONVERSATIONS", interaction_level: "primary", notes: "Post, react, thread, attach, search." },
      { domain_module_code: "WSC-HUDDLES-VOICE", interaction_level: "primary", notes: "Start and join huddles in own channels and DMs." },
    ],
    permissions: [
      { permission_name: "wsc-channels-conversations:manage", notes: "Own messages, own threads, own channel membership." },
      { permission_name: "wsc-huddles-voice:manage", notes: "Start, join, end own huddles." },
    ],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function getCurrentUser(): Promise<any> {
  const proc = Bun.spawn(["semantius", "call", "crud", "getCurrentUser"], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  proc.stdin.write("{}");
  proc.stdin.end();
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  return JSON.parse(out);
}

async function main() {
  log("session", "verifying tenant");
  const user = await getCurrentUser();
  log("session", `user=${user.email} org=${user.semantius_org}`);
  if (user.semantius_org !== "adenin") {
    throw new Error(`Wrong tenant: ${user.semantius_org}. Expected adenin.`);
  }

  // -----------------------------------------------------------------------
  // A2. Capabilities + capability_domains
  // -----------------------------------------------------------------------
  log("A2", "loading capabilities");
  const capByCode = await insertMissing(
    "capabilities",
    CAPABILITIES,
    "capability_code",
    `capability_code=in.(${CAPABILITIES.map((c) => `"${c.capability_code}"`).join(",")})`,
  );
  // capability_domains: dedupe by (domain_id, capability_id)
  const existingCapDomains: any[] = await get(`/capability_domains?domain_id=eq.${WSC_DOMAIN_ID}&select=capability_id`);
  const haveCapIds = new Set(existingCapDomains.map((r) => r.capability_id));
  const newCapDomains = CAPABILITIES
    .map((c) => capByCode[c.capability_code])
    .filter((id) => !haveCapIds.has(id))
    .map((id) => ({ domain_id: WSC_DOMAIN_ID, capability_id: id }));
  if (newCapDomains.length > 0) {
    await post("/capability_domains", newCapDomains);
    log("A2", `inserted ${newCapDomains.length} capability_domains`);
  } else {
    log("A2", "all capability_domains present");
  }

  // -----------------------------------------------------------------------
  // M. Modules + capability mapping + master DMDO
  // -----------------------------------------------------------------------
  log("M", "loading domain_modules");
  const moduleRows = MODULES.map((m) => ({
    domain_module_code: m.domain_module_code,
    domain_module_name: m.domain_module_name,
    description: m.description,
    module_kind: m.module_kind,
    domain_id: m.domain_id,
  }));
  const moduleByCode = await insertMissing(
    "domain_modules",
    moduleRows,
    "domain_module_code",
    `domain_module_code=in.(${MODULES.map((m) => `"${m.domain_module_code}"`).join(",")})`,
  );

  // domain_module_capabilities
  const existingDmc: any[] = await get(`/domain_module_capabilities?domain_module_id=in.(${Object.values(moduleByCode).join(",")})&select=domain_module_id,capability_id`);
  const haveDmc = new Set(existingDmc.map((r) => `${r.domain_module_id}.${r.capability_id}`));
  const newDmc: any[] = [];
  for (const m of MODULES) {
    const mid = moduleByCode[m.domain_module_code];
    for (const capCode of m.capabilities) {
      const cid = capByCode[capCode];
      if (!haveDmc.has(`${mid}.${cid}`)) newDmc.push({ domain_module_id: mid, capability_id: cid });
    }
  }
  if (newDmc.length > 0) {
    await post("/domain_module_capabilities", newDmc);
    log("M", `inserted ${newDmc.length} domain_module_capabilities`);
  } else {
    log("M", "all domain_module_capabilities present");
  }

  // domain_module_data_objects: every master goes to its module as master+required
  const existingDmdo: any[] = await get(`/domain_module_data_objects?domain_module_id=in.(${Object.values(moduleByCode).join(",")})&select=domain_module_id,data_object_id`);
  const haveDmdo = new Set(existingDmdo.map((r) => `${r.domain_module_id}.${r.data_object_id}`));
  const newDmdo: any[] = [];
  for (const m of MODULES) {
    const mid = moduleByCode[m.domain_module_code];
    for (const masterName of m.masters) {
      const did = MASTERS[masterName];
      if (!haveDmdo.has(`${mid}.${did}`)) {
        newDmdo.push({ domain_module_id: mid, data_object_id: did, role: "master", necessity: "required", notes: "" });
      }
    }
  }
  if (newDmdo.length > 0) {
    await post("/domain_module_data_objects", newDmdo);
    log("M", `inserted ${newDmdo.length} domain_module_data_objects`);
  } else {
    log("M", "all domain_module_data_objects present");
  }

  // -----------------------------------------------------------------------
  // B4. Pattern flags + config-shape notes
  // -----------------------------------------------------------------------
  log("B4", "patching has_personal_content");
  for (const masterName of PERSONAL_CONTENT_MASTERS) {
    const did = MASTERS[masterName];
    await patch(`/data_objects?id=eq.${did}`, { has_personal_content: true });
  }
  log("B4", `patched ${PERSONAL_CONTENT_MASTERS.length} masters with has_personal_content=true`);

  log("B12-notes", "writing config-shape notes for non-workflow masters");
  for (const [masterName, note] of Object.entries(CONFIG_SHAPE_NOTES)) {
    const did = MASTERS[masterName];
    const existing: any[] = await get(`/data_objects?id=eq.${did}&select=notes`);
    if ((existing[0]?.notes ?? "") === "") {
      await patch(`/data_objects?id=eq.${did}`, { notes: note });
    }
  }

  // -----------------------------------------------------------------------
  // B12. Lifecycle states
  // -----------------------------------------------------------------------
  log("B12", "loading lifecycle states");
  const existingStates: any[] = await get(`/data_object_lifecycle_states?data_object_id=in.(${[MASTERS.chat_channels, MASTERS.chat_huddles, MASTERS.external_guest_invitations].join(",")})&select=data_object_id,state_name`);
  const haveStates = new Set(existingStates.map((s) => `${s.data_object_id}.${s.state_name}`));
  const newStates: any[] = [];
  for (const s of LIFECYCLE_STATES) {
    const did = MASTERS[s.data_object_name];
    const mid = moduleByCode[s.domain_module_code];
    if (haveStates.has(`${did}.${s.state_name}`)) continue;
    newStates.push({
      data_object_id: did,
      state_name: s.state_name,
      state_order: s.state_order,
      description: s.description,
      is_initial: s.is_initial,
      is_terminal: s.is_terminal,
      requires_permission: s.requires_permission,
      permission_verb_override: s.permission_verb_override,
      domain_module_id: mid,
      notes: "",
    });
  }
  if (newStates.length > 0) {
    await post("/data_object_lifecycle_states", newStates);
    log("B12", `inserted ${newStates.length} lifecycle states`);
  } else {
    log("B12", "all lifecycle states present");
  }

  // -----------------------------------------------------------------------
  // Permissions (needed before role_permissions)
  // -----------------------------------------------------------------------
  log("perms", "loading permissions");
  const permRows = PERMISSIONS.map((p) => ({
    permission_name: p.permission_name,
    description: p.description,
    module_id: p.module_id,
    domain_module_id: moduleByCode[p.domain_module_code],
    tier: p.tier,
  }));
  const permByName = await insertMissing(
    "permissions",
    permRows,
    "permission_name",
    `permission_name=in.(${PERMISSIONS.map((p) => `"${p.permission_name}"`).join(",")})`,
  );

  // -----------------------------------------------------------------------
  // B10b. Handoff source_domain_module_id backfill + notes annotation
  // -----------------------------------------------------------------------
  log("B10b", "backfilling handoff module FKs");
  for (const [hidStr, modCode] of Object.entries(HANDOFF_SOURCE_MODULE)) {
    const hid = parseInt(hidStr, 10);
    const mid = moduleByCode[modCode];
    const noteAdd = HANDOFF_NOTES_APPEND[hid] ?? "";
    const cur: any[] = await get(`/handoffs?id=eq.${hid}&select=source_domain_module_id,notes`);
    if (!cur[0]) continue;
    const patchBody: Record<string, any> = {};
    if (cur[0].source_domain_module_id !== mid) patchBody.source_domain_module_id = mid;
    if (noteAdd && !(cur[0].notes ?? "").includes(noteAdd)) {
      patchBody.notes = (cur[0].notes ?? "").trim() ? `${cur[0].notes.trim()} | ${noteAdd}` : noteAdd;
    }
    if (Object.keys(patchBody).length > 0) {
      await patch(`/handoffs?id=eq.${hid}`, patchBody);
    }
  }
  // Inbound row 790 (notes only)
  const inb: any[] = await get(`/handoffs?id=eq.790&select=notes`);
  if (inb[0]) {
    const noteAdd = HANDOFF_NOTES_APPEND[790];
    if (noteAdd && !(inb[0].notes ?? "").includes(noteAdd)) {
      const newNotes = (inb[0].notes ?? "").trim() ? `${inb[0].notes.trim()} | ${noteAdd}` : noteAdd;
      await patch(`/handoffs?id=eq.790`, { notes: newNotes });
    }
  }
  log("B10b", `processed ${Object.keys(HANDOFF_SOURCE_MODULE).length} outbound + 1 inbound`);

  // -----------------------------------------------------------------------
  // F1. Retire legacy wsc-system skill + skill_tools
  // -----------------------------------------------------------------------
  log("F1", "retiring legacy wsc-system skill");
  const legacy: any[] = await get(`/skills?skill_name=eq.wsc-system&select=id`);
  if (legacy.length > 0) {
    const lid = legacy[0].id;
    await del(`/skill_tools?skill_id=eq.${lid}`);
    await del(`/skills?id=eq.${lid}`);
    log("F1", `deleted legacy skill id=${lid} and its skill_tools`);
  } else {
    log("F1", "legacy wsc-system skill already gone");
  }

  // -----------------------------------------------------------------------
  // F2-F4-F7. New tools, new skills, skill_tools
  // -----------------------------------------------------------------------
  log("F2-tools", "loading new mutate tools");
  const toolByName = await insertMissing(
    "tools",
    NEW_TOOLS,
    "tool_name",
    `tool_name=in.(${NEW_TOOLS.map((t) => `"${t.tool_name}"`).join(",")})`,
  );

  // Resolve all tools referenced by the new skills (including pre-existing query/abstraction tools)
  const allToolNames = new Set<string>();
  for (const s of NEW_SKILLS) for (const t of s.tools) allToolNames.add(t.tool_name);
  const allTools: any[] = await get(`/tools?tool_name=in.(${[...allToolNames].map((t) => `"${t}"`).join(",")})&select=id,tool_name`);
  const toolIdByName: Record<string, number> = {};
  for (const t of allTools) toolIdByName[t.tool_name] = t.id;
  for (const n of allToolNames) {
    if (!(n in toolIdByName)) throw new Error(`tool ${n} not found after insert`);
  }

  // Insert skills
  log("F2-skills", "loading per-module system skills");
  const skillRows = NEW_SKILLS.map((s) => ({
    skill_name: s.skill_name,
    skill_type: s.skill_type,
    domain_id: WSC_DOMAIN_ID,
    domain_module_id: moduleByCode[s.domain_module_code],
    description: s.description,
  }));
  const skillByName = await insertMissing(
    "skills",
    skillRows,
    "skill_name",
    `skill_name=in.(${NEW_SKILLS.map((s) => `"${s.skill_name}"`).join(",")})`,
  );

  // skill_tools
  const existingSt: any[] = await get(`/skill_tools?skill_id=in.(${Object.values(skillByName).join(",")})&select=skill_id,tool_id`);
  const haveSt = new Set(existingSt.map((r) => `${r.skill_id}.${r.tool_id}`));
  const newSt: any[] = [];
  for (const s of NEW_SKILLS) {
    const sid = skillByName[s.skill_name];
    for (const link of s.tools) {
      const tid = toolIdByName[link.tool_name];
      if (haveSt.has(`${sid}.${tid}`)) continue;
      newSt.push({
        skill_id: sid,
        tool_id: tid,
        requirement_level: link.requirement_level,
        notes: link.notes,
      });
    }
  }
  if (newSt.length > 0) {
    await post("/skill_tools", newSt);
    log("F2-skill_tools", `inserted ${newSt.length} skill_tools links`);
  } else {
    log("F2-skill_tools", "all skill_tools present");
  }

  // -----------------------------------------------------------------------
  // E. Roles + role_modules + role_permissions
  // -----------------------------------------------------------------------
  log("E", "loading roles");
  const roleRows = ROLES.map((r) => ({
    role_code: r.role_code,
    role_name: r.role_name,
    slug: r.slug,
    description: r.description,
    business_function_id: r.business_function_id,
    origin: r.origin,
    module_id: DOMAIN_MAP_MODULE_ID,
  }));
  const roleBySlug = await insertMissing(
    "roles",
    roleRows,
    "slug",
    `slug=in.(${ROLES.map((r) => `"${r.slug}"`).join(",")})`,
  );

  // role_modules
  const existingRm: any[] = await get(`/role_modules?role_id=in.(${Object.values(roleBySlug).join(",")})&select=role_id,domain_module_id`);
  const haveRm = new Set(existingRm.map((r) => `${r.role_id}.${r.domain_module_id}`));
  const newRm: any[] = [];
  for (const r of ROLES) {
    const rid = roleBySlug[r.slug];
    for (const m of r.modules) {
      const mid = moduleByCode[m.domain_module_code];
      if (haveRm.has(`${rid}.${mid}`)) continue;
      newRm.push({ role_id: rid, domain_module_id: mid, interaction_level: m.interaction_level, notes: m.notes });
    }
  }
  if (newRm.length > 0) {
    await post("/role_modules", newRm);
    log("E", `inserted ${newRm.length} role_modules`);
  } else {
    log("E", "all role_modules present");
  }

  // role_permissions
  const existingRp: any[] = await get(`/role_permissions?role_id=in.(${Object.values(roleBySlug).join(",")})&select=role_id,permission_id`);
  const haveRp = new Set(existingRp.map((r) => `${r.role_id}.${r.permission_id}`));
  const newRp: any[] = [];
  for (const r of ROLES) {
    const rid = roleBySlug[r.slug];
    for (const p of r.permissions) {
      const pid = permByName[p.permission_name];
      if (pid === undefined) throw new Error(`permission ${p.permission_name} not found for role ${r.role_code}`);
      if (haveRp.has(`${rid}.${pid}`)) continue;
      newRp.push({ role_id: rid, permission_id: pid, notes: p.notes });
    }
  }
  if (newRp.length > 0) {
    await post("/role_permissions", newRp);
    log("E", `inserted ${newRp.length} role_permissions`);
  } else {
    log("E", "all role_permissions present");
  }

  log("done", "WSC fix load complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
